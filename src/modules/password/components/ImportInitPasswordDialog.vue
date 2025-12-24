<template>
  <el-dialog
    v-model="visible"
    title="导入修改密码模板"
    width="550px"
    :close-on-click-modal="false"
    :close-on-press-escape="!uploading"
    :show-close="!uploading"
    @close="handleClose"
  >
    <div class="import-password-content">
      <el-alert
        type="success"
        :closable="false"
        class="info-alert"
      >
        <template #title>
          <div class="alert-text">
            将需要修改的密码信息，按模板填写并上传。系统将根据文件中的信息，批量修改对应主机的用户密码。修改后的密码作为初始密码
          </div>
        </template>
      </el-alert>

      <el-form label-position="top" class="upload-form">
        <el-form-item label="Excel文件">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :limit="1"
            accept=".xlsx,.xls"
            :on-change="handleFileChange"
            :on-exceed="handleExceed"
            :on-remove="handleFileRemove"
            :file-list="fileList"
            drag
            class="file-uploader"
          >
            <el-icon class="el-icon--upload"><i class="fa fa-cloud-upload-alt fa-2x"></i></el-icon>
            <div class="el-upload__text">
              将文件拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                修改密码模板，仅支持 .xlsx 或 .xls 格式
              </div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose" :disabled="uploading">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="uploading"
          :disabled="!selectedFile"
          @click="handleUpload"
        >
          <i class="fa fa-paper-plane" v-if="!uploading"></i>
          确定
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { apiService } from '@/core/api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'imported'])

const visible = ref(props.modelValue)
const uploading = ref(false)
const selectedFile = ref(null)
const uploadRef = ref(null)
const fileList = ref([])

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (!val) {
    clearFile()
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

function handleFileChange(file) {
  selectedFile.value = file.raw
  fileList.value = [file]
}

function handleFileRemove() {
  clearFile()
}

function handleExceed() {
  ElMessage.warning('只能上传一个文件，请先删除已选文件')
}

function clearFile() {
  selectedFile.value = null
  fileList.value = []
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
}

async function handleUpload() {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择文件')
    return
  }

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    // 调用作业 jBZm9w
    await apiService.post(`/jao/api/jao/jobs/jBZm9w/run?cacheBuster=${Date.now()}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    ElMessage.success('导入任务已提交')
    emit('imported')
    handleClose()
  } catch (error) {
    console.error('Failed to import:', error)
    ElMessage.error(error?.message || '导入失败')
  } finally {
    uploading.value = false
  }
}

function handleClose() {
  visible.value = false
}
</script>

<style scoped lang="scss">
.import-password-content {
  padding: 10px 0;
}

.info-alert {
  margin-bottom: 20px;

  .alert-text {
    font-size: 14px;
    line-height: 1.6;
  }
}

.upload-form {
  padding-top: 10px;
}

.file-uploader {
  width: 100%;

  :deep(.el-upload) {
    width: 100%;
  }

  :deep(.el-upload-dragger) {
    width: 100%;
    padding: 30px 20px;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
