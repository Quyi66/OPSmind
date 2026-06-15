<template>
  <el-dialog
    v-model="visibleModel"
    :title="form.id ? '编辑 WSUS 配置' : '新建 WSUS 配置'"
    width="560px"
    destroy-on-close
    :close-on-click-modal="false"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
      <el-form-item label="WSUS 地址" prop="wsusUrl">
        <el-input v-model="form.wsusUrl" placeholder="请输入 WSUS 地址" clearable />
      </el-form-item>
      <el-form-item label="端口" prop="wsusPort">
        <el-input-number
          v-model="form.wsusPort"
          :min="1"
          :max="65535"
          controls-position="right"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="启用 HTTPS">
        <el-switch v-model="form.useSsl" />
      </el-form-item>
      <el-form-item label="描述">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          maxlength="512"
          show-word-limit
          placeholder="请输入描述"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visibleModel = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { winPatchApi } from '../../api'
import { pickValue, unwrapResponse } from '../../utils'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  configData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const visibleModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const formRef = ref(null)
const submitting = ref(false)
const form = reactive({
  id: '',
  wsusUrl: '',
  wsusPort: 8530,
  useSsl: false,
  description: ''
})

const rules = {
  wsusUrl: [{ required: true, message: '请输入 WSUS 地址', trigger: 'blur' }],
  wsusPort: [{ required: true, message: '请输入端口', trigger: 'change' }]
}

function resetForm(data = null) {
  form.id = pickValue(data, ['id'], '')
  form.wsusUrl = pickValue(data, ['wsusUrl', 'wsus_url'], '')
  form.wsusPort = Number(pickValue(data, ['wsusPort', 'wsus_port'], 8530)) || 8530
  form.useSsl = Boolean(pickValue(data, ['useSsl', 'use_ssl'], false))
  form.description = pickValue(data, ['description'], '')
}

async function handleSubmit() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  submitting.value = true
  try {
    const payload = {
      wsusUrl: form.wsusUrl,
      wsusPort: form.wsusPort,
      useSsl: form.useSsl,
      description: form.description
    }

    if (form.id) {
      payload.id = form.id
    }

    const response = await winPatchApi.saveWsusConfig(payload)
    ElMessage.success(form.id ? 'WSUS 配置已更新' : 'WSUS 配置已创建')
    visibleModel.value = false
    emit('saved', unwrapResponse(response))
  } catch (error) {
    console.error('保存 WSUS 配置失败:', error)
    ElMessage.error('保存 WSUS 配置失败')
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.modelValue,
  open => {
    if (open) {
      resetForm(props.configData)
    }
  }
)

watch(
  () => props.configData,
  value => {
    if (props.modelValue) {
      resetForm(value)
    }
  }
)
</script>
