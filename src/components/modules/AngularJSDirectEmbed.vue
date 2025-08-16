<template>
  <div class="angularjs-direct-embed">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-content">
        <el-icon class="loading-spinner"><Loading /></el-icon>
        <p>正在初始化 {{ moduleTitle }} 模块...</p>
        <div class="loading-steps">
          <div class="step" :class="{ active: currentStep >= 1 }">
            <i class="fas fa-check-circle"></i>
            加载AngularJS核心
          </div>
          <div class="step" :class="{ active: currentStep >= 2 }">
            <i class="fas fa-check-circle"></i>
            加载模块依赖
          </div>
          <div class="step" :class="{ active: currentStep >= 3 }">
            <i class="fas fa-check-circle"></i>
            初始化模块
          </div>
          <div class="step" :class="{ active: currentStep >= 4 }">
            <i class="fas fa-check-circle"></i>
            启动应用
          </div>
        </div>
      </div>
    </div>

    <!-- 错误状态 -->
    <div v-if="error && !loading" class="error-container">
      <el-result icon="error" :title="`${moduleTitle} 模块加载失败`" :sub-title="error">
        <template #extra>
          <el-button type="primary" @click="retryLoad">重试</el-button>
          <el-button @click="$emit('close')">关闭</el-button>
        </template>
      </el-result>
    </div>

    <!-- AngularJS 应用容器 -->
    <div
      v-show="!loading && !error"
      ref="angularContainer"
      class="angular-container"
      :id="`angular-app-${moduleCode}`"
    >
      <!-- AngularJS 应用将在这里渲染 -->
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { ElIcon, ElResult, ElButton, ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { authService } from '@/services/auth'

const props = defineProps({
  moduleCode: {
    type: String,
    required: true,
    validator: value => ['cac', 'jao'].includes(value)
  },
  moduleTitle: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['loaded', 'error', 'ready', 'close'])

// 响应式数据
const loading = ref(false)
const error = ref('')
const currentStep = ref(0)
const angularContainer = ref(null)
const angularScope = ref(null)
const angularApp = ref(null)

// 模块配置
const moduleConfigs = {
  cac: {
    name: 'opluscac',
    title: 'CAC 配置管理',
    dependencies: ['oplus.commons', 'vs-repeat'],
    scripts: [
      // 基础依赖
      '/src/webapp/lib/lodash/lodash.min.js',
      '/src/webapp/lib/jquery/jquery.min.js',
      // AngularJS相关
      '/src/webapp/lib/angular-resource/angular-resource.min.js',
      '/src/webapp/lib/angular-cookies/angular-cookies.min.js',
      '/src/webapp/lib/angular-animate/angular-animate.min.js',
      '/src/webapp/lib/angular-sanitize/angular-sanitize.min.js',
      '/src/webapp/lib/ui-bootstrap/ui-bootstrap-tpls.min.js',
      '/src/webapp/lib/angular-ui-router/angular-ui-router.min.js',
      // 公共模块
      '/src/webapp/app/modules/commons/commons.module.js',
      '/src/webapp/app/modules/oplus-lang.js',
      // CAC模块
      '/src/webapp/app/modules/cac/cac.module.js',
      '/src/webapp/app/modules/cac/cac.service.js',
      '/src/webapp/app/modules/cac/cac.controller.js',
      '/src/webapp/app/modules/cac/cac.state.js'
    ],
    styles: ['/src/webapp/content/css/oplus-commons.css', '/src/webapp/content/css/oplus-cac.css'],
    templateUrl: '/src/webapp/app/modules/cac/cac-index.html',
    controller: 'cacCtrl',
    controllerAs: 'cacVm'
  }
}

// 加载AngularJS模块
const loadAngularModule = async () => {
  try {
    loading.value = true
    error.value = ''
    currentStep.value = 0

    console.log('🔄 Loading AngularJS module directly:', props.moduleCode)

    const config = moduleConfigs[props.moduleCode]
    if (!config) {
      throw new Error(`不支持的模块: ${props.moduleCode}`)
    }

    // 步骤1: 确保AngularJS已加载
    currentStep.value = 1
    await ensureAngularJSLoaded()

    // 步骤2: 加载模块依赖
    currentStep.value = 2
    await loadModuleDependencies(config)

    // 步骤3: 初始化模块
    currentStep.value = 3
    await initializeModule(config)

    // 步骤4: 启动应用
    currentStep.value = 4
    await startAngularApp(config)

    loading.value = false
    console.log('✅ AngularJS module loaded successfully:', props.moduleCode)

    emit('loaded', props.moduleCode)
  } catch (err) {
    console.error('❌ Failed to load AngularJS module:', err)
    error.value = err.message || '模块加载失败'
    loading.value = false
    emit('error', { moduleCode: props.moduleCode, error: error.value })
  }
}

// 确保AngularJS已加载
const ensureAngularJSLoaded = async () => {
  if (window.angular) {
    console.log('✅ AngularJS already loaded')
    return
  }

  console.log('🔄 Loading AngularJS from local files...')

  try {
    // 从本地加载AngularJS核心
    await loadScript('/src/webapp/lib/angular/angular.min.js')

    // 验证AngularJS是否正确加载
    if (!window.angular) {
      throw new Error('AngularJS failed to load from local file')
    }

    console.log('✅ AngularJS core loaded successfully from local file')
    console.log('📦 AngularJS version:', window.angular.version.full)
  } catch (error) {
    console.error('❌ Failed to load AngularJS from local file:', error)
    throw new Error(`AngularJS加载失败: ${error.message}`)
  }
}

// 加载脚本
const loadScript = src => {
  return new Promise((resolve, reject) => {
    // 检查是否已加载
    const existingScript = document.querySelector(`script[src="${src}"]`)
    if (existingScript) {
      console.log('📦 Script already loaded:', src)
      resolve()
      return
    }

    console.log('🔄 Loading script:', src)

    const script = document.createElement('script')
    script.src = src
    script.type = 'text/javascript'
    script.async = true

    const cleanup = () => {
      script.removeEventListener('load', onLoad)
      script.removeEventListener('error', onError)
    }

    const onLoad = () => {
      console.log('✅ Script loaded successfully:', src)
      cleanupWithTimeout()
      resolve()
    }

    const onError = event => {
      console.error('❌ Script load error:', src, event)
      cleanupWithTimeout()
      // 移除失败的script标签
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
      reject(new Error(`Failed to load script: ${src}`))
    }

    script.addEventListener('load', onLoad)
    script.addEventListener('error', onError)

    // 设置超时
    const timeoutId = setTimeout(() => {
      cleanupWithTimeout()
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
      reject(new Error(`Script load timeout: ${src}`))
    }, 15000) // 15秒超时

    // 清理超时
    const originalCleanup = cleanup
    const cleanupWithTimeout = () => {
      clearTimeout(timeoutId)
      originalCleanup()
    }

    document.head.appendChild(script)
  })
}

// 加载模块依赖
const loadModuleDependencies = async config => {
  console.log('📦 Loading module dependencies...')

  // 加载样式文件
  if (config.styles) {
    for (const styleUrl of config.styles) {
      await loadStylesheet(styleUrl)
    }
  }

  // 加载脚本文件
  if (config.scripts) {
    for (const scriptUrl of config.scripts) {
      await loadScript(scriptUrl)
    }
  }

  console.log('✅ Module dependencies loaded')
}

// 加载样式表
const loadStylesheet = href => {
  return new Promise((resolve, reject) => {
    // 检查是否已加载
    const existingLink = document.querySelector(`link[href="${href}"]`)
    if (existingLink) {
      console.log('📦 Stylesheet already loaded:', href)
      resolve()
      return
    }

    console.log('🔄 Loading stylesheet:', href)

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href

    const cleanup = () => {
      link.removeEventListener('load', onLoad)
      link.removeEventListener('error', onError)
    }

    const onLoad = () => {
      console.log('✅ Stylesheet loaded successfully:', href)
      cleanup()
      resolve()
    }

    const onError = event => {
      console.error('❌ Stylesheet load error:', href, event)
      cleanup()
      // 样式加载失败不阻塞模块加载
      resolve()
    }

    link.addEventListener('load', onLoad)
    link.addEventListener('error', onError)

    document.head.appendChild(link)
  })
}

// 初始化模块
const initializeModule = async config => {
  await nextTick()

  if (!angularContainer.value) {
    throw new Error('Angular container not found')
  }

  // 设置认证信息
  setupAuthBridge()

  console.log('🎯 Initializing AngularJS module:', config.name)
}

// 启动AngularJS应用
const startAngularApp = async config => {
  const container = angularContainer.value

  // 确保AngularJS已完全加载
  if (!window.angular) {
    throw new Error('AngularJS not loaded')
  }

  try {
    // 等待一下确保所有模块都已注册
    await new Promise(resolve => setTimeout(resolve, 500))

    // 检查CAC模块是否已注册
    try {
      window.angular.module('oplus.cac')
      console.log('✅ CAC module found')
    } catch (e) {
      throw new Error('CAC module not registered')
    }

    // 创建主应用，依赖CAC模块
    const appName = 'cacEmbeddedApp'
    const app = window.angular.module(appName, ['oplus.cac', 'ui.router'])

    // 配置路由
    app.config([
      '$stateProvider',
      '$urlRouterProvider',
      function ($stateProvider, $urlRouterProvider) {
        $urlRouterProvider.otherwise('/cac')

        $stateProvider.state('cac', {
          url: '/cac',
          template: '<div ui-view="cacList"></div>',
          controller: 'cacCtrl',
          controllerAs: 'cacVm'
        })
      }
    ])

    // 加载模板
    let template = '<div ui-view></div>'
    if (config.templateUrl) {
      try {
        const response = await fetch(config.templateUrl)
        if (response.ok) {
          template = await response.text()
        }
      } catch (e) {
        console.warn('Failed to load template, using default')
      }
    }

    // 设置模板
    container.innerHTML = template

    // 启动AngularJS应用
    window.angular.bootstrap(container, [appName])
    angularApp.value = app

    console.log('🚀 CAC AngularJS app started:', appName)

    // 通知Vue组件模块已准备就绪
    emit('ready', {
      moduleCode: props.moduleCode,
      controller: config.controller,
      app
    })
  } catch (error) {
    console.error('❌ Failed to start AngularJS app:', error)
    throw new Error(`CAC模块启动失败: ${error.message}`)
  }
}

// CAC模块使用真实的控制器，不需要自定义初始化

// 设置认证桥接
const setupAuthBridge = () => {
  try {
    const token = authService.getToken()
    const user = authService.getCurrentUser()

    if (token && user) {
      // 设置全局变量供AngularJS使用
      window.vueAuthToken = token
      window.vueUserInfo = user

      console.log('🔗 Auth bridge setup for embedded module')
    }
  } catch (err) {
    console.warn('Failed to setup auth bridge:', err)
  }
}

// 重试加载
const retryLoad = () => {
  loadAngularModule()
}

// 清理资源
const cleanup = () => {
  if (angularContainer.value) {
    angularContainer.value.innerHTML = ''
  }
  angularScope.value = null
  angularApp.value = null

  // 清理全局变量
  delete window.vueAuthToken
  delete window.vueUserInfo
}

// 生命周期
onMounted(() => {
  loadAngularModule()
})

onUnmounted(() => {
  cleanup()
})

// 暴露方法
defineExpose({
  reload: retryLoad,
  cleanup
})
</script>

<style scoped>
.angularjs-direct-embed {
  width: 100%;
  height: 100%;
  min-height: 500px;
}

.loading-container,
.error-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
}

.loading-content {
  text-align: center;
  max-width: 400px;
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

.loading-steps {
  margin-top: 2rem;
  text-align: left;
}

.step {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  color: #909399;
  font-size: 0.875rem;
}

.step.active {
  color: #67c23a;
}

.step i {
  width: 16px;
}

.angular-container {
  width: 100%;
  height: 100%;
  overflow: auto;
}

/* AngularJS 应用样式 */
.angular-container :deep(.cac-embedded-app),
.angular-container :deep(.jao-embedded-app) {
  padding: 1.5rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.angular-container :deep(.cac-header),
.angular-container :deep(.jao-header) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  border-radius: 12px;
  margin-bottom: 2rem;
}

.angular-container :deep(.header-content) {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.angular-container :deep(.header-icon) {
  font-size: 3rem;
  opacity: 0.9;
}

.angular-container :deep(.header-info h2) {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
}

.angular-container :deep(.header-info p) {
  margin: 0;
  opacity: 0.9;
}

/* CAC 特定样式 */
.angular-container :deep(.stats-grid) {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.angular-container :deep(.stat-card) {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
}

.angular-container :deep(.stat-icon) {
  width: 48px;
  height: 48px;
  background: #f0f9ff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #409eff;
  font-size: 1.5rem;
}

.angular-container :deep(.stat-value) {
  font-size: 1.5rem;
  font-weight: bold;
  color: #303133;
}

.angular-container :deep(.stat-label) {
  color: #909399;
  font-size: 0.875rem;
}

.angular-container :deep(.action-grid) {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.angular-container :deep(.action-card) {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.angular-container :deep(.action-card:hover) {
  transform: translateY(-2px);
}

.angular-container :deep(.action-icon) {
  width: 40px;
  height: 40px;
  background: #f0f9ff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #409eff;
}

.angular-container :deep(.action-info h3) {
  margin: 0 0 0.25rem 0;
  color: #303133;
}

.angular-container :deep(.action-info p) {
  margin: 0;
  color: #909399;
  font-size: 0.875rem;
}

/* JAO 特定样式 */
.angular-container :deep(.job-stats) {
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
  justify-content: center;
}

.angular-container :deep(.stat-item) {
  text-align: center;
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-width: 120px;
}

.angular-container :deep(.stat-number) {
  display: block;
  font-size: 2rem;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 0.5rem;
}

.angular-container :deep(.stat-label) {
  color: #909399;
  font-size: 0.875rem;
}

.angular-container :deep(.job-actions) {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.angular-container :deep(.action-btn) {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #f5f5f5;
  color: #606266;
  transition: all 0.2s;
}

.angular-container :deep(.action-btn:hover) {
  background: #e6e6e6;
}

.angular-container :deep(.action-btn.primary) {
  background: #409eff;
  color: white;
}

.angular-container :deep(.action-btn.primary:hover) {
  background: #66b1ff;
}

/* 通用样式 */
.angular-container :deep(.recent-activities),
.angular-container :deep(.recent-jobs) {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.angular-container :deep(.recent-activities h3),
.angular-container :deep(.recent-jobs h3) {
  margin: 0 0 1rem 0;
  color: #303133;
}

.angular-container :deep(.activity-item),
.angular-container :deep(.job-item) {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.angular-container :deep(.activity-item:last-child),
.angular-container :deep(.job-item:last-child) {
  border-bottom: none;
}

.angular-container :deep(.activity-time),
.angular-container :deep(.job-time) {
  color: #909399;
  font-size: 0.875rem;
  min-width: 60px;
}

.angular-container :deep(.job-status) {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.angular-container :deep(.job-status.success) {
  background: #f0f9ff;
  color: #67c23a;
}

.angular-container :deep(.job-status.running) {
  background: #fdf6ec;
  color: #e6a23c;
}

.angular-container :deep(.job-status.failed) {
  background: #fef0f0;
  color: #f56c6c;
}
</style>
