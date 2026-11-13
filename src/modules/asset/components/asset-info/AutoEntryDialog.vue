<template>
  <el-dialog
    v-model="visible"
    :title="t('asset.autoEntryTitle')"
    width="800px"
    :close-on-click-modal="false"
    @close="handleClose"
    :close-on-press-escape="false"
  >
    <div v-loading="loading" class="auto-entry">
      <!-- 提示信息 -->
      <el-alert type="success" :closable="false" show-icon class="tip-alert">
        <template #title>
          <span class="tip-alert-text">
            {{ t('asset.autoEntryHint') }}
          </span>
        </template>
      </el-alert>

      <!-- 表单 -->
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules" :validate-on-rule-change="false"
        label-position="top"
        class="entry-form"
      >
        <el-form-item label="IP" prop="hostKeys">
          <el-input
            v-model="formData.hostKeys"
            type="textarea"
            :rows="5"
            :placeholder="t('asset.ipListPlaceholder')"
          />
        </el-form-item>

        <el-form-item :label="t('asset.group')" prop="groupId">
          <el-select v-model="formData.groupId" :placeholder="t('asset.selectGroup')" style="width: 100%">
            <el-option
              v-for="item in groupOptions"
              :key="item.id"
              :label="item.path"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item :label="t('asset.modelAttributes')" prop="attr">
          <el-select
            v-model="formData.attr"
            :placeholder="t('asset.selectModelAttr')"
            style="width: 100%"
            clearable
          >
            <el-option
              v-for="item in attrOptions"
              :key="item.code"
              :label="item.code"
              :value="item.code"
            />
          </el-select>
        </el-form-item>

        <el-form-item :label="t('asset.attrValue')" prop="value">
          <el-input v-model="formData.value" type="textarea" :rows="3" :placeholder="t('asset.enterAttrValue')" />
        </el-form-item>

        <el-form-item :label="t('asset.executionNodeGroup')">
          <el-select
            v-model="formData.instanceGroup"
            :placeholder="t('asset.selectExecutionNodeShort')"
            style="width: 100%"
            clearable
          >
            <el-option
              v-for="item in instanceGroupOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
          <div class="form-desc">{{ t('asset.executionNodeHint') }}</div>
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <el-button @click="handleClose">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">{{ t('common.save') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { t } from '@/core/i18n'
import { useLocalizedValidation } from '@/core/i18n/validation'

import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { assetApi, automationApi } from '../../api'
import { apiService } from '@/core/api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
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

const loading = ref(false)
const saving = ref(false)
const formRef = ref(null)
useLocalizedValidation(formRef)

// 表单数据
const formData = ref({
  hostKeys: '',
  groupId: '',
  attr: '',
  value: '',
  instanceGroup: 'default'
})

// 表单校验规则
const formRules = computed(() => ({
  hostKeys: [{ required: true, message: t('asset.ipRequired'), trigger: 'blur' }]
}))

// 下拉选项
const groupOptions = ref([])
const attrOptions = ref([])
const instanceGroupOptions = ref([{ label: 'default', value: 'default' }])

// 加载分组列表
const loadGroupOptions = async () => {
  try {
    const res = await assetApi.getGroupByCit(props.assetType)
    groupOptions.value = res.records || []
  } catch (error) {
    console.error('加载分组列表失败:', error)
  }
}

// 加载模型属性列表
const loadAttrOptions = async () => {
  try {
    const res = await assetApi.getModel(props.assetType)
    // 只显示 type != 'group' 且 editable 为 true 的属性
    const attrs = (res.records || []).filter(
      item => item.type !== 'group' && item.editable && item.code
    )
    attrOptions.value = attrs
  } catch (error) {
    console.error('加载模型属性失败:', error)
  }
}

// 加载执行引擎节点列表
const loadInstanceGroupOptions = async () => {
  try {
    const instanceGroups = await automationApi.getInstanceGroupList()
    if (instanceGroups.length > 0) {
      instanceGroupOptions.value = [
        { get label() { return t('asset.noInstanceGroup') }, value: 'none' },
        ...instanceGroups.map(item => ({ label: item, value: item }))
      ]
    } else {
      instanceGroupOptions.value = [{ label: 'default', value: 'default' }]
    }
  } catch (error) {
    console.error('加载执行引擎节点失败:', error)
    instanceGroupOptions.value = [{ label: 'default', value: 'default' }]
  }
}

// 加载所有数据
const loadData = async () => {
  loading.value = true
  try {
    await Promise.all([loadGroupOptions(), loadAttrOptions(), loadInstanceGroupOptions()])
  } finally {
    loading.value = false
  }
}

// 保存
const handleSave = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    // 处理 hostKeys，将换行符转换为 \\n
    const hostKeys = formData.value.hostKeys.replace(/\n/g, '\\n')

    // 调用作业执行接口
    await apiService.post(`/workflow/api/workflow/jobs/0MKtcJ/run?cacheBuster=${Date.now()}`, {
      params: {
        hostKeys,
        ciType: props.assetType,
        instanceGroup: formData.value.instanceGroup || 'default',
        groupId: formData.value.groupId || '/',
        code: formData.value.attr || '',
        value: formData.value.value || '',
        aapInstanceGroup: ''
      }
    })

    ElMessage.success(t('asset.entrySubmitted'))
    emit('saved')
    handleClose()
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error(t('asset.saveFailedReason', { message: error.message || t('asset.unknownError') }))
  } finally {
    saving.value = false
  }
}

// 关闭弹窗
const handleClose = () => {
  visible.value = false
  formData.value = {
    hostKeys: '',
    groupId: '',
    attr: '',
    value: '',
    instanceGroup: 'default'
  }
}

// 监听弹窗打开
watch(visible, val => {
  if (val) {
    loadData()
  }
})
</script>

<style scoped lang="scss">
.auto-entry {
  .tip-alert {
    margin-bottom: 20px;
  }

  .tip-alert-text {
    font-size: 13px;
    line-height: 1.6;
    display: inline-block;
  }

  .entry-form {
    .form-desc {
      font-size: 12px;
      color: var(--el-text-color-secondary);
      margin-top: 4px;
    }
  }
}
</style>
