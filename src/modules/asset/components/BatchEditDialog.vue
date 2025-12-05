<template>
  <el-dialog
    v-model="visible"
    title="批量更新资产属性"
    width="480px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-position="top"
    >
      <el-form-item label="模型属性" prop="code">
        <el-select
          v-model="formData.code"
          placeholder="请选择"
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

      <el-form-item label="属性值" prop="value">
        <el-input
          v-model="formData.value"
          type="textarea"
          :rows="4"
          placeholder="请输入属性值"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button type="primary" :loading="saving" @click="handleSave">
        保存
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { assetApi } from '../api'
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
  set: (val) => emit('update:modelValue', val)
})

const formRef = ref()
const formData = ref({
  code: '',
  value: ''
})

const formRules = {
  code: [{ required: true, message: '请选择模型属性', trigger: 'change' }],
  value: [{ required: true, message: '请输入属性值', trigger: 'blur' }]
}

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
    ElMessage.error('加载模型属性失败')
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
    ElMessage.warning('请选择要修改的资产')
    return
  }

  saving.value = true
  try {
    // 调用 job CoKLZM 进行批量更新
    await apiService.post(
      `/jao/api/jao/jobs/CoKLZM/run?cacheBuster=${Date.now()}`,
      {
        params: {
          code: formData.value.code,
          value: formData.value.value,
          ciIds: props.ciIds.join(',')
        }
      }
    )

    ElMessage.success('保存成功')
    visible.value = false
    emit('saved')
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败: ' + (error.response?.data?.message || error.message))
  } finally {
    saving.value = false
  }
}

// 弹窗关闭时重置
const handleClosed = () => {
  formRef.value?.resetFields()
  formData.value = {
    code: '',
    value: ''
  }
}

// 监听弹窗打开
watch(visible, (val) => {
  if (val) {
    loadEditableAttrs()
  }
})
</script>

<style scoped lang="scss">
:deep(.el-dialog__body) {
  padding: 20px;
}

:deep(.el-form-item__label) {
  color: #409eff;
  font-weight: 500;
}
</style>
