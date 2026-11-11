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
        <el-form-item label="健康状态">
          <el-select
            v-model="filters.status"
            clearable
            placeholder="全部状态"
            style="width: 140px"
            @change="handleSearch"
          >
            <el-option label="全部状态" value="" />
            <el-option
              v-for="item in HEALTH_STATUS_LIST"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="关键字">
          <el-input
            v-model="filters.keyword"
            placeholder="输入主机 IP 或主机名模糊匹配"
            clearable
            style="width: 220px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="hostsLoading" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleResetFilters">
            <el-icon><RefreshRight /></el-icon>
            重置
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
        {{ isRunInProgress ? '巡检执行中...' : '立即巡检全部主机' }}
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
        对选中主机重新巡检
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
        评分规则说明
      </el-button>

      <span class="action-bar-spacer"></span>

      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="hostsLoading || summaryLoading"
        title="刷新"
        aria-label="刷新主机健康巡检数据"
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

        <el-table-column prop="hostIp" label="主机 IP" width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="openHostDetail(row)">
              {{ row.hostIp || '—' }}
            </el-link>
          </template>
        </el-table-column>

        <el-table-column prop="hostname" label="主机名" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.hostname || '—' }}
          </template>
        </el-table-column>

        <el-table-column prop="os" label="操作系统" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.os || '—' }}
          </template>
        </el-table-column>

        <el-table-column prop="status" label="健康状态" width="105">
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

        <el-table-column prop="score" label="健康评分" width="90">
          <template #default="{ row }">
            <span
              v-if="row.status === 'UNREACHABLE'"
              class="score-unscored-text"
              title="主机不可达，未执行巡检，未参与健康评分"
            >
              —
            </span>
            <span
              v-else-if="row.status === 'UNCHECKED'"
              class="score-unscored-text"
              title="未巡检，暂无评分"
            >
              —
            </span>
            <span v-else class="score-value-text">
              {{ formatHostScore(row) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="风险提示" min-width="300">
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

        <el-table-column prop="checkTime" label="最近巡检时间" width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatHealthDateTime(row.checkTime) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openHostDetail(row)">
              详情
            </el-button>
            <el-button
              link
              type="primary"
              :disabled="runSubmitting || isRunInProgress"
              @click="handleRunSingleHost(row)"
            >
              重新巡检
            </el-button>
          </template>
        </el-table-column>

        <template #empty>
          <el-empty description="暂无符合条件的主机健康数据" :image-size="80" />
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
      job-title="主机健康巡检"
      @settled="handleRunResultSettled"
    />
  </div>
</template>

<script setup>
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
      '确定立即对全部纳管 Linux 主机发起健康巡检吗？',
      '立即巡检确认',
      {
        confirmButtonText: '立即巡检',
        cancelButtonText: '取消',
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
