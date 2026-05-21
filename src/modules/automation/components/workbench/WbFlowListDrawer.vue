<script setup>
import { computed, reactive, watch } from 'vue'

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const pad = n => (n < 10 ? `0${n}` : String(n))
  return `${date.getMonth() + 1}-${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const props = defineProps({
  flows: { type: Array, default: () => [] }
})

const emit = defineEmits(['run', 'edit', 'delete', 'instances', 'navigate'])
const visible = defineModel('visible', { default: false })
const collator = new Intl.Collator('zh-Hans-CN', { sensitivity: 'base', numeric: true })
const filters = reactive({
  keyword: '',
  orderField: 'updatedAt',
  orderDesc: false
})
const appliedFilters = reactive({
  keyword: ''
})

const filteredFlows = computed(() => {
  const keyword = appliedFilters.keyword.trim().toLowerCase()
  const filtered = !keyword
    ? [...props.flows]
    : props.flows.filter(flow => flow.name?.toLowerCase().includes(keyword))

  return filtered.sort((a, b) => compareFlows(a, b))
})

const orderFieldLabel = computed(() => (filters.orderField === 'name' ? '名称' : '更新时间'))
const emptyText = computed(() => (props.flows.length ? '没有符合筛选条件的流程' : '暂无流程'))

function compareFlows(a, b) {
  const field = filters.orderField
  let diff = 0

  if (field === 'name') {
    diff = collator.compare(a.name || '', b.name || '')
  } else {
    const aTime = Date.parse(a.updatedAt || a.createdAt || '') || 0
    const bTime = Date.parse(b.updatedAt || b.createdAt || '') || 0
    diff = aTime - bTime
  }

  if (diff === 0) {
    diff = collator.compare(a.name || '', b.name || '')
  }

  return filters.orderDesc ? -diff : diff
}

function handleSearch() {
  appliedFilters.keyword = filters.keyword.trim()
}

function handleReset() {
  filters.keyword = ''
  appliedFilters.keyword = ''
  filters.orderField = 'updatedAt'
  filters.orderDesc = false
}

function handleOrderFieldChange() {
  if (filters.orderField !== 'name' && filters.orderField !== 'updatedAt') {
    filters.orderField = 'updatedAt'
  }
}

function toggleOrderDirection() {
  filters.orderDesc = !filters.orderDesc
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
  <el-drawer v-model="visible" title="流程列表" size="700px" destroy-on-close class="wb-workbench-drawer">
    <template #footer>
      <div class="wb-drawer-footer">
        <span class="wb-drawer-footer__total">当前 {{ filteredFlows.length }} 个 / 共 {{ flows.length }} 个流程</span>
        <el-button link size="small" @click="emit('navigate', '/flow/list')">在流程页管理</el-button>
      </div>
    </template>

    <div class="wb-drawer-body">
      <div class="wb-filter-panel">
        <el-form :model="filters" inline size="small" class="wb-filter-panel__form" @submit.prevent>
          <el-form-item label="关键词">
            <el-input
              v-model="filters.keyword"
              placeholder="搜索流程"
              clearable
              style="width: 220px"
              @keyup.enter="handleSearch"
              @clear="handleSearch"
            />
          </el-form-item>
          <el-form-item label="排序">
            <el-select v-model="filters.orderField" style="width: 140px" @change="handleOrderFieldChange">
              <el-option label="更新时间" value="updatedAt" />
              <el-option label="名称" value="name" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button @click="toggleOrderDirection">{{ filters.orderDesc ? '倒序' : '正序' }}</el-button>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
        <div class="wb-filter-panel__summary">排序字段：{{ orderFieldLabel }}</div>
      </div>

      <div v-if="filteredFlows.length" class="wb-flow-list-drawer">
        <div v-for="item in filteredFlows" :key="item.id" class="wb-flow-list-item" @click="emit('edit', item)">
          <div class="wb-flow-list-item__info">
            <span class="wb-flow-list-item__name">{{ item.name || '未命名流程' }}</span>
            <span class="wb-flow-list-item__meta">最近修改 {{ formatDateTime(item.updatedAt) }}</span>
          </div>
          <div class="wb-flow-list-item__actions">
            <el-button class="wb-inline-action" text type="primary" size="small" @click.stop="emit('run', item)">执行</el-button>
            <el-button class="wb-inline-action" text type="primary" size="small" @click.stop="emit('instances', item)">实例</el-button>
            <el-button class="wb-inline-action" text type="primary" size="small" @click.stop="emit('edit', item)">编辑</el-button>
            <el-button class="wb-inline-action" text type="danger" size="small" @click.stop="emit('delete', item)">删除</el-button>
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

  &__summary {
    font-size: 12px;
    color: var(--wb-text-muted, #94a3b8);
  }
}

.wb-flow-list-drawer {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.wb-flow-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;

  &:hover {
    background: #f8fafc;
    border-color: #e2e8f0;
  }

  &__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__name {
    font-size: 13px;
    font-weight: 500;
    color: var(--wb-text-primary, #1e293b);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__meta {
    font-size: 11px;
    color: var(--wb-text-muted, #94a3b8);
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 0;
    flex-shrink: 0;

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
</style>

<style>
html.dark .wb-flow-list-item:hover {
  background: #273549;
  border-color: #334155;
}
</style>
