<template>
  <div class="job-overview">
    <!-- 标题 -->
    <div class="section-header">
      <h3 class="section-title">
        <img
          :src="jobHeaderIcon"
          alt="作业概览"
          class="section-icon"
        />
        作业概览
      </h3>
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
import { computed } from 'vue'
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
import { useDashboardStore } from '@/stores/dashboard'

use([CanvasRenderer, BarChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])

// 标题图标
const jobHeaderIcon = new URL('@/assets/icons/dashboard/icon-jobview@2x.png', import.meta.url).href

const dashboardStore = useDashboardStore()

// 作业统计（来自 API 数据）
const jobStats = computed(() => {
  const totals = dashboardStore.dashboardFullData?.totalJobStats
  return [
    {
      id: 'rest-jobs',
      label: 'REST作业',
      value: totals?.restJobs ?? 0,
      icon: new URL('@/assets/icons/dashboard/icon-job-rest@2x.png', import.meta.url).href,
      iconType: 'image'
    },
    {
      id: 'command-jobs',
      label: '命令作业',
      value: totals?.commandJobs ?? 0,
      icon: new URL('@/assets/icons/dashboard/icon-job-cmd@2x.png', import.meta.url).href,
      iconType: 'image'
    },
    {
      id: 'script-jobs',
      label: '脚本作业',
      value: totals?.scriptJobs ?? 0,
      icon: new URL('@/assets/icons/dashboard/icon-job-shell@2x.png', import.meta.url).href,
      iconType: 'image'
    }
  ]
})

// 处理统计卡片点击事件
const handleStatClick = statId => {
  console.log('Clicked stat:', statId)
  // 这里可以添加具体的点击处理逻辑
}

// 图表数据（来自 API 数据）
const chartData = computed(() => {
  const list = dashboardStore.dashboardFullData?.recentJobStats || []
  return {
    dates: list.map(i => i.date.replace('-', '/')),
    restJobs: list.map(i => i.restJobs),
    commandJobs: list.map(i => i.commandJobs),
    scriptJobs: list.map(i => i.scriptJobs)
  }
})

// Y 轴最大值与刻度：
// - 刻度始终为 5 段，间隔为 5 的倍数
// - 最小 yMax = 25（即 0,5,10,15,20,25）
// - 根据数据最大值 +10% 余量，计算最小需要的步长，再向上取整到 5 的倍数
const yMax = computed(() => {
  const d = chartData.value
  const all = [
    ...(Array.isArray(d.restJobs) ? d.restJobs : []),
    ...(Array.isArray(d.commandJobs) ? d.commandJobs : []),
    ...(Array.isArray(d.scriptJobs) ? d.scriptJobs : [])
  ].map(v => (typeof v === 'number' && isFinite(v) ? v : Number(v) || 0))

  const rawMax = Math.max(0, ...all)
  const minYMax = 25

  if (rawMax <= 0) return minYMax

  // 加 10% 余量
  const withMargin = rawMax + Math.ceil(rawMax * 0.1)
  // 计算最小步长（5 段），并向上取整到 5 的倍数，使 interval 始终是 5 的倍数
  const minStep = Math.ceil(withMargin / 5)
  const step = Math.max(5, Math.ceil(minStep / 5) * 5) // 步长为 5 的倍数，且至少为 5
  const yMaxVal = step * 5
  return Math.max(minYMax, yMaxVal)
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
      margin: 10,
      hideOverlap: true
    },
    axisTick: {
      show: false
    }
  },
  yAxis: {
    type: 'value',
    min: 0,
    max: yMax.value,
    interval: Math.max(1, yMax.value / 5), // 此处将为 5 的倍数
    splitNumber: 5,
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
  display: flex;
  align-items: center;
  gap: 6px;
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

.section-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

// 作业统计样式
.job-stats {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 16px;
  background: #fafbfc;
  border-radius: 4px;
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
  /* 中等屏高下更充裕，但避免溢出导致轴被裁切 */
  min-height: clamp(210px, 26vh, 280px);
}

.chart {
  width: 100%;
  height: 100%;
  min-height: clamp(210px, 26vh, 280px);
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
