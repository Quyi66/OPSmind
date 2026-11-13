<template>
  <el-dialog
    v-model="visible"
    :title="t('asset.importAssets')"
    width="600px"
    :close-on-click-modal="false"
    @closed="handleClosed"
    :close-on-press-escape="false"
  >
    <div class="import-content">
      <!-- 第一步：下载模板 -->
      <div class="import-step">
        <div class="import-step-label">{{ t('asset.importStepDownload') }}</div>
        <el-button
          @click="handleDownloadTemplate"
          :disabled="!tenantId"
          :loading="downloadingTemplate"
        >
          <i class="fa fa-download" style="margin-right: 4px"></i>
          {{ t('asset.downloadAssetTemplate') }}
        </el-button>
      </div>

      <!-- 第二步：上传文件 -->
      <div class="import-step">
        <div class="import-step-label">{{ t('asset.importStepUpload') }}</div>
        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :limit="1"
          accept=".xlsx,.xls"
          :on-change="handleFileChange"
          :on-remove="handleFileRemove"
        >
          <el-button type="primary">
            <i class="fa fa-upload" style="margin-right: 4px"></i>
            {{ t('asset.selectFile') }}
          </el-button>
          <template #tip>
            <div class="el-upload__tip">
              {{ t('asset.importPortHint') }}
            </div>
          </template>
        </el-upload>
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">{{ t('common.cancel') }}</el-button>
      <el-button
        type="primary"
        :loading="uploading"
        :disabled="!selectedFile"
        @click="handleUpload"
      >
        {{ t('asset.upload') }}
      </el-button>
    </template>
  </el-dialog>

  <ExecuteResultDialog
    v-if="resultDialogVisible"
    v-model:visible="resultDialogVisible"
    :run-id="currentRunId"
    :job-title="t('asset.assetImportJob')"
    @settled="handleExecuteResultSettled"
    @close="handleExecuteResultClose"
  />
</template>

<script setup>
import { t } from '@/core/i18n'

import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { apiService } from '@/core/api'
import { assetApi } from '../../api'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import { isSuccessfulRunStatus } from '@/utils/taskStatus'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  tenantId: {
    type: String,
    default: ''
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
const downloadingTemplate = ref(false)
const resultDialogVisible = ref(false)
const currentRunId = ref('')
const savedRunId = ref('')

function createImportRunId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const random = (Math.random() * 16) | 0
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

// 文件选择变化
const handleFileChange = file => {
  selectedFile.value = file.raw
}

// 文件移除
const handleFileRemove = () => {
  selectedFile.value = null
}

// 下载导入模板
const handleDownloadTemplate = async () => {
  if (downloadingTemplate.value) return
  if (!props.tenantId) {
    ElMessage.warning(t('asset.tenantRequiredTemplate'))
    return
  }

  downloadingTemplate.value = true
  try {
    await assetApi.downloadImportTemplate(props.tenantId)
  } catch (error) {
    console.error('下载导入模板失败:', error)
    ElMessage.error(t('asset.downloadTemplateFailed'))
  } finally {
    downloadingTemplate.value = false
  }
}

// 上传
const handleUpload = async () => {
  if (!selectedFile.value) {
    ElMessage.warning(t('asset.selectFileFirst'))
    return
  }

  if (!props.tenantId) {
    ElMessage.warning(t('asset.tenantRequiredImport'))
    return
  }

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    const runId = createImportRunId()

    await apiService.post('/cmdb/api/cmdb/ci/import2', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'X-Run-Id': runId,
        'Tenant-Id': props.tenantId
      }
    })

    currentRunId.value = runId
    savedRunId.value = ''
    uploading.value = false
    visible.value = false
    resultDialogVisible.value = true
    ElMessage.success(t('asset.importSubmittedRun', { id: runId }))
  } catch (error) {
    console.error('导入失败:', error)
    ElMessage.error(
      t('asset.importFailedReason', { message: error.response?.data?.error || error.response?.data?.message || error.message })
    )
  } finally {
    uploading.value = false
  }
}

function handleExecuteResultSettled(payload) {
  emitSavedForSuccessfulRun(payload)
}

function handleExecuteResultClose(payload) {
  emitSavedForSuccessfulRun(payload)
}

function emitSavedForSuccessfulRun(payload) {
  const runId = String(payload?.runId || currentRunId.value || '')
  // settled 与 close 会在同一个成功任务上连续触发，按运行 ID 确保父列表只刷新一次。
  if (!isSuccessfulRunStatus(payload?.status) || !runId || savedRunId.value === runId) return
  savedRunId.value = runId
  emit('saved')
}

// 弹窗关闭时重置
const handleClosed = () => {
  uploadRef.value?.clearFiles()
  selectedFile.value = null
  uploading.value = false
}
</script>

<style scoped lang="scss">
.import-content {
  padding: 0 20px;
}

.import-step {
  margin-bottom: 24px;

  .import-step-label {
    font-size: 13px;
    color: var(--el-text-color-secondary);
    margin-bottom: 10px;
  }
}
</style>
