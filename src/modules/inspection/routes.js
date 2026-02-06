/**
 * Inspection (CAC) module route definitions.
 * Single source of truth for router + side nav.
 */

export const CAC_ROUTE_DEFS = [
  {
    key: 'overview',
    path: 'overview',
    name: 'cac-overview',
    title: '巡检总览',
    navLabel: '巡检总览',
    icon: 'fad fa-fw fa-th-large',
    component: () => import('./views/InspectionOverview.vue')
  },
  {
    key: 'templates',
    path: 'templates',
    name: 'cac-templates',
    title: '巡检模板',
    navLabel: '巡检模板',
    icon: 'fad fa-fw fa-list-alt',
    component: () => import('./views/TemplateList.vue')
  },
  {
    key: 'results',
    path: 'results',
    name: 'cac-results',
    title: '执行记录',
    navLabel: '执行记录',
    icon: 'fad fa-fw fa-history',
    component: () => import('./views/ResultList.vue')
  },
  {
    key: 'resultDetail',
    path: 'results/:jobId',
    name: 'cac-result-detail',
    title: '结果详情',
    component: () => import('./views/ResultDetail.vue')
  },
  {
    key: 'structuralDiagram',
    path: 'structural-diagram/:jobId',
    name: 'cac-structural-diagram',
    title: '架构图',
    component: () => import('./views/StructuralDiagram.vue')
  },
  {
    key: 'config',
    path: 'config',
    name: 'cac-config',
    title: '导出配置',
    navLabel: '导出配置',
    icon: 'fad fa-fw fa-cog',
    component: () => import('./views/AssetModelConfig.vue')
  },
  {
    key: 'email',
    path: 'email',
    name: 'cac-email',
    title: '邮件配置',
    navLabel: '邮件配置',
    icon: 'fad fa-fw fa-envelope',
    component: () => import('./views/EmailConfig.vue')
  }
]
