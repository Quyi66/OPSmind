<template>
  <el-dialog
    v-model="visible"
    title="查看资产详情"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div v-loading="loading" class="asset-detail">
      <template v-if="!loading && groupedAttrs.length > 0">
        <el-tabs v-model="activeTab">
          <el-tab-pane
            v-for="group in groupedAttrs"
            :key="group.title"
            :label="group.title"
            :name="group.title"
          >
            <div class="tab-content">
              <div
                v-for="attr in group.attrs"
                :key="attr.code"
                class="attr-row"
              >
                <div class="attr-label">
                  <span v-if="attr.required" class="required">*</span>
                  {{ attr.title }}
                </div>
                <div class="attr-value">
                  <template v-if="attr.code === 'needReboot'">
                    <span :class="attrValues[attr.code] == 1 ? 'text-danger' : 'text-success'">
                      {{ attrValues[attr.code] == 1 ? '需要' : '不需要' }}
                    </span>
                  </template>
                  <template v-else>
                    {{ attrValues[attr.code] || '-' }}
                  </template>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </template>
      <el-empty v-else-if="!loading" description="暂无数据" />
    </div>
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

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const loading = ref(false)
const assetType = ref(null)
const attrValues = ref({})
const activeTab = ref('')

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
      if (currentGroup) {
        currentGroup.attrs.push(attr)
      } else {
        // 没有分组的属性，放到默认分组
        if (!groups.find((g) => g.title === '基本信息')) {
          groups.push({ title: '基本信息', attrs: [] })
        }
        groups.find((g) => g.title === '基本信息').attrs.push(attr)
      }
    }
  }

  // 添加最后一个分组
  if (currentGroup && currentGroup.attrs.length > 0) {
    groups.push(currentGroup)
  }

  // 过滤掉空分组
  const result = groups.filter((g) => g.attrs.length > 0)

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

    attrValues.value = attrs || {}
    assetType.value = typeInfo
  } catch (error) {
    console.error('加载资产详情失败:', error)
    ElMessage.error('加载资产详情失败')
  } finally {
    loading.value = false
  }
}

// 关闭弹窗
const handleClose = () => {
  visible.value = false
  attrValues.value = {}
  assetType.value = null
  activeTab.value = ''
}

// 监听弹窗打开
watch(visible, (val) => {
  if (val && props.assetId) {
    loadAssetDetail()
  }
})
</script>

<style scoped lang="scss">
.asset-detail {
  min-height: 200px;
}

.tab-content {
  padding: 16px 0;
}

.attr-row {
  display: flex;
  align-items: flex-start;
  padding: 12px 0;
  border-bottom: 1px solid #ebeef5;

  &:last-child {
    border-bottom: none;
  }
}

.attr-label {
  width: 120px;
  flex-shrink: 0;
  color: #606266;
  font-size: 14px;

  .required {
    color: #f56c6c;
    margin-right: 4px;
  }
}

.attr-value {
  flex: 1;
  color: #409eff;
  font-size: 14px;
  word-break: break-all;
}

.text-danger {
  color: #f56c6c;
}

.text-success {
  color: #67c23a;
}

:deep(.el-tabs__nav-wrap::after) {
  height: 1px;
}

:deep(.el-tabs__item) {
  font-size: 14px;
}
</style>
