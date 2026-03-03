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
            @click="activeTab = 'type'"
          >
            按类型
          </button>
          <button
            class="filter-tab"
            :class="{ active: activeTab === 'system' }"
            @click="activeTab = 'system'"
          >
            按系统
          </button>
          <button class="more-btn">...</button>
        </div>
      </div>
    </div>

    <!-- ECharts横向柱状图 -->
    <div class="chart-container">
      <v-chart class="chart" :option="chartOption" autoresize :theme="isDark ? 'dark' : ''" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
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

// 资产数据（来自 API 数据）
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
    left: '5%',
    right: '15%',
    top: '10%',
    bottom: '15%'
  },
  xAxis: {
    type: 'value',
    min: 0,
    max: Math.max(1, ...assetData.value.values),
    interval: 1,
    axisLine: {
      show: true,
      lineStyle: {}
    },
    axisTick: {
      show: true,
      lineStyle: {}
    },
    axisLabel: {
      
      fontSize: 14
    },
    splitLine: {
      show: true,
      lineStyle: {
        type: 'solid'
      }
    }
  },
  yAxis: {
    type: 'category',
    data: assetData.value.categories,
    axisLine: {
      show: true,
      lineStyle: {}
    },
    axisTick: {
      show: false
    },
    axisLabel: {
      
      fontSize: 12,
      margin: 10
    }
  },
  series: [
    {
      type: 'bar',
      data: assetData.value.values,
      itemStyle: {
        color: '#1890ff',
        borderRadius: [0, 2, 2, 0]
      },
      barWidth: '30%',
      label: {
        show: true,
        position: 'right',
        color: '#1890ff',
        fontSize: 12,
        fontWeight: 'bold',
        distance: 5
      }
    }
  ]
}))
</script>

<style scoped lang="scss">
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

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0;
  padding: 0 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
}

.filter-tabs {
  display: flex;
  gap: 8px;
}

.filter-tab {
  padding: 6px 12px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-regular);
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: var(--el-fill-color-light);
  }

  &.active {
    /* 仅强调文字颜色，不要背景和边框；颜色更浅一些 */
    border-color: transparent;
    background: transparent;
    color: #60a5fa; /* 浅蓝（blue-400） */
  }
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
  transition: all 0.3s ease;

  &:hover {
    background: var(--el-fill-color-light);
    color: var(--el-text-color-primary);
  }
}

// 图表容器样式
.chart-container {
  flex: 1;
  padding: 16px;
  min-height: 200px;
}

.chart {
  width: 100%;
  height: 100%;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;

  i {
    color: #1890ff;
    font-size: 14px;
  }
}

.section-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chart-container {
  flex: 1;
  min-height: 220px;
}

.chart {
  width: 100%;
  height: 100%;
  min-height: 220px;
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

  .chart-container {
    min-height: 250px;
  }
}
</style>
