<template>
  <div class="inspection-overview">
    <!-- 标题 -->
    <div class="section-header">
      <h3 class="section-title">
        <img :src="inspectionHeaderIcon" alt="巡检概览" class="section-icon" />
        巡检概览
      </h3>
      <div class="header-actions">
        <button class="more-btn" @click="navigateToInspectionOverview" title="查看全部">
          <span>查看全部</span>
          <i class="fas fa-chevron-right more-arrow"></i>
        </button>
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
    <div class="chart-header clickable-area" @click="navigateToInspectionOverview">
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
    <div class="chart-container clickable-area" @click="navigateToInspectionOverview">
      <v-chart class="chart" :option="chartOption" autoresize :theme="isDark ? 'dark' : ''" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
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

import TypeCountCard from '@/views/home/components/TypeCountCard.vue'
import { useTheme } from '@/composables/useTheme'
const { isDark } = useTheme()
import { useDashboardStore } from '@/stores/dashboard'

use([CanvasRenderer, BarChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])

// 标题图标
const inspectionHeaderIcon = new URL(
  '@/assets/icons/dashboard/icon-gfsview@2x.png',
  import.meta.url
).href

const dashboardStore = useDashboardStore()
const router = useRouter()

const navigateToInspectionOverview = () => {
  router.push({ name: 'cac-results' })
}

// 巡检统计（来自 API 数据）
const inspectionStats = computed(() => {
  const m = dashboardStore.dashboardFullData?.monthlyInspectionStats
  return [
    {
      id: 'total-inspections',
      label: '本月巡检次数',
      value: m?.monthlyInspections ?? 0,
      icon: new URL('@/assets/icons/dashboard/icon-gfs-curentmonth@2x.png', import.meta.url).href,
      iconType: 'image'
    },
    {
      id: 'normal-inspections',
      label: '正常',
      value: m?.normalInspections ?? 0,
      icon: new URL('@/assets/icons/dashboard/icon-gfs-normal@2x.png', import.meta.url).href,
      iconType: 'image'
    },
    {
      id: 'abnormal-inspections',
      label: '异常',
      value: m?.abnormalInspections ?? 0,
      icon: new URL('@/assets/icons/dashboard/icon-gfs-except@2x.png', import.meta.url).href,
      iconType: 'image'
    }
  ]
})

// 处理统计卡片点击事件
const handleStatClick = statId => {
  navigateToInspectionOverview()
}

// 图表数据（来自 API 数据）
const chartData = computed(() => {
  const list = dashboardStore.dashboardFullData?.recentInspectionStats || []
  return {
    dates: list.map(i => i.date.replace('-', '/')),
    normal: list.map(i => i.normalInspections),
    abnormal: list.map(i => i.abnormalInspections)
  }
})

// Y 轴最大值与刻度：
// - 刻度始终为 5 段，间隔为 5 的倍数
// - 最小 yMax = 25（即 0,5,10,15,20,25）
// - 根据数据最大值 +10% 余量，计算最小需要的步长，再向上取整到 5 的倍数
const yMax = computed(() => {
  const d = chartData.value
  const all = [
    ...(Array.isArray(d.normal) ? d.normal : []),
    ...(Array.isArray(d.abnormal) ? d.abnormal : [])
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
    }
  },
  grid: {
    left: 50,
    right: 20,
    bottom: 50,
    top: 20
  },
  xAxis: {
    type: 'category',
    data: chartData.value.dates,
    axisLine: {
      lineStyle: {}
    },
    axisLabel: {
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
      fontSize: 12
    },
    splitLine: {
      lineStyle: {
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

.clickable-area {
  cursor: pointer;
}

// 标题区域
.section-header {
  flex: 0 0 auto;
  height: auto;
}

// 统计区域
.inspection-stats {
  flex: 0 0 auto;
  height: 64px; // 48px卡片高度 + 16px padding (8px * 2)
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
  padding: 8px 16px;
  margin-bottom: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: transparent;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
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
  color: var(--el-text-color-regular);
  font-size: 12px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.3s ease;

  &:hover {
    background: var(--el-fill-color-light);
    color: var(--el-text-color-primary);

    .more-arrow {
      transform: translateX(2px);
    }
  }

  .more-arrow {
    font-size: 10px;
    transition: transform 0.2s ease;
    display: inline-flex;
    align-items: center;
    line-height: 1;
    margin-top: 1px;
  }
}

.section-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
  background: rgba(219, 234, 254, 0.6);
  border-radius: 4px;
  padding: 2px;
}

// 巡检统计样式
.inspection-stats {
  display: flex;
  gap: 12px; /* 收紧卡片间距 */
  align-items: center;
  padding: 8px 12px; /* 压缩内边距 */
  background: linear-gradient(135deg, var(--el-fill-color-light) 0%, rgba(219, 234, 254, 0.15) 100%);

  /* 深度重写 TypeCountCard 尺寸，以适应紧凑高度 */
  :deep(.type-count-card) {
    height: 48px;
    padding: 6px 12px;
    gap: 8px;
  }

  :deep(.icon-container) {
    width: 28px;
    height: 28px;
    font-size: 16px;

    .icon-image {
      width: 24px;
      height: 24px;
    }
  }

  :deep(.type-name) {
    font-size: 12px;
  }

  :deep(.type-count) {
    font-size: 16px;
  }
  border-radius: 4px;
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
  color: var(--el-text-color-primary);
  margin: 0;
  padding-left: 10px;
  border-left: 3px solid #10b981;
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
  color: var(--el-text-color-regular);
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.chart-container {
  flex: 1;
  /* 调整缩小的行高下能够自适应收缩，防止溢出裁切 */
  min-height: clamp(140px, 18vh, 200px);
  display: flex;
  flex-direction: column;
  padding: 0 16px;
}

.chart {
  width: 100%;
  height: 100%;
  min-height: clamp(140px, 18vh, 200px);
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
