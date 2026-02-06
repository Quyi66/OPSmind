/**
 * Sudo module route definitions.
 * Single source of truth for router + side nav.
 */

export const SUDO_ROUTE_DEFS = [
  {
    key: 'permission',
    path: 'permission',
    name: 'sudo-permission',
    title: 'sudo列表',
    navLabel: 'sudo列表',
    icon: 'fas fa-list',
    component: () => import('./components/SudoPermissionList.vue')
  },
  {
    key: 'apply',
    path: 'apply',
    name: 'sudo-apply',
    title: '权限申请',
    navLabel: '权限申请',
    icon: 'fas fa-file-alt',
    component: () => import('./components/SudoApplyList.vue')
  },
  {
    key: 'templates',
    path: 'templates',
    name: 'sudo-templates',
    title: '模板管理',
    navLabel: '模板管理',
    icon: 'fas fa-clipboard-list',
    component: () => import('./components/SudoTemplateList.vue')
  },
  {
    key: 'password',
    path: 'password',
    name: 'sudo-password',
    title: '主机密码',
    navLabel: '主机密码',
    icon: 'fas fa-key',
    component: () => import('./components/SudoPasswordManage.vue')
  },
  {
    key: 'log',
    path: 'log',
    name: 'sudo-log',
    title: '操作日志',
    navLabel: '操作日志',
    icon: 'fas fa-history',
    component: () => import('./components/SudoOperationLog.vue')
  }
]
