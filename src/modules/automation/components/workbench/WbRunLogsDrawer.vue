<template>
  <el-drawer
    v-model="visible"
    :title="title"
    size="88%"
    destroy-on-close
    class="wb-workbench-drawer wb-run-drawer"
  >
    <div class="wb-run-drawer__content">
      <div class="wb-filter-panel">
        <el-form :model="filters" inline size="small" class="wb-run-filters" @submit.prevent>
          <el-form-item label="时间范围">
            <el-select v-model="filters.day" style="width: 130px" @change="handleSearch">
              <el-option
                v-for="option in dayOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="filters.status" style="width: 130px" @change="handleSearch">
              <el-option
                v-for="option in statusOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="工具类型">
            <el-select
              v-model="filters.type"
              placeholder="全部类型"
              style="width: 160px"
              @change="handleSearch"
            >
              <el-option
                v-for="option in JOB_TYPE_OPTIONS"
                :key="option.value || 'all'"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="关键词" class="wb-run-filters__keyword">
            <el-input v-model="pageKeyword" placeholder="筛选本页：标题、用户、节点" clearable />
          </el-form-item>
          <el-form-item>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
      <el-alert v-if="loadError" :title="loadError" type="error" show-icon :closable="false">
        <el-button link type="primary" @click="loadRecords">重试</el-button>
      </el-alert>
      <el-table
        v-loading="drawerLoading"
        :data="displayRecords"
        height="100%"
        class="wb-run-drawer__table"
        :empty-text="loadError ? '记录未加载成功' : '暂无符合条件的运行记录'"
        @row-dblclick="$emit('open-result', $event)"
      >
        <el-table-column label="运维工具" min-width="230" show-overflow-tooltip>
          <template #default="{ row }">
            <el-button link type="primary" class="wb-run-title" @click="$emit('open-result', row)">
              {{ translateText(row.job_title) || row.job_title || '未命名运行' }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="工具类型" width="136">
          <template #default="{ row }">
            <el-tag size="small" :type="getWorkbenchJobType(row).tag" effect="light">
              {{ getWorkbenchJobType(row).label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="执行用户" width="110" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.username || '—' }}</span>
            <div v-if="row.review_user" class="wb-run-secondary">审核：{{ row.review_user }}</div>
          </template>
        </el-table-column>
        <el-table-column label="开始时间" width="172" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatDateTime(row.start_time) }}
          </template>
        </el-table-column>
        <el-table-column label="结束时间" width="172" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatDateTime(row.end_time) }}
          </template>
        </el-table-column>
        <el-table-column label="耗时" width="100">
          <template #default="{ row }">{{ formatRunDuration(row) }}</template>
        </el-table-column>
        <el-table-column label="执行节点" min-width="145" show-overflow-tooltip>
          <template #default="{ row }">{{ getRunNodes(row).join(', ') || '未提供' }}</template>
        </el-table-column>
        <el-table-column label="主机执行统计" min-width="220">
          <template #default="{ row }">
            <div v-if="getRunHostStats(row.stats_json).length" class="wb-run-stats">
              <span
                v-for="stat in getRunHostStats(row.stats_json)"
                :key="stat.key"
                :class="`wb-run-stats--${stat.tone}`"
              >
                {{ stat.label }}
                <b>{{ stat.count }}</b>
              </span>
            </div>
            <span v-else class="wb-run-secondary">未提供主机统计</span>
          </template>
        </el-table-column>
        <el-table-column
          label="状态"
          width="100"
          fixed="right"
          align="center"
          header-align="center"
        >
          <template #default="{ row }">
            <el-tag size="small" :type="getRunLogStatusType(row.status)">
              {{ getRunLogStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <template #footer>
      <div class="wb-drawer-footer">
        <div class="wb-run-secondary">
          <span>点击运维工具名称查看执行结果</span>
          <span v-if="pageKeyword">
            · 本页匹配 {{ displayRecords.length }} / {{ drawerRecords.length }} 条
          </span>
        </div>
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :total="drawerTotal"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          small
          @current-change="loadRecords"
          @size-change="handlePageSizeChange"
        />
        <el-button size="small" @click="$emit('navigate', resolvedLink)">{{ linkLabel }}</el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import * as jaoApi from '@/modules/automation/api/jao'
import { translateText } from '@/utils/i18n'
import { formatDateTime as formatDateTimeGlobal } from '../../utils/helpers'
import {
  getRunLogStatusLabel,
  getRunLogStatusType
} from '@/modules/automation/constants/runLogStatus'
import { JOB_TYPE_OPTIONS } from '@/modules/automation/stores/useJobStore'
import { useActiveTaskListPolling } from '@/composables/useActiveTaskListPolling'
import {
  getWorkbenchJobType,
  getRunNodes,
  getRunHostStats,
  formatRunDuration
} from '../../utils/workbenchPresentation'

const props = defineProps({
  title: { type: String, default: '运行记录' },
  reloadVersion: { type: Number, default: 0 },
  initialType: { type: String, default: '' },
  link: { type: String, default: '/run-records/logs' },
  linkLabel: { type: String, default: '查看完整记录' },
  failedOnly: Boolean
})
defineEmits(['open-result', 'navigate'])
const visible = defineModel('visible', { default: false })
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
const drawerLoading = ref(false)
const loadError = ref('')
const drawerRecords = ref([])
const drawerTotal = ref(0)
const pageKeyword = ref('')
const pagination = reactive({ page: 1, size: 20 })
const filters = reactive(defaultFilters())
const appliedFilters = reactive(defaultFilters())
let requestId = 0

function defaultFilters() {
  return { day: '0', status: props.failedOnly ? 'FAILED' : 'all', type: props.initialType }
}
const displayRecords = computed(() => {
  const keyword = pageKeyword.value.trim().toLowerCase()
  if (!keyword) return drawerRecords.value
  return drawerRecords.value.filter(row =>
    [
      translateText(row.job_title),
      row.job_title,
      row.username,
      row.review_user,
      ...getRunNodes(row),
      getWorkbenchJobType(row).label
    ]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(keyword))
  )
})
const resolvedLink = computed(() => {
  const query = new URLSearchParams({ day: appliedFilters.day, status: appliedFilters.status })
  if (appliedFilters.type) query.set('type', appliedFilters.type)
  return `${props.link.split('?')[0]}?${query}`
})
useActiveTaskListPolling({
  records: drawerRecords,
  refresh: () => loadRecords(true),
  enabled: () => visible.value && !loadError.value && !drawerLoading.value
})

function formatDateTime(value) {
  return value ? formatDateTimeGlobal(value, 'YYYY-MM-DD HH:mm:ss') : '—'
}
async function loadRecords(background = false) {
  const currentId = ++requestId
  if (background !== true) drawerLoading.value = true
  loadError.value = ''
  try {
    const response = await jaoApi.fetchJobRunLogs({
      params: { ...appliedFilters, job_id: '', run_ids: '' },
      page: pagination.page,
      size: pagination.size,
      orderBy: 'start_time desc'
    })
    if (currentId !== requestId || !visible.value) return
    const data = response?.data || response || {}
    drawerRecords.value = Array.isArray(data.records) ? data.records : []
    drawerTotal.value = Number(data.total ?? data.count ?? drawerRecords.value.length) || 0
  } catch {
    if (currentId !== requestId) return
    drawerRecords.value = []
    loadError.value = '运行记录加载失败，请重试。'
  } finally {
    if (currentId === requestId) drawerLoading.value = false
  }
}
function handleSearch() {
  Object.assign(appliedFilters, filters)
  pagination.page = 1
  drawerRecords.value = []
  drawerTotal.value = 0
  void loadRecords()
}
function handleReset() {
  Object.assign(filters, defaultFilters())
  pageKeyword.value = ''
  handleSearch()
}
function handlePageSizeChange() {
  pagination.page = 1
  void loadRecords()
}
watch(
  () => visible.value,
  isVisible => {
    requestId += 1
    if (!isVisible) {
      drawerLoading.value = false
      return
    }
    handleReset()
  }
)
watch(
  () => props.reloadVersion,
  () => {
    if (visible.value) void loadRecords(true)
  }
)
onBeforeUnmount(() => {
  requestId += 1
})
</script>

<style scoped lang="scss">
.wb-run-drawer__content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
}
.wb-filter-panel {
  padding: 12px 14px;
  flex-shrink: 0;
  overflow-x: auto;
  border: 1px solid var(--el-border-color-light);
  border-radius: 10px;
  background: var(--el-fill-color-extra-light);
}
.wb-filter-panel .wb-run-filters.el-form--inline {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0 16px;
}
.wb-filter-panel :deep(.wb-run-filters.el-form--inline .el-form-item) {
  flex-shrink: 0;
  margin: 0;
}
.wb-filter-panel :deep(.wb-run-filters.el-form--inline .wb-run-filters__keyword) {
  flex: 1 0 260px;
}
.wb-filter-panel
  :deep(.wb-run-filters.el-form--inline .wb-run-filters__keyword .el-form-item__content) {
  min-width: 0;
}
.wb-run-drawer__table {
  flex: 1;
  min-height: 0;
}
.wb-run-title {
  display: block;
  max-width: 100%;
  height: auto;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wb-run-secondary {
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wb-run-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 3px 10px;
  font-size: 12px;
  &--info {
    color: var(--el-text-color-regular);
  }
  &--success {
    color: var(--el-color-success);
  }
  &--danger {
    color: var(--el-color-danger);
  }
  &--warning {
    color: var(--el-color-warning);
  }
}
</style>
