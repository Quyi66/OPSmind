<template>
  <!-- 弹窗遮罩层 -->
  <div v-if="visible" class="modal-overlay" @click="closeModule">
    <!-- 弹窗主体 -->
    <div class="modal-dialog" @click.stop>
      <!-- 标准模态框头部 -->
      <div class="modal-header">
        <h4 class="modal-title">{{ moduleConfig?.name || '模块' }}</h4>
        <button type="button" class="modal-close" @click="closeModule" aria-label="关闭">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>

      <!-- 顶部菜单栏 -->
      <div class="modal-toolbar">
        <div class="toolbar-left">
          <span class="module-status">{{ status }}</span>
        </div>
        <div class="toolbar-right">
          <button class="toolbar-btn" @click="refreshModule" :disabled="loading" title="刷新">
            刷新
          </button>
          <button class="toolbar-btn" @click="openInNewWindow" title="新窗口打开">
            新窗口
          </button>
        </div>
      </div>

      <!-- 弹窗内容 -->

      <div class="modal-body">
        <!-- iframe 容器 -->
        <div
          ref="iframeContainer"
          class="iframe-container"
        >
          <!-- 简单加载状态 -->
          <div v-if="loading" class="loading-overlay">
            <el-icon class="loading-spinner"><Loading /></el-icon>
            <div class="loading-text">正在加载...</div>
          </div>

          <!-- 错误状态 -->
          <div v-if="error" class="error-overlay">
            <div class="error-content">
              <i class="fas fa-exclamation-triangle"></i>
              <div class="error-message">{{ error }}</div>
              <div class="error-actions">
                <button class="retry-btn" @click="retryLoad">重试</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import {
  ElSelect,
  ElOption,
  ElButton,
  ElButtonGroup,
  ElIcon,
  ElProgress,
  ElResult,
  ElTag,
  ElMessage
} from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { angularModuleManager } from '@/services/AngularModuleManager.js'
import { authService } from '@/core/auth'
import { singleIframeManager } from '@/utils/single-iframe-manager'

const props = defineProps({
  moduleCode: {
    type: String,
    required: true
  },
  route: {
    type: String,
    default: null
  },
  showHeader: {
    type: Boolean,
    default: true
  },
  showStatusBar: {
    type: Boolean,
    default: true
  },
  autoRefresh: {
    type: Boolean,
    default: false
  },
  refreshInterval: {
    type: Number,
    default: 300000 // 5分钟
  }
})

const emit = defineEmits(['loaded', 'error', 'route-change', 'message', 'close'])

// 路由器
const router = useRouter()

// 响应式数据
const visible = ref(true) // 弹窗显示状态
const loading = ref(true)
const error = ref('')
const status = ref('未加载')
const statusText = ref('')
const loadTime = ref(null)
const loadProgress = ref(0)
// 移除全屏状态，因为弹窗本身就是全屏的
const currentRoute = ref('main')
const iframeContainer = ref(null) // 改为容器引用
const retryCount = ref(0)
const startTime = ref(0)

// 计算属性
const moduleConfig = computed(() => {
  return angularModuleManager.getModule(props.moduleCode)
})

const moduleRoutes = computed(() => {
  return angularModuleManager.getModuleRoutes(props.moduleCode)
})

const iframeUrl = computed(() => {
  if (!moduleConfig.value) return ''

  const routeName = props.route || currentRoute.value
  const routeUrl = moduleRoutes.value[routeName]

  try {
    const url = angularModuleManager.getModuleUrl(props.moduleCode, routeUrl)
    console.log('🔗 Generated iframe URL:', url)

    // 添加认证参数到 URL
    return addAuthParamsToUrl(url)
  } catch (err) {
    console.error('Failed to get module URL:', err)
    return ''
  }
})

// 添加认证参数到 URL
const addAuthParamsToUrl = (baseUrl) => {
  // 暂时不在 URL 中添加认证参数，改为通过 postMessage 传递
  // 这样更安全，避免敏感信息出现在 URL 中
  return baseUrl
}

// 方法
const getRouteLabel = routeName => {
  const labels = {
    main: '主页面',
    template: '模板管理',
    rules: '规则管理',
    hosts: '主机管理',
    jobs: '作业管理',
    results: '结果查看',
    commands: '命令管理',
    flows: '流程管理',
    schedules: '调度管理',
    datasources: '数据源',
    datasets: '数据集',
    transfers: '传输任务',
    pages: '页面管理',
    widgets: '组件管理',
    themes: '主题管理',
    scripts: '脚本管理',
    versions: '版本管理',
    executions: '执行记录',
    assets: '资产管理',
    configs: '配置管理',
    monitoring: '监控告警',
    config: '系统配置',
    users: '用户管理',
    logs: '日志管理',
    list: '应用列表',
    translator: '翻译工具',
    components: '组件测试'
  }
  return labels[routeName] || routeName
}

const getStatusType = status => {
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

const handleRouteChange = routeName => {
  currentRoute.value = routeName
  loadModule()
  emit('route-change', { moduleCode: props.moduleCode, route: routeName })
}

const refreshModule = () => {
  loadModule()
}

const openInNewWindow = () => {
  if (iframeUrl.value) {
    window.open(iframeUrl.value, '_blank')
  }
}

// 移除全屏切换功能

const closeModule = () => {
  // 立即隐藏弹窗
  visible.value = false

  // 清理资源
  cleanupIframeMessaging()

  // 发送关闭事件
  emit('close', { moduleCode: props.moduleCode })

  // 备用路由跳转（如果父组件没有处理关闭事件）
  setTimeout(() => {
    if (visible.value === false) {
      router.push('/home')
    }
  }, 100)
}

const retryLoad = () => {
  if (retryCount.value < 3) {
    retryCount.value++
    loadModule()
  } else {
    ElMessage.error('重试次数过多，请检查网络连接或联系管理员')
  }
}

const reportError = () => {
  ElMessage.info('错误报告功能开发中...')
}

const loadModule = async () => {
  if (!moduleConfig.value) {
    error.value = `模块 ${props.moduleCode} 不存在`
    return
  }

  if (!iframeContainer.value) {
    error.value = 'iframe 容器未准备好'
    return
  }

  loading.value = true
  error.value = ''
  status.value = '加载中'
  statusText.value = `正在加载 ${moduleConfig.value.name}...`
  loadProgress.value = 50

  startTime.value = Date.now()

  try {
    console.log(`⚡ Switching to module with SINGLE iframe: ${props.moduleCode}`)
    console.log(`📦 Module config:`, moduleConfig.value)
    console.log(`📍 Container element:`, iframeContainer.value)

    // 检查容器的实际状态
    if (iframeContainer.value) {
      const rect = iframeContainer.value.getBoundingClientRect()
      console.log(`📏 Container dimensions:`, {
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        visible: rect.width > 0 && rect.height > 0
      })
      console.log(`🎨 Container styles:`, {
        display: getComputedStyle(iframeContainer.value).display,
        position: getComputedStyle(iframeContainer.value).position,
        zIndex: getComputedStyle(iframeContainer.value).zIndex
      })
    }

    // 使用单 iframe 管理器 - 路由切换，真正秒开！
    const switchTime = await singleIframeManager.switchToModule(props.moduleCode, iframeContainer.value)

    // 切换完成
    loading.value = false
    loadTime.value = switchTime
    status.value = '已加载'
    loadProgress.value = 100

    console.log(`✅ Module ${props.moduleCode} switched in ${switchTime.toFixed(2)}ms (ROUTE CHANGE)`)

    // 验证 iframe 是否正确显示
    const iframe = iframeContainer.value.querySelector('iframe')
    if (iframe) {
      console.log(`🎯 Iframe found in container:`, {
        src: iframe.src,
        display: iframe.style.display,
        width: iframe.style.width,
        height: iframe.style.height,
        parentNode: iframe.parentNode === iframeContainer.value
      })
    } else {
      console.warn(`⚠️ No iframe found in container`)
    }

    // 触发加载完成事件
    emit('loaded', {
      moduleCode: props.moduleCode,
      route: currentRoute.value,
      loadTime: switchTime
    })

  } catch (err) {
    console.error('❌ Switch module error:', err)

    // 如果 iframe 还没初始化完成，显示等待状态
    if (err.message.includes('not initialized')) {
      statusText.value = 'Angular 应用正在初始化中，请稍候...'
      loadProgress.value = 75

      // 继续等待
      setTimeout(() => {
        loadModule()
      }, 1000)
    } else {
      onIframeError(err.message)
    }
  }
}

const onIframeLoad = () => {
  const endTime = Date.now()
  const actualLoadTime = endTime - (startTime.value || endTime)

  loading.value = false
  error.value = ''
  status.value = '已加载'
  statusText.value = `${moduleConfig.value.name} 加载成功`
  loadTime.value = actualLoadTime
  loadProgress.value = 100
  retryCount.value = 0

  console.log(`✅ Angular module loaded: ${props.moduleCode}`)

  // 设置iframe通信
  setupIframeMessaging()

  // 立即发送认证数据到iframe
  sendAuthDataToIframe()

  emit('loaded', {
    moduleCode: props.moduleCode,
    route: currentRoute.value,
    loadTime: loadTime.value
  })
}

const onIframeError = (customError = null) => {
  loading.value = false
  error.value = customError || `无法加载 ${moduleConfig.value?.name} 模块，请检查网络连接`
  status.value = '加载失败'
  statusText.value = '模块加载失败'

  console.error(`❌ Angular module load failed: ${props.moduleCode}`, error.value)

  emit('error', {
    moduleCode: props.moduleCode,
    error: error.value
  })
}

// 消息处理器引用，用于清理
let messageHandler = null

const setupIframeMessaging = () => {
  // 清理之前的监听器
  if (messageHandler) {
    window.removeEventListener('message', messageHandler)
  }

  messageHandler = event => {
    // 验证消息来源
    if (!iframeUrl.value) return

    try {
      const iframeOrigin = new URL(iframeUrl.value).origin
      if (event.origin !== iframeOrigin) {
        return
      }
    } catch (e) {
      console.warn('Invalid iframe URL:', iframeUrl.value)
      return
    }

    console.log(`📨 [AngularModuleFrame] Message from Angular module ${props.moduleCode}:`, event.data)

    // 处理认证数据请求
    if (event.data && event.data.type === 'request-auth-data') {
      console.log(`🔄 [AngularModuleFrame] Auth data requested by module ${props.moduleCode}`)
      sendAuthDataToIframe()
      return
    }

    // 处理认证刷新请求
    if (event.data && event.data.type === 'request-auth-refresh') {
      console.log(`🔄 [AngularModuleFrame] Auth refresh requested by module ${props.moduleCode}`)
      refreshAuthData()
      return
    }

    emit('message', {
      moduleCode: props.moduleCode,
      data: event.data
    })
  }

  window.addEventListener('message', messageHandler)
}

// 清理消息监听器
const cleanupIframeMessaging = () => {
  if (messageHandler) {
    window.removeEventListener('message', messageHandler)
    messageHandler = null
  }
}

// 发送认证数据到iframe
const sendAuthDataToIframe = () => {
  console.log(`🚀 [AngularModuleFrame] Starting to send auth data to iframe for module: ${props.moduleCode}`)

  if (!moduleIframe.value || !moduleIframe.value.contentWindow) {
    console.warn(`⚠️ [AngularModuleFrame] Cannot send auth data - iframe not ready:`, {
      hasIframe: !!moduleIframe.value,
      hasContentWindow: !!moduleIframe.value?.contentWindow,
      moduleCode: props.moduleCode
    })
    return
  }

  try {
    // 使用导入的认证服务获取认证信息
    const token = authService.getToken()
    const user = authService.getCurrentUser()

    if (!token || !user) {
      console.warn(`⚠️ [AngularModuleFrame] No auth data available for module ${props.moduleCode}:`, {
        hasToken: !!token,
        hasUser: !!user,
        userLogin: user?.login
      })
      return
    }

    // 创建可序列化的用户对象，只包含基本属性
    const serializableUser = {
      id: user.id,
      login: user.login,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      permissions: user.permissions,
      // 只包含基本的可序列化属性
    }

    const authData = {
      token,
      user: serializableUser,
      timestamp: Date.now()
    }

    console.log(`🔐 [AngularModuleFrame] Auth data prepared for module ${props.moduleCode}:`, {
      hasToken: !!token,
      tokenLength: token?.length,
      userLogin: serializableUser.login,
      tenantId: serializableUser.tenantId,
      permissionsCount: serializableUser.permissions?.length || 0,
      timestamp: authData.timestamp
    })

    // 同时设置到sessionStorage供iframe使用（使用兼容的键名）
    sessionStorage.setItem('vue-auth-bridge', JSON.stringify(authData))
    sessionStorage.setItem('oplus_token', token)
    sessionStorage.setItem('oplus_user', JSON.stringify(serializableUser))
    console.log(`💾 [AngularModuleFrame] Auth data saved to sessionStorage for module ${props.moduleCode}`)

    // 发送消息到iframe - 确保数据可序列化
    const messageData = {
      type: 'vue-auth-data',
      authData: JSON.parse(JSON.stringify(authData)) // 深度克隆确保可序列化
    }

    moduleIframe.value.contentWindow.postMessage(messageData, '*')
    console.log(`📤 [AngularModuleFrame] Auth data sent via postMessage to module ${props.moduleCode}`)

    console.log(`✅ [AngularModuleFrame] Auth data sent to iframe successfully:`, {
      moduleCode: props.moduleCode,
      hasToken: !!token,
      userLogin: serializableUser?.login,
      tenantId: serializableUser?.tenantId
    })
  } catch (e) {
    console.error(`❌ [AngularModuleFrame] Failed to send auth data to iframe for module ${props.moduleCode}:`, e)
  }
}

// 刷新认证数据
const refreshAuthData = () => {
  console.log('🔄 Refreshing auth data for iframe')
  sendAuthDataToIframe()
}

// 生命周期
onMounted(() => {
  // 初始化路由
  if (props.route && moduleRoutes.value[props.route]) {
    currentRoute.value = props.route
  }

  // 加载模块
  loadModule()

  // 设置自动刷新
  if (props.autoRefresh) {
    setInterval(() => {
      if (!loading.value && !error.value) {
        refreshModule()
      }
    }, props.refreshInterval)
  }
})

onUnmounted(() => {
  // 清理消息监听器
  cleanupIframeMessaging()
})

// 监听属性变化
watch(
  () => props.moduleCode,
  () => {
    currentRoute.value = 'main'
    loadModule()
  }
)

watch(
  () => props.route,
  newRoute => {
    if (newRoute && moduleRoutes.value[newRoute]) {
      currentRoute.value = newRoute
      loadModule()
    }
  }
)

// 暴露方法
defineExpose({
  refresh: refreshModule,
  changeRoute: handleRouteChange,
  getStatus: () => ({ status: status.value, loading: loading.value, error: error.value })
})

// 注册组件
defineOptions({
  name: 'AngularModuleFrame'
})
</script>

<style scoped>
/* 弹窗遮罩层 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

/* 弹窗主体 */
.modal-dialog {
  background: white;
  border-radius: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 100vw;
  height: calc(100vh - 60px); /* 顶部预留60px空间 */
  margin-top: 60px; /* 顶部偏移 */
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 全屏模式 */
.modal-fullscreen {
  width: 100vw;
  height: 100vh;
  max-width: none;
  max-height: none;
  border-radius: 0;
}

/* 标准模态框头部 */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: #fff;
  border-bottom: 1px solid #e5e5e5;
  flex-shrink: 0;
}

.modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: #333;
}

/* 标准模态框关闭按钮 */
.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  font-weight: bold;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.modal-close:hover {
  color: #333;
  background: #f5f5f5;
}

/* 工具栏 */
.modal-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e5e5e5;
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.module-status {
  font-size: 12px;
  color: #666;
  padding: 2px 8px;
  background: #e9ecef;
  border-radius: 12px;
}

.toolbar-btn {
  padding: 4px 12px;
  font-size: 12px;
  border: 1px solid #ddd;
  background: white;
  color: #666;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s;
}

.toolbar-btn:hover {
  background: #f5f5f5;
  border-color: #ccc;
}

.toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 弹窗内容 */
.modal-body {
  flex: 1;
  overflow: hidden;
}

.skeleton-container {
  flex: 1;
  width: 100%;
  height: 100%;
}

.iframe-container {
  flex: 1;
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
}

.loading-overlay,
.error-overlay {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
}

.loading-text {
  color: #606266;
  font-size: 14px;
}

.loading-spinner {
  font-size: 28px;
  color: #409eff;
  margin-right: 8px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.error-content {
  text-align: center;
  color: #f56c6c;
}

.error-content i {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-message {
  font-size: 16px;
  margin-bottom: 16px;
}

.retry-btn {
  padding: 8px 16px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.retry-btn:hover {
  background: #66b1ff;
}

.fa-spin {
  animation: fa-spin 1s infinite linear;
}

@keyframes fa-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

.module-title {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.module-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.loading-overlay,
.error-overlay {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
}

.loading-text {
  color: #606266;
  font-size: 14px;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.module-iframe {
  flex: 1;
  border: none;
  width: 100%;
  background: white;
}

.module-iframe.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
  font-size: 0.75rem;
  color: #6c757d;
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
</style>
