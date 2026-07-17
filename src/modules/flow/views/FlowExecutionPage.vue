<template>
  <div class="execution-list-view">
    <!-- 左侧流程列表 -->
    <aside class="ops-sidebar-nav ops-sidebar-nav--wide" style="width: 240px">
      <div class="ops-sidebar-header">
        <el-input v-model="searchKeyword" size="small" placeholder="搜索流程" clearable @keyup.enter="search" @clear="search">
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button size="small" type="danger" title="终止所有" @click="handleTerminateAll">
          <el-icon><CircleClose /></el-icon>
        </el-button>
      </div>
      <div class="ops-sidebar-content">
        <div
          v-for="process in filteredProcessList"
          :key="process.id"
          class="ops-sidebar-item"
          :class="{ 'is-active': activeProcessId === process.id }"
          @click="handleSelectProcess(process)"
        >
          <div class="process-name">{{ process.processName }}</div>
          <div class="process-desc">
            {{ process.processAbbr || process.remarks || process.processKey }}
          </div>
        </div>
        <el-empty v-if="filteredProcessList.length === 0" description="暂无流程" />
      </div>
    </aside>

    <!-- 右侧执行记录表格 -->
    <main class="execution-content">
      <div v-if="!activeProcessId" class="no-process-hint">
        <el-empty description="请选择左侧流程查看执行记录" />
      </div>

      <div v-else class="ops-page-layout">
        <!-- 操作栏 -->
        <div class="ops-action-bar">
          <el-button
            type="danger"
            size="small"
            :disabled="!hasRunningInstance"
            @click="handleTerminateProcess"
          >
            <el-icon><VideoPause /></el-icon>
            终止所有运行
          </el-button>
          <el-button
            type="danger"
            size="small"
            :disabled="selectedRows.length === 0"
            @click="handleBatchDelete"
          >
            <el-icon><Delete /></el-icon>
            删除
          </el-button>
          <el-button size="small" @click="loadExecutionList">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>

        <!-- 表格区域 -->
        <div class="ops-table-wrapper">
          <el-table
            :data="paginatedList"
            v-loading="loading"
            style="width: 100%"
            @selection-change="handleSelectionChange"
            max-height="calc(100vh - 274px)"
          >
            <el-table-column type="selection" width="55" />
            <el-table-column label="版本备注" prop="versionRemarks" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.versionRemarks || '-----' }}
              </template>
            </el-table-column>
            <el-table-column label="运行备注" prop="runRemarks" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.runRemarks || '-----' }}
              </template>
            </el-table-column>
            <el-table-column label="操作人" prop="operator" width="120" />
            <el-table-column label="开始时间" width="170">
              <template #default="{ row }">
                {{ formatDateTime(row.startTime) }}
              </template>
            </el-table-column>
            <el-table-column label="结束时间" width="170">
              <template #default="{ row }">
                {{ formatDateTime(row.endTime) }}
              </template>
            </el-table-column>
            <el-table-column label="版本" width="120">
              <template #default="{ row }">
                <el-tag
                  :type="row.version === row.currentVersion ? 'success' : 'primary'"
                  size="small"
                >
                  {{ row.version }}
                  <span v-if="row.version === row.currentVersion">(当前)</span>
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.runStatus)" size="small">
                  {{ getStatusText(row.runStatus) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button text type="primary" size="small" @click="handleView(row)">
                  查看
                </el-button>
                <el-button
                  text
                  type="danger"
                  size="small"
                  v-if="row.runStatus !== 1"
                  @click="handleDelete(row)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 分页器 -->
        <div class="ops-pagination-wrapper" v-if="executionList.length > 0">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :total="executionList.length"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @size-change="handlePageChange"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, CircleClose, VideoPause, Delete, Refresh } from '@element-plus/icons-vue'
import * as flowApi from '@/modules/flow/api'

const emit = defineEmits(['view-detail'])

const loading = ref(false)
const processList = ref([])
const executionList = ref([])
const selectedRows = ref([])
const activeProcessId = ref('')
const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

const filteredProcessList = computed(() => {
  if (!searchKeyword.value) return processList.value
  const keyword = searchKeyword.value.toLowerCase()
  return processList.value.filter(
    p =>
      p.processName?.toLowerCase().includes(keyword) ||
      p.processAbbr?.toLowerCase().includes(keyword) ||
      p.processKey?.toLowerCase().includes(keyword)
  )
})

const hasRunningInstance = computed(() => {
  return executionList.value.some(e => e.runStatus === 1)
})

// 分页后的列表
const paginatedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return executionList.value.slice(start, end)
})

function handlePageChange() {
  // 分页变化时自动更新显示
}

async function loadProcessList() {
  try {
    const response = await flowApi.getFlowList()
    const data = response?.data || response
    processList.value = Array.isArray(data) ? data : []

    // 默认选中第一个
    if (processList.value.length > 0 && !activeProcessId.value) {
      handleSelectProcess(processList.value[0])
    }
  } catch (error) {
    console.error('Failed to load process list:', error)
    ElMessage.error('加载流程列表失败')
  }
}

async function loadExecutionList() {
  if (!activeProcessId.value) return

  loading.value = true
  currentPage.value = 1
  try {
    const response = await flowApi.getExecutionList({ processId: activeProcessId.value })
    const data = response?.data || response
    executionList.value = Array.isArray(data) ? data : []
    selectedRows.value = []
  } catch (error) {
    console.error('Failed to load execution list:', error)
    ElMessage.error('加载执行记录失败')
  } finally {
    loading.value = false
  }
}

function handleSelectProcess(process) {
  activeProcessId.value = process.id
  loadExecutionList()
}

function handleSelectionChange(selection) {
  selectedRows.value = selection
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-----'
  const date = new Date(dateStr)
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

function getStatusType(status) {
  switch (status) {
    case 1:
      return 'primary' // 运行中
    case 2:
      return 'danger' // 失败
    case 3:
      return 'success' // 完成
    case 4:
      return 'info' // 已取消
    default:
      return 'info'
  }
}

function getStatusText(status) {
  switch (status) {
    case 1:
      return '运行中'
    case 2:
      return '失败'
    case 3:
      return '完成'
    case 4:
      return '已取消'
    default:
      return '未知'
  }
}

function handleView(row) {
  emit('view-detail', {
    processId: activeProcessId.value,
    detailId: row.processDetailId,
    instanceId: row.processInstanceId
  })
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm('确定要删除此执行记录吗？', '提示', { type: 'warning' })
    await flowApi.deleteExecution(row.id)
    ElMessage.success('删除成功')
    loadExecutionList()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

async function handleBatchDelete() {
  if (selectedRows.value.length === 0) return
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedRows.value.length} 条记录吗？`, '提示', {
      type: 'warning'
    })
    const ids = selectedRows.value.map(r => r.id)
    await flowApi.batchDeleteExecution(ids)
    ElMessage.success('删除成功')
    loadExecutionList()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

async function handleTerminateProcess() {
  try {
    await ElMessageBox.confirm('确定要终止此流程的所有运行实例吗？', '终止确认', {
      type: 'warning'
    })
    await flowApi.terminateProcess(activeProcessId.value)
    ElMessage.success('终止成功')
    loadExecutionList()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('终止失败')
    }
  }
}

async function handleTerminateAll() {
  try {
    await ElMessageBox.confirm('确定要终止所有流程的运行实例吗？', '终止确认', { type: 'warning' })
    await flowApi.terminateAllProcesses()
    ElMessage.success('终止成功')
    loadExecutionList()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('终止失败')
    }
  }
}

onMounted(() => {
  loadProcessList()
})
</script>

<style scoped lang="scss">
.execution-list-view {
  height: 100%;
  display: flex;
  background: var(--el-bg-color);
}

// 进程项特定样式
.process-name {
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.process-desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.execution-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 16px;
  overflow: hidden;
}

.no-process-hint {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ops-page-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.ops-action-bar {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.ops-table-wrapper {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.ops-pagination-wrapper {
  flex-shrink: 0;
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
</style>
