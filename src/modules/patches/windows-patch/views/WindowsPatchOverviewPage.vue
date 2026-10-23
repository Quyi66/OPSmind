<template>
  <div class="ops-page-layout win-patch-page">
    <div class="ops-filter-bar">
      <el-form :model="filters" :inline="true" size="small" @submit.prevent>
        <el-form-item label="主机">
          <el-input
            v-model="filters.hostKeyword"
            placeholder="主机地址或主机 ID"
            clearable
            style="width: 190px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
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
            @change="handleFilterChange"
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
            @change="handleFilterChange"
          >
            <el-option
              v-for="item in hostFilterOptions.osVersions"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="标签">
          <el-select
            v-model="filters.tags"
            placeholder="全部标签"
            multiple
            collapse-tags
            collapse-tags-tooltip
            clearable
            filterable
            :loading="tagLoading"
            style="width: 180px"
            @change="handleFilterChange"
          >
            <el-option v-for="tag in tagOptions" :key="tag" :label="tag" :value="tag" />
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
        :disabled="!canUseHostRows || selectedHostRows.length === 0"
        @click="openScanDialog(selectedHostRows)"
      >
        扫描选中主机
      </el-button>
      <el-button
        type="success"
        size="small"
        :disabled="!canUseHostRows || selectedHostRows.length === 0"
        @click="openBatchInstallDrawer(selectedHostRows)"
      >
        安装补丁
      </el-button>
      <el-button size="small" @click="openReportDialog(selectedHostRows)">导出报告</el-button>
      <span class="win-patch-selection-text">已选 {{ selectedHostRows.length }} 台主机</span>
      <span style="flex: 1"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="loading"
        aria-label="刷新主机列表"
        @click="loadPageData()"
      >
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <el-alert v-if="loadError" :title="loadError" type="error" :closable="false" show-icon>
      <el-button link type="primary" @click="loadPageData()">重试</el-button>
    </el-alert>

    <div class="ops-table-wrapper">
      <el-table
        v-loading="loading"
        :data="hostList"
        :empty-text="
          loading ? '正在加载主机列表…' : loadError ? '主机列表未加载' : '暂无符合条件的主机'
        "
        max-height="calc(100vh - 354px)"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="48" :selectable="isCurrentHostRow" />
        <el-table-column label="主机" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link
              type="primary"
              underline="never"
              :disabled="!canUseHostRows"
              @click="openHostDrawer(row)"
            >
              {{ resolveHostKey(row) }}
            </el-link>
          </template>
        </el-table-column>
        <!-- <el-table-column label="主机 ID" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ resolveHostId(row) || '-' }}
          </template>
        </el-table-column> -->
        <el-table-column label="操作系统" min-width="220">
          <template #default="{ row }">
            {{ pickValue(row, ['osDistro', 'os_distro'], '-') }}
          </template>
        </el-table-column>
        <el-table-column width="80" align="center">
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
        <el-table-column width="80" align="center">
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
        <el-table-column width="80" align="center">
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
        <el-table-column label="已安装" width="80">
          <template #default="{ row }">
            <span class="win-patch-metric">
              {{ pickValue(row, ['installedCount', 'installed_count'], 0) }}
            </span>
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
        <el-table-column label="标签" min-width="140">
          <template #default="{ row }">
            <div v-if="getRowTags(row).length" class="win-patch-host-tags">
              <el-tag
                v-for="(tag, index) in getRowTags(row)"
                :key="`${tag}-${index}`"
                size="small"
                effect="plain"
              >
                {{ tag }}
              </el-tag>
            </div>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="内存" width="170">
          <template #default="{ row }">
            <div v-if="row.memoryOverview" class="memory-overview">
              <div
                v-if="row.memoryOverview.usedPercent !== null"
                class="memory-usage"
                :class="`memory-usage--${row.memoryOverview.usageLevel}`"
              >
                <div
                  class="memory-usage__track"
                  :title="`已使用 ${row.memoryOverview.usedPercent}%`"
                >
                  <div
                    class="memory-usage__fill"
                    :style="{ width: `${row.memoryOverview.usedPercent}%` }"
                  />
                </div>
                <div class="memory-usage__desc">
                  {{ row.memoryOverview.freeGb }} GB 可用, 共 {{ row.memoryOverview.totalGb }} GB
                </div>
              </div>
              <div v-else class="memory-usage memory-usage--unknown">
                <div class="memory-usage__track" />
                <div class="memory-usage__desc">
                  {{
                    row.memoryOverview.freeGb !== null
                      ? `${row.memoryOverview.freeGb} GB 可用`
                      : '-'
                  }}{{
                    row.memoryOverview.totalGb !== null
                      ? `, 共 ${row.memoryOverview.totalGb} GB`
                      : ', 总量未知'
                  }}
                </div>
              </div>
            </div>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <!-- <el-table-column label="缺失数" width="80" align="center">
          <template #default="{ row }">
            <span class="win-patch-metric">
              {{ pickValue(row, ['totalMissing', 'total_missing'], 0) }}
            </span>
          </template>
        </el-table-column> -->
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

    <div v-if="!loading && !loadError" class="ops-pagination-wrapper">
      <el-pagination
        :current-page="pagination.page"
        :page-size="pagination.pageSize"
        :page-sizes="WIN_PATCH_PAGE_SIZE_OPTIONS"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @update:page-size="handleSizeChange"
        @update:current-page="handlePageChange"
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
      @view-history="openHostHistory"
    />

    <WinPatchBatchInstallDrawer
      v-model="batchInstallDrawerVisible"
      :host-summaries="batchInstallHosts"
      @task-submitted="handleTaskSubmitted"
    />

    <WinPatchTaskDetailDrawer
      v-model="taskDrawerVisible"
      :task-id="currentTaskId"
      @close="handleTaskDrawerClose"
    />
  </div>
</template>

<script setup>
import {
  computed,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  reactive,
  ref,
  watch
} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Refresh, RefreshRight, Search } from '@element-plus/icons-vue'
import WinPatchHostPatchesDrawer from '../components/overview/WinPatchHostPatchesDrawer.vue'
import WinPatchBatchInstallDrawer from '../components/overview/WinPatchBatchInstallDrawer.vue'
import WinPatchReportDialog from '../components/overview/WinPatchReportDialog.vue'
import WinPatchScanDialog from '../components/overview/WinPatchScanDialog.vue'
import WinPatchTaskDetailDrawer from '../components/tasks/WinPatchTaskDetailDrawer.vue'
import { winPatchApi } from '../api'
import { WIN_PATCH_PAGE_SIZE_OPTIONS } from '../constants'
import { dataManageApi } from '@/modules/asset/api'
import { buildMemoryOverview } from '@/modules/patches/utils/linuxPatchScan'
import {
  formatDateTime,
  parsePageResponse,
  pickValue,
  resolveHostKey,
  unwrapResponse
} from '../utils'

const route = useRoute()
const router = useRouter()
const WIN_PATCH_TAG_CI_TYPES = ['host', 'windows']

const loading = ref(false)
const loadError = ref('')
const pageActive = ref(true)
let loadRequestId = 0
const tagLoading = ref(false)
const hostList = ref([])
const tagOptions = ref([])
const selectedHostRows = ref([])
const canUseHostRows = computed(() => pageActive.value && !loading.value && !loadError.value)
const currentHost = ref(null)
const hostDrawerInitialFilters = ref(null)
const currentTaskId = ref('')

const scanDialogVisible = ref(false)
const hostDrawerVisible = ref(false)
const reportDialogVisible = ref(false)
const taskDrawerVisible = ref(false)
const batchInstallDrawerVisible = ref(false)
const reportDialogHosts = ref([])
const scanDialogHosts = ref([])
const batchInstallHosts = ref([])

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const filters = reactive({
  hostKeyword: '',
  osDistro: '',
  osVersion: '',
  tags: []
})

const appliedFilters = reactive({
  hostKeyword: '',
  osDistro: '',
  osVersion: '',
  tags: []
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
    new Set(
      hostList.value.map(row => String(pickValue(row, keys, '') || '').trim()).filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right, 'zh-CN'))
}

const hostFilterOptions = computed(() => ({
  osDistros: createHostFieldOptions(['osDistro', 'os_distro']),
  osVersions: createHostFieldOptions(['osVersion', 'os_version'])
}))

function getExplicitHostTotal(response) {
  const data = unwrapResponse(response)
  const value = data?.totalElements ?? data?.total
  if (!['number', 'string'].includes(typeof value) || String(value).trim() === '') return null
  const total = Number(value)
  return Number.isSafeInteger(total) && total >= 0 ? total : null
}

async function loadPageData() {
  if (!pageActive.value) return
  const requestId = ++loadRequestId
  let query = {
    page: pagination.page - 1,
    size: pagination.pageSize,
    keyword: appliedFilters.hostKeyword,
    os: appliedFilters.osDistro,
    osVersion: appliedFilters.osVersion,
    tags: [...appliedFilters.tags]
  }
  const isCurrentRequest = () => pageActive.value && requestId === loadRequestId
  loading.value = true
  loadError.value = ''
  hostList.value = []
  pagination.total = 0
  selectedHostRows.value = []
  try {
    let hostResponse = await winPatchApi.getHosts(query)
    if (!isCurrentRequest()) return

    // 仅明确的服务端总数用于校正失效页；最多补查一次，避免数据持续变化时循环。
    const total = getExplicitHostTotal(hostResponse)
    if (total !== null) {
      const lastPage = Math.max(0, Math.ceil(total / query.size) - 1)
      if (query.page > lastPage) {
        query = { ...query, page: lastPage }
        pagination.page = lastPage + 1
        hostResponse = await winPatchApi.getHosts(query)
        if (!isCurrentRequest()) return
        const correctedTotal = getExplicitHostTotal(hostResponse)
        if (
          correctedTotal !== null &&
          query.page > Math.max(0, Math.ceil(correctedTotal / query.size) - 1)
        ) {
          throw new Error('主机列表分页已变化，请重试')
        }
      }
    }

    const hostPage = parsePageResponse(hostResponse)
    if (!Number.isSafeInteger(hostPage.total) || hostPage.total < 0) {
      throw new Error('主机列表总数无效')
    }
    hostList.value = hostPage.content.map(row => ({
      ...row,
      memoryOverview: buildHostMemoryOverview(row)
    }))
    pagination.total = hostPage.total
    selectedHostRows.value = []
  } catch {
    if (!isCurrentRequest()) return
    loadError.value = '加载主机列表失败，请重试'
  } finally {
    if (isCurrentRequest()) loading.value = false
  }
}

async function loadTagOptions() {
  tagLoading.value = true
  try {
    const responses = await Promise.allSettled(
      WIN_PATCH_TAG_CI_TYPES.map(ciType => dataManageApi.getAllTags(ciType))
    )
    const records = responses.flatMap(result =>
      result.status === 'fulfilled' && Array.isArray(result.value?.records)
        ? result.value.records
        : []
    )
    tagOptions.value = [...new Set(records.map(normalizeTagName).filter(Boolean))].sort(
      (left, right) => left.localeCompare(right, 'zh-CN')
    )
  } catch (error) {
    console.error('Failed to load Windows patch tag options:', error)
    tagOptions.value = []
  } finally {
    tagLoading.value = false
  }
}

function openScanDialog(rows = []) {
  if (rows.length && !rows.every(isCurrentHostRow)) return
  scanDialogHosts.value = [...rows]
  scanDialogVisible.value = true
}

function openReportDialog(rows = []) {
  if (rows.length && !rows.every(isCurrentHostRow)) return
  reportDialogHosts.value = [...rows]
  reportDialogVisible.value = true
}

function openBatchInstallDrawer(rows = []) {
  if (!rows.length || !rows.every(isCurrentHostRow)) return
  batchInstallHosts.value = [...rows]
  batchInstallDrawerVisible.value = true
}

function handleSearch() {
  applyFilters()
  pagination.page = 1
  loadPageData()
}

function handleFilterChange() {
  applyFilters(false)
  pagination.page = 1
  loadPageData()
}

function handleReset() {
  filters.hostKeyword = ''
  filters.osDistro = ''
  filters.osVersion = ''
  filters.tags = []
  applyFilters()
  pagination.page = 1
  pagination.pageSize = 20
  loadPageData()
}

function applyFilters(includeKeyword = true) {
  if (includeKeyword) appliedFilters.hostKeyword = filters.hostKeyword.trim()
  appliedFilters.osDistro = filters.osDistro
  appliedFilters.osVersion = filters.osVersion
  appliedFilters.tags = [...filters.tags]
}

function openHostDrawer(row, initialFilters = null) {
  if (!isCurrentHostRow(row)) return
  currentHost.value = row
  hostDrawerInitialFilters.value = initialFilters ? { ...initialFilters } : null
  hostDrawerVisible.value = true
}

function isCurrentHostRow(row) {
  return canUseHostRows.value && hostList.value.includes(row)
}

function handleSelectionChange(rows) {
  selectedHostRows.value = Array.isArray(rows) ? rows.filter(isCurrentHostRow) : []
}

function openHostHistory(hostId) {
  if (!hostId) return
  hostDrawerVisible.value = false
  router.push({ name: 'patches-windowsRollback', query: { hostId } })
}

function resolveSeverityCount(row, severity) {
  return Number(pickValue(row, severityCountFields[severity] || [], 0) || 0)
}

function normalizeTagName(tag) {
  if (typeof tag === 'string') {
    return tag.trim()
  }

  return String(tag?.name || tag?.tagName || tag?.value || '').trim()
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeTagName).filter(Boolean)
  }

  if (typeof value === 'string') {
    const normalized = value.trim()
    if (!normalized) return []

    try {
      const parsed = JSON.parse(normalized)
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeTagName).filter(Boolean)
      }
    } catch {
      // 非 JSON 字符串继续按逗号分隔标签处理
    }

    return normalized
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  }

  return []
}

function getRowTags(row) {
  return normalizeTags(pickValue(row, ['tags', 'Tags'], []))
}

function buildHostMemoryOverview(row) {
  return buildMemoryOverview(
    pickValue(row, ['memtotalMb', 'memtotal_mb', 'MEMTOTAL_MB'], null),
    pickValue(row, ['memfreeMb', 'memfree_mb', 'MEMFREE_MB'], null)
  )
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

function handleTaskDrawerClose(payload) {
  if (payload?.succeeded) {
    loadPageData()
  }
}

function handlePageChange(page) {
  if (page === pagination.page) return
  pagination.page = page
  loadPageData()
}

function handleSizeChange(size) {
  if (size === pagination.pageSize) return
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
  loadTagOptions()
})

onActivated(() => {
  pageActive.value = true
})

function invalidateHostRequest() {
  pageActive.value = false
  loadRequestId += 1
  selectedHostRows.value = []
  if (loading.value) loadError.value = '主机列表加载已中断，请重试'
  loading.value = false
}

onDeactivated(invalidateHostRequest)
onBeforeUnmount(invalidateHostRequest)
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

.win-patch-host-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px 0;
}

.memory-overview {
  width: 100%;
  padding: 5px 0;
}

.memory-usage {
  --memory-color: var(--el-color-success);
  --memory-color-soft: var(--el-color-success-light-9);

  display: flex;
  flex-direction: column;
  gap: 6px;

  &--warning {
    --memory-color: var(--el-color-warning);
    --memory-color-soft: var(--el-color-warning-light-9);
  }

  &--danger {
    --memory-color: var(--el-color-danger);
    --memory-color-soft: var(--el-color-danger-light-9);
  }

  &--unknown {
    --memory-color: var(--el-border-color);
    --memory-color-soft: var(--el-fill-color-light);
  }
}

.memory-usage__desc {
  font-size: 11px;
  line-height: 16px;
  color: var(--el-text-color-regular);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.memory-usage__track {
  height: 8px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--memory-color) 22%, transparent);
  border-radius: 5px;
  background: var(--memory-color-soft);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.06);
}

.memory-usage__fill {
  height: 100%;
  min-width: 2px;
  border-radius: inherit;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--memory-color) 78%, white),
    var(--memory-color)
  );
  box-shadow: 1px 0 4px color-mix(in srgb, var(--memory-color) 45%, transparent);
  transition:
    width 0.35s ease,
    background-color 0.2s ease;
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
