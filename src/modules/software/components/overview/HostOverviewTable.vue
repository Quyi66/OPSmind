<template>
  <div class="host-overview-table">
    <!-- 操作栏 - 左右分布 -->
    <div class="ops-action-bar">
      <div class="action-left">
        <!-- <el-button type="primary" size="small" @click="handleRescan">
          <i class="fas fa-chevron-right" />
          重新进行软件包扫描
        </el-button> -->
        <!-- <el-button size="small" @click="handleExport">
          <i class="fa fa-download" />
          导出
        </el-button> -->
      </div>
      <div class="action-right">
        <el-input
          v-model="localSearchText"
          placeholder=""
          style="width: 200px"
          size="small"
          clearable
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button
          class="toolbar-icon-btn"
          circle
          :loading="loading"
          :disabled="!!readError && !canRetry"
          @click="refresh"
          :title="readError ? '重试读取' : '刷新'"
          :aria-label="readError ? '重试读取主机概览' : '刷新主机概览'"
        >
          <el-icon v-show="!loading"><Refresh /></el-icon>
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="readError"
      :title="readErrorMessage"
      type="warning"
      :closable="false"
      show-icon
      style="flex-shrink: 0"
    />

    <!-- 表格区域 -->
    <div class="ops-table-wrapper">
      <el-table
        v-loading="loading"
        :data="tableData"
        :empty-text="emptyText"
        style="width: 100%"
        size="small"
        height="100%"
      >
        <el-table-column prop="host_key" label="主机" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <el-button
              class="software-cell-link"
              :title="row.host_key"
              type="primary"
              link
              @click="handleHostClick(row)"
            >
              {{ row.host_key }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column prop="os_distro" label="OS" min-width="120" show-overflow-tooltip />
        <el-table-column prop="os_version" label="OS版本" width="150" show-overflow-tooltip />
        <el-table-column prop="repo_count" label="已配置仓库" width="120" />
        <el-table-column prop="installed_pkgs_count" label="已安装软件包" width="140">
          <template #default="{ row }">
            {{ row.installed_pkgs_count }}
            <!-- <el-button type="primary" text @click="handleInstalledClick(row)">
              {{ row.installed_pkgs_count }}
            </el-button> -->
          </template>
        </el-table-column>
        <el-table-column prop="scan_date" label="上一次扫描时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.scan_date) }}
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页器区域 -->
    <div v-if="hasResult" class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 主机详情弹窗 -->
    <HostDetailDialog
      v-model="detailDialogVisible"
      :host-id="selectedHostId"
      :host-key="selectedHostKey"
    />

    <!-- 直接选择扫描目标 -->
    <AcmDeviceSelectorDialog
      v-model="scanDialogVisible"
      ci-types="linux"
      :initial-selection="selectedScanHosts"
      :options="{ selectMode: 'host,group,tag,input,recently', selector: 'multiple' }"
      title="选择设备 · 软件包扫描"
      confirm-text="开始扫描"
      description="点击“开始扫描”后将立即采集所选主机的软件包信息。"
      :allow-empty="false"
      :close-on-confirm="false"
      :submitting="scanLoading"
      @confirm="executeScan"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { hostOverviewApi, softwareScanApi } from '../../api'
import HostDetailDialog from './HostDetailDialog.vue'
import AcmDeviceSelectorDialog from '@/modules/automation/components/job/schedule/components/AcmDeviceSelectorDialog.vue'
import { normalizeAcmDeviceJobHosts } from '@/modules/automation/components/job/schedule/components/acmDeviceSelector.utils'
import { usePatchScanCompletion } from '@/modules/patches/composables/usePatchScanCompletion'
import { useSoftwareListRead } from '../../composables/useSoftwareListRead'

const { trackScan } = usePatchScanCompletion(() => {
  loadData()
  emit('rescan')
})

const emit = defineEmits(['rescan', 'view-host', 'view-installed'])

const {
  rows: tableData,
  total,
  loading,
  hasResult,
  error: readError,
  errorMessage: readErrorMessage,
  emptyText,
  canRetry,
  load,
  retry
} = useSoftwareListRead(params => hostOverviewApi.getList(params))
const localSearchText = ref('')
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total
})

// 详情弹窗
const detailDialogVisible = ref(false)
const selectedHostId = ref('')
const selectedHostKey = ref('')

// 扫描对话框
const scanDialogVisible = ref(false)
const selectedScanHosts = ref([])
const scanLoading = ref(false)

// 加载数据
function loadData() {
  const params = {
    page: pagination.page,
    size: pagination.pageSize,
    orderBy: 'scan_date desc'
  }
  if (localSearchText.value) params.filter = localSearchText.value
  return load(params)
}

// 暴露刷新方法
function refresh() {
  return readError.value ? retry() : loadData()
}

defineExpose({ refresh })

// 格式化日期
function formatDate(timestamp) {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 点击主机 - 打开详情弹窗
function handleHostClick(row) {
  selectedHostId.value = row.host_id || row.id || ''
  selectedHostKey.value = row.host_key || ''
  detailDialogVisible.value = true
  emit('view-host', row.host_key)
}

// 点击已安装软件包数 - 打开详情弹窗并切换到已安装Tab
function handleInstalledClick(row) {
  selectedHostId.value = row.host_id || row.id || ''
  selectedHostKey.value = row.host_key || ''
  detailDialogVisible.value = true
  emit('view-installed', row.host_key)
}

// 分页
function handlePageChange(page) {
  pagination.page = page
  loadData()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  loadData()
}

// 搜索
function handleSearch() {
  pagination.page = 1
  loadData()
}

// 导出
function handleExport() {
  ElMessage.info('导出功能开发中')
}

// 重新扫描 - 打开对话框
function handleRescan() {
  if (scanLoading.value) return
  selectedScanHosts.value = []
  scanDialogVisible.value = true
}

// 执行扫描
async function executeScan(selection = selectedScanHosts.value) {
  if (scanLoading.value) return
  selectedScanHosts.value = selection
  if (selectedScanHosts.value.length === 0) {
    ElMessage.warning('请选择要扫描的主机')
    return
  }

  scanLoading.value = true
  try {
    // 构造主机列表，格式: [{ key, value, assetType }]
    const hosts = normalizeAcmDeviceJobHosts(selectedScanHosts.value, 'linux')

    // 调用扫描 API
    const response = await softwareScanApi.scan({ hosts })
    const runResult = (response?.data || response || [])[0]

    if (runResult && runResult.runId) {
      ElMessage.success('软件包扫描任务已提交')
      scanDialogVisible.value = false
      selectedScanHosts.value = []

      trackScan(runResult.runId)
    } else {
      throw new Error('未获取到任务运行ID')
    }
  } catch (error) {
    console.error('Scan failed:', error)
    ElMessage.error(`扫描失败: ${error.message || '未知错误'}`)
  } finally {
    scanLoading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
@use '../../styles/layout' as software-layout;

.host-overview-table {
  @include software-layout.table-tab;
}
</style>
