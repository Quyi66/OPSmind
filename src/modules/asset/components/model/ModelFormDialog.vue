<template>
  <el-dialog
    v-model="visible"
    :title="modelData ? '编辑模型' : '添加模型'"
    width="600px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <el-form ref="formRef" :model="formData" :rules="formRules" label-position="top">
      <el-form-item label="模型名称" prop="title">
        <el-input v-model="formData.title" placeholder="请输入模型名称" />
      </el-form-item>

      <el-form-item label="资产代码" prop="code">
        <el-input
          v-model="formData.code"
          placeholder="请输入资产代码（英文）"
          :disabled="!!modelData"
        />
        <div class="form-tip">资产代码创建后不可修改</div>
      </el-form-item>

      <el-form-item label="是否自动化" prop="isAuto">
        <el-switch v-model="formData.isAuto" :active-value="1" :inactive-value="0" />
        <span class="switch-label">{{ formData.isAuto === 1 ? '是' : '否' }}</span>
      </el-form-item>

      <el-form-item label="描述" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          placeholder="请输入描述"
        />
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
  modelData: {
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
  title: '',
  code: '',
  isAuto: 1,
  description: ''
})

const formRules = {
  title: [{ required: true, message: '请输入模型名称', trigger: 'blur' }],
  code: [
    { required: true, message: '请输入资产代码', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/,
      message: '资产代码必须以字母开头，只能包含字母、数字和下划线',
      trigger: 'blur'
    }
  ]
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
    if (props.modelData) {
      // 编辑模型
      await apiService.put(`/acm/api/acm/cit/${props.modelData.id}?cacheBuster=${Date.now()}`, {
        title: formData.value.title,
        isAuto: formData.value.isAuto,
        description: formData.value.description
      })
    } else {
      // 添加模型
      await apiService.post(`/acm/api/acm/cit?cacheBuster=${Date.now()}`, {
        title: formData.value.title,
        code: formData.value.code,
        isAuto: formData.value.isAuto,
        description: formData.value.description
      })
    }
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
  formData.value = {
    title: '',
    code: '',
    isAuto: 1,
    description: ''
  }
}

// 监听弹窗打开
watch(visible, val => {
  if (val && props.modelData) {
    formData.value = {
      title: props.modelData.title || '',
      code: props.modelData.code || '',
      isAuto: props.modelData.is_auto || 0,
      description: props.modelData.description || ''
    }
  }
})
</script>

<style scoped lang="scss">
:deep(.el-form-item__label) {
  color: var(--el-color-primary);
  font-weight: 500;
}

.form-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.switch-label {
  margin-left: 8px;
  color: var(--el-text-color-regular);
}
</style>
