<template>
  <div class="task-step-content">
    <div class="task-step-editor">
      <div class="task-step-header">
        <div class="task-step-editor__title">
          <i class="fa" :class="icon" />
          {{ title }}
        </div>
        <el-radio-group
          :model-value="mode"
          size="small"
          :disabled="disabled"
          @update:model-value="$emit('update:mode', $event)"
        >
          <el-radio-button value="edit">手动编辑</el-radio-button>
          <el-radio-button value="upload">上传脚本</el-radio-button>
        </el-radio-group>
      </div>

      <el-input
        v-if="mode === 'edit'"
        type="textarea"
        :model-value="modelValue"
        :autosize="{ minRows: 8, maxRows: 24 }"
        :placeholder="placeholder"
        class="script-input"
        :disabled="disabled"
        @update:model-value="$emit('update:modelValue', $event)"
      />

      <div v-else class="script-upload-panel">
        <input
          ref="fileInputRef"
          type="file"
          accept=".sh,.bash,.txt,.conf,.cfg,.yaml,.yml,.json,.log,.ini,.cnf,text/plain"
          class="script-upload-input"
          @change="$emit('upload', $event)"
        />
        <div class="script-upload-actions">
          <el-button type="primary" plain :disabled="disabled" @click="fileInputRef?.click()">
            <i class="fa fa-upload" />
            上传脚本
          </el-button>
          <span class="script-upload-file">{{ fileName || '未选择文件' }}</span>
        </div>
        <div class="task-step-editor__hint">
          上传后会暂存到当前向导，执行时再同步到补丁安装任务。
        </div>
        <el-input
          type="textarea"
          :model-value="modelValue"
          :autosize="{ minRows: 8, maxRows: 24 }"
          placeholder="上传后将在这里预览脚本内容"
          class="script-input"
          readonly
        />
      </div>
    </div>

    <div class="task-step-action">
      <el-alert
        v-if="state === 'success' || state === 'failed'"
        :type="state === 'success' ? 'success' : 'error'"
        :closable="false"
        show-icon
        :title="alertTitle"
        class="task-step-alert"
      >
        <template v-if="runId && modelValue" #default>
          <div class="task-detail-info">
            <el-button type="primary" link @click="$emit('show-result', runId, title)">
              查看执行详情
            </el-button>
          </div>
        </template>
      </el-alert>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  mode: {
    type: String,
    default: 'edit'
  },
  fileName: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  placeholder: {
    type: String,
    default: ''
  },
  state: {
    type: String,
    default: 'idle'
  },
  skipped: {
    type: Boolean,
    default: false
  },
  successTitle: {
    type: String,
    required: true
  },
  skippedTitle: {
    type: String,
    required: true
  },
  failurePrefix: {
    type: String,
    required: true
  },
  errorMessage: {
    type: String,
    default: ''
  },
  runId: {
    type: [String, Number],
    default: ''
  }
})

defineEmits(['update:modelValue', 'update:mode', 'upload', 'show-result'])

const fileInputRef = ref(null)
const disabled = computed(() => ['running', 'success'].includes(props.state))
const alertTitle = computed(() => {
  if (props.state === 'success') return props.skipped ? props.skippedTitle : props.successTitle
  return `${props.failurePrefix}${props.errorMessage}`
})
</script>

<style scoped lang="scss">
@use '../PatchTaskStep' as patch-task-step;

@include patch-task-step.base-layout;

.task-step-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.script-input :deep(.el-textarea__inner) {
  background-color: #fafafa;
  font-family: monospace;
}

.script-upload-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.script-upload-input {
  display: none;
}

.script-upload-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;

  .fa {
    margin-right: 4px;
  }
}

.script-upload-file,
.task-step-editor__hint {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.task-detail-info {
  margin-top: 4px;
}
</style>
