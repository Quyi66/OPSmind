<template>
  <div class="asset-overview">
    <div class="section-header">
      <h3 class="section-title">
        <img :src="assetHeaderIcon" alt="资产概览" class="section-icon" />
        资产概览
      </h3>
      <div class="header-actions">
        <div class="filter-tabs">
          <button
            class="filter-tab"
            :class="{ active: activeTab === 'type' }"
            :aria-pressed="activeTab === 'type'"
            @click.stop="activeTab = 'type'"
          >
            按类型
          </button>
          <button
            class="filter-tab"
            :class="{ active: activeTab === 'system' }"
            :aria-pressed="activeTab === 'system'"
            @click.stop="activeTab = 'system'"
          >
            按系统
          </button>
        </div>
        <button class="more-btn" @click="navigateToAssetOverview" title="查看全部">
          <span>查看全部</span>
          <i class="fas fa-chevron-right more-arrow"></i>
        </button>
      </div>
    </div>

    <!-- ECharts横向柱状图 -->
    <div
      class="chart-container clickable-area"
      v-loading="dashboardStore.loading"
      element-loading-text="正在加载资产数据..."
      @click="navigateToAssetOverview"
    >
      <div v-if="dashboardStore.error" class="chart-empty-overlay error-state" @click.stop>
        <i class="fas fa-exclamation-circle error-icon"></i>
        <span>资产数据加载失败</span>
        <el-button size="small" type="primary" link @click="dashboardStore.loadDashboardData">重新加载</el-button>
      </div>
      <div v-else-if="!hasAssetOverview" class="chart-empty-overlay">
        <i class="fas fa-server empty-icon"></i>
        <span>暂无资产数据</span>
      </div>
      <v-chart
        v-else
        class="chart"
        :option="chartOption"
        autoresize
        :theme="isDark ? 'dark' : ''"
        @click="handleChartClick"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import { useTheme } from '@/composables/useTheme'
const { isDark } = useTheme()
import { useDashboardStore } from '@/stores/dashboard'

use([CanvasRenderer, BarChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])

// 标题图标
const assetHeaderIcon = new URL('@/assets/icons/dashboard/icon-assetview@2x.png', import.meta.url)
  .href

const dashboardStore = useDashboardStore()
const activeTab = ref('type')
const router = useRouter()

const navigateToAssetOverview = () => {
  router.push({ path: '/acm/info' })
}

const assetTypeRouteMap = {
  Windows服务器: 'windows',
  Unix服务器: 'unix',
  Linux服务器: 'linux',
  Windows: 'windows',
  Unix: 'unix',
  Linux: 'linux'
}

const navigateToAssetInfoByType = assetType => {
  if (!assetType) {
    navigateToAssetOverview()
    return
  }

  router.push({
    path: '/acm/info',
    query: { type: assetType }
  })
}

// 资产数据（来自 API 数据）
const hasAssetOverview = computed(() => {
  return Boolean(dashboardStore.dashboardFullData?.assetOverview)
})

const assetData = computed(() => {
  const a = dashboardStore.dashboardFullData?.assetOverview
  const values = [a?.windowsServers ?? 0, a?.unixServers ?? 0, a?.linuxServers ?? 0]
  const byType = ['Windows服务器', 'Unix服务器', 'Linux服务器']
  const bySystem = ['Windows', 'Unix', 'Linux']
  return {
    categories: activeTab.value === 'system' ? bySystem : byType,
    values
  }
})

const handleChartClick = params => {
  const assetType = assetTypeRouteMap[params?.name] || ''
  navigateToAssetInfoByType(assetType)
}

// ECharts 配置
const chartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow'
    },
    formatter(params) {
      const data = params[0]
      return `${data.name}: ${data.value}`
    }
  },
  grid: {
    left: '2%',
    right: '8%',
    top: 8,
    bottom: 8,
    containLabel: true
  },
  xAxis: {
    type: 'value',
    min: 0,
    axisLine: {
      show: true,
      lineStyle: {
        color: isDark.value ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)'
      }
    },
    axisTick: {
      show: true
    },
    axisLabel: {
      fontSize: 12,
      color: isDark.value ? '#a3a6ad' : '#909399'
    },
    splitLine: {
      show: true,
      lineStyle: {
        type: 'dashed',
        color: isDark.value ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)'
      }
    }
  },
  yAxis: {
    type: 'category',
    data: assetData.value.categories,
    axisLine: {
      show: true,
      lineStyle: {
        color: isDark.value ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)'
      }
    },
    axisTick: {
      show: false
    },
    axisLabel: {
      fontSize: 12,
      margin: 10,
      color: isDark.value ? '#cfd3dc' : '#606266'
    }
  },
  series: [
    {
      type: 'bar',
      data: assetData.value.values,
      itemStyle: {
        color: '#3B82F6',
        borderRadius: [0, 4, 4, 0]
      },
      barWidth: 14,
      label: {
        show: true,
        position: 'right',
        color: '#3B82F6',
        fontSize: 12,
        fontWeight: 600,
        distance: 6
      }
    }
  ]
}))
</script>

<style scoped lang="scss">
@use '../styles/overview-tabs';

.asset-overview {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family:
    'PingFang SC',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    'Helvetica Neue',
    Arial,
    sans-serif;
}

.clickable-area {
  cursor: pointer;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0;
  padding: 8px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: transparent;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-actions {
  display: flex;
  align-items: center;
}

.filter-tab:disabled,
.filter-tab[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 1; /* 保持清晰可读 */
  background: transparent;
  color: #8a8a8a; /* 略深的灰，提升对比度 */
  border: none; /* 不要边框 */
}

.more-btn {
  padding: 6px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-regular);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.3s ease;

  &:hover {
    background: var(--el-fill-color-light);
    color: var(--el-text-color-primary);

    .more-arrow {
      transform: translateX(2px);
    }
  }

  .more-arrow {
    font-size: 10px;
    transition: transform 0.2s ease;
    display: inline-flex;
    align-items: center;
    line-height: 1;
    margin-top: 1px;
  }
}

// 图表容器样式
.chart-container {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  padding: 12px 16px;
  min-height: 184px;
}

.chart-empty-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--el-text-color-placeholder);
  font-size: 12px;
  z-index: 2;

  .empty-icon {
    font-size: 28px;
    opacity: 0.25;
  }

  &.error-state {
    color: var(--el-color-danger);

    .error-icon {
      font-size: 26px;
      color: var(--el-color-danger);
    }
  }
}

.chart {
  width: 100%;
  height: 100%;
  min-height: 160px;
  max-height: 220px;
}



.section-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
  background: rgba(219, 234, 254, 0.6);
  border-radius: 4px;
  padding: 2px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

// 响应式设计
@media (max-width: 768px) {
  .asset-overview {
    padding: 16px;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

}
</style>
