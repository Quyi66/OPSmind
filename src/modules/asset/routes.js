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
    component: () => import('./views/AssetOverview.vue')
  },
  {
    key: 'info',
    path: 'info',
    name: 'acm-info',
    title: '资产列表',
    navLabel: '资产列表',
    icon: 'fad fa-fw fa-server',
    component: () => import('./views/AssetInfo.vue')
  },
  {
    key: 'data',
    path: 'data',
    name: 'acm-data',
    title: '分组与标签',
    navLabel: '分组与标签',
    icon: 'fad fa-fw fa-database',
    component: () => import('./views/DataManage.vue')
  },
  {
    key: 'model',
    path: 'model',
    name: 'acm-model',
    title: '资产模型',
    navLabel: '资产模型',
    icon: 'fad fa-fw fa-project-diagram',
    component: () => import('./views/AssetModel.vue')
  },
  {
    key: 'exception',
    path: 'exception',
    name: 'acm-exception',
    title: '异常设备',
    navLabel: '异常设备',
    icon: 'fad fa-fw fa-exclamation-triangle',
    component: () => import('./views/ExceptionDevice.vue')
  },
  {
    key: 'automation',
    path: 'automation',
    name: 'acm-automation',
    title: '自动化配置',
    navLabel: '自动化配置',
    icon: 'fad fa-fw fa-cogs',
    component: () => import('./views/AutomationConfig.vue')
  },
  {
    key: 'permission',
    path: 'permission',
    name: 'acm-permission',
    title: '资源权限',
    navLabel: '资源权限',
    icon: 'fad fa-fw fa-user-lock',
    component: () => import('./views/ResourcePermission.vue')
  },
  {
    key: 'log',
    path: 'log',
    name: 'acm-log',
    title: '操作日志',
    navLabel: '操作日志',
    icon: 'fad fa-fw fa-history',
    component: () => import('./views/OperationLog.vue')
  }
]
