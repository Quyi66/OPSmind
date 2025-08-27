<template>
  <div class="job-overview">
    <div class="section-header">
      <h3 class="section-title">作业概览</h3>
      <div class="header-actions">
        <button class="more-btn">更多</button>
      </div>
    </div>

    <!-- 作业统计 -->
    <div class="job-stats">
      <div
        v-for="stat in jobStats"
        :key="stat.id"
        class="job-stat-item"
        :class="stat.type"
      >
        <div class="stat-icon" :class="stat.iconClass">
          <i :class="stat.icon"></i>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
      </div>
    </div>

    <!-- 图表标题 -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-medium text-gray-900">近10天执行作业数据</h3>
      <div class="flex items-center space-x-4">
        <span class="text-xs text-gray-500">单位：次</span>
        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-1">
            <div class="w-3 h-3 bg-blue-500 rounded"></div>
            <span class="text-xs text-gray-600">REST作业</span>
          </div>
          <div class="flex items-center space-x-1">
            <div class="w-3 h-3 bg-blue-400 rounded"></div>
            <span class="text-xs text-gray-600">合令作业</span>
          </div>
          <div class="flex items-center space-x-1">
            <div class="w-3 h-3 bg-green-500 rounded"></div>
            <span class="text-xs text-gray-600">脚本作业</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 图表容器 -->
    <div class="h-48 flex items-end justify-between space-x-2">
      <div v-for="(day, index) in chartData.dates" :key="index" class="flex-1 flex flex-col items-center">
        <div class="w-full flex flex-col items-center space-y-1 mb-2">
          <div class="w-full bg-blue-500 rounded-t" :style="`height: ${chartData.restJobs[index] / 5}px`"></div>
          <div class="w-full bg-blue-400 rounded" :style="`height: ${chartData.commandJobs[index] / 5}px`"></div>
          <div class="w-full bg-green-500 rounded-b" :style="`height: ${chartData.scriptJobs[index] / 5}px`"></div>
        </div>
        <span class="text-xs text-gray-500">{{ day }}</span>
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
    type: 'primary'
  },
  {
    id: 'command-jobs',
    label: '命令作业',
    value: '2',
    icon: 'fas fa-terminal',
    iconClass: 'orange-icon',
    type: 'warning'
  },
  {
    id: 'script-jobs',
    label: '脚本作业',
    value: '56',
    icon: 'fas fa-file-code',
    iconClass: 'green-icon',
    type: 'success'
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
      name: 'REST作业',
      type: 'bar',
      data: chartData.value.restJobs,
      itemStyle: {
        color: '#2D8CF0'
      },
      barWidth: '20%'
    },
    {
      name: '命令作业',
      type: 'bar',
      data: chartData.value.commandJobs,
      itemStyle: {
        color: '#19BE6B'
      },
      barWidth: '20%'
    },
    {
      name: '脚本作业',
      type: 'bar',
      data: chartData.value.scriptJobs,
      itemStyle: {
        color: '#52c41a'
      },
      barWidth: '20%'
    }
  ]
}))
</script>

<style scoped lang="scss">
.job-overview {
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

.job-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.job-stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  flex: 1;
  background: white;
  border: 1px solid #f0f0f0;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.stat-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  flex-shrink: 0;

  i {
    font-size: 16px;
    color: white;
  }

  &.blue-icon {
    background: #2D8CF0;
  }

  &.orange-icon {
    background: #FF9900;
  }

  &.green-icon {
    background: #19BE6B;
  }
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #262626;
  line-height: 1.2;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: #8c8c8c;
  font-weight: 500;
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
