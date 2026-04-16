<template>
  <div class="win-patch-yum-compare">
    <div class="win-patch-yum-form-card">
      <el-form label-width="100px">
        <el-form-item label="仓库">
          <el-select
            v-model="selectedRepoModel"
            clearable
            filterable
            placeholder="请选择仓库"
            style="width: 320px"
          >
            <el-option
              v-for="item in repos"
              :key="resolveYumRepoId(item)"
              :label="getYumRepoLabel(item)"
              :value="resolveYumRepoId(item)"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="OS 族">
          <el-select
            v-model="form.osFamily"
            filterable
            allow-create
            default-first-option
            clearable
            placeholder="可选，用于过滤补丁影响的 OS"
            style="width: 240px"
          >
            <el-option
              v-for="item in YUM_REPO_OS_FAMILY_OPTIONS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="补丁 ID">
          <el-input
            v-model="form.patchIdsText"
            type="textarea"
            :rows="4"
            placeholder="请输入补丁 ID，支持逗号、空格或换行分隔，例如：CVE-2025-1234"
          />
          <div class="win-patch-form-hint">当前已解析 {{ patchIdCount }} 个补丁 ID。</div>
        </el-form-item>
      </el-form>
    </div>

    <div class="ops-action-bar">
      <el-button type="primary" :loading="comparing" @click="handleCompare">执行比对</el-button>
      <el-button :disabled="!diffRunId" :loading="refreshing" @click="handleRefresh">刷新结果</el-button>
      <el-button @click="handleReset">重置</el-button>
      <span style="flex: 1"></span>
      <el-tag v-if="summaryData" :type="summaryData.passed ? 'success' : 'danger'" effect="plain">
        {{ summaryData.passed ? '全部满足' : '存在不满足项' }}
      </el-tag>
    </div>

    <div v-if="!summaryData" class="win-patch-yum-empty">
      <el-empty description="请选择仓库并输入补丁 ID 后执行比对" />
    </div>

    <template v-else>
      <div class="win-patch-yum-summary-grid">
        <div class="win-patch-yum-summary-card">
          <div class="win-patch-yum-summary-card__label">总项数</div>
          <div class="win-patch-yum-summary-card__value">{{ summaryData.total ?? 0 }}</div>
        </div>
        <div class="win-patch-yum-summary-card is-success">
          <div class="win-patch-yum-summary-card__label">满足要求</div>
          <div class="win-patch-yum-summary-card__value">{{ summaryData.available ?? 0 }}</div>
        </div>
        <div class="win-patch-yum-summary-card is-danger">
          <div class="win-patch-yum-summary-card__label">缺失</div>
          <div class="win-patch-yum-summary-card__value">{{ summaryData.missing ?? 0 }}</div>
        </div>
        <div class="win-patch-yum-summary-card is-warning">
          <div class="win-patch-yum-summary-card__label">版本不足</div>
          <div class="win-patch-yum-summary-card__value">{{ summaryData.outdated ?? 0 }}</div>
        </div>
        <div class="win-patch-yum-summary-card is-danger">
          <div class="win-patch-yum-summary-card__label">Release 不匹配</div>
          <div class="win-patch-yum-summary-card__value">{{ summaryData.releaseMismatch ?? 0 }}</div>
        </div>
        <div class="win-patch-yum-summary-card">
          <div class="win-patch-yum-summary-card__label">更高版本</div>
          <div class="win-patch-yum-summary-card__value">{{ summaryData.ahead ?? 0 }}</div>
        </div>
      </div>

      <el-alert
        v-if="summaryData.hint"
        :title="summaryData.hint"
        type="info"
        :closable="false"
        show-icon
      />

      <div class="win-patch-yum-section">
        <div class="win-patch-yum-section__title">不满足项</div>
        <div class="ops-table-wrapper">
          <el-table v-loading="loadingNotSatisfied" :data="notSatisfiedItems" max-height="260">
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
      </div>

      <div class="win-patch-yum-section">
        <div class="win-patch-yum-section__title">比对明细</div>
        <div class="ops-table-wrapper">
          <el-table v-loading="loadingDetails" :data="detailList" max-height="calc(100vh - 520px)">
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
            <el-table-column label="OS 族" width="120">
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
  splitPatchIds,
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
  osFamily: '',
  patchIdsText: ''
})

const comparing = ref(false)
const loadingSummary = ref(false)
const loadingDetails = ref(false)
const loadingNotSatisfied = ref(false)
const diffRunId = ref('')
const summaryData = ref(null)
const detailList = ref([])
const notSatisfiedItems = ref([])

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const patchIdCount = computed(() => splitPatchIds(form.patchIdsText).length)
const refreshing = computed(() => loadingSummary.value || loadingDetails.value || loadingNotSatisfied.value)

function clearResult() {
  diffRunId.value = ''
  summaryData.value = null
  detailList.value = []
  notSatisfiedItems.value = []
  pagination.page = 1
  pagination.pageSize = 20
  pagination.total = 0
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
    notSatisfiedItems.value = Array.isArray(data?.items) ? data.items : []
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
      size: pagination.pageSize
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

  const patchIds = splitPatchIds(form.patchIdsText)
  if (!patchIds.length) {
    ElMessage.warning('请至少输入 1 个补丁 ID')
    return
  }

  comparing.value = true
  try {
    const response = await yumRepoApi.comparePatches({
      patchIds,
      sourceId: selectedRepoModel.value,
      osFamily: form.osFamily || undefined
    })
    const data = unwrapResponse(response)

    diffRunId.value = String(data?.diffRunId || '').trim()
    summaryData.value = data
    pagination.page = 1
    pagination.pageSize = 20

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
  form.patchIdsText = ''
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
  padding: 16px 18px 4px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 10px;
  background: linear-gradient(180deg, var(--el-fill-color-lighter), var(--el-bg-color));
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
  padding: 16px;
  border-radius: 10px;
  background: var(--el-fill-color-lighter);
  border: 1px solid transparent;
}

.win-patch-yum-summary-card.is-success {
  border-color: color-mix(in srgb, var(--el-color-success) 25%, transparent 75%);
}

.win-patch-yum-summary-card.is-warning {
  border-color: color-mix(in srgb, var(--el-color-warning) 25%, transparent 75%);
}

.win-patch-yum-summary-card.is-danger {
  border-color: color-mix(in srgb, var(--el-color-danger) 25%, transparent 75%);
}

.win-patch-yum-summary-card__label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.win-patch-yum-summary-card__value {
  margin-top: 8px;
  font-size: 26px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.win-patch-yum-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.win-patch-yum-section__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
</style>
