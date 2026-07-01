# JieSuan 同步——前端需关注的接口变动文档

> 适用范围：本次从 `oplus-base-JieSuan` 分支同步 bug 修复 / 共用功能后，**对前端有影响**的接口变动汇总。
> 后端内部逻辑修复（cac 去重、acm 历史查询、ata 分批/forks、邮件掩码、dts 分页修正等）**不涉及接口路径、出入参变化**，前端无需改动，本文不列出。
>
> 生成时间：2026-06-22

---

## 总览

| # | 接口 | 变动类型 | 前端是否必须改 |
|---|------|----------|----------------|
| 1 | `POST /api/jao/flow-instances/run-with-params/{flowId}` | 新增端点 | 按需（要动态传参时） |
| 2 | `POST /api/jao/run/command` | 行为变化（大批主机转异步） | **是**（大主机场景需轮询） |
| 3 | `GET /api/jao/jobs/{runId}/running-hosts` | 行为优化 | 否（基本透明） |
| 4 | `GET /api/jao/runlogs/{runId}/result` | 扩展支持 `step_{stepId}` | 按需 |
| 5 | `GET /api/jao/runlogs/ansible/{runId}` | 扩展支持 `step_{stepId}` | 按需 |
| 6 | WebSocket `/log/{runId}` | 扩展支持 `step_{stepId}` + 完成作业改读 DB | 按需 |
| 7 | `PUT /api/jao/flow-instances` 等实例创建 | 请求体新增可选 `params` 字段 | 按需 |
| 8 | REST 类作业 curl 配置 | 支持 `${params}` 占位符（配置约定） | 否（配置层） |

---

## 1. 新增：执行流程模板（带动态参数）

- **方法/路径**：`POST /api/jao/flow-instances/run-with-params/{flowId}`
- **背景**：原有 `GET /api/jao/flow-instances/run/{flowId}` 只能用模板默认参数执行；新增端点支持运行时传入动态参数，覆盖流程全局参数（`ParamDefinition.defaultValue`）。
- **路径参数**：`flowId` — 流程模板 ID
- **请求体**（`application/json`，可选）：支持两种格式
  ```json
  // 格式一：参数包在 params 对象里（推荐）
  { "params": { "env": "prod", "version": "2.0.0" } }

  // 格式二：直接平铺
  { "env": "prod", "version": "2.0.0" }
  ```
  说明：请求体中的 `flowId` 键会被自动过滤，不会下发给脚本。
- **响应**：
  ```json
  { "id": "流程实例ID" }
  ```
- **兼容性**：原 `GET /flow-instances/run/{flowId}` 保留不变，无参执行仍可继续使用。

---

## 2. 行为变化：执行命令（大批主机转异步）⚠️

- **方法/路径**：`POST /api/jao/run/command`（**路径、请求体不变**）
- **变动**：当 `hosts` 数量 **> 100** 时，后端改为**异步执行**，立即返回 `status = RUNNING`，**不再等待作业终态、响应体不含最终结果**。
  - `hosts` 数量 **≤ 100** 时行为不变（同步执行，返回最终结果）。
- **前端需要做的事**：
  - 大批主机场景下，拿到 `runId` 后改为**轮询**获取最终状态与结果：
    - 状态轮询：`GET /api/jao/runlogs/{runId}/check-result`
    - 结果数据：`GET /api/jao/runlogs/{runId}/result`
  - 不能再假设 `/run/command` 的响应里一定带最终执行结果。
- **原因**：大批主机同步执行会导致 HTTP 长时间阻塞甚至超时。

---

## 3. 行为优化：获取运行中主机

- **方法/路径**：`GET /api/jao/jobs/{runId}/running-hosts`（**返回结构不变**）
- **变动**：仅当作业状态为 `RUNNING` 或 `PAUSED` 时才查询 ATA 返回实时运行主机；其它状态（已完成/失败/中断等）直接返回**空数组**。
- **影响**：对"实时运行主机"展示透明；但**已结束**的作业不再通过此接口返回历史运行主机列表（如有展示历史主机的需求，应改用结果接口 `/runlogs/{runId}/result`）。

---

## 4 & 5 & 6. 步骤聚合：`step_{stepId}` 虚拟运行ID

一个流程步骤可包含多个脚本任务，每个任务各有真实 `runId`。本次引入"虚拟运行ID" `step_{stepId}`：前端把原来传 `runId` 的位置改为传 `step_{stepId}`，即可一次拿到该步骤下**所有任务合并后**的结果与日志。

> 单任务步骤：返回该任务的**原始结果**（`runId` 字段为真实运行 ID，批次名不改写），与按真实 runId 查询完全一致。
> 多任务步骤：返回合并结果，按 `任务1` / `任务2` … 批次标签区分各任务。
> `step_` 为系统保留前缀，真实 runId 为 UUID，不会冲突。

### 4. 查询步骤聚合结果

- **方法/路径**：`GET /api/jao/runlogs/{runId}/result`
- **变动**：`runId` 既可传真实 runId（原行为），也可传 `step_{stepId}`。
- **响应**：`RunLogWithData`
  - 多任务时：`runId` 字段原样返回 `step_{stepId}`，`data`/`detail.batches` 按任务拼接、批次名为 `任务N`，`status` 按 `RUNNING > ERROR > FAILED > INTERRUPTED > COMPLETED` 聚合，`startTime` 取最早、`endTime` 取最晚（有未结束任务时为 `null`），`statsJson` 数值字段逐项求和。

### 5. 下载步骤原始输出

- **方法/路径**：`GET /api/jao/runlogs/ansible/{runId}`
- **变动**：`runId` 支持 `step_{stepId}`，返回步骤下所有任务原始输出的拼接文本（attachment 下载）。多任务时每个任务前有 `========== 任务N (runId) ==========` 分隔标题。

### 6. WebSocket 实时/历史日志

- **路径**：`WS /log/{runId}`
- **变动一**：`runId` 支持 `step_{stepId}`，聚合推送步骤下所有任务日志；多任务时每条日志的 `batchId` 为 `任务N` 标签（前端"按 batchId 分组为多页签/chip"的逻辑无需修改，会自然形成 任务1/任务2 多个分组）。
- **变动二**（对所有 runId 生效）：**已完成**的作业改为从**数据库**读取日志后推送（此前是连 ATA 取实时日志，已完成作业常因滚动日志被清理而拿不到输出）；未完成作业仍连 ATA 实时推送。

### 前端注意事项（步骤聚合视图）

- `jao-job-result-view`、`ansible-log-viewer`、原始输出下载按钮**均无需改造**——继续拿 `runId`（值为 `step_xxx`）调上述接口即可。
- **重新执行按钮**：按 runId 重跑单个作业，对多任务合并视图无效。建议改用**响应体里的 `runId` 字段**（单任务步骤返回真实运行 ID 可正常重跑），当该字段以 `step_` 开头（多任务合并视图）时隐藏按钮。
- **运行中进度组件**（按真实 runId 查 ATA 进度）对 `step_` ID 查不到数据（静默无显示、不报错）。需要运行中进度时让用户切到单个任务查看。

---

## 7. 流程实例请求体新增 `params` 字段

- **影响接口**：`PUT /api/jao/flow-instances`（以及内部流程实例创建链路）
- **变动**：请求体 `JobFlowInstanceVO` 新增**可选**字段 `params`（`Map<String,Object>`），用于覆盖流程全局参数（`global_params_json` 中 `ParamDefinition` 的 `defaultValue`）。
  ```json
  {
    "...": "原有字段不变",
    "params": { "env": "prod", "version": "2.0.0" }
  }
  ```
- **兼容性**：不传 `params` 时行为与之前完全一致。

---

## 8. REST 类作业 curl 配置支持 `${params}`（配置约定）

- **非 HTTP 接口变动**，属作业配置层约定。
- REST 类作业的 `curl` 配置中可写 `${params}` 占位符，运行时会被替换为**全部运行参数的 JSON 字符串**（支持 `${params}`、`"${params}"`、`'${params}'` 三种写法）。
- 仅当 curl 中含 `${params}` 时生效，不含则行为不变。

---

## 附：本次不影响前端的后端修复（无需对接）

| 模块 | 修复 | 说明 |
|------|------|------|
| cac2/cac3 | 巡检结果跨批次去重 | 回调内部逻辑，接口出入参不变 |
| acm | 历史数据清理查询（MySQL8 兼容）、命名校验放宽连字符 | 定时任务 / 内部校验 |
| ata | 大批主机分批串行 + ansible forks 调优、per-run 目录隔离、日志 10MB 流式 | 执行引擎内部 |
| commons | 邮件日志密码掩码、异常信息改进 | 日志层 |
| dts | 分页 total 异常修正 | 查询结果数值修正，结构不变 |

---

## 变更涉及的后端文件（jao）

| 文件 | 说明 |
|------|------|
| `web/JobFlowInstanceController.java` | 新增 `run-with-params/{flowId}` 端点（#1） |
| `web/JobRunController.java` | `/run/command` 大主机异步（#2）、`running-hosts` 状态守卫（#3）、`/runlogs/{runId}/result` 与 `/runlogs/ansible/{runId}` 支持 `step_`（#4/#5） |
| `socket/server/LogSocketServer.java` | WebSocket 支持 `step_`、完成作业读 DB（#6） |
| `flow/service/StepRunResultService.java` | 新增：步骤聚合结果合并服务（#4/#5/#6 支撑） |
| `flow/JobFlowInstanceVO.java` | 新增可选 `params` 字段（#7） |
| `rest/RestJobRunner.java` | curl 支持 `${params}`（#8） |
