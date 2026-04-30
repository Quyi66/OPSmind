<template>
  <div class="ops-page-layout">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small">
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" placeholder="搜索作业名称" clearable style="width: 240px">
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

    <!-- 功能按钮区 -->
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
        <el-table-column label="作业" min-width="150">
          <template #default="{ row }">
            <el-button text type="primary" @click="handleViewDetail(row)">
              {{ row.jobName }}
            </el-button>
          </template>
        </el-table-column>

        <el-table-column label="作业类型" width="150">
          <template #default="{ row }">
            {{ getJobTypeLabel(row.jobType) }}
          </template>
        </el-table-column>

        <el-table-column label="作业ID" width="150">
          <template #default="{ row }">
            {{ row.jobId }}
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

        <el-table-column label="审批人" width="120">
          <template #default="{ row }">
            {{ row.approver || '-' }}
          </template>
        </el-table-column>

        <el-table-column label="审批时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.approveTime) }}
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="过期时间" width="170">
          <template #default="{ row }">
            {{ formatExpirationTime(row.expirationTime) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 0" type="danger" text size="small" @click="handleCancel(row)">
              取消
            </el-button>
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

    <!-- 申请详情弹窗 -->
    <JobApproveDetailDialog
      v-if="detailDialogVisible"
      v-model:visible="detailDialogVisible"
      :approve-data="currentApprove"
      @success="handleDetailSuccess"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search, RefreshRight } from '@element-plus/icons-vue'
import * as jaoApi from '@/modules/automation/api/jao'
import JobApproveDetailDialog from '../../components/job/JobApproveDetailDialog.vue'

const loading = ref(false)
const tableData = ref([])
const filters = reactive({
  keyword: '',
  status: ''  // 空字符串表示"全部状态"
})
const currentPage = ref(1)
const pageSize = ref(10)

// 详情弹窗相关
const detailDialogVisible = ref(false)
const currentApprove = ref({})

const filteredData = computed(() => {
  let data = tableData.value

  // 文本筛选
  if (filters.keyword) {
    const keyword = filters.keyword.toLowerCase()
    data = data.filter(item =>
      item.jobName?.toLowerCase().includes(keyword) ||
      item.jobId?.toLowerCase().includes(keyword) ||
      item.approver?.toLowerCase().includes(keyword)
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

const jobTypeMap = {
  standalone: { icon: 'fa fa-terminal', label: '独立作业' },
  flow: { icon: 'fa fa-stream', label: '流程作业' },
  schedule: { icon: 'fa fa-clock', label: '定时作业' }
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
    const response = await jaoApi.fetchMyApproveList()
    tableData.value = response?.data || response || []
  } catch (error) {
    ElMessage.error(error?.message || '获取申请列表失败')
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
  currentApprove.value = { ...row }
  detailDialogVisible.value = true
}

function handleDetailSuccess() {
  detailDialogVisible.value = false
  fetchData()
}

async function handleCancel(row) {
  try {
    await ElMessageBox.confirm('确定要取消此审批吗？', '取消审批', {
      type: 'warning'
    })

    loading.value = true
    await jaoApi.cancelApprove(row.id, null)
    ElMessage.success('操作成功')
    await fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '操作失败')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
@use '@/styles/common.scss' as *;
</style>
