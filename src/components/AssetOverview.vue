<template>
  <div class="asset-overview">
    <div class="section-header">
      <h3 class="section-title">资产概览</h3>
      <div class="header-actions">
        <div class="filter-tabs">
          <button class="filter-tab active">按类型</button>
          <button class="filter-tab">按系统</button>
        </div>
      </div>
    </div>

    <!-- 横向条形图 -->
    <div class="asset-chart">
      <div v-for="(asset, index) in assetData.categories" :key="index" class="asset-item">
        <div class="asset-label">{{ asset }}</div>
        <div class="asset-bar-container">
          <div class="asset-bar">
            <div
              class="asset-bar-fill"
              :class="getBarColorClass(index)"
              :style="`width: ${(assetData.values[index] / Math.max(...assetData.values)) * 100}%`"
            ></div>
          </div>
          <span class="asset-value">{{ assetData.values[index] }}</span>
        </div>
      </div>
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
import { ElSelect, ElOption, ElButton } from 'element-plus'

use([
  CanvasRenderer,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

// Tab选项
const platformTabs = ref([
  { label: '企业版', value: 'enterprise' },
  { label: '社区版', value: 'community' }
])

// 选中的平台
const selectedPlatform = ref('enterprise')

// 资产数据
const assetData = ref({
  categories: ['Linux操作系统', 'Unix操作系统', 'Windows操作系统'],
  values: [4, 1, 4]
})

// 获取条形图颜色类
const getBarColorClass = (index) => {
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
    formatter: function(params) {
      const data = params[0]
      return `${data.name}: ${data.value}`
    }
  },
  grid: {
    left: '20%',
    right: '10%',
    top: '5%',
    bottom: '5%',
    containLabel: false
  },
  xAxis: {
    type: 'value',
    axisLine: {
      show: false
    },
    axisTick: {
      show: false
    },
    axisLabel: {
      color: '#666'
    },
    splitLine: {
      lineStyle: {
        color: '#f0f0f0'
      }
    },
    max: 5
  },
  yAxis: {
    type: 'category',
    data: assetData.value.categories,
    axisLine: {
      show: false
    },
    axisTick: {
      show: false
    },
    axisLabel: {
      color: '#666',
      fontSize: 12
    }
  },
  series: [
    {
      type: 'bar',
      data: assetData.value.values,
      itemStyle: {
        color: function(params) {
          const colors = ['#1890ff', '#52c41a', '#faad14']
          return colors[params.dataIndex % colors.length]
        },
        borderRadius: [0, 4, 4, 0]
      },
      barWidth: '60%',
      label: {
        show: true,
        position: 'right',
        color: '#666',
        fontSize: 12
      }
    }
  ]
}))
</script>

<style scoped lang="scss">
.asset-overview {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: "PingFang SC", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
}

.filter-tabs {
  display: flex;
  background: #f5f5f5;
  border-radius: 6px;
  padding: 2px;
}

.filter-tab {
  padding: 6px 12px;
  border: none;
  background: transparent;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    color: #2D8CF0;
  }

  &.active {
    background: #2D8CF0;
    color: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
}

// 资产图表样式
.asset-chart {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.asset-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.asset-label {
  font-size: 13px;
  color: #262626;
  font-weight: 500;
  min-width: 120px;
  text-align: left;
}

.asset-bar-container {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.asset-bar {
  flex: 1;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.asset-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.8s ease;

  &.blue-bar {
    background: #2D8CF0;
  }

  &.green-bar {
    background: #19BE6B;
  }

  &.orange-bar {
    background: #FF9900;
  }
}

.asset-value {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  min-width: 20px;
  text-align: right;
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
