# SPM 自定义仓库：多频道接口说明（给前端）

页面：仓库管理 → 自定义仓库 → 添加/编辑仓库（`RepoAddDialog`）。

一条"自定义仓库" = 目标机上的一个 `/etc/yum.repos.d/<repoFile>.repo` 文件，文件里可以有多个频道（`[repoid]` 段，如 os / updates / addons），
每个频道可配多个 baseurl、gpgcheck + gpgkey、sslverify + 证书路径。下发时整个文件覆盖写入。

## 1. 保存

`POST /sjxy-console/workflow/api/workflow/jobs/dfApaC/run`

```json
{
  "params": {
    "id": "编辑时传，新增传 null",
    "repoName": "kylinV10SP3",
    "repoFile": "ky-local",
    "repoDesc": "麒麟 V10 SP3 官方源",
    "repoUrl": "",
    "channels": "<JSON.stringify(RepoChannel[])>"
  }
}
```

- `channels` **必须是 JSON 字符串**（`JSON.stringify(channels)`），不能直接传数组：workflow 对数组参数用正则替换，地址里的 `$basearch` 会被当成分组引用导致作业报错。
- 传了非空 `channels` 时以它为准，`repoUrl` 可传空串。
- 不传 `channels`（老界面）时后端解析 `repoUrl`：一行一个地址 → 单频道（repoid = repoName，gpgcheck=0，sslverify=0，与旧行为一致）；
  内容里有 `[xxx]` 行 → 按 `.repo` 文件文本解析成多频道（可直接粘贴现有 repo 文件）。

### RepoChannel

| 字段 | 类型 | 说明 |
|---|---|---|
| repoId | string | 必填，`[A-Za-z0-9][A-Za-z0-9._:-]*`，同一租户内所有自定义仓库不能重复 |
| name | string | 频道名称，可中文，不能换行；空则等于 repoId |
| baseurls | string[] | 必填（至少 1 个，最多 20 个），`http/https/ftp/file://` 开头，可含 `$basearch`、`$releasever` |
| enabled | boolean | 默认 true |
| gpgcheck | boolean | 默认 false |
| gpgkeys | string[] | gpgkey 地址，如 `file:///etc/pki/rpm-gpg/RPM-GPG-KEY-kylin` |
| sslverify | boolean | 默认 true（建议界面显式传值） |
| sslcacert | string | 目标主机上的 CA 证书绝对路径，可空 |
| sslclientcert | string | 客户端证书绝对路径，可空 |
| sslclientkey | string | 客户端私钥绝对路径，可空 |
| extraOptions | object | 其它 repo 选项，如 `{"priority":"10","module_hotfixes":"1","mirrorlist":"..."}`；key 只能小写字母数字下划线，不能与上面字段重名 |

### 校验规则（后端都会校验，前端请同步做表单校验）

- `repoName`、`repoFile`：只能英文字母、数字、`.`、`_`、`-`，字母或数字开头，最长 64；`repoFile` 不带 `.repo` 后缀（带了后端会去掉）。
- `repoName`、`repoFile` 在租户内唯一；一个 repo 文件只能属于一条自定义仓库（要加频道就编辑原记录）。
- 同一条记录内 repoId 不能重复，最多 50 个频道。
- 所有字段都不要包含英文单引号 `'`（rest 作业用 curl 模板转发，单引号会破坏命令解析），也不能含 `{{`、`{%`、`{#`。

### 返回值处理

当前页面不管返回什么都提示"成功"，需要改为判断状态：

```js
const res = await U.saveCustomRepo(...)
const r = Array.isArray(res?.data ?? res) ? (res.data ?? res)[0] : null
if (r?.status !== 'COMPLETED') {
  // r.error 形如 '{"message":"仓库名称只能包含英文字母..."}'
  let msg = '保存失败'
  try { msg = JSON.parse(r.error).message || msg } catch (e) {}
  ElMessage.error(msg)
  return
}
```

## 2. 列表 / 编辑回显

`GET ${dashboard}/spm-repo-cofigs` 每行新增：

- `repo_channels`：RepoChannel 数组的 JSON 字符串（已补齐默认值）。老数据可能为 null，此时把 `repo_url` 当作"一行一个地址"放进单个频道（repoId = repo_name）。
- `repo_url`：单频道纯地址时是一行一个地址；多频道或带 gpg/ssl 选项时是渲染好的 `.repo` 文本，列表"地址"列可只显示第一行或频道数。
- `update_time`，列表按它倒序。

## 3. 建议的编辑界面（参考 YUM 源配置弹窗）

- 基本信息：仓库名称、配置文件名（提示"只能英文"）、描述。
- 频道列表（卡片，可增删，默认带一个）：repoid、名称、仓库地址列表（每行 + / 删除，同 YUM 源配置）、启用开关、
  gpgcheck 开关 + gpgkey 列表、sslverify 开关 + sslcacert / sslclientcert / sslclientkey 输入框、"高级选项" key-value。
- "从 repo 文件导入"按钮：弹一个文本框粘贴 `.repo` 内容，直接作为 `repoUrl` 保存即可，后端负责解析。

## 4. 其它

- Excel 导入（`仓库地址` 列）同样支持"一行一个地址"或 `.repo` 文本，规则同上，出错会提示第几行。
- "配置到主机"接口不变（作业 `3m2kbd`）。
- 删除自定义仓库只删平台记录，不会删目标机上已下发的 repo 文件；修改配置文件名后旧文件也会留在目标机上。
