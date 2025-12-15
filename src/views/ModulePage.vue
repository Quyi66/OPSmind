<template>
  <div class="module-page">
    <!-- 顶部工具栏 -->
    <div class="module-toolbar">
      <div class="toolbar-left">
        <el-button
          @click="goBack"
          type="primary"
          :icon="ArrowLeft"
          size="small"
        >
          返回
        </el-button>
        <span class="module-title">{{ moduleTitle }}</span>
      </div>

      <div class="toolbar-right">
        <el-button
          @click="refreshModule"
          :icon="Refresh"
          size="small"
          :loading="isRefreshing"
        >
          刷新
        </el-button>
        <el-button
          @click="toggleFullscreen"
          :icon="isFullscreen ? Minus : FullScreen"
          size="small"
        >
          {{ isFullscreen ? '退出全屏' : '全屏' }}
        </el-button>
      </div>
    </div>

    <!-- 模块容器 -->
    <div
      ref="moduleContainer"
      class="module-container"
      :class="{ 'fullscreen': isFullscreen }"
    >
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-overlay">
        <SkeletonLoader :module-code="moduleCode" />
      </div>

      <!-- 错误状态 -->
      <div v-if="error" class="error-overlay">
        <el-result
          icon="error"
          :title="`${moduleTitle} 模块加载失败`"
          :sub-title="error"
        >
          <template #extra>
            <el-button type="primary" @click="retryLoad">重试</el-button>
            <el-button @click="goBack">返回</el-button>
          </template>
        </el-result>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElButton, ElResult, ElMessage } from 'element-plus'
import { ArrowLeft, Refresh, FullScreen, Minus } from '@element-plus/icons-vue'
import SkeletonLoader from '@/components/shared/SkeletonLoader.vue'

const route = useRoute()
const router = useRouter()

const moduleCode = computed(() => String(route.params.moduleCode || ''))
const moduleTitle = computed(() => moduleCode.value.toUpperCase())

const moduleContainer = ref(null)
const loading = ref(false)
const error = ref('')
const isRefreshing = ref(false)
const isFullscreen = ref(false)

onMounted(async () => {
  // TODO: 实现 Vue 原生模块加载逻辑
})

onUnmounted(() => {
  // 清理逻辑
})

const loadModule = async () => {
  loading.value = true
  error.value = ''

  try {
    // TODO: 实现模块加载逻辑
    loading.value = false
    ElMessage.success(`${moduleTitle.value} 加载完成`)
  } catch (err) {
    console.error('❌ Failed to load module:', err)
    loading.value = false
    error.value = err.message || '加载失败'
    ElMessage.error(`${moduleTitle.value} 加载失败`)
  }
}

const retryLoad = () => {
  loadModule()
}

const refreshModule = async () => {
  isRefreshing.value = true
  try {
    // TODO: 实现刷新逻辑
    ElMessage.success('刷新完成')
  } catch (err) {
    console.error('Failed to refresh module:', err)
    ElMessage.error('刷新失败')
  } finally {
    isRefreshing.value = false
  }
}

const goBack = () => {
  router.push('/')
}

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value

  if (isFullscreen.value) {
    document.documentElement.requestFullscreen?.()
  } else {
    document.exitFullscreen?.()
  }
}

// 监听全屏状态变化
document.addEventListener('fullscreenchange', () => {
  isFullscreen.value = !!document.fullscreenElement
})
</script>

<style scoped>
.module-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.module-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.module-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.module-container {
  flex: 1;
  position: relative;
  background: white;
  margin: 8px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.module-container.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  margin: 0;
  border-radius: 0;
  z-index: 9999;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: white;
  z-index: 5;
}

.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
}

/* 响应式 */
@media (max-width: 768px) {
  .module-toolbar {
    padding: 8px 12px;
  }

  .toolbar-left,
  .toolbar-right {
    gap: 6px;
  }

  .module-title {
    font-size: 14px;
  }

  .module-container {
    margin: 4px;
  }
}
</style>
