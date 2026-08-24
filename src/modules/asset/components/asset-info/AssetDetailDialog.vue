<template>
  <el-drawer
    v-model="visible"
    title="设备详细信息"
    size="55%"
    direction="rtl"
    :close-on-click-modal="true"
    @close="handleClose"
    class="asset-detail-drawer"
  >
    <div v-loading="loading" class="drawer-body">
      <template v-if="!loading && visibleAttrs.length > 0">
        <!-- 头部资产摘要卡片 -->
        <div class="detail-header-card">
          <div class="avatar-area">
            <el-avatar
              :size="48"
              style="
                background-color: var(--el-color-primary-light-9);
                color: var(--el-color-primary);
              "
            >
              <i class="fa fa-server" style="font-size: 20px"></i>
            </el-avatar>
            <div class="title-info">
              <h3>{{ getAttrValue('HOSTNAME') }}</h3>
              <span class="ip-badge">{{ getAttrValue('IP') }}</span>
            </div>
          </div>
        </div>

        <!-- 扁平属性表格列表 -->
        <el-descriptions :column="2" border class="detail-descriptions mt-3">
          <el-descriptions-item
            v-for="attr in visibleAttrs"
            :key="attr.code"
            :label="attr.title"
            label-class-name="desc-label"
            class-name="desc-value"
          >
            <el-tag
              v-if="attr.code.toUpperCase() === 'NEEDREBOOT'"
              :type="getAttrValue(attr.code) == 1 ? 'danger' : 'success'"
              size="small"
            >
              {{ getAttrValue(attr.code) == 1 ? '待重启' : '无需重启' }}
            </el-tag>
            <el-tag
              v-else-if="attr.code.toUpperCase() === 'STATUS'"
              :type="getAttrValue(attr.code) == 1 ? 'success' : 'info'"
              size="small"
            >
              {{ getAttrValue(attr.code) == 1 ? '在线' : '离线' }}
            </el-tag>
            <el-tag
              v-else-if="attr.code.toUpperCase() === 'CONN_LATEST_STATUS'"
              :type="String(getAttrValue(attr.code)) === '1' ? 'success' : 'danger'"
              size="small"
            >
              {{ String(getAttrValue(attr.code)) === '1' ? '正常' : '失联' }}
            </el-tag>
            <span v-else class="detail-value">{{ getAttrValue(attr.code) }}</span>
          </el-descriptions-item>
        </el-descriptions>
      </template>
      <el-empty v-else-if="!loading" description="暂无数据" />
    </div>
  </el-drawer>
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

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const loading = ref(false)
const assetType = ref(null)
const attrValues = ref({})

const visibleAttrs = computed(() => {
  if (!assetType.value?.attrs) return []

  return assetType.value.attrs.filter(attr => attr.code && attr.input?.control !== 'hidden')
})

function getAttrValue(code) {
  if (!code) return '-'

  // 1. 精确匹配
  if (attrValues.value[code] !== undefined && attrValues.value[code] !== null) {
    return attrValues.value[code]
  }

  // 2. 不区分大小写匹配
  const upper = code.toUpperCase()
  const lower = code.toLowerCase()

  if (attrValues.value[upper] !== undefined && attrValues.value[upper] !== null) {
    return attrValues.value[upper]
  }
  if (attrValues.value[lower] !== undefined && attrValues.value[lower] !== null) {
    return attrValues.value[lower]
  }

  // 3. 针对 OS / 操作系统等特殊字段的容错
  if (upper === 'OS') {
    return attrValues.value.os_distro || attrValues.value.osDistro || attrValues.value.os || '-'
  }

  return '-'
}

// 加载资产详情
const loadAssetDetail = async () => {
  if (!props.assetId) return

  loading.value = true
  try {
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
.detail-header-card {
  background: var(--el-fill-color-light);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  border: 1px solid var(--el-border-color-lighter);

  .avatar-area {
    display: flex;
    align-items: center;
    gap: 16px;

    .title-info {
      display: flex;
      flex-direction: column;
      gap: 4px;

      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--el-text-color-primary);
      }

      .ip-badge {
        font-size: 13px;
        color: var(--el-text-color-secondary);
      }
    }
  }
}

.detail-descriptions {
  :deep(.desc-label) {
    width: 140px;
    font-weight: 500;
    color: var(--el-text-color-regular);
    background-color: var(--el-fill-color-light);
  }

  :deep(.desc-value) {
    color: var(--el-text-color-primary);
  }
}

.detail-value {
  font-size: 13px;
  line-height: 1.5;
  word-break: break-all;
}
</style>
