# 巡检总览与模板管理国际化审查说明

本批继续简体中文和英文改造，范围从 `src/modules/inspection/routes.js` 的实际菜单/路由和组件引用展开。基于 `feature/frontend-i18n` 的 `c8b781b798d6fd9705948be8fde14fbd1acebd05` 开始，本次提交包含巡检总览、模板管理和对应审查修复，未推送远程。繁体扩展注册机制沿用现状，本批不补充繁体资源。

## 入口与改动范围

| 实际入口或调用链 | 改造内容 |
| --- | --- |
| `/cac/overview` → `InspectionOverviewPage.vue`、`useOverviewData.js` | 统计概览、覆盖率、加载/失败/中断、结果状态、模板操作、数字展示和相对时间 |
| `/cac/templates` → `TemplateListPage.vue`、`useTemplateListData.js` | 筛选、排序、分页、空态、读取失败与过期结果、删除确认和操作反馈 |
| 上述页面 → `TemplateEditDialog.vue` | 新建/编辑标题、字段、说明、脚本与资产选择、运行参数提示、表单校验及保存反馈 |
| 上述页面 → `RunTemplateDialog.vue` | 执行前确认、任务字段、脚本/目标主机、表单校验和启动反馈 |
| 编辑/执行 → `ScriptSelectorDialog.vue`、`scriptPresentation.js` | 文件目录导航、筛选/分页、发布状态、日期、重复配置保护及未命名脚本兜底 |
| 总览导航 → `report-navigation.js` | 返回总览或执行记录的标题随当前语言求值，目标路径和 query 保持 |
| 编辑/执行 → 共用 `AcmDeviceSelectorDialog.vue` | 修复语言导致选项对象变化时重置标签页的问题，保留分组/标签模式及选择 |

路由调用链核对了 13 个巡检文件，实际修改其中 9 个；`api/index.js`、`useOverviewReportNavigation.js`、`result-list-route-state.js` 和 `helpers.js` 无需替换，保持本轮起点内容。加上共用选择器，共修改 10 个生产脚本/组件（6 个 Vue、4 个 JS），另有两份语言资源、词库检查脚本及其既有测试、三个新测试文件和两份文档，共 19 个文件。

未引用的 `TemplateEdit.vue`、旧 `InspectionConfig.vue` 不按目录整体迁移。`/cac/email` 和共享状态为前一批已提交内容，本批保留其原有词条。本批更新共用返回标题和未命名脚本兜底，会同时改善报告调用处的这两项展示，但不将报告页面算作完成。

## 行为与数据边界

- 页面标签、统计图例、已加载文件的发布状态和返回标题在展示时翻译；持续显示的本地读取错误保存消息 key，语言变化后重新求值。统计尚未完成时切换语言不重发请求。
- 语言切换不修改筛选关键词、排序、当前页、脚本目录、脚本/设备选择、表单草稿或弹窗开关。模板读取失败后继续保留上次成功结果并禁用写操作；重试和原有中断保护保持。
- 两个表单使用响应式校验规则及已有 `useLocalizedValidation`，关闭规则变化自动触发全表校验；只更新已显示的校验错误，不清空用户输入。
- 共用设备选择器的选项计算不再写入当前模式。仅 `selectMode` 字符串配置真正变化时重置为首个模式，翻译标题导致的对象替换不重置标签页；使用真实父组件及弹窗的回归用例验证。
- 模板名称/说明、脚本名/路径/参数、主机及分组/标签名称、后端错误正文保持原文。`auditParams`、原始主机项、规则表达式和既有模板扩展属性按原规则提交。
- `OK/FAILED/CHECK/SKIPPING/UNREACHABLE`、`PUBLISHED/DISABLED`、`WAITING/RUNNING` 及原始 ID、权限、路由和 API 实参不翻译。相对时间与文件日期随语言展示，不改变接口时间字段、查询时间或业务时区。
- 操作列及原生文件表格部分列宽为较长英文标题留出空间；本批未进行浏览器布局验收，实际接口、权限及英文窄屏布局仍需后续集成验收。

## 本批审查修复

- 将新增 import 放回连续导入区，保留 `useOverviewData.js` 原有文件说明在顶部；仅整理本批新增的分隔，不整文件格式化。
- 插值改为 `{loaded}`、`{total}`、`{failed}`、`{matched}`、`{name}` 和 `{reason}` 等语义参数。统计摘要的“部分汇总”、统计主体及失败提示分别翻译，由代码使用 ` · ` 连接；词条不再包含前后边界空格和分隔符。
- 相对时间格式化器使用随当前语言变化的 `computed` 复用，同一语言下不因重复读取或行数增加而重建。保留 `numeric: 'always'`，即 `1 day ago` / `1天前`，与改造前的数字时长行为一致。
- 移除本批页面对主机用户、补丁、自动化、Yum 等业务词条的复用；通用动作继续使用 `common`，其余文案使用 `inspection` 的语义键。脚本选择确认保留原“确定”文案。
- 英文标题调整为 `Inspection results summary`。脚本、资产、文件、主机配置和模板数量使用完整消息及复数分支；四处强调数量的徽标通过 `I18nT` 的数量插槽保留原 `<strong>` 展示，避免拆分语序。
- 词库检查脚本及既有资源测试按占位符名称集合比较两种语言，允许英文复数分支重复插入同一参数，仍检查缺少或多出的参数名。没有改动公共 `t` 接口。
- 新增五项回归，覆盖 0/1/2 数量的中英文切换、部分失败摘要及格式化器复用。设备选择测试经严格 UTF-8 检查，实际文本为“原始主机”，不存在审查意见提到的乱码，文件内容保持。

## 验证结果

| 检查 | 结果 |
| --- | --- |
| 中英文资源检查 | 各 4431 个词条，相对本批起点各新增 144 个；key、参数、编译语法、重复键及 7125 个源码字面量 helper 引用通过，四处 `I18nT` 数量消息另由组件用例覆盖 |
| 原有资源保护 | 两种语言原有巡检邮件/状态的 48 个词条及值保持 |
| 扩大回归 | 改造首轮 186 个测试文件、1853 项用例通过，退出码 0，无失败或跳过 |
| 审查修复后的复测 | 巡检、语言服务和设备选择器 26 个文件、256 项用例通过，退出码 0；按每个文件最新成功报告合并为 186 个文件、1858 项用例，不重复累计 |
| 新增行为测试 | 3 个文件、19 项用例，覆盖查询不重复、筛选分页不重置、异步统计、过期结果保护、表单草稿/校验、原始提交参数、脚本重复配置、设备模式保持、英文复数及相对时间复用 |
| 静态检查 | 15 个脚本/测试通过语法及 ESLint 基线比较，6 个 Vue 脚本/模板可编译；原有 9 条 ESLint 错误无新增 |
| 协议核对 | 10 个生产文件的 15 处 API/HTTP 调用和全部实参相对 `c8b781b7` 的 AST 比对无差异 |
| 源码核对 | 212 处翻译调用参数、46 处本地导入检查通过；新增词条无未引用项，变更文件的可见中文残留及翻译进入身份值/比较的检查无异常 |

扩大回归明确排除两个已在历史基线复现的失败文件：`tests/core/auth/auth.test.js`（8 项既有断言失败）和 `tests/core/api/api.test.js`（初始化读取 `interceptors` 失败）。本批未修改这两个文件或对应实现，成功结果只代表选定范围。测试中既有 Vue 生命周期等告警不等于失败；验证以退出码及 JSON 报告为准。

遵循项目约定，未运行生产构建、浏览器截图或截图级视觉确认。原始调用链清单、本轮起点快照、静态检查和测试报告均存于本机忽略目录 `.cache`，不加入产品提交。

## 独立审查与后续

- `.cache/i18n-inspection-templates-review.patch`：仅本批差异。
- `.cache/i18n-inspection-templates-review-files.json`：本批文件及最终 SHA-256。
- `.cache/i18n-inspection-templates-review-status.json`：文件数和补丁摘要。
- `.cache/i18n-inspection-review-fixes-review.patch`：相对同事审查前工作区的修复增量；对应 `-files.json` 和 `-status.json` 记录文件及摘要。原累计审查差异另备份为 `.cache/i18n-inspection-templates-review.patch.before-review`。
- `.cache/i18n-inspection-templates-graph.json`、`.cache/i18n-inspection-templates-start/`：实际入口、依赖图和改造前快照。
- `.cache/i18n-windows-inspection-template-expanded.json`、`.cache/i18n-windows-inspection-template-final.json`、`.cache/i18n-windows-inspection-template-final-pages.json`：扩大回归和收尾复测报告，重复运行不累加测试数。
- `.cache/i18n-windows-inspection-review-fixes-recheck.json`：审查修复后的成功复测报告；初次定向回归发现确认按钮文案及旧参数比较断言不匹配，修复后完整复测上述 26 个文件通过。

下一批从 `/cac/results` 进入执行记录及真实报告链，再展开 `/cac/results/:jobId` 和 `/cac/structural-diagram/:jobId` 的详情、导出与拓扑组件。后端正文继续不纳入翻译，按调用关系复用本批脚本、模板和状态能力。
