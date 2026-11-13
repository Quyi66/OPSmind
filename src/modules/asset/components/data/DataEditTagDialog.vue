<template>
  <el-dialog
    v-model="visible"
    :title="t('asset.editTag')"
    width="500px"
    :close-on-click-modal="false"
    @closed="handleClosed"
    :close-on-press-escape="false"
  >
    <el-form ref="formRef" :model="formData" :rules="formRules" :validate-on-rule-change="false" label-position="top">
      <el-form-item :label="t('asset.tagName')" prop="name">
        <el-input v-model="formData.name" :placeholder="t('asset.tagNameHint')" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">{{ t('common.save') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { t } from '@/core/i18n'
import { useLocalizedValidation } from '@/core/i18n/validation'

import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { apiService } from '@/core/api'
import { throwIfTagJobFailed } from '../../utils/tagJobResult'
import { createTagNameRules } from '../../utils/tagNameRules'

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
useLocalizedValidation(formRef)
const formData = ref({
  name: ''
})

const formRules = computed(() => ({
  name: createTagNameRules()
}))

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
    const response = await apiService.post(
      `/workflow/api/workflow/jobs/chq5Pe/run?cacheBuster=${Date.now()}`,
      {
        params: {
          parentId: '',
          id: props.tagData.id,
          name: formData.value.name,
          ciIds: null,
          ciType: props.tagData.ci_type
        }
      }
    )
    throwIfTagJobFailed(response)
    ElMessage.success(t('asset.saved'))
    visible.value = false
    emit('saved')
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error(t('asset.saveFailedReason', { message: error.response?.data?.message || error.message }))
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
