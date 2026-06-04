<template>
  <div class="ops-page-layout win-patch-page">
    <!-- <WinPatchSummaryCards :items="summaryCards" compact /> -->

    <div class="ops-filter-bar">
      <el-form :inline="true" size="small">
        <el-form-item label="关键字">
          <el-input
            v-model="keyword"
            placeholder="按主机、主机 ID、系统版本过滤当前页"
            clearable
            style="width: 260px"
          />
        </el-form-item>
      </el-form>
    </div>

    <div class="ops-action-bar">
      <el-button type="primary" size="small" @click="openScanDialog()">创建扫描任务</el-button>
      <el-button
        size="small"
        :disabled="selectedHostRows.length === 0"
        @click="openScanDialog(selectedHostRows)"
      >
        扫描选中主机
      </el-button>
      <el-button size="small" @click="openReportDialog(selectedHostRows)">导出报告</el-button>
      <span class="win-patch-selection-text">已选 {{ selectedHostRows.length }} 台主机</span>
      <span style="flex: 1"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="loading"
        @click="loadPageData()"
      >
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <div class="ops-table-wrapper">
      <el-table
        v-loading="loading"
        :data="filteredHostList"
        max-height="calc(100vh - 320px)"
        @selection-change="selection => (selectedHostRows = selection)"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column label="主机" width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="openHostDrawer(row)">
              {{ resolveHostKey(row) }}
            </el-link>
          </template>
        </el-table-column>
        <!-- <el-table-column label="主机 ID" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ resolveHostId(row) || '-' }}
          </template>
        </el-table-column> -->
        <el-table-column label="操作系统" min-width="240" show-overflow-tooltip>
          <template #default="{ row }">
            {{ pickValue(row, ['osDistro', 'os_distro'], '-') }}
          </template>
        </el-table-column>
        <el-table-column label="版本" min-width="120">
          <template #default="{ row }">
            {{ pickValue(row, ['osVersion', 'os_version'], '-') }}
          </template>
        </el-table-column>
        <el-table-column label="架构" min-width="90">
          <template #default="{ row }">
            {{ pickValue(row, ['osArch', 'os_arch'], '-') }}
          </template>
        </el-table-column>
        <el-table-column label="缺失数" width="100" align="center">
          <template #default="{ row }">
            <span class="win-patch-metric win-patch-metric--danger">
              {{ pickValue(row, ['totalMissing', 'total_missing'], 0) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="严重" width="90" align="center">
          <template #default="{ row }">
            <span
              class="win-patch-severity-link win-patch-severity-link--critical"
              @click="openHostDrawerWithSeverity(row, 'Critical')"
            >
              {{ pickValue(row, ['criticalCount', 'critical_count'], 0) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="重要" width="90" align="center">
          <template #default="{ row }">
            <span
              class="win-patch-severity-link win-patch-severity-link--important"
              @click="openHostDrawerWithSeverity(row, 'Important')"
            >
              {{ pickValue(row, ['importantCount', 'important_count'], 0) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="中等" width="90" align="center">
          <template #default="{ row }">
            <span
              class="win-patch-severity-link win-patch-severity-link--moderate"
              @click="openHostDrawerWithSeverity(row, 'Moderate')"
            >
              {{ pickValue(row, ['moderateCount', 'moderate_count'], 0) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="低危" width="80" align="center">
          <template #default="{ row }">
            <span
              class="win-patch-severity-link win-patch-severity-link--low"
              @click="openHostDrawerWithSeverity(row, 'Low')"
            >
              {{ pickValue(row, ['lowCount', 'low_count'], 0) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="未分级" width="90" align="center">
          <template #default="{ row }">
            <span
              class="win-patch-severity-link win-patch-severity-link--unspecified"
              @click="openHostDrawerWithSeverity(row, 'Unspecified')"
            >
              {{ pickValue(row, ['unspecifiedCount', 'unspecified_count'], 0) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="已安装" width="90" align="center">
          <template #default="{ row }">
            <span class="win-patch-metric win-patch-metric--success">
              {{ pickValue(row, ['installedCount', 'installed_count'], 0) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="最后扫描时间" width="190" class-name="win-patch-table__time-column">
          <template #default="{ row }">
            {{ formatDateTime(pickValue(row, ['lastScanDate', 'last_scan_date'], '')) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="openHostDrawer(row)">
              查看补丁
            </el-button>
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

    <WinPatchScanDialog
      v-model="scanDialogVisible"
      :preselected-hosts="scanDialogHosts"
      :wsus-configs="wsusConfigs"
      @submitted="handleTaskSubmitted"
    />

    <WinPatchReportDialog v-model="reportDialogVisible" :preselected-hosts="reportDialogHosts" />

    <WinPatchHostPatchesDrawer
      v-model="hostDrawerVisible"
      :host-summary="currentHost"
      :initial-filters="hostDrawerInitialFilters"
      @task-submitted="handleTaskSubmitted"
    />

    <WinPatchTaskDetailDrawer v-model="taskDrawerVisible" :task-id="currentTaskId" />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Refresh } from '@element-plus/icons-vue'
import WinPatchHostPatchesDrawer from '../components/overview/WinPatchHostPatchesDrawer.vue'
import WinPatchReportDialog from '../components/overview/WinPatchReportDialog.vue'
import WinPatchScanDialog from '../components/overview/WinPatchScanDialog.vue'
import WinPatchSummaryCards from '../components/overview/WinPatchSummaryCards.vue'
import WinPatchTaskDetailDrawer from '../components/tasks/WinPatchTaskDetailDrawer.vue'
import { winPatchApi } from '../api'
import { WIN_PATCH_PAGE_SIZE_OPTIONS } from '../constants'
import {
  formatDateTime,
  formatNumber,
  parsePageResponse,
  pickValue,
  resolveHostId,
  resolveHostKey
} from '../utils'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const keyword = ref('')
const wsusConfigs = ref([])
const hostList = ref([])
const selectedHostRows = ref([])
const currentHost = ref(null)
const hostDrawerInitialFilters = ref(null)
const currentTaskId = ref('')
const taskTotal = ref(0)

const scanDialogVisible = ref(false)
const hostDrawerVisible = ref(false)
const reportDialogVisible = ref(false)
const taskDrawerVisible = ref(false)
const reportDialogHosts = ref([])
const scanDialogHosts = ref([])

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const filteredHostList = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  if (!query) return hostList.value

  return hostList.value.filter(row => {
    const text = [
      resolveHostKey(row),
      resolveHostId(row),
      pickValue(row, ['osDistro', 'os_distro'], ''),
      pickValue(row, ['osVersion', 'os_version'], '')
    ]
      .join(' ')
      .toLowerCase()

    return text.includes(query)
  })
})

const summaryCards = computed(() => {
  const missingCount = hostList.value.reduce(
    (total, row) => total + Number(pickValue(row, ['totalMissing', 'total_missing'], 0) || 0),
    0
  )

  return [
    {
      label: 'WSUS 配置',
      value: formatNumber(wsusConfigs.value.length),
      helper: '当前租户可用配置数'
    },
    {
      label: '纳管主机',
      value: formatNumber(pagination.total),
      helper: '主机补丁概览总数'
    },
    {
      label: '当前页缺失补丁',
      value: formatNumber(missingCount),
      helper: '按当前页主机统计'
    },
    {
      label: '任务总数',
      value: formatNumber(taskTotal.value),
      helper: '扫描、安装、回滚任务总数'
    }
  ]
})

async function loadPageData() {
  loading.value = true
  try {
    const [wsusResponse, hostResponse, taskResponse] = await Promise.all([
      winPatchApi.getWsusConfigs(),
      winPatchApi.getHosts({
        page: pagination.page - 1,
        size: pagination.pageSize
      }),
      winPatchApi.getTasks({ page: 0, size: 1 })
    ])

    wsusConfigs.value = Array.isArray(wsusResponse?.data) ? wsusResponse.data : []

    const hostPage = parsePageResponse(hostResponse)
    hostList.value = hostPage.content
    pagination.total = hostPage.total
    selectedHostRows.value = []

    const taskPage = parsePageResponse(taskResponse)
    taskTotal.value = taskPage.total
  } finally {
    loading.value = false
  }
}

function openScanDialog(rows = []) {
  scanDialogHosts.value = rows
  scanDialogVisible.value = true
}

function openReportDialog(rows = []) {
  reportDialogHosts.value = rows
  reportDialogVisible.value = true
}

function openHostDrawer(row, initialFilters = null) {
  currentHost.value = row
  hostDrawerInitialFilters.value = initialFilters ? { ...initialFilters } : null
  hostDrawerVisible.value = true
}

function openHostDrawerWithSeverity(row, severity) {
  openHostDrawer(row, {
    severity,
    patchStatus: 'no_repair'
  })
}

function handleTaskSubmitted(task) {
  currentTaskId.value = pickValue(task, ['id'], '')
  taskDrawerVisible.value =
    Boolean(currentTaskId.value) && pickValue(task, ['openDetail'], true) !== false

  if (pickValue(task, ['refreshOverview'], true) !== false) {
    loadPageData()
  }
}

function handlePageChange(page) {
  pagination.page = page
  loadPageData()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  loadPageData()
}

function normalizeDialogValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function replaceToOverviewIfNeeded(dialogType) {
  if (normalizeDialogValue(route.query.dialog) !== dialogType) {
    return
  }

  router.replace({ path: '/patches/windowsVulnerability' })
}

watch(
  () => route.query.dialog,
  dialog => {
    const normalized = normalizeDialogValue(dialog)

    if (normalized === 'report') {
      openReportDialog(selectedHostRows.value)
      return
    }

    if (normalized) {
      router.replace({ path: '/patches/windowsVulnerability' })
    }
  },
  { immediate: true }
)

watch(reportDialogVisible, visible => {
  if (!visible) {
    replaceToOverviewIfNeeded('report')
  }
})

onMounted(() => {
  loadPageData()
})
</script>

<style scoped lang="scss">
.win-patch-page {
  gap: 12px;
}

.win-patch-selection-text {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.win-patch-metric {
  font-weight: 600;
}

.win-patch-metric--danger {
  color: var(--el-color-danger);
}

.win-patch-metric--success {
  color: var(--el-color-success);
}

.win-patch-severity-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }
}

.win-patch-severity-link--critical {
  color: var(--el-color-danger);
}

.win-patch-severity-link--important {
  color: var(--el-color-warning);
}

.win-patch-severity-link--moderate {
  color: var(--el-color-primary);
}

.win-patch-severity-link--low {
  color: var(--el-color-success);
}

.win-patch-severity-link--unspecified {
  color: var(--el-text-color-secondary);
}

:deep(.win-patch-table__time-column .cell) {
  white-space: nowrap;
}
</style>
