<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? t('automation.library.editFolder') : t('automation.library.newFolder')"
    width="500px"
    :close-on-click-modal="false"
    @closed="handleClosed"
    :close-on-press-escape="false"
  >
    <div class="folder-form">
      <div class="form-group">
        <label class="control-label">{{ t('automation.library.folderName') }}</label>
        <div class="form-control-wrapper">
          <el-input v-model="form.name" :disabled="isEdit" class="code-input" maxlength="100" />
        </div>
      </div>
      <div class="form-group">
        <label class="control-label">{{ t('automation.job.description') }}</label>
        <div class="form-control-wrapper">
          <el-input v-model="form.description" maxlength="200" />
        </div>
      </div>
    </div>
    <template #footer>
      <el-button type="primary" :disabled="!form.name" :loading="saving" @click="handleSubmit">
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
  dir: {
    type: String,
    default: ''
  },
  // 编辑模式下的文件夹信息
  editData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const isEdit = computed(() => !!props.editData)

const form = ref({
  name: '',
  description: ''
})

const saving = ref(false)

// 监听 editData 变化，填充表单
watch(
  () => props.editData,
  data => {
    if (data) {
      form.value = {
        name: data.name || '',
        description: data.description || ''
      }
    }
  },
  { immediate: true }
)

// 提交
async function handleSubmit() {
  if (!form.value.name) {
    ElMessage.warning(t('automation.library.folderNameRequired'))
    return
  }

  saving.value = true
  try {
    if (isEdit.value) {
      await gfsApi.editFolder(
        {
          repoType: props.repoType,
          repo: props.repo,
          dir: props.dir
        },
        form.value.name,
        form.value.description
      )
      ElMessage.success(t('automation.library.modified'))
    } else {
      await gfsApi.addFolder(
        {
          repoType: props.repoType,
          repo: props.repo,
          dir: props.dir
        },
        form.value.name,
        form.value.description
      )
      ElMessage.success(t('automation.schedule.created'))
    }
    visible.value = false
    emit('success')
  } catch (error) {
    ElMessage.error(error?.message || t('automation.schedule.operationFailed'))
  } finally {
    saving.value = false
  }
}

// 关闭时重置表单
function handleClosed() {
  form.value = {
    name: '',
    description: ''
  }
}
</script>

<style scoped>
.folder-form {
  padding: 0 12px;
}

.folder-form .form-group {
  margin-bottom: 16px;
}

.folder-form .control-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.folder-form .form-control-wrapper {
  width: 100%;
}

.folder-form .code-input :deep(.el-input__inner) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}
</style>
