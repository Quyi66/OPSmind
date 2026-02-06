/**
 * Flow module route definitions.
 * Single source of truth for router + side nav.
 */

export const FLOW_ROUTE_DEFS = [
  {
    key: 'list',
    path: 'list',
    title: '流程列表',
    navLabel: '流程列表',
    icon: 'fas fa-list-alt',
    component: () => import('./views/FlowManagementModule.vue'),
    children: [
      {
        path: '',
        name: 'flow-list',
        component: () => import('./components/FlowListView.vue')
      }
    ]
  },
  {
    key: 'execution',
    path: 'execution',
    name: 'flow-execution',
    title: '执行记录',
    navLabel: '执行记录',
    icon: 'fas fa-play-circle',
    component: () => import('./components/ExecutionListView.vue')
  }
]
