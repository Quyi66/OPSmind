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
      <TypeCountCard
        v-for="stat in jobStats"
        :key="stat.id"
        :type-name="stat.label"
        :count="stat.value"
        :icon="stat.icon"
        :icon-type="stat.iconType"
        @click="handleStatClick(stat.id)"
      />
    </div>

    <!-- 图表标题和图例 -->
    <div class="chart-header">
      <h4 class="chart-title">近10天执行作业数据</h4>
      <div class="chart-legend">
        <div class="legend-item">
          <div class="legend-color" style="background: #3b82f6"></div>
          <span>REST作业</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #60a5fa"></div>
          <span>命令作业</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #10b981"></div>
          <span>脚本作业</span>
        </div>
      </div>
    </div>

    <!-- ECharts图表容器 -->
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

import TypeCountCard from './TypeCountCard.vue'

use([CanvasRenderer, BarChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])

// 作业统计数据
const jobStats = ref([
  {
    id: 'rest-jobs',
    label: 'REST作业',
    value: '78',
    icon: new URL('@/assets/icons/dashboard/icon-job-rest@2x.png', import.meta.url).href,
    iconType: 'image'
  },
  {
    id: 'command-jobs',
    label: '命令作业',
    value: '2',
    icon: new URL('@/assets/icons/dashboard/icon-job-cmd@2x.png', import.meta.url).href,
    iconType: 'image'
  },
  {
    id: 'script-jobs',
    label: '脚本作业',
    value: '56',
    icon: new URL('@/assets/icons/dashboard/icon-job-shell@2x.png', import.meta.url).href,
    iconType: 'image'
  }
])

// 处理统计卡片点击事件
const handleStatClick = statId => {
  console.log('Clicked stat:', statId)
  // 这里可以添加具体的点击处理逻辑
}

// 生成近10天日期
const generateLast10Days = () => {
  const dates = []
  const today = new Date()

  for (let i = 9; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    dates.push(`${month}/${day}`)
  }

  return dates
}

// 图表数据
const chartData = ref({
  dates: generateLast10Days(),
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
    left: 50,
    right: 20,
    bottom: 50,
    top: 20,
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
      barWidth: '18%',
      barGap: '20%'
    },
    {
      name: '命令作业',
      type: 'bar',
      data: chartData.value.commandJobs,
      itemStyle: {
        color: '#60a5fa',
        borderRadius: [2, 2, 0, 0]
      },
      barWidth: '18%'
    },
    {
      name: '脚本作业',
      type: 'bar',
      data: chartData.value.scriptJobs,
      itemStyle: {
        color: '#10b981',
        borderRadius: [2, 2, 0, 0]
      },
      barWidth: '18%'
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

// 标题区域
.section-header {
  flex: 0 0 auto;
  height: 40px;
}

// 统计区域
.job-stats {
  flex: 0 0 auto;
  height: 92px; // 60px卡片高度 + 32px padding (16px * 2)
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
  padding: 16px;
  background: #fafbfc;
  border-radius: 8px;
  margin: 0 16px;
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
  height: 200px;
  min-height: 200px;
}

.chart {
  width: 100%;
  height: 200px;
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
