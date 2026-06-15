<template>
  <div ref="statsViewRef" class="stats-view">
    <div ref="statsContentRef" class="stats-content">
      <section class="chart-section chart-section--trend" :style="chartSectionStyle">
        <header class="chart-section__header">
          <h4 class="chart-section__title">最近30天执行趋势</h4>
          <el-button
            class="toolbar-icon-btn"
            circle
            size="small"
            :loading="contentLoading"
            @click="handleRefresh"
            title="刷新"
          >
            <el-icon v-show="!contentLoading"><RefreshRight /></el-icon>
          </el-button>
        </header>
        <div v-loading="statsLoading" class="chart-section__body chart-section__body--trend">
          <el-empty v-if="!statsLoading && !recentTrendRows.length" description="暂无统计数据" />
          <VChart
            v-else-if="recentTrendRows.length"
            autoresize
            :option="recentTrendOption"
            class="chart-view"
          />
        </div>
      </section>

      <section
        class="chart-section chart-section--summary"
        :style="{ height: chartSectionHeight ? chartSectionHeight + 50 + 'px' : 'auto' }"
      >
        <header class="chart-section__header">
          <h4 class="chart-section__title">运维工具运行次数排行</h4>
          <el-input
            v-model="summaryQuery"
            clearable
            size="small"
            class="summary-search"
            placeholder="搜索运维工具"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </header>
        <div v-loading="summaryLoading" class="chart-section__body chart-section__body--summary">
          <el-empty v-if="!summaryLoading && !filteredSummary.length" description="暂无统计数据" />
          <VChart
            v-else-if="filteredSummary.length"
            autoresize
            :option="summaryChartOption"
            class="chart-view"
          />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { RefreshRight, Search } from '@element-plus/icons-vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart } from 'echarts/charts'
import { DataZoomComponent, GridComponent, TooltipComponent } from 'echarts/components'
import * as jaoApi from '@/modules/automation/api/jao'
import { translateText } from '@/utils/i18n'
import { useTheme } from '@/composables/useTheme'

use([CanvasRenderer, BarChart, LineChart, DataZoomComponent, GridComponent, TooltipComponent])

const statsLoading = ref(false)
const summaryLoading = ref(false)
const rawData = ref([])
const summaryRows = ref([])
const summaryQuery = ref('')
const statsViewRef = ref(null)
const statsContentRef = ref(null)
const chartSectionHeight = ref(0)
const { isDark } = useTheme()

const DESKTOP_BREAKPOINT = 900
const CONTENT_GAP = 12
const MIN_SECTION_HEIGHT = 320
let resizeObserver = null

onMounted(() => {
  handleRefresh()
  nextTick(() => {
    updateChartSectionHeight()
  })
  window.addEventListener('resize', handleResize)

  if (statsViewRef.value && window.ResizeObserver) {
    resizeObserver = new ResizeObserver(() => {
      updateChartSectionHeightChartSectionHeight()
    })
    resizeObserver.observe(statsViewRef.value)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})

function handleResize() {
  updateChartSectionHeight()
}

function updateChartSectionHeight() {
  const contentEl = statsContentRef.value
  if (!contentEl || window.innerWidth <= DESKTOP_BREAKPOINT) {
    chartSectionHeight.value = 0
    return
  }

  const contentHeight = Math.floor(contentEl.getBoundingClientRect().height)
  if (!contentHeight) return

  chartSectionHeight.value = Math.max(
    Math.floor((contentHeight - CONTENT_GAP) / 2),
    MIN_SECTION_HEIGHT
  )
}

async function fetchStats() {
  statsLoading.value = true
  try {
    const response = await jaoApi.fetchJobStats()
    const data = response?.data || response
    rawData.value = data.records || []
  } catch (error) {
    ElMessage.error(error?.message || '获取统计数据失败')
  } finally {
    statsLoading.value = false
  }
}

async function fetchRunCounts() {
  summaryLoading.value = true
  try {
    const response = await jaoApi.fetchJobRunCounts()
    const data = response?.data || response
    summaryRows.value = (data.records || []).map(item => ({
      job_id: item.job_id,
      job_title: item.job_title || '未命名运维工具',
      run_count: Number(item.run_count) || 0
    }))
  } catch (error) {
    ElMessage.error(error?.message || '获取运行次数失败')
  } finally {
    summaryLoading.value = false
  }
}

async function handleRefresh() {
  await Promise.all([fetchStats(), fetchRunCounts()])
  nextTick(() => {
    updateChartSectionHeight()
  })
}

const contentLoading = computed(() => statsLoading.value || summaryLoading.value)
const chartSectionStyle = computed(() =>
  chartSectionHeight.value ? { height: `${chartSectionHeight.value}px` } : undefined
)

const recentTrendRows = computed(() => {
  const byDate = new Map()

  rawData.value.forEach(item => {
    if (!item.start_date) return
    const count = Number(item.run_count) || 0
    byDate.set(item.start_date, (byDate.get(item.start_date) || 0) + count)
  })

  return Array.from(byDate.entries())
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    .map(([date, count]) => ({ date, count }))
})

const translatedSummaryRows = computed(() =>
  summaryRows.value.map(row => ({
    ...row,
    translatedTitle: translateText(row.job_title) || row.job_title || '-'
  }))
)

const filteredSummary = computed(() => {
  const keyword = summaryQuery.value.trim().toLowerCase()
  const baseRows = keyword
    ? translatedSummaryRows.value.filter(row => row.translatedTitle.toLowerCase().includes(keyword))
    : translatedSummaryRows.value

  return [...baseRows].sort((a, b) => b.run_count - a.run_count)
})

const chartTheme = computed(() =>
  isDark.value
    ? {
        trendLine: '#60a5fa',
        axisText: '#94a3b8',
        axisLine: '#475569',
        splitLine: 'rgba(71, 85, 105, 0.46)',
        trendLabel: '#bfdbfe',
        trendArea: 'rgba(96, 165, 250, 0.18)',
        summaryAxis: '#cbd5e1',
        summaryLabel: '#e2e8f0',
        summaryGradientStart: '#818cf8',
        summaryGradientEnd: '#c4b5fd'
      }
    : {
        trendLine: '#2563eb',
        axisText: '#64748b',
        axisLine: '#cbd5e1',
        splitLine: '#e2e8f0',
        trendLabel: '#1e3a8a',
        trendArea: 'rgba(37, 99, 235, 0.12)',
        summaryAxis: '#334155',
        summaryLabel: '#475569',
        summaryGradientStart: '#6366f1',
        summaryGradientEnd: '#a78bfa'
      }
)

const recentTrendOption = computed(() => ({
  color: [chartTheme.value.trendLine],
  tooltip: {
    trigger: 'axis'
  },
  grid: {
    left: 48,
    right: 24,
    top: 36,
    bottom: 64
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: recentTrendRows.value.map(item => item.date),
    axisLabel: {
      color: chartTheme.value.axisText,
      interval: 0,
      hideOverlap: false,
      rotate: 40
    },
    axisLine: {
      lineStyle: {
        color: chartTheme.value.axisLine
      }
    }
  },
  yAxis: {
    type: 'value',
    axisLabel: {
      color: chartTheme.value.axisText
    },
    splitLine: {
      lineStyle: {
        color: chartTheme.value.splitLine
      }
    }
  },
  series: [
    {
      name: '执行次数',
      type: 'line',
      smooth: true,
      symbolSize: 8,
      label: {
        show: true,
        position: 'top',
        color: chartTheme.value.trendLabel,
        fontSize: 11,
        formatter: ({ value }) => `${value ?? 0}`
      },
      data: recentTrendRows.value.map(item => item.count),
      areaStyle: {
        color: chartTheme.value.trendArea
      },
      lineStyle: {
        width: 3
      }
    }
  ]
}))

const summaryChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow'
    }
  },
  dataZoom:
    filteredSummary.value.length > 12
      ? [
          {
            type: 'inside',
            yAxisIndex: 0,
            startValue: 0,
            endValue: 11,
            zoomLock: false,
            zoomOnMouseWheel: false,
            moveOnMouseWheel: false
          },
          {
            type: 'slider',
            yAxisIndex: 0,
            orient: 'vertical',
            right: 8,
            top: 16,
            bottom: 24,
            width: 12,
            startValue: 0,
            endValue: 11,
            brushSelect: false
          }
        ]
      : [],
  grid: {
    left: 180,
    right: filteredSummary.value.length > 12 ? 42 : 24,
    top: 16,
    bottom: 24
  },
  xAxis: {
    type: 'value',
    axisLabel: {
      color: chartTheme.value.axisText
    },
    splitLine: {
      lineStyle: {
        color: chartTheme.value.splitLine
      }
    }
  },
  yAxis: {
    type: 'category',
    inverse: true,
    data: filteredSummary.value.map(row => row.translatedTitle),
    axisLabel: {
      color: chartTheme.value.summaryAxis,
      width: 150,
      overflow: 'truncate'
    },
    axisLine: {
      show: false
    },
    axisTick: {
      show: false
    }
  },
  series: [
    {
      name: '运行次数',
      type: 'bar',
      barWidth: 16,
      data: filteredSummary.value.map(row => row.run_count),
      label: {
        show: true,
        position: 'right',
        color: chartTheme.value.summaryLabel,
        fontWeight: 600
      },
      itemStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 1,
          y2: 0,
          colorStops: [
            { offset: 0, color: chartTheme.value.summaryGradientStart },
            { offset: 1, color: chartTheme.value.summaryGradientEnd }
          ]
        },
        borderRadius: [0, 8, 8, 0]
      }
    }
  ]
}))
</script>

<style scoped>
.stats-view {
  --stats-chart-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  min-height: 0;
  max-width: 100%;
  background: var(--el-bg-color);
  overflow: hidden;
}

.stats-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  overflow: hidden;
}

.chart-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  padding: 16px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 16px;
  box-shadow: var(--stats-chart-shadow);
}

.chart-section--trend {
  flex: 1 1 auto;
}

.chart-section--summary {
  flex: 1 1 auto;
}

.chart-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.chart-section__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.chart-section__body {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
}

.chart-section__body--trend {
  min-height: 280px;
}

.chart-section__body--summary {
  min-height: 320px;
}

.chart-view {
  width: 100%;
  height: 100%;
}

.summary-search {
  width: 220px;
}

@media (max-width: 900px) {
  .stats-view {
    overflow: auto;
  }

  .stats-content {
    overflow: visible;
  }

  .summary-search {
    width: 100%;
  }

  .chart-section__header {
    align-items: stretch;
    flex-direction: column;
  }

  .chart-section--trend,
  .chart-section--summary {
    flex: none;
  }
}
</style>

<style lang="scss">
html.dark .stats-view {
  --stats-chart-shadow: 0 16px 32px rgba(0, 0, 0, 0.22);
}
</style>
