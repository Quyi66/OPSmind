<template>
  <el-dialog
    v-model="visible"
    title="选择命令"
    width="900px"
    destroy-on-close
    @close="handleClose"
    :close-on-click-modal="false"
    class="command-selector-dialog"
  >
    <div class="command-selector-content">
      <!-- 搜索栏 -->
      <div class="search-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索命令名称或内容"
          clearable
          class="search-input"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>

      <!-- 命令列表表格 -->
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="filteredCommands"
        height="400"
        border
        @selection-change="handleSelectionChange"
        row-key="id"
      >
        <el-table-column type="selection" width="50" :reserve-selection="true" />
        <el-table-column prop="name" label="名称" width="180" show-overflow-tooltip />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.type || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="command" label="命令" min-width="300">
          <template #default="{ row }">
            <div class="command-content" :title="row.command">
              {{ row.command }}
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 已选命令预览 -->
      <div v-if="selectedCommands.length > 0" class="selected-preview">
        <div class="preview-header">
          <span>已选择 <strong>{{ selectedCommands.length }}</strong> 条命令</span>
          <el-button type="danger" link size="small" @click="clearSelection">
            清空选择
          </el-button>
        </div>
        <div class="preview-list">
          <div
            v-for="(cmd, index) in selectedCommands"
            :key="cmd.id"
            class="preview-item"
          >
            <span class="preview-index">{{ index + 1 }}</span>
            <span class="preview-name">{{ cmd.name }}</span>
            <span class="preview-cmd">{{ cmd.command }}</span>
            <el-button
              type="danger"
              link
              size="small"
              @click="removeFromSelection(cmd)"
            >
              <i class="fa fa-times"></i>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleConfirm">
          确定
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { Search } from '@element-plus/icons-vue'
import * as jaoApi from '@/modules/automation/api/jao'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  /** 预选中的命令列表 */
  preSelected: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const loading = ref(false)
const searchKeyword = ref('')
const commandList = ref([])
const selectedCommands = ref([])
const tableRef = ref(null)

// 过滤后的命令列表
const filteredCommands = computed(() => {
  if (!searchKeyword.value) {
    return commandList.value
  }
  const kw = searchKeyword.value.toLowerCase()
  return commandList.value.filter(cmd =>
    (cmd.name && cmd.name.toLowerCase().includes(kw)) ||
    (cmd.command && cmd.command.toLowerCase().includes(kw)) ||
    (cmd.type && cmd.type.toLowerCase().includes(kw))
  )
})

/**
 * 加载命令列表
 */
async function loadCommands() {
  loading.value = true
  try {
    const response = await jaoApi.fetchApprovedCommands()
    commandList.value = response.data || []
  } catch (error) {
    console.error('加载命令列表失败:', error)
    commandList.value = []
  } finally {
    loading.value = false
  }
}

/**
 * 处理表格选择变化
 */
function handleSelectionChange(selection) {
  selectedCommands.value = selection
}

/**
 * 清空选择
 */
function clearSelection() {
  selectedCommands.value = []
  if (tableRef.value) {
    tableRef.value.clearSelection()
  }
}

/**
 * 从选择中移除某个命令
 */
function removeFromSelection(cmd) {
  const index = selectedCommands.value.findIndex(c => c.id === cmd.id)
  if (index !== -1) {
    selectedCommands.value.splice(index, 1)
    // 同步更新表格的选中状态
    if (tableRef.value) {
      tableRef.value.toggleRowSelection(cmd, false)
    }
  }
}

/**
 * 初始化预选状态
 */
async function initPreSelection() {
  if (!props.preSelected || props.preSelected.length === 0) {
    return
  }

  await nextTick()

  // 恢复预选状态
  props.preSelected.forEach(preCmd => {
    const found = commandList.value.find(cmd => cmd.id === preCmd.id)
    if (found && tableRef.value) {
      tableRef.value.toggleRowSelection(found, true)
    }
  })
}

/**
 * 确认选择
 */
function handleConfirm() {
  // 返回选中的命令，添加 cmd 属性（用于显示）
  const result = selectedCommands.value.map(cmd => ({
    id: cmd.id,
    name: cmd.name,
    type: cmd.type,
    command: cmd.command,
    cmd: cmd.command // 兼容原有数据结构
  }))
  emit('confirm', result)
  handleClose()
}

/**
 * 关闭对话框
 */
function handleClose() {
  searchKeyword.value = ''
  selectedCommands.value = []
  emit('update:modelValue', false)
}

// 监听对话框打开
watch(() => props.modelValue, async (newVal) => {
  if (newVal) {
    await loadCommands()
    await initPreSelection()
  }
})
</script>

<style scoped lang="scss">
.command-selector-dialog {
  :deep(.el-dialog__body) {
    padding: 16px 20px;
  }
}

.command-selector-content {
  --command-selector-preview-bg: var(--el-bg-color-page);
  --command-selector-preview-header-bg: var(--el-fill-color-light);
  --command-selector-preview-hover-bg: var(--el-fill-color-light);
  --command-selector-command-text: var(--el-text-color-secondary);
  --command-selector-muted-text: var(--el-text-color-secondary);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-bar {
  .search-input {
    width: 300px;
  }
}

.command-content {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  max-width: 400px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  color: var(--command-selector-command-text);
}

.selected-preview {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  background-color: var(--command-selector-preview-bg);
  max-height: 200px;
  overflow-y: auto;

  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background-color: var(--command-selector-preview-header-bg);
    border-bottom: 1px solid var(--el-border-color-lighter);
    font-size: 13px;
  }

  .preview-list {
    padding: 8px;
  }

  .preview-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 4px;
    font-size: 13px;

    &:hover {
      background-color: var(--command-selector-preview-hover-bg);
    }
  }

  .preview-index {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background-color: var(--el-color-primary);
    color: #fff;
    border-radius: 50%;
    font-size: 11px;
    flex-shrink: 0;
  }

  .preview-name {
    font-weight: 500;
    color: var(--el-text-color-primary);
    flex-shrink: 0;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .preview-cmd {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: 'Consolas', 'Monaco', monospace;
    color: var(--command-selector-muted-text);
  }
}

:global(html.dark .command-selector-dialog) .command-selector-content {
  --command-selector-preview-bg: rgba(15, 23, 42, 0.9);
  --command-selector-preview-header-bg: rgba(30, 41, 59, 0.92);
  --command-selector-preview-hover-bg: rgba(30, 41, 59, 0.74);
  --command-selector-command-text: #cbd5e1;
  --command-selector-muted-text: #94a3b8;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
