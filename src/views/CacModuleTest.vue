<template>
  <div class="cac-module-test">
    <div class="test-header">
      <h1>CAC 模块测试页面</h1>
      <p>测试从Vue仪表盘启动CAC配置管理模块</p>
    </div>

    <div class="test-controls">
      <el-card>
        <template #header>
          <span>测试控制</span>
        </template>
        
        <div class="control-buttons">
          <el-button 
            @click="openCacModule" 
            type="primary" 
            size="large"
            :loading="loading"
          >
            <i class="fas fa-cogs"></i>
            启动 CAC 配置管理模块
          </el-button>
          
          <el-button 
            @click="switchToEmbeddedMode" 
            type="success" 
            size="large"
          >
            <i class="fas fa-puzzle-piece"></i>
            切换到嵌入模式
          </el-button>
        </div>

        <div class="test-info">
          <el-alert
            title="测试说明"
            type="info"
            :closable="false"
          >
            <p>点击上方按钮将会：</p>
            <ul>
              <li>触发 showAngularModuleContainer 事件</li>
              <li>在模态框中直接嵌入 CAC 模块</li>
              <li>使用纯Vue + AngularJS 直接集成</li>
              <li>自动传递认证信息</li>
              <li>支持iframe和嵌入两种模式</li>
            </ul>
          </el-alert>
        </div>
      </el-card>
    </div>

    <div class="test-logs">
      <el-card>
        <template #header>
          <div class="logs-header">
            <span>操作日志</span>
            <el-button @click="clearLogs" size="small">清除</el-button>
          </div>
        </template>
        
        <div class="logs-content">
          <div 
            v-for="(log, index) in logs" 
            :key="index" 
            class="log-item"
          >
            <span class="log-time">{{ formatTime(log.timestamp) }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
          
          <div v-if="logs.length === 0" class="no-logs">
            暂无操作日志
          </div>
        </div>
      </el-card>
    </div>



    <!-- 模态框容器 -->
    <AngularModuleContainerModal />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElCard, ElButton, ElAlert, ElMessage } from 'element-plus'
import AngularModuleContainerModal from '@/components/AngularModuleContainerModal.vue'

// 响应式数据
const loading = ref(false)
const logs = ref([])

// 方法
const addLog = (message) => {
  logs.value.unshift({
    message,
    timestamp: Date.now()
  })
  
  // 限制日志数量
  if (logs.value.length > 20) {
    logs.value = logs.value.slice(0, 20)
  }
}

const openCacModule = () => {
  loading.value = true
  addLog('🚀 触发 CAC 模块启动事件')
  
  try {
    // 触发显示AngularJS容器模块的事件
    const event = new CustomEvent('showAngularModuleContainer', {
      detail: {
        moduleCode: 'cac',
        title: '配置管理 (CAC)',
        viewMode: 'iframe'
      }
    })
    window.dispatchEvent(event)
    
    addLog('✅ 成功触发 showAngularModuleContainer 事件')
    ElMessage.success('CAC 模块启动中...')
    
  } catch (error) {
    addLog(`❌ 启动失败: ${error.message}`)
    ElMessage.error('CAC 模块启动失败')
  } finally {
    setTimeout(() => {
      loading.value = false
    }, 1000)
  }
}

const switchToEmbeddedMode = () => {
  addLog('🔄 切换到嵌入模式')
  
  try {
    // 触发显示AngularJS容器模块的事件（嵌入模式）
    const event = new CustomEvent('showAngularModuleContainer', {
      detail: {
        moduleCode: 'cac',
        title: '配置管理 (CAC)',
        viewMode: 'embedded'
      }
    })
    window.dispatchEvent(event)
    
    addLog('✅ 成功触发嵌入模式事件')
    ElMessage.success('CAC 模块（嵌入模式）启动中...')
    
  } catch (error) {
    addLog(`❌ 切换失败: ${error.message}`)
    ElMessage.error('切换到嵌入模式失败')
  }
}

const clearLogs = () => {
  logs.value = []
  addLog('🧹 日志已清除')
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString()
}

// 生命周期
onMounted(() => {
  addLog('📱 CAC 模块测试页面已加载')
  
  // 监听模块容器事件
  const handleModuleEvent = (event) => {
    addLog(`📨 收到模块事件: ${event.type}`)
  }
  
  window.addEventListener('showAngularModuleContainer', handleModuleEvent)
  
  // 清理
  return () => {
    window.removeEventListener('showAngularModuleContainer', handleModuleEvent)
  }
})
</script>

<style scoped>
.cac-module-test {
  padding: 2rem;
  max-width: 1000px;
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
  margin-bottom: 2rem;
}

.control-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.test-info {
  margin-top: 1rem;
}

.test-info ul {
  margin: 0.5rem 0 0 1rem;
  padding: 0;
}

.test-info li {
  margin-bottom: 0.25rem;
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

.log-time {
  color: #909399;
  min-width: 80px;
  flex-shrink: 0;
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
  .cac-module-test {
    padding: 1rem;
  }
  
  .control-buttons {
    flex-direction: column;
    align-items: center;
  }
  
  .control-buttons .el-button {
    width: 100%;
    max-width: 300px;
  }
}
</style>