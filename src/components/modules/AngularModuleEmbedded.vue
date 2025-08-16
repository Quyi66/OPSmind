<template>
  <div class="angular-module-embedded">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <el-loading-directive v-loading="loading" element-loading-text="正在加载模块...">
        <div style="height: 400px;"></div>
      </el-loading-directive>
    </div>

    <!-- 错误状态 -->
    <div v-if="error" class="error-state">
      <el-alert
        :title="`${moduleName} 模块加载失败`"
        :description="error"
        type="error"
        show-icon
        :closable="false"
      >
        <template #default>
          <el-button @click="retryLoad" type="primary" size="small">重试</el-button>
        </template>
      </el-alert>
    </div>

    <!-- Angular 模块容器 -->
    <div
      v-show="!loading && !error"
      ref="angularContainer"
      class="angular-container"
      :id="`angular-module-${moduleCode}`"
    ></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { ElAlert, ElButton } from 'element-plus'
import { authService } from '@/services/auth'

const props = defineProps({
  moduleCode: {
    type: String,
    required: true,
    validator: (value) => ['cac', 'jao', 'dts', 'udp', 'gfs', 'acm'].includes(value)
  },
  moduleName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['loaded', 'error', 'ready'])

// 响应式数据
const loading = ref(false)
const error = ref('')
const angularContainer = ref(null)
const angularScope = ref(null)
const angularElement = ref(null)

// 模块配置
const moduleConfigs = {
  cac: {
    moduleName: 'oplus.cac',
    dependencies: [
      '/app/modules/cac/cac.module.js',
      '/app/modules/cac/cac.service.js',
      '/app/modules/cac/cac.controller.js',
      '/app/modules/cac/cac.state.js'
    ],
    styles: [
      '/content/css/oplus-cac.css'
    ],
    templateUrl: '/app/modules/cac/cac-index.html',
    controller: 'cacCtrl',
    controllerAs: 'cacVm'
  },
  jao: {
    moduleName: 'oplus.jao',
    dependencies: [
      '/app/modules/jao/jao.module.js',
      '/app/modules/jao/jao.state.js',
      '/app/modules/jao/job.service.js'
    ],
    styles: [
      '/content/css/oplus-jao.css'
    ],
    templateUrl: '/app/modules/jao/jao-index.html'
  }
}

// 加载 AngularJS 模块
const loadAngularModule = async () => {
  try {
    loading.value = true
    error.value = ''
    
    console.log('🔄 Loading AngularJS module:', props.moduleCode)
    
    const config = moduleConfigs[props.moduleCode]
    if (!config) {
      throw new Error(`不支持的模块: ${props.moduleCode}`)
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
    console.log('✅ AngularJS module loaded successfully:', props.moduleCode)
    
    emit('loaded', props.moduleCode)
    
  } catch (err) {
    console.error('❌ Failed to load AngularJS module:', err)
    error.value = err.message || '模块加载失败'
    loading.value = false
    emit('error', { moduleCode: props.moduleCode, error: error.value })
  }
}

// 确保 AngularJS 已加载
const ensureAngularJSLoaded = async () => {
  if (window.angular) {
    return Promise.resolve()
  }
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = '/lib/angular/angular.js'
    script.onload = () => {
      console.log('✅ AngularJS core loaded')
      resolve()
    }
    script.onerror = () => reject(new Error('Failed to load AngularJS'))
    document.head.appendChild(script)
  })
}

// 加载模块样式
const loadModuleStyles = async (styles) => {
  const promises = styles.map(styleUrl => {
    return new Promise((resolve, reject) => {
      // 检查是否已加载
      if (document.querySelector(`link[href="${styleUrl}"]`)) {
        resolve()
        return
      }
      
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = styleUrl
      link.onload = resolve
      link.onerror = () => reject(new Error(`Failed to load style: ${styleUrl}`))
      document.head.appendChild(link)
    })
  })
  
  await Promise.all(promises)
  console.log('✅ Module styles loaded')
}

// 加载模块依赖
const loadModuleDependencies = async (dependencies) => {
  for (const dep of dependencies) {
    await loadScript(dep)
  }
  console.log('✅ Module dependencies loaded')
}

// 加载脚本
const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    // 检查是否已加载
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    
    const script = document.createElement('script')
    script.src = src
    script.onload = resolve
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
    document.head.appendChild(script)
  })
}

// 创建 AngularJS 应用
const createAngularApp = async (config) => {
  await nextTick()
  
  if (!angularContainer.value) {
    throw new Error('Angular container not found')
  }
  
  // 设置认证信息
  setupAuthBridge()
  
  // 创建一个独立的 AngularJS 模块
  const appModuleName = `embedded-${props.moduleCode}-${Date.now()}`
  
  // 定义嵌入式模块，依赖目标模块
  window.angular.module(appModuleName, [config.moduleName, 'ui.router'])
    .controller('EmbeddedController', ['$scope', '$state', function($scope, $state) {
      console.log('🎯 Embedded AngularJS controller initialized')
      
      $scope.moduleCode = props.moduleCode
      $scope.moduleName = props.moduleName
      
      // 模块特定的初始化逻辑
      if (props.moduleCode === 'cac') {
        initCacModule($scope)
      }
      
      // 通知Vue组件模块已准备就绪
      emit('ready', {
        moduleCode: props.moduleCode,
        scope: $scope,
        state: $state
      })
    }])
  
  // 加载模板
  const template = await loadTemplate(config.templateUrl)
  angularContainer.value.innerHTML = template
  
  // 启动 AngularJS 应用
  angularElement.value = window.angular.element(angularContainer.value)
  window.angular.bootstrap(angularContainer.value, [appModuleName])
  angularScope.value = angularElement.value.scope()
  
  console.log('🚀 AngularJS app bootstrapped with module:', props.moduleCode)
}

// 设置认证桥接
const setupAuthBridge = () => {
  const token = authService.getToken()
  const user = authService.getCurrentUser()
  
  if (token && user) {
    // 设置全局变量供 AngularJS 使用
    window.vueAuthToken = token
    window.vueUserInfo = user
    
    console.log('🔗 Auth bridge setup for embedded module')
  }
}

// 初始化CAC模块特定逻辑
const initCacModule = (scope) => {
  scope.views = {
    chosed: "",
    emailMenuEnabled: "yes"
  }
  
  scope.startInspection = function() {
    console.log('开始系统巡检...')
    // 调用真实的 CAC 服务
  }
  
  scope.viewReports = function() {
    console.log('查看巡检报告...')
  }
  
  scope.manageHosts = function() {
    console.log('主机管理...')
  }
}

// 加载模板
const loadTemplate = async (templateUrl) => {
  try {
    const response = await fetch(templateUrl)
    if (!response.ok) {
      throw new Error(`Failed to load template: ${response.status}`)
    }
    return await response.text()
  } catch (err) {
    console.error('Failed to load template:', err)
    return '<div class="alert alert-danger">模板加载失败</div>'
  }
}

// 重试加载
const retryLoad = () => {
  loadAngularModule()
}

// 清理资源
const cleanup = () => {
  if (angularScope.value) {
    angularScope.value.$destroy()
  }
  if (angularContainer.value) {
    angularContainer.value.innerHTML = ''
  }
  angularScope.value = null
  angularElement.value = null
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
  getScope: () => angularScope.value,
  getElement: () => angularElement.value
})
</script>

<style scoped>
.angular-module-embedded {
  width: 100%;
  height: 100%;
  min-height: 500px;
}

.angular-container {
  width: 100%;
  height: 100%;
}

.loading-state,
.error-state {
  padding: 2rem;
}

/* 确保Angular样式不影响Vue组件 */
.angular-container :deep(.ng-scope) {
  /* Angular特定样式隔离 */
}
</style>
