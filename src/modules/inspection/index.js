import { CAC_ROUTE_DEFS } from './routes.js'

export const cacModule = {
  code: 'cac',
  groupCode: 'system-inspection',
  name: '巡检中心',
  icon: 'fas fa-search',
  description: '系统配置审计与合规性检查',
  permissions: ['applet:cac'],
  defaultRoute: '/cac/overview',
  routes: CAC_ROUTE_DEFS
}
