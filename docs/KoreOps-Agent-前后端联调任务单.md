# KoreOps Agent × OpsMind 联调任务单

**日期：** 2026-07-29  
**环境：** `https://192.168.1.162/KoreOPS/`（控制面） / `https://192.168.1.162/sjxy-console/`（API 前缀）  
**目的：** 打通「Agent 第二种主机连接通道」，与 SSH 双模并存；事实源仍是 OpsMind（主机/CVE/任务），不是旧 `/desktop-agent/` 诊断页。  
**受众：** 前端（SPA）、后端（Java/网关）、现场运维（可选协同）

---

## 0. 一句话现状（给所有人）

| 结论 | 说明 |
|------|------|
| 前端 | KoreOPS「资产管理」**没有** Agent 管理 / Agent 接入入口；「录入」只有 IP，走 SSH |
| 后端 | 库表已有 `agent_enrollment_token`、`host_agent_binding`；配置有 `agent.relay` 等；**签发 API / 业务闭环未在现网验证通过** |
| 静态安装入口 | `/sjxy-console/agent/install.sh` **不稳定**（曾修到 200，重建后易回 401）；需纳入正式部署 |
| Agent 端代码 | `deploy/koreops-agent/` 已按契约交付（含可靠性加固）；**完整 E2E 阻塞于 enrollment token + 平台通道** |
| 禁止事项 | 不改库伪造 token/绑定/CVE；不把旧 Relay demo 当正式 CVE；token 不进 git/聊天 |

---

## 1. 目标架构（对齐认知）

```text
OpsMind（主机/CVE/任务 = 唯一事实源）
        │
   Ansible Executor
    /            \
 ansible_connection   ansible_connection
 =ssh                 =koreops_agent（兼容 oplus_agent）
                        │
              /sjxy-console/agent/api/agent
                        │
                  Endpoint Agent
```

- 无 Agent：SSH 纳管（现状主路径）。
- 有 Agent：`ansible_connection=koreops_agent`；后端若仍写 `oplus_agent`，执行器需同时有兼容插件。

### URL 约定（写错会拼重复路径）

| 项 | 正确值 | 错误示例 |
|----|--------|----------|
| `--server` / 平台前缀 | `http(s)://192.168.1.162/sjxy-console` | 带 `/agent/api/agent` |
| Agent BASE | `{server}/agent/api/agent` | — |
| 安装脚本 | `{server}/agent/install.sh` | — |

### 契约要点（前后端/Agent 必须一致）

- JSON：**全 camelCase**；指令 ID **只用 `cmdId`**（不要 `cmd_id`）。
- Agent → 平台：Header **仅** `X-Agent-Token`；`clientId` 在 register body 或 poll/result query。
- Executor → 内部：`X-Relay-Token` ← `AGENT_RELAY_INTERNAL_TOKEN`（与 `agent.relay.internal-token` 一致）。
- capabilities：`scan,patch,rollback,exec,put,fetch`（`rollback` 表示通道可执行，不等于补丁回滚业务已通）。

---

## 2. 前端（FE）任务清单

**负责人：** ___________  
**期望完成：** ___________  
**联调依赖：** 后端签发 API、主机扩展字段、任务通道字段就绪后可联调。

| # | 任务 | 验收标准 | 状态 |
|---|------|----------|------|
| F1 | 增加「Agent 管理」或「主机 → Agent 接入」明确入口（不要只靠「资产录入」） | 管理员能在 3 次点击内到达接入页 | ☐ |
| F2 | **纳管向导**：选/建主机 → 调用后端签发 enrollment → 展示一键安装命令 | 命令含 `--token` 与 `--server http(s)://…/sjxy-console`；可一键复制；**不展示**完整 token 到操作日志 | ☐ |
| F3 | 主机列表/概览增加列：`connectionType`、`agentStatus`、`clientId`、`capabilities`、`lastSeenAt` | 可筛选 SSH / Agent；在线/离线正确 | ☐ |
| F4 | 补丁漏洞：扫描/安装/回滚按钮按「在线 + capabilities + 后端授权」启用/禁用 | 缺能力或离线时有明确提示；有 `rollback` cap 不等于直接开放业务回滚 | ☐ |
| F5 | 任务详情展示执行通道：`ssh` / `koreops_agent`，以及任务/追踪 ID | 与后端字段对齐，可排查 | ☐ |
| F6 | 将 `/desktop-agent/`（若仍存在）标注为**诊断入口**，非正式补丁主流程 | 产品文案与导航不误导 | ☐ |
| F7 | 错误码友好提示（见 §4）：401/403/超时/未绑定等 | 用户能看懂下一步 | ☐ |

### 前端联调自测

1. 登录 KoreOPS → 打开 Agent 接入 → 拿到安装命令。  
2. （运维装好 Agent 后）主机列表出现对应 `clientId` 且在线。  
3. 对该主机发起一次轻量任务（ping/简单 exec）或扫描，任务详情显示 Agent 通道。

---

## 3. 后端（BE）任务清单

**负责人：** ___________  
**期望完成：** ___________  
**联调依赖：** 执行器插件与内部 token；静态 `install.sh` 对外 200。

| # | 任务 | 验收标准 | 状态 |
|---|------|----------|------|
| B1 | **登录态 enrollment 签发 API**（方法/路径以现网 Swagger 为准并文档化） | 管理员 Bearer 可签发；返回 token、过期时间、建议安装命令；**禁止**仅靠改 DB | ☐ |
| B2 | 打通 Agent 通道：`POST …/agent/api/agent/register`、`GET …/poll`、`POST …/result` | 无 Agent token → 401；有 enrollment → 返回并落盘 `clientToken`；poll 204/200；result 接受 `cmdId` | ☐ |
| B3 | 基于表 `host_agent_binding` 提供绑定/解绑 API + 审计 | `host_id ↔ client_id` 可查可解；解绑留痕 | ☐ |
| B4 | 主机查询 API 返回 `connectionType` / `agentStatus` / `capabilities` / `lastSeenAt` / `clientId` | FE F3 可对接 | ☐ |
| B5 | 任务引擎按 `connection_type` 分流：Agent 主机用 `koreops_agent` inventory（兼容后端仍写 `oplus_agent`） | Ansible ping / 扫描任务能到 Agent | ☐ |
| B6 | 扫描/安装/回滚结果写入正式 `patchops_*` | **禁止**旧 Relay demo / JSONL 冒充正式 CVE | ☐ |
| B7 | 内部 Relay：`agent.relay.internal-token` 与执行器 `AGENT_RELAY_INTERNAL_TOKEN` 一致；插件请求带 `X-Relay-Token` | Executor 可下发指令 | ☐ |
| B8 | 网关/路由：`/sjxy-console/agent/**` 行为稳定；Swagger 或接口文档对管理员可访问 | FE/联调可查真实路径（勿再用未验证的示例路径当契约） | ☐ |
| B9 | （建议）Agent 在线状态同步：register/heartbeat/offline → 主机 `agentStatus` | 约 90s 内上下线正确 | ☐ |

### 后端联调自测（可用 curl，勿把 token 贴进群聊）

```bash
# 1) 静态安装入口（期望 200，内容含 koreops）
curl -sk -o /dev/null -w "%{http_code}\n" https://192.168.1.162/sjxy-console/agent/install.sh

# 2) 无 token 注册（期望 401）
curl -sk -o /dev/null -w "%{http_code}\n" -X POST \
  https://192.168.1.162/sjxy-console/agent/api/agent/register \
  -H "Content-Type: application/json" -d "{}"

# 3) 登录态签发（路径以你们文档为准；Authorization 用管理员 JWT）
# curl -sk -X POST "https://192.168.1.162/sjxy-console/agent/api/.../enrollment-token" \
#   -H "Authorization: Bearer <admin_jwt>" -H "Content-Type: application/json" -d "{}"
```

### 已知库表（只读确认过，不等于业务已通）

- `sjxy.agent_enrollment_token`
- `sjxy.host_agent_binding`

---

## 4. 建议错误码与提示（前后端对齐）

| 场景 | HTTP/业务码建议 | 前端提示方向 |
|------|-----------------|--------------|
| 未登录访问管理 API | 401 | 重新登录 |
| 无权限签发 | 403 | 联系管理员 |
| 无 Agent token 调 register | 401 | 安装命令过期或未带 token |
| clientToken 失效 | 401 + 可重注册策略 | Agent 将用 enrollment 重注册或需重新纳管 |
| 主机未绑定 clientId | 业务错误 | 先完成绑定 |
| Agent 离线下发任务 | 业务错误 | 检查 Agent 服务/网络 |
| 缺少 capability | 业务错误 | 升级 Agent 或改走 SSH |

---

## 5. 现场运维 / 平台部署（协同项，非 FE/BE 编码）

| # | 任务 | 验收标准 | 状态 |
|---|------|----------|------|
| O1 | `sjxy-web` 重建后 `install.sh` 仍 200 | compose 带 `docker-compose.koreops-agent.yml`（服务名 **`opsmind-web`**）；静态目录持久挂载 | ☐ |
| O2 | **勿**将 `default.conf` 以 `:ro` 整文件挂死 | `opsmind-web` entrypoint 必须可写 conf；location 用启动注入或可写补丁固化 | ☐ |
| O3 | 执行器在 **162**（当前 `SJXY_EXECUTOR_URL` 指向 162）同步双插件 | `/opt/sjxy/executor/connection_plugins/{koreops_agent,oplus_agent}.py` + 内部 token 环境 | ☐ |
| O4 | 旧 PoC（`:18900` / `desktop-agent`）与新链路隔离 | 新环境只认 `/sjxy-console/agent` | ☐ |

> 2026-07-29 现场记录：曾修复为 install=200 / register=401；之后再次出现 install=401，说明 **web 重建后静态路由易丢失**，O1/O2 必须进正式发布流程。

---

## 6. 联调里程碑（建议顺序）

| 里程碑 | 参与方 | 完成定义 |
|--------|--------|----------|
| M1 签发可用 | BE + FE | UI 或文档化 API 能拿到 enrollment token |
| M2 安装上线 | 运维 + BE | `install.sh` 稳定 200；端点安装后 `clientToken` 落盘（600） |
| M3 在线可见 | BE + FE | 主机列表显示 Agent 在线与 `clientId` |
| M4 执行通道 | BE + 运维 | Ansible ping（`koreops_agent` + `oplus_agent` 兼容）成功 |
| M5 业务闭环 | BE + FE | 扫描 → 安装/回滚，结果进 `patchops_*` |
| M6 故障演练 | 全员 | 断网恢复、重启不重复执行、token 失效、web 重建后入口仍在 |

---

## 7. 接口待 BE 填空（联调前务必填齐）

请后端同事补全后回传 FE/运维（可直接改本表）：

| 用途 | 方法 | 完整路径 | 请求摘要 | 响应摘要 |
|------|------|----------|----------|----------|
| 签发 enrollment | | | | |
| 查询 Agent 状态 | | | | |
| 绑定 host↔client | | | | |
| 解绑 | | | | |
| 主机列表扩展字段 | | | | |

鉴权方式：`Authorization: Bearer <登录 JWT>`（与现有 CMDB 一致）。

---

## 8. 参考材料（仓库内）

| 文档 | 用途 |
|------|------|
| `15-新环境Agent部署与验证说明.md` | 新环境部署与验收 |
| `deploy/koreops-agent/README.md` | Agent 包契约与安装 |
| `poc-deploy/opsmind-agent-integration-contract.md` | 身份/能力/错误原则冻结稿 |
| `poc-deploy/acceptance-native-fusion.md` | 早期 FE/BE blockers |
| `deploy/koreops-agent/platform/README.md` | 静态持久化与重建注意 |
| `poc-deploy/e2e-verify.py` | 脱敏 E2E 冒烟脚本 |

**工作区：** `C:\Users\Administrator\Desktop\agent`  
**会话交接：** 桌面 `KoreOps-Agent-会话交接文档.md`

---

## 9. 签字与排期

| 角色 | 姓名 | 确认日期 | 备注 |
|------|------|----------|------|
| 前端 | | | |
| 后端 | | | |
| 运维/现场 | | | |
| 产品/测试 | | | |

**联调窗口：** ___________  
**Pilot 主机建议：** `192.168.1.95`（历史 `desk-95-001`，需正式绑定 `host_id`）

---

*本文只描述职责与验收，不含任何真实 token/密码。联调时凭证仅通过受限环境变量或平台 UI 传递。*
