<template>
  <div class="ops-page-layout" style="overflow-y: auto">
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
    <div class="chart-section">
      <div class="chart-section__title">十五天内操作统计</div>
      <div class="chart-section__content">
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
        <div ref="chartRef" class="chart-container" v-loading="chartLoading"></div>
      </div>
    </div>

    <!-- 操作记录 (Log View) -->
    <div class="table-section">
      <div class="table-section__header">
        <div class="table-section__title">操作记录</div>
        <el-form :model="filters" inline size="small" class="table-section__filters">
          <el-form-item label="时间范围">
            <el-select v-model="filters.day" style="width: 100px">
              <el-option label="所有" value="all" />
              <el-option label="今天" value="1" />
              <el-option label="最近一周" value="7" />
              <el-option label="最近一个月" value="30" />
              <el-option label="最近一年" value="365" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="filters.status" style="width: 80px" clearable>
              <el-option label="全部" value="all" />
              <el-option label="成功" value="COMPLETED" />
              <el-option label="失败" value="ERROR,FAILED" />
            </el-select>
          </el-form-item>
          <el-form-item label="结果">
            <el-input
              v-model="filters.keyword"
              placeholder="请输入"
              clearable
              style="width: 120px"
              @keyup.enter="handleFilterChange"
            >
              <template #prefix>
                <i class="fa fa-search"></i>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleFilterChange">搜索</el-button>
            <el-button @click="handleResetFilters">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table :data="logList" v-loading="logsLoading" max-height="calc(100vh - 740px)">
        <el-table-column prop="start_time" label="开始时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.start_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ translateText(row.action) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ata_node" label="执行引擎节点" width="140" />
        <el-table-column prop="message" label="结果" min-width="150" show-overflow-tooltip />
        <el-table-column prop="username" label="用户" width="90" />
        <el-table-column prop="end_time" label="结束时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.end_time) }}
          </template>
        </el-table-column>
        <el-table-column label="耗时" min-width="80">
          <template #default="{ row }">
            {{ calcDuration(row.start_time, row.end_time) }}
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页器 -->
      <div class="ops-pagination-wrapper" v-if="logList.length > 0 || pagination.total > 0">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handlePageSizeChange"
          @current-change="handlePageChange"
        />
      </div>

      <div v-if="!logList.length && !logsLoading" class="empty-data">
        <i class="fa fa-database"></i>
        <span>没有数据</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick, watch, inject } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import * as userApi from '@/modules/user/api'
import { translateText } from '@/utils/i18n'

// 注入父组件提供的导航方法
const handleNavigate = inject('handleNavigate', null)

// 统计卡片数据 (mapping from LUPM_STATISTICS)
const statCards = ref([
  { key: 'hostTotal', label: '主机', value: 0, icon: 'fab fa-linux', color: 'blue', linkView: 'users', pageParams: {} },
  { key: 'userTotal', label: '用户', value: 0, icon: 'fa fa-user-alt', color: 'gray', linkView: 'users', pageParams: {} },
  { key: 'errorUserTotal', label: '异常用户', value: 0, icon: 'fa fa-user-slash', color: 'orange', linkView: 'users', pageParams: { status: 'error' } },
  { key: 'groupTotal', label: '用户组', value: 0, icon: 'fa fa-user-friends', color: 'gray', linkView: 'groups', pageParams: {} },
  { key: 'oneMonthTotal', label: '近一月操作', value: 0, icon: 'fa fa-running', color: 'gray', linkView: 'logs', pageParams: { day: '30' } },
  { key: 'failedTotal', label: '操作失败数', value: 0, icon: 'fa fa-exclamation-triangle', color: 'red', linkView: 'logs', pageParams: { day: '365', status: 'ERROR,FAILED' } }
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

// 日志表格相关
const logList = ref([])
const logsLoading = ref(false)
const pagination = reactive({
  page: 1,
  size: 10,
  total: 0
})

const filters = ref({
  day: '1',
  status: 'all',
  action: 'all',
  keyword: ''
})

// 状态类型映射
function getStatusType(status) {
  const types = {
    COMPLETED: 'success',
    SUCCESS: 'success',
    FAILED: 'danger',
    ERROR: 'danger',
    RUNNING: 'warning',
    PENDING: 'info'
  }
  return types[status?.toUpperCase()] || 'info'
}

function getStatusLabel(status) {
  const labels = {
    COMPLETED: '已完成',
    SUCCESS: '成功',
    FAILED: '失败',
    ERROR: '错误',
    RUNNING: '运行中',
    PENDING: '等待中'
  }
  return labels[status?.toUpperCase()] || status || '-'
}

// 格式化日期时间
function formatDateTime(isoString) {
  if (!isoString) return '-'
  try {
    if (typeof isoString === 'string' && isoString.includes('T')) {
      return isoString.replace('T', ' ').split('.')[0]
    }
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return isoString
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  } catch {
    return isoString
  }
}

// 计算耗时
function calcDuration(startTime, endTime) {
  if (!startTime || !endTime) return '-'
  try {
    const start = new Date(startTime).getTime()
    const end = new Date(endTime).getTime()
    const ms = end - start
    if (ms < 0) return '-'
    if (ms < 1000) return `${ms}ms`
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  } catch {
    return '-'
  }
}

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

  // 销毁旧实例
  if (chartInstance) {
    chartInstance.dispose()
  }

  chartInstance = echarts.init(chartRef.value)

  // 生成完整的15天日期范围
  const days = 15
  const dateMap = new Map()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 初始化15天的数据（倒序，从15天前到今天）
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
    dateMap.set(dateStr, {
      total: 0,
      completedCount: 0,
      failedCount: 0,
      runningCount: 0
    })
  }

  // 填入实际数据
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

  // 提取数据用于图表
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
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e2e8f0',
      textStyle: { color: '#1e293b' },
      extraCssText: 'box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);'
    },
    grid: {
      left: '10px',
      right: '20px',
      bottom: '10px',
      top: '40px',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xData,
      axisLabel: { color: '#64748b', margin: 12 },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#64748b' },
      splitLine: { lineStyle: { color: '#f1f5f9' } }
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

// 窗口大小变化时调整图表
function handleResize() {
  chartInstance?.resize()
}

// 加载操作日志
async function loadLogs() {
  logsLoading.value = true
  try {
    const response = await userApi.getOperationLogs({
      module: 'uim',
      action: filters.value.action,
      status: filters.value.status,
      day: filters.value.day,
      page: pagination.page,
      size: pagination.size
    }, filters.value.keyword ? `message:*${filters.value.keyword}*` : undefined)
    logList.value = response?.records || response?.data?.records || []
    pagination.total = response?.total || response?.data?.total || logList.value.length
  } catch (error) {
    console.error('Failed to load logs:', error)
    logList.value = []
  } finally {
    logsLoading.value = false
  }
}

// 筛选条件改变
function handleFilterChange() {
  pagination.page = 1
  loadLogs()
}

// 重置筛选条件
function handleResetFilters() {
  filters.value = {
    day: '1',
    status: 'all',
    action: 'all',
    keyword: ''
  }
  pagination.page = 1
  loadLogs()
}

// 分页改变
function handlePageChange() {
  loadLogs()
}

function handlePageSizeChange() {
  pagination.page = 1
  loadLogs()
}

onMounted(() => {
  loadStats()
  loadChartData()
  loadLogs()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})
</script>

<style scoped lang="scss">
@use '../../styles/common.scss' as *;

.overview-view {
  height: 100%;
  overflow-y: auto;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #64748b;
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

.chart-container {
  height: 320px;
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
  color: #94a3b8;
  font-size: 14px;

  i {
    font-size: 24px;
  }
}

.empty-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #94a3b8;
  gap: 8px;

  i {
    font-size: 32px;
  }
}

.filter-label {
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}

.table-section__filters {
  :deep(.el-form-item--small) {
    margin-bottom: 0 !important;
  }
}
</style>
