# 英文文案审查修复

本批按当时要求暂停后续页面巡检，仅处理同事提出的翻译审查中已确认的问题。随后完成[截图问题定向修复及复查](./frontend-i18n-screenshot-layout-review-20261117.md)；`feature/frontend-i18n` 的本批增量现已纳入[新会话交接](./frontend-i18n-handoff-20261117.md)所在提交。

## 修改范围

| 审查项 | 最终处理 |
| --- | --- |
| 2：Cron 空词条及拼接 | `schedule.runOnce` 恢复为 Run once。英文循环行改用七种字段各自的完整消息，支持 start/step 组件插值及 1/2 单复数；中文继续原有渲染分支，Quartz 值和事件保持 |
| 3：首页本月巡检指标 | This month → Inspections this month，恢复统计主体 |
| 4：异常设备统计单位 | failed inspections → failed device / failed devices，按实际数量选择单复数，明确统计对象是设备；所在指标标题已说明 Connectivity inspection |
| 5：基准仓库作业标题 | Set baseline repository hosts / Remove baseline repository hosts，与实际设置 hosts、删除基准主机配置的接口对象一致；不翻译成删除仓库或扫描任务 |
| 8：AI 气泡模式标题 | Panel → Bubble，同时更新生成的独立 HTML 语言运行时 |
| 10：Windows 重扫确认 | CONFIRM RESCAN → Confirm rescan；确认说明改为完整的 `Enter "{keyword}" to confirm`，保留高亮 span。中文完整消息对应原先的“请输入 {keyword} 进行确认”，既有中文词条不改 |

Windows 确认仍精确匹配，不改成忽略大小写。新默认说明显示 Confirm rescan，同一表单内语言切换前展示过的中英文确认词继续由既有机制保留；调用方显式指定的确认词（包括全大写形式）保持原样。语言切换不触发任务或清空部分输入、已确认状态。

## 保留现状的审查项

- 1：导入模板契约明确存在“端口”列，code 为 `ANSIBLE_PORT`，保留对实际列名的说明。英文弯引号本身不是中文残留。
- 6：错误提示沿用实际页面的 Device credentials / Shared connection templates 概念，没有改成更泛的配置名称。
- 7：`pendingConfirmation` 当前用于未知统计数量，未按工作流审批语义替换。
- 9：SQL 输入框下方已常驻显示服务器允许目录及路径提示，中英文都保留，不重复加长占位符。
- 11：等级仍按实际数据字段和上下文映射，不把不同等级体系按中文字面统一替换；Linux 漏洞列表目前也使用 Critical / Important / Moderate / Low 筛选。

## 验证及中文保护

- 6 个定向测试文件，119 项通过。新增覆盖 Cron 七种字段的单复数、语言往返后 Quartz 表达式和事件不变，以及 Windows 完整确认句、精确匹配、已确认状态及显式自定义确认词。
- AI 独立运行时与生成器一致，气泡标题中英文切换测试通过；保持原脚本注入及配置行为。
- 既有 5005 条中文消息逐条与 HEAD 比较均不变；只补充 7 条循环完整消息及 1 条确认完整消息，启用的两种语言现各 5013 条。8026 处字面量引用、参数和消息语法检查通过。
- Cron、Windows 重启组件及资产总览的默认及中文 CSS 与基线一致；原来已有的英文拆词修复保留。中文 Cron 继续原分支，中文确认句文本由组件测试核对；资产单位只增加数量参数，中文仍显示原词条。
- 对首页和资产总览的新英文文案定向读取 1440 / 1920 宽度的真实 DOM，共 4 个状态，文案均位于卡片内且无自身文字裁切。没有新增截图，也没有恢复全量页面巡检。
- 定向静态检查、Vue 解析/模板编译及 `git diff --check` 完成；未运行生产构建。

本批只改展示资源和本地确认/周期描述，不修改后台字段、等级值、接口参数及执行动作。文中 5013 条为本批结束时的数量；后续检查范围及最新数量以截图复查记录为准。
