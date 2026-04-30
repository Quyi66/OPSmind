/**
 * Flow module route definitions.
 * Single source of truth for router + side nav.
 */

const flowModuleView = () => import('./views/FlowManagementModule.vue')

function createFlowPageRoute(name, component) {
  return {
    component: flowModuleView,
    children: [
      {
        path: '',
        name,
        component
      }
    ]
  }
}

export const FLOW_ROUTE_DEFS = [
  {
    key: 'list',
    path: 'list',
    title: '流程列表',
    navLabel: '流程列表',
    icon: 'fas fa-list-alt',
    ...createFlowPageRoute('flow-list', () => import('./views/FlowListPage.vue'))
  },
  {
    key: 'execution',
    path: 'execution',
    title: '执行记录',
    navLabel: '执行记录',
    icon: 'fas fa-play-circle',
    ...createFlowPageRoute('flow-execution', () => import('./views/FlowExecutionPage.vue'))
  }
]
