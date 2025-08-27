<template>
  <div class="inspection-overview">
    <div class="section-header">
      <h3 class="section-title">巡检概览</h3>
      <div class="header-actions">
        <button class="more-btn">更多</button>
      </div>
    </div>

    <!-- 巡检统计 -->
    <div class="inspection-stats">
      <div v-for="stat in inspectionStats" :key="stat.id" class="stat-item">
        <div class="stat-icon" :class="stat.iconClass">
          <div class="stat-indicator" :class="stat.colorClass"></div>
        </div>
        <div class="stat-value">{{ stat.value }}</div>
        <div class="stat-label">{{ stat.label }}</div>
      </div>
    </div>

    <!-- 图表标题 -->
    <div class="chart-header">
      <h4 class="chart-title">近10天巡检结果情况</h4>
      <div class="chart-legend">
        <span class="legend-item">
          <span class="legend-color" style="background: #52c41a;"></span>
          正常
        </span>
        <span class="legend-item">
          <span class="legend-color" style="background: #faad14;"></span>
          异常
        </span>
      </div>
    </div>

    <!-- 图表容器 -->
    <div class="chart-container">
      <v-chart
        class="chart"
        :option="chartOption"
        autoresize
      />
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
import { ElButton } from 'element-plus'

use([
  CanvasRenderer,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

// 巡检统计数据
const inspectionStats = ref([
  {
    id: 'total-inspections',
    label: '本月巡检次数',
    value: '23',
    iconClass: 'blue-bg',
    colorClass: 'blue-indicator'
  },
  {
    id: 'normal-inspections',
    label: '正常',
    value: '23',
    iconClass: 'green-bg',
    colorClass: 'green-indicator'
  },
  {
    id: 'abnormal-inspections',
    label: '异常',
    value: '9',
    iconClass: 'red-bg',
    colorClass: 'red-indicator'
  }
])

// 图表数据
const chartData = ref({
  dates: ['07/01', '07/02', '07/03', '07/04', '07/05', '07/06', '07/07', '07/08', '07/09', '07/10'],
  normal: [150, 180, 160, 200, 220, 190, 240, 210, 180, 230],
  abnormal: [50, 60, 40, 80, 90, 70, 100, 85, 65, 95]
})

// ECharts 配置
const chartOption = computed(() => ({
  animation: true,
  animationDuration: 1000,
  animationEasing: 'cubicOut',
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow'
    }
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: chartData.value.dates,
    axisLine: {
      lineStyle: {
        color: '#e8e8e8'
      }
    },
    axisLabel: {
      color: '#666'
    }
  },
  yAxis: {
    type: 'value',
    max: 250,
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
    }
  },
  series: [
    {
      name: '正常',
      type: 'bar',
      data: chartData.value.normal,
      itemStyle: {
        color: '#19BE6B'
      },
      barWidth: '30%'
    },
    {
      name: '异常',
      type: 'bar',
      data: chartData.value.abnormal,
      itemStyle: {
        color: '#FF9900'
      },
      barWidth: '30%'
    }
  ]
}))
</script>

<style scoped lang="scss">
.inspection-overview {
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
  margin-bottom: 20px;
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

.more-btn {
  background: none;
  border: none;
  color: #8c8c8c;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.3s ease;

  &:hover {
    color: #2D8CF0;
    background: #f0f7ff;
  }
}

// 巡检统计样式
.inspection-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 24px;
  justify-content: space-around;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  flex: 1;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;

  &.blue-bg {
    background: rgba(45, 140, 240, 0.1);
  }

  &.green-bg {
    background: rgba(25, 190, 107, 0.1);
  }

  &.red-bg {
    background: rgba(255, 77, 79, 0.1);
  }
}

.stat-indicator {
  width: 16px;
  height: 16px;
  border-radius: 4px;

  &.blue-indicator {
    background: #2D8CF0;
  }

  &.green-indicator {
    background: #19BE6B;
  }

  &.red-indicator {
    background: #ff4d4f;
  }
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #262626;
  line-height: 1.2;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #8c8c8c;
  font-weight: 500;
}

.inspection-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
}

.inspection-stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  flex: 1;
  border: 1px solid #f0f0f0;

  &.primary {
    background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
    border-color: #91d5ff;
  }

  &.success {
    background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%);
    border-color: #b7eb8f;
  }

  &.danger {
    background: linear-gradient(135deg, #fff2f0 0%, #ffccc7 100%);
    border-color: #ffa39e;
  }
}

.stat-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 14px;
  color: white;

  .primary & {
    background: #1890ff;
  }

  .success & {
    background: #52c41a;
  }

  .danger & {
    background: #ff4d4f;
  }
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #262626;
  line-height: 1.2;
  margin-bottom: 2px;
}

.stat-label {
  font-size: 12px;
  color: #8c8c8c;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  margin: 0;
}

.chart-legend {
  display: flex;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #666;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.chart-container {
  flex: 1;
  min-height: 200px;
}

.chart {
  width: 100%;
  height: 100%;
}

// 响应式设计
@media (max-width: 768px) {
  .inspection-overview {
    padding: 16px;
  }

  .inspection-stats {
    flex-direction: column;
    gap: 12px;
  }

  .chart-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .chart-legend {
    gap: 12px;
  }

  .chart-container {
    min-height: 250px;
  }
}
</style>
