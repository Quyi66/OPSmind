<template>
  <div class="asset-overview">
    <div class="section-header">
      <h3 class="section-title">资产概览</h3>
      <div class="header-actions">
        <div class="filter-tabs">
          <button class="filter-tab active">按类型</button>
          <button class="filter-tab">按系统</button>
          <button class="more-btn">...</button>
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
  padding: 16px;
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
  margin-bottom: 16px;
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

// 资产图表样式
.asset-chart {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  justify-content: center;
}

.asset-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.asset-label {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
  min-width: 140px;
  text-align: left;
}

.asset-bar-container {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.asset-bar {
  flex: 1;
  height: 12px;
  background: #f3f4f6;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

.asset-bar-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.8s ease;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: linear-gradient(to bottom, rgba(255, 255, 255, 0.3), transparent);
    border-radius: 6px 6px 0 0;
  }

  &.blue-bar {
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  }

  &.green-bar {
    background: linear-gradient(135deg, #10b981 0%, #047857 100%);
  }

  &.orange-bar {
    background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  }
}

.asset-value {
  font-size: 16px;
  font-weight: 700;
  color: #333333;
  min-width: 24px;
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
