<template>
  <div class="ops-page-layout">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small">
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索名称、描述或命令内容"
            clearable
            style="width: 240px"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 功能按钮区 -->
    <div class="ops-action-bar">
      <el-button type="primary" size="small" @click="handleCreate">
        <i class="fas fa-plus" />
        创建命令
      </el-button>
      <el-button
        size="small"
        :disabled="selectedCommands.length === 0"
        @click="handleBatchRun('run')"
      >
        <i class="fas fa-play" />
        执行命令
      </el-button>
      <el-button
        size="small"
        :disabled="selectedCommands.length === 0"
        @click="handleBatchRun('createJob')"
      >
        <i class="fas fa-tasks" />
        创建运维工具
      </el-button>
      <span style="flex: 1"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="loading"
        @click="loadData"
        title="刷新"
      >
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <!-- 表格区域 -->
    <div class="ops-table-wrapper">
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="pagedCommands"
        max-height="calc(100vh - 230px)"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="45" :selectable="checkSelectable" />

        <el-table-column prop="name" label="名称" min-width="180" sortable>
          <template #default="{ row }">
            <el-button text type="primary" @click="handleView(row)">
              {{ row.name }}
            </el-button>
          </template>
        </el-table-column>

        <el-table-column prop="description" label="描述" min-width="140" show-overflow-tooltip />

        <el-table-column prop="command" label="命令内容" min-width="200">
          <template #default="{ row }">
            <div class="command-preview" :title="getDisplayCommand(row) || '-'">
              {{ getDisplayCommand(row) || '-' }}
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="type" label="类型" width="100" align="left" sortable />

        <el-table-column prop="createdAt" label="创建时间" width="180" align="left" sortable>
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column prop="updatedAt" label="修改时间" width="180" align="left" sortable>
          <template #default="{ row }">
            {{ formatDate(row.updatedAt) }}
          </template>
        </el-table-column>

        <el-table-column prop="createdBy" label="创建人" width="100" align="left" sortable />

        <el-table-column prop="checkBy" label="审核人" width="100" align="left" sortable>
          <template #default="{ row }">
            {{ row.checkBy || '' }}
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" width="100" align="left" sortable>
          <template #default="{ row }">
            <el-tag
              :type="getStatusTagType(row.status)"
              size="small"
              style="cursor: pointer"
              @click="handleStatusClick(row)"
            >
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="176" fixed="right" align="left">
          <template #default="{ row }">
            <el-button
              text
              type="primary"
              size="small"
              :disabled="row.status === 3"
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              text
              type="primary"
              size="small"
              :disabled="row.status === 1 || row.status === 2"
              @click="handleToggleStatus(row)"
            >
              {{ row.status === 3 ? '启用' : '停用' }}
            </el-button>
            <el-button
              text
              type="primary"
              size="small"
              :disabled="row.status !== 0"
              @click="handleRun(row)"
            >
              执行
            </el-button>
            <el-button text type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页区域 -->
    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 25, 50, 100]"
        :total="filteredCommands.length"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handlePageSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 编辑命令对话框 -->
    <CommandEditDialog
      v-model:visible="editDialogVisible"
      :mode="editMode"
      :command="currentCommand"
      @success="handleEditSuccess"
    />

    <!-- 审核详情对话框 -->
    <CommandApproveInfoDialog
      v-model:visible="approveInfoDialogVisible"
      :command="currentCommand"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import {
  findByTenantIdAndCreatedBy,
  deleteCommand as apiDeleteCommand,
  saveCommand,
  getCommandStatusInfo
} from '@/modules/automation/api/command'
import CommandEditDialog from '../../components/command/dialogs/CommandEditDialog.vue'
import CommandApproveInfoDialog from '../../components/command/dialogs/CommandApproveInfoDialog.vue'

const emit = defineEmits(['run-command', 'create-job'])

// 注入父组件提供的函数
const handleRunCommandFn = inject('handleRunCommand', null)
const handleCreateJobFn = inject('handleCreateJob', null)

// 状态
const loading = ref(false)
const commands = ref([])
const selectedCommands = ref([])
const filters = reactive({
  keyword: ''
})
const tableRef = ref(null)
const currentPage = ref(1)
const pageSize = ref(10)

// 编辑对话框状态
const editDialogVisible = ref(false)
const editMode = ref('create')
const currentCommand = ref(null)

// 审核详情对话框
const approveInfoDialogVisible = ref(false)

// 过滤后的命令列表
const filteredCommands = computed(() => {
  if (!filters.keyword) {
    return commands.value
  }
  const keyword = filters.keyword.toLowerCase()
  return commands.value.filter(
    cmd =>
      (cmd.name && cmd.name.toLowerCase().includes(keyword)) ||
      (cmd.description && cmd.description.toLowerCase().includes(keyword)) ||
      (cmd.command && cmd.command.toLowerCase().includes(keyword))
  )
})

const pagedCommands = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredCommands.value.slice(start, start + pageSize.value)
})

// 分页信息
const paginationInfo = computed(() => {
  const total = filteredCommands.value.length
  if (total === 0) return '0 - 0 / 0'
  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(currentPage.value * pageSize.value, total)
  return `${start} - ${end} / ${total}`
})

// 检查是否可选（只有已发布的命令可选）
function checkSelectable(row) {
  return row.status === 0
}

// 获取显示的命令内容
function getDisplayCommand(row) {
  if (row.status === 2 || row.status === 1 || row.command == null) {
    return row.unapprovedCommand
  }
  return row.command
}

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const response = await findByTenantIdAndCreatedBy()
    commands.value = response.data || response || []
  } catch (error) {
    console.error('加载命令列表失败:', error)
    ElMessage.error('加载命令列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
function handleSearch() {
  currentPage.value = 1
}

// 重置
function handleReset() {
  filters.keyword = ''
  currentPage.value = 1
  pageSize.value = 10
}

// 选择变化
function handleSelectionChange(selection) {
  selectedCommands.value = selection
}

function clearSelection() {
  tableRef.value?.clearSelection()
  selectedCommands.value = []
}

// 分页大小变化
function handlePageSizeChange() {
  currentPage.value = 1
  clearSelection()
}

// 创建命令
function handleCreate() {
  currentCommand.value = null
  editMode.value = 'create'
  editDialogVisible.value = true
}

// 查看命令
function handleView(row) {
  currentCommand.value = { ...row }
  editMode.value = 'view'
  editDialogVisible.value = true
}

// 编辑命令
function handleEdit(row) {
  currentCommand.value = { ...row }
  editMode.value = 'edit'
  editDialogVisible.value = true
}

// 执行单个命令
function handleRun(row) {
  if (handleRunCommandFn) {
    handleRunCommandFn(row)
  } else {
    emit('run-command', row)
  }
}

// 批量执行/创建作业
function handleBatchRun(type) {
  if (selectedCommands.value.length === 0) {
    ElMessage.warning('请选择要操作的命令')
    return
  }
  if (type === 'run') {
    if (handleRunCommandFn) {
      handleRunCommandFn(selectedCommands.value)
    } else {
      emit('run-command', selectedCommands.value)
    }
  } else {
    if (handleCreateJobFn) {
      handleCreateJobFn(selectedCommands.value)
    } else {
      emit('create-job', selectedCommands.value)
    }
  }
}

// 点击状态查看详情
function handleStatusClick(row) {
  currentCommand.value = { ...row }
  approveInfoDialogVisible.value = true
}

// 切换启用/停用状态
async function handleToggleStatus(row) {
  if (row.status === 3) {
    try {
      await ElMessageBox.confirm('确定要启用该命令吗？', '启用命令', { type: 'warning' })
      const command = { ...row, status: 0 }
      await saveCommand(command)
      ElMessage.success('操作成功')
      loadData()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('操作失败')
      }
    }
  } else if (row.status === 0) {
    try {
      await ElMessageBox.confirm('确定要停用该命令吗？', '停用命令', { type: 'warning' })
      const command = { ...row, status: 3 }
      await saveCommand(command)
      ElMessage.success('操作成功')
      loadData()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('操作失败')
      }
    }
  }
}

// 删除命令
async function handleDelete(row) {
  try {
    await ElMessageBox.confirm('确定要删除该命令吗？', '删除命令', { type: 'warning' })
    await apiDeleteCommand(row.id)
    ElMessage.success('操作成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除命令失败:', error)
      ElMessage.error('操作失败')
    }
  }
}

// 编辑成功回调
function handleEditSuccess() {
  loadData()
}

// 获取状态样式类
function getStatusClass(status) {
  switch (status) {
    case 0:
      return 'status-success'
    case 1:
      return 'status-warning'
    case 2:
      return 'status-danger'
    case 3:
      return 'status-danger'
    default:
      return ''
  }
}

// 获取状态 Tag 类型
function getStatusTagType(status) {
  switch (status) {
    case 0:
      return 'success'
    case 1:
      return 'warning'
    case 2:
      return 'danger'
    case 3:
      return 'danger'
    default:
      return 'info'
  }
}

// 页码变化
function handlePageChange(page) {
  currentPage.value = page
  clearSelection()
}

// 获取状态文本
function getStatusText(status) {
  const info = getCommandStatusInfo(status)
  return info.text
}

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date
    .toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    .replace(/\//g, '/')
}

// 截断命令预览
function truncateCommand(command) {
  if (!command) return ''
  return command.length > 50 ? `${command.substring(0, 50)}...` : command
}

// 刷新方法
function refresh() {
  loadData()
}

// 初始化
onMounted(() => {
  loadData()
})

watch(
  () => filteredCommands.value.length,
  total => {
    const maxPage = Math.max(1, Math.ceil(total / pageSize.value))
    if (currentPage.value > maxPage) {
      currentPage.value = maxPage
    }
  }
)

// 暴露方法
defineExpose({
  refresh,
  loadData
})
</script>

<style scoped lang="scss">
.command-name-cell {
  .name {
    font-weight: 500;
    color: var(--el-color-primary);
  }

  .description {
    margin: 2px 0 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    line-height: 1.4;
  }

  .command-preview {
    margin: 6px 0 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 250px;
  }
}

.command-preview {
  font-size: 13px;
  line-height: 1.5;
  color: var(--el-text-color-regular);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.el-table) {
  font-size: 13px;

  .el-table__header th {
    background-color: var(--el-fill-color-light) !important;
    color: var(--el-text-color-regular);
    font-weight: 600;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .el-table__row {
    &:hover > td {
      background-color: var(--el-fill-color-light) !important;
    }
  }

  .el-table__cell {
    border-bottom: 1px solid var(--el-border-color-lighter);
  }
}

:deep(.el-input__wrapper) {
  border-radius: 4px;
}
</style>
