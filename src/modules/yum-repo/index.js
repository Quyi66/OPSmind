import { YUM_REPO_ROUTE_DEFS } from './routes.js'

export const yumRepoModule = {
  code: 'yum-repo',
  groupCode: 'patch-testing',
  name: 'Yum仓库管理',
  icon: 'fas fa-database',
  description: 'Yum 仓库管理与源清单查看',
  permissions: ['applet:spm', 'applet:vap'],
  routePermission: 'applet:spm',
  defaultRoute: '/yum-repo/repos',
  routes: YUM_REPO_ROUTE_DEFS,
  menuCodeOverride: 'patches' // 强制覆盖子路由的 menuCode 归属，使其在侧边栏选中 patches
}
