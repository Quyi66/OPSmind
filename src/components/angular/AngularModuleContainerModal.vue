<template>
  <!-- 模态框遮罩 -->
  <div class="modal-overlay" v-if="visible">
    <div class="angular-module-modal" :style="{ width: modalWidth }" @click.stop>
      <!-- 关闭按钮 -->
      <div class="close-button-container">
        <el-button @click="closeModule" size="small" type="text" class="close-btn">
          <i class="fas fa-times"></i>
        </el-button>
      </div>

      <!-- 模态框内容 -->
      <div class="modal-content">
        <div v-if="loading" class="loading-overlay">
          <el-icon class="loading-spinner"><Loading /></el-icon>
          <p class="loading-text">正在加载 {{ moduleTitle }}...</p>
        </div>

        <div v-if="moduleCode" ref="iframeContainer" class="iframe-container"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ElButton, ElMessage, ElIcon } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { singleIframeManager } from '@/utils/single-iframe-manager'

// 响应式数据
const visible = ref(false)
const moduleCode = ref('')
const moduleTitle = ref('')
const loading = ref(false)
const iframeContainer = ref(null)
const modalWidth = ref('90vw')

// 动态计算iframe宽度
const calculateModalWidth = () => {
  const screenWidth = window.innerWidth
  const screenHeight = window.innerHeight

  // 考虑屏幕比例，超宽屏需要特殊处理
  const aspectRatio = screenWidth / screenHeight

  if (screenWidth >= 2560) {
    // 4K及以上超大屏：75%宽度，最大1800px
    modalWidth.value = `${Math.min(screenWidth * 0.75, 1800)  }px`
  } else if (screenWidth >= 1920) {
    // 超大屏：80%宽度，最大1600px
    modalWidth.value = `${Math.min(screenWidth * 0.8, 1600)  }px`
  } else if (screenWidth >= 1440) {
    // 大屏：85%宽度
    modalWidth.value = '85vw'
  } else if (screenWidth >= 1200) {
    // 中屏：90%宽度
    modalWidth.value = '90vw'
  } else if (screenWidth >= 768) {
    // 小屏：95%宽度
    modalWidth.value = '95vw'
  } else {
    // 移动端：100%宽度
    modalWidth.value = '100vw'
  }

  // 超宽屏特殊处理（比例大于2.5:1）
  if (aspectRatio > 2.5 && screenWidth >= 1440) {
    const currentWidth = parseInt(modalWidth.value)
    modalWidth.value = `${Math.min(currentWidth * 0.9, 1400)  }px`
  }

  console.log(
    `📱 Screen: ${screenWidth}x${screenHeight}px (${aspectRatio.toFixed(2)}:1), Modal width: ${modalWidth.value}`
  )
}

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
        // 移除成功提示消息
      }
    } catch (error) {
      loading.value = false
      console.error('❌ Failed to switch module:', error)
      ElMessage.error(`切换到 ${moduleTitle.value} 失败`)
    }
    return
  }

  // 首次显示弹窗
  calculateModalWidth() // 计算合适的宽度
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
      // 移除成功提示消息
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

  // 通知菜单清除高亮状态
  const event = new CustomEvent('clearMenuHighlight')
  window.dispatchEvent(event)

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

const handleResize = () => {
  if (visible.value) {
    calculateModalWidth()
  }
}

// 生命周期
onMounted(() => {
  window.addEventListener('showAngularModuleContainer', showModule)
  window.addEventListener('closeAngularModuleContainer', handleCloseEvent)
  window.addEventListener('resize', handleResize)
  document.addEventListener('keydown', handleKeydown)
  calculateModalWidth() // 初始化宽度
  console.log('📱 AngularModuleContainerModal mounted')
})

onUnmounted(() => {
  window.removeEventListener('showAngularModuleContainer', showModule)
  window.removeEventListener('closeAngularModuleContainer', handleCloseEvent)
  window.removeEventListener('resize', handleResize)
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
  background: #f5f5f5; /* 与home主页背景色一致 */
  z-index: 1000;
  display: flex;
  align-items: flex-start; /* 改为顶部对齐 */
  justify-content: center; /* 居中对齐 */
  padding-top: 0; /* 移除顶部间距 */
}

.angular-module-modal {
  /* 默认宽度 - 中等屏幕 */
  width: 90vw;
  height: calc(100vh - 50px);
  background: #ffffff; /* 使用纯白背景 */
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); /* 非常柔和的阴影 */
  border: none; /* 完全移除边框 */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 0 auto;
  position: relative;
  transition: width 0.3s ease; /* 添加宽度过渡动画 */
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
  background: rgba(255, 255, 255, 0.95) !important;
  border-radius: 8px !important;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06) !important;
  border: none !important; /* 完全移除边框 */
}

.modal-content {
  flex: 1;
  overflow: hidden;
  background: #ffffff; /* 使用纯白背景 */
  border-radius: 0 0 8px 8px; /* 底部圆角与外层一致 */
}

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.9);
  z-index: 5;
}

.loading-spinner {
  font-size: 28px;
  color: #409eff;
  animation: spin 1s linear infinite;
}

.loading-text {
  margin-top: 12px;
  color: #606266;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.iframe-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* 响应式设计 - 基于屏幕宽度的iframe宽度适配 */

/* 超大屏幕 (≥1920px) - 80%宽度，避免过宽 */
@media (min-width: 1920px) {
  .angular-module-modal {
    width: 80vw;
    max-width: 1600px; /* 设置最大宽度限制 */
  }
}

/* 大屏幕 (1440px-1919px) - 85%宽度 */
@media (min-width: 1440px) and (max-width: 1919px) {
  .angular-module-modal {
    width: 85vw;
  }
}

/* 中等屏幕 (1200px-1439px) - 90%宽度 */
@media (min-width: 1200px) and (max-width: 1439px) {
  .angular-module-modal {
    width: 90vw;
  }
}

/* 小屏幕 (768px-1199px) - 95%宽度 */
@media (min-width: 768px) and (max-width: 1199px) {
  .angular-module-modal {
    width: 95vw;
  }

  .close-button-container {
    top: 6px;
    right: 6px;
  }
}

/* 移动端 (<768px) - 100%宽度，占满全屏 */
@media (max-width: 767px) {
  .modal-overlay {
    top: 50px;
    height: calc(100vh - 50px);
    padding: 0;
  }

  .angular-module-modal {
    width: 100vw;
    height: calc(100vh - 50px);
    border-radius: 0;
    border: none;
    margin: 0;
    background: #ffffff; /* 移动端使用纯白背景 */
  }

  .close-button-container {
    top: 4px;
    right: 4px;
  }

  .close-btn {
    padding: 4px 6px !important;
    min-height: 28px !important;
    font-size: 12px !important;
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
