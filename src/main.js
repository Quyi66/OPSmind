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
import { appUrlManager } from '@/config/module-urls.config'
import { authService } from '@/core/auth'
import angularJSBridge from '@/services/angularjs-bridge'

// 导入全局样式
import '@/styles/main.scss'
// 确保 Element UI 和通用样式覆盖生效
import '@/styles/element-ui.scss'
import '@/styles/common.scss'

// 统一设置浏览器 Tab 图标（favicon）为 src/assets/icons/logo-opsmind@2x.png
try {
  const faviconHref = new URL('@/assets/icons/logo-opsmind@2x.png', import.meta.url).href
  const doc = document
  if (doc && doc.head) {
    let link = doc.querySelector('link[rel="icon"]') || doc.createElement('link')
    link.setAttribute('rel', 'icon')
    link.setAttribute('type', 'image/png')
    link.setAttribute('href', faviconHref)
    if (!link.parentNode) doc.head.appendChild(link)
  }
} catch { }

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

// 从 URL 中引导认证（用于新开 Tab 通过 ?token=... 免登录）
async function bootstrapAuthFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search || '')
    const tokenParam = appUrlManager.getTokenParam()
    const hasFlag = params.get('vue_auth') === 'true'
    const token = params.get(tokenParam)
    if (!hasFlag || !token) return

    // 已有会话则跳过
    if (authService.isAuthenticated()) return

    // 获取用户信息（使用 AngularJSBridge 的轻量 mock）
    let user = authService.getCurrentUser()
    if (!user) {
      try {
        user = await angularJSBridge.getUserInfo()
      } catch (e) {
        // 兜底用户（最少字段即可通过守卫）
        user = { id: 'link-user', login: 'linked', name: 'Linked User', role: 'user', permissions: [] }
      }
    }

    // 应用 token + 用户到会话（写入 sessionStorage）
    authService.setAuthState(token, user)

    // 安全起见，移除地址栏中的 token 参数（保留 hash）
    try {
      const { pathname, hash } = window.location
      const base = import.meta.env.BASE_URL || '/'
      const cleanUrl = `${pathname.startsWith(base) ? pathname : base}${hash || ''}`
      window.history.replaceState(null, '', cleanUrl)
    } catch { }
  } catch (e) {
    if (import.meta.env.DEV) console.warn('bootstrapAuthFromUrl failed:', e)
  }
}

// 等待 URL 认证引导完成，避免首跳触发登录页
await bootstrapAuthFromUrl()

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
} catch { }

// 暴露路由实例，供菜单等非组件模块访问（生产/开发环境均生效）
try {
  window.__VUE_ROUTER__ = router
} catch { }

// 开发环境下额外暴露调试对象
if (import.meta.env.DEV) {
  import('@/utils/single-iframe-manager').then(({ singleIframeManager }) => {
    window.singleIframeManager = singleIframeManager
    //console.log('🔧 singleIframeManager and router exposed to window for debugging')
  })
}

// 设置全局组件和指令
setupGlobalComponents(app)
setupGlobalDirectives(app)

// 挂载应用
app.mount('#app')

const allowedAngularOrigins = (() => {
  const origins = new Set()
  if (typeof window !== 'undefined' && window.location?.origin) {
    origins.add(window.location.origin)
  }
  try {
    const angularBase = appUrlManager.getAngularBaseUrl?.()
    if (angularBase) {
      const resolved = new URL(angularBase, window.location.origin)
      origins.add(resolved.origin)
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to resolve Angular base origin for message validation', error)
    }
  }
  return origins
})()

let angularAuthLogoutPending = false
window.addEventListener('message', event => {
  const message = event?.data
  if (!message || message.source !== 'oplus-angular') {
    return
  }

  const origin = event.origin || window.location.origin
  if (origin && !allowedAngularOrigins.has(origin)) {
    console.warn('⚠️ Ignoring Angular iframe message from unexpected origin', {
      origin,
      expected: Array.from(allowedAngularOrigins)
    })
    return
  }

  console.debug('📬 Message from Angular iframe', { origin, message })

  if (message.type === 'ANGULAR_AUTH_EXPIRED') {
    if (angularAuthLogoutPending) return
    angularAuthLogoutPending = true
    console.warn('🔐 AngularJS iframe reported expired authentication', message.payload)
    authService.logout()
  }
})

// 开发环境下的调试信息
if (import.meta.env.DEV) {
  //console.log('🚀 OPSmind Vue Dashboard started in development mode')
  //console.log('📍 Base URL:', import.meta.env.BASE_URL)
  //console.log('🔧 Environment:', import.meta.env.MODE)
}

// Vue Dashboard 作为主应用运行
//console.log('🎯 Vue Dashboard initialized as main application')
//console.log('🔗 Ready to integrate AngularJS modules')
