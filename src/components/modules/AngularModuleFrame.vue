<template>
  <div class="angular-module-frame">
    <!-- 模块头部信息 -->
    <div v-if="showHeader" class="module-header">
      <div class="module-info">
        <i :class="moduleConfig?.icon" class="module-icon"></i>
        <div class="module-details">
          <h3 class="module-title">{{ moduleConfig?.title }}</h3>
          <p class="module-description">{{ moduleConfig?.description }}</p>
        </div>
      </div>

      <div class="module-actions">
        <!-- 路由切换 -->
        <el-select
          v-if="Object.keys(moduleRoutes).length > 1"
          v-model="currentRoute"
          @change="handleRouteChange"
          size="small"
          style="width: 200px"
        >
          <el-option
            v-for="(url, name) in moduleRoutes"
            :key="name"
            :label="getRouteLabel(name)"
            :value="name"
          />
        </el-select>

        <!-- 操作按钮 -->
        <el-button-group size="small">
          <el-button @click="refreshModule" :loading="loading">
            <i class="fas fa-refresh"></i>
          </el-button>
          <el-button @click="openInNewWindow">
            <i class="fas fa-external-link-alt"></i>
          </el-button>
          <el-button @click="toggleFullscreen">
            <i :class="isFullscreen ? 'fas fa-compress' : 'fas fa-expand'"></i>
          </el-button>
        </el-button-group>
      </div>
    </div>

    <!-- iframe 容器 -->
    <div
      ref="iframeContainer"
      class="iframe-container"
      :class="{ fullscreen: isFullscreen }"
    >
      <!-- 加载覆盖层 -->
      <div v-if="loading" class="loading-overlay">
        <SkeletonLoader
          :module-code="moduleCode"
          class="skeleton-container"
        />
      </div>

      <!-- 错误覆盖层 -->
      <div v-if="error" class="error-overlay">
        <el-result icon="error" :title="`${moduleConfig?.name} 模块加载失败`" :sub-title="error">
          <template #extra>
            <el-button type="primary" @click="retryLoad">重试</el-button>
            <el-button @click="reportError">报告问题</el-button>
          </template>
        </el-result>
      </div>
    </div>

    <!-- 状态栏 -->
    <div v-if="showStatusBar" class="status-bar">
      <div class="status-info">
        <el-tag :type="getStatusType(status)" size="small">
          {{ status }}
        </el-tag>
        <span class="status-text">{{ statusText }}</span>
      </div>

      <div class="module-meta">
        <span>路由: {{ currentRoute }}</span>
        <span v-if="loadTime">加载时间: {{ loadTime }}ms</span>
        <span>{{ new Date().toLocaleTimeString() }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
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
import SkeletonLoader from '@/components/SkeletonLoader.vue'

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

const emit = defineEmits(['loaded', 'error', 'route-change', 'message'])

// 响应式数据
const loading = ref(true)
const error = ref('')
const status = ref('未加载')
const statusText = ref('')
const loadTime = ref(null)
const loadProgress = ref(0)
const isFullscreen = ref(false)
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

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
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

    // 使用单 iframe 管理器 - 路由切换，真正秒开！
    const switchTime = await singleIframeManager.switchToModule(props.moduleCode, iframeContainer.value)

    // 切换完成
    loading.value = false
    loadTime.value = switchTime
    status.value = '已加载'
    loadProgress.value = 100

    console.log(`✅ Module ${props.moduleCode} switched in ${switchTime.toFixed(2)}ms (ROUTE CHANGE)`)

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

    console.log('📨 Message from Angular module:', event.data)

    // 处理认证数据请求
    if (event.data && event.data.type === 'request-auth-data') {
      sendAuthDataToIframe()
      return
    }

    // 处理认证刷新请求
    if (event.data && event.data.type === 'request-auth-refresh') {
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
  if (!moduleIframe.value || !moduleIframe.value.contentWindow) return

  try {
    // 使用导入的认证服务获取认证信息
    const token = authService.getToken()
    const user = authService.getCurrentUser()

    if (!token || !user) {
      console.warn('⚠️ No auth data available to send to iframe')
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

    // 同时设置到sessionStorage供iframe使用（使用兼容的键名）
    sessionStorage.setItem('vue-auth-bridge', JSON.stringify(authData))

    // 为了兼容性，也设置旧的键名
    sessionStorage.setItem('oplus_token', token)
    sessionStorage.setItem('oplus_user', JSON.stringify(serializableUser))

    // 发送消息到iframe - 确保数据可序列化
    moduleIframe.value.contentWindow.postMessage(
      {
        type: 'vue-auth-data',
        authData: JSON.parse(JSON.stringify(authData)) // 深度克隆确保可序列化
      },
      '*'
    )

    console.log('🔗 Auth data sent to iframe:', {
      hasToken: !!token,
      userLogin: serializableUser?.login,
      tenantId: serializableUser?.tenantId
    })
  } catch (e) {
    console.error('Failed to send auth data to iframe:', e)
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
  toggleFullscreen,
  getStatus: () => ({ status: status.value, loading: loading.value, error: error.value })
})

// 注册组件
defineOptions({
  components: {
    SkeletonLoader
  }
})
</script>

<style scoped>
.angular-module-frame {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
}

.iframe-container.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  background: white;
}

.module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.module-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.module-icon {
  font-size: 2rem;
  opacity: 0.9;
}

.module-details h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.module-details p {
  margin: 0;
  opacity: 0.8;
  font-size: 0.875rem;
}

.module-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.loading-overlay,
.error-overlay {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
}

.loading-content {
  text-align: center;
  color: #606266;
}

.loading-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  animation: spin 1s linear infinite;
}

.loading-progress {
  width: 200px;
  margin-top: 1rem;
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
