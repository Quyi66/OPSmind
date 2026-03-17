<template>
  <div class="ops-page-layout result-detail-page">
    <!-- 顶部导航栏 -->
    <nav class="page-navbar">
      <div class="navbar-left">
        <el-breadcrumb separator=">">
          <el-breadcrumb-item>
            <a @click="goBack">执行记录</a>
          </el-breadcrumb-item>
          <el-breadcrumb-item>{{ jobInfo.templateName || '结果详情' }}</el-breadcrumb-item>
        </el-breadcrumb>
      </div>
      <div class="navbar-right">
        <el-button @click="exportResult">
          <i class="fa fa-file-export"></i>
          导出结果
        </el-button>
      </div>
    </nav>

    <!-- 任务信息头部 -->
    <div v-loading="loading" class="job-header">
      <div class="job-status">
        <el-tag :type="getJobStatusType(jobInfo.jobStatus)" effect="dark" round>
          {{ getJobStatusText(jobInfo.jobStatus) }}
        </el-tag>
        <span class="time-info">
          <strong>开始时间：</strong>
          {{ formatDateTime(jobInfo.createdAt) }}
          <strong style="margin-left: 16px">结束时间：</strong>
          {{ formatDateTime(jobInfo.endedAt) }}
        </span>
      </div>

      <div class="job-info-row">
        <span class="info-label">主机</span>
        <span class="info-value">
          <el-tag type="primary" size="small" round>{{ hostList.length }}</el-tag>
          <template v-for="(host, index) in hostList" :key="index">
            <el-tag v-if="index < 5" class="host-tag">{{ host.hostKey }}</el-tag>
          </template>
          <span v-if="hostList.length > 5" class="more-hosts">...</span>
        </span>
      </div>

      <div class="job-info-row">
        <span class="info-label">脚本</span>
        <span class="info-value">
          <template v-for="(script, index) in scriptList" :key="index">
            <el-tag type="info" class="script-tag">{{ script.scriptPath }}</el-tag>
          </template>
        </span>
      </div>
    </div>

    <!-- 统计卡片 -->
    <StatisticsCards v-loading="statsLoading" :statistics="statistics" @click="handleStatClick" />

    <!-- 标签页 -->
    <div class="tabs-container">
      <el-tabs v-model="activeTab">
        <el-tab-pane name="host">
          <template #label>
            <span>
              主机概览
              <i class="fa fa-external-link-alt" style="font-size: 10px; margin-left: 4px"></i>
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane label="巡检概览" name="overview" />
      </el-tabs>

      <!-- 工具栏 -->
      <div class="toolbar">
        <template v-if="activeTab === 'host'">
          <el-button :disabled="selectedHostIds.length === 0" @click="addToWhitelist">
            <i class="fa fa-plus"></i>
            添加白名单
          </el-button>
          <el-button :disabled="selectedHostIds.length === 0" @click="removeFromWhitelist">
            <i class="fa fa-trash-alt"></i>
            移除白名单
          </el-button>
          <el-button @click="dialogs.showWhitelistDialog()">
            <i class="fa fa-list"></i>
            白名单列表
          </el-button>
        </template>
        <div class="toolbar-right">
          <el-input
            v-if="activeTab === 'host'"
            v-model="hostSearchText"
            placeholder="输入主机名搜索"
            clearable
            style="width: 180px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix>
              <i class="fa fa-search"></i>
            </template>
          </el-input>
          <el-input
            v-else
            v-model="overviewSearchText"
            placeholder="输入检查项名称搜索"
            clearable
            style="width: 180px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix>
              <i class="fa fa-search"></i>
            </template>
          </el-input>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <!-- <el-button @click="exportTable">
            <i class="fa fa-file-export"></i>
          </el-button> -->
          <el-button @click="refreshData" circle>
            <i class="fa fa-sync"></i>
          </el-button>
        </div>
      </div>

      <!-- 主机概览表格 -->
      <div v-if="activeTab === 'host'" class="table-container">
        <el-table
          v-loading="tableLoading"
          :data="machineData"
          height="calc(100vh - 600px)"
          style="width: 100%"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="50" />
          <el-table-column prop="host_key" label="主机" min-width="140">
            <template #default="{ row }">
              <el-button type="primary" link @click="handleHostClick(row)">
                {{ row.host_key }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column prop="os_distro" label="操作系统" min-width="180" />
          <el-table-column prop="os_version" label="系统版本" width="100" />
          <el-table-column label="白名单" width="80" align="left">
            <template #default="{ row }">
              <el-tag v-if="row.black_count > 0" type="primary" size="small" round>
                <i class="fa fa-check"></i>
                是
              </el-tag>
              <el-tag v-else type="info" size="small" round>
                <i class="fa fa-times"></i>
                否
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="检查通过" width="100" align="left">
            <template #header>
              <span>
                <!-- <i class="fa fa-check"></i> -->
                检查通过
              </span>
            </template>
            <template #default="{ row }">
              <el-button type="primary" link @click="dialogs.showItemsByStatus(row, 'OK')">
                {{ row.ok_count }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column label="检查失败" width="100" align="left">
            <template #header>
              <span>
                <!-- <i class="fa fa-times"></i> -->
                检查失败
              </span>
            </template>
            <template #default="{ row }">
              <el-button type="primary" link @click="dialogs.showItemsByStatus(row, 'FAILED')">
                {{ row.failed_count }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column label="人工检查" width="100" align="left">
            <template #header>
              <span>
                <!-- <i class="fa fa-user-md"></i> -->
                人工检查
              </span>
            </template>
            <template #default="{ row }">
              <el-button type="primary" link @click="dialogs.showItemsByStatus(row, 'CHECK')">
                {{ row.check_count }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column label="白名单" width="100" align="left">
            <template #header>
              <span>
                <!-- <i class="fa fa-adjust"></i> -->
                白名单
              </span>
            </template>
            <template #default="{ row }">
              <el-button type="primary" link @click="dialogs.showItemsByStatus(row, 'SKIPPING')">
                {{ row.skipping_count }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column label="数据缺失" width="100" align="left">
            <template #header>
              <span>
                <!-- <i class="fa fa-question"></i> -->
                数据缺失
              </span>
            </template>
            <template #default="{ row }">
              <el-button type="primary" link @click="dialogs.showItemsByStatus(row, 'UNREACHABLE')">
                {{ row.unreachable_count }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column prop="check_item_count" label="巡检项" width="80" align="left">
            <template #default="{ row }">
              <el-button type="primary" link @click="dialogs.showHostDetail(row)">
                {{ row.check_item_count }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="ops-pagination-wrapper">
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

      <!-- 巡检概览表格 -->
      <div v-else-if="activeTab === 'overview'" class="table-container">
        <el-table
          v-loading="overviewLoading"
          :data="overviewData"
          style="width: 100%"
          height="calc(100vh - 600px)"
        >
          <el-table-column prop="name" label="检查项" min-width="300">
            <template #default="{ row }">
              <el-button type="primary" link @click="dialogs.showCheckItemHostsDialog(row)">
                {{ row.name }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column prop="check_host_count" label="关联主机" width="120" align="left">
            <template #default="{ row }">
              <el-button type="info" link @click="dialogs.showCheckItemHostsDialog(row)">
                {{ row.check_host_count }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="ops-pagination-wrapper">
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
    </div>

    <!-- 巡检项详情弹窗 -->
    <el-dialog
      v-model="inspectionDetailVisible"
      :title="`巡检项详情${selectedHost ? ' - ' + selectedHost.host_key : ''}`"
      width="1200px"
      class="inspection-detail-dialog"
      append-to-body
      destroy-on-close
    >
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px">
        <div style="display: flex; gap: 12px">
          <el-select
            v-model="inspectionResultFilter"
            placeholder="选择结果"
            clearable
            size="small"
            style="width: 120px"
          >
            <el-option label="通过" value="OK" />
            <el-option label="失败" value="FAILED" />
            <el-option label="人工检查" value="CHECK" />
            <el-option label="白名单" value="SKIPPING" />
            <el-option label="无数据" value="UNREACHABLE" />
          </el-select>
          <el-input
            v-model="inspectionSearchText"
            placeholder="输入检查项或输出内容搜索"
            clearable
            size="small"
            style="width: 220px"
          >
            <template #prefix>
              <i class="fa fa-search"></i>
            </template>
          </el-input>
        </div>
        <el-button size="small" @click="dialogs.showItemWhitelist()">
          <i class="fa fa-adjust"></i>
          白名单列表
        </el-button>
      </div>
      <el-table
        v-loading="inspectionDetailLoading"
        :data="pagedInspectionData"
        style="width: 100%"
        max-height="calc(100vh - 350px)"
      >
        <el-table-column prop="hostKey" label="主机" width="140" />
        <el-table-column prop="name" label="检查项" min-width="150" show-overflow-tooltip />
        <el-table-column label="结果" width="100" align="left">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'OK'" type="success" size="small">通过</el-tag>
            <el-tag v-else-if="row.status === 'FAILED'" type="danger" size="small">失败</el-tag>
            <el-tag v-else-if="row.status === 'CHECK'" type="warning" size="small">人工检查</el-tag>
            <el-tag v-else-if="row.status === 'SKIPPING'" type="info" size="small">白名单</el-tag>
            <el-tag v-else type="info" size="small">无数据</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="output" label="输出" min-width="300" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.output || '无' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="!isInWhitelist(row)"
              type="primary"
              link
              @click="handleAddToWhitelist(row)"
            >
              添加白名单
            </el-button>
            <el-button v-else type="danger" link @click="handleRemoveFromWhitelist(row)">
              移出白名单
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { authService } from '@/core/auth'
import { jobApi, whitelistApi } from '../api'

// 导入拆分的模块
import { formatDateTime } from '../utils/helpers'
import { getJobStatusType, getJobStatusText } from '../constants/status'
import { useResultDetailData } from '../composables/useResultDetailData'
import { useResultDetailDialogs } from '../composables/useResultDetailDialogs'
import {
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
const dialogs = useResultDetailDialogs(jobId, jobInfo)

// 本地状态
const activeTab = ref('host')
const hostSearchText = ref('')
const overviewSearchText = ref('')
const selectedHostIds = ref([])

// 巡检项详情状态
const selectedHost = ref(null)
const inspectionDetailVisible = ref(false)
const inspectionDetailLoading = ref(false)
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

/**
 * 点击主机行，加载巡检项详情
 */
async function handleHostClick(row) {
  selectedHost.value = row
  inspectionDetailVisible.value = true
  inspectionDetailLoading.value = true
  inspectionDetailData.value = []
  inspectionPage.value = 1 // 重置分页
  inspectionSearchText.value = ''
  inspectionResultFilter.value = ''

  try {
    const response = await jobApi.getHostCheckItems(jobId.value, jobInfo.value.templateId)
    const data = response?.data || response
    const allData = Array.isArray(data) ? data : []
    // 前端根据点击的主机名进行筛选
    inspectionDetailData.value = allData.filter(item => item.hostKey === row.host_key)
  } catch (error) {
    console.error('加载巡检项详情失败:', error)
    ElMessage.error('加载巡检项详情失败')
  } finally {
    inspectionDetailLoading.value = false
  }
}

/**
 * 白名单操作
 */
const isInWhitelist = item => {
  const value = item?.whetherWhiteList
  return value && value.startsWith('y')
}

async function handleAddToWhitelist(item) {
  if (!item) return

  try {
    await ElMessageBox.confirm('确定要将此检查项添加到白名单吗？', '确认')
    inspectionDetailLoading.value = true

    await whitelistApi.saveWhitelist({
      templateId: jobInfo.value.templateId,
      templateName: jobInfo.value.templateName,
      scriptPath: getScriptPath(),
      hostId: item.hostId,
      hostKey: item.hostKey,
      checkName: item.name
    })

    ElMessage.success('添加白名单成功')
    handleWhitelistChanged()
  } catch (e) {
    if (e !== 'cancel') {
      console.error('添加白名单失败:', e)
      ElMessage.error('添加白名单失败')
    }
  } finally {
    inspectionDetailLoading.value = false
  }
}

async function handleRemoveFromWhitelist(item) {
  if (!item) return

  try {
    await ElMessageBox.confirm('确定要将此检查项从白名单移除吗？', '确认')
    inspectionDetailLoading.value = true

    let whitelistId = ''
    if (item.whetherWhiteList && item.whetherWhiteList.startsWith('y,')) {
      whitelistId = item.whetherWhiteList.split(',')[1]
    }

    if (whitelistId) {
      await whitelistApi.deleteWhitelist(whitelistId)
      ElMessage.success('移除白名单成功')
      handleWhitelistChanged()
    } else {
      ElMessage.error('无法获取白名单ID')
    }
  } catch (e) {
    if (e !== 'cancel') {
      console.error('移除白名单失败:', e)
      ElMessage.error('移除白名单失败')
    }
  } finally {
    inspectionDetailLoading.value = false
  }
}

/**
 * 从KPI详情弹窗显示检查项详情（不显示白名单按钮）
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
 * 白名单变更后刷新数据
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
 * 从白名单列表中删除白名单项
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
      `确定要将选中的 ${selectedHostIds.value.length} 台主机添加到白名单吗？`,
      '确认'
    )

    const response = await jobApi.addHostToWhitelist(selectedHostIds.value)
    const result = response?.data || response

    // 检查返回结果
    if (
      Array.isArray(result) &&
      result[0]?.status === 'COMPLETED' &&
      result[0]?.data?.result === 'ok'
    ) {
      ElMessage.success('添加白名单成功')
      refreshData()
    } else {
      ElMessage.error('添加白名单失败')
    }
  } catch (e) {
    if (e !== 'cancel') {
      console.error('添加白名单失败:', e)
      ElMessage.error('添加白名单失败')
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
      `确定要将选中的 ${selectedHostIds.value.length} 台主机从白名单移除吗？`,
      '确认'
    )

    const response = await jobApi.removeHostFromWhitelist(selectedHostIds.value)
    const result = response?.data || response

    // 检查返回结果
    if (
      Array.isArray(result) &&
      result[0]?.status === 'COMPLETED' &&
      result[0]?.data?.result === 'ok'
    ) {
      ElMessage.success('移除白名单成功')
      refreshData()
    } else {
      ElMessage.error('移除白名单失败')
    }
  } catch (e) {
    if (e !== 'cancel') {
      console.error('移除白名单失败:', e)
      ElMessage.error('移除白名单失败')
    }
  }
}

function exportTable() {
  ElMessage.info('导出功能开发中')
}

async function exportResult() {
  try {
    const baseURL = import.meta.env.VITE_API_BASE_URL || '/sjxy-portal'
    const url = `${baseURL}/cac/api/cac/v2/results/export/${jobId.value}`
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
  router.push(`${getBasePath()}/results`)
}

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
  setTimeout(() => {
    const id = extractJobId()
    if (!id) {
      ElMessage.error('缺少任务ID')
      return
    }
    initData(id)
  }, 100)
})
</script>

<style scoped lang="scss">
.result-detail-page {
  overflow: auto;
}

.page-navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);

  .navbar-left {
    :deep(.el-breadcrumb) {
      font-size: 14px;
      a {
        color: var(--el-color-primary);
        cursor: pointer;
        &:hover {
          color: var(--el-color-primary-light-3);
        }
      }
    }
  }
}

.job-header {
  background: var(--el-bg-color);
  padding: 16px 20px;
  border-bottom: 1px solid var(--el-border-color-light);

  .job-status {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 12px;
    .time-info {
      font-size: 13px;
      color: var(--el-text-color-regular);
    }
  }

  .job-info-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 8px;

    .info-label {
      color: var(--el-text-color-secondary);
      font-size: 13px;
      min-width: 40px;
    }
    .info-value {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      .host-tag,
      .script-tag {
        max-width: 300px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .more-hosts {
        color: var(--el-text-color-secondary);
      }
    }
  }
}

.tabs-container {
  background: var(--el-bg-color);
  margin: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  flex: 1;

  :deep(.el-tabs__header) {
    margin: 0;
    padding: 0 16px;
    border-bottom: 1px solid var(--el-border-color-light);
  }
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-light);
  .toolbar-right {
    margin-left: auto;
    display: flex;
    gap: 8px;
  }
}

.table-container {
  padding: 16px 16px 0 16px;
}

.table-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 12px;
  .pagination-info {
    color: var(--el-text-color-secondary);
    font-size: 13px;
  }
}

:deep(.el-table) {
  font-size: 13px;
  .el-table__header th {
    font-weight: 500;
  }
}

.no-data {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>
