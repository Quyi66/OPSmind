<template>
  <div class="ops-page-layout win-patch-page" :class="{ 'is-english': currentLocale === 'en-US' }">
    <div class="ops-filter-bar">
      <el-form :model="filters" :inline="true" size="small" @submit.prevent>
        <el-form-item :label="t('execution.ui.host')">
          <el-input
            v-model="filters.hostKeyword"
            :placeholder="t('patches.windows.hostAddressId')"
            clearable
            style="width: 190px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
        </el-form-item>
        <el-form-item :label="t('patches.linux.os')">
          <el-select
            v-model="filters.osDistro"
            :placeholder="t('patches.windows.allOrCustom')"
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
        <el-form-item :label="t('common.version')">
          <el-select
            v-model="filters.osVersion"
            :placeholder="t('patches.windows.allOrCustom')"
            clearable
            filterable
            allow-create
            :style="{ width: currentLocale === 'en-US' ? '250px' : '180px' }"
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
        <el-form-item :label="t('automation.job.tag')">
          <el-select
            v-model="filters.tags"
            :placeholder="t('patches.linux.allTags')"
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
      <el-button type="primary" size="small" @click="openScanDialog(selectedHostRows)">
        {{ t('patches.windows.createScan') }}
      </el-button>
      <el-button
        type="success"
        size="small"
        :disabled="!canUseHostRows || selectedHostRows.length === 0"
        @click="openBatchInstallDrawer(selectedHostRows)"
      >
        {{ t('patches.linux.installPatches') }}
      </el-button>
      <el-button size="small" @click="openReportDialog(selectedHostRows)">{{ t('patches.cve.exportReport') }}</el-button>
      <span class="win-patch-selection-text">{{ t('patches.cve.alreadySelected') }} {{ selectedHostRows.length }} {{ t('patches.windows.hostUnit') }}</span>
      <span style="flex: 1"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="loading"
        :aria-label="t('patches.windows.refreshHosts')"
        @click="loadPageData()"
      >
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <el-alert v-if="loadError" :title="loadError" type="error" :closable="false" show-icon>
      <el-button link type="primary" @click="loadPageData()">{{ t('common.retry') }}</el-button>
    </el-alert>

    <div class="ops-table-wrapper">
      <el-table
        v-loading="loading"
        :data="hostList"
        :empty-text="
          loading ? t('patches.windows.loadingHosts') : loadError ? t('patches.windows.hostsNotLoaded') : t('patches.windows.noMatchingHosts')
        "
        max-height="calc(100vh - 354px)"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="48" :selectable="isCurrentHostRow" />
        <el-table-column :label="t('execution.ui.host')" min-width="150" show-overflow-tooltip>
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
        <el-table-column :label="t('patches.linux.os')" min-width="220">
          <template #default="{ row }">
            {{ pickValue(row, ['osDistro', 'os_distro'], '-') }}
          </template>
        </el-table-column>
        <el-table-column :width="currentLocale === 'en-US' ? 128 : 80" align="center">
          <template #header>
            <span class="win-patch-severity-header">
              {{ t('patches.catalog.critical') }}
              <span class="win-patch-severity-dot win-patch-severity-dot--critical"></span>
            </span>
          </template>
          <template #default="{ row }">
            <button
              type="button"
              class="win-patch-severity-link"
              :class="{ 'is-clickable': resolveSeverityCount(row, 'Critical') > 0 }"
              :disabled="resolveSeverityCount(row, 'Critical') <= 0"
              :title="resolveSeverityCount(row, 'Critical') > 0 ? t('patches.windows.viewCritical') : ''"
              :aria-label="t('patches.windows.viewCritical')"
              @click="openHostDrawerWithSeverity(row, 'Critical')"
            >
              {{ resolveSeverityCount(row, 'Critical') }}
            </button>
          </template>
        </el-table-column>
        <el-table-column :width="currentLocale === 'en-US' ? 128 : 80" align="center">
          <template #header>
            <span class="win-patch-severity-header">
              {{ t('patches.catalog.important') }}
              <span class="win-patch-severity-dot win-patch-severity-dot--important"></span>
            </span>
          </template>
          <template #default="{ row }">
            <button
              type="button"
              class="win-patch-severity-link"
              :class="{ 'is-clickable': resolveSeverityCount(row, 'Important') > 0 }"
              :disabled="resolveSeverityCount(row, 'Important') <= 0"
              :title="resolveSeverityCount(row, 'Important') > 0 ? t('patches.windows.viewImportant') : ''"
              :aria-label="t('patches.windows.viewImportant')"
              @click="openHostDrawerWithSeverity(row, 'Important')"
            >
              {{ resolveSeverityCount(row, 'Important') }}
            </button>
          </template>
        </el-table-column>
        <el-table-column :width="currentLocale === 'en-US' ? 128 : 80" align="center">
          <template #header>
            <span class="win-patch-severity-header">
              {{ t('patches.catalog.moderate') }}
              <span class="win-patch-severity-dot win-patch-severity-dot--moderate"></span>
            </span>
          </template>
          <template #default="{ row }">
            <button
              type="button"
              class="win-patch-severity-link"
              :class="{ 'is-clickable': resolveSeverityCount(row, 'Moderate') > 0 }"
              :disabled="resolveSeverityCount(row, 'Moderate') <= 0"
              :title="resolveSeverityCount(row, 'Moderate') > 0 ? t('patches.windows.viewModerate') : ''"
              :aria-label="t('patches.windows.viewModerate')"
              @click="openHostDrawerWithSeverity(row, 'Moderate')"
            >
              {{ resolveSeverityCount(row, 'Moderate') }}
            </button>
          </template>
        </el-table-column>
        <el-table-column :width="currentLocale === 'en-US' ? 96 : 80" align="center">
          <template #header>
            <span class="win-patch-severity-header">
              {{ t('patches.catalog.low') }}
              <span class="win-patch-severity-dot win-patch-severity-dot--low"></span>
            </span>
          </template>
          <template #default="{ row }">
            <button
              type="button"
              class="win-patch-severity-link"
              :class="{ 'is-clickable': resolveSeverityCount(row, 'Low') > 0 }"
              :disabled="resolveSeverityCount(row, 'Low') <= 0"
              :title="resolveSeverityCount(row, 'Low') > 0 ? t('patches.windows.viewLow') : ''"
              :aria-label="t('patches.windows.viewLow')"
              @click="openHostDrawerWithSeverity(row, 'Low')"
            >
              {{ resolveSeverityCount(row, 'Low') }}
            </button>
          </template>
        </el-table-column>
        <el-table-column :width="currentLocale === 'en-US' ? 144 : 90" align="center">
          <template #header>
            <span class="win-patch-severity-header">
              {{ t('patches.windows.unclassified') }}
              <span class="win-patch-severity-dot win-patch-severity-dot--unspecified"></span>
            </span>
          </template>
          <template #default="{ row }">
            <button
              type="button"
              class="win-patch-severity-link"
              :class="{ 'is-clickable': resolveSeverityCount(row, 'Unspecified') > 0 }"
              :disabled="resolveSeverityCount(row, 'Unspecified') <= 0"
              :title="resolveSeverityCount(row, 'Unspecified') > 0 ? t('patches.windows.viewUnclassified') : ''"
              :aria-label="t('patches.windows.viewUnclassified')"
              @click="openHostDrawerWithSeverity(row, 'Unspecified')"
            >
              {{ resolveSeverityCount(row, 'Unspecified') }}
            </button>
          </template>
        </el-table-column>
        <el-table-column :label="t('patches.windows.installed')" width="80">
          <template #default="{ row }">
            <span class="win-patch-metric">
              {{ pickValue(row, ['installedCount', 'installed_count'], 0) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column :label="t('common.version')" :min-width="currentLocale === 'en-US' ? 180 : 120" :class-name="currentLocale === 'en-US' ? 'win-patch-version-column' : undefined">
          <template #default="{ row }">
            {{ pickValue(row, ['osVersion', 'os_version'], '-') }}
          </template>
        </el-table-column>
        <el-table-column :label="t('patches.cve.architecture')" :min-width="currentLocale === 'en-US' ? 136 : 90">
          <template #default="{ row }">
            {{ pickValue(row, ['osArch', 'os_arch'], '-') }}
          </template>
        </el-table-column>
        <el-table-column :label="t('automation.job.tag')" min-width="140">
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
        <el-table-column :label="t('patches.windows.memory')" :width="currentLocale === 'en-US' ? 240 : 170">
          <template #default="{ row }">
            <div v-if="row.memoryOverview" class="memory-overview">
              <div
                v-if="row.memoryOverview.usedPercent !== null"
                class="memory-usage"
                :class="`memory-usage--${row.memoryOverview.usageLevel}`"
              >
                <div
                  class="memory-usage__track"
                  :title="t('patches.windows.memoryUsed', { p0: row.memoryOverview.usedPercent })"
                >
                  <div
                    class="memory-usage__fill"
                    :style="{ width: `${row.memoryOverview.usedPercent}%` }"
                  />
                </div>
                <div class="memory-usage__desc">
                  {{ t('patches.windows.memorySummary', { free: row.memoryOverview.freeGb, total: row.memoryOverview.totalGb }) }}
                </div>
              </div>
              <div v-else class="memory-usage memory-usage--unknown">
                <div class="memory-usage__track" />
                <div class="memory-usage__desc">
                  {{
                    row.memoryOverview.freeGb !== null
                      ? t('patches.windows.memoryAvailable', { p0: row.memoryOverview.freeGb })
                      : '-'
                  }}{{
                    row.memoryOverview.totalGb !== null
                      ? t('patches.windows.memoryTotal', { p0: row.memoryOverview.totalGb })
                      : t('patches.windows.memoryUnknownTotal')
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
        <el-table-column :label="t('patches.linux.lastScanTime')" width="190" class-name="win-patch-table__time-column">
          <template #default="{ row }">
            {{ formatDateTime(pickValue(row, ['lastScanDate', 'last_scan_date'], '')) }}
          </template>
        </el-table-column>
        <el-table-column :label="t('common.actions')" :width="currentLocale === 'en-US' ? 180 : 110" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="openHostDrawer(row)">
              {{ t('patches.windows.viewPatches') }}
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
      @completed="loadPageData"
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
import { createPatchTaskError } from '@/modules/patches/utils/patchTaskFeedback'
import { message as localMessage, messageRef } from '@/core/i18n/feedback'

import { t, currentLocale } from '@/core/i18n'
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
const loadError = messageRef('')
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
          throw createPatchTaskError('patches.windows.hostPageChanged')
        }
      }
    }

    const hostPage = parsePageResponse(hostResponse)
    if (!Number.isSafeInteger(hostPage.total) || hostPage.total < 0) {
      throw createPatchTaskError('patches.windows.invalidHostTotal')
    }
    hostList.value = hostPage.content.map(row => ({
      ...row,
      memoryOverview: buildHostMemoryOverview(row)
    }))
    pagination.total = hostPage.total
    selectedHostRows.value = []
  } catch {
    if (!isCurrentRequest()) return
    loadError.value = localMessage('patches.windows.hostLoadRetry')
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
  if (route.name !== 'patches-windowsVulnerability') return
  if (normalizeDialogValue(route.query.dialog) !== dialogType) {
    return
  }

  router.replace({ path: '/patches/windowsVulnerability' })
}

watch(
  [() => route.name, () => route.query.dialog],
  ([name, dialog]) => {
    if (name !== 'patches-windowsVulnerability') return
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
  if (loading.value) loadError.value = localMessage('patches.windows.hostLoadInterrupted')
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

.win-patch-page.is-english {
  .win-patch-severity-header {
    white-space: nowrap;
  }

  :deep(.win-patch-version-column .cell) {
    white-space: nowrap;
  }
}
</style>
