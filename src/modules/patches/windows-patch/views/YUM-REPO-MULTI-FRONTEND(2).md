# YUM 源多 Repo 前端调整说明

## 背景

原页面只支持填写一个 `baseurl`，适合 merged 仓库。客户现场可能按系统仓库拆分为多个 repo，例如 Kylin V10 常见 `base`、`updates`、`addons`。前端需要支持在同一条 YUM 源配置中录入多个 repo 地址，后端会分别采集并在补丁比对时合并匹配。

## 页面调整

将原「YUM源地址」单输入框调整为可动态增删的多行输入：

- 左侧标签：`YUM repo仓库名称`
- 输入框 placeholder：`请输入仓库baseurl地址`
- 输入框右侧增加 `+` 按钮，用于新增一行 repo 地址
- 多于一行时建议提供删除按钮
- 至少保留一行且至少一个地址非空

建议保留原字段：

- `name`：YUM 源名称
- `description`：描述
- `file`：YUM 源文件

## 请求字段

新增和编辑配置时使用 `baseurls` 数组提交多个 repo 地址。

```json
{
  "name": "kylin-v10",
  "description": "麒麟 V10",
  "baseurls": [
    "http://repo.example.com/kylin/base",
    "http://repo.example.com/kylin/updates",
    "http://repo.example.com/kylin/addons"
  ],
  "file": "/etc/yum.repos.d/local.repo"
}
```

如果页面需要同时保存 repo 名称，也可以提交 `repos` 对象数组：

```json
{
  "name": "kylin-v10",
  "description": "麒麟 V10",
  "repos": [
    { "name": "base", "baseurl": "http://repo.example.com/kylin/base" },
    { "name": "updates", "baseurl": "http://repo.example.com/kylin/updates" },
    { "name": "addons", "baseurl": "http://repo.example.com/kylin/addons" }
  ],
  "file": "/etc/yum.repos.d/local.repo"
}
```

兼容说明：

- 后端仍兼容旧字段 `baseurl`。
- 新页面可以提交 `baseurls` 字符串数组，或 `repos` 对象数组。
- 不建议同时提交 `baseurl`、`baseurls`、`repos`，避免用户理解混乱。

## 接口调用

### 新增配置

`POST /api/vap/v2/yum-repo/configs`

请求体使用上面的 `baseurls` 格式。

### 编辑配置

`PUT /api/vap/v2/yum-repo/configs/{dcDataId}`

请求体同新增配置。删除某个 repo 地址后，后端会清理该地址对应的历史仓库采集和比对数据。

### 查询配置列表

`GET /api/vap/v2/yum-repo/configs`

响应中会返回：

- `baseurls`：当前配置的多个 repo 地址
- `sourceIds`：每个 repo 采集后对应的仓库源 ID
- `collected`：是否所有 repo 都已存在采集快照
- `collectStatus`：聚合后的采集状态
- `packageCount`：多个 repo 的包数量合计

前端回显时优先使用 `baseurls`；如果老数据没有 `baseurls`，可回退使用 `baseurl`。

### 触发采集

多 repo 配置必须使用 `dcDataId` 触发采集：

```json
{
  "dcDataId": "配置ID"
}
```

`POST /api/vap/v2/yum-repo/collect`

后端会读取该配置的 `baseurls`，逐个 repo 创建采集任务。响应会包含 `sourceIds` 和 `snapshotIds`。

### 触发补丁比对

建议使用 `dcDataId`，让后端按配置内多个 repo 合并比对：

```json
{
  "dcDataId": "配置ID",
  "osFamily": "kylinos"
}
```

`POST /api/vap/v2/yum-repo/patch-compare/scanned`

注意：配置内所有 repo 都成功采集后才会进行合并比对，避免只采到部分仓库时误报缺包。

### 补丁比对页仓库下拉框

图中「仓库」下拉框需要调整。

旧逻辑按单个 `RepoSource/sourceId` 展示，所以同一个 YUM 配置中的多个 repo 会被拆成多项，容易出现选择单个 repo 后统计不完整、缺包误判或重复展示。

新逻辑应按 `yum_configs` 配置维度展示，一条配置只显示一项：

- 选项值使用 `dcDataId`，不要再使用单个 `sourceId`。
- 选项文案优先显示配置名称，例如 `kylinos-repo`。
- 如果要展示地址，建议展示为多个 repo 的简短摘要，不要把每个 repo 拆成独立选项。
- 用户选择仓库后，重新执行比对时请求体传 `dcDataId`。

推荐展示示例：

```text
kylinos-repo（3 个 repo）
```

或：

```text
kylinos-repo（base / updates / addons）
```

不推荐继续展示为：

```text
kylinos-repo (http://.../base)
kylinos-repo (http://.../updates)
kylinos-repo (http://.../addons)
```

仓库下拉框数据来源建议使用：

`GET /api/vap/v2/yum-repo/configs`

可用字段：

- `dcDataId`：下拉选项 value
- `name` / `description`：下拉选项 label
- `baseurls`：配置下所有 repo 地址
- `sourceIds`：后端采集后生成的 repo source ID，仅用于展示或排查，不作为选择值
- `collectStatus`：配置维度聚合采集状态
- `packageCount`：配置下多个 repo 的包数量合计

执行比对请求：

```json
{
  "dcDataId": "配置ID",
  "osFamily": "kylinos"
}
```

`GET /api/vap/v2/yum-repo/patch-compare/overview` 已按配置维度聚合，前端渲染 overview 卡片时应优先使用：

- `dcDataId`
- `sourceIds`
- `baseurls`
- `repoUrls`
- `summary`
- `groupByOs`
- `collectStatus`
- `packageCount`

### 采集与清单页已采集仓库下拉框

图中「采集与清单」页的「已采集仓库」下拉框也需要按仓库配置维度调整，规则与补丁比对页一致。

旧逻辑按单个 `sourceId` 展示，会把一条配置下的多个 repo URL 拆成多项。用户选择其中一项后，只能看到单个 repo 的包清单，不符合“以仓库维度采集下面所有 URL 的包”的需求。

新逻辑：

- 下拉框选项 value 使用 `dcDataId`。
- 一条 YUM 配置只显示一项。
- label 显示配置名称，例如 `kylinos-repo（3 个 repo）`。
- 不再把同一配置下的多个 URL 拆成多条选项。
- 采集按钮请求 `POST /api/vap/v2/yum-repo/collect`，请求体传 `dcDataId`。
- 包清单请求 `GET /api/vap/v2/yum-repo/packages`，查询参数传 `dcDataId`。

采集请求：

```json
{
  "dcDataId": "配置ID"
}
```

包清单查询：

```http
GET /api/vap/v2/yum-repo/packages?dcDataId=配置ID&page=0&size=20
```

按包名搜索：

```http
GET /api/vap/v2/yum-repo/packages?dcDataId=配置ID&keyword=openssl&page=0&size=20
```

后端会合并该配置下所有 repo URL 的当前成功采集快照，并返回分页包清单。

## 前端校验

- `baseurls` 至少包含一个非空地址。
- 提交前去掉空行。
- 建议对重复地址去重。
- 建议提示用户：多 repo 场景下需要等待所有 repo 采集成功后再比对。

