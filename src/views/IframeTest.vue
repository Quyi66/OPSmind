<template>
  <div class="iframe-test">
    <div class="test-header">
      <h2>Angular 模块 iframe 集成测试</h2>
      <p>测试Angular模块在iframe中的加载和认证</p>
    </div>

    <div class="test-controls">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-card>
            <template #header>模块选择</template>
            <el-select v-model="selectedModule" placeholder="选择模块" @change="loadModule">
              <el-option
                v-for="module in availableModules"
                :key="module.code"
                :label="module.name"
                :value="module.code"
              />
            </el-select>
          </el-card>
        </el-col>

        <el-col :span="8">
          <el-card>
            <template #header>路由选择</template>
            <el-select v-model="selectedRoute" placeholder="选择路由" @change="changeRoute">
              <el-option
                v-for="(url, name) in moduleRoutes"
                :key="name"
                :label="getRouteLabel(name)"
                :value="name"
              />
            </el-select>
          </el-card>
        </el-col>

        <el-col :span="8">
          <el-card>
            <template #header>操作</template>
            <el-button-group>
              <el-button @click="refreshModule" :loading="loading">
                <i class="fas fa-refresh"></i>
                刷新
              </el-button>
              <el-button @click="openInNewWindow">
                <i class="fas fa-external-link-alt"></i>
                新窗口
              </el-button>
              <el-button @click="toggleFullscreen">
                <i :class="isFullscreen ? 'fas fa-compress' : 'fas fa-expand'"></i>
                {{ isFullscreen ? '退出全屏' : '全屏' }}
              </el-button>
            </el-button-group>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <div class="test-status">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card>
            <template #header>加载状态</template>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="当前模块">
                {{ currentModuleConfig?.name || '未选择' }}
              </el-descriptions-item>
              <el-descriptions-item label="当前路由">
                {{ getRouteLabel(selectedRoute) }}
              </el-descriptions-item>
              <el-descriptions-item label="加载状态">
                <el-tag :type="getStatusType(status)">{{ status }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="加载时间">
                {{ loadTime ? `${loadTime}ms` : '-' }}
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>

        <el-col :span="12">
          <el-card>
            <template #header>认证状态</template>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="认证状态">
                <el-tag :type="authStatus.hasToken ? 'success' : 'danger'">
                  {{ authStatus.hasToken ? '已认证' : '未认证' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="用户信息">
                {{ authStatus.user?.login || '未知' }}
              </el-descriptions-item>
              <el-descriptions-item label="桥接状态">
                <el-tag :type="authStatus.bridgeActive ? 'success' : 'warning'">
                  {{ authStatus.bridgeActive ? '已激活' : '未激活' }}
                </el-tag>
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <div class="iframe-container" :class="{ fullscreen: isFullscreen }">
      <AngularModuleFrame
        v-if="selectedModule"
        :key="`test-${selectedModule}-${refreshKey}`"
        :module-code="selectedModule"
        :route="selectedRoute"
        :show-header="false"
        :show-status-bar="true"
        @loaded="onModuleLoaded"
        @error="onModuleError"
        @route-change="onRouteChange"
        @message="onModuleMessage"
      />

      <div v-else class="no-module">
        <el-empty description="请选择要测试的模块" />
      </div>
    </div>

    <div class="test-logs">
      <el-card>
        <template #header>
          <span>测试日志</span>
          <el-button @click="clearLogs" size="small" type="warning">清空</el-button>
        </template>
        <div class="log-container">
          <div v-for="(log, index) in logs" :key="index" :class="['log-item', `log-${log.type}`]">
            <span class="log-time">{{ log.time }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  ElRow,
  ElCol,
  ElCard,
  ElSelect,
  ElOption,
  ElButton,
  ElButtonGroup,
  ElDescriptions,
  ElDescriptionsItem,
  ElTag,
  ElEmpty
} from 'element-plus'
import AngularModuleFrame from '@/components/modules/AngularModuleFrame.vue'
import { angularModuleManager } from '@/services/AngularModuleManager.js'

// 响应式数据
const selectedModule = ref('')
const selectedRoute = ref('main')
const loading = ref(false)
const status = ref('未加载')
const loadTime = ref(null)
const refreshKey = ref(0)
const isFullscreen = ref(false)
const logs = ref([])

// 计算属性
const availableModules = computed(() => {
  return angularModuleManager.getAllModules()
})

const currentModuleConfig = computed(() => {
  return selectedModule.value ? angularModuleManager.getModule(selectedModule.value) : null
})

const moduleRoutes = computed(() => {
  return selectedModule.value ? angularModuleManager.getModuleRoutes(selectedModule.value) : {}
})

const authStatus = computed(() => {
  // 模拟认证状态检查
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
  const userStr = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser')

  return {
    hasToken: !!token,
    user: userStr ? JSON.parse(userStr) : null,
    bridgeActive: window.vueAuthBridgeActive || false
  }
})

// 方法
const getRouteLabel = routeName => {
  const labels = {
    main: '主页面',
    template: '模板管理',
    rules: '规则管理',
    hosts: '主机管理',
    jobs: '作业管理',
    results: '结果查看'
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

const addLog = (message, type = 'info') => {
  logs.value.unshift({
    time: new Date().toLocaleTimeString(),
    message,
    type
  })

  // 限制日志数量
  if (logs.value.length > 100) {
    logs.value = logs.value.slice(0, 100)
  }
}

const loadModule = () => {
  if (!selectedModule.value) return

  loading.value = true
  status.value = '加载中'
  refreshKey.value++
  selectedRoute.value = 'main'

  addLog(`开始加载模块: ${currentModuleConfig.value?.name}`, 'info')
}

const changeRoute = () => {
  if (!selectedModule.value || !selectedRoute.value) return

  addLog(`切换路由: ${getRouteLabel(selectedRoute.value)}`, 'info')
}

const refreshModule = () => {
  if (!selectedModule.value) return

  refreshKey.value++
  addLog('刷新模块', 'info')
}

const openInNewWindow = () => {
  if (!selectedModule.value) return

  const url = angularModuleManager.getModuleUrl(selectedModule.value)
  window.open(url, '_blank', 'width=1200,height=800')
  addLog('在新窗口打开模块', 'info')
}

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
  addLog(`${isFullscreen.value ? '进入' : '退出'}全屏模式`, 'info')
}

const clearLogs = () => {
  logs.value = []
}

// 事件处理
const onModuleLoaded = data => {
  loading.value = false
  status.value = '已加载'
  loadTime.value = data.loadTime

  addLog(`模块加载成功: ${data.moduleCode} (${data.loadTime}ms)`, 'success')
}

const onModuleError = data => {
  loading.value = false
  status.value = '加载失败'
  loadTime.value = null

  addLog(`模块加载失败: ${data.moduleCode} - ${data.error}`, 'error')
}

const onRouteChange = data => {
  selectedRoute.value = data.route
  addLog(`路由变更: ${data.moduleCode} -> ${getRouteLabel(data.route)}`, 'info')
}

const onModuleMessage = data => {
  addLog(`收到消息: ${JSON.stringify(data.data)}`, 'info')
}

// 生命周期
onMounted(() => {
  addLog('iframe 测试页面已加载', 'info')

  // 设置默认模块
  if (availableModules.value.length > 0) {
    selectedModule.value = 'cac'
  }
})
</script>

<style scoped>
.iframe-test {
  padding: 1rem;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.test-header {
  text-align: center;
  margin-bottom: 1rem;
}

.test-controls,
.test-status {
  margin-bottom: 1rem;
}

.iframe-container {
  flex: 1;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.iframe-container.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  margin: 0;
  border: none;
  border-radius: 0;
}

.no-module {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.test-logs {
  height: 200px;
}

.log-container {
  height: 150px;
  overflow-y: auto;
  background: #f5f7fa;
  padding: 0.5rem;
  border-radius: 4px;
}

.log-item {
  display: flex;
  margin-bottom: 0.25rem;
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
}

.log-time {
  color: #909399;
  margin-right: 0.5rem;
  min-width: 70px;
}

.log-message {
  flex: 1;
}

.log-info .log-message {
  color: #606266;
}
.log-success .log-message {
  color: #67c23a;
}
.log-warning .log-message {
  color: #e6a23c;
}
.log-error .log-message {
  color: #f56c6c;
}
</style>
