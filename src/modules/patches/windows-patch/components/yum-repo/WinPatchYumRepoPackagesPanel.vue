<template>
  <div class="win-patch-yum-panel">
    <div class="ops-filter-bar">
      <el-form :inline="true" size="small">
        <el-form-item label="已采集仓库">
          <el-select
            v-model="selectedRepoModel"
            clearable
            filterable
            placeholder="请选择已采集仓库"
            style="width: 280px"
          >
            <el-option
              v-for="item in repos"
              :key="resolveYumRepoId(item)"
              :label="getYumRepoLabel(item)"
              :value="resolveYumRepoId(item)"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="包名">
          <el-input
            v-model="keyword"
            placeholder="按包名模糊搜索"
            clearable
            style="width: 220px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :disabled="!hasSelectedRepo" @click="handleSearch">搜索</el-button>
          <el-button :disabled="!hasSelectedRepo" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div v-if="!repos.length" class="win-patch-yum-empty">
      <el-empty description="暂无已采集仓库，请先在仓库管理页触发采集" />
    </div>

    <div v-else-if="!hasSelectedRepo" class="win-patch-yum-empty">
      <el-empty description="请选择已采集仓库后查看采集状态和包清单" />
    </div>

    <template v-else>
      <div class="ops-action-bar">
        <el-switch v-model="autoPollingEnabled" active-text="自动轮询 5 秒" />
        <span class="win-patch-selection-text">当前仓库：{{ getYumRepoLabel(currentRepo) }}</span>
        <span style="flex: 1"></span>
        <el-button class="toolbar-icon-btn" circle size="small" :loading="refreshing" @click="handleRefresh">
          <el-icon v-show="!refreshing"><Refresh /></el-icon>
        </el-button>
      </div>

      <el-descriptions :column="2" border size="small" class="win-patch-yum-status">
        <el-descriptions-item label="仓库名称">
          {{ getYumRepoLabel(currentRepo) }}
        </el-descriptions-item>
        <el-descriptions-item label="仓库地址">
          {{ pickValue(currentRepo, ['repoUrl', 'repo_url'], '-') }}
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

      <div class="ops-table-wrapper">
        <el-table v-loading="loadingPackages" :data="packageList" max-height="calc(100vh - 435px)">
          <el-table-column label="包名" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">
              {{ pickValue(row, ['pkgName', 'pkg_name'], '-') }}
            </template>
          </el-table-column>
          <el-table-column label="仓库版本" min-width="120" show-overflow-tooltip>
            <template #default="{ row }">
              {{ pickValue(row, ['pkgVersion', 'pkg_version'], '-') }}
            </template>
          </el-table-column>
          <el-table-column label="仓库Release版本" min-width="120" show-overflow-tooltip>
            <template #default="{ row }">
              {{ pickValue(row, ['pkgRelease', 'pkg_release'], '-') }}
            </template>
          </el-table-column>
          <el-table-column label="Epoch" width="90" align="center">
            <template #default="{ row }">
              {{ pickValue(row, ['pkgEpoch', 'pkg_epoch'], '-') }}
            </template>
          </el-table-column>
          <el-table-column label="架构" width="100" align="center">
            <template #default="{ row }">
              {{ pickValue(row, ['pkgArch', 'pkg_arch'], '-') }}
            </template>
          </el-table-column>
          <!-- <el-table-column label="比较版本" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">
              {{ pickValue(row, ['pkgCmpver', 'pkg_cmpver'], '-') }}
            </template>
          </el-table-column> -->
          <el-table-column label="完整 NEVRA" min-width="280" show-overflow-tooltip>
            <template #default="{ row }">
              {{ pickValue(row, ['pkgFullNevra', 'pkg_full_nevra'], '-') }}
            </template>
          </el-table-column>
          <el-table-column label="Repo" min-width="140" show-overflow-tooltip>
            <template #default="{ row }">
              {{ pickValue(row, ['repoName', 'repo_name'], '-') }}
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
import { Refresh } from '@element-plus/icons-vue'
import { parsePageResponse, pickValue } from '../../utils'
import { YUM_REPO_PAGE_SIZE_OPTIONS } from '../../yumRepoConstants'
import { yumRepoApi } from '../../yumRepoApi'
import {
  formatDateTime,
  getCollectStatusLabel,
  getCollectStatusTagType,
  getYumRepoLabel,
  isCollectRunning,
  resolveYumRepoId,
  unwrapResponse
} from '../../yumRepoUtils'
import { useWinPatchPolling } from '../../composables/useWinPatchPolling'

const props = defineProps({
  active: {
    type: Boolean,
    default: false
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

const currentRepo = computed(() =>
  props.repos.find(item => resolveYumRepoId(item) === String(selectedRepoModel.value || '').trim()) || null
)
const hasSelectedRepo = computed(() => Boolean(currentRepo.value))
const refreshing = computed(() => loadingStatus.value || loadingPackages.value)

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

const { isPolling, start, stop } = useWinPatchPolling(5000)
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
    const response = await yumRepoApi.getCollectStatus(selectedRepoModel.value)
    if (requestId !== statusRequestId) return

    statusData.value = unwrapResponse(response)
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
      sourceId: selectedRepoModel.value,
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
  gap: 12px;
}

.win-patch-yum-empty {
  display: flex;
  justify-content: center;
  padding: 36px 0 20px;
}

.win-patch-yum-status {
  margin-bottom: 0;
}

.win-patch-selection-text {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>
