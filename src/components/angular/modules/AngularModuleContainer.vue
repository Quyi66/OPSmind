<template>
  <div class="angular-module-container">
    <!-- 模块头部信息 -->
    <div class="module-header" v-if="showHeader">
      <div class="module-info">
        <i :class="moduleIcon" class="module-icon"></i>
        <div class="module-details">
          <h3 class="module-title">{{ moduleTitle }}</h3>
          <p class="module-description">{{ moduleDescription }}</p>
        </div>
      </div>

      <div class="module-actions">
        <el-button @click="refreshModule" size="small" :loading="loading">
          <i class="fas fa-refresh"></i>
          刷新
        </el-button>

        <el-button @click="openInNewWindow" size="small" type="primary">
          <i class="fas fa-external-link-alt"></i>
          新窗口
        </el-button>
      </div>
    </div>

    <!-- 模块内容区域 -->
    <div class="module-content" :class="{ 'with-header': showHeader }">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-overlay">
        <div class="loading-content">
          <el-icon class="loading-spinner"><Loading /></el-icon>
          <p>正在加载 {{ moduleTitle }} 模块...</p>
          <div class="loading-progress">
            <el-progress :percentage="loadingProgress" :show-text="false" />
            <span class="progress-text">{{ loadingText }}</span>
          </div>
        </div>
      </div>

      <!-- 错误状态 -->
      <div v-if="error && !loading" class="error-overlay">
        <el-result icon="error" :title="`${moduleTitle} 模块加载失败`" :sub-title="error">
          <template #extra>
            <el-button type="primary" @click="retryLoad">重试</el-button>
          </template>
        </el-result>
      </div>

      <!-- iframe 模式 -->
      <div class="iframe-container">
        <iframe
          v-show="!loading && !error"
          ref="moduleIframe"
          :src="moduleUrl"
          :title="`${moduleTitle} 模块`"
          class="angular-iframe"
          @load="onIframeLoad"
          @error="onIframeError"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation"
        ></iframe>
      </div>


    </div>

    <!-- 状态栏 -->
    <div class="status-bar" v-if="showStatusBar">
      <div class="status-info">
        <el-tag :type="getStatusType(status)" size="small">
          {{ status }}
        </el-tag>
        <span class="status-text">{{ statusText }}</span>
      </div>

      <div class="module-meta">
        <span>模式: iframe</span>
        <span v-if="loadTime">加载时间: {{ loadTime }}ms</span>
        <span v-if="lastUpdate">更新: {{ formatTime(lastUpdate) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ElButton, ElIcon, ElProgress, ElResult, ElTag, ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { authService } from '@/core/auth'
import { appUrlManager } from '@/config/module-urls.config'

const props = defineProps({
  moduleCode: {
    type: String,
    required: true,
    validator: value => ['cac', 'jao', 'gfs', 'dts', 'udp', 'acm'].includes(value)
  },
  showHeader: {
    type: Boolean,
    default: true
  },
  showStatusBar: {
    type: Boolean,
    default: true
  },
  autoLoad: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['loaded', 'error', 'message', 'ready'])

// 响应式数据
const loading = ref(false)
const error = ref('')
const status = ref('未加载')
const statusText = ref('')
const loadTime = ref(null)
const lastUpdate = ref(null)
const loadingProgress = ref(0)
const loadingText = ref('')

// 模块配置
const moduleConfigs = {
  cac: {
    title: 'CAC 配置管理',
    description: '配置审计与合规性检查',
    icon: 'fas fa-cogs'
  },
  jao: {
    title: 'JAO 作业编排',
    description: '自动化作业编排与执行',
    icon: 'fas fa-tasks'
  },
  gfs: {
    title: 'GFS 脚本管理',
    description: '脚本文件管理系统',
    icon: 'fas fa-file-code'
  },
  dts: {
    title: 'DTS 数据传输',
    description: '数据传输与同步服务',
    icon: 'fas fa-exchange-alt'
  },
  udp: {
    title: 'UDP 统一开发平台',
    description: '统一开发与部署平台',
    icon: 'fas fa-code'
  },
  acm: {
    title: 'ACM 资产配置管理',
    description: '资产配置管理',
    icon: 'fas fa-server'
  }
}

// 计算属性
const moduleConfig = computed(() => moduleConfigs[props.moduleCode] || {})
const moduleTitle = computed(() => moduleConfig.value.title || props.moduleCode.toUpperCase())
const moduleDescription = computed(() => moduleConfig.value.description || '')
const moduleIcon = computed(() => moduleConfig.value.icon || 'fas fa-cube')

// 不再支持嵌入模式，统一使用 iframe

const moduleUrl = computed(() => {
  return buildModuleUrl()
})

// 引用
const moduleIframe = ref(null)

// 构建模块URL（支持token参数传递）
function buildModuleUrl() {
  const containerUrl = resolveAngularContainerUrl()

  const params = new URLSearchParams({
    module: props.moduleCode,
    t: Date.now().toString()
  })

  // 添加认证信息，包括token
  try {
    const token = authService.getToken()
    const user = authService.getCurrentUser()

    if (token && user) {
      // 使用配置的token参数名
      const tokenParam = appUrlManager.getTokenParam()
      params.append(tokenParam, token)
      params.append('vue_auth', 'true')

      console.log('🔗 Built container URL with token:', {
        moduleCode: props.moduleCode,
        tokenParam,
        hasToken: !!token,
        tokenLength: token.length
      })
    }
  } catch (err) {
    console.warn('Failed to add auth info to module URL:', err)
  }

  const separator = containerUrl.includes('?') ? '&' : '?'
  return `${containerUrl}${separator}${params.toString()}`
}

function resolveAngularContainerUrl(): string {
  const envUrl = (import.meta.env.VITE_ANGULAR_URL || import.meta.env.VITE_ANGULAR_PROXY_URL || '').trim()
  if (envUrl) {
    const sanitized = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl
    return `${sanitized}/angular-container.html`
  }

  return import.meta.env.DEV
    ? 'http://localhost:3000/angular-container.html'
    : '/angular-container.html'
}

// 视图模式固定为 iframe

// 加载模块
async function loadModule() {
  if (loading.value) return

  try {
    loading.value = true
    error.value = ''
    status.value = '加载中'
    statusText.value = `正在加载 ${moduleTitle.value} 模块...`
    loadingProgress.value = 0
    loadingText.value = '初始化...'

    const startTime = Date.now()

    await loadIframeModule()

    loadTime.value = Date.now() - startTime
    lastUpdate.value = Date.now()
    status.value = '已加载'
    statusText.value = `${moduleTitle.value} 模块加载成功`

    emit('loaded', props.moduleCode)
  } catch (err) {
    console.error('Failed to load module:', err)
    error.value = err.message || '模块加载失败'
    status.value = '加载失败'
    statusText.value = `${moduleTitle.value} 模块加载失败`

    emit('error', { moduleCode: props.moduleCode, error: error.value })
  } finally {
    loading.value = false
    loadingProgress.value = 100
  }
}

// 加载iframe模块
async function loadIframeModule() {
  loadingText.value = '准备iframe容器...'
  loadingProgress.value = 20

  // 等待DOM更新
  await nextTick()

  // 如果iframe还没有渲染，等待一下
  let retryCount = 0
  while (!moduleIframe.value && retryCount < 10) {
    await new Promise(resolve => setTimeout(resolve, 100))
    retryCount++
  }

  return new Promise((resolve, reject) => {
    if (!moduleIframe.value) {
      reject(new Error('iframe容器未找到，请检查DOM渲染状态'))
      return
    }

    const iframe = moduleIframe.value

    const cleanup = () => {
      iframe.removeEventListener('load', onLoad)
      iframe.removeEventListener('error', onError)
    }

    const onLoad = () => {
      loadingProgress.value = 100
      loadingText.value = '模块加载完成'
      cleanupWithTimeout()
      resolve()
    }

    const onError = () => {
      cleanupWithTimeout()
      reject(new Error('iframe加载失败'))
    }

    iframe.addEventListener('load', onLoad)
    iframe.addEventListener('error', onError)

    // 设置超时
    const timeoutId = setTimeout(() => {
      cleanupWithTimeout()
      reject(new Error('iframe加载超时'))
    }, 30000)

    // 清理超时
    const originalCleanup = cleanup
    const cleanupWithTimeout = () => {
      clearTimeout(timeoutId)
      originalCleanup()
    }

    loadingProgress.value = 50
    loadingText.value = '加载模块内容...'

    console.log('🔄 Starting iframe load for:', moduleUrl.value)
  })
}

// iframe加载完成
function onIframeLoad() {
  console.log('✅ Angular module iframe loaded:', props.moduleCode)
  setupIframeMessaging()
}

// iframe加载错误
function onIframeError() {
  console.error('❌ Angular module iframe error:', props.moduleCode)
  error.value = `无法加载 ${moduleTitle.value} 模块`
}

// 设置iframe通信
function setupIframeMessaging() {
  const handleMessage = event => {
    // 验证消息来源
    const allowedOrigins = ['http://localhost:3000', window.location.origin]

    if (!allowedOrigins.includes(event.origin)) {
      return
    }

    console.log('📨 Message from Angular module:', event.data)

    emit('message', {
      moduleCode: props.moduleCode,
      data: event.data
    })
  }

  window.addEventListener('message', handleMessage)

  onUnmounted(() => {
    window.removeEventListener('message', handleMessage)
  })
}

// 刷新模块
function refreshModule() {
  loadModule()
}

// 重试加载
function retryLoad() {
  loadModule()
}

// 在新窗口打开
function openInNewWindow() {
  window.open(moduleUrl.value, '_blank')
}

// 获取状态类型
function getStatusType(status) {
  switch (status) {
    case '已加载':
      return 'success'
    case '加载中':
      return 'warning'
    case '加载失败':
      return 'danger'
    default:
      return 'info'
  }
}

// 格式化时间
function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString()
}

// 移除嵌入模式相关事件处理

// 生命周期
onMounted(() => {
  if (props.autoLoad) {
    loadModule()
  }
})

// 监听模块代码变化
watch(
  () => props.moduleCode,
  () => {
    if (props.autoLoad) {
      loadModule()
    }
  }
)

// 暴露方法
defineExpose({
  loadModule,
  refreshModule,
  getStatus: () => ({
    loading: loading.value,
    error: error.value,
    status: status.value,
    loadTime: loadTime.value
  })
})
</script>

<style scoped>
.angular-module-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f7fa;
}

.module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.module-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.module-icon {
  font-size: 2rem;
  color: #409eff;
}

.module-details h3 {
  margin: 0 0 0.25rem 0;
  color: #303133;
  font-size: 1.25rem;
}

.module-details p {
  margin: 0;
  color: #909399;
  font-size: 0.875rem;
}

.module-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.module-content {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.module-content.with-header {
  height: calc(100% - 80px);
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
  background: rgba(255, 255, 255, 0.95);
  z-index: 10;
}

.loading-content {
  text-align: center;
  max-width: 300px;
}

.loading-spinner {
  font-size: 2rem;
  color: #409eff;
  margin-bottom: 1rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.loading-progress {
  margin-top: 1rem;
}

.progress-text {
  display: block;
  margin-top: 0.5rem;
  color: #909399;
  font-size: 0.875rem;
}

.iframe-container {
  height: 100%;
}

.angular-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
}



.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: #f8f9fa;
  border-top: 1px solid #e4e7ed;
  font-size: 0.875rem;
  color: #606266;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.module-meta {
  display: flex;
  gap: 1rem;
}

.status-text {
  color: #909399;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .module-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .module-actions {
    justify-content: center;
  }

  .status-bar {
    flex-direction: column;
    gap: 0.5rem;
    align-items: stretch;
  }

  .module-meta {
    justify-content: center;
  }
}
</style>
