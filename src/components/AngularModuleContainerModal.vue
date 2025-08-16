<template>
  <!-- 模态框遮罩 -->
  <div class="modal-overlay" v-if="visible" @click="closeModule">
    <div class="angular-module-modal" @click.stop>
      <!-- 模态框头部 -->
      <div class="modal-header">
        <div class="modal-title">
          <i :class="moduleIcon" class="module-icon"></i>
          <h3>{{ moduleTitle }}</h3>
        </div>
        <div class="modal-actions">
          <el-button @click="refreshModule" size="small" :loading="loading">
            <i class="fas fa-refresh"></i>
            刷新
          </el-button>

          <el-button @click="openInNewWindow" type="primary" size="small">
            <i class="fas fa-external-link-alt"></i>
            新窗口
          </el-button>

          <el-button @click="closeModule" size="small">
            <i class="fas fa-times"></i>
            关闭
          </el-button>
        </div>
      </div>

      <!-- 模态框内容 -->
      <div class="modal-content">
        <AngularModuleFrame
          v-if="moduleCode"
          :key="`modal-${moduleCode}-${refreshKey}`"
          :module-code="moduleCode"
          :show-header="false"
          :show-status-bar="true"
          @loaded="onModuleLoaded"
          @error="onModuleError"
          @route-change="onRouteChange"
          @message="onModuleMessage"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElButton, ElMessage } from 'element-plus'
import AngularModuleFrame from './modules/AngularModuleFrame.vue'
import { angularModuleManager } from '@/services/AngularModuleManager.js'

// 响应式数据
const visible = ref(false)
const moduleCode = ref('')
const moduleTitle = ref('')
const loading = ref(false)
const refreshKey = ref(0)

// 计算属性
const moduleConfig = computed(() => {
  return angularModuleManager.getModule(moduleCode.value)
})

const moduleIcon = computed(() => {
  return moduleConfig.value?.icon || 'fas fa-cube'
})

// 方法
const showModule = event => {
  const { moduleCode: code, title } = event.detail

  moduleCode.value = code
  moduleTitle.value = title || moduleConfig.value?.title || code.toUpperCase()
  visible.value = true
  loading.value = true
  refreshKey.value++

  console.log('📱 Showing AngularJS module in modal:', code, title)
}

const closeModule = () => {
  visible.value = false
  moduleCode.value = ''
  moduleTitle.value = ''
  loading.value = false

  console.log('📱 Closed AngularJS module modal')
}

const refreshModule = () => {
  refreshKey.value++
  loading.value = true
  console.log('🔄 Refreshing module:', moduleCode.value)
}

const openInNewWindow = () => {
  if (moduleCode.value) {
    const url = angularModuleManager.getModuleUrl(moduleCode.value)
    window.open(url, '_blank', 'width=1200,height=800')
    console.log('🔗 Opened module in new window:', url)
    ElMessage.success(`${moduleTitle.value} 已在新窗口打开`)
  }
}

const handleKeydown = event => {
  if (event.key === 'Escape' && visible.value) {
    closeModule()
  }
}

// 事件处理
const onModuleLoaded = data => {
  loading.value = false
  console.log('✅ Module loaded in modal:', data)
  ElMessage.success(`${moduleTitle.value} 加载完成`)
}

const onModuleError = data => {
  loading.value = false
  console.error('❌ Module load error in modal:', data)
  ElMessage.error(`${moduleTitle.value} 加载失败: ${data.error}`)
}

const onRouteChange = data => {
  console.log('🧭 Route changed in modal:', data)
}

const onModuleMessage = data => {
  console.log('📨 Module message in modal:', data)
}

// 生命周期
onMounted(() => {
  window.addEventListener('showAngularModuleContainer', showModule)
  document.addEventListener('keydown', handleKeydown)
  console.log('📱 AngularModuleContainerModal mounted')
})

onUnmounted(() => {
  window.removeEventListener('showAngularModuleContainer', showModule)
  document.removeEventListener('keydown', handleKeydown)
  console.log('📱 AngularModuleContainerModal unmounted')
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.angular-module-modal {
  width: 95vw;
  height: 90vh;
  max-width: 1400px;
  max-height: 900px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e4e7ed;
  background: #f8f9fa;
  border-radius: 12px 12px 0 0;
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.module-icon {
  font-size: 1.5rem;
  color: #409eff;
}

.modal-title h3 {
  margin: 0;
  color: #303133;
  font-size: 1.25rem;
  font-weight: 600;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.modal-content {
  flex: 1;
  overflow: hidden;
  background: #f5f7fa;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .angular-module-modal {
    width: 98vw;
    height: 95vh;
  }
}

@media (max-width: 768px) {
  .angular-module-modal {
    width: 100vw;
    height: 100vh;
    border-radius: 0;
  }

  .modal-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
    border-radius: 0;
  }

  .modal-title {
    justify-content: center;
  }

  .modal-actions {
    justify-content: center;
    flex-wrap: wrap;
  }
}

/* 加载动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.angular-module-modal {
  animation: fadeIn 0.3s ease-out;
}
</style>
