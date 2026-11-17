<template>
  <el-dialog
    v-model="visibleModel"
    :title="form.id ? t('patches.windows.editWsus') : t('patches.windows.createWsus')"
    width="560px"
    destroy-on-close
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <el-form ref="formRef" :model="form" :rules="rules" :validate-on-rule-change="false" :label-width="currentLocale === 'en-US' ? '150px' : '110px'" @submit.prevent>
      <el-form-item :label="t('patches.windows.wsusAddress')" prop="wsusUrl">
        <el-input v-model="form.wsusUrl" :placeholder="t('patches.windows.enterWsusAddress')" clearable />
      </el-form-item>
      <el-form-item :label="t('patches.windows.port')" prop="wsusPort">
        <el-input-number
          v-model="form.wsusPort"
          :min="1"
          :max="65535"
          controls-position="right"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item :label="t('patches.windows.enableHttps')">
        <el-switch v-model="form.useSsl" />
      </el-form-item>
      <el-form-item :label="t('automation.job.description')">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          maxlength="512"
          show-word-limit
          :placeholder="t('patches.windows.enterDescription')"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visibleModel = false">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">{{ t('common.save') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { t, currentLocale } from '@/core/i18n'
import { useLocalizedValidation } from '@/core/i18n/validation'

import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { winPatchApi } from '../../api'
import { normalizeBoolean, pickValue, unwrapResponse } from '../../utils'

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

useLocalizedValidation(formRef)

const rules = computed(() => ({
  wsusUrl: [{ required: true, message: t('patches.windows.enterWsusAddress'), trigger: 'blur' }],
  wsusPort: [{ required: true, message: t('patches.windows.enterPort'), trigger: 'change' }]
}))

function resetForm(data = null) {
  form.id = pickValue(data, ['id'], '')
  form.wsusUrl = pickValue(data, ['wsusUrl', 'wsus_url'], '')
  form.wsusPort = Number(pickValue(data, ['wsusPort', 'wsus_port'], 8530)) || 8530
  form.useSsl = normalizeBoolean(pickValue(data, ['useSsl', 'use_ssl'], false))
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
    ElMessage.success(form.id ? t('patches.windows.wsusUpdated') : t('patches.windows.wsusCreated'))
    visibleModel.value = false
    emit('saved', unwrapResponse(response))
  } catch (error) {
    console.error('保存 WSUS 配置失败:', error)
    ElMessage.error(t('patches.windows.wsusSaveFailed'))
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
