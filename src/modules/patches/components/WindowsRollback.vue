<template>
  <div class="windows-rollback">
    <!-- 内容区域 -->
    <div class="page-content">
      <!-- 筛选区域 -->
      <div class="filter-section">
        <el-input
          v-model="filterText"
          placeholder="搜索..."
          style="width: 200px"
          clearable
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #suffix>
            <i class="fa fa-search" style="cursor: pointer" @click="handleSearch" />
          </template>
        </el-input>
        <div class="filter-right">
          <el-button type="warning" :disabled="selectedRows.length === 0" @click="handleBatchRollback">
            批量回滚
          </el-button>
        </div>
      </div>

      <!-- 回滚记录表格 -->
      <div class="table-section">
        <el-table
          ref="tableRef"
          v-loading="loading"
          :data="tableData"
          stripe
          style="width: 100%"
          size="small"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="50" />
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="hosts" label="主机" min-width="150" show-overflow-tooltip />
          <el-table-column prop="update_kb_numbers" label="KB编号" min-width="120" show-overflow-tooltip />
          <el-table-column prop="update_time" label="更新时间" width="180" />
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button type="warning" size="small" link @click="handleRollback(row)">
                回滚
              </el-button>
              <el-button type="danger" size="small" link @click="handleDelete(row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="table-footer">
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
            <li v-for="item in rollbackItems" :key="item.id">
              {{ item.update_kb_numbers }} - {{ item.hosts }}
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

    <!-- 删除确认对话框 -->
    <el-dialog
      v-model="deleteDialogVisible"
      title="确认删除"
      width="400px"
    >
      <div class="delete-confirm">
        <p>确定要删除此记录吗？</p>
        <p v-if="deleteItem" style="color: #64748b; font-size: 13px;">
          KB编号: {{ deleteItem.update_kb_numbers }}<br />
          主机: {{ deleteItem.hosts }}
        </p>
      </div>
      <template #footer>
        <el-button @click="deleteDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="deleteLoading" @click="executeDelete">
          确认删除
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { windowsRollbackApi } from '../api'

// 加载状态
const loading = ref(false)
const rollbackLoading = ref(false)
const deleteLoading = ref(false)

// 筛选
const filterText = ref('')

// 表格数据
const tableRef = ref(null)
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
const isBatchRollback = ref(false)

// 删除对话框
const deleteDialogVisible = ref(false)
const deleteItem = ref(null)

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const response = await windowsRollbackApi.getHistUpdateKbsWin({
      page: pagination.page,
      size: pagination.pageSize
    })
    tableData.value = response.records || []
    pagination.total = response.total || 0
  } catch (error) {
    console.error('Failed to load data:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
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
  isBatchRollback.value = false
  rollbackDialogVisible.value = true
}

function handleBatchRollback() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择要回滚的记录')
    return
  }
  rollbackItems.value = [...selectedRows.value]
  isBatchRollback.value = true
  rollbackDialogVisible.value = true
}

async function executeRollback() {
  rollbackLoading.value = true
  try {
    if (isBatchRollback.value) {
      // 批量回滚 - 任务代码 HiuT3F
      const ids = rollbackItems.value.map(item => item.id)
      await windowsRollbackApi.batchRollback({
        histUpdatePkgsWinIds: ids
      })
      ElMessage.success('批量回滚任务已提交')
    } else {
      // 单个回滚 - 任务代码 S9eC0m
      const item = rollbackItems.value[0]
      await windowsRollbackApi.rollback({
        update_kbs: item.update_kb_numbers,
        hosts: item.hosts
      })
      ElMessage.success('回滚任务已提交')
    }
    rollbackDialogVisible.value = false
    loadData()
  } catch (error) {
    console.error('Rollback failed:', error)
    ElMessage.error('回滚失败')
  } finally {
    rollbackLoading.value = false
  }
}

function handleDelete(row) {
  deleteItem.value = row
  deleteDialogVisible.value = true
}

async function executeDelete() {
  deleteLoading.value = true
  try {
    // 删除 - 任务代码 aJlha6
    await windowsRollbackApi.deleteHistUpdateKbs([deleteItem.value.id])
    ElMessage.success('删除成功')
    deleteDialogVisible.value = false
    loadData()
  } catch (error) {
    console.error('Delete failed:', error)
    ElMessage.error('删除失败')
  } finally {
    deleteLoading.value = false
  }
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
  background: #f5f5f5;
}

.page-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.filter-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .filter-right {
    display: flex;
    gap: 8px;
  }
}

.table-section {
  background: #fff;
  border-radius: 4px;
  border: 1px solid #e9ecef;
  overflow: hidden;
}

.table-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid #e9ecef;
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

.delete-confirm {
  p {
    margin: 0 0 8px;
  }
}
</style>
