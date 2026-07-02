<template>
  <el-dialog
    v-model="visible"
    title="编辑标签"
    width="500px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <el-form ref="formRef" :model="formData" :rules="formRules" label-position="top">
      <el-form-item label="标签名称" prop="name">
        <el-input v-model="formData.name" placeholder="请输入标签名称" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { apiService } from '@/core/api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  tagData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const formRef = ref()
const formData = ref({
  name: ''
})

const formRules = {
  name: [{ required: true, message: '请输入标签名称', trigger: 'blur' }]
}

const saving = ref(false)

// 保存
const handleSave = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    // Job: chq5Pe - 编辑标签
    await apiService.post(`/workflow/api/workflow/jobs/chq5Pe/run?cacheBuster=${Date.now()}`, {
      params: {
        parentId: '',
        id: props.tagData.id,
        name: formData.value.name,
        ciIds: null,
        ciType: props.tagData.ci_type
      }
    })
    ElMessage.success('保存成功')
    visible.value = false
    emit('saved')
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error(`保存失败: ${error.response?.data?.message || error.message}`)
  } finally {
    saving.value = false
  }
}

// 弹窗关闭时重置
const handleClosed = () => {
  formRef.value?.resetFields()
}

// 监听弹窗打开
watch(visible, val => {
  if (val && props.tagData) {
    formData.value = {
      name: props.tagData.name
    }
  }
})
</script>
