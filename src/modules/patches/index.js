import { PATCHES_ROUTE_DEFS } from './routes.js'

// 辅助函数：根据 navGroup 对路由进行分组生成导航项
function buildGroupedNavItems(defs, basePath, groups) {
  const ungrouped = defs.filter(d => !d.navGroup).map(d => ({
    key: d.key,
    label: d.navLabel || d.title,
    icon: d.icon,
    path: `${basePath}/${d.path}`
  }))

  const grouped = groups
    .map(g => {
      const children = defs
        .filter(d => d.navGroup === g.key)
        .map(d => ({
          key: d.key,
          label: d.navLabel || d.title,
          icon: d.icon,
          path: `${basePath}/${d.path}`
        }))
      return children.length ? { key: g.key, label: g.label, children } : null
    })
    .filter(Boolean)

  return [...ungrouped, ...grouped]
}

const PATCHES_NAV_GROUPS = [
  { key: 'installManage', label: '安装与回滚' },
  { key: 'vulnManage', label: '漏洞管理' },
  { key: 'repoManage', label: '软件与仓库' }
]

// 补丁管理主模块
export const patchesModule = {
  code: 'patches',
  groupCode: 'patch-testing',
  name: '补丁管理(linux)',
  icon: 'fab fa-linux',
  description: '系统补丁和更新管理',
  permissions: ['applet:vap'],
  defaultRoute: '/patches/machineScan',
  routes: PATCHES_ROUTE_DEFS,
  navItems: [
    ...buildGroupedNavItems(
      PATCHES_ROUTE_DEFS.filter(
        def => def.navLabel &&
               def.platform !== 'windows' &&
               !['logs', 'processLogs', 'middlewareCveList'].includes(def.key)
      ),
      '/patches',
      PATCHES_NAV_GROUPS
    ),
    {
      key: 'yumRepoManage',
      label: 'Yum仓库',
      accessCode: 'yum-repo',
      // 由 module-nav.config.js 运行时动态挂载 yum-repo 的子导航项，以避免打包循环依赖
      children: []
    }
  ]
}

// 虚拟子模块：Windows补丁
export const windowsPatchesModule = {
  code: 'windows-patches',
  groupCode: 'patch-testing',
  name: '补丁管理(win)',
  icon: 'fab fa-windows',
  description: 'Windows系统补丁和更新管理',
  permissions: ['applet:vap'],
  defaultRoute: '/patches/windowsVulnerability',
  isVirtual: true,
  navItems: PATCHES_ROUTE_DEFS.filter(
    def => def.navLabel && def.platform === 'windows' && def.key !== 'windowsYumRepo'
  ).map(def => ({
    key: def.key,
    label: def.navLabel || def.title,
    icon: def.icon,
    path: `/patches/${def.path}`,
    platform: def.platform || 'windows'
  }))
}

// 虚拟子模块：变更日志查询
export const patchLogsModule = {
  code: 'patch-logs',
  groupCode: 'patch-testing',
  name: '变更日志查询',
  icon: 'fas fa-history',
  description: '查看补丁相关执行日志',
  permissions: ['applet:vap'],
  defaultRoute: '/patches/logs',
  isVirtual: true,
  navItems: PATCHES_ROUTE_DEFS.filter(
    def => def.navLabel && def.key === 'logs'
  ).map(def => ({
    key: def.key,
    label: def.navLabel || def.title,
    icon: def.icon,
    path: `/patches/${def.path}`,
    platform: 'common'
  }))
}

// 虚拟子模块：流程操作记录
export const patchProcessLogsModule = {
  code: 'patch-process-logs',
  groupCode: 'patch-testing',
  name: '流程操作记录',
  icon: 'fas fa-stream',
  description: '查看补丁向导流程步骤记录',
  permissions: ['applet:vap'],
  defaultRoute: '/patches/processLogs',
  isVirtual: true,
  navItems: PATCHES_ROUTE_DEFS.filter(
    def => def.navLabel && def.key === 'processLogs'
  ).map(def => ({
    key: def.key,
    label: def.navLabel || def.title,
    icon: def.icon,
    path: `/patches/${def.path}`,
    platform: 'common'
  }))
}

// 虚拟子模块：中间件CVE
export const middlewareCveModule = {
  code: 'middleware-cve',
  groupCode: 'patch-testing',
  name: '中间件CVE',
  icon: 'fas fa-shield-virus',
  description: '中间件CVE漏洞管理',
  permissions: ['applet:vap'],
  defaultRoute: '/patches/middlewareCveList',
  isVirtual: true,
  navItems: PATCHES_ROUTE_DEFS.filter(
    def => def.navLabel && def.key === 'middlewareCveList'
  ).map(def => ({
    key: def.key,
    label: def.navLabel || def.title,
    icon: def.icon,
    path: `/patches/${def.path}`,
    platform: 'common'
  }))
}
