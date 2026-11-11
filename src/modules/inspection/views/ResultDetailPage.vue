<template>
  <div class="ops-page-layout result-detail-page">
    <!-- 报告概览与结果统计并排总览面板 -->
    <section class="report-overview-card">
      <!-- 顶部导航与操作栏 -->
      <nav class="page-navbar">
        <div class="navbar-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item>
              <a :href="router.resolve(reportReturn.location).href" @click.prevent="goBack">
                {{ reportReturn.label }}
              </a>
            </el-breadcrumb-item>
            <el-breadcrumb-item>{{ jobInfo.templateName || '检查结果' }}</el-breadcrumb-item>
          </el-breadcrumb>
          <el-tag
            v-if="jobInfo.jobStatus"
            :type="getJobStatusType(jobInfo.jobStatus)"
            size="small"
          >
            {{ getJobStatusText(jobInfo.jobStatus) }}
          </el-tag>
        </div>
        <div class="navbar-right">
          <el-button size="small" @click="assetModelConfigVisible = true">
            导出列配置
          </el-button>
          <el-button type="primary" size="small" @click="exportResult">
            导出结果
          </el-button>
        </div>
      </nav>

      <!-- 左右分栏：左侧执行信息，右侧检查结果统计 -->
      <div v-loading="loading" class="report-overview-body">
        <div class="job-meta-panel">
          <div class="meta-item">
            <span class="meta-label">开始时间</span>
            <span class="meta-value meta-value--mono">{{ formatDateTime(jobInfo.createdAt) || '—' }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">结束时间</span>
            <span class="meta-value meta-value--mono">{{ formatDateTime(jobInfo.endedAt) || '—' }}</span>
          </div>
          <div
            class="meta-item"
            :title="hostList.map(item => item.hostKey).join('、')"
          >
            <span class="meta-label">配置主机</span>
            <span class="meta-value">
              <strong>{{ hostList.length }}</strong> 台
              <span v-if="hostList.length" class="meta-subtext">
                （{{ hostList.slice(0, 2).map(item => item.hostKey).join('、') }}{{ hostList.length > 2 ? ' 等' : '' }}）
              </span>
            </span>
          </div>
          <div
            class="meta-item"
            :title="scriptList.map(item => item.scriptPath || getInspectionScriptLabel(item)).join('、')"
          >
            <span class="meta-label">执行脚本</span>
            <span class="meta-value meta-value--ellipsis">
              <template v-if="scriptList.length">
                {{ scriptList.map(item => getInspectionScriptLabel(item)).join('、') }}
              </template>
              <template v-else>—</template>
            </span>
          </div>
        </div>

        <StatisticsCards
          v-loading="statsLoading"
          :statistics="statistics"
          @click="handleStatClick"
        />
      </div>
    </section>

    <!-- 明细列表面板 -->
    <section class="tabs-container">
      <div class="workspace-header">
        <el-tabs v-model="activeTab" class="workspace-tabs">
          <el-tab-pane name="host">
            <template #label>
              <span class="tab-label-item">
                主机明细
                <span v-if="pagination.total" class="tab-count-pill">{{ pagination.total }}</span>
              </span>
            </template>
          </el-tab-pane>
          <el-tab-pane name="overview">
            <template #label>
              <span class="tab-label-item">
                检查项汇总
                <span v-if="overviewPagination.total" class="tab-count-pill">
                  {{ overviewPagination.total }}
                </span>
              </span>
            </template>
          </el-tab-pane>
        </el-tabs>

        <!-- 工具栏 -->
        <div class="toolbar">
          <template v-if="activeTab === 'host'">
            <div class="toolbar-batch-actions">
              <el-button size="small" :disabled="selectedHostIds.length === 0" @click="addToWhitelist">
                添加黑名单
              </el-button>
              <el-button
                size="small"
                :disabled="selectedHostIds.length === 0"
                @click="removeFromWhitelist"
              >
                移除黑名单
              </el-button>
              <el-button size="small" @click="dialogs.showWhitelistDialog()">
                黑名单列表
              </el-button>
            </div>
          </template>
          <div class="toolbar-right">
            <el-input
              v-if="activeTab === 'host'"
              v-model="hostSearchText"
              placeholder="搜索主机"
              clearable
              size="small"
              style="width: 200px"
              @keyup.enter="handleSearch"
              @clear="handleSearch"
            >
              <template #prefix>
                <i class="fa fa-search" aria-hidden="true"></i>
              </template>
            </el-input>
            <el-input
              v-else
              v-model="overviewSearchText"
              placeholder="搜索检查项"
              clearable
              size="small"
              style="width: 200px"
              @keyup.enter="handleSearch"
              @clear="handleSearch"
            >
              <template #prefix>
                <i class="fa fa-search" aria-hidden="true"></i>
              </template>
            </el-input>
            <el-button type="primary" size="small" @click="handleSearch">搜索</el-button>
            <el-button
              class="toolbar-icon-btn"
              size="small"
              circle
              title="刷新"
              @click="refreshData"
            >
              <i class="fa fa-sync-alt" aria-hidden="true"></i>
            </el-button>
          </div>
        </div>
      </div>

      <!-- 主机明细表格 -->
      <div v-if="activeTab === 'host'" class="table-container">
        <div class="workspace-table-wrapper">
          <el-table
            v-loading="tableLoading"
            :data="machineData"
            height="100%"
            style="width: 100%"
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="46" />
            <el-table-column prop="host_key" label="主机" min-width="150">
              <template #default="{ row }">
                <el-button type="primary" link class="host-link-btn" @click="handleHostClick(row)">
                  {{ row.host_key }}
                </el-button>
              </template>
            </el-table-column>
            <el-table-column prop="os_distro" label="操作系统" min-width="160" show-overflow-tooltip />
            <el-table-column prop="os_version" label="系统版本" width="110" />
            <el-table-column label="黑名单" width="100" align="left">
              <template #default="{ row }">
                <el-tag v-if="row.black_count > 0" type="warning" size="small">
                  是
                </el-tag>
                <el-tag v-else type="info" size="small" effect="plain">否</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="失败" width="90" align="right">
              <template #default="{ row }">
                <el-button
                  :type="row.failed_count > 0 ? 'danger' : 'info'"
                  link
                  class="metric-link-btn"
                  @click="dialogs.showItemsByStatus(row, 'FAILED')"
                >
                  {{ row.failed_count }}
                </el-button>
              </template>
            </el-table-column>
            <el-table-column label="数据缺失" width="100" align="right">
              <template #default="{ row }">
                <el-button
                  :type="row.unreachable_count > 0 ? 'warning' : 'info'"
                  link
                  class="metric-link-btn"
                  @click="dialogs.showItemsByStatus(row, 'UNREACHABLE')"
                >
                  {{ row.unreachable_count }}
                </el-button>
              </template>
            </el-table-column>
            <el-table-column label="人工检查" width="100" align="right">
              <template #default="{ row }">
                <el-button
                  :type="row.check_count > 0 ? 'primary' : 'info'"
                  link
                  class="metric-link-btn"
                  @click="dialogs.showItemsByStatus(row, 'CHECK')"
                >
                  {{ row.check_count }}
                </el-button>
              </template>
            </el-table-column>
            <el-table-column label="已跳过" width="90" align="right">
              <template #default="{ row }">
                <el-button
                  type="info"
                  link
                  class="metric-link-btn"
                  @click="dialogs.showItemsByStatus(row, 'SKIPPING')"
                >
                  {{ row.skipping_count }}
                </el-button>
              </template>
            </el-table-column>
            <el-table-column label="检查通过" width="100" align="right">
              <template #default="{ row }">
                <el-button
                  :type="row.ok_count > 0 ? 'success' : 'info'"
                  link
                  class="metric-link-btn"
                  @click="dialogs.showItemsByStatus(row, 'OK')"
                >
                  {{ row.ok_count }}
                </el-button>
              </template>
            </el-table-column>
            <el-table-column prop="check_item_count" label="检查项" width="90" align="right">
              <template #default="{ row }">
                <el-button
                  type="primary"
                  link
                  class="metric-link-btn"
                  @click="dialogs.showHostDetail(row)"
                >
                  {{ row.check_item_count }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 分页 -->
        <div class="ops-pagination-wrapper workspace-footer">
          <span class="workspace-note">
            点击主机可管理单机检查项黑名单；点击各状态数值可查看该主机对应的检查项输出。
          </span>
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.size"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @size-change="handlePageSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </div>

      <!-- 检查项汇总表格 -->
      <div v-else-if="activeTab === 'overview'" class="table-container">
        <div class="workspace-table-wrapper">
          <el-table
            v-loading="overviewLoading"
            :data="overviewData"
            style="width: 100%"
            height="100%"
          >
            <el-table-column prop="name" label="检查项名称" min-width="320">
              <template #default="{ row }">
                <el-button type="primary" link @click="dialogs.showCheckItemHostsDialog(row)">
                  {{ row.name }}
                </el-button>
              </template>
            </el-table-column>
            <el-table-column prop="check_host_count" label="覆盖主机数" width="140" align="right">
              <template #default="{ row }">
                <el-button
                  type="primary"
                  link
                  class="metric-link-btn"
                  @click="dialogs.showCheckItemHostsDialog(row)"
                >
                  {{ row.check_host_count }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 分页 -->
        <div class="ops-pagination-wrapper workspace-footer">
          <span class="workspace-note">点击检查项名称或覆盖主机数，可查看所有主机在该检查项上的检查结果。</span>
          <el-pagination
            v-model:current-page="overviewPagination.page"
            v-model:page-size="overviewPagination.size"
            :page-sizes="[10, 20, 50, 100]"
            :total="overviewPagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @size-change="handleOverviewPageSizeChange"
            @current-change="handleOverviewPageChange"
          />
        </div>
      </div>
    </section>

    <!-- 巡检项详情弹窗 -->
    <el-dialog
      v-model="inspectionDetailVisible"
      :title="`主机检查项明细${selectedHost ? ' · ' + selectedHost.host_key : ''}`"
      width="1160px"
      class="inspection-detail-dialog"
      append-to-body
      destroy-on-close
      :close-on-click-modal="true"
    >
      <div class="inspection-dialog-toolbar">
        <div class="inspection-dialog-filters">
          <el-select
            v-model="inspectionResultFilter"
            placeholder="全部状态"
            clearable
            size="small"
            style="width: 130px"
          >
            <el-option label="通过" value="OK" />
            <el-option label="失败" value="FAILED" />
            <el-option label="人工检查" value="CHECK" />
            <el-option label="已跳过" value="SKIPPING" />
            <el-option label="无数据" value="UNREACHABLE" />
          </el-select>
          <el-input
            v-model="inspectionSearchText"
            placeholder="输入检查项或输出内容搜索"
            clearable
            size="small"
            style="width: 240px"
          >
            <template #prefix>
              <i class="fa fa-search" aria-hidden="true"></i>
            </template>
          </el-input>
        </div>
        <el-button size="small" @click="dialogs.showItemWhitelist()">
          <i class="fa fa-list-ul" aria-hidden="true"></i>
          检查项黑名单列表
        </el-button>
      </div>
      <div v-if="inspectionRefreshFailed" class="inspection-refresh-alert" role="alert">
        <span>检查项刷新失败，当前列表可能不是最新数据。</span>
        <el-button link type="primary" :disabled="inspectionDetailLoading" @click="retryInspection">
          重试刷新
        </el-button>
      </div>
      <el-table
        v-loading="inspectionDetailLoading"
        :data="pagedInspectionData"
        style="width: 100%"
        max-height="calc(100vh - 350px)"
      >
        <el-table-column prop="hostKey" label="主机" width="140" />
        <el-table-column prop="name" label="检查项" min-width="180" show-overflow-tooltip />
        <el-table-column label="检查结果" width="104" align="left">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'OK'" type="success" size="small">通过</el-tag>
            <el-tag v-else-if="row.status === 'FAILED'" type="danger" size="small">失败</el-tag>
            <el-tag v-else-if="row.status === 'CHECK'" type="warning" size="small">人工检查</el-tag>
            <el-tag v-else-if="row.status === 'SKIPPING'" type="info" size="small">已跳过</el-tag>
            <el-tag v-else type="info" size="small">无数据</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="output" label="原始输出摘要" min-width="320" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="output-snippet">{{ row.output || '无' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="!isInWhitelist(row)"
              type="primary"
              link
              :disabled="inspectionDetailLoading || inspectionRefreshFailed"
              @click="handleAddToWhitelist(row)"
            >
              添加黑名单
            </el-button>
            <el-button
              v-else
              type="danger"
              link
              :disabled="inspectionDetailLoading || inspectionRefreshFailed"
              @click="handleRemoveFromWhitelist(row)"
            >
              移出黑名单
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页组件 -->
      <div
        class="ops-pagination-wrapper"
        style="margin-top: 16px; display: flex; justify-content: flex-end"
      >
        <el-pagination
          v-model:current-page="inspectionPage"
          v-model:page-size="inspectionPageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="filteredInspectionData.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleInspectionSizeChange"
          @current-change="handleInspectionPageChange"
        />
      </div>
    </el-dialog>

    <!-- 弹窗组件 -->
    <HostDetailDialog
      :visible="dialogs.hostDetailVisible.value"
      :host="dialogs.currentHost.value"
      :machine-info="dialogs.hostMachineInfo.value"
      :check-items="dialogs.hostCheckItems.value"
      :loading="dialogs.hostCheckItemsLoading.value"
      :status-filter="dialogs.hostDetailStatusFilter.value"
      @close="dialogs.hostDetailVisible.value = false"
      @filter-change="handleHostFilterChange"
      @show-detail="handleKpiShowDetail"
    />

    <KpiDetailDialog
      :visible="dialogs.kpiDialogVisible.value"
      :title="dialogs.kpiDialogTitle.value"
      :data="dialogs.kpiDialogData.value"
      :loading="dialogs.kpiDialogLoading.value"
      @close="dialogs.kpiDialogVisible.value = false"
      @show-detail="handleKpiShowDetail"
    />

    <CheckItemDetailDialog
      :visible="dialogs.checkItemDetailVisible.value"
      :item="dialogs.currentCheckItem.value"
      :loading="dialogs.checkItemDetailLoading.value"
      :template-id="jobInfo.templateId"
      :template-name="jobInfo.templateName"
      :script-path="getScriptPath()"
      :show-whitelist-button="showWhitelistButton"
      @close="dialogs.checkItemDetailVisible.value = false"
      @whitelist-changed="handleWhitelistChanged"
    />

    <CheckItemHostsDialog
      :visible="dialogs.checkItemHostsVisible.value"
      :item-name="dialogs.currentCheckItemName.value"
      :data="dialogs.checkItemHostsData.value"
      :loading="dialogs.checkItemHostsLoading.value"
      :status-filter="dialogs.checkItemHostsStatusFilter.value"
      @close="dialogs.checkItemHostsVisible.value = false"
      @filter-change="handleCheckItemFilterChange"
      @show-detail="handleKpiShowDetail"
    />

    <WhitelistDialog
      :visible="dialogs.whitelistVisible.value"
      :data="dialogs.whitelistData.value"
      :loading="dialogs.whitelistLoading.value"
      @close="dialogs.whitelistVisible.value = false"
      @remove-selected="dialogs.removeSelectedWhitelist"
      @update:selected-ids="ids => (dialogs.selectedWhitelistIds.value = ids)"
    />

    <ItemWhitelistDialog
      :visible="dialogs.itemWhitelistVisible.value"
      :data="dialogs.itemWhitelistData.value"
      :loading="dialogs.itemWhitelistLoading.value"
      @close="dialogs.itemWhitelistVisible.value = false"
      @delete="handleItemWhitelistDelete"
    />

    <AssetModelConfigDialog
      :visible="assetModelConfigVisible"
      @close="assetModelConfigVisible = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { authService } from '@/core/auth'
import { jobApi, whitelistApi } from '../api'
import { getReportReturnTarget } from '../utils/report-navigation'

// 导入拆分的模块
import { formatDateTime } from '../utils/helpers'
import { getInspectionScriptLabel } from '../utils/scriptPresentation'
import { getJobStatusType, getJobStatusText } from '../constants/status'
import { useResultDetailData } from '../composables/useResultDetailData'
import { useResultDetailDialogs } from '../composables/useResultDetailDialogs'
import {
  AssetModelConfigDialog,
  StatisticsCards,
  HostDetailDialog,
  KpiDetailDialog,
  CheckItemDetailDialog,
  CheckItemHostsDialog,
  WhitelistDialog,
  ItemWhitelistDialog
} from '../components/result-detail'

const route = useRoute()
const router = useRouter()

// 使用数据 composable
const {
  loading,
  statsLoading,
  tableLoading,
  overviewLoading,
  jobId,
  jobInfo,
  hostList,
  scriptList,
  statistics,
  machineData,
  pagination,
  overviewData,
  overviewPagination,
  loadStatistics,
  loadMachineData,
  loadOverviewData,
  initData
} = useResultDetailData()

// 使用弹窗 composable
const dialogs = useResultDetailDialogs(jobId, jobInfo, () => route.fullPath)

// 本地状态
const activeTab = ref('host')
const hostSearchText = ref('')
const overviewSearchText = ref('')
const selectedHostIds = ref([])
const assetModelConfigVisible = ref(false)

// 巡检项详情状态
const selectedHost = ref(null)
const inspectionDetailVisible = ref(false)
const inspectionReadLoading = ref(false)
const inspectionMutationLoading = ref(false)
const inspectionDetailLoading = computed(
  () => inspectionReadLoading.value || inspectionMutationLoading.value
)
const inspectionRefreshFailed = ref(false)
let inspectionSession = 0
let inspectionRequest = 0
const inspectionDetailData = ref([])
const showWhitelistButton = ref(true)
const inspectionSearchText = ref('')
const inspectionResultFilter = ref('')

// 前端分页状态
const inspectionPage = ref(1)
const inspectionPageSize = ref(10)

const filteredInspectionData = computed(() => {
  let data = inspectionDetailData.value
  if (inspectionSearchText.value) {
    const keyword = inspectionSearchText.value.toLowerCase()
    data = data.filter(
      item =>
        item.name?.toLowerCase().includes(keyword) || item.output?.toLowerCase().includes(keyword)
    )
  }
  if (inspectionResultFilter.value) {
    data = data.filter(item => item.status === inspectionResultFilter.value)
  }
  return data
})

const pagedInspectionData = computed(() => {
  const start = (inspectionPage.value - 1) * inspectionPageSize.value
  const end = start + inspectionPageSize.value
  return filteredInspectionData.value.slice(start, end)
})

watch([inspectionSearchText, inspectionResultFilter], () => {
  inspectionPage.value = 1
})

function handleInspectionPageChange(page) {
  inspectionPage.value = page
}

function handleInspectionSizeChange(size) {
  inspectionPageSize.value = size
  inspectionPage.value = 1
}

// 计算属性
const paginationInfo = computed(() => {
  const { page, size, total } = pagination.value
  const start = Math.min((page - 1) * size + 1, total)
  const end = Math.min(page * size, total)
  return `${start} - ${end} / ${total}`
})

const overviewPaginationInfo = computed(() => {
  const { page, size, total } = overviewPagination.value
  const start = Math.min((page - 1) * size + 1, total)
  const end = Math.min(page * size, total)
  return `${start} - ${end} / ${total}`
})

// 事件处理
function handleSelectionChange(selection) {
  selectedHostIds.value = selection.map(row => row.host_id)
}

function invalidateInspection() {
  inspectionSession++
  inspectionRequest++
  inspectionReadLoading.value = false
  inspectionMutationLoading.value = false
  inspectionRefreshFailed.value = false
}

function inspectionContext() {
  return {
    session: inspectionSession,
    jobId: jobId.value,
    templateId: jobInfo.value.templateId,
    routePath: route.fullPath,
    hostKey: selectedHost.value?.host_key
  }
}

function isCurrentInspection(context) {
  return (
    inspectionDetailVisible.value &&
    context.session === inspectionSession &&
    context.jobId === jobId.value &&
    context.templateId === jobInfo.value.templateId &&
    context.routePath === route.fullPath &&
    context.hostKey === selectedHost.value?.host_key
  )
}

watch(
  () => [jobId.value, jobInfo.value.templateId, route.fullPath],
  () => {
    inspectionDetailVisible.value = false
    invalidateInspection()
  },
  { flush: 'sync' }
)
watch(
  inspectionDetailVisible,
  visible => {
    if (!visible) invalidateInspection()
  },
  { flush: 'sync' }
)
onBeforeUnmount(invalidateInspection)

/**
 * 点击主机行，加载巡检项详情
 */
async function handleHostClick(row) {
  invalidateInspection()
  selectedHost.value = row
  inspectionDetailVisible.value = true
  inspectionDetailData.value = []
  inspectionPage.value = 1 // 重置分页
  inspectionSearchText.value = ''
  inspectionResultFilter.value = ''

  await refreshInspection(inspectionContext())
}

async function refreshInspection(context, afterMutation = false) {
  if (!isCurrentInspection(context)) return
  const request = ++inspectionRequest
  const isCurrent = () => isCurrentInspection(context) && request === inspectionRequest
  inspectionReadLoading.value = true
  inspectionRefreshFailed.value = false
  try {
    const response = await jobApi.getHostCheckItems(context.jobId, context.templateId)
    if (!isCurrent()) return
    const data = response?.data || response
    const allData = Array.isArray(data) ? data : []
    // 前端根据点击的主机名进行筛选
    inspectionDetailData.value = allData.filter(item => item.hostKey === context.hostKey)
    const lastPage = Math.max(
      1,
      Math.ceil(filteredInspectionData.value.length / inspectionPageSize.value)
    )
    inspectionPage.value = Math.min(inspectionPage.value, lastPage)
  } catch (error) {
    if (!isCurrent()) return
    inspectionRefreshFailed.value = true
    console.error('加载巡检项详情失败:', error)
    ElMessage.error(
      afterMutation ? '黑名单操作已成功，但检查项刷新失败，请重试刷新' : '加载巡检项详情失败'
    )
  } finally {
    if (isCurrent()) inspectionReadLoading.value = false
  }
}

function retryInspection() {
  return refreshInspection(inspectionContext())
}

/**
 * 黑名单操作
 */
const isInWhitelist = item => {
  const value = item?.whetherWhiteList
  return value && value.startsWith('y')
}

async function handleAddToWhitelist(item) {
  if (!item || inspectionDetailLoading.value || inspectionRefreshFailed.value) return
  const context = inspectionContext()
  if (!isCurrentInspection(context)) return
  const payload = {
    templateId: jobInfo.value.templateId,
    templateName: jobInfo.value.templateName,
    scriptPath: getScriptPath(),
    hostId: item.hostId,
    hostKey: item.hostKey,
    checkName: item.name
  }
  inspectionMutationLoading.value = true

  try {
    await ElMessageBox.confirm('确定要将此检查项添加到黑名单吗？', '确认', {
      closeOnClickModal: false,
      closeOnPressEscape: false
    })
    if (!isCurrentInspection(context)) return

    await whitelistApi.saveWhitelist(payload)
    if (!isCurrentInspection(context)) return

    ElMessage.success('添加黑名单成功')
    loadStatistics(() => isCurrentInspection(context))
    await refreshInspection(context, true)
  } catch (e) {
    if (isCurrentInspection(context) && e !== 'cancel' && e !== 'close') {
      console.error('添加黑名单失败:', e)
      ElMessage.error('添加黑名单失败')
    }
  } finally {
    if (isCurrentInspection(context)) inspectionMutationLoading.value = false
  }
}

async function handleRemoveFromWhitelist(item) {
  if (!item || inspectionDetailLoading.value || inspectionRefreshFailed.value) return
  const context = inspectionContext()
  if (!isCurrentInspection(context)) return
  const whitelistId = item.whetherWhiteList?.startsWith('y,')
    ? item.whetherWhiteList.split(',')[1]
    : ''
  inspectionMutationLoading.value = true

  try {
    await ElMessageBox.confirm('确定要将此检查项从黑名单移除吗？', '确认', {
      closeOnClickModal: false,
      closeOnPressEscape: false
    })
    if (!isCurrentInspection(context)) return

    if (whitelistId) {
      await whitelistApi.deleteWhitelist(whitelistId)
      if (!isCurrentInspection(context)) return
      ElMessage.success('移除黑名单成功')
      loadStatistics(() => isCurrentInspection(context))
      await refreshInspection(context, true)
    } else {
      ElMessage.error('无法获取黑名单ID')
    }
  } catch (e) {
    if (isCurrentInspection(context) && e !== 'cancel' && e !== 'close') {
      console.error('移除黑名单失败:', e)
      ElMessage.error('移除黑名单失败')
    }
  } finally {
    if (isCurrentInspection(context)) inspectionMutationLoading.value = false
  }
}

/**
 * 从KPI详情弹窗显示检查项详情（不显示黑名单按钮）
 */
function handleKpiShowDetail(row) {
  showWhitelistButton.value = false
  dialogs.showCheckItemDetail(row)
}

/**
 * 获取脚本路径（从第一个审计参数中获取）
 */
function getScriptPath() {
  try {
    const auditParams = JSON.parse(jobInfo.value?.auditParams || '[]')
    if (auditParams.length > 0 && auditParams[0].scripts?.length > 0) {
      return auditParams[0].scripts[0].scriptPath || ''
    }
  } catch (e) {
    console.error('解析脚本路径失败:', e)
  }
  return ''
}

/**
 * 黑名单变更后刷新数据
 */
function handleWhitelistChanged() {
  // 刷新巡检项详情列表
  if (selectedHost.value) {
    handleHostClick(selectedHost.value)
  }
  // 刷新统计数据
  loadStatistics()
}

/**
 * 从黑名单列表中删除黑名单项
 */
async function handleItemWhitelistDelete(item) {
  await dialogs.deleteItemWhitelist(item)
  // 刷新巡检项详情列表
  handleWhitelistChanged()
}

function handleSearch() {
  if (activeTab.value === 'host') {
    pagination.value.page = 1
    loadMachineData(hostSearchText.value)
  } else {
    overviewPagination.value.page = 1
    loadOverviewData(overviewSearchText.value)
  }
}

function handlePageSizeChange() {
  pagination.value.page = 1
  loadMachineData(hostSearchText.value)
}

function handlePageChange(page) {
  pagination.value.page = page
  loadMachineData(hostSearchText.value)
}

function handleOverviewPageSizeChange() {
  overviewPagination.value.page = 1
  loadOverviewData(overviewSearchText.value)
}

function handleOverviewPageChange(page) {
  overviewPagination.value.page = page
  loadOverviewData(overviewSearchText.value)
}

function refreshData() {
  loadStatistics()
  if (activeTab.value === 'host') {
    loadMachineData(hostSearchText.value)
  } else {
    loadOverviewData(overviewSearchText.value)
  }
}

function handleStatClick(status) {
  if (['OK', 'FAILED', 'CHECK', 'SKIPPING', 'UNREACHABLE'].includes(status)) {
    dialogs.showKpiDialog(status)
  }
}

function handleHostFilterChange(status) {
  dialogs.hostDetailStatusFilter.value = status
  dialogs.loadHostCheckItems()
}

function handleCheckItemFilterChange(status) {
  dialogs.checkItemHostsStatusFilter.value = status
  dialogs.loadCheckItemHosts()
}

async function addToWhitelist() {
  if (selectedHostIds.value.length === 0) {
    ElMessage.warning('请先选择主机')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确定要将选中的 ${selectedHostIds.value.length} 台主机添加到黑名单吗？`,
      '确认',
      { closeOnClickModal: false, closeOnPressEscape: false }
    )

    const response = await jobApi.addHostToWhitelist(selectedHostIds.value)
    const result = response?.data || response

    // 检查返回结果
    if (
      Array.isArray(result) &&
      result[0]?.status === 'COMPLETED' &&
      result[0]?.data?.result === 'ok'
    ) {
      ElMessage.success('添加黑名单成功')
      refreshData()
    } else {
      ElMessage.error('添加黑名单失败')
    }
  } catch (e) {
    if (e !== 'cancel') {
      console.error('添加黑名单失败:', e)
      ElMessage.error('添加黑名单失败')
    }
  }
}

async function removeFromWhitelist() {
  if (selectedHostIds.value.length === 0) {
    ElMessage.warning('请先选择主机')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确定要将选中的 ${selectedHostIds.value.length} 台主机从黑名单移除吗？`,
      '确认',
      { closeOnClickModal: false, closeOnPressEscape: false }
    )

    const response = await jobApi.removeHostFromWhitelist(selectedHostIds.value)
    const result = response?.data || response

    // 检查返回结果
    if (
      Array.isArray(result) &&
      result[0]?.status === 'COMPLETED' &&
      result[0]?.data?.result === 'ok'
    ) {
      ElMessage.success('移除黑名单成功')
      refreshData()
    } else {
      ElMessage.error('移除黑名单失败')
    }
  } catch (e) {
    if (e !== 'cancel') {
      console.error('移除黑名单失败:', e)
      ElMessage.error('移除黑名单失败')
    }
  }
}

function exportTable() {
  ElMessage.info('导出功能开发中')
}

async function exportResult() {
  try {
    const baseURL = import.meta.env.VITE_API_BASE_URL || '/sjxy-console'
    const url = `${baseURL}/audit/api/audit/v2/results/export/${jobId.value}`
    const authHeaders = authService.getAuthHeaders()

    const response = await fetch(url, {
      method: 'GET',
      headers: authHeaders
    })

    if (!response.ok) throw new Error('下载失败')

    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const now = new Date()
    const datetime = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`

    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `${jobInfo.value.templateName || '巡检结果'}_${datetime}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)

    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

function getBasePath() {
  const path = route.path
  const match = path.match(/^\/([^/]+)/)
  return match ? `/${match[1]}` : '/cac'
}

function goBack() {
  router.push(reportReturn.value.location)
}

const reportReturn = computed(() => getReportReturnTarget(route.query, getBasePath()))

function extractJobId() {
  // 优先从 URL 路径解析
  const path = route.path

  // 匹配 /cac/results/{jobId} 或 /inspection/results/{jobId}
  const pathMatch = path.match(/\/results\/([a-zA-Z0-9]+)/)
  if (pathMatch && pathMatch[1]) {
    return pathMatch[1]
  }

  // 从 route.params.pathMatch 解析（catch-all 路由）
  const paramPathMatch = route.params.pathMatch
  if (Array.isArray(paramPathMatch) && paramPathMatch.length > 1) {
    return paramPathMatch[1]
  }
  if (typeof paramPathMatch === 'string') {
    const match = paramPathMatch.match(/results\/(.+)/)
    if (match) {
      return match[1]
    }
  }

  // 从 query 参数获取
  if (route.query.jobId) {
    return route.query.jobId
  }
  return ''
}

// 监听标签页切换
watch(activeTab, newTab => {
  if (newTab === 'overview' && overviewData.value.length === 0) {
    loadOverviewData(overviewSearchText.value)
  }
})

onMounted(() => {
  const id = extractJobId()
  if (!id) {
    ElMessage.error('缺少任务ID')
    return
  }
  initData(id)
})
</script>

<style scoped lang="scss">
.result-detail-page {
  gap: 14px;
  min-width: 0;
}

.report-overview-card,
.tabs-container {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  min-width: 0;
}

.report-overview-card {
  flex-shrink: 0;
}

.page-navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  .navbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;

    :deep(.el-breadcrumb) {
      font-size: 13px;
      a {
        color: var(--el-color-primary);
        cursor: pointer;
        text-decoration: none;
        &:hover {
          color: var(--el-color-primary-light-3);
        }
      }
    }
  }

  .navbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.report-overview-body {
  display: grid;
  grid-template-columns: minmax(280px, 380px) minmax(0, 1fr);
  gap: 16px 24px;
  align-items: center;
  padding: 12px 16px;
}

.job-meta-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 16px;
  padding-right: 20px;
  border-right: 1px solid var(--el-border-color-lighter);
  min-width: 0;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.meta-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.meta-value {
  font-size: 13px;
  color: var(--el-text-color-primary);
  min-width: 0;

  strong {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  &--mono {
    font-variant-numeric: tabular-nums;
  }

  &--ellipsis {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.meta-subtext {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.tabs-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.workspace-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 6px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

.workspace-tabs {
  :deep(.el-tabs__header) {
    margin: 0;
  }
  :deep(.el-tabs__nav-wrap::after) {
    display: none;
  }
}

.tab-label-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.tab-count-pill {
  font-size: 11px;
  line-height: 1.4;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-variant-numeric: tabular-nums;
}

.toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-left: auto;

  .toolbar-batch-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.table-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.workspace-table-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.host-link-btn {
  font-weight: 500;
}

.metric-link-btn {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.workspace-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 10px 16px;
  border-top: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

.workspace-note {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.inspection-dialog-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 16px;
  padding: 10px 14px;
  margin-bottom: 12px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

.inspection-dialog-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.inspection-refresh-alert {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  margin-bottom: 12px;
  border-radius: 6px;
  background: var(--el-color-warning-light-9);
  border: 1px solid var(--el-color-warning-light-7);
  color: var(--el-color-warning-dark-2);
  font-size: 13px;
}

.output-snippet {
  font-family: var(--el-font-family-mono, monospace);
  font-size: 12px;
}

@media (max-width: 1100px) {
  .report-overview-body {
    grid-template-columns: 1fr;
  }
  .job-meta-panel {
    padding-right: 0;
    padding-bottom: 12px;
    border-right: none;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }
}
</style>
