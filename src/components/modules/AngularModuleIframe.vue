<template>
  <div class="angular-module-iframe-container">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
        <p>正在加载 {{ moduleName }} 模块...</p>
      </div>
    </div>

    <!-- 错误状态 -->
    <div v-if="error" class="error-overlay">
      <div class="error-content">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>模块加载失败</h3>
        <p>{{ error }}</p>
        <button @click="retryLoad" class="retry-btn">重试</button>
      </div>
    </div>

    <!-- Angular 模块 iframe -->
    <iframe
      v-show="!loading && !error"
      ref="moduleIframe"
      :src="moduleUrl"
      :title="`${moduleName} 模块`"
      class="angular-module-iframe"
      @load="onIframeLoad"
      @error="onIframeError"
      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
    ></iframe>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { authService } from '@/services/auth'

const props = defineProps({
  moduleCode: {
    type: String,
    required: true
  },
  moduleName: {
    type: String,
    default: ''
  },
  baseUrl: {
    type: String,
    default: 'http://localhost:3000'
  }
})

const emit = defineEmits(['loaded', 'error', 'message'])

// 响应式数据
const loading = ref(true)
const error = ref('')
const moduleIframe = ref(null)
const retryCount = ref(0)

// 计算属性
const moduleUrl = computed(() => {
  return buildModuleUrlWithAuth()
})

// 模块路由映射
const moduleRoutes = {
  cac: '/oplus/base/#/app/cac',
  jao: '/oplus/base/#/app/jao',
  dts: '/oplus/base/#/app/dts',
  udp: '/oplus/base/#/app/udp',
  gfs: '/oplus/base/#/app/gfs',
  acm: '/oplus/base/#/app/acm',
  adm: '/oplus/base/#/app/admin'
}

// 获取正确的Angular服务器地址
const getAngularServerUrl = () => {
  // 开发环境使用webpack dev server的地址
  if (import.meta.env.DEV) {
    return 'http://localhost:3000'
  }
  // 生产环境使用相对路径
  return window.location.origin
}

// 构建带认证信息的模块URL
function buildModuleUrlWithAuth() {
  const route = moduleRoutes[props.moduleCode] || '/oplus/base/'
  const serverUrl = props.baseUrl || getAngularServerUrl()
  const baseUrl = `${serverUrl}${route}`

  try {
    const token = authService.getToken()
    const user = authService.getCurrentUser()

    if (token && user) {
      // 将认证信息保存到 sessionStorage
      const authData = {
        token,
        user,
        timestamp: Date.now()
      }

      sessionStorage.setItem('vue-auth-bridge', JSON.stringify(authData))
      console.log('🔗 Vue auth data saved for Angular module:', props.moduleCode)

      // URL 中添加认证标识
      const separator = baseUrl.includes('?') ? '&' : '?'
      return `${baseUrl}${separator}vue_auth=true&module=${props.moduleCode}&t=${Date.now()}`
    }
  } catch (err) {
    console.warn('Failed to get auth info for module URL:', err)
  }

  return baseUrl
}

// iframe 加载完成
function onIframeLoad() {
  console.log('✅ Angular module iframe loaded:', props.moduleCode)
  loading.value = false
  error.value = ''
  retryCount.value = 0

  // 设置iframe通信
  setupIframeMessaging()

  emit('loaded', props.moduleCode)
}

// iframe 加载错误
function onIframeError() {
  console.error('❌ Angular module iframe load error:', props.moduleCode)
  loading.value = false
  error.value = `无法加载 ${props.moduleName} 模块`

  emit('error', { moduleCode: props.moduleCode, error: error.value })
}

// 重试加载
function retryLoad() {
  if (retryCount.value < 3) {
    retryCount.value++
    loading.value = true
    error.value = ''

    // 重新设置iframe src
    if (moduleIframe.value) {
      moduleIframe.value.src = moduleUrl.value
    }
  } else {
    error.value = '重试次数过多，请检查网络连接或联系管理员'
  }
}

// 设置iframe通信
function setupIframeMessaging() {
  // 监听来自Angular模块的消息
  const handleMessage = event => {
    // 验证消息来源
    if (event.origin !== new URL(props.baseUrl).origin) {
      return
    }

    console.log('📨 Message from Angular module:', event.data)

    // 转发消息给父组件
    emit('message', {
      moduleCode: props.moduleCode,
      data: event.data
    })

    // 处理特定消息类型
    if (event.data.type === 'module-ready') {
      console.log('🎯 Angular module is ready:', props.moduleCode)
    } else if (event.data.type === 'navigation') {
      console.log('🧭 Angular module navigation:', event.data.route)
    }
  }

  window.addEventListener('message', handleMessage)

  // 组件卸载时清理
  onUnmounted(() => {
    window.removeEventListener('message', handleMessage)
  })
}

// 向Angular模块发送消息
function sendMessageToModule(message) {
  if (moduleIframe.value && moduleIframe.value.contentWindow) {
    const targetOrigin = new URL(props.baseUrl).origin
    moduleIframe.value.contentWindow.postMessage(message, targetOrigin)
  }
}

// 监听模块代码变化
watch(
  () => props.moduleCode,
  () => {
    loading.value = true
    error.value = ''
    retryCount.value = 0
  }
)

// 暴露方法给父组件
defineExpose({
  sendMessage: sendMessageToModule,
  reload: retryLoad
})

onMounted(() => {
  console.log('🚀 Mounting Angular module iframe:', props.moduleCode)
})
</script>

<style scoped>
.angular-module-iframe-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 600px;
}

.angular-module-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
}

.loading-overlay,
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  z-index: 10;
}

.loading-spinner {
  text-align: center;
  color: #409eff;
}

.loading-spinner i {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.error-content {
  text-align: center;
  color: #f56c6c;
}

.error-content i {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.error-content h3 {
  margin: 1rem 0;
  color: #303133;
}

.retry-btn {
  padding: 0.5rem 1rem;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 1rem;
}

.retry-btn:hover {
  background: #66b1ff;
}
</style>
