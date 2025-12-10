<template>
  <div class="flow-list-view">
    <!-- 标题栏 -->
    <div class="view-header">
      <h2 class="view-title">流程列表</h2>
      <el-button type="primary" size="small" @click="handleCreate">
        <i class="fa fa-plus"></i> 新建
      </el-button>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar__left">
        <el-button size="small" :disabled="!selectedRows.length" @click="handleBatchDelete">
          <i class="fa fa-trash"></i> 删除
        </el-button>
        <el-button size="small" @click="handleExport">
          <i class="fa fa-download"></i> 导出
        </el-button>
      </div>
      <div class="toolbar__right">
        <el-input
          v-model="searchKeyword"
          size="small"
          placeholder=""
          clearable
          style="width: 200px"
          @keyup.enter="loadData"
        />
        <el-button size="small" @click="loadData">
          <i class="fa fa-search"></i>
        </el-button>
        <el-button size="small" @click="loadData">
          <i class="fa fa-sync"></i>
        </el-button>
      </div>
    </div>

    <!-- 表格 -->
    <el-table
      :data="filteredData"
      v-loading="loading"
      border
      @selection-change="handleSelectionChange"
      style="width: 100%"
    >
      <el-table-column type="selection" width="40" />
      <el-table-column prop="processName" label="流程名称" min-width="150" />
      <el-table-column prop="processAbbr" label="流程简称" min-width="120" />
      <el-table-column prop="remarks" label="备注" min-width="150" show-overflow-tooltip />
      <el-table-column prop="createTime" label="创建时间" width="160" />
      <el-table-column label="历史版本" width="100">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="handleViewHistory(row)">
            历史版本
          </el-button>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="300" fixed="right">
        <template #default="{ row }">
          <div class="action-buttons">
            <el-button type="primary" plain size="small" @click="handleEdit(row)">
              <i class="fa fa-edit"></i> 编辑
            </el-button>
            <el-button type="warning" plain size="small" @click="handleDesign(row)">
              <i class="fa fa-cogs"></i> 设计
            </el-button>
            <el-button type="success" plain size="small" @click="handleExecute(row)">
              <i class="fa fa-play"></i> 执行
            </el-button>
            <el-button type="info" plain size="small" @click="handleClone(row)">
              <i class="fa fa-copy"></i> 克隆
            </el-button>
            <el-button type="danger" plain size="small" @click="handleDelete(row)">
              <i class="fa fa-trash"></i> 删除
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-select v-model="pageSize" size="small" style="width: 70px" @change="updatePagination">
        <el-option :value="10" label="10" />
        <el-option :value="20" label="20" />
        <el-option :value="50" label="50" />
      </el-select>
      <span class="page-info">{{ paginationInfo }}</span>
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
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as flowApi from '@/modules/flow/api'
import FlowHistoryDialog from './FlowHistoryDialog.vue'
import FlowEditDialog from './FlowEditDialog.vue'

const emit = defineEmits(['create', 'design', 'execute', 'history'])

const loading = ref(false)
const tableData = ref([])
const selectedRows = ref([])
const searchKeyword = ref('')
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

// 过滤后的数据
const filteredData = computed(() => {
  let data = tableData.value
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    data = data.filter(item =>
      item.processName?.toLowerCase().includes(keyword) ||
      item.processAbbr?.toLowerCase().includes(keyword) ||
      item.remarks?.toLowerCase().includes(keyword)
    )
  }
  // 分页
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return data.slice(start, end)
})

const paginationInfo = computed(() => {
  const total = tableData.value.length
  if (!total) return '0 / 0'
  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(currentPage.value * pageSize.value, total)
  return `${start} - ${end} / ${total}`
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

function handleSelectionChange(rows) {
  selectedRows.value = rows
}

function handleCreate() {
  emit('create')
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

function handleExport() {
  console.log('导出流程')
  ElMessage.info('导出功能待实现')
}

function handleViewHistory(row) {
  // 发出事件，跳转到历史版本页面
  emit('history', row.id)
}

function handleViewVersion(processDetailId) {
  emit('design', processDetailId)
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
  emit('design', row.id)
}

function handleExecute(row) {
  emit('execute', row.id)
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
  background: #fff;
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
  background: #f8fafc;
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
  border-top: 1px solid #e2e8f0;
}

.page-info {
  font-size: 13px;
  color: #64748b;
}
</style>
