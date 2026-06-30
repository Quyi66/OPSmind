# 操作日志查询接口（含目标节点）

> 用于**替代**原 DTS 数据集查询 `dts/api/dts/q/data/JAO_LIST_OPERATION_LOG`。
> 接口契约与 **sjxy-init 分支**完全统一（路径、参数、返回结构一致，前端一套代码两边通用）；
> oplus 侧实现采用**两段式查询**重写（详见「5. 性能与设计」），在分页/大数据量下性能优于原单 SQL 方案。
> 在原 DTS 字段基础上**新增「目标节点」**（`target_hosts`），解决列表「目标节点」列为空的问题；同时保留「执行引擎节点」（`ata_node`）。

---

## 1. 基本信息

| 项 | 值 |
|---|---|
| 请求方式 | `GET` |
| 网关地址（sjxy 侧） | `/sjxy-portal/jao/api/jao/dashboard/list-operation-log` |
| 网关地址（oplus 侧） | `/oplus-portal/jao/api/jao/dashboard/list-operation-log` |
| 服务内地址 | `/api/jao/dashboard/list-operation-log`（经 `jao` 路由 `/{portal}/jao/api/jao/** → /api/jao/` 转发） |
| 鉴权 | 沿用 `jao` 路由的登录鉴权（需登录态；`tenantId` 由后端从 Token 自动提取，前端不传） |
| 返回类型 | `application/json`（统一包装：`{ code, message, total, data }`） |
| 实现位置（oplus） | `oplus-jao` 模块 `web/JaoDashboardController` + `service/JaoDashboardService`（两段式查询） |
| 实现位置（sjxy-init） | `sjxy-workflow` 模块 `JaoDashboardResource` / `mapper/jao/JaoDashboardMapper.xml`（单 SQL） |

> 前端只需把原来调用 `dts/api/dts/q/data/JAO_LIST_OPERATION_LOG` 的地方，改为按上表 GET 调用本接口；取值用 `response.data.data`（注意两层 `.data`）。

---

## 2. 请求参数（Query）

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `module` | string | 是 | 模块，多个用英文逗号分隔（内部按 `find_in_set` 匹配）。常用：`vap2,upm` |
| `action` | string | 是 | 操作类型；`all` 表示不过滤；多个用英文逗号分隔（`find_in_set`） |
| `status` | string | 是 | 状态；`all` 表示不过滤；多个用英文逗号分隔（`find_in_set`） |
| `day` | string | 是 | 时间范围：`all`=不限；`1`=今天；`N`=最近 N 天（N 为正整数） |
| `page` | int | 否 | 页码，从 1 开始；不传则不分页 |
| `size` | int | 否 | 每页条数（最大 500）；不传（或 ≤0）则返回全部命中记录 |

> 说明：`module`/`action`/`status`/`day` 为必填（Spring `@RequestParam`），不需要过滤的维度请显式传 `all`。
> `page`/`size` 为**可选分页参数**：均不传时返回全部记录（与 sjxy-init 默认行为一致）；传入有效 `size` 时按页返回。
> 无论是否分页，返回中的 `total` 始终为满足过滤条件的总记录数；结果按 `start_time` 倒序。

### 请求示例

```
# 不分页，返回全部
GET /sjxy-portal/jao/api/jao/dashboard/list-operation-log?module=vap2,upm&action=all&status=all&day=all
```

```
# 最近 7 天、仅 vap2 模块、第 2 页、每页 20 条
GET /sjxy-portal/jao/api/jao/dashboard/list-operation-log?module=vap2&action=all&status=all&day=7&page=2&size=20
```

---

## 3. 返回结构

```json
{
  "code": 200,
  "message": "success",
  "total": 135,
  "data": [
    {
      "run_id": "2c9942a78fc46407018fc46d2b51016b",
      "action": "PATCH_INSTALL",
      "message": "补丁安装",
      "status": "SUCCESS",
      "username": "admin",
      "start_time": "2026-06-29 16:19:39",
      "end_time": "2026-06-29 16:23:13",
      "run_record": true,
      "ata_node": "192.168.1.181",
      "target_hosts": "192.168.1.144,192.168.1.147"
    }
  ]
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|---|---|---|
| `code` | number | 业务状态码，`200` 表示成功 |
| `message` | string | 提示信息，成功为 `success` |
| `total` | number | 满足过滤条件的总记录数（用于分页；不分页时为全部记录数） |
| `data` | array | 记录列表，按 `start_time` 倒序；前端取值 `response.data.data` |
| `data[].run_id` | string | 运行/审计记录 ID（对应 `workflow_audit_log.id`，用于查看运行记录） |
| `data[].action` | string | 操作类型 |
| `data[].message` | string | 操作描述 |
| `data[].status` | string | 状态 |
| `data[].username` | string | 操作人 |
| `data[].start_time` | string | 开始时间，格式 `yyyy-MM-dd HH:mm:ss` |
| `data[].end_time` | string | 结束时间，格式 `yyyy-MM-dd HH:mm:ss` |
| `data[].run_record` | boolean | 是否有运行记录 |
| `data[].ata_node` | string | **执行引擎节点**，多个以英文逗号分隔（已剥离 `http(s)://` 与 `:3000`） |
| `data[].target_hosts` | string | **目标节点 IP**，多个以英文逗号分隔（新增，列表「目标节点」列用此字段） |

> 说明：`target_hosts` 来源于该 `run_id` 在 `jao_run_result_data.host_info_json`（sjxy 侧为 `workflow_run_result_data`）中记录的目标主机（取其 JSON key，即目标主机 IP）；若某条记录没有目标主机数据，则 `target_hosts` 为空字符串。

---

## 4. 与原 DTS 接口的差异

| 对比项 | 原 `JAO_LIST_OPERATION_LOG` | 本接口（统一后） |
|---|---|---|
| 调用方式 | `POST /api/dts/q/data/JAO_LIST_OPERATION_LOG/` | `GET /api/jao/dashboard/list-operation-log` |
| 目标节点 | 不返回（列表「目标节点」列为空） | 返回 `target_hosts`（目标 IP，逗号分隔） |
| 执行引擎节点 | `ata_node` | `ata_node`（不变） |
| 返回结构 | DTS 数据集结构 | 统一 `ApiResponse`：`{ code, message, total, data:[...] }` |
| 分页 | 不支持 | 可选 `page`/`size`，返回 `total`；不传则返回全部 |
| 默认过滤 | `action`/`status` 不传即查不到数据 | 显式传 `all` 表示不过滤（开箱即用返回数据） |
| 租户 | 需自行处理 | 由后端从 Token 自动注入 `tenantId` |

> 字段命名（`run_id`/`action`/`message`/`status`/`username`/`start_time`/`end_time`/`run_record`/`ata_node`）与原接口保持一致；列表「目标节点」列绑定新增的 `target_hosts` 字段即可。

---

## 5. 性能与设计

### 原 DTS / sjxy 单 SQL 方案的问题

原 DTS 数据集与 sjxy 实现均为「单条大 SQL」：`jao_audit_log LEFT JOIN jao_run_result_data` +
`GROUP BY id` + `GROUP_CONCAT`（外加 `target_hosts` 关联子查询）。在数据量增大时存在：

1. **行膨胀 + 临时表 + filesort**：一个 run 对应多条 result，JOIN 后膨胀再 `GROUP BY id` 折叠；
   且 `GROUP BY id` 与 `ORDER BY start_time` 列不一致，必须走临时表 + filesort。
2. **分页几乎无效**：`LIMIT` 在聚合/排序之后才截断，取第 1 页也要先 JOIN、聚合、排序全量数据，深翻页更差。
3. **`GROUP_CONCAT` 1024 字节静默截断**：主机/节点较多时 `ata_node`、`target_hosts` 会被截断。

### oplus 侧两段式重写

`oplus-jao` 的 `JaoDashboardService` 改为两段式：

1. **主表分页 + 计数**：先对 `jao_audit_log` 单表过滤、`ORDER BY start_time DESC`、`LIMIT` 分页，
   并单独 `COUNT(*)` 取总数。单表查询可走 `(tenant_id, start_time)` 索引，**无 JOIN / 无聚合 / 无临时表**。
2. **批量补关联**：仅对**当前页**的 `run_id` 调 `findAllByRunIdIn` 批量加载 `jao_run_result_data`，
   在 Java 侧用 `Set` 去重聚合 `ata_node` 与 `target_hosts`（**规避 GROUP_CONCAT 截断**）。

这样 JOIN 与聚合只作用于当前页的几十条记录，分页性能数量级提升。

### 配套索引

见 `docs/操作日志接口-索引优化.sql`，需在业务库手动执行：

```sql
CREATE INDEX idx_jao_audit_log_tenant_time ON jao_audit_log (tenant_id, start_time);
CREATE INDEX idx_jao_run_result_data_run   ON jao_run_result_data (run_id);
```

> 注：`module` 为 CSV 多值、用 `find_in_set` 匹配，无法走普通索引下推，故主表索引以 `(tenant_id, start_time)` 为主。
