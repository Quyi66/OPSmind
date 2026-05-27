<template>
  <div class="ops-page-layout run-logs-page">
    <el-tabs v-model="activeTab" class="run-logs-tabs" @tab-change="handleTabChange">
      <el-tab-pane label="运行记录" name="logs">
        <div class="run-logs-tab-content">
          <div class="ops-filter-bar">
            <el-form :model="filters" inline size="small">
              <el-form-item label="时间范围">
                <el-select v-model="filters.day" style="width: 140px">
                  <el-option label="全部" value="3650" />
                  <el-option label="今天" value="0" />
                  <el-option label="最近7天" value="7" />
                  <el-option label="最近30天" value="30" />
                  <el-option label="最近一年" value="365" />
                </el-select>
              </el-form-item>
              <el-form-item label="状态">
                <el-select v-model="filters.status" placeholder="状态筛选" style="width: 140px">
                  <el-option label="全部状态" value="all" />
                  <el-option label="等待中" value="WAITING" />
                  <el-option label="正在运行" value="RUNNING" />
                  <el-option label="回调" value="CALLBACK" />
                  <el-option label="运行错误" value="ERROR" />
                  <el-option label="运行失败" value="FAILED" />
                  <el-option label="完成" value="COMPLETED" />
                  <el-option label="运行终止" value="INTERRUPTED" />
                </el-select>
              </el-form-item>
              <el-form-item label="类型">
                <el-select v-model="filters.type" placeholder="类型筛选" style="width: 140px">
                  <el-option
                    v-for="option in jobTypeOptions"
                    :key="option.value || 'all'"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="关键词">
                <el-input
                  v-model="filters.search"
                  placeholder="搜索任务标题"
                  clearable
                  style="width: 240px"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" :loading="loading" @click="handleSearch">
                  <el-icon><Search /></el-icon>
                  搜索
                </el-button>
                <el-button @click="handleReset">
                  <el-icon><RefreshRight /></el-icon>
                  重置
                </el-button>
              </el-form-item>
            </el-form>
          </div>

          <div class="ops-action-bar">
            <span style="flex: 1;"></span>
            <el-button class="toolbar-icon-btn" circle size="small" :loading="loading" @click="handleRefresh" title="刷新">
              <el-icon v-show="!loading"><Refresh /></el-icon>
            </el-button>
          </div>

          <div class="ops-table-wrapper">
            <el-table
              v-loading="loading"
              :data="tableData"
              max-height="calc(100vh - 290px)"
            >
              <el-table-column label="开始时间" width="180" sortable>
                <template #default="{ row }">
                  {{ formatDateTime(row.start_time) }}
                </template>
              </el-table-column>

              <el-table-column label="任务" show-overflow-tooltip min-width="200">
                <template #default="{ row }">
                  {{ translateText(row.job_title) }}
                </template>
              </el-table-column>

              <el-table-column label="类型" width="130">
                <template #default="{ row }">
                  {{ getJobTypeLabel(row.job_type) }}
                </template>
              </el-table-column>

              <el-table-column label="用户" width="100">
                <template #default="{ row }">
                  {{ row.username || '-' }}
                </template>
              </el-table-column>

              <el-table-column label="审核" width="100">
                <template #default="{ row }">
                  {{ row.review_user || '-' }}
                </template>
              </el-table-column>

              <el-table-column label="耗时" width="100">
                <template #default="{ row }">
                  {{ calculateDuration(row.start_time, row.end_time) }}
                </template>
              </el-table-column>

              <el-table-column label="结束时间" width="180" sortable>
                <template #default="{ row }">
                  {{ formatDateTime(row.end_time) }}
                </template>
              </el-table-column>

              <el-table-column label="Ansible Node" width="150">
                <template #default="{ row }">
                  <div class="node-list">
                    <el-tag
                      v-for="(ip, index) in parseNodes(row.ata_url)"
                      :key="index"
                      size="small"
                      type="info"
                    >
                      {{ ip }}
                    </el-tag>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="状态" width="100">
                <template #default="{ row }">
                  <el-tag
                    :type="getStatusType(row.status)"
                    style="cursor: pointer"
                    @click="handleViewResult(row)"
                  >
                    {{ getStatusLabel(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column label="详情" width="150">
                <template #default="{ row }">
                  <div class="stats-info">{{ formatStats(row.stats_json) }}</div>
                </template>
              </el-table-column>

              <el-table-column label="操作" width="80" fixed="right">
                <template #default="{ row }">
                  <el-button
                    v-if="canRerun(row)"
                    type="primary"
                    text
                    size="small"
                    @click="handleRerun(row)"
                  >
                    重新启动
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div class="ops-pagination-wrapper">
            <el-pagination
              v-model:current-page="pagination.page"
              v-model:page-size="pagination.size"
              :total="pagination.total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              background
              @size-change="handlePageSizeChange"
              @current-change="handlePageChange"
            />
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="统计分析" name="statistics">
        <div class="stats-tab-wrapper">
          <JobStatisticsPage v-if="activeTab === 'statistics'" />
        </div>
      </el-tab-pane>
    </el-tabs>

    <ExecuteResultDialog
      v-if="resultDialogVisible"
      v-model:visible="resultDialogVisible"
      :run-id="resultMeta.runId"
      :job-title="resultMeta.jobTitle"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search, RefreshRight } from '@element-plus/icons-vue'
import * as jaoApi from '@/modules/automation/api/jao'
import { JOB_TYPE_OPTIONS } from '@/modules/automation/stores/useJobStore'
import ExecuteResultDialog from '../../components/job/JobListView/ExecuteResultDialog.vue'
import JobStatisticsPage from './JobStatisticsPage.vue'
import { translateText } from '@/utils/i18n.js'
import { RUN_LOG_STATUS_MAP, getRunLogStatusLabel, getRunLogStatusType } from '@/modules/automation/constants/runLogStatus'

const loading = ref(false)
const tableData = ref([])
const filters = ref({
  day: '0',
  status: 'all',
  search: '',
  job_id: '',
  type: '',
  run_ids: ''
})
const pagination = ref({
  page: 1,
  size: 10,
  total: 0
})
const resultDialogVisible = ref(false)
const resultMeta = ref({ runId: '', jobTitle: '' })
const route = useRoute()
const router = useRouter()
const activeTab = ref(normalizeSingleQueryValue(route.query.tab) === 'statistics' ? 'statistics' : 'logs')

let searchTimeout = null
const jobTypeOptions = JOB_TYPE_OPTIONS
const validJobTypes = new Set(JOB_TYPE_OPTIONS.map(option => option.value).filter(Boolean))
const statusMap = RUN_LOG_STATUS_MAP

onMounted(() => {
  syncFiltersFromRoute()
  if (activeTab.value === 'logs') {
    fetchData()
  }
})

watch(
  () => route.query,
  (query, previousQuery) => {
    const prevTab = normalizeSingleQueryValue(previousQuery?.tab)
    const nextTab = normalizeSingleQueryValue(query?.tab)
    const prevDay = previousQuery?.day ?? ''
    const prevStatus = previousQuery?.status ?? ''
    const prevType = previousQuery?.type ?? ''
    const prevKeyword = previousQuery?.keyword ?? ''
    const nextDay = query?.day ?? ''
    const nextStatus = query?.status ?? ''
    const nextType = query?.type ?? ''
    const nextKeyword = query?.keyword ?? ''

    syncTabFromRoute()

    if (
      prevTab === nextTab &&
      prevDay === nextDay &&
      prevStatus === nextStatus &&
      prevType === nextType &&
      prevKeyword === nextKeyword
    ) {
      return
    }

    syncFiltersFromRoute()

    if (activeTab.value === 'logs') {
      pagination.value.page = 1
      fetchData()
    }
  }
)

function syncTabFromRoute() {
  const routeTab = normalizeSingleQueryValue(route.query.tab)
  activeTab.value = routeTab === 'statistics' ? 'statistics' : 'logs'
}

function normalizeSingleQueryValue(value) {
  return Array.isArray(value) ? value[0] || '' : value || ''
}

function syncFiltersFromRoute() {
  const routeDay = normalizeSingleQueryValue(route.query.day)
  const routeStatus = normalizeSingleQueryValue(route.query.status)
  const routeType = normalizeSingleQueryValue(route.query.type)
  const routeKeyword = normalizeSingleQueryValue(route.query.keyword)

  filters.value.day = routeDay || '0'
  filters.value.status = statusMap[routeStatus] ? routeStatus : 'all'
  filters.value.type = validJobTypes.has(routeType) ? routeType : ''
  filters.value.search = routeKeyword || ''
}

function handleTabChange(tab) {
  const nextTab = tab === 'statistics' ? 'statistics' : 'logs'
  const nextQuery = { ...route.query }

  if (nextTab === 'statistics') {
    nextQuery.tab = 'statistics'
  } else {
    delete nextQuery.tab
  }

  router.replace({ query: nextQuery })
}

async function fetchData() {
  loading.value = true
  try {
    const payload = {
      params: {
        day: filters.value.day,
        job_id: filters.value.job_id,
        type: filters.value.type,
        run_ids: filters.value.run_ids,
        status: filters.value.status
      },
      size: pagination.value.size,
      page: pagination.value.page,
      orderBy: 'start_time desc',
      filter: filters.value.search ? `start_time|username|ata_url:*${filters.value.search}*` : undefined
    }

    const response = await jaoApi.fetchJobRunLogs(payload)
    const data = response?.data || response
    tableData.value = data.records || []
    pagination.value.total = data.total || 0
  } catch (error) {
    ElMessage.error(error?.message || '获取运行记录失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.value.page = 1
  const queryChanged = syncRouteQueryFromFilters()
  if (!queryChanged) {
    fetchData()
  }
}

function handlePageChange() {
  fetchData()
}

function handlePageSizeChange() {
  pagination.value.page = 1
  fetchData()
}

function handleSearchDebounced() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    handleSearch()
  }, 500)
}

function handleRefresh() {
  fetchData()
}

function handleReset() {
  filters.value.day = '0'
  filters.value.status = 'all'
  filters.value.type = ''
  filters.value.search = ''
  pagination.value.page = 1
  const queryChanged = syncRouteQueryFromFilters()
  if (!queryChanged) {
    fetchData()
  }
}

function syncRouteQueryFromFilters() {
  const nextQuery = { ...route.query }

  if (filters.value.day && filters.value.day !== '0') {
    nextQuery.day = filters.value.day
  } else {
    delete nextQuery.day
  }

  if (filters.value.status && filters.value.status !== 'all') {
    nextQuery.status = filters.value.status
  } else {
    delete nextQuery.status
  }

  if (filters.value.type) {
    nextQuery.type = filters.value.type
  } else {
    delete nextQuery.type
  }

  if (filters.value.search) {
    nextQuery.keyword = filters.value.search
  } else {
    delete nextQuery.keyword
  }

  const currentFullPath = router.resolve({ query: route.query }).fullPath
  const nextFullPath = router.resolve({ query: nextQuery }).fullPath

  if (currentFullPath === nextFullPath) {
    return false
  }

  router.replace({ query: nextQuery })
  return true
}

function getJobTypeLabel(type) {
  const option = JOB_TYPE_OPTIONS.find(item => item.value === type)
  return option?.label || type || '-'
}

function getStatusLabel(status) {
  return getRunLogStatusLabel(status)
}

function getStatusType(status) {
  return getRunLogStatusType(status)
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const pad = (n) => (n < 10 ? `0${n}` : String(n))
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return '-'
  const start = new Date(startTime)
  const end = new Date(endTime)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '-'

  const diff = Math.abs(end - start) / 1000
  const hours = Math.floor(diff / 3600)
  const minutes = Math.floor((diff % 3600) / 60)
  const seconds = Math.floor(diff % 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  } else {
    return `${seconds}s`
  }
}

function parseNodes(ataUrl) {
  if (!ataUrl) return []
  return ataUrl.split(',').filter(ip => ip.trim())
}

function formatStats(statsJson) {
  if (!statsJson) return '-'
  try {
    const stats = JSON.parse(statsJson)
    const parts = []
    if (stats.totalHosts) parts.push(`总数:${stats.totalHosts}`)
    if (stats.okHosts) parts.push(`成功:${stats.okHosts}`)
    if (stats.failedHosts) parts.push(`失败:${stats.failedHosts}`)
    if (stats.unreachableHosts) parts.push(`不可达:${stats.unreachableHosts}`)
    return parts.join(' | ') || '-'
  } catch {
    return '-'
  }
}

function canRerun(row) {
  return row.job_type === 'script' &&
         row.status !== 'WAITING' &&
         row.status !== 'RUNNING' &&
         row.status !== 'CALLBACK'
}

function handleViewResult(row) {
  if (!row?.id) return
  resultMeta.value = {
    runId: row.id,
    jobTitle: row.job_title
  }
  resultDialogVisible.value = true
}

async function handleRerun(row) {
  try {
    await ElMessageBox.confirm(
      `确定要重新启动运维工具 "${row.job_title}" 吗？`,
      '重新启动运维工具',
      { type: 'warning' }
    )

    loading.value = true
    try {
      await jaoApi.rerunJob(row.job_id, row.id)
      ElMessage.success('运维工具已重新启动')
      fetchData()
    } catch (error) {
      ElMessage.error(error?.message || '重新启动运维工具失败')
    } finally {
      loading.value = false
    }
  } catch (error) {
    // 用户取消
  }
}
</script>

<style scoped lang="scss">
@use '@/styles/common.scss' as *;

.run-logs-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  background: var(--el-bg-color);
  border-radius: 12px;
  overflow: hidden;
}

.run-logs-tabs {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
}

.run-logs-tabs :deep(.el-tabs__content) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.run-logs-tabs :deep(.el-tab-pane) {
  height: 100%;
}

.run-logs-tab-content,
.stats-tab-wrapper {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
}

.page-header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.header-filters {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.table-container {
  flex: 1;
  min-height: 0;
  min-width: 0;
  padding: 24px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.table-container :deep(.el-table) {
  flex: 1;
  min-height: 0;
}

.job-title {
  font-weight: 500;
  color: var(--el-text-color-primary);
  word-break: break-all;
}

.node-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.stats-info {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
