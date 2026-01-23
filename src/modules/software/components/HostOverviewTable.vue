<template>
  <div class="host-overview-table">
    <!-- 操作栏 - 左右分布 -->
    <div class="ops-action-bar">
      <div class="action-left">
        <el-button type="primary" size="small" @click="handleRescan">
          <i class="fas fa-chevron-right" />
          重新进行软件包扫描
        </el-button>
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
        <el-button class="toolbar-icon-btn" circle :loading="loading" @click="loadData" title="刷新">
          <el-icon v-show="!loading"><Refresh /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 表格区域 -->
    <div class="ops-table-wrapper">
      <el-table
        v-loading="loading"
        :data="tableData"
        stripe
        style="width: 100%"
        size="small"
        max-height="calc(100vh - 380px)"
      >
        <el-table-column prop="host_key" label="主机" min-width="150">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleHostClick(row)">
              {{ row.host_key }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column prop="os_distro" label="OS" min-width="120" />
        <el-table-column prop="os_version" label="OS版本" width="150" />
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
    <div class="ops-pagination-wrapper">
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

    <!-- 扫描目标主机对话框 -->
    <el-dialog
      v-model="scanDialogVisible"
      title="选择目标主机"
      width="600px"
      destroy-on-close
    >
      <div class="scan-dialog-content">
        <!-- 使用 AcmDeviceSelector 组件 -->
        <AcmDeviceSelector
          v-model="selectedScanHosts"
          ci-types="linux"
          :options="{
            selectMode: 'host,group,tag,input,recently',
            selector: 'multiple',
            label: '选择'
          }"
        />
      </div>
      <template #footer>
        <el-button @click="scanDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="scanLoading" :disabled="selectedScanHosts.length === 0" @click="executeScan">
          开始扫描
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { hostOverviewApi, softwareScanApi } from '../api'
import HostDetailDialog from './HostDetailDialog.vue'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import { useJobPolling } from '@/composables/useJobPolling'

// 使用作业轮询 composable
const { isPolling, startPolling } = useJobPolling()

const emit = defineEmits(['rescan', 'view-host', 'view-installed'])

const loading = ref(false)
const tableData = ref([])
const localSearchText = ref('')
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
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
async function loadData() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      size: pagination.pageSize,
      orderBy: 'scan_date desc'
    }
    if (localSearchText.value) {
      params.filter = localSearchText.value
    }

    const response = await hostOverviewApi.getList(params)
    const data = response?.data || response
    tableData.value = data?.records || []
    pagination.total = data?.total || 0
  } catch (error) {
    console.error('Failed to load host overview:', error)
    tableData.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

// 暴露刷新方法
function refresh() {
  loadData()
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
  selectedScanHosts.value = []
  scanDialogVisible.value = true
}

// 执行扫描
async function executeScan() {
  if (selectedScanHosts.value.length === 0) {
    ElMessage.warning('请选择要扫描的主机')
    return
  }

  scanLoading.value = true
  try {
    // 构造主机列表，格式: [{ key, value, assetType }]
    const hosts = selectedScanHosts.value.map(host => ({
      key: host.key || host.id || host.host_key,
      value: host.value || host.ip || host.host_key,
      assetType: host.assetType || host.ci_type || 'linux'
    }))

    // 调用扫描 API
    const response = await softwareScanApi.scan({ hosts })
    const runResult = (response?.data || response || [])[0]

    if (runResult && runResult.runId) {
      ElMessage.success('软件包扫描任务已提交')
      scanDialogVisible.value = false
      selectedScanHosts.value = []

      // 使用 composable 开始轮询任务状态
      startPolling(runResult.runId, {
        successMessage: '软件包扫描完成',
        errorMessage: '软件包扫描失败',
        onSuccess: () => {
          loadData()
          emit('rescan')
        },
        onComplete: () => {
          scanLoading.value = false
        }
      })
    } else {
      throw new Error('未获取到任务运行ID')
    }
  } catch (error) {
    console.error('Scan failed:', error)
    ElMessage.error('扫描失败: ' + (error.message || '未知错误'))
    scanLoading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
/* 此组件使用全局的 ops-* 样式 */

.host-overview-table {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  gap: 16px;
}

.ops-action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.action-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
