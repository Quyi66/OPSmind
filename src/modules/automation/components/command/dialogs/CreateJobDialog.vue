<template>
  <el-dialog
    v-model="dialogVisible"
    title="新建命令作业"
    width="600px"
    :close-on-click-modal="false"
    destroy-on-close
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
    >
      <el-form-item label="作业标题" prop="title">
        <el-input
          v-model="formData.title"
          placeholder="请输入作业标题"
          maxlength="50"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="作业描述">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          placeholder="请输入作业描述（可选）"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">
        创建
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { saveJob } from '@/modules/automation/api/command'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'success'])

// 对话框可见性
const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// 表单引用
const formRef = ref(null)

// 表单数据
const formData = ref({
  title: '',
  description: ''
})

// 表单验证规则
const formRules = {
  title: [
    { required: true, message: '请输入作业标题', trigger: 'blur' }
  ]
}

// 保存状态
const saving = ref(false)

// 监听对话框打开
watch(() => props.visible, (val) => {
  if (val) {
    resetForm()
  }
})

// 重置表单
function resetForm() {
  formData.value = {
    title: '',
    description: ''
  }
  formRef.value?.clearValidate()
}

// 保存
async function handleSave() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    const job = {
      title: formData.value.title,
      description: formData.value.description,
      type: 'command',
      configJson: JSON.stringify({
        tasks: [{
          commands: [],
          hosts: []
        }]
      })
    }

    await saveJob(job)
    ElMessage.success('作业创建成功')
    emit('success')
    handleClose()
  } catch (error) {
    console.error('创建作业失败:', error)
    ElMessage.error('创建作业失败')
  } finally {
    saving.value = false
  }
}

// 关闭对话框
function handleClose() {
  dialogVisible.value = false
  resetForm()
}
</script>
