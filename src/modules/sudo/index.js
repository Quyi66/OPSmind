import { SUDO_ROUTE_DEFS } from './routes.js'

export const sudoModule = {
  code: 'sudo',
  groupCode: 'security-management',
  name: 'Sudo权限',
  icon: 'fas fa-user-shield',
  description: 'sudo权限分配和管理',
  permissions: ['applet:sudo'],
  defaultRoute: '/sudo/permission',
  routes: SUDO_ROUTE_DEFS
}
