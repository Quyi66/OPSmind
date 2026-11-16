# Windows 补丁、独立日志与巡检基础中英文改造审查说明

本批继续在 `feature/frontend-i18n` 上实施，提交基点为 `26ad0571`。开始时已有上一批 Linux 补丁与 CVE 的 68 个未提交文件，本批以当时的工作区内容作为增量基线，保留此前修改，继续不暂存、不提交。

交付语言为简体中文和英文，沿用统一语言注册表及扩展机制。繁体中文仍未启用；后端直接返回的中文、漏洞描述、主机/产品/补丁名称、脚本、错误和日志正文保持原样。

## 入口与调用链

先核对 `src/modules/patches/routes.js` 的实际组件及重定向，再追踪页面导入和模板引用。完成 Windows/日志后，继续按 `src/modules/inspection/routes.js` 推进独立的邮件配置入口。以下八个页面是本批入口，未按目录对全部旧文件进行替换。

| 入口 | 本批实际实现 |
| --- | --- |
| `/patches/windowsVulnerability`，兼容 `windowsUpdate` | `WindowsPatchOverviewPage` → 单主机补丁抽屉、批量安装抽屉、扫描、报表、任务详情；包括统计、内存提示、筛选、分页及读取失败提示 |
| `/patches/windowsWsus` | `WindowsPatchWsusConfigPage` → `WinPatchWsusConfigDialog`，包括配置读取、增改删、表单和已有校验错误 |
| `/patches/windowsRollback`，兼容 `windowsView` | `WinPatchInstallHistoryPage` → `WinPatchRollbackDialog` → 回滚确认、脚本、重启/重扫、执行结果及暂停后继续查询 |
| `/patches/windowsCveList` | `WindowsCveListPage` → `WindowsCveDetail`、实际共用的 CVE 导出配置和 KB 链接，包含统计、产品状态筛选、评分、描述缺省和影响图表 |
| `/patches/windowsKbList` | `WindowsKbListPage` → `WindowsKbDetail`、`WindowsKbDetailDialog`、`WindowsKbLinkList`，包含 KB/漏洞关联、补丁取代关系和受影响主机 |
| `/patches/logs` | `OperationLogsPage` 的筛选、独立列表、目标节点弹窗、运行结果及 Linux/Windows 扫描、安装和回滚报告入口 |
| `/patches/processLogs` | `PatchProcessLogsPage` → `PatchProcessLogDetailDialog`、`PatchProcessLogScriptStep`、`usePatchProcessLogDetail`，包含审批驳回说明、任务步骤和流水线结果 |
| `/cac/email` | `EmailConfigPage` → 页面内实际使用的收件人列表、收件人编辑和自定义邮件内容弹窗；仅调用共用辅助模块的日期显示函数，不扩展到其他巡检页面 |

安装链包含 `WinPatchInstallWizard`、确认/脚本/重启/执行四类步骤和 `useWinPatchInstallWizard`；回滚复用其中适用的步骤，执行和汇总使用自身组件。`constants.js`、`utils.js` 及 Windows API 适配层的本地步骤错误按调用链处理。

`windowsYumRepo` 仍重定向至已迁移的 `/yum-repo/repos`。共用报告、CVE 导出、任务流水线和执行结果组件沿用前批成果；未引用的旧 `WinPatchInstallDialog` 和其他历史页面不因此启用或迁移。

另沿巡检报告和详情弹窗的真实导入先行处理 `constants/status.js`：任务、检查项、统计卡片和筛选选项的 `text/label` 改为响应式 getter，`name/value`、颜色和图标保持。这只完成共享状态基础，不代表报告及其弹窗正文已迁移。

## 行为与兼容边界

- 显示文案在模板、computed 或 getter 中读取当前语言。语言切换保留选择、脚本/File、表单草稿、筛选、分页、Tab、当前步骤及已打开的结果，不重新派发查询、安装、回滚或扫描。
- 扫描模式、补丁分类、严重程度、状态、任务/步骤标识、主机/补丁/历史 ID 和 API 参数使用原值。任务详情根据 `ROLLBACK` 判断回滚，不再依赖显示出来的“回滚”文字。
- 严重程度统计保留后端中文键的兼容查找，英文展示不会将“严重”等数据键改成英文；Windows 的 Critical 展示为 Critical，与 Linux 历史 High 指标的文案分开。
- 四处 CVSS 展示根据原始数值判断评分是否存在，零分继续显示 `0.0`，不再用“未评分”文字判断。CVE 图表随语言更新显示名称，数据和产品筛选保持。
- 持续显示的本地读取/执行错误保留消息 key。新增 Windows 反馈辅助模块保留异步步骤错误的 key 和延迟参数；服务器返回的错误正文保持原样。一次性通知采用完成时的当前语言。
- 重启、重扫提示及默认确认短语随语言更新；部分输入不会因切换语言而自动启用，已经确认的布尔选项保持。同一配置中已展示的完整短语仍可确认；调用方显式修改确认词后，不接受该字段旧配置的短语。后端 `确认重启` 协议值保持中文。
- 打开的任务/流水线结果通过稳定步骤 key 更新标题，后台任务和运行 ID 保持；自定义显示参数保持。WSUS 仅重新校验已经报错的字段，不触发未操作字段校验或保存，`useSsl: false` 仍按原值提交。
- 旧动作 key 在界面按当前语言显示，在日志报告分类时按固定简体解析身份。日志筛选所需的 `补丁安装`、`补丁回滚` 仍发送原中文协议值。
- 报表缺省文件名在下载时求值，服务端文件名优先；保留原导出的中文文件名常量以兼容潜在外部引用。PowerShell 示例中的花括号及管道符按字面量转义，不被消息插值或复数语法解释。
- 前端缺省描述 HTML 可翻译，后端描述不作为消息模板编译。用户输入中的中文、花括号、引号和文件名不进入词条替换流程。
- 巡检邮件采用新增的 `inspection.email` 资源组，并在两种已启用语言的入口显式注册；未启用的繁体资源不变。模板名、收件人资料、邮件标题/正文及 `{{template_name}}` 等用户占位符保持；全局开关的 `yes/no`、收件人/内容状态的 `0/1`、租户及模板 ID 不翻译。收件人表单仅更新已有校验错误，删除取消分支和邮件发送开关行为保持。操作列改为最小宽度 260，为两个英文按钮留出空间。

## 独立审查方式

普通 `git diff` 同时包含上一批和本批修改。需要只审查本批时，可使用本机忽略目录中的以下文件：

- `.cache/i18n-windows-logs-review.patch`：相对本批开始时工作区的独立增量差异。
- `.cache/i18n-windows-logs-review-files.json`：本批文件清单、是否新增及最终 SHA-256。
- `.cache/i18n-windows-start/`：本批开始时 68 个已有文件的副本和摘要；其余原文件以 `26ad0571` 为基线。
- `.cache/i18n-windows-validation-summary.json`：按每个文件的最新成功报告汇总验证，不累计重复执行的用例。

此前 `.cache/i18n-linux-cve-review.patch` 及其他历史审查补丁保持，未覆盖。中英文 `patches.json` 与进度文档继续叠加本批结果，之前的资源内容保留。以上本机审查和诊断文件不作为产品文件提交。

## 验证记录

最终验证数字见[实施进度中的本批记录](./frontend-i18n-progress-20261112.md#windows-logs-validation)。新增六个测试文件覆盖实际语言切换、真实表单/表格交互、异步错误、扫描和报表参数、邮件开关与收件人/自定义内容保存，以及实际详情筛选和统计卡片的稳定状态值；另复测原 Windows、日志、Linux/CVE、共享组件和语言基础服务。

扩大回归排除两个已知基线失败文件：`tests/core/auth/auth.test.js` 与 `tests/core/api/api.test.js`。上一批已通过只读加载 `26ad0571` 的源码复现同样的 8 个认证断言失败和 API 初始化错误，明细保留在 `.cache/i18n-linux-baseline-comparison.json`。本批没有修改认证、核心 API 或其测试，成功回归不代表这两个基线问题已解决。

本批未运行生产构建或截图级验证。实际账号、权限、后端数据及英文窄屏布局仍需集成验收。后续继续巡检总览、模板、记录、报告和拓扑，再推进平台/设置入口；不能将邮件页完成视作整个巡检模块完成。

## 下一批已核对的巡检入口

巡检模块入口为 `/cac`，路由还保留以下五个在用页面；详情和拓扑虽然没有独立导航标签，也属于范围。可接续扩展已经注册的 `inspection` 命名空间，按以下调用链实施，不处理未引用的旧 `TemplateEdit.vue`、`InspectionConfig.vue`。

| 顺序 | 实际入口和依赖 | 迁移时需保持 |
| --- | --- | --- |
| 1 | `/cac/overview`、`/cac/templates` → `TemplateEditDialog`、`RunTemplateDialog` → `ScriptSelectorDialog`；配合 `useOverviewData`、`useTemplateListData` | 模板草稿、脚本路径、运行参数、设备选择、已有配置兼容与执行 ID；共享设备选择器沿用已迁移版本 |
| 2 | `/cac/results` → 现有 `ExecuteResultDialog`，并使用记录配置摘要及报告返回上下文工具 | 模板/任务/时间筛选、分页、记录下载、轮询和跳往报告的 query；共享执行结果不重复替换 |
| 3 | `/cac/results/:jobId` → `useResultDetailData`、`useResultDetailDialogs` 与 `components/result-detail` 的统计卡片、主机/KPI/检查项、受影响主机、白名单及资产模型配置弹窗 | `jobId`、主机和检查项 ID、后台结果正文、状态值 `OK/FAILED/CHECK/SKIPPING/UNREACHABLE`、Tab/展开/筛选和报告返回位置 |
| 4 | `/cac/structural-diagram/:jobId` → 页面内实际服务层级、KPI 和列表弹窗及 ECharts 拓扑 | 图节点/服务 ID、请求参数、缩放/选择、当前服务层级与返回报告/列表上下文；后台业务/检查项名称不做猜测翻译 |

这些入口的页面正文和主要交互仍待下一批迁移，仅先行接入共用状态输出，不将它们计入已完成页面。
