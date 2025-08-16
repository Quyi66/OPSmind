/**
 * 基础路由配置
 */

export const baseRoutes = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/Login.vue'),
    meta: {
      title: '登录 - OpsMind',
      requiresGuest: true,
      layout: 'auth'
    }
  },
  {
    path: '/home',
    name: 'home',
    component: () => import('@/modules/dashboard/views/Dashboard.vue'),
    meta: {
      title: 'OpsMind 仪表盘',
      requiresAuth: true,
      moduleType: 'vue-native',
      moduleCode: 'dashboard'
    }
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/About.vue'),
    meta: {
      title: '关于 - OpsMind'
    }
  },
  {
    path: '/migration',
    name: 'migration-dashboard',
    component: () => import('@/views/MigrationDashboard.vue'),
    meta: {
      title: '迁移管理 - OpsMind',
      requiresAuth: true,
      requiresPermission: 'admin'
    }
  },
  // 错误页面
  {
    path: '/error/403',
    name: 'error-403',
    component: () => import('@/views/error/Error403.vue'),
    meta: {
      title: '访问被拒绝'
    }
  },
  {
    path: '/error/404',
    name: 'error-404',
    component: () => import('@/views/error/Error404.vue'),
    meta: {
      title: '页面未找到'
    }
  },
  {
    path: '/error/500',
    name: 'error-500',
    component: () => import('@/views/error/Error500.vue'),
    meta: {
      title: '服务器错误'
    }
  },
  // 通配符路由 - 必须放在最后
  {
    path: '/:pathMatch(.*)*',
    redirect: '/error/404'
  }
]
