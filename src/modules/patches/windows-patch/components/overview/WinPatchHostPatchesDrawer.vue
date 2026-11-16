<template>
  <el-drawer
    v-model="visibleModel"
    :title="t('patches.windows.hostPatchDetails')"
    direction="rtl"
    size="85%"
    destroy-on-close
    append-to-body
    class="win-patch-host-drawer"
    :close-on-click-modal="selectedRows.length === 0"
    :close-on-press-escape="selectedRows.length === 0"
  >
    <div class="win-patch-host-dialog">
      <el-descriptions
        v-if="hostSummary"
        :column="2"
        border
        size="small"
        class="win-patch-descriptions"
      >
        <el-descriptions-item :label="t('execution.ui.host')">
          {{ resolveHostKey(hostSummary) }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('patches.windows.hostId')">
          {{ resolveHostId(hostSummary) || '-' }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('patches.linux.os')">
          {{ pickValue(hostSummary, ['osDistro', 'os_distro'], '-') }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('patches.windows.versionArchitecture')">
          {{ pickValue(hostSummary, ['osVersion', 'os_version'], '-') }} /
          {{ pickValue(hostSummary, ['osArch', 'os_arch'], '-') }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('patches.windows.missingPatchCount')">
          {{ pickValue(hostSummary, ['totalMissing', 'total_missing'], 0) }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('patches.linux.lastScanTime')">
          {{ formatDateTime(pickValue(hostSummary, ['lastScanDate', 'last_scan_date'], '')) }}
        </el-descriptions-item>
      </el-descriptions>

      <div class="ops-filter-bar">
        <el-form :inline="true" size="small">
          <el-form-item :label="t('patches.catalog.severity')">
            <el-select
              v-model="filters.severity"
              clearable
              :placeholder="t('common.all')"
              style="width: 140px"
              @change="handleSearch"
            >
              <el-option
                v-for="item in WIN_PATCH_SEVERITY_OPTIONS"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('patches.linux.patchStatus')">
            <el-select
              v-model="filters.patchStatus"
              @change="handleSearch"
              clearable
              :placeholder="t('common.all')"
              style="width: 140px"
            >
              <el-option
                v-for="item in WIN_PATCH_STATUS_OPTIONS"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('patches.cve.keyword')">
            <el-input
              v-model="filters.keyword"
              :placeholder="t('patches.windows.filterKbTitle')"
              clearable
              style="width: 220px"
              @keyup.enter="handleSearch"
              @clear="handleSearch"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="loading" @click="handleSearch">{{ t('common.search') }}</el-button>
            <el-button @click="handleReset">{{ t('common.reset') }}</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="ops-action-bar">
        <el-button
          size="small"
          :disabled="!resolveHostId(hostSummary)"
          @click="emit('view-history', resolveHostId(hostSummary))"
        >
          {{ t('patches.windows.installationHistory') }}
        </el-button>
        <el-button
          type="primary"
          size="small"
          :disabled="loading || installableSelection.length === 0"
          @click="openInstallWizard"
        >
          {{ t('patches.windows.installSelected') }}
        </el-button>
        <span class="win-patch-selection-text">
          {{ t('patches.cve.alreadySelected') }} {{ installableSelection.length }} {{ t('patches.windows.installableUnit') }}
        </span>
        <span style="flex: 1"></span>
        <el-button
          class="toolbar-icon-btn"
          circle
          size="small"
          :loading="loading"
          @click="loadPatches()"
        >
          <el-icon v-show="!loading"><Refresh /></el-icon>
        </el-button>
      </div>

      <el-alert v-if="loadError" :title="loadError" type="error" :closable="false" show-icon>
        <el-button link type="primary" @click="loadPatches()">{{ t('common.retry') }}</el-button>
      </el-alert>

      <div class="ops-table-wrapper win-patch-host-table">
        <el-table
          v-loading="loading"
          :data="patchList"
          height="100%"
          @selection-change="selection => (selectedRows = selection)"
        >
          <el-table-column type="selection" width="48" :selectable="isPatchActionable" />
          <el-table-column :label="t('patches.windows.kbId')" width="130">
            <template #default="{ row }">
              <WindowsKbLinkList
                :kb-numbers="resolveKbNumbers(row)"
                :has-cve="resolveCveIds(row).length > 0"
                :kb-detail="row"
                :dialog-title="t('patches.windows.relatedKb')"
                @select-kb="openKbDetail"
              />
            </template>
          </el-table-column>
          <el-table-column :label="t('automation.job.title')" min-width="280" show-overflow-tooltip>
            <template #default="{ row }">
              {{ pickValue(row, ['title'], '-') }}
            </template>
          </el-table-column>
          <el-table-column :label="t('automation.library.size')" width="110">
            <template #default="{ row }">
              {{ formatBytes(pickValue(row, ['sizeBytes', 'size_bytes'], 0)) }}
            </template>
          </el-table-column>
          <el-table-column :label="t('patches.catalog.severity')" width="120">
            <template #default="{ row }">
              <el-tag
                :type="getSeverityTagType(pickValue(row, ['severity']))"
                size="small"
                effect="plain"
              >
                {{ getSeverityLabel(pickValue(row, ['severity'], '')) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="t('patches.catalog.associatedVulnerabilities')" min-width="220">
            <template #default="{ row }">
              <CveLinkList :cves="resolveCveIds(row)" :url-resolver="getWinCveUrl" />
            </template>
          </el-table-column>
          <el-table-column :label="t('patches.windows.classification')" min-width="150" show-overflow-tooltip>
            <template #default="{ row }">
              {{ pickValue(row, ['categoryName', 'category_name', 'classification'], '-') }}
            </template>
          </el-table-column>
          <el-table-column :label="t('patches.linux.patchStatus')" width="120">
            <template #default="{ row }">
              <el-tag :type="getPatchStatusTagType(row)" size="small">
                {{ getPatchStatusLabel(row) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="t('patches.windows.ignored')" width="90" align="center">
            <template #default="{ row }">
              <el-tag
                :type="
                  normalizeBoolean(pickValue(row, ['isIgnore', 'isIgnored', 'is_ignored'], false))
                    ? 'warning'
                    : 'info'
                "
                size="small"
                effect="plain"
              >
                {{
                  normalizeBoolean(pickValue(row, ['isIgnore', 'isIgnored', 'is_ignored'], false))
                    ? t('patches.catalog.yes')
                    : t('patches.catalog.no')
                }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="t('patches.linux.scanTime')" width="190" class-name="win-patch-table__time-column">
            <template #default="{ row }">
              {{ formatDateTime(pickValue(row, ['scanDate', 'scan_date'], '')) }}
            </template>
          </el-table-column>
          <el-table-column :label="t('patches.windows.installedAt')" width="190" class-name="win-patch-table__time-column">
            <template #default="{ row }">
              {{ formatDateTime(pickValue(row, ['installDate', 'install_date'], '')) }}
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

      <WinPatchInstallWizard
        v-model="installWizardVisible"
        :selected-rows="wizardRows"
        :host-summary="hostSummary"
        @submitted="handleInstallTaskCreated"
        @success="handleInstallSuccess"
      />

      <WindowsKbDetailDialog v-model="kbDetailDialogVisible" :kb-number="selectedKbNumber" />
    </div>
  </el-drawer>
</template>

<script setup>
import { message as localMessage, messageRef } from '@/core/i18n/feedback'
import { t } from '@/core/i18n'

import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import WinPatchInstallWizard from '../install-wizard/WinPatchInstallWizard.vue'
import WindowsKbDetailDialog from '../kb/WindowsKbDetailDialog.vue'
import WindowsKbLinkList from '../kb/WindowsKbLinkList.vue'
import CveLinkList from '../../../components/common/CveLinkList.vue'
import { winPatchApi } from '../../api'
import {
  WIN_PATCH_PAGE_SIZE_OPTIONS,
  WIN_PATCH_SEVERITY_OPTIONS,
  WIN_PATCH_STATUS_OPTIONS
} from '../../constants'
import {
  formatDateTime,
  getPatchStatusLabel,
  getPatchStatusTagType,
  getSeverityLabel,
  getSeverityTagType,
  isPatchInstallable,
  normalizeBoolean,
  parsePageResponse,
  pickValue,
  resolveHostId,
  resolveHostKey
} from '../../utils'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  hostSummary: {
    type: Object,
    default: null
  },
  initialFilters: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'task-submitted', 'view-history'])

const visibleModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const loading = ref(false)
const loadError = messageRef('')
let loadRequestId = 0
const patchList = ref([])
const selectedRows = ref([])
const installWizardVisible = ref(false)
const wizardRows = ref([])
const kbDetailDialogVisible = ref(false)
const selectedKbNumber = ref('')

const pagination = reactive({
  page: 1,
  pageSize: 50,
  total: 0
})

const filters = reactive({
  severity: '',
  patchStatus: '',
  keyword: ''
})

const installableSelection = computed(() =>
  selectedRows.value.filter(row => isPatchInstallable(row))
)

function isPatchActionable(row) {
  return isPatchInstallable(row)
}

function openInstallWizard() {
  if (loading.value || !installableSelection.value.length) return

  // 与批量安装保持一致，列表刷新不应改变本次任务的补丁摘要。
  wizardRows.value = [...installableSelection.value]
  installWizardVisible.value = true
}

function resolveCveIds(row) {
  const raw = pickValue(row, ['cveIds', 'cve_ids'], '')
  if (Array.isArray(raw)) {
    return raw.map(item => String(item).trim()).filter(Boolean)
  }

  return String(raw)
    .split(/[,，;；\s]+/)
    .map(item => item.trim())
    .filter(Boolean)
}

function resolveKbNumbers(row) {
  const raw = pickValue(
    row,
    ['kbNumber', 'kb_number', 'updateKbNumbers', 'update_kb_numbers', 'kbArticle', 'kb_article'],
    ''
  )
  if (Array.isArray(raw)) {
    return raw.map(normalizeKbNumber).filter(Boolean)
  }

  return String(raw)
    .split(/[,，;；\s]+/)
    .map(normalizeKbNumber)
    .filter(Boolean)
}

// Windows CVE 跳转 MSRC（微软安全响应中心）官方漏洞详情页
function getWinCveUrl(cveId) {
  const id = String(cveId || '').trim()
  if (!id) return ''
  return `https://msrc.microsoft.com/update-guide/vulnerability/${encodeURIComponent(id)}`
}

function normalizeKbNumber(value) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
  if (!normalized) return ''

  const match = normalized.match(/KB\s*\d+/i)
  if (match) {
    return match[0].replace(/\s+/g, '')
  }

  return /^\d+$/.test(normalized) ? `KB${normalized}` : normalized
}

function formatBytes(value) {
  const size = Number(value)
  if (!Number.isFinite(size) || size <= 0) return '-'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let current = size
  let index = 0

  while (current >= 1024 && index < units.length - 1) {
    current /= 1024
    index += 1
  }

  return `${current.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

function applyInitialFilters() {
  const initialFilters = props.initialFilters || {}

  filters.severity = String(initialFilters.severity || '').trim()
  filters.patchStatus = String(initialFilters.patchStatus || '').trim()
  filters.keyword = String(initialFilters.keyword || '').trim()
}

async function loadPatches(options = {}) {
  const requestId = ++loadRequestId
  const hostId = resolveHostId(props.hostSummary)
  if (!props.modelValue || !hostId) return

  const isCurrentRequest = () =>
    requestId === loadRequestId && props.modelValue && hostId === resolveHostId(props.hostSummary)

  loading.value = !options.silent
  loadError.value = ''
  selectedRows.value = []
  if (!options.silent) {
    patchList.value = []
    pagination.total = 0
  }
  try {
    const response = await winPatchApi.getHostPatches(hostId, {
      page: pagination.page - 1,
      size: pagination.pageSize,
      severity: filters.severity || undefined,
      patchStatus: filters.patchStatus || undefined,
      keyword: filters.keyword || undefined
    })
    if (!isCurrentRequest()) return
    const page = parsePageResponse(response)
    patchList.value = page.content
    pagination.total = page.total
    selectedRows.value = []
  } catch (error) {
    if (!isCurrentRequest()) return
    loadError.value = localMessage('patches.windows.hostDetailLoadRetry')
    console.error('加载主机补丁详情失败:', error)
    ElMessage.error(t('patches.windows.hostDetailLoadFailed'))
  } finally {
    if (isCurrentRequest()) loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  loadPatches()
}

function handleReset() {
  filters.severity = ''
  filters.patchStatus = ''
  filters.keyword = ''
  pagination.page = 1
  pagination.pageSize = 50
  loadPatches()
}

function handlePageChange(page) {
  pagination.page = page
  loadPatches()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  loadPatches()
}

function handleInstallTaskCreated(task) {
  emit('task-submitted', {
    ...(task || {}),
    openDetail: false,
    refreshOverview: false
  })
}

function handleInstallSuccess() {
  loadPatches({ silent: true })
}

function openKbDetail(kbNumber) {
  selectedKbNumber.value = normalizeKbNumber(kbNumber)
  kbDetailDialogVisible.value = Boolean(selectedKbNumber.value)
}

watch(
  [() => props.modelValue, () => props.hostSummary, () => props.initialFilters],
  ([open, host]) => {
    installWizardVisible.value = false
    wizardRows.value = []
    if (!open || !resolveHostId(host)) {
      loadRequestId += 1
      loading.value = false
      loadError.value = ''
      patchList.value = []
      selectedRows.value = []
      pagination.total = 0
      return
    }

    pagination.page = 1
    pagination.pageSize = 50
    applyInitialFilters()
    loadPatches()
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  loadRequestId += 1
})
</script>

<style scoped lang="scss">
.win-patch-host-drawer {
  :deep(.el-drawer__header) {
    margin-bottom: 0;
    padding: 16px 20px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  :deep(.el-drawer__body) {
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 16px 20px;
    overflow: hidden;
  }
}

.win-patch-host-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.win-patch-descriptions {
  margin-bottom: 0;
  flex: 0 0 auto;
}

.win-patch-selection-text {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.win-patch-host-table {
  margin-top: 0;
  flex: 1 1 auto;
  min-height: 0;
}

:deep(.win-patch-table__time-column .cell) {
  white-space: nowrap;
}
</style>
