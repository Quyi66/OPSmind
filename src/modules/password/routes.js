/**
 * Password module route definitions.
 * Single source of truth for router + side nav.
 */

export const PASSWORD_ROUTE_DEFS = [
  {
    key: 'application',
    path: 'application',
    title: '申请审批',
    navLabel: '申请审批',
    icon: 'fas fa-clipboard-check',
    component: () => import('./views/PasswordManagementModule.vue'),
    children: [
      {
        path: '',
        name: 'password-application',
        component: () => import('./components/ApplicationApprovalList.vue')
      }
    ]
  },
  {
    key: 'settings',
    path: 'settings',
    name: 'password-settings',
    title: '参数配置',
    navLabel: '参数配置',
    icon: 'fas fa-cog',
    component: () => import('./components/PasswordSettings.vue')
  },
  {
    key: 'logs',
    path: 'logs',
    name: 'password-logs',
    title: '操作日志',
    navLabel: '操作日志',
    icon: 'fas fa-history',
    component: () => import('./components/PasswordOperationLog.vue')
  }
]
