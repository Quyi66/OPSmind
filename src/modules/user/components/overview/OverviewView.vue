<template>
  <div class="overview-view">
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
          <span class="legend-item"><span class="dot dot--total"></span> 总数</span>
          <span class="legend-item"><span class="dot dot--success"></span> 已完成</span>
          <span class="legend-item"><span class="dot dot--failed"></span> 失败</span>
          <span class="legend-item"><span class="dot dot--running"></span> 正在运行</span>
        </div>
        <div ref="chartRef" class="chart-container">
          <div v-if="chartLoading" class="chart-loading">
            <i class="fa fa-spinner fa-spin"></i> 加载中...
          </div>
          <div v-else-if="!chartData.length" class="chart-empty">
            <i class="fa fa-chart-line"></i> 暂无图表数据
          </div>
          <!-- ECharts 图表将在这里渲染 -->
        </div>
      </div>
    </div>

    <!-- 三天内操作记录 (Log View) -->
    <div class="table-section">
      <div class="table-section__header">
        <div class="table-section__title">三天内操作记录</div>
        <div class="table-section__filters">
          <el-select v-model="filters.day" size="small" placeholder="时间范围" @change="loadLogs">
            <el-option label="今天" value="1" />
            <el-option label="3天内" value="3" />
            <el-option label="7天内" value="7" />
            <el-option label="30天内" value="30" />
          </el-select>
          <el-select v-model="filters.status" size="small" placeholder="状态" clearable @change="loadLogs">
            <el-option label="全部" value="all" />
            <el-option label="成功" value="COMPLETED" />
            <el-option label="失败" value="ERROR,FAILED" />
          </el-select>
          <el-select v-model="filters.action" size="small" placeholder="操作" clearable @change="loadLogs">
            <el-option label="全部" value="all" />
          </el-select>
          <el-input
            v-model="filters.keyword"
            size="small"
            placeholder="搜索"
            clearable
            style="width: 140px"
            @keyup.enter="loadLogs"
          >
            <template #prefix>
              <i class="fa fa-search"></i>
            </template>
          </el-input>
          <el-button size="small" :icon="Refresh" @click="loadLogs" />
        </div>
      </div>

      <el-table :data="logList" v-loading="logsLoading" stripe>
        <el-table-column prop="start_time" label="开始时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.start_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作" min-width="180" show-overflow-tooltip />
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
        <el-table-column label="耗时" width="80">
          <template #default="{ row }">
            {{ calcDuration(row.start_time, row.end_time) }}
          </template>
        </el-table-column>
      </el-table>

      <div v-if="!logList.length && !logsLoading" class="empty-data">
        <i class="fa fa-database"></i>
        <span>没有数据</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import * as userApi from '@/modules/user/api'

// 定义 emit 用于通知父组件切换视图
const emit = defineEmits(['navigate'])

// 统计卡片数据 (mapping from LUPM_STATISTICS)
// linkView: 对应 Angular 源码中的 linkPage，映射到我们的子视图
// pageParams: 跳转时带的参数
const statCards = ref([
  { key: 'hostTotal', label: '主机', value: 0, icon: 'fab fa-linux', color: 'blue', linkView: 'users', pageParams: {} },
  { key: 'userTotal', label: '用户', value: 0, icon: 'fa fa-user-alt', color: 'gray', linkView: 'users', pageParams: {} },
  { key: 'errorUserTotal', label: '异常用户', value: 0, icon: 'fa fa-user-slash', color: 'orange', linkView: 'users', pageParams: { status: 'error' } },
  { key: 'groupTotal', label: '用户组', value: 0, icon: 'fa fa-user-friends', color: 'gray', linkView: 'groups', pageParams: {} },
  { key: 'oneMonthTotal', label: '近一月操作', value: 0, icon: 'fa fa-running', color: 'gray', linkView: 'logs', pageParams: { logDay: '31' } },
  { key: 'failedTotal', label: '操作失败数', value: 0, icon: 'fa fa-exclamation-triangle', color: 'red', linkView: 'logs', pageParams: { logDay: '31', logStatus: 'ERROR,FAILED' } }
])

// 处理卡片点击，跳转到对应视图
function handleCardClick(stat) {
  if (stat.linkView) {
    emit('navigate', { view: stat.linkView, params: stat.pageParams })
  }
}

const chartRef = ref(null)
const chartData = ref([])
const chartLoading = ref(false)
const logList = ref([])
const logsLoading = ref(false)

const filters = ref({
  day: '3',
  status: 'all',
  action: 'all',
  keyword: ''
})

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

function formatDuration(ms) {
  if (!ms) return '-'
  if (ms < 1000) return `${ms}ms`
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

// 格式化日期时间（从 ISO 格式转为可读格式）
function formatDateTime(isoString) {
  if (!isoString) return '-'
  try {
    const date = new Date(isoString)
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

// 计算两个时间戳之间的耗时
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

async function loadStats() {
  try {
    const response = await userApi.getOverviewStats()
    const records = response?.records || response?.data?.records || []
    const data = records[0] || {}

    // Map API response to stat cards
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

async function loadChartData() {
  chartLoading.value = true
  try {
    const response = await userApi.getAuditLogStats(15)
    chartData.value = response?.records || response?.data?.records || []
    // TODO: Initialize ECharts with chartData
  } catch (error) {
    console.error('Failed to load chart data:', error)
    chartData.value = []
  } finally {
    chartLoading.value = false
  }
}

async function loadLogs() {
  logsLoading.value = true
  try {
    const response = await userApi.getOperationLogs({
      module: 'uim',
      action: filters.value.action,
      status: filters.value.status,
      day: filters.value.day
    })
    logList.value = response?.records || response?.data?.records || []
  } catch (error) {
    console.error('Failed to load logs:', error)
    logList.value = []
  } finally {
    logsLoading.value = false
  }
}

onMounted(() => {
  loadStats()
  loadChartData()
  loadLogs()
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
  margin-bottom: 16px;
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
    background: rgb(68, 84, 106);
  }

  &--success {
    background: rgb(112, 173, 71);
  }

  &--failed {
    background: rgb(255, 0, 0);
  }

  &--running {
    background: rgb(68, 114, 196);
  }
}

.chart-container {
  height: 250px;
  background: #f8fafc;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-loading,
.chart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
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
</style>
