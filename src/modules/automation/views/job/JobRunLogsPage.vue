<template>
  <div class="ops-page-layout run-logs-page">
    <el-tabs v-model="activeTab" class="run-logs-tabs" @tab-change="handleTabChange">
      <el-tab-pane :label="t('automation.records.records')" name="logs">
        <div class="run-logs-tab-content">
          <div class="ops-filter-bar">
            <el-form :model="filters" inline size="small" @submit.prevent>
              <el-form-item :label="t('automation.records.timeRange')">
                <el-select v-model="filters.day" style="width: 140px" @change="handleSearch">
                  <el-option :label="t('common.all')" value="3650" />
                  <el-option :label="t('automation.workbench.today')" value="0" />
                  <el-option :label="t('automation.workbench.last7Days')" value="7" />
                  <el-option :label="t('automation.workbench.last30Days')" value="30" />
                  <el-option :label="t('automation.records.lastYear')" value="365" />
                </el-select>
              </el-form-item>
              <el-form-item :label="t('automation.workbench.status')">
                <el-select
                  v-model="filters.status"
                  :placeholder="t('automation.approval.statusFilter')"
                  style="width: 140px"
                  @change="handleSearch"
                >
                  <el-option :label="t('automation.workbench.allStatuses')" value="all" />
                  <el-option :label="t('automation.workbench.waiting')" value="WAITING" />
                  <el-option :label="t('automation.workbench.runningNow')" value="RUNNING" />
                  <el-option :label="t('automation.workbench.callback')" value="CALLBACK" />
                  <el-option :label="t('automation.workbench.executionError')" value="ERROR" />
                  <el-option :label="t('automation.workbench.executionFailed')" value="FAILED" />
                  <el-option :label="t('automation.workbench.done')" value="COMPLETED" />
                  <el-option :label="t('automation.workbench.executionInterrupted')" value="INTERRUPTED" />
                </el-select>
              </el-form-item>
              <el-form-item :label="t('automation.job.type')">
                <el-select
                  v-model="filters.type"
                  :placeholder="t('automation.records.typeFilter')"
                  style="width: 140px"
                  @change="handleSearch"
                >
                  <el-option
                    v-for="option in jobTypeOptions"
                    :key="option.value || 'all'"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </el-form-item>
              <!-- <el-form-item label="关键词">
                <el-input
                  v-model="filters.search"
                  placeholder="搜索任务标题"
                  clearable
                  style="width: 240px" @keyup.enter="handleSearch" @clear="handleSearch">
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
              </el-form-item> -->
              <el-form-item>
                <el-button type="primary" :loading="loading" @click="handleSearch">
                  <el-icon><Search /></el-icon>
                  {{ t('common.search') }}
                </el-button>
                <el-button @click="handleReset">
                  <el-icon><RefreshRight /></el-icon>
                  {{ t('common.reset') }}
                </el-button>
              </el-form-item>
            </el-form>
          </div>

          <div class="ops-action-bar">
            <span style="flex: 1"></span>
            <el-button
              class="toolbar-icon-btn"
              circle
              size="small"
              :loading="loading"
              @click="handleRefresh"
              :title="t('common.refresh')"
            >
              <el-icon v-show="!loading"><Refresh /></el-icon>
            </el-button>
          </div>

          <el-alert v-if="loadError" :title="loadError" type="error" :closable="false" show-icon>
            <el-button link type="primary" :loading="loading" @click="handleRefresh">
              {{ t('common.retry') }}
            </el-button>
          </el-alert>
          <div class="ops-table-wrapper">
            <el-table
              v-loading="loading"
              :data="loading || loadError ? [] : tableData"
              max-height="calc(100vh - 324px)"
              :default-sort="{ prop: 'start_time', order: 'descending' }"
              @sort-change="handleSortChange"
            >
              <el-table-column prop="start_time" :label="t('automation.workbench.startedAt')" width="180" sortable="custom">
                <template #default="{ row }">
                  {{ formatDateTime(row.start_time) }}
                </template>
              </el-table-column>
              <template #empty>
                <span v-if="loading">{{ t('automation.records.reading') }}</span>
                <span v-else-if="loadError">{{ t('automation.list.readFailedRetry') }}</span>
                <span v-else>{{ t('automation.records.empty') }}</span>
              </template>

              <el-table-column :label="t('execution.ui.task')" show-overflow-tooltip min-width="200">
                <template #default="{ row }">
                  {{ getAutomationRunTitle(row) }}
                </template>
              </el-table-column>

              <el-table-column :label="t('automation.job.type')" width="130">
                <template #default="{ row }">
                  {{ getJobTypeLabel(row.job_type) }}
                </template>
              </el-table-column>

              <el-table-column :label="t('common.user')" width="100">
                <template #default="{ row }">
                  {{ row.username || '-' }}
                </template>
              </el-table-column>

              <el-table-column :label="t('automation.records.review')" width="100">
                <template #default="{ row }">
                  {{ row.review_user || '-' }}
                </template>
              </el-table-column>

              <el-table-column :label="t('automation.workbench.duration')" width="100">
                <template #default="{ row }">
                  {{ calculateDuration(row.start_time, row.end_time) }}
                </template>
              </el-table-column>

              <el-table-column prop="end_time" :label="t('automation.workbench.endedAt')" width="180" sortable="custom">
                <template #default="{ row }">
                  {{ formatDateTime(row.end_time) }}
                </template>
              </el-table-column>

              <el-table-column :label="t('automation.records.executionNodes')" width="150">
                <template #default="{ row }">
                  <div class="node-list">
                    <el-tag
                      v-for="(ip, index) in parseNodes(row.executor_url)"
                      :key="index"
                      size="small"
                      type="info"
                    >
                      {{ ip }}
                    </el-tag>
                  </div>
                </template>
              </el-table-column>

              <el-table-column :label="t('automation.workbench.status')" width="100">
                <template #default="{ row }">
                  <RunLogStatusTag :type="getStatusType(row.status)" @click="handleViewResult(row)">
                    {{ getStatusLabel(row.status) }}
                  </RunLogStatusTag>
                </template>
              </el-table-column>

              <el-table-column :label="t('automation.records.details')" width="150">
                <template #default="{ row }">
                  <div class="stats-info">{{ formatStats(row.stats_json) }}</div>
                </template>
              </el-table-column>

              <el-table-column :label="t('common.actions')" width="80" fixed="right">
                <template #default="{ row }">
                  <el-button
                    v-if="canRerun(row)"
                    type="primary"
                    text
                    size="small"
                    @click="handleRerun(row)"
                  >
                    {{ t('automation.records.restart') }}
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div v-if="!loadError" class="ops-pagination-wrapper">
            <el-pagination
              v-model:current-page="pagination.page"
              v-model:page-size="pagination.size"
              :total="pagination.total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              background
              :disabled="loading || Boolean(loadError)"
              @size-change="handlePageSizeChange"
              @current-change="handlePageChange"
            />
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane :label="t('automation.records.statistics')" name="statistics">
        <div class="stats-tab-wrapper">
          <JobStatisticsPage
            v-if="activeTab === 'statistics'"
            :active="
              pageActive &&
              isRunRecordsRoute() &&
              normalizeSingleQueryValue(route.query.tab) === 'statistics'
            "
          />
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
import { t } from '@/core/i18n'
import { message, messageRef } from '@/core/i18n/feedback'

import { ref, onMounted, onBeforeUnmount, onActivated, onDeactivated, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search, RefreshRight } from '@element-plus/icons-vue'
import * as jaoApi from '@/modules/automation/api/jao'
import { JOB_TYPE_OPTIONS } from '@/modules/automation/stores/useJobStore'
import ExecuteResultDialog from '../../components/job/JobListView/ExecuteResultDialog.vue'
import JobStatisticsPage from './JobStatisticsPage.vue'
import { getAutomationRunTitle } from '../../utils/resourcePresentation'
import { formatDateTime } from '../../utils/helpers'
import { getRunLogOrderBy } from '../../utils/runLogSort'
import {
  RUN_LOG_STATUS_MAP,
  getRunLogStatusLabel,
  getRunLogStatusType
} from '@/modules/automation/constants/runLogStatus'
import { useActiveTaskListPolling } from '@/composables/useActiveTaskListPolling'
import RunLogStatusTag from '@/components/shared/RunLogStatusTag.vue'
import { throwIfWorkflowFailed } from '@/utils/workflowResult'

const loading = ref(false)
const loadError = messageRef('')
const pageActive = ref(true)
const orderBy = ref('start_time desc')
let listRequestId = 0
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
const activeTab = ref(
  normalizeSingleQueryValue(route.query.tab) === 'statistics' ? 'statistics' : 'logs'
)

let searchTimeout = null
let lastOwnRouteState = ''
const jobTypeOptions = JOB_TYPE_OPTIONS
const validJobTypes = new Set(JOB_TYPE_OPTIONS.map(option => option.value).filter(Boolean))
const statusMap = RUN_LOG_STATUS_MAP

useActiveTaskListPolling({
  records: tableData,
  refresh: fetchData,
  enabled: () =>
    pageActive.value && activeTab.value === 'logs' && !loading.value && !loadError.value
})

onMounted(() => {
  syncFiltersFromRoute()
  lastOwnRouteState = routeStateKey()
  if (activeTab.value === 'logs') {
    fetchData()
  }
})

watch(
  () => (isRunRecordsRoute() ? routeStateKey() : null),
  state => {
    if (state == null || state === lastOwnRouteState) return
    lastOwnRouteState = state
    syncTabFromRoute()
    syncFiltersFromRoute()

    if (activeTab.value === 'logs') {
      pagination.value.page = 1
      fetchData()
    } else {
      invalidateRead()
    }
  }
)

function isRunRecordsRoute() {
  return route.name === 'run-records-logs' || route.path?.replace(/\/$/, '') === '/run-records/logs'
}

function routeStateKey() {
  return JSON.stringify(
    ['tab', 'day', 'status', 'type', 'keyword'].map(key =>
      normalizeSingleQueryValue(route.query[key])
    )
  )
}

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
  if (!pageActive.value || activeTab.value !== 'logs') return
  const requestId = ++listRequestId
  loading.value = true
  loadError.value = ''
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
      orderBy: orderBy.value,
      filter: filters.value.search
        ? `start_time|username|executor_url:*${filters.value.search}*`
        : undefined
    }

    const response = await jaoApi.fetchJobRunLogs(payload)
    if (!pageActive.value || requestId !== listRequestId) return
    const data = response?.data || response
    tableData.value = data.records || []
    pagination.value.total = data.total || 0
  } catch (error) {
    if (!pageActive.value || requestId !== listRequestId) return
    loadError.value = message('automation.records.readFailedRetry')
    ElMessage.error(error?.message || t('automation.records.readFailed'))
  } finally {
    if (requestId === listRequestId) loading.value = false
  }
}

function handleSortChange(sort) {
  orderBy.value = getRunLogOrderBy(sort)
  pagination.value.page = 1
  fetchData()
}

function invalidateRead() {
  listRequestId += 1
  clearTimeout(searchTimeout)
  if (loading.value) loadError.value = message('automation.records.readInterrupted')
  loading.value = false
}
function pauseReading() {
  pageActive.value = false
  invalidateRead()
}
onBeforeUnmount(pauseReading)
onDeactivated(pauseReading)
onActivated(() => {
  if (pageActive.value) return
  pageActive.value = true
  if (activeTab.value === 'logs') fetchData()
})

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

function calculateDuration(startTime, endTime) {
  if (startTime == null || startTime === '' || endTime == null || endTime === '') return '-'
  const start = new Date(startTime)
  const end = new Date(endTime)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '-'

  const diff = (end - start) / 1000
  if (diff < 0) return '-'
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
    for (const [field, label] of [
      ['totalHosts', t('automation.stats.total')],
      ['okHosts', t('automation.stats.ok')],
      ['failedHosts', t('automation.stats.failed')],
      ['unreachableHosts', t('automation.stats.unreachable')]
    ]) {
      const value = stats[field]
      if (!['number', 'string'].includes(typeof value) || String(value).trim() === '') continue
      const count = Number(value)
      if (Number.isFinite(count) && count >= 0) parts.push(`${label}:${count}`)
    }
    return parts.join(' | ') || '-'
  } catch {
    return '-'
  }
}

function canRerun(row) {
  const effectiveRunId = String(row?.runId ?? row?.id ?? '')
  return (
    row.job_type === 'script' &&
    effectiveRunId &&
    !effectiveRunId.startsWith('step_') &&
    row.status !== 'WAITING' &&
    row.status !== 'RUNNING' &&
    row.status !== 'CALLBACK'
  )
}

function handleViewResult(row) {
  if (!row?.id) return
  resultMeta.value = {
    runId: row.id,
    get jobTitle() { return getAutomationRunTitle(row) }
  }
  resultDialogVisible.value = true
}

async function handleRerun(row) {
  try {
    const effectiveRunId = String(row?.runId ?? row?.id ?? '')
    if (!effectiveRunId || effectiveRunId.startsWith('step_')) {
      ElMessage.warning(t('automation.records.unsupportedStepRerun'))
      return
    }

    await ElMessageBox.confirm(
      t('automation.records.rerunConfirm', { name: getAutomationRunTitle(row) }),
      t('automation.records.rerunTitle'),
      { closeOnClickModal: false, closeOnPressEscape: false, type: 'warning' }
    )

    loading.value = true
    try {
      const response = await jaoApi.rerunJob(row.job_id, effectiveRunId)
      throwIfWorkflowFailed(response, t('automation.records.rerunFailed'))
      ElMessage.success(t('automation.records.rerunSucceeded'))
      fetchData()
    } catch (error) {
      ElMessage.error(error?.message || t('automation.records.rerunFailed'))
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

.run-logs-tab-content {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
}

.stats-tab-wrapper {
  display: flex;
  flex: 1;
  height: 100%;
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
