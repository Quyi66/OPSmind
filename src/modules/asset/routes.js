/**
 * Asset (ACM) module route definitions.
 * Single source of truth for router + side nav.
 */

export const ACM_ROUTE_DEFS = [
  {
    key: 'overview',
    path: 'overview',
    name: 'acm-overview',
    title: '资产总览',
    navLabel: '资产总览',
    icon: 'fad fa-fw fa-chart-pie',
    component: () => import('./views/AssetOverviewPage.vue')
  },
  {
    key: 'info',
    path: 'info',
    name: 'acm-info',
    title: '设备清单',
    navLabel: '设备清单',
    icon: 'fad fa-fw fa-server',
    component: () => import('./views/AssetInfoPage.vue')
  },
  {
    key: 'exception',
    path: 'exception',
    name: 'acm-exception',
    title: '连通巡检',
    navLabel: '连通巡检',
    icon: 'fad fa-fw fa-exclamation-triangle',
    component: () => import('./views/ExceptionDevicePage.vue')
  },
  {
    key: 'data',
    path: 'data',
    name: 'acm-data',
    title: '分组与标签',
    navLabel: '分组与标签',
    icon: 'fad fa-fw fa-database',
    component: () => import('./views/DataManagePage.vue')
  },
  {
    key: 'automation',
    path: 'automation',
    name: 'acm-automation',
    title: '连接凭据',
    navLabel: '连接凭据',
    icon: 'fad fa-fw fa-cogs',
    component: () => import('./views/AutomationConfigPage.vue')
  },
  {
    key: 'log',
    path: 'log',
    name: 'acm-log',
    title: '操作日志',
    navLabel: '操作日志',
    icon: 'fad fa-fw fa-history',
    component: () => import('./views/OperationLogPage.vue')
  },
  {
    key: 'permission',
    path: 'permission',
    name: 'acm-permission',
    title: '访问控制',
    navLabel: '访问控制',
    icon: 'fad fa-fw fa-user-lock',
    component: () => import('./views/ResourcePermissionPage.vue')
  },
  {
    key: 'model',
    path: 'model',
    name: 'acm-model',
    title: '模型定义',
    navLabel: '模型定义',
    icon: 'fad fa-fw fa-project-diagram',
    component: () => import('./views/AssetModelPage.vue')
  }
]

