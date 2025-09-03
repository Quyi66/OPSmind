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


  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'

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
    }
  }
}

// 加载模块
const loadModule = async moduleCode => {
  if (!moduleCode) {
    loading.value = false
    return
  }

  console.log('📱 Loading module in inline frame:', moduleCode)
  loading.value = true

  try {
    await initIframeManager()

    if (singleIframeManager) {
      // 等待DOM更新
      await nextTick()

      if (iframeContainer.value) {
        // 先清理之前的模块
        if (singleIframeManager.clearContainer) {
          singleIframeManager.clearContainer(iframeContainer.value)
        }

        // 加载新模块
        await singleIframeManager.switchToModule(moduleCode, iframeContainer.value)
        loading.value = false
        console.log('✅ Module loaded in inline frame:', moduleCode)
      }
    }
  } catch (error) {
    loading.value = false
    console.error('❌ Failed to load module:', moduleCode, error)
  }
}



// 防抖处理，避免快速切换时的冲突
let loadTimeout = null

// 监听模块代码变化
watch(() => props.moduleCode, (newCode) => {
  // 清除之前的定时器
  if (loadTimeout) {
    clearTimeout(loadTimeout)
  }

  if (newCode) {
    // 延迟加载，避免快速切换时的冲突
    loadTimeout = setTimeout(() => {
      loadModule(newCode)
    }, 50)
  } else {
    loading.value = false
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

  // 清理定时器
  if (loadTimeout) {
    clearTimeout(loadTimeout)
    loadTimeout = null
  }
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

// 响应式设计
@media (max-width: 768px) {
  .loading-container {
    padding: 20px;

    p {
      font-size: 13px;
      text-align: center;
    }
  }
}
</style>
