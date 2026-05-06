<template>
  <el-dialog
    v-model="visible"
    title="复制应用"
    width="500px"
    destroy-on-close
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
    >
      <el-form-item label="新名称" prop="title">
        <el-input v-model="form.title" placeholder="请输入新的应用名称" />
      </el-form-item>
      <el-form-item label="新Code" prop="name">
        <el-input v-model="form.name" placeholder="请输入新的应用Code" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="warning" :loading="saving" @click="handleCopy">
        复制
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as appletApi from '@/modules/settings/api/applet'

const props = defineProps({
  modelValue: Boolean,
  applet: Object
})

const emit = defineEmits(['update:modelValue', 'saved'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const saving = ref(false)
const formRef = ref(null)

const form = ref({
  title: '',
  name: ''
})

const rules = {
  title: [
    { required: true, message: '请输入应用名称', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入应用Code', trigger: 'blur' },
    { pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: 'Code必须以字母开头，只能包含字母、数字和下划线', trigger: 'blur' }
  ]
}

watch(() => props.modelValue, (val) => {
  if (val && props.applet) {
    form.value = {
      title: props.applet.title + '_copy',
      name: props.applet.name + '_copy'
    }
  }
})

async function handleCopy() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    await appletApi.copyApplet({
      id: props.applet.id,
      title: form.value.title,
      name: form.value.name,
      author: props.applet.author || '',
      createdBy: props.applet.createdBy || '',
      createdName: props.applet.createdName || '',
      modifiedBy: props.applet.modifiedBy || '',
      modifiedName: props.applet.modifiedName || ''
    })

    ElMessage.success('复制成功')
    emit('saved')
    handleClose()
  } catch (error) {
    console.error('Failed to copy applet:', error)
    ElMessage.error('复制失败')
  } finally {
    saving.value = false
  }
}

function handleClose() {
  visible.value = false
}
</script>
