# OpsMind 后端任务：Agent 主机、任务与数据原生融合

## 目标

将 KoreOps Agent 作为 OpsMind 的第二种连接方式，与 SSH 共用主机资产、漏洞数据、扫描任务、补丁安装、回滚、权限和审计体系。

后端是业务事实源；Relay 只承担连接、任务转发和结果回传，不作为正式主机库或漏洞库。

## 阶段 B0：只读契约调查

实施前先输出以下现状契约：

- 主机概览列表/详情 API 与主机唯一键。
- 主机、漏洞、补丁、任务、安装、回滚相关表结构及关系。
- 扫描任务创建、执行、状态更新和结果入库流程。
- 安装和回滚任务状态机。
- 现有 Ansible inventory 生成逻辑。
- 登录态、RBAC、审计与内部服务鉴权方式。

只读调查期间：

- 不直接修改 MariaDB。
- 不让 Relay 调用猜测的 `/api/internal/vuln/ingest`。
- 不把 demo findings 写入正式漏洞表。

阶段输出为 API/数据字典和一条 SSH 主机完整任务样例，作为 Agent 分支的基线。

## 任务 B1：主机与 Agent 绑定模型

建议新增独立绑定实体，而不是用 IP 作为 Agent 身份：

`host_agent_binding`

- `id`
- `host_id`，唯一
- `client_id`，唯一
- `relay_id`
- `status`: online/offline/unknown/revoked
- `agent_version`
- `capabilities`
- `last_seen_at`
- `registered_at`
- `token_fingerprint`
- `created_by`
- `updated_at`

主机模型新增或派生：

- `connection_type`: `ssh | koreops_agent`
- `connection_status`

约束：

- `host_id` 是资产唯一标识。
- `client_id` 是连接身份。
- IP、hostname、MAC/机器标识只用于匹配，不作为唯一关联依据。
- Agent register 只能更新绑定状态和元数据，不能静默覆盖另一台资产。
- 解绑、吊销和重绑定必须审计。

## 任务 B2：Agent 纳管 API

由 OpsMind 后端代理 enrollment，不允许前端直接调用 Relay。

逻辑接口：

- 创建 enrollment token。
- 查询 token 状态。
- 撤销 token。
- 查询新注册但未绑定的 Agent。
- 将 Agent 绑定到已有主机。
- 从 Agent 元数据创建新主机并绑定。
- 解绑或吊销 Agent。

绑定匹配顺序：

1. 已存在的 client_id 绑定。
2. 可靠机器标识。
3. hostname + IP 候选匹配。
4. 无唯一结果时必须人工确认。

不能仅按当前 IP 自动合并。

## 任务 B3：状态同步

建立 Relay → OpsMind 的服务端同步机制：

- register/heartbeat 更新在线状态、版本、OS、IP和能力。
- 服务端鉴权，不接受浏览器伪造状态。
- 状态更新幂等。
- Relay 短暂不可达时标记 unknown，不批量删除主机。
- 在线状态有明确超时阈值。

推荐由 OpsMind 定时拉取或 Relay 调用受鉴权的内部回调；两者选定一种后固化，避免双向同时写造成竞态。

## 任务 B4：统一任务路由

在现有任务执行层增加连接方式分支：

- `ssh`：保持原逻辑。
- `koreops_agent`：生成 Agent inventory 参数并使用 `koreops_agent` 连接插件。

同一 Playbook 不复制业务逻辑。

Agent inventory 至少包含：

- host alias / host_id
- client_id
- Relay 内部地址
- 服务端认证信息引用
- TLS CA
- 请求超时
- trace_id

不得把长期 token 暴露到前端或任务日志。

## 任务 B5：真实扫描结果回写

修复 163 上连接插件发现与 inventory 配置，使正式扫描不依赖 `relay-fallback` demo。

扫描流程：

1. OpsMind 创建原生扫描任务。
2. 任务路由选择 Agent 通道。
3. Ansible 使用同一扫描 Playbook。
4. 标准化结果转换为 OpsMind 现有漏洞/CVE模型。
5. 在同一事务或可恢复流程中更新主机扫描时间、严重度统计和明细。
6. Relay trace_id 写入任务扩展字段便于排障。

正式环境拒绝写入：

- `KOREOPS-DEMO-*`
- `PKG-INFO-*`
- 未映射到产品漏洞模型的样例 findings

Relay JSONL 可以保留为传输审计，但不能作为正式页面数据源。

## 任务 B6：补丁安装

复用现有补丁任务、审批和包仓库：

- 任务创建前检查 Agent 在线和 capabilities。
- 执行前检查包管理器、磁盘空间、依赖、重启要求。
- 通过同一 Playbook 和 Agent 连接插件执行。
- 使用任务幂等键，防止超时重试导致重复安装。
- Agent 重启或网络中断后，任务进入等待/恢复状态，而非立即重复执行。
- stdout/stderr、返回码、trace_id 进入原任务日志。

## 任务 B7：真实回滚

回滚继续使用 OpsMind 原补丁回滚定义：

- 明确每个补丁的回滚策略：降级、卸载、配置恢复或快照。
- 安装前保存回滚所需证据和版本。
- 不具备可靠回滚条件时返回 `rollbackSupported=false` 及原因。
- 回滚任务复用原审批、任务状态和审计。
- Agent 通道仅改变执行方式，不改变回滚业务含义。

禁止通过创建/删除演示文件冒充补丁回滚。

## 任务 B8：统一任务状态机

扫描、安装和回滚至少支持：

- queued
- prechecking
- dispatching
- running
- waiting_agent
- succeeded
- failed
- rollback_available
- rolling_back
- rolled_back
- rollback_failed
- cancelled

每次状态转换记录：

- task_id
- host_id
- client_id
- operator
- trace_id
- timestamp
- error_code
- error_message

状态更新必须幂等并可恢复。

## 任务 B9：前端 API 字段

主机接口需返回：

- `connectionType`
- `agentStatus`
- `agentVersion`
- `agentClientId`
- `capabilities`
- `lastSeenAt`

任务接口需返回：

- `executionChannel`
- `agentClientId`
- `relayTraceId`
- `agentVersion`
- `dispatchStatus`
- `rollbackSupported`
- `rollbackUnsupportedReason`

错误码至少区分：

- AGENT_OFFLINE
- RELAY_UNAVAILABLE
- AGENT_AUTH_FAILED
- CAPABILITY_UNSUPPORTED
- DISPATCH_TIMEOUT
- COMMAND_FAILED
- RESULT_INGEST_FAILED
- ROLLBACK_UNSUPPORTED
- ROLLBACK_FAILED

## 任务 B10：安全

- OpsMind 到 Relay 使用服务身份认证。
- Relay 管理、exec、put、fetch、scan 接口不得匿名暴露。
- Agent token 支持轮换、吊销和最小权限。
- 恢复严格 TLS 校验，移除长期 insecure fallback。
- 高危命令需要权限、策略、审批和审计。
- 日志中脱敏 token、凭据和安装参数。
- 对 enrollment、register 和任务回调做限流与重放防护。

## 后端验收

以 `desk-95-001` 为首台主机：

1. 它在 OpsMind 主机库只有一个 `host_id`，绑定一个 `client_id`。
2. 主机概览显示接入方式 Agent、在线状态和版本。
3. 从原主机概览发起真实扫描，任务走 `koreops_agent` 且成功。
4. 结果写入 OpsMind 原漏洞模型并更新原统计。
5. 从原补丁流程安装一个可回滚测试包。
6. 从原安装回滚流程恢复原版本。
7. 扫描、安装、回滚共享原任务历史和审计。
8. Agent 离线、Relay 不可达、超时、重复回调均有正确状态且不重复执行。
9. SSH 主机回归不受影响。

## 后端交付物

- 数据库迁移脚本。
- OpenAPI/接口说明。
- Agent 绑定与状态同步服务。
- 统一连接路由实现。
- 扫描结果映射器。
- 安装/回滚 Agent 通道适配。
- 权限与审计变更。
- 单元、集成和双模回归测试。
