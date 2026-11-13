<template>
  <el-dialog
    v-model="visible"
    :title="t('asset.addGroup')"
    width="500px"
    :close-on-click-modal="false"
    @closed="handleClosed"
    :close-on-press-escape="false"
  >
    <el-form ref="formRef" :model="formData" :rules="formRules" :validate-on-rule-change="false" label-position="top">
      <el-form-item :label="t('asset.assetType')" prop="ciType">
        <el-select
          v-model="formData.ciType"
          :placeholder="t('asset.select')"
          style="width: 100%"
          @change="handleCiTypeChange"
        >
          <el-option
            v-for="item in resourceTypes"
            :key="item.code"
            :label="item.title"
            :value="item.code"
          />
        </el-select>
      </el-form-item>

      <el-form-item :label="t('asset.groupName')" prop="name">
        <el-input v-model="formData.name" :placeholder="t('asset.groupNameRequired')" />
      </el-form-item>

      <el-form-item :label="t('asset.parentGroup')" prop="parentId">
        <el-select
          v-model="formData.parentId"
          :placeholder="t('asset.select')"
          style="width: 100%"
          :loading="loadingGroups"
        >
          <el-option
            v-for="item in parentGroups"
            :key="item.id"
            :label="item.path"
            :value="item.id"
          />
        </el-select>
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
import { dataManageApi, assetApi } from '../../api'
import { apiService } from '@/core/api'
import { throwIfWorkflowFailed } from '@/utils/workflowResult'

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
  name: '',
  parentId: ''
})

const formRules = computed(() => ({
  ciType: [{ required: true, message: t('asset.selectType'), trigger: 'change' }],
  name: [{ required: true, message: t('asset.groupNameRequired'), trigger: 'blur' }],
  parentId: [{ required: true, message: t('asset.selectParentGroup'), trigger: 'change' }]
}))

const resourceTypes = ref([])
const parentGroups = ref([])
const loadingGroups = ref(false)
const saving = ref(false)

// 加载资源类型
const loadResourceTypes = async () => {
  try {
    const res = await dataManageApi.getResourceTypes()
    resourceTypes.value = res?.records || []
    if (resourceTypes.value.length > 0 && !formData.value.ciType) {
      formData.value.ciType = resourceTypes.value[0].code
      loadParentGroups()
    }
  } catch (error) {
    console.error('加载资源类型失败:', error)
  }
}

// 加载上级分组
const loadParentGroups = async () => {
  if (!formData.value.ciType) return
  loadingGroups.value = true
  try {
    const res = await assetApi.getGroupByCit(formData.value.ciType)
    parentGroups.value = res?.records || []
  } catch (error) {
    console.error('加载分组列表失败:', error)
  } finally {
    loadingGroups.value = false
  }
}

// 资产类型变化
const handleCiTypeChange = () => {
  formData.value.parentId = ''
  loadParentGroups()
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
    // Job: a17VXM - 添加分组
    const response = await apiService.post(
      `/workflow/api/workflow/jobs/a17VXM/run?cacheBuster=${Date.now()}`,
      {
        params: {
          operate: 'new',
          ciIds: null,
          id: null,
          name: formData.value.name,
          parentId: formData.value.parentId,
          ciType: formData.value.ciType
        }
      }
    )
    throwIfWorkflowFailed(response)
    ElMessage.success(t('asset.added'))
    visible.value = false
    emit('saved')
  } catch (error) {
    console.error('添加分组失败:', error)
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
    name: '',
    parentId: ''
  }
}

// 监听弹窗打开
watch(visible, val => {
  if (val) {
    loadResourceTypes()
  }
})
</script>
