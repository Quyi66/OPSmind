<template>
  <div class="inspection-overview">
    <!-- 标题 -->
    <div class="section-header">
      <h3 class="section-title">巡检概览</h3>
      <div class="header-actions">
        <button class="more-btn">更多</button>
      </div>
    </div>

    <!-- 巡检统计 -->
    <div class="inspection-stats">
      <div v-for="stat in inspectionStats" :key="stat.id" class="stat-item" :class="stat.cardClass">
        <div class="stat-icon" :class="stat.iconClass">
          <i :class="stat.icon"></i>
        </div>
        <div class="stat-content">
          <div class="stat-label">{{ stat.label }}</div>
          <div class="stat-value">{{ stat.value }}</div>
        </div>
      </div>
    </div>

    <!-- 图表标题和图例 -->
    <div class="chart-header">
      <h4 class="chart-title">近10天巡检结果情况</h4>
      <div class="chart-legend">
        <div class="legend-item">
          <div class="legend-color" style="background: #10b981;"></div>
          <span>正常</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #fbbf24;"></div>
          <span>异常</span>
        </div>
      </div>
    </div>

    <!-- ECharts图表容器 -->
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
    icon: 'fas fa-search',
    iconClass: 'blue-icon',
    cardClass: 'blue-card'
  },
  {
    id: 'normal-inspections',
    label: '正常',
    value: '23',
    icon: 'fas fa-check-circle',
    iconClass: 'green-icon',
    cardClass: 'green-card'
  },
  {
    id: 'abnormal-inspections',
    label: '异常',
    value: '9',
    icon: 'fas fa-exclamation-triangle',
    iconClass: 'red-icon',
    cardClass: 'red-card'
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
    },
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#e8e8e8',
    borderWidth: 1,
    textStyle: {
      color: '#333'
    }
  },
  grid: {
    left: '5%',
    right: '5%',
    bottom: '15%',
    top: '10%',
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
      color: '#666',
      fontSize: 12,
      margin: 10
    },
    axisTick: {
      show: false
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
      color: '#666',
      fontSize: 12
    },
    splitLine: {
      lineStyle: {
        color: '#f0f0f0',
        type: 'dashed'
      }
    }
  },
  series: [
    {
      name: '正常',
      type: 'bar',
      data: chartData.value.normal,
      itemStyle: {
        color: '#10b981',
        borderRadius: [2, 2, 0, 0]
      },
      barWidth: '30%',
      barGap: '20%'
    },
    {
      name: '异常',
      type: 'bar',
      data: chartData.value.abnormal,
      itemStyle: {
        color: '#fbbf24',
        borderRadius: [2, 2, 0, 0]
      },
      barWidth: '30%'
    }
  ]
}))
</script>

<style scoped lang="scss">
.inspection-overview {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: "PingFang SC", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

// 标题区域
.section-header {
  flex: 0 0 auto;
  height: 40px;
}

// 统计区域
.inspection-stats {
  flex: 0 0 auto;
  height: 80px;
}

// 图表标题区域
.chart-header {
  flex: 0 0 auto;
  height: 40px;
}

// 图表区域
.chart-container {
  flex: 1;
  min-height: 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  margin-bottom: 0;
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
  gap: 16px;
  align-items: center;
  padding: 0 16px;
  background: #fafbfc;
  border-radius: 8px;
  margin: 0 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  flex: 1;
  border: 1px solid #f5f6f7;
  background: white;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  &.blue-card {
    border-color: #e8f2ff;
  }

  &.green-card {
    border-color: #e8f5e8;
  }

  &.red-card {
    border-color: #ffe8e8;
  }
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  i {
    font-size: 20px;
    color: white;
  }

  &.blue-icon {
    background: #3b82f6;
  }

  &.green-icon {
    background: #10b981;
  }

  &.red-icon {
    background: #ef4444;
  }
}

.stat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #333333;
  line-height: 1.2;
  margin-bottom: 2px;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

// 图表样式
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0;
  padding: 0 16px;
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin: 0;
}

.chart-legend {
  display: flex;
  gap: 20px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.chart-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0 16px;
}

.chart {
  width: 100%;
  height: 100%;
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
