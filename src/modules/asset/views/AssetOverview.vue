<template>
  <div class="ops-page-layout" style="padding: 0; background: #f5f7fa;">
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { overviewApi } from '../api'
import { processOsDistribution } from '../utils/helpers'
import AssetTypeChart from '../components/charts/AssetTypeChart.vue'
import OsDistributionChart from '../components/charts/OsDistributionChart.vue'
import AssetTrendChart from '../components/charts/AssetTrendChart.vue'
import GroupAssetChart from '../components/charts/GroupAssetChart.vue'

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
  console.log('Asset type clicked:', params)
  ElMessage.info(`跳转到资产类型: ${params.code}`)
}

/**
 * 处理操作系统点击
 */
function handleOsClick(params) {
  console.log('OS clicked:', params)
  ElMessage.info(`查看操作系统: ${params.os_distro}`)
}

/**
 * 处理分组点击
 */
function handleGroupClick(params) {
  console.log('Group clicked:', params)
  ElMessage.info(`跳转到分组: ${params.groupName}`)
}

/**
 * 加载所有数据
 */
async function loadAllData() {
  await Promise.all([
    loadAssetType(),
    loadOsDistribution(),
    loadNewAsset(),
    loadGroupAsset()
  ])
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
  background: #f5f7fa;
  overflow: hidden;
}

.navbar {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;

  .navbar-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }
}

.content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  overflow: hidden;
  gap: 16px;
}

.charts-row {
  flex: 1;
  display: flex;
  gap: 16px;
  min-height: 0;
}

.chart-item {
  display: flex;
  flex-direction: column;
  min-height: 0;

  &.half {
    flex: 0 0 calc(50% - 8px);
    min-width: 0;
  }

  &.full {
    flex: 1;
    width: 100%;
  }

  // 确保图表组件撑满容器
  :deep(.el-card),
  :deep(.chart-container) {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  :deep(.el-card__body) {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
}
</style>
