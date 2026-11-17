<template>
  <div class="ops-page-layout">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small" @submit.prevent>
        <el-form-item :label="t('automation.workbench.keyword')">
          <el-input
            v-model="filters.keyword"
            :placeholder="t('automation.approval.searchToolName')"
            clearable
            style="width: 240px"
            @input="handleSearch"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix>
              <el-icon>
                <Search />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item :label="t('automation.workbench.status')">
          <el-select
            v-model="filters.status"
            :placeholder="t('automation.approval.statusFilter')"
            clearable
            value-on-clear=""
            style="width: 140px"
            @change="handleSearch"
          >
            <el-option :label="t('automation.workbench.allStatuses')" value="" />
            <el-option :label="t('automation.approval.pending')" :value="0" />
            <el-option :label="t('automation.approval.approved')" :value="1" />
            <el-option :label="t('automation.approval.rejected')" :value="2" />
            <el-option :label="t('automation.approval.discarded')" :value="3" />
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
            {{ t('common.reset') }}
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 功能按钮区 -->
    <div class="ops-action-bar">
      <span style="flex: 1"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="loading"
        @click="fetchData"
        :title="t('common.refresh')"
      >
        <el-icon v-show="!loading">
          <Refresh />
        </el-icon>
      </el-button>
    </div>

    <!-- 表格区域 -->
    <div class="ops-table-wrapper">
      <el-table v-loading="loading" :data="paginatedData" max-height="calc(100vh - 264px)">
        <el-table-column :label="t('automation.workbench.tool')" min-width="150">
          <template #default="{ row }">
            <el-button text type="primary" @click="handleViewDetail(row)">
              {{ getAutomationToolTitle({ ...row, id: undefined }) }}
            </el-button>
          </template>
        </el-table-column>

        <el-table-column :label="t('automation.job.toolType')" width="150">
          <template #default="{ row }">
            {{ getJobTypeLabel(row.jobType) }}
          </template>
        </el-table-column>

        <el-table-column :label="t('automation.approval.toolId')" width="150">
          <template #default="{ row }">
            {{ row.jobId }}
          </template>
        </el-table-column>

        <el-table-column :label="t('automation.approval.executionPolicy')" width="130">
          <template #default="{ row }">
            {{ getApproveModeLabel(row.approveMode) }}
          </template>
        </el-table-column>

        <el-table-column :label="t('automation.list.validDuration')" width="110">
          <template #default="{ row }">
            {{ row.approveMode !== 'limitParams' && row.validHour ? formatApprovalDuration(row.validHour) : '-' }}
          </template>
        </el-table-column>

        <el-table-column :label="t('automation.approval.approver')" width="120">
          <template #default="{ row }">
            {{ row.approver || '-' }}
          </template>
        </el-table-column>

        <el-table-column :label="t('automation.approval.approvedAt')" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.approveTime) }}
          </template>
        </el-table-column>

        <el-table-column :label="t('automation.workbench.status')" :width="currentLocale === 'en-US' ? 180 : 100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column :label="t('automation.approval.expiresAt')" width="170">
          <template #default="{ row }">
            {{ formatExpirationTime(row.expirationTime) }}
          </template>
        </el-table-column>

        <el-table-column :label="t('common.actions')" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 0"
              type="danger"
              text
              size="small"
              @click="handleCancel(row)"
            >
              {{ t('common.cancel') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页区域 -->
    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="filteredData.length"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handlePageSizeChange"
        @current-change="handlePageChange"
      />
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
import { t, currentLocale } from '@/core/i18n'

import { getAutomationToolTitle } from '../../utils/resourcePresentation'
import { formatApprovalDuration } from '../../utils/approvalPresentation'
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search, RefreshRight } from '@element-plus/icons-vue'
import { formatDateTime } from '../../utils/helpers'
import * as jaoApi from '@/modules/automation/api/jao'
import JobApproveDetailDialog from '../../components/job/JobApproveDetailDialog.vue'

const loading = ref(false)
const tableData = ref([])
const filters = reactive({
  keyword: '',
  status: '' // 空字符串表示"全部状态"
})
const currentPage = ref(1)
const pageSize = ref(10)

// 详情弹窗相关
const detailDialogVisible = ref(false)
const currentApprove = ref({})

// Keep an applied title search stable while presentation language changes.
const searchTitles = ref(new Map())
watch([tableData, () => filters.keyword], () => {
  searchTitles.value = new Map(tableData.value.map(item => [item, getAutomationToolTitle({ ...item, id: undefined })]))
}, { flush: 'sync' })

const filteredData = computed(() => {
  let data = tableData.value

  // 文本筛选
  const keyword = filters.keyword.trim().toLowerCase()
  if (keyword) {
    data = data.filter(
      item =>
        item.jobName?.toLowerCase().includes(keyword) ||
        (searchTitles.value.get(item) || '')
          .toLowerCase()
          .includes(keyword) ||
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

const jobTypeMap = computed(() => ({
  standalone: { icon: 'fa fa-terminal', label: t('automation.approval.standalone') },
  flow: { icon: 'fa fa-stream', label: t('automation.approval.flow') },
  schedule: { icon: 'fa fa-clock', label: t('automation.approval.schedule') }
}))

const approveModeMap = computed(() => ({
  limitParams: t('automation.list.restrictedParams'),
  noLimitParams: t('automation.list.unrestrictedParams')
}))

const statusMap = computed(() => ({
  0: { label: t('automation.approval.pending'), type: 'primary' },
  1: { label: t('automation.approval.approved'), type: 'success' },
  2: { label: t('automation.approval.rejected'), type: 'danger' },
  3: { label: t('automation.approval.discarded'), type: 'info' }
}))

onMounted(() => {
  fetchData()
})

async function fetchData() {
  loading.value = true
  try {
    const response = await jaoApi.fetchMyApproveList()
    tableData.value = response?.data || response || []
  } catch (error) {
    ElMessage.error(error?.message || t('automation.approval.requestsFailed'))
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  currentPage.value = 1
}

function handleReset() {
  filters.keyword = ''
  filters.status = '' // 重置为空字符串
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
  return jobTypeMap.value[type]?.icon || 'fa fa-file'
}

function getJobTypeLabel(type) {
  return jobTypeMap.value[type]?.label || type
}

function getApproveModeLabel(mode) {
  return approveModeMap.value[mode] || '-'
}

function getStatusLabel(status) {
  return statusMap.value[status]?.label || '-'
}

function getStatusType(status) {
  return statusMap.value[status]?.type || 'info'
}



function formatExpirationTime(value) {
  if (!value) return '-'
  if (value === 'expired') return t('automation.approval.expired')
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const pad = n => (n < 10 ? `0${n}` : String(n))
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
    await ElMessageBox.confirm(t('automation.approval.cancelConfirm'), t('automation.approval.cancelTitle'), {
      closeOnClickModal: false,
      closeOnPressEscape: false,
      type: 'warning'
    })

    loading.value = true
    await jaoApi.cancelApprove(row.id, null)
    ElMessage.success(t('automation.approval.operationSucceeded'))
    await fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || t('automation.schedule.operationFailed'))
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
@use '@/styles/common.scss' as *;
</style>
