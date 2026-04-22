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
                v-for="item in repos"
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
            <el-button type="primary" :loading="comparing" @click="handleCompare">开始比对</el-button>
            <el-button @click="handleReset">重置</el-button>
          </div>
          <div v-if="summaryData" class="win-patch-filter-status">
            <el-tag :type="summaryData.passed ? 'success' : 'danger'" effect="plain">
              {{ summaryData.passed ? '全部满足' : '存在不满足项' }}
            </el-tag>
          </div>
        </div>
      </el-form>
    </div>

    <div v-if="!summaryData" class="win-patch-yum-empty">
      <el-empty description="请选择仓库后执行已扫描补丁比对" />
    </div>

    <template v-else>
      <!-- <div class="win-patch-yum-summary-grid">
        <button
          v-for="card in summaryCards"
          :key="card.key"
          type="button"
          class="win-patch-yum-summary-card"
          :class="[card.className, { 'is-active': activeSummaryCardKey === card.key }]"
          @click="handleSummaryCardClick(card.key)"
        >
          <div class="win-patch-yum-summary-card__label">{{ card.label }}</div>
          <div class="win-patch-yum-summary-card__value">{{ card.value }}</div>
        </button>
      </div> -->

      <el-alert
        v-if="summaryData.hint"
        :title="summaryData.hint"
        type="info"
        :closable="false"
        show-icon
      />

      <div class="win-patch-yum-section">
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
            max-height="calc(100vh - 390px)"
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
  getYumRepoLabel,
  resolveYumRepoId,
  unwrapResponse
} from '../../yumRepoUtils'

const props = defineProps({
  repos: {
    type: Array,
    default: () => []
  },
  selectedRepoId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:selectedRepoId'])

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
const summaryData = ref(null)
const patchViewList = ref([])
const detailDialogVisible = ref(false)
const detailPatch = ref(null)
const hasAutoCompared = ref(false)

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const patchViewFilters = reactive({
  keyword: '',
  status: '',
  diffType: ''
})

const PATCH_VIEW_STATUS_OPTIONS = [
  { label: '仅满足', value: 'SATISFIED' },
  { label: '仅不满足', value: 'NOT_SATISFIED' }
]

const SUMMARY_CARD_CONFIG = [
  { key: 'total', label: '总项数', className: 'is-total' },
  { key: 'available', label: '满足要求', className: 'is-success' },
  { key: 'missing', label: '缺失', className: 'is-danger' },
  { key: 'outdated', label: '版本不足', className: 'is-warning' },
  { key: 'releaseMismatch', label: 'Release 不匹配', className: 'is-release' },
  { key: 'ahead', label: '更高版本', className: 'is-ahead' }
]

const SUMMARY_CARD_FILTER_PRESETS = {
  total: { status: '', diffType: '' },
  available: { status: 'SATISFIED', diffType: '' },
  missing: { status: 'NOT_SATISFIED', diffType: 'MISSING' },
  outdated: { status: 'NOT_SATISFIED', diffType: 'OUTDATED' },
  releaseMismatch: { status: 'NOT_SATISFIED', diffType: 'RELEASE_MISMATCH' },
  ahead: { status: '', diffType: 'AHEAD' }
}

const summaryCards = computed(() =>
  SUMMARY_CARD_CONFIG.map(item => ({
    ...item,
    value: Number(summaryData.value?.[item.key] ?? 0)
  }))
)

const activeSummaryCardKey = computed(() => {
  const status = String(patchViewFilters.status || '').trim()
  const diffType = String(patchViewFilters.diffType || '').trim()

  return Object.entries(SUMMARY_CARD_FILTER_PRESETS).find(([, preset]) => {
    return preset.status === status && preset.diffType === diffType
  })?.[0] || ''
})

const activeSummaryFilterLabel = computed(() => {
  return SUMMARY_CARD_CONFIG.find(item => item.key === activeSummaryCardKey.value)?.label || ''
})

const patchViewEmptyText = computed(() => {
  return activeSummaryFilterLabel.value || patchViewFilters.status || patchViewFilters.keyword
    ? '当前筛选条件下暂无补丁结果'
    : '暂无补丁比对结果'
})

function applySummaryCardPreset(key = 'total') {
  const preset = SUMMARY_CARD_FILTER_PRESETS[key] || SUMMARY_CARD_FILTER_PRESETS.total
  patchViewFilters.status = preset.status
  patchViewFilters.diffType = preset.diffType
}

function clearResult() {
  diffRunId.value = ''
  summaryData.value = null
  patchViewList.value = []
  detailDialogVisible.value = false
  detailPatch.value = null
  patchViewFilters.keyword = ''
  applySummaryCardPreset('total')
  pagination.page = 1
  pagination.pageSize = 20
  pagination.total = 0
}

async function loadPatchView(options = {}) {
  if (!diffRunId.value) return

  loadingPatchView.value = !options.silent
  try {
    const response = await yumRepoApi.getComparePatchView(diffRunId.value, {
      diffRunId: diffRunId.value,
      keyword: patchViewFilters.keyword || undefined,
      status: patchViewFilters.status || undefined,
      diffType: patchViewFilters.diffType || undefined,
      page: pagination.page - 1,
      size: pagination.pageSize
    })
    const page = parsePageResponse(response)
    patchViewList.value = page.content
    pagination.total = page.total
  } catch (error) {
    if (!options.silent) {
      console.error('加载补丁视图失败:', error)
      ElMessage.error('加载补丁视图失败')
    }
  } finally {
    loadingPatchView.value = false
  }
}

async function handleCompare(options = {}) {
  if (!selectedRepoModel.value) {
    ElMessage.warning('请先选择仓库')
    return
  }

  comparing.value = true
  try {
    const response = await yumRepoApi.compareScannedPatches({
      sourceId: selectedRepoModel.value,
      osFamily: form.osFamily || undefined
    })
    const data = unwrapResponse(response)

    diffRunId.value = String(data?.diffRunId || '').trim()
    summaryData.value = data
    patchViewFilters.keyword = ''
    applySummaryCardPreset('total')
    pagination.page = 1
    pagination.pageSize = 20

    if (diffRunId.value) {
      await loadPatchView()
    }

    if (!options.silentSuccess) {
      ElMessage.success('补丁比对已完成')
    }
  } catch (error) {
    console.error('执行补丁比对失败:', error)
    ElMessage.error('执行补丁比对失败')
  } finally {
    comparing.value = false
  }
}

function handleReset() {
  form.osFamily = ''
  clearResult()
}

async function tryInitialCompare() {
  if (hasAutoCompared.value || !selectedRepoModel.value || comparing.value) {
    return
  }

  hasAutoCompared.value = true
  await handleCompare({ silentSuccess: true })
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
  applySummaryCardPreset('total')
  pagination.page = 1
  await loadPatchView()
}

async function handleSummaryCardClick(filterKey) {
  const nextKey = activeSummaryCardKey.value === filterKey ? 'total' : filterKey
  applySummaryCardPreset(nextKey)
  pagination.page = 1

  if (!diffRunId.value) {
    return
  }

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

watch(
  () => selectedRepoModel.value,
  async () => {
    clearResult()

    if (!hasAutoCompared.value) {
      await tryInitialCompare()
    }
  },
  { immediate: true }
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

.win-patch-yum-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.win-patch-yum-summary-card {
  --card-accent: var(--el-color-primary);
  appearance: none;
  cursor: pointer;
  text-align: left;
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
  position: relative;
  overflow: hidden;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--card-accent) 28%, var(--el-border-color-light) 72%);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--card-accent) 8%, var(--el-bg-color) 92%),
    color-mix(in srgb, var(--card-accent) 2%, var(--el-bg-color) 98%)
  );
  box-shadow: 0 4px 12px color-mix(in srgb, var(--card-accent) 12%, transparent 88%);
}

.win-patch-yum-summary-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px color-mix(in srgb, var(--card-accent) 18%, transparent 82%);
}

.win-patch-yum-summary-card.is-active {
  border-color: color-mix(in srgb, var(--card-accent) 56%, var(--el-border-color-light) 44%);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--card-accent) 18%, var(--el-bg-color) 82%),
    color-mix(in srgb, var(--card-accent) 8%, var(--el-bg-color) 92%)
  );
  box-shadow: 0 10px 22px color-mix(in srgb, var(--card-accent) 24%, transparent 76%);
}

.win-patch-yum-summary-card:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--card-accent) 55%, white 45%);
  outline-offset: 1px;
}

.win-patch-yum-summary-card.is-total {
  --card-accent: #6f7f96;
}

.win-patch-yum-summary-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 3px;
  background: color-mix(in srgb, var(--card-accent) 80%, white 20%);
}

.win-patch-yum-summary-card.is-success {
  --card-accent: var(--el-color-success);
}

.win-patch-yum-summary-card.is-warning {
  --card-accent: var(--el-color-warning);
}

.win-patch-yum-summary-card.is-danger {
  --card-accent: var(--el-color-danger);
}

.win-patch-yum-summary-card.is-release {
  --card-accent: #d97706;
}

.win-patch-yum-summary-card.is-ahead {
  --card-accent: #0f766e;
}

.win-patch-yum-summary-card__label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.win-patch-yum-summary-card__value {
  margin-top: 10px;
  font-size: 34px;
  line-height: 1;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.win-patch-yum-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.win-patch-yum-section__header {
  display: flex;
  align-items: center;
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
