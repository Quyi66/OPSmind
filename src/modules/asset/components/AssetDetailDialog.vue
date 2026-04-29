<template>
  <el-dialog
    v-model="visible"
    title="查看资产详情"
    width="1060px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div v-loading="loading" class="asset-detail">
      <template v-if="!loading && visibleAttrs.length > 0">
        <el-form :model="attrValues" label-width="120px" class="asset-form">
          <el-row :gutter="20">
            <el-col v-for="attr in visibleAttrs" :key="attr.code" :span="12">
              <el-form-item :label="attr.title" :required="attr.required" class="asset-form-item">
                <template v-if="attr.code === 'needReboot'">
                  <span
                    class="readonly-value"
                    :class="attrValues[attr.code] == 1 ? 'text-danger' : 'text-success'"
                  >
                    {{ attrValues[attr.code] == 1 ? '需要' : '不需要' }}
                  </span>
                </template>
                <template v-else>
                  <span class="readonly-value">{{ attrValues[attr.code] || '-' }}</span>
                </template>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
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
  set: val => emit('update:modelValue', val)
})

const loading = ref(false)
const assetType = ref(null)
const attrValues = ref({})

// 扁平化属性列表，忽略分组标题并保留原始顺序
const visibleAttrs = computed(() => {
  if (!assetType.value?.attrs) return []

  return assetType.value.attrs.filter(attr => attr.code && attr.input?.control !== 'hidden')
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
}

// 监听弹窗打开
watch(visible, val => {
  if (val && props.assetId) {
    loadAssetDetail()
  }
})
</script>

<style scoped lang="scss">
.asset-detail {
  min-height: 200px;
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
  font-size: 14px;
  line-height: 1.5;
  word-break: break-all;
  color: var(--el-text-color-secondary);
}

.text-danger {
  color: #f56c6c;
}

.text-success {
  color: #67c23a;
}

:deep(.el-form-item__content) {
  min-width: 0;
}
</style>
