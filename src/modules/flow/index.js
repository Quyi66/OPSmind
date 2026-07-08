import { FLOW_ROUTE_DEFS } from './routes.js'

export const flowModule = {
  code: 'flow',
  groupCode: 'automation',
  name: '流程中心',
  icon: 'fas fa-project-diagram',
  description: '流程设计与任务管理',
  permissions: ['applet:flow'],
  defaultRoute: '/flow/list',
  routes: FLOW_ROUTE_DEFS
}
