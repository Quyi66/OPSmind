<template>
  <el-dialog
    v-model="visible"
    :title="t('automation.library.addFiles')"
    width="600px"
    :close-on-click-modal="false"
    @closed="handleClosed"
    :close-on-press-escape="false"
  >
    <div class="upload-form">
      <!-- 文件路径显示 -->
      <div class="form-group">
        <div class="file-path-label">{{ t('automation.library.filePathLabel') }}</div>
      </div>
      <div v-if="form.fileList.length" class="form-group">
        <div v-for="(file, index) in form.fileList" :key="index" class="file-path-item">
          {{ dir || '~' }}
          <strong>&nbsp;&nbsp;/&nbsp;&nbsp;{{ file.name }}</strong>
        </div>
      </div>

      <!-- 文件选择 -->
      <div class="form-group">
        <div class="form-control-wrapper">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            :file-list="form.fileList"
            multiple
            :show-file-list="false"
          >
            <el-button type="primary">
              <i class="fa fa-folder-open me-1" />
              {{ t('automation.library.selectFiles') }}
            </el-button>
          </el-upload>
          <p class="help-text">
            {{ t('automation.library.uploadLimitHint', { limit: '100MB' }) }}
            <br />
            {{ t('automation.library.multipleUploadHint') }}
          </p>
        </div>
      </div>

      <!-- 压缩文件选项 -->
      <div v-if="hasZipFile" class="form-group">
        <div class="alert-info-box">
          <p class="help-block">
            <strong class="d-block">{{ t('automation.library.descriptionLabel') }}</strong>
            <strong class="d-block">{{ t('automation.library.keepArchiveHint') }}</strong>
            <strong class="d-block">
              {{ t('automation.library.extractHereHint') }}
            </strong>
            <strong class="d-block">
              {{ t('automation.library.extractSubdirHint') }}
            </strong>
          </p>
        </div>
        <label class="control-label">{{ t('automation.library.archiveOptions') }}</label>
        <div class="form-control-wrapper">
          <el-radio-group v-model="form.unzipMode">
            <el-radio value="ExtractToDir">{{ t('automation.library.extractSubdir') }}</el-radio>
            <el-radio value="ExtractWithoutDir">{{ t('automation.library.extractHere') }}</el-radio>
            <el-radio value="">{{ t('automation.library.keepArchive') }}</el-radio>
          </el-radio-group>
        </div>
      </div>

      <!-- 参数配置（仅git） -->
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
          <el-input v-model="form.config" class="code-input" />
        </div>
      </div>

      <!-- 说明（仅git） -->
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
        :disabled="!form.fileList.length"
        :loading="uploading"
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
  fileList: [],
  config: '',
  description: '',
  unzipMode: ''
})

const uploading = ref(false)
const uploadRef = ref(null)

// 是否有压缩文件
const hasZipFile = computed(() => {
  return form.value.fileList.some(
    f => f.name.endsWith('.zip') || f.name.endsWith('.tar.gz') || f.name.endsWith('.tar')
  )
})

// 文件变化
function handleFileChange(file, fileList) {
  form.value.fileList = fileList
}

// 文件移除
function handleFileRemove(file, fileList) {
  form.value.fileList = fileList
}

// 提交上传
async function handleSubmit() {
  if (!form.value.fileList.length) {
    ElMessage.warning(t('automation.library.selectUploadFiles'))
    return
  }

  uploading.value = true
  try {
    for (const item of form.value.fileList) {
      await gfsApi.uploadFile(props.repoType, props.repo, {
        file: item.raw,
        dir: props.dir,
        description: form.value.description,
        config: form.value.config,
        unzipMode: form.value.unzipMode
      })
    }
    ElMessage.success(t('automation.library.uploaded'))
    visible.value = false
    emit('success')
  } catch (error) {
    ElMessage.error(error?.message || t('automation.library.uploadFailed'))
  } finally {
    uploading.value = false
  }
}

// 关闭时重置表单
function handleClosed() {
  form.value = {
    fileList: [],
    config: '',
    description: '',
    unzipMode: ''
  }
}
</script>

<style scoped>
.upload-form {
  padding: 0 12px;
}

.upload-form .form-group {
  margin-bottom: 16px;
}

.upload-form .control-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.upload-form .control-label i {
  margin-left: 4px;
  cursor: help;
}

.upload-form .form-control-wrapper {
  width: 100%;
}

.file-path-label {
  color: var(--el-text-color-regular);
}

.file-path-item {
  padding: 4px 0;
  color: var(--el-text-color-primary);
}

.file-path-item strong {
  color: var(--el-color-primary);
}

.help-text {
  margin-top: 12px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.help-text strong {
  color: var(--el-text-color-regular);
}

.alert-info-box {
  background-color: var(--el-color-success-light-9);
  border: 1px solid var(--el-color-success-light-5);
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 12px;
}

.alert-info-box .help-block {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  color: var(--el-color-success);
}

.alert-info-box .d-block {
  display: block;
}

.code-input :deep(.el-input__inner) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}
</style>
