<template>
  <div class="patch-scan">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="page-header__actions">
        <el-button type="primary" plain @click="handleRescan">
          <i class="fa fa-bug" />
          重新扫描补丁
        </el-button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="page-content">
      <!-- KPI 统计卡片 -->
      <div class="kpi-cards">
        <div
          v-for="kpi in kpiList"
          :key="kpi.name"
          class="kpi-card"
          :class="[`kpi-card--${kpi.theme}`]"
          @click="handleKpiClick(kpi)"
        >
          <div class="kpi-card__icon" v-if="kpi.icon">
            <i :class="['fa', kpi.icon]" />
          </div>
          <div class="kpi-card__content">
            <div class="kpi-card__value">{{ kpi.value }}</div>
            <div class="kpi-card__label">{{ kpi.name }}</div>
          </div>
        </div>
      </div>

      <!-- 导航标签 -->
      <div class="nav-tabs">
        <div
          class="nav-tab"
          :class="{ 'nav-tab--active': activeTab === 'host' }"
          @click="activeTab = 'host'"
        >
          <i class="fa fa-laptop" />
          主机概览
        </div>
        <div
          class="nav-tab"
          :class="{ 'nav-tab--active': activeTab === 'vulnerability' }"
          @click="activeTab = 'vulnerability'"
        >
          <i class="fa fa-bug" />
          漏洞概览
        </div>
      </div>

      <!-- 主机概览视图 -->
      <div v-if="activeTab === 'host'" class="tab-content">
        <div class="table-section">
          <div class="table-header">
            <h3>有可用补丁的主机</h3>
            <div class="table-toolbar">
              <el-input
                v-model="filterText"
                placeholder="搜索..."
                prefix-icon="Search"
                style="width: 200px"
                clearable
                size="small"
                @input="handleFilter"
              />
              <el-button size="small" @click="handleExport">
                <i class="fa fa-download" />
                导出
              </el-button>
            </div>
          </div>

          <el-table
            v-loading="loading"
            :data="hostTableData"
            stripe
            style="width: 100%"
            size="small"
          >
            <el-table-column prop="host_key" label="主机" min-width="140">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="handleHostClick(row)">
                  {{ row.host_key }}
                </el-button>
              </template>
            </el-table-column>
            <el-table-column prop="hostname" label="主机名" min-width="120" show-overflow-tooltip />
            <el-table-column prop="os_distro" label="操作系统" width="100" />
            <el-table-column prop="os_version" label="OS版本" width="100" />
            <el-table-column prop="num_critical" width="90">
              <template #header>
                严重 <i class="fa fa-circle text-danger" />
              </template>
              <template #default="{ row }">
                <span :class="{ 'text-danger font-bold': row.num_critical > 0 }">
                  {{ row.num_critical }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="num_important" width="90">
              <template #header>
                重要 <i class="fa fa-circle text-warning" />
              </template>
              <template #default="{ row }">
                <span :class="{ 'text-warning font-bold': row.num_important > 0 }">
                  {{ row.num_important }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="num_moderate" width="90">
              <template #header>
                中等 <i class="fa fa-circle text-dark" />
              </template>
            </el-table-column>
            <el-table-column prop="num_low" width="80">
              <template #header>
                低 <i class="fa fa-circle text-info" />
              </template>
            </el-table-column>
            <el-table-column prop="scan_timestamp" label="最后扫描时间" width="160" sortable>
              <template #default="{ row }">
                {{ formatDateTime(row.scan_timestamp) }}
              </template>
            </el-table-column>
          </el-table>

          <!-- 分页 -->
          <div class="table-footer">
            <el-pagination
              v-model:current-page="pagination.page"
              v-model:page-size="pagination.pageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="pagination.total"
              layout="total, sizes, prev, pager, next, jumper"
              size="small"
              @size-change="handleSizeChange"
              @current-change="handlePageChange"
            />
          </div>
        </div>

        <!-- 重新扫描补丁按钮 -->
        <div class="action-section">
          <el-button type="primary" plain class="btn-action" @click="handleRescan">
            重新扫描补丁
            <i class="fa fa-chevron-right" />
          </el-button>
        </div>
      </div>

      <!-- 漏洞概览视图 -->
      <div v-else-if="activeTab === 'vulnerability'" class="tab-content">
        <div class="table-section">
          <div class="table-header">
            <h3>漏洞列表</h3>
            <div class="table-toolbar">
              <el-input
                v-model="vulnFilterText"
                placeholder="搜索..."
                prefix-icon="Search"
                style="width: 200px"
                clearable
                size="small"
                @input="handleVulnFilter"
              />
            </div>
          </div>

          <el-table
            v-loading="vulnLoading"
            :data="vulnTableData"
            stripe
            style="width: 100%"
            size="small"
          >
            <el-table-column prop="advisory" label="漏洞编号" min-width="140">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="handleVulnClick(row)">
                  {{ row.advisory }}
                </el-button>
              </template>
            </el-table-column>
            <el-table-column prop="severity" label="严重程度" width="100">
              <template #default="{ row }">
                <span :class="getSeverityClass(row.severity)">
                  <i class="fa fa-circle" /> {{ row.severity }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="synopsis" label="描述" min-width="250" show-overflow-tooltip />
            <el-table-column prop="affected_hosts" label="影响主机数" width="100" />
            <el-table-column prop="issue_date" label="发布日期" width="120" />
          </el-table>

          <div class="table-footer">
            <el-pagination
              v-model:current-page="vulnPagination.page"
              v-model:page-size="vulnPagination.pageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="vulnPagination.total"
              layout="total, sizes, prev, pager, next, jumper"
              size="small"
              @size-change="handleVulnSizeChange"
              @current-change="handleVulnPageChange"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 重新扫描对话框 -->
    <el-dialog
      v-model="rescanDialogVisible"
      title="重新扫描补丁"
      width="600px"
    >
      <el-form ref="rescanFormRef" :model="rescanForm" label-width="100px">
        <el-form-item label="选择主机">
          <div class="host-input-container">
            <el-input
              v-model="rescanForm.hostsInput"
              type="textarea"
              :rows="4"
              placeholder="请输入主机名或IP，每行一个"
            />
            <el-button class="select-host-btn" @click="showHostSelector">
              <i class="fa fa-server" />
              选择主机
            </el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rescanDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="rescanLoading" @click="executeRescan">
          开始扫描
        </el-button>
      </template>
    </el-dialog>

    <!-- 主机选择器对话框 -->
    <HostSelectorDialog
      v-model:visible="hostSelectorVisible"
      @confirm="handleHostSelected"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { patchScanApi, patchOverviewApi } from '../api'
import HostSelectorDialog from '@/modules/automation/components/command/dialogs/HostSelectorDialog.vue'

// Emits
const emit = defineEmits(['install', 'navigate'])

// 当前标签页
const activeTab = ref('host')

// KPI 数据
const kpiList = ref([
  { name: '严重补丁数', value: 0, icon: 'fa-exclamation-triangle', theme: 'danger', linkPage: 'Ol37gK', pageParam: 'Critical' },
  { name: '重要补丁数', value: 0, icon: 'fa-exclamation-circle', theme: 'warning', linkPage: 'Ol37gK', pageParam: 'Important' },
  { name: '漏洞数量', value: 0, icon: 'fa-virus', theme: 'secondary', linkPage: 'JrJ8lz', pageParam: '' },
  { name: '严重漏洞主机', value: 0, icon: '', theme: 'secondary', linkPage: '', pageParam: '' },
  { name: '重要漏洞主机', value: 0, icon: '', theme: 'secondary', linkPage: '', pageParam: '' },
  { name: '扫描主机数', value: 0, icon: '', theme: 'secondary', linkPage: '', pageParam: '' }
])

// 主机表格
const loading = ref(false)
const filterText = ref('')
const hostTableData = ref([])
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 漏洞表格
const vulnLoading = ref(false)
const vulnFilterText = ref('')
const vulnTableData = ref([])
const vulnPagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 重新扫描对话框
const rescanDialogVisible = ref(false)
const rescanLoading = ref(false)
const rescanFormRef = ref(null)
const rescanForm = reactive({
  hostsInput: ''
})
const hostSelectorVisible = ref(false)

// 获取严重程度样式类
function getSeverityClass(severity) {
  const map = {
    Critical: 'text-danger',
    Important: 'text-warning',
    Moderate: 'text-dark',
    Low: 'text-info'
  }
  return map[severity] || ''
}

// 格式化日期时间
function formatDateTime(timestamp) {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 加载 KPI 数据
async function loadKpiData() {
  try {
    const response = await patchOverviewApi.getIndexStats()
    if (response?.data?.records) {
      const defs = {
        scan_count_critical_patch: { index: 0, theme: 'danger' },
        scan_count_important_patch: { index: 1, theme: 'warning' },
        scan_count_vul: { index: 2, theme: 'secondary' },
        scan_count_host_with_critical: { index: 3, theme: 'secondary' },
        scan_count_host_with_important: { index: 4, theme: 'secondary' },
        scan_count_host: { index: 5, theme: 'secondary' }
      }
      response.data.records.forEach(rec => {
        const def = defs[rec.name]
        if (def !== undefined) {
          kpiList.value[def.index].value = rec.value || 0
          // 动态设置 theme
          if (def.index === 0 && rec.value > 0) {
            kpiList.value[0].theme = 'danger'
          }
          if (def.index === 1 && rec.value > 0) {
            kpiList.value[1].theme = 'warning'
          }
        }
      })
    }
  } catch (error) {
    console.error('Failed to load KPI data:', error)
    // 模拟数据
    kpiList.value[0].value = 12
    kpiList.value[1].value = 45
    kpiList.value[2].value = 23
    kpiList.value[3].value = 8
    kpiList.value[4].value = 15
    kpiList.value[5].value = 89
  }
}

// 加载主机表格数据
async function loadHostData() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      size: pagination.pageSize,
      filter: filterText.value
    }
    const response = await patchScanApi.getScanResults(params)
    if (response?.data) {
      hostTableData.value = response.data.records || []
      pagination.total = response.data.total || 0
    }
  } catch (error) {
    console.error('Failed to load host data:', error)
    // 模拟数据
    hostTableData.value = generateMockHostData()
    pagination.total = 100
  } finally {
    loading.value = false
  }
}

// 加载漏洞表格数据
async function loadVulnData() {
  vulnLoading.value = true
  try {
    const params = {
      page: vulnPagination.page,
      size: vulnPagination.pageSize,
      filter: vulnFilterText.value
    }
    // TODO: 调用实际 API
    // const response = await vulnerabilityApi.getList(params)
    vulnTableData.value = generateMockVulnData()
    vulnPagination.total = 50
  } catch (error) {
    console.error('Failed to load vulnerability data:', error)
    vulnTableData.value = generateMockVulnData()
    vulnPagination.total = 50
  } finally {
    vulnLoading.value = false
  }
}

// 生成模拟主机数据
function generateMockHostData() {
  const osVersions = ['RHEL 7.1', 'RHEL 7.4', 'RHEL 7.6', 'RHEL 6.6', 'RHEL 6.2', 'CentOS 7.9', 'CentOS 8.4']
  const result = []
  for (let i = 0; i < 20; i++) {
    const ip = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
    result.push({
      host_id: `host-${i}`,
      host_key: ip,
      hostname: `server${String(i + 1).padStart(2, '0')}.example.com`,
      os_distro: osVersions[i % osVersions.length].split(' ')[0],
      os_version: osVersions[i % osVersions.length],
      num_critical: Math.floor(Math.random() * 10),
      num_important: Math.floor(Math.random() * 20),
      num_moderate: Math.floor(Math.random() * 30),
      num_low: Math.floor(Math.random() * 50),
      scan_timestamp: Date.now() - Math.floor(Math.random() * 86400000 * 7)
    })
  }
  return result
}

// 生成模拟漏洞数据
function generateMockVulnData() {
  const severities = ['Critical', 'Important', 'Moderate', 'Low']
  const result = []
  for (let i = 0; i < 20; i++) {
    result.push({
      advisory: `RHSA-2024:${String(1000 + i).padStart(4, '0')}`,
      severity: severities[i % 4],
      synopsis: `Security Advisory ${i + 1} - 重要安全更新`,
      affected_hosts: Math.floor(Math.random() * 50) + 1,
      issue_date: '2024-01-15'
    })
  }
  return result
}

// 事件处理
function handleFilter() {
  pagination.page = 1
  loadHostData()
}

function handleVulnFilter() {
  vulnPagination.page = 1
  loadVulnData()
}

function handlePageChange(page) {
  pagination.page = page
  loadHostData()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  loadHostData()
}

function handleVulnPageChange(page) {
  vulnPagination.page = page
  loadVulnData()
}

function handleVulnSizeChange(size) {
  vulnPagination.pageSize = size
  vulnPagination.page = 1
  loadVulnData()
}

function handleKpiClick(kpi) {
  if (kpi.linkPage) {
    // 导航到对应页面
    emit('navigate', { pageId: kpi.linkPage, params: { severity: kpi.pageParam } })
  }
}

function handleHostClick(row) {
  // 导航到主机详情
  emit('navigate', {
    pageId: 'CI8CIB',
    params: {
      host_key: row.host_key,
      host_id: row.host_id,
      os_distro: row.os_distro,
      os_version: row.os_version,
      hostname: row.hostname
    }
  })
}

function handleVulnClick(row) {
  // 导航到漏洞详情
  ElMessage.info(`查看漏洞详情: ${row.advisory}`)
}

function handleExport() {
  ElMessage.info('导出功能开发中...')
}

function handleRescan() {
  rescanForm.hostsInput = ''
  rescanDialogVisible.value = true
}

function showHostSelector() {
  hostSelectorVisible.value = true
}

function handleHostSelected(hosts) {
  const hostList = hosts.map(h => h.hostname || h.name || h)
  rescanForm.hostsInput = hostList.join('\n')
}

async function executeRescan() {
  const hostLines = rescanForm.hostsInput.split('\n').filter(line => line.trim())
  if (hostLines.length === 0) {
    ElMessage.warning('请输入或选择至少一个主机')
    return
  }

  rescanLoading.value = true
  try {
    await patchScanApi.scan({ hosts: hostLines })
    ElMessage.success('扫描任务已提交')
    rescanDialogVisible.value = false
    setTimeout(() => {
      loadKpiData()
      loadHostData()
    }, 2000)
  } catch (error) {
    console.error('Scan failed:', error)
    ElMessage.error('扫描任务提交失败')
  } finally {
    rescanLoading.value = false
  }
}

function refresh() {
  loadKpiData()
  loadHostData()
  if (activeTab.value === 'vulnerability') {
    loadVulnData()
  }
}

// 监听 tab 切换
watch(activeTab, (newTab) => {
  if (newTab === 'vulnerability' && vulnTableData.value.length === 0) {
    loadVulnData()
  }
})

onMounted(() => {
  loadKpiData()
  loadHostData()
})

// 暴露方法
defineExpose({
  refresh
})
</script>

<style scoped lang="scss">
.patch-scan {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f8f9fa;
}

.page-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #e9ecef;

  &__actions {
    display: flex;
    gap: 8px;
  }
}

.page-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

// KPI 卡片
.kpi-cards {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.kpi-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &--danger {
    border-left: 3px solid #dc3545;
    background: #fff5f5;
  }

  &--warning {
    border-left: 3px solid #ffc107;
    background: #fffbeb;
  }

  &--secondary {
    border-left: 3px solid #6c757d;
  }

  &__icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    color: #6c757d;
  }

  &--danger &__icon {
    color: #dc3545;
  }

  &--warning &__icon {
    color: #ffc107;
  }

  &__content {
    flex: 1;
  }

  &__value {
    font-size: 24px;
    font-weight: 700;
    color: #212529;
    line-height: 1;
  }

  &__label {
    font-size: 12px;
    color: #6c757d;
    margin-top: 4px;
  }
}

// 导航标签
.nav-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 16px;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e9ecef;
}

.nav-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  font-size: 14px;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s;
  border-right: 1px solid #e9ecef;

  &:last-child {
    border-right: none;
  }

  &:hover {
    background: #f8f9fa;
  }

  &--active {
    background: #e7f1ff;
    color: #0d6efd;
    font-weight: 500;
  }

  i {
    font-size: 14px;
  }
}

// 标签内容
.tab-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

// 表格区域
.table-section {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e9ecef;

  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #212529;
  }
}

.table-toolbar {
  display: flex;
  gap: 8px;
}

.table-footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid #e9ecef;
}

// 文字颜色
.text-danger {
  color: #dc3545;
}

.text-warning {
  color: #ffc107;
}

.text-dark {
  color: #343a40;
}

.text-info {
  color: #17a2b8;
}

.font-bold {
  font-weight: 600;
}

// 操作区域
.action-section {
  display: flex;
  justify-content: flex-start;
}

.btn-action {
  min-width: 160px;
}

// 主机输入区
.host-input-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.select-host-btn {
  align-self: flex-start;
}

// 响应式
@media (max-width: 1400px) {
  .kpi-cards {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .kpi-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .nav-tabs {
    flex-direction: column;
  }

  .nav-tab {
    border-right: none;
    border-bottom: 1px solid #e9ecef;

    &:last-child {
      border-bottom: none;
    }
  }
}
</style>
