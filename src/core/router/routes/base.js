/**
 * 基础路由配置
 * 按一级菜单分组组织路由，使用动态路由参数让同一分组内的模块共享布局组件
 * 这样在同一分组内切换模块时，侧边菜单不会重新加载
 */

// 同步导入布局组件
import MainLayout from '@/layouts/MainLayout.vue'
import { PATCHES_ROUTE_DEFS } from '@/modules/patches/routes.js'
import { YUM_REPO_ROUTE_DEFS } from '@/modules/yum-repo/routes.js'
import { CAC_ROUTE_DEFS } from '@/modules/inspection/routes.js'
import { ACM_ROUTE_DEFS } from '@/modules/asset/routes.js'
import { USERS_ROUTE_DEFS } from '@/modules/user/routes.js'
import {
  AUTO_WORKBENCH_ROUTE_DEFS,
  JAO_ROUTE_DEFS,
  RUN_RECORDS_ROUTE_DEFS,
  GFS_ROUTE_DEFS,
  CMD_ROUTE_DEFS
} from '@/modules/automation/routes.js'
import { FLOW_ROUTE_DEFS } from '@/modules/flow/routes.js'
import { SUDO_ROUTE_DEFS } from '@/modules/sudo/routes.js'
import { PASSWORD_ROUTE_DEFS } from '@/modules/password/routes.js'
import { SSC_ROUTE_DEFS, UAM_ROUTE_DEFS } from '@/modules/settings/routes.js'

// 分组布局组件（懒加载）
const AutomationGroupLayout = () => import('@/layouts/groups/AutomationGroupLayout.vue')
const PatchGroupLayout = () => import('@/layouts/groups/PatchGroupLayout.vue')
const InspectionGroupLayout = () => import('@/layouts/groups/InspectionGroupLayout.vue')
const AssetGroupLayout = () => import('@/layouts/groups/AssetGroupLayout.vue')
const UserGroupLayout = () => import('@/layouts/groups/UserGroupLayout.vue')
const SettingsGroupLayout = () => import('@/layouts/groups/SettingsGroupLayout.vue')
const HostAccountGroupLayout = () => import('@/layouts/groups/FlowGroupLayout.vue')
const SecurityGroupLayout = () => import('@/layouts/groups/SecurityGroupLayout.vue')

const buildModuleChildren = (defs, moduleCode) =>
  defs.map(def => {
    const route = {
      path: def.path,
      component: def.component,
      meta: { title: def.title, moduleCode, ...(def.meta || {}) }
    }

    if (def.alias) route.alias = def.alias
    if (def.name) route.name = def.name
    if (def.props) route.props = def.props
    if (def.redirect) route.redirect = def.redirect
    if (def.children) route.children = def.children

    return route
  })

const patchesChildren = buildModuleChildren(PATCHES_ROUTE_DEFS, 'patches')
const cacChildren = buildModuleChildren(CAC_ROUTE_DEFS, 'cac')
const acmChildren = buildModuleChildren(ACM_ROUTE_DEFS, 'acm')
const usersChildren = buildModuleChildren(USERS_ROUTE_DEFS, 'users')
const yumRepoChildren = buildModuleChildren(YUM_REPO_ROUTE_DEFS, 'yum-repo')
const autoWorkbenchChildren = buildModuleChildren(AUTO_WORKBENCH_ROUTE_DEFS, 'auto-workbench')
const jaoChildren = buildModuleChildren(JAO_ROUTE_DEFS, 'jao')
const runRecordsChildren = buildModuleChildren(RUN_RECORDS_ROUTE_DEFS, 'run-records')
const gfsChildren = buildModuleChildren(GFS_ROUTE_DEFS, 'gfs')
const cmdChildren = buildModuleChildren(CMD_ROUTE_DEFS, 'cmd')
const flowChildren = buildModuleChildren(FLOW_ROUTE_DEFS, 'flow')
const sudoChildren = buildModuleChildren(SUDO_ROUTE_DEFS, 'sudo')
const passwordChildren = buildModuleChildren(PASSWORD_ROUTE_DEFS, 'password')
const uamChildren = buildModuleChildren(UAM_ROUTE_DEFS, 'uam')
const sscChildren = buildModuleChildren(SSC_ROUTE_DEFS, 'ssc')

const buildAutomationModuleRoute = (moduleCode, redirect, children) => ({
  path: `/${moduleCode}`,
  component: MainLayout,
  meta: {
    requiresAuth: true,
    moduleType: 'vue-native',
    moduleCode,
    groupCode: 'automation'
  },
  children: [
    {
      path: '',
      component: AutomationGroupLayout,
      redirect,
      children: [...children]
    }
  ]
})

export const baseRoutes = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/aiops',
    name: 'aiops',
    component: () => import('@/views/aiops/AiOpsAssistantPage.vue'),
    meta: {
      title: 'OPS智能助手',
      requiresAuth: true
    }
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginPage.vue'),
    meta: {
      title: '登录 - KoreOPS',
      requiresGuest: true,
      layout: 'auth'
    }
  },
  {
    path: '/redirect/:path(.*)',
    component: MainLayout,
    children: [
      {
        path: '',
        component: () => import('@/views/redirect/index.vue')
      }
    ],
    meta: {
      requiresAuth: true
    }
  },
  {
    path: '/home',
    name: 'home',
    component: MainLayout,
    children: [
      {
        path: '',
        name: 'home-index',
        component: () => import('@/views/home/HomePage.vue'),
        meta: { title: '首页' }
      }
    ],
    meta: {
      title: 'KoreOPS 仪表盘',
      requiresAuth: true,
      moduleType: 'vue-native',
      moduleCode: 'dashboard'
    }
  },
  // 个人资料页面
  {
    path: '/settings',
    name: 'settings',
    component: MainLayout,
    meta: {
      title: '个人资料 - KoreOPS',
      requiresAuth: true
    },
    children: [
      {
        path: '',
        name: 'settings-index',
        component: () => import('@/views/settings/ProfileSettingsPage.vue'),
        meta: { title: '个人资料' }
      }
    ]
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/about/AboutPage.vue'),
    meta: {
      title: '关于 - KoreOPS'
    }
  },
  // 管理后台
  {
    path: '/admin/:group?/:page?',
    name: 'admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: {
      title: '管理后台',
      requiresAuth: true
    }
  },
  // 错误页 - 404
  {
    path: '/error/404',
    name: 'error-404',
    component: () => import('@/views/error/Error404Page.vue'),
    meta: {
      title: '未找到页面'
    }
  },
  {
    path: '/migration',
    name: 'migration-dashboard',
    component: () => import('@/views/home/HomePage.vue'),
    meta: {
      title: '迁移管理 - KoreOPS',
      requiresAuth: true,
      requiresPermission: 'admin'
    }
  },

  // ========== 自动化分组 (jao, run-records, gfs, cmd, flow) ==========
  // 按模块分别挂载，避免 logs 等重复子路径在同一父级下发生匹配冲突
  buildAutomationModuleRoute('auto-workbench', '/auto-workbench/overview', autoWorkbenchChildren),
  buildAutomationModuleRoute('jao', '/jao/jobs', jaoChildren),
  buildAutomationModuleRoute('run-records', '/run-records/logs', runRecordsChildren),
  buildAutomationModuleRoute('gfs', '/gfs/scriptLibrary', gfsChildren),
  buildAutomationModuleRoute('cmd', '/cmd/list', cmdChildren),
  buildAutomationModuleRoute('flow', '/flow/list', flowChildren),

  {
    path: '/rpm-install/:pathMatch(.*)*',
    redirect: '/patches/localInstall'
  },

  // ========== 补丁管理 (patches) ==========
  {
    path: '/patches',
    component: MainLayout,
    meta: { requiresAuth: true, moduleType: 'vue-native', groupCode: 'patch-testing' },
    children: [
      {
        path: '',
        component: PatchGroupLayout,
        redirect: '/patches/machineScan',
        children: [...patchesChildren]
      }
    ]
  },

  // ========== Yum仓库管理 (yum-repo) ==========
  {
    path: '/yum-repo',
    component: MainLayout,
    meta: {
      requiresAuth: true,
      moduleType: 'vue-native',
      moduleCode: 'yum-repo',
      groupCode: 'patch-testing',
      requiresPermission: 'applet:spm'
    },
    children: [
      {
        path: '',
        component: PatchGroupLayout,
        redirect: '/yum-repo/repos',
        children: [...yumRepoChildren]
      }
    ]
  },

  {
    path: '/software/:pathMatch(.*)*',
    redirect: to => {
      const pathMatch = Array.isArray(to.params.pathMatch)
        ? to.params.pathMatch.join('/')
        : String(to.params.pathMatch || '').trim()

      return pathMatch ? `/yum-repo/${pathMatch}` : '/yum-repo/repos'
    }
  },

  // ========== 系统巡检分组 (cac) - 单模块分组 ==========
  {
    path: '/cac',
    component: MainLayout,
    meta: {
      requiresAuth: true,
      moduleType: 'vue-native',
      moduleCode: 'cac',
      groupCode: 'system-inspection'
    },
    children: [
      {
        path: '',
        component: InspectionGroupLayout,
        redirect: '/cac/overview',
        children: [...cacChildren]
      }
    ]
  },

  // ========== 资产管理分组 (acm) - 单模块分组 ==========
  {
    path: '/acm',
    component: MainLayout,
    meta: {
      requiresAuth: true,
      moduleType: 'vue-native',
      moduleCode: 'acm',
      groupCode: 'asset-management'
    },
    children: [
      {
        path: '',
        component: AssetGroupLayout,
        redirect: '/acm/overview',
        children: [...acmChildren]
      }
    ]
  },

  // ========== 主机用户管理分组 (users) ==========
  {
    path: '/users',
    component: MainLayout,
    meta: {
      requiresAuth: true,
      moduleType: 'vue-native',
      moduleCode: 'users',
      groupCode: 'flow-management'
    },
    children: [
      {
        path: '',
        component: HostAccountGroupLayout,
        redirect: '/users/users',
        children: [...usersChildren]
      }
    ]
  },

  // ========== sudo权限管理 (安全中心) ==========
  {
    path: '/sudo',
    component: MainLayout,
    meta: { requiresAuth: true, moduleType: 'vue-native', groupCode: 'security-management' },
    children: [
      {
        path: '',
        component: SecurityGroupLayout,
        redirect: '/sudo/permission',
        children: [...sudoChildren]
      }
    ]
  },

  // ========== 密码管理 (安全中心) ==========
  {
    path: '/password',
    component: MainLayout,
    meta: { requiresAuth: true, moduleType: 'vue-native', groupCode: 'security-management' },
    children: [
      {
        path: '',
        component: SecurityGroupLayout,
        redirect: '/password/application',
        children: [...passwordChildren]
      }
    ]
  },

  // ========== 用户管理分组 (uam) ==========
  {
    path: '/uam',
    component: MainLayout,
    meta: {
      requiresAuth: true,
      moduleType: 'vue-native',
      groupCode: 'user-management',
      moduleCode: 'uam'
    },
    children: [
      {
        path: '',
        component: UserGroupLayout,
        redirect: '/uam/user',
        children: [...uamChildren]
      }
    ]
  },

  // ========== 系统设置分组 (ssc) ==========
  {
    path: '/ssc',
    component: MainLayout,
    meta: {
      requiresAuth: true,
      moduleType: 'vue-native',
      groupCode: 'system-settings',
      moduleCode: 'ssc'
    },
    children: [
      {
        path: '',
        component: SettingsGroupLayout,
        redirect: '/ssc/applet',
        children: [...sscChildren]
      }
    ]
  },

  // 通配符路由 - 必须放在最后
  {
    path: '/:pathMatch(.*)*',
    redirect: '/error/404'
  }
]
