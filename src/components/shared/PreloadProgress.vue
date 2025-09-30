<template>
  <div v-if="showProgress" class="preload-progress" :class="{ 'completed': isCompleted }">
    <div class="progress-content">
      <div class="progress-icon">
        <div v-if="!isCompleted" class="loading-spinner"></div>
        <div v-else class="success-icon">✅</div>
      </div>
      
      <div class="progress-info">
        <div class="progress-title">
          {{ isCompleted ? '所有模块已就绪' : '正在预加载模块...' }}
        </div>
        <div class="progress-details">
          {{ loaded }}/{{ total }} 个模块 ({{ progress }}%)
        </div>
      </div>
      
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: progress + '%' }"
        ></div>
      </div>
      
      <button 
        v-if="isCompleted" 
        @click="hideProgress" 
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

const showProgress = ref(false)
const loaded = ref(0)
const total = ref(0)
const progress = ref(0)
const isCompleted = ref(false)

let progressListener = null
let completeListener = null

onMounted(() => {
  // 监听预加载进度
  progressListener = (event) => {
    const { loaded: l, total: t, progress: p } = event.detail
    loaded.value = l
    total.value = t
    progress.value = p
    showProgress.value = true
    
    console.log(`📊 Preload progress: ${p}% (${l}/${t})`)
  }

  // 监听预加载完成
  completeListener = (event) => {
    const { totalModules, loadedModules } = event.detail
    isCompleted.value = true
    
    console.log(`🎉 All ${totalModules} modules preloaded!`)
    
    // 3秒后自动隐藏
    setTimeout(() => {
      if (isCompleted.value) {
        hideProgress()
      }
    }, 3000)
  }

  window.addEventListener('iframe-preload-progress', progressListener)
  window.addEventListener('iframe-preload-complete', completeListener)
})

onUnmounted(() => {
  if (progressListener) {
    window.removeEventListener('iframe-preload-progress', progressListener)
  }
  if (completeListener) {
    window.removeEventListener('iframe-preload-complete', completeListener)
  }
})

const hideProgress = () => {
  showProgress.value = false
}
</script>

<style scoped>
.preload-progress {
  position: fixed;
  top: 20px;
  right: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 16px;
  min-width: 300px;
  z-index: 9999;
  border-left: 4px solid #007bff;
  transition: all 0.3s ease;
}

.preload-progress.completed {
  border-left-color: #28a745;
  background: linear-gradient(135deg, #f8fff9 0%, #e8f5e8 100%);
}

.progress-content {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
}

.progress-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e3e3e3;
  border-top: 2px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.success-icon {
  font-size: 20px;
  color: #28a745;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.progress-info {
  flex: 1;
}

.progress-title {
  font-weight: 600;
  color: #333;
  font-size: 14px;
  margin-bottom: 4px;
}

.progress-details {
  font-size: 12px;
  color: #666;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: #e9ecef;
  border-radius: 2px;
  overflow: hidden;
  margin-top: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #007bff 0%, #0056b3 100%);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.completed .progress-fill {
  background: linear-gradient(90deg, #28a745 0%, #1e7e34 100%);
}

.close-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  border: none;
  background: #dc3545;
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
}

.close-btn:hover {
  background: #c82333;
}

/* 响应式 */
@media (max-width: 768px) {
  .preload-progress {
    top: 10px;
    right: 10px;
    left: 10px;
    min-width: auto;
  }
  
  .progress-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .progress-info {
    width: 100%;
  }
}

/* 动画效果 */
.preload-progress {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>
