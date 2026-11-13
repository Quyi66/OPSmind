# 资产与 AI 中英文改造审查说明

本轮在 `feature/frontend-i18n` 上继续实施，最近一次提交为 `0e8b8d43`。本轮代码留在工作区，供独立审查；此前未提交的首页、个人资料和关于页面批次继续保留。

交付语言为简体中文和英文。繁体中文保持未启用的扩展预留，不补齐本轮资源。后端直接返回的中文、业务名称、日志和第三方聊天正文不翻译。

## 从实际入口确定范围

资产入口以 `src/modules/asset/routes.js` 的 `ACM_ROUTE_DEFS` 为准，包含菜单隐藏但生产路由仍存在的访问控制。系统健康度虽然位于补丁目录，仍按资产入口纳入。

| 路由或入口 | 本轮迁移的实际调用链 |
| --- | --- |
| `/acm/overview` | `AssetOverviewPage`、`useAssetOverviewWorkbench`、`useAssetWorkbenchDrawers`、`OsVersionDialog`，以及实际复用的录入、导入、资产编辑、分组和标签弹窗 |
| `/acm/info` | `AssetInfoPage` → `AssetDetailDialog`、`AssetEditDialog`、`AssetHistoryDialog`、`AutoEntryDialog`、`ImportAssetDialog`、`DeleteAssetImportDialog`、`BatchEditDialog`、`AddTagDialog`、`AddGroupDialog` |
| `/acm/exception` | `ExceptionDevicePage` → `KpiCards`；复用前批已迁移的设备选择与执行结果组件 |
| `/acm/data` | `DataManagePage` → `DataAddGroupDialog`、`DataAddTagDialog`、`DataEditGroupDialog`、`DataEditTagDialog`、`GroupAssetDialog`、`TagAssetDialog` |
| `/acm/automation` | `AutomationConfigPage` → `DeviceManageDialog`，包含设备凭据、连接模板及密码/SSH 公钥纳管两个实际 Tab |
| `/acm/model` | `AssetModelPage` → `ModelFormDialog`、`ImportModelDialog` |
| `/acm/log` | `OperationLogPage`，包括前端已知操作/状态、查询反馈、运行结果标题和定位入口 |
| `/acm/permission` | `ResourcePermissionPage`，包括权限摘要、未保存提示、排序和显式搜索 |
| `/acm/hostHealthCheck` | `patches/views/HostHealthCheckPage` → `HostHealthSummaryBar`、`HostHealthDetailDrawer`、`HostHealthScoringRulesDialog`，及健康常量、格式化工具和轮询 composable |
| `/admin/assets/auto-config` | `views/admin/AutoConfig` 的连接凭据、批量文件上传、进度与结果外壳 |
| `/aiops`、顶栏 AI 面板 | `AiOpsAssistantPage`、`utils/ai-ops-panel.js` 的本地状态、无障碍名称、标题和语言标记 |
| 独立 AI 页面 | `public/aiops-full.html`、`aiops-bubble.html`、`aiops-embed-init.js` 的页面标题、加载与错误提示 |

没有因为文件位于同一目录而迁移以下入口：暂停的 Agent 接入流程、未被上述页面引用的旧资产侧栏和图表、`ModelEditor.vue` 及其高级模型编辑链、`AddAssetToGroupDialog.vue`。后续如果重新启用，需要单独追踪实际入口。

## 需要重点审查的行为

### 语言切换与业务状态

- 查询值、状态码、资产类型 code、权限 `r/w/x`、原有作业 ID、接口地址和请求结构保持。
- 设备清单保留跨页/跨筛选选择、排除项、复核抽屉、分页和分组草稿。根分组只在树节点显示时翻译，保留原始 `/` 路径和树数据。
- 资产模型、分组、标签及录入表单使用响应式规则。新增 `useLocalizedValidation` 只重新验证已经显示错误的字段，不清空草稿、不验证尚未操作的字段。
- 本地长生命周期错误保存消息 key 与参数；原始后端错误仍是原字符串。已经加载的工作台抽屉通过 getter 更新标题、状态与缺省提示，不重新取数。
- 访问控制保存权限草稿、未知权限码与附加元数据。已应用搜索和类型排序记录应用时语言，避免切换语言后原筛选结果消失或列表重新排列；再次搜索/排序使用当前语言。
- KPI、操作系统分布和历史图表在原实例上更新显示文字，保留原数字、查询条件、后台分类名称及历史属性名。
- 为英文较长的筛选选项和表单标签调整局部宽度；中文仍使用原宽度。

### 健康评分规则与后台数据

`HEALTH_SCORING_RULES.name` 继续保存原中文匹配键，用于匹配后端检查项名称。新增显示用 `label` getter，规则弹窗显示该字段；阈值、扣分、严重度排序及 `SCORING_RULE_MAP` 的原键保持。后端检查项名称、检查值、风险描述和运行消息原样展示。

资产表格中的 `prop="业务系统"`、`prop="系统名称"`、`prop="负责人"`、`prop="系统模块"` 等仍指向原字段；只翻译表头。录入与导入保留 IP 文本转换、租户头、运行 ID、文件内容和工作流参数。下载模板的前端文件名随语言变化，Excel 内部表头和后台模板不改。

批量删除结果外壳翻译后继续对后端 IP 和错误详情做 HTML 转义。导出等已有未实现功能仍保留原状态，不因翻译而补做业务功能。

### AI 独立页与共享轮询

- 独立 HTML 无法使用 Vue 插件，新增 `scripts/ai-i18n-runtime.mjs`，从统一语言注册表和中英文 `ai.json` 生成 `public/aiops-i18n.js`。执行 `npm run i18n:sync-ai` 同步，`i18n:check` 会检查生成物是否过期。
- 独立页沿用本地偏好、浏览器语言及同源 storage 事件。切换仅更新本地标题、语言标记和状态，不重新注入 Dify 脚本或覆盖聊天配置。
- 顶栏面板保留原 iframe、会话、自定义标题、拖动位置和尺寸。第三方聊天内容及其自身语言策略不属于此次本地外壳迁移。
- 独立页初始化脚本中的中文作为语言运行时脚本不可用时的兜底保留，正常路径使用当前语言词条。
- `useJobPolling` 的提示选项兼容原字符串，并可传入函数。资产调用点传函数，在任务结束时才读取当前语言；轮询间隔、运行 ID、取消和回调协议保持。

## 资源与检查

- 新增中英文 `admin`、`asset` 命名空间；系统健康度置于 `asset.health`。其余共享提示补入 `common`、`ai` 和 `execution`。
- 文案相近但原中文不同的场景分别保留 key，例如执行节点与执行节点 Instance Group、负责人和责任人，避免后续词条覆盖改变其他页面原文。
- `i18n:check` 保留重复 JSON 键、语言 key、参数及消息语法检查，并增加源码中显式导入的 `t` / `message` 字面量 key 检查。该静态检查用于发现缺词，不用于决定页面改造范围；动态 key、历史翻译兼容函数和后台原文不作猜测检查。
- 新增定向测试覆盖中英文往返、真实表单校验、真实规则表格、原 ECharts 实例、跨页选择、权限草稿、文件上传、原始请求参数和 HTML 转义。执行结果、主机用户、旧词库、导航和其他受共享状态工具影响的组件也纳入回归。
- 首页测试在模块级替换 `vue-echarts`，避免 JSDOM 意外创建真实 Canvas。测试继续核对真实页面产生的图表选项与跳转参数；没有修改生产图表配置。
- 本轮没有运行生产构建、浏览器截图或截图级视觉验收。最终测试数量、静态检查结果见 [实施进度](./frontend-i18n-progress-20261112.md)。

## 与上一批工作区修改的关系

本轮开始前保存了工作区文件快照 `.cache/i18n-p2-start/`。与上一批有重叠的文件是中英文 `common.json`、语言索引、`ai.json`、`tests/views/HomeI18n.test.js` 和进度文档；它们分别增加共享提示/命名空间、AI 外壳词条、测试 Canvas 隔离和本轮记录。

本地 `.cache/i18n-asset-ai-review.patch` 只包含相对本轮开始状态的差异，可直接用于单独审查；配套 `i18n-asset-ai-review-files.json` 记录文件清单和内容哈希。补丁经过反向 `git apply --check` 检查，仅校验，不回滚工作区。

上一批首页、个人资料、关于页面的生产组件及其业务资源未继续修改。本轮没有自动提交或切换分支。快照和本地检查日志在忽略目录中，不作为产品文件提交。

## 后续实施入口

下一批按 `src/modules/automation/routes.js` 进入自动化：先处理 `/auto-workbench/overview` 的真实卡片、抽屉和运行入口，再展开工具列表/编排/定时任务/申请审批、脚本库的 `git/staticfs/stage` 三种模式，以及命令 Tab 和运行记录。

`/jao/runLogs`、`/jao/statistics` 的跳转指向统一运行记录页面，应沿真实重定向落点处理；脚本三个模式复用同一 `ScriptFileListPage`，应同时验证模式差异。设备选择、已迁移执行结果及日志查看器继续复用，不按目录重复翻译。自动化完成后再进入补丁/Yum、巡检、平台设置及已注册非菜单功能，最后执行全量入口验收。
