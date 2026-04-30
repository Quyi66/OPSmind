# 客户 Yum 仓库管理 — 业务流程与变更文档

---

## 0. 本次变更概览（2026Q2）

> 本模块在 2026Q2 完成了**采集链路重构**：从「JAO 任务调度 + Ansible 管控机 + `dnf/yum repoquery` + 文件回调」全面切换为「VAP 后端进程直连仓库 HTTP + 标准 repodata 协议 + StAX 流式解析」。
>
> 业务概念层「采集→比对」的对外语义不变，但实现路径与前端交互细节都有调整。

### 0.1 关键差异

| 维度 | 旧方案（已下线） | 新方案 |
|------|-----------------|--------|
| 采集发起方 | `BaselineCollectRunner` 提交 ScriptJob 到 JAO | `RepoBaselineService.doCollect()` 在 VAP 进程内构造 snapshot 后异步派发到 `oplusVapExecutor` 线程池 |
| 采集执行方 | 用户指定的「管控机」（Ansible target） | **oplus-portal 进程本身**（VAP 模块）。需要 oplus-portal 与目标仓库 URL 可直连 |
| 数据获取方式 | playbook → `dnf repofrompath` 或 `yum repoquery` 输出 JSON | HTTP GET `repodata/repomd.xml` → `primary.xml.{gz,zst,xml}` → StAX 流式解析每个 `<package type="rpm">` |
| 入库链路 | JAO 文件下发 → `/callback/yum-repo-collect` → `BaselineCollectEtl` → JPA persist | 进程内 multi-row `INSERT`（每批 500 行），独占短事务，绕过 Hibernate hydration |
| 失败可见性 | 需要登录 JAO 看 playbook stderr | 直接看 oplus-portal 日志 + `vap2_baseline_snapshot.error_message` |
| 用户操作 | 必须先登记仓库（`POST /repos`）、采集时选管控机（`hostId`） | 只需在「YUM源配置」录入 `baseurl`（`POST /configs`），采集时不再选管控机 |
| 状态机 | `PENDING → RUNNING → SUCCESS/FAILED` | `RUNNING → SUCCESS/FAILED`（PENDING 在新版几乎不会出现，新建即推进到 RUNNING） |
| 网络要求 | 管控机能访问仓库即可 | **oplus-portal 服务器**能访问仓库 URL（外网或内网代理） |
| 私有仓库认证 | 由管控机本地 yum 配置承担 | RepoSource 新增 `username/password` 字段（V20260425），HTTP Basic Auth；前端 UI 暂未暴露 |

### 0.2 移除的代码与依赖

- 删除 `oplus-vap/src/main/java/com/famessoft/oplus/vap2/etl/BaselineCollectEtl.java`
- 删除 `oplus-vap/src/main/java/com/famessoft/oplus/vap2/etl/script/BaselineCollectRunner.java`
- 删除回调端点 `POST /api/vap/v2/callback/yum-repo-collect`（`CallbackController` 已无对应方法）
- 不再使用 `oplus-vap/playbooks/yum-repo-catalog/site.yml`（playbook 文件可保留作历史参考，但生产环境无需部署）
- Shiro 配置 `/**/vap/*/callback/yum-repo-collect=roles[ROLE_USER]` 失去作用，可在下次清理时移除

### 0.3 新增的代码与依赖

- `etl/yum/HttpRepoCollectWorker.java` — 异步采集工作线程
- `etl/yum/YumRepodataFetcher.java` — repodata 协议抓取与 StAX 解析
- `etl/yum/Nevra.java` — N/E/V/R/A 与 cmpver 字符串构造工具
- `pom.xml` 新增依赖 `com.github.luben:zstd-jni:1.5.6-5`（解 RHEL 9 / Fedora 默认的 `.zst` 压缩）
- 数据库迁移：
  - `V20260425__repo_source_credentials.sql` — `vap2_repo_source` 增加 `username` / `password` 列
  - `V20260426__drop_ansible_collect_columns.sql` — 移除 `vap2_repo_source.host_id`、`vap2_baseline_snapshot.jao_run_id` 两列

---

## 1. 业务背景

在 Linux 补丁管理场景中，补丁能否成功安装取决于目标仓库中是否有满足版本要求的软件包。本功能的目的是：

1. **采集**：从客户提交的 yum/dnf 仓库中拉取全量可用包清单，写入平台数据库
2. **比对**：以补丁为维度，逐一检查补丁所需的包在仓库中是否存在且版本满足要求

最终帮助运维人员提前识别「哪些补丁因仓库包不足而无法安装」。

---

## 2. 核心概念

| 概念 | 说明 |
|------|------|
| **YUM源配置（yum_configs）** | 客户在「YUM源配置录入」页面手动录入的一条配置，落在 `jao_dc_data.data_model='yum_configs'`，含 `name`/`description`/`baseurl`/`file` 等字段 |
| **仓库源（RepoSource）** | 触发采集时按 `(tenant_id, baseurl)` 幂等创建的内部记录，承载实际采集的 N 次快照 |
| **采集记录（Snapshot）** | 每次触发采集生成一条，跟踪状态、包数量等；`is_current=true` 标记当前有效快照 |
| **仓库包（Package）** | 从仓库 primary.xml 解析出的每一个 RPM 包（NEVRA + 可比较版本号 cmpver） |
| **比对结果（Diff）** | 以「补丁 × 所需包」为粒度的比对结论：AVAILABLE / MISSING / OUTDATED / RELEASE_MISMATCH |
| **比对汇总（DiffRun）** | 一次比对运行的预聚合汇总，按 (osFamily, osMajor) 分组，供「总览卡片」毫秒级读取 |

> **新方案下「管控机」概念已被移除**：采集不再依赖任何客户主机，由 oplus-portal 自身完成。

---

## 3. 业务流程

### 3.1 总体流程

```
┌──────────────────────────────────────────────────────┐
│              YUM源配置                                 │
│                                                      │
│  用户在「YUM源配置录入」页面录入 baseurl              │
│  POST /configs，落 jao_dc_data(yum_configs)          │
│  ★ 事务提交后自动派发采集（无需前端再点采集按钮）       │
└──────────────────┬───────────────────────────────────┘
                   │   afterCommit: collectByDcDataId
                   ▼
┌──────────────────────────────────────────────────────┐
│              包采集（VAP 后端直连）                     │
│                                                      │
│  POST /collect { dcDataId }（手动触发依然支持）        │
│  ① RepoSource 按 (tenant + baseurl) 幂等创建/复用     │
│  ② 创建 BaselineSnapshot(status=RUNNING) 并 commit    │
│  ③ 异步线程 HTTP 拉 repomd.xml → primary.xml         │
│  ④ StAX 流式解析 → 每条 rpm 入内存                    │
│  ⑤ multi-row INSERT 批量写 vap2_baseline_package     │
│  ⑥ snapshot 推进至 SUCCESS + is_current=true         │
│  ★ SUCCESS 后自动按「已扫描补丁」做一次比对             │
└──────────────────┬───────────────────────────────────┘
                   │   compareScannedPatchesForRepo
                   ▼
┌──────────────────────────────────────────────────────┐
│              补丁比对                                  │
│                                                      │
│  POST /patch-compare { sourceId, patchIds }          │
│  POST /patch-compare/scanned { sourceId }（手动触发）  │
│  ① 拉补丁所需包（patch_affected_pkg 精简列）          │
│  ② 拉仓库当前快照中同名包（按 pkg_name IN）           │
│  ③ 对每个 (patch, pkg)：架构匹配 → RPM 版本比较       │
│  ④ multi-row INSERT 写 vap2_baseline_diff            │
│  ⑤ 预聚合汇总写 vap2_baseline_diff_run（按 OS 分组）  │
└──────────────────────────────────────────────────────┘
```

> **自动化策略**：
> - 「新增 yum 源 → 自动采集」：`createYumConfig` 通过 `TransactionSynchronizationManager.afterCommit` 在事务提交后调用 `collectByDcDataId`，避免事务嵌套导致 @Async worker 读不到未 commit 的 snapshot。失败仅 warn，不影响配置录入返回。
> - 「采集成功 → 自动比对」：`HttpRepoCollectWorker` 在阶段 2 事务结束 + audit COMPLETED 之后调用 `RepoBaselineService.compareScannedPatchesForRepo(sourceId, null, tenantId)`，显式传入 tenantId 以脱离 ThreadLocal 上下文。失败仅 warn，不回退采集 SUCCESS 状态。

### 3.2 详细流程：包采集（新方案）

```
用户在「YUM源配置」页点击"采集"
  │
  ├─→ POST /collect { dcDataId }
  │
  ├─→ RepoBaselineServiceImpl.collectByDcDataId
  │     │
  │     ├─→ 从 jao_dc_data 读取 yum_configs（baseurl/name/description）
  │     │
  │     ├─→ findOrCreateSource(tenantId, baseurl)
  │     │     存在 → 返回；
  │     │     不存在 → 新建 RepoSource(source_type=USER_INPUT, enabled=true)
  │     │     name/description 同步到 RepoSource.repoId / sourceName（仅在为空时）
  │     │
  │     └─→ doCollect(tenantId, source)
  │           │
  │           ├─→ 创建 BaselineSnapshot(status=RUNNING, is_current=false)
  │           │     // 注意：本步骤不挂 @Transactional，依赖 save 自身事务，
  │           │     //       确保 snapshot 在 worker 启动前已 commit
  │           │
  │           └─→ httpCollectWorker.runCollect(...)  ← @Async oplusVapExecutor
  │                 │
  │                 ├─【阶段 1：事务外】
  │                 │   YumRepodataFetcher.fetchAndParse:
  │                 │     ① HTTP GET {baseurl}/repodata/repomd.xml
  │                 │       → 解析 <data type="primary"><location href=".../primary.xml.{gz,zst,xml}"/>
  │                 │     ② HTTP GET {baseurl}/{primary.href}
  │                 │       → 自适应解压：.gz → GZIPInputStream
  │                 │                     .zst → ZstdInputStream
  │                 │                     .xml → 直接读
  │                 │     ③ StAX 逐 <package type="rpm"> 解析 N/E/V/R/A
  │                 │       → 实时 consumer 累积到内存 List
  │                 │
  │                 ├─【阶段 2：单事务】
  │                 │   ① 批量 multi-row INSERT 到 vap2_baseline_package（每批 500 行）
  │                 │   ② snapshotDao.clearCurrentFlag(sourceId, tenantId) 旧 is_current 清零
  │                 │   ③ snapshot.status=SUCCESS, packageCount=N, isCurrent=true, finishedAt=now
  │                 │
  │                 └─【失败兜底】
  │                     任何阶段抛异常 → markFailed(snapshotId, errMsg)
  │                       snapshot.status=FAILED
  │                       errorMessage 截断到 ≤1024 字符存盘
  │
  └─→ 前端轮询 GET /repos/{sourceId}/status
        │
        ├─→ 无 is_current=true 快照 → 响应含 message 字段 → 继续轮询
        │
        └─→ 有 is_current=true 快照 → 响应含 snapshotId
              ├─→ collectStatus=SUCCESS → 完成
              └─→ collectStatus=FAILED  → 失败，展示 errorMessage
```

> **耗时与吞吐**：单仓库典型耗时 5–60 秒，主要由网络拉取 primary.xml（数 MB–数十 MB）决定；StAX 解析与 multi-row INSERT 不是瓶颈。常驻内存 < 10 MB（流式不缓全文）。

### 3.3 详细流程：补丁比对（无变化）

```
用户选择补丁 + 仓库，点击"比对"
  │
  ├─→ 查找仓库最新成功采集（is_current=true, status=SUCCESS）
  │     └─→ 若无：返回空 diffRunId（前端可提示先采集）
  │
  ├─→ 加载补丁关联包（PatchAffectedPkg，仅 6 列：patch_id/pkg_name/pkg_version/pkg_cmpver/arch/os_distro）
  │     └─→ 可选按 osFamily 过滤
  │
  ├─→ 一次性拉取仓库快照中所有候选包（按 pkg_name IN）
  │
  ├─→ 对每个「补丁所需包」：
  │     ├─→ 候选包按 pkg_name 取分桶 → 按架构过滤 → 按 RPM 版本选最高
  │     ├─→ 候选为空 → MISSING
  │     ├─→ 候选版本 ≥ 要求版本 → AVAILABLE ✓
  │     ├─→ 候选 version 相同但 release 不同 → RELEASE_MISMATCH
  │     └─→ 候选版本 < 要求版本 → OUTDATED
  │
  ├─→ multi-row INSERT 写 vap2_baseline_diff（每批 500 行，UUIDv7 主键减少 B+ 树页分裂）
  │
  ├─→ refreshDiffRunSummary：
  │     按 (osFamily, osMajor) 预聚合到 vap2_baseline_diff_run，is_current=true
  │     overview 接口仅扫该表索引即可毫秒级返回
  │
  └─→ 返回 { diffRunId }
```

---

## 4. 比对规则详解

### 4.1 版本比较

使用标准 RPM 版本比较算法（EVR：epoch:version-release）：

1. 先比 epoch（数值比较）；
2. 再比 version（分段比较：数字段按数值比，字母段按字典序比）；
3. 最后比 release（同上）。

实现见 `RepoBaselineServiceImpl.compareRpmVersions`。

### 4.2 架构匹配

- 要求架构为空或 `noarch` → 匹配所有架构
- 仓库包架构为 `noarch` → 匹配所有要求
- 其他情况要求精确匹配（忽略大小写）

### 4.3 比对结论

| diffType | 判定条件 | 含义 |
|----------|----------|------|
| AVAILABLE | 仓库中有同名同架构的包，版本 ≥ 补丁要求 | 可安装 |
| MISSING | 仓库中完全没有该包（或无匹配架构） | 缺包 |
| OUTDATED | 仓库有该包但版本低于补丁要求 | 版本不够 |
| RELEASE_MISMATCH | version 相同但 release 不一致 | release 不匹配 |

---

## 5. 数据模型

### 5.1 vap2_repo_source（客户仓库源）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(36) PK | UUID 自动生成 |
| source_type | VARCHAR(32) NOT NULL | 固定为 `USER_INPUT` |
| source_name | VARCHAR(128) | 显示名（取自 yum_configs.description；缺省同 baseurl） |
| repo_url | VARCHAR(512) | 仓库根 URL |
| repo_id | VARCHAR(128) | 取自 yum_configs.name（仅供展示与日志，新方案不再用于 yum CLI） |
| os_family | VARCHAR(64) | 操作系统族，新方案前端未暴露，通常为空 |
| os_major | VARCHAR(16) | 操作系统主版本，同上 |
| **username** | VARCHAR(128) | **HTTP Basic 用户名（V20260425 新增，schema 预留）** |
| **password** | VARCHAR(256) | **HTTP Basic 密码（V20260425 新增，schema 预留）** |
| enabled | TINYINT(1) | 是否启用 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |
| tenant_id | VARCHAR(64) | 租户 ID |
| ~~host_id~~ | ~~VARCHAR(64)~~ | **V20260426 已 DROP：旧方案的管控机 ID，新方案无意义** |

### 5.2 vap2_baseline_snapshot（采集记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(36) PK | UUID |
| source_id | VARCHAR(36) | 关联仓库源 |
| snapshot_version | INT | 同一源下的递增版本号 |
| status | VARCHAR(32) | RUNNING / SUCCESS / FAILED（PENDING 几乎不会出现） |
| package_count | INT | 采集到的包数量 |
| trigger_type | VARCHAR(32) | MANUAL |
| is_current | TINYINT(1) | 是否当前有效（每个源只有 1 行为 true） |
| started_at / finished_at | DATETIME | 采集时间 |
| error_message | TEXT | 失败原因（截断 ≤1024） |
| tenant_id | VARCHAR(64) | 租户 ID |
| ~~jao_run_id~~ | ~~VARCHAR(64)~~ | **V20260426 已 DROP：旧方案的 JAO RunId，新方案无意义** |

### 5.3 vap2_baseline_package（仓库包明细）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK AUTO | 自增 |
| snapshot_id | VARCHAR(36) | 关联采集记录 |
| pkg_name | VARCHAR(256) | 包名 |
| pkg_version | VARCHAR(128) | 版本 |
| pkg_release | VARCHAR(128) | release |
| pkg_epoch | VARCHAR(16) | epoch（已归一化：空/`(none)`/`none` → `0`） |
| pkg_arch | VARCHAR(16) | 架构（x86_64/noarch/...） |
| pkg_cmpver | VARCHAR(256) | 可比较版本字符串 `epoch:version-release` |
| pkg_full_nevra | VARCHAR(512) | 完整 NEVRA `name-[epoch:]version-release.arch` |
| repo_name | VARCHAR(128) | 暂未使用（新方案未填，留空） |
| tenant_id | VARCHAR(64) | 租户 ID |

### 5.4 vap2_baseline_diff（补丁比对结果）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(36) PK | UUIDv7 时间有序，降低 InnoDB 页分裂 |
| diff_run_id | VARCHAR(36) | 本次比对运行 ID |
| patch_id | VARCHAR(64) | 补丁 ID |
| pkg_name | VARCHAR(256) | 所需包名 |
| required_nevra | VARCHAR(512) | 补丁要求的版本 |
| baseline_nevra | VARCHAR(512) | 仓库中可用的版本 |
| diff_type | VARCHAR(32) | AVAILABLE / MISSING / OUTDATED / RELEASE_MISMATCH |
| os_family | VARCHAR(32) | 操作系统族（来自 RepoSource） |
| os_major | VARCHAR(8) | 操作系统主版本 |
| source_id | VARCHAR(36) | 关联仓库源 |
| snapshot_id | VARCHAR(36) | 关联采集记录 |
| created_at | DATETIME | 比对时间 |
| tenant_id | VARCHAR(64) | 租户 ID |

### 5.5 vap2_baseline_diff_run（比对汇总，预聚合）

V20260424 引入。每次比对结束时按 `(osFamily, osMajor)` 分组写入，`is_current=true` 表示该 source 最新一次比对。`/patch-compare/overview` 仅扫此表，毫秒级返回。

> 表中持久化字段含 `total_patches` / `installable_patches` / `not_installable_patches` /
> `total_packages` / `available_packages` / `missing_packages` / `outdated_packages` /
> `release_mismatch_packages` 八个计数器，写入逻辑保持不变。
> **2026Q2 起** `/patch-compare/overview` 接口出口仅暴露 `missingPackages`，业务收口为
> 「**只关心缺失包**」（OUTDATED / RELEASE_MISMATCH 仍可通过升级解决，仅 MISSING 真正阻塞补丁安装）。
> 其它字段保留在表中以备未来扩展或排查。

---

## 6. 与旧 `repo-rpm-scan` 的区别（保留作历史背景）

旧的 `repo-rpm-scan` 功能（已移除）：
- 嵌在补丁安装流程中，作为 `RPM_CHECK` 步骤
- 在安装时对**目标主机**执行 `rpm -qa` 检查已安装包
- 仅检查任务涉及的包，不做全量采集

当前 `yum-repo`（本功能，2026Q2 重构后）：
- **独立模块**，与补丁安装流程解耦
- **VAP 后端进程直接走 HTTP repodata 协议**拉取全量可用包，不依赖客户主机、不依赖 ansible、不依赖 yum-utils
- 可在任意时刻对任意补丁做批量比对
- 结果持久化，可反复查询

---

## 7. 使用场景

### 场景 1：补丁发布前评估

1. 在「YUM源配置录入」页录入客户仓库 `baseurl`
2. 点击采集，等待完成（5–60 秒）
3. 选择所有待安装补丁，执行比对
4. 查看不满足的项，决定是否需要同步新包到仓库

### 场景 2：仓库更新后验证

1. 重新触发采集（新采集会覆盖旧的 `is_current` 标记）
2. 再次比对之前失败的补丁
3. 确认所有项变为 AVAILABLE

### 场景 3：多仓库管理

1. 分别录入每个仓库的 yum_configs
2. 在配置列表点「全部采集」（`POST /collect/batch`）
3. 在补丁比对页用「总览卡片」一眼看完所有源的合规情况

---

## 8. 兼容性与回滚说明

- **API 兼容性**：`POST /repos`、`PUT /repos/{id}` 已被移除，旧前端调用会得到 `404`。建议前端在升级当天联调上线，避免出现「老前端 + 新后端」的窗口期。
- **数据兼容性**：旧 RepoSource 数据无需迁移；旧 snapshot/package 数据可继续被新版查询（pkg_full_nevra 在响应阶段统一重拼，不论历史写入格式如何）。
- **回滚**：如确需回退，需要回滚迁移 `V20260426`（恢复 `host_id` / `jao_run_id` 列）并重新部署旧版 jar；`V20260425` 新增的 `username/password` 列可保留不影响。
