# 系统设置国际化审查说明

本批从 `settings/routes.js` 的五个实际 SSC 路由及嵌套容器展开，继续简体中文与英文。开始时 HEAD 为 `7441934c9fb3bee1a34ef4c3ac872f9db2f9b216`，工作区已有巡检执行记录/报告、拓扑和平台用户三批共 37 个文件；本批单独保存增量。四批均未暂存、未提交、未推送，繁体仍为未启用的扩展预留。

## 实际范围

| 路由与在用页面 | 改造内容 |
| --- | --- |
| `/ssc/param` → `SscParamPage.vue` | 系统/应用参数、筛选/分页、创建/编辑/查看、校验、配置说明及操作反馈 |
| `/ssc/sql-import` → `SscSqlImportPage.vue` | 服务器文件提示、执行选项、管理员权限提示、任务与失败结果、查询/轮询反馈及本地兜底 |
| `/ssc/email` → `SscEmailPage.vue` | 邮件表单/校验、保存确认、测试发送弹窗、读取和发送反馈 |
| `/ssc/engine` → `SscEnginePage.vue` | Ansible/AAP 选项、连接/集群/执行设置、保存确认及持续读取错误 |
| `/ssc/scheduler` → `SscTaskSchedulerPage.vue` | 计划任务列表、搜索、状态和操作文案，原 CRON 和分页行为保持 |

设置调用链共核对八个文件，修改五个 Vue；无本地文案的 `SystemSettingsModule.vue` 和参数/引擎 API 保持。SQL 另复用 `yum-repo/api.js`、`utils.js` 和 `constants.js`；前两者保持，字典中原本固定中文的四项 SQL 状态名改为 getter 并补齐 `yumRepo.sqlImportStatus.*`，没有把该共享工具改成依赖设置模块词条。

`SscTagPage.vue`、`SscAppletPage.vue`、`SscAppResPage.vue` 等已退休页面按现有重定向边界排除，不因目录中存在文件而恢复。计划任务原有编辑/删除为占位处理，本批只翻译既有界面，不新增操作逻辑。

本批共 14 个增量文件：五个 Vue、一个共享常量、四份词库、两个新增测试及两份文档。工作区累计 48 个文件；前三批 37 个文件中 34 个保持字节一致，仅共享设置词库追加和进度文档更新，旧审查文档与补丁不覆盖。

## 行为与数据边界

- 参数和邮件表单使用响应式规则及 `useLocalizedValidation`，关闭规则变化自动校验；切换语言更新已有错误，不清空草稿或为未触发字段新增错误。参数六种对话框标题使用完整消息。
- 参数域、名称、值、描述、`isEncrypt/view`、应用租户和 ID 保持原文/原值。筛选输入、已应用条件、当前页、查看/编辑模式及两份参数草稿保持，不以语言变化重查或切换 Tab。
- 邮件 `username/password/host/port/from`、`to/cc/bcc`、`yes/no` 及原始后端字段保持；语言切换保留草稿和测试收件人，不读取、保存或发送。后端 `msg` 按原逻辑原样展示。
- Ansible/AAP 的引擎值、原始参数 ID/域/名称、布尔值 JSON、连接配置、集群节点、选项 ID、后端项目/组织/凭据名称和嵌套配置保持。语言切换不再次连接 AAP，也不丢失密码或下拉选择。
- SQL 服务器文件名、白名单目录与扩展名、`async/continueOnError/dryRun`、原任务 ID、状态和管理员权限判断保持。SQL 片段、任务消息及错误正文不翻译；仅前端默认反馈和选项说明翻译。
- SQL 持续查询失败保存消息 key 与延迟参数：本地兜底和重试说明随语言更新，后端错误正文保持原文。切换语言不重复查询或重启计时，原轮询、失败重试和中断保护保持。
- SQL 的目录/扩展名说明使用完整消息及命名插槽，保留原 `<code>` 内容；四项共享状态只翻译展示名，`PENDING/RUNNING/SUCCESS/FAILED` 和判断函数不变。数字展示使用当前语言的 formatter，不改变接口数值或业务时间。
- 计划任务保留 `appCode: 'uim'`、`ENABLED` 等状态、原始 CRON、描述、类型和创建者；语言切换保留关键词草稿、列表身份与分页，不读取任务或新增未实现的操作。
- 仅增加参数表单和操作列、计划任务状态/操作列的宽度，为英文留出空间。实际接口、权限和英文布局仍需后续集成验收。

## 验证

| 检查 | 结果 |
| --- | --- |
| 词库 | 中英文各 4997 个词条，本批各增加 170 个（设置 166、Yum 4）；原有设置与 Yum 词条保持 |
| 资源检查 | key、命名参数、编译语法、JSON 重复键及 8008 个源码字面量 helper 引用通过；SQL 提示插槽另由组件用例覆盖 |
| 新增测试 | 两个文件、18 项用例，覆盖五页状态保持、真实校验、原始提交、后端正文、SQL 权限/四项状态/轮询及 CRON 列表 |
| 定向回归 | 设置、巡检、语言服务、共用设备选择器和受共享字典影响的 Yum/软件共 50 个文件、598 项用例通过，退出码 0；最后调整计划任务 Enabled/Disabled 文案后，对应文件 9 项复测通过，按各文件最新成功报告合并仍为 50 个文件、598 项，无失败或跳过 |
| 静态检查 | 8 个脚本/组件，5 个 Vue 的脚本与模板可编译；6 条既有 ESLint 错误无新增 |
| 协议检查 | 6 个生产文件的 26 处 API/HTTP 调用及全部实参相对本批起点做 AST 比对，无差异 |
| 源码检查 | 287 处翻译调用参数、18 处本地导入检查通过；新增设置词条无未引用项，四项 Yum 状态逐项覆盖；可见中文残留及翻译进入协议身份值检查无异常 |

本批未重复全项目测试，不将历史扩大回归结果表述为本批重跑；此前认证/API 两个已知基线失败的说明保持。未运行生产构建、浏览器截图或截图级视觉确认。

## 独立审查与后续

- `.cache/i18n-system-settings-start/`、`-graph.json`：开始时工作区、前三批文件清单、实际路由及共享文件快照。
- `.cache/i18n-system-settings-review.patch`、`-review-files.json`、`-review-status.json`：本批增量、最终文件哈希和范围摘要。
- `.cache/i18n-system-settings-cumulative-review.patch`、`-cumulative-review-files.json`、`-cumulative-review-status.json`：相对 HEAD 的四批累计差异及哈希。
- `.cache/i18n-windows-system-settings-final.json`、`.cache/i18n-windows-system-settings-final-sql.json`：跨模块回归及最后状态文案复测报告，按文件合并不重复累计，`.log` 保存原始输出。
- `.cache/i18n-system-settings-static-results.json`、`-api-audit.json`、`-local-params.json`、`-validation-summary.json`：静态、协议、参数和原有工作区保护结果。

平台/设置的在用页面现已完成国际化代码迁移。按 2026-11-16 最新范围要求，下一步先核对在用入口遗漏，再进行集成验收；流程中心、sudo、密码管理等不能仅因路由已注册而自动迁移。确认无菜单、系统内无调用的功能暂缓，有实际调用的页面/组件仍按调用链补齐。在用范围的集成验收尚未完成。
