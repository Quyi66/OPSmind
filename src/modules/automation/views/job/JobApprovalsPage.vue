<template>
  <div class="ops-page-layout">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small">
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" placeholder="搜索运维工具名称" clearable style="width: 240px">
            <template #prefix>
              <el-icon>
                <Search />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="状态筛选" clearable style="width: 140px">
            <el-option label="全部状态" value="" />
            <el-option label="审批中" :value="0" />
            <el-option label="审批通过" :value="1" />
            <el-option label="审批未通过" :value="2" />
            <el-option label="审批作废" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <!-- <el-button type="primary" :loading="loading" @click="handleSearch">
            <el-icon>
              <Search />
            </el-icon>
            搜索
          </el-button> -->
          <el-button @click="handleReset">
            <el-icon>
              <RefreshRight />
            </el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 操作栏 -->
    <div class="ops-action-bar">
      <span style="flex: 1;"></span>
      <el-button class="toolbar-icon-btn" circle size="small" :loading="loading" @click="fetchData" title="刷新">
        <el-icon v-show="!loading">
          <Refresh />
        </el-icon>
      </el-button>
    </div>

    <!-- 表格区域 -->
    <div class="ops-table-wrapper">
      <el-table v-loading="loading" :data="paginatedData" max-height="calc(100vh - 230px)">
        <el-table-column label="运维工具" min-width="150">
          <template #default="{ row }">
            <el-button type="primary" text @click="handleViewDetail(row)">{{ row.jobName }}</el-button>
          </template>
        </el-table-column>

        <el-table-column label="运维工具类型" width="100">
          <template #default="{ row }">
            {{ getJobTypeLabel(row.jobType) }}
          </template>
        </el-table-column>

        <el-table-column label="申请说明" min-width="200">
          <template #default="{ row }">
            <span>{{ row.description || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="执行策略" width="130">
          <template #default="{ row }">
            {{ getApproveModeLabel(row.approveMode) }}
          </template>
        </el-table-column>

        <el-table-column label="有效时长" width="110">
          <template #default="{ row }">
            {{ row.approveMode !== 'limitParams' && row.validHour ? `${row.validHour} 小时` : '-' }}
          </template>
        </el-table-column>

        <el-table-column label="申请人" width="120">
          <template #default="{ row }">
            {{ row.applicant || '-' }}
          </template>
        </el-table-column>

        <el-table-column label="申请时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.applyTime) }}
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="过期时间" width="180">
          <template #default="{ row }">
            {{ formatExpirationTime(row.expirationTime) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button v-if="row.status === 0" type="success" text size="small" @click="handlePass(row)">
                通过
              </el-button>
              <el-button v-if="row.status === 0" type="danger" text size="small" @click="handleRefuse(row)">
                拒绝
              </el-button>
              <el-button v-if="row.status === 1 && row.canCanceled" type="warning" text size="small"
                @click="handleDiscard(row)">
                作废
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页区域 -->
    <div class="ops-pagination-wrapper">
      <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :page-sizes="[10, 20, 50, 100]"
        :total="filteredData.length" layout="total, sizes, prev, pager, next, jumper" background
        @size-change="handlePageSizeChange" @current-change="handlePageChange" />
    </div>

    <!-- 审批详情弹窗 -->
    <JobApprovalDetailDialog
      v-if="detailDialogVisible"
      v-model:visible="detailDialogVisible"
      :approve-data="currentApprovalData"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search, RefreshRight } from '@element-plus/icons-vue'
import * as jaoApi from '@/modules/automation/api/jao'
import { useReviewCountStore } from '@/stores/useReviewCountStore.js'
import JobApprovalDetailDialog from '../../components/job/JobApprovalDetailDialog.vue'

const loading = ref(false)
const tableData = ref([])
const filters = reactive({
  keyword: '',
  status: ''  // 空字符串表示"全部状态"
})
const currentPage = ref(1)
const pageSize = ref(10)
const detailDialogVisible = ref(false)
const currentApprovalData = ref(null)
const reviewStore = useReviewCountStore()

const filteredData = computed(() => {
  let data = tableData.value

  // 文本筛选
  if (filters.keyword) {
    const keyword = filters.keyword.toLowerCase()
    data = data.filter(item =>
      item.jobName?.toLowerCase().includes(keyword) ||
      item.jobId?.toLowerCase().includes(keyword) ||
      item.applicant?.toLowerCase().includes(keyword)
    )
  }

  // 状态筛选 (空字符串表示全部)
  if (filters.status !== '') {
    data = data.filter(item => item.status === filters.status)
  }

  return data
})

// 分页后的数据
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredData.value.slice(start, end)
})

watch(
  () => filteredData.value.length,
  total => {
    const maxPage = Math.max(1, Math.ceil(total / pageSize.value))
    if (currentPage.value > maxPage) {
      currentPage.value = maxPage
    }
  }
)

const jobTypeMap = {
  standalone: { icon: 'fa fa-terminal', label: '独立运维工具' },
  flow: { icon: 'fa fa-stream', label: '流程运维工具' },
  schedule: { icon: 'fa fa-clock', label: '定时运维工具' }
}

const approveModeMap = {
  limitParams: '限定参数执行',
  noLimitParams: '不限定参数执行'
}

const statusMap = {
  0: { label: '审批中', type: 'primary' },
  1: { label: '审批通过', type: 'success' },
  2: { label: '审批未通过', type: 'danger' },
  3: { label: '审批作废', type: 'info' }
}

onMounted(() => {
  fetchData()
})

async function fetchData() {
  loading.value = true
  try {
    const response = await jaoApi.fetchApproveList()
    const approvals = Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response)
        ? response
        : []

    tableData.value = approvals
    reviewStore.approvalCount = approvals.filter(item => item.status === 0).length
  } catch (error) {
    ElMessage.error(error?.message || '获取审批列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  currentPage.value = 1
}

function handleReset() {
  filters.keyword = ''
  filters.status = ''  // 重置为空字符串
  currentPage.value = 1
  pageSize.value = 10
}

function handlePageChange(page) {
  currentPage.value = page
}

function handlePageSizeChange() {
  currentPage.value = 1
}

function getJobTypeIcon(type) {
  return jobTypeMap[type]?.icon || 'fa fa-file'
}

function getJobTypeLabel(type) {
  return jobTypeMap[type]?.label || type
}

function getApproveModeLabel(mode) {
  return approveModeMap[mode] || '-'
}

function getStatusLabel(status) {
  return statusMap[status]?.label || '-'
}

function getStatusType(status) {
  return statusMap[status]?.type || 'info'
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const pad = (n) => (n < 10 ? `0${n}` : String(n))
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function formatExpirationTime(value) {
  if (!value) return '-'
  if (value === 'expired') return '已过期'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const pad = (n) => (n < 10 ? `0${n}` : String(n))
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function handleViewDetail(row) {
  currentApprovalData.value = { ...row }
  detailDialogVisible.value = true
}

async function handlePass(row) {
  try {
    await ElMessageBox.confirm(
      `确定要通过运维工具 "${row.jobName}" 的审批申请吗？`,
      '通过审批',
      { type: 'success' }
    )

    loading.value = true
    await jaoApi.passApprove(row.id, null)
    ElMessage.success('审批已通过')
    await fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '审批通过失败')
    }
  } finally {
    loading.value = false
  }
}

async function handleRefuse(row) {
  try {
    const { value: reason } = await ElMessageBox.prompt(
      '请输入拒绝理由',
      '拒绝审批',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputType: 'textarea',
        inputPlaceholder: '请输入拒绝理由'
      }
    )

    loading.value = true
    await jaoApi.refuseApprove(row.id, reason)
    ElMessage.success('审批已拒绝')
    await fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '拒绝审批失败')
    }
  } finally {
    loading.value = false
  }
}

async function handleDiscard(row) {
  try {
    const { value: reason } = await ElMessageBox.prompt(
      '确定要作废该审批吗？可选填写作废原因',
      '作废审批',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputType: 'textarea',
        inputPlaceholder: '请输入作废原因（可选）'
      }
    )

    loading.value = true
    await jaoApi.discardApprove(row.id, reason || null)
    ElMessage.success('审批已作废')
    await fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '作废审批失败')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
@use '@/styles/common.scss' as *;

.job-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;

  .job-name {
    font-weight: 500;
    color: #3b82f6;
    cursor: pointer;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  .job-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;

    .job-type {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #64748b;

      i {
        font-size: 13px;
      }
    }
  }

  .job-description {
    color: #64748b;
    font-size: 12px;
    line-height: 1.5;
  }
}

.action-buttons {
  display: flex;
  gap: 4px;
}
</style>
