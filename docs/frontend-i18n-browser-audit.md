# 真实页面中英文批量巡检

目标：独立启动本机 Chrome，访问正在运行的开发服务，采集真实接口数据下的页面截图和 DOM 排版疑点。不依赖桌面控制工具、9222 调试端口，也不启动新的 Vite 服务或执行生产构建。

## 首次准备

在项目根目录运行：

```powershell
& 'C:\nvm4w\nodejs\node.exe' scripts/i18n-browser-audit.mjs --prepare
```

脚本打开专用 Chrome 窗口。若出现 localhost HTTPS 证书提示，需要用户自行确认开发服务身份并处理证书；然后在该窗口手动登录。脚本不填入账号密码，不读取其他浏览器的个人配置，不自动跳过证书校验。等待登录最长 15 分钟，成功后在同一会话中自动采集系统健康度页的简体中文、英文，以及 1440 / 1920 两种窗口宽度。

专用浏览器资料保存在 `.cache/i18n-browser-audit/chrome-profile/`。该目录被 Git 忽略，会包含登录会话，应保留在本机。不要上传整个缓存目录。采集结束会关闭脚本创建的 Chrome，保留专用资料；不会关闭日常使用的浏览器。

Vite 的 `server.watch.ignored` 显式排除 `.cache` 目录（兼容 Windows 和 POSIX 路径）。仅加入 `.gitignore` 不会自动排除 Vite 的文件监听；否则 Windows 上 Chrome 锁定的 `Default/Sessions/Session_*` 文件可能导致开发服务报 `EBUSY` 并退出。若开发服务已因此退出，应用配置后重新运行 `npm run dev` 即可，无需删除浏览器资料或重新建立专用会话。

## 批量巡检

```powershell
# 已有可用会话和受信任证书时，在后台采集全部实际菜单页面
& 'C:\nvm4w\nodejs\node.exe' scripts/i18n-browser-audit.mjs --all

# 同时检查已审查为只读的内部标签页，以及宽表格横向隐藏列
& 'C:\nvm4w\nodejs\node.exe' scripts/i18n-browser-audit.mjs --all --tabs --tables

# 需要手动准备登录或处理证书时，先打开窗口，再自动执行全部菜单采集
& 'C:\nvm4w\nodejs\node.exe' scripts/i18n-browser-audit.mjs --prepare --all

# 只复查指定菜单页面
& 'C:\nvm4w\nodejs\node.exe' scripts/i18n-browser-audit.mjs --routes /jao/jobs,/acm/info,/patches/windowsKbList,/patches/changeRollback --widths 1440,1920,2160
```

菜单清单直接使用当前开发页面中的 `getHomeMenu()`、`getMenuGroups()` 和 `getGroupMenuConfig()`，沿用权限过滤。包含实际首页入口与菜单叶子路径，排除隐藏、禁用、动态参数路径；不扫描所有注册路由，不补入未调用的非菜单功能。指定页面也必须属于当前用户的实际菜单。

`--tabs` 只切换已核查为读取操作的标签页：设备清单的资产类型、分组与标签、设备凭据与共享连接模板、系统参数与应用参数。跳过禁用标签，结束后恢复原标签；不自动点击其他页面的标签或业务按钮。

`--tables` 对已显示的 Element Plus 宽表格逐屏横向滚动，补充屏幕外字段的截图与几何检查，最后恢复原滚动位置。滚动步长扣除两侧固定列占用的宽度，避免相邻截图之间留下被固定列遮挡的字段。与 `--tabs` 一起使用时，也检查上述内部标签页的宽表格。表格滚动不更改勾选、筛选、分页或后台数据。

语言切换使用页面现有控件，导航使用页面现有路由。脚本只执行查看和语言切换，不点击执行、扫描、安装、删除等业务按钮，不替换接口、不伪造数据。查看页面仍会触发该页面自身的数据请求。完成后尽量恢复专用会话原来的语言与路由。

## 输出与判读

二级界面使用单独的已审查场景清单，复用同一专用浏览器资料：

```powershell
# 只查看场景 ID 与实际菜单父入口，不启动浏览器
& 'C:\nvm4w\nodejs\node.exe' scripts/i18n-browser-audit-secondary.mjs --list

# 执行当前 12 个已审查场景，默认中英文及 1440 / 1920 两种宽度
& 'C:\nvm4w\nodejs\node.exe' scripts/i18n-browser-audit-secondary.mjs

# 定向复查；不接受任意路由或未审查场景 ID
& 'C:\nvm4w\nodejs\node.exe' scripts/i18n-browser-audit-secondary.mjs --cases create-script,cron-new,linux-install-drawer --locales en-US --widths 1440
```

场景包括工具新建/编辑、文件/命令/设备选择、历史及执行参数表单、定时任务和 CRON 生成器、申请/审批详情、Linux 补丁选择及 Windows 安装向导配置。父入口还需属于当前账号的实际菜单。会执行源码已核对的本地草稿操作，例如展开预定义目标、选择一条补丁、空字段失焦和向导 Next；不点击保存、确认回填、执行、审批、预检查或开始安装。Windows 的 Next 只切换本地步骤，Linux 只检查向导选择阶段。

输出目录为 `.cache/i18n-secondary-audit/<时间>/`，含截图、`report.json` 和 `index.html`；`summary.json` 记录计划数、完成数和失败数。未完成全部计划时，HTML 会标记采集中或中止。长表单按实际内部滚动容器补查，表格纵向仍只覆盖可见行。菜单巡检和二级巡检需顺序运行，避免同时占用同一 Chrome 资料。会话需要重新准备时，使用前文主脚本的 `--prepare`。

本轮各调用链与未覆盖状态见[二级界面复核清单](./frontend-i18n-secondary-layout-review-20261117.md)。本轮还增加了表单标签纵向越界检查，避免标签换行后挤入下一行或标签页区域。

每轮输出到 `.cache/i18n-browser-audit/<时间>/`：

- `index.html`：采集清单、状态、疑点数量、截图链接。
- `report.json`：菜单来源、语言、窗口尺寸、几何信息和排版疑点。
- `*.png`：真实页面截图，可能包含业务数据，仅保存在本地。

疑点包括：文档横向溢出、文字裁切、文字超出按钮或标签、控件被表格单元格裁切、顶部操作区重叠、英文表头单词被拆行、搜索占位提示不完整、多选标签超出输入框、当前页签不可见。占位提示采用实际字体测量，不读取输入框值。明确的省略号及 CSS 行数截断记作 `ellipsis-review`，只提示复核，不认定为缺陷；复合卡片按叶子文案检查，避免把装饰背景裁切误报为文字裁切。采集失败、加载未结束会分别标记，不计作验收通过。已有截图后发生的后续采集异常也会保留错误并返回失败，不以已有图片掩盖不完整结果。

一级页面回归另记录完整单词/排序图标换行（`header-wrap-review`）、操作按钮分行（`action-wrap-review`）、操作列相对按钮内容留白偏多（`action-width-review`）和英文 AM/PM 日期分行（`date-wrap-review`）。这些是人工复核候选，不能机械地扩大所有列宽：按钮少时应收紧列宽，按钮多时可整理到 More 菜单。`tableReview` 保留采样按钮及其几何宽度；空行没有操作时不据此推断列宽。`untranslatedTags` 包含滚动区域外的中文标签，需区分已知历史静态标题与允许保留的自定义标题。

`dataState` 记录数据行数、可见空表和错误提示。采集同时记录同源 HTTP 失败状态、请求失败原因和不含查询参数的路径，不读取请求体或认证信息。发现请求失败或错误提示时标记为 `captured-with-errors`，影响退出码；加载失败后的空表不能用来验收正常数据行的布局。合法空表仍可以采集，但其按钮、长数据和行内布局应列为未验证。

截图使用整页截图，页面内独立纵向滚动的表格/容器仍只覆盖当前可见部分。内部标签和横向滚动需显式启用上述选项；默认不自动打开弹窗或进入带数据参数的详情页。报告同时列出菜单首屏、内部标签及横向滚动截图，嵌套采集失败会影响进程退出码。暂不采集控制台日志、接口请求体、输入框值或认证存储。零疑点也不代表视觉验收通过，修复仍应结合截图人工判断。

中英文截图使用同一专用会话和窗口尺寸。英文修复保持语言作用域，中文截图用于回归对照；真实接口数据可能随时间变化，因此不能把不同时间的像素差异直接判定为样式回归。

采集期间保持应用代码稳定。修改已加载模块可能触发 Vite 热更新或整页刷新，正在执行的页面读取会失去执行上下文；此类中断保留为失败报告，待代码稳定后重新采集。若登录会话失效，脚本会停止并要求重新使用 `--prepare`，不会自动填写认证信息。

工具回归可直接运行 `node --test scripts/i18n-browser-audit.test.mjs`，使用独立的无登录 Chrome 实例验证菜单过滤、几何判定、只读标签白名单、固定列表格覆盖、滚动恢复及失败报告；不访问业务系统。

实现参考：[Playwright 独立持久化会话](https://playwright.dev/docs/api/class-browsertype#browser-type-launch-persistent-context)、[截图 API](https://playwright.dev/docs/screenshots)。
