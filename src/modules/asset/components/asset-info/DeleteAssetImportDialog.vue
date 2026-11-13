<template>
  <el-dialog
    v-model="visible"
    :title="t('asset.batchDeleteAssets')"
    width="600px"
    :close-on-click-modal="false"
    @closed="handleClosed"
    :close-on-press-escape="false"
  >
    <div class="delete-import-content">
      <!-- 第一步：下载模板 -->
      <div class="delete-import-step">
        <div class="delete-import-step-label">{{ t('asset.deleteStepDownload') }}</div>
        <el-button @click="handleDownloadTemplate">
          <i class="fa fa-download" style="margin-right: 4px"></i>
          {{ t('asset.downloadDeleteTemplate') }}
        </el-button>
      </div>

      <!-- 第二步：上传文件执行删除 -->
      <div class="delete-import-step">
        <div class="delete-import-step-label">{{ t('asset.deleteStepUpload') }}</div>
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
            {{ t('asset.selectDeleteFile') }}
          </el-button>
          <template #tip>
            <div class="el-upload__tip">{{ t('asset.excelFilesOnly') }}</div>
          </template>
        </el-upload>
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">{{ t('common.cancel') }}</el-button>
      <el-button type="danger" :loading="uploading" :disabled="!selectedFile" @click="handleUpload">
        {{ t('asset.startDelete') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { t } from '@/core/i18n'

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
  set: val => emit('update:modelValue', val)
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
  downloadPublicFile('templates/batch-delete-template.xlsx', t('asset.deleteTemplateName'))
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
    ElMessage.success(t('asset.deleteCompleted', { total: totalCount, success: successCount }))
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
    : `<li>${escapeHtml(t('asset.noErrorDetails'))}</li>`

  await ElMessageBox.alert(
    `<div style="max-height: 320px; overflow-y: auto; line-height: 1.6;">
      <p><strong>${escapeHtml(t('asset.processedCount', { count: totalCount }))}</strong></p>
      <p><strong>${escapeHtml(t('asset.deletedCount', { count: successCount }))}</strong></p>
      ${successIpsHtml}
      <p><strong>${escapeHtml(t('asset.deleteFailedCount', { count: failedCount }))}</strong></p>
      ${failedIpsHtml}
      <p><strong>${escapeHtml(t('asset.errorDetails'))}</strong></p>
      <ul style="color: #f56c6c; margin: 8px 0 0 20px; padding: 0;">${errorItemsHtml}</ul>
    </div>`,
    t('asset.deleteResult'),
    {
      closeOnClickModal: true,
      dangerouslyUseHTMLString: true,
      confirmButtonText: t('asset.ok')
    }
  )
}

async function handleUpload() {
  if (!selectedFile.value) {
    ElMessage.warning(t('asset.selectFileFirst'))
    return
  }

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    const response = await apiService.post(
      `/cmdb/api/cmdb/ci/batch-delete-by-excel?cacheBuster=${Date.now()}`,
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
    ElMessage.error(t('asset.deleteImportFailedReason', { message: error.response?.data?.message || error.message }))
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
