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
      <!-- 筛选区 -->
      <div class="ops-filter-bar">
        <span>时间范围</span>
        <el-select v-model="dayFilter" size="small" style="width: 100px" @change="handleFilterChange">
          <el-option label="Today" :value="1" />
          <el-option label="近3天" :value="3" />
          <el-option label="近7天" :value="7" />
          <el-option label="近30天" :value="30" />
        </el-select>
        <el-select v-model="engineFilter" placeholder="执行引擎节点" size="small" style="width: 120px" clearable @change="handleFilterChange">
          <el-option label="全部" value="" />
        </el-select>
        <el-select v-model="statusFilter" placeholder="状态" size="small" style="width: 80px" clearable @change="handleFilterChange">
          <el-option label="全部" value="all" />
          <el-option label="完成" value="COMPLETED" />
          <el-option label="失败" value="FAILED" />
          <el-option label="运行中" value="RUNNING" />
        </el-select>
        <el-select v-model="actionFilter" placeholder="操作类型" size="small" style="width: 120px" clearable @change="handleFilterChange">
          <el-option label="全部" value="all" />
          <el-option label="补丁扫描" value="#{app_vap.menu.patch_scan.title}" />
          <el-option label="补丁安装" value="#{app_vap.menu.patch_install.title}" />
          <el-option label="补丁回退" value="#{app_vap.menu.patch_rollback.title}" />
          <el-option label="Windows漏洞扫描" value="#{app_vap.menu.win_patch_scan.title}" />
          <el-option label="定时导入补丁库" value="#{app_vap.menu.import_patch_library_time}" />
        </el-select>
        <el-input
          v-model="searchText"
          placeholder="搜索"
          size="small"
          style="width: 150px; margin-left: auto"
          clearable
          @input="handleSearchInput"
        >
          <template #prefix>
            <i class="fa fa-search" />
          </template>
        </el-input>
        <el-button size="small" @click="handleFilterChange">
          刷新
        </el-button>
      </div>

      <!-- 表格区域 -->
      <div class="ops-table-wrapper">
        <el-table
          v-loading="loading"
          :data="tableData"
          stripe
          height="calc(100vh - 320px)"
        >
          <el-table-column prop="start_time" label="开始时间" width="180" sortable>
            <template #default="{ row }">
              {{ formatTimestamp(row.start_time) }}
            </template>
          </el-table-column>
          <el-table-column prop="action" label="操作" width="140" sortable>
            <template #default="{ row }">
              {{ translateAction(row.action) }}
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="80" sortable>
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
          <el-table-column prop="ata_node" label="执行引擎节点" width="150" sortable />
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
        </el-table>
      </div>

      <!-- 分页区域 -->
      <div class="ops-pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 25, 50, 100]"
          :total="filteredTableData.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </template>

    <!-- 漏洞报表 Tab -->
    <template v-if="activeTab === 'vulnerability'">
      <!-- 筛选区 -->
      <div class="ops-filter-bar">
        <el-input
          v-model="vulFilterText"
          placeholder="主机/KB编号"
          size="small"
          style="width: 200px"
          clearable
          @keyup.enter="handleVulSearch"
          @clear="handleVulSearch"
        >
          <template #prefix>
            <i class="fa fa-search" />
          </template>
        </el-input>
        <el-button size="small" @click="loadVulData">
          刷新
        </el-button>
      </div>

      <!-- 表格区域 -->
      <div class="ops-table-wrapper">
        <el-table
          v-loading="vulLoading"
          :data="vulTableData"
          stripe
          height="calc(100vh - 320px)"
        >
          <el-table-column prop="host_key" label="主机" min-width="150" show-overflow-tooltip />
          <el-table-column prop="os" label="OS" width="100" />
          <el-table-column prop="os_version" label="OS版本" width="150" />
          <el-table-column prop="vul_id" label="KB编号" width="120" />
          <el-table-column prop="scan_time" label="扫描时间" width="160">
            <template #default="{ row }">
              {{ formatTimestamp(row.scan_time) }}
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
      <!-- 筛选区 -->
      <div class="ops-filter-bar">
        <el-input
          v-model="patchFilterText"
          placeholder="主机/补丁编号/严重性"
          size="small"
          style="width: 220px"
          clearable
          @keyup.enter="handlePatchSearch"
          @clear="handlePatchSearch"
        >
          <template #prefix>
            <i class="fa fa-search" />
          </template>
        </el-input>
        <el-button size="small" @click="loadPatchData">
          刷新
        </el-button>
      </div>

      <!-- 表格区域 -->
      <div class="ops-table-wrapper">
        <el-table
          v-loading="patchLoading"
          :data="patchTableData"
          stripe
          height="calc(100vh - 320px)"
        >
          <el-table-column prop="host_key" label="主机" min-width="150" show-overflow-tooltip />
          <el-table-column prop="os" label="OS" width="100" />
          <el-table-column prop="os_version" label="OS版本" width="150" />
          <el-table-column prop="patch_id" label="补丁编号" width="120" />
          <el-table-column prop="summary" label="概要" min-width="200" show-overflow-tooltip />
          <el-table-column prop="severity" label="严重性" width="100">
            <template #default="{ row }">
              <el-tag :type="getSeverityType(row.severity)" size="small">
                {{ row.severity }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="scan_time" label="扫描时间" width="160">
            <template #default="{ row }">
              {{ formatTimestamp(row.scan_time) }}
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
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { patchLogsApi, operationReportApi } from '../api'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'

// Tab 状态
const activeTab = ref('operation')

// ========== 操作记录 Tab ==========
const loading = ref(false)
const allTableData = ref([]) // 原始数据，用于前端筛选
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 前端筛选后的数据
const filteredTableData = computed(() => {
  if (!searchText.value) {
    return allTableData.value
  }
  const keyword = searchText.value.toLowerCase()
  return allTableData.value.filter(row => {
    // 搜索多个字段：操作、执行引擎节点、结果、用户
    const action = translateAction(row.action || '').toLowerCase()
    const ataNode = (row.ata_node || '').toLowerCase()
    const message = translateMessage(row.message || '').toLowerCase()
    const username = (row.username || '').toLowerCase()
    return action.includes(keyword) ||
           ataNode.includes(keyword) ||
           message.includes(keyword) ||
           username.includes(keyword)
  })
})

// 当前页展示的数据
const tableData = computed(() => {
  const start = (pagination.page - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return filteredTableData.value.slice(start, end)
})

// 总页数
const totalPages = computed(() => {
  return Math.ceil(filteredTableData.value.length / pagination.pageSize) || 1
})

// 筛选状态
const actionFilter = ref('all')
const statusFilter = ref('all')
const dayFilter = ref(1)
const engineFilter = ref('')
const searchText = ref('')

// 分页信息（基于筛选后的数据）
const paginationInfo = computed(() => {
  const total = filteredTableData.value.length
  if (total === 0) return '0-0/0'
  const start = (pagination.page - 1) * pagination.pageSize + 1
  const end = Math.min(pagination.page * pagination.pageSize, total)
  return `${start}-${end}/${total}`
})

// 运行结果对话框状态
const runResultDialogVisible = ref(false)
const selectedRunId = ref('')
const selectedJobTitle = ref('')

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

function getSeverityType(severity) {
  const map = {
    Critical: 'danger',
    Important: 'warning',
    Moderate: 'info',
    Low: 'success'
  }
  return map[severity] || 'info'
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

// 翻译操作类型（硬编码）
function translateAction(action) {
  switch (action) {
    case '#{app_vap.menu.patch_scan.title}':
      return '补丁扫描'
    case '#{app_vap.menu.patch_install.title}':
      return '补丁安装'
    case '#{app_vap.menu.patch_rollback.title}':
      return '补丁回退'
    case '#{app_vap.menu.win_patch_scan.title}':
      return 'Windows漏洞扫描'
    case '#{app_vap.menu.import_patch_library_time}':
      return '定时导入补丁库'
    case '#{app_vap.menu.import_patch_library.title}':
      return '导入补丁库'
    default:
      return action
  }
}

// 翻译消息（硬编码）
function translateMessage(messageStr) {
  if (!messageStr) return ''
  try {
    const msg = JSON.parse(messageStr)
    const msgId = msg.msg_id
    if (!msgId) return messageStr

    switch (msgId) {
      case 'app_vap.log.scan_complete':
        return `扫描完成，共${msg.machine_count || 0}台机器`
      case 'app_vap.log.scan_fail':
        return msg.msg_info ? `扫描失败：${msg.msg_info}` : '扫描失败'
      case 'app_vap.log.install_complete':
        return `安装完成，共${msg.machine_count || 0}台机器`
      case 'app_vap.log.install_fail':
        return msg.msg_info ? `安装失败：${msg.msg_info}` : '安装失败'
      case 'app_vap.log.rollback_complete':
        return `回退完成，共${msg.machine_count || 0}台机器`
      case 'app_vap.log.rollback_fail':
        return msg.msg_info ? `回退失败：${msg.msg_info}` : '回退失败'
      case 'app_vap.log.import_success':
        return `成功导入${msg.patch_count || 0}个补丁`
      case 'app_vap.log.import_fail':
        return msg.msg_info ? `导入失败：${msg.msg_info}` : '导入失败'
      case 'app_vap.log.import_path_fail':
        return msg.msg_info ? `导入补丁库失败：${msg.msg_info}` : '导入补丁库失败'
      case 'app_vap.log.deal_file_fail':
        return msg.server ? `文件处理失败，请检查Oplus更新服务器${msg.server}` : '文件处理失败'
      case 'app_vap.log.install_fail_check_report':
        return '补丁安装执行升级失败，请查看安装报告'
      case 'app_vap.log.exec_install_fail':
        return msg.msg_info ? `执行补丁安装出现错误，原因是${msg.msg_info}` : '执行补丁安装出现错误'
      case 'app_vap.log.exec_rollback_fail':
        return msg.msg_info ? `执行补丁回滚出现错误，原因是${msg.msg_info}` : '执行补丁回滚出现错误'
      case 'app_vap.log.install_success_rescan_fail':
        return '补丁安装执行完成，再次运行补丁扫描执行错误'
      case 'app_vap.log.rollback_success_rescan_fail':
        return '补丁回退执行成功，再次运行补丁扫描执行错误'
      case 'app_vap.log.machine_count':
        return `机器数量：${msg.machine_count || 0}`
      default:
        return msgId
    }
  } catch (e) {
    return messageStr
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
    const response = await patchLogsApi.getLogs({
      page: 1,
      size: 9999, // 获取所有数据用于前端筛选
      action: actionFilter.value,
      status: statusFilter.value,
      day: dayFilter.value
    })
    const data = response?.data || response
    allTableData.value = data?.records || []
    pagination.total = allTableData.value.length
    pagination.page = 1 // 重置到第一页
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

// 搜索文本改变时仅前端过滤（实时搜索）
function handleSearchInput() {
  pagination.page = 1
  // filteredTableData 是 computed，会自动响应 searchText 的变化
}

// 监听筛选后数据变化，确保页码有效
watch(filteredTableData, () => {
  const maxPage = Math.ceil(filteredTableData.value.length / pagination.pageSize) || 1
  if (pagination.page > maxPage) {
    pagination.page = 1
  }
})

function handlePageChange(page) {
  pagination.page = page
  // 前端分页，不需要调用API
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  // 前端分页，不需要调用API
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
    const response = await operationReportApi.getPatchReport({
      page: patchPagination.page,
      size: patchPagination.pageSize,
      filter: patchFilterText.value ? `host_key|patch_id|severity:*${patchFilterText.value}*` : ''
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
</style>
