# 全量前端简体中文及英文国际化改造计划

- 编制日期：2026-11-12
- 分析基线：当前工作区，Git HEAD `b033a323`
- 目标语言：简体中文 `zh-CN`、英文 `en-US`；保留后续扩展能力
- 文档性质：实施计划；已按最新要求收敛为中英文，具体实施状态见进度文档

实施状态见 [中英文国际化实施进度](./frontend-i18n-progress-20261112.md)。当前交付仅包含简体中文与英文；繁体中文暂停适配，已有资源作为未启用的预留保留，不纳入本轮翻译与验收。按 2026-11-16 最新范围要求，只有注册路由、没有菜单且系统内无实际调用的功能暂缓，不纳入本轮改造和完成标准。

## 1. 目标与范围

实现当前生产前端功能的简体中文和英文显示、运行时语言切换及语言偏好持久化。语言通过注册表扩展，后续可增加繁体中文等资源。覆盖导航、页面、页面内 Tab、弹窗、抽屉、表单校验、任务反馈、图表、前端生成的导出内容及其他由本仓库控制的界面文案。

范围先从菜单和生产路由确定，再追踪实际渲染组件及其依赖。全仓中文扫描只用于补漏、发现硬编码和核对排除项，不将所有 Vue/JS 文件默认列入改造范围。

本轮的“全量”指在用功能及其实际调用链。无菜单页面需核对页面跳转、按钮、弹窗、嵌入组件和动态映射等调用依据；仅有路由注册、兼容 loader 或可手工输入地址访问，不足以证明在用。确认系统内没有实际调用的注册功能暂缓，后续确有使用需求时再单独补充国际化。

本次明确不处理：

- 后端直接返回的中文，包括错误详情、日志原文、通知正文、接口字典名称和动态业务字段；按原值展示。
- 后端国际化、语言请求头协议、接口调整、数据库迁移和历史数据翻译。
- 用户输入的名称、描述，脚本/命令内容和执行输出。
- 外部应用或跨域嵌入页面内部的文案；本仓库控制的加载、重试、关闭等外层文案仍在范围内。
- 无生产入口、无有效组件调用链的历史页面，开发样例、测试夹具、生成声明文件和第三方压缩源码。
- 已注册但没有菜单入口、系统内也没有实际调用的暂未使用功能；不为不确定的未来使用提前迁移。
- 繁体中文及其他新增语言的本轮适配、RTL 布局。

边界示例：列表的“操作日志”表头需要翻译，接口返回的中文日志正文不需要翻译；前端根据 `msg_id` 选择的固定消息模板需要翻译，模板内插入的后端 `msg_info` 原样保留。

## 2. 以菜单和路由确定实施清单

### 2.1 判定链路

按以下顺序建立并维护实施台账：

1. 读取 `src/config/menu.config.js` 和 `src/config/admin-menu.config.js`，确认主菜单、管理后台菜单、隐藏分组和菜单代码。
2. 对照 `src/modules/registry.ts`、各模块 `index.js`，确认模块注册状态、默认路由、虚拟菜单和权限归属。
3. 读取 `src/config/module-nav.config.js`，确认模块侧栏、嵌套导航及跨模块挂载入口。
4. 对照 `src/core/router/index.js`、`routes/base.js`、`routes/modules.js` 及模块 `routes.js`，追踪完整父子路由、alias、redirect 和实际页面组件。
5. 补充顶部导航、首页快捷入口、页面按钮跳转、新窗口入口、query Tab 以及管理后台动态组件映射。
6. 从有效页面向下追踪静态/异步导入、动态组件映射、全局组件、弹窗、抽屉、组合函数、Store、图表配置和前端文案工具。
7. 对照全仓中文扫描结果检查遗漏，逐项记录纳入或排除依据。

无菜单且只有注册关系的候选项，先标记“暂缓：未发现实际调用”，不直接展开翻译。若动态入口尚无法确认，记录待核对依据，证实在用后再纳入；不能把路由注册本身当作调用证据。

不得仅根据文件夹名称、文件中是否含中文、模块是否有顶层菜单，或者单个账号是否能看到菜单来判定范围。权限受限页面也属于完整前端覆盖范围。

实施台账每行至少包含：菜单/业务归属、访问路径及 query、路由名、入口类型、页面组件、关键交互组件、权限条件、语言资源命名空间、迁移状态、验证状态及排除理由。本文后续清单作为初始台账，实施阶段再补齐组件和词条级信息。

### 2.2 本次核对结论

- 注册中心有 21 个模块定义，其中 6 个为虚拟菜单，15 个为非虚拟模块。虚拟菜单应追踪目标页面，不按独立模块重复计算页面工作量。
- `base.js` 根据非虚拟模块派生业务路由。当前 `modules.js` 会跳过已注册及虚拟模块，不能将其中的通用模块宿主当作额外业务页面。
- 当前主菜单有 7 个可见分组，安全中心分组隐藏；首页另有独立入口。
- `/flow/*`、`/sudo/*`、`/password/*` 等没有当前可见主菜单入口，虽有注册路由，也不再自动纳入。按最新要求复核系统内调用；确认无调用的功能暂缓，有实际入口或复用组件的部分仅按对应在用链纳入。
- `navLabel` 缺失不代表页面退役，也不自动证明在用；主机详情、巡检报告和拓扑等页面沿在用页面的实际跳转纳入，其他隐藏页面同样核对入口依据。
- 初始全仓规模为 366 个 Vue 文件、560 个 Vue/JS/TS 文件；这只是仓库规模，不是需要迁移的页面数量。
- 从生产路由组件和布局继续追踪本地导入，得到约 302 个 Vue 依赖候选文件。该数包含布局、共享组件、条件导入等，属于静态候选范围，不是已运行验证的页面数或最终改造文件数；实施时仍需核对实际渲染关系。

### 2.3 当前菜单业务范围

下表路径均为应用内部路径，访问时沿用现有 base 与 hash 路由方式。组件路径相对 `src/`；同一页面的多个入口按一份实现、多个场景验收。

| 业务归属 | 实际页面路径 | 页面组件或实现位置 | 重点说明 |
| --- | --- | --- | --- |
| 资产管理 | `/acm/hostHealthCheck` | `modules/patches/views/HostHealthCheckPage.vue` | 菜单属于资产，实现位于补丁目录，不能按目录归属遗漏 |
| 资产管理 | `/acm/overview`、`/acm/info`、`/acm/exception` | `modules/asset/views/AssetOverviewPage.vue`、`AssetInfoPage.vue`、`ExceptionDevicePage.vue` | 覆盖统计、设备筛选、详情、执行反馈及关联弹窗 |
| 资产管理 | `/acm/data`、`/acm/automation`、`/acm/model` | `DataManagePage.vue`、`AutomationConfigPage.vue`、`AssetModelPage.vue` | 分组标签、连接凭据及资产类型的实际引用组件 |
| 资产管理 | `/acm/log`、`/acm/permission` | `OperationLogPage.vue`、`ResourcePermissionPage.vue` | 访问控制菜单隐藏但路由保留；日志仅处理前端文案和模板 |
| 自动化工作台 | `/auto-workbench/overview` | `modules/automation/views/AutomationWorkbenchPage.vue` | 待办、任务状态、设备选择、执行与结果抽屉 |
| 运维工具箱 | `/jao/jobs`、`/jao/schedule`、`/jao/requests` | `modules/automation/views/job/JobListPage.vue`、`JobSchedulePage.vue`、`JobMyRequestsPage.vue` | 连同工具编辑、流程编排和执行弹窗迁移 |
| 定时任务、审批中心 | `/jao/taskScheduler`、`/jao/approvals` | `modules/automation/views/job/JobTaskSchedulerPage.vue`、`JobApprovalsPage.vue` | 两者有虚拟菜单入口，实际仍落在 JAO 路由 |
| 脚本中心、脚本审核 | `/gfs/scriptLibrary`、`/gfs/fileLibrary`、`/gfs/scriptReview` | `modules/automation/views/script/ScriptFileListPage.vue` | 通过 `repoType=git/staticfs/stage` 复用，三种模式均验收 |
| 命令执行 | `/cmd/list`、`/cmd/list?tab=job` | `CommandCenterModule.vue` → `modules/automation/views/command/CommandListPage.vue`、`CommandJobPage.vue` | 第二个页面由 query Tab 和动态映射渲染，不能只查路由的直接 component |
| 命令审核、控制台 | `/cmd/review`、`/cmd/console` | `modules/automation/views/command/CommandReviewPage.vue`、`CommandConsolePage.vue` | 审核入口属于虚拟审批中心；终端原始输出不翻译 |
| 运行记录 | `/run-records/logs`、`/run-records/logs?tab=statistics` | `modules/automation/views/job/JobRunLogsPage.vue` 及其实际子组件 | 记录和统计两个状态均覆盖，前端生成的状态和说明需要翻译 |
| Linux 补丁 | `/patches/machineScan`、`/patches/hostDetail` | `modules/patches/views/LinuxPatchScanPage.vue`、`LinuxHostDetailPage.vue` | 主机概览内安装工作台、详情 Tab、预检查和多步向导都纳入 |
| Linux 安装与回滚 | `/patches/changeRollback`、`/patches/packageSet`、`/patches/installTasks`、`/patches/localInstall` | `LinuxPatchRollbackPage.vue`、`PackageSetPage.vue`、`InstallTasksPage.vue`、`LocalInstallPage.vue` | 任务申请、审批、批量安装、定时安装和回滚提示 |
| Linux 漏洞与软件 | `/patches/patchLibrary`、`/patches/cveList`、`/patches/linuxMachinePackageList`、`/patches/rpmPackageList` | `LinuxPatchLibraryPage.vue`、`CveListPage.vue`、`LinuxMachinePackageListPage.vue`、`RpmPackageListPage.vue` | 漏洞详情、评分显示、筛选和导出；漏洞原始描述不翻译 |
| Windows 补丁 | `/patches/windowsVulnerability`、`/patches/windowsWsus`、`/patches/windowsRollback` | `windows-patch/views/WindowsPatchOverviewPage.vue`、`WindowsPatchWsusConfigPage.vue`、`WinPatchInstallHistoryPage.vue` | 概览内安装/回滚入口、任务抽屉及 WSUS 配置 |
| Windows 漏洞与知识库 | `/patches/windowsCveList`、`/patches/windowsKbList` | `windows-patch/views/WindowsCveListPage.vue`、`WindowsKbListPage.vue` | CVE/KB 详情、风险标签、评分空值和导出交互 |
| 补丁公共入口 | `/patches/middlewareCveList`、`/patches/logs`、`/patches/processLogs` | `MiddlewareCveListPage.vue`、`OperationLogsPage.vue`、`PatchProcessLogsPage.vue` | 对应中间件 CVE、变更日志、流程记录虚拟菜单 |
| Yum 仓库 | `/yum-repo/yumRepo`、`/yum-repo/yumManage` | `modules/yum-repo/views/YumRepoManagementPage.vue`、`modules/patches/views/LinuxYumManagePage.vue` | 嵌入 Linux 补丁侧栏，但保留独立 SPM 权限 |
| Yum 配置与软件 | `/yum-repo/repos`、`/yum-repo/packages`、`/yum-repo/installed`、`/yum-repo/logs` | `modules/software/views/RepoManagementPage.vue`、`SoftwareHomePage.vue`、`InstalledPackagesPage.vue`、`LogReportPage.vue` | `software` 目录仍有在用页面，不能整体排除；已安装页面没有导航标签但有路由 |
| 系统巡检 | `/cac/overview`、`/cac/templates`、`/cac/results`、`/cac/email` | `modules/inspection/views/InspectionOverviewPage.vue`、`TemplateListPage.vue`、`ResultListPage.vue`、`EmailConfigPage.vue` | 模板编辑/执行实际使用弹窗组件，不能用旧独立编辑页代替 |
| 巡检详情 | `/cac/results/:jobId`、`/cac/structural-diagram/:jobId` | `ResultDetailPage.vue`、`StructuralDiagramPage.vue` | 报告统计、检查项、主机详情及拓扑相关弹窗 |
| 主机用户管理 | `/users/users`、`/users/groups`、`/users/logs`、`/users/overview` | `modules/user/views/UserListPage.vue`、`UserGroupsPage.vue`、`UserOperationLogsPage.vue`、`UserOverviewPage.vue` | 各页面经 `UserManagementModule.vue` 包裹；作为首个完整模块试点 |
| 平台用户管理 | `/uam/user`、`/uam/patch-assignment`、`/uam/team` | `modules/settings/views/UamUserPage.vue`、`UamPatchAssignmentPage.vue`、`UamTeamPage.vue` | 页面及用户、角色、团队成员等实际弹窗 |
| 系统设置 | `/ssc/param`、`/ssc/sql-import`、`/ssc/email`、`/ssc/engine`、`/ssc/scheduler` | `SscParamPage.vue`、`SscSqlImportPage.vue`、`SscEmailPage.vue`、`SscEnginePage.vue`、`SscTaskSchedulerPage.vue` | SQL 导入为管理员权限页面，同样纳入；SQL 正文不翻译 |

表中省略目录的组件名称均沿用该行所述模块路径，最终组件台账应记录完整路径。

### 2.4 公共入口及非菜单候选功能

| 分类 | 入口/路径 | 页面或实现 | 纳入方式 |
| --- | --- | --- | --- |
| 应用外壳 | `App.vue`、`main.js`、主布局和各分组布局 | 顶部导航、侧栏、标签页、通知外壳、加载占位、全局消息 | 优先统一迁移，覆盖主界面和管理后台 |
| 首页 | `/home` | `views/home/HomePage.vue`、实际卡片、AI 助手组件 | 包括异步图表组件；不自动纳入未使用的旧首页卡片 |
| 登录、资料、关于、错误 | `/login`、`/settings`、`/about`、`/error/404` | 对应 `views/auth`、`settings`、`about`、`error` 页面 | 无业务侧栏也在完整前端范围内 |
| 管理后台 | `/admin/assets/auto-config` | `layouts/AdminLayout.vue` → `views/admin/AutoConfig.vue` | 必须同时检查后台菜单配置和动态组件映射；不能与资产连接凭据页面合并漏算 |
| AI 外层页面 | `/aiops` 及顶部导航 AI 面板 | `views/aiops/AiOpsAssistantPage.vue`、`utils/ai-ops-panel.js` | 处理本地加载、错误、重试和外层控件；外部嵌入系统内部文案不纳入中英文覆盖 |
| 辅助路由 | `/redirect/:path(.*)`、`/migration` | 重定向辅助页、复用 `HomePage.vue` | 核对可见前端文案；复用首页不重复迁移 |
| 流程中心 | `/flow/list`、`/flow/execution` | `modules/flow/views/FlowListPage.vue`、`FlowExecutionPage.vue` | 入口复核候选，不因路由已注册而自动迁移；无菜单且系统内无调用的页面及专用组件暂缓 |
| sudo | `/sudo/permission`、`/sudo/apply`、`/sudo/templates`、`/sudo/password`、`/sudo/log` | `modules/sudo/routes.js` 对应页面 | 同上；只有在用入口实际调用或复用的部分纳入，不恢复菜单 |
| 密码管理 | `/password/application`、`/password/settings`、`/password/logs` | `modules/password/routes.js` 对应页面 | 同上；是否迁移以实际调用为依据，密码及接口协议仍保持 |

### 2.5 重定向、别名和排除项

重定向只验证目的地、参数及语言延续，不把旧路径当作额外页面重新翻译。

| 原入口 | 实际目标/处理 | 计划处理 |
| --- | --- | --- |
| `/software/*` | `/yum-repo/*`；空路径到 `/yum-repo/repos` | 覆盖现有重定向，不以旧软件模块目录为完整范围 |
| `/rpm-install/*`、`/jao/localInstall`、`/yum-repo/localInstall` | `/patches/localInstall` | 目标实现只迁移一次 |
| `/jao/runLogs`、`/jao/statistics`、`/run-records/statistics` | `/run-records/logs`，统计入口带 `tab=statistics` | 验证记录/统计状态，避免漏掉 query Tab |
| `/cmd/job` | `/cmd/list?tab=job` | 目标动态组件的工具 Tab 必须纳入 |
| `/patches/patchInstall` | `/patches/machineScan`，保留 query/hash | 检查概览中的安装工作台 |
| `/patches/linuxYumManage` | `/yum-repo/yumManage` | `LinuxYumManagePage.vue` 仍是目标页面，不能误判退役 |
| `/patches/windowsYumRepo` | `/yum-repo/repos` | 按目的地验收；路由中保留的 component 不另算页面 |
| `/patches/windowsUpdate`、`/patches/windowsView` | Windows 概览、回滚页面的 alias | 保留兼容地址，复用翻译 |
| `/ssc/applet`、`/ssc/tag`、`/ssc/appres` | 均转 `/ssc/param` | 旧 `SscAppletPage.vue`、`SscTagPage.vue`、`SscAppResPage.vue` 不纳入页面迁移 |

已核实的其他候选排除项：

- `modules/automation/views/command/CommandLogsPage.vue`：对应路由定义已注释，不作为命令执行的在用日志页；运行记录按现有入口迁移。
- `modules/inspection/views/TemplateEdit.vue`、`InspectionConfig.vue`：当前巡检路由未指向这些页面；实际模板编辑弹窗仍纳入。
- `modules/asset/views/ModelEditor.vue`：当前路由及本次本地依赖追踪未命中；资产类型改造应从 `AssetModelPage.vue` 追踪实际编辑组件。
- `modules/patches/views/LinuxVulnerabilityPage.vue`：当前路由未使用；漏洞范围以现有 CVE 路由和其依赖为准。
- `modules/software/views/AvailablePackagesPage.vue`、`HostDetailPage.vue`、`HostOverviewPage.vue` 等未命中当前路由依赖的页面：先列排除候选，若后续动态组件核对发现有效调用再补入。
- 旧 `AssetIndex.vue`、`InspectionIndex.vue`、`PatchManagementModule.vue`、`SoftwareIndex.vue`、`YumRepoIndex.vue` 等宿主：注册中心的兼容 loader 或源码存在不等于实际渲染；仅在证明存在生产调用后纳入。

“排除”指不投入本次翻译迁移，不删除文件、不恢复入口。实施时每项保留引用检索和路由依据；无法通过静态分析确认的动态入口先标记待核对，不能直接宣告退役。

## 3. 技术方案

### 3.1 统一语言状态与资源组织

- 引入 `vue-i18n`，采用适配 Vue 3 的 Composition API。
- 全应用只维护一个有效语言状态。建议 `src/core/i18n/` 管理实例、支持语言、资源加载、语言切换和旧格式兼容；不在多个 Store 内分别保存可独立修改的语言副本。
- 初始语言优先级：本地有效偏好 → 浏览器匹配语言 → `zh-CN`。当前 `zh` 及所有中文脚本/地区变体归一到 `zh-CN`，包括旧偏好 `zh-TW`；`en`/`en-*` 映射到 `en-US`，其他不支持的值继续查找下一浏览器候选或回退简体。注册扩展语言时再启用其精确匹配。资源目录、组件库 locale、日期库 locale 和应用标识之间显式映射。
- 登录、主界面、管理后台、新开同源标签页使用同一偏好；通过 `storage` 事件同步同源窗口，避免后台与主界面语言不一致。不新增用户设置后端接口。
- 提供统一切换入口，使用“简体中文 / English”标签，至少覆盖登录页及主界面/管理后台；同步 HTML `lang`，保留现有路由地址、query 和 hash。
- 公共资源随启动加载，业务资源按语言及模块加载；目标资源准备完成后再提交语言状态，避免半切换。处理加载失败、重试和连续快速切换时的异步竞态。
- 英文缺失时直接回退简体中文保证可用；简体中文缺失时记录诊断并采用安全的原始展示值或 key。最终范围内有效词条须中英文齐全，不能以回退简体冒充英文完成。支持语言、入口选项、资源加载及检查范围由统一注册表派生。

建议资源组织：

```text
src/core/i18n/
  index.js
  locales.js
  loader.js
  legacy-adapter.js
src/locales/
  zh-CN/{common,navigation,auth,home,asset,automation,patches,yumRepo,
         inspection,hostUser,platformUser,settings,flow,sudo,password,admin,ai}.json
  en-US/{同上}.json
```

具体目录可根据项目编码规范调整，但命名空间、回退和加载规则必须统一。已有 `src/locales/zh-TW/` 作为未启用预留保留，不参与运行时加载和当前词条一致性检查；其内容不代表完整适配。

### 3.2 旧翻译工具和词库兼容

现有 `src/utils/i18n.js` 处理 `#{key}`，固定从 `public/i18n/zh-cn/` 加载，使用非响应式缓存；旧词库既有扁平键也有嵌套对象，部分消息使用 `{{参数}}`。

- 保留 `translateText()`、`translateI18nKey()`、`initTranslations()` 等已用接口，内部逐步转接统一语言服务，避免一次改完所有调用方。
- 盘点的是当前可达功能引用的旧 key，不要求把 55 份词库的约 4,927 个历史叶子条目全部翻译。
- 为有效引用补齐英文，中英文资源使用同一 key 和参数结构；统一扁平键/嵌套对象的查找规则，检测合并冲突及缺失键。
- 后续扩展繁体中文时可对已确认的本地词条离线生成初稿，再复核运维术语和地区用词。不得运行时转换整个 DOM、接口响应或用户输入。
- 新文案采用标准命名参数；旧 `{{参数}}` 通过独立适配或经过校验的资源转换处理，不把旧模板直接送入新消息编译器。
- 参数仅作插值，不递归翻译后端文本、不改变脚本内容，不引入未转义的 HTML。
- 数据对象保留原始 key/参数，在展示层翻译。已被转换成中文的字符串无法可靠反推 key，不能把它作为切换语言的数据来源。
- 核查已有 `addTranslations()` 的使用方式，再决定将其接入当前语言的兼容资源层或迁移调用；不得留下第二套独立缓存。

### 3.3 导航、缓存和响应式文案

- 菜单、模块定义、路由 meta、navItems 增加 `nameKey`、`titleKey`、`labelKey` 等展示键，具体字段命名统一确定。
- 模块 code、route name、path、权限码、组件名和 KeepAlive 标识保持业务语义，不参与翻译。
- `menu.config.js` 的解析缓存和 `MODULE_NAV_CONFIG` 不缓存已翻译文本；Store/computed 与语言状态建立依赖。
- `tagsView` 持久化标题键和必要参数，并兼容历史缓存。用户自定义或后端动态标题原样保留，不能一律用静态路由标题覆盖。
- 表头、校验规则、下拉选项、步骤条、图表 legend/tooltip、状态说明、进行中的任务提示使用 computed 或展示时求值，避免初始化时执行一次 `t()` 后永久保存。
- 切换语言不通过刷新整个页面、重建全部路由或重挂业务页面实现，避免丢失未保存表单、选择状态及任务上下文。
- 已打开弹窗/抽屉和缓存页面应同步更新；一次性 Message、Notification、命令式确认框至少保证创建时使用当前语言，不为更新短暂提示强制重建业务状态。

### 3.4 业务逻辑与协议隔离

已发现通过中文标签判断操作类型的代码，例如补丁日志根据“补丁扫描/补丁安装”分支、Windows 任务根据显示的“回滚”判断动作、评分根据“未评分”判断空值。

- 先拆分稳定业务值与显示标签，再迁移文案。
- 用状态码、任务类型、原始数值/空值判断行为，显示层单独翻译；不使用 `t()` 的输出作为条件、映射键或请求参数。
- 接口协议本身要求中文值时保留原协议值，仅翻译选项 label；不能将“后端中文不考虑”理解为允许改变协议。
- 资产字段名、导入模板表头和字段映射有中文兼容逻辑时，保留旧中文映射及现有英文属性名。
- 前端生成的导出展示列名、说明和文件名按当前语言输出；用于回导的机器字段、固定工作表名、模板字段和协议结构维持兼容。需要多语言模板时先核实其在用入口及解析规则，不直接改动所有 `public` 模板。

### 3.5 组件库、日期和其他界面

- 将 `App.vue` 中固定的 Element Plus `zhCn` 改为随有效语言变化的简体中文及英文配置；核对 `main.js` 和命令式组件，避免语言配置来源不一致。
- 日期组件同时核对所需日期库的简体和英文 locale。统一日期、数字、相对时间及数量表达，避免到处固定 `zh-CN` 或拼接“分钟前”；分页和日期选择器文案随语言切换。
- 语言变化只改变展示格式，不改变接口日期格式、存储时间、查询参数和时区语义。
- 两种语言的数量和语序采用完整消息加参数，避免拆词拼接。建立“运维工具、补丁、回滚、连接凭据、主机用户、平台用户”等中英文术语表，产品名称和技术标识按既有规范保留。
- ECharts、BPMN 工具、编辑器和 AI 外层按各自实际调用链检查；仅处理用户可见控件，不翻译代码语言内容、BPMN 用户节点名称或外部服务正文。
- 英文较长的按钮、表单标签、固定宽度下拉框和表格列按需要调整宽度/换行规则，特别检查资产筛选栏、向导步骤和批量操作区。

## 4. 实施阶段、交付物和估算

按一个熟悉项目的前端工程师估算，包含前端词条整理、英文初译、术语复核、实现和开发回归；不包含专业语言供应商审校、后端工作及外部嵌入系统改造。各阶段相互衔接，不将共享组件重复计算到多个业务模块。下表保留原始总体估算；它包含后来收窄的非菜单功能范围，不是当前预算或剩余工期。

| 阶段 | 工作内容 | 交付物/完成条件 | 预计人天 |
| --- | --- | --- | ---: |
| P0 范围基线 | 将本文路径清单展开到实际组件和交互；确认动态入口、权限和排除依据 | 路由—页面—组件台账、术语表、已知测试基线 | 1～2 |
| P1 基础设施 | 中英文翻译实例、语言匹配、加载/回退、存储同步、旧工具适配和资源检查 | 可切换两种语言的公共服务，旧 key 兼容用例通过 | 2～3 |
| P2 公共界面 | 导航、布局、标签页、登录、首页、资料、后台外壳、AI 外层、组件库配置 | 公共入口可中英文切换，缓存标题和新窗口语言一致 | 2～4 |
| P3 完整试点 | 主机用户管理四个路由及实际弹窗、任务反馈、校验和统计 | 一个完整模块的中英文迁移/验收样板；据此校准余下估算 | 2～3 |
| P4.1 资产 | 资产各路由、主机健康页、实际编辑/详情/执行组件、后台连接凭据页面 | 资产及后台连接凭据完整迁移 | 2～4 |
| P4.2 自动化 | 工作台、工具、流程编排、脚本/文件/审核模式、命令 Tab、定时任务、审批和运行统计 | 可见自动化入口及全部相关交互完成 | 4～6 |
| P4.3 补丁与仓库 | Linux/Windows、中间件、日志、安装/回滚向导、Yum 及复用软件页面 | 跨模块入口和安装执行链完整覆盖 | 5～8 |
| P4.4 巡检 | 总览、模板、记录、报告、拓扑和邮件配置 | 报告/拓扑的间接入口及详情弹窗完成 | 2～3 |
| P4.5 平台与设置 | 平台用户、团队、补丁分配、参数、SQL、邮件、引擎和计划任务 | 管理员与普通权限场景覆盖 | 1～2 |
| P4.6 非菜单入口复核 | 核对注册候选是否被在用页面实际调用；无菜单且无调用的功能暂缓 | 保存纳入/暂缓依据，只为证实在用的遗漏补齐翻译 | 按实际调用重估 |
| P5 集成回归 | 中英文切换、权限、缓存、参数、重定向、图表、导出及术语修正 | 台账全部有结果，中英文资源完整且本地文案无未解释错用语言 | 3～5 |
| 原始合计 | 原全量前端简体中文及英文范围 | 含旧 P4.6 估算，收窄范围后不作为当前排期 | **26～43（历史）** |

原始估算另预留约 20% 处理词库兼容、动态入口补漏及术语/布局修正，曾得到 **31～52 人天**、单人约 **7～11 个工作周**。这些数字包含旧范围，不能用作当前剩余工期；后续仅按证实在用的遗漏、范围核对和集成验收工作重估。

执行顺序为 P0 → P1 → P2 → P3 → P4 各批次 → P5。分批交付期间允许未迁移模块暂时回退简体中文；最终验收时，范围内前端自有文案必须中英文完整。

## 5. 验证与验收

### 5.1 自动检查和轻量测试

- 先记录现有测试基线，区分既有失败与国际化引入的回归；不把顺带修复无关历史问题计入改造完成条件。
- 检查中英文 key 集合、插值参数一致性、缺失词条、资源格式和重复键；扫描当前范围内硬编码中文，并对接口字段、协议值、用户数据和日志原文建立例外说明。检查范围以已注册语言为准。
- 定向测试中英文初始化、中文变体归一及旧偏好兼容、偏好恢复、简体回退、资源失败重试、快速切换竞态及旧 `#{key}`/`{{参数}}` 兼容。
- 定向测试导航/标签页响应、缓存恢复、query Tab、已打开弹窗和图表配置更新；确认表单输入、选择结果和运行任务不因切语言丢失或重新提交。
- 保留原有业务交互断言：筛选、选择、提交目标、审批和权限不变。已有测试按简体中文按钮查找时，为普通业务回归明确注入 `zh-CN`；为代表性完整链路补充英文和中英文往返切换用例，不机械复制全部测试。
- 对变更文件做 diff 审查及适当的静态检查/定向测试；不使用带 `--fix` 的命令作为只读验证。
- 遵循项目验证偏好：不默认运行生产 build，不默认截图级视觉验证。必要时另行说明具体原因并获得用户明确授权；不得将它们设成自动执行步骤。

### 5.2 人工功能验收矩阵

按本地界面语言判断结果，接口原样中文不得误报为未完成项。

| 场景 | 验收要求 |
| --- | --- |
| 简体、英文及中文地区变体浏览器首次访问，已有本地偏好 | 按优先级初始化；中文变体及旧 `zh-TW` 偏好归一为简体，不暴露原始 key |
| 简体 ↔ 英文，刷新、退出再进入、新开后台 | 两个方向均验证，选择持久化，界面和同源窗口同步 |
| 导航、标签页、缓存页面、后台标题 | 文案按当前语言呈现，页面地址和缓存身份不变 |
| 普通用户与管理员 | 当前权限下可用功能分别覆盖；SQL 导入等受限页面不漏验 |
| 列表、空态、失败态、加载态、校验态 | 前端自有文案完整；后端详情可以保持中文 |
| 弹窗、抽屉、多步向导、运行中任务 | 切换语言保留目标、输入和步骤，无额外业务写请求 |
| GFS 三种模式、命令工具 Tab、运行统计 Tab | 复用组件的差异化文案和入口均覆盖 |
| 详情、报告、拓扑及有实际调用的隐藏路由 | 沿已确认的在用入口覆盖本地界面；仅注册且无菜单、无调用的暂缓项不列为验收缺口 |
| 旧地址、alias、redirect | 最终目的地、query/hash、权限和语言状态保持正确 |
| 日期、数量、图表、导出 | 显示符合语言，时区、接口数据及回导协议不变 |

### 5.3 最终完成标准

1. 本文范围台账的在用入口、页面模式和关键交互全部标记完成，并有验证记录；无菜单且系统内无调用的暂缓项保留依据，不要求先翻译。
2. 范围内前端自有文案中英文齐全，key 和参数一致；英文模式中的中文均有明确例外或修复，不能只用“文件含中文”作为失败判断。
3. 不显示未解析的 key、`#{...}` 或模板占位符；缺失资源有稳定回退，不阻塞业务。
4. 所有依赖中文显示值的业务判断已隔离，翻译不改变请求参数、权限、任务类型、选择目标和导入导出协议。
5. 语言切换覆盖公共导航、现有页面状态、主要动态组件和打开的业务弹窗，无需刷新整个页面。
6. 与本次变更相关的静态检查和定向测试通过；既有问题、外部系统和后端原文的范围边界有记录。
7. 交付中英文资源、术语表、路由/组件台账、开发约定及回归结果；新增页面后按同一规则补齐中英文资源和验收项。

## 6. 实施风险与控制

| 风险 | 控制措施 |
| --- | --- |
| 仅按目录或当前可见菜单筛选，漏掉跨模块复用和详情 | 以生产路由和组件调用链为准，维护本文台账 |
| 把历史文件和纯重定向当作额外业务页面 | 核对实际渲染目标、动态映射及引用，复用实现只迁移一次 |
| 旧词库格式不统一，模板与新编译器冲突 | 独立适配层及代表性词条测试，先试点再推广 |
| 静态数组、Store 和持久化缓存保留旧语言 | 保存 key/业务码，展示时求值，兼容已有缓存 |
| 中文标签参与行为判断或后端协议 | 先分离业务码和显示标签，保留接口契约 |
| 英文拉长固定宽度控件 | 针对实际在用界面调整布局规则，避免全局无差别扩大 |
| 扩展语言时误转换业务数据 | 只处理本地语言资源，保留后端数据、用户输入和协议原值 |
| 动态页面和条件弹窗静态追踪不完整 | P0/P3 根据渲染映射和交互逐项核对，保留待确认项及工期预留 |

## 7. 后续维护约定

- 新功能必须同时提供简体中文和英文资源，复用公共操作词，模块术语保持一致。
- 不使用中文或翻译结果作为状态、枚举、路径、组件键或接口字段。
- 新路由、菜单、Tab、弹窗和跨模块引用需同步更新范围台账；代码遗留不自动代表可用功能。
- 新的中文扫描检查优先约束新增/修改代码，例外必须有明确原因，避免阻塞无关历史代码。
- 本地系统文案与用户/后端内容保持来源可辨识，以便后续准确验收，而非对所有字符串做运行时猜测翻译。

### 7.1 扩展新语言

1. 在 `src/locales/<locale>/` 补齐当前全部命名空间和参数，并完成术语校对；已有预留词库不能直接视为可用。
2. 在 `src/core/i18n/locales.js` 的 `LOCALE_DEFINITIONS` 注册标识、显示名、日期 locale 和加载器。语言入口、加载白名单和词条检查由此派生。
3. 在 `element-locale.js` 添加组件库及 Day.js 对应配置，检查脚本/地区匹配规则和回退行为。
4. 运行词条检查和定向交互测试，覆盖初始化、往返切换和状态保持，再将该语言纳入交付范围。

## 8. 技术参考

- [Vue I18n Composition API](https://vue-i18n.intlify.dev/guide/advanced/composition)
- [Vue I18n 语言资源异步加载](https://vue-i18n.intlify.dev/guide/advanced/lazy)
- [Element Plus 国际化与日期配置](https://element-plus.org/en-US/guide/i18n.html)

以上资料用于实现方式参考，实际依赖版本、消息格式及项目兼容性在 P1 中核对，不直接升级无关依赖。
