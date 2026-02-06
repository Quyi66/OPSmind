/**
 * Users module route definitions.
 * Single source of truth for router + side nav.
 */

export const USERS_ROUTE_DEFS = [
  {
    key: 'overview',
    path: 'overview',
    name: 'users-overview',
    title: '用户总览',
    navLabel: '用户总览',
    icon: 'fas fa-tachometer-alt',
    component: () => import('./components/overview/OverviewView.vue')
  },
  {
    key: 'users',
    path: 'users',
    name: 'users-list',
    title: '用户列表',
    navLabel: '用户列表',
    icon: 'fas fa-user',
    component: () => import('./components/users/UsersView.vue')
  },
  {
    key: 'groups',
    path: 'groups',
    name: 'users-groups',
    title: '用户组',
    navLabel: '用户组',
    icon: 'fas fa-users',
    component: () => import('./components/groups/UserGroupsView.vue')
  },
  {
    key: 'logs',
    path: 'logs',
    name: 'users-logs',
    title: '操作日志',
    navLabel: '操作日志',
    icon: 'fas fa-history',
    component: () => import('./components/operation/OperationLogsView.vue')
  }
]
