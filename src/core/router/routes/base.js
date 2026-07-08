/**
 * 基础路由配置（使用统一注册中心动态注册）
 * 按一级菜单分组组织路由，使用动态路由参数让同一分组内的模块共享布局组件
 * 这样在同一分组内切换模块时，侧边菜单不会重新加载
 */

// 同步导入布局组件
import MainLayout from '@/layouts/MainLayout.vue'
import { registeredModules } from '@/modules/registry'

// 分组布局组件（懒加载）
const AutomationGroupLayout = () => import('@/layouts/groups/AutomationGroupLayout.vue')
const PatchGroupLayout = () => import('@/layouts/groups/PatchGroupLayout.vue')
const InspectionGroupLayout = () => import('@/layouts/groups/InspectionGroupLayout.vue')
const AssetGroupLayout = () => import('@/layouts/groups/AssetGroupLayout.vue')
const UserGroupLayout = () => import('@/layouts/groups/UserGroupLayout.vue')
const SettingsGroupLayout = () => import('@/layouts/groups/SettingsGroupLayout.vue')
const HostAccountGroupLayout = () => import('@/layouts/groups/FlowGroupLayout.vue')
const SecurityGroupLayout = () => import('@/layouts/groups/SecurityGroupLayout.vue')

const GROUP_LAYOUTS = {
  'asset-management': AssetGroupLayout,
  'automation': AutomationGroupLayout,
  'patch-testing': PatchGroupLayout,
  'system-inspection': InspectionGroupLayout,
  'flow-management': HostAccountGroupLayout,
  'user-management': UserGroupLayout,
  'security-management': SecurityGroupLayout,
  'system-settings': SettingsGroupLayout
}

const buildModuleChildren = (defs, moduleCode, menuCodeOverride) =>
  defs.map(def => {
    const route = {
      path: def.path,
      component: def.component,
      meta: {
        title: def.title,
        moduleCode,
        menuCode: def.menuCode || menuCodeOverride || moduleCode,
        ...(def.meta || {})
      }
    }

    if (def.alias) route.alias = def.alias
    if (def.name) route.name = def.name
    if (def.props) route.props = def.props
    if (def.redirect) route.redirect = def.redirect
    if (def.children) route.children = def.children

    return route
  })

// 动态根据模块列表派生路由
const derivedModuleRoutes = registeredModules
  .filter(m => !m.isVirtual)
  .map(m => {
    const children = buildModuleChildren(m.routes || [], m.code, m.menuCodeOverride)
    return {
      path: `/${m.code}`,
      component: MainLayout,
      meta: {
        requiresAuth: true,
        ...(m.routePermission ? { requiresPermission: m.routePermission } : {}),
        moduleType: 'vue-native',
        moduleCode: m.code,
        groupCode: m.groupCode
      },
      children: [
        {
          path: '',
          component: GROUP_LAYOUTS[m.groupCode],
          redirect: m.defaultRoute,
          children
        }
      ]
    }
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

  {
    path: '/rpm-install/:pathMatch(.*)*',
    redirect: '/patches/localInstall'
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

  // 动态派生的业务模块路由
  ...derivedModuleRoutes,

  // 通配符路由 - 必须放在最后
  {
    path: '/:pathMatch(.*)*',
    redirect: '/error/404'
  }
]

export const BASE_REGISTERED_MODULES = new Set(
  registeredModules.filter(m => !m.isVirtual).map(m => m.code)
)
