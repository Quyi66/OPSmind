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
        <el-button-group size="small">
          <el-button
            :type="viewMode === 'iframe' ? 'primary' : 'default'"
            @click="switchViewMode('iframe')"
            :disabled="loading"
          >
            <i class="fas fa-window-maximize"></i>
            iframe
          </el-button>
          <el-button
            :type="viewMode === 'embedded' ? 'primary' : 'default'"
            @click="switchViewMode('embedded')"
            :disabled="loading || !supportsEmbedded"
          >
            <i class="fas fa-puzzle-piece"></i>
            嵌入
          </el-button>
        </el-button-group>

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
            <el-button @click="switchViewMode(viewMode === 'iframe' ? 'embedded' : 'iframe')">
              切换到{{ viewMode === 'iframe' ? '嵌入' : 'iframe' }}模式
            </el-button>
          </template>
        </el-result>
      </div>

      <!-- iframe 模式 -->
      <div v-if="viewMode === 'iframe'" class="iframe-container">
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

      <!-- 嵌入模式 -->
      <div v-if="viewMode === 'embedded'" class="embedded-container">
        <AngularJSDirectEmbed
          v-if="!loading && !error"
          :module-code="moduleCode"
          :module-title="moduleTitle"
          @loaded="onEmbeddedLoaded"
          @error="onEmbeddedError"
          @ready="onEmbeddedReady"
        />
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
        <span>模式: {{ viewMode === 'iframe' ? 'iframe' : '嵌入' }}</span>
        <span v-if="loadTime">加载时间: {{ loadTime }}ms</span>
        <span v-if="lastUpdate">更新: {{ formatTime(lastUpdate) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import {
  ElButton,
  ElButtonGroup,
  ElIcon,
  ElProgress,
  ElResult,
  ElTag,
  ElMessage
} from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { authService } from '@/core/auth'
import AngularJSDirectEmbed from './AngularJSDirectEmbed.vue'

const props = defineProps({
  moduleCode: {
    type: String,
    required: true,
    validator: value => ['cac', 'jao', 'gfs', 'dts', 'udp', 'acm'].includes(value)
  },
  viewMode: {
    type: String,
    default: 'iframe',
    validator: value => ['iframe', 'embedded'].includes(value)
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

const emit = defineEmits(['loaded', 'error', 'message', 'ready', 'viewModeChanged'])

// 响应式数据
const loading = ref(false)
const error = ref('')
const status = ref('未加载')
const statusText = ref('')
const loadTime = ref(null)
const lastUpdate = ref(null)
const loadingProgress = ref(0)
const loadingText = ref('')
const currentViewMode = ref(props.viewMode)

// 模块配置
const moduleConfigs = {
  cac: {
    title: 'CAC 配置管理',
    description: '配置审计与合规性检查',
    icon: 'fas fa-cogs',
    supportsEmbedded: true
  },
  jao: {
    title: 'JAO 作业编排',
    description: '自动化作业编排与执行',
    icon: 'fas fa-tasks',
    supportsEmbedded: true
  },
  gfs: {
    title: 'GFS 脚本管理',
    description: '脚本文件管理系统',
    icon: 'fas fa-file-code',
    supportsEmbedded: false
  },
  dts: {
    title: 'DTS 数据传输',
    description: '数据传输与同步服务',
    icon: 'fas fa-exchange-alt',
    supportsEmbedded: false
  },
  udp: {
    title: 'UDP 统一开发平台',
    description: '统一开发与部署平台',
    icon: 'fas fa-code',
    supportsEmbedded: false
  },
  acm: {
    title: 'ACM 资产配置管理',
    description: '资产配置管理',
    icon: 'fas fa-server',
    supportsEmbedded: false
  }
}

// 计算属性
const moduleConfig = computed(() => moduleConfigs[props.moduleCode] || {})
const moduleTitle = computed(() => moduleConfig.value.title || props.moduleCode.toUpperCase())
const moduleDescription = computed(() => moduleConfig.value.description || '')
const moduleIcon = computed(() => moduleConfig.value.icon || 'fas fa-cube')
const supportsEmbedded = computed(() => moduleConfig.value.supportsEmbedded || false)

const viewMode = computed({
  get: () => currentViewMode.value,
  set: value => {
    currentViewMode.value = value
    emit('viewModeChanged', value)
  }
})

const moduleUrl = computed(() => {
  return buildModuleUrl()
})

// 引用
const moduleIframe = ref(null)
const angularContainer = ref(null)

// 构建模块URL
function buildModuleUrl() {
  const containerUrl = import.meta.env.DEV
    ? 'http://localhost:3000/angular-container.html'
    : '/angular-container.html'

  const params = new URLSearchParams({
    module: props.moduleCode,
    t: Date.now().toString()
  })

  // 添加认证信息
  try {
    const token = authService.getToken()
    const user = authService.getCurrentUser()

    if (token && user) {
      const authData = {
        token,
        user,
        timestamp: Date.now()
      }

      sessionStorage.setItem('vue-auth-bridge', JSON.stringify(authData))
      params.append('vue_auth', 'true')
    }
  } catch (err) {
    console.warn('Failed to add auth info to module URL:', err)
  }

  return `${containerUrl}?${params.toString()}`
}

// 切换视图模式
function switchViewMode(mode) {
  if (mode === 'embedded' && !supportsEmbedded.value) {
    ElMessage.warning(`${moduleTitle.value} 模块暂不支持嵌入模式`)
    return
  }

  viewMode.value = mode
  loadModule()
}

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

    if (viewMode.value === 'iframe') {
      await loadIframeModule()
    } else {
      // 嵌入模式直接由AngularJSDirectEmbed组件处理
      // 这里只需要设置状态，实际加载由子组件完成
      console.log('🔄 Embedded mode will be handled by AngularJSDirectEmbed component')
      loadingProgress.value = 50
      loadingText.value = '准备嵌入模块...'

      // 等待一下让DOM渲染完成
      await new Promise(resolve => setTimeout(resolve, 100))

      // 状态将由子组件的事件处理更新
      return
    }

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
    if (viewMode.value === 'iframe') {
      loading.value = false
      loadingProgress.value = 100
    }
    // 嵌入模式的loading状态由子组件控制
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

// 加载嵌入模块
async function loadEmbeddedModule() {
  if (!supportsEmbedded.value) {
    throw new Error(`${moduleTitle.value} 模块不支持嵌入模式`)
  }

  loadingText.value = '准备嵌入容器...'
  loadingProgress.value = 20

  // 等待DOM更新
  await nextTick()

  // 如果容器还没有渲染，等待一下
  let retryCount = 0
  while (!angularContainer.value && retryCount < 10) {
    await new Promise(resolve => setTimeout(resolve, 100))
    retryCount++
  }

  if (!angularContainer.value) {
    throw new Error('嵌入容器未找到，请检查DOM渲染状态')
  }

  loadingText.value = '加载AngularJS核心...'
  loadingProgress.value = 40

  // 确保AngularJS已加载
  await ensureAngularJSLoaded()

  loadingText.value = '加载模块脚本...'
  loadingProgress.value = 60

  // 加载模块特定脚本
  await loadModuleScripts()

  loadingText.value = '初始化模块...'
  loadingProgress.value = 80

  // 初始化AngularJS应用
  await initializeAngularApp()

  loadingProgress.value = 100
  loadingText.value = '模块加载完成'
}

// 确保AngularJS已加载
async function ensureAngularJSLoaded() {
  if (window.angular) {
    return Promise.resolve()
  }

  // 这里可以动态加载AngularJS
  // 但在实际项目中，建议在页面中预先加载
  throw new Error('AngularJS未加载，请确保在页面中包含AngularJS库')
}

// 加载模块脚本
async function loadModuleScripts() {
  // 使用模块加载器加载脚本
  if (window.AngularModuleLoader) {
    await window.AngularModuleLoader.loadModule(props.moduleCode)
  } else {
    throw new Error('AngularJS模块加载器未找到')
  }
}

// 初始化AngularJS应用
async function initializeAngularApp() {
  const container = angularContainer.value
  const appName = `embedded-${props.moduleCode}-${Date.now()}`

  // 创建嵌入式应用
  const app = window.angular.module(appName, [`oplus.${props.moduleCode}`, 'ui.router'])

  // 设置模板
  container.innerHTML = `<div ui-view></div>`

  // 启动应用
  window.angular.bootstrap(container, [appName])

  emit('ready', {
    moduleCode: props.moduleCode,
    appName,
    container
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

// 嵌入模式事件处理
function onEmbeddedLoaded(moduleCode) {
  loading.value = false
  error.value = ''
  status.value = '已加载'
  statusText.value = `${moduleTitle.value} 模块加载成功`
  lastUpdate.value = Date.now()
  loadTime.value = Date.now() - (loadTime.value || Date.now())

  console.log('✅ Embedded module loaded:', moduleCode)
  emit('loaded', moduleCode)
}

function onEmbeddedError({ moduleCode, error: errorMsg }) {
  loading.value = false
  error.value = errorMsg
  status.value = '加载失败'
  statusText.value = `${moduleTitle.value} 模块加载失败`

  console.error('❌ Embedded module error:', moduleCode, errorMsg)
  emit('error', { moduleCode, error: errorMsg })
}

function onEmbeddedReady({ moduleCode, controller, scope }) {
  console.log('🎯 Embedded module ready:', moduleCode, controller)
  emit('ready', {
    moduleCode,
    controller,
    scope
  })
}

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
  switchViewMode,
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

.iframe-container,
.embedded-container {
  height: 100%;
}

.angular-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
}

.angular-embedded {
  width: 100%;
  height: 100%;
  overflow: auto;
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
