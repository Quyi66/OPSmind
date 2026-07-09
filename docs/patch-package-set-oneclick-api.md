# 自定义包集 · 一键分批安装 - 前端接口对接文档

> 面向前端：在补丁能力上新增「命名软件包集（总行下发 / 分行自定义的一组包名）」与「一键更新」。
> 用户建好/选好一个包集，选一组资产（主机 / 分组 / 标签），点一次「一键更新」即完成：
> **自动预检查 → 通过则按批不锁版本安装 → 默认不重启**。安装装成各分行已配置 yum/apt 仓库中的
> **最新可用版本**（包只保存名字，不锁版本、无离线二进制）。
>
> 复用既有补丁安装任务（`taskType=pkg_update`）与状态机，**不新增状态**。一键任务默认不进入
> 重启步骤，终态停在 `INSTALL_DONE`。

## 1. 名词与语义

- **包集（package set）**：一个命名的「一组包名」。来源分 `custom`（分行自定义）与 `headquarters`（总行下发），仅用于展示/筛选，行为一致。
- **一键更新（create-and-run）**：一次请求即创建任务并触发预检查；预检查全部主机通过后由平台**自动接续安装**。
- **不锁版本**：包集只有包名、没有版本号，安装时装成目标机已配置仓库中的**最新可用版本**（RPM `state: latest`；DEB 允许新装未安装的包）。
- **默认不重启**：一键任务 `restartType=none`，安装完成即结束（`INSTALL_DONE`），不会自动重启机器。
- **分批**：目标主机按 `batchSize` 拆成多批依次下发（缺省回落系统参数 `secops.install_batch_size`，默认 50）。这是拆批下发，不是灰度门禁。

## 2. 包集管理接口

前缀：`/api/secops/v2/patch/package-set`

### 2.1 包集列表

```
GET /api/secops/v2/patch/package-set/list?osType=linux
```

- `osType` 可选（`linux` / `windows`），不传返回全部。
- 响应：包集对象数组（按更新时间倒序）。

### 2.2 包集详情

```
GET /api/secops/v2/patch/package-set/{id}
```

- 响应：包集对象；不存在返回 `404 {"error":"包集不存在"}`。

### 2.3 新建 / 更新包集

```
POST /api/secops/v2/patch/package-set/save
```

- body 传 `id` 则更新，不传则新建。请求体即包集对象：

```json
{
  "id": null,
  "name": "总行2026Q3安全基线包",
  "osType": "linux",
  "source": "headquarters",
  "description": "总行下发的季度安全更新包集",
  "packages": "[\"openssl\",\"openssl-libs\",\"bash\",\"sudo\"]"
}
```

- `packages` 为**包名数组的 JSON 字符串**；后端会去空白、去重后回写。
- 校验失败返回 `400 {"error":"..."}`（名称为空 / 包名列表为空）。
- 响应：保存后的包集对象。

### 2.4 删除包集

```
DELETE /api/secops/v2/patch/package-set/{id}
```

- 成功 `200`；不存在 `404 {"error":"包集不存在"}`。

### 2.5 包集对象结构

| 字段 | 说明 |
| --- | --- |
| `id` | 包集 id |
| `name` | 包集名称 |
| `osType` | 适用操作系统类型：`linux` / `windows` |
| `packages` | 包名数组的 JSON 字符串，例 `["openssl","bash"]` |
| `source` | 来源：`custom` / `headquarters`（仅展示用） |
| `description` | 描述 |
| `createdBy` / `createdTime` / `updatedTime` | 审计字段 |

## 3. 一键分批安装接口

前缀：`/api/secops/v2/patch/task`

### 3.1 一键更新（创建并自动执行）

```
POST /api/secops/v2/patch/task/create-and-run
```

请求体：

```json
{
  "packageSetId": "pkgset-abc123",
  "packages": ["openssl", "bash"],
  "targets": [
    { "key": "ff8080817b51ce10017b51d48e0b03fc", "value": "d118.example.com", "assetType": "linux" },
    { "key": "/GD2/TowerSjxy/VM50", "value": "/GD2/TowerSjxy/VM50(linux)", "assetType": "linux" },
    { "key": "#安全基线组" }
  ],
  "batchSize": 50
}
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `packageSetId` | 与 `packages` 二选一 | 选用已有包集；优先于 `packages` |
| `packages` | 与 `packageSetId` 二选一 | 临时包名数组（不落库为包集时用） |
| `targets` | 是 | 资产选择器；见 3.2。为空返回 `400` |
| `batchSize` | 否 | 每批主机数；缺省回落系统参数（默认 50） |

- 行为：解析 `targets` 为具体主机 → 创建 `pkg_update` 任务（`autoInstall=true`、`restartType=none`）→ 立即触发预检查，任务进入 `PRE_CHECKING`。
- 响应：`200` 返回任务对象（通常 `status: "PRE_CHECKING"`）。
- 失败：包名为空 / 未解析到可执行主机 / 主机选择解析异常 → `400 {"error":"..."}`。

### 3.2 targets 选择器语法

`targets` 每一项可以是对象（前端主机选择器原格式）或字符串：

- 主机 id（CMDB CI id）：`"ff8080..."` 或 `{ "key": "ff8080..." }`
- 分组路径（`/` 开头）：`"/GD2/TowerSjxy/VM50"`
- 标签（`#` 开头）：`"#安全基线组"`
- 全部主机：`"@@"`

对象形式建议带 `value`（IP/hostKey）与 `assetType`，便于资产 id 失效时按 IP 兜底解析。

### 3.3 后续流转（无需前端额外调用）

一键任务由平台自动推进，前端只需**轮询任务详情**（见 3.4）：

```
PRE_CHECKING --(环境检查全部通过)--> PRE_CHECK_DONE --(自动)--> INSTALLING --(分批聚合完成)--> INSTALL_DONE
             \--(存在阻断项/不可达)--> PRE_CHECK_FAILED (停下，等待前端处理)
```

- 默认不重启：终态为 `INSTALL_DONE`，不会自动进入 `RESTART`。
- 若安装失败：`INSTALL_FAILED`（多批时汇总为「成功 N，失败 M」）。

### 3.4 查询任务详情（轮询）

```
GET /api/secops/v2/patch/task/{id}
```

- 建议 2~3 秒轮询一次，直到 `status` 为终态（`INSTALL_DONE` / `INSTALL_FAILED` / `PRE_CHECK_FAILED`）。
- 任务对象新增字段：

| 字段 | 说明 |
| --- | --- |
| `packageSetId` | 来源包集 id（临时包名任务为 null） |
| `batchSize` | 每批主机数（null 表示用系统参数） |
| `autoInstall` | 是否一键任务（true） |
| `preCheckResult` | 预检查结果（结构见 `docs/patch-precheck-frontend-api.md` 第 3 节） |

### 3.5 预检查有阻断项时（停下来）

当 `status == "PRE_CHECK_FAILED"`：

- `preCheckResult.results[]` 为按主机分组的检查明细，`errorMessage` 为可读汇总。检查项含义见 [patch-precheck-frontend-api.md](patch-precheck-frontend-api.md) 第 4 节。
- 一键流程**不会自动安装**，交由前端二选一：
  1. 修复目标机问题后重新执行预检查：`POST /api/secops/v2/patch/task/{id}/pre-check/execute`（重跑通过后仍需前端调用安装：`POST /api/secops/v2/patch/task/{id}/install/execute`）；
  2. 我已知晓风险，跳过检查：`POST /api/secops/v2/patch/task/{id}/pre-check/skip` → 之后调 `POST /api/secops/v2/patch/task/{id}/install/execute`。

> 说明：一键的「自动接续安装」仅发生在**首次预检查全部通过**时；失败后重跑/跳过均由前端显式触发安装，避免绕过人工确认。

## 4. 端到端示例

1. 建包集：`POST /package-set/save` → 得到 `packageSetId`。
2. 一键更新：`POST /patch/task/create-and-run { packageSetId, targets, batchSize }` → `status: "PRE_CHECKING"`。
3. 轮询 `GET /patch/task/{id}`：
   - 通过：`PRE_CHECK_DONE` → 平台自动 `INSTALLING` → `INSTALL_DONE`（不重启，流程结束）。
   - 阻断：`PRE_CHECK_FAILED` → 前端按 3.5 处理。
4. 需要重启时（可选，本功能默认不重启）：仍可走既有 `POST /patch/task/{id}/restart/confirm` + `/restart/execute`。

## 5. 部署与兼容性

- **后端**（`sjxy-secops` 模块）：新增包集实体/接口、`create-and-run` 端点、预检查通过后自动安装、按包名不锁版本安装路径。需重新打包并重启服务。
- **Playbook**：`update-pkgs-rpm.yml` / `update-pkgs-deb.yml` 新增 `update_pin_version=false` 的不锁版本分支（默认 `true`，完全保留既有 CVE/补丁锁版本行为），需重新分发 playbook。
- **数据库**：见 `docs/sjxy-db-changes.sql` — 新表 `patchops_patch_package_set`；`patchops_patch_install_task` 新增 `package_set_id` / `batch_size` / `auto_install` 三列（`IF NOT EXISTS`）。须先执行 SQL 再上新 jar。
