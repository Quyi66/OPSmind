import { USERS_ROUTE_DEFS } from './routes.js'

export const usersModule = {
  code: 'users',
  groupCode: 'flow-management',
  name: '主机用户管理',
  icon: 'fas fa-users',
  description: '主机用户与权限管理',
  permissions: ['applet:uim'],
  defaultRoute: '/users/users',
  routes: USERS_ROUTE_DEFS
}
