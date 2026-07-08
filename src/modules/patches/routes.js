/**
 * Patches module route definitions.
 * Single source of truth for router + side nav.
 */

export const PATCHES_ROUTE_DEFS = [
  {
    key: 'machineScan',
    path: 'machineScan',
    name: 'patches-machineScan',
    title: '主机概览',
    navLabel: '主机概览',
    icon: 'fas fa-search',
    platform: 'linux',
    component: () => import('./views/LinuxPatchScanPage.vue')
  },
  {
    key: 'hostDetail',
    path: 'hostDetail',
    name: 'patches-hostDetail',
    title: '主机详情',
    component: () => import('./views/LinuxHostDetailPage.vue')
  },
  {
    key: 'patchInstall',
    path: 'patchInstall',
    name: 'patches-patchInstall',
    title: '补丁安装',
    navLabel: '补丁安装',
    navGroup: 'installManage',
    icon: 'fas fa-download',
    platform: 'linux',
    component: () => import('./views/LinuxPatchInstallPage.vue')
  },
  {
    key: 'changeRollback',
    path: 'changeRollback',
    name: 'patches-changeRollback',
    title: '变更回滚',
    navLabel: '变更回滚',
    navGroup: 'installManage',
    icon: 'fas fa-undo',
    platform: 'linux',
    component: () => import('./views/LinuxPatchRollbackPage.vue')
  },
  {
    key: 'linuxYumManage',
    path: 'linuxYumManage',
    name: 'patches-linuxYumManage',
    title: 'Linux YUM管理',
    redirect: '/yum-repo/yumManage',
    component: () => import('./views/LinuxYumManagePage.vue')
  },
  {
    key: 'patchLibrary',
    path: 'patchLibrary',
    name: 'patches-patchLibrary',
    title: '补丁仓库',
    navLabel: '补丁仓库',
    navGroup: 'repoManage',
    icon: 'fas fa-database',
    platform: 'linux',
    component: () => import('./views/LinuxPatchLibraryPage.vue')
  },
  {
    key: 'cveList',
    path: 'cveList',
    name: 'patches-cveList',
    title: 'CVE漏洞',
    navLabel: 'CVE漏洞',
    navGroup: 'vulnManage',
    icon: 'fas fa-bug',
    platform: 'common',
    component: () => import('./views/CveListPage.vue')
  },
  {
    key: 'linuxMachinePackageList',
    path: 'linuxMachinePackageList',
    name: 'patches-linuxMachinePackageList',
    title: '机器包清单',
    navLabel: '机器包清单',
    navGroup: 'repoManage',
    icon: 'fas fa-box-open',
    platform: 'linux',
    component: () => import('./views/LinuxMachinePackageListPage.vue')
  },
  {
    key: 'rpmPackageList',
    path: 'rpmPackageList',
    name: 'patches-rpmPackageList',
    title: '软件包查询',
    navLabel: '软件包查询',
    navGroup: 'repoManage',
    icon: 'fas fa-cube',
    platform: 'linux',
    component: () => import('./views/RpmPackageListPage.vue')
  },
  {
    key: 'middlewareCveList',
    path: 'middlewareCveList',
    name: 'patches-middlewareCveList',
    menuCode: 'middleware-cve',
    title: '中间件CVE',
    navLabel: '中间件CVE',
    icon: 'fas fa-shield-virus',
    platform: 'common',
    component: () => import('./views/MiddlewareCveListPage.vue')
  },
  {
    key: 'urgencyDashboard',
    path: 'urgencyDashboard',
    name: 'patches-urgencyDashboard',
    title: '紧急度评估',
    navLabel: '紧急度评估',
    navGroup: 'vulnManage',
    icon: 'fas fa-exclamation-triangle',
    platform: 'linux',
    component: () => import('./views/UrgencyDashboardPage.vue')
  },
  {
    key: 'localInstall',
    path: 'localInstall',
    name: 'patches-localInstall',
    title: '软件包安装',
    navLabel: '软件包安装',
    navGroup: 'installManage',
    icon: 'fas fa-box-open',
    platform: 'linux',
    component: () => import('./views/LocalInstallPage.vue')
  },
  {
    key: 'windowsVulnerability',
    path: 'windowsVulnerability',
    name: 'patches-windowsVulnerability',
    menuCode: 'windows-patches',
    alias: ['windowsUpdate'],
    title: 'Windows 补丁概览',
    navLabel: '主机概览',
    icon: 'fas fa-desktop',
    platform: 'windows',
    component: () => import('./windows-patch/views/WindowsPatchOverviewPage.vue')
  },
  {
    key: 'windowsWsus',
    path: 'windowsWsus',
    name: 'patches-windowsWsus',
    menuCode: 'windows-patches',
    title: 'WSUS 配置',
    navLabel: 'WSUS 配置',
    icon: 'fas fa-server',
    platform: 'windows',
    component: () => import('./windows-patch/views/WindowsPatchWsusConfigPage.vue')
  },
  {
    key: 'windowsYumRepo',
    path: 'windowsYumRepo',
    name: 'patches-windowsYumRepo',
    menuCode: 'patches',
    title: '客户 Yum 仓库管理',
    navLabel: 'Yum 仓库管理',
    icon: 'fas fa-database',
    platform: 'windows',
    redirect: '/yum-repo/repos',
    component: () => import('@/modules/yum-repo/views/YumRepoManagementPage.vue')
  },
  {
    key: 'windowsRollback',
    path: 'windowsRollback',
    name: 'patches-windowsRollback',
    menuCode: 'windows-patches',
    alias: ['windowsView'],
    title: '变更回滚',
    navLabel: '变更回滚',
    icon: 'fas fa-history',
    platform: 'windows',
    component: () => import('./windows-patch/views/WinPatchInstallHistoryPage.vue')
  },
  {
    key: 'windowsCveList',
    path: 'windowsCveList',
    name: 'patches-windowsCveList',
    menuCode: 'windows-patches',
    title: 'CVE漏洞',
    navLabel: 'CVE漏洞',
    icon: 'fas fa-bug',
    platform: 'windows',
    component: () => import('./windows-patch/views/WindowsCveListPage.vue')
  },
  {
    key: 'windowsKbList',
    path: 'windowsKbList',
    name: 'patches-windowsKbList',
    menuCode: 'windows-patches',
    title: 'Windows KB知识库',
    navLabel: 'KB知识库',
    icon: 'fas fa-book',
    platform: 'windows',
    component: () => import('./windows-patch/views/WindowsKbListPage.vue')
  },
  {
    key: 'logs',
    path: 'logs',
    name: 'patches-logs',
    menuCode: 'patch-logs',
    title: '变更日志查询',
    navLabel: '变更日志查询',
    icon: 'fas fa-file-alt',
    platform: 'common',
    component: () => import('./views/OperationLogsPage.vue')
  },
  {
    key: 'processLogs',
    path: 'processLogs',
    name: 'patches-processLogs',
    menuCode: 'patch-process-logs',
    title: '流程操作记录',
    navLabel: '流程操作记录',
    icon: 'fas fa-stream',
    platform: 'common',
    component: () => import('./views/PatchProcessLogsPage.vue')
  }
]
