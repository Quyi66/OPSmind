<template>
  <el-dialog
    v-model="visible"
    title="仓库导入"
    width="450px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="repo-import-content">
      <el-form ref="formRef" :model="formData" label-position="top">
        <el-form-item label="Excel文件" prop="file">
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
              <el-button type="primary">选择文件上传</el-button>
            </el-upload>
            <span v-if="fileList.length > 0" class="file-name">{{ fileList[0].name }}</span>
          </div>
          <div class="file-tip">支持 .xlsx, .xls 格式的 Excel 文件</div>
        </el-form-item>
      </el-form>

      <div class="action-buttons">
        <el-button
          type="primary"
          :loading="submitting"
          :disabled="fileList.length === 0"
          @click="handleSubmit"
        >
          开始执行
        </el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
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
  ElMessage.warning('只能上传一个文件，请先删除已上传的文件')
}

async function handleSubmit() {
  if (!formData.value.file) {
    ElMessage.warning('请先选择要上传的文件')
    return
  }

  try {
    await ElMessageBox.confirm(
      '导入仓库配置源信息可能需要几分钟不等，请点击确定开始导入',
      '执行作业',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    submitting.value = true

    // 创建 FormData 对象
    const uploadData = new FormData()
    uploadData.append('file', formData.value.file)

    await repoApi.importRepoFromExcel(uploadData)

    ElMessage.success('仓库导入成功')
    emit('success')
    handleClose()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to import repo:', error)
      ElMessage.error('仓库导入失败')
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
