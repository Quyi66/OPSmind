<template>
  <div class="ops-page-layout win-patch-page">
    <div class="ops-filter-bar">
      <el-form :model="filters" :inline="true" size="small">
        <el-form-item label="主机">
          <el-input
            v-model="filters.hostKeyword"
            placeholder="主机地址或主机 ID"
            clearable
            style="width: 190px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="操作系统">
          <el-select
            v-model="filters.osDistro"
            placeholder="全部，可输入自定义值"
            clearable
            filterable
            allow-create
            style="width: 290px"
          >
            <el-option
              v-for="item in hostFilterOptions.osDistros"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="版本">
          <el-select
            v-model="filters.osVersion"
            placeholder="全部，可输入自定义值"
            clearable
            filterable
            allow-create
            style="width: 180px"
          >
            <el-option
              v-for="item in hostFilterOptions.osVersions"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
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
      <el-button type="primary" size="small" @click="openScanDialog()">创建扫描任务</el-button>
      <el-button
        size="small"
        :disabled="selectedHostRows.length === 0"
        @click="openScanDialog(selectedHostRows)"
      >
        扫描选中主机
      </el-button>
      <el-button size="small" @click="openReportDialog(selectedHostRows)">导出报告</el-button>
      <span class="win-patch-selection-text">已选 {{ selectedHostRows.length }} 台主机</span>
      <span style="flex: 1"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="loading"
        @click="loadPageData()"
      >
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <div class="ops-table-wrapper">
      <el-table
        v-loading="loading"
        :data="hostList"
        max-height="calc(100vh - 320px)"
        @selection-change="selection => (selectedHostRows = selection)"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column label="主机" width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="openHostDrawer(row)">
              {{ resolveHostKey(row) }}
            </el-link>
          </template>
        </el-table-column>
        <!-- <el-table-column label="主机 ID" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ resolveHostId(row) || '-' }}
          </template>
        </el-table-column> -->
        <el-table-column label="操作系统" min-width="240">
          <template #default="{ row }">
            {{ pickValue(row, ['osDistro', 'os_distro'], '-') }}
          </template>
        </el-table-column>
        <el-table-column label="版本" min-width="120">
          <template #default="{ row }">
            {{ pickValue(row, ['osVersion', 'os_version'], '-') }}
          </template>
        </el-table-column>
        <el-table-column label="架构" min-width="90">
          <template #default="{ row }">
            {{ pickValue(row, ['osArch', 'os_arch'], '-') }}
          </template>
        </el-table-column>
        <el-table-column label="缺失数" width="100" align="center">
          <template #default="{ row }">
            <span class="win-patch-metric">
              {{ pickValue(row, ['totalMissing', 'total_missing'], 0) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column width="90" align="center">
          <template #header>
            <span class="win-patch-severity-header">
              严重
              <span class="win-patch-severity-dot win-patch-severity-dot--critical"></span>
            </span>
          </template>
          <template #default="{ row }">
            <button
              type="button"
              class="win-patch-severity-link"
              :class="{ 'is-clickable': resolveSeverityCount(row, 'Critical') > 0 }"
              :disabled="resolveSeverityCount(row, 'Critical') <= 0"
              :title="resolveSeverityCount(row, 'Critical') > 0 ? '查看严重级别补丁' : ''"
              aria-label="查看严重级别补丁"
              @click="openHostDrawerWithSeverity(row, 'Critical')"
            >
              {{ resolveSeverityCount(row, 'Critical') }}
            </button>
          </template>
        </el-table-column>
        <el-table-column width="90" align="center">
          <template #header>
            <span class="win-patch-severity-header">
              重要
              <span class="win-patch-severity-dot win-patch-severity-dot--important"></span>
            </span>
          </template>
          <template #default="{ row }">
            <button
              type="button"
              class="win-patch-severity-link"
              :class="{ 'is-clickable': resolveSeverityCount(row, 'Important') > 0 }"
              :disabled="resolveSeverityCount(row, 'Important') <= 0"
              :title="resolveSeverityCount(row, 'Important') > 0 ? '查看重要级别补丁' : ''"
              aria-label="查看重要级别补丁"
              @click="openHostDrawerWithSeverity(row, 'Important')"
            >
              {{ resolveSeverityCount(row, 'Important') }}
            </button>
          </template>
        </el-table-column>
        <el-table-column width="90" align="center">
          <template #header>
            <span class="win-patch-severity-header">
              中等
              <span class="win-patch-severity-dot win-patch-severity-dot--moderate"></span>
            </span>
          </template>
          <template #default="{ row }">
            <button
              type="button"
              class="win-patch-severity-link"
              :class="{ 'is-clickable': resolveSeverityCount(row, 'Moderate') > 0 }"
              :disabled="resolveSeverityCount(row, 'Moderate') <= 0"
              :title="resolveSeverityCount(row, 'Moderate') > 0 ? '查看中等级别补丁' : ''"
              aria-label="查看中等级别补丁"
              @click="openHostDrawerWithSeverity(row, 'Moderate')"
            >
              {{ resolveSeverityCount(row, 'Moderate') }}
            </button>
          </template>
        </el-table-column>
        <el-table-column width="80" align="center">
          <template #header>
            <span class="win-patch-severity-header">
              低危
              <span class="win-patch-severity-dot win-patch-severity-dot--low"></span>
            </span>
          </template>
          <template #default="{ row }">
            <button
              type="button"
              class="win-patch-severity-link"
              :class="{ 'is-clickable': resolveSeverityCount(row, 'Low') > 0 }"
              :disabled="resolveSeverityCount(row, 'Low') <= 0"
              :title="resolveSeverityCount(row, 'Low') > 0 ? '查看低危级别补丁' : ''"
              aria-label="查看低危级别补丁"
              @click="openHostDrawerWithSeverity(row, 'Low')"
            >
              {{ resolveSeverityCount(row, 'Low') }}
            </button>
          </template>
        </el-table-column>
        <el-table-column width="90" align="center">
          <template #header>
            <span class="win-patch-severity-header">
              未分级
              <span class="win-patch-severity-dot win-patch-severity-dot--unspecified"></span>
            </span>
          </template>
          <template #default="{ row }">
            <button
              type="button"
              class="win-patch-severity-link"
              :class="{ 'is-clickable': resolveSeverityCount(row, 'Unspecified') > 0 }"
              :disabled="resolveSeverityCount(row, 'Unspecified') <= 0"
              :title="resolveSeverityCount(row, 'Unspecified') > 0 ? '查看未分级补丁' : ''"
              aria-label="查看未分级补丁"
              @click="openHostDrawerWithSeverity(row, 'Unspecified')"
            >
              {{ resolveSeverityCount(row, 'Unspecified') }}
            </button>
          </template>
        </el-table-column>
        <el-table-column label="已安装" width="90" align="center">
          <template #default="{ row }">
            <span class="win-patch-metric">
              {{ pickValue(row, ['installedCount', 'installed_count'], 0) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="最后扫描时间" width="190" class-name="win-patch-table__time-column">
          <template #default="{ row }">
            {{ formatDateTime(pickValue(row, ['lastScanDate', 'last_scan_date'], '')) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="openHostDrawer(row)">
              查看补丁
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="WIN_PATCH_PAGE_SIZE_OPTIONS"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <WinPatchScanDialog
      v-model="scanDialogVisible"
      :preselected-hosts="scanDialogHosts"
      @submitted="handleTaskSubmitted"
    />

    <WinPatchReportDialog v-model="reportDialogVisible" :preselected-hosts="reportDialogHosts" />

    <WinPatchHostPatchesDrawer
      v-model="hostDrawerVisible"
      :host-summary="currentHost"
      :initial-filters="hostDrawerInitialFilters"
      @task-submitted="handleTaskSubmitted"
    />

    <WinPatchTaskDetailDrawer v-model="taskDrawerVisible" :task-id="currentTaskId" />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Refresh, RefreshRight, Search } from '@element-plus/icons-vue'
import WinPatchHostPatchesDrawer from '../components/overview/WinPatchHostPatchesDrawer.vue'
import WinPatchReportDialog from '../components/overview/WinPatchReportDialog.vue'
import WinPatchScanDialog from '../components/overview/WinPatchScanDialog.vue'
import WinPatchTaskDetailDrawer from '../components/tasks/WinPatchTaskDetailDrawer.vue'
import { winPatchApi } from '../api'
import { WIN_PATCH_PAGE_SIZE_OPTIONS } from '../constants'
import {
  formatDateTime,
  parsePageResponse,
  pickValue,
  resolveHostKey
} from '../utils'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const hostList = ref([])
const selectedHostRows = ref([])
const currentHost = ref(null)
const hostDrawerInitialFilters = ref(null)
const currentTaskId = ref('')

const scanDialogVisible = ref(false)
const hostDrawerVisible = ref(false)
const reportDialogVisible = ref(false)
const taskDrawerVisible = ref(false)
const reportDialogHosts = ref([])
const scanDialogHosts = ref([])

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const filters = reactive({
  hostKeyword: '',
  osDistro: '',
  osVersion: ''
})

const appliedFilters = reactive({
  hostKeyword: '',
  osDistro: '',
  osVersion: ''
})

const severityCountFields = {
  Critical: ['criticalCount', 'critical_count'],
  Important: ['importantCount', 'important_count'],
  Moderate: ['moderateCount', 'moderate_count'],
  Low: ['lowCount', 'low_count'],
  Unspecified: ['unspecifiedCount', 'unspecified_count']
}

function createHostFieldOptions(keys) {
  return Array.from(
    new Set(hostList.value.map(row => String(pickValue(row, keys, '') || '').trim()).filter(Boolean))
  ).sort((left, right) => left.localeCompare(right, 'zh-CN'))
}

const hostFilterOptions = computed(() => ({
  osDistros: createHostFieldOptions(['osDistro', 'os_distro']),
  osVersions: createHostFieldOptions(['osVersion', 'os_version'])
}))

async function loadPageData() {
  loading.value = true
  try {
    const hostResponse = await winPatchApi.getHosts({
      page: pagination.page - 1,
      size: pagination.pageSize,
      keyword: appliedFilters.hostKeyword,
      os: appliedFilters.osDistro,
      osVersion: appliedFilters.osVersion
    })

    const hostPage = parsePageResponse(hostResponse)
    hostList.value = hostPage.content
    pagination.total = hostPage.total
    selectedHostRows.value = []
  } finally {
    loading.value = false
  }
}

function openScanDialog(rows = []) {
  scanDialogHosts.value = rows
  scanDialogVisible.value = true
}

function openReportDialog(rows = []) {
  reportDialogHosts.value = rows
  reportDialogVisible.value = true
}

function handleSearch() {
  Object.assign(appliedFilters, filters)
  pagination.page = 1
  loadPageData()
}

function handleReset() {
  Object.keys(filters).forEach(key => {
    filters[key] = ''
    appliedFilters[key] = ''
  })
  pagination.page = 1
  loadPageData()
}

function openHostDrawer(row, initialFilters = null) {
  currentHost.value = row
  hostDrawerInitialFilters.value = initialFilters ? { ...initialFilters } : null
  hostDrawerVisible.value = true
}

function resolveSeverityCount(row, severity) {
  return Number(pickValue(row, severityCountFields[severity] || [], 0) || 0)
}

function openHostDrawerWithSeverity(row, severity) {
  if (resolveSeverityCount(row, severity) <= 0) {
    return
  }

  openHostDrawer(row, {
    severity,
    patchStatus: 'no_repair'
  })
}

function handleTaskSubmitted(task) {
  currentTaskId.value = pickValue(task, ['id'], '')
  taskDrawerVisible.value =
    Boolean(currentTaskId.value) && pickValue(task, ['openDetail'], true) !== false

  if (pickValue(task, ['refreshOverview'], true) !== false) {
    loadPageData()
  }
}

function handlePageChange(page) {
  pagination.page = page
  loadPageData()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  loadPageData()
}

function normalizeDialogValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function replaceToOverviewIfNeeded(dialogType) {
  if (normalizeDialogValue(route.query.dialog) !== dialogType) {
    return
  }

  router.replace({ path: '/patches/windowsVulnerability' })
}

watch(
  () => route.query.dialog,
  dialog => {
    const normalized = normalizeDialogValue(dialog)

    if (normalized === 'report') {
      openReportDialog(selectedHostRows.value)
      return
    }

    if (normalized) {
      router.replace({ path: '/patches/windowsVulnerability' })
    }
  },
  { immediate: true }
)

watch(reportDialogVisible, visible => {
  if (!visible) {
    replaceToOverviewIfNeeded('report')
  }
})

onMounted(() => {
  loadPageData()
})
</script>

<style scoped lang="scss">
.win-patch-page {
  gap: 12px;
}

.win-patch-selection-text {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.win-patch-metric {
  color: var(--el-text-color-regular);
  font-variant-numeric: tabular-nums;
}

.win-patch-severity-header {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.win-patch-severity-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.win-patch-severity-dot--critical {
  background-color: var(--el-color-danger);
}

.win-patch-severity-dot--important {
  background-color: var(--el-color-warning);
}

.win-patch-severity-dot--moderate {
  background-color: #ffc72e;
}

.win-patch-severity-dot--low {
  background-color: var(--el-color-primary);
}

.win-patch-severity-dot--unspecified {
  background-color: var(--el-text-color-secondary);
}

.win-patch-severity-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  padding: 2px 6px;
  border: 0;
  border-radius: var(--el-border-radius-small);
  background: transparent;
  font: inherit;
  color: var(--el-text-color-regular);
  line-height: 20px;
  font-variant-numeric: tabular-nums;
  transition:
    background-color 0.2s ease,
    text-decoration-color 0.2s ease;

  &:disabled {
    cursor: default;
  }

  &.is-clickable {
    color: var(--el-color-primary);
    font-weight: 600;
    text-decoration: underline;
    text-decoration-style: dashed;
    text-underline-offset: 3px;
    cursor: pointer;
  }

  &.is-clickable:hover {
    background-color: var(--el-fill-color-light);
    text-decoration-style: solid;
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary-light-5);
    outline-offset: 1px;
  }
}

:deep(.win-patch-table__time-column .cell) {
  white-space: nowrap;
}
</style>
