/**
 * Software module route definitions.
 * Single source of truth for router + side nav.
 */

export const SOFTWARE_ROUTE_DEFS = [
  {
    key: 'yumRepo',
    path: 'yumRepo',
    name: 'software-yumRepo',
    title: 'Yum仓库管理',
    navLabel: 'Yum仓库管理',
    icon: 'fas fa-database',
    component: () => import('@/modules/patches/windows-patch/views/WindowsPatchYumRepoPage.vue')
  },
  {
    key: 'localInstall',
    path: 'localInstall',
    name: 'software-localInstall',
    title: 'rpm包安装',
    redirect: '/rpm-install/install'
  },
  {
    key: 'yumManage',
    path: 'yumManage',
    name: 'software-yumManage',
    title: 'Yum源清单',
    navLabel: 'Yum源清单',
    icon: 'fas fa-cogs',
    component: () => import('@/modules/patches/views/LinuxYumManagePage.vue')
  },
  {
    key: 'repos',
    path: 'repos',
    name: 'software-repos',
    title: '仓库管理',
    navLabel: 'Yum配置下发',
    icon: 'fas fa-database',
    component: () => import('./views/RepoManagementPage.vue')
  },
  {
    key: 'packages',
    path: 'packages',
    name: 'software-packages',
    title: '软件概览',
    navLabel: '软件概览',
    icon: 'fas fa-cube',
    component: () => import('./views/SoftwareHomePage.vue')
  },
  {
    key: 'installed',
    path: 'installed',
    name: 'software-installed',
    title: '已安装软件包',
    icon: 'fas fa-check-circle',
    component: () => import('./views/InstalledPackagesPage.vue')
  },
  {
    key: 'logs',
    path: 'logs',
    name: 'software-logs',
    title: '操作日志',
    navLabel: '操作日志',
    icon: 'fa fa-history',
    component: () => import('./views/LogReportPage.vue')
  }
]
