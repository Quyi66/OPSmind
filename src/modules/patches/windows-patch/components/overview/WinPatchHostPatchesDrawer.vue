<template>
  <el-dialog
    v-model="visibleModel"
    title="主机补丁详情"
    width="1240px"
    top="4vh"
    destroy-on-close
    append-to-body
    :close-on-click-modal="false"
  >
    <div class="win-patch-host-dialog">
      <el-descriptions
        v-if="hostSummary"
        :column="2"
        border
        size="small"
        class="win-patch-descriptions"
      >
        <el-descriptions-item label="主机">
          {{ resolveHostKey(hostSummary) }}
        </el-descriptions-item>
        <el-descriptions-item label="主机 ID">
          {{ resolveHostId(hostSummary) || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="操作系统">
          {{ pickValue(hostSummary, ['osDistro', 'os_distro'], '-') }}
        </el-descriptions-item>
        <el-descriptions-item label="版本 / 架构">
          {{ pickValue(hostSummary, ['osVersion', 'os_version'], '-') }} /
          {{ pickValue(hostSummary, ['osArch', 'os_arch'], '-') }}
        </el-descriptions-item>
        <el-descriptions-item label="缺失补丁数">
          {{ pickValue(hostSummary, ['totalMissing', 'total_missing'], 0) }}
        </el-descriptions-item>
        <el-descriptions-item label="最后扫描时间">
          {{ formatDateTime(pickValue(hostSummary, ['lastScanDate', 'last_scan_date'], '')) }}
        </el-descriptions-item>
      </el-descriptions>

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
          已选 {{ installableSelection.length }} 条可安装记录
        </span>
        <span style="flex: 1"></span>
        <el-button
          class="toolbar-icon-btn"
          circle
          size="small"
          :loading="loading"
          @click="loadPatches()"
        >
          <el-icon v-show="!loading"><Refresh /></el-icon>
        </el-button>
      </div>

      <div class="ops-table-wrapper win-patch-host-table">
        <el-table
          v-loading="loading"
          :data="patchList"
          max-height="440"
          @selection-change="selection => (selectedRows = selection)"
        >
          <el-table-column type="selection" width="48" :selectable="isPatchInstallable" />
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
          <el-table-column label="关联 CVE" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">
              <template v-if="resolveCveIds(row).length">
                <el-tag
                  v-for="cveId in resolveCveIds(row)"
                  :key="cveId"
                  size="small"
                  effect="plain"
                  class="win-patch-cve-tag"
                >
                  {{ cveId }}
                </el-tag>
              </template>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="分类" min-width="150" show-overflow-tooltip>
            <template #default="{ row }">
              {{ pickValue(row, ['categoryName', 'category_name', 'classification'], '-') }}
            </template>
          </el-table-column>
          <el-table-column label="补丁状态" width="120">
            <template #default="{ row }">
              <el-tag :type="getPatchStatusTagType(row)" size="small">
                {{ getPatchStatusLabel(row) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="已忽略" width="90" align="center">
            <template #default="{ row }">
              <el-tag
                :type="
                  normalizeBoolean(pickValue(row, ['isIgnore', 'isIgnored', 'is_ignored'], false))
                    ? 'warning'
                    : 'info'
                "
                size="small"
                effect="plain"
              >
                {{
                  normalizeBoolean(pickValue(row, ['isIgnore', 'isIgnored', 'is_ignored'], false))
                    ? '是'
                    : '否'
                }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="扫描时间" width="190" class-name="win-patch-table__time-column">
            <template #default="{ row }">
              {{ formatDateTime(pickValue(row, ['scanDate', 'scan_date'], '')) }}
            </template>
          </el-table-column>
          <el-table-column label="安装时间" width="190" class-name="win-patch-table__time-column">
            <template #default="{ row }">
              {{ formatDateTime(pickValue(row, ['installDate', 'install_date'], '')) }}
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="ops-pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="WIN_PATCH_PAGE_SIZE_OPTIONS"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>

      <WinPatchInstallWizard
        v-model="installWizardVisible"
        :selected-rows="installableSelection"
        :host-summary="hostSummary"
        @submitted="handleInstallTaskCreated"
        @success="handleInstallSuccess"
      />
    </div>
  </el-dialog>
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
  normalizeBoolean,
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
  hostSummary: {
    type: Object,
    default: null
  },
  initialFilters: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'task-submitted'])

const visibleModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const loading = ref(false)
const patchList = ref([])
const selectedRows = ref([])
const installWizardVisible = ref(false)

const pagination = reactive({
  page: 1,
  pageSize: 50,
  total: 0
})

const filters = reactive({
  severity: '',
  patchStatus: '',
  keyword: ''
})

const installableSelection = computed(() =>
  selectedRows.value.filter(row => isPatchInstallable(row))
)

function resolveCveIds(row) {
  const raw = pickValue(row, ['cveIds', 'cve_ids'], '')
  if (Array.isArray(raw)) {
    return raw.map(item => String(item).trim()).filter(Boolean)
  }

  return String(raw)
    .split(/[,，;；\s]+/)
    .map(item => item.trim())
    .filter(Boolean)
}

function applyInitialFilters() {
  const initialFilters = props.initialFilters || {}

  filters.severity = String(initialFilters.severity || '').trim()
  filters.patchStatus = String(initialFilters.patchStatus || '').trim()
  filters.keyword = String(initialFilters.keyword || '').trim()
}

async function loadPatches(options = {}) {
  const hostId = resolveHostId(props.hostSummary)
  if (!hostId) return

  loading.value = !options.silent
  try {
    const response = await winPatchApi.getHostPatches(hostId, {
      page: pagination.page - 1,
      size: pagination.pageSize,
      severity: filters.severity || undefined,
      patchStatus: filters.patchStatus || undefined,
      keyword: filters.keyword || undefined
    })
    const page = parsePageResponse(response)
    patchList.value = page.content
    pagination.total = page.total
    selectedRows.value = []
  } catch (error) {
    console.error('加载主机补丁详情失败:', error)
    ElMessage.error('加载主机补丁详情失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  loadPatches()
}

function handleReset() {
  filters.severity = ''
  filters.patchStatus = ''
  filters.keyword = ''
  pagination.page = 1
  pagination.pageSize = 50
  loadPatches()
}

function handlePageChange(page) {
  pagination.page = page
  loadPatches()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  loadPatches()
}

function handleInstallTaskCreated(task) {
  emit('task-submitted', {
    ...(task || {}),
    openDetail: false,
    refreshOverview: false
  })
}

function handleInstallSuccess() {
  loadPatches({ silent: true })
}

watch(
  [() => props.modelValue, () => props.hostSummary, () => props.initialFilters],
  ([open, host]) => {
    if (!open || !host) return

    pagination.page = 1
    pagination.pageSize = 50
    applyInitialFilters()
    loadPatches()
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.win-patch-host-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  max-height: calc(90vh - 90px);
  overflow: hidden;
}

.win-patch-descriptions {
  margin-bottom: 12px;
}

.win-patch-selection-text {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.win-patch-cve-tag {
  margin: 0 4px 2px 0;
}

.win-patch-host-table {
  margin-top: 0;
  flex: 1 1 auto;
  min-height: 0;
}

:deep(.win-patch-table__time-column .cell) {
  white-space: nowrap;
}

@media (max-width: 1280px) {
  .win-patch-host-dialog {
    max-height: calc(92vh - 84px);
  }
}
</style>
