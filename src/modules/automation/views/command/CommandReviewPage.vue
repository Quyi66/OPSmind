<template>
  <div class="ops-page-layout">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :inline="true" size="small">
        <el-form-item label="关键词">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索名称或待审核命令"
            style="width: 240px"
            clearable
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            搜索
          </el-button>
          <el-button @click="handleReset">
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 功能按钮区 -->
    <div class="ops-action-bar">
      <el-button
        type="primary"
        size="small"
        :disabled="selectedCommands.length === 0"
        @click="handleBatchApprove"
      >
        <i class="fas fa-check"></i>
        批量审核
      </el-button>
      <span style="flex: 1;"></span>
      <el-button class="toolbar-icon-btn" circle size="small" :loading="loading" @click="loadData" title="刷新">
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
        <el-table-column type="selection" width="45" />

        <el-table-column prop="name" label="名称" min-width="200" sortable>
          <template #default="{ row }">
            <div class="command-name-cell">
              <el-button text type="primary" class="name-link" @click="handleApprove(row)">
                {{ row.name }}
              </el-button>
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

        <el-table-column prop="createdAt" label="创建时间" width="170" align="left" sortable>
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column prop="createdBy" label="创建人" width="100" align="left" sortable />

        <el-table-column label="操作" width="80" fixed="right" align="left">
          <template #default="{ row }">
            <el-button
              text
              type="primary"
              size="small"
              @click="handleApprove(row)"
            >
              审核
            </el-button>
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
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { findAllUnapprovedCommand } from '@/modules/automation/api/command'
import CommandApproveDialog from '../../components/command/dialogs/CommandApproveDialog.vue'

// 状态
const loading = ref(false)
const commands = ref([])
const selectedCommands = ref([])
const searchKeyword = ref('')
const tableRef = ref(null)
const currentPage = ref(1)
const pageSize = ref(10)

// 审核对话框状态
const approveDialogVisible = ref(false)
const approveMode = ref('single')
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

const pagedCommands = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredCommands.value.slice(start, start + pageSize.value)
})

const paginationInfo = computed(() => {
  const total = filteredCommands.value.length
  if (total === 0) return '0 - 0 / 0'
  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(currentPage.value * pageSize.value, total)
  return `${start} - ${end} / ${total}`
})

// 分页大小变化
function handlePageSizeChange() {
  currentPage.value = 1
  clearSelection()
}

// 页码变化
function handlePageChange(page) {
  currentPage.value = page
  clearSelection()
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
  currentPage.value = 1
}

// 重置
function handleReset() {
  searchKeyword.value = ''
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
  .name-link {
    padding: 0;
    font-weight: 500;
  }

  .name {
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .description {
    margin: 2px 0 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    line-height: 1.4;
  }
}

.command-preview {
  font-size: 13px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 400px;
}
</style>
