<template>
  <div class="win-patch-yum-panel">
    <div class="ops-filter-bar">
      <el-form :inline="true" size="small">
        <el-form-item label="已采集仓库">
          <el-select
            v-model="packagesSelectedRepoModel"
            clearable
            filterable
            placeholder="请选择已采集仓库"
            style="width: 480px"
          >
            <el-option
              v-for="item in packageRepoOptions"
              :key="resolveYumConfigId(item)"
              :label="getYumConfigCompareLabel(item)"
              :value="resolveYumConfigId(item)"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="包名">
          <el-input
            v-model="keyword"
            placeholder="按包名模糊搜索"
            clearable
            style="width: 300px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :disabled="!hasSelectedRepo" @click="handleSearch">搜索</el-button>
          <el-button :disabled="!hasSelectedRepo" @click="handleReset">重置</el-button>
          <el-button :disabled="!hasSelectedRepo" @click="handleRefresh">刷新</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div v-if="!packageRepoOptions.length" class="win-patch-yum-empty">
      <el-empty description="暂无已采集仓库，请先在仓库管理页触发采集" />
    </div>

    <div v-else-if="!hasSelectedRepo" class="win-patch-yum-empty">
      <el-empty description="请选择已采集仓库后查看采集状态和包清单" />
    </div>

    <template v-else>
      <!-- <div class="ops-action-bar">
        <el-switch v-model="autoPollingEnabled" active-text="自动轮询 5 秒" />
        <span class="win-patch-selection-text">当前仓库：{{ getYumRepoLabel(currentRepo) }}</span>
        <span style="flex: 1"></span>
        <el-button class="toolbar-icon-btn" circle size="small" :loading="refreshing" @click="handleRefresh">
          <el-icon v-show="!refreshing"><Refresh /></el-icon>
        </el-button>
      </div> -->

      <el-descriptions :column="3" border size="small" class="win-patch-yum-status" label-width="100px">
        <el-descriptions-item label="仓库名称">
          {{ getYumConfigCompareLabel(currentConfig) }}
        </el-descriptions-item>
        <el-descriptions-item label="仓库地址">
          {{ currentConfigBaseurlsText }}
        </el-descriptions-item>
        <!-- <el-descriptions-item label="仓库 ID">
          {{ resolveYumRepoId(currentRepo) || '-' }}
        </el-descriptions-item> -->
        <el-descriptions-item label="采集状态">
          <el-tag :type="getCollectStatusTagType(statusData)" size="small">
            {{ getCollectStatusLabel(statusData) }}
          </el-tag>
        </el-descriptions-item>
        <!-- <el-descriptions-item label="快照 ID">
          {{ pickValue(statusData, ['snapshotId', 'snapshot_id'], '-') }}
        </el-descriptions-item> -->
        <el-descriptions-item label="包数量">
          {{ pickValue(statusData, ['packageCount', 'package_count'], 0) }}
        </el-descriptions-item>
        <el-descriptions-item label="完成时间">
          {{ formatDateTime(pickValue(statusData, ['finishedAt', 'finished_at'], '')) }}
        </el-descriptions-item>
        <el-descriptions-item label="错误信息" :span="2">
          {{ pickValue(statusData, ['errorMessage', 'error_message'], '-') }}
        </el-descriptions-item>
      </el-descriptions>

      <div v-if="showPollingNotice" class="win-patch-yum-table-notice">
        <el-icon class="win-patch-yum-table-notice__icon is-loading"><Loading /></el-icon>
        <span>{{ pollingNoticeText }}</span>
      </div>

      <div class="ops-table-wrapper" style="margin-top: 12px;">
        <el-table
          v-loading="tableLoading"
          :data="packageList"
          :empty-text="packageEmptyText"
          :element-loading-text="tableLoadingText"
          max-height="calc(100vh - 555px)"
        >
          <el-table-column label="包名" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">
              {{ pickValue(row, ['pkgName', 'pkg_name'], '-') }}
            </template>
          </el-table-column>
          <el-table-column label="版本号" min-width="140" show-overflow-tooltip>
            <template #default="{ row }">
              {{ pickValue(row, ['pkgVersion', 'pkg_version'], '-') }}
            </template>
          </el-table-column>
          <el-table-column label="架构" width="120" align="center">
            <template #default="{ row }">
              {{ pickValue(row, ['pkgArch', 'pkg_arch'], '-') }}
            </template>
          </el-table-column>
          <el-table-column label="完整包名" min-width="320" show-overflow-tooltip>
            <template #default="{ row }">
              {{ pickValue(row, ['pkgFullNevra', 'pkg_full_nevra'], '-') }}
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
    </template>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { parsePageResponse, pickValue } from '../../utils'
import { YUM_REPO_PAGE_SIZE_OPTIONS } from '../../yum-repo/constants'
import { yumRepoApi } from '../../yum-repo/api'
import {
  formatDateTime,
  getCollectStatusLabel,
  getCollectStatusTagType,
  getYumConfigCompareLabel,
  isCollectRunning,
  normalizeYumConfigRecord,
  resolveYumConfigId,
  unwrapResponse
} from '../../yum-repo/utils'
import { useWinPatchPolling } from '../../composables/useWinPatchPolling'

const props = defineProps({
  active: {
    type: Boolean,
    default: false
  },
  configs: {
    type: Array,
    default: () => []
  },
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

const normalizedSelectedConfigId = computed(() => {
  const currentId = String(selectedRepoModel.value || '').trim()
  if (!currentId) {
    return ''
  }

  const directConfig = props.configs.find(item => resolveYumConfigId(item) === currentId)
  if (directConfig) {
    return resolveYumConfigId(directConfig)
  }

  const matchedConfig = props.configs.find(item => {
    const config = normalizeYumConfigRecord(item)
    return resolveYumConfigId(config) === currentId || config.sourceIds.includes(currentId)
  })

  if (!matchedConfig) {
    return ''
  }

  return resolveYumConfigId(matchedConfig)
})

const packagesSelectedRepoModel = computed({
  get: () => normalizedSelectedConfigId.value || String(selectedRepoModel.value || '').trim(),
  set: value => emit('update:selectedRepoId', String(value || '').trim())
})

const packageRepoOptions = computed(() => props.configs.map(item => normalizeYumConfigRecord(item)))

const currentConfig = computed(() => {
  return props.configs.find(item => resolveYumConfigId(item) === normalizedSelectedConfigId.value) || null
})

const currentConfigBaseurlsText = computed(() => {
  const normalizedConfig = normalizeYumConfigRecord(currentConfig.value)
  return Array.isArray(normalizedConfig.baseurls) && normalizedConfig.baseurls.length
    ? normalizedConfig.baseurls.join('；')
    : '-'
})

const hasSelectedRepo = computed(() => Boolean(currentConfig.value))
const refreshing = computed(() => loadingStatus.value || loadingPackages.value)
const isStatusPollingActive = computed(() => {
  return props.active && autoPollingEnabled.value && hasSelectedRepo.value && isCollectRunning(statusData.value) && isPolling.value
})
const showPollingNotice = computed(() => isStatusPollingActive.value && !loadingPackages.value)
const pollingNoticeText = computed(() => '正在轮询采集状态，包清单会在采集完成后自动刷新')
const tableLoading = computed(() => loadingPackages.value)
const tableLoadingText = computed(() => (loadingPackages.value ? '正在加载包清单...' : ''))
const packageEmptyText = computed(() => {
  if (showPollingNotice.value) {
    return '正在轮询采集状态，请稍后查看包清单'
  }

  return '暂无包清单数据'
})

const autoPollingEnabled = ref(true)
const loadingStatus = ref(false)
const loadingPackages = ref(false)
const statusData = ref(null)
const packageList = ref([])
const keyword = ref('')

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const { isPolling, start, stop } = useWinPatchPolling(3000)
let statusRequestId = 0
let packagesRequestId = 0

function resetPanelState() {
  statusData.value = null
  packageList.value = []
  keyword.value = ''
  pagination.page = 1
  pagination.pageSize = 20
  pagination.total = 0
  stop()
}

function syncPollingState() {
  if (!props.active || !autoPollingEnabled.value || !hasSelectedRepo.value || !isCollectRunning(statusData.value)) {
    stop()
    return
  }

  if (!isPolling.value) {
    start(async () => {
      await loadStatus({ silent: true, keepPrevious: true })
      if (!isCollectRunning(statusData.value)) {
        await loadPackages({ silent: true })
      }
    })
  }
}

async function loadStatus(options = {}) {
  if (!props.active || !hasSelectedRepo.value) return

  const requestId = ++statusRequestId
  loadingStatus.value = !options.silent

  try {
    const response = await yumRepoApi.getConfigList()
    if (requestId !== statusRequestId) return

    const data = unwrapResponse(response)
    const configList = (Array.isArray(data) ? data : []).map(item => normalizeYumConfigRecord(item))
    statusData.value = configList.find(item => resolveYumConfigId(item) === normalizedSelectedConfigId.value) || null
  } catch (error) {
    if (requestId !== statusRequestId) return

    if (!options.keepPrevious) {
      statusData.value = null
    }

    if (!options.silent) {
      console.error('加载 Yum 仓库采集状态失败:', error)
      ElMessage.error('加载 Yum 仓库采集状态失败')
    }
  } finally {
    if (requestId === statusRequestId) {
      loadingStatus.value = false
      syncPollingState()
    }
  }
}

async function loadPackages(options = {}) {
  if (!props.active || !hasSelectedRepo.value) return

  const requestId = ++packagesRequestId
  loadingPackages.value = !options.silent

  try {
    const response = await yumRepoApi.getPackages({
      dcDataId: normalizedSelectedConfigId.value,
      keyword: keyword.value || undefined,
      page: pagination.page - 1,
      size: pagination.pageSize
    })

    if (requestId !== packagesRequestId) return

    const page = parsePageResponse(response)
    packageList.value = page.content
    pagination.total = page.total
  } catch (error) {
    if (requestId !== packagesRequestId) return

    if (!options.silent) {
      console.error('加载 Yum 仓库包清单失败:', error)
      ElMessage.error('加载 Yum 仓库包清单失败')
    }
  } finally {
    if (requestId === packagesRequestId) {
      loadingPackages.value = false
    }
  }
}

async function handleRefresh() {
  await Promise.all([loadStatus(), loadPackages()])
}

function handleSearch() {
  pagination.page = 1
  loadPackages()
}

function handleReset() {
  keyword.value = ''
  pagination.page = 1
  pagination.pageSize = 20
  loadPackages()
}

function handlePageChange(page) {
  pagination.page = page
  loadPackages()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  loadPackages()
}

watch(
  [() => selectedRepoModel.value, () => props.active],
  ([value, active], previous = []) => {
    if (normalizedSelectedConfigId.value && normalizedSelectedConfigId.value !== value) {
      selectedRepoModel.value = normalizedSelectedConfigId.value
      return
    }

    if (!String(value || '').trim()) {
      resetPanelState()
      return
    }

    if (!active) {
      stop()
      return
    }

    const previousValue = previous[0]
    const repoChanged = value !== previousValue

    stop()

    if (repoChanged) {
      keyword.value = ''
      pagination.page = 1
      pagination.pageSize = 20
    }

    void loadStatus({ silent: true })
    void loadPackages({ silent: !repoChanged })
  },
  { immediate: true }
)

watch(
  () => autoPollingEnabled.value,
  value => {
    if (!value || !props.active) {
      stop()
      return
    }

    syncPollingState()
  }
)
</script>

<style scoped lang="scss">
.win-patch-yum-panel {
  display: flex;
  flex-direction: column;
  //gap: 12px;
}

.win-patch-yum-empty {
  display: flex;
  justify-content: center;
  padding: 36px 0 20px;
}

.win-patch-yum-status {
  margin-bottom: 0;
}

.win-patch-yum-table-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 18%, transparent 82%);
  border-radius: 10px;
  background: color-mix(in srgb, var(--el-color-primary-light-9) 72%, var(--el-bg-color) 28%);
  color: var(--el-text-color-regular);
  font-size: 13px;
}

.win-patch-yum-table-notice__icon {
  color: var(--el-color-primary);
}

.win-patch-selection-text {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>
