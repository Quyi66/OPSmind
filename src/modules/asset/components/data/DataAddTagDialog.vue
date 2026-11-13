<template>
  <el-dialog
    v-model="visible"
    :title="t('asset.addTag')"
    width="500px"
    :close-on-click-modal="false"
    @closed="handleClosed"
    :close-on-press-escape="false"
  >
    <el-form ref="formRef" :model="formData" :rules="formRules" :validate-on-rule-change="false" label-position="top">
      <el-form-item :label="t('asset.assetType')" prop="ciType">
        <el-select v-model="formData.ciType" :placeholder="t('asset.select')" style="width: 100%">
          <el-option
            v-for="item in resourceTypes"
            :key="item.code"
            :label="item.title"
            :value="item.code"
          />
        </el-select>
      </el-form-item>

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
import { dataManageApi } from '../../api'
import { apiService } from '@/core/api'
import { throwIfTagJobFailed } from '../../utils/tagJobResult'
import { createTagNameRules } from '../../utils/tagNameRules'

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

const formRef = ref()
useLocalizedValidation(formRef)
const formData = ref({
  ciType: '',
  name: ''
})

const formRules = computed(() => ({
  ciType: [{ required: true, message: t('asset.selectType'), trigger: 'change' }],
  name: createTagNameRules()
}))

const resourceTypes = ref([])
const saving = ref(false)

// 加载资源类型
const loadResourceTypes = async () => {
  try {
    const res = await dataManageApi.getResourceTypes()
    resourceTypes.value = res?.records || []
    if (resourceTypes.value.length > 0 && !formData.value.ciType) {
      formData.value.ciType = resourceTypes.value[0].code
    }
  } catch (error) {
    console.error('加载资源类型失败:', error)
  }
}

// 保存
const handleSave = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    // Job: chq5Pe - 添加标签（与编辑标签使用同一个job，通过id是否为null区分）
    const response = await apiService.post(
      `/workflow/api/workflow/jobs/chq5Pe/run?cacheBuster=${Date.now()}`,
      {
        params: {
          id: null,
          name: formData.value.name,
          ciType: formData.value.ciType
        }
      }
    )
    throwIfTagJobFailed(response)
    ElMessage.success(t('asset.added'))
    visible.value = false
    emit('saved')
  } catch (error) {
    console.error('添加标签失败:', error)
    ElMessage.error(t('asset.addFailedReason', { message: error.response?.data?.message || error.message }))
  } finally {
    saving.value = false
  }
}

// 弹窗关闭时重置
const handleClosed = () => {
  formRef.value?.resetFields()
  formData.value = {
    ciType: resourceTypes.value[0]?.code || '',
    name: ''
  }
}

// 监听弹窗打开
watch(visible, val => {
  if (val) {
    loadResourceTypes()
  }
})
</script>
