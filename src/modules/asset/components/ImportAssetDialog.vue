<template>
  <el-dialog
    v-model="visible"
    title="导入资产"
    width="600px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <div class="import-content">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 20px"
      >
        <template #title>
          请先下载模板，按照模板格式填写数据后上传
        </template>
      </el-alert>

      <el-form label-position="top">
        <el-form-item label="选择文件">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :limit="1"
            accept=".xlsx,.xls"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
          >
            <el-button type="primary">
              <i class="fa fa-upload" style="margin-right: 4px"></i>
              选择文件
            </el-button>
            <template #tip>
              <div class="el-upload__tip">
                只能上传 xlsx/xls 文件
              </div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="uploading" :disabled="!selectedFile" @click="handleUpload">
        上传
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { apiService } from '@/core/api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const uploadRef = ref()
const selectedFile = ref(null)
const uploading = ref(false)

// 文件选择变化
const handleFileChange = (file) => {
  selectedFile.value = file.raw
}

// 文件移除
const handleFileRemove = () => {
  selectedFile.value = null
}

// 上传
const handleUpload = async () => {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择文件')
    return
  }

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    await apiService.post('/acm/api/acm/ci/import2', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    ElMessage.success('导入成功')
    visible.value = false
    emit('saved')
  } catch (error) {
    console.error('导入失败:', error)
    ElMessage.error('导入失败: ' + (error.response?.data?.message || error.message))
  } finally {
    uploading.value = false
  }
}

// 弹窗关闭时重置
const handleClosed = () => {
  uploadRef.value?.clearFiles()
  selectedFile.value = null
}
</script>

<style scoped lang="scss">
.import-content {
  padding: 0 20px;
}
</style>
