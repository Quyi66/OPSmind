<template>
  <div class="ops-page-layout" style="padding: 0">
    <div class="content-wrapper">
      <!-- 图表区域 - 第一行：资产类型 + 操作系统分布 -->
      <div class="charts-row">
        <div class="chart-item half">
          <AssetTypeChart
            :data="assetTypeData"
            :loading="assetTypeLoading"
            @refresh="loadAssetType"
            @click="handleAssetTypeClick"
          />
        </div>
        <div class="chart-item half">
          <OsDistributionChart
            :data="osDistributionData"
            :loading="osDistributionLoading"
            @refresh="loadOsDistribution"
            @click="handleOsClick"
          />
        </div>
      </div>

      <!-- 图表区域 - 第二行：资产新增统计（100%宽度） -->
      <div class="charts-row">
        <div class="chart-item full">
          <AssetTrendChart
            :data="newAssetData"
            :loading="newAssetLoading"
            @refresh="loadNewAsset"
          />
        </div>
      </div>

      <!-- 图表区域 - 第三行：分组内资产分布（100%宽度） -->
      <div class="charts-row">
        <div class="chart-item full">
          <GroupAssetChart
            :data="groupAssetData"
            :loading="groupAssetLoading"
            @refresh="loadGroupAsset"
            @click="handleGroupClick"
          />
        </div>
      </div>
    </div>

    <!-- 操作系统版本分布弹窗 -->
    <OsVersionDialog
      v-model="osVersionVisible"
      :title="osVersionTitle"
      :data="osVersionData"
      :loading="osVersionLoading"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { overviewApi } from '../api'
import { processOsDistribution } from '../utils/helpers'
import AssetTypeChart from '../components/charts/AssetTypeChart.vue'
import OsDistributionChart from '../components/charts/OsDistributionChart.vue'
import AssetTrendChart from '../components/charts/AssetTrendChart.vue'
import GroupAssetChart from '../components/charts/GroupAssetChart.vue'
import OsVersionDialog from '../components/OsVersionDialog.vue'

const router = useRouter()

// 资产类型数据
const assetTypeData = ref([])
const assetTypeLoading = ref(false)

// 操作系统分布数据
const osDistributionData = ref([])
const osDistributionLoading = ref(false)

// 资产新增统计数据
const newAssetData = ref([])
const newAssetLoading = ref(false)

// 分组资产分布数据
const groupAssetData = ref([])
const groupAssetLoading = ref(false)

// 操作系统版本分布弹窗逻辑
const osVersionVisible = ref(false)
const osVersionLoading = ref(false)
const osVersionData = ref([])
const osVersionTitle = ref('')

/**
 * 加载资产类型统计
 */
async function loadAssetType() {
  assetTypeLoading.value = true
  try {
    const response = await overviewApi.getAssetTypeCount()
    const data = response?.data || response || {}
    assetTypeData.value = data.records || []
  } catch (error) {
    console.error('加载资产类型统计失败:', error)
  } finally {
    assetTypeLoading.value = false
  }
}

/**
 * 加载操作系统分布
 */
async function loadOsDistribution() {
  osDistributionLoading.value = true
  try {
    const response = await overviewApi.getOsDistribution()
    const data = response?.data || response || {}
    // 不做合并处理，直接使用原始数据
    osDistributionData.value = data.records || []
  } catch (error) {
    console.error('加载操作系统分布失败:', error)
  } finally {
    osDistributionLoading.value = false
  }
}

/**
 * 加载资产新增统计
 */
async function loadNewAsset() {
  newAssetLoading.value = true
  try {
    const response = await overviewApi.getNewAssetCount()
    const data = response?.data || response || {}
    newAssetData.value = data.records || []
  } catch (error) {
    console.error('加载资产新增统计失败:', error)
  } finally {
    newAssetLoading.value = false
  }
}

/**
 * 加载分组资产分布
 */
async function loadGroupAsset() {
  groupAssetLoading.value = true
  try {
    const response = await overviewApi.getGroupAssetCount()
    const data = response?.data || response || {}
    groupAssetData.value = data.records || []
  } catch (error) {
    console.error('加载分组资产分布失败:', error)
  } finally {
    groupAssetLoading.value = false
  }
}

/**
 * 处理资产类型点击
 */
function handleAssetTypeClick(params) {
  if (!params.code) return
  router.push({
    path: '/acm/info',
    query: { type: params.code }
  })
}

/**
 * 处理操作系统点击
 */
async function handleOsClick(params) {
  const osDistro = params.os_distro
  if (!osDistro) return

  osVersionTitle.value = `${osDistro} 版本分布`
  osVersionVisible.value = true
  osVersionLoading.value = true
  osVersionData.value = []

  try {
    const response = await overviewApi.getOsVersionDistribution(osDistro)
    const data = response?.data || response || {}
    osVersionData.value = data.records || []
  } catch (error) {
    console.error('获取操作系统版本分布失败:', error)
    ElMessage.error('获取版本分布失败')
  } finally {
    osVersionLoading.value = false
  }
}

/**
 * 处理分组点击
 */
function handleGroupClick(params) {
  ElMessage.info(`跳转到分组: ${params.groupName}`)
}

/**
 * 加载所有数据
 */
async function loadAllData() {
  await Promise.all([loadAssetType(), loadOsDistribution(), loadNewAsset(), loadGroupAsset()])
}

onMounted(() => {
  loadAllData()
})
</script>

<style scoped lang="scss">
.asset-overview {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 24px;
  background: #f5f7fa;
  overflow: hidden; /* 防止页面级滚动 */
}

.navbar {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;

  .navbar-title {
    font-size: 18px;
    font-weight: 600;
    color: #1e293b;
  }
}

.content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  overflow: hidden; /* 禁止内容溢出 */
}

/* 布局行 */
.charts-row {
  display: flex;
  gap: 20px;
  flex: 1; /* 平分垂直空间 */
  min-height: 0; /* 允许压缩 */
  flex-shrink: 0;
}

/* 强制指定每个图表的位置 */
/* 假设结构是:
   Row 1: chart-item (half), chart-item (half)
   Row 2: charts-row > chart-item (full)
   Row 3: charts-row > chart-item (full)

   但是因为 .charts-row display:contents, 它的子元素直接变成 grid item。
*/

/* 辅助定位：根据 DOM 顺序 */
/* 第1个图表 */
.chart-item:nth-of-type(1) {
  grid-column: 1 / 2;
  grid-row: 1 / 2;
}

/* 第2个图表 */
.chart-item:nth-of-type(2) {
  grid-column: 2 / 3;
  grid-row: 1 / 2;
}

/* 第3个图表 (AssetTrendChart) */
/* 注意：如果没有 charts-row 包裹，它是第3个 .chart-item。
   如果有 charts-row (display:contents) 包裹，它还是第3个直系 grid item (视觉上)。
   但在 CSS 选择器中，如结构是 .content-wrapper > .charts-row > .chart-item，
   那么 grid item 是 .charts-row（如果是 display:contents，则其子项是 grid item）。

   为了安全起见，我们直接针对 .chart-item 设置样式，利用 .half 和 .full 类。
*/

.chart-item.full {
  grid-column: 1 / -1; /* 跨满整行 */
}

.chart-item {
  flex: 1;
  min-width: 0;
  min-height: 0;
  height: 100%;

  /* 统一卡片样式覆盖 */
  :deep(.chart-card) {
    background: #fff;
    border-radius: 12px;
    border: 1px solid #dcdfe6; /* 明显的边框 */
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); /* 明显的阴影 */
    padding: 24px;
    transition: all 0.3s ease;
    height: 100%; /* 确保撑满 */

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
      border-color: #c0c4cc;
    }
  }

  :deep(.chart-header) {
    margin-bottom: 24px;
    padding-bottom: 0;
  }

  :deep(.chart-title) {
    font-size: 16px;
    font-weight: 700;
    color: #1e293b;
    position: relative;
    padding-left: 12px;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 16px;
      background: #3b82f6;
      border-radius: 2px;
    }
  }
}
</style>
