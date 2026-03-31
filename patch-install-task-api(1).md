# 补丁安装任务流程 API 文档

## 概述

提供流程化补丁升级能力，包含四个步骤：**预检查 → 安装 → 重启 → 校验**。

- **每个步骤独立可操作**，不依赖前一步是否执行或执行结果
- 预执行脚本和校验脚本由**用户上传或编辑**，默认留空
- 重启类型由**平台根据补丁属性自动判断**（系统重启 / 服务重启 / 无需重启）
- 确认重启需要输入"确认重启"四字进行二次确认
- 创建任务时自动完成：重启评估、软件包提取、重启脚本生成

## 操作流程

四个步骤建议按顺序执行，但**不强制依赖**，每一步都可以独立触发。

```
创建任务（评估重启需求，生成重启脚本）
    │
    ├── 上传/编辑脚本（可随时操作）
    │
    ├── 步骤1：预检查（执行 / 跳过）
    │
    ├── 步骤2：补丁安装
    │
    ├── 步骤3：重启（确认执行 / 跳过）
    │
    └── 步骤4：校验（执行 / 跳过）
```

## 状态说明

`status` 和 `currentStep` 记录最近一次操作的步骤和结果，**仅供前端展示**，不作为下一步操作的前置条件。

### status 值

| status | 说明 |
|--------|------|
| `CREATED` | 任务已创建 |
| `PRE_CHECKING` | 预检查执行中 |
| `PRE_CHECK_DONE` | 预检查完成（成功或跳过） |
| `PRE_CHECK_FAILED` | 预检查失败 |
| `INSTALLING` | 补丁安装中 |
| `INSTALL_DONE` | 安装完成 |
| `INSTALL_FAILED` | 安装失败 |
| `RESTART_PENDING` | 已确认重启，待执行 |
| `RESTARTING` | 重启执行中 |
| `RESTART_DONE` | 重启完成（成功或跳过） |
| `VALIDATING` | 校验执行中 |
| `VALIDATE_FAILED` | 校验失败 |
| `COMPLETED` | 校验完成（成功或跳过），流程结束 |
| `FAILED` | 执行异常 |

### currentStep 值

| currentStep | 说明 |
|-------------|------|
| `PRE_CHECK` | 最近操作的是预检查步骤 |
| `INSTALL` | 最近操作的是安装步骤 |
| `RESTART` | 最近操作的是重启步骤 |
| `VALIDATE` | 最近操作的是校验步骤 |

## API 接口

基础路径：`/api/vap/v2/patch/task`

---

### 1. 创建任务

自动完成：提取软件包列表、推断 OS 发行版、评估重启需求、生成重启脚本。预检查和校验脚本留空，由用户后续上传或编辑。

```
POST /api/vap/v2/patch/task/create
```

**请求体**

```json
{
  "hostIds": ["host-001", "host-002"],
  "patchIds": ["CVE-2025-1234", "CVE-2025-5678"],
  "patchStatusIds": ["status-001", "status-002"],
  "osType": "linux"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| hostIds | string[] | 是 | 目标主机 ID |
| patchIds | string[] | 是 | 补丁 ID |
| patchStatusIds | string[] | 否 | 机器补丁状态 ID，用于评估重启和推断 OS |
| osType | string | 否 | 默认 `linux`，可选 `windows` |

**响应示例**

```json
{
  "id": "8a80cb8190xxx",
  "status": "CREATED",
  "currentStep": "PRE_CHECK",
  "restartType": "system",
  "restartReason": "包含内核补丁(kernel)，需要系统重启",
  "preCheckScript": null,
  "restartScript": "#!/bin/bash\n...",
  "validateScript": null
}
```

---

### 2. 查看任务详情

```
GET /api/vap/v2/patch/task/{id}
```

---

### 3. 任务列表

```
GET /api/vap/v2/patch/task/list?status=CREATED&page=0&size=20
```

---

### 4. 上传脚本文件

上传预执行或校验脚本文件（shell 脚本），读取文件内容存入对应脚本字段。可随时调用。

```
POST /api/vap/v2/patch/task/{id}/script/upload
Content-Type: multipart/form-data
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| scriptType | string | 是 | 脚本类型：`pre-check` / `validate` / `restart` |
| file | MultipartFile | 是 | 脚本文件 |

---

### 5. 编辑脚本内容

直接编辑/粘贴脚本内容，编辑器默认留空。可随时调用。

```
PUT /api/vap/v2/patch/task/{id}/script/update
```

```json
{
  "scriptType": "pre-check",
  "content": "#!/bin/bash\necho 'pre-check...'"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| scriptType | string | 是 | 脚本类型：`pre-check` / `validate` / `restart` |
| content | string | 否 | 脚本内容，为空时清空对应脚本 |

---

### 6. 获取重启策略（自动判断）

平台根据所选补丁的属性**自动判断**是否需要重启，以及是服务重启还是系统重启。用户不需要选择重启类型，只需决定是否执行重启。

```
GET /api/vap/v2/patch/task/{id}/restart/options
```

**响应字段**

| 字段 | 类型 | 说明 |
|------|------|------|
| restartType | string | 平台判断的重启类型：`system` / `service` / `none` |
| restartReason | string | 重启原因 |
| restartRequired | boolean | 是否需要重启 |
| restartLabel | string | 重启类型的中文标签 |
| restartDescription | string | 重启建议描述 |

**响应示例（补丁需要服务重启时）**

```json
{
  "restartType": "service",
  "restartReason": "受影响的服务需要重启",
  "restartRequired": true,
  "restartLabel": "服务重启",
  "restartDescription": "该补丁影响相关服务，平台建议进行服务重启以使补丁生效"
}
```

**响应示例（补丁需要系统重启时）**

```json
{
  "restartType": "system",
  "restartReason": "包含内核补丁(kernel)，需要系统重启",
  "restartRequired": true,
  "restartLabel": "系统重启",
  "restartDescription": "该补丁包含内核级变更，平台建议进行系统重启以使补丁生效"
}
```

**响应示例（无需重启时）**

```json
{
  "restartType": "none",
  "restartReason": "",
  "restartRequired": false,
  "restartLabel": "无需重启",
  "restartDescription": "该补丁无需重启即可生效"
}
```

---

### 7. 执行预检查

执行用户上传/编辑的预执行脚本。

```
POST /api/vap/v2/patch/task/{id}/pre-check/execute
```

---

### 7.1 跳过预检查

```
POST /api/vap/v2/patch/task/{id}/pre-check/skip
```

---

### 8. 执行补丁安装

```
POST /api/vap/v2/patch/task/{id}/install/execute
```

> 仅限制不能重复触发（正在安装中时不可再次调用）。

---

### 9. 确认是否重启

重启类型（系统重启/服务重启）由平台根据补丁属性自动判断，用户只需决定是否执行。选择执行重启时，必须传入 `confirmText="确认重启"` 进行二次确认。

```
POST /api/vap/v2/patch/task/{id}/restart/confirm
```

**确认执行重启**

```json
{
  "confirm": true,
  "confirmText": "确认重启"
}
```

**跳过重启**

```json
{
  "confirm": false
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| confirm | boolean | 是 | `true`=执行重启, `false`=跳过重启 |
| confirmText | string | 条件必填 | confirm=true 时必须为"确认重启" |

---

### 10. 执行重启

```
POST /api/vap/v2/patch/task/{id}/restart/execute
```

- `system`：调用已有 reboot job
- `service`：通过 JAO 执行平台生成的服务重启脚本

---

### 11. 执行校验

执行用户上传/编辑的校验脚本。

```
POST /api/vap/v2/patch/task/{id}/validate/execute
```

---

### 11.1 跳过校验

```
POST /api/vap/v2/patch/task/{id}/validate/skip
```

---

## 回调接口（JAO → VAP）

| 路径 | 说明 |
|------|------|
| `POST /api/vap/v2/callback/pre-check` | 预检查完成 |
| `POST /api/vap/v2/callback/update` | 安装完成（复用已有） |
| `POST /api/vap/v2/callback/restart` | 服务重启完成 |
| `POST /api/vap/v2/callback/validate` | 校验完成 |

---

## 平台自动判断规则

### 重启类型判断

根据补丁受影响的包名自动判断：匹配系统重启包名列表 → 系统重启；有包但无一匹配 → 服务重启；无包 → 无需重启。

**系统重启包名列表**（包名以下列前缀开头 → 系统重启）：

| 包名/前缀 | 说明 |
|-----------|------|
| `kernel` | 内核包（kernel, kernel-PAE, kernel-rt, kernel-smp, kernel-xen） |
| `linux-image` | Debian/Ubuntu 内核镜像包 |
| `linux-firmware` | Linux 固件包 |
| `*-firmware-*` | 其他固件包（包名包含 `-firmware`） |
| `dbus` | D-Bus 消息总线 |
| `glibc` | GNU C 库 |
| `hal` | 硬件抽象层 |
| `systemd` | 系统和服务管理器 |
| `udev` | 设备管理守护进程 |
| `gnutls` | GnuTLS 加密库 |
| `openssl-libs` | OpenSSL 运行库 |

**判断逻辑**：

| 情况 | 判断结果 |
|------|---------|
| 任一受影响包匹配上述列表 | `system`（系统重启） |
| 有受影响包但无一匹配 | `service`（服务重启） |
| 无受影响包 | `none`（无需重启） |

### 服务重启逻辑

服务重启采用 **代码映射 + 脚本执行** 的分层设计：

1. **Java 代码**（创建任务时完成）：
   - 过滤掉系统重启包（kernel, glibc 等）
   - 将剩余包名按映射表解析为具体的 **服务名列表**
   - 将服务名列表传入脚本生成器

2. **生成的脚本**（执行时在目标主机运行）：
   - 仅接收服务名列表，不做包名映射
   - 逐个检查服务状态：运行中 → 重启；未运行 → 跳过提示
   - 统计重启/跳过/失败数量

**包名 → 服务映射表**（包名前缀匹配，在 Java 代码中完成）：

| 软件包前缀 | 关联服务 |
|-----------|---------|
| openssl / libssl | nginx, httpd, apache2, sshd, vsftpd, postfix, dovecot |
| openssh | sshd |
| httpd | httpd |
| nginx | nginx |
| python | firewalld, tuned |
| php | php-fpm |
| postgresql | postgresql |
| mariadb | mariadb |
| mysql | mysqld |
| redis | redis |
| docker | docker |
| containerd | containerd |
| samba | smb, nmb |
| nfs-utils | nfs-server |
| rsyslog | rsyslog |
| cronie | crond |
| postfix | postfix |
| dovecot | dovecot |
| vsftpd | vsftpd |
| chrony | chronyd |
| ntp | ntpd |
| cups | cups |
| bind | named |
| dhcp | dhcpd |
| squid | squid |
| haproxy | haproxy |
| keepalived | keepalived |
| tomcat | tomcat |
| NetworkManager | NetworkManager |
| firewalld | firewalld |
| tuned | tuned |

**生成的脚本示例**：

```bash
#!/bin/bash
echo "========== 服务重启 =========="
echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"

RESTARTED=0
SKIPPED=0
FAILED=0

SERVICES=(nginx httpd sshd)

for svc in "${SERVICES[@]}"; do
  if systemctl is-active --quiet "$svc" 2>/dev/null; then
    echo "[重启] $svc"
    if systemctl restart "$svc"; then
      echo "  → $svc 已重启，状态: $(systemctl is-active $svc)"
      RESTARTED=$((RESTARTED+1))
    else
      echo "  → [失败] $svc 重启失败"
      FAILED=$((FAILED+1))
    fi
  else
    echo "[跳过] $svc 未运行，无需重启"
    SKIPPED=$((SKIPPED+1))
  fi
done

echo "========== 服务重启完成 =========="
echo "重启: ${RESTARTED}, 跳过: ${SKIPPED}, 失败: ${FAILED}"
```

**脚本执行输出示例**：
```
========== 服务重启 ==========
时间: 2026-03-27 10:30:00
[重启] nginx
  → nginx 已重启，状态: active
[重启] sshd
  → sshd 已重启，状态: active
[跳过] httpd 未运行，无需重启
========== 服务重启完成 ==========
重启: 2, 跳过: 1, 失败: 0
```

---

## 完整调用示例

每一步都可独立调用，以下为推荐顺序：

```
# 1. 创建任务
POST /create → taskId, restartType, 重启脚本 (预检查/校验脚本为空)

# 2. 上传或编辑脚本（可随时操作）
POST /{id}/script/upload  scriptType=pre-check, file=xxx.sh
PUT  /{id}/script/update  {"scriptType":"validate","content":"#!/bin/bash\n..."}

# 3. 预检查（可独立执行或跳过）
POST /{id}/pre-check/execute → 轮询 GET /{id}
POST /{id}/pre-check/skip

# 4. 安装（可独立执行）
POST /{id}/install/execute → 轮询 GET /{id}

# 5. 重启（可独立操作）
GET  /{id}/restart/options → 查看平台判断结果
POST /{id}/restart/confirm  {"confirm":true,"confirmText":"确认重启"}
POST /{id}/restart/execute → 轮询 GET /{id}
# 或跳过
POST /{id}/restart/confirm  {"confirm":false}

# 6. 校验（可独立执行或跳过）
POST /{id}/validate/execute → 轮询 GET /{id}
POST /{id}/validate/skip
```

---

## 前端集成

1. **创建**后展示重启建议信息，预检查和校验脚本区域留空，支持上传文件或直接粘贴编辑
2. **脚本区域**：提供上传按钮和文本编辑区，编辑器默认内容为空，可随时操作
3. **每步**独立展示操作按钮，点击执行后轮询 `GET /{id}`（3-5秒），根据 `status` 更新 UI
4. **步骤间无依赖**：不需要根据上一步的 status 来决定是否显示下一步的操作按钮
5. **重启步骤**：
   - 调用 `GET /{id}/restart/options` 获取平台自动判断结果
   - 展示 `restartLabel`（如"系统重启"）和 `restartDescription` 作为提示
   - 如果 `restartRequired=true`：显示"确认重启"和"跳过重启"两个按钮
   - 用户点击"确认重启"时，弹出确认框要求输入"确认重启"四字
   - 如果 `restartRequired=false`：显示"无需重启"提示
6. **异常**：`*_FAILED` 状态展示 `errorMessage`，不阻塞其他步骤操作

---

## 数据库表

表名：`vap2_patch_install_task`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(64) | 主键 |
| status | VARCHAR(32) | 任务状态（记录最近操作结果） |
| current_step | VARCHAR(32) | 最近操作的步骤 |
| host_ids | TEXT | 主机 ID (JSON) |
| patch_ids | TEXT | 补丁 ID (JSON) |
| patch_status_ids | TEXT | 状态 ID (JSON) |
| os_type | VARCHAR(16) | 系统类型 |
| os_distro | VARCHAR(64) | 发行版 |
| patch_pkgs | TEXT | 软件包 (JSON) |
| pre_check_script | TEXT | 预检查脚本 |
| pre_check_run_id | VARCHAR(64) | 预检查执行 ID |
| install_run_id | VARCHAR(64) | 安装执行 ID |
| restart_type | VARCHAR(16) | 平台自动判断: none/service/system |
| restart_reason | VARCHAR(512) | 重启原因 |
| restart_confirmed | TINYINT(1) | 是否已确认 |
| restart_action | VARCHAR(16) | 实际执行的重启类型 |
| restart_script | TEXT | 重启脚本 |
| restart_run_id | VARCHAR(64) | 重启执行 ID |
| validate_script | TEXT | 校验脚本 |
| validate_run_id | VARCHAR(64) | 校验执行 ID |
| error_message | TEXT | 错误信息 |
| created_time | DATETIME | 创建时间 |
| updated_time | DATETIME | 更新时间 |
| tenant_id | VARCHAR(64) | 租户 ID |
