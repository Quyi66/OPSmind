<template>
  <el-dialog
    v-model="visible"
    title="批量申请临时密码"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="batch-import-content">
      <!-- 说明提示 -->
      <el-alert
        type="success"
        :closable="false"
        class="info-alert"
      >
        <template #title>
          <div class="alert-content">
            通过Excel模板批量导入用户申请临时密码。请先下载模板，按格式填写后上传。
          </div>
        </template>
      </el-alert>

      <!-- 操作按钮区域 -->
      <div class="action-section">
        <div class="action-item">
          <div class="action-title">步骤1：下载模板</div>
          <div class="action-desc">下载Excel模板，按照格式填写批量申请信息</div>
          <el-button type="info" @click="handleDownloadTemplate">
            <i class="fa fa-arrow-down"></i>
            下载模板
          </el-button>
        </div>

        <div class="action-item">
          <div class="action-title">步骤2：上传文件</div>
          <div class="action-desc">选择填写完成的Excel文件进行上传</div>
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :limit="1"
            accept=".xlsx,.xls"
            :on-change="handleFileChange"
            :on-exceed="handleExceed"
          >
            <el-button type="primary">
              <i class="fa fa-file-import"></i>
              选择文件
            </el-button>
          </el-upload>
        </div>

        <!-- 已选文件显示 -->
        <div v-if="selectedFile" class="selected-file">
          <i class="fa fa-file-excel"></i>
          <span>{{ selectedFile.name }}</span>
          <el-button type="danger" size="small" text @click="clearFile">
            <i class="fa fa-times"></i>
          </el-button>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button
          type="primary"
          :loading="uploading"
          :disabled="!selectedFile"
          @click="handleUpload"
        >
          <i class="fa fa-upload" v-if="!uploading"></i>
          上传并导入
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

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

watch(() => props.modelValue, (val) => {
  visible.value = val
})

watch(visible, (val) => {
  emit('update:modelValue', val)
  if (!val) {
    clearFile()
  }
})

function handleDownloadTemplate() {
  // 下载模板文件
  const templateUrl = `${window.location.origin}/oplus/base/content/template/pms/batch_apply_password_template.xlsx`
  window.open(templateUrl, '_blank')
}

function handleFileChange(file) {
  selectedFile.value = file.raw
}

function handleExceed() {
  ElMessage.warning('只能上传一个文件，请先删除已选文件')
}

function clearFile() {
  selectedFile.value = null
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
    // TODO: 实现文件上传API
    // const formData = new FormData()
    // formData.append('file', selectedFile.value)
    // await pmsApi.batchImportApplications(formData)

    // 模拟上传
    await new Promise(resolve => setTimeout(resolve, 1000))

    ElMessage.success('导入成功')
    emit('imported')
    handleClose()
  } catch (error) {
    console.error('Failed to upload:', error)
    ElMessage.error('导入失败')
  } finally {
    uploading.value = false
  }
}

function handleClose() {
  visible.value = false
}
</script>

<style scoped lang="scss">
.batch-import-content {
  padding: 10px 0;
}

.info-alert {
  margin-bottom: 24px;

  .alert-content {
    font-size: 14px;
    line-height: 1.6;
  }
}

.action-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.action-item {
  padding: 16px;
  background: var(--el-bg-color-page);
  border-radius: 8px;

  .action-title {
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 8px;
  }

  .action-desc {
    font-size: 13px;
    color: #64748b;
    margin-bottom: 12px;
  }
}

.selected-file {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #e0f2fe;
  border-radius: 6px;
  color: #0284c7;

  i.fa-file-excel {
    font-size: 18px;
  }

  span {
    flex: 1;
    font-size: 14px;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
