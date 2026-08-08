<template>
  <el-drawer
    v-model="visible"
    :title="title"
    size="75%"
    destroy-on-close
    class="wb-workbench-drawer"
  >
    <div v-loading="mergedLoading" class="wb-drawer-body">
      <div class="wb-filter-panel">
        <el-form :model="filters" inline size="small" class="wb-filter-panel__form" @submit.prevent>
          <el-form-item label="时间范围">
            <el-select v-model="filters.day" style="width: 140px">
              <el-option
                v-for="option in dayOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="filters.status" style="width: 140px">
              <el-option
                v-for="option in statusOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="类型">
            <el-select v-model="filters.type" style="width: 140px">
              <el-option
                v-for="option in jobTypeOptions"
                :key="option.value || 'all'"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="关键词">
            <el-input
              v-model="filters.search"
              placeholder="搜索任务标题或节点"
              clearable
              style="width: 240px"
              @keyup.enter="handleSearch"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div v-if="filteredRecords.length" class="wb-drawer-run-list">
        <button
          v-for="item in filteredRecords"
          :key="item.id"
          type="button"
          class="wb-drawer-run-item"
          @click="$emit('open-result', item)"
        >
          <strong class="wb-drawer-run-item__name">
            {{ translateText(item.job_title) || '-' }}
          </strong>
          <span class="wb-drawer-run-item__user">{{ item.username || '-' }}</span>
          <span class="wb-drawer-run-item__time">{{ formatDateTime(item.start_time) }}</span>
          <span class="wb-drawer-run-item__node">{{ formatAnsibleNode(item.ata_url) }}</span>
          <span class="wb-drawer-run-item__detail">{{ formatStats(item.stats_json) }}</span>
          <el-tag
            class="wb-drawer-run-item__status"
            size="small"
            :type="statusType(item.status)"
            effect="plain"
          >
            {{ statusLabel(item.status) }}
          </el-tag>
        </button>
      </div>
      <el-empty v-else :description="resolvedEmptyText" :image-size="60" />
    </div>
    <template #footer>
      <div class="wb-drawer-footer">
        <span class="wb-drawer-footer__total">
          当前 {{ filteredRecords.length }} 条 / 共 {{ drawerTotal || total }} 条
        </span>
        <el-button size="small" @click="$emit('navigate', link)">{{ linkLabel }}</el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import * as jaoApi from '@/modules/automation/api/jao'
import { translateText } from '@/utils/i18n'
import { formatDateTime as formatDateTimeGlobal } from '../../utils/helpers'
import {
  getRunLogStatusLabel,
  getRunLogStatusType
} from '@/modules/automation/constants/runLogStatus'
import { JOB_TYPE_OPTIONS } from '@/modules/automation/stores/useJobStore'
import { useActiveTaskListPolling } from '@/composables/useActiveTaskListPolling'

const props = defineProps({
  title: { type: String, default: '运行记录' },
  records: { type: Array, default: () => [] },
  loading: Boolean,
  total: { type: Number, default: 0 },
  link: { type: String, default: '' },
  linkLabel: { type: String, default: '查看完整记录' },
  emptyText: { type: String, default: '暂无记录' },
  failedOnly: Boolean
})

defineEmits(['open-result', 'navigate'])

const visible = defineModel('visible', { default: false })
const DRAWER_PAGE_SIZE = 50
const VALID_TAG_TYPES = new Set(['primary', 'success', 'warning', 'info', 'danger'])
const dayOptions = [
  { label: '全部', value: '3650' },
  { label: '今天', value: '0' },
  { label: '最近7天', value: '7' },
  { label: '最近30天', value: '30' },
  { label: '最近一年', value: '365' }
]
const statusOptions = [
  { label: '全部状态', value: 'all' },
  { label: '等待中', value: 'WAITING' },
  { label: '正在运行', value: 'RUNNING' },
  { label: '回调', value: 'CALLBACK' },
  { label: '运行错误', value: 'ERROR' },
  { label: '运行失败', value: 'FAILED' },
  { label: '完成', value: 'COMPLETED' },
  { label: '运行终止', value: 'INTERRUPTED' }
]
const jobTypeOptions = JOB_TYPE_OPTIONS
const drawerLoading = ref(false)
const drawerRecords = ref([])
const drawerTotal = ref(0)
const filters = reactive(createDefaultFilters())

useActiveTaskListPolling({
  records: drawerRecords,
  refresh: loadRecords,
  enabled: () => visible.value
})

const mergedLoading = computed(() => props.loading || drawerLoading.value)
const hasActiveFilters = computed(
  () =>
    filters.day !== '0' ||
    normalizeStatus(filters.status) !== createDefaultFilters().status ||
    Boolean(filters.type) ||
    Boolean(filters.search.trim())
)

const filteredRecords = computed(() => {
  const keyword = filters.search.trim().toLowerCase()
  if (!keyword) return drawerRecords.value

  return drawerRecords.value.filter(item =>
    [
      translateText(item.job_title),
      item.job_title,
      item.username,
      item.review_user,
      item.ata_url,
      formatStats(item.stats_json),
      item.start_time
    ]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(keyword))
  )
})

const resolvedEmptyText = computed(() =>
  hasActiveFilters.value ? '没有符合筛选条件的记录' : props.emptyText
)

function createDefaultFilters() {
  return {
    day: '0',
    status: props.failedOnly ? 'FAILED' : 'all',
    type: '',
    search: ''
  }
}

function ensureTagType(type) {
  return VALID_TAG_TYPES.has(type) ? type : 'info'
}

function statusType(status) {
  if (props.failedOnly && !status) return ensureTagType(getRunLogStatusType('FAILED'))
  return ensureTagType(getRunLogStatusType(status))
}

function statusLabel(status) {
  if (props.failedOnly && !status) return getRunLogStatusLabel('FAILED')
  return getRunLogStatusLabel(status)
}

function formatAnsibleNode(ataUrl) {
  if (!ataUrl) return '-'
  const nodes = String(ataUrl)
    .split(',')
    .map(ip => ip.trim())
    .filter(Boolean)
  return nodes.join(', ') || '-'
}

function formatStats(statsJson) {
  if (!statsJson) return '-'
  try {
    const stats = typeof statsJson === 'string' ? JSON.parse(statsJson) : statsJson
    const parts = []
    if (stats?.totalHosts) parts.push(`总数:${stats.totalHosts}`)
    if (stats?.okHosts) parts.push(`成功:${stats.okHosts}`)
    if (stats?.failedHosts) parts.push(`失败:${stats.failedHosts}`)
    if (stats?.unreachableHosts) parts.push(`不可达:${stats.unreachableHosts}`)
    return parts.join(' | ') || '-'
  } catch {
    return '-'
  }
}

function formatDateTime(value) {
  return formatDateTimeGlobal(value, 'MM-DD HH:mm')
}

function normalizeStatus(status) {
  if (props.failedOnly && !status) return 'FAILED'
  return (
    String(status || '')
      .trim()
      .toUpperCase() || 'all'
  )
}

function createPayload() {
  return {
    params: {
      day: filters.day,
      job_id: '',
      type: filters.type,
      run_ids: '',
      status: normalizeStatus(filters.status)
    },
    size: DRAWER_PAGE_SIZE,
    page: 1,
    orderBy: 'start_time desc'
  }
}

async function loadRecords() {
  drawerLoading.value = true
  try {
    const response = await jaoApi.fetchJobRunLogs(createPayload())
    const data = response?.data || response || {}
    drawerRecords.value = Array.isArray(data.records) ? data.records : []
    drawerTotal.value = Number(data.total ?? data.count ?? drawerRecords.value.length ?? 0) || 0
  } catch {
    drawerRecords.value = Array.isArray(props.records) ? props.records : []
    drawerTotal.value = Number(props.total ?? drawerRecords.value.length ?? 0) || 0
  } finally {
    drawerLoading.value = false
  }
}

async function handleSearch() {
  await loadRecords()
}

async function handleReset() {
  Object.assign(filters, createDefaultFilters())
  drawerRecords.value = Array.isArray(props.records) ? props.records : []
  drawerTotal.value = Number(props.total ?? drawerRecords.value.length ?? 0) || 0
  await loadRecords()
}

watch(
  () => visible.value,
  async isVisible => {
    if (!isVisible) return
    drawerRecords.value = Array.isArray(props.records) ? props.records : []
    drawerTotal.value = Number(props.total ?? drawerRecords.value.length ?? 0) || 0
    await handleReset()
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

.wb-drawer-run-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.wb-drawer-run-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 90px 112px 170px 200px 84px;
  align-items: center;
  column-gap: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
  width: 100%;

  &:hover {
    background: #f8fafc;
    border-color: #e2e8f0;
  }

  &__name {
    font-size: 13px;
    font-weight: 500;
    color: var(--wb-text-primary);
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__user,
  &__time,
  &__node,
  &__detail {
    font-size: 13px;
    color: var(--wb-text-muted);
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__status {
    justify-self: start;
  }
}

@media (max-width: 1280px) {
  .wb-drawer-run-item {
    grid-template-columns: minmax(0, 1fr) 76px 100px 130px 160px 72px;
  }
}

@media (max-width: 900px) {
  .wb-drawer-run-item {
    grid-template-columns: minmax(0, 1fr);
    row-gap: 4px;
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
html.dark .wb-drawer-run-item:hover {
  background: #273549;
  border-color: #334155;
}
</style>
