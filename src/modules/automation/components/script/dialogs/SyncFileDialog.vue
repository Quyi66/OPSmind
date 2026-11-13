<template>
  <el-dialog
    v-model="visible"
    :title="t('automation.library.syncScripts')"
    width="600px"
    :close-on-click-modal="false"
    @closed="handleClosed"
    :close-on-press-escape="false"
  >
    <div class="sync-form">
      <p class="help-info">
        <strong>{{ t('automation.library.syncHint') }}</strong>
      </p>

      <div class="form-group">
        <label class="control-label">
          {{ t('automation.library.syncScriptPath') }}
          <el-tooltip :content="t('automation.library.absolutePathHint')" placement="top">
            <i class="fa fa-info-circle text-muted" />
          </el-tooltip>
        </label>
        <div class="form-control-wrapper">
          <el-input v-model="form.path" class="code-input" placeholder="/path/to/file" />
        </div>
      </div>

      <div v-if="form.path" class="form-group">
        <label class="control-label">{{ t('automation.library.syncOptions') }}</label>
        <div class="form-control-wrapper">
          <el-radio-group v-model="form.syncMode">
            <el-radio value="ExtractToDir">{{ t('automation.library.syncSubdir') }}</el-radio>
            <el-radio value="ExtractWithoutDir">{{ t('automation.library.syncHere') }}</el-radio>
          </el-radio-group>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button
        type="primary"
        :disabled="!form.path || !form.syncMode"
        :loading="syncing"
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

import { ref, computed } from 'vue'
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
  path: '',
  syncMode: ''
})

const syncing = ref(false)

// 提交
async function handleSubmit() {
  if (!form.value.path) {
    ElMessage.warning(t('automation.library.syncPathRequired'))
    return
  }
  if (!form.value.syncMode) {
    ElMessage.warning(t('automation.library.syncOptionRequired'))
    return
  }

  syncing.value = true
  try {
    await gfsApi.syncFile(props.repoType, props.repo, {
      path: form.value.path,
      dir: props.dir,
      syncMode: form.value.syncMode
    })
    ElMessage.success(t('automation.library.synced'))
    visible.value = false
    emit('success')
  } catch (error) {
    ElMessage.error(error?.message || t('automation.library.syncFailed'))
  } finally {
    syncing.value = false
  }
}

// 关闭时重置表单
function handleClosed() {
  form.value = {
    path: '',
    syncMode: ''
  }
}
</script>

<style scoped>
.sync-form {
  padding: 0 12px;
}

.sync-form .form-group {
  margin-bottom: 16px;
}

.sync-form .control-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.sync-form .control-label i {
  margin-left: 4px;
  cursor: help;
}

.sync-form .form-control-wrapper {
  width: 100%;
}

.help-info {
  background-color: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 16px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.help-info strong {
  color: var(--el-text-color-regular);
}

.code-input :deep(.el-input__inner) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}
</style>
