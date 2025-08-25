<template>
  <div class="angular-module-inline-frame" v-if="moduleCode">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-loading-spinner />
      <p>正在加载 {{ moduleTitle }}...</p>
    </div>

    <!-- iframe容器 -->
    <div
      v-show="!loading"
      ref="iframeContainer"
      class="iframe-container"
    ></div>

    <!-- 错误状态 -->
    <div v-if="error" class="error-container">
      <el-icon class="error-icon"><Warning /></el-icon>
      <p>{{ moduleTitle }} 加载失败</p>
      <el-button @click="retryLoad" type="primary" size="small">重试</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Warning } from '@element-plus/icons-vue'

const props = defineProps({
  moduleCode: {
    type: String,
    required: true
  },
  moduleTitle: {
    type: String,
    default: ''
  }
})

// 响应式数据
const loading = ref(false)
const error = ref(false)
const iframeContainer = ref(null)

// 单例iframe管理器
let singleIframeManager = null

// 动态导入iframe管理器
const initIframeManager = async () => {
  if (!singleIframeManager) {
    try {
      const { singleIframeManager: manager } = await import('@/utils/single-iframe-manager')
      singleIframeManager = manager
    } catch (err) {
      console.error('Failed to load iframe manager:', err)
      error.value = true
    }
  }
}

// 加载模块
const loadModule = async (moduleCode) => {
  if (!moduleCode) return

  console.log('📱 Loading module in inline frame:', moduleCode)
  loading.value = true
  error.value = false

  try {
    await initIframeManager()

    if (!singleIframeManager) {
      throw new Error('Iframe manager not available')
    }

    // 等待DOM更新
    await nextTick()

    if (iframeContainer.value) {
      await singleIframeManager.switchToModule(moduleCode, iframeContainer.value)
      loading.value = false
      console.log('✅ Module loaded in inline frame:', moduleCode)
    }
  } catch (err) {
    loading.value = false
    error.value = true
    console.error('❌ Failed to load module in inline frame:', err)
    ElMessage.error(`${props.moduleTitle} 加载失败`)
  }
}

// 重试加载
const retryLoad = () => {
  loadModule(props.moduleCode)
}

// 监听模块代码变化
watch(() => props.moduleCode, (newCode) => {
  if (newCode) {
    loadModule(newCode)
  }
}, { immediate: true })

// 监听模块标题变化
watch(() => props.moduleTitle, (newTitle) => {
  console.log('📝 Module title updated:', newTitle)
})

// 生命周期
onMounted(() => {
  console.log('🔧 AngularModuleInlineFrame mounted for:', props.moduleCode)
})

onUnmounted(() => {
  console.log('🔧 AngularModuleInlineFrame unmounted for:', props.moduleCode)
})
</script>

<style scoped lang="scss">
.angular-module-inline-frame {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  position: relative;
  overflow: hidden;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
  background: #fafafa;

  p {
    margin-top: 16px;
    font-size: 14px;
  }
}

.iframe-container {
  width: 100%;
  height: 100%;
  border: none;
  overflow: hidden;

  :deep(iframe) {
    width: 100%;
    height: 100%;
    border: none;
    background: #fff;
    display: block;
  }
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #f56c6c;
  background: #fafafa;

  .error-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }

  p {
    margin-bottom: 16px;
    font-size: 14px;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .loading-container,
  .error-container {
    padding: 20px;

    p {
      font-size: 13px;
      text-align: center;
    }
  }

  .error-container {
    .error-icon {
      font-size: 36px;
    }
  }
}
</style>
