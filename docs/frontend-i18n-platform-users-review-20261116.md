# 平台用户、团队与补丁分配国际化审查说明

本批依据 `settings/routes.js` 中三个实际 UAM 路由及嵌套容器展开，继续交付简体中文和英文。开始时 HEAD 为 `7441934c9fb3bee1a34ef4c3ac872f9db2f9b216`，工作区已有执行记录/报告和拓扑两批共 22 个文件；本批单独保存增量，三批均未暂存、未提交、未推送。后端中文、用户输入和协议身份不翻译，繁体保持未启用的扩展预留。

## 实际入口和改动范围

| 入口与调用链 | 改造内容 |
| --- | --- |
| `/uam/user` → `UamUserPage.vue` | 筛选、状态、认证方式、用户操作、确认与反馈、日期展示 |
| 用户页 → `UserEditDialog.vue` | 用户详情/编辑/创建、字段和校验、角色/应用、OTP 本地提示、创建后应用保存失败与重试反馈 |
| 用户页 → `AllocateRoleDialog.vue` | 搜索、仅看变更、差异摘要和数量、复选框可访问名称、保存反馈 |
| `/uam/team` → `UamTeamPage.vue`、`TeamEditDialog.vue` | 团队筛选/读取失败、编辑与成员选择、校验、删除确认、日期和持续错误 |
| `/uam/patch-assignment` → `UamPatchAssignmentPage.vue` | 用户筛选、清理过期分配、缺失登录名提示及分配/记录入口 |
| 补丁分配页 → `user/components/dialogs/AssignPatchDialog.vue` | 补丁和主机配置、严重程度标签、已有分配保护、草稿/复用预览、数量及提交反馈 |
| 补丁分配页 → `user/components/dialogs/PatchRecordsDialog.vue` | 原用户的分配记录、有效期、单条/批量/全部撤销确认和反馈 |

共核对 11 个调用链文件，修改其中 8 个 Vue。`SystemSettingsModule.vue` 仅承载 `router-view`、没有本地文案，保持原样；`settings/api/index.js` 和 `settings/api/team.js` 保持。`LinkTenantUserDialog.vue`、`TemplateAssignment.vue` 等未被上述入口引用，不按目录整体迁移；未启用按钮和注释分支不恢复。

另新增中英文 `settings.json` 并在两份语言入口显式注册，新增两个测试文件、一份审查文档，更新共享进度，共 16 个增量文件。工作区累计 37 个文件；前两批 22 个文件中 21 个保持字节一致，仅进度文档更新当前状态并保留历史验证，两份巡检词库也保持原样。

## 展示与协议边界

- `settings` 命名空间保存平台业务文案，通用动作沿用 `common`。完整数量消息使用 `{count}` 等命名参数及英文单复数分支，启用/禁用反馈分别使用完整消息。
- 用户和团队表单使用响应式规则及 `useLocalizedValidation`，关闭规则变化自动校验；切换语言只更新已显示错误，不清空草稿或新增未触发的错误。密码复杂度、长度、账号正则和校验逻辑保持。
- 用户已创建后的部分失败提示保留消息 key，后续语言变化可更新；再次保存仍仅重试原租户用户的应用，不重复创建账号。身份不唯一时的保存保护保持。
- 应用标题仅对既有七个 `#{...}` 别名在展示时翻译，原应用 `title/name/id/_user_applet` 保持；自定义应用和未识别标题保持原回退。后台角色名称、部门、团队描述和成员显示名保持原文。
- `activated/disabled` 筛选值、账号启用布尔值、`LOCAL/AD/UN/MIX` 认证值、角色名和 ID、租户用户身份、应用 ID 以及 OTP/API Key 数据保持。角色差异摘要随语言展示，实际更新仍传原角色对象。
- 团队读取错误、成员读取错误、用户部分保存提示和已有补丁分配读取错误保存消息 key；补丁复用预览的本地错误通过 getter 翻译，不替换预览行或重算机器匹配。
- 补丁筛选、已应用/未应用输入、分页、用户/角色/成员/应用选择、补丁/主机草稿和复用目标保持。缺少显示地址时的主机搜索捕获输入时的语言，切换语言保留命中，后续新输入按当前语言搜索；显示标签仍随当前语言变化。
- `Critical/Important/Moderate/Low`、补丁 ID、主机真实 ID、分配/撤销记录 ID、有效期、备注、复用规则和 API 地址/参数保持。已有分配保护、缺失机器身份保护及重复补丁保护保持；后端错误正文原样展示。
- 原有使用 `toLocaleString` 的展示随当前语言更新，不改变业务时区、提交时间字符串或记录页既有数值日期格式。仅为英文增加部分表单标签和操作列宽度，未运行截图级验证。

## 验证结果

| 检查 | 结果 |
| --- | --- |
| 资源 | 中英文各 4827 个词条，新增 `settings` 各 206 个；key、命名参数、编译语法、重复键及 7738 个源码字面量 helper 引用检查通过 |
| 新增测试 | 两个文件、19 项用例，覆盖页面状态、真实表单、用户/应用部分保存、角色/团队原始参数、补丁草稿/复用/记录/后端原文及复数 |
| 定向回归 | 设置、巡检、语言服务和共用设备选择器 42 个文件、468 项用例通过；补充后端错误原文用例后，相应文件 9 项复测通过，按各文件最新报告合并为 42 个文件、469 项，无失败或跳过 |
| 静态检查 | 本批 12 个脚本/组件，其中 8 个 Vue 的脚本/模板可编译；9 条既有 ESLint 错误无新增回归 |
| 协议检查 | 8 个业务文件的 31 处 API/HTTP 调用及全部实参相对本批起点做 AST 比对，无差异 |
| 源码检查 | 305 处翻译调用参数、70 处本地导入检查通过；新增词条无未引用项，可见中文残留及翻译进入协议身份值检查无异常 |

本批未重复全项目测试，前两批扩大回归与既有认证/API 基线失败说明保留为历史记录；成功结果仅代表所述选定范围。未运行生产构建、浏览器截图或截图级视觉确认，实际接口/权限与英文布局仍待后续集成验收。

## 独立审查与下一批

- `.cache/i18n-platform-users-start/`、`-graph.json`：开始时的完整工作区快照、前两批文件清单及实际路由调用链。
- `.cache/i18n-platform-users-review.patch`、`-review-files.json`、`-review-status.json`：仅本批增量及最终文件哈希，基准为本批开始时工作区。
- `.cache/i18n-platform-users-cumulative-review.patch`、`-cumulative-review-files.json`、`-cumulative-review-status.json`：相对 HEAD 的三批累计差异及哈希。
- `.cache/i18n-windows-platform-users-final.json`、`.cache/i18n-windows-platform-users-final-patch.json`：跨模块回归及补充原文用例报告；按文件合并，不重复累计。
- `.cache/i18n-platform-users-static-results.json`、`-api-audit.json`、`-local-params.json`、`-validation-summary.json`：静态、协议、参数和前两批保护核对结果。

下一批从 `/ssc/param`、`/ssc/sql-import`、`/ssc/email`、`/ssc/engine`、`/ssc/scheduler` 的实际页面展开。SQL 正文、邮件正文等后端/用户数据保持原文；已退休的设置页面按重定向边界处理，不因文件仍存在而恢复。
