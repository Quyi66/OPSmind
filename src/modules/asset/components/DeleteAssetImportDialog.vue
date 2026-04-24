<template>
  <el-dialog
    v-model="visible"
    title="批量删除资产"
    width="600px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <div class="delete-import-content">
      <!-- 第一步：下载模板 -->
      <div class="delete-import-step">
        <div class="delete-import-step-label">第一步：下载批量删除模板</div>
        <el-button @click="handleDownloadTemplate">
          <i class="fa fa-download" style="margin-right: 4px"></i>
          下载批量删除模板
        </el-button>
      </div>

      <!-- 第二步：上传文件执行删除 -->
      <div class="delete-import-step">
        <div class="delete-import-step-label">第二步：按模板填写后上传执行删除</div>
        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :limit="1"
          accept=".xlsx,.xls"
          :on-change="handleFileChange"
          :on-remove="handleFileRemove"
        >
          <el-button type="danger">
            <i class="fa fa-upload" style="margin-right: 4px"></i>
            选择删除文件
          </el-button>
          <template #tip>
            <div class="el-upload__tip">只能上传 xlsx/xls 文件</div>
          </template>
        </el-upload>
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button
        type="danger"
        :loading="uploading"
        :disabled="!selectedFile"
        @click="handleUpload"
      >
        开始删除
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiService } from '@/core/api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const uploadRef = ref()
const selectedFile = ref(null)
const uploading = ref(false)

function downloadPublicFile(relativePath, filename) {
  const base = String(import.meta.env.BASE_URL || '/')
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  const url = `${normalizedBase}${String(relativePath || '').replace(/^\/+/, '')}`
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function handleDownloadTemplate() {
  downloadPublicFile('templates/batch-delete-template.xlsx', '批量删除资产模板.xlsx')
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function handleFileChange(file) {
  selectedFile.value = file.raw
}

function handleFileRemove() {
  selectedFile.value = null
}

async function showDeleteResult(result) {
  const successCount = result?.successCount || 0
  const failedCount = result?.failedCount || 0
  const totalCount = result?.totalCount || 0
  const successIps = Array.isArray(result?.successIps) ? result.successIps : []
  const failedIps = Array.isArray(result?.failedIps) ? result.failedIps : []
  const errorMessages = Array.isArray(result?.errorMessages) ? result.errorMessages : []

  if (failedCount === 0 && errorMessages.length === 0) {
    ElMessage.success(`处理完成：共 ${totalCount} 条记录，成功删除 ${successCount} 条`)
    return
  }

  const successIpsHtml = successIps.length
    ? `<p style="color: #67c23a;">${escapeHtml(successIps.join(', '))}</p>`
    : ''
  const failedIpsHtml = failedIps.length
    ? `<p style="color: #f56c6c;">${escapeHtml(failedIps.join(', '))}</p>`
    : ''
  const errorItemsHtml = errorMessages.length
    ? errorMessages.map(message => `<li>${escapeHtml(message)}</li>`).join('')
    : '<li>未返回详细错误信息</li>'

  await ElMessageBox.alert(
    `<div style="max-height: 320px; overflow-y: auto; line-height: 1.6;">
      <p><strong>处理总数:</strong> ${totalCount} 条</p>
      <p><strong>成功删除:</strong> ${successCount} 条</p>
      ${successIpsHtml}
      <p><strong>删除失败:</strong> ${failedCount} 条</p>
      ${failedIpsHtml}
      <p><strong>错误信息:</strong></p>
      <ul style="color: #f56c6c; margin: 8px 0 0 20px; padding: 0;">${errorItemsHtml}</ul>
    </div>`,
    '删除结果',
    {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '确定'
    }
  )
}

async function handleUpload() {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择文件')
    return
  }

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    const response = await apiService.post(
      `/acm/api/acm/ci/batch-delete-by-excel?cacheBuster=${Date.now()}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    )

    await showDeleteResult(response?.data || {})
    visible.value = false
    emit('saved')
  } catch (error) {
    console.error('删除导入失败:', error)
    ElMessage.error('删除导入失败: ' + (error.response?.data?.message || error.message))
  } finally {
    uploading.value = false
  }
}

function handleClosed() {
  uploadRef.value?.clearFiles()
  selectedFile.value = null
}
</script>

<style scoped lang="scss">
.delete-import-content {
  padding: 0 20px;
}

.delete-import-step {
  margin-bottom: 24px;

  .delete-import-step-label {
    font-size: 13px;
    color: var(--el-text-color-secondary);
    margin-bottom: 10px;
  }
}
</style>
