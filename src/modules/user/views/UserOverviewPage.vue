<template>
  <div class="ops-page-layout overview-page">
    <div class="overview-toolbar">
      <span>{{ t('hostUser.userAndOperationStatistics') }}</span>
      <el-button size="small" :loading="statsLoading || chartLoading" @click="refreshOverview">
        {{ t('common.refresh') }}
      </el-button>
    </div>
    <div v-if="statsError" class="read-feedback" role="status">
      <el-alert :title="statsError" type="warning" :closable="false" />
      <el-button v-if="!statsAuthError" size="small" :loading="statsLoading" @click="loadStats">
        {{ t('hostUser.retryUserStatistics') }}
      </el-button>
    </div>
    <p v-else-if="statsLoading || statsNotice" class="read-note">
      {{ statsLoading ? t('hostUser.readingUserStatistics') : statsNotice }}
    </p>
    <!-- 统计卡片 (KPI) -->
    <div class="stat-cards">
      <div
        v-for="stat in statCards"
        :key="stat.key"
        class="stat-card"
        :class="[`stat-card--${stat.color}`, { 'stat-card--clickable': stat.linkView }]"
        :role="stat.linkView ? 'button' : undefined"
        :tabindex="stat.linkView && !statsAuthError ? 0 : undefined"
        :aria-disabled="stat.linkView ? statsAuthError : undefined"
        :title="
          stat.key === 'errorUserTotal'
            ? t('hostUser.filteringUsersWithIssuesIsUnavailableInThe')
            : t('hostUser.viewTheRelatedList')
        "
        @click="handleCardClick(stat)"
        @keydown.enter="handleCardClick(stat)"
        @keydown.space.prevent="handleCardClick(stat)"
      >
        <div class="stat-card__icon">
          <i :class="stat.icon"></i>
        </div>
        <div class="stat-card__content">
          <div class="stat-card__value">{{ stat.value ?? '—' }}</div>
          <div class="stat-card__label">{{ stat.label }}</div>
        </div>
      </div>
    </div>

    <!-- 十五天内操作统计 (Line Chart) -->
    <div class="chart-section chart-section--flex">
      <div class="chart-section__title">{{ t('hostUser.operationsInTheLast15Days') }}</div>
      <p class="read-note">{{ t('hostUser.displaysReportedDatesAndCountsMissingValuesAre') }}</p>
      <div class="chart-section__content chart-section__content--flex">
        <div v-if="chartError" class="read-feedback" role="status">
          <el-alert :title="chartError" type="warning" :closable="false" />
          <el-button
            v-if="!chartAuthError"
            size="small"
            :loading="chartLoading"
            @click="loadChartData"
          >
            {{ t('hostUser.retryOperationStatistics') }}
          </el-button>
        </div>
        <p v-else-if="chartNotice" class="read-note">{{ chartNotice }}</p>
        <div class="chart-legend">
          <span class="legend-item">
            <span class="dot dot--total"></span>
            {{ t('hostUser.total') }}
          </span>
          <span class="legend-item">
            <span class="dot dot--success"></span>
            {{ t('hostUser.completed') }}
          </span>
          <span class="legend-item">
            <span class="dot dot--failed"></span>
            {{ t('hostUser.failed2') }}
          </span>
          <span class="legend-item">
            <span class="dot dot--running"></span>
            {{ t('hostUser.running2') }}
          </span>
        </div>
        <div class="chart-frame" v-loading="chartLoading">
          <div
            v-show="chartReady"
            ref="chartRef"
            class="chart-container chart-container--flex"
          ></div>
          <div v-if="!chartReady" class="chart-empty">
            {{
              chartLoading
                ? t('hostUser.readingOperationStatistics')
                : chartError
                  ? t('hostUser.unableToReadOperationStatistics')
                  : t('hostUser.noOperationStatisticsAvailableForTheLast15')
            }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { message, messageRef } from '@/core/i18n/feedback'

import { t, currentLocale } from '@/core/i18n'

import {
  ref,
  onMounted,
  onBeforeUnmount,
  onActivated,
  onDeactivated,
  nextTick,
  watch,
  inject
} from 'vue'
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
    get label() {
      return t('hostUser.hosts')
    },
    value: null,
    icon: 'fab fa-linux',
    color: 'blue',
    linkView: 'users',
    pageParams: {}
  },
  {
    key: 'userTotal',
    get label() {
      return t('common.user')
    },
    value: null,
    icon: 'fa fa-user-alt',
    color: 'gray',
    linkView: 'users',
    pageParams: {}
  },
  {
    key: 'errorUserTotal',
    get label() {
      return t('hostUser.usersWithIssues')
    },
    value: null,
    icon: 'fa fa-user-slash',
    color: 'orange',
    linkView: null,
    pageParams: {}
  },
  {
    key: 'groupTotal',
    get label() {
      return t('hostUser.userGroups')
    },
    value: null,
    icon: 'fa fa-user-friends',
    color: 'gray',
    linkView: 'groups',
    pageParams: {}
  },
  {
    key: 'oneMonthTotal',
    get label() {
      return t('hostUser.operationsInTheLastMonth')
    },
    value: null,
    icon: 'fa fa-running',
    color: 'gray',
    linkView: 'logs',
    pageParams: { day: '30' }
  },
  {
    key: 'failedTotal',
    get label() {
      return t('hostUser.failedOperations')
    },
    value: null,
    icon: 'fa fa-exclamation-triangle',
    color: 'red',
    linkView: 'logs',
    pageParams: { day: '365', status: 'ERROR,FAILED' }
  }
])

// 处理卡片点击，跳转到对应视图
function handleCardClick(stat) {
  if (active && !statsAuthError.value && stat.linkView && handleNavigate) {
    handleNavigate({ view: stat.linkView, params: stat.pageParams })
  }
}

// 图表相关
const chartRef = ref(null)
const chartData = ref([])
const chartLoading = ref(false)
const statsLoading = ref(false)
const statsError = messageRef('')
const statsNotice = messageRef('')
const statsAuthError = ref(false)
const chartError = messageRef('')
const chartNotice = messageRef('')
const chartAuthError = ref(false)
const chartReady = ref(false)
let active = true
let statsVersion = 0
let chartVersion = 0
let statsLoaded = false
let chartInstance = null
function isAuthError(error) {
  return (
    [401, 403].includes(error?.response?.status) ||
    ['Authentication expired', 'Access denied'].includes(error?.message)
  )
}
function countValue(value) {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return null
  const number = Number(value)
  return Number.isSafeInteger(number) && number >= 0 ? number : null
}
function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function visibleDates() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Array.from({ length: 15 }, (_, index) => {
    const date = new Date(today)
    date.setDate(date.getDate() - 14 + index)
    return dateKey(date)
  })
}
function disposeChart() {
  chartInstance?.dispose()
  chartInstance = null
}
function refreshOverview() {
  return Promise.all([loadStats(), loadChartData()])
}

// 加载统计数据
async function loadStats() {
  if (!active) return
  const version = ++statsVersion
  const isCurrent = () => active && version === statsVersion
  statsLoading.value = true
  try {
    const response = await userApi.getOverviewStats()
    if (!isCurrent()) return
    const records = response?.records ?? response?.data?.records
    if (!Array.isArray(records)) throw new Error('Invalid user statistics')
    const data = records[0] || {}
    statCards.value.forEach(stat => {
      stat.value = countValue(data[stat.key])
    })
    statsLoaded = true
    statsError.value = ''
    statsAuthError.value = false
    statsNotice.value = !records.length
      ? message('hostUser.noUserStatisticsAvailable')
      : statCards.value.some(stat => stat.value === null)
        ? message('hostUser.someCountsAreUnavailableAndAreShownAs')
        : ''
  } catch (error) {
    if (!isCurrent()) return
    console.error('Failed to load stats:', error)
    statsAuthError.value = isAuthError(error)
    if (statsAuthError.value) {
      statCards.value.forEach(stat => {
        stat.value = null
      })
      statsLoaded = false
    }
    statsError.value = statsAuthError.value
      ? message('hostUser.unableToReadUserStatisticsSessionExpiredOr')
      : statsLoaded
        ? message('hostUser.userStatisticsCouldNotBeRefreshedPreviousResults')
        : message('hostUser.unableToReadUserStatisticsPleaseRetry')
  } finally {
    if (isCurrent()) statsLoading.value = false
  }
}

// 加载图表数据
async function loadChartData() {
  if (!active) return
  const version = ++chartVersion
  const isCurrent = () => active && version === chartVersion
  chartLoading.value = true
  try {
    const response = await userApi.getAuditLogStats(15)
    if (!isCurrent()) return
    const records = response?.records ?? response?.data?.records
    if (!Array.isArray(records)) throw new Error('Invalid audit statistics')
    const dates = new Set(visibleDates())
    chartData.value = records.filter(item => dates.has(item?.auditDate))
    if (new Set(chartData.value.map(item => item.auditDate)).size !== chartData.value.length)
      throw new Error('Duplicate audit date')
    chartError.value = ''
    chartAuthError.value = false
    chartNotice.value = chartData.value.some(item =>
      ['total', 'completedCount', 'failedCount', 'runningCount'].some(
        field => countValue(item[field]) === null
      )
    )
      ? message('hostUser.someDailyCountsAreMissingAndAppearAs')
      : ''
    chartReady.value = !!chartData.value.length
    await nextTick()
    if (!isCurrent()) return
    initChart()
  } catch (error) {
    if (!isCurrent()) return
    console.error('Failed to load chart data:', error)
    chartAuthError.value = isAuthError(error)
    chartError.value = chartAuthError.value
      ? message('hostUser.unableToReadOperationStatisticsSessionExpiredOr')
      : message('hostUser.unableToReadOperationStatisticsPleaseRetry')
    chartData.value = []
    chartReady.value = false
    chartNotice.value = ''
    disposeChart()
  } finally {
    if (isCurrent()) chartLoading.value = false
  }
}

// 初始化ECharts图表
function initChart() {
  if (!active || !chartRef.value) return
  disposeChart()
  if (!chartReady.value) return

  chartInstance = echarts.init(chartRef.value, isDark.value ? 'dark' : '')

  const dateMap = new Map()
  for (const dateStr of visibleDates()) {
    dateMap.set(dateStr, {
      total: null,
      completedCount: null,
      failedCount: null,
      runningCount: null
    })
  }

  chartData.value.forEach(item => {
    const dateStr = item.auditDate
    if (dateMap.has(dateStr)) {
      dateMap.set(dateStr, {
        total: countValue(item.total),
        completedCount: countValue(item.completedCount),
        failedCount: countValue(item.failedCount),
        runningCount: countValue(item.runningCount)
      })
    }
  })

  const xData = []
  const totalData = []
  const completedData = []
  const failedData = []
  const runningData = []

  dateMap.forEach((value, key) => {
    xData.push(`${Number(key.slice(5, 7))}-${Number(key.slice(8, 10))}`)
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
        name: t('hostUser.total'),
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
        name: t('hostUser.completed'),
        type: 'line',
        data: completedData,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#10b981', width: 2 },
        itemStyle: { color: '#10b981' }
      },
      {
        name: t('hostUser.failed2'),
        type: 'line',
        data: failedData,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#ef4444', width: 2 },
        itemStyle: { color: '#ef4444' }
      },
      {
        name: t('hostUser.running2'),
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

watch([isDark, currentLocale], () => {
  nextTick(() => {
    if (!active) return
    initChart()
    if (chartInstance) {
      chartInstance.resize()
    }
  })
})

function suspendRead() {
  active = false
  statsVersion += 1
  chartVersion += 1
  if (statsLoading.value)
    statsError.value = message('hostUser.readingUserStatisticsWasInterruptedPleaseRetry')
  if (chartLoading.value) {
    chartError.value = message('hostUser.readingOperationStatisticsWasInterruptedPleaseRetry')
    chartData.value = []
    chartReady.value = false
  }
  statsLoading.value = false
  chartLoading.value = false
  disposeChart()
}
onDeactivated(suspendRead)
onActivated(() => {
  if (active) return
  active = true
  nextTick(() => {
    if (active) initChart()
  })
})
onBeforeUnmount(() => {
  suspendRead()
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
  flex: 1;
  min-height: 0;
  gap: 16px;
  overflow-y: auto;
}

.overview-toolbar,
.read-feedback {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.overview-toolbar {
  justify-content: space-between;
}
.read-feedback .el-alert {
  flex: 1;
  min-width: 0;
}
.read-note {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.stat-card {
  min-width: 0;
  flex: 1 1 180px;
  padding: 16px;
  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
  &__content {
    min-width: 0;
  }
  &__value {
    overflow-wrap: anywhere;
    font-variant-numeric: tabular-nums;
  }
}

.stat-cards {
  flex-shrink: 0;
  margin-bottom: 0;
}

.chart-section--flex {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 440px;
  margin-bottom: 0;
  overflow: hidden;
}

.chart-section__content--flex {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.chart-legend {
  display: flex;
  flex-wrap: wrap;
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
  width: 100%;
  border-radius: 8px;
}
.chart-frame {
  display: flex;
  position: relative;
  flex: 1;
  min-height: 280px;
}
.chart-empty {
  flex: 1;
  min-height: 280px;
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
