<template>
  <div class="iframe-resource-test">
    <div class="test-header">
      <h2>iframe 资源管理测试</h2>
      <p>测试 ERR_INSUFFICIENT_RESOURCES 错误修复</p>
    </div>

    <div class="test-controls">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-card>
            <template #header>快速切换测试</template>
            <el-button-group>
              <el-button 
                v-for="module in testModules" 
                :key="module.code"
                @click="switchModule(module.code)"
                :type="currentModule === module.code ? 'primary' : 'default'"
                size="small"
              >
                {{ module.name }}
              </el-button>
            </el-button-group>
          </el-card>
        </el-col>

        <el-col :span="8">
          <el-card>
            <template #header>压力测试</template>
            <el-button @click="startStressTest" :loading="stressTestRunning" type="warning">
              {{ stressTestRunning ? '测试中...' : '开始压力测试' }}
            </el-button>
            <p v-if="stressTestCount > 0">已切换 {{ stressTestCount }} 次</p>
          </el-card>
        </el-col>

        <el-col :span="8">
          <el-card>
            <template #header>错误监控</template>
            <el-tag :type="errorCount > 0 ? 'danger' : 'success'">
              错误数: {{ errorCount }}
            </el-tag>
            <el-button @click="clearErrors" size="small" style="margin-left: 10px;">
              清除
            </el-button>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <div class="test-logs">
      <el-card>
        <template #header>
          <span>测试日志</span>
          <el-button @click="clearLogs" size="small" style="float: right;">清除日志</el-button>
        </template>
        <div class="logs-container">
          <div 
            v-for="(log, index) in logs" 
            :key="index"
            :class="['log-item', `log-${log.type}`]"
          >
            <span class="log-time">{{ log.time }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
      </el-card>
    </div>

    <div class="iframe-container">
      <AngularModuleFrame
        v-if="currentModule"
        :key="`test-${currentModule}-${refreshKey}`"
        :module-code="currentModule"
        :show-header="false"
        :show-status-bar="true"
        @loaded="onModuleLoaded"
        @error="onModuleError"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ElRow, ElCol, ElCard, ElButton, ElButtonGroup, ElTag } from 'element-plus'
import AngularModuleFrame from '@/components/modules/AngularModuleFrame.vue'

// 响应式数据
const currentModule = ref('')
const refreshKey = ref(0)
const errorCount = ref(0)
const logs = ref([])
const stressTestRunning = ref(false)
const stressTestCount = ref(0)

// 测试模块列表
const testModules = [
  { code: 'cac', name: '系统巡检' },
  { code: 'jao', name: '作业管理' },
  { code: 'gfs', name: '脚本管理' },
  { code: 'cmd', name: '命令管理' },
  { code: 'password', name: '密码管理' }
]

// 添加日志
const addLog = (message, type = 'info') => {
  logs.value.unshift({
    time: new Date().toLocaleTimeString(),
    message,
    type
  })
  
  // 限制日志数量
  if (logs.value.length > 50) {
    logs.value = logs.value.slice(0, 50)
  }
}

// 切换模块
const switchModule = (moduleCode) => {
  addLog(`切换到模块: ${moduleCode}`, 'info')
  currentModule.value = moduleCode
  refreshKey.value++
}

// 开始压力测试
const startStressTest = async () => {
  if (stressTestRunning.value) return
  
  stressTestRunning.value = true
  stressTestCount.value = 0
  
  addLog('开始压力测试...', 'warning')
  
  try {
    for (let i = 0; i < 20; i++) {
      const moduleIndex = i % testModules.length
      const module = testModules[moduleIndex]
      
      addLog(`压力测试 ${i + 1}/20: ${module.name}`, 'info')
      switchModule(module.code)
      stressTestCount.value++
      
      // 等待一段时间再切换
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    addLog('压力测试完成', 'success')
  } catch (error) {
    addLog(`压力测试失败: ${error.message}`, 'error')
  } finally {
    stressTestRunning.value = false
  }
}

// 模块加载成功
const onModuleLoaded = (moduleCode) => {
  addLog(`模块 ${moduleCode} 加载成功`, 'success')
}

// 模块加载错误
const onModuleError = (error) => {
  errorCount.value++
  addLog(`模块加载错误: ${error.error}`, 'error')
}

// 清除错误计数
const clearErrors = () => {
  errorCount.value = 0
  addLog('错误计数已清除', 'info')
}

// 清除日志
const clearLogs = () => {
  logs.value = []
}

// 监听全局错误
let errorHandler = null

onMounted(() => {
  // 监听资源不足错误
  errorHandler = (event) => {
    if (event.message?.includes('ERR_INSUFFICIENT_RESOURCES')) {
      errorCount.value++
      addLog('检测到 ERR_INSUFFICIENT_RESOURCES 错误', 'error')
    }
  }
  
  window.addEventListener('error', errorHandler)
  addLog('iframe 资源测试页面已加载', 'success')
})

onUnmounted(() => {
  if (errorHandler) {
    window.removeEventListener('error', errorHandler)
  }
})
</script>

<style scoped>
.iframe-resource-test {
  padding: 20px;
}

.test-header {
  margin-bottom: 20px;
  text-align: center;
}

.test-controls {
  margin-bottom: 20px;
}

.test-logs {
  margin-bottom: 20px;
}

.logs-container {
  max-height: 300px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 12px;
}

.log-item {
  padding: 2px 0;
  border-bottom: 1px solid #f0f0f0;
}

.log-time {
  color: #666;
  margin-right: 10px;
}

.log-success {
  color: #67c23a;
}

.log-error {
  color: #f56c6c;
}

.log-warning {
  color: #e6a23c;
}

.log-info {
  color: #409eff;
}

.iframe-container {
  height: 600px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
</style>
