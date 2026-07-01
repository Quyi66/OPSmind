# SQL 文件执行接口（前端对接文档）

把又大又多、人工不好执行的 SQL 交给后端统一落库。支持单文件、gzip 压缩、tar 多文件打包，
单库脚本可达 **数 GB ~ 数十 GB**，全程流式执行；异步执行 + 进度查询。

- 模块：`oplus-vap`
- 路由前缀：`/api/vap/v2/sql`
- 实现：`SqlImportController` / `SqlImportService` / `SqlScriptRunner`

---

## 一、安全（重要）

- **仅超级管理员（登录名 = `admin`）可调用**，与平台其它「超管」能力同口径；非超管返回 `403`。
- 该接口可执行任意 SQL，破坏力极强，请仅在受信运维入口暴露。
- 调用需携带平台登录态（与其它 `/api/vap/v2/**` 接口一致，由网关/shiro 注入用户身份）。

---

## 二、为什么是「执行服务器文件」而不是「上传」

几百 MB ~ 数十 GB 的文件直接走 HTTP 上传会被 nginx（`client_max_body_size`）和网关（请求体缓冲、
堆内存有限）拦截或拖垮，不稳。故统一改为：**先把文件放到服务器白名单目录，再触发执行**，
由后端从本地磁盘流式读取，请求本身只带查询参数、无大 body，不受任何体积限制。

放置目录：系统参数 `vap.sql_import_dir`（未配置时默认 `/opt/oplus/assets/gfs/fs-repos`，与周更 GFS 挂载点同源）。

```bash
# 先把文件（推荐 gzip 压缩）放到白名单目录
scp oplus-stable-release-2026Q1.sql.gz user@server:/opt/oplus/assets/gfs/fs-repos/
```

---

## 三、支持的文件类型

| 扩展名 | 说明 |
|---|---|
| `.sql` | 单个 SQL 脚本 |
| `.sql.gz` / `.gz` | gzip 压缩的单个脚本（**首选**，体积约为原文 1/3） |
| `.tar` / `.tar.gz` / `.tgz` | 打包多个 `.sql`，按**打包顺序**依次执行（包内非 `.sql` 条目忽略） |

> tar 内多文件想控制顺序，请打包时用数字前缀，例如：
> `tar czf bundle.tar.gz 01_ddl.sql 02_data.sql 03_index.sql`

SQL 内容可包含任意类型语句：建表 / 加字段 / 建索引、`INSERT/UPDATE/DELETE/REPLACE`、
存储过程（`DELIMITER $$`）、mariadb-dump 头部 `/*!40101 ... */` 等，均原生支持。

---

## 四、通用参数

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `async` | boolean | `true` | `true` 后台执行、立即返回 `jobId`；`false` 同步执行完再返回完整结果 |
| `continueOnError` | boolean | `false` | `false` 遇错即停；`true` 记录错误并继续（适合幂等可重入脚本） |
| `dryRun` | boolean | `false` | `true` 只解析计数、**不执行**，用于上线前校验文件能否被正确解析 |

> 大文件务必用 `async=true`，避免超过网关/前端超时。

---

## 五、接口

### 1. 执行服务器文件 `POST /api/vap/v2/sql/run-file`

查询参数：`file`（必填，白名单目录内的相对文件名，禁止越权路径）、`async`、`continueOnError`、`dryRun`。

```bash
curl -X POST "https://host/api/vap/v2/sql/run-file?file=oplus-stable-release-2026Q1.sql.gz&async=true"
```

### 2. 查询执行结果/进度 `GET /api/vap/v2/sql/result/{jobId}`

异步执行后轮询该接口查看进度与最终结果。

```bash
curl "https://host/api/vap/v2/sql/result/3f2a9c8b1d4e4f..."
```

---

## 六、响应

### 异步受理（`async=true`，HTTP 202）

```json
{
  "jobId": "3f2a9c8b1d4e4f7a...",
  "status": "PENDING",
  "resultUrl": "/api/vap/v2/sql/result/3f2a9c8b1d4e4f7a...",
  "message": "已接收，后台执行中，请轮询 resultUrl 查看进度"
}
```

### 结果/进度（`GET /result/{id}`，或 `async=false` 的直接返回）

```json
{
  "jobId": "3f2a9c8b1d4e4f7a...",
  "fileName": "oplus-stable-release-2026Q1.sql.gz",
  "status": "SUCCESS",
  "dryRun": false,
  "continueOnError": true,
  "currentEntry": null,
  "totalStatements": 1280,
  "failedStatements": 0,
  "startTime": 1750928400000,
  "endTime": 1750928412345,
  "elapsedMs": 12345,
  "message": null,
  "entries": [
    { "entry": "oplus-stable-release-2026Q1.sql.gz", "statements": 1280 }
  ],
  "errors": [],
  "errorsTruncated": false
}
```

字段说明：

| 字段 | 说明 |
|---|---|
| `status` | `PENDING` / `RUNNING` / `SUCCESS` / `FAILED` |
| `totalStatements` | 已执行（或 dryRun 已解析）的语句条数，可作进度参考 |
| `failedStatements` | 失败语句数（`continueOnError=true` 时可 > 0） |
| `currentEntry` | tar 多文件场景下当前正在执行的子文件名 |
| `entries[]` | 各文件执行小结（tar 包内一个 `.sql` 一项） |
| `errors[]` | 失败语句明细：`entry`/`sql`(截断片段)/`error`，最多保留 200 条 |
| `errorsTruncated` | 失败明细是否被截断（实际失败数多于 `errors` 列表长度） |
| `elapsedMs` | 已耗时（运行中为「至今」耗时） |

---

## 七、状态码

| HTTP | 含义 |
|---|---|
| `200` | 同步执行成功 / 结果查询成功 |
| `202` | 异步已受理，去轮询 `resultUrl` |
| `400` | 参数错误：类型不支持、路径越权、文件不存在 |
| `403` | 非超级管理员 |
| `404` | `jobId` 不存在或已过期（仅保留最近约 200 个任务的内存状态） |
| `500` | 执行失败（`status=FAILED`，详见响应体 `message` / `errors`） |

---

## 八、行为与注意事项

- **执行语义**：复用一条数据库连接，关闭自动提交，每 500 条 + 收尾各提交一次；
  即便脚本里写了 `SET autocommit=0` 而无结尾 `COMMIT`，收尾也会统一提交。
- **遇错**：`continueOnError=false` 时，第一条失败即停止并 `FAILED`（DDL 在 MySQL 会隐式提交，已提交部分不回滚）；
  `continueOnError=true` 时记录错误继续，最终 `SUCCESS` 但 `failedStatements>0`。建议脚本写成幂等（`IF NOT EXISTS` / `REPLACE INTO` / `ON DUPLICATE KEY`）。
- **dryRun**：只切分计数，可在正式执行前确认文件能被正确解析、语句条数符合预期。
- **源文件**：`/run-file` 执行后**不删除**白名单目录里的源文件。
- **任务状态**：保存在内存（最近约 200 个），服务重启或超量淘汰后 `result` 查询返回 `404`，请在执行期间及时轮询。
