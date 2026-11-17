<template>
  <el-dialog
    v-model="visible"
    :title="t('asset.batchUpdateAttrs')"
    width="680px"
    :close-on-click-modal="false"
    @close="handleClose"
    :close-on-press-escape="false"
  >
    <div class="dialog-body">
      <el-alert
        :title="t('asset.batchEditNotice')"
        :description="t('asset.batchEditWarning')"
        type="warning"
        show-icon
        :closable="false"
        style="margin-bottom: 20px"
      />

      <el-form ref="formRef" :model="formData" :rules="formRules" :validate-on-rule-change="false" label-position="top">
        <el-form-item :label="t('asset.attrField')" prop="code">
          <el-select
            v-model="formData.code"
            :placeholder="t('asset.selectAttrToEdit')"
            style="width: 100%"
            :loading="loadingAttrs"
          >
            <el-option
              v-for="item in editableAttrs"
              :key="item.code"
              :label="item.title"
              :value="item.code"
            />
          </el-select>
        </el-form-item>

        <el-form-item :label="t('asset.updatedAttrValue')" prop="value">
          <el-input
            v-model="formData.value"
            type="textarea"
            :rows="6"
            :placeholder="t('asset.batchAttrPlaceholder')"
          />
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <div style="display: flex; gap: 12px; justify-content: flex-end">
        <el-button @click="visible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">{{ t('asset.saveChanges') }}</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { t } from '@/core/i18n'
import { useLocalizedValidation } from '@/core/i18n/validation'

import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { assetApi } from '../../api'
import { apiService } from '@/core/api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  ciIds: {
    type: Array,
    default: () => []
  },
  assetType: {
    type: String,
    default: 'linux'
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
  code: '',
  value: ''
})

const formRules = computed(() => ({
  code: [{ required: true, message: t('asset.selectModelAttr'), trigger: 'change' }],
  value: [{ required: true, message: t('asset.enterAttrValue'), trigger: 'blur' }]
}))

const loadingAttrs = ref(false)
const editableAttrs = ref([])
const saving = ref(false)

// 加载可编辑的模型属性
const loadEditableAttrs = async () => {
  loadingAttrs.value = true
  try {
    const res = await assetApi.getModel(props.assetType || 'linux')

    const records = res?.records || []
    // 过滤出非 group 类型且可编辑的属性
    editableAttrs.value = records.filter(
      item => item.type !== 'group' && item.editable && item.code
    )
  } catch (error) {
    console.error('加载模型属性失败:', error)
    ElMessage.error(t('asset.attrsLoadFailed'))
  } finally {
    loadingAttrs.value = false
  }
}

// 保存
const handleSave = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  if (props.ciIds.length === 0) {
    ElMessage.warning(t('asset.selectAssetsEdit'))
    return
  }

  saving.value = true
  try {
    // 调用 job CoKLZM 进行批量更新
    await apiService.post(`/workflow/api/workflow/jobs/CoKLZM/run?cacheBuster=${Date.now()}`, {
      params: {
        code: formData.value.code,
        value: formData.value.value,
        ciIds: props.ciIds.join(',')
      }
    })

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
const handleClose = () => {
  formRef.value?.resetFields()
  formData.value = {
    code: '',
    value: ''
  }
}

// 监听弹窗打开
watch(visible, val => {
  if (val) {
    loadEditableAttrs()
  }
})
</script>
