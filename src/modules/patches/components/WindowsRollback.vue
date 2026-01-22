<template>
  <div class="ops-page-layout">
    <!-- 提示区域 -->
    <el-alert
      type="success"
      :closable="false"
      show-icon
      class="tip-alert"
    >
      <template #title>
        <strong>提示</strong>
      </template>
      <template #default>
        回滚操作开始后,您可以选择在回滚完成后是否自动重启机器。如果您选择了重启机器,机器开始重启的时间不可控，这取决于机器回滚的速度。
      </template>
    </el-alert>

    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :model="filterParams" inline size="small">
        <el-form-item label="IP">
          <el-input
            v-model="filterParams.host_key"
            placeholder=""
            style="width: 140px"
            clearable
          />
        </el-form-item>
        <el-form-item label="KB编号">
          <el-input
            v-model="filterParams.update_kb_numbers"
            placeholder=""
            style="width: 140px"
            clearable
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleFilter">
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

    <!-- 操作区 -->
    <div class="ops-action-bar">
      <el-button
        type="primary"
        size="small"
        :disabled="selectedRows.length === 0"
        @click="handleBatchRollback"
      >
        <i class="fa fa-history" style="margin-right: 4px;" />
        批量回滚
      </el-button>
      <el-button
        type="danger"
        size="small"
        :disabled="selectedRows.length === 0"
        @click="handleBatchDelete"
      >
        删除
      </el-button>
      <span style="flex: 1;"></span>
      <el-button class="toolbar-icon-btn" circle size="small" :loading="loading" @click="handleRefresh" title="刷新">
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <!-- 表格区域 -->
    <div class="ops-table-wrapper">
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="tableData"
        stripe
        height="100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="40" />
        <el-table-column prop="hosts" label="主机" min-width="180">
          <template #default="{ row }">
            <div class="hosts-cell">
              <div v-for="(host, idx) in parseHosts(row.hosts).slice(0, 2)" :key="idx">
                {{ host }}
              </div>
              <el-popover
                v-if="parseHosts(row.hosts).length > 2"
                placement="top"
                trigger="hover"
                :width="200"
              >
                <template #reference>
                  <span class="more-link">+{{ parseHosts(row.hosts).length - 2 }} 更多</span>
                </template>
                <div class="hosts-popover">
                  <div v-for="(host, idx) in parseHosts(row.hosts)" :key="idx">{{ host }}</div>
                </div>
              </el-popover>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="update_kb_numbers" label="KB编号" min-width="120" />
        <el-table-column prop="update_time" label="更新时间" min-width="160">
          <template #default="{ row }">
            {{ formatDate(row.update_time) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="132" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="handleRollback(row)">
              回滚
            </el-button>
            <el-button text type="danger" size="small" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页区域 -->
    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 回滚确认弹窗 -->
    <el-dialog
      v-model="confirmRollbackVisible"
      :title="confirmRollbackTitle"
      width="480px"
      destroy-on-close
    >
      <div class="confirm-body">
        <div class="confirm-tip">
          确定执行回滚？请选择回滚完成后是否自动重启主机。
        </div>
        <div class="confirm-section">
          <span class="confirm-label">重启机器</span>
          <el-radio-group v-model="rebootOption" size="small">
            <el-radio value="yes">YES</el-radio>
            <el-radio value="no">NO</el-radio>
          </el-radio-group>
        </div>
        <div class="confirm-section" v-if="confirmRollbackRows.length">
          <span class="confirm-label">目标</span>
          <div class="confirm-targets">
            <div v-for="item in confirmRollbackRows" :key="item.id" class="confirm-target">
              <span class="confirm-host">{{ parseHosts(item.hosts)[0] || '-' }}</span>
              <span class="confirm-kb">{{ item.update_kb_numbers }}</span>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="handleConfirmCancel">取消</el-button>
        <el-button type="primary" :loading="confirmRollbackLoading" @click="handleConfirmSubmit">
          确认回滚
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search, RefreshRight } from '@element-plus/icons-vue'
import { windowsRollbackApi } from '../api'

// 加载状态
const loading = ref(false)

// 重启选项
const rebootOption = ref('no')

// 回滚确认
const confirmRollbackVisible = ref(false)
const confirmRollbackRows = ref([])
const confirmRollbackMode = ref('single')
const confirmRollbackLoading = ref(false)

const confirmRollbackTitle = computed(() =>
  confirmRollbackMode.value === 'batch'
    ? `确认回滚选中的 ${confirmRollbackRows.value.length} 条记录`
    : '确认回滚'
)

// 筛选参数
const filterParams = reactive({
  host_key: '',
  update_kb_numbers: ''
})

// 表格数据
const tableRef = ref(null)
const tableData = ref([])
const selectedRows = ref([])
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 解析主机列表
function parseHosts(hostsStr) {
  if (!hostsStr) return []
  return hostsStr.split(',').map(h => h.trim()).filter(h => h)
}

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const response = await windowsRollbackApi.getHistUpdateKbsWin({
      page: pagination.page,
      size: pagination.pageSize,
      host_key: filterParams.host_key,
      update_kb_numbers: filterParams.update_kb_numbers
    })
    tableData.value = response?.records || response?.data?.records || []
    pagination.total = response?.total || response?.data?.total || 0
  } catch (error) {
    console.error('Failed to load data:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  } catch {
    return dateStr
  }
}

function handleFilter() {
  pagination.page = 1
  loadData()
}

function handleReset() {
  filterParams.host_key = ''
  filterParams.update_kb_numbers = ''
  pagination.page = 1
  pagination.pageSize = 20
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

// 单个回滚 - 作业代码 S9eC0m
function handleRollback(row) {
  rebootOption.value = 'no'
  confirmRollbackMode.value = 'single'
  confirmRollbackRows.value = [row]
  confirmRollbackVisible.value = true
}

// 批量回滚 - 作业代码 HiuT3F
function handleBatchRollback() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择要回滚的记录')
    return
  }
  rebootOption.value = 'no'
  confirmRollbackMode.value = 'batch'
  confirmRollbackRows.value = [...selectedRows.value]
  confirmRollbackVisible.value = true
}

async function handleConfirmSubmit() {
  if (!confirmRollbackRows.value.length) {
    confirmRollbackVisible.value = false
    return
  }
  confirmRollbackLoading.value = true
  try {
    if (confirmRollbackMode.value === 'single') {
      const row = confirmRollbackRows.value[0]
      const kbNumber = row.update_kb_numbers
      const match = kbNumber?.match(/\d+/)
      const updateKbs = match ? match[0] : kbNumber
      const hosts = [{
        key: row.hosts_id || row.id,
        value: row.hosts,
        assetType: 'windows'
      }]
      await windowsRollbackApi.rollback({
        update_kbs: updateKbs,
        hosts: hosts,
        reboot: rebootOption.value
      })
    } else {
      const ids = confirmRollbackRows.value.map(item => item.id)
      await windowsRollbackApi.batchRollback({
        histUpdatePkgsWinIds: ids,
        reboot: rebootOption.value
      })
    }
    ElMessage.success('回滚任务已提交')
    handleConfirmCancel()
    loadData()
  } catch (error) {
    console.error('Rollback failed:', error)
    ElMessage.error('回滚失败')
  } finally {
    confirmRollbackLoading.value = false
  }
}

function handleConfirmCancel() {
  confirmRollbackVisible.value = false
  confirmRollbackRows.value = []
  confirmRollbackMode.value = 'single'
}

// 单个删除 - 作业代码 aJlha6
async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      '确定要删除此记录吗？',
      '确认删除',
      { type: 'warning' }
    )

    await windowsRollbackApi.deleteHistUpdateKbs([row.id])
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Delete failed:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 批量删除 - 作业代码 aJlha6
async function handleBatchDelete() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择要删除的记录')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRows.value.length} 条记录吗？`,
      '确认删除',
      { type: 'warning' }
    )

    const ids = selectedRows.value.map(item => item.id)
    await windowsRollbackApi.deleteHistUpdateKbs(ids)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Batch delete failed:', error)
      ElMessage.error('批量删除失败')
    }
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
.tip-alert {
  margin-bottom: 12px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 24px;

  &:last-child {
    margin-right: 0;
  }
}

.filter-label {
  color: #606266;
  white-space: nowrap;
}

.hosts-cell {
  line-height: 1.5;
}

.more-link {
  color: #0d6efd;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

.hosts-popover {
  max-height: 200px;
  overflow-y: auto;
  line-height: 1.6;
}

.confirm-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.confirm-tip {
  color: #606266;
  line-height: 1.6;
}

.confirm-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.confirm-label {
  width: 70px;
  color: #606266;
  flex-shrink: 0;
}

.confirm-targets {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.confirm-target {
  display: flex;
  gap: 8px;
  color: #303133;
}

.confirm-host {
  min-width: 120px;
}

.confirm-kb {
  color: #909399;
}
</style>
