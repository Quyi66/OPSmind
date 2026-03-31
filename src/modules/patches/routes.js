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
    component: () => import('./components/CveList.vue')
  },
  {
    key: 'middlewareCveList',
    path: 'middlewareCveList',
    name: 'patches-middlewareCveList',
    title: '中间件CVE列表',
    navLabel: '中间件CVE列表',
    icon: 'fas fa-shield-virus',
    platform: 'common',
    component: () => import('./components/MiddlewareCveList.vue')
  },
  {
    key: 'machineScan',
    path: 'machineScan',
    name: 'patches-machineScan',
    title: '机器扫描',
    navLabel: '机器扫描',
    icon: 'fas fa-search',
    platform: 'linux',
    component: () => import('./components/LinuxPatchScan.vue')
  },
  {
    key: 'hostDetail',
    path: 'hostDetail',
    name: 'patches-hostDetail',
    title: '主机详情',
    component: () => import('./components/LinuxHostDetailPage.vue')
  },
  {
    key: 'patchInstall',
    path: 'patchInstall',
    name: 'patches-patchInstall',
    title: '补丁安装',
    navLabel: '补丁安装',
    icon: 'fas fa-download',
    platform: 'linux',
    component: () => import('./components/LinuxPatchInstall.vue')
  },
  {
    key: 'changeRollback',
    path: 'changeRollback',
    name: 'patches-changeRollback',
    title: '变更回滚',
    navLabel: '变更回滚',
    icon: 'fas fa-undo',
    platform: 'linux',
    component: () => import('./components/LinuxPatchRollback.vue')
  },
  {
    key: 'linuxYumManage',
    path: 'linuxYumManage',
    name: 'patches-linuxYumManage',
    title: 'Linux YUM管理',
    component: () => import('./components/LinuxYumManage.vue')
  },
  {
    key: 'patchLibrary',
    path: 'patchLibrary',
    name: 'patches-patchLibrary',
    title: '补丁仓库',
    navLabel: '补丁仓库',
    icon: 'fas fa-database',
    platform: 'linux',
    component: () => import('./components/LinuxPatchLibrary.vue')
  },
  {
    key: 'vulnerability',
    path: 'vulnerability',
    name: 'patches-vulnerability',
    title: '漏洞概览',
    navLabel: '漏洞概览',
    icon: 'fas fa-shield-alt',
    platform: 'linux',
    component: () => import('./components/LinuxVulnerability.vue')
  },
  {
    key: 'windowsVulnerability',
    path: 'windowsVulnerability',
    name: 'patches-windowsVulnerability',
    title: 'Windows漏洞',
    navLabel: '漏洞扫描',
    icon: 'fas fa-search',
    platform: 'windows',
    component: () => import('./components/WindowsVulnerability.vue')
  },
  {
    key: 'windowsUpdate',
    path: 'windowsUpdate',
    name: 'patches-windowsUpdate',
    title: 'Windows更新',
    navLabel: '补丁安装',
    icon: 'fas fa-download',
    platform: 'windows',
    component: () => import('./components/WindowsUpdate.vue')
  },
  {
    key: 'windowsRollback',
    path: 'windowsRollback',
    name: 'patches-windowsRollback',
    title: 'Windows回滚',
    navLabel: '变更回滚',
    icon: 'fas fa-history',
    platform: 'windows',
    component: () => import('./components/WindowsRollback.vue')
  },
  {
    key: 'windowsView',
    path: 'windowsView',
    name: 'patches-windowsView',
    title: 'Windows View',
    navLabel: '漏洞统计',
    icon: 'fas fa-chart-bar',
    platform: 'windows',
    component: () => import('./components/WindowsView.vue')
  },
  {
    key: 'logs',
    path: 'logs',
    name: 'patches-logs',
    title: '变更日志查询',
    navLabel: '变更日志查询',
    icon: 'fas fa-file-alt',
    platform: 'common',
    component: () => import('./components/OperationLogs.vue')
  },
  {
    key: 'processLogs',
    path: 'processLogs',
    name: 'patches-processLogs',
    title: '流程操作记录',
    navLabel: '流程操作记录',
    icon: 'fas fa-stream',
    platform: 'common',
    component: () => import('./components/PatchProcessLogs.vue')
  }
]
