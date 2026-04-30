<template>
  <div class="win-patch-script-uploader">
    <div class="win-patch-script-uploader__meta">
      <div class="win-patch-script-uploader__label">{{ label }}</div>
      <div class="win-patch-script-uploader__hint">支持上传 .ps1 脚本，再次上传会覆盖当前内容。</div>
    </div>
    <div class="win-patch-script-uploader__actions">
      <el-tag :type="hasScript ? 'success' : 'info'" size="small" effect="plain">
        {{ hasScript ? '已上传' : '未上传' }}
      </el-tag>
      <el-upload
        :show-file-list="false"
        :auto-upload="true"
        :http-request="handleUpload"
        accept=".ps1,.psm1,.txt"
        :disabled="isDisabled"
      >
        <el-button size="small" :loading="uploading" :disabled="isDisabled">
          {{ hasScript ? '重新上传' : '上传脚本' }}
        </el-button>
      </el-upload>
    </div>
  </div>
</template>

<script setup>
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
    option?.onError?.(new Error('上传条件不满足'))
    return
  }

  uploading.value = true
  try {
    const response = await winPatchApi.uploadTaskScript(normalizedTaskId.value, props.scriptType, file)
    ElMessage.success(`${props.label}已上传`)
    option?.onSuccess?.({}, file)
    emit('uploaded', unwrapResponse(response))
  } catch (error) {
    console.error(`上传${props.label}失败:`, error)
    ElMessage.error(`上传${props.label}失败`)
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
