# 软件源多 Repo 前端调整说明

## 背景

原页面只支持填写一个 `baseurl`，适合 merged 仓库。客户现场可能按系统仓库拆分为多个 repo，例如 Kylin V10 常见 `base`、`updates`、`addons`。前端需要支持在同一条软件源配置中录入多个 repo 地址，后端会分别采集并在补丁比对时合并匹配。

本需求里的“软件源”需要兼容两类包管理体系：

- RPM/YUM 仓库：Red Hat、CentOS、Oracle Linux、KylinOS、Anolis 等，采集时读取 `repodata/repomd.xml` 及 RPM metadata。
- DEB/APT 仓库：Ubuntu，采集时读取 APT 索引（如 `dists/*/Release`、`Packages` / `Packages.gz`），**不能**按 YUM 仓库去校验 `repodata/repomd.xml`。

因此前端不要把 `osFamily=ubuntu` 的地址当作 YUM 仓库校验。截图中的错误：

```text
仓库元数据不存在，请确认 baseurl 指向包含 repodata/repomd.xml 的 YUM 仓库根目录
```

只适用于 RPM/YUM 仓库；Ubuntu 软件源没有 `repodata` 目录，应使用 Ubuntu/DEB 采集逻辑。

## 页面调整

将原「YUM源地址」单输入框调整为可动态增删的多行输入。为避免 Ubuntu 场景误导，页面文案建议改为通用“软件源”；如果短期不能改接口名，至少在表单展示层按操作系统动态显示：

- 弹窗标题：优先改为 `软件源配置录入`；如保留原标题，选择 Ubuntu 时不要展示“YUM 仓库”错误提示。
- 左侧标签：默认 `软件源仓库地址`；RPM 系可显示 `YUM 仓库地址`；Ubuntu 显示 `Ubuntu/DEB 仓库地址` 或 `APT 仓库地址`。
- 输入框 placeholder：默认 `请输入仓库地址`；RPM 系可显示 `请输入仓库baseurl地址`；Ubuntu 可显示 `请输入 Ubuntu 软件源地址，如 http://mirror.example.com/ubuntu`。
- 输入框右侧增加 `+` 按钮，用于新增一行 repo 地址
- 多于一行时建议提供删除按钮
- 至少保留一行且至少一个地址非空

建议保留原字段：

- `name`：软件源名称
- `description`：描述
- `file`：软件源文件

## 采集模式：按 osFamily 区分 RPM/YUM 与 DEB/APT

前端提交的核心 OS 字段仍为 `osFamily` / `osMajor` / `osSpVersion` / `arch`。采集方式由 `osFamily` 决定：

| osFamily | 包类型 | 采集模式 | 地址校验规则 |
| -------- | ------ | -------- | ------------ |
| `ubuntu` | DEB | APT/DEB | 不检查 `repodata/repomd.xml`；允许 Ubuntu mirror 根路径或仓库路径，由后端按 APT 索引解析 |
| `oracle` | RPM | YUM/RPM | 继续检查 YUM metadata，要求地址最终能定位到 `repodata/repomd.xml` |
| `redhat` / `centos` / `kylinos` / `anolis` | RPM | YUM/RPM | 同 Oracle，按 YUM/RPM 仓库处理 |
| `suse` / `sles` / `opensuse` | RPM | YUM/RPM | 同 RPM 仓库处理，注意 `osFamily` 与副表 `affected_pkg.os` 的取值关系 |

前端需要按 `osFamily` 分流采集提示：

- 选择 `ubuntu` 后，采集按钮触发的仍是配置维度采集，但页面文案应提示“将采集 DEB 包索引”，不要提示“读取 YUM 元数据”。
- 选择 `ubuntu` 后，如果后端返回找不到 `repodata/repomd.xml` 类错误，前端应视为后端采集模式不匹配或配置问题，不要引导用户去补 `repodata`。
- 选择 `oracle` 后，仍按 RPM/YUM 仓库处理，错误提示可以继续指向 `repodata/repomd.xml`。

## 新增表单字段：OS 元数据（osFamily 下拉 + osMajor / osSpVersion 手动输入）

「软件源配置录入」弹窗新增三个字段，分别对应后端 `osFamily` / `osMajor` / `osSpVersion`。
**`osFamily` 用下拉框由用户选择，`osMajor` 和 `osSpVersion` 由用户手动输入并做格式校验**。

### `osFamily`（下拉框，与 `vap2_patch.vendor` 一致）

- 标签：`操作系统`
- 控件：下拉单选
- **取值规则**：`yum_configs.osFamily` 必须与补丁库主表 **`vap2_patch.vendor`** 使用**同一套字符串**。
  该列来自补丁导入数据顶层 **`type`**（Vulners JSON 的 `_source.type`，或官网爬虫写入的 `patchInfoMap['type']`），全小写、勿自创别名。
- **权威来源**：以本租户库内为准，运维可执行  
  `SELECT DISTINCT vendor FROM vap2_patch WHERE vendor IS NOT NULL AND vendor <> '' ORDER BY vendor;`  
  前端若支持配置化，可优先用查询结果驱动下拉；无接口时可用下面「本仓库已接入补丁源」的固定枚举作为默认值。
- **本仓库已接入补丁源对应的 vendor 枚举**（与 `oplus-vap` 内 vulners 示例及 `scripts/get_*_patch.py` 写入的 `type` 对齐）：

  | vendor（value，提交原样） | label（中文展示）        | 备注 |
  | ------------------------- | ------------------------ | ---- |
  | `redhat`                  | Red Hat Enterprise Linux | vulners + `get_redhat_patch.py` |
  | `centos`                  | CentOS                   | vulners + `get_centos_patch.py` |
  | `ubuntu`                  | Ubuntu                   | vulners + `get_ubuntu_patch.py` |
  | `suse`                    | SUSE                     | vulners + `get_suse_patch.py`（JSON `type: suse`） |
  | `aix`                     | IBM AIX                  | vulners 示例 `aix.json` |
  | `kylinos`                 | 麒麟 KylinOS             | `get_kylinos_patch.py`，选中后 `osSpVersion` **必填** |
  | `uniontech`               | 统信 UOS（Uniontech）    | `get_uniontech_patch.py`（vendor 为 `uniontech`，勿写 `uos`） |
  | `anolis`                  | 龙蜥 Anolis              | `get_anolis_patch.py` |
  | `oracle`                  | Oracle Linux             | `get_oracle_patch.py` |

- **与比对实现的关系（必读）**：`RepoBaselineServiceImpl` 比对时把仓库 `osFamily` 与 **`vap2_patch_affected_pkg.os`** 做等值匹配（`OsTag.matchOs`）。上述多数发行版下 **`vendor` 与 `affected_pkg.os` 相同**；**SUSE 源**导入时副表 `os` 常被写成 `sles`、`opensuse` 或 `openstack`（见 `PatchServiceImpl#getOsFamily`），与主表 `vendor='suse'` 可能不一致。若配置里只填 `suse` 而库中行为 `sles`，会导致比对过滤不到包。处理办法：
  - 对本库执行  
    `SELECT DISTINCT a.os FROM vap2_patch_affected_pkg a JOIN vap2_patch p ON p.patch_id=a.patch_id WHERE p.vendor='suse' LIMIT 20;`  
  - 在**同一租户、面向 SLES / openSUSE 仓库**的配置里，`osFamily` 填**副表里实际出现的 `os` 值**（如 `sles`、`opensuse`）；**或**在界面下拉中为 SUSE 类仓库增加与副表一致的子选项（value 仍为副表 `os` 短码），不要与 `vendor` 混用未核对过的字符串。

- 该下拉**必填**：未选时提示 `请选择操作系统`。

### `osMajor`（手动输入 + 格式校验）

- 标签：`主版本号`
- 控件：单行文本输入
- placeholder：`如：V10、8、22.04、20、12 SP5`
- 必填，提交前做以下格式校验（前端拦截，避免脏数据落库）：

  - 不能为空、不允许两端空格；
  - 长度 1~16；
  - **正则**：`^[A-Za-z0-9][A-Za-z0-9\.\- ]{0,15}$`
    允许字母、数字、点号、连字符、空格；不允许中文 / 特殊符号；
  - 与 `vendor`（`osFamily`）的常见组合提示（仅用于错误提示文案，不强制白名单）：

    | osFamily（vendor） | 期望的 osMajor 形式 |
    | ------------------ | ------------------- |
    | `kylinos`          | `V10`、`V7`         |
    | `redhat` / `centos` / `oracle` / `anolis` | `7`、`8`、`9` |
    | `ubuntu`           | `18.04`、`20.04`、`22.04`、`24.04`（DEB/APT 采集） |
    | `uniontech`        | 与补丁库 `os_version` 一致（按现场库为准） |
    | `suse` 或副表 `sles` / `opensuse` | `12.3`、`15`、`15 SP4` 等（与 `affected_pkg.os_version` 一致） |
    | `aix`              | 与补丁库 `os_version` 一致 |

- 校验提示：`主版本号格式不正确（仅允许字母/数字/点号/连字符/空格，长度 1~16）`

### `osSpVersion`（手动输入 + 格式校验，麒麟必填）

- 标签：`OS 精确版本`
- 控件：单行文本输入
- placeholder：`如：SP1、SP1.1、SP3、SP3 2403、HPC、Host`
- 必填条件：`osFamily === 'kylinos'` 时**前端必填**；其它发行版可选（留空即可）。
- **格式校验**（仅在用户填写时校验，留空跳过；麒麟必填判断在前一道）：

  - 不允许两端空格、长度 1~32；
  - **正则**（与后端 `ScanResultEtl` 麒麟标识规范化一致）：  
    `^(SP\d+(?:\.\d+)?(?:[\s_/-]+\d\w*)?|Update\d+|HPC|Host|Compat)$`（建议 `/i`）。  
    兼容：`SP3 2403`、`sp3 2403`、`SP3-2403`、`SP3_2403`、`SP3/2403`（保存时会规范为 **`SP3 2403`**）、
    以及多余空格（`SP3  2403`）。  
    须与补丁库 `os_sp_version` **语义一致**。后端 SP 比对规则：
    - `SP1` ≅ `SP1.1` ≅ `SP1.2`（次版本号 `.{M}` 视为同一个 SP 大版本，
      场景：客户机器 OS 报 `SP1`，但实际装了 `SP1.1` 子版本包，对应补丁 `os_sp_version=SP1.1`）；
    - `SP3` 与 `SP3 2403` 仍是不同版本（构建号是不同发行，**必须一致**）；
    - `SP3 2403` ≅ `SP3.0 2403` ≅ `SP3.1 2403`（次版本号被削平，构建号 2403 必须相等）。

- 校验提示（按情况选一）：
  - 未填且 osFamily 是 kylinos：`麒麟仓库必须填写 OS 精确版本（如 SP1、SP1.1、SP3 2403、HPC、Host）`
  - 填写了但格式错：`OS 精确版本格式不正确，请按 SP1 / SP1.1 / SP3 2403 / Update6 / HPC / Host / Compat 等形式填写`

可选值（与补丁库 `vap2_patch_affected_pkg.os_sp_version` 一字不差）：

- `SP1`、`SP1.1`、`SP2`、`SP3`
- `SP3 2403`、`SP3 2309b`（带构建号的精确版本，与不带构建号视为不同）
- `HPC`、`Host`、`Compat`（特殊产品线）
- `Update6`（NeoKylin V7 系列）

为什么 `osSpVersion` 必须由用户手动填：

- 同一条公告 KYSA-XXX 在补丁库里按 `os_sp_version` 区分（`SP1` / `SP3` / `SP3 2403` 不同）；
- 仓库的 RPM 版本号本身（如 `243-31.se.p16.a.ky10`）不能可靠回推 SP 构建号；
- 不填 → 后端只能用 baseurl 正则兜底；URL 不规范时回退到模糊匹配，会出现 SP1 补丁误判到 SP3 仓库的缺包列表里。

后端在 `POST /api/vap/v2/yum-repo/configs` 与 `PUT /api/vap/v2/yum-repo/configs/{id}` 两个接口中
对麒麟仓库做了硬校验，缺失会返回：

```json
{ "success": false, "message": "麒麟仓库必须填写「OS精确版本」（如 SP1、SP1.1、SP3、SP3 2403、HPC、Host），否则采集到的包无法与 vap2_patch 精确比对，会出现跨 SP 误报" }
```

前端在提交前把上面三道前端校验做掉，业务错误兜底由后端返回；非麒麟仓库 `osSpVersion` 为空不会被拦截。

## 请求字段

新增和编辑配置时使用 `baseurls` 数组提交多个 repo 地址。强烈建议同时提交 OS 元数据，
否则后端只能用 baseurl 正则兜底（kylin/v10/sp3/x86_64 命名规范的 URL 一般可以识别），
匹配失败会回退到旧的 osDistro 模糊匹配，跨 SP 误报"缺包"。

```json
{
  "name": "kylin-v10-sp3-2403",
  "description": "麒麟 V10 SP3 2403 x86_64",
  "osFamily": "kylinos",
  "osMajor": "V10",
  "osSpVersion": "SP3 2403",
  "arch": "x86_64",
  "baseurls": [
    "http://repo.example.com/kylin/v10/sp3/2403/x86_64/base",
    "http://repo.example.com/kylin/v10/sp3/2403/x86_64/updates",
    "http://repo.example.com/kylin/v10/sp3/2403/x86_64/addons"
  ],
  "file": "/etc/yum.repos.d/local.repo"
}
```

OS 元数据字段说明（控件形态见上一节；比对逻辑见「与比对实现的关系」）：

- `osFamily`：**下拉单选**，取值须与 **`vap2_patch.vendor`** 一致（导入 JSON 顶层 `type`）；枚举以各租户 `DISTINCT vendor` 为准，本仓库已实现值见上表。比对时服务端用该字段与 **`vap2_patch_affected_pkg.os`** 等值匹配，SUSE 系若副表为 `sles`/`opensuse` 请按上一节说明填写副表 `os`。
- `osMajor`：**手动输入**，需与受影响包行的 `os_version` 一致，例 `V10` / `8` / `22.04`；正则
  `^[A-Za-z0-9][A-Za-z0-9\.\- ]{0,15}$`。
- `osSpVersion`：**手动输入**，需与 `os_sp_version` 在「同 SP 大版本」语义下一致，麒麟（`vendor`/`osFamily` 为 `kylinos`）必填，
  正则 `^(SP\d+(?:\.\d+)?(?:[\s_/-]+\d\w*)?|Update\d+|HPC|Host|Compat)$`（建议 `/i`）；`POST/PUT` 保存时后端会将麒麟 SP 规范为 canonical（如 `SP3 2403`、`SP1.1`）。
  **后端比对规则**：
  - `SP1` ≅ `SP1.1`（次版本号 `.{M}` 视为 SP1 大版本下的小版本，仓库填 `SP1` 也能命中补丁库里 `os_sp_version=SP1.1` 的行；
    场景：客户机器 OS 报 `SP1`，但实际装了 `SP1.1` 子版本包）；
  - `SP3` 与 `SP3 2403` 仍视为不同（构建号是不同发行，必须一致）；
  - `SP3 2403` ≅ `SP3.0 2403`（次版本号削平，构建号必须等于 2403）。
- `arch`：仓库架构（`x86_64` / `aarch64` / `ppc64le` / `loongarch64` 等），与补丁包 `arch` 对齐。
  建议下拉单选，下拉值：`x86_64` / `aarch64` / `loongarch64` / `mips64el` / `ppc64le` / `s390x`。

### Ubuntu 请求示例（DEB/APT）

Ubuntu 仍使用同一套配置接口，但 `osFamily` 必须为 `ubuntu`，后端按 DEB/APT 模式采集。前端不要对这些地址做 `repodata/repomd.xml` 预校验。

```json
{
  "name": "ubuntu-22.04-jammy",
  "description": "Ubuntu 22.04 jammy x86_64",
  "osFamily": "ubuntu",
  "osMajor": "22.04",
  "osSpVersion": "",
  "arch": "x86_64",
  "baseurls": [
    "http://repo.example.com/ubuntu",
    "http://repo.example.com/ubuntu-security"
  ],
  "file": "/etc/apt/sources.list"
}
```

### Oracle Linux 请求示例（RPM/YUM）

Oracle Linux 是 RPM 包，继续按 YUM/RPM 仓库采集，地址需要能定位到 YUM metadata。

```json
{
  "name": "oracle-linux-8",
  "description": "Oracle Linux 8 x86_64",
  "osFamily": "oracle",
  "osMajor": "8",
  "osSpVersion": "",
  "arch": "x86_64",
  "baseurls": [
    "http://repo.example.com/oracle/8/baseos/latest/x86_64",
    "http://repo.example.com/oracle/8/appstream/x86_64"
  ],
  "file": "/etc/yum.repos.d/oracle-linux.repo"
}
```

如果页面需要同时保存 repo 名称，也可以提交 `repos` 对象数组：

```json
{
  "name": "kylin-v10-sp3-2403",
  "description": "麒麟 V10 SP3 2403 x86_64",
  "osFamily": "kylinos",
  "osMajor": "V10",
  "osSpVersion": "SP3 2403",
  "arch": "x86_64",
  "repos": [
    { "name": "base", "baseurl": "http://repo.example.com/kylin/v10/sp3/2403/x86_64/base" },
    { "name": "updates", "baseurl": "http://repo.example.com/kylin/v10/sp3/2403/x86_64/updates" },
    { "name": "addons", "baseurl": "http://repo.example.com/kylin/v10/sp3/2403/x86_64/addons" }
  ],
  "file": "/etc/yum.repos.d/local.repo"
}
```

兼容说明：

- 后端仍兼容旧字段 `baseurl`。
- 新页面可以提交 `baseurls` 字符串数组，或 `repos` 对象数组。
- 不建议同时提交 `baseurl`、`baseurls`、`repos`，避免用户理解混乱。
- `osFamily/osMajor` 新页面**必填**（前端拦截）；`osSpVersion` 麒麟必填、其它发行版可选；
  `arch` 强烈建议必填。后端对 `osFamily=kylinos` + `osSpVersion` 做硬校验，缺失返回业务错误。
  老数据 / 接口直连场景仍然兼容缺省（缺省时后端按 baseurl 正则推断，
  无法识别会回退旧的模糊匹配并打 warn 日志），但生产新建配置请走完整字段。

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

旧逻辑按单个 `RepoSource/sourceId` 展示，所以同一个软件源配置中的多个 repo 会被拆成多项，容易出现选择单个 repo 后统计不完整、缺包误判或重复展示。

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
- 一条软件源配置只显示一项。
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

按字段汇总（提交前一次性校验，所有项通过才发请求）：

| 字段          | 控件     | 校验规则                                                                                             |
| ------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `name`        | 输入     | 非空                                                                                                 |
| `baseurls`    | 多行输入 | 至少 1 条非空；提交前 `trim` 并去掉空行；建议同地址去重；建议 `^https?://` 开头；`ubuntu` 不做 `repodata/repomd.xml` 校验，RPM/YUM 系可提示需包含 YUM metadata |
| `osFamily`    | 下拉     | 必选；value 为本租户补丁库 **`vap2_patch.vendor` 允许值**（或 SUSE 场景下与副表 **`affected_pkg.os`** 一致的 `sles`/`opensuse`/`openstack`，见上文） |
| `osMajor`     | 输入     | 必填；正则 `^[A-Za-z0-9][A-Za-z0-9\.\- ]{0,15}$`；不允许中文                                         |
| `osSpVersion` | 输入     | `osFamily=kylinos` 时必填；填写后须匹配 `^(SP\\d+(?:\\.\\d+)?(?:[\\s_/-]+\\d\\w*)?|Update\\d+|HPC|Host|Compat)$`（建议 `/i`）；或与后端一致接受 `SP3-2403` 等，由接口落库规范为 `SP3 2403`。后端比对时 `SP1` ≅ `SP1.1`（次版本号削平），但 `SP3` ≠ `SP3 2403`（构建号必须一致） |
| `arch`        | 下拉     | 建议必选；可选值见上节                                                                               |
| `file`        | 输入     | 可选                                                                                                 |

提示要点：

- `ubuntu` 是 DEB/APT 包源，不存在 `repodata`；`oracle`、`redhat`、`centos`、`kylinos` 等是 RPM/YUM 包源，读取包信息的方式不同。
- 采集错误提示要按包类型区分：Ubuntu 使用 APT 索引相关提示；Oracle/RPM 系才提示 `repodata/repomd.xml`。
- 客户场景一律按 `osFamily + osMajor + osSpVersion + arch` 四元组划分仓库；
  同一四元组下可以挂多个 repo（base/updates/addons），**不要**把不同 SP 或不同架构的仓库
  塞进同一条 `yum_configs`，否则后端 OS 过滤会把整条配置误判为不匹配。
- 多 repo 场景必须等所有 repo 采集成功后再比对（`collectStatus = SUCCEEDED`）。
- `SP3` 与 `SP3 2403` 后端视为不同，前端不要做"输入 SP3 自动补 2403"之类的归一。
- `SP1` 与 `SP1.1` 后端在比对时视为同一个 SP 大版本（次版本号 `.{M}` 被削平）：
  客户机器 OS 报 `SP1`、实际装了 `SP1.1` 子版本包的场景下，仓库填 `SP1` 也能匹配补丁库里
  `os_sp_version=SP1.1` 的行；前端无需做 `SP1 ↔ SP1.1` 的转换，原样保存用户输入即可。

## OS 元数据匹配规则（后端比对实现）

补丁库（`vap2_patch_affected_pkg`）与仓库做精确匹配的判定顺序：

1. 系统：仓库 `osFamily` 与补丁包 **`affected_pkg.os`** 短码不区分大小写相等
   （多数发行版下与 **`vap2_patch.vendor`** 相同；SUSE 系副表常为 `sles`/`opensuse`，见上文「与比对实现的关系」）；
   `os` 列为空时退到 `os_distro` 包含匹配。
2. 主版本：仓库 `osMajor` 与补丁包 `os_version` 相等，或补丁包 `os_version='any'`。
3. 服务包：仓库 `osSpVersion` 与补丁包 `os_sp_version` 按「同 SP 大版本」匹配：
   - `SP{N}` ≅ `SP{N}.{M}`（次版本号 `.{M}` 视为同 SP 大版本下的小版本，
     场景：客户机器 OS 报 `SP1` / 仓库填 `SP1`，但补丁库针对 `SP1.1` 子版本包）；
   - `SP{N}` 与 `SP{N} {build}` 仍视为不同（构建号是不同发行，必须一致）；
   - `SP{N} {build}` ≅ `SP{N}.{M} {build}`（构建号一致时削平次版本号）；
   - HPC / Update{N} / Host / Compat 等非 SP 形式仍走精确忽略大小写等值匹配。
4. 架构：仓库 `arch` 与补丁包 `arch` 相等，或补丁包 `arch='noarch'/'any'`。

任一字段不匹配，则该 affected_pkg 不会进入此次比对；某条补丁所有 affected_pkg 都被
过滤掉时，整条补丁不再生成 `MISSING` 记录（属于"该补丁与本仓库不适用"，避免
KYSA-202403-1025（SP1）出现在 SP3 仓库的缺包列表里）。
SP 大版本相同（如 `SP1` 与 `SP1.1`）会被视作匹配，避免主版本 `SP1` 机器装了
`SP1.1` 子版本包时出现整条补丁误报。

## Ubuntu 包 changelog 关联

Ubuntu 的 DEB 包索引里通常没有完整 changelog。软件包信息查询页如果展示“变更记录 / changelog”，需要把 Ubuntu 包与官方 changelog 地址关联：

```text
https://changelogs.ubuntu.com/changelogs/binary/{首字母}/{包名}/{版本}/changelog
```

示例：`wget` 的 `1.13.4-2ubuntu1.3` 版本 changelog 地址为：

```text
https://changelogs.ubuntu.com/changelogs/binary/w/wget/1.13.4-2ubuntu1.3/changelog
```

前端展示建议：

- 当 `osFamily=ubuntu` 且包详情返回 `changelogUrl` 时，展示为可点击链接或“查看 changelog”按钮。
- 如果后端返回 `changelogContent`，前端可直接展示内容；如果只返回 `changelogUrl`，前端展示链接即可。
- 不要按 RPM 包字段假设 Ubuntu 包一定有本地 changelog 信息。
- URL 中的版本号需要使用包的完整版本字符串，不能只取 upstream 版本；如 `1.13.4-2ubuntu1.3` 不能截断为 `1.13.4`。

## 机器侧 OS 过滤（核心修复）

之前只在 `affected_pkg` 一侧按仓库 OS 过滤，会出现两个残留 bug：

1. 同一条 KYSA 公告通常覆盖多个架构（x86_64 / aarch64 / loongarch64），扫描时
   145(x86_64) 正确关联到 KYSA-202403-1025 的 x86_64 行；但客户在 loongarch64
   仓库做"已扫描比对"时，租户内所有扫到的补丁都进入比对，loongarch64 行被拼出
   "要求版本"对照仓库，仓库里没这版本就报 MISSING。
2. "影响主机"列表只按 patch_id 取 host，145 仍出现在 loongarch64 仓库的影响主机里。

修复策略：**比对/展示阶段都按"机器自身 OS == 仓库 OS"裁剪**：

- `POST /patch-compare/scanned`：先 `vap2_curr_machine_patch JOIN vap2_curr_machine_scan`，
  按 `(os_distro, os_major_version, os_sp_version, os_arch)` 四元组匹配仓库的
  `(osFamily, osMajor, osSpVersion, arch)`，只把匹配上的机器报的 patch_id 喂给比对。
  机器与仓库 OS 不一致 → 该机器整条补丁不进入比对结果。
- `GET /patch-compare/{diffRunId}/patch-view`：影响主机列表与计数同样 JOIN
  `vap2_curr_machine_scan` 按仓库 OS 过滤，避免 145(x86_64) 出现在 loongarch64 仓库下。

`os_sp_version` 这一列在 SQL 端使用 `REGEXP` 实现「同 SP 大版本」匹配（与上一节比对规则一致）：
仓库 `SP1` 会同时命中机器扫描表里 `os_sp_version` 为 `SP1` / `SP1.1` / `SP1.2` 的行；
仓库 `SP3 2403` 仍只命中 `SP3 2403` / `SP3.0 2403` 这种构建号相同的行，不会串到 `SP3`。

这意味着：

- 如果租户下没有任何机器与仓库 OS 一致，`/patch-compare/scanned` 会返回业务错误
  `没有机器的操作系统/架构/SP 版本与所选仓库匹配，无法比对`；前端按业务错误提示即可。
- 仓库未配置 OS 元数据时，回退到旧的全量行为并打印告警；建议运维补齐
  `osFamily/osMajor/osSpVersion/arch`。

## OS 下拉框可以去掉

`POST /patch-compare` / `/patch-compare/scanned` 仍兼容 `osFamily` 字段，但**不建议**
让客户在比对页面手动选 OS：

- 服务端已经知道每台扫描机器的 OS（`vap2_curr_machine_scan` 中的 `os_distro / os_major_version
  / os_sp_version / os_arch`），同时也知道仓库的 OS 元数据。
- 是否参与比对完全由"机器 OS == 仓库 OS"自动决定，前端再传一遍 `osFamily` 容易引起
  双重过滤的歧义。

建议：

1. 把比对页面/接口里的 OS 下拉框移除，请求体不再发 `osFamily`。
2. 提示客户去软件源配置页面正确填写仓库的 `osFamily/osMajor/osSpVersion/arch`，
   配置一次后所有比对都按这个走。

