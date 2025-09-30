<template>
  <div class="skeleton-loader" :class="{ 'dark-mode': isDark }">
    <!-- 头部骨架 -->
    <div class="skeleton-header">
      <div class="skeleton-title"></div>
      <div class="skeleton-actions">
        <div class="skeleton-button"></div>
        <div class="skeleton-button"></div>
      </div>
    </div>

    <!-- 导航骨架 -->
    <div class="skeleton-nav">
      <div class="skeleton-nav-item active"></div>
      <div class="skeleton-nav-item"></div>
      <div class="skeleton-nav-item"></div>
      <div class="skeleton-nav-item"></div>
    </div>

    <!-- 内容骨架 -->
    <div class="skeleton-content">
      <div class="skeleton-card">
        <div class="skeleton-card-header"></div>
        <div class="skeleton-card-body">
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
          <div class="skeleton-line"></div>
        </div>
      </div>

      <div class="skeleton-card">
        <div class="skeleton-card-header"></div>
        <div class="skeleton-card-body">
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
        </div>
      </div>

      <div class="skeleton-card">
        <div class="skeleton-card-header"></div>
        <div class="skeleton-card-body">
          <div class="skeleton-line short"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
        </div>
      </div>
    </div>

    <!-- 加载提示 -->
    <div class="skeleton-loading-text">
      <div class="loading-icon">
        <div class="spinner"></div>
      </div>
      <span>{{ loadingText }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  moduleCode: {
    type: String,
    default: ''
  },
  isDark: {
    type: Boolean,
    default: false
  }
})

const loadingTexts = [
  '正在加载模块...',
  '初始化应用...',
  '准备界面...',
  '即将完成...'
]

const loadingText = ref(loadingTexts[0])
let textInterval = null

onMounted(() => {
  // 循环显示加载文本
  let index = 0
  textInterval = setInterval(() => {
    index = (index + 1) % loadingTexts.length
    loadingText.value = loadingTexts[index]
  }, 800)
})

onUnmounted(() => {
  if (textInterval) {
    clearInterval(textInterval)
  }
})
</script>

<style scoped>
.skeleton-loader {
  width: 100%;
  height: 100%;
  background: #f8f9fa;
  padding: 20px;
  overflow: hidden;
  position: relative;
}

.skeleton-loader.dark-mode {
  background: #1a1a1a;
}

/* 骨架动画 */
@keyframes skeleton-loading {
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
}

.skeleton-loader [class*="skeleton-"] {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: 4px;
}

.dark-mode [class*="skeleton-"] {
  background: linear-gradient(90deg, #2a2a2a 25%, #3a3a3a 50%, #2a2a2a 75%);
  background-size: 200px 100%;
}

/* 头部骨架 */
.skeleton-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.skeleton-title {
  width: 200px;
  height: 32px;
}

.skeleton-actions {
  display: flex;
  gap: 10px;
}

.skeleton-button {
  width: 80px;
  height: 32px;
}

/* 导航骨架 */
.skeleton-nav {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 10px;
}

.dark-mode .skeleton-nav {
  border-bottom-color: #3a3a3a;
}

.skeleton-nav-item {
  width: 80px;
  height: 24px;
}

.skeleton-nav-item.active {
  width: 100px;
}

/* 内容骨架 */
.skeleton-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.skeleton-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dark-mode .skeleton-card {
  background: #2a2a2a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.skeleton-card-header {
  width: 60%;
  height: 20px;
  margin-bottom: 15px;
}

.skeleton-card-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton-line {
  height: 16px;
  width: 100%;
}

.skeleton-line.short {
  width: 70%;
}

/* 加载提示 */
.skeleton-loading-text {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  color: #666;
  font-size: 14px;
}

.dark-mode .skeleton-loading-text {
  color: #999;
}

.loading-icon {
  width: 20px;
  height: 20px;
}

.spinner {
  width: 100%;
  height: 100%;
  border: 2px solid #e0e0e0;
  border-top: 2px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.dark-mode .spinner {
  border-color: #3a3a3a;
  border-top-color: #007bff;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 响应式 */
@media (max-width: 768px) {
  .skeleton-loader {
    padding: 15px;
  }
  
  .skeleton-content {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .skeleton-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .skeleton-nav {
    flex-wrap: wrap;
    gap: 10px;
  }
}
</style>
