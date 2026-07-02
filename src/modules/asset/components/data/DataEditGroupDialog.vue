<template>
  <el-dialog
    v-model="visible"
    title="编辑分组"
    width="500px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <el-form ref="formRef" :model="formData" :rules="formRules" label-position="top">
      <el-form-item label="分组名称" prop="name">
        <el-input v-model="formData.name" placeholder="请输入分组名称" />
      </el-form-item>

      <el-form-item label="上级分组" prop="parentId">
        <el-select
          v-model="formData.parentId"
          placeholder="请选择"
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
      <el-button type="primary" :loading="saving" @click="handleSave">
        <!-- <i class="fa fa-check" style="margin-right: 4px"></i> -->
        保存
      </el-button>
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
  groupData: {
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
const formData = ref({
  name: '',
  parentId: ''
})

const formRules = {
  name: [{ required: true, message: '请输入分组名称', trigger: 'blur' }]
}

const parentGroups = ref([])
const loadingGroups = ref(false)
const saving = ref(false)

// 加载上级分组
const loadParentGroups = async () => {
  if (!props.groupData?.ci_type) return
  loadingGroups.value = true
  try {
    const res = await assetApi.getGroupByCit(props.groupData.ci_type)
    // 过滤掉自己和子分组
    parentGroups.value = (res?.records || []).filter(
      item => item.id !== props.groupData.id && !item.path.startsWith(`${props.groupData.path}/`)
    )

    // 根据当前路径计算上级分组路径并匹配
    const currentPath = props.groupData.path || ''
    const pathParts = currentPath.split('/').filter(Boolean)
    if (pathParts.length > 1) {
      // 上级路径 = 去掉最后一段
      const parentPath = `/${pathParts.slice(0, -1).join('/')}`
      const parentGroup = parentGroups.value.find(item => item.path === parentPath)
      if (parentGroup) {
        formData.value.parentId = parentGroup.id
      }
    } else {
      // 一级分组，上级是根分组 "/"
      const rootGroup = parentGroups.value.find(item => item.path === '/')
      if (rootGroup) {
        formData.value.parentId = rootGroup.id
      }
    }
  } catch (error) {
    console.error('加载分组列表失败:', error)
  } finally {
    loadingGroups.value = false
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
    // Job: BAzNVq - 编辑分组
    await apiService.post(`/workflow/api/workflow/jobs/BAzNVq/run?cacheBuster=${Date.now()}`, {
      params: {
        id: props.groupData.id,
        name: formData.value.name,
        operate: 'modify',
        parentId: formData.value.parentId,
        ciType: props.groupData.ci_type,
        ciIds: null,
        path: ''
      }
    })
    ElMessage.success('保存成功')
    visible.value = false
    emit('saved')
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error(`保存失败: ${error.response?.data?.message || error.message}`)
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
  if (val && props.groupData) {
    // 从路径中提取分组名称（最后一段）
    const pathParts = props.groupData.path?.split('/').filter(Boolean) || []
    const groupName = pathParts[pathParts.length - 1] || ''

    formData.value = {
      name: groupName,
      parentId: '' // 先置空，等加载完分组列表后再匹配
    }
    loadParentGroups()
  }
})
</script>
