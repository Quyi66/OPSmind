<template>
  <el-drawer
    v-model="visible"
    :title="title || t('automation.workbench.runRecords')"
    size="88%"
    destroy-on-close
    class="wb-workbench-drawer wb-run-drawer"
    :close-on-click-modal="true"
  >
    <div class="wb-run-drawer__content">
      <div class="wb-filter-panel">
        <el-form :model="filters" inline size="small" class="wb-run-filters" @submit.prevent>
          <el-form-item :label="t('automation.workbench.timeRange')">
            <el-select v-model="filters.day" style="width: 130px" @change="handleSearch">
              <el-option
                v-for="option in dayOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('automation.workbench.status')">
            <el-select v-model="filters.status" style="width: 130px" @change="handleSearch">
              <el-option
                v-for="option in statusOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('automation.workbench.toolType')">
            <el-select
              v-model="filters.type"
              :placeholder="t('automation.workbench.allTypes')"
              style="width: 160px"
              @change="handleSearch"
            >
              <el-option
                v-for="option in JOB_TYPE_OPTIONS"
                :key="option.value || 'all'"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('automation.workbench.keyword')" class="wb-run-filters__keyword">
            <el-input v-model="pageKeyword" :placeholder="t('automation.workbench.pageSearch')" clearable />
          </el-form-item>
          <el-form-item>
            <el-button @click="handleReset">{{ t('common.reset') }}</el-button>
          </el-form-item>
        </el-form>
      </div>
      <el-alert v-if="loadError" :title="loadError" type="error" show-icon :closable="false">
        <el-button link type="primary" @click="loadRecords">{{ t('common.retry') }}</el-button>
      </el-alert>
      <el-table
        v-loading="drawerLoading"
        :data="displayRecords"
        height="100%"
        class="wb-run-drawer__table"
        :empty-text="loadError ? t('automation.workbench.recordsNotLoaded') : t('automation.workbench.noMatchingRuns')"
        @row-dblclick="$emit('open-result', $event)"
      >
        <el-table-column :label="t('automation.workbench.tool')" min-width="230" show-overflow-tooltip>
          <template #default="{ row }">
            <el-button link type="primary" class="wb-run-title" @click="$emit('open-result', row)">
              {{ getAutomationRunTitle(row) }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column :label="t('automation.workbench.toolType')" width="136">
          <template #default="{ row }">
            <el-tag size="small" :type="getWorkbenchJobType(row).tag" effect="light">
              {{ getWorkbenchJobType(row).label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('automation.workbench.executionUser')" width="110" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.username || '—' }}</span>
            <div v-if="row.review_user" class="wb-run-secondary">{{ t('automation.workbench.reviewer', { name: row.review_user }) }}</div>
          </template>
        </el-table-column>
        <el-table-column :label="t('automation.workbench.startedAt')" width="172" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatDateTime(row.start_time) }}
          </template>
        </el-table-column>
        <el-table-column :label="t('automation.workbench.endedAt')" width="172" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatDateTime(row.end_time) }}
          </template>
        </el-table-column>
        <el-table-column :label="t('automation.workbench.duration')" width="100">
          <template #default="{ row }">{{ formatRunDuration(row) }}</template>
        </el-table-column>
        <el-table-column :label="t('automation.workbench.executionNode')" min-width="145" show-overflow-tooltip>
          <template #default="{ row }">{{ getRunNodes(row).join(', ') || t('automation.workbench.notProvided') }}</template>
        </el-table-column>
        <el-table-column :label="t('automation.workbench.hostStatistics')" min-width="220">
          <template #default="{ row }">
            <div v-if="getRunHostStats(row.stats_json).length" class="wb-run-stats">
              <span
                v-for="stat in getRunHostStats(row.stats_json)"
                :key="stat.key"
                :class="`wb-run-stats--${stat.tone}`"
              >
                {{ stat.label }}
                <b>{{ stat.count }}</b>
              </span>
            </div>
            <span v-else class="wb-run-secondary">{{ t('automation.workbench.noHostStatistics') }}</span>
          </template>
        </el-table-column>
        <el-table-column
          :label="t('automation.workbench.status')"
          width="100"
          fixed="right"
          align="center"
          header-align="center"
        >
          <template #default="{ row }">
            <el-tag size="small" :type="getRunLogStatusType(row.status)">
              {{ getRunLogStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <template #footer>
      <div class="wb-drawer-footer">
        <div class="wb-run-secondary">
          <span>{{ t('automation.workbench.openRunHint') }}</span>
          <span v-if="pageKeyword">
            {{ t('automation.workbench.pageMatches', { matched: displayRecords.length, total: drawerRecords.length }) }}
          </span>
        </div>
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :total="drawerTotal"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          small
          @current-change="loadRecords"
          @size-change="handlePageSizeChange"
        />
        <el-button size="small" @click="$emit('navigate', resolvedLink)">{{ linkLabel || t('automation.workbench.viewFullRecords') }}</el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script setup>
import { t } from '@/core/i18n'
import { message, messageRef } from '@/core/i18n/feedback'

import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import * as jaoApi from '@/modules/automation/api/jao'
import { getAutomationRunTitle } from '../../utils/resourcePresentation'
import { formatDateTime as formatDateTimeGlobal } from '../../utils/helpers'
import {
  getRunLogStatusLabel,
  getRunLogStatusType
} from '@/modules/automation/constants/runLogStatus'
import { JOB_TYPE_OPTIONS } from '@/modules/automation/stores/useJobStore'
import { useActiveTaskListPolling } from '@/composables/useActiveTaskListPolling'
import {
  getWorkbenchJobType,
  getRunNodes,
  getRunHostStats,
  formatRunDuration
} from '../../utils/workbenchPresentation'

const props = defineProps({
  title: { type: String, default: '' },
  reloadVersion: { type: Number, default: 0 },
  initialType: { type: String, default: '' },
  link: { type: String, default: '/run-records/logs' },
  linkLabel: { type: String, default: '' },
  failedOnly: Boolean
})
defineEmits(['open-result', 'navigate'])
const visible = defineModel('visible', { default: false })
const dayOptions = computed(() => [
  { label: t('common.all'), value: '3650' },
  { label: t('automation.workbench.today'), value: '0' },
  { label: t('automation.workbench.last7Days'), value: '7' },
  { label: t('automation.workbench.last30Days'), value: '30' },
  { label: t('automation.workbench.lastYear'), value: '365' }
])
const statusOptions = computed(() => [
  { label: t('automation.workbench.allStatuses'), value: 'all' },
  { label: t('automation.workbench.waiting'), value: 'WAITING' },
  { label: t('automation.workbench.runningNow'), value: 'RUNNING' },
  { label: t('automation.workbench.callback'), value: 'CALLBACK' },
  { label: t('automation.workbench.executionError'), value: 'ERROR' },
  { label: t('automation.workbench.executionFailed'), value: 'FAILED' },
  { label: t('automation.workbench.done'), value: 'COMPLETED' },
  { label: t('automation.workbench.executionInterrupted'), value: 'INTERRUPTED' }
])
const drawerLoading = ref(false)
const loadError = messageRef('')
const drawerRecords = ref([])
const searchLabels = ref(new Map())
const drawerTotal = ref(0)
const pageKeyword = ref('')
const pagination = reactive({ page: 1, size: 20 })
const filters = reactive(defaultFilters())
const appliedFilters = reactive(defaultFilters())
let requestId = 0

function defaultFilters() {
  return { day: '0', status: props.failedOnly ? 'FAILED' : 'all', type: props.initialType }
}
const displayRecords = computed(() => {
  const keyword = pageKeyword.value.trim().toLowerCase()
  if (!keyword) return drawerRecords.value
  return drawerRecords.value.filter(row =>
    [
      searchLabels.value.get(row),
      row.job_title,
      row.username,
      row.review_user,
      ...getRunNodes(row)
    ]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(keyword))
  )
})
watch([pageKeyword, drawerRecords], () => {
  searchLabels.value = new Map(drawerRecords.value.map(row => [row,
    `${getAutomationRunTitle(row)} ${getWorkbenchJobType(row).label}`
  ]))
}, { flush: 'sync' })
const resolvedLink = computed(() => {
  const query = new URLSearchParams({ day: appliedFilters.day, status: appliedFilters.status })
  if (appliedFilters.type) query.set('type', appliedFilters.type)
  return `${props.link.split('?')[0]}?${query}`
})
useActiveTaskListPolling({
  records: drawerRecords,
  refresh: () => loadRecords(true),
  enabled: () => visible.value && !loadError.value && !drawerLoading.value
})

function formatDateTime(value) {
  return value ? formatDateTimeGlobal(value, 'YYYY-MM-DD HH:mm:ss') : '—'
}
async function loadRecords(background = false) {
  const currentId = ++requestId
  if (background !== true) drawerLoading.value = true
  loadError.value = ''
  try {
    const response = await jaoApi.fetchJobRunLogs({
      params: { ...appliedFilters, job_id: '', run_ids: '' },
      page: pagination.page,
      size: pagination.size,
      orderBy: 'start_time desc'
    })
    if (currentId !== requestId || !visible.value) return
    const data = response?.data || response || {}
    drawerRecords.value = Array.isArray(data.records) ? data.records : []
    drawerTotal.value = Number(data.total ?? data.count ?? drawerRecords.value.length) || 0
  } catch {
    if (currentId !== requestId) return
    drawerRecords.value = []
    loadError.value = message('automation.workbench.runLoadFailedRetry')
  } finally {
    if (currentId === requestId) drawerLoading.value = false
  }
}
function handleSearch() {
  Object.assign(appliedFilters, filters)
  pagination.page = 1
  drawerRecords.value = []
  drawerTotal.value = 0
  void loadRecords()
}
function handleReset() {
  Object.assign(filters, defaultFilters())
  pageKeyword.value = ''
  handleSearch()
}
function handlePageSizeChange() {
  pagination.page = 1
  void loadRecords()
}
watch(
  () => visible.value,
  isVisible => {
    requestId += 1
    if (!isVisible) {
      drawerLoading.value = false
      return
    }
    handleReset()
  }
)
watch(
  () => props.reloadVersion,
  () => {
    if (visible.value) void loadRecords(true)
  }
)
onBeforeUnmount(() => {
  requestId += 1
})
</script>

<style scoped lang="scss">
.wb-run-drawer__content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
}
.wb-filter-panel {
  padding: 12px 14px;
  flex-shrink: 0;
  overflow-x: auto;
  border: 1px solid var(--el-border-color-light);
  border-radius: 10px;
  background: var(--el-fill-color-extra-light);
}
.wb-filter-panel .wb-run-filters.el-form--inline {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0 16px;
}
.wb-filter-panel :deep(.wb-run-filters.el-form--inline .el-form-item) {
  flex-shrink: 0;
  margin: 0;
}
.wb-filter-panel :deep(.wb-run-filters.el-form--inline .wb-run-filters__keyword) {
  flex: 1 0 260px;
}
.wb-filter-panel
  :deep(.wb-run-filters.el-form--inline .wb-run-filters__keyword .el-form-item__content) {
  min-width: 0;
}
.wb-run-drawer__table {
  flex: 1;
  min-height: 0;
}
.wb-run-title {
  display: block;
  max-width: 100%;
  height: auto;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wb-run-secondary {
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wb-run-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 3px 10px;
  font-size: 12px;
  &--info {
    color: var(--el-text-color-regular);
  }
  &--success {
    color: var(--el-color-success);
  }
  &--danger {
    color: var(--el-color-danger);
  }
  &--warning {
    color: var(--el-color-warning);
  }
}
</style>
