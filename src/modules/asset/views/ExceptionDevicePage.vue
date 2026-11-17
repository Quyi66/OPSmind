<template>
  <div class="ops-page-layout ops-page-layout--page-scroll">
    <!-- KPI 卡片区域 -->
    <!-- <div class="kpi-section">
      <KpiCards :data="kpiData" :loading="kpiLoading" @click="handleKpiClick" />
    </div> -->

    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small" @submit.prevent>
        <el-form-item :label="t('asset.deviceType')">
          <el-select
            v-model="filters.cit"
            :placeholder="t('common.all')"
            :style="{ width: currentLocale === 'en-US' ? '200px' : '140px' }"
            @change="handleSearch"
          >
            <el-option :label="t('common.all')" value="sjxy_all" />
            <el-option
              v-for="item in resourceTypes"
              :key="item.code"
              :label="item.title"
              :value="item.code"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('asset.statusFilter')">
          <el-select
            v-model="filters.conditions"
            :placeholder="t('asset.filterCondition')"
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
        <el-form-item :label="t('asset.deviceIp')">
          <el-input
            v-model="filters.ip"
            :placeholder="t('asset.searchDeviceIp')"
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
            {{ t('common.search') }}
          </el-button>
          <el-button @click="handleReset">
            <el-icon><RefreshRight /></el-icon>
            {{ t('common.reset') }}
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 功能按钮区 -->
    <div class="ops-action-bar">
      <el-button
        size="small"
        type="primary"
        :disabled="quickCheckLoading || actionLoading"
        @click="openActionDialog('checkConnectivity')"
      >
        <i class="fa fa-plug" style="margin-right: 4px"></i>
        {{ t('asset.connectivityTest') }}
      </el-button>
      <el-button
        size="small"
        type="primary"
        plain
        :disabled="selectedExceptionRows.length === 0 || actionLoading"
        :loading="quickCheckLoading"
        @click="handleCheckSelected"
      >
        <i v-if="!quickCheckLoading" class="fa fa-bolt" style="margin-right: 4px"></i>
        {{ t('asset.checkSelected') }}
        <span v-if="selectedExceptionRows.length">（{{ selectedExceptionRows.length }}）</span>
      </el-button>
      <el-button
        size="small"
        :disabled="quickCheckLoading || actionLoading"
        @click="openActionDialog('collectInfo')"
      >
        <i class="fa fa-download" style="margin-right: 4px"></i>
        {{ t('asset.collectInfo') }}
      </el-button>
      <el-button size="small" @click="openOperationLog('checkConnectivity')" plain>
        {{ t('asset.connectivityHistory') }}
      </el-button>
      <el-button size="small" @click="openOperationLog('collectInfo')" plain>
        {{ t('asset.collectionHistory') }}
      </el-button>
      <span style="flex: 1"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="loading"
        @click="handleRefresh"
        :title="t('common.refresh')"
      >
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <el-alert v-if="loadError" :title="loadError" type="error" :closable="false" show-icon>
      <el-button link type="primary" @click="loadTableData">{{ t('common.retry') }}</el-button>
    </el-alert>

    <!-- 表格区域 -->
    <div class="ops-table-wrapper card-table">
      <el-table
        ref="exceptionTableRef"
        v-loading="tableLoading"
        :data="tableData"
        :row-key="getRowKey"
        class="natural-height-table"
        row-class-name="modern-table-row"
        :empty-text="tableLoading ? t('asset.devicesLoading') : loadError || t('asset.noMatchingDevices')"
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
        <el-table-column :label="t('asset.deviceIpType')" min-width="180">
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
        <el-table-column :label="t('asset.connectivityHealth')" min-width="220" align="left">
          <template #default="{ row }">
            <div class="health-cell">
              <el-tooltip :content="t('asset.clickConnectivity')" placement="top" :enterable="false">
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
                        ? t('asset.diagnosing')
                        : row.CONN_LATEST_STATUS === '1'
                          ? t('asset.normal')
                          : row.CONN_LATEST_STATUS === '0'
                            ? t('asset.disconnected')
                            : t('common.unknown')
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
        <el-table-column :label="t('asset.lastSync')" min-width="160">
          <template #default="{ row }">
            <span>{{ formatDateTime(row.updated_at) }}</span>
          </template>
        </el-table-column>

        <!-- 5. 操作 -->
        <el-table-column :label="t('common.actions')" :width="currentLocale === 'en-US' ? 144 : 100" align="center" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="viewCredentials(row)">
              {{ t('asset.viewCredentials') }}
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

    <!-- 选择设备后直接执行，由业务页面在提交成功后关闭选择器 -->
    <AcmDeviceSelectorDialog
      v-model="actionDialogVisible"
      ci-types="[auto]"
      :options="actionSelectorOptions"
      :title="t('asset.selectActionDevices', { action: currentActionMeta.title })"
      :confirm-text="currentActionMeta.confirmButtonText"
      :description="currentActionMeta.confirmMessage"
      :submitting="actionLoading"
      :allow-empty="false"
      :close-on-confirm="false"
      @confirm="handleActionConfirm"
    />

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
import { t, currentLocale } from '@/core/i18n'
import { message, messageRef } from '@/core/i18n/feedback'

import { ref, reactive, computed, onMounted, onBeforeUnmount, onDeactivated, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Refresh, Search, RefreshRight } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import KpiCards from '../components/exception/KpiCards.vue'
import AcmDeviceSelectorDialog from '@/modules/automation/components/job/schedule/components/AcmDeviceSelectorDialog.vue'
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
    get title() { return t('asset.checkConnectivity') },
    get confirmButtonText() { return t('asset.checkConnectivityNow') },
    get confirmMessage() { return t('asset.connectivityConfirm') },
    get pendingMessage() { return t('asset.connectivityPending') },
    get successMessage() { return t('asset.connectivityDone') },
    get failureMessage() { return t('asset.connectivityFailed') },
    get startErrorMessage() { return t('asset.startCheckFailed') },
    get resultTitle() { return t('asset.connectivityTest') },
    jobId: 'M1x855'
  },
  collectInfo: {
    get title() { return t('asset.collectAction') },
    get confirmButtonText() { return t('asset.collectNow') },
    get confirmMessage() { return t('asset.collectConfirm') },
    get pendingMessage() { return t('asset.collectPending') },
    get successMessage() { return t('asset.collectDone') },
    get failureMessage() { return t('asset.collectFailed') },
    get startErrorMessage() { return t('asset.startCollectFailed') },
    get resultTitle() { return t('asset.collectInfo') },
    jobId: 'mjedwe'
  }
}

const actionSelectorOptions = {
  selectMode: 'host,group,tag,input,recently',
  selector: 'multiple',
  get label() { return t('asset.chooseDevice') }
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
const appliedFilters = reactive({ ...filters })

// 表格数据
const tableData = ref([])
const tableLoading = ref(false)
const loadError = messageRef('')
let tableRequest = 0
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
const actionLoading = ref(false)
const currentActionMeta = computed(() => ACTION_CONFIG[currentActionKey.value])

// 作业运行结果弹窗
const runResultDialogVisible = ref(false)
const currentRunId = ref('')
const currentRunActionKey = ref('checkConnectivity')
const currentRunTitle = computed(() => ACTION_CONFIG[currentRunActionKey.value].resultTitle)

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
  if (route.path.replace(/\/$/, '') !== '/acm/exception') return
  const request = ++tableRequest
  const routePath = route.fullPath
  const isCurrent = () => request === tableRequest && routePath === route.fullPath
  tableLoading.value = true
  loadError.value = ''
  tableData.value = []
  try {
    const res = await exceptionApi.getConnectException(
      {
        cit: appliedFilters.cit,
        conditions: appliedFilters.conditions,
        ip: appliedFilters.ip || undefined
      },
      {
        size: pageSize.value,
        page: currentPage.value
      }
    )
    if (!isCurrent()) return
    tableData.value = res.records || []
    total.value = res.total || 0
  } catch (error) {
    if (!isCurrent()) return
    clearTableSelection()
    loadError.value = message('asset.exceptionLoadFailed')
    console.error('加载表格数据失败:', error)
  } finally {
    if (isCurrent()) tableLoading.value = false
  }
}

const invalidateTableRead = () => {
  tableRequest += 1
  if (tableLoading.value) loadError.value = message('asset.deviceReadInterrupted')
  tableLoading.value = false
}
onBeforeUnmount(invalidateTableRead)
onDeactivated(invalidateTableRead)

const applyRouteQuery = query => {
  clearTableSelection()
  filters.cit = typeof query.cit === 'string' && query.cit ? query.cit : 'sjxy_all'
  filters.conditions = normalizeConnectExceptionCondition(query.conditions)
  filters.ip = typeof query.ip === 'string' ? query.ip : ''
  Object.assign(appliedFilters, filters, { ip: filters.ip.trim() })
  currentPage.value = 1
  pageSize.value = 10
  loadTableData()
}

// 处理 KPI 卡片点击
const handleKpiClick = params => {
  clearTableSelection()
  filters.conditions = params.conditions
  Object.assign(appliedFilters, filters, { ip: filters.ip.trim() })
  currentPage.value = 1
  loadTableData()
}

// 处理搜索
const handleSearch = () => {
  clearTableSelection()
  Object.assign(appliedFilters, filters, { ip: filters.ip.trim() })
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
  Object.assign(appliedFilters, filters)
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
  if (actionLoading.value || quickCheckLoading.value) return
  currentActionKey.value = actionKey
  actionDialogVisible.value = true
}

const closeActionDialog = () => {
  actionDialogVisible.value = false
}

const refreshExceptionData = () => {
  loadTableData()
  loadKpiData()
}

const openRunResultDialog = (runId, actionKey = 'checkConnectivity') => {
  if (!runId) return
  currentRunId.value = String(runId)
  currentRunActionKey.value = actionKey
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
  selection = [],
  actionKey = currentActionKey.value,
  confirmMessage,
  requireConfirmation = true,
  closeDialogOnSubmit = true
} = {}) => {
  if (actionLoading.value) return false
  if (selection.length === 0) {
    ElMessage.warning(t('asset.selectDeviceFirst'))
    return false
  }

  const actionMeta = ACTION_CONFIG[actionKey]

  actionLoading.value = true

  try {
    if (requireConfirmation) {
      try {
        await ElMessageBox.confirm(confirmMessage || actionMeta.confirmMessage, t('asset.executeTool'), {
          closeOnClickModal: false,
          closeOnPressEscape: false,
          confirmButtonText: t('common.confirm'),
          cancelButtonText: t('common.cancel'),
          type: 'warning'
        })
      } catch {
        return false
      }
    }

    const hosts = normalizeAcmDeviceJobHosts(selection, 'linux')
    if (hosts.length === 0) {
      ElMessage.warning(t('asset.noValidDevice'))
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
      openRunResultDialog(result.runId, actionKey)
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

const handleActionConfirm = selection => confirmAction({ selection, requireConfirmation: false })

const handleCheckSelected = async () => {
  if (quickCheckLoading.value || actionLoading.value) return
  const rows = [...selectedExceptionRows.value]
  if (rows.length === 0) {
    ElMessage.warning(t('asset.checkSelectionFirst'))
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
      confirmMessage: t('asset.checkSelectedConfirm', { count: rows.length }),
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
    await ElMessageBox.confirm(t('asset.checkHostConfirm', { ip }), t('asset.prompt'), {
      closeOnClickModal: false,
      closeOnPressEscape: false,
      get confirmButtonText() { return t('asset.ok') },
      cancelButtonText: t('common.cancel'),
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
      openRunResultDialog(result.runId, 'checkConnectivity')
      return
    }

    const finishCheck = (success = true, errorMsg = '') => {
      removeCheckingId(targetId)
      if (success) {
        ElMessage.success(t('asset.connectivityDone'))
      } else {
        ElMessage.error(errorMsg || t('asset.connectivityFailed'))
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
    ElMessage.warning(t('asset.connectivityNoRunId'))
  } catch (error) {
    removeCheckingId(targetId)
    console.error('检查连通性失败:', error)
    ElMessage.error(t('asset.checkFailedReason', { message: error.response?.data?.message || error.message }))
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
  () => [route.path, route.query],
  ([path, query]) => {
    if (path.replace(/\/$/, '') === '/acm/exception') applyRouteQuery(query)
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
</style>
