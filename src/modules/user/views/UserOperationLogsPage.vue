<template>
  <div class="ops-page-layout user-operation-logs-page">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small" @submit.prevent>
        <el-form-item label="状态">
          <el-select
            v-model="filters.status"
            placeholder="全部"
            style="width: 180px"
            multiple
            collapse-tags
            collapse-tags-tooltip
            @change="handleFilterChange"
          >
            <el-option label="已完成" value="COMPLETED" />
            <el-option label="运行失败" value="FAILED" />
            <el-option label="运行中" value="RUNNING" />
            <el-option label="运行错误" value="ERROR" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-select v-model="filters.day" style="width: 120px" @change="handleFilterChange">
            <el-option label="全部" value="3650" />
            <el-option label="今天" value="1" />
            <el-option label="最近一周" value="7" />
            <el-option label="最近一月" value="30" />
            <el-option label="最近一年" value="365" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="用户名、执行节点、结果"
            clearable
            style="width: 220px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
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

    <div v-if="readError" class="read-feedback" role="status">
      <el-alert :title="readError" type="warning" :closable="false" show-icon />
      <el-button v-if="!authError" size="small" :loading="loading" @click="loadData">
        重试读取
      </el-button>
    </div>
    <el-alert v-if="routeError" :title="routeError" type="warning" :closable="false" />
    <el-alert
      v-if="!loading && !readError && !totalKnown"
      title="未返回可确认的总数，暂不提供翻页。"
      type="info"
      :closable="false"
    />

    <!-- 操作栏 -->
    <div class="ops-action-bar">
      <span style="flex: 1"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="loading"
        @click="loadData"
        title="刷新"
      >
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <!-- 表格区域 -->
    <div class="ops-table-wrapper">
      <el-table
        :data="tableData"
        v-loading="loading"
        style="width: 100%"
        height="100%"
        :empty-text="emptyText"
      >
        <el-table-column prop="start_time" label="开始时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.start_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            {{ translateAction(row.action) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <RunLogStatusTag
              :type="getStatusType(row.status)"
              size="small"
              :clickable="!!row.run_id"
              @click="handleViewRunResult(row)"
            >
              {{ getStatusLabel(row.status) }}
            </RunLogStatusTag>
          </template>
        </el-table-column>
        <el-table-column
          prop="executor_node"
          label="执行节点"
          min-width="140"
          show-overflow-tooltip
        />
        <el-table-column prop="message" label="结果" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.message || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="username" label="用户" min-width="100" show-overflow-tooltip />
        <el-table-column prop="end_time" label="结束时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.end_time) }}
          </template>
        </el-table-column>
        <el-table-column label="耗时" width="100">
          <template #default="{ row }">
            {{ calcDuration(row.start_time, row.end_time) }}
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页区域 -->
    <div v-if="totalKnown" class="ops-pagination-wrapper">
      <el-pagination
        :current-page="currentPage"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        :disabled="loading || !!readError"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @update:page-size="handlePageSizeChange"
        @update:current-page="handleCurrentPageChange"
      />
    </div>

    <!-- 作业运行结果弹窗 -->
    <ExecuteResultDialog v-model:visible="showRunResultDialog" :run-id="currentRunId" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onActivated, onDeactivated, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, Refresh, RefreshRight } from '@element-plus/icons-vue'
import * as userApi from '@/modules/user/api'
import { translateI18nKey } from '@/utils/i18n'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import { useActiveTaskListPolling } from '@/composables/useActiveTaskListPolling'
import RunLogStatusTag from '@/components/shared/RunLogStatusTag.vue'

const route = useRoute()
const router = useRouter()

const props = defineProps({
  initialFilters: {
    type: Object,
    default: () => ({})
  }
})

function entryFilters(source) {
  const day = String(source.day || '3650')
  const statuses = Array.isArray(source.status)
    ? source.status
    : String(source.status || '').split(',')
  return {
    day: ['3650', '1', '7', '30', '365'].includes(day) ? day : '3650',
    status: [
      ...new Set(
        statuses.filter(status => ['COMPLETED', 'FAILED', 'RUNNING', 'ERROR'].includes(status))
      )
    ],
    keyword: ''
  }
}
const filters = ref(entryFilters({ ...props.initialFilters, ...route.query }))
const appliedFilters = ref({ ...filters.value, status: [...filters.value.status] })

const loading = ref(false)
const tableData = ref([])
const readError = ref('')
const routeError = ref('')
const authError = ref(false)
const active = ref(true)
let requestVersion = 0
let successfulQuery = null
let totalConditions = null
let pendingRouteRead = false
let resetRouteSignature = null
const totalKnown = ref(false)
const emptyText = computed(() =>
  loading.value ? '正在读取…' : readError.value || '暂无符合条件的操作日志'
)

useActiveTaskListPolling({
  records: tableData,
  refresh: loadData,
  enabled: computed(() => active.value && !loading.value && !readError.value)
})
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

const showRunResultDialog = ref(false)
const currentRunId = ref('')

function formatDateTime(isoString) {
  if (!isoString) return '-'
  try {
    const date = new Date(isoString)
    if (!Number.isFinite(date.getTime())) return '-'
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  } catch {
    return '-'
  }
}

function calcDuration(startTime, endTime) {
  if (!startTime || !endTime) return '-'
  try {
    const start = new Date(startTime).getTime()
    const end = new Date(endTime).getTime()
    const diff = end - start
    if (!Number.isFinite(diff) || diff < 0) return '-'

    const totalSeconds = Math.floor(diff / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }
    return `0:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  } catch {
    return '-'
  }
}

function getStatusType(status) {
  const types = {
    SUCCESS: 'success',
    COMPLETED: 'success',
    FAILED: 'danger',
    RUNNING: 'warning'
  }
  return types[status] || 'info'
}

function getStatusLabel(status) {
  const labels = {
    SUCCESS: '运行成功',
    COMPLETED: '已完成',
    FAILED: '运行失败',
    RUNNING: '运行中',
    ERROR: '运行错误'
  }
  return labels[status] || status
}

function translateAction(action) {
  if (!action) return '-'
  return translateI18nKey(action)
}

function handleViewRunResult(row) {
  if (active.value && !authError.value && tableData.value.includes(row) && row.run_id) {
    currentRunId.value = row.run_id
    showRunResultDialog.value = true
  }
}

function loadData() {
  return readQuery({
    ...appliedFilters.value,
    status: [...appliedFilters.value.status],
    page: currentPage.value,
    size: pageSize.value
  })
}
async function readQuery(snapshot, canCorrectPage = true) {
  if (!active.value) return
  const version = ++requestVersion
  const key = JSON.stringify(snapshot)
  const conditions = JSON.stringify([snapshot.day, snapshot.status, snapshot.keyword])
  if (key !== successfulQuery) {
    tableData.value = []
    successfulQuery = null
    readError.value = ''
    authError.value = false
  }
  if (conditions !== totalConditions) {
    total.value = 0
    totalKnown.value = false
  }
  loading.value = true
  const isCurrent = () => active.value && version === requestVersion
  try {
    const response = await userApi.getOperationLogs(
      {
        module: 'uim',
        action: 'all',
        status: snapshot.status.length ? snapshot.status.join(',') : 'all',
        day: snapshot.day
      },
      snapshot.keyword ? `username|executor_node|message:*${snapshot.keyword}*` : '',
      snapshot.page,
      snapshot.size
    )
    if (!isCurrent()) return
    const records = response?.records
    const count = response?.total
    if (!Array.isArray(records)) throw new Error('Invalid operation log records')
    const known = Number.isSafeInteger(count) && count >= 0
    if (known && snapshot.page > Math.max(1, Math.ceil(count / snapshot.size))) {
      if (!canCorrectPage) throw new Error('Operation log page changed again')
      const page = Math.max(1, Math.ceil(count / snapshot.size))
      total.value = count
      totalKnown.value = true
      totalConditions = conditions
      currentPage.value = page
      return await readQuery({ ...snapshot, page }, false)
    }
    if (known && count < (snapshot.page - 1) * snapshot.size + records.length)
      throw new Error('Inconsistent operation log total')
    tableData.value = records
    total.value = known ? count : 0
    totalKnown.value = known
    totalConditions = conditions
    successfulQuery = key
    readError.value = ''
    authError.value = false
  } catch (error) {
    if (!isCurrent()) return
    console.error('Failed to load operation logs:', error)
    authError.value =
      [401, 403].includes(error?.response?.status) ||
      ['Authentication expired', 'Access denied'].includes(error?.message)
    if (authError.value) {
      tableData.value = []
      total.value = 0
      totalKnown.value = false
      totalConditions = null
      successfulQuery = null
      showRunResultDialog.value = false
      currentRunId.value = ''
    }
    readError.value = authError.value
      ? '读取失败：登录已失效或无权访问，请重新登录或联系管理员。'
      : successfulQuery === key
        ? '刷新失败，当前显示上次成功结果，可能已过期；请重试。'
        : totalKnown.value
          ? '操作日志读取失败，分页总数沿上次同条件结果；请重试。'
          : '操作日志读取失败，请重试。'
  } finally {
    if (isCurrent()) loading.value = false
  }
}

function handleSearch() {
  appliedFilters.value = {
    day: filters.value.day,
    status: [...filters.value.status],
    keyword: filters.value.keyword
  }
  currentPage.value = 1
  return loadData()
}
function handleFilterChange() {
  appliedFilters.value = {
    day: filters.value.day,
    status: [...filters.value.status],
    keyword: appliedFilters.value.keyword
  }
  currentPage.value = 1
  return loadData()
}
function handlePageSizeChange(size) {
  if (![10, 20, 50, 100].includes(size) || pageSize.value === size) return
  pageSize.value = size
  currentPage.value = 1
  return loadData()
}
function handleCurrentPageChange(page) {
  if (
    !totalKnown.value ||
    readError.value ||
    page === currentPage.value ||
    !Number.isSafeInteger(page) ||
    page < 1
  )
    return
  currentPage.value = page
  return loadData()
}

function handleReset() {
  filters.value = entryFilters({})
  appliedFilters.value = { ...filters.value, status: [] }
  currentPage.value = 1
  pageSize.value = 10
  loadData()
  routeError.value = ''
  if (route.query.day !== undefined || route.query.status !== undefined) {
    const query = { ...route.query }
    delete query.day
    delete query.status
    resetRouteSignature = JSON.stringify([query.day, query.status])
    const version = requestVersion
    router.replace({ query, hash: route.hash }).catch(() => {
      resetRouteSignature = null
      if (active.value && version === requestVersion)
        routeError.value = '筛选已重置，但地址条件清理失败；重新打开页面前请核对地址。'
    })
  }
}

watch(
  () => JSON.stringify([route.query.day, route.query.status]),
  signature => {
    if (signature === resetRouteSignature) {
      resetRouteSignature = null
      return
    }
    resetRouteSignature = null
    if (route.path !== '/users/logs') return
    const incoming = entryFilters(route.query)
    if (JSON.stringify(incoming) === JSON.stringify(appliedFilters.value)) return
    filters.value = incoming
    appliedFilters.value = { ...incoming, status: [...incoming.status] }
    currentPage.value = 1
    pageSize.value = 10
    routeError.value = ''
    if (active.value) loadData()
    else pendingRouteRead = true
  }
)
onMounted(loadData)
onActivated(() => {
  active.value = true
  if (pendingRouteRead) {
    pendingRouteRead = false
    loadData()
  }
})
function suspendRead() {
  active.value = false
  requestVersion += 1
  if (loading.value) readError.value = '操作日志读取已中断，请重试。'
  loading.value = false
  showRunResultDialog.value = false
  currentRunId.value = ''
}
onDeactivated(suspendRead)
onBeforeUnmount(suspendRead)
</script>

<style scoped lang="scss">
.ops-filter-bar,
.ops-action-bar,
.read-feedback {
  flex-shrink: 0;
}
.ops-table-wrapper {
  overflow: hidden;
}
.read-feedback {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.read-feedback .el-alert {
  flex: 1;
  min-width: 0;
}
</style>
