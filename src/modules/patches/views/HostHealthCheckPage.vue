<template>
  <div class="ops-page-layout">
    <!-- 1. 健康概览与状态分布卡片 -->
    <HostHealthSummaryBar
      :summary="summary"
      :loading="summaryLoading"
      :active-status="filters.status"
      @select-status="handleStatusCardFilter"
      @view-run-detail="openRunResultDialog"
    />

    <!-- 2. 筛选栏 -->
    <div class="ops-filter-bar mb-2">
      <el-form :model="filters" inline size="small" @submit.prevent>
        <el-form-item :label="t('asset.health.status')">
          <el-select
            v-model="filters.status"
            clearable
            :placeholder="t('asset.health.allStatuses')"
            style="width: 140px"
            @change="handleSearch"
          >
            <el-option :label="t('asset.health.allStatuses')" value="" />
            <el-option
              v-for="item in HEALTH_STATUS_LIST"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item :label="t('asset.health.keyword')">
          <el-input
            v-model="filters.keyword"
            :placeholder="t('asset.health.searchPlaceholder')"
            clearable
            style="width: 220px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="hostsLoading" @click="handleSearch">
            <el-icon><Search /></el-icon>
            {{ t('common.search') }}
          </el-button>
          <el-button @click="handleResetFilters">
            <el-icon><RefreshRight /></el-icon>
            {{ t('common.reset') }}
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 3. 操作栏 -->
    <div class="ops-action-bar">
      <el-button
        type="primary"
        size="small"
        :loading="runSubmitting || isRunInProgress"
        :disabled="runSubmitting || isRunInProgress"
        @click="handleRunAll"
      >
        <i class="fas fa-play me-1" aria-hidden="true"></i>
        {{ isRunInProgress ? t('asset.health.running') : t('asset.health.runAll') }}
      </el-button>

      <el-button
        type="primary"
        size="small"
        plain
        :loading="runSubmitting"
        :disabled="selectedHostIds.length === 0 || runSubmitting || isRunInProgress"
        @click="handleRunSelected"
      >
        <i class="fas fa-sync-alt me-1" aria-hidden="true"></i>
        {{ t('asset.health.runSelected') }}
        <span v-if="selectedHostIds.length > 0">({{ selectedHostIds.length }})</span>
      </el-button>

      <!-- <el-button
        v-if="summary.latestRun?.runId"
        size="small"
        :type="isRunInProgress ? 'primary' : 'default'"
        :plain="isRunInProgress"
        @click="openRunResultDialog(summary.latestRun.runId)"
      >
        <i class="fas fa-terminal me-1" aria-hidden="true"></i>
        {{ isRunInProgress ? '查看实时巡检进度' : '最近巡检作业详情' }}
      </el-button> -->

      <el-button size="small" @click="scoringDialogVisible = true">
        <i class="fas fa-book-open me-1" aria-hidden="true"></i>
        {{ t('asset.health.scoringRules') }}
      </el-button>

      <span class="action-bar-spacer"></span>

      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="hostsLoading || summaryLoading"
        :title="t('common.refresh')"
        :aria-label="t('asset.health.refreshData')"
        @click="refreshAll"
      >
        <el-icon v-show="!hostsLoading && !summaryLoading"><Refresh /></el-icon>
      </el-button>
    </div>

    <!-- 4. 主机健康列表表格 -->
    <div v-loading="hostsLoading" class="ops-table-wrapper">
      <el-table
        ref="tableRef"
        :data="hostList"
        row-key="hostId"
        height="100%"
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="46" reserve-selection />

        <el-table-column prop="hostIp" :label="t('asset.health.hostIp')" width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="openHostDetail(row)">
              {{ row.hostIp || '—' }}
            </el-link>
          </template>
        </el-table-column>

        <el-table-column prop="hostname" :label="t('asset.health.hostname')" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.hostname || '—' }}
          </template>
        </el-table-column>

        <el-table-column prop="os" :label="t('asset.health.os')" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.os || '—' }}
          </template>
        </el-table-column>

        <el-table-column prop="status" :label="t('asset.health.status')" width="105">
          <template #default="{ row }">
            <el-tag
              :type="getHealthStatusMeta(row.status).tagType"
              :class="['health-status-tag', `health-status-tag--${row.status.toLowerCase()}`]"
              size="small"
              round
            >
              <i
                v-if="row.status === 'UNREACHABLE'"
                class="fas fa-unlink tag-icon-mini"
                aria-hidden="true"
              ></i>
              {{ getHealthStatusMeta(row.status).label }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="score" :label="t('asset.health.score')" width="90">
          <template #default="{ row }">
            <span
              v-if="row.status === 'UNREACHABLE'"
              class="score-unscored-text"
              :title="t('asset.health.unreachableScoreHint')"
            >
              —
            </span>
            <span
              v-else-if="row.status === 'UNCHECKED'"
              class="score-unscored-text"
              :title="t('asset.health.uncheckedScoreHint')"
            >
              —
            </span>
            <span v-else class="score-value-text">
              {{ formatHostScore(row) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column :label="t('asset.health.risks')" min-width="300">
          <template #default="{ row }">
            <div
              class="risk-summary-clamp"
              :class="{ 'is-muted': !row.risks?.length && row.status !== 'UNREACHABLE' }"
              :title="formatHostRiskSummary(row)"
            >
              {{ formatHostRiskSummary(row) }}
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="checkTime" :label="t('asset.health.lastCheckTime')" width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatHealthDateTime(row.checkTime) }}
          </template>
        </el-table-column>

        <el-table-column :label="t('common.actions')" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openHostDetail(row)">
              {{ t('asset.health.details') }}
            </el-button>
            <el-button
              link
              type="primary"
              :disabled="runSubmitting || isRunInProgress"
              @click="handleRunSingleHost(row)"
            >
              {{ t('asset.health.recheck') }}
            </el-button>
          </template>
        </el-table-column>

        <template #empty>
          <el-empty :description="t('asset.health.noMatchingHosts')" :image-size="80" />
        </template>
      </el-table>
    </div>

    <!-- 5. 分页栏 -->
    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="filters.page"
        v-model:page-size="filters.size"
        :page-sizes="[10, 20, 50, 100, 200]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 6. 主机检查项详情抽屉 -->
    <HostHealthDetailDrawer
      v-model="detailDrawerVisible"
      :host="currentDetailHost"
      :recheck-loading="runSubmitting"
      :recheck-disabled="runSubmitting || isRunInProgress"
      @recheck-host="handleRunSingleHost"
    />

    <!-- 7. 检查项与扣分标准弹窗 -->
    <HostHealthScoringRulesDialog v-model="scoringDialogVisible" />

    <!-- 8. 巡检作业运行结果详情弹窗 -->
    <ExecuteResultDialog
      v-model:visible="runResultDialogVisible"
      :run-id="activeRunResultId"
      :job-title="t('asset.health.jobTitle')"
      @settled="handleRunResultSettled"
    />
  </div>
</template>

<script setup>
import { t } from '@/core/i18n'

import { ref, computed, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { Search, RefreshRight, Refresh } from '@element-plus/icons-vue'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import { HEALTH_STATUS_LIST } from '../constants/hostHealth'
import {
  getHealthStatusMeta,
  formatHealthDateTime,
  formatHostScore,
  formatHostRiskSummary
} from '../utils/hostHealth'
import { useHostHealthCheck } from '../composables/useHostHealthCheck'
import HostHealthSummaryBar from '../components/host-health/HostHealthSummaryBar.vue'
import HostHealthDetailDrawer from '../components/host-health/HostHealthDetailDrawer.vue'
import HostHealthScoringRulesDialog from '../components/host-health/HostHealthScoringRulesDialog.vue'

defineOptions({
  name: 'HostHealthCheckPage'
})

const {
  summaryLoading,
  hostsLoading,
  runSubmitting,
  isRunInProgress,
  summary,
  hostList,
  total,
  filters,
  selectedHostIds,
  refreshAll,
  handleSearch,
  handleResetFilters,
  handleStatusCardFilter,
  handlePageChange,
  handleSizeChange,
  handleSelectionChange,
  triggerHealthRun
} = useHostHealthCheck()

const tableRef = ref(null)
const detailDrawerVisible = ref(false)
const activeDetailHostId = ref('')
const fallbackDetailHost = ref(null)
const scoringDialogVisible = ref(false)
const runResultDialogVisible = ref(false)
const activeRunResultId = ref('')

// 当列表自动刷新后，抽屉内展示的主机数据同步更新
const currentDetailHost = computed(() => {
  if (!activeDetailHostId.value) return fallbackDetailHost.value
  return (
    hostList.value.find(item => item.hostId === activeDetailHostId.value) ||
    fallbackDetailHost.value
  )
})

function openHostDetail(row) {
  activeDetailHostId.value = row.hostId || ''
  fallbackDetailHost.value = row
  detailDrawerVisible.value = true
}

function openRunResultDialog(runId) {
  const targetRunId = String(runId || summary.value?.latestRun?.runId || '').trim()
  if (!targetRunId) return
  activeRunResultId.value = targetRunId
  runResultDialogVisible.value = true
}

function handleRunResultSettled() {
  refreshAll()
}

async function handleRunAll() {
  try {
    await ElMessageBox.confirm(
      t('asset.health.runAllConfirm'),
      t('asset.health.runConfirmTitle'),
      {
        confirmButtonText: t('asset.health.runNow'),
        cancelButtonText: t('common.cancel'),
        type: 'info'
      }
    )
    const runId = await triggerHealthRun()
    if (runId) {
      openRunResultDialog(runId)
    }
  } catch {
    // 用户取消
  }
}

async function handleRunSelected() {
  if (!selectedHostIds.value.length) return
  const runId = await triggerHealthRun(selectedHostIds.value)
  if (runId) {
    if (tableRef.value) {
      tableRef.value.clearSelection()
    }
    openRunResultDialog(runId)
  }
}

async function handleRunSingleHost(row) {
  if (!row?.hostId) return
  const runId = await triggerHealthRun([row.hostId])
  if (runId) {
    openRunResultDialog(runId)
  }
}

onMounted(() => {
  refreshAll()
})
</script>

<style scoped lang="scss">
.action-bar-spacer {
  flex: 1;
}

/* 评分列显示微调 */
.score-unscored-text {
  color: var(--el-text-color-placeholder);
  font-family: inherit;
  cursor: help;
}

.score-value-text {
  font-weight: 600;
  color: var(--el-text-color-primary);
  font-variant-numeric: tabular-nums;
}

/* 风险提示列：最多展示两行，超出省略，告别频繁单行鼠标移入 */
.risk-summary-clamp {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.45;
  font-size: 12px;
  color: var(--el-text-color-regular);
  word-break: break-all;
  user-select: text;

  &.is-muted {
    color: var(--el-text-color-placeholder);
  }
}

/* 健康状态 Tag 定制增强（提升不可达等状态辨识度与对比度，避免过度使用红色） */
:deep(.health-status-tag) {
  font-weight: 600;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;

  .tag-icon-mini {
    font-size: 10px;
    opacity: 0.85;
  }

  /* 不可达：低饱和度石板冷灰（深色文字 + 清晰轮廓），告别发虚与无力感 */
  &.health-status-tag--unreachable {
    background-color: #f1f5f9;
    border-color: #cbd5e1;
    color: #334155;

    .tag-icon-mini {
      color: #475569;
    }
  }

  &.health-status-tag--healthy {
    background-color: #ecfdf5;
    border-color: #a7f3d0;
    color: #065f46;
  }

  &.health-status-tag--warning {
    background-color: #fffbeb;
    border-color: #fde68a;
    color: #92400e;
  }

  &.health-status-tag--critical {
    background-color: #fef2f2;
    border-color: #fecaca;
    color: #991b1b;
  }

  &.health-status-tag--unchecked {
    background-color: #f8fafc;
    border-color: #e2e8f0;
    color: #64748b;
  }
}
</style>
