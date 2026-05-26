<template>
  <div class="ops-page-layout">
    <!-- KPI 卡片区域 -->
    <div class="kpi-section">
      <KpiCards :data="kpiData" :loading="kpiLoading" @click="handleKpiClick" />
    </div>

    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small">
        <el-form-item label="设备类型">
          <el-select v-model="filters.cit" placeholder="全部" style="width: 140px">
            <el-option label="全部" value="oplus_all" />
            <el-option
              v-for="item in resourceTypes"
              :key="item.code"
              :label="item.title"
              :value="item.code"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="筛选条件">
          <el-select v-model="filters.conditions" placeholder="筛选条件" style="width: 180px">
            <el-option label="全部" value="oplus_all" />
            <el-option label="今日异常" value="today" />
            <el-option label="连通率小于50%设备" value="low" />
            <el-option label="最近一次连通失败" value="recently" />
            <el-option label="最近一次连通成功设备" value="recently_ok" />
          </el-select>
        </el-form-item>
        <el-form-item label="设备 IP">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索设备 IP..."
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
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
      <el-button size="small" @click="openActionDialog('checkConnectivity')" type="primary">
        <i class="fa fa-plug" style="margin-right: 4px"></i>
        连通性检测
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
        v-loading="tableLoading"
        :data="tableData"
        height="100%"
        row-class-name="modern-table-row"
      >
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
              <el-tag
                :type="row.CONN_LATEST_STATUS === '1' ? 'success' : (row.CONN_LATEST_STATUS === '0' ? 'danger' : 'warning')"
                size="small"
                effect="light"
                class="health-status-tag"
              >
                <i :class="row.CONN_LATEST_STATUS === '1' ? 'fa fa-check-circle' : (row.CONN_LATEST_STATUS === '0' ? 'fa fa-times-circle' : 'fa fa-question-circle')"></i>
                <span style="margin-left: 4px">
                  {{ row.CONN_LATEST_STATUS === '1' ? '正常' : (row.CONN_LATEST_STATUS === '0' ? '失联' : '未知') }}
                </span>
              </el-tag>

              <div class="conn-rate-progress">
                <el-progress
                  :percentage="getProgressRate(row.CONN_RATE)"
                  :status="getProgressRate(row.CONN_RATE) >= 80 ? 'success' : (getProgressRate(row.CONN_RATE) >= 50 ? 'warning' : 'exception')"
                  :stroke-width="5"
                  :show-text="false"
                  style="width: 80px"
                />
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- 3. 更新时间 -->
        <el-table-column label="最后同步时间" min-width="160">
          <template #default="{ row }">
            <span>{{ formatDateTime(row.updated_at) }}</span>
          </template>
        </el-table-column>

        <!-- 4. 操作 -->
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="viewCredentials(row)">查看凭据</el-button>
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
          @click="confirmAction"
        >
          {{ currentActionMeta.confirmButtonText }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Refresh, Search, RefreshRight } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import KpiCards from '../components/exception/KpiCards.vue'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import { normalizeAcmDeviceJobHosts } from '@/modules/automation/components/job/schedule/components/acmDeviceSelector.utils'
import { dtsApi, exceptionApi } from '../api'
import { apiService } from '@/core/api'

const route = useRoute()
const router = useRouter()
const EXCEPTION_QUERY_CONDITIONS = new Set(['oplus_all', 'recently', 'recently_ok', 'today', 'low'])

const ACTION_CONFIG = {
  checkConnectivity: {
    title: '检查连通性',
    confirmButtonText: '立即检查连通性',
    confirmMessage: '连通性检查将花费数分钟至半小时不等，确认后将立即开始执行。',
    pendingMessage: '连通性检查任务已发起，可以关闭当前弹窗',
    successMessage: '连通性检查完成',
    failureMessage: '连通性检查失败',
    startErrorMessage: '启动检查任务失败',
    timeoutMessage: '检查超时，请稍后在后台查看结果',
    pollErrorMessage: '检查结果轮询失败，请稍后在后台查看结果',
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
    timeoutMessage: '采集超时，请稍后在后台查看结果',
    pollErrorMessage: '采集结果轮询失败，请稍后在后台查看结果',
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
  cit: 'oplus_all',
  conditions: 'recently'
})

// 搜索关键词
const searchKeyword = ref('')

// 表格数据
const tableData = ref([])
const tableLoading = ref(false)
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const loading = computed(() => kpiLoading.value || tableLoading.value)

// 动作弹窗
const actionDialogVisible = ref(false)
const currentActionKey = ref('checkConnectivity')
const actionHosts = ref([])
const actionLoading = ref(false)
const currentActionMeta = computed(() => ACTION_CONFIG[currentActionKey.value])

// 加载 KPI 数据
const loadKpiData = async () => {
  kpiLoading.value = true
  try {
    const res = await dtsApi.queryData('ACM_CONNECTION_COUNT', {})
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
    const res = await dtsApi.queryData('ACM_GET_RESOURCE_TYPE', null)
    resourceTypes.value = res.records || []
  } catch (error) {
    console.error('加载资源类型失败:', error)
  }
}

// 加载表格数据
const loadTableData = async () => {
  tableLoading.value = true
  try {
    const res = await exceptionApi.getExceptionDevices(
      {
        cit: filters.cit,
        conditions: filters.conditions,
        param: 'rwx'
      },
      {
        size: pageSize.value,
        page: currentPage.value,
        filter: searchKeyword.value ? `IP:*${searchKeyword.value}*` : undefined
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

const normalizeCondition = value => {
  if (typeof value === 'string' && EXCEPTION_QUERY_CONDITIONS.has(value)) {
    return value
  }
  return 'recently'
}

const applyRouteQuery = query => {
  filters.cit = typeof query.cit === 'string' && query.cit ? query.cit : 'oplus_all'
  filters.conditions = normalizeCondition(query.conditions)
  searchKeyword.value = typeof query.keyword === 'string' ? query.keyword : ''
  currentPage.value = 1
  pageSize.value = 10
  loadTableData()
}

// 处理 KPI 卡片点击
const handleKpiClick = params => {
  filters.conditions = params.conditions
  loadTableData()
}

// 处理搜索
const handleSearch = () => {
  currentPage.value = 1
  loadTableData()
}

// 搜索输入防抖
let searchDebounceTimer = null
watch(searchKeyword, (newVal) => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  if (!newVal) {
    handleSearch()
  } else {
    searchDebounceTimer = setTimeout(() => {
      handleSearch()
    }, 300)
  }
})

// 重置
const handleReset = () => {
  filters.cit = 'oplus_all'
  filters.conditions = 'recently'
  searchKeyword.value = ''
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

const pollTimerIds = new Set()

const schedulePolling = callback => {
  const timerId = setTimeout(async () => {
    pollTimerIds.delete(timerId)
    await callback()
  }, 5000)
  pollTimerIds.add(timerId)
}

const isJobPending = result => result?.status === 'WAITING' || result?.status === 'RUNNING'

const isJobSuccess = result => result?.status === 'COMPLETED' || result?.status === 'SUCCESS'

const isJobFailed = result => result?.status === 'FAILED' || result?.status === 'ERROR'

const pollActionResult = async (runId, actionKey) => {
  const actionMeta = ACTION_CONFIG[actionKey]
  const maxAttempts = 360
  let attempts = 0

  const poll = async () => {
    attempts++
    try {
      const cacheBuster = Date.now()
      const { data: result } = await apiService.get(
        `/jao/api/jao/runlogs/${runId}/result?cacheBuster=${cacheBuster}`
      )

      if (isJobPending(result)) {
        if (attempts < maxAttempts) {
          schedulePolling(poll)
        } else {
          ElMessage.warning(actionMeta.timeoutMessage)
        }
        return
      }

      if (isJobSuccess(result)) {
        ElMessage.success(actionMeta.successMessage)
        refreshExceptionData()
        return
      }

      if (isJobFailed(result)) {
        ElMessage.error(result?.error || actionMeta.failureMessage)
        return
      }

      if (attempts < maxAttempts) {
        schedulePolling(poll)
      }
    } catch (error) {
      console.error(`${actionMeta.title}轮询失败:`, error)
      if (attempts < maxAttempts) {
        schedulePolling(poll)
      } else {
        ElMessage.warning(actionMeta.pollErrorMessage)
      }
    }
  }

  schedulePolling(poll)
}

const confirmAction = async () => {
  if (actionHosts.value.length === 0) {
    ElMessage.warning('请先选择设备')
    return
  }

  const actionKey = currentActionKey.value
  const actionMeta = ACTION_CONFIG[actionKey]

  try {
    await ElMessageBox.confirm(actionMeta.confirmMessage, '执行作业', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  actionLoading.value = true

  try {
    const hosts = normalizeAcmDeviceJobHosts(actionHosts.value, 'linux')
    const cacheBuster = Date.now()
    const { data } = await apiService.post(
      `/jao/api/jao/jobs/${actionMeta.jobId}/run?cacheBuster=${cacheBuster}`,
      {
        params: { hosts }
      }
    )

    const result = Array.isArray(data) ? data[0] : data

    if (isJobPending(result)) {
      ElMessage.success(actionMeta.pendingMessage)
      closeActionDialog()
      pollActionResult(result.runId, actionKey)
      return
    }

    if (isJobSuccess(result)) {
      ElMessage.success(actionMeta.successMessage)
      closeActionDialog()
      refreshExceptionData()
      return
    }

    if (isJobFailed(result)) {
      ElMessage.error(result?.error || actionMeta.failureMessage)
      return
    }

    ElMessage.success(actionMeta.pendingMessage)
    closeActionDialog()
  } catch (error) {
    console.error(actionMeta.startErrorMessage + ':', error)
    ElMessage.error(actionMeta.startErrorMessage)
  } finally {
    actionLoading.value = false
  }
}

// 组件卸载时清理定时器
onUnmounted(() => {
  pollTimerIds.forEach(timerId => clearTimeout(timerId))
  pollTimerIds.clear()
})

// 格式化日期时间
const formatDateTime = dateStr => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
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
  if (!row.IP) return
  router.push({
    path: '/acm/automation',
    query: { ip: row.IP }
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
  }
}


.dialog-content {
  padding: 8px 4px;
}
</style>
