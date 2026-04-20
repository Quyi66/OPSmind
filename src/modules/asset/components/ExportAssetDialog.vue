<template>
  <el-dialog
    v-model="visible"
    title="导出资产"
    width="600px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <el-form
      ref="formRef"
      :model="formData"
      label-position="top"
    >
      <el-form-item label="资产类型">
        <el-select
          v-model="formData.ciType"
          placeholder="请选择"
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

      <el-form-item label="分组">
        <el-select
          v-model="formData.groupId"
          placeholder="全部"
          clearable
          style="width: 100%"
          :loading="loadingGroups"
        >
          <el-option label="全部" value="" />
          <el-option
            v-for="item in groups"
            :key="item.id"
            :label="item.path"
            :value="item.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="导出格式">
        <el-radio-group v-model="formData.format">
          <el-radio value="xlsx">Excel (.xlsx)</el-radio>
          <el-radio value="csv">CSV (.csv)</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="exporting" @click="handleExport">
        导出
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { dataManageApi, assetApi } from '../api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  defaultCiType: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const formRef = ref()
const formData = ref({
  ciType: '',
  groupId: '',
  format: 'xlsx'
})

const resourceTypes = ref([])
const groups = ref([])
const loadingGroups = ref(false)
const exporting = ref(false)

function resolveDefaultCiType() {
  if (!resourceTypes.value.length) return ''
  if (props.defaultCiType && resourceTypes.value.some(item => item.code === props.defaultCiType)) {
    return props.defaultCiType
  }
  return resourceTypes.value[0]?.code || ''
}

// 加载资源类型
const loadResourceTypes = async () => {
  try {
    const res = await dataManageApi.getResourceTypes()
    resourceTypes.value = res?.records || []
    const nextCiType = resolveDefaultCiType()
    if (nextCiType) {
      formData.value.ciType = nextCiType
      await loadGroups()
    }
  } catch (error) {
    console.error('加载资源类型失败:', error)
  }
}

// 加载分组
const loadGroups = async () => {
  if (!formData.value.ciType) return
  loadingGroups.value = true
  try {
    const res = await assetApi.getGroupByCit(formData.value.ciType)
    groups.value = res?.records || []
  } catch (error) {
    console.error('加载分组列表失败:', error)
  } finally {
    loadingGroups.value = false
  }
}

// 资产类型变化
const handleCiTypeChange = () => {
  formData.value.groupId = ''
  loadGroups()
}

// 导出
const handleExport = async () => {
  exporting.value = true
  try {
    // 构建导出URL
    const params = new URLSearchParams({
      ciType: formData.value.ciType,
      format: formData.value.format
    })
    if (formData.value.groupId) {
      params.append('groupId', formData.value.groupId)
    }

    const url = `/acm/api/acm/ci/export?${params.toString()}&cacheBuster=${Date.now()}`
    window.open(url, '_blank')

    ElMessage.success('导出请求已发送')
    visible.value = false
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败: ' + (error.response?.data?.message || error.message))
  } finally {
    exporting.value = false
  }
}

// 弹窗关闭时重置
const handleClosed = () => {
  formData.value = {
    ciType: resolveDefaultCiType(),
    groupId: '',
    format: 'xlsx'
  }
}

// 监听弹窗打开
watch(visible, (val) => {
  if (val) {
    loadResourceTypes()
  }
})

watch(() => props.defaultCiType, (val) => {
  if (!visible.value || !val) return
  if (!resourceTypes.value.some(item => item.code === val)) return
  if (formData.value.ciType === val) return
  formData.value.ciType = val
  handleCiTypeChange()
})
</script>
