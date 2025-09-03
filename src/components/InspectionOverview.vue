<template>
  <div class="inspection-overview">
    <!-- 标题 -->
    <div class="section-header">
      <h3 class="section-title">巡检概览</h3>
      <div class="header-actions">
        <button class="more-btn">...</button>
      </div>
    </div>

    <!-- 巡检统计 -->
    <div class="inspection-stats">
      <TypeCountCard
        v-for="stat in inspectionStats"
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
      <h4 class="chart-title">近10天巡检结果情况</h4>
      <div class="chart-legend">
        <div class="legend-item">
          <div class="legend-color" style="background: #10b981"></div>
          <span>正常</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #fbbf24"></div>
          <span>异常</span>
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

// 巡检统计数据
const inspectionStats = ref([
  {
    id: 'total-inspections',
    label: '本月巡检次数',
    value: '23',
    icon: new URL('@/assets/icons/dashboard/icon-gfs-curentmonth@2x.png', import.meta.url).href,
    iconType: 'image'
  },
  {
    id: 'normal-inspections',
    label: '正常',
    value: '23',
    icon: new URL('@/assets/icons/dashboard/icon-gfs-normal@2x.png', import.meta.url).href,
    iconType: 'image'
  },
  {
    id: 'abnormal-inspections',
    label: '异常',
    value: '9',
    icon: new URL('@/assets/icons/dashboard/icon-gfs-except@2x.png', import.meta.url).href,
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
      name: '正常',
      type: 'bar',
      data: chartData.value.normal,
      itemStyle: {
        color: '#10b981',
        borderRadius: [2, 2, 0, 0]
      },
      barWidth: '22%',
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
      barWidth: '22%'
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
.inspection-stats {
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

// 巡检统计样式
.inspection-stats {
  display: flex;
  gap: 12px; /* 收紧卡片间距 */
  align-items: center;
  padding: 12px 12px; /* 收紧左右内边距 */
  background: #fafbfc;
  border-radius: 8px;
  margin: 0 12px; /* 收紧左右外边距 */
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
  height: 200px;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  padding: 0 16px;
}

.chart {
  width: 100%;
  height: 200px;
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
