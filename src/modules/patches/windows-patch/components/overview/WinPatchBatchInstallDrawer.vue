<template>
  <el-drawer
    v-model="visibleModel"
    title="批量安装补丁"
    direction="rtl"
    size="85%"
    destroy-on-close
    append-to-body
    class="win-patch-batch-install-drawer"
    :close-on-click-modal="false"
  >
    <div class="win-patch-batch-install-dialog">
      <div class="win-patch-batch-hosts-summary">
        <el-descriptions :column="1" border size="small" class="win-patch-descriptions">
          <el-descriptions-item label="选中主机">
            <div class="win-patch-batch-hosts-list">
              <el-tag
                v-for="host in hostSummaries"
                :key="resolveHostId(host)"
                size="small"
                effect="plain"
              >
                {{ resolveHostKey(host) }}
              </el-tag>
            </div>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <div class="ops-filter-bar">
        <el-form :inline="true" size="small">
          <el-form-item label="严重级别">
            <el-select v-model="filters.severity" clearable placeholder="全部" style="width: 140px">
              <el-option
                v-for="item in WIN_PATCH_SEVERITY_OPTIONS"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="补丁状态">
            <el-select
              v-model="filters.patchStatus"
              clearable
              placeholder="全部"
              style="width: 140px"
            >
              <el-option
                v-for="item in WIN_PATCH_STATUS_OPTIONS"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="关键字">
            <el-input
              v-model="filters.keyword"
              placeholder="按 KB 编号或标题过滤"
              clearable
              style="width: 220px"
              @keyup.enter="handleSearch"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="loading" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="ops-action-bar">
        <el-button
          type="primary"
          size="small"
          :disabled="installableSelection.length === 0"
          @click="installWizardVisible = true"
        >
          安装选中补丁
        </el-button>
        <span class="win-patch-selection-text">
          已选 {{ installableSelection.length }} 条可安装补丁
        </span>
        <span style="flex: 1"></span>
        <el-button
          class="toolbar-icon-btn"
          circle
          size="small"
          :loading="loading"
          @click="loadAllPatches()"
        >
          <el-icon v-show="!loading"><Refresh /></el-icon>
        </el-button>
      </div>

      <div class="ops-table-wrapper win-patch-batch-table">
        <el-table
          v-loading="loading"
          :data="pagedPatchList"
          height="100%"
          @selection-change="selection => (selectedRows = selection)"
        >
          <el-table-column type="selection" width="48" :selectable="isPatchActionable" />
          <el-table-column label="主机" width="130">
            <template #default="{ row }">
              {{ row._hostKey || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="KB 编号" width="130">
            <template #default="{ row }">
              {{ pickValue(row, ['kbNumber', 'kb_number'], '-') }}
            </template>
          </el-table-column>
          <el-table-column label="标题" min-width="280" show-overflow-tooltip>
            <template #default="{ row }">
              {{ pickValue(row, ['title'], '-') }}
            </template>
          </el-table-column>
          <el-table-column label="大小" width="110">
            <template #default="{ row }">
              {{ formatBytes(pickValue(row, ['sizeBytes', 'size_bytes'], 0)) }}
            </template>
          </el-table-column>
          <el-table-column label="严重级别" width="120">
            <template #default="{ row }">
              <el-tag
                :type="getSeverityTagType(pickValue(row, ['severity']))"
                size="small"
                effect="plain"
              >
                {{ getSeverityLabel(pickValue(row, ['severity'], '')) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="补丁状态" width="120">
            <template #default="{ row }">
              <el-tag :type="getPatchStatusTagType(row)" size="small">
                {{ getPatchStatusLabel(row) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="扫描时间" width="190" class-name="win-patch-table__time-column">
            <template #default="{ row }">
              {{ formatDateTime(pickValue(row, ['scanDate', 'scan_date'], '')) }}
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="ops-pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="WIN_PATCH_PAGE_SIZE_OPTIONS"
          :total="filteredPatchList.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>

      <WinPatchInstallWizard
        v-model="installWizardVisible"
        :selected-rows="installableSelection"
        :host-summary="null"
        :host-summaries="hostSummaries"
        @submitted="handleInstallTaskCreated"
        @success="handleInstallSuccess"
      />
    </div>
  </el-drawer>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import WinPatchInstallWizard from '../install-wizard/WinPatchInstallWizard.vue'
import { winPatchApi } from '../../api'
import {
  WIN_PATCH_PAGE_SIZE_OPTIONS,
  WIN_PATCH_SEVERITY_OPTIONS,
  WIN_PATCH_STATUS_OPTIONS
} from '../../constants'
import {
  formatDateTime,
  getPatchStatusLabel,
  getPatchStatusTagType,
  getSeverityLabel,
  getSeverityTagType,
  isPatchInstallable,
  normalizeUpper,
  parsePageResponse,
  pickValue,
  resolveHostId,
  resolveHostKey
} from '../../utils'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  hostSummaries: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'task-submitted'])

const visibleModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const loading = ref(false)
const allPatchList = ref([])
const selectedRows = ref([])
const installWizardVisible = ref(false)

const pagination = reactive({
  page: 1,
  pageSize: 50
})

const filters = reactive({
  severity: '',
  patchStatus: '',
  keyword: ''
})

const filteredPatchList = computed(() => {
  let list = allPatchList.value

  if (filters.severity) {
    list = list.filter(
      row => normalizeUpper(pickValue(row, ['severity'], '')) === normalizeUpper(filters.severity)
    )
  }

  if (filters.patchStatus) {
    list = list.filter(
      row =>
        normalizeUpper(pickValue(row, ['patchStatus', 'patch_status'], '')) ===
        normalizeUpper(filters.patchStatus)
    )
  }

  if (filters.keyword) {
    const keyword = filters.keyword.toLowerCase()
    list = list.filter(row => {
      const kb = String(pickValue(row, ['kbNumber', 'kb_number'], '')).toLowerCase()
      const title = String(pickValue(row, ['title'], '')).toLowerCase()
      return kb.includes(keyword) || title.includes(keyword)
    })
  }

  return list
})

const pagedPatchList = computed(() => {
  const start = (pagination.page - 1) * pagination.pageSize
  return filteredPatchList.value.slice(start, start + pagination.pageSize)
})

const installableSelection = computed(() =>
  selectedRows.value.filter(row => isPatchInstallable(row))
)

function isPatchActionable(row) {
  return isPatchInstallable(row)
}

function formatBytes(value) {
  const size = Number(value)
  if (!Number.isFinite(size) || size <= 0) return '-'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let current = size
  let index = 0

  while (current >= 1024 && index < units.length - 1) {
    current /= 1024
    index += 1
  }

  return `${current.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

async function loadAllPatches() {
  const hosts = props.hostSummaries
  if (!hosts.length) return

  loading.value = true
  try {
    const results = await Promise.allSettled(
      hosts.map(host => {
        const hostId = resolveHostId(host)
        const hostKey = resolveHostKey(host)
        return winPatchApi
          .getHostPatches(hostId, { page: 0, size: 9999 })
          .then(response => {
            const page = parsePageResponse(response)
            return page.content.map(patch => ({
              ...patch,
              hostId: patch.hostId || patch.host_id || hostId,
              _hostKey: hostKey
            }))
          })
      })
    )

    const mergedPatches = results.flatMap(result =>
      result.status === 'fulfilled' ? result.value : []
    )

    const failedCount = results.filter(r => r.status === 'rejected').length
    if (failedCount > 0 && failedCount < hosts.length) {
      ElMessage.warning(`${failedCount} 台主机的补丁加载失败，已展示其余主机的补丁`)
    } else if (failedCount === hosts.length) {
      ElMessage.error('所有主机的补丁加载失败')
    }

    allPatchList.value = mergedPatches
    selectedRows.value = []
    pagination.page = 1
  } catch (error) {
    console.error('批量加载主机补丁失败:', error)
    ElMessage.error('批量加载主机补丁失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  selectedRows.value = []
}

function handleReset() {
  filters.severity = ''
  filters.patchStatus = ''
  filters.keyword = ''
  pagination.page = 1
  selectedRows.value = []
}

function handlePageChange(page) {
  pagination.page = page
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
}

function handleInstallTaskCreated(task) {
  emit('task-submitted', {
    ...(task || {}),
    openDetail: false,
    refreshOverview: false
  })
}

function handleInstallSuccess() {
  loadAllPatches()
}

watch(
  [() => props.modelValue, () => props.hostSummaries],
  ([open, hosts]) => {
    if (!open || !hosts?.length) return

    pagination.page = 1
    pagination.pageSize = 50
    filters.severity = ''
    filters.patchStatus = ''
    filters.keyword = ''
    loadAllPatches()
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.win-patch-batch-install-drawer {
  :deep(.el-drawer__header) {
    margin-bottom: 0;
    padding: 16px 20px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  :deep(.el-drawer__body) {
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 16px 20px;
    overflow: hidden;
  }
}

.win-patch-batch-install-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.win-patch-descriptions {
  margin-bottom: 0;
  flex: 0 0 auto;
}

.win-patch-batch-hosts-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 2px 0;
}

.win-patch-selection-text {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.win-patch-batch-table {
  margin-top: 0;
  flex: 1 1 auto;
  min-height: 0;
}

:deep(.win-patch-table__time-column .cell) {
  white-space: nowrap;
}
</style>
