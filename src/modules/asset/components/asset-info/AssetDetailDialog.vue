<template>
  <el-drawer
    v-model="visible"
    title="设备详细信息"
    size="600px"
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
            <el-avatar :size="48" style="background-color: var(--el-color-primary-light-9); color: var(--el-color-primary)">
              <i class="fa fa-server" style="font-size: 20px"></i>
            </el-avatar>
            <div class="title-info">
              <h3>{{ attrValues.hostname || '-' }}</h3>
              <span class="ip-badge">{{ attrValues.IP || '-' }}</span>
            </div>
          </div>
        </div>

        <!-- 属性表格 -->
        <el-descriptions :column="1" border class="detail-descriptions">
          <el-descriptions-item
            v-for="attr in visibleAttrs"
            :key="attr.code"
            :label="attr.title"
            label-class-name="desc-label"
            class-name="desc-value"
          >
            <template v-if="attr.code === 'needReboot'">
              <el-tag :type="attrValues[attr.code] == 1 ? 'danger' : 'success'" size="small">
                {{ attrValues[attr.code] == 1 ? '待重启' : '无需重启' }}
              </el-tag>
            </template>
            <template v-else-if="attr.code === 'status'">
              <el-tag :type="attrValues[attr.code] == 1 ? 'success' : 'info'" size="small">
                {{ attrValues[attr.code] == 1 ? '在线' : '离线' }}
              </el-tag>
            </template>
            <template v-else-if="attr.code === 'CONN_LATEST_STATUS'">
              <el-tag :type="attrValues[attr.code] === '1' ? 'success' : 'danger'" size="small">
                {{ attrValues[attr.code] === '1' ? '正常' : '失联' }}
              </el-tag>
            </template>
            <template v-else>
              <span class="detail-value">{{ attrValues[attr.code] || '-' }}</span>
            </template>
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

