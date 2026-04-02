# 补丁操作权限分配 API

> 基础路径：`/api/vap/v2/patch/assignment`  
> 权限要求：所有接口仅 **超级管理员（ROLE_ADMIN）** 可调用

## 功能说明

超级管理员从 **所有机器的扫描记录** 出发，按 **补丁 + 机器** 维度将操作权限分配给目标账户。

### 分配流程

1. 管理员调用 `GET /available-patches` — 从扫描结果中列出每个补丁及其影响的机器列表
2. 管理员逐个补丁选择目标机器和目标用户，调用 `POST /assignment` — 将补丁+机器组合分配给目标用户

> 注意：分配数据来源是 `vap2_curr_machine_patch`（扫描结果表），不是补丁仓库。只有扫描中实际检测到的 (patch_id, host_id) 组合才能被分配。

### 权限效果

- **补丁仓库**：普通用户只能看到被分配且未过期的补丁（按分配的机器数统计）
- **补丁安装**：只能对被分配的补丁+机器组合发起安装/回滚任务
- **任务列表**：普通用户只能看到自己创建的任务
- 用户没有任何有效分配记录时，补丁仓库和安装页面为空（需管理员先分配）
- 分配过期后，限制自动解除

---

## 1. 分配补丁+机器给用户

**POST** `/api/vap/v2/patch/assignment`

按补丁+机器维度分配。只能分配扫描中实际存在的组合，不存在的组合会被跳过并在响应中提示。  
对同一用户重复分配相同 (patchId, hostId) 时会覆盖之前的记录。

### 请求体

```json
{
  "userLogin": "zhangsan",
  "items": [
    {
      "patchId": "RHSA-2026-0001",
      "hostIds": ["host-001", "host-002"]
    },
    {
      "patchId": "KYSA-2026-0015",
      "hostIds": ["host-003"]
    }
  ],
  "expireTime": "2026-04-10 02:00:00",
  "remark": "临时授权安装紧急安全补丁"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userLogin | String | 是 | 目标用户登录名 |
| items | Object[] | 是 | 分配项列表，每项包含一个补丁和该补丁对应的机器 |
| items[].patchId | String | 是 | 补丁ID |
| items[].hostIds | String[] | 是 | 机器ID列表（对应 acm_ci.id / CurrMachineStatus.hostId） |
| expireTime | String | 否 | 过期时间，格式 `yyyy-MM-dd HH:mm:ss`，不传表示永久有效 |
| remark | String | 否 | 备注说明 |

### 成功响应 `200`

```json
{
  "count": 3,
  "assignments": [
    {
      "id": "8a80cb8190a1b2c30190a1b2c3f00001",
      "userLogin": "zhangsan",
      "patchId": "RHSA-2026-0001",
      "hostId": "host-001",
      "expireTime": "2026-04-10 02:00:00",
      "createdBy": "admin",
      "createdTime": "2026-04-01 18:00:00",
      "tenantId": "ff808081727a047f017292d0d72e0004",
      "remark": "临时授权安装紧急安全补丁"
    }
  ]
}
```

### 错误响应 `400`

```json
{ "error": "userLogin 不能为空" }
{ "error": "items 不能为空" }
{ "error": "没有有效的补丁+机器组合可以分配（所有组合均不在扫描结果中）" }
{ "error": "过期时间不能早于当前时间" }
{ "error": "expireTime 格式错误，要求 yyyy-MM-dd HH:mm:ss" }
```

---

## 2. 撤销用户的指定补丁+机器分配

**POST** `/api/vap/v2/patch/assignment/revoke`

### 请求体

```json
{
  "userLogin": "zhangsan",
  "patchId": "RHSA-2026-0001",
  "hostIds": ["host-001", "host-002"]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userLogin | String | 是 | 用户登录名 |
| patchId | String | 是 | 补丁ID |
| hostIds | String[] | 是 | 要撤销的机器ID列表 |

### 成功响应 `200`

```json
{ "message": "撤销成功" }
```

---

## 3. 撤销用户的所有补丁分配

**DELETE** `/api/vap/v2/patch/assignment/user/{userLogin}`

撤销后，该用户的补丁仓库和安装页面将为空，直到重新分配。

### 路径参数

| 参数 | 说明 |
|------|------|
| userLogin | 用户登录名 |

### 成功响应 `200`

```json
{ "message": "已撤销用户 zhangsan 的所有补丁分配" }
```

---

## 4. 撤销单条分配记录

**DELETE** `/api/vap/v2/patch/assignment/{id}`

### 路径参数

| 参数 | 说明 |
|------|------|
| id | 分配记录ID |

### 成功响应 `200`

```json
{ "message": "撤销成功" }
```

---

## 5. 查询分配列表

**GET** `/api/vap/v2/patch/assignment/list`

支持按用户筛选和分页。每行记录包含 patchId + hostId。

### 请求参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| userLogin | String | 否 | - | 按用户名筛选，不传则返回全部 |
| page | int | 否 | 0 | 页码（从0开始） |
| size | int | 否 | 20 | 每页条数 |

### 请求示例

```
GET /api/vap/v2/patch/assignment/list?userLogin=zhangsan&page=0&size=10
```

### 成功响应 `200`

```json
{
  "content": [
    {
      "id": "8a80cb8190a1b2c30190a1b2c3f00001",
      "userLogin": "zhangsan",
      "patchId": "RHSA-2026-0001",
      "hostId": "host-001",
      "expireTime": "2026-04-10 02:00:00",
      "createdBy": "admin",
      "createdTime": "2026-04-01 18:00:00",
      "tenantId": "ff808081727a047f017292d0d72e0004",
      "remark": "临时授权"
    }
  ],
  "totalElements": 15,
  "totalPages": 2,
  "size": 10,
  "number": 0,
  "first": true,
  "last": false
}
```

---

## 6. 查询已分配补丁的用户列表

**GET** `/api/vap/v2/patch/assignment/users`

返回当前租户下所有有分配记录的用户登录名列表（去重），用于管理页面的用户筛选下拉框。

### 成功响应 `200`

```json
["zhangsan", "lisi", "wangwu"]
```

---

## 7. 查询可分配的补丁列表（基于扫描结果，分页）

**GET** `/api/vap/v2/patch/assignment/available-patches?page=0&size=20`

管理员分配入口。从所有机器的扫描记录（`vap2_curr_machine_patch`）中分页列出补丁，每条补丁包含影响的机器列表，按影响机器数倒序排列。

### 请求参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | int | 否 | 0 | 页码（从0开始） |
| size | int | 否 | 20 | 每页条数 |

### 成功响应 `200`

```json
{
  "content": [
    {
      "patchId": "RHSA-2026-0001",
      "patchName": "Security Update for OpenSSL",
      "severity": "Critical",
      "hostCount": 12,
      "hosts": [
        { "hostId": "host-001", "hostKey": "192.168.1.10" },
        { "hostId": "host-002", "hostKey": "192.168.1.11" }
      ]
    },
    {
      "patchId": "KYSA-2026-0015",
      "patchName": "Kylin Security Advisory",
      "severity": "Important",
      "hostCount": 5,
      "hosts": [
        { "hostId": "host-003", "hostKey": "10.0.0.5" }
      ]
    }
  ],
  "totalElements": 48,
  "totalPages": 3,
  "size": 20,
  "number": 0
}
```

| 字段 | 说明 |
|------|------|
| content[].patchId | 补丁ID |
| content[].patchName | 补丁名称（来自 vap2_patch.title，可能为 null） |
| content[].severity | 严重程度（Critical/Important/Moderate/Low，可能为 null） |
| content[].hostCount | 该补丁影响的机器总数 |
| content[].hosts | 该补丁影响的机器列表 |
| content[].hosts[].hostId | 机器ID（对应 acm_ci.id，分配和任务创建时使用此值） |
| content[].hosts[].hostKey | 机器标识（如 IP 地址，仅供展示） |
| totalElements | 总补丁数 |
| totalPages | 总页数 |
| size | 每页条数 |
| number | 当前页码 |

---

## 8. 清理过期的分配记录

**POST** `/api/vap/v2/patch/assignment/clean-expired`

删除所有已过期的分配记录。可由管理员手动调用或定时任务触发。

### 成功响应 `200`

```json
{ "cleaned": 5 }
```

---

## 业务规则说明

| 场景 | 用户看到的补丁 |
|------|----------------|
| 用户没有任何分配记录 | 补丁仓库为空（需管理员先分配） |
| 用户有有效（未过期）分配 | 仅被分配的补丁，影响机器数按分配的机器统计 |
| 用户的分配全部过期 | 补丁仓库为空 |
| 管理员给用户新增分配 | 即时生效，无需重新登录 |
| 管理员撤销所有分配 | 补丁仓库清空 |
| expireTime 为空 | 永久有效，直到手动撤销 |
| 任务列表 | 普通用户只能看到自己创建的任务 |
| 创建安装/回滚任务 | 校验所有 patchId × hostId 是否在用户分配范围内 |

## 数据库表

```sql
CREATE TABLE vap2_patch_assignment (
    id              VARCHAR(64)   NOT NULL PRIMARY KEY,
    user_login      VARCHAR(50)   NOT NULL COMMENT '被分配的用户登录名',
    patch_id        VARCHAR(255)  NOT NULL COMMENT '补丁ID',
    host_id         VARCHAR(128)  NOT NULL COMMENT '机器ID(对应 acm_ci.id)',
    expire_time     DATETIME      NULL     COMMENT '过期时间，NULL=永久有效',
    created_by      VARCHAR(50)   NOT NULL COMMENT '分配人',
    created_time    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tenant_id       VARCHAR(64)   NOT NULL,
    remark          VARCHAR(512)           COMMENT '备注',
    UNIQUE KEY uk_user_patch_host_tenant (user_login, patch_id, host_id, tenant_id),
    INDEX idx_user_tenant (user_login, tenant_id),
    INDEX idx_patch_host (patch_id, host_id)
);
```
