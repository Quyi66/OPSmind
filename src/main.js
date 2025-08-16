import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router'

// 导入全局样式
import './styles/main.scss'

const app = createApp(App)

// 注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(ElementPlus)
app.use(router)

app.mount('#app')

// 开发环境下的调试信息
if (import.meta.env.DEV) {
  console.log('🚀 OpsMind Vue Dashboard started in development mode')
  console.log('📍 Base URL:', import.meta.env.BASE_URL)
}

// Vue Dashboard 作为主应用运行
console.log('🎯 Vue Dashboard initialized as main application')
console.log('🔗 Ready to integrate AngularJS modules')
