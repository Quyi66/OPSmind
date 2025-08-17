<template>
  <div v-if="showInitializer" class="angular-initializer" :class="{ 'completed': isCompleted }">
    <div class="initializer-content">
      <div class="initializer-icon">
        <div v-if="!isCompleted" class="loading-spinner"></div>
        <div v-else class="success-icon">🚀</div>
      </div>
      
      <div class="initializer-info">
        <div class="initializer-title">
          {{ isCompleted ? 'Angular 应用已就绪' : '正在初始化 Angular 应用...' }}
        </div>
        <div class="initializer-details">
          {{ statusText }}
        </div>
      </div>
      
      <div class="initializer-progress">
        <div 
          class="progress-fill" 
          :style="{ width: progress + '%' }"
        ></div>
      </div>
      
      <button 
        v-if="isCompleted" 
        @click="hideInitializer" 
        class="close-btn"
        title="关闭"
      >
        ×
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { singleIframeManager } from '@/utils/single-iframe-manager'

const showInitializer = ref(false)
const progress = ref(0)
const isCompleted = ref(false)
const statusText = ref('准备初始化...')

let checkInterval = null

onMounted(() => {
  // 检查是否需要显示初始化器
  if (!singleIframeManager.isReady()) {
    showInitializer.value = true
    startInitialization()
  }
})

onUnmounted(() => {
  if (checkInterval) {
    clearInterval(checkInterval)
  }
})

const startInitialization = () => {
  statusText.value = '正在创建 Angular iframe...'
  progress.value = 10
  
  // 定期检查初始化状态
  checkInterval = setInterval(() => {
    const status = singleIframeManager.getStatus()
    
    if (status.isLoading) {
      statusText.value = '正在加载 Angular 应用...'
      progress.value = 50
    } else if (status.isInitialized) {
      statusText.value = '初始化完成！'
      progress.value = 100
      isCompleted.value = true
      
      clearInterval(checkInterval)
      
      // 3秒后自动隐藏
      setTimeout(() => {
        if (isCompleted.value) {
          hideInitializer()
        }
      }, 3000)
    }
  }, 500)
}

const hideInitializer = () => {
  showInitializer.value = false
}
</script>

<style scoped>
.angular-initializer {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  padding: 24px;
  min-width: 400px;
  z-index: 10000;
  border-left: 4px solid #007bff;
  transition: all 0.3s ease;
}

.angular-initializer.completed {
  border-left-color: #28a745;
  background: linear-gradient(135deg, #f8fff9 0%, #e8f5e8 100%);
}

.initializer-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  position: relative;
}

.initializer-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e3e3e3;
  border-top: 3px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.success-icon {
  font-size: 40px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.initializer-info {
  text-align: center;
}

.initializer-title {
  font-weight: 600;
  color: #333;
  font-size: 18px;
  margin-bottom: 8px;
}

.initializer-details {
  font-size: 14px;
  color: #666;
}

.initializer-progress {
  width: 100%;
  height: 6px;
  background: #e9ecef;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #007bff 0%, #0056b3 100%);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.completed .progress-fill {
  background: linear-gradient(90deg, #28a745 0%, #1e7e34 100%);
}

.close-btn {
  position: absolute;
  top: -12px;
  right: -12px;
  width: 32px;
  height: 32px;
  border: none;
  background: #dc3545;
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.close-btn:hover {
  background: #c82333;
}

/* 响应式 */
@media (max-width: 768px) {
  .angular-initializer {
    min-width: 300px;
    margin: 20px;
  }
}

/* 动画效果 */
.angular-initializer {
  animation: fadeInScale 0.3s ease-out;
}

@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
</style>
