import { PASSWORD_ROUTE_DEFS } from './routes.js'

export const passwordModule = {
  code: 'password',
  groupCode: 'security-management',
  name: '密码管理',
  icon: 'fas fa-key',
  description: '密码策略和安全管理',
  permissions: ['applet:pmsv2'],
  defaultRoute: '/password/application',
  routes: PASSWORD_ROUTE_DEFS
}
