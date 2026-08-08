<template>
  <div class="ops-page-layout">
    <!-- 操作记录 -->
      <div class="ops-filter-bar">
        <el-form :model="filters" inline size="small">
          <el-form-item label="时间范围">
            <el-select v-model="dayFilter" style="width: 100px" @change="handleFilterChange">
              <el-option label="今天" :value="1" />
              <el-option label="近3天" :value="3" />
              <el-option label="近7天" :value="7" />
              <el-option label="近30天" :value="30" />
              <el-option label="近一年" :value="365" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="statusFilter" placeholder="状态" style="width: 80px" clearable @change="handleFilterChange">
              <el-option label="全部" value="all" />
              <el-option label="完成" value="COMPLETED" />
              <el-option label="失败" value="FAILED" />
              <el-option label="运行中" value="RUNNING" />
            </el-select>
          </el-form-item>
          <el-form-item label="操作类型">
            <el-select v-model="actionFilter" placeholder="操作类型" style="width: 150px" clearable @change="handleFilterChange">
              <el-option label="全部" value="all" />
              <el-option label="补丁扫描" value="#{app_vap.menu.patch_scan.title}" />
              <el-option label="补丁安装" value="补丁安装" />
              <el-option label="补丁回滚" value="补丁回滚" />
              <el-option label="Windows漏洞扫描" value="#{app_vap.menu.win_patch_scan.title}" />
              <el-option label="定时导入补丁库" value="#{app_vap.menu.import_patch_library_time}" />
            </el-select>
          </el-form-item>
          <el-form-item label="关键词">
            <el-input v-model="searchText" placeholder="搜索" style="width: 250px" clearable @keyup.enter="handleFilterChange" @clear="handleFilterChange">
              <template #prefix>
                <el-icon>
                  <Search />
                </el-icon>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="loading" @click="handleFilterChange">
              <el-icon>
                <Search />
              </el-icon>
              搜索
            </el-button>
            <el-button @click="handleReset">
              <el-icon>
                <RefreshRight />
              </el-icon>
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="ops-action-bar">
        <span style="flex: 1"></span>
        <el-button
          class="toolbar-icon-btn"
          circle
          size="small"
          :loading="loading"
          @click="handleFilterChange"
          title="刷新"
        >
          <el-icon v-show="!loading">
            <Refresh />
          </el-icon>
        </el-button>
      </div>

      <div class="ops-table-wrapper">
        <el-table v-loading="loading" :data="tableData" max-height="calc(100vh - 314px)">
          <el-table-column prop="start_time" label="开始时间" width="180" sortable>
            <template #default="{ row }">
              {{ formatTimestamp(row.start_time) }}
            </template>
          </el-table-column>
          <el-table-column prop="action" label="操作" width="160" show-overflow-tooltip>
            <template #default="{ row }">
              {{ translateAction(row.action) }}
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="90">
            <template #default="{ row }">
              <el-tag
                :type="getStatusType(row.status)"
                size="small"
                :style="{ cursor: row.run_record ? 'pointer' : 'default' }"
                @click="row.run_record && handleViewRunResult(row)"
              >
                {{ getStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="executor_node" label="执行引擎节点" width="120" />
          <el-table-column prop="target_hosts" label="目标节点" width="240">
            <template #default="{ row }">
              <div
                v-if="row.target_hosts"
                class="host-tags-wrapper"
                @click="handleShowAllHosts(row)"
              >
                <div class="host-tags">
                  <el-tag
                    v-for="(host, idx) in getHostPreview(row.target_hosts).leading"
                    :key="idx"
                    type="info"
                    size="small"
                    class="host-clickable-tag"
                  >
                    {{ host }}
                  </el-tag>
                  <template v-if="getHostPreview(row.target_hosts).last">
                    <el-tag type="info" size="small" class="host-clickable-tag">
                      {{ getHostPreview(row.target_hosts).last }}
                    </el-tag>
                    <el-tag
                      v-if="getHostPreview(row.target_hosts).extraCount > 0"
                      type="info"
                      size="small"
                      class="host-clickable-tag"
                    >
                      +{{ getHostPreview(row.target_hosts).extraCount }}
                    </el-tag>
                  </template>
                </div>
              </div>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="message" label="结果" min-width="300" show-overflow-tooltip>
            <template #default="{ row }">
              {{ translateMessage(row.message) }}
            </template>
          </el-table-column>
          <el-table-column prop="username" label="用户" width="100" sortable />
          <el-table-column prop="end_time" label="结束时间" width="180" sortable>
            <template #default="{ row }">
              {{ formatTimestamp(row.end_time) }}
            </template>
          </el-table-column>
          <el-table-column label="耗时" width="90">
            <template #default="{ row }">
              {{ calculateDuration(row.start_time, row.end_time) }}
            </template>
          </el-table-column>
          <el-table-column :width="actionColumnWidth" fixed="right" label="操作">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button text type="primary" size="small" @click="handleViewRunResult(row)">
                  详情
                </el-button>
                <el-button
                  v-if="canShowWindowsScanReport(row)"
                  text
                  size="small"
                  type="primary"
                  @click="handleWindowsScanReport(row)"
                >
                  Windows扫描报告
                </el-button>
                <el-button
                  v-if="canShowScanReport(row)"
                  text
                  size="small"
                  type="primary"
                  @click="handleScanReport(row)"
                >
                  扫描报告
                </el-button>
                <el-button
                  v-if="canShowInstallReport(row)"
                  text
                  size="small"
                  type="primary"
                  @click="handleInstallReport(row)"
                >
                  安装报告
                </el-button>
                <el-button
                  v-if="canShowRollbackReport(row)"
                  text
                  size="small"
                  type="primary"
                  @click="handleRollbackReport(row)"
                >
                  回滚报告
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页区域 -->
      <div class="ops-pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 25, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>


    <!-- 运行结果对话框 -->
    <ExecuteResultDialog
      v-model:visible="runResultDialogVisible"
      :run-id="selectedRunId"
      :title="selectedJobTitle"
    />

    <ScanReportDialog v-model="scanReportVisible" :run-id="scanReportRunId" />

    <WindowsScanReportDialog v-model="winScanReportVisible" :run-id="winScanReportRunId" />

    <!-- 目标节点列表对话框 -->
    <el-dialog
      v-model="hostsDialogVisible"
      width="680px"
      destroy-on-close
      class="hosts-dialog"
    >
      <template #header>
        <div class="hosts-dialog-header">
          <span class="hosts-dialog-title">目标节点</span>
          <el-tag size="small" type="info" effect="light" round class="hosts-count-badge">
            共 {{ hostsDialogList.length }} 台主机
          </el-tag>
        </div>
      </template>

      <div class="hosts-dialog-body">
        <div class="hosts-dialog-toolbar">
          <el-input
            v-model="hostSearchKey"
            placeholder="搜索 IP 或主机名..."
            clearable
            size="default"
            :prefix-icon="Search"
            class="hosts-search-input"
          />
        </div>

        <el-scrollbar max-height="340px" class="hosts-scrollbar">
          <div v-if="filteredHostsDialogList.length" class="hosts-tag-container">
            <el-tooltip
              v-for="(host, idx) in filteredHostsDialogList"
              :key="idx"
              content="点击复制 IP"
              placement="top"
              :show-after="300"
            >
              <div
                class="host-item-tag"
                @click="handleCopyHost(host)"
              >
                <el-icon class="host-icon"><Monitor /></el-icon>
                <span>{{ host }}</span>
              </div>
            </el-tooltip>
          </div>
          <el-empty
            v-else-if="hostsDialogList.length && !filteredHostsDialogList.length"
            description="未找到匹配的目标节点"
            :image-size="70"
          />
          <el-empty
            v-else
            description="暂无目标节点数据"
            :image-size="70"
          />
        </el-scrollbar>
      </div>

      <template #footer>
        <div class="hosts-dialog-footer">
          <span class="hosts-filter-info">
            <template v-if="hostSearchKey && hostsDialogList.length">
              已筛选 {{ filteredHostsDialogList.length }} / 共 {{ hostsDialogList.length }} 项
            </template>
          </span>
          <el-button @click="hostsDialogVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElTag } from 'element-plus'
import { Refresh, Search, RefreshRight, Monitor } from '@element-plus/icons-vue'
import { patchLogsApi } from '../api'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import { translateText } from '@/utils/i18n'
import { useApi } from '@/core/api'
import { authService } from '@/core/auth'
import ScanReportDialog from '../components/logs/ScanReportDialog.vue'
import WindowsScanReportDialog from '../components/logs/WindowsScanReportDialog.vue'
import { useActiveTaskListPolling } from '@/composables/useActiveTaskListPolling'

// ========== 操作记录 ==========
const loading = ref(false)
const tableData = ref([])

useActiveTaskListPolling({
  records: tableData,
  refresh: loadData
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 筛选状态
const actionFilter = ref('all')
const statusFilter = ref('all')
const dayFilter = ref(1)
const searchText = ref('')
const filters = reactive({
  keyword: ''
})

// 运行结果对话框状态
const runResultDialogVisible = ref(false)
const selectedRunId = ref('')
const selectedJobTitle = ref('')

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

// 目标节点对话框
const hostsDialogVisible = ref(false)
const hostsDialogList = ref([])
const hostSearchKey = ref('')

const filteredHostsDialogList = computed(() => {
  if (!hostSearchKey.value) return hostsDialogList.value
  const kw = hostSearchKey.value.trim().toLowerCase()
  return hostsDialogList.value.filter(host => host.toLowerCase().includes(kw))
})

const ACTION_KEYS = {
  patchScan: '#{app_vap.menu.patch_scan.title}',
  patchInstall: '#{app_vap.menu.patch_install.title}',
  patchRollback: '#{app_vap.menu.patch_rollback.title}',
  winPatchScan: '#{app_vap.menu.win_patch_scan.title}'
}

// 状态映射
function getStatusType(status) {
  const map = {
    COMPLETED: 'success',
    FAILED: 'danger',
    RUNNING: 'primary',
    PENDING: 'info'
  }
  return map[status] || 'info'
}

function getStatusLabel(status) {
  const map = {
    COMPLETED: '完成',
    FAILED: '失败',
    RUNNING: '运行中',
    PENDING: '等待中',
    ERROR: '错误'
  }
  return map[status] || status
}

// 时间格式化
function formatTimestamp(timestamp) {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 翻译操作类型（使用 i18n 工具）
function translateAction(action) {
  if (!action) return ''

  // 先尝试使用 i18n 翻译工具
  const translated = translateText(action)

  // 如果翻译结果与原文相同，可能是没有找到翻译，尝试使用硬编码映射
  if (translated === action && action.startsWith('#{')) {
    // 硬编码的常用翻译映射
    const staticMap = {
      '#{app_vap.menu.patch_scan.title}': '补丁扫描',
      '#{app_vap.menu.patch_install.title}': '补丁安装',
      '#{app_vap.menu.patch_rollback.title}': '补丁回滚',
      '#{app_vap.menu.win_patch_scan.title}': 'Windows漏洞扫描',
      '#{app_vap.menu.import_patch_library_time}': '定时导入补丁库',
      '#{app_vap.menu.import_patch_library.title}': '导入补丁库',
      '#{app_vap.common.tab.repo_list_scan}': 'YUM源列表扫描',
      '#{app_vap.common.tab.custom_repo}': '自定义YUM源'
    }

    if (staticMap[action]) {
      return staticMap[action]
    }

    // 如果静态映射也没有，提取 key 的最后一部分作为显示文本
    const key = action.slice(2, -1)
    const parts = key.split('.')
    return parts[parts.length - 1] || action
  }

  return translated
}

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

// 翻译消息（基于 i18n 模板）
function translateMessage(messageStr) {
  if (!messageStr) return ''

  if (messageStr.includes('#{')) {
    return translateText(messageStr)
  }

  try {
    const msg = JSON.parse(messageStr)
    const msgId = msg.msg_id
    if (!msgId) return messageStr

    const template = translateText(`#{${msgId}}`)
    return applyTemplateParams(template, msg) || msgId
  } catch (e) {
    const translated = translateText(`#{${messageStr}}`)
    return translated || messageStr
  }
}

function parseHosts(hostsStr) {
  if (!hostsStr) return []
  return hostsStr
    .split(',')
    .map(host => host.replace(/^['"“”‘’\s]+|['"“”‘’\s]+$/g, '').trim())
    .filter(Boolean)
}

function handleShowAllHosts(row) {
  hostsDialogList.value = parseHosts(row.target_hosts)
  hostSearchKey.value = ''
  hostsDialogVisible.value = true
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    return true
  } catch (err) {
    console.error('Copy failed', err)
    return false
  }
}

async function handleCopyHost(host) {
  const success = await copyToClipboard(host)
  if (success) {
    ElMessage.success(`已复制 IP: ${host}`)
  } else {
    ElMessage.error('复制失败')
  }
}

function getHostPreview(hostsStr) {
  const hosts = parseHosts(hostsStr)
  if (hosts.length <= 3) {
    return {
      leading: hosts,
      last: '',
      extraCount: 0
    }
  }

  return {
    leading: hosts.slice(0, 2),
    last: hosts[2],
    extraCount: hosts.length - 3
  }
}

// 计算耗时（格式化为 H:mm:ss）
function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return '-'
  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()
  const totalSeconds = Math.floor((end - start) / 1000)

  const hours = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60

  return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

// ========== 操作记录相关方法 ==========
async function loadData() {
  loading.value = true
  try {
    const keywordFilter = searchText.value ? `message|username:*${searchText.value}*` : ''
    let actionParam = actionFilter.value
    if (actionParam === '#{app_vap.menu.patch_install.title}') {
      actionParam = '补丁安装'
    } else if (actionParam === '#{app_vap.menu.patch_rollback.title}') {
      actionParam = '补丁回滚'
    }
    const response = await patchLogsApi.getLogs({
      page: pagination.page,
      size: pagination.pageSize,
      action: actionParam,
      status: statusFilter.value,
      day: dayFilter.value,
      filter: keywordFilter
    })
    tableData.value = response?.records || []
    pagination.total = response?.total || 0
  } catch (error) {
    console.error('Failed to load logs:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

function handleFilterChange() {
  pagination.page = 1
  loadData()
}

function handleReset() {
  dayFilter.value = 1
  statusFilter.value = 'all'
  actionFilter.value = 'all'
  searchText.value = ''
  pagination.page = 1
  pagination.pageSize = 10
  loadData()
}

function handlePageChange(page) {
  pagination.page = page
  loadData()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  loadData()
}

// 查看运行结果
function handleViewRunResult(row) {
  if (!row.run_id) {
    ElMessage.warning('无运行记录')
    return
  }
  selectedRunId.value = row.run_id
  selectedJobTitle.value = translateAction(row.action)
  runResultDialogVisible.value = true
}

function isPatchScan(row) {
  return row?.action === ACTION_KEYS.patchScan || row?.action === '补丁扫描' || translateAction(row?.action) === '补丁扫描'
}

function isWindowsScan(row) {
  return row?.action === ACTION_KEYS.winPatchScan || row?.action === 'Windows漏洞扫描' || translateAction(row?.action) === 'Windows漏洞扫描'
}

function isPatchInstall(row) {
  return row?.action === ACTION_KEYS.patchInstall || row?.action === '补丁安装' || translateAction(row?.action) === '补丁安装'
}

function isPatchRollback(row) {
  return row?.action === ACTION_KEYS.patchRollback || row?.action === '补丁回滚' || row?.action === '补丁回退' || translateAction(row?.action) === '补丁回滚' || translateAction(row?.action) === '补丁回退'
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
    downloadFile('staticfs', null, `SECOPS_EXPORT_DATA/${dir}/${filePath}`, filename)
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
      ? `SECOPS_EXPORT_DATA/patch_install/${filePath}`
      : 'SECOPS_EXPORT_DATA/patch_install/'
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
  if (!filePath) return `SECOPS_EXPORT_DATA/${dir}/`
  const normalized = filePath.startsWith(`${dir}/`)
    ? `SECOPS_EXPORT_DATA/${filePath}`
    : `SECOPS_EXPORT_DATA/${dir}/${filePath}`
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
    ElMessage.error(`下载回滚报告失败: ${error.message || '未知错误'}`)
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
/* 此组件现在使用全局的 ops-page-layout 样式 */
.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 24px;

  &:last-child {
    margin-right: 0;
  }
}

.filter-label {
  font-size: 13px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
}

.host-tags-wrapper {
  cursor: pointer;
  display: inline-block;
  width: 100%;
}

.host-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;

  .host-clickable-tag {
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
      border-color: var(--el-color-primary-light-5, #a0cfff);
      color: var(--el-color-primary, #409eff);
      background-color: var(--el-color-primary-light-9, #ecf5ff);
      transform: translateY(-1px);
    }
  }
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.hosts-dialog-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hosts-dialog-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.hosts-count-badge {
  font-weight: 500;
}

.hosts-dialog-body {
  padding: 4px 0;
}

.hosts-dialog-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;

  .hosts-search-input {
    flex: 1;
  }
}

.hosts-scrollbar {
  border: 1px solid var(--el-border-color-lighter, #e2e8f0);
  border-radius: 8px;
  padding: 14px;
  background-color: var(--el-fill-color-light, #f8fafc);
}

.hosts-tag-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.host-item-tag {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  padding: 0 12px;
  height: 32px;
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-regular, #334155);
  background-color: var(--el-bg-color-overlay, #ffffff);
  border: 1px solid var(--el-border-color, #cbd5e1);
  border-radius: 6px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;

  &:hover {
    border-color: var(--el-color-primary-light-3, #79bbff);
    color: var(--el-color-primary, #409eff);
    background-color: var(--el-color-primary-light-9, #ecf5ff);
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
    transform: translateY(-1px);

    .host-icon {
      color: var(--el-color-primary, #409eff);
    }
  }

  .host-icon {
    font-size: 14px;
    color: #64748b;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s ease;
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1;
  }
}

.hosts-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .hosts-filter-info {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}
</style>
