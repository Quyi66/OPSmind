<template>
  <el-dialog
    v-model="visible"
    title="编辑资产"
    width="800px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div v-loading="loading" class="asset-edit">
      <template v-if="!loading && groupedAttrs.length > 0">
        <el-tabs v-model="activeTab">
          <el-tab-pane
            v-for="group in groupedAttrs"
            :key="group.title"
            :label="group.title"
            :name="group.title"
          >
            <div class="tab-content">
              <div v-for="attr in group.attrs" :key="attr.code" class="attr-row">
                <div class="attr-label">
                  <span v-if="attr.required" class="required">*</span>
                  {{ attr.title }}
                </div>
                <div class="attr-value">
                  <template v-if="!attr.editable">
                    <!-- 不可编辑的字段 -->
                    <span class="readonly-value">{{ formData[attr.code] || '-' }}</span>
                  </template>
                  <template v-else>
                    <!-- 可编辑的字段 -->
                    <el-input
                      v-model="formData[attr.code]"
                      :placeholder="`请输入${attr.title}`"
                      clearable
                    />
                  </template>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
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
import { assetApi } from '../api'

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
const activeTab = ref('')

// 特殊处理：这些字段即使 editable 为 false 也允许编辑
const specialEditableFields = ['IP']

// 判断字段是否可编辑
const isFieldEditable = attr => {
  if (attr.editable) return true
  if (specialEditableFields.includes(attr.code)) return true
  return false
}

// 按分组整理属性
const groupedAttrs = computed(() => {
  if (!assetType.value?.attrs) return []

  const groups = []
  let currentGroup = null

  for (const attr of assetType.value.attrs) {
    if (attr.type === 'group') {
      // 这是一个分组标题
      if (currentGroup) {
        groups.push(currentGroup)
      }
      currentGroup = {
        title: attr.title,
        attrs: []
      }
    } else if (attr.code) {
      // 这是一个属性，跳过 hidden 类型的控件
      if (attr.input?.control === 'hidden') {
        continue
      }
      // 标记是否可编辑（包含特殊处理）
      const processedAttr = {
        ...attr,
        editable: isFieldEditable(attr)
      }
      if (currentGroup) {
        currentGroup.attrs.push(processedAttr)
      } else {
        // 没有分组的属性，放到默认分组
        if (!groups.find(g => g.title === '基本信息')) {
          groups.push({ title: '基本信息', attrs: [] })
        }
        groups.find(g => g.title === '基本信息').attrs.push(processedAttr)
      }
    }
  }

  // 添加最后一个分组
  if (currentGroup && currentGroup.attrs.length > 0) {
    groups.push(currentGroup)
  }

  // 过滤掉空分组
  const result = groups.filter(g => g.attrs.length > 0)

  // 设置默认选中第一个 tab
  if (result.length > 0 && !activeTab.value) {
    activeTab.value = result[0].title
  }

  return result
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
  activeTab.value = ''
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
}

.tab-content {
  padding: 16px 0;
}

.attr-row {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--el-border-color-light);

  &:last-child {
    border-bottom: none;
  }
}

.attr-label {
  width: 120px;
  flex-shrink: 0;
  color: var(--el-text-color-regular);
  font-size: 14px;

  .required {
    color: #f56c6c;
    margin-right: 4px;
  }
}

.attr-value {
  flex: 1;

  .readonly-value {
    color: var(--el-text-color-secondary);
    font-size: 14px;
  }
}

:deep(.el-tabs__nav-wrap::after) {
  height: 1px;
}

:deep(.el-tabs__item) {
  font-size: 14px;
}

:deep(.el-input) {
  max-width: 400px;
}
</style>
