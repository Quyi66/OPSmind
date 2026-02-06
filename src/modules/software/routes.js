/**
 * Software module route definitions.
 * Single source of truth for router + side nav.
 */

export const SOFTWARE_ROUTE_DEFS = [
  {
    key: 'packages',
    path: 'packages',
    name: 'software-packages',
    title: '软件概览',
    navLabel: '软件概览',
    icon: 'fas fa-cube',
    component: () => import('./views/SoftwareHome.vue')
  },
  {
    key: 'repos',
    path: 'repos',
    name: 'software-repos',
    title: '仓库管理',
    navLabel: '仓库管理',
    icon: 'fas fa-database',
    component: () => import('./views/RepoManagement.vue')
  },
  {
    key: 'installed',
    path: 'installed',
    name: 'software-installed',
    title: '已安装软件包',
    navLabel: '已安装软件包',
    icon: 'fas fa-check-circle',
    component: () => import('./views/InstalledPackages.vue')
  },
  {
    key: 'localInstall',
    path: 'localInstall',
    name: 'software-localInstall',
    title: '本地安装',
    navLabel: '本地安装',
    icon: 'fas fa-map-marker',
    component: () => import('./views/LocalInstall.vue')
  },
  {
    key: 'yumManage',
    path: 'yumManage',
    name: 'software-yumManage',
    title: '软件源管理',
    navLabel: '软件源管理',
    icon: 'fas fa-cogs',
    component: () => import('@/modules/patches/components/LinuxYumManage.vue')
  },
  {
    key: 'logs',
    path: 'logs',
    name: 'software-logs',
    title: '操作日志',
    navLabel: '操作日志',
    icon: 'fa fa-history',
    component: () => import('./views/LogReport.vue')
  }
]
