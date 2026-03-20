<template>
  <el-dialog
    v-model="visible"
    title="导入模型"
    width="600px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <div class="import-content">
      <el-upload
        ref="uploadRef"
        class="upload-area"
        drag
        :auto-upload="false"
        :limit="1"
        accept=".xlsx,.xls"
        :on-change="handleFileChange"
        :on-exceed="handleExceed"
      >
        <i class="fa fa-cloud-upload-alt upload-icon"></i>
        <div class="el-upload__text">
          将文件拖到此处，或
          <em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">只能上传 xlsx/xls 文件</div>
        </template>
      </el-upload>

      <div class="upload-tips">
        <p>
          <i class="fa fa-info-circle"></i>
          导入说明：
        </p>
        <ul>
          <li>请使用标准的模型导入模板</li>
          <li>模型代码必须唯一且以字母开头</li>
          <li>导入会覆盖同名的模型配置</li>
        </ul>
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button
        type="primary"
        :loading="uploading"
        :disabled="!selectedFile"
        @click="handleUpload"
      >
        导入
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
  set: val => emit('update:modelValue', val)
})

const uploadRef = ref()
const selectedFile = ref(null)
const uploading = ref(false)

// 文件选择
const handleFileChange = file => {
  selectedFile.value = file.raw
}

// 超出限制
const handleExceed = () => {
  ElMessage.warning('只能上传一个文件')
}

// 上传
const handleUpload = async () => {
  if (!selectedFile.value) {
    ElMessage.warning('请选择要上传的文件')
    return
  }

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    const res = await apiService.post(
      `/jao/api/jao/jobs/rzkan4/upload-to-run?cacheBuster=${Date.now()}`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' }
      }
    )

    // 返回结果为数组，取第一条判断状态
    const result = Array.isArray(res?.data) ? res.data[0] : res?.data
    if (result?.status === 'COMPLETED') {
      ElMessage.success('导入成功')
      visible.value = false
      emit('saved')
    } else {
      const errMsg = result?.error || result?.data || '导入失败，请检查文件格式'
      ElMessage.error(errMsg)
    }
  } catch (error) {
    console.error('导入失败:', error)
    ElMessage.error('导入失败: ' + (error.response?.data?.message || error.message))
  } finally {
    uploading.value = false
  }
}

// 弹窗关闭时重置
const handleClosed = () => {
  selectedFile.value = null
  uploadRef.value?.clearFiles()
}
</script>

<style scoped lang="scss">
.import-content {
  .upload-area {
    width: 100%;

    :deep(.el-upload-dragger) {
      width: 100%;
      padding: 40px 20px;
    }

    .upload-icon {
      font-size: 48px;
      color: var(--el-text-color-placeholder);
      margin-bottom: 16px;
    }
  }

  .upload-tips {
    margin-top: 20px;
    padding: 12px 16px;
    background: var(--el-bg-color-page);
    border-radius: 4px;
    font-size: 13px;
    color: var(--el-text-color-regular);

    p {
      margin: 0 0 8px;

      i {
        color: var(--el-color-primary);
        margin-right: 4px;
      }
    }

    ul {
      margin: 0;
      padding-left: 20px;

      li {
        line-height: 1.8;
      }
    }
  }
}
</style>
