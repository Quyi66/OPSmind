# 前端改造通知：清理已下线的 DTS 数据源接口残留

> 适用仓库：opsmind-web（基于线上 2.1.4 包实测排查结果）
> 背景：后端 `oplus-dts` 服务已整体下线，所有 `/dts/api/dts/...` 路径均返回 404。经排查线上前端包，还有 4 处残留调用需要处理。

## 1. 数据源管理页（`SscDataSourcePage`）— 整页下线

- **现状**：页面调用 `/dts/api/dts/datasources`（增删改查 + `datasources/test` 连接测试），全部 404。
- **改法**：该功能已整体废弃，无替代接口。请删除该页面组件，并移除对应的菜单项和前端路由入口。

## 2. 应用资源页（`SscAppResPage`）— 改调新接口或删除

- **现状**：调用 `/dts/api/dts/datasets?...` 和 `/dts/api/dts/datasets/move/...`，404。
- **改法**：数据集资源的导入导出已由新接口接管，改调：
  - `GET /sjxy-console/adm/api/adm/aou/dataset/all`（数据集资源）
  - 相关的还有 `aou/applet/all`、`aou/page/all`、`appres`
- 如页面上"数据集移动/管理"类操作无对应新接口，则删除该操作入口。

## 3. PMS 密码管理页 — 两个查询需与后端确认

- **现状**：4 个 index bundle 中调用 `POST /dts/api/dts/q/data/PMS_GET_PASSWORD/` 和 `POST /dts/api/dts/q/data/PMS_GET_SERVER_HISTORY/`。这两个数据集 code 在新旧数据库中都不存在，属于历史死功能。
- **改法**：先确认页面上对应功能是否还在用。不用则直接删掉调用；确实需要的话联系后端在 dashboard 服务（`/sjxy-console/dashboard/api/sys/dashboard/` 前缀）新增对应端点后再改路径。目前后端已有的 PMS 端点只有 pms-server、pms-audit-log 等 6 个。

## 4. 自查清单补充

之前的自查关键字（`docs/sjxy-frontend-routing-migration.md` 第八节）漏掉了相对路径写法，请在全局搜索清单中**追加以下关键字，改完后必须为 0**：

```text
/dts/api/dts
/api/dts/
```

## 附：一处文档勘误

资产属性接口的实际路径是 `GET /sjxy-console/cmdb/api/cmdb/ci/get/attr/{nodeName}/{assetType}`（此前文档写的 `ci/attr/inventory/...` 有误），如有页面用到请以实际路径为准。

## 无需改动的部分

其余低代码接口均已在 162 实测正常，无需前端改动：

- 工作台：`/sjxy-console/workspace/api/workspace/applets`（及 pages/folders/tags/home）
- 动态数据模型：`GET/POST /sjxy-console/workflow/api/workflow/universal/dc/{model}`
- dc 数据：`/sjxy-console/workflow/api/workflow/dc/data`
- 应用资源：`/sjxy-console/adm/api/adm/aou/*`、`appres`
- 工作台页面历史：`/sjxy-console/dashboard/api/sys/dashboard/workspace-page-history`
