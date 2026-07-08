/**
 * Yum repo module route definitions.
 * Single source of truth for router + side nav.
 */

export const YUM_REPO_ROUTE_DEFS = [
  {
    key: 'yumRepo',
    path: 'yumRepo',
    name: 'yum-repo-yumRepo',
    title: '仓库管理',
    navLabel: '仓库管理',
    icon: 'fas fa-database',
    component: () => import('./views/YumRepoManagementPage.vue')
  },
  {
    key: 'localInstall',
    path: 'localInstall',
    name: 'yum-repo-localInstall',
    title: '软件包安装',
    redirect: '/patches/localInstall'
  },
  {
    key: 'yumManage',
    path: 'yumManage',
    name: 'yum-repo-yumManage',
    title: 'Yum源清单',
    navLabel: 'Yum源清单',
    icon: 'fas fa-cogs',
    component: () => import('@/modules/patches/views/LinuxYumManagePage.vue')
  },
  {
    key: 'repos',
    path: 'repos',
    name: 'yum-repo-repos',
    title: '配置下发',
    navLabel: '配置下发',
    icon: 'fas fa-database',
    component: () => import('@/modules/software/views/RepoManagementPage.vue')
  },
  {
    key: 'packages',
    path: 'packages',
    name: 'yum-repo-packages',
    title: '软件概览',
    navLabel: '软件概览',
    icon: 'fas fa-cube',
    component: () => import('@/modules/software/views/SoftwareHomePage.vue')
  },
  {
    key: 'installed',
    path: 'installed',
    name: 'yum-repo-installed',
    title: '已安装软件包',
    icon: 'fas fa-check-circle',
    component: () => import('@/modules/software/views/InstalledPackagesPage.vue')
  },
  {
    key: 'logs',
    path: 'logs',
    name: 'yum-repo-logs',
    title: '操作日志',
    navLabel: '操作日志',
    icon: 'fa fa-history',
    component: () => import('@/modules/software/views/LogReportPage.vue')
  }
]
