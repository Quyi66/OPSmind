/**
 * System settings (SSC) module route definitions.
 * Single source of truth for router + side nav.
 */

export const UAM_ROUTE_DEFS = [
  {
    key: 'user',
    path: 'user',
    name: 'uam-user',
    title: '用户管理',
    navLabel: '用户管理',
    icon: 'fas fa-users-cog',
    component: () => import('./components/UserManagement.vue')
  },
  {
    key: 'team',
    path: 'team',
    name: 'uam-team',
    title: '团队管理',
    navLabel: '团队管理',
    icon: 'fas fa-sitemap',
    component: () => import('./components/TeamManagement.vue')
  }
]

export const SSC_ROUTE_DEFS = [
  // {
  //   key: 'template',
  //   path: 'template',
  //   name: 'ssc-template',
  //   title: '模版分配',
  //   navLabel: '模版分配',
  //   icon: 'fas fa-clipboard-list',
  //   component: () => import('./components/TemplateAssignment.vue')
  // },
  {
    key: 'applet',
    path: 'applet',
    name: 'ssc-applet',
    title: '应用管理',
    navLabel: '应用管理',
    icon: 'fas fa-archive',
    component: () => import('./components/AppletManagement.vue')
  },
  {
    key: 'tag',
    path: 'tag',
    name: 'ssc-tag',
    title: '应用标签',
    navLabel: '应用标签',
    icon: 'fas fa-tags',
    component: () => import('./components/TagManagement.vue')
  },
  {
    key: 'param',
    path: 'param',
    name: 'ssc-param',
    title: '参数配置',
    navLabel: '参数配置',
    icon: 'fas fa-brackets-curly',
    component: () => import('./components/ParamSettings.vue')
  },
  {
    key: 'appres',
    path: 'appres',
    name: 'ssc-appres',
    title: '应用资源',
    navLabel: '应用资源',
    icon: 'fas fa-boxes',
    component: () => import('./components/AppResManagement.vue')
  },
  {
    key: 'email',
    path: 'email',
    name: 'ssc-email',
    title: '邮件设置',
    navLabel: '邮件设置',
    icon: 'fas fa-mail-bulk',
    component: () => import('./components/EmailSettings.vue')
  },
  {
    key: 'datasource',
    path: 'datasource',
    name: 'ssc-datasource',
    title: '数据源管理',
    navLabel: '数据源管理',
    icon: 'fas fa-code-merge',
    component: () => import('./components/DataSourceManagement.vue')
  },
  {
    key: 'engine',
    path: 'engine',
    name: 'ssc-engine',
    title: '引擎管理',
    navLabel: '引擎管理',
    icon: 'fas fa-car-battery',
    component: () => import('./components/EngineManagement.vue')
  },
  {
    key: 'scheduler',
    path: 'scheduler',
    name: 'ssc-scheduler',
    title: '计划任务',
    navLabel: '计划任务',
    icon: 'fas fa-clock',
    component: () => import('./components/TaskScheduler.vue')
  }
]
