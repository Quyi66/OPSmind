<template>
  <div class="ops-page-layout">
    <!-- Tab 导航 -->
    <el-tabs v-model="activeTab">
      <el-tab-pane label="操作记录" name="operation" />
      <el-tab-pane label="漏洞报表" name="vulnerability" />
      <el-tab-pane label="补丁报表" name="patch" />
    </el-tabs>

    <!-- 操作记录 Tab -->
    <template v-if="activeTab === 'operation'">
      <div class="ops-filter-bar">
        <el-form :model="filters" inline size="small">
          <el-form-item label="时间范围">
            <el-select v-model="dayFilter" style="width: 100px">
              <el-option label="今天" :value="1" />
              <el-option label="近3天" :value="3" />
              <el-option label="近7天" :value="7" />
              <el-option label="近30天" :value="30" />
              <el-option label="近一年" :value="365" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="statusFilter" placeholder="状态" style="width: 80px" clearable>
              <el-option label="全部" value="all" />
              <el-option label="完成" value="COMPLETED" />
              <el-option label="失败" value="FAILED" />
              <el-option label="运行中" value="RUNNING" />
            </el-select>
          </el-form-item>
          <el-form-item label="操作类型">
            <el-select v-model="actionFilter" placeholder="操作类型" style="width: 150px" clearable>
              <el-option label="全部" value="all" />
              <el-option label="补丁扫描" value="#{app_vap.menu.patch_scan.title}" />
              <el-option label="补丁安装" value="#{app_vap.menu.patch_install.title}" />
              <el-option label="补丁回退" value="#{app_vap.menu.patch_rollback.title}" />
              <el-option label="Windows漏洞扫描" value="#{app_vap.menu.win_patch_scan.title}" />
              <el-option label="定时导入补丁库" value="#{app_vap.menu.import_patch_library_time}" />
            </el-select>
          </el-form-item>
          <el-form-item label="关键词">
            <el-input v-model="searchText" placeholder="搜索" style="width: 250px" clearable>
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
        <el-table v-loading="loading" :data="tableData" max-height="calc(100vh - 280px)">
          <el-table-column prop="start_time" label="开始时间" width="180" sortable>
            <template #default="{ row }">
              {{ formatTimestamp(row.start_time) }}
            </template>
          </el-table-column>
          <el-table-column prop="action" label="操作" width="140" show-overflow-tooltip>
            <template #default="{ row }">
              {{ translateAction(row.action) }}
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="80">
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
          <el-table-column prop="ata_node" label="执行引擎节点" width="120" />
          <el-table-column prop="target_hosts" label="目标节点" width="180">
            <template #default="{ row }">
              <div v-if="row.target_hosts" class="host-tags">
                <el-tag
                  v-for="(host, idx) in getHostPreview(row.target_hosts).leading"
                  :key="idx"
                  type="info"
                >
                  {{ host }}
                </el-tag>
                <span v-if="getHostPreview(row.target_hosts).last" class="host-tag-group">
                  <el-tag type="info">
                    {{ getHostPreview(row.target_hosts).last }}
                  </el-tag>
                  <el-tag
                    v-if="getHostPreview(row.target_hosts).extraCount > 0"
                    @click="handleShowAllHosts(row)"
                    style="cursor: pointer"
                    type="info"
                  >
                    +{{ getHostPreview(row.target_hosts).extraCount }}
                  </el-tag>
                </span>
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
          <el-table-column label="耗时" width="100">
            <template #default="{ row }">
              {{ calculateDuration(row.start_time, row.end_time) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button text type="primary" @click="handleViewRunResult(row)">查看</el-button>
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
    </template>

    <!-- 漏洞报表 Tab -->
    <template v-if="activeTab === 'vulnerability'">
      <div class="ops-filter-bar">
        <el-form inline size="small">
          <el-form-item label="搜索">
            <el-input
              v-model="vulFilterText"
              placeholder="主机/KB编号"
              size="small"
              style="width: 220px"
              clearable
              @keyup.enter="handleVulSearch"
              @clear="handleVulSearch"
            >
              <template #prefix>
                <i class="fa fa-search" />
              </template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="vulLoading" @click="handleVulSearch">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="handleVulReset">
              <el-icon><RefreshRight /></el-icon>
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
          :loading="vulLoading"
          @click="loadVulData"
          title="刷新"
        >
          <el-icon v-show="!vulLoading">
            <Refresh />
          </el-icon>
        </el-button>
      </div>

      <!-- 表格区域 -->
      <div class="ops-table-wrapper">
        <el-table v-loading="vulLoading" :data="vulTableData" max-height="calc(100vh - 280px)">
          <el-table-column prop="host_key" label="主机" min-width="150" show-overflow-tooltip />
          <el-table-column prop="os_distro" label="OS" width="100" />
          <el-table-column prop="os_version" label="OS版本" width="150" />
          <el-table-column prop="vul_id" label="KB编号" min-width="120" />
          <el-table-column prop="scan_timestamp" label="扫描时间" width="200">
            <template #default="{ row }">
              {{ formatTimestamp(row.scan_timestamp) }}
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页区域 -->
      <div class="ops-pagination-wrapper">
        <el-pagination
          v-model:current-page="vulPagination.page"
          v-model:page-size="vulPagination.pageSize"
          :page-sizes="[10, 25, 50, 100]"
          :total="vulPagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleVulSizeChange"
          @current-change="handleVulPageChange"
        />
      </div>
    </template>

    <!-- 补丁报表 Tab -->
    <template v-if="activeTab === 'patch'">
      <div class="ops-filter-bar">
        <el-form inline size="small">
          <el-form-item label="严重性">
            <el-select
              v-model="patchSeverityFilter"
              placeholder="全部"
              clearable
              style="width: 100px"
            >
              <el-option label="全部" value="" />
              <el-option label="严重" value="Critical" />
              <el-option label="重要" value="Important" />
              <el-option label="中等" value="Moderate" />
              <el-option label="低" value="Low" />
            </el-select>
          </el-form-item>
          <el-form-item label="搜索">
            <el-input
              v-model="patchFilterText"
              placeholder="主机/补丁编号/标题"
              size="small"
              style="width: 300px"
              clearable
              @keyup.enter="handlePatchSearch"
              @clear="handlePatchSearch"
            >
              <template #prefix>
                <i class="fa fa-search" />
              </template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="patchLoading" @click="handlePatchSearch">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="handlePatchReset">
              <el-icon><RefreshRight /></el-icon>
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
          :loading="patchLoading"
          @click="loadPatchData"
          title="刷新"
        >
          <el-icon v-show="!patchLoading">
            <Refresh />
          </el-icon>
        </el-button>
      </div>

      <!-- 表格区域 -->
      <div class="ops-table-wrapper">
        <el-table v-loading="patchLoading" :data="patchTableData" max-height="calc(100vh - 280px)">
          <el-table-column prop="host_key" label="主机" min-width="100" show-overflow-tooltip />
          <el-table-column prop="os_distro" label="OS" width="100" />
          <el-table-column prop="os_version" label="OS版本" width="100" />
          <el-table-column prop="patch_id" label="补丁编号" min-width="120" />
          <el-table-column prop="title" label="概要" min-width="300" show-overflow-tooltip />
          <el-table-column prop="severity" label="严重性" width="100">
            <template #default="{ row }">
              <el-tag
                class="severity-tag"
                :class="getSeverityClass(row.severity)"
                type="info"
                size="small"
              >
                {{ translateSeverity(row.severity) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="scan_timestamp" label="扫描时间" width="180">
            <template #default="{ row }">
              {{ formatTimestamp(row.scan_timestamp) }}
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页区域 -->
      <div class="ops-pagination-wrapper">
        <el-pagination
          v-model:current-page="patchPagination.page"
          v-model:page-size="patchPagination.pageSize"
          :page-sizes="[10, 25, 50, 100]"
          :total="patchPagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handlePatchSizeChange"
          @current-change="handlePatchPageChange"
        />
      </div>
    </template>

    <!-- 运行结果对话框 -->
    <ExecuteResultDialog
      v-model:visible="runResultDialogVisible"
      :run-id="selectedRunId"
      :title="selectedJobTitle"
    />

    <!-- 目标节点列表对话框 -->
    <el-dialog v-model="hostsDialogVisible" title="目标节点" width="520px" destroy-on-close>
      <div v-if="hostsDialogList.length" style="display: flex; flex-wrap: wrap; gap: 8px;">
        <el-tag v-for="(host, idx) in hostsDialogList" :key="idx" type="info">
          {{ host }}
        </el-tag>
      </div>
      <span v-else>-</span>
      <template #footer>
        <el-button @click="hostsDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElSpace, ElTag } from 'element-plus'
import { Refresh, Search, RefreshRight } from '@element-plus/icons-vue'
import { patchLogsApi, operationReportApi } from '../api'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import { translateText } from '@/utils/i18n'
import { PATCH_SEVERITY_LABELS, PATCH_SEVERITY_STYLES } from '../constants'

// Tab 状态
const activeTab = ref('operation')

// ========== 操作记录 Tab ==========
const loading = ref(false)
const tableData = ref([])


function getSeverityClass(severity) {
  if (!severity) return ''
  const key = severity.toUpperCase()
  const map = {
    CRITICAL: 'is-critical',
    IMPORTANT: 'is-important',
    MODERATE: 'is-moderate',
    LOW: 'is-low'
  }
  return map[key] || ''
}

function translateSeverity(severity) {
  if (!severity) return ''
  const key = severity.toUpperCase()
  return PATCH_SEVERITY_LABELS[key] || severity
}
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 筛选状态
const actionFilter = ref('all')
const statusFilter = ref('all')
const dayFilter = ref(1)
const engineFilter = ref('')
const searchText = ref('')
const filters = reactive({
  keyword: ''
})

// 运行结果对话框状态
const runResultDialogVisible = ref(false)
const selectedRunId = ref('')
const selectedJobTitle = ref('')

// 目标节点对话框
const hostsDialogVisible = ref(false)
const hostsDialogList = ref([])

// ========== 漏洞报告 Tab ==========
const vulLoading = ref(false)
const vulFilterText = ref('')
const vulTableData = ref([])
const vulPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 漏洞报表分页信息
const vulPaginationInfo = computed(() => {
  const total = vulPagination.total
  if (total === 0) return '0 - 0 / 0'
  const start = (vulPagination.page - 1) * vulPagination.pageSize + 1
  const end = Math.min(vulPagination.page * vulPagination.pageSize, total)
  return `${start} - ${end} / ${total.toLocaleString()}`
})

const vulTotalPages = computed(() => {
  return Math.ceil(vulPagination.total / vulPagination.pageSize) || 1
})

// ========== 补丁报表 Tab ==========
const patchLoading = ref(false)
const patchFilterText = ref('')
const patchSeverityFilter = ref('')
const patchTableData = ref([])
const patchPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 补丁报表分页信息
const patchPaginationInfo = computed(() => {
  const total = patchPagination.total
  if (total === 0) return '0 - 0 / 0'
  const start = (patchPagination.page - 1) * patchPagination.pageSize + 1
  const end = Math.min(patchPagination.page * patchPagination.pageSize, total)
  return `${start} - ${end} / ${total.toLocaleString()}`
})

const patchTotalPages = computed(() => {
  return Math.ceil(patchPagination.total / patchPagination.pageSize) || 1
})

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
    PENDING: '等待中'
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
  return hostsStr.split(',').map(host => host.trim()).filter(Boolean)
}

function handleShowAllHosts(row) {
  hostsDialogList.value = parseHosts(row.target_hosts)
  hostsDialogVisible.value = true
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
    const keywordFilter = searchText.value
      ? `message|username:*${searchText.value}*`
      : ''
    const response = await patchLogsApi.getLogs({
      page: pagination.page,
      size: pagination.pageSize,
      action: actionFilter.value,
      status: statusFilter.value,
      day: dayFilter.value,
      filter: keywordFilter
    })
    const data = response?.data || response
    tableData.value = data?.records || []
    pagination.total = data?.total || 0
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

// ========== 漏洞报表相关方法 ==========
async function loadVulData() {
  vulLoading.value = true
  try {
    const response = await operationReportApi.getVulnerabilityReport({
      page: vulPagination.page,
      size: vulPagination.pageSize,
      filter: vulFilterText.value ? `host_key|vul_id:*${vulFilterText.value}*` : ''
    })
    const data = response?.data || response
    vulTableData.value = data?.records || []
    vulPagination.total = data?.total || 0
  } catch (error) {
    console.error('Failed to load vulnerability data:', error)
    ElMessage.error('加载漏洞报表失败')
  } finally {
    vulLoading.value = false
  }
}

function handleVulSearch() {
  vulPagination.page = 1
  loadVulData()
}

function handleVulReset() {
  vulFilterText.value = ''
  vulPagination.page = 1
  vulPagination.pageSize = 10
  loadVulData()
}

function handleVulPageChange(page) {
  vulPagination.page = page
  loadVulData()
}

function handleVulSizeChange(size) {
  vulPagination.pageSize = size
  vulPagination.page = 1
  loadVulData()
}

// ========== 补丁报表相关方法 ==========
async function loadPatchData() {
  patchLoading.value = true
  try {
    let filter = ''
    const conditions = []

    if (patchFilterText.value) {
      conditions.push(`host_key|patch_id|title:*${patchFilterText.value}*`)
    }

    if (patchSeverityFilter.value) {
      conditions.push(`severity:${patchSeverityFilter.value}`)
    }

    filter = conditions.join('|')

    const response = await operationReportApi.getPatchReport({
      page: patchPagination.page,
      size: patchPagination.pageSize,
      filter: filter
    })
    const data = response?.data || response
    patchTableData.value = data?.records || []
    patchPagination.total = data?.total || 0
  } catch (error) {
    console.error('Failed to load patch data:', error)
    ElMessage.error('加载补丁报表失败')
  } finally {
    patchLoading.value = false
  }
}

function handlePatchSearch() {
  patchPagination.page = 1
  loadPatchData()
}

function handlePatchReset() {
  patchFilterText.value = ''
  patchSeverityFilter.value = ''
  patchPagination.page = 1
  patchPagination.pageSize = 10
  loadPatchData()
}

function handlePatchPageChange(page) {
  patchPagination.page = page
  loadPatchData()
}

function handlePatchSizeChange(size) {
  patchPagination.pageSize = size
  patchPagination.page = 1
  loadPatchData()
}

// Tab 切换时加载数据
watch(activeTab, (newTab) => {
  if (newTab === 'vulnerability' && vulTableData.value.length === 0) {
    loadVulData()
  } else if (newTab === 'patch' && patchTableData.value.length === 0) {
    loadPatchData()
  }
})

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
  color: #606266;
  white-space: nowrap;
}

.host-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.host-tag-group {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

</style>
