<template>
  <!-- 背景遮罩 -->
  <div class="modal-overlay" v-if="visible" @click="closeModule">
    <div class="angular-module-frame" @click.stop>
      <div class="module-header">
        <h3>{{ moduleTitle }}</h3>
        <div class="module-actions">
          <el-button @click="openInNewWindow" type="primary" size="small">新窗口打开</el-button>
          <el-button @click="closeModule" size="small">关闭</el-button>
        </div>
      </div>

      <div class="module-content-container">
        <!-- 直接嵌入的 AngularJS 模块 -->
        <div v-if="isDirectModule" class="direct-module">
          <AngularJSEmbedded :module-code="moduleCode" :module-name="moduleTitle" />
        </div>

        <!-- iframe 模块 -->
        <div v-else class="iframe-container">
          <iframe
            :src="moduleUrl"
            frameborder="0"
            class="angular-iframe"
            @load="onIframeLoad"
          ></iframe>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElButton, ElMessage } from 'element-plus'
import AngularJSEmbedded from './modules/AngularJSEmbedded.vue'

const visible = ref(false)
const moduleCode = ref('')
const moduleUrl = ref('')
const moduleTitle = ref('')

const moduleNames = {
  __jao: '作业编排',
  __gfs: '脚本管理',
  __cmd: '命令管理',
  cac: '配置管理',
  __dts: '数据传输',
  __udp: '统一开发平台',
  __flow: '工作流',
  __os: '操作系统',
  __search: '搜索',
  __ssc: '系统服务中心',
  __adm: '系统管理',
  __dev: '开发工具'
}

// 支持直接嵌入的模块列表
const directModules = ['cac']

// 计算属性
const isDirectModule = computed(() => {
  return directModules.includes(moduleCode.value)
})

const showModule = event => {
  const { moduleCode: code, url } = event.detail
  moduleCode.value = code
  moduleUrl.value = url
  moduleTitle.value = moduleNames[code] || '未知模块'
  visible.value = true

  console.log('📱 Showing AngularJS module:', code, url)
}

const handleKeydown = event => {
  if (event.key === 'Escape' && visible.value) {
    closeModule()
  }
}

const closeModule = () => {
  visible.value = false
  moduleCode.value = ''
  moduleUrl.value = ''
  moduleTitle.value = ''
}

const openInNewWindow = () => {
  if (moduleUrl.value) {
    window.open(moduleUrl.value, '_blank')
    closeModule()
  }
}

const _openInIframe = () => {
  // 强制使用 iframe 模式（即使是直接模块）
  console.log('🔄 Switching to iframe mode for module:', moduleCode.value)
  // 这里可以添加切换逻辑
}

const onIframeLoad = () => {
  console.log('📱 AngularJS module iframe loaded')
  ElMessage.success(`${moduleTitle.value} 加载完成`)
}

onMounted(() => {
  window.addEventListener('showAngularModule', showModule)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('showAngularModule', showModule)
  document.removeEventListener('keydown', handleKeydown)
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
}

.angular-module-frame {
  width: 90vw;
  height: 80vh;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  border: 1px solid #e0e0e0;
  max-width: 1200px;
  max-height: 800px;
}

.module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e0e0e0;
  background: #f8f9fa;
  border-radius: 8px 8px 0 0;
}

.module-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.module-actions {
  display: flex;
  gap: 8px;
}

.module-content-container {
  flex: 1;
  overflow: hidden;
}

.direct-module {
  height: 100%;
  background: #f8f9fa;
}

.module-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: #666;
}

.module-placeholder h3 {
  margin-bottom: 10px;
  color: #333;
}

.module-placeholder p {
  margin-bottom: 20px;
  color: #999;
}

.iframe-container {
  height: 100%;
}

.angular-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .angular-module-frame {
    width: 95vw;
    height: 85vh;
    top: 60px;
  }

  .module-header {
    padding: 12px 16px;
  }

  .module-header h3 {
    font-size: 16px;
  }
}
</style>
