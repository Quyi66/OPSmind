/**
 * 测试路由配置
 * 仅在开发环境使用
 */

export const testRoutes = [
  {
    path: '/test',
    name: 'test',
    component: () => import('@/views/TestView.vue'),
    meta: {
      title: '测试页面',
      requiresAuth: false
    }
  },
  {
    path: '/tailwind-test',
    name: 'TailwindTest',
    component: () => import('@/views/TailwindTest.vue'),
    meta: {
      title: 'Tailwind CSS 测试',
      requiresAuth: false
    }
  }
]
