<template>
  <el-drawer
    v-model="visible"
    title="定时任务"
    size="900px"
    destroy-on-close
    class="wb-workbench-drawer"
  >
    <div class="wb-drawer-body">
      <div class="wb-filter-panel">
        <el-form :model="filters" inline size="small" class="wb-filter-panel__form" @submit.prevent="handleSearch">
          <el-form-item label="状态">
            <el-select v-model="filters.status" style="width: 130px" @change="handleSearch">
              <el-option label="全部状态" value="all" />
              <el-option label="启用" value="1" />
              <el-option label="停用" value="0" />
            </el-select>
          </el-form-item>
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
            :class="{ 'wb-cron-item--enabled': String(item.triggerStatus) === '1' }"
        >
          <div class="wb-cron-item__info">
            <strong class="wb-cron-item__name" :title="item.jobDesc">
              {{ item.jobDesc || `任务 ${item.id}` }}
            </strong>
            <div class="wb-cron-item__meta">
              <el-tag size="small" :type="String(item.triggerStatus) === '1' ? 'success' : 'info'">{{ String(item.triggerStatus) === '1' ? '启用' : '停用' }}</el-tag>
              <span>{{ getWorkbenchJobType(item).label }}</span>
              <span>作者：{{ item.author || '未提供' }}</span>
            </div>
            <span class="wb-cron-item__cron">CRON：{{ item.scheduleConf || '未配置' }}</span>
            <span class="wb-cron-item__meta" :title="String(item.jobId || '')">执行工具：{{ item.jobId || '未提供' }} · 调度 ID：{{ item.id }}</span>
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
              :type="String(item.triggerStatus) === '1' ? 'danger' : 'success'"
              :loading="actionLoading[item.id + '_toggle']"
              @click="$emit('toggle', item)"
            >
              {{ String(item.triggerStatus) === '1' ? '停用' : '启用' }}
            </el-button>
            <el-button class="wb-inline-action" text size="small" @click="$emit('edit', item)">
              编辑
            </el-button>
            <el-button class="wb-inline-action" text size="small" @click="$emit('copy', item)">
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
        <span class="wb-drawer-footer__total">
          当前 {{ filteredJobs.length }} 个 / 共 {{ jobs.length }} 个 · 启用 {{ summary.enabled }}
        </span>
        <el-button size="small" @click="$emit('navigate')">在列表页管理</el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { getWorkbenchJobType } from '../../utils/workbenchPresentation'

const props = defineProps({
  jobs: { type: Array, default: () => [] },
  summary: { type: Object, default: () => ({ total: 0, enabled: 0 }) },
  actionLoading: { type: Object, default: () => ({}) }
})

defineEmits(['execute', 'toggle', 'edit', 'copy', 'delete', 'navigate'])

const visible = defineModel('visible', { default: false })
const filters = reactive({
  keyword: '',
  status: 'all'
})
const appliedFilters = reactive({
  keyword: '',
  status: 'all'
})

const filteredJobs = computed(() => {
  const keyword = appliedFilters.keyword.trim().toLowerCase()
  const jobs = props.jobs.filter(item => appliedFilters.status === 'all' || String(item.triggerStatus) === appliedFilters.status)
  if (!keyword) return jobs

  return jobs.filter(
    item =>
      (item.id && String(item.id).toLowerCase().includes(keyword)) ||
      (item.jobDesc && item.jobDesc.toLowerCase().includes(keyword)) ||
      (item.scheduleConf && item.scheduleConf.toLowerCase().includes(keyword)) ||
      (item.jobType && item.jobType.toLowerCase().includes(keyword)) ||
      (item.author && item.author.toLowerCase().includes(keyword))
  )
})

const emptyText = computed(() =>
  props.jobs.length ? '没有符合筛选条件的定时任务' : '暂无定时任务'
)

function handleSearch() {
  appliedFilters.keyword = filters.keyword.trim()
  appliedFilters.status = filters.status
}

function handleReset() {
  filters.keyword = ''
  appliedFilters.keyword = ''
  filters.status = 'all'
  appliedFilters.status = 'all'
}

watch(
  () => visible.value,
  isVisible => {
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
  align-items: flex-start;
  flex-wrap: wrap;
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
    flex-basis: 360px;
  }

  &__meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; font-size: 12px; line-height: 1.6; color: var(--el-text-color-secondary); overflow-wrap: anywhere; }

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
