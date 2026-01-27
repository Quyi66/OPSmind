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
          stripe
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
        <el-table v-loading="overviewLoading" :data="overviewData" stripe style="width: 100%">
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

    <!-- 巡检项详情区域 -->
    <div class="inspection-detail-section">
      <div class="section-header">
        <span class="section-title">
          巡检项详情
          <template v-if="selectedHost">- {{ selectedHost.host_key }}</template>
        </span>
        <div class="section-actions">
          <el-button size="small" @click="dialogs.showItemWhitelist()">
            <i class="fa fa-adjust"></i>
            白名单列表
          </el-button>
        </div>
      </div>
      <div class="section-content">
        <template v-if="!selectedHost">
          <el-empty description="点击上方表格中的主机查看巡检项详情" />
        </template>
        <template v-else>
          <el-table
            v-loading="inspectionDetailLoading"
            :data="inspectionDetailData"
            stripe
            style="width: 100%"
            max-height="300"
          >
            <el-table-column prop="hostKey" label="主机" width="140" />
            <el-table-column prop="name" label="检查项" min-width="200" show-overflow-tooltip />
            <el-table-column label="结果" width="100" align="left">
              <template #default="{ row }">
                <el-tag v-if="row.status === 'OK'" type="success" size="small">通过</el-tag>
                <el-tag v-else-if="row.status === 'FAILED'" type="danger" size="small">失败</el-tag>
                <el-tag v-else-if="row.status === 'CHECK'" type="warning" size="small">
                  人工检查
                </el-tag>
                <el-tag v-else-if="row.status === 'SKIPPING'" type="info" size="small">
                  白名单
                </el-tag>
                <el-tag v-else type="info" size="small">无数据</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="输出" min-width="300">
              <template #default="{ row }">
                <el-button v-if="row.output" type="primary" link @click="showOutputDetail(row)">
                  {{ (row.output || '').substring(0, 100)
                  }}{{ row.output && row.output.length > 100 ? '...' : '' }}
                </el-button>
                <span v-else class="no-data">无</span>
              </template>
            </el-table-column>
          </el-table>
        </template>
      </div>
    </div>

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
import { jobApi } from '../api'

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
const inspectionDetailLoading = ref(false)
const inspectionDetailData = ref([])
const showWhitelistButton = ref(true)

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
  inspectionDetailLoading.value = true
  inspectionDetailData.value = []

  try {
    const response = await jobApi.getHostCheckItems(jobId.value, jobInfo.value.templateId)
    const data = response?.data || response
    inspectionDetailData.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error('加载巡检项详情失败:', error)
    ElMessage.error('加载巡检项详情失败')
  } finally {
    inspectionDetailLoading.value = false
  }
}

/**
 * 显示输出详情弹窗（从巡检项详情，显示白名单按钮）
 */
function showOutputDetail(row) {
  showWhitelistButton.value = true
  dialogs.showCheckItemDetail(row)
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
    const baseURL = import.meta.env.VITE_API_BASE_URL || '/oplus-portal'
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
  background: #fff;
  border-bottom: 1px solid #e2e8f0;

  .navbar-left {
    :deep(.el-breadcrumb) {
      font-size: 14px;
      a {
        color: #409eff;
        cursor: pointer;
        &:hover {
          color: #66b1ff;
        }
      }
    }
  }
}

.job-header {
  background: #fff;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;

  .job-status {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 12px;
    .time-info {
      font-size: 13px;
      color: #606266;
    }
  }

  .job-info-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 8px;

    .info-label {
      color: #909399;
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
        color: #909399;
      }
    }
  }
}

.tabs-container {
  background: #fff;
  margin: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  :deep(.el-tabs__header) {
    margin: 0;
    padding: 0 16px;
    border-bottom: 1px solid #e2e8f0;
  }
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #ebeef5;
  .toolbar-right {
    margin-left: auto;
    display: flex;
    gap: 8px;
  }
}

.table-container {
  padding: 16px;
}

.table-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 12px;
  .pagination-info {
    color: #6c757d;
    font-size: 13px;
  }
}

.inspection-detail-section {
  background: #fff;
  margin: 0 16px 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #e2e8f0;
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #303133;
    }
    .section-actions {
      display: flex;
      gap: 8px;
    }
  }

  .section-content {
    min-height: 200px;
    padding: 16px;
  }
}

:deep(.el-table) {
  font-size: 13px;
  .el-table__header th {
    background-color: #f8f9fa !important;
    color: #495057;
    font-weight: 500;
  }
}

.no-data {
  color: #909399;
  font-size: 12px;
}
</style>
