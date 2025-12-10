<template>
  <div class="sudo-apply-list">
    <!-- 头部工具栏 -->
    <div class="list-header">
      <h3 class="list-title">sudo权限申请</h3>
      <div class="header-actions">
        <el-input
          v-model="searchKeyword"
          size="small"
          placeholder="搜索"
          clearable
          style="width: 200px"
        >
          <template #suffix>
            <i class="fa fa-search"></i>
          </template>
        </el-input>
        <el-button size="small" @click="loadData">
          <i class="fa fa-refresh"></i>
        </el-button>
        <el-button type="primary" size="small" @click="handleAddSudo">
          <i class="fa fa-edit"></i> 添加sudo
        </el-button>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="list-table">
      <el-table
        :data="filteredData"
        v-loading="loading"
        style="width: 100%"
        border
        stripe
      >
        <el-table-column label="主机" prop="$data_owner" min-width="150">
          <template #default="{ row }">
            {{ row.$data_owner || row.host || '-----' }}
          </template>
        </el-table-column>
        <el-table-column label="用户" prop="user" min-width="120">
          <template #default="{ row }">
            {{ row.user || '-----' }}
          </template>
        </el-table-column>
        <el-table-column label="权限" prop="user_spec" min-width="200">
          <template #default="{ row }">
            <div class="cell-ellipsis" :title="row.user_spec">
              {{ row.user_spec || '-----' }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row)" size="small">
              {{ getStatusText(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="恢复时间" width="170">
          <template #default="{ row }">
            {{ getRecoveryTime(row) }}
          </template>
        </el-table-column>
        <el-table-column label="有效时长" prop="valid_period" width="100">
          <template #default="{ row }">
            {{ formatValidPeriod(row.valid_period) }}
          </template>
        </el-table-column>
        <el-table-column label="配置时间" prop="exec_time" width="170" sortable>
          <template #default="{ row }">
            {{ formatDateTime(row.exec_time) }}
          </template>
        </el-table-column>
        <el-table-column label="消息" prop="result_msg" min-width="150">
          <template #default="{ row }">
            {{ row.result_msg || '-----' }}
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="list-footer">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        small
      />
    </div>

    <!-- 添加sudo对话框 -->
    <AddSudoDialog
      v-model="showAddDialog"
      @saved="handleAddCompleted"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import * as sudoApi from '@/modules/sudo/api'
import AddSudoDialog from './AddSudoDialog.vue'

const loading = ref(false)
const tableData = ref([])
const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const showAddDialog = ref(false)

const filteredData = computed(() => {
  let data = tableData.value
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    data = data.filter(row =>
      row.$data_owner?.toLowerCase().includes(keyword) ||
      row.host?.toLowerCase().includes(keyword) ||
      row.user?.toLowerCase().includes(keyword) ||
      row.user_spec?.toLowerCase().includes(keyword)
    )
  }
  return data
})

async function loadData() {
  loading.value = true
  try {
    const response = await sudoApi.getSudoApplyList()
    const result = response?.data || response
    tableData.value = result?.records || []
    total.value = result?.total || 0
  } catch (error) {
    console.error('Failed to load sudo apply list:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

// 计算状态
function getStatusType(row) {
  if (!row.exec_time) return 'info'
  if (row.result === 'FAIL') return 'danger'

  const execTime = new Date(row.exec_time).getTime()
  const validPeriod = row.valid_period || 0
  const endTime = execTime + validPeriod * 60 * 1000

  if (validPeriod !== 0 && Date.now() >= endTime) {
    return 'warning'
  }
  return 'primary'
}

function getStatusText(row) {
  if (!row.exec_time) return '待执行'
  if (row.result === 'FAIL') return '失败'

  const execTime = new Date(row.exec_time).getTime()
  const validPeriod = row.valid_period || 0
  const endTime = execTime + validPeriod * 60 * 1000

  if (validPeriod !== 0 && Date.now() >= endTime) {
    return '已失效'
  }
  return '生效中'
}

// 计算恢复时间
function getRecoveryTime(row) {
  if (!row.exec_time) return '-----'
  const validPeriod = row.valid_period || 0
  if (validPeriod === 0) return '永久'

  const execTime = new Date(row.exec_time).getTime()
  const endDate = new Date(execTime + validPeriod * 60 * 1000)
  return formatDateTime(endDate)
}

function formatValidPeriod(minutes) {
  if (!minutes || minutes === 0) return '永久'
  if (minutes < 60) return `${minutes}分钟`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}小时`
  return `${Math.floor(minutes / 1440)}天`
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-----'
  const date = dateStr instanceof Date ? dateStr : new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function handleAddSudo() {
  showAddDialog.value = true
}

function handleAddCompleted() {
  loadData()
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.sudo-apply-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 6px;
  overflow: hidden;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;

  .list-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
  }

  .header-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }
}

.list-table {
  flex: 1;
  min-height: 0;
  padding: 0 16px;
  overflow: auto;

  .cell-ellipsis {
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
}

.list-footer {
  padding: 12px 16px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-start;
}
</style>
