/**
 * Password module route definitions.
 * Single source of truth for router + side nav.
 */

const passwordModuleView = () => import('./views/PasswordManagementModule.vue')

function createPasswordPageRoute(name, component) {
  return {
    component: passwordModuleView,
    children: [
      {
        path: '',
        name,
        component
      }
    ]
  }
}

export const PASSWORD_ROUTE_DEFS = [
  {
    key: 'application',
    path: 'application',
    title: '申请审批',
    navLabel: '申请审批',
    icon: 'fas fa-clipboard-check',
    ...createPasswordPageRoute(
      'password-application',
      () => import('./views/PasswordApplicationPage.vue')
    )
  },
  {
    key: 'settings',
    path: 'settings',
    title: '参数配置',
    navLabel: '参数配置',
    icon: 'fas fa-cog',
    ...createPasswordPageRoute(
      'password-settings',
      () => import('./views/PasswordSettingsPage.vue')
    )
  },
  {
    key: 'logs',
    path: 'logs',
    title: '操作日志',
    navLabel: '操作日志',
    icon: 'fas fa-history',
    ...createPasswordPageRoute(
      'password-logs',
      () => import('./views/PasswordOperationLogsPage.vue')
    )
  }
]
