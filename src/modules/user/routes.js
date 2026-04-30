/**
 * Users module route definitions.
 * Single source of truth for router + side nav.
 */

const userModuleView = () => import('./views/UserManagementModule.vue')

export const USERS_ROUTE_DEFS = [
  {
    key: 'overview',
    path: 'overview',
    title: '用户总览',
    navLabel: '用户总览',
    icon: 'fas fa-tachometer-alt',
    component: userModuleView,
    children: [
      {
        path: '',
        name: 'users-overview',
        component: () => import('./views/UserOverviewPage.vue')
      }
    ]
  },
  {
    key: 'users',
    path: 'users',
    title: '用户列表',
    navLabel: '用户列表',
    icon: 'fas fa-user',
    component: userModuleView,
    children: [
      {
        path: '',
        name: 'users-list',
        component: () => import('./views/UserListPage.vue')
      }
    ]
  },
  {
    key: 'groups',
    path: 'groups',
    title: '用户组',
    navLabel: '用户组',
    icon: 'fas fa-users',
    component: userModuleView,
    children: [
      {
        path: '',
        name: 'users-groups',
        component: () => import('./views/UserGroupsPage.vue')
      }
    ]
  },
  {
    key: 'logs',
    path: 'logs',
    title: '操作日志',
    navLabel: '操作日志',
    icon: 'fas fa-history',
    component: userModuleView,
    children: [
      {
        path: '',
        name: 'users-logs',
        component: () => import('./views/UserOperationLogsPage.vue')
      }
    ]
  }
]
