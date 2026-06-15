<template>
  <el-dialog
    v-model="visible"
    title="添加标签"
    width="480px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <el-form ref="formRef" :model="formData" :rules="formRules" label-position="top">
      <el-form-item label="操作" prop="operate">
        <el-radio-group v-model="formData.operate">
          <el-radio value="new">新建</el-radio>
          <el-radio value="select">选择已有</el-radio>
        </el-radio-group>
      </el-form-item>

      <!-- 新建标签 -->
      <el-form-item v-if="formData.operate === 'new'" label="标签名称" prop="name">
        <el-input v-model="formData.name" placeholder="请输入标签名称" style="width: 100%" />
      </el-form-item>

      <!-- 选择已有标签 -->
      <el-form-item v-if="formData.operate === 'select'" label="已有标签" prop="parentId">
        <el-select
          v-model="formData.parentId"
          placeholder="请选择"
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
      <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
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
const formData = ref({
  operate: 'select',
  name: '',
  parentId: ''
})

// 动态验证规则
const formRules = computed(() => ({
  operate: [{ required: true, message: '请选择操作', trigger: 'change' }],
  name:
    formData.value.operate === 'new'
      ? [{ required: true, message: '请输入标签名称', trigger: 'blur' }]
      : [],
  parentId:
    formData.value.operate === 'select'
      ? [{ required: true, message: '请选择已有标签', trigger: 'change' }]
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
    ElMessage.error('加载标签列表失败')
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
    ElMessage.warning('请选择要添加标签的资产')
    return
  }

  saving.value = true
  try {
    // 调用 job chq5Pe 添加标签
    await apiService.post(`/jao/api/jao/jobs/chq5Pe/run?cacheBuster=${Date.now()}`, {
      params: {
        parentId: formData.value.parentId || '',
        name: formData.value.name || '',
        ciIds: props.ciIds.join(','),
        ciType: props.assetType || ''
      }
    })

    ElMessage.success('添加标签成功')
    visible.value = false
    emit('saved')
  } catch (error) {
    console.error('添加标签失败:', error)
    ElMessage.error(`添加标签失败: ${error.response?.data?.message || error.message}`)
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
