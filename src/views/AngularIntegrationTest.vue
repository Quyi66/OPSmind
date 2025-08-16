<template>
  <div class="angular-integration-test">
    <div class="test-header">
      <h1>AngularJS 集成测试</h1>
      <p>测试Vue中嵌入AngularJS 1.5.8模块的功能</p>
    </div>

    <div class="test-controls">
      <el-card class="control-card">
        <template #header>
          <span>测试控制</span>
        </template>
        
        <div class="control-group">
          <label>选择模块:</label>
          <el-select v-model="selectedModule" @change="onModuleChange">
            <el-option
              v-for="module in availableModules"
              :key="module.code"
              :label="module.title"
              :value="module.code"
            />
          </el-select>
        </div>

        <div class="control-group">
          <label>视图模式:</label>
          <el-radio-group v-model="viewMode" @change="onViewModeChange">
            <el-radio value="iframe">iframe模式</el-radio>
            <el-radio value="embedded" :disabled="!supportsEmbedded">嵌入模式</el-radio>
          </el-radio-group>
        </div>

        <div class="control-actions">
          <el-button @click="loadModule" type="primary" :loading="loading">
            加载模块
          </el-button>
          <el-button @click="refreshModule" :disabled="!moduleLoaded">
            刷新
          </el-button>
          <el-button @click="clearModule" :disabled="!moduleLoaded">
            清除
          </el-button>
        </div>
      </el-card>

      <el-card class="status-card">
        <template #header>
          <span>状态信息</span>
        </template>
        
        <div class="status-item">
          <span class="status-label">模块状态:</span>
          <el-tag :type="getStatusType(moduleStatus)">{{ moduleStatus }}</el-tag>
        </div>
        
        <div class="status-item" v-if="loadTime">
          <span class="status-label">加载时间:</span>
          <span>{{ loadTime }}ms</span>
        </div>
        
        <div class="status-item" v-if="errorMessage">
          <span class="status-label">错误信息:</span>
          <span class="error-text">{{ errorMessage }}</span>
        </div>
      </el-card>
    </div>

    <div class="test-content">
      <el-card class="module-card">
        <template #header>
          <div class="module-header">
            <span>{{ currentModuleTitle }}</span>
            <el-button 
              v-if="moduleLoaded" 
              @click="openInNewWindow" 
              size="small" 
              type="primary"
            >
              新窗口打开
            </el-button>
          </div>
        </template>
        
        <div class="module-container" v-if="showModule">
          <AngularModuleContainer
            :key="`test-${selectedModule}-${refreshKey}`"
            :module-code="selectedModule"
            :view-mode="viewMode"
            :show-header="false"
            :show-status-bar="true"
            @loaded="onModuleLoaded"
            @error="onModuleError"
            @message="onModuleMessage"
            @ready="onModuleReady"
          />
        </div>
        
        <div v-else class="empty-state">
          <el-empty description="请选择一个模块进行测试" />
        </div>
      </el-card>
    </div>

    <!-- 消息日志 -->
    <div class="test-logs">
      <el-card class="logs-card">
        <template #header>
          <div class="logs-header">
            <span>消息日志</span>
            <el-button @click="clearLogs" size="small">清除日志</el-button>
          </div>
        </template>
        
        <div class="logs-content">
          <div 
            v-for="(log, index) in logs" 
            :key="index" 
            class="log-item"
            :class="log.type"
          >
            <span class="log-time">{{ formatTime(log.timestamp) }}</span>
            <span class="log-type">{{ log.type.toUpperCase() }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
          
          <div v-if="logs.length === 0" class="no-logs">
            暂无日志信息
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { 
  ElCard, ElSelect, ElOption, ElRadioGroup, ElRadio, 
  ElButton, ElTag, ElEmpty, ElMessage 
} from 'element-plus'
import AngularModuleContainer from '@/components/modules/AngularModuleContainer.vue'

// 响应式数据
const selectedModule = ref('cac')
const viewMode = ref('iframe')
const loading = ref(false)
const moduleLoaded = ref(false)
const moduleStatus = ref('未加载')
const loadTime = ref(null)
const errorMessage = ref('')
const showModule = ref(false)
const refreshKey = ref(0)
const logs = ref([])

// 可用模块
const availableModules = [
  { code: 'cac', title: 'CAC 配置管理', supportsEmbedded: true },
  { code: 'jao', title: 'JAO 作业编排', supportsEmbedded: true },
  { code: 'gfs', title: 'GFS 脚本管理', supportsEmbedded: false },
  { code: 'dts', title: 'DTS 数据传输', supportsEmbedded: false },
  { code: 'udp', title: 'UDP 统一开发平台', supportsEmbedded: false }
]

// 计算属性
const currentModuleConfig = computed(() => {
  return availableModules.find(m => m.code === selectedModule.value) || {}
})

const currentModuleTitle = computed(() => {
  return currentModuleConfig.value.title || selectedModule.value.toUpperCase()
})

const supportsEmbedded = computed(() => {
  return currentModuleConfig.value.supportsEmbedded || false
})

// 方法
const addLog = (type, message) => {
  logs.value.unshift({
    type,
    message,
    timestamp: Date.now()
  })
  
  // 限制日志数量
  if (logs.value.length > 50) {
    logs.value = logs.value.slice(0, 50)
  }
}

const onModuleChange = () => {
  addLog('info', `切换到模块: ${currentModuleTitle.value}`)
  
  // 如果当前模式不支持嵌入，切换到iframe模式
  if (viewMode.value === 'embedded' && !supportsEmbedded.value) {
    viewMode.value = 'iframe'
    addLog('warning', '该模块不支持嵌入模式，已切换到iframe模式')
  }
  
  // 重置状态
  resetModuleState()
}

const onViewModeChange = () => {
  addLog('info', `切换视图模式: ${viewMode.value}`)
  if (showModule.value) {
    refreshModule()
  }
}

const loadModule = () => {
  addLog('info', `开始加载模块: ${currentModuleTitle.value} (${viewMode.value}模式)`)
  showModule.value = true
  loading.value = true
  moduleStatus.value = '加载中'
  errorMessage.value = ''
}

const refreshModule = () => {
  addLog('info', '刷新模块')
  refreshKey.value++
  resetModuleState()
  if (showModule.value) {
    loadModule()
  }
}

const clearModule = () => {
  addLog('info', '清除模块')
  showModule.value = false
  resetModuleState()
}

const resetModuleState = () => {
  moduleLoaded.value = false
  moduleStatus.value = '未加载'
  loadTime.value = null
  errorMessage.value = ''
  loading.value = false
}

const openInNewWindow = () => {
  const url = buildModuleUrl()
  window.open(url, '_blank')
  addLog('info', '在新窗口打开模块')
}

const buildModuleUrl = () => {
  const containerUrl = import.meta.env.DEV 
    ? 'http://localhost:3000/angular-container.html'
    : '/angular-container.html'
  
  return `${containerUrl}?module=${selectedModule.value}&t=${Date.now()}`
}

const clearLogs = () => {
  logs.value = []
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString()
}

const getStatusType = (status) => {
  switch (status) {
    case '已加载': return 'success'
    case '加载中': return 'warning'
    case '加载失败': return 'danger'
    default: return 'info'
  }
}

// 事件处理
const onModuleLoaded = (moduleCode) => {
  loading.value = false
  moduleLoaded.value = true
  moduleStatus.value = '已加载'
  addLog('success', `模块加载成功: ${moduleCode}`)
}

const onModuleError = ({ moduleCode, error }) => {
  loading.value = false
  moduleLoaded.value = false
  moduleStatus.value = '加载失败'
  errorMessage.value = error
  addLog('error', `模块加载失败: ${moduleCode} - ${error}`)
}

const onModuleMessage = ({ moduleCode, data }) => {
  addLog('info', `收到模块消息: ${moduleCode} - ${JSON.stringify(data)}`)
}

const onModuleReady = ({ moduleCode, appName }) => {
  addLog('success', `模块已准备就绪: ${moduleCode} (${appName})`)
}

// 生命周期
onMounted(() => {
  addLog('info', 'AngularJS集成测试页面已加载')
})
</script>

<style scoped>
.angular-integration-test {
  padding: 1rem;
  max-width: 1400px;
  margin: 0 auto;
}

.test-header {
  text-align: center;
  margin-bottom: 2rem;
}

.test-header h1 {
  color: #303133;
  margin-bottom: 0.5rem;
}

.test-header p {
  color: #909399;
  margin: 0;
}

.test-controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 2rem;
}

.control-card,
.status-card {
  height: fit-content;
}

.control-group {
  margin-bottom: 1rem;
}

.control-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #606266;
}

.control-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.status-label {
  font-weight: 500;
  color: #606266;
}

.error-text {
  color: #f56c6c;
  font-size: 0.875rem;
}

.test-content {
  margin-bottom: 2rem;
}

.module-card {
  min-height: 600px;
}

.module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.module-container {
  height: 500px;
}

.empty-state {
  height: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.test-logs {
  margin-top: 2rem;
}

.logs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logs-content {
  max-height: 300px;
  overflow-y: auto;
}

.log-item {
  display: flex;
  gap: 1rem;
  padding: 0.5rem;
  border-bottom: 1px solid #f0f0f0;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
}

.log-item.success {
  background-color: #f0f9ff;
  border-left: 3px solid #67c23a;
}

.log-item.error {
  background-color: #fef0f0;
  border-left: 3px solid #f56c6c;
}

.log-item.warning {
  background-color: #fdf6ec;
  border-left: 3px solid #e6a23c;
}

.log-item.info {
  background-color: #f4f4f5;
  border-left: 3px solid #909399;
}

.log-time {
  color: #909399;
  min-width: 80px;
}

.log-type {
  color: #606266;
  font-weight: 500;
  min-width: 60px;
}

.log-message {
  flex: 1;
  color: #303133;
}

.no-logs {
  text-align: center;
  color: #909399;
  padding: 2rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .test-controls {
    grid-template-columns: 1fr;
  }
  
  .control-actions {
    justify-content: center;
  }
  
  .module-container {
    height: 400px;
  }
}
</style>