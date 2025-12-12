<template>
  <div class="ops-page-layout">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-select v-model="filters.status" placeholder="状态" style="width: 120px" @change="loadData">
        <el-option label="全部状态" value="all" />
        <el-option label="成功" value="SUCCESS" />
        <el-option label="失败" value="FAILED" />
      </el-select>
      <el-input
        v-model="filters.keyword"
        placeholder="搜索"
        clearable
        style="width: 180px"
        @keyup.enter="loadData"
        @clear="loadData"
      >
        <template #prefix>
          <i class="fa fa-search"></i>
        </template>
      </el-input>
      <el-button type="primary" @click="loadData">
        <i class="fa fa-search"></i> 搜索
      </el-button>
      <el-button @click="loadData" :loading="loading" title="刷新">
        <i class="fa fa-refresh"></i>
      </el-button>
    </div>

    <!-- 数据表格 -->
    <div class="ops-table-wrapper">
      <el-table
        :data="tableData"
        v-loading="loading"
        border
        style="width: 100%"
      >
        <el-table-column prop="start_time" label="开始时间" width="180" sortable>
          <template #default="{ row }">
            {{ formatTime(row.start_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作" width="150" />
        <el-table-column prop="username" label="操作人" width="120" />
        <el-table-column prop="end_time" label="结束时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.end_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="detail" label="操作详情" width="100">
          <template #default="{ row }">
            <el-button
              v-if="row.status !== 'SUCCESS'"
              size="small"
              link
              type="primary"
              @click="handleViewDetail(row)"
            >
              <i class="fa fa-tasks"></i>
              详情
            </el-button>
          </template>
        </el-table-column>
        <el-table-column prop="message" label="操作信息" min-width="250">
          <template #default="{ row }">
            <div class="message-cell">{{ row.message || '' }}</div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        background
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import * as pmsApi from '@/modules/password/api'

const loading = ref(false)
const tableData = ref([])

const filters = ref({
  status: 'all',
  keyword: ''
})

const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0
})

onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  try {
    const response = await pmsApi.getOperationLog()
    const result = response?.data || response
    tableData.value = result?.records || []
    pagination.value.total = result?.total || tableData.value.length
  } catch (error) {
    console.error('Failed to load operation log:', error)
    ElMessage.error('加载操作记录失败')
  } finally {
    loading.value = false
  }
}

function getStatusType(status) {
  switch (status) {
    case 'SUCCESS':
      return 'success'
    case 'COMPLETED':
      return 'info'
    case 'RUNNING':
      return 'primary'
    case 'FAILED':
      return 'danger'
    default:
      return 'info'
  }
}

function formatTime(time) {
  if (!time) return ''
  try {
    const date = new Date(time)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return time
  }
}

function handleViewDetail(row) {
  ElMessage.info('详情弹窗待实现')
}
</script>

<style scoped lang="scss">
.operation-log-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;

  .page-title {
    font-size: 16px;
    font-weight: 500;
    color: #1e293b;
    margin: 0;
  }
}

.table-container {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.pagination-container {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 12px 20px;
  border-top: 1px solid #e2e8f0;
}

.message-cell {
  line-height: 1.5;
  color: #64748b;
}
</style>
