<template>
  <div class="command-approve-list">
    <!-- 标题栏 -->
    <div class="approve-list__header">
    </div>

    <!-- 内容区域 -->
    <div class="approve-list__content">
      <!-- 工具栏 -->
      <div class="approve-list__toolbar">
        <div class="toolbar-left">
          <el-button
            type="primary"
            :disabled="selectedCommands.length === 0"
            @click="handleBatchApprove"
          >
            <i class="fas fa-check"></i>
            批量审核
          </el-button>
        </div>
        <div class="toolbar-right">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索"
            style="width: 200px"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          />
        </div>
      </div>

      <!-- 待审核命令表格 -->
      <div class="approve-list__table">
        <el-table
          ref="tableRef"
          v-loading="loading"
          :data="filteredCommands"
          border
          height="100%"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="45" />

          <el-table-column prop="name" label="名称" min-width="200" sortable>
            <template #default="{ row }">
              <div class="command-name-cell">
                <span class="name">{{ row.name }}</span>
                <p v-if="row.description" class="description">{{ row.description }}</p>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="unapprovedCommand" label="命令" min-width="300" sortable>
            <template #default="{ row }">
              <div class="command-preview" :title="row.unapprovedCommand">
                {{ truncateCommand(row.unapprovedCommand) }}
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="createdAt" label="创建时间" width="170" align="center" sortable>
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>

          <el-table-column prop="createdBy" label="创建人" width="100" align="center" sortable />

          <el-table-column label="操作" width="80" fixed="right" align="center">
            <template #default="{ row }">
              <el-button
                link
                @click="handleApprove(row)"
                title="审核"
              >
                <i class="fas fa-arrow-right"></i>
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页 -->
      <div class="approve-list__pagination">
        <el-select v-model="pageSize" style="width: 70px" @change="handlePageSizeChange">
          <el-option :value="10" label="10" />
          <el-option :value="25" label="25" />
          <el-option :value="50" label="50" />
          <el-option :value="100" label="100" />
        </el-select>
        <span class="pagination-info">{{ paginationInfo }}</span>
      </div>
    </div>

    <!-- 审核对话框 -->
    <CommandApproveDialog
      v-model:visible="approveDialogVisible"
      :mode="approveMode"
      :command="currentCommand"
      :commands="selectedForApprove"
      @success="handleApproveSuccess"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { findAllUnapprovedCommand } from '@/modules/automation/api/command'
import CommandApproveDialog from './dialogs/CommandApproveDialog.vue'

// 状态
const loading = ref(false)
const commands = ref([])
const selectedCommands = ref([])
const searchKeyword = ref('')
const tableRef = ref(null)
const pageSize = ref(10)

// 审核对话框状态
const approveDialogVisible = ref(false)
const approveMode = ref('single') // 'single' 或 'batch'
const currentCommand = ref(null)
const selectedForApprove = ref([])

// 过滤后的命令列表
const filteredCommands = computed(() => {
  if (!searchKeyword.value) {
    return commands.value
  }
  const keyword = searchKeyword.value.toLowerCase()
  return commands.value.filter(cmd =>
    (cmd.name && cmd.name.toLowerCase().includes(keyword)) ||
    (cmd.unapprovedCommand && cmd.unapprovedCommand.toLowerCase().includes(keyword))
  )
})

// 分页信息
const paginationInfo = computed(() => {
  const total = filteredCommands.value.length
  if (total === 0) return '0 - 0 / 0'
  const start = 1
  const end = Math.min(pageSize.value, total)
  return `${start} - ${end} / ${total}`
})

// 分页大小变化
function handlePageSizeChange() {
  // 当前简单实现
}

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const response = await findAllUnapprovedCommand()
    commands.value = response.data || response || []
  } catch (error) {
    console.error('加载待审核命令失败:', error)
    ElMessage.error('加载待审核命令失败')
  } finally {
    loading.value = false
  }
}

// 搜索
function handleSearch() {
  // 搜索通过 computed 自动处理
}

// 选择变化
function handleSelectionChange(selection) {
  selectedCommands.value = selection
}

// 单个审核
function handleApprove(row) {
  currentCommand.value = { ...row }
  approveMode.value = 'single'
  selectedForApprove.value = []
  approveDialogVisible.value = true
}

// 批量审核
function handleBatchApprove() {
  if (selectedCommands.value.length === 0) {
    ElMessage.warning('请选择要审核的命令')
    return
  }
  currentCommand.value = null
  approveMode.value = 'batch'
  selectedForApprove.value = [...selectedCommands.value]
  approveDialogVisible.value = true
}

// 审核成功回调
function handleApproveSuccess() {
  loadData()
  selectedCommands.value = []
}

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).replace(/\//g, '/')
}

// 截断命令预览
function truncateCommand(command) {
  if (!command) return ''
  return command.length > 80 ? command.substring(0, 80) + '...' : command
}

// 刷新方法
function refresh() {
  loadData()
}

// 初始化
onMounted(() => {
  loadData()
})

// 暴露方法
defineExpose({
  refresh,
  loadData
})
</script>

<style scoped lang="scss">
.command-approve-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.approve-list__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #dee2e6;
  background: #f8f9fa;

  .header-title {
    font-size: 16px;
    font-weight: 600;
    color: #212529;
  }
}

.approve-list__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0;
}

.approve-list__toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #dee2e6;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.approve-list__table {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 0 16px;
}

.approve-list__pagination {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid #dee2e6;

  .pagination-info {
    font-size: 13px;
    color: #6c757d;
  }
}

.command-name-cell {
  .name {
    font-weight: 500;
    color: #212529;
  }

  .description {
    margin: 2px 0 0;
    font-size: 12px;
    color: #6c757d;
    line-height: 1.4;
  }
}

.command-preview {
  font-size: 13px;
  color: #495057;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 400px;
}

:deep(.el-table) {
  font-size: 13px;

  .el-table__header th {
    background-color: #f8f9fa !important;
    color: #495057;
    font-weight: 600;
    border-bottom: 1px solid #dee2e6;
  }

  .el-table__row {
    &:hover > td {
      background-color: #f8f9fa !important;
    }
  }

  .el-table__cell {
    border-bottom: 1px solid #dee2e6;
  }
}

:deep(.el-button) {
  border-radius: 4px;
}

:deep(.el-input__wrapper) {
  border-radius: 4px;
}

:deep(.el-button.is-link) {
  color: #6c757d;

  &:hover {
    color: #0d6efd;
  }

  i {
    font-size: 14px;
  }
}
</style>
