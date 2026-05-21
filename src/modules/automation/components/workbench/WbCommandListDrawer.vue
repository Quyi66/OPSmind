<script setup>
import { computed, reactive, watch } from 'vue'
import { getCommandStatusInfo } from '@/modules/automation/api/command'

const props = defineProps({
  title: { type: String, default: '命令列表' },
  commands: { type: Array, default: () => [] },
  filterType: { type: String, default: '' }
})

const emit = defineEmits(['navigate', 'view', 'edit', 'run', 'create-job', 'toggle-status', 'delete'])
const visible = defineModel('visible', { default: false })
const filters = reactive({
  keyword: ''
})
const appliedFilters = reactive({
  keyword: ''
})

const TYPE_TAGS = {
  cmd: 'info',
  shell: 'success',
  python: 'info',
  playbook: 'warning',
  powershell: 'primary'
}

const TYPE_LABELS = {
  cmd: 'CMD',
  shell: 'Shell',
  python: 'Python',
  playbook: 'Playbook',
  powershell: 'PowerShell'
}

const baseCommands = computed(() => {
  if (!props.filterType) return props.commands
  return props.commands.filter(item => item.type === props.filterType)
})

const filteredCommands = computed(() => {
  const keyword = appliedFilters.keyword.trim().toLowerCase()
  if (!keyword) return baseCommands.value

  return baseCommands.value.filter((item) => {
    const preview = previewText(item)
    return [item.name, item.description, preview, item.type, item.id]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(keyword))
  })
})

const emptyText = computed(() => (baseCommands.value.length ? '没有符合筛选条件的命令' : '暂无命令'))

function typeLabel(type) {
  return TYPE_LABELS[type] || type || '-'
}

function typeTag(type) {
  return TYPE_TAGS[type] || 'info'
}

function previewText(item) {
  if ((item?.status === 1 || item?.status === 2 || item?.command == null) && item?.unapprovedCommand) {
    return item.unapprovedCommand
  }
  return item?.command || item?.unapprovedCommand || '-'
}

function statusText(status) {
  return getCommandStatusInfo(status).text
}

function statusType(status) {
  return getCommandStatusInfo(status).type
}

function canRun(item) {
  return item?.status === 0
}

function canToggle(item) {
  return item?.status === 0 || item?.status === 3
}

function toggleLabel(item) {
  return item?.status === 3 ? '启用' : '停用'
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const pad = n => (n < 10 ? `0${n}` : String(n))
  return `${date.getMonth() + 1}-${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function handleSearch() {
  appliedFilters.keyword = filters.keyword.trim()
}

function handleReset() {
  filters.keyword = ''
  appliedFilters.keyword = ''
}

watch(
  () => visible.value,
  (isVisible) => {
    if (!isVisible) return
    handleReset()
  }
)
</script>

<template>
  <el-drawer v-model="visible" :title="title" size="680px" destroy-on-close class="wb-workbench-drawer">
    <template #footer>
      <div class="wb-drawer-footer">
        <span class="wb-drawer-footer__total">当前 {{ filteredCommands.length }} 条 / 共 {{ baseCommands.length }} 条</span>
        <el-button link size="small" @click="emit('navigate', '/cmd/list')">在命令中心管理</el-button>
      </div>
    </template>

    <div class="wb-drawer-body">
      <div class="wb-filter-panel">
        <el-form :model="filters" inline size="small" class="wb-filter-panel__form" @submit.prevent>
          <el-form-item label="关键词">
            <el-input
              v-model="filters.keyword"
              placeholder="搜索名称、描述或命令内容"
              clearable
              style="width: 260px"
              @keyup.enter="handleSearch"
              @clear="handleSearch"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div v-if="filteredCommands.length" class="wb-command-list">
        <div v-for="item in filteredCommands" :key="item.id || item.name" class="wb-command-item" @click="emit('view', item)">
          <div class="wb-command-item__info">
            <div class="wb-command-item__top">
              <span class="wb-command-item__name">{{ item.name || '-' }}</span>
              <div class="wb-command-item__badges">
                <el-tag :type="typeTag(item.type)" size="small" effect="plain">{{ typeLabel(item.type) }}</el-tag>
                <el-tag :type="statusType(item.status)" size="small" effect="plain">{{ statusText(item.status) }}</el-tag>
              </div>
            </div>
            <span class="wb-command-item__desc">{{ previewText(item) }}</span>
            <span class="wb-command-item__meta">最近修改 {{ formatDateTime(item.updatedAt || item.createdAt) }}</span>
          </div>
          <div class="wb-command-item__actions">
            <el-button class="wb-inline-action" link type="primary" size="small" :disabled="!canRun(item)" @click.stop="emit('run', item)">执行</el-button>
            <el-button class="wb-inline-action" link type="primary" size="small" @click.stop="emit('create-job', item)">作业</el-button>
            <el-button class="wb-inline-action" link size="small" :disabled="item.status === 3" @click.stop="emit('edit', item)">编辑</el-button>
            <el-button class="wb-inline-action" link size="small" :disabled="!canToggle(item)" @click.stop="emit('toggle-status', item)">{{ toggleLabel(item) }}</el-button>
            <el-button class="wb-inline-action" link type="danger" size="small" @click.stop="emit('delete', item)">删除</el-button>
          </div>
        </div>
      </div>
      <el-empty v-else :description="emptyText" :image-size="60" />
    </div>
  </el-drawer>
</template>

<style scoped lang="scss">
:deep(.el-drawer__header) {
  margin-bottom: 4px !important;
  padding: 16px 16px 0 !important;
}

:deep(.el-drawer__footer) {
  padding-top: 8px;
}

.wb-drawer-body {
  padding: 8px 12px 12px;
  min-height: 60px;
}

.wb-filter-panel {
  margin-bottom: 10px;
  padding: 12px 14px 8px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  background: var(--el-fill-color-extra-light);

  &__form {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 0;
  }
}

.wb-command-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.wb-command-item {
  display: flex;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  background: transparent;
  border: 1px solid transparent;
  transition: background 0.15s, border-color 0.15s;
  cursor: pointer;

  &:hover {
    background: #f8fafc;
    border-color: #e2e8f0;
  }

  &:hover .wb-command-item__actions {
    opacity: 1;
  }

  &__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  &__badges {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  &__name {
    font-size: 13px;
    font-weight: 500;
    color: var(--wb-text-primary, #1e293b);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__desc {
    font-size: 12px;
    color: var(--wb-text-secondary, #64748b);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: monospace;
  }

  &__meta {
    font-size: 11px;
    color: var(--wb-text-muted, #94a3b8);
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 0;
    opacity: 0;
    flex-shrink: 0;
    transition: opacity 0.15s;

    :deep(.wb-inline-action.el-button) {
      min-width: auto !important;
      min-height: auto !important;
      height: 22px !important;
      padding: 0 3px !important;
      font-size: 12px !important;
      line-height: 1 !important;
    }

    :deep(.wb-inline-action.el-button + .wb-inline-action.el-button) {
      margin-left: 0 !important;
    }
  }
}

.wb-drawer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;

  &__total {
    font-size: 12px;
    color: var(--wb-text-muted, #94a3b8);
  }
}

@media (max-width: 720px) {
  .wb-filter-panel__form {
    align-items: flex-start;
  }
}
</style>

<style>
html.dark .wb-command-item:hover {
  background: #273549;
  border-color: #334155;
}
</style>
