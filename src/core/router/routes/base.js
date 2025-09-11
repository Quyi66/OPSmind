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
  {
    path: '/migration',
    name: 'migration-dashboard',
    component: () => import('@/views/MigrationDashboard.vue'),
    meta: {
      title: '迁移管理 - OPSmind',
      requiresAuth: true,
      requiresPermission: 'admin'
    }
  },
  // 功能模块路由
  {
    path: '/gfs',
    name: 'gfs',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'gfs-index',
        component: () => import('@/views/Dashboard.vue')
      }
    ],
    meta: {
      title: '脚本管理 - OPSmind',
      requiresAuth: true,
      moduleType: 'iframe',
      moduleCode: 'gfs'
    }
  },
  {
    path: '/jao',
    name: 'jao',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('@/views/Dashboard.vue')
      }
    ],
    meta: {
      title: '作业编排 - OPSmind',
      requiresAuth: true,
      moduleType: 'iframe',
      moduleCode: 'jao'
    }
  },
  {
    path: '/cmd',
    name: 'cmd',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('@/views/Dashboard.vue')
      }
    ],
    meta: {
      title: '命令管理 - OPSmind',
      requiresAuth: true,
      moduleType: 'iframe',
      moduleCode: 'cmd'
    }
  },
  {
    path: '/cac',
    name: 'cac',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('@/views/Dashboard.vue')
      }
    ],
    meta: {
      title: '系统巡检 - OPSmind',
      requiresAuth: true,
      moduleType: 'iframe',
      moduleCode: 'cac'
    }
  },
  {
    path: '/password',
    name: 'password',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('@/views/Dashboard.vue')
      }
    ],
    meta: {
      title: '密码管理 - OPSmind',
      requiresAuth: true,
      moduleType: 'iframe',
      moduleCode: 'password'
    }
  },
  {
    path: '/sudo',
    name: 'sudo',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('@/views/Dashboard.vue')
      }
    ],
    meta: {
      title: 'sudo权限管理 - OPSmind',
      requiresAuth: true,
      moduleType: 'iframe',
      moduleCode: 'sudo'
    }
  },
  {
    path: '/acm',
    name: 'acm',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('@/views/Dashboard.vue')
      }
    ],
    meta: {
      title: '资产管理 - OPSmind',
      requiresAuth: true,
      moduleType: 'iframe',
      moduleCode: 'acm'
    }
  },
  {
    path: '/patches',
    name: 'patches',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('@/views/Dashboard.vue')
      }
    ],
    meta: {
      title: '补丁管理 - OPSmind',
      requiresAuth: true,
      moduleType: 'iframe',
      moduleCode: 'patches'
    }
  },
  {
    path: '/software',
    name: 'software',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('@/views/Dashboard.vue')
      }
    ],
    meta: {
      title: '软件管理 - OPSmind',
      requiresAuth: true,
      moduleType: 'iframe',
      moduleCode: 'software'
    }
  },
  {
    path: '/workflow',
    name: 'workflow',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('@/views/Dashboard.vue')
      }
    ],
    meta: {
      title: '流程管理 - OPSmind',
      requiresAuth: true,
      moduleType: 'iframe',
      moduleCode: 'workflow'
    }
  },
  {
    path: '/users',
    name: 'users',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('@/views/Dashboard.vue')
      }
    ],
    meta: {
      title: '用户管理 - OPSmind',
      requiresAuth: true,
      moduleType: 'iframe',
      moduleCode: 'users'
    }
  },
  // 通配符路由 - 必须放在最后
  {
    path: '/:pathMatch(.*)*',
    redirect: '/error/404'
  }
]
