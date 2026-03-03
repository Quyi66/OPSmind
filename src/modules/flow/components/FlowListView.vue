<template>
  <div class="ops-page-layout">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small">
        <el-form-item label="流程名称">
          <el-input
            v-model="filters.processName"
            placeholder="搜索流程名称"
            clearable
            style="width: 250px"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSearch">
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

    <!-- 功能按钮区 -->
    <div class="ops-action-bar">
      <el-button type="primary" size="small" @click="handleCreate">
        <el-icon><Plus /></el-icon> 新建
      </el-button>
      <el-button size="small" type="danger" :disabled="!selectedRows.length" @click="handleBatchDelete">
        <el-icon><Delete /></el-icon> 删除
      </el-button>
      <el-button size="small" :disabled="!selectedRows.length" @click="handleExport">
        <el-icon><Download /></el-icon> 导出
      </el-button>
      <span style="flex: 1;"></span>
      <el-button class="toolbar-icon-btn" circle size="small" :loading="loading" @click="loadData" title="刷新">
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <!-- 表格区域 -->
    <div class="ops-table-wrapper">
      <el-table
        :data="paginatedData"
        v-loading="loading"
        @selection-change="handleSelectionChange"
        style="width: 100%"
        max-height="calc(100vh - 230px)"
      >
        <el-table-column type="selection" width="40" />
        <el-table-column prop="processName" label="流程名称" min-width="150" />
        <el-table-column prop="processAbbr" label="流程简称" min-width="120" />
        <el-table-column prop="remarks" label="备注" min-width="150" show-overflow-tooltip />
        <el-table-column prop="createTime" label="创建时间" width="200" />
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button text type="primary" size="small" @click="handleEdit(row)">
                编辑
              </el-button>
              <el-button text type="primary" size="small" @click="handleDesign(row)">
                设计
              </el-button>
              <el-button text type="primary" size="small" @click="handleExecute(row)">
                执行
              </el-button>
              <el-button text type="primary" size="small" @click="handleClone(row)">
                克隆
              </el-button>
              <el-button type="primary" text size="small" @click="handleViewHistory(row)">
                历史版本
              </el-button>
              <el-button text type="danger" size="small" @click="handleDelete(row)">
                删除
              </el-button>
            </div>
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
        @size-change="updatePagination"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 历史版本对话框 -->
    <FlowHistoryDialog
      v-model="showHistoryDialog"
      :process-id="historyProcessId"
      @view-version="handleViewVersion"
    />

    <!-- 编辑流程对话框 -->
    <FlowEditDialog
      v-model="showEditDialog"
      :flow-data="editFlowData"
      @saved="handleEditSaved"
    />

    <!-- 克隆流程对话框 -->
    <FlowEditDialog
      v-model="showCloneDialog"
      mode="processClone"
      :flow-data="cloneFlowData"
      @confirm="handleCloneConfirm"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, RefreshRight, Plus, Delete, Download } from '@element-plus/icons-vue'
import * as flowApi from '@/modules/flow/api'
import FlowHistoryDialog from './FlowHistoryDialog.vue'
import FlowEditDialog from './FlowEditDialog.vue'

// 从父组件注入方法
const handleCreateInjected = inject('handleCreate', null)
const handleDesignInjected = inject('handleDesign', null)
const handleExecuteInjected = inject('handleExecute', null)
const handleHistoryInjected = inject('handleHistory', null)

const loading = ref(false)
const tableData = ref([])
const selectedRows = ref([])
const filters = reactive({
  processName: ''
})
// 已应用的筛选条件（点击搜索后才更新）
const appliedKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

// 历史版本对话框
const showHistoryDialog = ref(false)
const historyProcessId = ref('')

// 编辑对话框
const showEditDialog = ref(false)
const editFlowData = ref(null)

// 克隆对话框
const showCloneDialog = ref(false)
const cloneFlowData = ref(null)

// 过滤后的数据（使用已应用的筛选条件）
const filteredData = computed(() => {
  let data = tableData.value
  if (appliedKeyword.value) {
    const keyword = appliedKeyword.value.toLowerCase()
    data = data.filter(item =>
      item.processName?.toLowerCase().includes(keyword) ||
      item.processAbbr?.toLowerCase().includes(keyword) ||
      item.remarks?.toLowerCase().includes(keyword)
    )
  }
  return data
})

// 分页后的数据
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredData.value.slice(start, end)
})

async function loadData() {
  loading.value = true
  try {
    const response = await flowApi.getFlowList()
    tableData.value = response?.data || []
  } catch (error) {
    console.error('Failed to load flow list:', error)
    tableData.value = []
  } finally {
    loading.value = false
  }
}

function updatePagination() {
  currentPage.value = 1
}

function handlePageChange(page) {
  currentPage.value = page
}

function handleSearch() {
  // 点击搜索时才应用筛选条件
  appliedKeyword.value = filters.processName
  currentPage.value = 1
}

function handleReset() {
  filters.processName = ''
  appliedKeyword.value = ''
  currentPage.value = 1
  pageSize.value = 10
}

function handleSelectionChange(rows) {
  selectedRows.value = rows
}

function handleCreate() {
  if (handleCreateInjected) {
    handleCreateInjected()
  } else {
    console.warn('handleCreate not provided')
  }
}

function handleBatchDelete() {
  ElMessageBox.confirm('确定要删除选中的流程吗？', '提示', {
    type: 'warning'
  }).then(async () => {
    try {
      const ids = selectedRows.value.map(row => row.id)
      await flowApi.batchDeleteFlow(ids)
      ElMessage.success('删除成功')
      loadData()
    } catch (error) {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

async function handleExport() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要导出的流程')
    return
  }

  try {
    const ids = selectedRows.value.map(row => row.id)
    const response = await flowApi.exportFlow(ids)

    // 处理文件下载
    const blob = new Blob([response.data], {
      type: response.headers?.['content-type'] || 'application/octet-stream'
    })

    // 尝试从响应头获取文件名
    const contentDisposition = response.headers?.['content-disposition']
    let filename = 'flow_export.zip'
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
      if (filenameMatch && filenameMatch[1]) {
        filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''))
      }
    }

    // 创建下载链接
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

function handleViewHistory(row) {
  // 调用父组件方法，跳转到历史版本页面
  if (handleHistoryInjected) {
    handleHistoryInjected(row.id)
  } else {
    console.warn('handleHistory not provided')
  }
}

function handleViewVersion(processDetailId) {
  if (handleDesignInjected) {
    handleDesignInjected(processDetailId)
  } else {
    console.warn('handleDesign not provided')
  }
}

function handleEdit(row) {
  editFlowData.value = row
  showEditDialog.value = true
}

function handleEditSaved() {
  loadData()
}

function handleDesign(row) {
  // 使用流程 ID，两个 API 都使用相同的 ID
  if (handleDesignInjected) {
    handleDesignInjected(row.id)
  } else {
    console.warn('handleDesign not provided')
  }
}

function handleExecute(row) {
  if (handleExecuteInjected) {
    handleExecuteInjected(row.id)
  } else {
    console.warn('handleExecute not provided')
  }
}

function handleClone(row) {
  // 打开克隆对话框，预填充当前流程完整信息
  cloneFlowData.value = {
    id: row.id,
    processKey: row.processKey,
    processName: row.processName,
    processDetailId: row.processDetailId,
    processAbbr: row.processAbbr,
    processStatus: row.processStatus,
    remarks: row.remarks || '',
    createTime: row.createTime,
    copyScenes: false
  }
  showCloneDialog.value = true
}

async function handleCloneConfirm(data) {
  try {
    await flowApi.cloneFlow({
      id: data.id,
      processKey: data.processKey,
      processName: data.processName,
      processDetailId: data.processDetailId,
      processAbbr: data.processAbbr,
      processStatus: data.processStatus,
      remarks: data.remarks,
      createTime: data.createTime,
      copyScenes: data.copyScenes
    })
    ElMessage.success('克隆成功')
    loadData()
  } catch (error) {
    ElMessage.error('克隆失败')
  }
}

function handleDelete(row) {
  ElMessageBox.confirm(`确定要删除流程"${row.processName}"吗？`, '提示', {
    type: 'warning'
  }).then(async () => {
    try {
      await flowApi.deleteFlow(row.id)
      ElMessage.success('删除成功')
      loadData()
    } catch (error) {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.flow-list-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  border-radius: 8px;
  padding: 16px;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.view-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px;
  background: var(--el-bg-color-page);
  border-radius: 6px;

  &__left, &__right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pagination-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-light);
}

.page-info {
  font-size: 13px;
  color: #64748b;
}
</style>
