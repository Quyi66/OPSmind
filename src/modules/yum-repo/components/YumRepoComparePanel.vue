<template>
  <div class="win-patch-yum-compare" :class="{ 'is-english': isEnglish }">
    <div class="win-patch-yum-form-card">
      <el-form :label-width="isEnglish ? 'auto' : '60px'" class="win-patch-filter-form" @submit.prevent>
        <div class="win-patch-filter-row">
          <el-form-item :label="t('yumRepo.repository')" class="win-patch-filter-item">
            <el-select
              v-model="compareSelectedRepoModel"
              clearable
              filterable
              :placeholder="t('yumRepo.selectRepo')"
              style="width: 350px" @change="handleCompare">
              <el-option
                v-for="item in compareRepoOptions"
                :key="resolveYumConfigId(item)"
                :label="getYumConfigCompareLabel(item)"
                :value="resolveYumConfigId(item)"
              />
            </el-select>
          </el-form-item>
          <div class="win-patch-filter-actions">
            <el-button
              type="primary"
              :loading="comparing"
              :disabled="!canCompare"
              @click="handleCompare"
            >
              {{ compareActionLabel }}
            </el-button>
            <el-button @click="handleReset">{{ t('common.reset') }}</el-button>
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
      <el-empty :description="t('yumRepo.selectCompareHint')" />
    </div>

    <template v-else>
      <!-- <el-alert
        v-if="selectedSourceHint"
        :title="selectedSourceHint"
        type="info"
        :closable="false"
        show-icon
      /> -->

      <div v-if="diffRunId" class="win-patch-yum-section">
        <div class="win-patch-yum-section__header">
          <div class="win-patch-yum-section__title">{{ t('yumRepo.patchView') }}</div>
        </div>

        <div class="win-patch-yum-patch-filter-bar">
          <el-input
            v-model="patchViewFilters.keyword"
            clearable
            :placeholder="t('yumRepo.searchPatches')"
            class="win-patch-yum-patch-filter-bar__keyword"
            @keyup.enter="handlePatchViewSearch"
            @clear="handlePatchViewSearch"
          />
          <el-select
            v-model="patchViewFilters.status"
            clearable
            :placeholder="t('yumRepo.allStatuses')"
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
            <el-button type="primary" plain @click="handlePatchViewSearch">{{ t('common.search') }}</el-button>
            <el-button @click="handlePatchViewReset">{{ t('yumRepo.clearFilters') }}</el-button>
          </div>
        </div>

        <div class="ops-table-wrapper">
          <el-table
            v-loading="loadingPatchView"
            :data="patchViewList"
            row-key="patchId"
            class="natural-height-table"
            :empty-text="patchViewEmptyText"
          >
            <el-table-column :label="t('yumRepo.patchId')" min-width="170" show-overflow-tooltip>
              <template #default="{ row }">
                {{ pickValue(row, ['patchId', 'patch_id'], '-') }}
              </template>
            </el-table-column>
            <el-table-column :label="t('yumRepo.patchTitle')" :min-width="isEnglish ? 224 : 260" show-overflow-tooltip>
              <template #default="{ row }">
                {{ pickValue(row, ['patchTitle', 'patch_title'], '-') }}
              </template>
            </el-table-column>
            <el-table-column :label="t('yumRepo.severity')" width="120" align="center">
              <template #default="{ row }">
                <el-tag
                  size="small"
                  effect="plain"
                  :type="getSeverityTagType(pickValue(row, ['severity'], ''))"
                >
                  {{ getSeverityLabel(pickValue(row, ['severity'], '-')) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="t('common.status')" width="110" align="center">
              <template #default="{ row }">
                <el-tag size="small" :type="getPatchSatisfiedTagType(row)">
                  {{ getPatchSatisfiedLabel(row) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="t('yumRepo.affectedHosts')" :width="isEnglish ? 126 : 110" align="center">
              <template #default="{ row }">
                {{ pickValue(row, ['affectedHostCount', 'affected_host_count'], 0) }}
              </template>
            </el-table-column>
            <el-table-column :label="t('yumRepo.totalPackages')" :width="isEnglish ? 132 : 90" align="center">
              <template #default="{ row }">
                {{ pickValue(row, ['totalPkgs', 'total_pkgs'], 0) }}
              </template>
            </el-table-column>
            <el-table-column :label="t('yumRepo.satisfied')" width="90" align="center">
              <template #default="{ row }">
                {{ pickValue(row, ['availableCount', 'available_count'], 0) }}
              </template>
            </el-table-column>
            <el-table-column :label="t('yumRepo.missing')" width="90" align="center">
              <template #default="{ row }">
                {{ pickValue(row, ['missingCount', 'missing_count'], 0) }}
              </template>
            </el-table-column>
            <el-table-column :label="t('yumRepo.outdated')" width="100" align="center">
              <template #default="{ row }">
                {{ pickValue(row, ['outdatedCount', 'outdated_count'], 0) }}
              </template>
            </el-table-column>
            <el-table-column :label="t('yumRepo.releaseMismatch')" :width="isEnglish ? 148 : 130" align="center">
              <template #default="{ row }">
                {{ pickValue(row, ['releaseMismatchCount', 'release_mismatch_count'], 0) }}
              </template>
            </el-table-column>
            <el-table-column :label="t('common.actions')" width="90" fixed="right" align="center">
              <template #default="{ row }">
                <el-button text type="primary" size="small" @click="handleOpenDetail(row)">
                  {{ t('yumRepo.details') }}
                </el-button>
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
        <el-empty
          :description="t('yumRepo.pendingCompareHint')"
        />
      </div>
    </template>

    <YumRepoPatchDetailDialog v-model="detailDialogVisible" :patch="detailPatch" />
  </div>
</template>

<script setup>
import { currentLocale, t } from '@/core/i18n'

import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import YumRepoPatchDetailDialog from './YumRepoPatchDetailDialog.vue'
import {
  getSeverityLabel,
  getSeverityTagType,
  normalizeBoolean,
  parsePageResponse,
  pickValue
} from '@/modules/patches/windows-patch/utils.js'
import { YUM_REPO_PAGE_SIZE_OPTIONS } from '../constants'

const isEnglish = computed(() => currentLocale.value === 'en-US')
import { yumRepoApi } from '../api'
import {
  getCollectStatusLabel,
  getCollectStatusTagType,
  getYumConfigCompareLabel,
  isYumRepoCollectSucceeded,
  normalizeYumConfigRecord,
  resolveYumConfigId,
  unwrapResponse
} from '../utils'

const props = defineProps({
  active: {
    type: Boolean,
    default: false
  },
  repos: {
    type: Array,
    default: () => []
  },
  configs: {
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

const compareSelectedRepoModel = computed({
  get: () => normalizedSelectedConfigId.value || String(selectedRepoModel.value || '').trim(),
  set: value => emit('update:selectedRepoId', String(value || '').trim())
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
  { get label() { return t('yumRepo.onlySatisfied') }, value: 'SATISFIED' },
  { get label() { return t('yumRepo.onlyUnsatisfied') }, value: 'NOT_SATISFIED' }
]

const overviewSources = computed(() => {
  const data = unwrapResponse(props.overviewData)
  return Array.isArray(data?.sources) ? data.sources : []
})

const compareRepoOptions = computed(() => props.configs.map(item => normalizeYumConfigRecord(item)))

const normalizedSelectedConfigId = computed(() => {
  const currentRepoId = String(selectedRepoModel.value || '').trim()
  if (!currentRepoId) {
    return ''
  }

  const matchedConfig = props.configs.find(item => {
    const config = normalizeYumConfigRecord(item)
    return resolveYumConfigId(config) === currentRepoId || config.sourceIds.includes(currentRepoId)
  })

  return resolveYumConfigId(matchedConfig)
})

const selectedSourceOverview = computed(() => {
  const currentConfigId = normalizedSelectedConfigId.value
  const currentRepoId = String(selectedRepoModel.value || '').trim()

  return (
    overviewSources.value.find(item => {
      const overviewConfig = normalizeYumConfigRecord(item)
      const overviewConfigId = resolveYumConfigId(overviewConfig)

      return (
        overviewConfigId === currentConfigId ||
        overviewConfigId === currentRepoId ||
        overviewConfig.sourceIds.includes(currentRepoId)
      )
    }) || null
  )
})

const selectedConfig = computed(() => {
  const currentConfigId = normalizedSelectedConfigId.value
  if (!currentConfigId) {
    return null
  }

  return (
    props.configs.find(item => {
      const config = normalizeYumConfigRecord(item)
      return resolveYumConfigId(config) === currentConfigId
    }) || null
  )
})

const selectedConfigId = computed(() => resolveYumConfigId(selectedConfig.value))

const summaryData = computed(() => selectedSourceOverview.value?.summary || null)

const canCompare = computed(() => {
  if (!selectedRepoModel.value) return false

  if (selectedConfig.value) {
    return isYumRepoCollectSucceeded(selectedConfig.value)
  }

  return (
    Boolean(selectedSourceOverview.value) && isYumRepoCollectSucceeded(selectedSourceOverview.value)
  )
})

const compareActionLabel = computed(() => {
  return diffRunId.value || selectedSourceOverview.value?.diffRunId
    ? t('yumRepo.compareAgain')
    : t('yumRepo.compareManuallyTitle')
})

const patchViewEmptyText = computed(() => {
  return patchViewFilters.status || patchViewFilters.keyword
    ? t('yumRepo.noFilteredPatches')
    : t('yumRepo.noComparison')
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
  return (
    requestId === compareRequestId.value &&
    contextId === resultContextId.value &&
    repoId === getCurrentRepoId()
  )
}

function isPatchViewRequestCurrent(requestId, contextId, repoId, currentDiffRunId) {
  return (
    requestId === patchViewRequestId.value &&
    contextId === resultContextId.value &&
    repoId === getCurrentRepoId() &&
    currentDiffRunId === String(diffRunId.value || '').trim()
  )
}

async function syncSelectedRepoResult(options = {}) {
  if (
    normalizedSelectedConfigId.value &&
    normalizedSelectedConfigId.value !== selectedRepoModel.value
  ) {
    selectedRepoModel.value = normalizedSelectedConfigId.value
  }

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
    if (
      !options.silent &&
      isPatchViewRequestCurrent(requestId, contextId, repoId, currentDiffRunId)
    ) {
      console.error('加载补丁视图失败:', error)
      ElMessage.error(t('yumRepo.patchViewFailed'))
    }
  } finally {
    if (isPatchViewRequestCurrent(requestId, contextId, repoId, currentDiffRunId)) {
      loadingPatchView.value = false
    }
  }
}

async function handleCompare(options = {}) {
  const repoId = getCurrentRepoId()
  const configId = selectedConfigId.value
  if (!repoId) {
    ElMessage.warning(t('yumRepo.selectRepoFirst'))
    return
  }

  if (!canCompare.value) {
    ElMessage.warning(t('yumRepo.collectSucceededRequired'))
    return
  }

  if (!configId) {
    ElMessage.warning(t('yumRepo.invalidConfig'))
    return
  }

  const requestId = ++compareRequestId.value
  const contextId = resultContextId.value
  comparing.value = true
  try {
    const response = await yumRepoApi.compareScannedPatches({ dcDataId: configId })

    if (!isCompareRequestCurrent(requestId, contextId, repoId)) {
      return
    }

    const data = unwrapResponse(response)

    if (data?.success === false) {
      const bizMsg = String(data?.message || '').trim()
      ElMessage.error(bizMsg || t('yumRepo.compareFailed'))
      return
    }

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
      ElMessage.success(t('yumRepo.compared'))
    }
  } catch (error) {
    if (isCompareRequestCurrent(requestId, contextId, repoId)) {
      console.error('执行补丁比对失败:', error)
      const errMsg = String(error?.response?.data?.message || error?.message || '').trim()
      ElMessage.error(errMsg || t('yumRepo.compareFailed'))
    }
  } finally {
    if (isCompareRequestCurrent(requestId, contextId, repoId)) {
      comparing.value = false
    }
  }
}

function handleReset() {
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
  return normalizeBoolean(pickValue(row, ['satisfied'], false)) ? t('yumRepo.satisfied') : t('yumRepo.unsatisfied')
}

function handleOpenDetail(row) {
  detailPatch.value = row || null
  detailDialogVisible.value = true
}

function getOverviewHint(row) {
  const status = String(pickValue(row, ['collectStatus', 'collect_status'], '')).trim()
  if (!status || status === 'NOT_COLLECTED' || status === 'UNCOLLECTED') {
    return t('yumRepo.notCollectedYet')
  }
  if (status === 'FAILED') {
    return t('yumRepo.lastFailedHint')
  }
  if (status === 'PENDING' || status === 'RUNNING') {
    return t('yumRepo.collectingCompareHint')
  }
  return t('yumRepo.noComparisonHint')
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

.win-patch-yum-compare.is-english {
  .win-patch-filter-item {
    max-width: 100%;
  }

  .win-patch-filter-item :deep(.el-form-item__content) {
    min-width: 0;
  }

  .win-patch-filter-item :deep(.el-select) {
    max-width: 100%;
  }

  .natural-height-table :deep(th.el-table__cell .cell) {
    white-space: nowrap;
  }
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
