/**
 * Sudo module route definitions.
 * Single source of truth for router + side nav.
 */

const sudoModuleView = () => import('./views/SudoManagementModule.vue')

function createSudoPageRoute(name, component) {
  return {
    component: sudoModuleView,
    children: [
      {
        path: '',
        name,
        component
      }
    ]
  }
}

export const SUDO_ROUTE_DEFS = [
  {
    key: 'permission',
    path: 'permission',
    title: 'sudo列表',
    navLabel: 'sudo列表',
    icon: 'fas fa-list',
    ...createSudoPageRoute(
      'sudo-permission',
      () => import('./views/SudoPermissionPage.vue')
    )
  },
  {
    key: 'apply',
    path: 'apply',
    title: '权限申请',
    navLabel: '权限申请',
    icon: 'fas fa-file-alt',
    ...createSudoPageRoute('sudo-apply', () => import('./views/SudoApplyPage.vue'))
  },
  {
    key: 'templates',
    path: 'templates',
    title: '模板管理',
    navLabel: '模板管理',
    icon: 'fas fa-clipboard-list',
    ...createSudoPageRoute(
      'sudo-templates',
      () => import('./views/SudoTemplatePage.vue')
    )
  },
  {
    key: 'password',
    path: 'password',
    title: '主机密码',
    navLabel: '主机密码',
    icon: 'fas fa-key',
    ...createSudoPageRoute(
      'sudo-password',
      () => import('./views/SudoPasswordPage.vue')
    )
  },
  {
    key: 'log',
    path: 'log',
    title: '操作日志',
    navLabel: '操作日志',
    icon: 'fas fa-history',
    ...createSudoPageRoute('sudo-log', () => import('./views/SudoOperationLogsPage.vue'))
  }
]
