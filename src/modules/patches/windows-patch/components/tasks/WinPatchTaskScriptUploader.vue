<template>
  <div class="win-patch-script-uploader">
    <div class="win-patch-script-uploader__meta">
      <div class="win-patch-script-uploader__label">{{ label }}</div>
      <div class="win-patch-script-uploader__hint">
        {{ t('patches.windows.ps1UploadHint') }}
      </div>
    </div>
    <div class="win-patch-script-uploader__actions">
      <el-tag :type="hasScript ? 'success' : 'info'" size="small" effect="plain">
        {{ hasScript ? t('patches.windows.uploaded') : t('patches.windows.notUploaded') }}
      </el-tag>
      <el-upload
        :show-file-list="false"
        :auto-upload="true"
        :http-request="handleUpload"
        accept=".ps1,.psm1,.txt"
        :disabled="isDisabled"
      >
        <el-button size="small" :loading="uploading" :disabled="isDisabled">
          {{ hasScript ? t('patches.windows.uploadAgain') : t('patches.linux.uploadScript') }}
        </el-button>
      </el-upload>
    </div>
  </div>
</template>

<script setup>
import { createPatchTaskError } from '@/modules/patches/utils/patchTaskFeedback'
import { t } from '@/core/i18n'

import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { winPatchApi } from '../../api'
import { unwrapResponse } from '../../utils'

const props = defineProps({
  taskId: {
    type: [String, Number],
    default: ''
  },
  scriptType: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  scriptContent: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['uploaded'])

const uploading = ref(false)

const normalizedTaskId = computed(() => String(props.taskId || '').trim())
const normalizedScriptContent = computed(() => String(props.scriptContent || '').trim())
const hasScript = computed(() => Boolean(normalizedScriptContent.value))
const isDisabled = computed(() => props.disabled || !normalizedTaskId.value)

async function handleUpload(option) {
  const file = option?.file
  if (!file || isDisabled.value) {
    option?.onError?.(createPatchTaskError('patches.windows.uploadUnavailable'))
    return
  }

  uploading.value = true
  try {
    const response = await winPatchApi.uploadTaskScript(
      normalizedTaskId.value,
      props.scriptType,
      file
    )
    ElMessage.success(t('patches.windows.stepUploaded', { p0: props.label }))
    option?.onSuccess?.({}, file)
    emit('uploaded', unwrapResponse(response))
  } catch (error) {
    console.error(`上传${props.label}失败:`, error)
    ElMessage.error(t('patches.windows.uploadStepFailed', { p0: props.label }))
    option?.onError?.(error)
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped lang="scss">
.win-patch-script-uploader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: var(--el-bg-color);
}

.win-patch-script-uploader__meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.win-patch-script-uploader__label {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.win-patch-script-uploader__hint {
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.win-patch-script-uploader__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

@media (max-width: 960px) {
  .win-patch-script-uploader {
    flex-direction: column;
    align-items: flex-start;
  }

  .win-patch-script-uploader__actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
