/**
 * 基础路由配置
 */

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
    component: () => import('@/layouts/MainLayout.vue'),
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
    // 回退到仪表盘，原 MigrationDashboard.vue 缺失
    component: () => import('@/views/Dashboard.vue'),
    meta: {
      title: '迁移管理 - OPSmind',
      requiresAuth: true,
      requiresPermission: 'admin'
    }
  },
  // 通配符路由 - 必须放在最后
  {
    path: '/:pathMatch(.*)*',
    redirect: '/error/404'
  }
]
