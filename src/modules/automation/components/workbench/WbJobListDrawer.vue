<script setup>
import { t } from '@/core/i18n'
import { message, messageRef } from '@/core/i18n/feedback'

import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { appTableList } from '@/modules/automation/api/jao'
import {
  getAutomationToolDescription,
  getAutomationToolTitle
} from '../../utils/resourcePresentation'
import { formatDateTime as formatDateTimeGlobal } from '../../utils/helpers'

const props = defineProps({
  title: { type: String, default: '' },
  filterType: { type: String, default: '' },
  reloadVersion: { type: Number, default: 0 }
})

const emit = defineEmits(['navigate', 'execute', 'edit', 'copy', 'history', 'delete'])
const visible = defineModel('visible', { default: false })

const loading = ref(false)
const loadError = messageRef('')
const jobs = ref([])
const searchLabels = ref(new Map())
let loadRequestId = 0
const filters = reactive({
  jobType: 'all',
  keyword: ''
})
const appliedFilters = reactive({
  jobType: 'all',
  keyword: ''
})

const TYPE_LABELS = { rest: 'REST', get script() { return t('automation.workbench.script') }, get command() { return t('automation.workbench.command') } }
const TYPE_TAGS = { rest: 'primary', script: 'success', command: 'warning' }
const filteredJobs = computed(() => {
  const keyword = appliedFilters.keyword.trim().toLowerCase()

  return jobs.value.filter(job => {
    if (appliedFilters.jobType !== 'all' && job.type !== appliedFilters.jobType) {
      return false
    }

    if (!keyword) return true

    return [job.title, searchLabels.value.get(job), job.updatedBy, job.createdBy]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(keyword))
  })
})

const hasActiveFilters = computed(
  () =>
    appliedFilters.jobType !== 'all' ||
    Boolean(appliedFilters.keyword)
)

const emptyText = computed(() =>
  jobs.value.length ? t('automation.workbench.noMatchingTools') : t('automation.workbench.noTools')
)

function typeLabel(type) {
  return TYPE_LABELS[type] || type || '-'
}

function typeTag(type) {
  return TYPE_TAGS[type] || 'info'
}

function jobTitle(job) {
  return getAutomationToolTitle(job)
}

function jobDescription(job) {
  return getAutomationToolDescription(job)
}

function handleMoreCommand(job, command) {
  if (!command) return
  emit(command, job)
}

function syncFilters(resetKeyword = true) {
  const defaultType = props.filterType || 'all'
  filters.jobType = defaultType
  appliedFilters.jobType = defaultType

  if (resetKeyword) {
    filters.keyword = ''
    appliedFilters.keyword = ''
  }
}

function handleSearch() {
  captureSearchLabels()
  appliedFilters.jobType = filters.jobType
  appliedFilters.keyword = filters.keyword.trim()
}

function captureSearchLabels() {
  searchLabels.value = new Map(jobs.value.map(job => [job, `${jobTitle(job)} ${jobDescription(job)}`]))
}

function handleReset() {
  syncFilters(true)
}

function formatDateTime(value) {
  return formatDateTimeGlobal(value, 'YYYY-MM-DD HH:mm')
}

async function loadJobs() {
  if (!visible.value) return
  const currentId = ++loadRequestId
  loading.value = true
  loadError.value = ''
  jobs.value = []
  searchLabels.value = new Map()
  try {
    const res = await appTableList({ appletCode: '' })
    if (currentId !== loadRequestId || !visible.value) return
    jobs.value = Array.isArray(res?.data) ? res.data : []
    captureSearchLabels()
  } catch {
    if (currentId !== loadRequestId) return
    loadError.value = message('automation.workbench.toolLoadFailedRetry')
    jobs.value = []
  } finally {
    if (currentId === loadRequestId) loading.value = false
  }
}

watch(
  () => visible.value,
  async isVisible => {
    if (!isVisible) {
      loadRequestId += 1
      loading.value = false
      return
    }
    syncFilters(true)
    handleSearch()
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
onBeforeUnmount(() => { loadRequestId += 1 })
</script>

<template>
  <el-drawer
    v-model="visible"
    :title="title || t('automation.workbench.toolList')"
    size="76%"
    destroy-on-close
    class="wb-workbench-drawer"
    :close-on-click-modal="true"
  >
    <template #footer>
      <div class="wb-drawer-footer">
        <span class="wb-drawer-footer__total">{{ t('automation.workbench.drawerToolCount', { count: filteredJobs.length }) }}</span>
        <el-button link size="small" @click="emit('navigate', '/jao/jobs')">
          {{ t('automation.workbench.manageInLibrary') }}
        </el-button>
      </div>
    </template>

    <div class="wb-drawer-body" v-loading="loading">
      <el-alert v-if="loadError" :title="loadError" type="error" show-icon :closable="false">
        <el-button link type="primary" @click="loadJobs">{{ t('common.retry') }}</el-button>
      </el-alert>
      <div class="wb-job-filter-panel">
        <el-form :model="filters" inline size="small" class="wb-job-filter-form" @submit.prevent>
          <el-form-item :label="t('automation.workbench.type')">
            <el-select
              v-model="filters.jobType"
              :placeholder="t('automation.workbench.allTypes')"
              style="width: 140px"
              @change="handleSearch"
            >
              <el-option :label="t('automation.workbench.allTypes')" value="all" />
              <el-option
                v-for="(label, value) in TYPE_LABELS"
                :key="value"
                :label="label"
                :value="value"
              />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('automation.workbench.keyword')">
            <el-input
              v-model="filters.keyword"
              :placeholder="t('automation.workbench.searchTool')"
              clearable
              style="width: 220px"
              @keyup.enter="handleSearch"
              @clear="handleSearch"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">{{ t('common.search') }}</el-button>
            <el-button @click="handleReset">{{ t('common.reset') }}</el-button>
          </el-form-item>
        </el-form>

        <div class="wb-job-filter-panel__summary">
          <span>{{ t('automation.workbench.filterCount', { filtered: filteredJobs.length, total: jobs.length }) }}</span>
          <el-button v-if="hasActiveFilters" link type="primary" size="small" @click="handleReset">
            {{ t('automation.workbench.clearFilters') }}
          </el-button>
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
              <el-tag :type="typeTag(job.type)" size="small" round>
                {{ typeLabel(job.type) }}
              </el-tag>
              <span class="wb-job-card__meta-time">
                {{ formatDateTime(job.updatedAt || job.createdAt) }}
              </span>
            </div>
            <span class="wb-job-card__name" :title="jobTitle(job)">{{ jobTitle(job) }}</span>
            <div class="wb-job-card__meta">
              <span>{{ t('automation.workbench.updatedBy', { name: job.updatedBy || job.createdBy || t('automation.workbench.notProvided') }) }}</span>
            </div>
            <span v-if="job.description" class="wb-job-card__description" :title="jobDescription(job)">{{ jobDescription(job) }}</span>
          </div>

          <div class="wb-job-card__actions">
            <button type="button" class="wb-job-card__action" @click.stop="emit('execute', job)">
              <i class="fa fa-play" />
              <span>{{ t('automation.workbench.execute') }}</span>
            </button>
            <button type="button" class="wb-job-card__action" @click.stop="emit('edit', job)">
              <i class="fa fa-cog" />
              <span>{{ t('automation.workbench.edit') }}</span>
            </button>
            <button
              type="button"
              class="wb-job-card__action wb-job-card__action--danger"
              @click.stop="emit('delete', job)"
            >
              <i class="fa fa-trash" />
              <span>{{ t('common.delete') }}</span>
            </button>
            <el-dropdown
              trigger="hover"
              placement="bottom-end"
              @command="handleMoreCommand(job, $event)"
            >
              <button
                type="button"
                class="wb-job-card__action wb-job-card__action--more"
                @click.stop
              >
                <i class="fa fa-ellipsis-h" />
              </button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="copy">
                    <i class="fa fa-copy wb-job-card__menu-icon" />
                    <span>{{ t('automation.workbench.copy') }}</span>
                  </el-dropdown-item>
                  <el-dropdown-item command="history">
                    <i class="fa fa-history wb-job-card__menu-icon" />
                    <span>{{ t('automation.workbench.history') }}</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </article>
      </div>
      <el-empty v-else-if="!loading && !loadError" :description="emptyText" :image-size="60" />
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
  gap: 20px;
}

.wb-job-card {
  --wb-job-card-accent: var(--el-color-primary);
  display: flex;
  position: relative;
  flex-direction: column;
  justify-content: space-between;
  min-height: 180px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  background: var(--el-bg-color);
  overflow: hidden;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.05),
    0 2px 4px -1px rgba(0, 0, 0, 0.03);
  transition:
    transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.25s,
    box-shadow 0.25s;

  &:hover {
    transform: translateY(-3px);
    border-color: var(--wb-job-card-accent);
    box-shadow:
      0 10px 25px -5px rgba(0, 0, 0, 0.08),
      0 8px 10px -6px rgba(0, 0, 0, 0.04);
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
    background: linear-gradient(180deg, rgba(248, 250, 252, 0.8) 0%, rgba(255, 255, 255, 1) 100%);
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
    font-size: 14px;
    font-weight: 700;
    color: var(--el-text-color-primary);
    line-height: 1.5;
    width: 100%;
    text-align: left;
    word-break: break-word;
    min-height: 1.45em;
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
    border-top: 1px solid #cbd5e1;
    background: #f8fafc;
  }

  &__meta { display: flex; flex-wrap: wrap; gap: 4px 12px; color: var(--el-text-color-secondary); font-size: 12px; }
  &__description, &__id { font-size: 12px; color: var(--el-text-color-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  &__action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 36px;
    padding: 0 8px;
    border: none;
    border-right: 1px solid #cbd5e1;
    background: transparent;
    color: var(--el-text-color-secondary);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s;

    &:hover {
      background: rgba(148, 163, 184, 0.05);
      color: var(--wb-job-card-accent);
    }

    i {
      font-size: 12px;
    }
  }

  &__action:first-child {
    border-bottom-left-radius: 11px;
  }

  &__action--danger:hover {
    color: var(--el-color-danger);
  }

  &__action--more {
    width: 52px;
    border-right: none;
    border-bottom-right-radius: 11px;
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
