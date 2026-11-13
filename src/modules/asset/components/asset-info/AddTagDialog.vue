<template>
  <el-dialog
    v-model="visible"
    :title="t('asset.addTag')"
    width="480px"
    :close-on-click-modal="false"
    @closed="handleClosed"
    :close-on-press-escape="false"
  >
    <el-form ref="formRef" :model="formData" :rules="formRules" :validate-on-rule-change="false" label-position="top">
      <el-form-item :label="t('common.actions')" prop="operate">
        <el-radio-group v-model="formData.operate">
          <el-radio value="new">{{ t('asset.new') }}</el-radio>
          <el-radio value="select">{{ t('asset.selectExisting') }}</el-radio>
        </el-radio-group>
      </el-form-item>

      <!-- 新建标签 -->
      <el-form-item v-if="formData.operate === 'new'" :label="t('asset.tagName')" prop="name">
        <el-input
          v-model="formData.name"
          :placeholder="t('asset.tagNameHint')"
          style="width: 100%"
        />
      </el-form-item>

      <!-- 选择已有标签 -->
      <el-form-item v-if="formData.operate === 'select'" :label="t('asset.existingTag')" prop="parentId">
        <el-select
          v-model="formData.parentId"
          :placeholder="t('asset.select')"
          style="width: 100%"
          :loading="loadingTags"
        >
          <el-option
            v-for="item in existingTags"
            :key="item.id"
            :label="item.name"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button type="primary" :loading="saving" @click="handleSave">{{ t('common.save') }}</el-button>
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
import { throwIfTagJobFailed } from '../../utils/tagJobResult'
import { createTagNameRules } from '../../utils/tagNameRules'

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
  operate: 'select',
  name: '',
  parentId: ''
})

// 动态验证规则
const formRules = computed(() => ({
  operate: [{ required: true, message: t('asset.selectOperation'), trigger: 'change' }],
  name: formData.value.operate === 'new' ? createTagNameRules() : [],
  parentId:
    formData.value.operate === 'select'
      ? [{ required: true, message: t('asset.selectExistingTag'), trigger: 'change' }]
      : []
}))

const loadingTags = ref(false)
const existingTags = ref([])
const saving = ref(false)

// 加载已有标签列表
const loadExistingTags = async () => {
  loadingTags.value = true
  try {
    const res = await assetApi.getCiTagsByCit(props.assetType || 'linux')
    existingTags.value = res?.records || []
  } catch (error) {
    console.error('加载标签列表失败:', error)
    ElMessage.error(t('asset.tagsLoadFailed'))
  } finally {
    loadingTags.value = false
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
    ElMessage.warning(t('asset.selectAssetsTag'))
    return
  }

  saving.value = true
  try {
    // 调用 job chq5Pe 添加标签
    const response = await apiService.post(
      `/workflow/api/workflow/jobs/chq5Pe/run?cacheBuster=${Date.now()}`,
      {
        params: {
          parentId: formData.value.parentId || '',
          name: formData.value.name || '',
          ciIds: props.ciIds.join(','),
          ciType: props.assetType || ''
        }
      }
    )
    throwIfTagJobFailed(response)

    ElMessage.success(t('asset.tagAdded'))
    visible.value = false
    emit('saved')
  } catch (error) {
    console.error('添加标签失败:', error)
    ElMessage.error(t('asset.addTagFailedReason', { message: error.response?.data?.message || error.message }))
  } finally {
    saving.value = false
  }
}

// 弹窗关闭时重置
const handleClosed = () => {
  formRef.value?.resetFields()
  formData.value = {
    operate: 'select',
    name: '',
    parentId: ''
  }
}

// 监听弹窗打开
watch(visible, val => {
  if (val) {
    loadExistingTags()
  }
})

// 切换操作类型时清空相关字段
watch(
  () => formData.value.operate,
  () => {
    formData.value.name = ''
    formData.value.parentId = ''
  }
)
</script>

<style scoped lang="scss">
:deep(.el-dialog__body) {
  padding: 20px;
}

:deep(.el-form-item__label) {
  color: var(--el-color-primary);
  font-weight: 500;
}
</style>
