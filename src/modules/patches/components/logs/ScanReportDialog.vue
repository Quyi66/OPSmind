<template>
  <el-dialog
    v-model="visible"
    title="扫描报告"
    width="90%"
    destroy-on-close
    class="scan-report-dialog"
  >
    <div class="dialog-content">
      <div class="summary-card" v-loading="summaryLoading">
        <div class="summary-item">
          <span class="label">扫描时间：</span>
          <span class="value">{{ formatDateTime(summary.scan_timestamp) }}</span>
        </div>
        <div class="summary-item">
          <span class="label">扫描主机数：</span>
          <span class="value">{{ summary.machine_count || 0 }}</span>
        </div>
        <el-button
          class="export-btn"
          type="primary"
          size="small"
          :loading="exporting"
          @click="handleExport"
        >
          导出扫描报告
        </el-button>
      </div>

      <div class="ops-action-bar">
        <span style="flex: 1"></span>
        <el-button
          class="toolbar-icon-btn"
          circle
          size="small"
          :loading="loading"
          @click="loadReport"
          title="刷新"
        >
          <el-icon v-show="!loading">
            <Refresh />
          </el-icon>
        </el-button>
      </div>

      <el-table v-loading="loading" :data="tableData" max-height="500px" size="small">
        <el-table-column prop="host_key" label="主机" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <el-button v-if="row.host_key" link type="primary" @click="handleViewHost(row)">
              {{ row.host_key }}
            </el-button>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="os_distro" label="OS" width="110" />
        <el-table-column prop="os_version" label="OS版本" width="120" />
        <el-table-column prop="num_critical" width="90">
          <template #header>
            严重
            <i class="fa fa-circle text-danger" />
          </template>
          <template #default="{ row }">
            <span :class="{ 'text-danger font-bold': row.num_critical > 0 }">
              {{ row.num_critical }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="num_important" width="90">
          <template #header>
            重要
            <i class="fa fa-circle text-warning" />
          </template>
          <template #default="{ row }">
            <span :class="{ 'text-warning font-bold': row.num_important > 0 }">
              {{ row.num_important }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="num_moderate" width="90">
          <template #header>
            中等
            <i class="fa fa-circle text-dark" />
          </template>
          <template #default="{ row }">
            <span :class="{ 'text-dark font-bold': row.num_moderate > 0 }">
              {{ row.num_moderate }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="num_low" width="80">
          <template #header>
            低
            <i class="fa fa-circle text-info" />
          </template>
          <template #default="{ row }">
            <span :class="{ 'text-info font-bold': row.num_low > 0 }">
              {{ row.num_low }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="scan_timestamp" label="扫描时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.scan_timestamp) }}
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next"
          small
          background
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </el-dialog>

  <el-dialog
    v-model="hostDetailVisible"
    title="扫描详情"
    width="80%"
    destroy-on-close
    class="scan-host-detail-dialog"
  >
    <div v-loading="hostDetailLoading" class="fix-dialog-content">
      <div class="fix-info-card">
        <div class="fix-info-header">
          受影响的 CVE
          <span class="count-tag">{{ hostDetail.vuls.length }}</span>
        </div>
        <div class="fix-info-body">
          <div
            v-for="item in getDisplayItems(hostDetail.vuls, 'vuls')"
            :key="item"
            class="list-item"
          >
            {{ item }}
          </div>
          <div v-if="shouldShowToggle(hostDetail.vuls)" class="list-footer">
            <el-button text size="small" @click="toggleExpand('vuls')">
              {{ getToggleLabel('vuls') }}
            </el-button>
          </div>
        </div>
      </div>
      <div class="fix-info-card">
        <div class="fix-info-header">
          受影响的补丁编号
          <span class="count-tag">{{ hostDetail.patches.length }}</span>
        </div>
        <div class="fix-info-body">
          <div
            v-for="item in getDisplayItems(hostDetail.patches, 'patches')"
            :key="item"
            class="list-item"
          >
            {{ item }}
          </div>
          <div v-if="shouldShowToggle(hostDetail.patches)" class="list-footer">
            <el-button text size="small" @click="toggleExpand('patches')">
              {{ getToggleLabel('patches') }}
            </el-button>
          </div>
        </div>
      </div>
      <div class="fix-info-card">
        <div class="fix-info-header">
          待更新的软件包
          <span class="count-tag">{{ hostDetail.affectedPkgs.length }}</span>
        </div>
        <div class="fix-info-body">
          <div
            v-for="item in getDisplayItems(hostDetail.affectedPkgs, 'affectedPkgs')"
            :key="item"
            class="list-item"
          >
            {{ item }}
          </div>
          <div v-if="shouldShowToggle(hostDetail.affectedPkgs)" class="list-footer">
            <el-button text size="small" @click="toggleExpand('affectedPkgs')">
              {{ getToggleLabel('affectedPkgs') }}
            </el-button>
          </div>
        </div>
      </div>
      <div class="fix-info-card">
        <div class="fix-info-header">
          当前安装的软件包
          <span class="count-tag">{{ hostDetail.installedPkgs.length }}</span>
        </div>
        <div class="fix-info-body">
          <div
            v-for="item in getDisplayItems(hostDetail.installedPkgs, 'installedPkgs')"
            :key="item"
            class="list-item"
          >
            {{ item }}
          </div>
          <div v-if="shouldShowToggle(hostDetail.installedPkgs)" class="list-footer">
            <el-button text size="small" @click="toggleExpand('installedPkgs')">
              {{ getToggleLabel('installedPkgs') }}
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { useApi } from '@/core/api'
import { authService } from '@/core/auth'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  runId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const loading = ref(false)
const summaryLoading = ref(false)
const exporting = ref(false)
const summary = ref({
  machine_count: 0,
  scan_timestamp: ''
})
const tableData = ref([])
const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0
})

const hostDetailVisible = ref(false)
const hostDetailLoading = ref(false)
const hostDetail = ref({
  vuls: [],
  patches: [],
  installedPkgs: [],
  affectedPkgs: []
})
const displayLimit = 120
const expandedSections = ref({
  vuls: false,
  patches: false,
  affectedPkgs: false,
  installedPkgs: false
})
const hostDetailContext = ref({
  hostId: '',
  runId: ''
})

function formatDateTime(timestamp) {
  if (!timestamp) return '-'
  try {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return timestamp
  }
}

function formatFilenameTimestamp(timestamp) {
  if (!timestamp) return 'unknown'
  const date = new Date(timestamp)
  const parts = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
    String(date.getSeconds()).padStart(2, '0')
  ]
  return `${parts[0]}${parts[1]}${parts[2]}${parts[3]}${parts[4]}${parts[5]}`
}

function adaptScanDetailResponse(res) {
  const payload = res.data?.data
  let records = []
  if (payload) {
    if (Array.isArray(payload)) {
      records = payload
    } else if (Array.isArray(payload.records)) {
      records = payload.records
    } else if (Array.isArray(payload.content)) {
      records = payload.content
    }
  }
  return { records }
}

async function loadSummary() {
  if (!props.runId) return
  summaryLoading.value = true
  try {
    const api = useApi()
    const res = await api.get('/secops/api/secops/dashboard/scan-hist', {
      params: {
        runId: props.runId
      }
    })
    const records = res.data?.data || []
    summary.value = records[0] || { machine_count: 0, scan_timestamp: '' }
  } catch (error) {
    ElMessage.error(`加载扫描摘要失败: ${error.message || '未知错误'}`)
  } finally {
    summaryLoading.value = false
  }
}

async function loadDetail() {
  if (!props.runId) return
  loading.value = true
  try {
    const api = useApi()
    const res = await api.get('/secops/api/secops/dashboard/hist-scan-detail', {
      params: {
        runId: props.runId,
        page: pagination.value.page,
        size: pagination.value.pageSize
      }
    })
    const payload = res.data?.data
    let records = []
    let total = 0
    if (payload) {
      if (Array.isArray(payload)) {
        records = payload
        total = payload.length
      } else if (Array.isArray(payload.records)) {
        records = payload.records
        total = payload.total ?? payload.records.length
      } else if (Array.isArray(payload.content)) {
        records = payload.content
        total = payload.totalElements ?? payload.total ?? payload.content.length
      }
    }
    tableData.value = records
    pagination.value.total = total
  } catch (error) {
    ElMessage.error(`加载扫描详情失败: ${error.message || '未知错误'}`)
  } finally {
    loading.value = false
  }
}

async function loadReport() {
  await Promise.all([loadSummary(), loadDetail()])
}

async function fetchReportPath(runId, dir) {
  const api = useApi()
  const response = await api.get('/secops/api/secops/v2/download/filename', {
    params: {
      runId,
      dir,
      cacheBuster: Date.now()
    }
  })
  return response?.data?.filePath || response?.filePath || response?.data?.path || response?.path
}

async function fetchReportFileInfo(path) {
  const api = useApi()
  const tenantId = authService.getTenantId()
  const encodedPath = encodeURIComponent(path)
  const response = await api.get(`/gfs/api/gfs/v2/staticfs/f/${tenantId}/file/${encodedPath}`, {
    params: {
      cacheBuster: Date.now(),
      isContent: true
    }
  })
  return response?.data || response
}

function normalizeDownloadUri(downloadUri) {
  if (!downloadUri) return downloadUri
  const tenantId = authService.getTenantId()
  let uri = downloadUri
  if (uri.includes('/api/gfs/')) {
    uri = uri.replace('/api/gfs/', '/gfs/api/gfs/')
  }
  if (tenantId && uri.includes(`/r/${tenantId}/`)) {
    uri = uri.replace(`/r/${tenantId}/`, '/r/$tnt/')
  }
  return uri
}

async function downloadFromUri(downloadUri, filename) {
  if (!downloadUri) return
  const api = useApi()
  const normalizedUri = normalizeDownloadUri(downloadUri)
  const response = await api.get(normalizedUri, {
    responseType: 'blob',
    cache: false
  })
  const blob = response?.data || response
  if (!blob) {
    throw new Error('下载文件失败')
  }
  const objectUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(objectUrl)
}

async function handleExport() {
  if (!props.runId) {
    ElMessage.warning('无运行记录')
    return
  }
  exporting.value = true
  try {
    const filePath = await fetchReportPath(props.runId, 'patch_scan')
    if (!filePath) {
      throw new Error('未找到报告文件')
    }
    const reportPath = `VAP_EXPORT_DATA/patch_scan/${filePath}`
    const fileInfo = await fetchReportFileInfo(reportPath)
    const downloadUri = fileInfo?.fileContent?.downloadUri
    const filename = `patch_scan_${formatFilenameTimestamp(summary.value.scan_timestamp)}.xlsx`
    if (!downloadUri) {
      throw new Error('未找到下载地址')
    }
    await downloadFromUri(`${downloadUri}?cacheBuster=${Date.now()}`, filename)
  } catch (error) {
    ElMessage.error(`导出扫描报告失败: ${error.message || '未知错误'}`)
  } finally {
    exporting.value = false
  }
}

function getDisplayItems(items, key) {
  if (!items || items.length === 0) return ['-']
  if (expandedSections.value[key]) return items
  return items.slice(0, displayLimit)
}

function shouldShowToggle(items) {
  return Array.isArray(items) && items.length > displayLimit
}

function toggleExpand(key) {
  expandedSections.value[key] = !expandedSections.value[key]
}

function getToggleLabel(key) {
  return expandedSections.value[key] ? '收起' : `展开(${displayLimit}+)`
}

function safeJsonArray(value) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function fetchHostDetail({ hostId, runId }) {
  const api = useApi()
  const [vulsRes, patchesRes, installedRes, affectedRes] = await Promise.all([
    api.get('/secops/api/secops/dashboard/hist-scan-detail-by-vuls', {
      params: { hostId, runId }
    }).then(adaptScanDetailResponse),
    api.get('/secops/api/secops/dashboard/hist-scan-detail-by-patches', {
      params: { hostId, runId }
    }).then(adaptScanDetailResponse),
    api.get('/secops/api/secops/dashboard/hist-scan-detail-by-install-pkgs', {
      params: { hostId, runId }
    }).then(adaptScanDetailResponse),
    api.get('/secops/api/secops/dashboard/hist-scan-detail-by-affected-pkgs', {
      params: { hostId, runId }
    }).then(adaptScanDetailResponse)
  ])

  const vulsRecord = (vulsRes?.data?.records || vulsRes?.records || [])[0] || {}
  const patchesRecord = (patchesRes?.data?.records || patchesRes?.records || [])[0] || {}
  const installedRecord = (installedRes?.data?.records || installedRes?.records || [])[0] || {}
  const affectedRecord = (affectedRes?.data?.records || affectedRes?.records || [])[0] || {}

  return {
    vuls: safeJsonArray(vulsRecord.affected_vuls),
    patches: safeJsonArray(patchesRecord.affected_patches),
    installedPkgs: safeJsonArray(installedRecord.installed_pkgs),
    affectedPkgs: safeJsonArray(affectedRecord.affected_pkgs).map(item => item?.updatePkg || item)
  }
}

async function handleViewHost(row) {
  if (!row?.host_id || !props.runId) {
    ElMessage.warning('缺少主机信息')
    return
  }
  hostDetailContext.value = { hostId: row.host_id, runId: props.runId }
  hostDetailVisible.value = true
  hostDetailLoading.value = true
  try {
    hostDetail.value = await fetchHostDetail(hostDetailContext.value)
    expandedSections.value = {
      vuls: false,
      patches: false,
      affectedPkgs: false,
      installedPkgs: false
    }
  } catch (error) {
    ElMessage.error(`加载主机详情失败: ${error.message || '未知错误'}`)
  } finally {
    hostDetailLoading.value = false
  }
}

function handlePageChange(page) {
  pagination.value.page = page
  loadDetail()
}

function handleSizeChange(size) {
  pagination.value.pageSize = size
  pagination.value.page = 1
  loadDetail()
}

watch(
  () => props.modelValue,
  val => {
    if (val) {
      pagination.value.page = 1
      loadReport()
    }
  }
)

watch(
  () => props.runId,
  val => {
    if (val && props.modelValue) {
      pagination.value.page = 1
      loadReport()
    }
  }
)
</script>

<style scoped lang="scss">
.scan-report-dialog {
  :deep(.el-dialog__body) {
    padding: 20px;
  }
}

.scan-host-detail-dialog {
  :deep(.el-dialog__body) {
    padding: 20px;
    max-height: 70vh;
    overflow: auto;
  }
}

.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 16px;
  background: var(--el-bg-color-page);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #606266;
}

.summary-item .label {
  color: #303133;
  font-weight: 600;
}

.export-btn {
  margin-left: auto;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-light);
}

.fix-dialog-content {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.fix-info-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  overflow: hidden;
}

.fix-info-header {
  padding: 8px 12px;
  background: var(--el-bg-color-page);
  border-bottom: 1px solid var(--el-border-color-light);
  font-weight: 500;
  font-size: 14px;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.fix-info-body {
  padding: 12px;
  max-height: 320px;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.8;
  color: #606266;
}

.count-tag {
  margin-left: auto;
  padding: 2px 8px;
  font-size: 12px;
  border-radius: 10px;
  background: #eef2f7;
  color: #5b6b84;
}

.list-item {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.list-footer {
  margin-top: 6px;
}

// 文字颜色 - Element UI 色值
// 严重 - 红色 (Critical - Red)
.text-danger {
  color: #f53f3f;
}

// 重要 - 橙色 (Important - Orange)
.text-warning {
  color: #ff7d00;
}

// 中等 - 金色
.text-dark {
  color: #ffc72e;
}

// 低 - 蓝色 (primary)
.text-info {
  color: #165dff;
}

.font-bold {
  font-weight: 600;
}

@media (max-width: 960px) {
  .fix-dialog-content {
    grid-template-columns: 1fr;
  }
}
</style>
