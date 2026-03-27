# 补丁操作权限分配 API

> 基础路径：`/api/vap/v2/patch/assignment`  
> 权限要求：所有接口仅 **超级管理员（ROLE_ADMIN）** 可调用

## 功能说明

超级管理员可以将指定补丁分配给目标账户，设定有效时间（若干小时或永久）。被分配的用户登录后，**只能看到被分配且未过期的补丁**，其他补丁不可见。

- 用户没有任何有效分配记录时，可查看全部补丁（默认行为）
- 用户有有效分配记录时，仅能查看被分配的补丁
- 分配过期后，限制自动解除，恢复查看全部补丁
- 管理员可手动清理过期记录

---

## 1. 分配补丁给用户

**POST** `/api/vap/v2/patch/assignment`

将一批补丁分配给指定用户。对同一用户重复分配相同补丁时，会覆盖之前的记录（更新过期时间等）。

### 请求体

```json
{
  "userLogin": "zhangsan",
  "patchIds": ["RHSA-2026-0001", "RHSA-2026-0002", "KYSA-2026-0015"],
  "expireTime": "2026-03-27 02:00:00",
  "remark": "临时授权安装紧急安全补丁"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userLogin | String | 是 | 目标用户登录名 |
| patchIds | String[] | 是 | 要分配的补丁ID列表 |
| expireTime | String | 否 | 过期时间，格式 `yyyy-MM-dd HH:mm:ss`，不传或为空表示永久有效 |
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
      "expireTime": "2026-03-27 02:00:00",
      "createdBy": "admin",
      "createdTime": "2026-03-26 18:00:00",
      "tenantId": "ff808081727a047f017292d0d72e0004",
      "remark": "临时授权安装紧急安全补丁"
    }
  ]
}
```

### 错误响应 `400`

```json
{ "error": "userLogin 不能为空" }
{ "error": "patchIds 不能为空" }
{ "error": "过期时间不能早于当前时间" }
{ "error": "expireTime 格式错误，要求 yyyy-MM-dd HH:mm:ss" }
```

---

## 2. 撤销用户的指定补丁分配

**POST** `/api/vap/v2/patch/assignment/revoke`

### 请求体

```json
{
  "userLogin": "zhangsan",
  "patchIds": ["RHSA-2026-0001"]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userLogin | String | 是 | 用户登录名 |
| patchIds | String[] | 是 | 要撤销的补丁ID列表 |

### 成功响应 `200`

```json
{ "message": "撤销成功" }
```

---

## 3. 撤销用户的所有补丁分配

**DELETE** `/api/vap/v2/patch/assignment/user/{userLogin}`

撤销后，该用户恢复查看全部补丁。

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

支持按用户筛选和分页。

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
      "expireTime": "2026-03-27 02:00:00",
      "createdBy": "admin",
      "createdTime": "2026-03-26 18:00:00",
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

## 7. 清理过期的分配记录

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
| 用户没有任何分配记录 | 全部补丁（默认行为，不受影响） |
| 用户有有效（未过期）分配 | 仅被分配的补丁 |
| 用户的分配全部过期 | 全部补丁（限制自动解除） |
| 管理员给用户新增分配 | 即时生效，无需重新登录 |
| 管理员撤销所有分配 | 即时恢复查看全部补丁 |
| expireTime 为空 | 永久有效，直到手动撤销 |

## 数据库表

```sql
CREATE TABLE vap2_patch_assignment (
    id              VARCHAR(64)   NOT NULL PRIMARY KEY,
    user_login      VARCHAR(50)   NOT NULL COMMENT '被分配的用户登录名',
    patch_id        VARCHAR(255)  NOT NULL COMMENT '补丁ID',
    expire_time     DATETIME      NULL     COMMENT '过期时间，NULL=永久有效',
    created_by      VARCHAR(50)   NOT NULL COMMENT '分配人',
    created_time    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tenant_id       VARCHAR(64)   NOT NULL,
    remark          VARCHAR(512)           COMMENT '备注',
    UNIQUE KEY uk_user_patch_tenant (user_login, patch_id, tenant_id)
);
```
