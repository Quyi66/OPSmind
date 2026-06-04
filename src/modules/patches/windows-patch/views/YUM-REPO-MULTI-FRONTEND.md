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

兼容说明：

- 后端仍兼容旧字段 `baseurl`。
- 新页面应优先提交 `baseurls`。
- 不建议同时提交 `baseurl` 和 `baseurls`，避免用户理解混乱。

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

## 前端校验

- `baseurls` 至少包含一个非空地址。
- 提交前去掉空行。
- 建议对重复地址去重。
- 建议提示用户：多 repo 场景下需要等待所有 repo 采集成功后再比对。

