<template>
  <el-dialog
    v-model="visible"
    title="添加标签"
    width="500px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-position="top"
    >
      <el-form-item label="资产类型" prop="ciType">
        <el-select
          v-model="formData.ciType"
          placeholder="请选择"
          style="width: 100%"
        >
          <el-option
            v-for="item in resourceTypes"
            :key="item.code"
            :label="item.title"
            :value="item.code"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="标签名称" prop="name">
        <el-input
          v-model="formData.name"
          placeholder="请输入标签名称"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">
        保存
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { dataManageApi } from '../api'
import { apiService } from '@/core/api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const formRef = ref()
const formData = ref({
  ciType: '',
  name: ''
})

const formRules = {
  ciType: [{ required: true, message: '请选择资产类型', trigger: 'change' }],
  name: [{ required: true, message: '请输入标签名称', trigger: 'blur' }]
}

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
    await apiService.post(
      `/jao/api/jao/jobs/chq5Pe/run?cacheBuster=${Date.now()}`,
      {
        params: {
          id: null,
          name: formData.value.name,
          ciType: formData.value.ciType
        }
      }
    )
    ElMessage.success('添加成功')
    visible.value = false
    emit('saved')
  } catch (error) {
    console.error('添加标签失败:', error)
    ElMessage.error('添加失败: ' + (error.response?.data?.message || error.message))
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
watch(visible, (val) => {
  if (val) {
    loadResourceTypes()
  }
})
</script>

<style scoped lang="scss">
:deep(.el-form-item__label) {
  color: #409eff;
  font-weight: 500;
}
</style>
