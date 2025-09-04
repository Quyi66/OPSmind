<template>
  <div class="asset-overview">
    <div class="section-header">
      <h3 class="section-title">
        <img
          :src="assetHeaderIcon"
          alt="资产概览"
          class="section-icon"
        />
        资产概览
      </h3>
      <div class="header-actions">
        <div class="filter-tabs">
          <button class="filter-tab active">按类型</button>
          <button class="filter-tab">按系统</button>
          <button class="more-btn">...</button>
        </div>
      </div>
    </div>

    <!-- ECharts横向柱状图 -->
    <div class="chart-container">
      <v-chart class="chart" :option="chartOption" autoresize />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
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

use([CanvasRenderer, BarChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])

// 标题图标
const assetHeaderIcon = new URL('@/assets/icons/dashboard/icon-assetview@2x.png', import.meta.url).href

// Tab选项
const platformTabs = ref([
  { label: '企业版', value: 'enterprise' },
  { label: '社区版', value: 'community' }
])

// 选中的平台
const selectedPlatform = ref('enterprise')

// 资产数据
const assetData = ref({
  categories: ['Windows服务器', 'Unix服务器', 'Linux服务器'],
  values: [2, 1, 4]
})

// 获取条形图颜色类
const getBarColorClass = index => {
  const colors = ['blue-bar', 'green-bar', 'orange-bar']
  return colors[index % colors.length]
}

// ECharts 配置
const chartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow'
    },
    formatter: function (params) {
      const data = params[0]
      return `${data.name}: ${data.value}`
    }
  },
  grid: {
    left: '5%',
    right: '15%',
    top: '10%',
    bottom: '15%',
    containLabel: true
  },
  xAxis: {
    type: 'value',
    min: 0,
    max: Math.max(...assetData.value.values),
    interval: 1,
    axisLine: {
      show: true,
      lineStyle: {
        color: '#e8e8e8'
      }
    },
    axisTick: {
      show: true,
      lineStyle: {
        color: '#e8e8e8'
      }
    },
    axisLabel: {
      color: '#999',
      fontSize: 14
    },
    splitLine: {
      show: true,
      lineStyle: {
        color: '#f5f5f5',
        type: 'solid'
      }
    }
  },
  yAxis: {
    type: 'category',
    data: assetData.value.categories,
    axisLine: {
      show: true,
      lineStyle: {
        color: '#e8e8e8'
      }
    },
    axisTick: {
      show: false
    },
    axisLabel: {
      color: '#999',
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
  color: #374151;
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
  color: #6b7280;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: #f8f9fa;
  }

  &.active {
    border-color: #e8f2ff;
    color: #3b82f6;
    background: #f8fbff;
  }
}

.more-btn {
  padding: 6px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: #f8f9fa;
    color: #374151;
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
  color: #262626;
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
  height: 160px;
  min-height: 160px;
}

.chart {
  width: 100%;
  height: 160px;
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
