/**
 * Patches module route definitions.
 * Single source of truth for router + side nav.
 */

export const PATCHES_ROUTE_DEFS = [
  {
    key: 'cveList',
    path: 'cveList',
    name: 'patches-cveList',
    title: 'CVE漏洞列表',
    navLabel: 'CVE漏洞列表',
    icon: 'fas fa-bug',
    platform: 'common',
    component: () => import('./views/CveListPage.vue')
  },
  {
    key: 'middlewareCveList',
    path: 'middlewareCveList',
    name: 'patches-middlewareCveList',
    title: '中间件CVE列表',
    navLabel: '中间件CVE列表',
    icon: 'fas fa-shield-virus',
    platform: 'common',
    component: () => import('./views/MiddlewareCveListPage.vue')
  },
  {
    key: 'cveImport',
    path: 'cveImport',
    name: 'patches-cveImport',
    title: 'CVE文件导入比对',
    navLabel: 'CVE导入比对',
    icon: 'fas fa-file-import',
    platform: 'linux',
    component: () => import('./views/CveImportPage.vue')
  },
  {
    key: 'urgencyDashboard',
    path: 'urgencyDashboard',
    name: 'patches-urgencyDashboard',
    title: '漏洞紧急程度',
    navLabel: '漏洞紧急程度',
    icon: 'fas fa-exclamation-triangle',
    platform: 'linux',
    component: () => import('./views/UrgencyDashboardPage.vue')
  },
  {
    key: 'machineScan',
    path: 'machineScan',
    name: 'patches-machineScan',
    title: '机器扫描',
    navLabel: '机器扫描',
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
    icon: 'fas fa-database',
    platform: 'linux',
    component: () => import('./views/LinuxPatchLibraryPage.vue')
  },
  {
    key: 'rpmPackageList',
    path: 'rpmPackageList',
    name: 'patches-rpmPackageList',
    title: '软件包信息查询',
    navLabel: '软件包信息查询',
    icon: 'fas fa-cube',
    platform: 'linux',
    component: () => import('./views/RpmPackageListPage.vue')
  },
  {
    key: 'linuxMachinePackageList',
    path: 'linuxMachinePackageList',
    name: 'patches-linuxMachinePackageList',
    title: '机器包清单',
    navLabel: '机器包清单',
    icon: 'fas fa-box-open',
    platform: 'linux',
    component: () => import('./views/LinuxMachinePackageListPage.vue')
  },
  {
    key: 'vulnerability',
    path: 'vulnerability',
    name: 'patches-vulnerability',
    title: '漏洞概览',
    navLabel: '漏洞概览',
    icon: 'fas fa-shield-alt',
    platform: 'linux',
    component: () => import('./views/LinuxVulnerabilityPage.vue')
  },
  {
    key: 'windowsVulnerability',
    path: 'windowsVulnerability',
    name: 'patches-windowsVulnerability',
    alias: ['windowsUpdate'],
    title: 'Windows 补丁概览',
    navLabel: '主机概览',
    icon: 'fas fa-desktop',
    platform: 'windows',
    component: () => import('./windows-patch/views/WindowsPatchOverviewPage.vue')
  },
  {
    key: 'windowsYumRepo',
    path: 'windowsYumRepo',
    name: 'patches-windowsYumRepo',
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
    alias: ['windowsView'],
    title: '安装回滚历史',
    navLabel: '安装回滚历史',
    icon: 'fas fa-history',
    platform: 'windows',
    component: () => import('./windows-patch/views/WindowsPatchTaskCenterPage.vue')
  },
  {
    key: 'windowsCveList',
    path: 'windowsCveList',
    name: 'patches-windowsCveList',
    title: 'CVE漏洞列表',
    navLabel: 'CVE漏洞列表',
    icon: 'fas fa-bug',
    platform: 'windows',
    component: () => import('./views/WindowsCveListPage.vue')
  },
  {
    key: 'logs',
    path: 'logs',
    name: 'patches-logs',
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
    title: '流程操作记录',
    navLabel: '流程操作记录',
    icon: 'fas fa-stream',
    platform: 'common',
    component: () => import('./views/PatchProcessLogsPage.vue')
  }
]
