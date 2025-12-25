<template>
  <div class="ops-page-layout" style="flex-direction: row; padding: 0; gap: 0;">
    <!-- 左侧模板列表 -->
    <aside class="ops-sidebar-nav">
      <div class="ops-sidebar-header">
        <el-input
          v-model="templateSearchText"
          placeholder="搜索模板"
          clearable
          style="width: 100%"
        >
          <template #prefix>
            <i class="fa fa-search"></i>
          </template>
        </el-input>
      </div>
      <el-scrollbar class="ops-sidebar-content">
        <button
          class="ops-sidebar-item"
          :class="{ 'is-active': selectedTemplateId === '' }"
          @click="selectTemplate('')"
        >
          <i class="fa fa-list-alt"></i>
          <span>全部</span>
        </button>
        <button
          v-for="item in filteredTemplates"
          :key="item.id"
          class="ops-sidebar-item"
          :class="{ 'is-active': selectedTemplateId === item.id }"
          @click="selectTemplate(item.id)"
        >
          <span>{{ item.templateName }}</span>
        </button>
        <div v-if="templateLoading" class="loading-placeholder">
          <i class="fa fa-cog fa-spin"></i> 正在加载...
        </div>
      </el-scrollbar>
    </aside>

    <!-- 右侧检查结果列表 -->
    <section class="result-list-content ops-page-layout">
      <!-- 筛选区 -->
      <div class="ops-filter-bar">
        <el-form :model="filters" inline size="small">
          <el-form-item label="关键词">
            <el-input
              v-model="filters.keyword"
              placeholder="搜索"
              clearable
              style="width: 200px;"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="loading" @click="handleSearch">
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

      <!-- 操作栏 -->
      <div class="ops-action-bar">
        <span style="flex: 1;"></span>
        <el-button class="toolbar-icon-btn" circle size="small" :loading="loading" @click="loadResults" title="刷新">
          <el-icon v-show="!loading"><Refresh /></el-icon>
        </el-button>
      </div>

      <!-- 表格区域 -->
      <div class="ops-table-wrapper">
        <div class="table-toolbar-icons">
          <el-button class="toolbar-icon-btn" circle :loading="loading" @click="refreshTable" title="刷新">
            <el-icon v-show="!loading"><Refresh /></el-icon>
          </el-button>
        </div>
        <el-table
          v-loading="loading"
          :data="tableData"
          stripe
          max-height="calc(100vh - 360px)"
          row-key="id"
        >
          <el-table-column prop="templateName" label="模板" show-overflow-tooltip sortable />
          <el-table-column label="检查项">
            <template #default="{ row }">
              <div v-html="formatAuditParams(row.auditParams)"></div>
            </template>
          </el-table-column>
          <el-table-column label="开始时间" width="200" sortable>
            <template #default="{ row }">
              {{ formatDateTime(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="结束时间" width="200" sortable>
            <template #default="{ row }">
              {{ formatDateTime(row.endedAt) }}
            </template>
          </el-table-column>
          <el-table-column prop="createdBy" label="执行人" width="100" />
          <el-table-column label="执行状态" width="100" align="left">
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
          <el-table-column label="操作" width="90" align="left" fixed="right">
            <template #default="{ row }">
              <el-button
                text
                type="primary"
                size="small"
                :disabled="row.jobStatus === 'WAITING'"
                @click="viewStructuralDiagram(row)"
              >
                架构
              </el-button>
              <el-button
                text
                type="primary"
                size="small"
                :disabled="row.jobStatus === 'WAITING'"
                @click="viewResult(row)"
              >
                结果
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页 -->
      <div class="ops-pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handlePageSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </section>

    <!-- 执行状态弹窗 -->
    <ExecuteResultDialog
      v-model:visible="executeResultVisible"
      :run-id="currentRunId"
      :job-title="currentJobTitle"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Refresh, Search, RefreshRight } from '@element-plus/icons-vue'
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
const filters = reactive({
  keyword: ''
})
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

// 过滤后的模板列表（按名称排序）
const filteredTemplates = computed(() => {
  let list = [...templateList.value]

  // 搜索过滤
  if (templateSearchText.value) {
    const keyword = templateSearchText.value.toLowerCase()
    list = list.filter(t => t.templateName?.toLowerCase().includes(keyword))
  }

  // 按名称升序排序
  list.sort((a, b) => {
    const nameA = (a.templateName || '').toLowerCase()
    const nameB = (b.templateName || '').toLowerCase()
    return nameA.localeCompare(nameB)
  })

  return list
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
    params.append('search[value]', filters.keyword)
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
 * 重置
 */
function handleReset() {
  filters.keyword = ''
  pagination.value.page = 1
  pagination.value.size = 10
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
 * 页码变更
 */
function handlePageChange(page) {
  pagination.value.page = page
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

// 监听路由 query 参数变化（从模板列表跳转时）
watch(
  () => route.query.templateId,
  (newTemplateId) => {
    if (newTemplateId) {
      selectedTemplateId.value = newTemplateId
      pagination.value.page = 1
      loadResults()
    }
  }
)
</script>

<style scoped lang="scss">
.result-list-page {
  display: flex;
  height: 100%;
  background: #fff;
}

// 右侧主内容区
.result-list-content {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

// 加载占位
.loading-placeholder {
  padding: 20px;
  text-align: center;
  color: #6c757d;
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
