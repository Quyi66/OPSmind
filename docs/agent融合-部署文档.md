# Agent 融合 · 部署文档

面向平台运维/实施。只讲上线操作。桌面 Agent 本体见《agent融合-Agent实现说明（运维）.md》，联调步骤见《agent融合-联调操作手册-20260731.md》。

**后端不新增独立服务**：Relay 是单体（`sjxy-console` 进程）里的一个 Controller + 内存路由表，与 CMDB/secops 同进程。运维需要动的只有：数据库两张新表、三个环境变量、执行器节点的插件与环境。

---

## 1. 上线顺序总览

| # | 操作 | 影响 | 需停机 |
|---|------|------|--------|
| 1 | 执行 DDL | 新增 2 张表，不动存量表 | 否 |
| 2 | 配置 3 个环境变量 | — | 否 |
| 3 | 部署新版单体 | 重启网关 | 是（一次重启） |
| 4 | 执行器节点装插件 + 注入环境 | 重启 `sjxy-agent` | 是（执行器侧） |
| 5 | 验证 | — | 否 |

---

## 2. 数据库变更

**作用：** 建 `agent_enrollment_token`（签发凭据）与 `host_agent_binding`（主机↔Agent 绑定）。DDL 幂等，可重复执行；不改动任何现有表，对存量 SSH 主机零影响。

```bash
mysql -h <db_host> -u <user> -p <database> < sjxy-cmdb/src/main/resources/db/agent-fusion.sql
```

回滚：`DROP TABLE host_agent_binding, agent_enrollment_token;`

---

## 3. 应用配置

在平台环境文件（现网为 `/opt/sjxy/.sjxy-env.yml`）中设置：

```yaml
agent:
  relay:
    url: ${AGENT_RELAY_URL:http://127.0.0.1:8080/agent/api/agent}
    internal-token: ${AGENT_RELAY_INTERNAL_TOKEN:}
  install:
    server: ${AGENT_INSTALL_SERVER:https://<host>}
```

| 变量 | 作用 | 要求 |
|------|------|------|
| `AGENT_RELAY_URL` | 执行器插件访问 Relay 的基址，会被写进主机 `param` | 必须是**执行器节点能访问到**的地址，且带 `/agent/api/agent` 后缀 |
| `AGENT_RELAY_INTERNAL_TOKEN` | `/relay/*` 内部接口的校验 token | **生产必须设**，32+ 位随机串；留空 = 不校验，仅测试可用。执行器侧必须同值 |
| `AGENT_INSTALL_SERVER` | 生成安装命令时展示的平台地址 | 只到平台前缀，**不带** `/agent/api/agent`，否则安装命令拼出重复路径 |

现网 162 实际值：

```yaml
agent:
  relay:
    url: https://192.168.1.162/sjxy-console/agent/api/agent
  install:
    server: https://192.168.1.162/sjxy-console
```

> 用 https 时执行器与端点都要能验证平台证书，自签场景见 §5。

---

## 4. 部署新版单体

`sjxy-cmdb` 打进 `sjxy-console`/`sjxy-dashboard` 同一单体，正常出包部署即可。

部署后确认包里确实含 Agent 代码——**这是最容易出错的一步**，包不对时所有 Agent 接口会返回 Spring 层 401（见联调手册 §8）：

```bash
# 容器内确认 agent 类与 shiro 匿名规则都在
docker exec sjxy sh -c 'cd /tmp && rm -rf .c && mkdir .c && cd .c \
  && unzip -o -q /opt/sjxy/war/sjxy-dashboard-*.war "WEB-INF/lib/sjxy-cmdb*.jar" \
  && unzip -l WEB-INF/lib/sjxy-cmdb*.jar | grep -c "cmdb/agent/.*class"'
# 期望 > 0

docker exec sjxy sh -c 'unzip -p /opt/sjxy/war/sjxy-console-*.war \
  WEB-INF/classes/config/shiro.properties | grep -c "agent/api/agent"'
# 期望 4
```

网关路由与鉴权规则已随代码提供，无需手工改：

```
/agent/api/agent/{register,poll,result}=anon   # 鉴权由 X-Agent-Token 完成
/agent/api/agent/relay/**=anon                 # 鉴权由 X-Relay-Token 完成
/**/cmdb/agent/**                              # 签发/绑定/解绑需管理角色，查看类登录即可
```

> 若单独改过 shiro 配置，调 `/api/shiro/reload` 或重启网关生效。

### 静态分发目录（自建 Agent 分发时需要）

**作用：** 让端点能拉到 `install.sh` / `agent.py` / `ca-bundle.crt`。

只读卷必须写在**主 `docker-compose.yml`** 里，不要放进 `-f` override 文件——日常重建只用主 compose，放 override 里的挂载会丢失，表现为 `install.sh` 突然返回 401。

```yaml
  # opsmind-web 的 volumes 下
  - "/opt/sjxy/agent-static-persist:/usr/share/nginx/html/koreops-agent:ro"
```

nginx 侧需在模板内为这些文件加精确匹配 location，避免被代理到后端。

---

## 5. 执行器 / ATA 节点

**现网执行器是 `192.168.1.163`（ata），不是 162——162 上没有安装 ansible。**

三件事缺一不可：

**5.1 插件放进生效目录**

`ansible.cfg` 里的 `connection_plugins = ./connection_plugins` 相对的是**配置文件所在目录**（`/etc/ansible`）而非 CWD，所以实际只有 `/etc/ansible/connection_plugins` 生效。

```bash
install -m 0644 koreops_agent.py oplus_agent.py /etc/ansible/connection_plugins/
rm -rf /etc/ansible/connection_plugins/__pycache__
ansible-doc -t connection -l | grep -E 'oplus_agent|koreops_agent'   # 必须列得出来
```

两个都要装：后端目前写的仍是 `ansible_connection=oplus_agent`，`oplus_agent.py` 是指向 `koreops_agent` 的别名。

**5.2 relay token 注入执行进程**

插件从 `AGENT_RELAY_INTERNAL_TOKEN` 读取，不带此头后端一律拒绝。ansible 由 `sjxy-agent` 这个 JVM 派生，变量要加在被 `start.sh` source 的 `config.sh` 里：

```bash
umask 077
printf 'AGENT_RELAY_INTERNAL_TOKEN=%s\n' '<token>' > /opt/sjxy/.agent-relay.env
chmod 600 /opt/sjxy/.agent-relay.env      # 作用：token 不落进 0755 的 config.sh

cat >> /opt/sjxy/config.sh <<'EOF'
if [ -f "${SJXY_INSTALL_DIR}/sjxy/.agent-relay.env" ]; then
    set -a; . "${SJXY_INSTALL_DIR}/sjxy/.agent-relay.env"; set +a
fi
export REQUESTS_CA_BUNDLE=/etc/pki/tls/certs/ca-bundle.crt
EOF
```

**5.3 自签 CA 信任（https 场景）**

只把 CA 装进系统信任不够：ansible-core 2.16 跑的是 python3.12，其 `requests` 用自带 certifi、**无视系统信任库**，必须同时显式指定 `REQUESTS_CA_BUNDLE`（已含在上一步）。

```bash
install -m 0644 ca-bundle.crt /etc/pki/ca-trust/source/anchors/koreops-internal-ca.crt
update-ca-trust extract
```

**改完必须重启，否则子进程拿不到新变量：**

```bash
cd /opt/sjxy && ./stop.sh sjxy-agent && ./start.sh sjxy-agent
```

重启后确认：

```bash
pid=$(pgrep -f sjxy-agent-*.war | head -1)
tr '\0' '\n' < /proc/$pid/environ | grep -E 'AGENT_RELAY_INTERNAL_TOKEN|REQUESTS_CA_BUNDLE'
# 两个都要在
```

---

## 6. 部署后验证

```bash
BASE=https://192.168.1.162/sjxy-console

# 1) 存量主机零影响
curl -sk "$BASE/cmdb/api/cmdb/agent/host-info?hostIds=<任一现有主机id>" \
  -H "Authorization: Bearer $JWT" -H "Tenant-Id: $TENANT"
# 期望 connectionType=ssh

# 2) 签发可用
curl -sk -X POST "$BASE/cmdb/api/cmdb/agent/enrollment-token" \
  -H "Authorization: Bearer $JWT" -H "Tenant-Id: $TENANT" \
  -H "Content-Type: application/json" -d '{"ttlMinutes":30,"maxUses":1}'
# 期望返回 token + installCommand

# 3) 静态入口
curl -sk -o /dev/null -w "%{http_code}\n" $BASE/agent/install.sh   # 期望 200

# 4) 执行器通道（163 上，打不存在的 client）
ansible -i hosts agenthosts -m raw -a 'id'   # 期望 AGENT_OFFLINE
```

四条全过即可进入联调（装端点、绑定、跑业务），详见联调操作手册。

---

## 7. 排障速查

| 现象 | 原因 | 处置 |
|------|------|------|
| Agent 接口返回 Spring 层 401（`{"timestamp":…,"status":401}`） | 部署包里没有 Agent 代码或 shiro 规则 | 按 §4 校验包内容，重新出包 |
| `install.sh` 401 | 静态只读卷丢失 | 卷必须在主 compose，见 §4 |
| 绑定后任务仍走 SSH | 连接参数未生效 | 查 `cmdb_automation` 是否指向 `agent-conn:<hostId>`、`param` 是否含 `ansible_connection=oplus_agent`；确认执行器已装插件 |
| relay 返回 `AGENT_AUTH_FAILED` | 插件的 `X-Relay-Token` 与平台 `internal-token` 不一致，或执行进程没有该变量 | 比对两侧值；确认改完重启过 `sjxy-agent` |
| ansible `CERTIFICATE_VERIFY_FAILED` | `REQUESTS_CA_BUNDLE` 未生效 | 见 §5.3 |
| ansible `unable to load connection plugin` | 插件不在 `/etc/ansible/connection_plugins` | 见 §5.1 |
| `/relay/exec` 立即 `AGENT_OFFLINE` | Agent 未注册或离线 | 看端点是否在长轮询、clientToken 是否有效 |
| `DISPATCH_TIMEOUT` | Agent 取了指令未回传 result | 核对 `cmdId`，看端点日志 |
| 平台重启后 Agent 短暂离线 | 正常，内存路由表重建 | Agent 3s 重连，状态 90s 内自愈 |

内置阈值：长轮询 30s → 204；心跳超时判离线 90s；指令结果超时 120s；状态刷库 30s。如需调整改 `AgentRelayHub`。

---

## 8. 安全检查项

- [ ] `AGENT_RELAY_INTERNAL_TOKEN` 已设为 32+ 位随机串，两侧一致（留空 = `/relay/*` 不设防）
- [ ] relay token 存在 0600 文件里，未写进 0755 的脚本、未进 git
- [ ] Agent ↔ 平台走 https，端点已下发 CA
- [ ] 确认库中 token 只存 SHA-256 摘要，明文仅生成时返回一次
- [ ] 日志中无 token 明文

吊销方式：`unbind` 解除主机关联；需彻底作废身份则把 `host_agent_binding.status` 置 `revoked`。Agent 访问内网目标的凭据只存端点本地，不经平台。
