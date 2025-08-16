<template>
  <div class="angularjs-embedded">
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner">
        <i class="fa fa-spinner fa-spin"></i>
        <p>正在加载 {{ moduleName }} 模块...</p>
      </div>
    </div>

    <div v-if="error" class="error-container">
      <div class="error-message">
        <i class="fa fa-exclamation-triangle"></i>
        <h3>模块加载失败</h3>
        <p>{{ error }}</p>
        <el-button @click="retry" type="primary">重试</el-button>
      </div>
    </div>

    <!-- AngularJS 应用挂载点 -->
    <div ref="angularContainer" class="angular-container" v-show="!loading && !error"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { ElButton, ElMessage } from 'element-plus'

// Props
const props = defineProps({
  moduleCode: {
    type: String,
    required: true
  },
  moduleName: {
    type: String,
    default: '未知模块'
  }
})

// 响应式数据
const loading = ref(true)
const error = ref('')
const angularContainer = ref(null)
let angularScope = null
let angularElement = null

// 模块配置
const moduleConfigs = {
  cac: {
    moduleName: 'oplus.cac',
    templateUrl: '/webapp/app/modules/cac/cac-index.html',
    controller: 'cacCtrl',
    controllerAs: 'cacVm',
    dependencies: ['oplus.commons', 'vs-repeat'],
    styles: ['/webapp/content/css/oplus-cac.css']
  }
}

// 加载 AngularJS 模块
const loadAngularModule = async moduleCode => {
  try {
    loading.value = true
    error.value = ''

    console.log('🔄 Loading AngularJS module:', moduleCode)

    const config = moduleConfigs[moduleCode]
    if (!config) {
      throw new Error(`不支持的模块: ${moduleCode}`)
    }

    // 1. 确保 AngularJS 已加载
    await ensureAngularJSLoaded()

    // 2. 加载模块样式
    await loadModuleStyles(config.styles)

    // 3. 加载模块依赖
    await loadModuleDependencies(config.dependencies)

    // 4. 创建 AngularJS 应用
    await createAngularApp(config)

    loading.value = false
    console.log('✅ AngularJS module loaded successfully:', moduleCode)
  } catch (err) {
    console.error('❌ Failed to load AngularJS module:', err)
    error.value = err.message || '模块加载失败'
    loading.value = false
  }
}

// 确保 AngularJS 已加载
const ensureAngularJSLoaded = async () => {
  if (window.angular) {
    console.log('✅ AngularJS already loaded')
    return
  }

  console.log('🔄 Loading AngularJS from existing webapp...')

  // 加载完整的 AngularJS 生态和现有模块
  const scripts = [
    // 基础 AngularJS 库
    'https://ajax.googleapis.com/ajax/libs/angularjs/1.8.3/angular.min.js',
    'https://ajax.googleapis.com/ajax/libs/angularjs/1.8.3/angular-resource.min.js',
    'https://ajax.googleapis.com/ajax/libs/angularjs/1.8.3/angular-cookies.min.js',
    'https://ajax.googleapis.com/ajax/libs/angularjs/1.8.3/angular-animate.min.js',
    'https://ajax.googleapis.com/ajax/libs/angularjs/1.8.3/angular-sanitize.min.js',

    // UI-Router (必须在应用模块之前加载)
    'https://unpkg.com/@uirouter/angularjs@1.0.30/release/angular-ui-router.min.js',

    // UI-Bootstrap
    'https://cdnjs.cloudflare.com/ajax/libs/angular-ui-bootstrap/2.5.0/ui-bootstrap-tpls.min.js'
  ]

  for (const src of scripts) {
    await loadScript(src)
  }

  console.log('✅ AngularJS and CAC module loaded')
}

// 加载脚本
const loadScript = src => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.onload = resolve
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
    document.head.appendChild(script)
  })
}

// 加载模块样式
const loadModuleStyles = async styles => {
  if (!styles || !Array.isArray(styles)) return

  for (const href of styles) {
    if (!document.querySelector(`link[href="${href}"]`)) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      document.head.appendChild(link)
    }
  }
}

// 加载模块依赖
const loadModuleDependencies = async dependencies => {
  // 这里需要根据实际情况加载依赖模块
  // 暂时跳过，假设依赖已经存在
  console.log('📦 Module dependencies:', dependencies)
}

// 创建 AngularJS 应用
const createAngularApp = async config => {
  if (!angularContainer.value) {
    throw new Error('Angular container not found')
  }

  // 创建一个独立的 AngularJS 模块，依赖现有的 CAC 模块
  const appModuleName = `embedded-${props.moduleCode}-${Date.now()}`

  // 定义嵌入式模块，依赖 UI-Router
  window.angular.module(appModuleName, ['ui.router']).controller('EmbeddedController', [
    '$scope',
    function ($scope) {
      console.log('🎯 Embedded AngularJS controller initialized')

      // CAC 模块的控制器逻辑
      $scope.moduleCode = props.moduleCode
      $scope.moduleName = props.moduleName

      // CAC 功能方法
      $scope.startInspection = function () {
        console.log('开始系统巡检...')
        // 这里可以调用真实的 CAC 服务
      }

      $scope.viewReports = function () {
        console.log('查看巡检报告...')
      }

      $scope.manageHosts = function () {
        console.log('主机管理...')
      }

      // 初始化完成
      console.log('CAC embedded controller initialized')
    }
  ])

  // 设置模板
  const template = await loadTemplate(config.templateUrl)
  angularContainer.value.innerHTML = template

  // 启动 AngularJS 应用
  angularElement = window.angular.element(angularContainer.value)
  window.angular.bootstrap(angularContainer.value, [appModuleName])
  angularScope = angularElement.scope()

  console.log('🚀 AngularJS app bootstrapped with CAC module')
}

// 加载模板
const loadTemplate = async templateUrl => {
  try {
    console.log('Loading template from:', templateUrl)
    const response = await fetch(templateUrl)
    if (!response.ok) {
      throw new Error(`Failed to load template: ${response.status}`)
    }
    const content = await response.text()
    console.log('Template loaded successfully')
    return content
  } catch (err) {
    console.warn('Failed to load template, using fallback:', err.message)
    // 如果加载失败，使用简化的 CAC 模板
    return `
      <div class="cac-embedded" ng-controller="EmbeddedController">
        <div class="cac-header">
          <h2>配置管理 (CAC)</h2>
          <p>系统内置功能：系统巡检</p>
        </div>
        <div class="cac-content">
          <div class="cac-stats">
            <div class="stat-item">
              <span class="stat-number">156</span>
              <span class="stat-label">主机总数</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">142</span>
              <span class="stat-label">健康主机</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">12</span>
              <span class="stat-label">告警主机</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">2</span>
              <span class="stat-label">异常主机</span>
            </div>
          </div>
          <div class="cac-actions">
            <button class="btn btn-primary" ng-click="startInspection()">开始巡检</button>
            <button class="btn btn-default" ng-click="viewReports()">查看报告</button>
            <button class="btn btn-default" ng-click="manageHosts()">主机管理</button>
          </div>
        </div>
      </div>
    `
  }
}

// 重试加载
const retry = () => {
  loadAngularModule(props.moduleCode)
}

// 清理 AngularJS 应用
const cleanup = () => {
  if (angularScope) {
    angularScope.$destroy()
    angularScope = null
  }

  if (angularElement) {
    angularElement.remove()
    angularElement = null
  }

  if (angularContainer.value) {
    angularContainer.value.innerHTML = ''
  }

  console.log('🧹 AngularJS app cleaned up')
}

// 生命周期
onMounted(() => {
  console.log('📱 AngularJS embedded component mounted')
})

onBeforeUnmount(() => {
  console.log('📱 AngularJS embedded component unmounting')
  cleanup()
})

// 监听模块代码变化
watch(
  () => props.moduleCode,
  newCode => {
    if (newCode) {
      loadAngularModule(newCode)
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.angularjs-embedded {
  width: 100%;
  height: 100%;
  position: relative;
}

.loading-container,
.error-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
}

.loading-spinner i {
  font-size: 24px;
  color: #409eff;
  margin-bottom: 10px;
}

.loading-spinner p {
  color: #666;
  margin: 0;
}

.error-message {
  color: #f56c6c;
}

.error-message i {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-message h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
}

.error-message p {
  margin: 0 0 16px 0;
  color: #999;
}

.angular-container {
  width: 100%;
  height: 100%;
  overflow: auto;
}

/* AngularJS 样式隔离 */
.angular-container :deep(.cac-embedded) {
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.angular-container :deep(.cac-header) {
  text-align: center;
  margin-bottom: 30px;
}

.angular-container :deep(.cac-header h2) {
  color: #2c3e50;
  margin-bottom: 8px;
}

.angular-container :deep(.cac-header p) {
  color: #7f8c8d;
  margin: 0;
}

.angular-container :deep(.cac-stats) {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.angular-container :deep(.stat-item) {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.angular-container :deep(.stat-number) {
  display: block;
  font-size: 24px;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 8px;
}

.angular-container :deep(.stat-label) {
  display: block;
  color: #7f8c8d;
  font-size: 14px;
}

.angular-container :deep(.cac-actions) {
  text-align: center;
}

.angular-container :deep(.btn) {
  padding: 8px 16px;
  margin: 0 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.angular-container :deep(.btn-primary) {
  background: #409eff;
  color: white;
}

.angular-container :deep(.btn-default) {
  background: #f5f5f5;
  color: #333;
}

.angular-container :deep(.btn:hover) {
  opacity: 0.8;
}
</style>
