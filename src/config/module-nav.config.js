/**
 * 模块页面导航配置
 * 定义每个模块内部的页面导航项
 */

// 自动化管理 - 作业模块的页面导航
export const JAO_NAV_ITEMS = [
  { key: 'jobs', label: '作业列表', icon: 'fas fa-list-alt', path: '/jao/jobs' },
  { key: 'schedule', label: '流程编排', icon: 'fas fa-network-wired', path: '/jao/schedule' },
  { key: 'requests', label: '我的申请', icon: 'fas fa-inbox', path: '/jao/requests' },
  { key: 'approvals', label: '作业审批', icon: 'fas fa-user-check', path: '/jao/approvals' },
  { key: 'runLogs', label: '运行记录', icon: 'fas fa-history', path: '/jao/runLogs' },
  { key: 'statistics', label: '数据统计', icon: 'fas fa-chart-line', path: '/jao/statistics' },
  { key: 'taskScheduler', label: '定时任务', icon: 'fas fa-clock', path: '/jao/taskScheduler' }
]

// 自动化管理 - 脚本模块的页面导航
export const GFS_NAV_ITEMS = [
  { key: 'scriptLibrary', label: '脚本库', icon: 'fas fa-code-branch', path: '/gfs/scriptLibrary' },
  { key: 'fileLibrary', label: '文件库', icon: 'fas fa-archive', path: '/gfs/fileLibrary' },
  {
    key: 'scriptReview',
    label: '脚本审核',
    icon: 'fas fa-clipboard-check',
    path: '/gfs/scriptReview'
  }
]

// 自动化管理 - 命令模块的页面导航
export const CMD_NAV_ITEMS = [
  { key: 'list', label: '命令列表', icon: 'fas fa-list', path: '/cmd/list' },
  { key: 'job', label: '命令作业', icon: 'fas fa-tasks', path: '/cmd/job' },
  { key: 'review', label: '命令审核', icon: 'fas fa-clipboard-check', path: '/cmd/review' },
  { key: 'logs', label: '执行日志', icon: 'fas fa-file-alt', path: '/cmd/logs' },
  { key: 'console', label: '控制台', icon: 'fas fa-terminal', path: '/cmd/console' }
]

// 补丁漏洞 - 补丁模块的页面导航
// platform: 'linux' - 仅Linux设备显示, 'windows' - 仅Windows设备显示, 'common' - 所有设备显示
export const PATCHES_NAV_ITEMS = [
  {
    key: 'cveList',
    label: 'CVE漏洞列表',
    icon: 'fas fa-bug',
    path: '/patches/cveList',
    platform: 'common'
  },
  {
    key: 'machineScan',
    label: '机器扫描',
    icon: 'fas fa-search',
    path: '/patches/machineScan',
    platform: 'linux'
  },
  {
    key: 'patchInstall',
    label: '补丁安装',
    icon: 'fas fa-download',
    path: '/patches/patchInstall',
    platform: 'linux'
  },
  {
    key: 'changeRollback',
    label: '变更回滚',
    icon: 'fas fa-undo',
    path: '/patches/changeRollback',
    platform: 'linux'
  },
  {
    key: 'patchLibrary',
    label: '补丁仓库',
    icon: 'fas fa-database',
    path: '/patches/patchLibrary',
    platform: 'linux'
  },
  {
    key: 'vulnerability',
    label: '漏洞概览',
    icon: 'fas fa-shield-alt',
    path: '/patches/vulnerability',
    platform: 'linux'
  },
  {
    key: 'windowsVulnerability',
    label: '漏洞扫描',
    icon: 'fas fa-search',
    path: '/patches/windowsVulnerability',
    platform: 'windows'
  },
  {
    key: 'windowsUpdate',
    label: '补丁安装',
    icon: 'fas fa-download',
    path: '/patches/windowsUpdate',
    platform: 'windows'
  },
  {
    key: 'windowsRollback',
    label: '变更回滚',
    icon: 'fas fa-history',
    path: '/patches/windowsRollback',
    platform: 'windows'
  },
  {
    key: 'windowsView',
    label: '漏洞统计',
    icon: 'fas fa-chart-bar',
    path: '/patches/windowsView',
    platform: 'windows'
  },
  {
    key: 'logs',
    label: '变更日志查询',
    icon: 'fas fa-file-alt',
    path: '/patches/logs',
    platform: 'common'
  }
]

// 补丁漏洞 - 软件模块的页面导航
export const SOFTWARE_NAV_ITEMS = [
  { key: 'packages', label: '软件概览', icon: 'fas fa-cube', path: '/software/packages' },
  { key: 'repos', label: '仓库管理', icon: 'fas fa-database', path: '/software/repos' },
  {
    key: 'localInstall',
    label: '本地安装',
    icon: 'fas fa-map-marker',
    path: '/software/localInstall'
  },
  { key: 'yumManage', label: '软件源管理', icon: 'fas fa-cogs', path: '/software/yumManage' },
  { key: 'logs', label: '操作日志', icon: 'fa fa-history', path: '/software/logs' }
]

// 系统巡检 - 巡检模块的页面导航
export const CAC_NAV_ITEMS = [
  { key: 'overview', label: '巡检总览', icon: 'fad fa-fw fa-th-large', path: '/cac/overview' },
  { key: 'templates', label: '巡检模板', icon: 'fad fa-fw fa-list-alt', path: '/cac/templates' },
  { key: 'results', label: '执行记录', icon: 'fad fa-fw fa-history', path: '/cac/results' },
  { key: 'config', label: '导出配置', icon: 'fad fa-fw fa-cog', path: '/cac/config' },
  { key: 'email', label: '邮件配置', icon: 'fad fa-fw fa-envelope', path: '/cac/email' }
]

// 资产管理 - 资产模块的页面导航
export const ACM_NAV_ITEMS = [
  { key: 'overview', label: '资产总览', icon: 'fad fa-fw fa-chart-pie', path: '/acm/overview' },
  { key: 'info', label: '资产列表', icon: 'fad fa-fw fa-server', path: '/acm/info' },
  { key: 'data', label: '数据管理', icon: 'fad fa-fw fa-database', path: '/acm/data' },
  { key: 'model', label: '资产模型', icon: 'fad fa-fw fa-project-diagram', path: '/acm/model' },
  {
    key: 'exception',
    label: '异常设备',
    icon: 'fad fa-fw fa-exclamation-triangle',
    path: '/acm/exception'
  },
  { key: 'automation', label: '自动化配置', icon: 'fad fa-fw fa-cogs', path: '/acm/automation' },
  { key: 'permission', label: '资源权限', icon: 'fad fa-fw fa-user-lock', path: '/acm/permission' },
  { key: 'log', label: '操作日志', icon: 'fad fa-fw fa-history', path: '/acm/log' }
]

// 用户管理模块的页面导航
export const USERS_NAV_ITEMS = [
  { key: 'overview', label: '用户总览', icon: 'fas fa-tachometer-alt', path: '/users/overview' },
  { key: 'users', label: '用户列表', icon: 'fas fa-user', path: '/users/users' },
  { key: 'groups', label: '用户组', icon: 'fas fa-users', path: '/users/groups' },
  { key: 'logs', label: '操作日志', icon: 'fas fa-history', path: '/users/logs' },
  { key: 'config', label: '功能配置', icon: 'fas fa-cog', path: '/users/config' }
]

// 流程管理模块的页面导航
export const FLOW_NAV_ITEMS = [
  { key: 'list', label: '流程列表', icon: 'fas fa-list-alt', path: '/flow/list' },
  { key: 'execution', label: '执行记录', icon: 'fas fa-play-circle', path: '/flow/execution' }
]

// sudo权限管理模块的页面导航
export const SUDO_NAV_ITEMS = [
  { key: 'permission', label: 'sudo列表', icon: 'fas fa-list', path: '/sudo/permission' },
  { key: 'apply', label: '权限申请', icon: 'fas fa-file-alt', path: '/sudo/apply' },
  { key: 'password', label: '密码管理', icon: 'fas fa-key', path: '/sudo/password' },
  { key: 'log', label: '操作日志', icon: 'fas fa-history', path: '/sudo/log' }
]

// 密码管理模块的页面导航
export const PASSWORD_NAV_ITEMS = [
  {
    key: 'application',
    label: '申请审批',
    icon: 'fas fa-clipboard-check',
    path: '/password/application'
  },
  { key: 'settings', label: '参数配置', icon: 'fas fa-cog', path: '/password/settings' },
  { key: 'logs', label: '操作日志', icon: 'fas fa-history', path: '/password/logs' }
]

// 系统设置模块的页面导航
export const SSC_NAV_ITEMS = [
  { key: 'user', label: '用户管理', icon: 'fas fa-users-cog', path: '/ssc/user' },
  { key: 'team', label: '团队管理', icon: 'fas fa-sitemap', path: '/ssc/team' },
  { key: 'template', label: '模版分配', icon: 'fas fa-clipboard-list', path: '/ssc/template' },
  { key: 'applet', label: '应用管理', icon: 'fas fa-archive', path: '/ssc/applet' },
  { key: 'tag', label: '应用标签', icon: 'fas fa-tags', path: '/ssc/tag' },
  { key: 'param', label: '参数配置', icon: 'fas fa-brackets-curly', path: '/ssc/param' },
  { key: 'appres', label: '应用资源', icon: 'fas fa-boxes', path: '/ssc/appres' },
  { key: 'email', label: '邮件设置', icon: 'fas fa-mail-bulk', path: '/ssc/email' },
  { key: 'datasource', label: '数据源管理', icon: 'fas fa-code-merge', path: '/ssc/datasource' },
  { key: 'engine', label: '引擎管理', icon: 'fas fa-car-battery', path: '/ssc/engine' }
]

/**
 * 模块导航配置映射
 * 键为模块代码，值为该模块的页面导航配置
 */
export const MODULE_NAV_CONFIG = {
  jao: JAO_NAV_ITEMS,
  gfs: GFS_NAV_ITEMS,
  cmd: CMD_NAV_ITEMS,
  patches: PATCHES_NAV_ITEMS,
  software: SOFTWARE_NAV_ITEMS,
  cac: CAC_NAV_ITEMS,
  acm: ACM_NAV_ITEMS,
  users: USERS_NAV_ITEMS,
  flow: FLOW_NAV_ITEMS,
  sudo: SUDO_NAV_ITEMS,
  password: PASSWORD_NAV_ITEMS,
  ssc: SSC_NAV_ITEMS
}

/**
 * 获取指定模块的页面导航配置
 * @param {string} moduleCode - 模块代码
 * @returns {Array} 页面导航配置数组
 */
export function getModuleNav(moduleCode) {
  return MODULE_NAV_CONFIG[moduleCode] || []
}

/**
 * 根据分组代码获取该分组下所有模块的完整菜单配置
 * 用于生成Element-UI的el-menu所需的菜单组数据
 * @param {string} groupCode - 分组代码
 * @param {Object} MENU_CONFIG - 菜单配置对象
 * @returns {Array} 菜单组配置数组
 */
export function getGroupMenuConfig(groupCode, MENU_CONFIG) {
  const group = MENU_CONFIG.groups.find(g => g.code === groupCode)
  if (!group) return []

  return group.children.map(module => ({
    code: module.code,
    name: module.name,
    icon: module.icon,
    children: MODULE_NAV_CONFIG[module.code] || []
  }))
}
