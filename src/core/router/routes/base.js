/**
 * 基础路由配置
 * 按一级菜单分组组织路由，使用动态路由参数让同一分组内的模块共享布局组件
 * 这样在同一分组内切换模块时，侧边菜单不会重新加载
 */

// 同步导入布局组件
import MainLayout from '@/layouts/MainLayout.vue'
import { PATCHES_ROUTE_DEFS } from '@/modules/patches/routes.js'
import { SOFTWARE_ROUTE_DEFS } from '@/modules/software/routes.js'
import { CAC_ROUTE_DEFS } from '@/modules/inspection/routes.js'
import { ACM_ROUTE_DEFS } from '@/modules/asset/routes.js'
import { USERS_ROUTE_DEFS } from '@/modules/user/routes.js'
import { JAO_ROUTE_DEFS, GFS_ROUTE_DEFS, CMD_ROUTE_DEFS } from '@/modules/automation/routes.js'
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
const FlowGroupLayout = () => import('@/layouts/groups/FlowGroupLayout.vue')
const SecurityGroupLayout = () => import('@/layouts/groups/SecurityGroupLayout.vue')

const buildModuleChildren = (defs, moduleCode) =>
  defs.map(def => {
    const route = {
      path: def.path,
      component: def.component,
      meta: { title: def.title, moduleCode }
    }

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
const softwareChildren = buildModuleChildren(SOFTWARE_ROUTE_DEFS, 'software')
const jaoChildren = buildModuleChildren(JAO_ROUTE_DEFS, 'jao')
const gfsChildren = buildModuleChildren(GFS_ROUTE_DEFS, 'gfs')
const cmdChildren = buildModuleChildren(CMD_ROUTE_DEFS, 'cmd')
const flowChildren = buildModuleChildren(FLOW_ROUTE_DEFS, 'flow')
const sudoChildren = buildModuleChildren(SUDO_ROUTE_DEFS, 'sudo')
const passwordChildren = buildModuleChildren(PASSWORD_ROUTE_DEFS, 'password')
const uamChildren = buildModuleChildren(UAM_ROUTE_DEFS, 'uam')
const sscChildren = buildModuleChildren(SSC_ROUTE_DEFS, 'ssc')

export const baseRoutes = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/aiops',
    name: 'aiops',
    component: () => import('@/views/AiOpsAssistant.vue'),
    meta: {
      title: 'OPS智能助手',
      requiresAuth: true
    }
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/Login.vue'),
    meta: {
      title: '登录 - OPSmind',
      requiresGuest: true,
      layout: 'auth'
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
        component: () => import('@/views/Dashboard.vue')
      }
    ],
    meta: {
      title: 'OPSmind 仪表盘',
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
      title: '个人资料 - OPSmind',
      requiresAuth: true
    },
    children: [
      {
        path: '',
        name: 'settings-index',
        component: () => import('@/views/ProfileSettings.vue')
      }
    ]
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/About.vue'),
    meta: {
      title: '关于 - OPSmind'
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
    component: () => import('@/views/Error404.vue'),
    meta: {
      title: '未找到页面'
    }
  },
  {
    path: '/migration',
    name: 'migration-dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: {
      title: '迁移管理 - OPSmind',
      requiresAuth: true,
      requiresPermission: 'admin'
    }
  },

  // ========== 自动化分组 (jao, gfs, cmd, users) ==========
  // 使用动态路由参数，让同一分组内的模块共享 AutomationGroupLayout
  {
    path: '/:moduleCode(jao|gfs|cmd|users)',
    component: MainLayout,
    meta: { requiresAuth: true, moduleType: 'vue-native', groupCode: 'automation' },
    children: [
      {
        path: '',
        component: AutomationGroupLayout,
        children: [
          // 自动化分组模块路由
          {
            path: '',
            redirect: to => {
              const defaults = {
                jao: '/jao/jobs',
                gfs: '/gfs/scriptLibrary',
                cmd: '/cmd/list',
                users: '/users/overview'
              }
              return defaults[to.params.moduleCode] || '/jao/jobs'
            }
          },
          ...jaoChildren,
          ...gfsChildren,
          ...cmdChildren,
          ...usersChildren
        ]
      }
    ]
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
        redirect: '/patches/cveList',
        children: [...patchesChildren]
      }
    ]
  },

  // ========== 软件管理 (software) ==========
  {
    path: '/software',
    component: MainLayout,
    meta: { requiresAuth: true, moduleType: 'vue-native', groupCode: 'patch-testing' },
    children: [
      {
        path: '',
        component: PatchGroupLayout,
        redirect: '/software/packages',
        children: [
          ...softwareChildren
        ]
      }
    ]
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

  // ========== 流程管理分组 (flow) ==========
  {
    path: '/:moduleCode(flow)',
    component: MainLayout,
    meta: { requiresAuth: true, moduleType: 'vue-native', groupCode: 'flow-management' },
    children: [
      {
        path: '',
        component: FlowGroupLayout,
        children: [
          // 动态重定向
          {
            path: '',
            redirect: to => '/flow/list'
          },
          ...flowChildren
        ]
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
        children: [
          ...passwordChildren
        ]
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
