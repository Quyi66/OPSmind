<template>
  <div class="task-step-content">
    <div class="task-step-editor">
      <div class="task-step-header">
        <div>
          <div class="task-step-editor__title">{{ title }}</div>
          <div class="task-step-editor__hint">{{ description }}</div>
        </div>
        <el-radio-group
          :model-value="resolvedModel.mode"
          size="small"
          :disabled="disabled"
          @update:model-value="handleModeChange"
        >
          <el-radio-button value="edit">{{ t('patches.linux.manualEdit') }}</el-radio-button>
          <el-radio-button value="upload">{{ t('patches.linux.uploadScript') }}</el-radio-button>
        </el-radio-group>
      </div>

      <div v-if="resolvedModel.mode === 'edit'">
        <el-input
          type="textarea"
          :model-value="resolvedModel.content"
          :autosize="{ minRows: 8, maxRows: 24 }"
          :placeholder="placeholder"
          class="script-input"
          :disabled="disabled"
          @update:model-value="value => updateModel({ content: value })"
        />
        <div class="task-step-editor__hint">{{ t('patches.windows.emptyScriptHint') }}</div>
      </div>

      <div v-else class="script-upload-panel">
        <input
          ref="fileInputRef"
          type="file"
          accept=".ps1,.psm1,.txt"
          class="script-upload-input"
          @change="handleFileChange"
        />
        <div class="script-upload-actions">
          <el-button type="primary" plain :disabled="disabled" @click="triggerFileSelect">
            <i class="fa fa-upload" style="margin-right: 4px"></i>
            {{ resolvedModel.fileName ? t('patches.windows.reselectScript') : t('automation.flow.selectScript') }}
          </el-button>
          <span class="script-upload-file">{{ resolvedModel.fileName || t('patches.linux.noFileSelected') }}</span>
        </div>
        <div class="task-step-editor__hint">{{ t('patches.windows.scriptUploadHint') }}</div>
        <el-input
          type="textarea"
          :model-value="resolvedModel.content"
          :autosize="{ minRows: 8, maxRows: 24 }"
          :placeholder="t('patches.windows.scriptPreviewHint')"
          readonly
          class="script-input"
        />
      </div>
    </div>

    <div class="task-step-action">
      <el-alert
        v-if="statusTitle"
        :title="statusTitle"
        :type="statusType"
        :closable="false"
        show-icon
        class="task-step-alert"
      >
        <template #default>
          <el-button v-if="runId" type="primary" link @click="emit('view-run', runId, title, runTitleKey)">
            {{ t('patches.linux.viewExecution') }}
          </el-button>
        </template>
      </el-alert>
    </div>
  </div>
</template>

<script setup>
import { t } from '@/core/i18n'
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({})
  },
  runTitleKey: { type: String, default: '' },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    default: 'idle'
  },
  runId: {
    type: String,
    default: ''
  },
  errorMessage: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'view-run'])

const fileInputRef = ref(null)

const resolvedModel = computed(() => ({
  mode: props.modelValue?.mode === 'upload' ? 'upload' : 'edit',
  content: String(props.modelValue?.content || ''),
  file: props.modelValue?.file || null,
  fileName: String(props.modelValue?.fileName || '')
}))

const statusType = computed(() => {
  if (props.status === 'success') return 'success'
  if (props.status === 'failed') return 'error'
  if (props.status === 'skipped') return 'info'
  return 'info'
})

const statusTitle = computed(() => {
  if (props.status === 'success') return t('patches.windows.stepCompleted', { p0: props.title })
  if (props.status === 'skipped') return t('patches.windows.stepSkipped', { p0: props.title })
  if (props.status === 'failed')
    return t('patches.windows.executionFailedReason', { p0: props.errorMessage || t('patches.windows.stepFailed', { p0: props.title }) })
  return ''
})

function updateModel(patch = {}) {
  emit('update:modelValue', {
    ...resolvedModel.value,
    ...patch
  })
}

function handleModeChange(mode) {
  if (mode === 'upload') {
    updateModel({
      mode: 'upload',
      content: '',
      file: null,
      fileName: ''
    })
    return
  }

  updateModel({
    mode: 'edit',
    file: null,
    fileName: ''
  })
}

function triggerFileSelect() {
  if (props.disabled) {
    return
  }

  fileInputRef.value?.click()
}

async function handleFileChange(event) {
  const file = event.target?.files?.[0]
  if (!file) {
    return
  }

  try {
    const content = await file.text()
    updateModel({
      mode: 'upload',
      content,
      file,
      fileName: file.name
    })
  } catch (error) {
    console.error('读取脚本文件失败:', error)
    ElMessage.error(t('patches.windows.readScriptFailed'))
  } finally {
    if (event.target) {
      event.target.value = ''
    }
  }
}
</script>

<style scoped lang="scss">
.task-step-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 280px;
}

.task-step-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-step-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.task-step-editor__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  padding: 4px 0;
  display: flex;
  align-items: center;
}

.task-step-editor__hint {
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.task-step-action {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  margin-top: 4px;
}

.task-step-alert {
  width: 100%;
}

.script-input :deep(.el-textarea__inner) {
  font-family: monospace;
  background-color: #fafafa;
}

.script-upload-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.script-upload-input {
  display: none;
}

.script-upload-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.script-upload-file {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

@media (max-width: 960px) {
  .task-step-header {
    flex-direction: column;
  }
}
</style>
