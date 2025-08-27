<template>
  <div class="job-overview">
    <!-- 标题 -->
    <div class="section-header">
      <h3 class="section-title">作业概览</h3>
      <div class="header-actions">
        <button class="more-btn">...</button>
      </div>
    </div>

    <!-- 作业统计 -->
    <div class="job-stats">
      <div
        v-for="stat in jobStats"
        :key="stat.id"
        class="job-stat-item"
        :class="stat.cardClass"
      >
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
      <h4 class="chart-title">近10天执行作业数据</h4>
      <div class="chart-legend">
        <div class="legend-item">
          <div class="legend-color" style="background: #3b82f6;"></div>
          <span>REST作业</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #f97316;"></div>
          <span>命令作业</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #10b981;"></div>
          <span>脚本作业</span>
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

// 作业统计数据
const jobStats = ref([
  {
    id: 'rest-jobs',
    label: 'REST作业',
    value: '78',
    icon: 'fas fa-globe',
    iconClass: 'blue-icon',
    cardClass: 'blue-card'
  },
  {
    id: 'command-jobs',
    label: '命令作业',
    value: '2',
    icon: 'fas fa-terminal',
    iconClass: 'orange-icon',
    cardClass: 'orange-card'
  },
  {
    id: 'script-jobs',
    label: '脚本作业',
    value: '56',
    icon: 'fas fa-file-code',
    iconClass: 'green-icon',
    cardClass: 'green-card'
  }
])

// 图表数据
const chartData = ref({
  dates: ['07/01', '07/02', '07/03', '07/04', '07/05', '07/06', '07/07', '07/08', '07/09', '07/10'],
  restJobs: [180, 200, 170, 220, 240, 210, 230, 200, 190, 220],
  commandJobs: [80, 100, 90, 120, 130, 110, 140, 120, 100, 130],
  scriptJobs: [150, 170, 140, 180, 190, 160, 200, 180, 160, 190]
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
      name: 'REST作业',
      type: 'bar',
      data: chartData.value.restJobs,
      itemStyle: {
        color: '#3b82f6',
        borderRadius: [2, 2, 0, 0]
      },
      barWidth: '20%',
      barGap: '20%'
    },
    {
      name: '命令作业',
      type: 'bar',
      data: chartData.value.commandJobs,
      itemStyle: {
        color: '#f97316',
        borderRadius: [2, 2, 0, 0]
      },
      barWidth: '20%'
    },
    {
      name: '脚本作业',
      type: 'bar',
      data: chartData.value.scriptJobs,
      itemStyle: {
        color: '#10b981',
        borderRadius: [2, 2, 0, 0]
      },
      barWidth: '20%'
    }
  ]
}))
</script>

<style scoped lang="scss">
.job-overview {
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
.job-stats {
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
  background: transparent;
  border: none;
  color: #6b7280;
  font-size: 12px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  transition: all 0.3s ease;

  &:hover {
    background: #f8f9fa;
    color: #374151;
  }
}

// 作业统计样式
.job-stats {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 0 16px;
  background: #fafbfc;
  border-radius: 8px;
  margin: 0 16px;
}

.job-stat-item {
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

  &.orange-card {
    border-color: #fff4e6;
  }

  &.green-card {
    border-color: #e8f5e8;
  }
}

.stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  flex-shrink: 0;

  i {
    font-size: 24px;
    color: white;
  }

  &.blue-icon {
    background: #3b82f6;
  }

  &.orange-icon {
    background: #f97316;
  }

  &.green-icon {
    background: #10b981;
  }
}

.stat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #333333;
  line-height: 1.2;
}



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
  height: 180px;
  min-height: 180px;
}

.chart {
  width: 100%;
  height: 180px;
}

// 响应式设计
@media (max-width: 768px) {
  .job-overview {
    padding: 16px;
  }

  .job-stats {
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
