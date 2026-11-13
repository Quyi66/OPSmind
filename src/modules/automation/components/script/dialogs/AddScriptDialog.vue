<template>
  <el-dialog
    v-model="visible"
    :title="t('automation.library.newScript')"
    width="800px"
    :close-on-click-modal="false"
    @closed="handleClosed"
    :close-on-press-escape="false"
  >
    <div class="script-form">
      <div class="form-group">
        <label class="control-label">{{ t('automation.library.savePath') }}</label>
        <div class="form-control-wrapper">
          <div class="path-preview">{{ dirLabel }}</div>
        </div>
      </div>
      <div class="form-group">
        <label class="control-label">{{ t('automation.library.scriptName') }}</label>
        <div class="form-control-wrapper">
          <el-input
            v-model="form.name"
            :placeholder="t('automation.library.scriptNameExample')"
            class="code-input"
            maxlength="100"
          />
        </div>
      </div>
      <div class="form-group">
        <label class="control-label">{{ t('automation.library.scriptContents') }}</label>
        <div class="form-control-wrapper">
          <div class="code-editor-wrapper">
            <div class="line-numbers" ref="lineNumbersRef">
              <div v-for="n in lineCount" :key="n" class="line-number">{{ n }}</div>
            </div>
            <textarea
              ref="editorRef"
              v-model="form.content"
              class="code-editor"
              spellcheck="false"
              @scroll="syncScroll"
              @input="updateLineNumbers"
            />
          </div>
        </div>
      </div>
      <div v-if="repoType === 'git'" class="form-group">
        <label class="control-label">
          {{ t('automation.library.parameterConfig') }}
          <el-tooltip
            :content="t('automation.library.parameterConfigHint')"
            placement="top"
          >
            <i class="fa fa-info-circle text-muted" />
          </el-tooltip>
        </label>
        <div class="form-control-wrapper">
          <el-input v-model="form.config" class="code-input" maxlength="500" />
        </div>
      </div>
      <div v-if="repoType === 'git'" class="form-group">
        <label class="control-label">
          {{ t('automation.library.description') }}
          <el-tooltip
            :content="t('automation.library.descriptionHint')"
            placement="top"
          >
            <i class="fa fa-info-circle text-muted" />
          </el-tooltip>
        </label>
        <div class="form-control-wrapper">
          <el-input v-model="form.description" type="textarea" :rows="3" resize="none" />
        </div>
      </div>
    </div>
    <template #footer>
      <el-button
        type="primary"
        :disabled="!form.name || !form.content"
        :loading="saving"
        @click="handleSubmit"
      >
        <i class="fa fa-check me-1" />
        {{ t('automation.file.confirm') }}
      </el-button>
      <el-button @click="visible = false">
        <i class="fa fa-reply me-1" />
        {{ t('common.cancel') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { t } from '@/core/i18n'

import { ref, computed, watch, nextTick } from 'vue'
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
  dir: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const form = ref({
  name: '',
  content: '',
  config: '',
  description: ''
})

const saving = ref(false)
const editorRef = ref(null)
const lineNumbersRef = ref(null)

// 计算行数
const lineCount = computed(() => {
  if (!form.value.content) return 1
  return form.value.content.split('\n').length
})

const dirLabel = computed(() => (props.dir ? `~/${props.dir}` : '~'))

// 同步滚动
function syncScroll() {
  if (lineNumbersRef.value && editorRef.value) {
    lineNumbersRef.value.scrollTop = editorRef.value.scrollTop
  }
}

// 更新行号
function updateLineNumbers() {
  nextTick(() => {
    syncScroll()
  })
}

// 提交
async function handleSubmit() {
  if (!form.value.name) {
    ElMessage.warning(t('automation.library.scriptNameRequired'))
    return
  }
  if (!form.value.content) {
    ElMessage.warning(t('automation.library.scriptContentRequired'))
    return
  }

  saving.value = true
  try {
    const blob = new Blob([form.value.content], { type: 'text/plain' })
    const file = new File([blob], form.value.name, { type: 'text/plain' })

    await gfsApi.uploadFile(props.repoType, props.repo, {
      file,
      dir: props.dir,
      description: form.value.description,
      config: form.value.config
    })
    ElMessage.success(t('automation.schedule.created'))
    visible.value = false
    emit('success')
  } catch (error) {
    ElMessage.error(error?.message || t('automation.job.createFailed'))
  } finally {
    saving.value = false
  }
}

// 关闭时重置表单
function handleClosed() {
  form.value = {
    name: '',
    content: '',
    config: '',
    description: ''
  }
}
</script>

<style scoped>
.script-form {
  padding: 0 12px;
}

.script-form .form-group {
  margin-bottom: 16px;
}

.script-form .control-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.script-form .control-label i {
  margin-left: 4px;
  cursor: help;
}

.script-form .form-control-wrapper {
  width: 100%;
}

.script-form .code-input :deep(.el-input__inner) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

.script-form .path-preview {
  padding: 10px 12px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  background: var(--el-fill-color-extra-light);
  color: var(--el-text-color-regular);
  font-size: 13px;
  line-height: 1.4;
  word-break: break-all;
}

/* 代码编辑器样式 */
.code-editor-wrapper {
  position: relative;
  display: flex;
  height: 320px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  overflow: hidden;
  background-color: #282c34;
}

.line-numbers {
  width: 40px;
  padding: 12px 8px;
  background-color: #21252b;
  color: #495162;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  text-align: right;
  border-right: 1px solid #181a1f;
  overflow: hidden;
  flex-shrink: 0;
  user-select: none;
}

.line-number {
  height: 19.5px;
}

.code-editor {
  flex: 1;
  width: 100%;
  height: 100%;
  padding: 12px;
  margin: 0;
  border: none;
  outline: none;
  resize: none;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  background-color: #282c34;
  color: #abb2bf;
  tab-size: 4;
}

.code-editor::placeholder {
  color: #5c6370;
}
</style>
