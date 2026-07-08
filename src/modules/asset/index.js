import { ACM_ROUTE_DEFS } from './routes.js'

export const acmModule = {
  code: 'acm',
  groupCode: 'asset-management',
  name: '资产',
  icon: 'fas fa-server',
  description: 'IT基础设施资产管理',
  permissions: ['applet:acm'],
  defaultRoute: '/acm/overview',
  routes: ACM_ROUTE_DEFS
}
