<template>
  <el-dialog
    v-model="visible"
    :title="file?.path || file?.name || '文件内容'"
    width="80%"
    top="5vh"
    :close-on-click-modal="false"
  >
    <div class="file-content-viewer">
      <div v-if="loading" class="loading-content">
        <i class="fa fa-spinner fa-spin fa-2x" />
        <p>加载中...</p>
      </div>
      <template v-else>
        <div v-if="fileInfo" class="file-extra-info">
          <div class="info-item">
            <span class="label">大小:</span>
            <span class="value">{{ formatFileSize(fileInfo.size) }}</span>
          </div>
          <div v-if="fileInfo.lastModified" class="info-item">
            <span class="label">修改时间:</span>
            <span class="value">{{ formatDate(fileInfo.lastModified) }}</span>
          </div>
        </div>
        <div class="content-wrapper">
          <div class="line-numbers">
            <div v-for="n in lineCount" :key="n" class="line-number">{{ n }}</div>
          </div>
          <pre class="file-content" ref="contentRef">{{ content }}</pre>
        </div>
      </template>
    </div>
    <template #footer>
      <el-button @click="handleDownload" :disabled="!file">
        <i class="fa fa-download me-1" /> 下载
      </el-button>
      <el-button @click="handleCopyLink" :disabled="!file">
        <i class="fa fa-link me-1" /> 复制链接
      </el-button>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as gfsApi from '@/modules/automation/api/gfs'

const props = defineProps({
  modelValue: Boolean,
  repoType: {
    type: String,
    default: 'git'
  },
  repo: {
    type: String,
    default: '$tnt'
  },
  file: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const loading = ref(false)
const content = ref('')
const fileInfo = ref(null)
const contentRef = ref(null)

// 计算行数
const lineCount = computed(() => {
  if (!content.value) return 1
  return content.value.split('\n').length
})

// 监听文件变化，加载内容
watch(() => props.file, async (file) => {
  if (file && visible.value) {
    await loadContent()
  }
}, { immediate: true })

watch(visible, async (val) => {
  if (val && props.file) {
    await loadContent()
  }
})

// 加载文件内容
async function loadContent() {
  if (!props.file) return

  loading.value = true
  content.value = ''
  fileInfo.value = null

  try {
    const response = await gfsApi.getFileInfo(props.repoType, props.repo, props.file.path, true)
    // API 返回格式: axios response -> data -> fileContent
    const data = response?.data || response

    // 数据可能在 fileContent 字段中（源系统格式）
    const info = data?.fileContent || data?.result || data

    // 获取文件内容
    content.value = info?.content || '(文件内容为空)'

    // 保存文件信息
    fileInfo.value = {
      ...info,
      path: data?.path || info?.path || props.file.path,
      size: info?.size || props.file.size,
      lastModified: info?.lastModified || props.file.lastModified
    }
  } catch (error) {
    content.value = `加载失败: ${error?.message || '未知错误'}`
  } finally {
    loading.value = false
  }
}

// 下载文件
function handleDownload() {
  if (!props.file) return
  gfsApi.downloadFile(props.repoType, props.repo, props.file.path, props.file.name)
}

// 复制链接
async function handleCopyLink() {
  if (!props.file) return

  const link = gfsApi.getFileDownloadUrl(props.repoType, props.repo, props.file.path)
  try {
    await navigator.clipboard.writeText(link)
    ElMessage.success('链接已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}

// 格式化文件大小
function formatFileSize(size) {
  if (!size) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`
}

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr

  const pad = (n) => n < 10 ? `0${n}` : String(n)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
</script>

<style scoped>
.file-content-viewer {
  max-height: 60vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: #909399;
}

.loading-content p {
  margin-top: 12px;
}

.file-extra-info {
  display: flex;
  gap: 24px;
  padding: 12px 16px;
  background-color: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-item .label {
  color: #909399;
  font-size: 13px;
}

.info-item .value {
  color: #303133;
  font-size: 13px;
}

.content-wrapper {
  display: flex;
  flex: 1;
  min-height: 0;
  background-color: #282c34;
  border-radius: 4px;
  overflow: auto;
  max-height: calc(60vh - 80px);
}

.line-numbers {
  width: 50px;
  padding: 16px 8px;
  background-color: #21252b;
  color: #495162;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  text-align: right;
  border-right: 1px solid #181a1f;
  flex-shrink: 0;
  user-select: none;
}

.line-number {
  height: 19.5px;
}

.file-content {
  flex: 1;
  margin: 0;
  padding: 16px;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #abb2bf;
  overflow: visible;
}
</style>
