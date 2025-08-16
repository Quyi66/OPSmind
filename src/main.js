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

// 导入全局样式
import '@/styles/main.scss'

// 创建应用实例
const app = createApp(App)

// 设置错误处理
setupErrorHandler(app)

// 设置性能监控
if (import.meta.env.DEV) {
  setupPerformanceMonitor(app)
}

// 注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 设置插件
app.use(createPinia())
app.use(ElementPlus)

// 设置路由
const router = setupRouter()
app.use(router)

// 设置全局组件和指令
setupGlobalComponents(app)
setupGlobalDirectives(app)

// 挂载应用
app.mount('#app')

// 开发环境下的调试信息
if (import.meta.env.DEV) {
  console.log('🚀 OpsMind Vue Dashboard started in development mode')
  console.log('📍 Base URL:', import.meta.env.BASE_URL)
  console.log('🔧 Environment:', import.meta.env.MODE)
}

// Vue Dashboard 作为主应用运行
console.log('🎯 Vue Dashboard initialized as main application')
console.log('🔗 Ready to integrate AngularJS modules')
