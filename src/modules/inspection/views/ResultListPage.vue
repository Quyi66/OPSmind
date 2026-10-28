<template>
  <div class="ops-page-layout result-list-page">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small" @submit.prevent>
        <el-form-item label="巡检模板">
          <el-select
            :key="templateSelectVersion"
            v-model="selectedTemplateId"
            filterable
            clearable
            :loading="templateLoading"
            placeholder="全部模板"
            aria-label="筛选巡检模板"
            class="result-template-select"
            no-match-text="没有匹配的模板"
            @change="selectTemplate"
          >
            <el-option label="全部模板" value="" />
            <el-option
              v-if="missingSelectedTemplate"
              :label="`当前模板（ID：${selectedTemplateId}）`"
              :value="selectedTemplateId"
            />
            <el-option
              v-for="item in sortedTemplates"
              :key="item.id"
              :label="item.templateName"
              :value="String(item.id)"
            />
          </el-select>
          <span v-if="templateError" class="template-load-error" role="status">
            模板列表读取失败
            <el-button
              link
              type="primary"
              size="small"
              :loading="templateLoading"
              @click="loadTemplates"
            >
              重试
            </el-button>
          </span>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索执行记录"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <span v-if="filters.keyword !== appliedKeyword" class="pending-keyword" role="status">
            关键词尚未应用
          </span>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button title="清除模板和关键词，恢复默认分页" @click="handleReset">
            <el-icon><RefreshRight /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 操作栏 -->
    <div class="ops-action-bar">
      <span style="flex: 1"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="loading"
        :disabled="readError === 'auth'"
        @click="loadResults"
        title="刷新"
      >
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <el-alert v-if="readError" :title="readMessage" type="warning" :closable="false" show-icon>
      <el-button
        v-if="readError !== 'auth'"
        text
        type="primary"
        size="small"
        :disabled="loading"
        @click="retryRead"
      >
        重试读取
      </el-button>
    </el-alert>

    <!-- 表格区域 -->
    <div class="ops-table-wrapper">
      <el-table
        ref="resultTable"
        v-loading="loading"
        :data="tableData"
        height="100%"
        row-key="id"
        :default-sort="{ prop: sortState.prop, order: sortState.order }"
        @sort-change="handleSortChange"
      >
        <el-table-column
          prop="templateName"
          label="模板"
          min-width="200"
          show-overflow-tooltip
          sortable="custom"
        />
        <el-table-column label="配置主机数" min-width="110" align="right" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="configuration-count" :title="configurationCounts.get(row).summary">
              {{ configurationCounts.get(row).hostCount ?? '—' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="脚本数" min-width="90" align="right" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="configuration-count" :title="configurationCounts.get(row).summary">
              {{ configurationCounts.get(row).scriptCount ?? '—' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          prop="createdAt"
          label="开始时间"
          min-width="190"
          sortable="custom"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="endedAt"
          label="结束时间"
          min-width="190"
          sortable="custom"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ formatDateTime(row.endedAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="createdBy" label="执行人" min-width="110" show-overflow-tooltip />
        <el-table-column label="执行状态" min-width="110" align="left">
          <template #default="{ row }">
            <RunLogStatusTag
              :type="getStatusType(row.jobStatus)"
              size="small"
              @click="showJobLog(row)"
            >
              {{ getStatusText(row.jobStatus) }}
            </RunLogStatusTag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" align="left" fixed="right">
          <template #default="{ row }">
            <div
              class="result-row-actions"
              :title="reportActionReason(row)"
              :aria-label="reportActionReason(row) || undefined"
              :tabindex="!canViewReport(row) ? 0 : undefined"
            >
              <el-button
                text
                type="primary"
                size="small"
                :disabled="!canViewReport(row)"
                @click="viewStructuralDiagram(row)"
              >
                架构图
              </el-button>
              <el-button
                text
                type="primary"
                size="small"
                :disabled="!canViewReport(row)"
                @click="viewResult(row)"
              >
                检查结果
              </el-button>
            </div>
          </template>
        </el-table-column>
        <template #empty>
          <span v-if="loading">正在读取执行记录…</span>
          <span v-else-if="readError">{{ readMessage }}</span>
          <span v-else-if="hasResult">
            {{ selectedTemplateId || appliedKeyword ? '没有匹配的执行记录' : '暂无执行记录' }}
          </span>
          <span v-else>尚未读取执行记录</span>
        </template>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="ops-pagination-wrapper">
      <span class="result-list-note">
        数量为配置条目，悬浮查看各配置组；不代表报告覆盖或检查结果。
      </span>
      <span v-if="hasResult && pagination.total === null" class="result-list-note">
        总数暂不可核实
      </span>
      <el-pagination
        v-if="hasResult && pagination.total !== null"
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

    <!-- 执行状态弹窗 -->
    <ExecuteResultDialog
      v-model:visible="executeResultVisible"
      :run-id="currentRunId"
      :job-title="currentJobTitle"
    />
  </div>
</template>

<script setup>
import {
  ref,
  reactive,
  computed,
  nextTick,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  watch
} from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { formatDateTime as formatDateTimeGlobal } from '@/utils/date'
import { Refresh, Search, RefreshRight } from '@element-plus/icons-vue'
import axios from 'axios'
import { apiService } from '@/core/api'
import { authService } from '@/core/auth'
import { templateApi, jobApi } from '../api'
import {
  buildResultListRouteQuery,
  parseResultListRouteState,
  parseResultListSort
} from '../utils/result-list-route-state'
import { summarizeResultConfiguration } from '../utils/result-record-presentation'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import { useActiveTaskListPolling } from '@/composables/useActiveTaskListPolling'
import RunLogStatusTag from '@/components/shared/RunLogStatusTag.vue'

const router = useRouter()
const route = useRoute()

// 状态
const loading = ref(false)
const resultTable = ref(null)
const pageActive = ref(true)
const hasResult = ref(false)
const readError = ref('')
const appliedKeyword = ref('')
let successfulQuery = null
let attemptedQuery = null
let failedQuery = null
let logRequest = 0
let lastRouteState = ''
const templateLoading = ref(false)
const templateSelectVersion = ref(0)
const templateError = ref(false)
const tableData = ref([])
const templateList = ref([])
const selectedTemplateId = ref('')
const templateSearchText = ref('')
const filters = reactive({
  keyword: ''
})
const structuralSwitch = ref('no')
let resultRequest = 0
let disposed = false
onBeforeUnmount(() => {
  disposed = true
  pageActive.value = false
  logRequest++
  resultRequest++
})
onDeactivated(() => {
  pageActive.value = false
  logRequest++
  resultRequest++
  if (loading.value) readError.value = 'interrupted'
  loading.value = false
})
onActivated(() => {
  pageActive.value = true
  syncFromRoute()
})
const available = () => !disposed && pageActive.value && isResultsRoute()
const readMessage = computed(() => {
  if (readError.value === 'auth') return '登录已失效或无权读取执行记录，请重新登录或联系管理员。'
  if (!readError.value) return ''
  const reason = readError.value === 'interrupted' ? '读取已中断' : '读取失败'
  return hasResult.value
    ? `${reason}，当前显示上次成功结果，可能已过期。请重试。`
    : `${reason}，请重试读取执行记录。`
})
const configurationCounts = computed(
  () => new Map(tableData.value.map(row => [row, summarizeResultConfiguration(row.auditParams)]))
)

// 排序与 DataTables 状态
const drawCounter = ref(1)
const sortState = reactive({
  prop: 'createdAt',
  order: 'descending'
})

const COLUMN_INDEX_MAP = {
  templateName: 0,
  auditParams: 1,
  createdAt: 2,
  endedAt: 3,
  createdBy: 4
}

// 分页
const pagination = ref({
  page: 1,
  size: 10,
  total: 0
})

// 执行状态弹窗
const executeResultVisible = ref(false)
const currentRunId = ref('')
const currentJobTitle = ref('')

useActiveTaskListPolling({
  records: tableData,
  enabled: computed(() => available() && hasResult.value && !readError.value),
  refresh: loadResults,
  getStatus: row => row?.jobStatus
})

// The select searches its labels locally. Keep templateSearchText only for old URL compatibility.
const sortedTemplates = computed(() => {
  const list = [...templateList.value]

  // 按名称升序排序
  list.sort((a, b) => {
    const nameA = (a.templateName || '').toLowerCase()
    const nameB = (b.templateName || '').toLowerCase()
    return nameA.localeCompare(nameB)
  })

  return list
})
const missingSelectedTemplate = computed(
  () =>
    selectedTemplateId.value !== '' &&
    !templateList.value.some(item => String(item.id) === selectedTemplateId.value)
)

/**
 * 格式化日期时间
 */
function formatDateTime(dateStr) {
  if (dateStr == null || dateStr === '' || !Number.isFinite(new Date(dateStr).getTime())) return '—'
  return formatDateTimeGlobal(dateStr)
}

/**
 * 获取状态类型
 */
function getStatusType(status) {
  const statusMap = {
    OK: 'success',
    ERROR: 'danger',
    WAITING: 'info',
    RUNNING: 'primary'
  }
  return statusMap[status] || 'info'
}

/**
 * 获取状态文本
 */
function getStatusText(status) {
  const statusMap = {
    OK: '完成',
    ERROR: '失败',
    WAITING: '等待中',
    RUNNING: '运行中'
  }
  return statusMap[status] || status || '-'
}

/**
 * 加载配置参数
 */
async function loadParams() {
  try {
    const res = await apiService.get('/api/params/cac/structural_switch').catch(() => null)
    if (res?.value) {
      structuralSwitch.value = res.value
    }
  } catch (error) {
    console.error('加载配置参数失败:', error)
  }
}

/**
 * 加载模板列表
 */
async function loadTemplates() {
  templateLoading.value = true
  try {
    const response = await templateApi.getTemplates()
    const templates = response?.data || response || []
    if (!Array.isArray(templates)) throw new Error('Invalid inspection template list')
    templateList.value = templates
    templateError.value = false
  } catch (error) {
    templateError.value = true
    console.error('加载模板列表失败:', error)
  } finally {
    templateLoading.value = false
  }
}

/**
 * 加载检查结果
 */
function currentReadQuery() {
  return {
    templateId: selectedTemplateId.value,
    keyword: appliedKeyword.value,
    page: pagination.value.page,
    size: pagination.value.size,
    sortProp: sortState.prop,
    sortOrder: sortState.order
  }
}
function loadResults() {
  return readResults(currentReadQuery())
}
function retryRead() {
  if (!loading.value && readError.value !== 'auth')
    return readResults(failedQuery || currentReadQuery())
}

async function readResults(query) {
  if (!available() || readError.value === 'auth') return
  const snapshot = { ...query }
  const key = JSON.stringify(snapshot)
  if (key !== attemptedQuery) readError.value = ''
  attemptedQuery = key
  failedQuery = snapshot
  if (key !== successfulQuery) {
    tableData.value = []
    pagination.value.total = 0
    hasResult.value = false
  }
  const request = ++resultRequest
  const isCurrent = () => available() && request === resultRequest
  loading.value = true
  try {
    // 使用正确的API: POST /audit/api/audit/v2/jobs/page/{templateId}
    const templateId = snapshot.templateId === '' ? 'all' : snapshot.templateId

    // DataTables 格式的请求参数（与源系统完全一致）
    const params = new URLSearchParams()
    const columns = [
      { data: 'templateName', orderable: 'true', searchable: 'true' },
      { data: 'auditParams', orderable: 'true', searchable: 'true' },
      { data: 'createdAt', orderable: 'true', searchable: 'true' },
      { data: 'endedAt', orderable: 'true', searchable: 'true' },
      { data: 'createdBy', orderable: 'true', searchable: 'true' },
      { data: 'id', orderable: 'true', searchable: 'true' },
      { data: 'id', orderable: 'false', searchable: 'false' }
    ]

    columns.forEach((col, i) => {
      params.append(`columns[${i}][data]`, col.data)
      params.append(`columns[${i}][name]`, '')
      params.append(`columns[${i}][orderable]`, col.orderable)
      params.append(`columns[${i}][search][regex]`, 'false')
      params.append(`columns[${i}][search][value]`, '')
      params.append(`columns[${i}][searchable]`, col.searchable)
    })

    const colIndex = COLUMN_INDEX_MAP[snapshot.sortProp] ?? 2
    const dir = snapshot.sortOrder === 'ascending' ? 'asc' : 'desc'

    params.append('draw', String(drawCounter.value++))
    params.append('length', String(snapshot.size))
    params.append('order[0][column]', String(colIndex))
    params.append('order[0][dir]', dir)
    params.append('search[regex]', 'false')
    params.append('search[value]', snapshot.keyword)
    params.append('start', String((snapshot.page - 1) * snapshot.size))

    // 使用 axios 直接发送，确保作为 Form Data 发送
    const baseURL = import.meta.env.VITE_API_BASE_URL || '/sjxy-console'
    const authHeaders = authService.getAuthHeaders()
    const response = await axios.post(
      `${baseURL}/audit/api/audit/v2/jobs/page/${templateId}`,
      params,
      {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    )

    if (!isCurrent()) return
    const data = response?.data || response || {}
    if (!Array.isArray(data.data)) throw new Error('Invalid inspection result list')
    const rawTotal = data.recordsFiltered ?? data.recordsTotal
    const total = rawTotal == null || rawTotal === '' ? NaN : Number(rawTotal)
    tableData.value = data.data
    pagination.value.total = Number.isSafeInteger(total) && total >= 0 ? total : null
    hasResult.value = true
    successfulQuery = key
    readError.value = ''
    failedQuery = null
  } catch (error) {
    if (!isCurrent()) return
    console.error('加载检查结果失败:', error)
    const status = error?.response?.status
    const unauthorized =
      status === 401 ||
      status === 403 ||
      ['Authentication expired', 'Access denied'].includes(error?.message)
    if (unauthorized) {
      tableData.value = []
      pagination.value.total = 0
      hasResult.value = false
      successfulQuery = null
    }
    failedQuery = snapshot
    readError.value = unauthorized ? 'auth' : 'read'
  } finally {
    if (isCurrent()) loading.value = false
  }
}

function applyRouteState(query = {}) {
  const state = parseResultListRouteState(query)
  selectedTemplateId.value = state.templateId
  templateSearchText.value = state.templateSearchText
  filters.keyword = state.keyword
  appliedKeyword.value = state.keyword
  pagination.value.page = state.page
  pagination.value.size = state.size
  sortState.prop = state.sortProp
  sortState.order = state.sortOrder
  const { prop, order } = sortState
  nextTick(() => {
    if (available() && sortState.prop === prop && sortState.order === order)
      resultTable.value?.sort?.(prop, order)
  })
}

function getCurrentRouteStateQuery() {
  return buildResultListRouteQuery({
    templateId: selectedTemplateId.value,
    templateSearchText: templateSearchText.value,
    keyword: appliedKeyword.value,
    page: pagination.value.page,
    size: pagination.value.size,
    sortProp: sortState.prop,
    sortOrder: sortState.order
  })
}

/**
 * 选择模板
 */
function selectTemplate(templateId) {
  selectedTemplateId.value = templateId == null ? '' : String(templateId)
  pagination.value.page = 1
  loadResults()
}

/**
 * 处理表格排序变更
 */
function handleSortChange({ prop, order }) {
  const sort = parseResultListSort({ sortProp: prop, sortOrder: order })
  if (sortState.prop === sort.sortProp && sortState.order === sort.sortOrder) return
  sortState.prop = sort.sortProp
  sortState.order = sort.sortOrder
  pagination.value.page = 1
  loadResults()
}

/**
 * 搜索
 */
function handleSearch() {
  appliedKeyword.value = filters.keyword
  pagination.value.page = 1
  loadResults()
}

/**
 * 重置
 */
function handleReset() {
  // Reset Element's local search input as well as the selected value.
  templateSelectVersion.value++
  const query = { ...route.query }
  const filterKeys = [
    'templateId',
    'templateSearch',
    'keyword',
    'page',
    'size',
    'sortProp',
    'sortOrder'
  ]
  filterKeys.forEach(key => delete query[key])
  Object.assign(
    query,
    buildResultListRouteQuery({ sortProp: sortState.prop, sortOrder: sortState.order })
  )
  const target = { path: route.path, query, hash: route.hash }
  if (router.resolve(target).fullPath !== route.fullPath) {
    // The existing route watcher applies defaults and issues one read.
    return router.replace(target)
  }
  selectedTemplateId.value = ''
  templateSearchText.value = ''
  filters.keyword = ''
  appliedKeyword.value = ''
  pagination.value.page = 1
  pagination.value.size = 10
  loadResults()
}

/**
 * 分页大小变更
 */
function handlePageSizeChange() {
  pagination.value.page = 1
  loadResults()
}

/**
 * 页码变更
 */
function handlePageChange(page) {
  pagination.value.page = page
  loadResults()
}

/**
 * 显示任务执行状态
 */
async function showJobLog(row) {
  if (!available() || !tableData.value.includes(row)) return
  const request = ++logRequest
  const read = resultRequest
  const id = row.id
  const title = row.templateName || ''
  const isCurrent = () =>
    available() &&
    request === logRequest &&
    read === resultRequest &&
    tableData.value.includes(row) &&
    row.id === id
  // 首先获取 job 详情，获取 taskId 作为 runId
  try {
    const res = await jobApi.getJob(id)
    if (!isCurrent()) return
    const jobData = res?.data || res
    currentRunId.value = jobData?.taskId == null || jobData.taskId === '' ? id : jobData.taskId
    currentJobTitle.value = title
    executeResultVisible.value = true
  } catch (error) {
    if (!isCurrent()) return
    console.error('获取任务详情失败:', error)
    ElMessage.error('获取任务详情失败')
  }
}

/**
 * 获取当前模块基础路径
 */
function getBasePath() {
  const path = route.path
  const match = path.match(/^\/([^/]+)/)
  return match ? `/${match[1]}` : '/cac'
}

/**
 * 查看架构图
 */
function viewStructuralDiagram(row) {
  if (!canViewReport(row)) return
  router.push({
    path: `${getBasePath()}/structural-diagram/${row.id}`,
    query: getCurrentRouteStateQuery()
  })
}

/**
 * 查看结果详情
 */
function viewResult(row) {
  if (!canViewReport(row)) return
  router.push({
    path: `${getBasePath()}/results/${row.id}`,
    query: getCurrentRouteStateQuery()
  })
}

function canViewReport(row) {
  return available() && tableData.value.includes(row) && ['OK', 'ERROR'].includes(row.jobStatus)
}
function reportActionReason(row) {
  if (!['OK', 'ERROR'].includes(row.jobStatus)) return '任务结束后可查看架构图和检查结果'
  return readError.value ? '当前显示上次成功结果，可能已过期' : ''
}
function isResultsRoute() {
  return route.path === `${getBasePath()}/results`
}
function routeStateKey() {
  return JSON.stringify(
    ['templateId', 'templateSearch', 'keyword', 'page', 'size', 'sortProp', 'sortOrder'].map(
      key => route.query[key] ?? null
    )
  )
}
function syncFromRoute() {
  if (!available()) return
  const key = routeStateKey()
  if (key === lastRouteState) return
  lastRouteState = key
  applyRouteState(route.query)
  loadResults()
}
applyRouteState(route.query)
lastRouteState = routeStateKey()
onMounted(() => {
  loadParams()
  loadTemplates()
  loadResults()
})

// 监听路由 query 参数变化，支持从二级页回退后恢复列表状态
watch(() => (isResultsRoute() ? routeStateKey() : null), syncFromRoute)
</script>

<style scoped lang="scss">
.result-list-page {
  min-width: 0;
  gap: 12px;
  > .el-alert,
  > .ops-filter-bar,
  > .ops-action-bar {
    flex-shrink: 0;
  }
}
.result-template-select {
  width: 240px;
  max-width: 100%;
}
.template-load-error {
  margin-left: 8px;
  color: var(--el-color-warning-dark-2);
  font-size: 12px;
}
.pending-keyword {
  margin-left: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.configuration-count {
  font-variant-numeric: tabular-nums;
}
.result-row-actions {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  gap: 8px;
  :deep(.el-button.is-text) {
    margin-left: 0;
    flex-shrink: 0;
  }
}
.ops-pagination-wrapper {
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
}
.result-list-note {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin-right: auto;
}
.ops-table-wrapper {
  overflow: hidden;
}
</style>
