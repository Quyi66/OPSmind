<template>
  <div class="win-patch-yum-compare">
    <div class="win-patch-yum-form-card">
      <el-form label-width="60px" class="win-patch-filter-form" @submit.prevent>
        <div class="win-patch-filter-row">
          <el-form-item label="仓库" class="win-patch-filter-item">
            <el-select
              v-model="selectedRepoModel"
              clearable
              filterable
              placeholder="请选择仓库"
              style="width: 350px"
            >
              <el-option
                v-for="item in compareRepoOptions"
                :key="resolveYumRepoId(item)"
                :label="getYumRepoLabel(item)"
                :value="resolveYumRepoId(item)"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="OS" class="win-patch-filter-item">
            <el-select
              v-model="form.osFamily"
              filterable
              allow-create
              default-first-option
              clearable
              placeholder="可选，用于过滤补丁影响的 OS"
              style="width: 250px"
            >
              <el-option
                v-for="item in YUM_REPO_OS_FAMILY_OPTIONS"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <div class="win-patch-filter-actions">
            <el-button type="primary" :loading="comparing" :disabled="!canCompare" @click="handleCompare">{{ compareActionLabel }}</el-button>
            <el-button @click="handleReset">重置</el-button>
          </div>
          <div v-if="selectedSourceOverview" class="win-patch-filter-status">
            <el-tag :type="getCollectStatusTagType(selectedSourceOverview)" effect="plain">
              {{ getCollectStatusLabel(selectedSourceOverview) }}
            </el-tag>
          </div>
        </div>
      </el-form>
    </div>

    <div v-if="!selectedSourceOverview" class="win-patch-yum-empty">
      <el-empty description="请选择仓库后查看补丁比对结果" />
    </div>

    <template v-else>
      <el-alert
        v-if="selectedSourceHint"
        :title="selectedSourceHint"
        type="info"
        :closable="false"
        show-icon
      />

      <div v-if="diffRunId" class="win-patch-yum-section">
        <div class="win-patch-yum-section__header">
          <div class="win-patch-yum-section__title">补丁视图</div>
        </div>

        <div class="win-patch-yum-patch-filter-bar">
          <el-input
            v-model="patchViewFilters.keyword"
            clearable
            placeholder="搜索补丁 ID 或补丁标题"
            class="win-patch-yum-patch-filter-bar__keyword"
            @keyup.enter="handlePatchViewSearch"
            @clear="handlePatchViewSearch"
          />
          <el-select
            v-model="patchViewFilters.status"
            clearable
            placeholder="全部状态"
            class="win-patch-yum-patch-filter-bar__status"
            @change="handlePatchViewFilterChange"
          >
            <el-option
              v-for="item in PATCH_VIEW_STATUS_OPTIONS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
          <div class="win-patch-yum-patch-filter-bar__actions">
            <el-button type="primary" plain @click="handlePatchViewSearch">搜索</el-button>
            <el-button @click="handlePatchViewReset">清空筛选</el-button>
          </div>
        </div>

        <div class="ops-table-wrapper">
          <el-table
            v-loading="loadingPatchView"
            :data="patchViewList"
            row-key="patchId"
            max-height="calc(100vh - 600px)"
            :empty-text="patchViewEmptyText"
          >
            <el-table-column label="补丁 ID" min-width="170" show-overflow-tooltip>
              <template #default="{ row }">
                {{ pickValue(row, ['patchId', 'patch_id'], '-') }}
              </template>
            </el-table-column>
            <el-table-column label="补丁标题" min-width="260" show-overflow-tooltip>
              <template #default="{ row }">
                {{ pickValue(row, ['patchTitle', 'patch_title'], '-') }}
              </template>
            </el-table-column>
            <el-table-column label="严重等级" width="120" align="center">
              <template #default="{ row }">
                <el-tag size="small" effect="plain" :type="getSeverityTagType(pickValue(row, ['severity'], ''))">
                  {{ getSeverityLabel(pickValue(row, ['severity'], '-')) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="110" align="center">
              <template #default="{ row }">
                <el-tag size="small" :type="getPatchSatisfiedTagType(row)">
                  {{ getPatchSatisfiedLabel(row) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="影响主机" width="110" align="center">
              <template #default="{ row }">
                {{ pickValue(row, ['affectedHostCount', 'affected_host_count'], 0) }}
              </template>
            </el-table-column>
            <el-table-column label="总包数" width="90" align="center">
              <template #default="{ row }">
                {{ pickValue(row, ['totalPkgs', 'total_pkgs'], 0) }}
              </template>
            </el-table-column>
            <el-table-column label="满足" width="90" align="center">
              <template #default="{ row }">
                {{ pickValue(row, ['availableCount', 'available_count'], 0) }}
              </template>
            </el-table-column>
            <el-table-column label="缺失" width="90" align="center">
              <template #default="{ row }">
                {{ pickValue(row, ['missingCount', 'missing_count'], 0) }}
              </template>
            </el-table-column>
            <el-table-column label="版本不足" width="100" align="center">
              <template #default="{ row }">
                {{ pickValue(row, ['outdatedCount', 'outdated_count'], 0) }}
              </template>
            </el-table-column>
            <el-table-column label="发行版不匹配" width="130" align="center">
              <template #default="{ row }">
                {{ pickValue(row, ['releaseMismatchCount', 'release_mismatch_count'], 0) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="90" fixed="right" align="center">
              <template #default="{ row }">
                <el-button text type="primary" size="small" @click="handleOpenDetail(row)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="ops-pagination-wrapper">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :page-sizes="YUM_REPO_PAGE_SIZE_OPTIONS"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </div>

      <div v-else class="win-patch-yum-empty">
        <el-empty description="当前仓库暂无补丁比对结果，可等待自动比对完成；如长时间未出现可手动重试" />
      </div>
    </template>

    <WinPatchYumRepoPatchDetailDialog v-model="detailDialogVisible" :patch="detailPatch" />
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import WinPatchYumRepoPatchDetailDialog from './WinPatchYumRepoPatchDetailDialog.vue'
import {
  getSeverityLabel,
  getSeverityTagType,
  normalizeBoolean,
  parsePageResponse,
  pickValue
} from '../../utils'
import { YUM_REPO_OS_FAMILY_OPTIONS, YUM_REPO_PAGE_SIZE_OPTIONS } from '../../yumRepoConstants'
import { yumRepoApi } from '../../yumRepoApi'
import {
  getCollectStatusLabel,
  getCollectStatusTagType,
  getYumRepoLabel,
  resolveYumRepoId,
  unwrapResponse
} from '../../yumRepoUtils'

const props = defineProps({
  active: {
    type: Boolean,
    default: false
  },
  repos: {
    type: Array,
    default: () => []
  },
  overviewData: {
    type: Object,
    default: null
  },
  selectedRepoId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:selectedRepoId', 'refresh-overview'])

const selectedRepoModel = computed({
  get: () => props.selectedRepoId,
  set: value => emit('update:selectedRepoId', String(value || '').trim())
})

const form = reactive({
  osFamily: ''
})

const comparing = ref(false)
const loadingPatchView = ref(false)
const diffRunId = ref('')
const patchViewList = ref([])
const detailDialogVisible = ref(false)
const detailPatch = ref(null)
const resultContextId = ref(0)
const compareRequestId = ref(0)
const patchViewRequestId = ref(0)

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const patchViewFilters = reactive({
  keyword: '',
  status: ''
})

const PATCH_VIEW_STATUS_OPTIONS = [
  { label: '仅满足', value: 'SATISFIED' },
  { label: '仅不满足', value: 'NOT_SATISFIED' }
]

const overviewSources = computed(() => {
  const data = unwrapResponse(props.overviewData)
  return Array.isArray(data?.sources) ? data.sources : []
})

const compareRepoOptions = computed(() => (overviewSources.value.length ? overviewSources.value : props.repos))

const selectedSourceOverview = computed(() => {
  return overviewSources.value.find(item => resolveYumRepoId(item) === String(selectedRepoModel.value || '').trim()) || null
})

const summaryData = computed(() => selectedSourceOverview.value?.summary || null)

const canCompare = computed(() => {
  if (!selectedRepoModel.value) return false
  if (!selectedSourceOverview.value) return true
  const status = String(pickValue(selectedSourceOverview.value, ['collectStatus', 'collect_status'], '')).trim()
  return status === '' || status === 'SUCCESS'
})

const compareActionLabel = computed(() => {
  return diffRunId.value || selectedSourceOverview.value?.diffRunId ? '重新执行比对' : '手动执行比对'
})

const patchViewEmptyText = computed(() => {
  return patchViewFilters.status || patchViewFilters.keyword
    ? '当前筛选条件下暂无补丁结果'
    : '暂无补丁比对结果'
})

const selectedSourceHint = computed(() => {
  if (!selectedSourceOverview.value) return ''
  if (!summaryData.value) {
    return getOverviewHint(selectedSourceOverview.value)
  }
  return ''
})

function getCurrentRepoId() {
  return String(selectedRepoModel.value || '').trim()
}

function isCompareRequestCurrent(requestId, contextId, repoId) {
  return requestId === compareRequestId.value
    && contextId === resultContextId.value
    && repoId === getCurrentRepoId()
}

function isPatchViewRequestCurrent(requestId, contextId, repoId, currentDiffRunId) {
  return requestId === patchViewRequestId.value
    && contextId === resultContextId.value
    && repoId === getCurrentRepoId()
    && currentDiffRunId === String(diffRunId.value || '').trim()
}

async function syncSelectedRepoResult(options = {}) {
  clearResult()

  if (!props.active || !selectedRepoModel.value) {
    return
  }

  const nextDiffRunId = String(selectedSourceOverview.value?.diffRunId || '').trim()

  if (nextDiffRunId) {
    diffRunId.value = nextDiffRunId
    await loadPatchView({ silent: true })
  }
}

function clearResult() {
  resultContextId.value += 1
  comparing.value = false
  loadingPatchView.value = false
  diffRunId.value = ''
  patchViewList.value = []
  detailDialogVisible.value = false
  detailPatch.value = null
  patchViewFilters.keyword = ''
  patchViewFilters.status = ''
  pagination.page = 1
  pagination.pageSize = 20
  pagination.total = 0
}

async function loadPatchView(options = {}) {
  const currentDiffRunId = String(diffRunId.value || '').trim()
  const repoId = getCurrentRepoId()
  if (!props.active || !currentDiffRunId) return

  const requestId = ++patchViewRequestId.value
  const contextId = options.contextId ?? resultContextId.value

  loadingPatchView.value = !options.silent
  try {
    const response = await yumRepoApi.getComparePatchView(currentDiffRunId, {
      diffRunId: currentDiffRunId,
      keyword: patchViewFilters.keyword || undefined,
      status: patchViewFilters.status || undefined,
      page: pagination.page - 1,
      size: pagination.pageSize
    })

    if (!isPatchViewRequestCurrent(requestId, contextId, repoId, currentDiffRunId)) {
      return
    }

    const page = parsePageResponse(response)
    patchViewList.value = page.content
    pagination.total = page.total
  } catch (error) {
    if (!options.silent && isPatchViewRequestCurrent(requestId, contextId, repoId, currentDiffRunId)) {
      console.error('加载补丁视图失败:', error)
      ElMessage.error('加载补丁视图失败')
    }
  } finally {
    if (isPatchViewRequestCurrent(requestId, contextId, repoId, currentDiffRunId)) {
      loadingPatchView.value = false
    }
  }
}

async function handleCompare(options = {}) {
  const repoId = getCurrentRepoId()
  if (!repoId) {
    ElMessage.warning('请先选择仓库')
    return
  }

  if (!canCompare.value) {
    ElMessage.warning('当前仓库尚未采集成功，请先完成采集')
    return
  }

  const requestId = ++compareRequestId.value
  const contextId = resultContextId.value
  comparing.value = true
  try {
    const response = await yumRepoApi.compareScannedPatches({
      sourceId: repoId,
      osFamily: form.osFamily || undefined
    })

    if (!isCompareRequestCurrent(requestId, contextId, repoId)) {
      return
    }

    const data = unwrapResponse(response)

    diffRunId.value = String(data?.diffRunId || '').trim()
    patchViewFilters.keyword = ''
    patchViewFilters.status = ''
    pagination.page = 1
    pagination.pageSize = 20

    emit('refresh-overview')

    if (diffRunId.value) {
      await loadPatchView({ contextId })
    }

    if (!options.silentSuccess) {
      ElMessage.success('补丁比对已完成')
    }
  } catch (error) {
    if (isCompareRequestCurrent(requestId, contextId, repoId)) {
      console.error('执行补丁比对失败:', error)
      ElMessage.error('执行补丁比对失败')
    }
  } finally {
    if (isCompareRequestCurrent(requestId, contextId, repoId)) {
      comparing.value = false
    }
  }
}

function handleReset() {
  form.osFamily = ''
  if (selectedSourceOverview.value?.diffRunId) {
    diffRunId.value = String(selectedSourceOverview.value.diffRunId || '').trim()
    loadPatchView({ silent: true })
    return
  }
  clearResult()
}

function handlePageChange(page) {
  pagination.page = page
  loadPatchView()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  loadPatchView()
}

async function handlePatchViewSearch() {
  pagination.page = 1
  await loadPatchView()
}

async function handlePatchViewFilterChange() {
  pagination.page = 1
  await loadPatchView()
}

async function handlePatchViewReset() {
  patchViewFilters.keyword = ''
  patchViewFilters.status = ''
  pagination.page = 1
  await loadPatchView()
}

function getPatchSatisfiedTagType(row) {
  return normalizeBoolean(pickValue(row, ['satisfied'], false)) ? 'success' : 'danger'
}

function getPatchSatisfiedLabel(row) {
  return normalizeBoolean(pickValue(row, ['satisfied'], false)) ? '满足' : '不满足'
}

function handleOpenDetail(row) {
  detailPatch.value = row || null
  detailDialogVisible.value = true
}

function getOverviewHint(row) {
  const status = String(pickValue(row, ['collectStatus', 'collect_status'], '')).trim()
  if (!status || status === 'NOT_COLLECTED' || status === 'UNCOLLECTED') {
    return '尚未采集'
  }
  if (status === 'FAILED') {
    return '最近一次采集失败，请先重新采集'
  }
  if (status === 'PENDING' || status === 'RUNNING') {
    return '采集中，采集成功后会自动继续比对'
  }
  return '采集已完成，正在自动生成比对结果；如长时间未出现可手动重试'
}

watch(
  () => selectedRepoModel.value,
  async () => {
    await syncSelectedRepoResult()
  },
  { immediate: true }
)

watch(
  () => props.active,
  async value => {
    if (!value) {
      return
    }

    await syncSelectedRepoResult()
  },
  { immediate: true }
)

watch(
  () => selectedSourceOverview.value?.diffRunId,
  async value => {
    const nextDiffRunId = String(value || '').trim()
    if (!props.active || comparing.value) {
      return
    }

    if (!selectedRepoModel.value || !nextDiffRunId || nextDiffRunId === diffRunId.value) {
      return
    }

    diffRunId.value = nextDiffRunId
    await loadPatchView({ silent: true })
  }
)

watch(
  () => detailDialogVisible.value,
  value => {
    if (!value) {
      detailPatch.value = null
    }
  }
)
</script>

<style scoped lang="scss">
.win-patch-yum-compare {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.win-patch-yum-form-card {
  padding: 14px 16px 2px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  background: linear-gradient(180deg, var(--el-fill-color-lighter), var(--el-bg-color));
  box-shadow: 0 6px 16px color-mix(in srgb, var(--el-text-color-primary) 8%, transparent 92%);
}

.win-patch-filter-form {
  width: 100%;
}

.win-patch-filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.win-patch-filter-item {
  margin-bottom: 10px;
}

.win-patch-filter-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 12px;
  margin-bottom: 10px;
}

.win-patch-filter-status {
  margin-bottom: 10px;
}

.win-patch-yum-empty {
  display: flex;
  justify-content: center;
  padding: 40px 0 20px;
}

.win-patch-yum-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.win-patch-yum-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.win-patch-yum-section__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.win-patch-yum-patch-filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: color-mix(in srgb, var(--el-fill-color-lighter) 70%, white 30%);
}

.win-patch-yum-patch-filter-bar__keyword {
  width: 320px;
}

.win-patch-yum-patch-filter-bar__status {
  width: 180px;
}

.win-patch-yum-patch-filter-bar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 960px) {
  .win-patch-filter-actions {
    width: 100%;
    margin-left: 0;
  }

  .win-patch-filter-status,
  .win-patch-yum-patch-filter-bar__keyword,
  .win-patch-yum-patch-filter-bar__status,
  .win-patch-yum-patch-filter-bar__actions {
    width: 100%;
  }
}
</style>
