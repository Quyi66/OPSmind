<template>
  <div class="module-demo">
    <el-container>
      <el-header class="demo-header">
        <h1>Angular 模块集成演示</h1>
        <p>在 Vue 3 中嵌入 Angular 1.5.8 模块</p>
      </el-header>
      
      <el-main>
        <el-tabs v-model="activeTab" type="card" @tab-change="handleTabChange">
          <!-- Angular 模块集成 -->
          <el-tab-pane label="Angular 模块" name="modules">
            <el-card>
              <template #header>
                <div class="card-header">
                  <span>Angular 模块集成演示</span>
                  <el-button-group>
                    <el-button
                      v-for="module in availableModules"
                      :key="module.code"
                      :type="currentModule === module.code ? 'primary' : 'default'"
                      size="small"
                      @click="switchModule(module.code)"
                    >
                      {{ module.name }}
                    </el-button>
                  </el-button-group>
                </div>
              </template>

              <div class="module-container">
                <AngularModuleFrame
                  :key="`demo-${currentModule}-${refreshKey}`"
                  :module-code="currentModule"
                  :show-header="true"
                  :show-status-bar="true"
                  @loaded="onModuleLoaded"
                  @error="onModuleError"
                  @route-change="onRouteChange"
                  @message="onModuleMessage"
                />
              </div>
            </el-card>
          </el-tab-pane>
          
          <!-- 状态监控 -->
          <el-tab-pane label="状态监控" name="status">
            <el-card>
              <template #header>
                <span>模块状态监控</span>
              </template>
              
              <el-row :gutter="20">
                <el-col :span="12">
                  <h3>认证状态</h3>
                  <el-descriptions :column="1" border>
                    <el-descriptions-item label="认证状态">
                      <el-tag :type="authStatus.isAuthenticated ? 'success' : 'danger'">
                        {{ authStatus.isAuthenticated ? '已认证' : '未认证' }}
                      </el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="用户">
                      {{ authStatus.user?.login || '未知' }}
                    </el-descriptions-item>
                    <el-descriptions-item label="Token">
                      {{ authStatus.token ? '已设置' : '未设置' }}
                    </el-descriptions-item>
                  </el-descriptions>
                </el-col>
                
                <el-col :span="12">
                  <h3>模块状态</h3>
                  <el-table :data="moduleStatusList" size="small">
                    <el-table-column prop="module" label="模块" />
                    <el-table-column prop="status" label="状态">
                      <template #default="{ row }">
                        <el-tag :type="getStatusType(row.status)">
                          {{ row.status }}
                        </el-tag>
                      </template>
                    </el-table-column>
                    <el-table-column prop="loadTime" label="加载时间" />
                  </el-table>
                </el-col>
              </el-row>
            </el-card>
          </el-tab-pane>
        </el-tabs>
        
        <!-- 消息日志 -->
        <el-card class="message-log" v-if="messages.length > 0">
          <template #header>
            <div class="card-header">
              <span>消息日志</span>
              <el-button size="small" @click="clearMessages">清空</el-button>
            </div>
          </template>
          
          <el-timeline>
            <el-timeline-item
              v-for="(message, index) in messages.slice(-10)"
              :key="index"
              :timestamp="message.timestamp"
              :type="message.type"
            >
              <strong>{{ message.source }}:</strong> {{ message.content }}
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import {
  ElContainer, ElHeader, ElMain, ElTabs, ElTabPane, ElCard,
  ElButton, ElButtonGroup, ElRow, ElCol, ElDescriptions,
  ElDescriptionsItem, ElTag, ElTable, ElTableColumn, ElTimeline, ElTimelineItem
} from 'element-plus'
import AngularModuleFrame from '@/components/modules/AngularModuleFrame.vue'
import { angularModuleManager } from '@/services/AngularModuleManager.js'

// 响应式数据
const activeTab = ref('modules')
const currentModule = ref('cac')
const refreshKey = ref(0)
const messages = ref([])

// 可用模块 - 从模块管理器获取
const availableModules = computed(() => {
  return angularModuleManager.getAllModules().slice(0, 6) // 显示前6个模块
})

// 模块状态
const moduleStatus = reactive({
  cac: { status: '未加载', loadTime: null },
  jao: { status: '未加载', loadTime: null },
  dts: { status: '未加载', loadTime: null },
  udp: { status: '未加载', loadTime: null }
})

// 计算属性
const currentModuleConfig = computed(() => {
  return angularModuleManager.getModule(currentModule.value)
})

const currentModuleName = computed(() => {
  return currentModuleConfig.value?.name || ''
})

const moduleStatusList = computed(() => {
  return Object.entries(moduleStatus).map(([module, status]) => ({
    module: module.toUpperCase(),
    ...status
  }))
})

// 方法
const handleTabChange = (tabName) => {
  addMessage('系统', `切换到 ${tabName} 标签页`, 'info')
}

const switchModule = (moduleCode) => {
  currentModule.value = moduleCode
  refreshKey.value++
  addMessage('系统', `切换到 ${moduleCode.toUpperCase()} 模块`, 'info')
}

const refreshModule = () => {
  refreshKey.value++
  addMessage('系统', `刷新 ${currentModule.value.toUpperCase()} 模块`, 'info')
}

const getStatusType = (status) => {
  switch (status) {
    case '已加载': return 'success'
    case '加载中': return 'warning'
    case '加载失败': return 'danger'
    default: return 'info'
  }
}

const addMessage = (source, content, type = 'info') => {
  messages.value.push({
    source,
    content,
    type,
    timestamp: new Date().toLocaleTimeString()
  })
}

const clearMessages = () => {
  messages.value = []
}

// 事件处理
const onModuleLoaded = (data) => {
  const { moduleCode, loadTime } = data
  moduleStatus[moduleCode] = {
    status: '已加载',
    loadTime: new Date().toLocaleTimeString()
  }
  addMessage('模块', `${moduleCode.toUpperCase()} 模块加载成功 (${loadTime}ms)`, 'success')
}

const onModuleError = (data) => {
  const { moduleCode, error } = data
  moduleStatus[moduleCode] = {
    status: '加载失败',
    loadTime: new Date().toLocaleTimeString()
  }
  addMessage('模块', `${moduleCode.toUpperCase()} 模块加载失败: ${error}`, 'danger')
}

const onRouteChange = (data) => {
  const { moduleCode, route } = data
  addMessage('路由', `${moduleCode.toUpperCase()} 切换到: ${route}`, 'info')
}

const onModuleMessage = (data) => {
  const { moduleCode, data: messageData } = data
  addMessage('消息', `${moduleCode.toUpperCase()}: ${JSON.stringify(messageData)}`, 'info')
}

onMounted(() => {
  addMessage('系统', '模块演示页面已加载', 'success')
})
</script>

<style scoped>
.module-demo {
  height: 100vh;
}

.demo-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-align: center;
  padding: 2rem;
}

.demo-header h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
}

.demo-header p {
  margin: 0;
  opacity: 0.9;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.module-container {
  height: 600px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

.message-log {
  margin-top: 1rem;
}

.message-log .el-timeline {
  max-height: 300px;
  overflow-y: auto;
}
</style>
