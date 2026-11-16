# 巡检执行记录与报告国际化审查说明

本批从 `inspection/routes.js` 中的 `/cac/results` 和 `/cac/results/:jobId` 展开实际引用链，继续交付简体中文和英文，后端直接返回的中文不翻译。基于 `feature/frontend-i18n` 的 `7441934c9fb3bee1a34ef4c3ac872f9db2f9b216` 开始，修改单独保留在工作区，未暂存、未提交、未推送；繁体资源和语言扩展机制保持。

## 实际入口和范围

| 入口及调用链 | 改造内容 |
| --- | --- |
| `ResultListPage.vue` → `result-record-presentation.js` | 模板筛选、未应用关键词提示、分页/排序、读取失败与过期结果、配置组摘要、任务状态、查看日志/报告/拓扑的入口 |
| `ResultDetailPage.vue` → `useResultDetailData.js` | 报告信息、主机与检查项列表、统计、状态筛选、原始输出摘要、黑名单操作反馈及现有 Excel 下载 |
| 报告 → `useResultDetailDialogs.js` | 主机详情、KPI、检查项详情及关联主机、主机/检查项黑名单的读取与操作反馈；已打开的 KPI 标题随语言更新 |
| 报告 → `StatisticsCards.vue`、`HostDetailDialog.vue`、`KpiDetailDialog.vue` | 统计标题与数量、主机信息、检查项筛选、匹配数量和详情入口 |
| 报告 → `CheckItemDetailDialog.vue`、`CheckItemHostsDialog.vue` | 诊断结果、原始输出、黑名单确认、跨主机比对及关联主机数量 |
| 报告 → `WhitelistDialog.vue`、`ItemWhitelistDialog.vue` | 主机豁免和检查项豁免列表、选择数量、规则搜索与操作 |
| 报告 → `AssetModelConfigDialog.vue` | 导出列说明、字段选择数量、加载及保存反馈；原模型类型、字段名称和提交属性不翻译 |

调用链共核对 20 个巡检文件，修改其中 13 个（10 个 Vue、3 个 JS）。另外修改中英文资源各一份、新增两个测试文件和一份审查文档、更新进度文档，共 19 个文件。

以下七个调用链文件保持本批起点内容：`api/index.js`、`result-list-route-state.js`、`report-navigation.js`、`helpers.js`、`scriptPresentation.js`、`constants/status.js` 和 `components/result-detail/index.js`。跨模块 `ExecuteResultDialog`、`RunLogStatusTag` 与公共轮询沿用已迁移能力，本批不重复替换。未引用的 `ResultListDialog.vue`、`HostSelectorDialog.vue` 不按目录整体迁移。

## 行为与协议边界

- 列表语言切换不调用读取、搜索或重置函数，保留原模板 ID、已应用关键词、未应用输入草稿、页码、每页条数、排序和行身份。过期结果与认证失败继续使用既有保护逻辑。
- 配置摘要保存原配置组的计数，在 `summary` getter 中翻译；已取得的摘要也能更新语言，无需重读配置或替换列表行。
- 持续显示的读取错误在 computed 中求值；KPI 标题保存消息 key 和延迟参数，翻译后的状态标签只作为 `statusLabel` 插值，不写回原状态。
- 主机/检查项/KPI 搜索、报告详情页筛选和分页、已选主机/规则 ID、导出字段草稿保持。原窗口关闭、报告切换和过期异步请求保护保持；不添加以语言变化为条件的读取或清空逻辑。
- 状态值 `OK/ERROR/WAITING/RUNNING`、`OK/FAILED/CHECK/SKIPPING/UNREACHABLE`、`all`、`yes/no`、`whetherWhiteList` 的 `y,{id}/n` 格式和全部 API 参数保持。未知任务状态原样展示，不猜测翻译。
- 后端模板/检查项/主机名称、操作系统、资产模型类型/字段标题、脚本路径/参数和原始输出保留。黑名单新增/删除仍传原始模板、主机、检查项及规则 ID；语言只改变本地提示。
- Excel 下载仍请求原 GET 地址和认证头，保存原始 blob；已有模板名称继续用于文件名，只有无模板名称时的前端默认名随语言展示。未实现的旧导出占位函数未启用。
- 数量使用完整命名参数消息和英文单复数分支；主机数量强调通过 `I18nT` 插槽保留。数字统计和展示分隔符使用当前语言，接口数值和日期格式不变。
- 仅为较长英文标题增大执行记录操作列、报告部分状态列的最小宽度。未运行截图级视觉验证，真实权限/接口和英文窄屏布局仍需后续集成验收。

## 验证

| 检查 | 结果 |
| --- | --- |
| 资源 | 中英文各 4569 个词条，本批各新增 138 个；原有巡检的 192 个词条和值保持 |
| 词库检查 | key、命名参数、编译语法、重复键及 7350 个源码字面量 helper 引用通过；数量插槽由组件用例覆盖 |
| 新增测试 | 两个文件、13 项用例，覆盖列表草稿/分页/排序、摘要响应性、KPI 标题、原始导出、八个详情组件的筛选/选择/复数、原始黑名单参数和导出字段草稿 |
| 定向回归 | 巡检、语言服务和共享设备选择器共 28 个文件、269 项测试通过，退出码 0，无失败或跳过 |
| 扩大回归 | 188 个文件、1871 项测试通过，退出码 0，无失败或跳过；与定向报告按文件合并，重复执行不累加 |
| 静态检查 | 15 个脚本/测试，10 个 Vue 脚本/模板可编译；相对起点 5 条既有 ESLint 错误无新增 |
| 协议检查 | 13 个生产文件的 28 处 API/HTTP 调用及全部实参相对 `7441934c` 做 AST 比对，无差异，包含原生 `fetch` 导出 |
| 源码检查 | 227 处翻译调用参数、44 处本地导入通过；新增词条无未引用项，可见中文残留和翻译进入协议身份值的检查无异常 |

扩大回归仍明确排除两个已在历史基线复现的失败文件：`tests/core/auth/auth.test.js` 和 `tests/core/api/api.test.js`。本批不修改对应实现或测试，不将选定范围通过表述为全项目所有测试通过。未运行生产构建或截图级视觉确认。

## 独立审查和下一批

- `.cache/i18n-inspection-results-graph.json`、`.cache/i18n-inspection-results-start/`：入口、依赖清单和改造前快照。
- `.cache/i18n-inspection-results-review.patch`、`-files.json`、`-status.json`：仅本批差异、最终文件哈希及范围摘要。
- `.cache/i18n-windows-inspection-results-final.json`：定向回归报告；相应 `.log` 保留原始输出。
- `.cache/i18n-windows-inspection-results-expanded.json`、`.cache/i18n-inspection-results-validation-summary.json`：扩大回归及最终文件/资源保护核对摘要。
- `.cache/i18n-inspection-results-static-results.json`、`-api-audit.json`、`-local-params.json` 等：静态、协议及引用审查结果。

下一批从 `/cac/structural-diagram/:jobId` 展开业务拓扑的实际图节点、KPI、详情及保存/导出链。共享详情组件的本批翻译会同步改善拓扑调用处，但拓扑页面主体尚未迁移，不计入完成。之后继续平台/设置及已注册非菜单功能。
