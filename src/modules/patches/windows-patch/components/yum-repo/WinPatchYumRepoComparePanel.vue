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
            <el-button :disabled="!diffRunId" :loading="refreshing" @click="handleRefresh">刷新结果</el-button>
            <el-button @click="handleReset">重置</el-button>
          </div>
          <div v-if="summaryData" class="win-patch-filter-status">
            <el-tag :type="summaryData.passed ? 'success' : 'danger'" effect="plain">
              {{ summaryData.passed ? '全部满足' : '存在不满足项' }}
            </el-tag>
          </div>
        </div>
      </el-form>
      <!-- <div class="win-patch-form-hint">系统将自动使用当前租户已扫描到的有效补丁进行比对，无需手动选择补丁 ID。</div> -->
    </div>

    <div v-if="!summaryData" class="win-patch-yum-empty">
      <el-empty description="请选择仓库后执行已扫描补丁比对" />
    </div>

    <template v-else>
      <div class="win-patch-yum-summary-grid">
        <button
          v-for="card in summaryCards"
          :key="card.key"
          type="button"
          class="win-patch-yum-summary-card"
          :class="[card.className, { 'is-active': activeSummaryFilter === card.key }]"
          @click="handleSummaryCardClick(card.key)"
        >
          <div class="win-patch-yum-summary-card__label">{{ card.label }}</div>
          <div class="win-patch-yum-summary-card__value">{{ card.value }}</div>
        </button>
      </div>

      <!-- <div class="win-patch-yum-filter-tip" v-if="activeSummaryFilterLabel">
        当前按「{{ activeSummaryFilterLabel }}」筛选比对明细，点击已选卡片可取消筛选。
      </div> -->

      <el-alert
        v-if="summaryData.hint"
        :title="summaryData.hint"
        type="info"
        :closable="false"
        show-icon
      />

      <div class="win-patch-yum-section">
        <el-tabs v-model="activeResultTab" class="win-patch-yum-result-tabs">
          <el-tab-pane name="details" label="比对明细">
            <div class="ops-table-wrapper">
              <el-table v-loading="loadingDetails" :data="detailList" max-height="calc(100vh - 440px)">
                <el-table-column label="补丁 ID" min-width="160" show-overflow-tooltip>
                  <template #default="{ row }">
                    {{ pickValue(row, ['patchId', 'patch_id'], '-') }}
                  </template>
                </el-table-column>
                <el-table-column label="包名" min-width="140" show-overflow-tooltip>
                  <template #default="{ row }">
                    {{ pickValue(row, ['pkgName', 'pkg_name'], '-') }}
                  </template>
                </el-table-column>
                <el-table-column label="要求版本" min-width="220" show-overflow-tooltip>
                  <template #default="{ row }">
                    {{ pickValue(row, ['requiredNevra', 'required_nevra'], '-') }}
                  </template>
                </el-table-column>
                <el-table-column label="基线版本" min-width="220" show-overflow-tooltip>
                  <template #default="{ row }">
                    {{ pickValue(row, ['baselineNevra', 'baseline_nevra'], '-') }}
                  </template>
                </el-table-column>
                <el-table-column label="差异类型" width="140">
                  <template #default="{ row }">
                    <el-tag :type="getDiffTypeTagType(row)" size="small">
                      {{ getDiffTypeLabel(row) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="OS" width="120">
                  <template #default="{ row }">
                    {{ pickValue(row, ['osFamily', 'os_family'], '-') }}
                  </template>
                </el-table-column>
                <el-table-column label="主版本" width="100" align="center">
                  <template #default="{ row }">
                    {{ pickValue(row, ['osMajor', 'os_major'], '-') }}
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
          </el-tab-pane>
          <el-tab-pane name="notSatisfied" :label="`不满足项(${notSatisfiedTotal})`">
            <div class="ops-table-wrapper">
              <el-table v-loading="loadingNotSatisfied" :data="pagedNotSatisfiedItems" max-height="calc(100vh - 440px)">
                <el-table-column label="补丁 ID" min-width="160" show-overflow-tooltip>
                  <template #default="{ row }">
                    {{ pickValue(row, ['patchId', 'patch_id'], '-') }}
                  </template>
                </el-table-column>
                <el-table-column label="包名" min-width="140" show-overflow-tooltip>
                  <template #default="{ row }">
                    {{ pickValue(row, ['pkgName', 'pkg_name'], '-') }}
                  </template>
                </el-table-column>
                <el-table-column label="要求版本" min-width="220" show-overflow-tooltip>
                  <template #default="{ row }">
                    {{ pickValue(row, ['requiredNevra', 'required_nevra'], '-') }}
                  </template>
                </el-table-column>
                <el-table-column label="基线版本" min-width="220" show-overflow-tooltip>
                  <template #default="{ row }">
                    {{ pickValue(row, ['baselineNevra', 'baseline_nevra'], '-') }}
                  </template>
                </el-table-column>
                <el-table-column label="差异类型" width="140">
                  <template #default="{ row }">
                    <el-tag :type="getDiffTypeTagType(row)" size="small">
                      {{ getDiffTypeLabel(row) }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </div>
            <div class="ops-pagination-wrapper">
              <el-pagination
                v-model:current-page="notSatisfiedPagination.page"
                v-model:page-size="notSatisfiedPagination.pageSize"
                :page-sizes="YUM_REPO_PAGE_SIZE_OPTIONS"
                :total="notSatisfiedTotal"
                layout="total, sizes, prev, pager, next, jumper"
                background
                @size-change="handleNotSatisfiedSizeChange"
                @current-change="handleNotSatisfiedPageChange"
              />
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { parsePageResponse, pickValue } from '../../utils'
import { YUM_REPO_OS_FAMILY_OPTIONS, YUM_REPO_PAGE_SIZE_OPTIONS } from '../../yumRepoConstants'
import { yumRepoApi } from '../../yumRepoApi'
import {
  getDiffTypeLabel,
  getDiffTypeTagType,
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
const loadingSummary = ref(false)
const loadingDetails = ref(false)
const loadingNotSatisfied = ref(false)
const diffRunId = ref('')
const summaryData = ref(null)
const activeResultTab = ref('details')
const activeSummaryFilter = ref('total')
const detailList = ref([])
const allNotSatisfiedItems = ref([])

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const notSatisfiedPagination = reactive({
  page: 1,
  pageSize: 20
})

const SUMMARY_CARD_CONFIG = [
  { key: 'total', label: '总项数', className: 'is-total' },
  { key: 'available', label: '满足要求', className: 'is-success' },
  { key: 'missing', label: '缺失', className: 'is-danger' },
  { key: 'outdated', label: '版本不足', className: 'is-warning' },
  { key: 'releaseMismatch', label: 'Release 不匹配', className: 'is-release' },
  { key: 'ahead', label: '更高版本', className: 'is-ahead' }
]

const DIFF_TYPE_FILTER_MAP = {
  total: null,
  available: 'AVAILABLE',
  missing: 'MISSING',
  outdated: 'OUTDATED',
  releaseMismatch: 'RELEASE_MISMATCH',
  ahead: 'AHEAD'
}

const summaryCards = computed(() =>
  SUMMARY_CARD_CONFIG.map(item => ({
    ...item,
    value: Number(summaryData.value?.[item.key] ?? 0)
  }))
)

const activeSummaryFilterLabel = computed(() => {
  if (activeSummaryFilter.value === 'total') return ''
  return SUMMARY_CARD_CONFIG.find(item => item.key === activeSummaryFilter.value)?.label || ''
})

const activeDetailDiffType = computed(() => DIFF_TYPE_FILTER_MAP[activeSummaryFilter.value] || '')

const notSatisfiedTotal = computed(() => allNotSatisfiedItems.value.length)

const pagedNotSatisfiedItems = computed(() => {
  const start = (notSatisfiedPagination.page - 1) * notSatisfiedPagination.pageSize
  const end = start + notSatisfiedPagination.pageSize
  return allNotSatisfiedItems.value.slice(start, end)
})

const refreshing = computed(() => loadingSummary.value || loadingDetails.value || loadingNotSatisfied.value)

function clearResult() {
  diffRunId.value = ''
  summaryData.value = null
  activeResultTab.value = 'details'
  activeSummaryFilter.value = 'total'
  detailList.value = []
  allNotSatisfiedItems.value = []
  pagination.page = 1
  pagination.pageSize = 20
  pagination.total = 0
  notSatisfiedPagination.page = 1
  notSatisfiedPagination.pageSize = 20
}

async function loadSummary(options = {}) {
  if (!diffRunId.value) return

  loadingSummary.value = !options.silent
  try {
    const response = await yumRepoApi.getCompareSummary(diffRunId.value)
    summaryData.value = unwrapResponse(response)
  } catch (error) {
    if (!options.silent) {
      console.error('加载补丁比对汇总失败:', error)
      ElMessage.error('加载补丁比对汇总失败')
    }
  } finally {
    loadingSummary.value = false
  }
}

async function loadNotSatisfied(options = {}) {
  if (!diffRunId.value) return

  loadingNotSatisfied.value = !options.silent
  try {
    const response = await yumRepoApi.getNotSatisfied(diffRunId.value)
    const data = unwrapResponse(response)
    allNotSatisfiedItems.value = Array.isArray(data?.items) ? data.items : []
    notSatisfiedPagination.page = 1
  } catch (error) {
    if (!options.silent) {
      console.error('加载不满足项失败:', error)
      ElMessage.error('加载不满足项失败')
    }
  } finally {
    loadingNotSatisfied.value = false
  }
}

async function loadDetails(options = {}) {
  if (!diffRunId.value) return

  loadingDetails.value = !options.silent
  try {
    const response = await yumRepoApi.getCompareDetails(diffRunId.value, {
      page: pagination.page - 1,
      size: pagination.pageSize,
      diffType: activeDetailDiffType.value || undefined
    })
    const page = parsePageResponse(response)
    detailList.value = page.content
    pagination.total = page.total
  } catch (error) {
    if (!options.silent) {
      console.error('加载补丁比对明细失败:', error)
      ElMessage.error('加载补丁比对明细失败')
    }
  } finally {
    loadingDetails.value = false
  }
}

async function handleCompare() {
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
    pagination.page = 1
    pagination.pageSize = 20
    activeSummaryFilter.value = 'total'
    activeResultTab.value = data?.passed ? 'notSatisfied' : 'details'

    if (diffRunId.value) {
      await Promise.all([loadNotSatisfied({ silent: true }), loadDetails({ silent: true })])
    }

    ElMessage.success('补丁比对已完成')
  } catch (error) {
    console.error('执行补丁比对失败:', error)
    ElMessage.error('执行补丁比对失败')
  } finally {
    comparing.value = false
  }
}

async function handleRefresh() {
  if (!diffRunId.value) return
  await Promise.all([loadSummary(), loadNotSatisfied(), loadDetails()])
}

function handleReset() {
  form.osFamily = ''
  clearResult()
}

function handlePageChange(page) {
  pagination.page = page
  loadDetails()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  loadDetails()
}

function handleNotSatisfiedPageChange(page) {
  notSatisfiedPagination.page = page
}

function handleNotSatisfiedSizeChange(size) {
  notSatisfiedPagination.pageSize = size
  notSatisfiedPagination.page = 1
}

async function handleSummaryCardClick(filterKey) {
  activeSummaryFilter.value = activeSummaryFilter.value === filterKey ? 'total' : filterKey

  if (!diffRunId.value) {
    return
  }

  activeResultTab.value = 'details'
  pagination.page = 1
  await loadDetails()
}

watch(
  () => selectedRepoModel.value,
  () => {
    clearResult()
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

.win-patch-filter-item.is-repo {
  flex: 1 1 380px;
}

.win-patch-filter-item.is-os {
  flex: 0 1 230px;
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

.win-patch-form-hint {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
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

.win-patch-yum-filter-tip {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.win-patch-yum-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.win-patch-yum-result-tabs :deep(.el-tabs__content) {
  overflow: visible;
}

@media (max-width: 960px) {
  .win-patch-filter-item.is-repo,
  .win-patch-filter-item.is-os {
    flex: 1 1 100%;
  }

  .win-patch-filter-actions {
    width: 100%;
    margin-left: 0;
  }

  .win-patch-filter-status {
    width: 100%;
  }
}
</style>
