import { createRouter, createWebHashHistory, type Router, type RouteRecordRaw } from 'vue-router'
// 使用按需加载，避免潜在的循环依赖导致的初始化错误
import Login from '@/views/Login.vue'
import { authService } from '@/core/auth'
import type { CustomRouteRecord } from '@/types/router'

const routes: CustomRouteRecord[] = [
  {
    path: '/',
    redirect: '/home'
  },
  
  {
    path: '/login',
    name: 'login',
    component: Login,
    meta: {
      title: '登录 - OpsMind',
      requiresGuest: true
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
      requiresAuth: true
    }
  },
  // 二级功能路由：#/一级功能/二级功能
  {
    path: '/:groupCode/:moduleCode',
    name: 'feature-grouped',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('@/views/Dashboard.vue')
      }
    ],
    meta: {
      title: 'OpsMind 模块',
      requiresAuth: true
    }
  },
  {
    path: '/module/:moduleCode',
    name: 'module',
    component: () => import('@/views/ModulePage.vue'),
    meta: {
      title: '模块页面',
      requiresAuth: true
    }
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/About.vue'),
    meta: {
      title: '关于'
    }
  },
  // 直达二级功能的短路径（例如 /cmd、/jao）。必须放在最后，避免与显式路由冲突
  {
    path: '/:moduleCode',
    name: 'feature-shortcut',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('@/views/Dashboard.vue')
      }
    ],
    meta: {
      title: 'OpsMind 模块',
      requiresAuth: true
    }
  }
]

const router: Router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: routes as RouteRecordRaw[]
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  // 设置页面标题
  if (to.meta?.title) {
    document.title = to.meta.title as string
  }

  // 如果是从登录页面跳转到主页面，延迟一下确保认证状态已更新
  if (from.path === '/login' && to.path === '/home') {
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  const isAuthenticated = authService.isAuthenticated()
  const currentUser = authService.getCurrentUser()

  console.log('🛡️ Route guard:', {
    from: from.path,
    to: to.path,
    isAuthenticated,
    hasUser: !!currentUser,
    userLogin: currentUser?.login,
    requiresAuth: to.meta?.requiresAuth,
    requiresGuest: to.meta?.requiresGuest
  })

  if (to.meta?.requiresAuth && !isAuthenticated) {
    // 需要认证但未登录，跳转到登录页
    console.log('🔒 Redirecting to login')
    next('/login')
  } else if (to.meta?.requiresGuest && isAuthenticated) {
    // 已登录用户访问登录页，跳转到仪表盘
    console.log('✅ Already authenticated, redirecting to home')
    next('/home')
  } else {
    next()
  }
})

export default router
