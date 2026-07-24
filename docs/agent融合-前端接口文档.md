# Agent 融合 · 前端接口文档

> 面向前端开发。所有接口均由 OpsMind 后端提供，前端**不直接**调用 Relay/scan-api/`/desktop-agent/`。
> 网关前缀：登录态接口经 `sjxy-console` 网关，路径前缀 `/cmdb/api/cmdb/...`（与现有 CMDB 接口一致，自动带 `Authorization`、`Tenant-Id`）。
> 下文“路径”一列写的是**后端路径**；前端实际请求 = 网关前缀 + 后端路径去掉 `/api/cmdb` 部分，按现有 CMDB 接口约定拼接（与你们现在调 `/cmdb/api/cmdb/...` 完全一致）。

---

## 0. 总览

新增接口全部在 CMDB 命名空间下（`/api/cmdb/agent/**`），共 6 个，均需登录态：

| 功能 | 方法 | 路径 |
|---|---|---|
| 生成 enrollment token | POST | `/api/cmdb/agent/enrollment-token` |
| 查询 token 状态 | GET | `/api/cmdb/agent/enrollment-token/{id}` |
| 撤销 token | DELETE | `/api/cmdb/agent/enrollment-token/{id}` |
| 查询待绑定 Agent | GET | `/api/cmdb/agent/pending` |
| 绑定 Agent 到资产（本机/跳板） | POST | `/api/cmdb/agent/bind`、`/api/cmdb/agent/bind-gateway` |
| 解绑 | POST | `/api/cmdb/agent/unbind` |
| 主机 Agent 附加信息（列表/详情富化） | GET | `/api/cmdb/agent/host-info` |

> `/api/agent/**`（register/poll/result/relay）是**桌面 Agent 与 ATA 插件**用的，前端不调用，本文档不展开。

---

## 1. 主机概览与按钮控制（F1 / F2）

### 设计说明（重要）

为了**不改动现有主机概览接口、零回归风险**，Agent 附加字段通过一个独立的富化接口返回，前端拿到主机列表后，用列表里的 `hostId`（即 `cmdb_ci.id`）批量查询一次，合并到每行即可。SSH 主机不用改，Agent 字段也不污染原接口。

### 1.1 批量查询主机 Agent 信息

`GET /api/cmdb/agent/host-info?hostIds=id1,id2,id3`

- 入参：`hostIds`，逗号分隔的主机 id（就是主机列表每行的资产 id）。
- 返回：数组，与入参一一对应（顺序一致）。

```json
[
  {
    "hostId": "ci-1001",
    "connectionType": "koreops_agent",   // ssh | koreops_agent
    "agentStatus": "online",             // online | offline | unknown（ssh 主机为 null）
    "agentClientId": "desk-95-001",
    "agentVersion": "1.0.3",
    "capabilities": "scan,patch,rollback,exec,put,fetch",
    "agentMode": "local",                // local=本机 / gateway=经跳板的内网主机
    "targetIp": null,                     // gateway 时为内网目标地址
    "lastSeenAt": "2026-07-21 09:50:12"
  },
  {
    "hostId": "ci-1002",
    "connectionType": "ssh",
    "agentStatus": null
  }
]
```

### 1.2 前端展示规则

- **接入方式列**：`connectionType==koreops_agent` 显示“Agent”（`agentMode==gateway` 可加“(跳板)”角标），否则“SSH”。
- Agent 主机额外显示 `agentStatus` 和 `agentVersion`；SSH 主机不显示。
- `agentStatus==offline` 时显示“Agent 离线”并展示 `lastSeenAt`，**主机行仍在**（离线 ≠ 删除）。
- 筛选：接入方式（ssh/koreops_agent）、在线状态（online/offline/unknown）由前端基于本接口字段做本地筛选，或作为列表查询条件（后端列表接口不感知，前端合并后过滤）。

### 1.3 按钮能力控制（F2）

按钮可用性**完全由本接口字段推导**，前端不得自行按版本号推断能力：

| 条件 | 扫描/安装/回滚按钮 |
|---|---|
| `connectionType==ssh` | 保持现有逻辑 |
| Agent 且 `agentStatus==online` 且 `capabilities` 含对应能力（scan/patch/rollback） | 可用 |
| Agent 且 `agentStatus!=online` | 禁用，提示“Agent 离线，暂不可执行” |
| Agent 在线但 `capabilities` 不含该能力 | 禁用，提示“该 Agent 不支持此操作” |

- 批量选择混合主机时，前端展示“可执行 N 台 / 不可执行 M 台 + 逐条原因”，**禁止静默跳过**。

---

## 2. Agent 纳管流程（F3）

### 2.1 生成 enrollment token（第 1 步：开邀请函）

`POST /api/cmdb/agent/enrollment-token`

请求体（均可选）：

```json
{ "ttlMinutes": 60, "maxUses": 1, "remark": "财务部台式机" }
```

返回：

```json
{
  "id": "tok-abc",
  "token": "H8s...Uk",                     // 明文，仅本次返回，前端展示后不再保存
  "status": "active",
  "maxUses": 1,
  "usedCount": 0,
  "expiresAt": "2026-07-21 10:50:00",
  "installCommand": "curl -fsSL https://<oplus>/agent/install.sh | sudo sh -s -- --token H8s...Uk --server https://<oplus>"
}
```

前端展示 `installCommand`（一键复制）、`expiresAt`、剩余次数（`maxUses - usedCount`）。

### 2.2 等待上线（第 3 步：轮询后端，不轮询 Relay）

进入“等待上线”后，前端轮询：

- `GET /api/cmdb/agent/pending` → 返回“已注册但未绑定”的候选 Agent 列表：

```json
[
  {
    "clientId": "desk-95-001",
    "hostname": "PC-FIN-01",
    "ip": "10.20.0.33",
    "osInfo": "Windows 10",
    "agentVersion": "1.0.3",
    "capabilities": "scan,patch,exec,put,fetch",
    "status": "online",
    "registeredAt": "2026-07-21 09:48:10"
  }
]
```

- 同时可用 `GET /api/cmdb/agent/enrollment-token/{id}` 观察 token `usedCount` 是否+1（辅助判断是否被使用）。
- 轮询间隔建议 3~5s，超时（如超过 token 有效期仍无候选）提示重新生成。

### 2.3 确认绑定（第 4 步）

用户在候选里选中一台，选择“绑定到已有资产”或“新建资产”：

- **新建资产**：先走**现有的“新增主机”流程**创建一条 CMDB 资产，拿到新 `hostId`；再调绑定。
- **绑定已有资产**：直接用已有 `hostId`。

`POST /api/cmdb/agent/bind`

```json
{ "clientId": "desk-95-001", "hostId": "ci-1001" }
```

成功返回绑定实体（含 `hostId`/`clientId`/`status` 等）。成功后跳转该主机详情页。

### 2.4 错误处理（必须覆盖的分支）

绑定/纳管接口失败时返回 HTTP 400 + `{ errorCode, message }`，前端按 `errorCode` 给文案：

| errorCode | 场景 | 建议文案 |
|---|---|---|
| `ENROLL_TOKEN_INVALID` | token 过期/耗尽/撤销/无效 | “邀请码已失效，请重新生成” |
| `CLIENT_ALREADY_BOUND` | 该 Agent 已绑其他资产 | “该 Agent 已绑定其他资产” |
| `HOST_ALREADY_BOUND` | 目标资产已绑 Agent | “该资产已绑定 Agent，请先解绑” |
| `AGENT_OFFLINE` | 绑定时 Agent 未注册/离线 | “Agent 未上线，请稍后重试” |

> IP 命中多台资产 / client_id 冲突等，均由后端拒绝并返回上述错误码，前端**不做自动合并**，提示用户人工确认。

---

## 3. 通过 Agent 纳管内网服务器（跳板模式）

面向“这台 Agent 当堡垒机代管的内网主机”。前端流程：先为内网服务器走现有“新增主机”创建资产（填内网地址），接入方式选“通过 Agent 接入”，选择负责的 Agent（`clientId`，取自已在线的 Agent 列表），然后：

`POST /api/cmdb/agent/bind-gateway`

```json
{ "clientId": "desk-95-001", "hostId": "ci-2001", "targetIp": "10.0.0.5" }
```

- 一台 Agent 可 `bind-gateway` 多台内网主机；每台都是独立 `hostId`，在主机列表里独立成行（`agentMode==gateway`、显示 `targetIp`）。
- 其在线状态跟随所属 Agent（`host-info` 已处理）。

---

## 4. 解绑

`POST /api/cmdb/agent/unbind`

```json
{ "hostId": "ci-1001" }
```

- 本机绑定：解绑资产但保留 Agent 注册身份（可重新绑定）。
- 跳板绑定：移除该内网主机的代管关系。

---

## 5. 任务详情附加字段（F4）

### 设计说明

与主机列表同理，为零回归，任务详情的 Agent 附加信息也由 `host-info` 派生：任务详情页拿到任务的目标 `hostId` 后，调 `GET /api/cmdb/agent/host-info?hostIds=<该任务主机>` 得到 `connectionType`、`agentClientId`、`agentVersion` 等，用于展示：

- **执行通道**（executionChannel）：`connectionType==koreops_agent` → “Agent”，否则 “SSH”。
- **Agent Client ID / 版本**：直接取字段。
- **通道诊断**：`agentMode==gateway` 时额外展示“经跳板 → `targetIp`”。

### 时间线与错误文案

任务本身的进度/状态仍来自**现有任务详情接口**（不变）。Agent 通道的失败会体现在任务的失败信息里，前端按下列 `errorCode` 关键字映射文案（后端在任务日志/错误信息中带这些码）：

| errorCode | 文案 |
|---|---|
| `AGENT_OFFLINE` | Agent 离线，等待重连 |
| `RELAY_UNAVAILABLE` | 通道不可达 |
| `AGENT_AUTH_FAILED` | Agent 认证失败 |
| `CAPABILITY_UNSUPPORTED` | 该 Agent 不支持此操作 |
| `DISPATCH_TIMEOUT` | 下发/执行超时 |
| `COMMAND_FAILED` | 主机命令执行失败 |
| `RESULT_INGEST_FAILED` | 结果回写失败 |
| `ROLLBACK_UNSUPPORTED` | 该补丁不支持回滚 |
| `ROLLBACK_FAILED` | 回滚失败 |

---

## 6. 扫描 / 安装 / 回滚（F5 / F6）

**前端不新增任何业务接口，完全复用现有扫描、安装、回滚、漏洞列表接口。** 说明：

- Agent 主机走同一套现有任务接口；后端内部自动选择 Agent 通道（前端无感知）。
- 扫描完成后，主机严重度统计、最后扫描时间、漏洞列表由**现有接口**自动刷新（结果已归一化写入原漏洞模型）。
- 漏洞详情的“扫描来源（SSH/Agent）”可用 `host-info` 的 `connectionType` 展示。
- 安装：Agent 主机**不需要用户填 SSH 凭据**（前端对 Agent 主机隐藏凭据输入即可）。
- 回滚：是否可回滚以**现有安装任务返回的 `rollbackSupported`** 为准（前端不判断）。

---

## 7. 权限点

后端已对管理接口做服务端角色校验（不是靠前端隐藏按钮）：

| 接口 | 所需角色（当前实现） |
|---|---|
| 生成/撤销 token、bind、bind-gateway、unbind | ADMIN / PRIVUSER / DEVELOPER / FREE |
| pending、host-info | 登录态（ROLE_USER） |

前端仍应根据用户角色控制入口可见性，但**授权以后端为准**，无权限调用会返回 403。
