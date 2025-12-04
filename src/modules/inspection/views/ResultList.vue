<template>
  <div class="result-list-page">
    <!-- 左侧模板列表 -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <el-input
          v-model="templateSearchText"
          placeholder="搜索模板"
          clearable
          class="template-filter"
        >
          <template #prefix>
            <i class="fa fa-search"></i>
          </template>
        </el-input>
        <el-dropdown trigger="click" @command="handleSortChange">
          <el-button class="sort-btn">
            <i class="fa fa-sort"></i>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="-templateName">
                模板名称倒序
                <i v-if="templateOrder === '-templateName'" class="fa fa-check float-end"></i>
              </el-dropdown-item>
              <el-dropdown-item command="templateName">
                模板名称升序
                <i v-if="templateOrder === 'templateName'" class="fa fa-check float-end"></i>
              </el-dropdown-item>
              <el-dropdown-item command="executedAt">
                执行时间升序
                <i v-if="templateOrder === 'executedAt'" class="fa fa-check float-end"></i>
              </el-dropdown-item>
              <el-dropdown-item command="-executedAt">
                执行时间倒序
                <i v-if="templateOrder === '-executedAt'" class="fa fa-check float-end"></i>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      <div class="sidebar-content">
        <div class="template-nav">
          <a
            class="template-nav-item"
            :class="{ active: selectedTemplateId === '' }"
            @click="selectTemplate('')"
          >
            <i class="fa fa-list-alt"></i>
            全部
          </a>
          <a
            v-for="item in filteredTemplates"
            :key="item.id"
            class="template-nav-item"
            :class="{ active: selectedTemplateId === item.id }"
            @click="selectTemplate(item.id)"
          >
            {{ item.templateName }}
          </a>
        </div>
        <div v-if="templateLoading" class="loading-placeholder">
          <i class="fa fa-cog fa-spin"></i> 正在加载...
        </div>
      </div>
    </aside>

    <!-- 右侧检查结果列表 -->
    <main class="main-content">
      <nav class="content-navbar">
        <div class="navbar-title">检查结果</div>
        <div class="navbar-actions">
          <el-input
            v-model="searchText"
            placeholder="搜索"
            clearable
            style="width: 200px"
            @input="handleSearch"
          >
            <template #prefix>
              <i class="fa fa-search"></i>
            </template>
          </el-input>
          <el-button @click="refreshTable">
            <i class="fa fa-sync"></i>
          </el-button>
        </div>
      </nav>

      <div class="table-wrapper">
        <el-table
          v-loading="loading"
          :data="tableData"
          border
          stripe
          style="width: 100%"
          row-key="id"
        >
          <el-table-column prop="templateName" label="模板" min-width="180" show-overflow-tooltip sortable />
          <el-table-column label="检查项" min-width="160">
            <template #default="{ row }">
              <div v-html="formatAuditParams(row.auditParams)"></div>
            </template>
          </el-table-column>
          <el-table-column label="开始时间" width="170" sortable>
            <template #default="{ row }">
              {{ formatDateTime(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="结束时间" width="170" sortable>
            <template #default="{ row }">
              {{ formatDateTime(row.endedAt) }}
            </template>
          </el-table-column>
          <el-table-column prop="createdBy" label="执行人" width="100" />
          <el-table-column label="执行状态" width="100" align="center">
            <template #default="{ row }">
              <el-button
                :type="getStatusType(row.jobStatus)"
                size="small"
                round
                @click="showJobLog(row)"
              >
                {{ getStatusText(row.jobStatus) }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" align="center" fixed="right">
            <template #default="{ row }">
              <el-tooltip content="架构图" placement="top">
                <el-button
                  text
                  size="small"
                  :disabled="row.jobStatus === 'WAITING'"
                  @click="viewStructuralDiagram(row)"
                >
                  <i class="fa fa-sitemap"></i>
                </el-button>
              </el-tooltip>
              <el-tooltip content="检查结果" placement="top">
                <el-button
                  text
                  size="small"
                  :disabled="row.jobStatus === 'WAITING'"
                  @click="viewResult(row)"
                >
                  <i class="fa fa-grip-horizontal"></i>
                </el-button>
              </el-tooltip>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="table-footer">
          <el-select v-model="pagination.size" style="width: 80px" @change="handlePageSizeChange">
            <el-option :value="10" label="10" />
            <el-option :value="20" label="20" />
            <el-option :value="50" label="50" />
            <el-option :value="100" label="100" />
          </el-select>
          <span class="pagination-info">{{ paginationInfo }}</span>
        </div>
      </div>
    </main>

    <!-- 执行状态弹窗 -->
    <ExecuteResultDialog
      v-model:visible="executeResultVisible"
      :run-id="currentRunId"
      :job-title="currentJobTitle"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import { apiService } from '@/core/api'
import { authService } from '@/core/auth'
import { templateApi, jobApi } from '../api'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'

const router = useRouter()
const route = useRoute()

// 状态
const loading = ref(false)
const templateLoading = ref(false)
const tableData = ref([])
const allResults = ref([])
const templateList = ref([])
const selectedTemplateId = ref('')
const templateSearchText = ref('')
const searchText = ref('')
const templateOrder = ref('-templateName')
const structuralSwitch = ref('no')

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

// 过滤后的模板列表
const filteredTemplates = computed(() => {
  let list = [...templateList.value]

  // 搜索过滤
  if (templateSearchText.value) {
    const keyword = templateSearchText.value.toLowerCase()
    list = list.filter(t => t.templateName?.toLowerCase().includes(keyword))
  }

  // 排序
  list.sort((a, b) => {
    const order = templateOrder.value
    const desc = order.startsWith('-')
    const field = desc ? order.substring(1) : order

    let valueA = a[field] || ''
    let valueB = b[field] || ''

    if (field === 'executedAt') {
      valueA = valueA ? new Date(valueA).getTime() : 0
      valueB = valueB ? new Date(valueB).getTime() : 0
    }

    if (valueA < valueB) return desc ? 1 : -1
    if (valueA > valueB) return desc ? -1 : 1
    return 0
  })

  return list
})

// 分页信息
const paginationInfo = computed(() => {
  const total = pagination.value.total
  const start = Math.min((pagination.value.page - 1) * pagination.value.size + 1, total)
  const end = Math.min(pagination.value.page * pagination.value.size, total)
  return `${start} - ${end} / ${total}`
})

/**
 * 格式化日期时间
 */
function formatDateTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * 格式化检查参数
 */
function formatAuditParams(auditParamsStr) {
  if (!auditParamsStr) return '-'
  try {
    const auditParams = JSON.parse(auditParamsStr)
    let html = ''
    for (const param of auditParams) {
      const scriptsCount = param.scripts?.length || 0
      const hostsCount = param.hosts?.length || 0
      html += `脚本: <strong>${scriptsCount}</strong>, 主机: <strong>${hostsCount}</strong><br>`
    }
    return html || '-'
  } catch (e) {
    return '-'
  }
}

/**
 * 获取状态类型
 */
function getStatusType(status) {
  const statusMap = {
    'OK': 'success',
    'ERROR': 'danger',
    'WAITING': 'info',
    'RUNNING': 'primary'
  }
  return statusMap[status] || 'info'
}

/**
 * 获取状态文本
 */
function getStatusText(status) {
  const statusMap = {
    'OK': '完成',
    'ERROR': '失败',
    'WAITING': '等待中',
    'RUNNING': '运行中'
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
    templateList.value = response?.data || response || []
  } catch (error) {
    console.error('加载模板列表失败:', error)
  } finally {
    templateLoading.value = false
  }
}

/**
 * 加载检查结果
 */
async function loadResults() {
  loading.value = true
  try {
    // 使用正确的API: POST /cac/api/cac/v2/jobs/page/{templateId}
    const templateId = selectedTemplateId.value || 'all'

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

    params.append('draw', '1')
    params.append('length', String(pagination.value.size))
    params.append('order[0][column]', '2')
    params.append('order[0][dir]', 'desc')
    params.append('search[regex]', 'false')
    params.append('search[value]', searchText.value)
    params.append('start', String((pagination.value.page - 1) * pagination.value.size))

    // 使用 axios 直接发送，确保作为 Form Data 发送
    const baseURL = import.meta.env.VITE_API_BASE_URL || '/oplus-portal'
    const authHeaders = authService.getAuthHeaders()
    const response = await axios.post(
      `${baseURL}/cac/api/cac/v2/jobs/page/${templateId}`,
      params,
      {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      }
    )

    const data = response?.data || response || {}
    tableData.value = data.data || []
    pagination.value.total = data.recordsFiltered || data.recordsTotal || 0
    allResults.value = tableData.value
  } catch (error) {
    console.error('加载检查结果失败:', error)
    ElMessage.error('加载检查结果失败')
    tableData.value = []
  } finally {
    loading.value = false
  }
}

/**
 * 选择模板
 */
function selectTemplate(templateId) {
  selectedTemplateId.value = templateId
  pagination.value.page = 1
  loadResults()
}

/**
 * 排序变更
 */
function handleSortChange(order) {
  templateOrder.value = order
}

/**
 * 搜索
 */
function handleSearch() {
  pagination.value.page = 1
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
 * 刷新表格
 */
function refreshTable() {
  loadResults()
}

/**
 * 显示任务执行状态
 */
async function showJobLog(row) {
  // 首先获取 job 详情，获取 taskId 作为 runId
  try {
    const res = await jobApi.getJob(row.id)
    const jobData = res?.data || res
    currentRunId.value = jobData?.taskId || row.id
    currentJobTitle.value = row.templateName || ''
    executeResultVisible.value = true
  } catch (error) {
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
  router.push(`${getBasePath()}/structural-diagram/${row.id}`)
}

/**
 * 查看结果详情
 */
function viewResult(row) {
  router.push(`${getBasePath()}/results/${row.id}`)
}

onMounted(() => {
  // 检查URL参数中的模板ID
  if (route.query.templateId) {
    selectedTemplateId.value = route.query.templateId
  }

  loadParams()
  loadTemplates()
  loadResults()
})
</script>

<style scoped lang="scss">
.result-list-page {
  display: flex;
  height: 100%;
  background: #fff;
}

// 左侧边栏
.sidebar {
  width: 200px;
  min-width: 200px;
  border-right: 1px solid #dee2e6;
  background: #f8f9fa;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid #dee2e6;

  .template-filter {
    flex: 1;
  }

  .sort-btn {
    padding: 8px 10px;
  }
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
}

.template-nav {
  padding: 8px 0;
}

.template-nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  color: #495057;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #e9ecef;
    color: #0d6efd;
  }

  &.active {
    background: #0d6efd;
    color: #fff;
  }

  i {
    width: 16px;
    text-align: center;
  }
}

.loading-placeholder {
  padding: 20px;
  text-align: center;
  color: #6c757d;
}

// 右侧主内容区
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #ebeef5;
  background: #fff;

  .navbar-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }

  .navbar-actions {
    display: flex;
    gap: 8px;
  }
}

.table-wrapper {
  flex: 1;
  padding: 16px;
  overflow: auto;
}

.table-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 12px;

  .pagination-info {
    color: #6c757d;
    font-size: 13px;
  }
}

// 浮动右对齐
.float-end {
  float: right;
  margin-left: 12px;
}

// 表格样式
:deep(.el-table) {
  font-size: 13px;

  .el-table__header th {
    background-color: #f8f9fa !important;
    color: #495057;
    font-weight: 500;
  }
}

// 按钮样式
:deep(.el-button--success.is-round) {
  background-color: #28a745;
  border-color: #28a745;
}

:deep(.el-button--danger.is-round) {
  background-color: #dc3545;
  border-color: #dc3545;
}

:deep(.el-button--primary.is-round) {
  background-color: #0d6efd;
  border-color: #0d6efd;
}

:deep(.el-button--info.is-round) {
  background-color: #6c757d;
  border-color: #6c757d;
}
</style>
