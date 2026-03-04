<template>
  <div class="ops-page-layout">
    <!-- KPI 卡片区域 -->
    <div class="kpi-section">
      <KpiCards :data="kpiData" :loading="kpiLoading" @click="handleKpiClick" />
    </div>

    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small">
        <el-form-item label="类型">
          <el-select v-model="filters.cit" placeholder="全部" style="width: 150px">
            <el-option label="全部" value="oplus_all" />
            <el-option
              v-for="item in resourceTypes"
              :key="item.code"
              :label="item.title"
              :value="item.code"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="条件">
          <el-select v-model="filters.conditions" placeholder="筛选条件" style="width: 180px">
            <el-option label="全部" value="oplus_all" />
            <el-option label="今日异常" value="today" />
            <el-option label="连通率小于50%设备" value="low" />
            <el-option label="最近一次连通失败" value="recently" />
            <el-option label="最近一次连通成功设备" value="recently_ok" />
          </el-select>
        </el-form-item>
        <el-form-item label="IP">
          <el-input v-model="searchKeyword" placeholder="搜索" clearable style="width: 200px">
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="tableLoading" @click="loadTableData">
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
      <el-button size="small" @click="handleCheckConnectivity" type="primary">
        <i class="fa fa-plug" style="margin-right: 4px"></i>
        检查连通性
      </el-button>
      <el-button size="small" @click="handleCollectInfo">
        <i class="fa fa-download" style="margin-right: 4px"></i>
        采集信息
      </el-button>
      <!-- <el-button size="small" @click="handleExport">
        <el-icon><Download /></el-icon>
        导出</el-button> -->
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
    <div class="ops-table-wrapper">
      <!-- 数据表格 -->
      <el-table
        v-loading="tableLoading"
        :data="tableData"
        style="width: 100%"
        max-height="calc(100vh - 520px)"
      >
        <el-table-column prop="IP" label="IP" min-width="120" sortable />
        <el-table-column prop="ci_name" label="资产代码" min-width="120" />
        <el-table-column prop="CONN_RATE" label="连通率" min-width="100">
          <template #default="{ row }">
            <span :class="getConnRateClass(row.CONN_RATE)">
              {{ formatConnRate(row.CONN_RATE) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          prop="CONN_LATEST_STATUS"
          label="最近连通状态"
          min-width="120"
          align="left"
        >
          <template #default="{ row }">
            <span :class="getConnStatusClass(row.CONN_LATEST_STATUS)">
              <i :class="getConnStatusIcon(row.CONN_LATEST_STATUS)"></i>
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="updated_at" label="更新时间" min-width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.updated_at) }}
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

    <!-- 检查连通性一级弹窗 -->
    <el-dialog
      v-model="checkConnDialogVisible"
      title="检查连通性"
      width="700px"
      :close-on-click-modal="false"
    >
      <div class="dialog-content">
        <!-- 使用 AcmDeviceSelector 组件 -->
        <AcmDeviceSelector
          v-model="checkConnHosts"
          ci-types="[auto]"
          :options="{
            selectMode: 'host,group,tag,input,recently',
            selector: 'multiple',
            label: '选择设备'
          }"
        />
      </div>
      <template #footer>
        <el-button @click="checkConnDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :disabled="checkConnHosts.length === 0"
          :loading="checkConnLoading"
          @click="confirmCheckConnectivity"
        >
          检查连通性
        </el-button>
      </template>
    </el-dialog>

    <!-- 采集信息一级弹窗 -->
    <el-dialog
      v-model="collectInfoDialogVisible"
      title="采集信息"
      width="700px"
      :close-on-click-modal="false"
    >
      <div class="dialog-content">
        <!-- 使用 AcmDeviceSelector 组件 -->
        <AcmDeviceSelector
          v-model="collectInfoHosts"
          ci-types="[auto]"
          :options="{
            selectMode: 'host,group,tag,input,recently',
            selector: 'multiple',
            label: '选择设备'
          }"
        />
      </div>
      <template #footer>
        <el-button @click="collectInfoDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :disabled="collectInfoHosts.length === 0"
          :loading="collectInfoLoading"
          @click="confirmCollectInfo"
        >
          采集信息
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { Download, Refresh, Search, RefreshRight } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import KpiCards from '../components/KpiCards.vue'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import { dtsApi } from '../api'
import { apiService } from '@/core/api'

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
const loading = ref(false)

// 表格数据
const tableData = ref([])
const tableLoading = ref(false)
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

// 弹窗
const checkConnDialogVisible = ref(false)
const collectInfoDialogVisible = ref(false)

// 设备选择二级弹窗
const checkConnDeviceSelectorVisible = ref(false)
const collectInfoDeviceSelectorVisible = ref(false)

// 选中的设备
const checkConnHosts = ref([])
const collectInfoHosts = ref([])

// 任务执行状态
const checkConnLoading = ref(false)
const collectInfoLoading = ref(false)

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
    const res = await dtsApi.queryData(
      'ACM_LIST_CONNECT_EXCEPTION',
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

// 处理 KPI 卡片点击
const handleKpiClick = params => {
  filters.conditions = params.conditions
  loadTableData()
}

// 处理筛选变化
const handleFilterChange = () => {
  currentPage.value = 1
  loadTableData()
}

// 处理搜索
let searchTimer = null
const handleSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 1
    loadTableData()
  }, 300)
}

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

// 导出
const handleExport = () => {
  ElMessage.info('导出功能开发中...')
}

// 刷新
const handleRefresh = () => {
  loadKpiData()
  loadTableData()
}

// 检查连通性
const handleCheckConnectivity = () => {
  checkConnHosts.value = []
  checkConnDialogVisible.value = true
}

// 打开检查连通性的设备选择弹窗
const openCheckConnDeviceSelector = () => {
  checkConnDeviceSelectorVisible.value = true
}

// 检查连通性设备选择确认回调
const handleCheckConnDeviceConfirm = selectedHosts => {
  checkConnHosts.value = selectedHosts || []
}

// 移除检查连通性已选设备
const removeCheckConnHost = index => {
  checkConnHosts.value.splice(index, 1)
}

// 轮询定时器
let pollingTimer = null

// 确认检查连通性
const confirmCheckConnectivity = async () => {
  if (checkConnHosts.value.length === 0) {
    ElMessage.warning('请先选择设备')
    return
  }

  // 显示确认弹窗
  try {
    await ElMessageBox.confirm(
      '连通性检查将花费几分钟到半小时不等的时间，点击确定开始',
      '执行作业',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
  } catch {
    return
  }

  checkConnLoading.value = true

  try {
    const hosts = checkConnHosts.value.map(h => ({
      key: h.key || h.id,
      value: h.value || h.ip,
      assetType: h.assetType || h.ciType || 'linux'
    }))

    // 调用启动检查接口
    const cacheBuster = Date.now()
    const { data } = await apiService.post(
      `/jao/api/jao/jobs/M1x855/run?cacheBuster=${cacheBuster}`,
      {
        params: { hosts }
      }
    )

    const result = Array.isArray(data) ? data[0] : data

    if (result?.status === 'WAITING' || result?.status === 'RUNNING') {
      ElMessage.success('任务已发起，可以关闭当前弹窗')
      const runId = result.runId
      // 开启后台轮询
      pollCheckResult(runId)
    } else if (result?.status === 'COMPLETED' || result?.status === 'SUCCESS') {
      ElMessage.success('连通性检查完成')
      checkConnLoading.value = false
      checkConnDialogVisible.value = false
      checkConnHosts.value = []
      loadTableData()
      loadKpiData()
    } else if (result?.status === 'FAILED' || result?.status === 'ERROR') {
      checkConnLoading.value = false
      ElMessage.error(result?.error || '连通性检查失败')
    } else {
      ElMessage.success('连通性检查任务已启动')
      checkConnLoading.value = false
      checkConnDialogVisible.value = false
      checkConnHosts.value = []
    }
  } catch (error) {
    checkConnLoading.value = false
    console.error('启动检查任务失败:', error)
    ElMessage.error('启动检查任务失败')
  }
}

// 轮询检查结果
async function pollCheckResult(runId) {
  const maxAttempts = 360 // 最多轮询 30 分钟 (360 * 5秒)
  let attempts = 0

  const poll = async () => {
    attempts++
    try {
      const cacheBuster = Date.now()
      const { data: result } = await apiService.get(
        `/jao/api/jao/runlogs/${runId}/result?cacheBuster=${cacheBuster}`
      )

      if (result?.status === 'WAITING' || result?.status === 'RUNNING') {
        if (attempts < maxAttempts) {
          pollingTimer = setTimeout(poll, 5000)
        } else {
          checkConnLoading.value = false
          ElMessage.warning('检查超时，请稍后在后台查看结果')
        }
      } else if (result?.status === 'COMPLETED' || result?.status === 'SUCCESS') {
        checkConnLoading.value = false
        ElMessage.success('连通性检查完成')
        // 刷新列表
        loadTableData()
        loadKpiData()
      } else if (result?.status === 'FAILED' || result?.status === 'ERROR') {
        checkConnLoading.value = false
        ElMessage.error(result?.error || '连通性检查失败')
      } else {
        if (attempts < maxAttempts) {
          pollingTimer = setTimeout(poll, 5000)
        } else {
          checkConnLoading.value = false
        }
      }
    } catch (error) {
      console.error('轮询失败:', error)
      if (attempts < maxAttempts) {
        pollingTimer = setTimeout(poll, 5000)
      } else {
        checkConnLoading.value = false
      }
    }
  }

  pollingTimer = setTimeout(poll, 5000)
}

// 组件卸载时清理定时器
onUnmounted(() => {
  if (pollingTimer) {
    clearTimeout(pollingTimer)
    pollingTimer = null
  }
})

// 采集信息
const handleCollectInfo = () => {
  collectInfoHosts.value = []
  collectInfoDialogVisible.value = true
}

// 打开采集信息的设备选择弹窗
const openCollectInfoDeviceSelector = () => {
  collectInfoDeviceSelectorVisible.value = true
}

// 采集信息设备选择确认回调
const handleCollectInfoDeviceConfirm = selectedHosts => {
  collectInfoHosts.value = selectedHosts || []
}

// 移除采集信息已选设备
const removeCollectInfoHost = index => {
  collectInfoHosts.value.splice(index, 1)
}

// 确认采集信息
const confirmCollectInfo = async () => {
  if (collectInfoHosts.value.length === 0) {
    ElMessage.warning('请先选择设备')
    return
  }

  // 显示确认弹窗
  try {
    await ElMessageBox.confirm('信息采集将花费几分钟到半小时不等的时间，点击确定开始', '执行作业', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  collectInfoLoading.value = true

  try {
    const hosts = collectInfoHosts.value.map(h => ({
      key: h.key || h.id,
      value: h.value || h.ip,
      assetType: h.assetType || h.ciType || 'linux'
    }))

    // 调用启动采集接口
    const cacheBuster = Date.now()
    const { data } = await apiService.post(
      `/jao/api/jao/jobs/mjedwe/run?cacheBuster=${cacheBuster}`,
      {
        params: { hosts }
      }
    )

    const result = Array.isArray(data) ? data[0] : data

    if (result?.status === 'WAITING' || result?.status === 'RUNNING') {
      ElMessage.success('任务已发起，可以关闭当前弹窗')
      const runId = result.runId
      // 开启后台轮询
      pollCollectResult(runId)
    } else if (result?.status === 'COMPLETED' || result?.status === 'SUCCESS') {
      ElMessage.success('信息采集完成')
      collectInfoLoading.value = false
      collectInfoDialogVisible.value = false
      collectInfoHosts.value = []
      loadTableData()
      loadKpiData()
    } else if (result?.status === 'FAILED' || result?.status === 'ERROR') {
      collectInfoLoading.value = false
      ElMessage.error(result?.error || '信息采集失败')
    } else {
      ElMessage.success('信息采集任务已启动')
      collectInfoLoading.value = false
      collectInfoDialogVisible.value = false
      collectInfoHosts.value = []
    }
  } catch (error) {
    collectInfoLoading.value = false
    console.error('启动采集任务失败:', error)
    ElMessage.error('启动采集任务失败')
  }
}

// 轮询采集结果
async function pollCollectResult(runId) {
  const maxAttempts = 360 // 最多轮询 30 分钟 (360 * 5秒)
  let attempts = 0

  const poll = async () => {
    attempts++
    try {
      const cacheBuster = Date.now()
      const { data: result } = await apiService.get(
        `/jao/api/jao/runlogs/${runId}/result?cacheBuster=${cacheBuster}`
      )

      if (result?.status === 'WAITING' || result?.status === 'RUNNING') {
        if (attempts < maxAttempts) {
          pollingTimer = setTimeout(poll, 5000)
        } else {
          collectInfoLoading.value = false
          ElMessage.warning('采集超时，请稍后在后台查看结果')
        }
      } else if (result?.status === 'COMPLETED' || result?.status === 'SUCCESS') {
        collectInfoLoading.value = false
        ElMessage.success('信息采集完成')
        // 刷新列表
        loadTableData()
        loadKpiData()
      } else if (result?.status === 'FAILED' || result?.status === 'ERROR') {
        collectInfoLoading.value = false
        ElMessage.error(result?.error || '信息采集失败')
      } else {
        if (attempts < maxAttempts) {
          pollingTimer = setTimeout(poll, 5000)
        } else {
          collectInfoLoading.value = false
        }
      }
    } catch (error) {
      console.error('采集轮询失败:', error)
      if (attempts < maxAttempts) {
        pollingTimer = setTimeout(poll, 5000)
      } else {
        collectInfoLoading.value = false
      }
    }
  }

  pollingTimer = setTimeout(poll, 5000)
}

// 格式化连通率
const formatConnRate = rate => {
  if (rate === null || rate === 'null' || rate === undefined) {
    return '未测试'
  }
  return `${rate}%`
}

// 获取连通率样式类
const getConnRateClass = rate => {
  if (rate === null || rate === 'null' || rate === undefined) {
    return 'text-secondary'
  }
  const numRate = Number(rate)
  if (numRate >= 50) {
    return 'text-primary'
  }
  return 'text-warning'
}

// 获取连通状态图标
const getConnStatusIcon = status => {
  if (status === null || status === 'null' || status === undefined) {
    return 'fa fa-question-circle'
  }
  if (status === 0 || status === '0' || status === '0.0') {
    return 'fa fa-times-circle'
  }
  if (status === 1 || status === '1') {
    return 'fa fa-check-circle'
  }
  return 'fa fa-question-circle'
}

// 获取连通状态样式类
const getConnStatusClass = status => {
  if (status === null || status === 'null' || status === undefined) {
    return 'text-secondary'
  }
  if (status === 0 || status === '0' || status === '0.0') {
    return 'text-danger'
  }
  if (status === 1 || status === '1') {
    return 'text-success'
  }
  return 'text-secondary'
}

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

// 初始化
onMounted(() => {
  loadKpiData()
  loadResourceTypes()
  loadTableData()
})
</script>

<style scoped lang="scss">
.exception-device {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0 20px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--el-border-color-light);

  .page-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .page-actions {
    display: flex;
    gap: 8px;
  }
}

// .kpi-section {
//   padding-bottom: 12px;
// }

.table-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  gap: 16px;

  .filter-left {
    display: flex;
    gap: 12px;
  }

  .filter-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.el-table {
  flex: 1;
}

.pagination-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;

  .pagination-info {
    font-size: 13px;
    color: var(--el-text-color-regular);
  }
}

// 状态颜色
.text-primary {
  color: #409eff;
}

.text-success {
  color: #67c23a;
}

.text-warning {
  color: #e6a23c;
}

.text-danger {
  color: #f56c6c;
}

.text-secondary {
  color: #909399;
}

.dialog-content {
  padding: 12px 0;
  font-size: 14px;
  color: var(--el-text-color-regular);

  .selected-hosts-section {
    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;

      .section-label {
        font-weight: 500;
        color: var(--el-text-color-primary);
      }

      .select-btn {
        margin-left: auto;
      }
    }

    .hosts-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      max-height: 200px;
      overflow-y: auto;
      padding: 12px;
      background: var(--el-bg-color-page);
      border-radius: 4px;
    }

    .empty-tip {
      padding: 24px;
      text-align: center;
      color: var(--el-text-color-secondary);
      background: var(--el-bg-color-page);
      border-radius: 4px;
    }
  }
}
</style>
