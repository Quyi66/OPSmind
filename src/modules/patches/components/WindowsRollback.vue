<template>
  <div class="windows-rollback">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="page-header__actions">
        <el-button plain @click="handleRefresh">
          <i class="fa fa-sync" />
          刷新
        </el-button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="page-content">
      <!-- 筛选区域 -->
      <div class="filter-section">
        <el-input
          v-model="filterText"
          placeholder="搜索更新编号或主机..."
          prefix-icon="Search"
          style="width: 300px"
          clearable
          @input="handleFilter"
        />
        <el-select v-model="statusFilter" placeholder="状态" clearable style="width: 120px" @change="handleFilter">
          <el-option label="可回滚" value="rollbackable" />
          <el-option label="已回滚" value="rolledback" />
          <el-option label="回滚中" value="rolling" />
          <el-option label="回滚失败" value="failed" />
        </el-select>
      </div>

      <!-- 回滚记录表格 -->
      <div class="table-section">
        <div class="table-header">
          <h3>Windows更新回滚</h3>
        </div>

        <el-table
          v-loading="loading"
          :data="tableData"
          stripe
          style="width: 100%"
          size="small"
        >
          <el-table-column type="selection" width="50" />
          <el-table-column prop="kb_number" label="更新编号" min-width="120">
            <template #default="{ row }">
              <el-button type="primary" link size="small">
                {{ row.kb_number }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column prop="hostname" label="主机名" min-width="150" show-overflow-tooltip />
          <el-table-column prop="title" label="更新标题" min-width="250" show-overflow-tooltip />
          <el-table-column prop="install_date" label="安装日期" width="160" />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">
                {{ getStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button
                v-if="row.status === 'rollbackable'"
                type="warning"
                size="small"
                link
                @click="handleRollback(row)"
              >
                回滚
              </el-button>
              <el-button type="info" size="small" link @click="handleViewDetail(row)">
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="table-footer">
          <div class="batch-actions" v-if="selectedRows.length > 0">
            <span class="selected-count">已选择 {{ selectedRows.length }} 项</span>
            <el-button type="warning" size="small" @click="handleBatchRollback">
              批量回滚
            </el-button>
          </div>
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            size="small"
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </div>

    <!-- 回滚确认对话框 -->
    <el-dialog
      v-model="rollbackDialogVisible"
      title="确认回滚"
      width="500px"
    >
      <div class="rollback-confirm">
        <el-alert
          type="warning"
          :closable="false"
          show-icon
        >
          <template #title>
            回滚操作将卸载选中的Windows更新，可能需要重启系统。
          </template>
        </el-alert>
        <div class="rollback-list" v-if="rollbackItems.length > 0">
          <p>即将回滚以下更新：</p>
          <ul>
            <li v-for="item in rollbackItems" :key="item.kb_number">
              {{ item.kb_number }} - {{ item.title }}
            </li>
          </ul>
        </div>
      </div>
      <template #footer>
        <el-button @click="rollbackDialogVisible = false">取消</el-button>
        <el-button type="warning" :loading="rollbackLoading" @click="executeRollback">
          确认回滚
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

// 加载状态
const loading = ref(false)
const rollbackLoading = ref(false)

// 筛选
const filterText = ref('')
const statusFilter = ref('')

// 表格数据
const tableData = ref([])
const selectedRows = ref([])
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 回滚对话框
const rollbackDialogVisible = ref(false)
const rollbackItems = ref([])

// 状态相关
function getStatusType(status) {
  const map = {
    rollbackable: 'warning',
    rolledback: 'success',
    rolling: 'primary',
    failed: 'danger'
  }
  return map[status] || 'info'
}

function getStatusLabel(status) {
  const map = {
    rollbackable: '可回滚',
    rolledback: '已回滚',
    rolling: '回滚中',
    failed: '回滚失败'
  }
  return map[status] || status
}

// 加载数据
async function loadData() {
  loading.value = true
  try {
    // TODO: 调用实际 API
    // 模拟数据
    tableData.value = [
      { kb_number: 'KB5034441', hostname: 'WIN-SERVER01', title: '2024-01 Cumulative Update for Windows Server 2019', install_date: '2024-01-15 10:30:00', status: 'rollbackable' },
      { kb_number: 'KB5034439', hostname: 'WIN-SERVER01', title: '2024-01 Security Update for Windows Server 2019', install_date: '2024-01-14 09:20:00', status: 'rollbackable' },
      { kb_number: 'KB5034123', hostname: 'WIN-SERVER02', title: '2024-01 .NET Framework Update', install_date: '2024-01-13 14:15:00', status: 'rolledback' },
      { kb_number: 'KB5033909', hostname: 'WIN-SERVER03', title: '2023-12 Security Update', install_date: '2024-01-10 11:00:00', status: 'rollbackable' }
    ]
    pagination.total = tableData.value.length
  } catch (error) {
    console.error('Failed to load data:', error)
  } finally {
    loading.value = false
  }
}

function handleFilter() {
  pagination.page = 1
  loadData()
}

function handleRefresh() {
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

function handleSelectionChange(selection) {
  selectedRows.value = selection
}

function handleRollback(row) {
  rollbackItems.value = [row]
  rollbackDialogVisible.value = true
}

function handleBatchRollback() {
  const rollbackable = selectedRows.value.filter(r => r.status === 'rollbackable')
  if (rollbackable.length === 0) {
    ElMessage.warning('请选择可回滚的更新')
    return
  }
  rollbackItems.value = rollbackable
  rollbackDialogVisible.value = true
}

async function executeRollback() {
  rollbackLoading.value = true
  try {
    // TODO: 调用实际 API
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('回滚任务已提交')
    rollbackDialogVisible.value = false
    loadData()
  } catch (error) {
    console.error('Rollback failed:', error)
    ElMessage.error('回滚失败')
  } finally {
    rollbackLoading.value = false
  }
}

function handleViewDetail(row) {
  ElMessage.info(`查看详情: ${row.kb_number}`)
}

function refresh() {
  loadData()
}

onMounted(() => {
  loadData()
})

defineExpose({ refresh })
</script>

<style scoped lang="scss">
.windows-rollback {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f8f9fa;
}

.page-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #e9ecef;

  &__actions {
    display: flex;
    gap: 8px;
  }
}

.page-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.filter-section {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.table-section {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e9ecef;

  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #212529;
  }
}

.table-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid #e9ecef;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 12px;

  .selected-count {
    font-size: 13px;
    color: #64748b;
  }
}

.rollback-confirm {
  .rollback-list {
    margin-top: 16px;

    p {
      margin: 0 0 8px;
      font-weight: 500;
    }

    ul {
      margin: 0;
      padding-left: 20px;

      li {
        margin-bottom: 4px;
        font-size: 13px;
        color: #64748b;
      }
    }
  }
}
</style>
