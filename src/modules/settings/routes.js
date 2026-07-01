/**
 * System settings (SSC) module route definitions.
 * Single source of truth for router + side nav.
 */

const systemSettingsModuleView = () => import('./views/SystemSettingsModule.vue')

function createSettingsPageRoute(name, component) {
  return {
    component: systemSettingsModuleView,
    children: [
      {
        path: '',
        name,
        component
      }
    ]
  }
}

export const UAM_ROUTE_DEFS = [
  {
    key: 'user',
    path: 'user',
    title: '用户列表',
    navLabel: '用户列表',
    icon: 'fas fa-users-cog',
    ...createSettingsPageRoute('uam-user', () => import('./views/UamUserPage.vue'))
  },
  {
    key: 'patch-assignment',
    path: 'patch-assignment',
    title: '补丁分配',
    navLabel: '补丁分配',
    icon: 'fas fa-band-aid',
    ...createSettingsPageRoute(
      'uam-patch-assignment',
      () => import('./views/UamPatchAssignmentPage.vue')
    )
  },
  {
    key: 'team',
    path: 'team',
    title: '团队管理',
    navLabel: '团队管理',
    icon: 'fas fa-sitemap',
    ...createSettingsPageRoute('uam-team', () => import('./views/UamTeamPage.vue'))
  }
]

export const SSC_ROUTE_DEFS = [
  {
    key: 'applet',
    path: 'applet',
    title: '应用管理',
    navLabel: '应用管理',
    icon: 'fas fa-archive',
    ...createSettingsPageRoute('ssc-applet', () => import('./views/SscAppletPage.vue'))
  },
  {
    key: 'tag',
    path: 'tag',
    title: '应用标签',
    navLabel: '应用标签',
    icon: 'fas fa-tags',
    ...createSettingsPageRoute('ssc-tag', () => import('./views/SscTagPage.vue'))
  },
  {
    key: 'param',
    path: 'param',
    title: '参数配置',
    navLabel: '参数配置',
    icon: 'fas fa-brackets-curly',
    ...createSettingsPageRoute('ssc-param', () => import('./views/SscParamPage.vue'))
  },
  {
    key: 'sql-import',
    path: 'sql-import',
    title: 'SQL导入',
    navLabel: 'SQL导入',
    icon: 'fas fa-file-import',
    accessCode: 'super-admin',
    meta: {
      requiresPermission: 'admin'
    },
    ...createSettingsPageRoute('ssc-sql-import', () => import('./views/SscSqlImportPage.vue'))
  },
  {
    key: 'appres',
    path: 'appres',
    title: '应用资源',
    navLabel: '应用资源',
    icon: 'fas fa-boxes',
    ...createSettingsPageRoute('ssc-appres', () => import('./views/SscAppResPage.vue'))
  },
  {
    key: 'email',
    path: 'email',
    title: '邮件设置',
    navLabel: '邮件设置',
    icon: 'fas fa-mail-bulk',
    ...createSettingsPageRoute('ssc-email', () => import('./views/SscEmailPage.vue'))
  },
  {
    key: 'datasource',
    path: 'datasource',
    title: '数据源管理',
    navLabel: '数据源管理',
    icon: 'fas fa-code-merge',
    ...createSettingsPageRoute('ssc-datasource', () => import('./views/SscDataSourcePage.vue'))
  },
  {
    key: 'engine',
    path: 'engine',
    title: '引擎管理',
    navLabel: '引擎管理',
    icon: 'fas fa-car-battery',
    ...createSettingsPageRoute('ssc-engine', () => import('./views/SscEnginePage.vue'))
  },
  {
    key: 'scheduler',
    path: 'scheduler',
    title: '计划任务',
    navLabel: '计划任务',
    icon: 'fas fa-clock',
    ...createSettingsPageRoute('ssc-scheduler', () => import('./views/SscTaskSchedulerPage.vue'))
  }
]
