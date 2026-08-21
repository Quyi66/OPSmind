<template>
  <div class="ops-page-layout ops-page-layout--page-scroll">
    <!-- KPI 卡片区域 -->
    <!-- <div class="kpi-section">
      <KpiCards :data="kpiData" :loading="kpiLoading" @click="handleKpiClick" />
    </div> -->

    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small">
        <el-form-item label="设备类型">
          <el-select v-model="filters.cit" placeholder="全部" style="width: 140px" @change="handleSearch">
            <el-option label="全部" value="sjxy_all" />
            <el-option
              v-for="item in resourceTypes"
              :key="item.code"
              :label="item.title"
              :value="item.code"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态筛选">
          <el-select
            v-model="filters.conditions"
            placeholder="筛选条件"
            style="width: 240px"
            @change="handleSearch"
          >
            <el-option
              v-for="item in CONNECT_EXCEPTION_CONDITION_OPTIONS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="设备 IP">
          <el-input
            v-model="filters.ip"
            placeholder="搜索设备 IP..."
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item class="filter-actions">
          <el-button type="primary" :loading="tableLoading" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><RefreshRight /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 功能按钮区 -->
    <div class="ops-action-bar">
      <el-button
        size="small"
        type="primary"
        :disabled="quickCheckLoading"
        @click="openActionDialog('checkConnectivity')"
      >
        <i class="fa fa-plug" style="margin-right: 4px"></i>
        连通性检测
      </el-button>
      <el-button
        size="small"
        type="primary"
        plain
        :disabled="selectedExceptionRows.length === 0"
        :loading="quickCheckLoading"
        @click="handleCheckSelected"
      >
        <i v-if="!quickCheckLoading" class="fa fa-bolt" style="margin-right: 4px"></i>
        检测选中设备
        <span v-if="selectedExceptionRows.length">（{{ selectedExceptionRows.length }}）</span>
      </el-button>
      <el-button size="small" @click="openActionDialog('collectInfo')">
        <i class="fa fa-download" style="margin-right: 4px"></i>
        信息数据采集
      </el-button>
      <el-button size="small" @click="openOperationLog('checkConnectivity')" plain>
        连通性历史日志
      </el-button>
      <el-button size="small" @click="openOperationLog('collectInfo')" plain>
        采集历史日志
      </el-button>
      <span style="flex: 1"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="loading"
        @click="handleRefresh"
        title="刷新"
      >
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <!-- 表格区域 -->
    <div class="ops-table-wrapper card-table">
      <el-table
        ref="exceptionTableRef"
        v-loading="tableLoading"
        :data="tableData"
        :row-key="getRowKey"
        class="natural-height-table"
        row-class-name="modern-table-row"
        @selection-change="handleSelectionChange"
      >
        <el-table-column
          type="selection"
          width="48"
          align="center"
          :selectable="isRowSelectable"
          :reserve-selection="true"
        />

        <!-- 1. 资产标识复合列 -->
        <el-table-column label="设备标识 (IP & 类型)" min-width="180">
          <template #default="{ row }">
            <div class="composite-ip-cell">
              <span>{{ row.IP || '-' }}</span>
              <el-tag size="small" type="primary" effect="plain" class="asset-code-tag">
                {{ row.ci_name || '-' }}
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <!-- 2. 健康巡检复合列 -->
        <el-table-column label="连通健康度" min-width="220" align="left">
          <template #default="{ row }">
            <div class="health-cell">
              <el-tooltip content="点击发起连通性诊断" placement="top" :enterable="false">
                <el-tag
                  :type="
                    row.CONN_LATEST_STATUS === '1'
                      ? 'success'
                      : row.CONN_LATEST_STATUS === '0'
                        ? 'danger'
                        : 'warning'
                  "
                  size="small"
                  effect="light"
                  class="health-status-tag clickable-tag"
                  :class="{ 'is-loading': checkingConnIds.includes(row.id || row.key) }"
                  @click.stop="
                    !checkingConnIds.includes(row.id || row.key) && handleCheckSingleConn(row)
                  "
                >
                  <i
                    v-if="checkingConnIds.includes(row.id || row.key)"
                    class="fa fa-spinner fa-spin"
                  ></i>
                  <i
                    v-else
                    :class="
                      row.CONN_LATEST_STATUS === '1'
                        ? 'fa fa-check-circle'
                        : row.CONN_LATEST_STATUS === '0'
                          ? 'fa fa-times-circle'
                          : 'fa fa-question-circle'
                    "
                  ></i>
                  <span style="margin-left: 4px">
                    {{
                      checkingConnIds.includes(row.id || row.key)
                        ? '诊断中...'
                        : row.CONN_LATEST_STATUS === '1'
                          ? '正常'
                          : row.CONN_LATEST_STATUS === '0'
                            ? '失联'
                            : '未知'
                    }}
                  </span>
                </el-tag>
              </el-tooltip>

              <div class="conn-rate-progress">
                <el-progress
                  :percentage="getProgressRate(row.CONN_RATE)"
                  :status="
                    getProgressRate(row.CONN_RATE) >= 80
                      ? 'success'
                      : getProgressRate(row.CONN_RATE) >= 50
                        ? 'warning'
                        : 'exception'
                  "
                  :stroke-width="5"
                  :show-text="false"
                  style="width: 80px"
                />
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- 3. 异常原因 -->
        <!-- <el-table-column label="异常详情" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.description || '-' }}</span>
          </template>
        </el-table-column> -->

        <!-- 4. 更新时间 -->
        <el-table-column label="最后同步时间" min-width="160">
          <template #default="{ row }">
            <span>{{ formatDateTime(row.updated_at) }}</span>
          </template>
        </el-table-column>

        <!-- 5. 操作 -->
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="viewCredentials(row)">
              查看凭据
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页区域 -->
    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handlePageSizeChange"
        @current-change="loadTableData"
      />
    </div>

    <!-- 动作弹窗 -->
    <el-dialog
      v-model="actionDialogVisible"
      :title="currentActionMeta.title"
      width="820px"
      :close-on-click-modal="false"
      @closed="resetActionDialog"
      class="premium-action-dialog"
    >
      <div class="dialog-content">
        <AcmDeviceSelector
          v-model="actionHosts"
          ci-types="[auto]"
          :options="actionSelectorOptions"
        />
      </div>
      <template #footer>
        <el-button @click="actionDialogVisible = false" size="small">取消</el-button>
        <el-button
          type="primary"
          size="small"
          :disabled="actionHosts.length === 0"
          :loading="actionLoading"
          @click="confirmAction()"
        >
          {{ currentActionMeta.confirmButtonText }}
        </el-button>
      </template>
    </el-dialog>

    <ExecuteResultDialog
      v-if="runResultDialogVisible"
      v-model:visible="runResultDialogVisible"
      :run-id="currentRunId"
      :job-title="currentRunTitle"
      @settled="handleRunResultSettled"
      @close="handleRunResultClose"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Refresh, Search, RefreshRight } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import KpiCards from '../components/exception/KpiCards.vue'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import { normalizeAcmDeviceJobHosts } from '@/modules/automation/components/job/schedule/components/acmDeviceSelector.utils'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import { dataManageApi, exceptionApi } from '../api'
import { apiService } from '@/core/api'
import { formatDateTime } from '../utils/helpers'
import {
  CONNECT_EXCEPTION_CONDITION_OPTIONS,
  CONNECT_EXCEPTION_DEFAULT_CONDITION,
  normalizeConnectExceptionCondition
} from '../constants/connectException'

const route = useRoute()
const router = useRouter()

const ACTION_CONFIG = {
  checkConnectivity: {
    title: '检查连通性',
    confirmButtonText: '立即检查连通性',
    confirmMessage: '连通性检查将花费数分钟至半小时不等，确认后将立即开始执行。',
    pendingMessage: '连通性检查任务已发起，可以关闭当前弹窗',
    successMessage: '连通性检查完成',
    failureMessage: '连通性检查失败',
    startErrorMessage: '启动检查任务失败',
    resultTitle: '连通性检测',
    jobId: 'M1x855'
  },
  collectInfo: {
    title: '采集信息',
    confirmButtonText: '立即采集资产数据',
    confirmMessage: '资产数据采集将花费数分钟至半小时不等，确认后将立即开始执行。',
    pendingMessage: '信息采集任务已发起，可以关闭当前弹窗',
    successMessage: '信息采集完成',
    failureMessage: '信息采集失败',
    startErrorMessage: '启动采集任务失败',
    resultTitle: '信息数据采集',
    jobId: 'mjedwe'
  }
}

const actionSelectorOptions = {
  selectMode: 'host,group,tag,input,recently',
  selector: 'multiple',
  label: '选择设备'
}

// KPI 数据
const kpiData = ref([])
const kpiLoading = ref(false)

// 资源类型列表
const resourceTypes = ref([])

// 筛选条件
const filters = reactive({
  cit: 'sjxy_all',
  conditions: CONNECT_EXCEPTION_DEFAULT_CONDITION,
  ip: ''
})

// 表格数据
const tableData = ref([])
const tableLoading = ref(false)
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const loading = computed(() => kpiLoading.value || tableLoading.value)
const exceptionTableRef = ref(null)
const selectedExceptionRows = ref([])
const quickCheckLoading = ref(false)

// 动作弹窗
const actionDialogVisible = ref(false)
const currentActionKey = ref('checkConnectivity')
const actionHosts = ref([])
const actionLoading = ref(false)
const currentActionMeta = computed(() => ACTION_CONFIG[currentActionKey.value])

// 作业运行结果弹窗
const runResultDialogVisible = ref(false)
const currentRunId = ref('')
const currentRunTitle = ref('')

// 加载 KPI 数据
const loadKpiData = async () => {
  kpiLoading.value = true
  try {
    const res = await exceptionApi.getConnectionCount()
    kpiData.value = res.records || []
  } catch (error) {
    console.error('加载KPI数据失败:', error)
  } finally {
    kpiLoading.value = false
  }
}

// 加载资源类型
const loadResourceTypes = async () => {
  try {
    const res = await dataManageApi.getResourceTypes()
    resourceTypes.value = res.records || []
  } catch (error) {
    console.error('加载资源类型失败:', error)
  }
}

// 加载表格数据
const loadTableData = async () => {
  tableLoading.value = true
  try {
    const res = await exceptionApi.getConnectException(
      {
        cit: filters.cit,
        conditions: filters.conditions,
        ip: filters.ip || undefined
      },
      {
        size: pageSize.value,
        page: currentPage.value
      }
    )
    tableData.value = res.records || []
    total.value = res.total || 0
  } catch (error) {
    console.error('加载表格数据失败:', error)
  } finally {
    tableLoading.value = false
  }
}

const applyRouteQuery = query => {
  clearTableSelection()
  filters.cit = typeof query.cit === 'string' && query.cit ? query.cit : 'sjxy_all'
  filters.conditions = normalizeConnectExceptionCondition(query.conditions)
  filters.ip = typeof query.ip === 'string' ? query.ip : ''
  currentPage.value = 1
  pageSize.value = 10
  loadTableData()
}

// 处理 KPI 卡片点击
const handleKpiClick = params => {
  clearTableSelection()
  filters.conditions = params.conditions
  loadTableData()
}

// 处理搜索
const handleSearch = () => {
  clearTableSelection()
  currentPage.value = 1
  loadTableData()
}

const isRowSelectable = row => Boolean(row?.IP || row?.ip)

const getRowKey = row =>
  String(
    row?.id ||
      row?.key ||
      row?.ci_id ||
      row?.IP ||
      row?.ip ||
      `${row?.ci_name || 'device'}-${row?.updated_at || 'unknown'}`
  )

const handleSelectionChange = rows => {
  selectedExceptionRows.value = Array.isArray(rows) ? rows : []
}

const clearTableSelection = () => {
  selectedExceptionRows.value = []
  exceptionTableRef.value?.clearSelection()
}

// 重置
const handleReset = () => {
  clearTableSelection()
  filters.cit = 'sjxy_all'
  filters.conditions = CONNECT_EXCEPTION_DEFAULT_CONDITION
  filters.ip = ''
  currentPage.value = 1
  pageSize.value = 10
  loadTableData()
}

// 处理分页大小变化
const handlePageSizeChange = () => {
  currentPage.value = 1
  loadTableData()
}

// 刷新
const handleRefresh = () => {
  loadKpiData()
  loadTableData()
}

const openOperationLog = actionKey => {
  const actionMap = {
    checkConnectivity: '#{acm.job.check_conn}',
    collectInfo: '#{acm.job.collect_assert_info}'
  }

  router.push({
    path: '/acm/log',
    query: {
      day: '1',
      action: actionMap[actionKey] || 'all'
    }
  })
}

const openActionDialog = actionKey => {
  currentActionKey.value = actionKey
  actionHosts.value = []
  actionDialogVisible.value = true
}

const resetActionDialog = () => {
  actionHosts.value = []
  actionLoading.value = false
}

const closeActionDialog = () => {
  actionDialogVisible.value = false
  resetActionDialog()
}

const refreshExceptionData = () => {
  loadTableData()
  loadKpiData()
}

const openRunResultDialog = (runId, jobTitle = '') => {
  if (!runId) return
  currentRunId.value = String(runId)
  currentRunTitle.value = jobTitle
  runResultDialogVisible.value = true
}

const handleRunResultSettled = () => {
  refreshExceptionData()
}

const handleRunResultClose = () => {
  refreshExceptionData()
}

const isJobPending = result => result?.status === 'WAITING' || result?.status === 'RUNNING'

const isJobSuccess = result => result?.status === 'COMPLETED' || result?.status === 'SUCCESS'

const isJobFailed = result => result?.status === 'FAILED' || result?.status === 'ERROR'

const confirmAction = async ({
  selection = actionHosts.value,
  actionKey = currentActionKey.value,
  confirmMessage,
  closeDialogOnSubmit = true
} = {}) => {
  if (selection.length === 0) {
    ElMessage.warning('请先选择设备')
    return false
  }

  const actionMeta = ACTION_CONFIG[actionKey]

  try {
    await ElMessageBox.confirm(confirmMessage || actionMeta.confirmMessage, '执行作业', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return false
  }

  actionLoading.value = true

  try {
    const hosts = normalizeAcmDeviceJobHosts(selection, 'linux')
    if (hosts.length === 0) {
      ElMessage.warning('没有可执行操作的有效设备')
      return false
    }
    const cacheBuster = Date.now()
    const { data } = await apiService.post(
      `/workflow/api/workflow/jobs/${actionMeta.jobId}/run?cacheBuster=${cacheBuster}`,
      {
        params: { hosts }
      }
    )

    const result = Array.isArray(data) ? data[0] : data

    if (result?.runId) {
      if (closeDialogOnSubmit) {
        closeActionDialog()
      }
      openRunResultDialog(result.runId, actionMeta.resultTitle || actionMeta.title)
      if (isJobSuccess(result)) {
        refreshExceptionData()
      }
      return true
    }

    if (isJobPending(result)) {
      ElMessage.success(actionMeta.pendingMessage)
      if (closeDialogOnSubmit) {
        closeActionDialog()
      }
      return true
    }

    if (isJobSuccess(result)) {
      ElMessage.success(actionMeta.successMessage)
      if (closeDialogOnSubmit) {
        closeActionDialog()
      }
      refreshExceptionData()
      return true
    }

    if (isJobFailed(result)) {
      ElMessage.error(result?.error || actionMeta.failureMessage)
      return false
    }

    ElMessage.success(actionMeta.pendingMessage)
    if (closeDialogOnSubmit) {
      closeActionDialog()
    }
    return true
  } catch (error) {
    console.error(`${actionMeta.startErrorMessage}:`, error)
    ElMessage.error(actionMeta.startErrorMessage)
    return false
  } finally {
    actionLoading.value = false
  }
}

const handleCheckSelected = async () => {
  const rows = [...selectedExceptionRows.value]
  if (rows.length === 0) {
    ElMessage.warning('请先勾选需要检测的设备')
    return
  }

  const selection = rows.map(row => ({
    key: row.id || row.key || row.IP || row.ip,
    value: row.IP || row.ip,
    assetType: row.assetType || row.ciType || row.ci_type || 'linux'
  }))

  quickCheckLoading.value = true
  try {
    const submitted = await confirmAction({
      selection,
      actionKey: 'checkConnectivity',
      confirmMessage: `即将对已选中的 ${rows.length} 台设备执行连通性检测，任务可能需要数分钟，是否继续？`,
      closeDialogOnSubmit: false
    })
    if (submitted) {
      clearTableSelection()
    }
  } finally {
    quickCheckLoading.value = false
  }
}

// ── 单个设备连通性诊断 ──
const checkingConnIds = ref([])

const removeCheckingId = id => {
  const idx = checkingConnIds.value.indexOf(id)
  if (idx > -1) {
    checkingConnIds.value.splice(idx, 1)
  }
}

const handleCheckSingleConn = async row => {
  const ip = row.IP || row.ip
  try {
    await ElMessageBox.confirm(`是否重新检查主机 ${ip} 的连通性？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  const targetId = row.id || row.key
  checkingConnIds.value.push(targetId)

  try {
    const host = {
      key: targetId,
      value: row.IP || row.ip,
      assetType: row.ci_type || row.ciType || 'linux'
    }

    const cacheBuster = Date.now()
    const { data } = await apiService.post(
      `/workflow/api/workflow/jobs/M1x855/run?cacheBuster=${cacheBuster}`,
      {
        params: { hosts: [host] }
      }
    )

    const result = Array.isArray(data) ? data[0] : data

    if (result?.runId) {
      removeCheckingId(targetId)
      openRunResultDialog(result.runId, ACTION_CONFIG.checkConnectivity.resultTitle)
      return
    }

    const finishCheck = (success = true, errorMsg = '') => {
      removeCheckingId(targetId)
      if (success) {
        ElMessage.success('连通性检查完成')
      } else {
        ElMessage.error(errorMsg || '连通性检查失败')
      }
      refreshExceptionData()
    }

    if (isJobSuccess(result)) {
      finishCheck(true)
      return
    }

    if (isJobFailed(result)) {
      finishCheck(false, result?.error)
      return
    }

    removeCheckingId(targetId)
    ElMessage.warning('连通性检测任务未返回运行 ID，请稍后在历史日志中查看')
  } catch (error) {
    removeCheckingId(targetId)
    console.error('检查连通性失败:', error)
    ElMessage.error(`检查连通性失败: ${error.response?.data?.message || error.message}`)
  }
}

// 解决 ElProgress 异常连通率转换并进行类型安全防御
const getProgressRate = rate => {
  if (rate === null || rate === undefined || rate === '' || rate === 'null') {
    return 0
  }
  const parsed = parseInt(rate, 10)
  return isNaN(parsed) ? 0 : Math.max(0, Math.min(100, parsed))
}

// 查看凭据跳转
const viewCredentials = row => {
  const ip = row.IP || row.ip
  if (!ip) return
  router.push({
    path: '/acm/automation',
    query: { ip }
  })
}

// 初始化
onMounted(() => {
  loadKpiData()
  loadResourceTypes()
})

watch(
  () => route.query,
  query => {
    applyRouteQuery(query)
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.kpi-section {
  flex-shrink: 0;
}

.composite-ip-cell {
  display: flex;
  align-items: center;
  gap: 10px;

  .asset-code-tag {
    border-radius: 4px;
    height: 20px;
    line-height: 20px;
  }
}

.health-cell {
  display: flex;
  align-items: center;
  gap: 12px;

  .health-status-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;

    &.clickable-tag {
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover:not(.is-loading) {
        filter: brightness(0.95);
        transform: translateY(-1px);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
      }

      &.is-loading {
        cursor: not-allowed;
        pointer-events: none;
      }
    }
  }
}

.dialog-content {
  padding: 8px 4px;
}
</style>
