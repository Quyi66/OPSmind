import { SSC_ROUTE_DEFS, UAM_ROUTE_DEFS } from './routes.js'

export const sscModule = {
  code: 'ssc',
  groupCode: 'system-settings',
  name: '系统设置',
  icon: 'fas fa-cogs',
  description: '系统配置与平台管理',
  permissions: ['applet:uim'],
  defaultRoute: '/ssc/applet',
  routes: SSC_ROUTE_DEFS
}

export const uamModule = {
  code: 'uam',
  groupCode: 'user-management',
  name: '用户管理',
  icon: 'fas fa-users-cog',
  description: '平台用户与团队管理',
  permissions: ['applet:uim'],
  defaultRoute: '/uam/user',
  routes: UAM_ROUTE_DEFS
}
