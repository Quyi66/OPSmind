<template>
  <el-dialog
    v-model="visible"
    :title="t('asset.addGroup')"
    width="480px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="!saving"
    @closed="handleClosed"
  >
    <p>{{ t('asset.groupTargetCount', { count: ciIds.length }) }}</p>
    <el-form ref="formRef" :model="formData" :rules="formRules" :validate-on-rule-change="false" label-position="top">
      <el-form-item :label="t('common.actions')" prop="operate">
        <el-radio-group v-model="formData.operate">
          <el-radio value="new">{{ t('asset.new') }}</el-radio>
          <el-radio value="select">{{ t('asset.selectExisting') }}</el-radio>
        </el-radio-group>
      </el-form-item>

      <!-- 新建分组 -->
      <template v-if="formData.operate === 'new'">
        <el-form-item :label="t('asset.groupName')" prop="name">
          <el-input v-model="formData.name" :placeholder="t('asset.groupNameRequired')" style="width: 100%" />
        </el-form-item>

        <el-form-item :label="t('asset.parentGroup')" prop="parentId">
          <el-select
            v-model="formData.parentId"
            :placeholder="t('asset.select')"
            style="width: 100%"
            :loading="loadingGroups"
          >
            <el-option
              v-for="item in existingGroups"
              :key="item.id"
              :label="item.path"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
      </template>

      <!-- 选择已有分组 -->
      <el-form-item v-if="formData.operate === 'select'" :label="t('asset.existingGroup')" prop="id">
        <el-select
          v-model="formData.id"
          :placeholder="t('asset.select')"
          style="width: 100%"
          :loading="loadingGroups"
        >
          <el-option
            v-for="item in existingGroups"
            :key="item.id"
            :label="item.path"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button :disabled="saving" @click="visible = false">{{ t('common.cancel') }}</el-button>
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
import { throwIfWorkflowFailed } from '@/utils/workflowResult'

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
  parentId: '',
  id: ''
})

// 动态验证规则
const formRules = computed(() => ({
  operate: [{ required: true, message: t('asset.selectOperation'), trigger: 'change' }],
  name:
    formData.value.operate === 'new'
      ? [{ required: true, message: t('asset.groupNameRequired'), trigger: 'blur' }]
      : [],
  id:
    formData.value.operate === 'select'
      ? [{ required: true, message: t('asset.selectExistingGroup'), trigger: 'change' }]
      : []
}))

const loadingGroups = ref(false)
const existingGroups = ref([])
const saving = ref(false)

// 加载已有分组列表
const loadExistingGroups = async () => {
  loadingGroups.value = true
  try {
    const res = await assetApi.getGroupByCit(props.assetType || 'linux')
    existingGroups.value = res?.records || []
  } catch (error) {
    console.error('加载分组列表失败:', error)
    ElMessage.error(t('asset.groupsLoadFailed'))
  } finally {
    loadingGroups.value = false
  }
}

// 保存
const handleSave = async () => {
  if (saving.value) return
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  if (saving.value) return
  if (props.ciIds.length === 0) {
    ElMessage.warning(t('asset.selectAssetsGroup'))
    return
  }

  saving.value = true
  try {
    // 调用 job a17VXM 添加分组
    // 注意：无论是选择已有还是新建，operate 都是 "new"
    // 选择已有时传 id（分组ID），不传 name
    // 新建时传 name 和 parentId
    const params = {
      operate: 'new',
      ciIds: props.ciIds.join(','),
      ciType: props.assetType || ''
    }

    if (formData.value.operate === 'select') {
      // 选择已有分组：传 id
      params.id = formData.value.id
      params.name = ''
    } else {
      // 新建分组：传 name 和 parentId
      params.name = formData.value.name
      params.parentId = formData.value.parentId || ''
    }

    const response = await apiService.post(
      `/workflow/api/workflow/jobs/a17VXM/run?cacheBuster=${Date.now()}`,
      { params }
    )
    throwIfWorkflowFailed(response)

    ElMessage.success(t('asset.groupAdded'))
    visible.value = false
    emit('saved')
  } catch (error) {
    console.error('添加分组失败:', error)
    ElMessage.error(t('asset.addGroupFailedReason', { message: error.response?.data?.message || error.message }))
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
    parentId: '',
    id: ''
  }
}

// 监听弹窗打开
watch(visible, val => {
  if (val) {
    loadExistingGroups()
  }
})

// 切换操作类型时清空相关字段
watch(
  () => formData.value.operate,
  () => {
    formData.value.name = ''
    formData.value.parentId = ''
    formData.value.id = ''
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
