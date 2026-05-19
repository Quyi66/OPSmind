<template>
  <el-dialog
    v-model="visible"
    title="添加文件"
    width="600px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <div class="upload-form">
      <!-- 文件路径显示 -->
      <div class="form-group">
        <div class="file-path-label">文件路径：</div>
      </div>
      <div v-if="form.fileList.length" class="form-group">
        <div v-for="(file, index) in form.fileList" :key="index" class="file-path-item">
          {{ dir || '~' }} <strong>&nbsp;&nbsp;/&nbsp;&nbsp;{{ file.name }}</strong>
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
              <i class="fa fa-folder-open me-1" /> 选择文件
            </el-button>
          </el-upload>
          <p class="help-text">
            文件大小不能超过<strong>100MB</strong>。同名的文件会被覆盖，但文件信息将保留。<br>
            支持文件多选上传（不能包含文件夹）
          </p>
        </div>
      </div>

      <!-- 压缩文件选项 -->
      <div v-if="hasZipFile" class="form-group">
        <div class="alert-info-box">
          <p class="help-block">
            <strong class="d-block">说明:</strong>
            <strong class="d-block">不解压：不进行解压操作，压缩文件保留其原始状态。</strong>
            <strong class="d-block">解压到当前目录：直接将压缩文件的内容解压到当前目录，不会创建新的子目录。</strong>
            <strong class="d-block">解压到子目录：解压时会在当前目录中创建一个新目录（通常以压缩文件名命名），然后将压缩文件的内容解压到这个新目录中。</strong>
          </p>
        </div>
        <label class="control-label">压缩文件选项</label>
        <div class="form-control-wrapper">
          <el-radio-group v-model="form.unzipMode">
            <el-radio value="ExtractToDir">解压到子目录</el-radio>
            <el-radio value="ExtractWithoutDir">解压到当前目录</el-radio>
            <el-radio value="">不解压</el-radio>
          </el-radio-group>
        </div>
      </div>

      <!-- 参数配置（仅git） -->
      <div v-if="repoType === 'git'" class="form-group">
        <label class="control-label">
          参数配置
          <el-tooltip content="如果文件支持配置（例如命令行执行参数），可以在这里填写" placement="top">
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
          说明
          <el-tooltip content="可以在这里填写文件的用途、目的、使用方法等描述信息，便于使用者理解这个文件" placement="top">
            <i class="fa fa-info-circle text-muted" />
          </el-tooltip>
        </label>
        <div class="form-control-wrapper">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            resize="none"
          />
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
        <i class="fa fa-check me-1" /> 确定
      </el-button>
      <el-button @click="visible = false">
        <i class="fa fa-reply me-1" /> 取消
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
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
  set: (val) => emit('update:modelValue', val)
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
  return form.value.fileList.some((f) =>
    f.name.endsWith('.zip') || f.name.endsWith('.tar.gz') || f.name.endsWith('.tar')
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
    ElMessage.warning('请选择要上传的文件')
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
    ElMessage.success('上传成功')
    visible.value = false
    emit('success')
  } catch (error) {
    ElMessage.error(error?.message || '上传失败')
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
