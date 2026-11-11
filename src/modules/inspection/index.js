import { CAC_ROUTE_DEFS } from './routes.js'

export const cacModule = {
  code: 'cac',
  groupCode: 'system-inspection',
  name: '巡检中心',
  icon: 'fas fa-shield-check',
  description: '基线合规巡检、报告诊断与业务拓扑分析',
  permissions: ['applet:cac'],
  defaultRoute: '/cac/overview',
  routes: CAC_ROUTE_DEFS
}
