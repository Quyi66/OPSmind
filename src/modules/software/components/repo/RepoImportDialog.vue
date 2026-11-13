<template>
  <el-dialog
    v-model="visible"
    :title="t('yumRepo.software.repoImport')"
    width="450px"
    :close-on-click-modal="false"
    @close="handleClose"
    :close-on-press-escape="false"
  >
    <div class="repo-import-content">
      <el-form ref="formRef" :model="formData" label-position="top">
        <el-form-item :label="t('yumRepo.software.excelFile')" prop="file">
          <div class="file-upload-row">
            <el-upload
              ref="uploadRef"
              v-model:file-list="fileList"
              :auto-upload="false"
              :limit="1"
              :show-file-list="false"
              accept=".xlsx,.xls"
              :on-change="handleFileChange"
              :on-exceed="handleExceed"
            >
              <el-button type="primary">{{ t('yumRepo.software.uploadFile') }}</el-button>
            </el-upload>
            <span v-if="fileList.length > 0" class="file-name">{{ fileList[0].name }}</span>
          </div>
          <div class="file-tip">{{ t('yumRepo.software.excelHint') }}</div>
        </el-form-item>
      </el-form>

      <div class="action-buttons">
        <el-button
          type="primary"
          :loading="submitting"
          :disabled="fileList.length === 0"
          @click="handleSubmit"
        >
          {{ t('yumRepo.software.start') }}
        </el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { t } from '@/core/i18n'

import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { repoApi } from '../../api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = ref(false)
const submitting = ref(false)
const formRef = ref(null)
const uploadRef = ref(null)
const fileList = ref([])
const formData = ref({
  file: null
})

// 监听 modelValue
watch(
  () => props.modelValue,
  val => {
    visible.value = val
  }
)

// 监听 visible
watch(visible, val => {
  emit('update:modelValue', val)
})

function handleFileChange(file) {
  formData.value.file = file.raw
  fileList.value = [file]
}

function handleExceed() {
  ElMessage.warning(t('yumRepo.software.oneUploadOnly'))
}

async function handleSubmit() {
  if (!formData.value.file) {
    ElMessage.warning(t('yumRepo.software.selectUploadFile'))
    return
  }

  try {
    await ElMessageBox.confirm(
      t('yumRepo.software.importConfirm'),
      t('yumRepo.software.executeTool'),
      {
        closeOnClickModal: false,
        closeOnPressEscape: false,
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'info'
      }
    )

    submitting.value = true

    // 创建 FormData 对象
    const uploadData = new FormData()
    uploadData.append('file', formData.value.file)

    await repoApi.importRepoFromExcel(uploadData)

    ElMessage.success(t('yumRepo.software.repoImported'))
    emit('success')
    handleClose()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to import repo:', error)
      ElMessage.error(t('yumRepo.software.repoImportFailed'))
    }
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  visible.value = false
  fileList.value = []
  formData.value.file = null
}
</script>

<style scoped lang="scss">
.repo-import-content {
  padding: 16px;

  .file-upload-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .file-name {
    color: #606266;
    font-size: 14px;
  }

  .file-tip {
    margin-top: 8px;
    font-size: 12px;
    color: #909399;
  }

  .action-buttons {
    margin-top: 24px;
  }
}
</style>
