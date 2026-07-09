<template>
  <el-dialog
    v-model="visible"
    title="操作记录"
    width="90%"
    destroy-on-close
    class="operation-logs-dialog"
  >
    <div class="dialog-content">
      <!-- 筛选栏 -->
      <div class="ops-filter-bar">
        <el-form inline size="small">
          <el-form-item label="时间范围">
            <el-select v-model="dayFilter" style="width: 100px" @change="handleFilterChange">
              <el-option label="今天" :value="1" />
              <el-option label="近3天" :value="3" />
              <el-option label="近7天" :value="7" />
              <el-option label="近30天" :value="30" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select
              v-model="statusFilter"
              style="width: 100px"
              clearable
              @change="handleFilterChange"
            >
              <el-option label="全部" value="all" />
              <el-option label="完成" value="COMPLETED" />
              <el-option label="失败" value="FAILED" />
              <el-option label="运行中" value="RUNNING" />
              <el-option label="等待中" value="WAITING" />
            </el-select>
          </el-form-item>
          <el-form-item label="操作">
            <el-select
              v-model="actionFilter"
              style="width: 150px"
              clearable
              @change="handleFilterChange"
            >
              <el-option label="全部" value="all" />
              <el-option label="补丁扫描" value="#{app_vap.menu.patch_scan.title}" />
              <el-option label="补丁安装" value="#{app_vap.menu.patch_install.title}" />
              <el-option label="补丁回退" value="#{app_vap.menu.patch_rollback.title}" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Refresh" @click="handleRefresh">刷新</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 表格 -->
      <el-table v-loading="loading" :data="tableData" size="small" max-height="500px">
        <el-table-column prop="start_time" label="开始时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.start_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作" width="120">
          <template #default="{ row }">
            {{ formatAction(row.action) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ata_node" label="执行引擎节点" width="140" show-overflow-tooltip />
        <el-table-column prop="message" label="结果" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatMessage(row.message) }}
          </template>
        </el-table-column>
        <el-table-column prop="username" label="用户" width="100" />
        <el-table-column prop="end_time" label="结束时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.end_time) }}
          </template>
        </el-table-column>
        <el-table-column label="耗时" width="100">
          <template #default="{ row }">
            {{ calculateDuration(row.start_time, row.end_time) }}
          </template>
        </el-table-column>
        <el-table-column :width="actionColumnWidth" fixed="right" label="操作">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button type="primary" size="small" text @click="handleViewDetail(row)">
                详情
              </el-button>
              <el-button
                v-if="canShowWindowsScanReport(row)"
                size="small"
                text
                type="primary"
                @click="handleWindowsScanReport(row)"
              >
                Windows扫描报告
              </el-button>
              <el-button
                v-if="canShowScanReport(row)"
                size="small"
                text
                type="primary"
                @click="handleScanReport(row)"
              >
                扫描报告
              </el-button>
              <el-button
                v-if="canShowInstallReport(row)"
                size="small"
                text
                type="primary"
                @click="handleInstallReport(row)"
              >
                安装报告
              </el-button>
              <el-button
                v-if="canShowRollbackReport(row)"
                size="small"
                text
                type="primary"
                @click="handleRollbackReport(row)"
              >
                回退报告
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
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

  <!-- 详情对话框 -->
  <ExecuteResultDialog
    v-if="detailDialogVisible"
    v-model:visible="detailDialogVisible"
    :run-id="selectedRunId"
  />

  <ScanReportDialog v-model="scanReportVisible" :run-id="scanReportRunId" />

  <WindowsScanReportDialog v-model="winScanReportVisible" :run-id="winScanReportRunId" />
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { formatDateTime } from '@/utils/date'
import { Refresh } from '@element-plus/icons-vue'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import { translateText } from '@/utils/i18n'
import { useApi } from '@/core/api'
import { patchLogsApi } from '../../api'
import { authService } from '@/core/auth'
import ScanReportDialog from './ScanReportDialog.vue'
import WindowsScanReportDialog from './WindowsScanReportDialog.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  highlightRunId: {
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
const tableData = ref([])
const dayFilter = ref(1)
const statusFilter = ref('all')
const actionFilter = ref('all')
const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0
})

const detailDialogVisible = ref(false)
const selectedRunId = ref('')

const scanReportVisible = ref(false)
const scanReportRunId = ref('')

const winScanReportVisible = ref(false)
const winScanReportRunId = ref('')

const actionColumnWidth = computed(() => {
  const hasWindows = tableData.value.some(row => canShowWindowsScanReport(row))
  const hasOther = tableData.value.some(
    row => canShowScanReport(row) || canShowInstallReport(row) || canShowRollbackReport(row)
  )
  if (!hasWindows && !hasOther) return 80
  return hasWindows ? 190 : 130
})

const ACTION_KEYS = {
  patchScan: '#{app_vap.menu.patch_scan.title}',
  patchInstall: '#{app_vap.menu.patch_install.title}',
  patchRollback: '#{app_vap.menu.patch_rollback.title}',
  winPatchScan: '#{app_vap.menu.win_patch_scan.title}'
}

let pollingTimer = null

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const response = await patchLogsApi.getLogs({
      page: pagination.value.page,
      size: pagination.value.pageSize,
      action: actionFilter.value === 'all' ? 'all' : actionFilter.value,
      status: statusFilter.value === 'all' ? 'all' : statusFilter.value,
      day: dayFilter.value
    })

    tableData.value = response?.records || []
    pagination.value.total = response?.total || 0
  } catch (error) {
    console.error('Failed to load operation logs:', error)
    ElMessage.error('加载操作记录失败')
  } finally {
    loading.value = false
  }
}



// 格式化操作类型
function formatAction(action) {
  if (!action) return ''

  const translated = translateText(action)
  if (translated === action && action.startsWith('#{')) {
    const staticMap = {
      '#{app_vap.menu.patch_scan.title}': '补丁扫描',
      '#{app_vap.menu.patch_install.title}': '补丁安装',
      '#{app_vap.menu.patch_rollback.title}': '补丁回退',
      '#{app_vap.menu.win_patch_scan.title}': 'Windows漏洞扫描',
      '#{app_vap.menu.import_patch_library_time}': '定时导入补丁库',
      '#{app_vap.menu.import_patch_library.title}': '导入补丁库',
      '#{app_vap.common.tab.repo_list_scan}': 'YUM源列表扫描',
      '#{app_vap.common.tab.custom_repo}': '自定义YUM源'
    }

    if (staticMap[action]) {
      return staticMap[action]
    }

    const key = action.slice(2, -1)
    const parts = key.split('.')
    return parts[parts.length - 1] || action
  }

  return translated
}

// 获取状态类型
function getStatusType(status) {
  const typeMap = {
    COMPLETED: 'success',
    FAILED: 'danger',
    RUNNING: 'primary',
    WAITING: 'info',
    PENDING: 'info'
  }
  return typeMap[status] || 'info'
}

// 获取状态文本
function getStatusText(status) {
  const textMap = {
    COMPLETED: '完成',
    FAILED: '失败',
    RUNNING: '运行中',
    WAITING: '等待中',
    PENDING: '等待中'
  }
  return textMap[status] || status
}

// 格式化消息
function applyTemplateParams(template, params = {}) {
  if (!template) return ''
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      const value = params[key]
      return value === null || value === undefined ? '' : String(value)
    }
    return ''
  })
}

function formatMessage(message) {
  if (!message) return '-'

  if (message.includes('#{')) {
    return translateText(message)
  }

  try {
    const msg = JSON.parse(message)
    const msgId = msg.msg_id
    if (!msgId) return message

    const template = translateText(`#{${msgId}}`)
    return applyTemplateParams(template, msg) || msgId
  } catch {
    const translated = translateText(`#{${message}}`)
    return translated || message
  }
}

// 计算耗时
function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return '-'
  try {
    const start = new Date(startTime)
    const end = new Date(endTime)
    const diff = Math.floor((end - start) / 1000) // 秒
    const hours = Math.floor(diff / 3600)
    const minutes = Math.floor((diff % 3600) / 60)
    const seconds = diff % 60
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  } catch {
    return '-'
  }
}

// 查看详情
function handleViewDetail(row) {
  if (!row.run_id) return
  selectedRunId.value = row.run_id
  detailDialogVisible.value = true
}

function isPatchScan(row) {
  return row?.action === ACTION_KEYS.patchScan
}

function isWindowsScan(row) {
  return row?.action === ACTION_KEYS.winPatchScan
}

function isPatchInstall(row) {
  return row?.action === ACTION_KEYS.patchInstall
}

function isPatchRollback(row) {
  return row?.action === ACTION_KEYS.patchRollback
}

function isCompleted(row) {
  return row?.status === 'COMPLETED'
}

function isFinished(row) {
  return row?.status === 'COMPLETED' || row?.status === 'FAILED'
}

function canShowWindowsScanReport(row) {
  return isWindowsScan(row) && isCompleted(row)
}

function canShowScanReport(row) {
  return isPatchScan(row) && isCompleted(row)
}

function canShowInstallReport(row) {
  return isPatchInstall(row) && isFinished(row)
}

function canShowRollbackReport(row) {
  return isPatchRollback(row) && isFinished(row)
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

async function downloadReport(row, dir, extension) {
  if (!row.run_id) {
    ElMessage.warning('无运行记录')
    return
  }
  try {
    const filePath = await fetchReportPath(row.run_id, dir)
    if (!filePath) {
      throw new Error('未找到报告文件')
    }
    const filename = `${dir}_${formatFilenameTimestamp(row.start_time)}.${extension}`
    downloadFile('staticfs', null, `VAP_EXPORT_DATA/${dir}/${filePath}`, filename)
  } catch (error) {
    ElMessage.error(`下载报告失败: ${error.message || '未知错误'}`)
  }
}

function handleWindowsScanReport(row) {
  if (!row.run_id) {
    ElMessage.warning('无运行记录')
    return
  }
  winScanReportRunId.value = row.run_id
  winScanReportVisible.value = true
}

function handleScanReport(row) {
  if (!row.run_id) {
    ElMessage.warning('无运行记录')
    return
  }
  scanReportRunId.value = row.run_id
  scanReportVisible.value = true
}

function handleInstallReport(row) {
  downloadInstallReport(row)
}

function handleRollbackReport(row) {
  downloadRollbackReport(row)
}

async function downloadInstallReport(row) {
  if (!row.run_id) {
    ElMessage.warning('无运行记录')
    return
  }
  try {
    const filePath = await fetchReportPath(row.run_id, 'patch_install')
    const reportPath = filePath
      ? `VAP_EXPORT_DATA/patch_install/${filePath}`
      : 'VAP_EXPORT_DATA/patch_install/'
    const fileInfo = await fetchReportFileInfo(reportPath)
    const downloadUri = fileInfo?.fileContent?.downloadUri || fileInfo?.downloadUri
    const filename =
      fileInfo?.fileContent?.name || `patch_install_${formatFilenameTimestamp(row.start_time)}.html`
    if (!downloadUri) {
      throw new Error('未找到下载地址')
    }
    await downloadFromUri(`${downloadUri}?cacheBuster=${Date.now()}`, filename)
  } catch (error) {
    ElMessage.error(`下载安装报告失败: ${error.message || '未知错误'}`)
  }
}

function buildReportPath(dir, filePath) {
  if (!filePath) return `VAP_EXPORT_DATA/${dir}/`
  const normalized = filePath.startsWith(`${dir}/`)
    ? `VAP_EXPORT_DATA/${filePath}`
    : `VAP_EXPORT_DATA/${dir}/${filePath}`
  return normalized
}

function resolveDownloadFilename(fileInfo, fallbackBase, timestamp) {
  const name = fileInfo?.fileContent?.name || fileInfo?.name
  if (name) return name
  return `${fallbackBase}_${formatFilenameTimestamp(timestamp)}.xlsx`
}

async function downloadRollbackReport(row) {
  if (!row.run_id) {
    ElMessage.warning('无运行记录')
    return
  }
  try {
    const filePath = await fetchReportPath(row.run_id, 'patch_rollback')
    const reportPath = buildReportPath('patch_rollback', filePath)
    const fileInfo = await fetchReportFileInfo(reportPath)
    if (fileInfo?.detail) {
      throw new Error(fileInfo.message || '未找到报告文件')
    }
    const downloadUri = fileInfo?.fileContent?.downloadUri || fileInfo?.downloadUri
    if (!downloadUri) {
      throw new Error('未找到下载地址')
    }
    const filename = resolveDownloadFilename(fileInfo, 'patch_rollback', row.start_time)
    await downloadFromUri(`${downloadUri}?cacheBuster=${Date.now()}`, filename)
  } catch (error) {
    ElMessage.error(`下载回退报告失败: ${error.message || '未知错误'}`)
  }
}

// 筛选变化
function handleFilterChange() {
  pagination.value.page = 1
  loadData()
}

// 刷新
function handleRefresh() {
  loadData()
}

// 分页变化
function handlePageChange(page) {
  pagination.value.page = page
  loadData()
}

function handleSizeChange(size) {
  pagination.value.pageSize = size
  pagination.value.page = 1
  loadData()
}

// 开始轮询
function startPolling() {
  stopPolling()
  pollingTimer = setInterval(() => {
    // 如果有运行中或等待中的任务，继续轮询
    const hasRunningTasks = tableData.value.some(
      row => row.status === 'RUNNING' || row.status === 'WAITING'
    )
    if (hasRunningTasks) {
      loadData()
    }
  }, 5000) // 每5秒刷新一次
}

// 停止轮询
function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

// 监听对话框打开
watch(
  () => props.modelValue,
  val => {
    if (val) {
      loadData()
      startPolling()
    } else {
      stopPolling()
    }
  }
)

onMounted(() => {
  if (props.modelValue) {
    loadData()
    startPolling()
  }
})

onBeforeUnmount(() => {
  stopPolling()
})
</script>

<style scoped lang="scss">
.operation-logs-dialog {
  :deep(.el-dialog__body) {
    padding: 20px;
  }
}

.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-light);
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
</style>
