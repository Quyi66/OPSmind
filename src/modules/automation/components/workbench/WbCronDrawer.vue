<template>
  <el-drawer v-model="visible" title="定时任务" size="680px" destroy-on-close class="wb-workbench-drawer">
    <div class="wb-drawer-body">
      <div class="wb-filter-panel">
        <el-form :model="filters" inline size="small" class="wb-filter-panel__form" @submit.prevent>
          <el-form-item label="关键词">
            <el-input
              v-model="filters.keyword"
              placeholder="搜索任务描述、表达式或作者"
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

      <div v-if="filteredJobs.length" class="wb-cron-drawer-list">
        <div
          v-for="item in filteredJobs"
          :key="item.id"
          class="wb-cron-item"
          :class="{ 'wb-cron-item--enabled': item.triggerStatus === '1' }"
        >
          <div class="wb-cron-item__info">
            <strong class="wb-cron-item__name" :title="item.jobDesc">
              {{ item.jobDesc || `任务 ${item.id}` }}
            </strong>
            <span class="wb-cron-item__cron">{{ item.scheduleConf || '-' }}</span>
          </div>
          <div class="wb-cron-item__actions">
            <el-button
              class="wb-inline-action"
              text
              type="primary"
              size="small"
              :loading="actionLoading[item.id + '_exec']"
              @click="$emit('execute', item)"
            >
              执行
            </el-button>
            <el-button
              class="wb-inline-action"
              text
              size="small"
              :type="item.triggerStatus === '1' ? 'danger' : 'success'"
              :loading="actionLoading[item.id + '_toggle']"
              @click="$emit('toggle', item)"
            >
              {{ item.triggerStatus === '1' ? '停用' : '启用' }}
            </el-button>
            <el-button
              class="wb-inline-action"
              text
              size="small"
              @click="$emit('edit', item)"
            >
              编辑
            </el-button>
            <el-button
              class="wb-inline-action"
              text
              size="small"
              @click="$emit('copy', item)"
            >
              复制
            </el-button>
            <el-button
              class="wb-inline-action"
              text
              type="danger"
              size="small"
              @click="$emit('delete', item)"
            >
              删除
            </el-button>
          </div>
        </div>
      </div>
      <el-empty v-else :description="emptyText" :image-size="60" />
    </div>
    <template #footer>
      <div class="wb-drawer-footer">
        <span class="wb-drawer-footer__total">当前 {{ filteredJobs.length }} 个 / 共 {{ jobs.length }} 个 · 启用 {{ summary.enabled }}</span>
        <el-button size="small" @click="$emit('navigate')">在列表页管理</el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'

const props = defineProps({
  jobs: { type: Array, default: () => [] },
  summary: { type: Object, default: () => ({ total: 0, enabled: 0 }) },
  actionLoading: { type: Object, default: () => ({}) }
})

defineEmits(['execute', 'toggle', 'edit', 'copy', 'delete', 'navigate'])

const visible = defineModel('visible', { default: false })
const filters = reactive({
  keyword: ''
})
const appliedFilters = reactive({
  keyword: ''
})

const filteredJobs = computed(() => {
  const keyword = appliedFilters.keyword.trim().toLowerCase()
  if (!keyword) return props.jobs

  return props.jobs.filter((item) => (
    (item.id && String(item.id).toLowerCase().includes(keyword)) ||
    (item.jobDesc && item.jobDesc.toLowerCase().includes(keyword)) ||
    (item.scheduleConf && item.scheduleConf.toLowerCase().includes(keyword)) ||
    (item.appCode && item.appCode.toLowerCase().includes(keyword)) ||
    (item.jobType && item.jobType.toLowerCase().includes(keyword)) ||
    (item.author && item.author.toLowerCase().includes(keyword))
  ))
})

const emptyText = computed(() => (props.jobs.length ? '没有符合筛选条件的定时任务' : '暂无定时任务'))

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

.wb-cron-drawer-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.wb-cron-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #f1f5f9;
  background: #fafafa;
  transition: all 0.15s;

  &:hover {
    background: #f1f5f9;
    border-color: #e2e8f0;
  }

  &--enabled {
    border-left: 3px solid var(--wb-success);
    background: rgba(34, 197, 94, 0.03);
  }

  &__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__name {
    font-size: 12px;
    font-weight: 500;
    color: var(--wb-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
  }

  &__cron {
    font-size: 11px;
    color: var(--wb-text-muted);
    font-family: monospace;
  }

  &__actions {
    display: flex;
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
    color: var(--wb-text-muted);
  }
}
</style>

<style lang="scss">
html.dark .wb-cron-item {
  background: #253044;
  border-color: #334155;
}

html.dark .wb-cron-item:hover {
  background: #2d3d56;
  border-color: #475569;
}

html.dark .wb-cron-item--enabled {
  background: rgba(34, 197, 94, 0.06);
}
</style>
