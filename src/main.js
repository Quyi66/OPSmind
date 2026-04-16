import { createApp } from 'vue'
import { createPinia } from 'pinia'
// Element Plus - 按需导入命令式组件和样式
import { ElDialog, ElMessage, ElMessageBox, ElLoading, ElNotification } from 'element-plus'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
// Element Plus 核心样式（按需导入，减少未使用 CSS）
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import 'element-plus/es/components/loading/style/css'
import 'element-plus/es/components/notification/style/css'
import 'element-plus/theme-chalk/el-overlay.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import '@/composables/useTheme' // 初始化暗黑模式判断与监听

import App from './App.vue'
import { setupRouter } from '@/core/router'
import { setupGlobalComponents } from '@/shared/components'
import { setupGlobalDirectives } from '@/shared/directives'
import { setupErrorHandler } from '@/core/error'
import { deferStyleChunks, initPerformanceOptimizations } from '@/utils/performance-optimizer'
import { appUrlManager } from '@/config/module-urls.config'
import { authService } from '@/core/auth'
import angularJSBridge from '@/services/angularjs-bridge'

// 导入全局样式
import '@/styles/main.scss'
// 延迟加载非关键样式，减少首屏阻塞

const ASSET_REFRESH_MARKER_KEY = 'opsmind:asset-refresh-at'
const ASSET_REFRESH_WINDOW_MS = 15000

function isStaleAssetError(errorLike) {
  const message = String(errorLike?.message || errorLike?.reason?.message || errorLike || '')
  return (
    message.includes('ChunkLoadError') ||
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('Unable to preload CSS')
  )
}

function maybeReloadForUpdatedAssets() {
  try {
    const now = Date.now()
    const lastRefreshAt = Number(sessionStorage.getItem(ASSET_REFRESH_MARKER_KEY) || '0')

    if (lastRefreshAt && now - lastRefreshAt < ASSET_REFRESH_WINDOW_MS) {
      ElMessage.error('检测到页面资源版本不一致，请手动刷新页面')
      return false
    }

    sessionStorage.setItem(ASSET_REFRESH_MARKER_KEY, String(now))
    ElMessage.warning('检测到前端已更新，正在刷新页面以加载最新资源')
    window.setTimeout(() => window.location.reload(), 150)
    return true
  } catch {
    window.location.reload()
    return true
  }
}

window.addEventListener('error', (event) => {
  if (isStaleAssetError(event?.error || event?.message)) {
    maybeReloadForUpdatedAssets()
  }
})

window.addEventListener('unhandledrejection', (event) => {
  if (isStaleAssetError(event?.reason)) {
    maybeReloadForUpdatedAssets()
  }
})

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
} catch {}

// 创建应用实例
const app = createApp(App)

// 设置错误处理
setupErrorHandler(app)

// 开发环境调试工具
if (import.meta.env.DEV) {
  // 引入认证调试工具
  import('./utils/auth-debug.js')
}

// 初始化性能优化
initPerformanceOptimizations()

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
        user = {
          id: 'link-user',
          login: 'linked',
          name: 'Linked User',
          role: 'user',
          permissions: []
        }
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
    } catch {}
  } catch (e) {
    if (import.meta.env.DEV) console.warn('bootstrapAuthFromUrl failed:', e)
  }
}

// 等待 URL 认证引导完成，避免首跳触发登录页
await bootstrapAuthFromUrl()

// 设置插件
app.use(createPinia())

// Element Plus 全局配置（用于 ElMessage 等命令式组件）
app.config.globalProperties.$message = ElMessage
app.config.globalProperties.$msgbox = ElMessageBox
app.config.globalProperties.$loading = ElLoading
app.config.globalProperties.$notify = ElNotification

// 配置 Element Plus 语言
app.provide('elLocale', zhCn)

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
  // Debug exposure removed - no longer needed after Angular removal
}

// 设置全局组件和指令
setupGlobalComponents(app)
setupGlobalDirectives(app)

// Element Plus 全局配置（通过 unplugin 按需自动导入组件）
import { ElConfigProvider } from 'element-plus'
import 'element-plus/es/components/config-provider/style/css'
app.component('ElConfigProvider', ElConfigProvider)

// 统一将 el-dialog 的遮罩点击关闭默认值设为 false。
// Element Plus 当前没有通过 ConfigProvider 直接配置该默认值的官方入口，
// 这里在应用启动时覆写组件默认 props，供全局未显式传值的对话框复用。
if (ElDialog?.props?.closeOnClickModal) {
  ElDialog.props.closeOnClickModal.default = false
}

// 挂载应用
app.mount('#app')

deferStyleChunks([
  () => import('@/styles/element-ui.scss'),
  () => import('@/styles/sidebar.scss'),
  () => import('@/styles/common.scss'),
  () => import('@/styles/opsmind.scss')
])

// 开发环境下的调试信息
if (import.meta.env.DEV) {
}

// Vue Dashboard 作为主应用运行
