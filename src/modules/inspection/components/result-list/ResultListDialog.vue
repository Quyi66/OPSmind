<template>
  <el-dialog
    :model-value="visible"
    title="检查结果列表"
    width="1200px"
    :close-on-click-modal="false"
    destroy-on-close
    @update:model-value="handleVisibleChange"
    @close="handleClose"
  >
    <div class="result-list-dialog">
      <el-table v-loading="loading" :data="tableData" style="width: 100%" height="500px">
        <el-table-column
          prop="templateName"
          label="模板名称"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column label="检查项" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="check-item-info">
              脚本: {{ countScripts(row.auditParams) }}, 主机: {{ countHosts(row.auditParams) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="开始时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="endedAt" label="结束时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.endedAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="createdBy" label="创建人" width="120" show-overflow-tooltip />
        <el-table-column prop="jobStatus" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-button
              :type="getStatusType(row.jobStatus)"
              size="small"
              round
              @click="handleShowJobStatus(row)"
            >
              {{ getStatusText(row.jobStatus) }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="132" fixed="right" align="left">
          <template #default="{ row }">
            <el-button
              v-if="structuralEnabled && row.jobStatus !== 'WAITING'"
              text
              type="primary"
              size="small"
              @click="viewStructural(row)"
            >
              架构图
            </el-button>
            <el-button
              v-if="row.jobStatus !== 'WAITING'"
              text
              type="primary"
              size="small"
              @click="viewDetail(row)"
            >
              结果
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="ops-pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handlePageSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- 执行状态弹窗 -->
    <ExecuteResultDialog
      v-model:visible="executeResultVisible"
      :run-id="currentRunId"
      :job-title="currentJobTitle"
    />

    <!-- 架构图弹窗 -->
    <el-dialog
      v-model="structuralDialogVisible"
      :title="`架构图 - ${currentStructuralJobTitle}`"
      width="90%"
      :close-on-click-modal="false"
      destroy-on-close
      class="structural-dialog"
    >
      <StructuralDiagram v-if="structuralDialogVisible" :job-id="currentStructuralJobId" />
    </el-dialog>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import axios from 'axios'
import { authService } from '@/core/auth'
import { jobApi, paramApi } from '../../api'
import { ElMessage } from 'element-plus'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import StructuralDiagram from '../../views/StructuralDiagramPage.vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  templateId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:visible', 'view-detail', 'view-structural'])

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const structuralEnabled = ref(false)

// 执行状态弹窗
const executeResultVisible = ref(false)
const currentRunId = ref('')
const currentJobTitle = ref('')

// 架构图弹窗
const structuralDialogVisible = ref(false)
const currentStructuralJobId = ref('')
const currentStructuralJobTitle = ref('')

watch(
  () => props.visible,
  val => {
    if (val) {
      currentPage.value = 1
      loadParams()
      loadData()
    }
  }
)

async function loadParams() {
  try {
    const res = await paramApi.getParamByName('cac', 'structural_switch')
    const param = res?.data || res
    structuralEnabled.value = param && param.value === 'yes'
  } catch (e) {
    console.error('Failed to load structural_switch', e)
    structuralEnabled.value = false
  }
}

async function loadData() {
  if (!props.templateId) return

  loading.value = true
  try {
    // DataTables 格式的请求参数（与源系统完全一致）
    const params = new URLSearchParams()

    // Basic pagination
    params.append('draw', Date.now())
    params.append('start', String((currentPage.value - 1) * pageSize.value))
    params.append('length', String(pageSize.value))

    // Sorting (default to createdAt desc)
    params.append('order[0][column]', '2')
    params.append('order[0][dir]', 'desc')

    // Columns definitions
    const columns = ['templateName', 'auditParams', 'createdAt', 'endedAt', 'createdBy', 'id', 'id']
    columns.forEach((col, index) => {
      params.append(`columns[${index}][data]`, col)
      params.append(`columns[${index}][name]`, '')
      params.append(`columns[${index}][searchable]`, 'true')
      params.append(`columns[${index}][orderable]`, index === 6 ? 'false' : 'true')
      params.append(`columns[${index}][search][value]`, '')
      params.append(`columns[${index}][search][regex]`, 'false')
    })

    // Global search
    params.append('search[value]', '')
    params.append('search[regex]', 'false')

    // 使用 axios 直接发送，确保作为 Form Data 发送
    const baseURL = import.meta.env.VITE_API_BASE_URL || '/oplus-portal'
    const authHeaders = authService.getAuthHeaders()
    const response = await axios.post(
      `${baseURL}/cac/api/cac/v2/jobs/page/${props.templateId}`,
      params,
      {
        params: { cacheBuster: Date.now() },
        headers: {
          ...authHeaders,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    )

    // Parse response
    const data = response?.data || response
    tableData.value = data.data || []
    total.value = data.recordsTotal || 0
  } catch (error) {
    console.error('Failed to load job history:', error)
    ElMessage.error('加载执行历史失败')
  } finally {
    loading.value = false
  }
}

function handlePageSizeChange(val) {
  currentPage.value = 1
  loadData()
}

function handlePageChange(val) {
  loadData()
}

function handleVisibleChange(val) {
  emit('update:visible', val)
}

function handleClose() {
  emit('update:visible', false)
}

function viewDetail(row) {
  emit('view-detail', row.id)
}

/**
 * 显示任务执行状态
 */
async function handleShowJobStatus(row) {
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

// Utility functions
function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

function getStatusType(status) {
  // Map job status to Element Plus tag types
  const map = {
    OK: 'success',
    FAIL: 'danger',
    ERROR: 'danger',
    RUNNING: 'primary',
    WAITING: 'warning'
  }
  return map[status] || 'info'
}

function getStatusText(status) {
  const map = {
    OK: '成功',
    FAIL: '失败',
    ERROR: '错误',
    RUNNING: '运行中',
    WAITING: '等待中'
  }
  return map[status] || status
}

function viewStructural(row) {
  currentStructuralJobId.value = row.id
  currentStructuralJobTitle.value = row.templateName || ''
  structuralDialogVisible.value = true
}

function countHosts(auditParamsStr) {
  try {
    const params = JSON.parse(auditParamsStr)
    if (params && params.length > 0 && params[0].hosts) {
      return params[0].hosts.length
    }
  } catch (e) {
    // ignore
  }
  return 0
}

function countScripts(auditParamsStr) {
  try {
    const params = JSON.parse(auditParamsStr)
    if (params && params.length > 0 && params[0].scripts) {
      return params[0].scripts.length
    }
  } catch (e) {
    // ignore
  }
  return 0
}
</script>

<style scoped>
.check-item-info {
  font-size: 12px;
  color: var(--el-text-color-regular);
}

/* 状态按钮样式 */
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

:deep(.el-button--warning.is-round) {
  background-color: #ffc107;
  border-color: #ffc107;
  color: #212529;
}

/* 架构图弹窗样式 */
:deep(.structural-dialog .el-dialog__body) {
  padding: 0;
  height: calc(90vh - 120px);
  overflow: hidden;
}

:deep(.structural-dialog .structural-diagram-page) {
  height: 100%;
}
</style>
