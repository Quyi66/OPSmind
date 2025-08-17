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
    component: () => import('@/views/Login.vue'),
    meta: {
      title: '登录 - OpsMind',
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
        component: () => import('@/views/Dashboard.vue')
      }
    ],
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
  // 通配符路由 - 必须放在最后
  {
    path: '/:pathMatch(.*)*',
    redirect: '/error/404'
  }
]
