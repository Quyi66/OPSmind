<template>
  <div class="ops-page-layout">
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small" @submit.prevent>
        <el-form-item :label="t('patches.windows.taskType')">
          <el-select
            v-model="filters.taskType"
            clearable
            :placeholder="t('common.all')"
            class="task-type-filter"
            @change="handleSearch"
          >
            <el-option :label="t('common.all')" value="" />
            <el-option :label="t('patches.linux.patchInstall')" value="install" />
            <el-option :label="t('patches.linux.changeRollback')" value="rollback" />
            <el-option :label="t('patches.linux.packageUpdate')" value="pkg_update" />
            <el-option :label="t('patches.linux.vulnFix')" value="vuln_fix" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('patches.logs.operator')">
          <el-input
            v-model="filters.operator"
            :placeholder="t('automation.flow.enterValue')"
            clearable
            class="operator-filter"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
        </el-form-item>
        <el-form-item :label="t('automation.records.timeRange')">
          <el-date-picker
            v-model="filters.timeRange"
            type="daterange"
            :range-separator="t('patches.logs.to')"
            :start-placeholder="t('automation.workbench.startedAt')"
            :end-placeholder="t('automation.workbench.endedAt')"
            value-format="YYYY-MM-DD"
            class="time-range-filter"
            @change="handleSearch"
          />
        </el-form-item>
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
      <span class="action-bar-spacer" />
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="loading"
        :title="t('common.refresh')"
        @click="loadData"
      >
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <el-alert v-if="loadError" :title="loadError" type="error" :closable="false" show-icon>
      <el-button link type="primary" @click="loadData">{{ t('common.retry') }}</el-button>
    </el-alert>

    <div class="ops-table-wrapper">
      <el-table
        v-loading="loading"
        :data="visibleRows"
        max-height="calc(100vh - 314px)"
        :empty-text="loading ? t('patches.logs.processLoading') : loadError || t('patches.logs.noProcesses')"
      >
        <el-table-column prop="createdTime" :label="t('patches.logs.recordedAt')" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.createdTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="taskType" :label="t('patches.windows.taskType')" width="120">
          <template #default="{ row }">
            <el-tag
              :type="getTaskTypeTagType(row.taskType)"
              :style="getTaskTypeTagStyle(row.taskType)"
              size="small"
              effect="plain"
            >
              {{ formatTaskType(row.taskType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" :label="t('common.status')" width="150">
          <template #default="{ row }">
            <RunLogStatusTag
              :type="getTaskStatusTagType(row.status)"
              :style="getTaskStatusTagStyle(row.status)"
              size="small"
              @click="openDetail(row)"
            >
              {{
                row.status === 'CREATED' && row.scheduledTime
                  ? t('patches.linux.waitingScheduledExecution')
                  : formatTaskStatus(row.status)
              }}
            </RunLogStatusTag>
          </template>
        </el-table-column>
        <el-table-column prop="osType" :label="t('patches.logs.systemType')" width="120">
          <template #default="{ row }">
            <span class="os-type-cell">
              <i v-if="getOsIcon(row.osType)" :class="[getOsIcon(row.osType), 'os-brand-icon']" />
              <span>{{ row.osType }}</span>
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="createdBy" :label="t('patches.logs.operator')" width="120" show-overflow-tooltip />
        <el-table-column :label="t('patches.logs.packages')" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatJsonArray(row.patchPkgs) || '-' }}
          </template>
        </el-table-column>
        <el-table-column :label="t('common.actions')" width="170" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="openDetail(row)">{{ t('automation.records.details') }}</el-button>
            <el-button
              v-if="row.taskType !== 'rollback'"
              text
              type="primary"
              size="small"
              @click="openFailedHosts(row)"
            >
              {{ t('patches.linux.failedHosts') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="ops-pagination-wrapper" v-if="!loadError">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="PAGE_SIZE_OPTIONS"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        :disabled="loading"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <PatchProcessLogDetailDialog v-model="detailVisible" :task="selectedTask" />
    <PatchTaskFailedHostsDialog v-model="failedHostsVisible" :task-id="failedHostsTaskId" />
  </div>
</template>

<script setup>
import { message as localMessage, messageRef } from '@/core/i18n/feedback'
import { t } from '@/core/i18n'

import {
  computed,
  onMounted,
  onBeforeUnmount,
  onActivated,
  onDeactivated,
  reactive,
  ref
} from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, RefreshRight, Search } from '@element-plus/icons-vue'
import { patchLogsApi } from '../api'
import PatchProcessLogDetailDialog from '../components/logs/PatchProcessLogDetailDialog.vue'
import PatchTaskFailedHostsDialog from '../components/patch-task/dialogs/PatchTaskFailedHostsDialog.vue'
import { useActiveTaskListPolling } from '@/composables/useActiveTaskListPolling'
import RunLogStatusTag from '@/components/shared/RunLogStatusTag.vue'
import { toKnownNumber } from '@/utils/workspacePresentation'
import {
  formatDateTime,
  formatJsonArray,
  formatTaskStatus,
  formatTaskType,
  getOsIcon,
  getTaskStatusTagType,
  getTaskStatusTagStyle,
  getTaskTypeTagType,
  getTaskTypeTagStyle
} from '../utils/patchProcessLogs'

const DEFAULT_PAGE_SIZE = 20
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

const loading = ref(false)
const loadError = messageRef('')
const active = ref(true)
let listRequest = 0
let lastQueryKey = ''
const tableData = ref([])
const visibleRows = computed(() => (loading.value || loadError.value ? [] : tableData.value))
const detailVisible = ref(false)
const selectedTask = ref(null)
const failedHostsVisible = ref(false)
const failedHostsTaskId = ref('')

function openFailedHosts(task) {
  failedHostsTaskId.value = String(task.id || task.taskId || '')
  failedHostsVisible.value = true
}

useActiveTaskListPolling({
  records: tableData,
  enabled: () => active.value && !loadError.value,
  refresh: loadData,
  activeStatuses: [
    'PENDING_APPROVAL',
    'CREATED',
    'PRE_CHECKING',
    'INSTALLING',
    'ROLLING_BACK',
    'RESTARTING',
    'VALIDATING'
  ]
})

const filters = reactive(createDefaultFilters())
const appliedFilters = reactive(createDefaultFilters())
const pagination = reactive({
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  total: 0
})

async function loadData() {
  if (!active.value) return
  const request = ++listRequest
  const params = buildQueryParams()
  lastQueryKey = JSON.stringify(params)
  const isCurrent = () => active.value && request === listRequest
  loading.value = true
  loadError.value = ''
  try {
    let response = await patchLogsApi.getAuditLogs(params)
    if (!isCurrent()) return
    let data = response?.data || response || {}
    const total = toKnownNumber(data.totalElements, { integer: true })
    if (total !== null) {
      const lastPage = Math.max(1, Math.ceil(total / params.size))
      if (params.page + 1 > lastPage) {
        pagination.page = lastPage
        const correctedParams = { ...params, page: lastPage - 1 }
        lastQueryKey = JSON.stringify(correctedParams)
        response = await patchLogsApi.getAuditLogs(correctedParams)
        if (!isCurrent()) return
        data = response?.data || response || {}
      }
    }
    tableData.value = data.content || []
    pagination.total = data.totalElements || 0
  } catch (error) {
    if (!isCurrent()) return
    loadError.value = localMessage('patches.logs.processLoadRetry')
    console.error('Failed to load process logs:', error)
    ElMessage.error(t('patches.logs.processLoadFailed'))
  } finally {
    if (isCurrent()) loading.value = false
  }
}

function buildQueryParams() {
  return {
    taskType: appliedFilters.taskType || undefined,
    operator: appliedFilters.operator || undefined,
    startTime: buildDateRangeBoundary(appliedFilters.timeRange?.[0], 'start'),
    endTime: buildDateRangeBoundary(appliedFilters.timeRange?.[1], 'end'),
    page: pagination.page - 1,
    size: pagination.pageSize
  }
}

function handleSearch() {
  Object.assign(appliedFilters, filters, {
    operator: filters.operator.trim(),
    timeRange: [...(filters.timeRange || [])]
  })
  pagination.page = 1
  loadData()
}

function handleReset() {
  Object.assign(filters, createDefaultFilters())
  Object.assign(appliedFilters, createDefaultFilters())
  pagination.page = 1
  pagination.pageSize = DEFAULT_PAGE_SIZE
  loadData()
}

function handlePageChange(page) {
  pagination.page = page
  if (JSON.stringify(buildQueryParams()) === lastQueryKey) return
  loadData()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  loadData()
}

function openDetail(task) {
  selectedTask.value = task
  detailVisible.value = true
}

function createDefaultFilters() {
  return {
    taskType: '',
    operator: '',
    timeRange: []
  }
}

function buildDateRangeBoundary(dateValue, boundary) {
  if (!dateValue) return undefined
  return `${dateValue} ${boundary === 'end' ? '23:59:59' : '00:00:00'}`
}

onMounted(loadData)

function invalidateListRead() {
  active.value = false
  listRequest += 1
  if (loading.value) loadError.value = localMessage('patches.logs.processInterrupted')
  loading.value = false
  detailVisible.value = false
  failedHostsVisible.value = false
}
onBeforeUnmount(invalidateListRead)
onDeactivated(invalidateListRead)
onActivated(() => {
  if (active.value) return
  active.value = true
  loadData()
})
</script>

<style scoped lang="scss">
.task-type-filter {
  width: 140px;
}

.operator-filter {
  width: 180px;
}

.time-range-filter {
  width: 280px;
}

.action-bar-spacer {
  flex: 1;
}

.os-type-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;

  .os-brand-icon {
    font-size: 16px;
    color: var(--el-text-color-regular);
    width: 16px;
    text-align: center;
    display: inline-block;
    vertical-align: middle;
  }
}

:deep(.el-date-editor) {
  height: 32px !important;
}

</style>
