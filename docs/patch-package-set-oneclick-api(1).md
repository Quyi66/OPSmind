# 自定义包集 · 一键分批安装 — 前端接口约定

> 场景：总行下发（或分行自定义）一组更新包，选一批资产、一键按清单安装，默认不重启。
> 包从各分行**已配置的 yum/apt 源**在线拉取；**支持不指定版本（装仓库最新）与指定版本（锁版本安装）混合**。

相关后端：`sjxy-secops`。所有接口默认带租户上下文（同其它 v2 接口）。

---

## 1. 数据模型：软件包集 `PatchPackageSet`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 包集 id（新建不传，更新必传） |
| `name` | string | 包集名称（必填，租户内可重名，靠 id 区分） |
| `osType` | string | `linux` / `windows`，缺省 `linux` |
| `packages` | string(JSON) | **包名数组的 JSON 字符串**，见 [§4 包名与版本约定](#4-包名与版本约定) |
| `source` | string | `custom`（分行自定义）/ `headquarters`（总行下发），缺省 `custom` |
| `description` | string | 备注 |
| `createdBy` / `createdTime` / `updatedTime` | - | 审计字段，后端维护 |

---

## 2. 包集管理接口 `/api/secops/v2/patch/package-set`

### 2.1 列表
`GET /list?osType=linux`（`osType` 可选）→ `200` `PatchPackageSet[]`

### 2.2 详情
`GET /{id}` → `200` `PatchPackageSet`；不存在 → `404 { "error": "包集不存在" }`

### 2.3 新建 / 更新
`POST /save`，body 为 `PatchPackageSet`。传 `id` 为更新，否则新建。

```json
{
  "name": "总行7月安全基线",
  "osType": "linux",
  "source": "headquarters",
  "description": "2026-07 下发",
  "packages": "[\"openssl==1.0.2k-23.el7_9\", \"bash\", \"sudo\"]"
}
```

- `packages` 为**包名数组的 JSON 字符串**（不是数组对象）。
- 后端保存时会去空白、去重后回写。
- 返回 `200` 保存后的实体；名称为空或包名列表为空 → `400 { "error": ... }`。

### 2.4 删除
`DELETE /{id}` → `200`；不存在 → `404`

---

## 3. 一键分批安装 `POST /api/secops/v2/patch/install-task/create-and-run`

选一组资产，按包集或临时包名清单安装。后端自动：建任务 → 预检查 → 预检查全部通过且无阻断项则**自动分批安装**，默认不重启。

### 请求 body

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `packageSetId` | string | 与 `packages` 二选一 | 选用已保存的包集 |
| `packages` | string[] | 与 `packageSetId` 二选一 | 临时包名清单（不落库），元素格式见 §4 |
| `targets` | 见下 | 是 | 资产选择器 |
| `batchSize` | number | 否 | 每批主机数；缺省回落系统参数 `secops.install_batch_size`（默认 50） |

`targets` 支持两种形态：

- **选择器对象数组**（前端主机选择器原格式）：`[{ "key": "...", "value": "...", "assetType": "..." }]`
- **字符串数组**：主机 id / `"/分组"` / `"#标签"`，如 `["host-ci-001", "/华东机房", "#web"]`

请求示例：

```json
{
  "packageSetId": "pkgset-abc",
  "targets": ["host-ci-001", "host-ci-002"],
  "batchSize": 30
}
```

或临时清单（混合版本）：

```json
{
  "packages": ["openssl==1.0.2k-23.el7_9", "bash", "curl"],
  "targets": [{ "key": "host-ci-001" }],
  "batchSize": 50
}
```

### 响应

- `200`：返回新建的安装任务对象（含 `id`、`status`、`currentStep` 等）。前端拿 `id` 轮询任务详情看进度。
- `400 { "error": ... }`：`targets` 为空、`packageSetId`/`packages` 都没给、包集不存在、或未解析到可执行主机。

### 流程与状态

任务创建后进入预检查（`func=check`）：

1. 预检查通过且无阻断项 → 自动进入分批安装（`autoInstall=true`），按 `batchSize` 分批。
2. 预检查存在阻断项 → 停在预检查完成态并提示，不自动安装。
3. 默认 `restartType/restartAction = none`，安装完成后终态停在“安装完成”，**不触发重启**。

> 状态/步骤枚举以任务详情接口返回为准；本接口只负责创建并触发。

---

## 4. 包名与版本约定

`packages`（包集或临时清单）中的每个元素是一个**包名条目**，两种写法：

| 写法 | 含义 | 安装行为 |
| --- | --- | --- |
| `"openssl"` | 不指定版本 | 装分行仓库**当前最新可用版本**（RPM `state=latest` / apt `state=latest`） |
| `"openssl==1.0.2k-23.el7_9"` | 指定版本 | **锁版本安装**该确切版本；已装更高版本时允许降级到指定版本 |

- 分隔符固定为 `==`（双等号），左侧为包名，右侧为版本。
  > **前端智能解析优化**：为了免去用户手动组装 `==` 的麻烦（用户通常倾向于直接复制粘贴），前端输入框已实现智能解析算法，支持直接粘贴以下格式，并在提交给后端前自动统一规范化为 `包名==版本` 格式：
  > 1. 带 CPU 架构或文件后缀的 RPM/DEB 文件名（如 `openssl-1.0.2k-23.el7_9.x86_64.rpm` 或 `openssl-devel-1.0.2k-23.el7_9.x86_64`）
  > 2. 空格或制表符分隔（如 `openssl 1.0.2k-23.el7_9`）
  > 3. 冒号或单等号分隔（如 `openssl:1.0.2k-23.el7_9` 或 `openssl=1.0.2k-23.el7_9`）
  > 4. 纯包名无版本（如 `openssl`）
- **RPM 系**版本写 `version-release`（不含包名、不含 `.arch`），后端拼成 `name-version-release` 走仓库可达性预校验 + 装后 rpmdb 版本复核；仓库里解不到该版本会在预检查/安装阶段失败并提示。
- **DEB 系**版本写 apt 版本号（如 `1.0.2k-1ubuntu1`），后端按 `apt name=version` 锁版本安装。
- 同一清单里可**混合**：指定版本的包锁版本装，未指定的装最新，互不影响。
- 未指定版本的包**允许在目标机尚未安装时新装**（总行下发的包目标机可能还没装）。

> 兼容说明：既有“漏洞/补丁驱动”的安装链路（`update_pin_version=true`）行为完全不变，仍按公告 N-V-R 锁版本并做禁止降级预筛。本一键包集链路走 `update_pin_version=false` 的混合模式。
