<template>
  <el-dialog
    v-model="visible"
    title="编辑资产"
    width="1060px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div v-loading="loading" class="asset-edit">
      <template v-if="!loading && visibleAttrs.length > 0">
        <el-form :model="formData" label-width="120px" class="asset-form">
          <el-row :gutter="20">
            <el-col v-for="attr in visibleAttrs" :key="attr.code" :span="12">
              <el-form-item :label="attr.title" :required="attr.required" class="asset-form-item">
                <template v-if="attr.editable">
                  <el-input
                    v-model="formData[attr.code]"
                    :placeholder="`请输入${attr.title}`"
                    clearable
                  />
                </template>
                <template v-else>
                  <span class="readonly-value">{{ formData[attr.code] || '-' }}</span>
                </template>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </template>
      <el-empty v-else-if="!loading" description="暂无数据" />
    </div>
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { assetApi } from '../../api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  assetId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const loading = ref(false)
const saving = ref(false)
const assetType = ref(null)
const formData = ref({})
const originalData = ref({})

// 特殊处理：这些字段即使 editable 为 false 也允许编辑
const specialEditableFields = ['IP']

// 判断字段是否可编辑
const isFieldEditable = attr => {
  if (attr.editable) return true
  if (specialEditableFields.includes(attr.code)) return true
  return false
}

// 扁平化属性列表，忽略分组标题并保留原始顺序
const visibleAttrs = computed(() => {
  if (!assetType.value?.attrs) return []

  return assetType.value.attrs
    .filter(attr => attr.code && attr.input?.control !== 'hidden')
    .map(attr => ({
      ...attr,
      editable: isFieldEditable(attr)
    }))
})

// 加载资产详情
const loadAssetDetail = async () => {
  if (!props.assetId) return

  loading.value = true
  try {
    // 并行请求资产属性值和资产类型定义
    const [attrs, typeInfo] = await Promise.all([
      assetApi.getAssetAttrs(props.assetId),
      assetApi.getAssetTypeByAssetId(props.assetId)
    ])
    originalData.value = { ...attrs } || {}
    formData.value = { ...attrs } || {}
    assetType.value = typeInfo
  } catch (error) {
    console.error('加载资产详情失败:', error)
    ElMessage.error('加载资产详情失败')
  } finally {
    loading.value = false
  }
}

// 保存
const handleSave = async () => {
  saving.value = true
  try {
    // 检查是否有变化
    let hasChanges = false
    for (const key in formData.value) {
      if (formData.value[key] !== originalData.value[key]) {
        hasChanges = true
        break
      }
    }

    if (!hasChanges) {
      ElMessage.info('没有修改任何数据')
      return
    }

    // 提交所有属性数据（包含 null 值）
    await assetApi.updateAssetAttrs(props.assetId, formData.value)
    ElMessage.success('保存成功')
    emit('saved')
    handleClose()
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

// 关闭弹窗
const handleClose = () => {
  visible.value = false
  formData.value = {}
  originalData.value = {}
  assetType.value = null
}

// 监听弹窗打开
watch(visible, val => {
  if (val && props.assetId) {
    loadAssetDetail()
  }
})
</script>

<style scoped lang="scss">
.asset-edit {
  min-height: 200px;
  // max-height: 60vh;
  // overflow-y: auto;
  padding-right: 4px;
}

.asset-form {
  padding-top: 16px;
}

.asset-form-item {
  margin-bottom: 18px;
}

.readonly-value {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  color: var(--el-text-color-secondary);
  font-size: 14px;
  line-height: 1.5;
  word-break: break-all;
}

:deep(.el-form-item__content) {
  min-width: 0;
}

:deep(.el-input) {
  width: 100%;
}
</style>
