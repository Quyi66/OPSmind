import { createRouter, createWebHashHistory } from 'vue-router'
import Dashboard from '@/views/Dashboard.vue'
import Login from '@/views/Login.vue'
import { authService } from '@/services/auth'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
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
      component: Dashboard,
      meta: {
        title: 'OpsMind 仪表盘',
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

    {
      path: '/modules/:moduleCode',
      name: 'angular-module',
      component: () => import('@/views/AngularModuleView.vue'),
      meta: {
        title: 'Angular 模块',
        requiresAuth: true
      }
    },
    // CAC 模块专用路由
    {
      path: '/cac',
      name: 'cac-module',
      component: () => import('@/views/AngularModuleView.vue'),
      meta: {
        title: 'CAC 配置管理',
        requiresAuth: true
      },
      beforeEnter: (to, from, next) => {
        // 设置模块代码
        to.params.moduleCode = 'cac'
        next()
      }
    },
    {
      path: '/test/angular-integration',
      name: 'angular-integration-test',
      component: () => import('@/views/AngularIntegrationTest.vue'),
      meta: {
        title: 'AngularJS 集成测试',
        requiresAuth: true
      }
    },
    {
      path: '/test/cac-module',
      name: 'cac-module-test',
      component: () => import('@/views/CacModuleTest.vue'),
      meta: {
        title: 'CAC 模块测试',
        requiresAuth: true
      }
    }
  ]
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = to.meta.title
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
    requiresAuth: to.meta.requiresAuth,
    requiresGuest: to.meta.requiresGuest
  })

  if (to.meta.requiresAuth && !isAuthenticated) {
    // 需要认证但未登录，跳转到登录页
    console.log('🔒 Redirecting to login')
    next('/login')
  } else if (to.meta.requiresGuest && isAuthenticated) {
    // 已登录用户访问登录页，跳转到仪表盘
    console.log('✅ Already authenticated, redirecting to home')
    next('/home')
  } else {
    next()
  }
})

export default router
