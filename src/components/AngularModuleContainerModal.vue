<template>
  <!-- 模态框遮罩 -->
  <div class="modal-overlay" v-if="visible" @click="closeModule">
    <div class="angular-module-modal" @click.stop>
      <!-- 关闭按钮 -->
      <div class="close-button-container">
        <el-button @click="closeModule" size="small" type="text" class="close-btn">
          <i class="fas fa-times"></i>
        </el-button>
      </div>

      <!-- 模态框内容 -->
      <div class="modal-content">
        <div
          v-if="moduleCode"
          ref="iframeContainer"
          class="iframe-container"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElButton, ElMessage } from 'element-plus'
import { singleIframeManager } from '@/utils/single-iframe-manager'

// 响应式数据
const visible = ref(false)
const moduleCode = ref('')
const moduleTitle = ref('')
const loading = ref(false)
const refreshKey = ref(0)
const iframeContainer = ref(null)

// 计算属性
const moduleIcon = computed(() => {
  return 'fas fa-cube' // 使用默认图标
})

// 方法
const showModule = async event => {
  const { moduleCode: code, title } = event.detail

  // 如果是相同模块，不需要重新加载
  if (visible.value && moduleCode.value === code) {
    console.log('📱 Same module already showing:', code)
    return
  }

  moduleCode.value = code
  moduleTitle.value = title || code.toUpperCase()

  // 如果弹窗已经显示，直接切换模块
  if (visible.value) {
    loading.value = true
    console.log('📱 Switching to different module:', code)

    try {
      if (iframeContainer.value) {
        await singleIframeManager.switchToModule(code, iframeContainer.value)
        loading.value = false
        console.log('✅ Module switched via single-iframe-manager:', code)
        ElMessage.success(`已切换到 ${moduleTitle.value}`)
      }
    } catch (error) {
      loading.value = false
      console.error('❌ Failed to switch module:', error)
      ElMessage.error(`切换到 ${moduleTitle.value} 失败`)
    }
    return
  }

  // 首次显示弹窗
  visible.value = true
  loading.value = true
  console.log('📱 Showing AngularJS module in modal:', code, title)

  try {
    // 等待下一个tick确保DOM已更新
    await new Promise(resolve => setTimeout(resolve, 0))

    if (iframeContainer.value) {
      // 使用single-iframe-manager切换到指定模块
      await singleIframeManager.switchToModule(code, iframeContainer.value)
      loading.value = false
      console.log('✅ Module loaded in modal via single-iframe-manager:', code)
      ElMessage.success(`${moduleTitle.value} 加载完成`)
    }
  } catch (error) {
    loading.value = false
    console.error('❌ Failed to load module in modal:', error)
    ElMessage.error(`${moduleTitle.value} 加载失败`)
  }
}

const closeModule = () => {
  visible.value = false
  moduleCode.value = ''
  moduleTitle.value = ''
  loading.value = false

  console.log('📱 Closed AngularJS module modal')
}



const handleKeydown = event => {
  if (event.key === 'Escape' && visible.value) {
    closeModule()
  }
}

// 事件处理
// 不再需要这些事件处理函数，因为我们使用single-iframe-manager

const handleCloseEvent = () => {
  closeModule()
}

// 生命周期
onMounted(() => {
  window.addEventListener('showAngularModuleContainer', showModule)
  window.addEventListener('closeAngularModuleContainer', handleCloseEvent)
  document.addEventListener('keydown', handleKeydown)
  console.log('📱 AngularModuleContainerModal mounted')
})

onUnmounted(() => {
  window.removeEventListener('showAngularModuleContainer', showModule)
  window.removeEventListener('closeAngularModuleContainer', handleCloseEvent)
  document.removeEventListener('keydown', handleKeydown)
  console.log('📱 AngularModuleContainerModal unmounted')
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 50px; /* 顶部菜单高度 */
  left: 0;
  width: 100vw;
  height: calc(100vh - 50px); /* 减去顶部菜单高度 */
  background: rgba(0, 0, 0, 0.3);
  z-index: 1000;
  display: flex;
  align-items: flex-start; /* 改为顶部对齐 */
  justify-content: flex-start; /* 改为左对齐 */
  backdrop-filter: blur(2px);
  padding-top: 0; /* 移除顶部间距 */
  padding-left: 0; /* 移除左侧间距 */
}

.angular-module-modal {
  width: calc(100vw - 24px); /* 占满整个宽度，减去左右边距 */
  height: calc(100vh - 50px); /* 占满剩余高度 */
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 0 12px; /* 左右各12px边距 */
  position: relative;
}

.close-button-container {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
}

.close-btn {
  padding: 6px 8px !important;
  min-height: 32px !important;
  color: #909399 !important;
  background: rgba(255, 255, 255, 0.9) !important;
  border-radius: 4px !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;

  &:hover {
    color: #f56c6c !important;
    background: rgba(245, 108, 108, 0.1) !important;
  }
}

.modal-content {
  flex: 1;
  overflow: hidden;
  background: #f5f7fa;
}

.iframe-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .angular-module-modal {
    width: 90vw;
    height: calc(100vh - 60px);
  }
}

@media (max-width: 768px) {
  .modal-overlay {
    top: 60px;
    height: calc(100vh - 60px);
  }

  .angular-module-modal {
    width: 95vw;
    height: calc(100vh - 60px);
    border-radius: 2px;
    border: none;
  }

  .modal-header {
    padding: 6px 10px;
    min-height: 36px;
    border-radius: 2px 2px 0 0;
  }

  .modal-title h3 {
    font-size: 13px;
  }

  .module-icon {
    font-size: 14px;
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
