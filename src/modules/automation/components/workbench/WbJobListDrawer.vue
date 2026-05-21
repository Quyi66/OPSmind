<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { appTableList } from '@/modules/automation/api/jao'
import { translateText } from '@/utils/i18n'
import { useAppletTranslation } from '@/modules/automation/components/job/composables/useAppletTranslation.js'

const props = defineProps({
  title: { type: String, default: '作业列表' },
  filterType: { type: String, default: '' },
  reloadVersion: { type: Number, default: 0 }
})

const emit = defineEmits(['navigate', 'execute', 'edit', 'copy', 'history', 'delete'])
const visible = defineModel('visible', { default: false })

const loading = ref(false)
const jobs = ref([])
const filters = reactive({
  appletCode: '',
  jobType: 'all',
  keyword: ''
})
const appliedFilters = reactive({
  appletCode: '',
  jobType: 'all',
  keyword: ''
})

const TYPE_LABELS = { rest: 'REST', script: '脚本', command: '命令' }
const TYPE_TAGS = { rest: 'primary', script: 'success', command: 'warning' }
const { appletsList, fetchApplets } = useAppletTranslation()

const appletOptions = computed(() => [
  { name: '', displayTitle: '所有应用' },
  { name: '$NULL$', displayTitle: '未分类' },
  ...appletsList.value.map(item => ({
    name: item.name,
    displayTitle: item.displayTitle || item.title || item.name
  }))
])

const filteredJobs = computed(() => {
  const keyword = appliedFilters.keyword.trim().toLowerCase()

  return jobs.value.filter((job) => {
    if (appliedFilters.jobType !== 'all' && job.type !== appliedFilters.jobType) {
      return false
    }

    if (appliedFilters.appletCode === '$NULL$') {
      if (job.appletCode && job.appletCode !== '$NULL$') {
        return false
      }
    } else if (appliedFilters.appletCode && job.appletCode !== appliedFilters.appletCode) {
      return false
    }

    if (!keyword) return true

    return [job.title, job.id, job.appletCode]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(keyword))
  })
})

const hasActiveFilters = computed(() => (
  Boolean(appliedFilters.appletCode) ||
  appliedFilters.jobType !== 'all' ||
  Boolean(appliedFilters.keyword)
))

const emptyText = computed(() => (jobs.value.length ? '没有符合筛选条件的作业' : '暂无作业'))

function typeLabel(type) {
  return TYPE_LABELS[type] || type || '-'
}

function typeTag(type) {
  return TYPE_TAGS[type] || 'info'
}

function jobTitle(job) {
  return translateText(job?.title) || job?.title || job?.id || '-'
}

function handleMoreCommand(job, command) {
  if (!command) return
  emit(command, job)
}

function syncFilters(resetKeyword = true) {
  const defaultType = props.filterType || 'all'
  filters.jobType = defaultType
  appliedFilters.jobType = defaultType

  filters.appletCode = ''
  appliedFilters.appletCode = ''

  if (resetKeyword) {
    filters.keyword = ''
    appliedFilters.keyword = ''
  }
}

function handleSearch() {
  appliedFilters.appletCode = filters.appletCode
  appliedFilters.jobType = filters.jobType
  appliedFilters.keyword = filters.keyword.trim()
}

function handleReset() {
  syncFilters(true)
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const pad = n => (n < 10 ? `0${n}` : String(n))
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

async function ensureAppletOptions() {
  if (appletsList.value.length) return
  await fetchApplets()
}

async function loadJobs() {
  loading.value = true
  jobs.value = []
  try {
    const res = await appTableList({ appletCode: '' })
    jobs.value = Array.isArray(res?.data) ? res.data : []
  } catch {
    jobs.value = []
  } finally {
    loading.value = false
  }
}

watch(
  () => visible.value,
  async (isVisible) => {
    if (!isVisible) return
    syncFilters(true)
    handleSearch()
    await ensureAppletOptions()
    await loadJobs()
  },
  { immediate: true }
)

watch(
  () => props.reloadVersion,
  async () => {
    if (!visible.value) return
    await loadJobs()
  }
)

watch(
  () => props.filterType,
  (next, previous) => {
    if (next === previous) return
    syncFilters(true)
    handleSearch()
  }
)
</script>

<template>
  <el-drawer v-model="visible" :title="title" size="76%" destroy-on-close class="wb-workbench-drawer">
    <template #footer>
      <div class="wb-drawer-footer">
        <span class="wb-drawer-footer__total">共 {{ filteredJobs.length }} 个</span>
        <el-button link size="small" @click="emit('navigate', '/jao/jobs')">在作业中心管理</el-button>
      </div>
    </template>

    <div class="wb-drawer-body" v-loading="loading">
      <div class="wb-job-filter-panel">
        <el-form :model="filters" inline size="small" class="wb-job-filter-form" @submit.prevent>
          <el-form-item label="应用范围">
            <el-select
              v-model="filters.appletCode"
              filterable
              clearable
              placeholder="全部应用"
              style="width: 220px"
              @change="handleSearch"
            >
              <el-option
                v-for="option in appletOptions"
                :key="option.name || 'all'"
                :label="option.displayTitle"
                :value="option.name"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="类型">
            <el-select v-model="filters.jobType" placeholder="全部类型" style="width: 140px" @change="handleSearch">
              <el-option label="全部类型" value="all" />
              <el-option v-for="(label, value) in TYPE_LABELS" :key="value" :label="label" :value="value" />
            </el-select>
          </el-form-item>
          <el-form-item label="关键词">
            <el-input
              v-model="filters.keyword"
              placeholder="搜索作业标题、ID"
              clearable
              style="width: 220px"
              @keyup.enter="handleSearch"
              @clear="handleSearch"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>

        <div class="wb-job-filter-panel__summary">
          <span>筛选结果 {{ filteredJobs.length }} / {{ jobs.length }}</span>
          <el-button v-if="hasActiveFilters" link type="primary" size="small" @click="handleReset">清空筛选</el-button>
        </div>
      </div>

      <div v-if="filteredJobs.length" class="wb-job-card-grid">
        <article
          v-for="job in filteredJobs"
          :key="job.id"
          class="wb-job-card"
          :class="`wb-job-card--${job.type || 'rest'}`"
        >
          <div class="wb-job-card__body">
            <div class="wb-job-card__head">
              <el-tag :type="typeTag(job.type)" size="small" effect="dark">{{ typeLabel(job.type) }}</el-tag>
              <span class="wb-job-card__meta-time">{{ formatDateTime(job.updatedAt || job.createdAt) }}</span>
            </div>
            <span class="wb-job-card__name">{{ jobTitle(job) }}</span>
          </div>

          <div class="wb-job-card__actions">
            <button type="button" class="wb-job-card__action" @click.stop="emit('execute', job)">
              <i class="fa fa-play" />
              <span>执行</span>
            </button>
            <button type="button" class="wb-job-card__action" @click.stop="emit('edit', job)">
              <i class="fa fa-cog" />
              <span>编辑</span>
            </button>
            <button type="button" class="wb-job-card__action wb-job-card__action--danger" @click.stop="emit('delete', job)">
              <i class="fa fa-trash" />
              <span>删除</span>
            </button>
            <el-dropdown trigger="hover" placement="bottom-end" @command="handleMoreCommand(job, $event)">
              <button type="button" class="wb-job-card__action wb-job-card__action--more" @click.stop>
                <i class="fa fa-ellipsis-h" />
              </button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="copy">
                    <i class="fa fa-copy wb-job-card__menu-icon" />
                    <span>复制</span>
                  </el-dropdown-item>
                  <el-dropdown-item command="history">
                    <i class="fa fa-history wb-job-card__menu-icon" />
                    <span>历史</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </article>
      </div>
      <el-empty v-else-if="!loading" :description="emptyText" :image-size="60" />
    </div>
  </el-drawer>
</template>

<style scoped lang="scss">
:deep(.el-drawer__header) {
  margin-bottom: 4px !important;
  padding: 16px 18px 0 !important;
}

:deep(.el-drawer__footer) {
  padding-top: 8px;
}

.wb-drawer-body {
  padding: 8px 14px 12px;
  min-height: 60px;
}

.wb-job-filter-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 10px;
  padding: 14px 16px 10px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 14px;
  background: var(--el-fill-color-extra-light);
  box-shadow: 0 14px 26px -24px rgba(15, 23, 42, 0.42);

  &__summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.wb-job-filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 0;
}

.wb-job-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(268px, 1fr));
  gap: 18px;
}

.wb-job-card {
  --wb-job-card-accent: var(--el-color-primary);
  display: flex;
  position: relative;
  flex-direction: column;
  justify-content: space-between;
  min-height: 138px;
  border: 1px solid var(--el-border-color);
  border-radius: 16px;
  background: var(--el-bg-color);
  overflow: hidden;
  box-shadow: 0 16px 32px -24px rgba(15, 23, 42, 0.45);
  transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, var(--wb-job-card-accent), rgba(255, 255, 255, 0));
  }

  &:hover {
    transform: translateY(-2px);
    border-color: var(--wb-job-card-accent);
    box-shadow: 0 22px 40px -28px rgba(15, 23, 42, 0.55);
  }

  &--rest {
    --wb-job-card-accent: var(--el-color-primary);
  }

  &--script {
    --wb-job-card-accent: var(--el-color-success);
  }

  &--command {
    --wb-job-card-accent: var(--el-color-warning);
  }

  &__body {
    padding: 12px 16px 14px;
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    gap: 8px;
    background: linear-gradient(180deg, var(--el-fill-color-light) 0%, var(--el-fill-color-extra-light) 100%);
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  &__meta-time {
    flex-shrink: 0;
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }

  &__name {
    font-size: 15px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    line-height: 1.5;
    width: 100%;
    text-align: left;
    word-break: break-word;
    min-height: calc(1.5em * 2);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr)) 52px;
    border-top: 1px solid var(--el-border-color);
    background: var(--el-fill-color-blank);
  }

  &__action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 40px;
    padding: 0 8px;
    border: none;
    border-right: 1px solid var(--el-border-color);
    background: transparent;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: var(--el-fill-color-extra-light);
      color: var(--wb-job-card-accent);
    }

    i {
      font-size: 12px;
    }
  }

  &__action--danger:hover {
    color: var(--el-color-danger);
  }

  &__action--more {
    width: 52px;
    border-right: none;
  }

  &__menu-icon {
    margin-right: 6px;
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

@media (max-width: 900px) {
  .wb-job-filter-panel__summary {
    flex-direction: column;
    align-items: flex-start;
  }

  .wb-job-card-grid {
    grid-template-columns: 1fr;
  }
}
</style>
