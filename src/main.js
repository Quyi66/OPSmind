import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import { setupRouter } from '@/core/router'
import { setupGlobalComponents } from '@/shared/components'
import { setupGlobalDirectives } from '@/shared/directives'
import { setupErrorHandler } from '@/core/error'
import { setupPerformanceMonitor } from '@/core/performance'
import { initPerformanceOptimizations } from '@/utils/performance-optimizer'
import { applyIframeResourceFix } from '@/utils/iframe-resource-fix'

// 导入全局样式
import '@/styles/main.scss'

// 创建应用实例
const app = createApp(App)

// 设置错误处理
setupErrorHandler(app)

// 设置性能监控
if (import.meta.env.DEV) {
  setupPerformanceMonitor(app)

  // 引入认证调试工具
  import('./utils/auth-debug.js')
}

// 初始化性能优化
initPerformanceOptimizations()

// 应用iframe资源修复
applyIframeResourceFix()

// 注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 设置插件
app.use(createPinia())
app.use(ElementPlus)

// 规范化基础路径：将 /ops 重写为 /ops/（保留查询与 hash）
function normalizeBaseTrailingSlash() {
  try {
    if (typeof window === 'undefined') return
    const rawBase = import.meta.env.BASE_URL || '/'
    const base = String(rawBase)
    if (base === '/') return
    const needsSlash = base.endsWith('/') ? base : `${base}/`
    const noSlash = needsSlash.slice(0, -1)
    const { pathname, search, hash } = window.location
    if (pathname === noSlash) {
      const target = `${needsSlash}${search || ''}${hash || ''}`
      if (window.history && typeof window.history.replaceState === 'function') {
        window.history.replaceState(null, '', target)
      } else {
        window.location.replace(target)
      }
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn('normalizeBaseTrailingSlash failed:', e)
  }
}
normalizeBaseTrailingSlash()

// 设置路由
const router = setupRouter()
app.use(router)

// 若访问为 /ops 或 /ops/ 且没有 hash，自动导航到 #/home
try {
  const base = import.meta.env.BASE_URL || '/'
  const noSlash = base.endsWith('/') ? base.slice(0, -1) : base
  const { pathname, hash } = window.location
  if ((pathname === base || pathname === noSlash) && (!hash || hash === '#')) {
    router.replace('/home')
  }
} catch {}

// 暴露路由实例，供菜单等非组件模块访问（生产/开发环境均生效）
try {
  window.__VUE_ROUTER__ = router
} catch {}

// 开发环境下额外暴露调试对象
if (import.meta.env.DEV) {
  import('@/utils/single-iframe-manager').then(({ singleIframeManager }) => {
    window.singleIframeManager = singleIframeManager
    console.log('🔧 singleIframeManager and router exposed to window for debugging')
  })
}

// 设置全局组件和指令
setupGlobalComponents(app)
setupGlobalDirectives(app)

// 挂载应用
app.mount('#app')

// 开发环境下的调试信息
if (import.meta.env.DEV) {
  console.log('🚀 OPSmind Vue Dashboard started in development mode')
  console.log('📍 Base URL:', import.meta.env.BASE_URL)
  console.log('🔧 Environment:', import.meta.env.MODE)
}

// Vue Dashboard 作为主应用运行
console.log('🎯 Vue Dashboard initialized as main application')
console.log('🔗 Ready to integrate AngularJS modules')
