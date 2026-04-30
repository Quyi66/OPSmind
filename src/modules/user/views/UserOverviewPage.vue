<template>
  <div class="ops-page-layout overview-page">
    <!-- 统计卡片 (KPI) -->
    <div class="stat-cards">
      <div
        v-for="stat in statCards"
        :key="stat.key"
        class="stat-card"
        :class="[`stat-card--${stat.color}`, { 'stat-card--clickable': stat.linkView }]"
        @click="handleCardClick(stat)"
      >
        <div class="stat-card__icon">
          <i :class="stat.icon"></i>
        </div>
        <div class="stat-card__content">
          <div class="stat-card__value">{{ stat.value }}</div>
          <div class="stat-card__label">{{ stat.label }}</div>
        </div>
      </div>
    </div>

    <!-- 十五天内操作统计 (Line Chart) -->
    <div class="chart-section chart-section--flex">
      <div class="chart-section__title">十五天内操作统计</div>
      <div class="chart-section__content chart-section__content--flex">
        <div class="chart-legend">
          <span class="legend-item">
            <span class="dot dot--total"></span>
            总数
          </span>
          <span class="legend-item">
            <span class="dot dot--success"></span>
            已完成
          </span>
          <span class="legend-item">
            <span class="dot dot--failed"></span>
            失败
          </span>
          <span class="legend-item">
            <span class="dot dot--running"></span>
            正在运行
          </span>
        </div>
        <div
          ref="chartRef"
          class="chart-container chart-container--flex"
          v-loading="chartLoading"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch, inject } from 'vue'
import * as echarts from 'echarts'
import * as userApi from '@/modules/user/api'
import { useTheme } from '@/composables/useTheme'

const { isDark } = useTheme()

// 注入父组件提供的导航方法
const handleNavigate = inject('handleNavigate', null)

// 统计卡片数据 (mapping from LUPM_STATISTICS)
const statCards = ref([
  {
    key: 'hostTotal',
    label: '主机',
    value: 0,
    icon: 'fab fa-linux',
    color: 'blue',
    linkView: 'users',
    pageParams: {}
  },
  {
    key: 'userTotal',
    label: '用户',
    value: 0,
    icon: 'fa fa-user-alt',
    color: 'gray',
    linkView: 'users',
    pageParams: {}
  },
  {
    key: 'errorUserTotal',
    label: '异常用户',
    value: 0,
    icon: 'fa fa-user-slash',
    color: 'orange',
    linkView: 'users',
    pageParams: { status: 'error' }
  },
  {
    key: 'groupTotal',
    label: '用户组',
    value: 0,
    icon: 'fa fa-user-friends',
    color: 'gray',
    linkView: 'groups',
    pageParams: {}
  },
  {
    key: 'oneMonthTotal',
    label: '近一月操作',
    value: 0,
    icon: 'fa fa-running',
    color: 'gray',
    linkView: 'logs',
    pageParams: { day: '30' }
  },
  {
    key: 'failedTotal',
    label: '操作失败数',
    value: 0,
    icon: 'fa fa-exclamation-triangle',
    color: 'red',
    linkView: 'logs',
    pageParams: { day: '365', status: 'ERROR,FAILED' }
  }
])

// 处理卡片点击，跳转到对应视图
function handleCardClick(stat) {
  if (stat.linkView && handleNavigate) {
    handleNavigate({ view: stat.linkView, params: stat.pageParams })
  } else {
    console.error('OverviewView - handleNavigate not available or no linkView')
  }
}

// 图表相关
const chartRef = ref(null)
const chartData = ref([])
const chartLoading = ref(false)
let chartInstance = null

// 加载统计数据
async function loadStats() {
  try {
    const response = await userApi.getOverviewStats()
    const records = response?.records || response?.data?.records || []
    const data = records[0] || {}

    statCards.value[0].value = data.hostTotal ?? 0
    statCards.value[1].value = data.userTotal ?? 0
    statCards.value[2].value = data.errorUserTotal ?? 0
    statCards.value[3].value = data.groupTotal ?? 0
    statCards.value[4].value = data.oneMonthTotal ?? 0
    statCards.value[5].value = data.failedTotal ?? 0
  } catch (error) {
    console.error('Failed to load stats:', error)
  }
}

// 加载图表数据
async function loadChartData() {
  chartLoading.value = true
  try {
    const response = await userApi.getAuditLogStats(15)
    chartData.value = response?.records || response?.data?.records || []
    await nextTick()
    initChart()
  } catch (error) {
    console.error('Failed to load chart data:', error)
    chartData.value = []
  } finally {
    chartLoading.value = false
  }
}

// 初始化ECharts图表
function initChart() {
  if (!chartRef.value) return

  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }

  chartInstance = echarts.init(chartRef.value, isDark.value ? 'dark' : '')

  const days = 15
  const dateMap = new Map()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    dateMap.set(dateStr, {
      total: 0,
      completedCount: 0,
      failedCount: 0,
      runningCount: 0
    })
  }

  chartData.value.forEach(item => {
    const dateStr = item.auditDate
    if (dateMap.has(dateStr)) {
      dateMap.set(dateStr, {
        total: item.total || 0,
        completedCount: item.completedCount || 0,
        failedCount: item.failedCount || 0,
        runningCount: item.runningCount || 0
      })
    }
  })

  const xData = []
  const totalData = []
  const completedData = []
  const failedData = []
  const runningData = []

  dateMap.forEach((value, key) => {
    const date = new Date(key)
    xData.push(`${date.getMonth() + 1}-${date.getDate()}`)
    totalData.push(value.total)
    completedData.push(value.completedCount)
    failedData.push(value.failedCount)
    runningData.push(value.runningCount)
  })

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDark.value ? 'var(--el-bg-color-overlay)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: isDark.value ? 'var(--el-border-color-light)' : '#e2e8f0',
      textStyle: { color: isDark.value ? 'var(--el-text-color-primary)' : '#1e293b' },
      extraCssText: 'box-shadow: var(--el-box-shadow-light);'
    },
    grid: {
      left: '10px',
      right: '20px',
      bottom: '10px',
      top: '20px',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xData,
      axisLabel: { color: isDark.value ? 'var(--el-text-color-secondary)' : '#64748b', margin: 12 },
      axisLine: { lineStyle: { color: isDark.value ? 'var(--el-border-color)' : '#e2e8f0' } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: isDark.value ? 'var(--el-text-color-secondary)' : '#64748b' },
      splitLine: { lineStyle: { color: isDark.value ? 'var(--el-border-color-light)' : '#f1f5f9' } }
    },
    series: [
      {
        name: '总数',
        type: 'line',
        data: totalData,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#3b82f6', width: 3 },
        itemStyle: { color: '#3b82f6' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(59, 130, 246, 0.15)' },
            { offset: 1, color: 'rgba(59, 130, 246, 0)' }
          ])
        }
      },
      {
        name: '已完成',
        type: 'line',
        data: completedData,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#10b981', width: 2 },
        itemStyle: { color: '#10b981' }
      },
      {
        name: '失败',
        type: 'line',
        data: failedData,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#ef4444', width: 2 },
        itemStyle: { color: '#ef4444' }
      },
      {
        name: '正在运行',
        type: 'line',
        data: runningData,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#f59e0b', width: 2 },
        itemStyle: { color: '#f59e0b' }
      }
    ]
  }

  chartInstance.setOption(option)
}

function handleResize() {
  chartInstance?.resize()
}

let resizeObserver = null

onMounted(() => {
  loadStats()
  loadChartData()
  window.addEventListener('resize', handleResize)

  if (chartRef.value) {
    resizeObserver = new ResizeObserver(() => {
      chartInstance?.resize()
    })
    resizeObserver.observe(chartRef.value)
  }
})

watch(isDark, () => {
  nextTick(() => {
    initChart()
    if (chartInstance) {
      chartInstance.resize()
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})
</script>

<style scoped lang="scss">
@use '../styles/common.scss' as *;

.overview-page {
  overflow-y: auto;
}

.chart-section--flex {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  margin-bottom: 0;
}

.chart-section__content--flex {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;

  &--total {
    background: #3b82f6;
  }

  &--success {
    background: #10b981;
  }

  &--failed {
    background: #ef4444;
  }

  &--running {
    background: #f59e0b;
  }
}

.chart-container--flex {
  flex: 1;
  min-height: 280px;
  border-radius: 8px;
}

.chart-loading,
.chart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 8px;
  color: var(--el-text-color-secondary);
  font-size: 14px;

  i {
    font-size: 24px;
  }
}
</style>
