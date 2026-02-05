<template>
  <div class="ops-page-layout">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="page-header__actions">
        <el-button type="primary" @click="handleRescan">
          <i class="fa fa-bug" />
          重新扫描补丁
        </el-button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="page-content">
      <!-- 新版统计面板 -->
      <div class="stats-dashboard">
        <!-- 1. 补丁统计卡片 -->
        <div class="stat-card patch-card">
          <div class="card-title">补丁统计</div>
          <div class="patch-chart-container">
            <div class="chart-wrapper">
              <v-chart class="patch-pie-chart" :option="chartOption" autoresize />
              <div class="chart-center-label">
                <div class="label-title">总计</div>
                <div class="label-value">{{ kpiStats.totalPatchCount }}</div>
              </div>
            </div>
          </div>
          <div class="patch-progress-section">
            <div class="progress-bar-container">
              <div
                class="progress-segment critical"
                :style="{ width: kpiStats.criticalPatchPercent + '%' }"
              ></div>
              <div
                class="progress-segment important"
                :style="{ width: kpiStats.importantPatchPercent + '%' }"
              ></div>
            </div>
            <div class="progress-labels">
              <div class="stat-label critical">
                <i class="fa fa-circle"></i>
                致命 {{ kpiStats.criticalPatchPercent }}%
                <span class="count">({{ kpiStats.criticalPatchCount }})</span>
              </div>
              <div class="stat-label important">
                <i class="fa fa-circle"></i>
                严重 {{ kpiStats.importantPatchPercent }}%
                <span class="count">({{ kpiStats.importantPatchCount }})</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. 漏洞概览卡片 -->
        <div class="stat-card vul-card">
          <div class="card-title">漏洞概览</div>
          <div class="vul-content">
            <div class="vul-number">{{ kpiStats.vulCount.toLocaleString() }}</div>
            <div class="vul-label">CVE漏洞总数</div>
            <div class="vul-sub-metric">
              <i class="fa fa-bug"></i>
              平均每主机 {{ kpiStats.avgVulPerHost }} 个漏洞
            </div>
            <div class="vul-icon-bg">
              <i class="fa fa-shield-alt"></i>
            </div>
          </div>
        </div>

        <!-- 3. 主机影响卡片 -->
        <div class="stat-card host-card">
          <div class="card-title">主机影响</div>
          <div class="host-content">
            <div class="host-total-row">
              <span class="label">扫描主机</span>
              <span class="value">{{ kpiStats.hostCount }} 台</span>
            </div>

            <div class="impact-item">
              <div class="impact-header">
                <span class="label-critical">致命影响</span>
                <span class="value">
                  {{ kpiStats.criticalHostCount }} 台 ({{ kpiStats.criticalHostPercent }}%)
                </span>
              </div>
              <div class="progress-track">
                <div
                  class="progress-fill critical"
                  :style="{ width: kpiStats.criticalHostPercent + '%' }"
                ></div>
              </div>
            </div>

            <div class="impact-item">
              <div class="impact-header">
                <span class="label-important">严重影响</span>
                <span class="value">
                  {{ kpiStats.importantHostCount }} 台 ({{ kpiStats.importantHostPercent }}%)
                </span>
              </div>
              <div class="progress-track">
                <div
                  class="progress-fill important"
                  :style="{ width: kpiStats.importantHostPercent + '%' }"
                ></div>
              </div>
            </div>
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
      <div v-if="activeTab === 'host'" class="tab-content ops-page-layout">
        <!-- 筛选栏 -->
        <div class="ops-filter-bar">
          <el-form :model="hostFilters" inline size="small">
            <el-form-item label="关键词">
              <el-input
                v-model="filterText"
                placeholder="输入字符搜索"
                style="width: 200px"
                clearable
              >
                <template #prefix>
                  <el-icon>
                    <Search />
                  </el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="loading" @click="handleFilter">
                <el-icon>
                  <Search />
                </el-icon>
                搜索
              </el-button>
              <el-button @click="handleHostReset">
                <el-icon>
                  <RefreshRight />
                </el-icon>
                重置
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 操作栏 -->
        <div class="ops-action-bar">
          <!-- <el-button size="small" @click="handleExport">
            <i class="fa fa-download" /> 导出
          </el-button> -->
          <span style="flex: 1"></span>
          <el-button
            class="toolbar-icon-btn"
            circle
            size="small"
            :loading="loading"
            @click="refresh"
            title="刷新"
          >
            <el-icon v-show="!loading">
              <Refresh />
            </el-icon>
          </el-button>
        </div>

        <!-- 表格 -->
        <div class="ops-table-wrapper">
          <el-table
            v-loading="loading"
            :data="hostTableData"
            style="width: 100%"
            max-height="calc(100vh - 620px)"
          >
            <el-table-column prop="host_key" label="主机" min-width="140">
              <template #default="{ row }">
                <a href="javascript:void(0)" class="host-link" @click="handleHostClick(row)">
                  {{ row.host_key }}
                </a>
              </template>
            </el-table-column>
            <el-table-column prop="hostname" label="主机名" min-width="120" show-overflow-tooltip />
            <el-table-column prop="os_distro" label="操作系统" width="100" />
            <el-table-column prop="os_version" label="OS版本" width="120" />
            <el-table-column prop="num_critical" width="90">
              <template #header>
                严重
                <i class="fa fa-circle text-danger" />
              </template>
              <template #default="{ row }">
                <span :class="{ 'text-danger font-bold': row.num_critical > 0 }">
                  {{ row.num_critical }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="num_important" width="90">
              <template #header>
                重要
                <i class="fa fa-circle text-warning" />
              </template>
              <template #default="{ row }">
                <span :class="{ 'text-warning font-bold': row.num_important > 0 }">
                  {{ row.num_important }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="num_moderate" width="90">
              <template #header>
                中等
                <i class="fa fa-circle text-dark" />
              </template>
              <template #default="{ row }">
                <span :class="{ 'text-dark font-bold': row.num_moderate > 0 }">
                  {{ row.num_moderate }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="num_low" width="80">
              <template #header>
                低
                <i class="fa fa-circle text-info" />
              </template>
              <template #default="{ row }">
                <span :class="{ 'text-info font-bold': row.num_low > 0 }">
                  {{ row.num_low }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="scan_timestamp" label="最后扫描时间" width="200" sortable>
              <template #default="{ row }">
                {{ formatDateTime(row.scan_timestamp) }}
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 分页 -->
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
      </div>

      <!-- 漏洞概览视图 -->
      <div v-else-if="activeTab === 'vulnerability'" class="tab-content ops-page-layout">
        <!-- 筛选栏 -->
        <div class="ops-filter-bar">
          <el-form :model="vulnFilters" inline size="small">
            <el-form-item label="关键词" label-width="60">
              <el-input
                v-model="vulnFilters.filter"
                placeholder="输入主机IP/补丁编号/CVE/软件包"
                style="width: 230px"
                clearable
              />
            </el-form-item>
            <el-form-item label="严重程度" label-width="70">
              <el-select v-model="vulnFilters.severity" style="width: 80px">
                <el-option label="所有" value="all" />
                <el-option label="严重" value="Critical" />
                <el-option label="重要" value="Important" />
                <el-option label="中等" value="Moderate" />
                <el-option label="低" value="Low" />
              </el-select>
            </el-form-item>
            <el-form-item label="补丁状态" label-width="70">
              <el-select v-model="vulnFilters.patch_status" style="width: 110px">
                <el-option label="所有" value="all" />
                <el-option label="未修复" value="no_repair" />
                <el-option label="已修复" value="is_repair" />
                <el-option label="已修复(手动)" value="is_repair_artificial" />
                <el-option label="修复中" value="repairing" />
                <el-option label="修复失败" value="repair_faild" />
                <el-option label="回滚中" value="rolling_back" />
                <el-option label="回滚失败" value="rolling_back_faild" />
                <el-option label="回滚成功" value="rolling_back_success" />
              </el-select>
            </el-form-item>
            <el-form-item label="内核漏洞" label-width="70">
              <el-select v-model="vulnFilters.is_kernel" style="width: 80px">
                <el-option label="所有" value="all" />
                <el-option label="是" value="is_kernel" />
                <el-option label="否" value="no_kernel" />
              </el-select>
            </el-form-item>
            <el-form-item label="操作系统" label-width="70">
              <el-select v-model="vulnFilters.os_distro" style="width: 80px">
                <el-option label="所有" value="all" />
                <el-option v-for="item in osDistroList" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
            <el-form-item label="系统版本" label-width="70" style="margin-right: 16px">
              <el-select v-model="vulnFilters.os_major_version" style="width: 80px">
                <el-option label="所有" value="all" />
                <el-option v-for="item in osVersionList" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
            <el-form-item style="margin-right: 0">
              <el-button type="primary" :loading="vulnLoading" @click="handleVulnFilterChange">
                <el-icon>
                  <Search />
                </el-icon>
                搜索
              </el-button>
              <el-button @click="handleVulnReset">
                <el-icon>
                  <RefreshRight />
                </el-icon>
                重置
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 操作栏 -->
        <div class="ops-action-bar">
          <el-button
            type="primary"
            size="small"
            :disabled="selectedVulns.length === 0"
            @click="handleFixSelected"
          >
            <i class="fa fa-tools" />
            修复选定的漏洞
          </el-button>
          <!-- <el-button size="small" @click="handleVulnExport">
            <i class="fa fa-download" /> 导出
          </el-button> -->
          <span style="flex: 1"></span>
          <el-button
            class="toolbar-icon-btn"
            circle
            size="small"
            :loading="vulnLoading"
            @click="loadVulnData"
            title="刷新"
          >
            <el-icon v-show="!vulnLoading">
              <Refresh />
            </el-icon>
          </el-button>
        </div>

        <!-- 表格 -->
        <div class="ops-table-wrapper">
          <el-table
            ref="vulnTableRef"
            v-loading="vulnLoading"
            :data="vulnTableData"
            style="width: 100%"
            max-height="calc(100vh - 620px)"
            @selection-change="handleVulnSelectionChange"
          >
            <el-table-column type="selection" width="45" />
            <el-table-column prop="host_key" label="主机" width="130">
              <template #default="{ row }">
                <a href="javascript:void(0)" class="host-link" @click="handleHostClick(row)">
                  {{ row.host_key }}
                </a>
              </template>
            </el-table-column>
            <el-table-column prop="os_distro" label="操作系统" width="90" />
            <el-table-column prop="os_major_version" label="系统版本" width="90" />
            <el-table-column prop="patch_id" label="补丁编号" min-width="150" show-overflow-tooltip>
              <template #default="{ row }">
                <a href="javascript:void(0)" class="patch-link" @click="handlePatchClick(row)">
                  {{ row.patch_id }}
                </a>
              </template>
            </el-table-column>
            <el-table-column
              prop="affected_pkgs"
              label="影响的软件包"
              min-width="180"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                <div class="pkg-list">{{ row.affected_pkgs }}</div>
              </template>
            </el-table-column>
            <el-table-column prop="vul_id" label="CVE" width="150">
              <template #default="{ row }">
                <a
                  :href="`https://access.redhat.com/security/cve/${row.vul_id}`"
                  target="_blank"
                  class="cve-badge"
                >
                  {{ row.vul_id }}
                </a>
              </template>
            </el-table-column>
            <el-table-column prop="severity" label="严重程度" width="100">
              <template #default="{ row }">
                <el-tag
                  effect="dark"
                  class="severity-tag"
                  :class="'is-' + (row.severity || '').toLowerCase()"
                >
                  {{ getSeverityLabel(row.severity) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="reboot_status" label="重启要求" width="100">
              <template #default="{ row }">
                <el-tag
                  v-if="row.reboot_status"
                  :type="row.reboot_status === '系统重启' ? 'danger' : 'warning'"
                  size="small"
                  round
                >
                  <i
                    :class="row.reboot_status === '系统重启' ? 'fa fa-power-off' : 'fa fa-server'"
                    style="margin-right: 4px"
                  />
                  {{ row.reboot_status === '系统重启' ? '系统' : '服务' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="is_kernel" label="内核" width="70">
              <template #default="{ row }">
                <el-tag :type="row.is_kernel === '是' ? 'primary' : 'info'" size="small" round>
                  <i :class="row.is_kernel === '是' ? 'fa fa-check' : 'fa fa-times'" />
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="patch_status" label="状态" width="110">
              <template #default="{ row }">
                <el-tag
                  :type="getPatchStatusType(row.patch_status)"
                  size="small"
                  round
                  :class="{ 'clickable-status': row.run_id }"
                  @click="row.run_id && handleViewRunResult(row)"
                >
                  <i :class="getPatchStatusIcon(row.patch_status)" style="margin-right: 4px" />
                  {{ row.patch_status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="scan_date" label="扫描时间" width="110">
              <template #default="{ row }">
                {{ formatDate(row.scan_date) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80" fixed="right">
              <template #default="{ row }">
                <el-button
                  text
                  type="primary"
                  size="small"
                  :disabled="row.patch_status !== '已修复' && row.patch_status !== '回滚失败'"
                  @click="handleRollback(row)"
                >
                  回滚
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 分页 -->
        <div class="ops-pagination-wrapper">
          <el-pagination
            v-model:current-page="vulnPagination.page"
            v-model:page-size="vulnPagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="vulnPagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @size-change="handleVulnSizeChange"
            @current-change="handleVulnPageChange"
          />
        </div>
      </div>
    </div>

    <!-- 重新扫描对话框 -->
    <el-dialog v-model="rescanDialogVisible" title="重新扫描补丁" width="600px">
      <el-form ref="rescanFormRef" :model="rescanForm" label-width="100px">
        <el-form-item label="选择主机">
          <AcmDeviceSelector
            v-model="selectedHosts"
            ci-types="[auto]"
            :options="{
              selectMode: 'host,group,tag,input,recently',
              selector: 'multiple',
              label: '选择主机'
            }"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rescanDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="rescanLoading"
          :disabled="selectedHosts.length === 0"
          @click="executeRescan"
        >
          开始扫描
        </el-button>
      </template>
    </el-dialog>

    <!-- 作业运行结果对话框 -->
    <ExecuteResultDialog
      v-if="runResultDialogVisible"
      v-model:visible="runResultDialogVisible"
      :run-id="runResultRunId"
    />

    <!-- 操作记录对话框 -->
    <OperationLogsDialog v-model="operationLogsVisible" :highlight-run-id="lastSubmittedRunId" />

    <!-- 主机详情对话框 -->
    <LinuxHostDetail
      v-model="hostDetailVisible"
      :host-info="selectedHostInfo"
      @fix-patches="handleFixPatchesFromDetail"
    />

    <!-- 修复漏洞确认对话框 -->
    <el-dialog v-model="fixDialogVisible" title="修复选定的漏洞" width="700px" destroy-on-close>
      <div v-loading="fixDialogLoading" class="fix-dialog-content">
        <div class="fix-info-card">
          <div class="fix-info-header">
            <i class="fa fa-desktop text-muted" />
            待更新的主机
          </div>
          <div class="fix-info-body" v-html="fixDialogData.hosts || '-'"></div>
        </div>
        <div class="fix-info-card">
          <div class="fix-info-header">
            <i class="fa fa-briefcase-medical text-muted" />
            待更新的补丁
          </div>
          <div class="fix-info-body" v-html="fixDialogData.patches || '-'"></div>
        </div>
        <div class="fix-info-card">
          <div class="fix-info-header">
            <i class="fa fa-suitcase text-muted" />
            待更新的 CVE
          </div>
          <div class="fix-info-body" v-html="fixDialogData.cves || '-'"></div>
        </div>
        <div class="fix-info-card">
          <div class="fix-info-header">
            <i class="fa fa-cube text-muted" />
            待更新的软件包
          </div>
          <div class="fix-info-body" v-html="fixDialogData.packages || '-'"></div>
        </div>
      </div>
      <template #footer>
        <el-button @click="fixDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="fixSubmitting"
          :disabled="!fixDialogData.hosts"
          @click="handleConfirmFix"
        >
          <i class="fa fa-chevron-right" />
          开始更新
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, provide } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Refresh, Search, RefreshRight } from '@element-plus/icons-vue'
import { patchScanApi, patchOverviewApi, vulnerabilityApi } from '../api'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import OperationLogsDialog from './dialogs/OperationLogsDialog.vue'
import LinuxHostDetail from './LinuxHostDetail.vue'

// ECharts
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart, GaugeChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import VChart from 'vue-echarts'

use([
  CanvasRenderer,
  PieChart,
  GaugeChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

// Emits
const emit = defineEmits(['install', 'navigate'])

// Router
const router = useRouter()

// 当前标签页
const activeTab = ref('host')

// KPI 数据统计
const kpiStats = reactive({
  criticalPatchCount: 0,
  importantPatchCount: 0,
  totalPatchCount: 0,
  criticalPatchPercent: 0,
  importantPatchPercent: 0,

  vulCount: 0,
  hostCount: 0,
  avgVulPerHost: 0,

  criticalHostCount: 0,
  importantHostCount: 0,
  criticalHostPercent: 0,
  importantHostPercent: 0
})

// 图表配置 - 补丁统计半环图
const chartOption = computed(() => {
  return {
    tooltip: {
      trigger: 'item'
    },
    series: [
      {
        name: '补丁统计',
        type: 'pie',
        radius: ['60%', '80%'],
        center: ['50%', '70%'],
        // 调整起始角度，使其变成半圆
        startAngle: 180,
        endAngle: 0,
        data: [
          { value: kpiStats.criticalPatchCount, name: '严重', itemStyle: { color: '#F53F3F' } },
          { value: kpiStats.importantPatchCount, name: '重要', itemStyle: { color: '#FF7D00' } }
        ],
        label: {
          show: false
        },
        emphasis: {
          scale: true,
          scaleSize: 5
        }
      }
    ]
  }
})

// 主机表格
const loading = ref(false)
const filterText = ref('')
const hostTableData = ref([])
const hostFilters = reactive({
  keyword: ''
})
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

// 漏洞筛选器
const vulnFilters = reactive({
  filter: '',
  severity: 'all',
  patch_status: 'all',
  is_kernel: 'all',
  os_distro: 'all',
  os_major_version: 'all',
  reboot_status: 'all'
})

// 操作系统列表
const osDistroList = ref([])
const osVersionList = ref([])

// 漏洞表格选择
const vulnTableRef = ref(null)
const selectedVulns = ref([])

// 重新扫描对话框
const rescanDialogVisible = ref(false)
const rescanLoading = ref(false)
const rescanFormRef = ref(null)
const rescanForm = reactive({
  hostsInput: ''
})
const hostSelectorVisible = ref(false)
const selectedHosts = ref([])

// 作业运行结果对话框
const runResultDialogVisible = ref(false)
const runResultRunId = ref('')

// 操作记录对话框
const operationLogsVisible = ref(false)
const lastSubmittedRunId = ref('')

// 主机详情对话框
const hostDetailVisible = ref(false)
const selectedHostInfo = ref({})

// 修复漏洞对话框
const fixDialogVisible = ref(false)
const fixSubmitting = ref(false)
const fixDialogData = reactive({
  hosts: '',
  patches: '',
  cves: '',
  packages: '',
  patchStatusIds: []
})

// 获取严重程度显示标签
function getSeverityLabel(severity) {
  const map = {
    Critical: '严重',
    Important: '重要',
    Moderate: '中等',
    Low: '低级'
  }
  return map[severity] || severity
}

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
      // 临时映射表
      const dataMap = {
        scan_count_critical_patch: 0,
        scan_count_important_patch: 0,
        scan_count_vul: 0,
        scan_count_host_with_critical: 0,
        scan_count_host_with_important: 0,
        scan_count_host: 0
      }

      response.data.records.forEach(rec => {
        if (dataMap.hasOwnProperty(rec.name)) {
          dataMap[rec.name] = rec.value || 0
        }
      })

      // 1. 补丁统计
      kpiStats.criticalPatchCount = dataMap.scan_count_critical_patch
      kpiStats.importantPatchCount = dataMap.scan_count_important_patch
      kpiStats.totalPatchCount = kpiStats.criticalPatchCount + kpiStats.importantPatchCount

      if (kpiStats.totalPatchCount > 0) {
        kpiStats.criticalPatchPercent = Number(
          ((kpiStats.criticalPatchCount / kpiStats.totalPatchCount) * 100).toFixed(1)
        )
        kpiStats.importantPatchPercent = Number(
          ((kpiStats.importantPatchCount / kpiStats.totalPatchCount) * 100).toFixed(1)
        )
      } else {
        kpiStats.criticalPatchPercent = 0
        kpiStats.importantPatchPercent = 0
      }

      // 2. 漏洞概览
      kpiStats.vulCount = dataMap.scan_count_vul
      kpiStats.hostCount = dataMap.scan_count_host
      if (kpiStats.hostCount > 0) {
        kpiStats.avgVulPerHost = Math.round(kpiStats.vulCount / kpiStats.hostCount)
      } else {
        kpiStats.avgVulPerHost = 0
      }

      // 3. 主机影响
      kpiStats.criticalHostCount = dataMap.scan_count_host_with_critical
      kpiStats.importantHostCount = dataMap.scan_count_host_with_important

      if (kpiStats.hostCount > 0) {
        kpiStats.criticalHostPercent = Math.round(
          (kpiStats.criticalHostCount / kpiStats.hostCount) * 100
        )
        kpiStats.importantHostPercent = Math.round(
          (kpiStats.importantHostCount / kpiStats.hostCount) * 100
        )
      } else {
        kpiStats.criticalHostPercent = 0
        kpiStats.importantHostPercent = 0
      }
    }
  } catch (error) {
    console.error('Failed to load KPI data:', error)
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
    hostTableData.value = []
    pagination.total = 0
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
      filter: vulnFilterText.value,
      host_key: vulnFilters.host_key || '',
      vul_id: vulnFilters.vul_id || null,
      severity: vulnFilters.severity,
      patch_status: vulnFilters.patch_status,
      is_kernel: vulnFilters.is_kernel,
      os_distro: vulnFilters.os_distro,
      os_major_version: vulnFilters.os_major_version,
      reboot_status: vulnFilters.reboot_status,
      filter: vulnFilters.filter || ''
    }
    const response = await vulnerabilityApi.getVulnerabilityList(params)
    if (response?.data) {
      vulnTableData.value = response.data.records || []
      vulnPagination.total = response.data.total || 0
    }
  } catch (error) {
    console.error('Failed to load vulnerability data:', error)
    vulnTableData.value = []
    vulnPagination.total = 0
  } finally {
    vulnLoading.value = false
  }
}

// 加载操作系统列表
async function loadOsLists() {
  try {
    const [osDistroRes, osVersionRes] = await Promise.all([
      vulnerabilityApi.getOsDistroList(),
      vulnerabilityApi.getOsVersionList()
    ])
    if (osDistroRes?.data?.records) {
      osDistroList.value = osDistroRes.data.records.map(item => item.os_distro)
    }
    if (osVersionRes?.data?.records) {
      osVersionList.value = osVersionRes.data.records.map(item => item.os_major_version)
    }
  } catch (error) {
    console.error('Failed to load OS lists:', error)
  }
}

// 事件处理
function handleFilter() {
  pagination.page = 1
  loadHostData()
}

function handleHostReset() {
  filterText.value = ''
  pagination.page = 1
  pagination.pageSize = 20
  loadHostData()
}

function handleVulnFilter() {
  vulnPagination.page = 1
  loadVulnData()
}

function handleVulnReset() {
  vulnFilters.severity = 'all'
  vulnFilters.patch_status = 'all'
  vulnFilters.is_kernel = 'all'
  vulnFilters.os_distro = 'all'
  vulnFilters.os_major_version = 'all'
  vulnFilters.filter = ''
  vulnPagination.page = 1
  vulnPagination.pageSize = 20
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
  // 打开主机详情对话框
  selectedHostInfo.value = {
    host_key: row.host_key,
    host_id: row.host_id,
    os_distro: row.os_distro,
    os_version: row.os_version,
    hostname: row.hostname
  }
  hostDetailVisible.value = true
}

function handleVulnClick(row) {
  // 导航到漏洞详情
  ElMessage.info(`查看漏洞详情: ${row.advisory}`)
}

function handleVulnFilterChange() {
  vulnPagination.page = 1
  loadVulnData()
}

function handleVulnExport() {
  ElMessage.info('导出功能开发中...')
}

function handlePatchClick(row) {
  ElMessage.info(`查看补丁详情: ${row.patch_id}`)
}

function handleRollback(row) {
  ElMessage.info(`回滚补丁: ${row.id}`)
}

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 获取严重程度类型
function getSeverityType(severity) {
  const typeMap = {
    Critical: 'danger',
    Important: 'warning',
    Moderate: '',
    Low: 'info'
  }
  return typeMap[severity] || 'info'
}

// 获取补丁状态类型
function getPatchStatusType(status) {
  const typeMap = {
    未修复: 'info',
    已修复: 'success',
    '已修复(手动)': 'success',
    修复中: '',
    修复失败: 'warning',
    回滚中: '',
    回滚失败: 'warning',
    回滚成功: 'info'
  }
  return typeMap[status] || 'info'
}

// 获取补丁状态图标
function getPatchStatusIcon(status) {
  const iconMap = {
    未修复: 'fa fa-times',
    已修复: 'fa fa-check',
    '已修复(手动)': 'fa fa-check',
    修复中: 'fa fa-cog fa-spin',
    修复失败: 'fa fa-exclamation-triangle',
    回滚中: 'fa fa-cog fa-spin',
    回滚失败: 'fa fa-exclamation-triangle',
    回滚成功: 'fa fa-check'
  }
  return iconMap[status] || 'fa fa-circle'
}

function handleExport() {
  ElMessage.info('导出功能开发中...')
}

// 查看作业运行结果
function handleViewRunResult(row) {
  if (!row.run_id) return
  runResultRunId.value = row.run_id
  runResultDialogVisible.value = true
}

// 漏洞选择变化
function handleVulnSelectionChange(selection) {
  selectedVulns.value = selection
}

// 修复选定的漏洞
async function handleFixSelected() {
  if (selectedVulns.value.length === 0) {
    ElMessage.warning('请先选择要修复的漏洞')
    return
  }

  const ids = selectedVulns.value.map(item => item.id)
  fixDialogData.patchStatusIds = ids
  fixDialogData.hosts = ''
  fixDialogData.patches = ''
  fixDialogData.cves = ''
  fixDialogData.packages = ''
  fixDialogVisible.value = true
  fixDialogLoading.value = true

  try {
    // 并行获取所有信息
    const [hostsRes, patchesRes, cvesRes, pkgsRes] = await Promise.all([
      vulnerabilityApi.getPatchStatusHosts(ids),
      vulnerabilityApi.getPatchStatusPatches(ids),
      vulnerabilityApi.getPatchStatusCves(ids),
      vulnerabilityApi.getPatchStatusPackages(ids)
    ])

    // 处理主机列表
    if (hostsRes?.data?.records) {
      fixDialogData.hosts = hostsRes.data.records.map(r => r.host_key).join('<br>')
    }

    // 处理补丁列表（去重）
    if (patchesRes?.data?.records) {
      const patches = [...new Set(patchesRes.data.records.map(r => r.patch_id))]
      fixDialogData.patches = patches.join('<br>')
    }

    // 处理 CVE 列表
    if (cvesRes?.data?.records) {
      fixDialogData.cves = cvesRes.data.records.map(r => r.vul_id).join('<br>')
    }

    // 处理软件包列表（去重）
    if (pkgsRes?.data?.records) {
      const allPkgs = pkgsRes.data.records.flatMap(r => (r.affected_pkgs || '').split(','))
      const uniquePkgs = [...new Set(allPkgs.filter(p => p.trim()))]
      fixDialogData.packages = uniquePkgs.join('<br>')
    }
  } catch (error) {
    ElMessage.error('获取补丁信息失败: ' + (error.message || '未知错误'))
  } finally {
    fixDialogLoading.value = false
  }
}

// 确认开始修复
async function handleConfirmFix() {
  if (!fixDialogData.patchStatusIds.length) return

  fixSubmitting.value = true
  try {
    // 调用作业执行 API
    const { executeJob } = await import('@/modules/automation/api/jao')
    await executeJob({
      jobId: 's1r8Hp',
      params: {
        patchStatusIds: fixDialogData.patchStatusIds
      }
    })
    ElMessage.success('修复任务已提交')
    fixDialogVisible.value = false
    // 刷新数据
    loadVulnData()
  } catch (error) {
    ElMessage.error('提交修复任务失败: ' + (error.message || '未知错误'))
    // 从主机详情对话框修复补丁
    function handleFixPatchesFromDetail(data) {
      const { patches, hostInfo } = data
      ElMessage.info(`准备修复 ${patches.length} 个补丁`)
      // TODO: 实现补丁修复逻辑
      hostDetailVisible.value = false
    }
  } finally {
    fixSubmitting.value = false
  }
}

function handleRescan() {
  rescanForm.hostsInput = ''
  selectedHosts.value = []
  rescanDialogVisible.value = true
}

function handleHostSelected(hosts) {
  selectedHosts.value = hosts
  updateHostsInput()
}

// 移除单个已选主机
function removeSelectedHost(index) {
  selectedHosts.value.splice(index, 1)
  updateHostsInput()
}

// 更新主机输入框内容
function updateHostsInput() {
  // 从选中的主机中提取主机名
  const hostList = selectedHosts.value
    .map(h => {
      if (typeof h === 'object') {
        return h.value || h.hostname || h.name || h.host_key || ''
      }
      return String(h)
    })
    .filter(Boolean)
  rescanForm.hostsInput = hostList.join('\n')
}

async function executeRescan() {
  // 先更新主机输入框（处理通过选择器选择的主机）
  if (selectedHosts.value.length > 0) {
    updateHostsInput()
  }

  // 准备主机参数
  let hosts = []
  if (selectedHosts.value.length > 0) {
    // 从选择器选择的主机
    hosts = selectedHosts.value.map(h => {
      if (typeof h === 'object') {
        return {
          key: h.key || h.id || '',
          value: h.value || h.hostname || h.name || h.host_key || '',
          assetType: h.assetType || 'linux'
        }
      }
      return {
        key: '',
        value: String(h),
        assetType: 'linux'
      }
    })
  } else {
    // 从输入框输入的主机
    const hostLines = rescanForm.hostsInput.split('\n').filter(line => line.trim())
    if (hostLines.length === 0) {
      ElMessage.warning('请输入或选择至少一个主机')
      return
    }
    hosts = hostLines.map(line => ({
      key: '',
      value: line.trim(),
      assetType: 'linux'
    }))
  }

  if (hosts.length === 0) {
    ElMessage.warning('请输入或选择至少一个主机')
    return
  }

  rescanLoading.value = true
  try {
    // 调用作业执行API
    const { executeJob } = await import('@/modules/automation/api/jao')
    const jobId = '0g3GfW' // 补丁扫描作业ID
    const response = await executeJob({
      jobId,
      params: { hosts }
    })

    // 获取runId
    const runId = response?.data?.[0]?.runId || response?.[0]?.runId
    if (runId) {
      ElMessage.success('扫描任务已提交')
      rescanDialogVisible.value = false

      // 打开操作记录对话框
      lastSubmittedRunId.value = runId
      operationLogsVisible.value = true

      // 刷新数据
      setTimeout(() => {
        loadKpiData()
        loadHostData()
      }, 2000)
    } else {
      ElMessage.error('扫描任务提交失败：未返回运行ID')
    }
  } catch (error) {
    console.error('Scan failed:', error)
    ElMessage.error('扫描任务提交失败: ' + (error.message || '未知错误'))
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
watch(activeTab, newTab => {
  if (newTab === 'vulnerability' && vulnTableData.value.length === 0) {
    loadVulnData()
  }
})

// 监听主机选择变化，自动更新输入框
watch(
  selectedHosts,
  () => {
    updateHostsInput()
  },
  { deep: true }
)

onMounted(() => {
  loadKpiData()
  loadHostData()
  loadOsLists()
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
  background: #fff;
}

.page-header {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 0 16px 8px 0;
  background: #fff;
  //border-bottom: 1px solid #e9ecef;

  &__actions {
    display: flex;
    gap: 8px;
  }
}

.page-content {
  flex: 1;
  // padding: 0 16px;
  overflow-y: auto;
  background: #fff;
}

// 统计面板
.stats-dashboard {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  padding: 16px;
  display: flex;
  flex-direction: column;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  border: 1px solid #e9ecef;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    border-color: #dcdfe6;
  }

  .card-title {
    font-size: 14px;
    font-weight: 600;
    color: #495057;
    margin-bottom: 12px;
  }
}

// 1. 补丁统计卡片
.patch-card {
  flex: 4; // 40% width
  display: flex;
  flex-direction: column;
  min-height: 180px;

  .patch-chart-container {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 8px;

    .chart-wrapper {
      position: relative;
      width: 200px;
      height: 100px; // 半圆高度
    }

    .patch-pie-chart {
      width: 100%;
      height: 200px; // 实际渲染高度给大一点，通过 overflow 和 clip 控制半圆效果，或者 echoarts 本身设置
      margin-top: -50px; // 调整位置
    }

    .chart-center-label {
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      text-align: center;

      .label-title {
        font-size: 12px;
        color: #868e96;
      }
      .label-value {
        font-size: 24px;
        font-weight: 700;
        color: #212529;
        line-height: 1.2;
      }
    }
  }

  .patch-progress-section {
    padding: 0 16px;

    .progress-bar-container {
      height: 12px;
      background-color: #f1f3f5;
      border-radius: 6px;
      display: flex;
      overflow: hidden;
      margin-bottom: 8px;

      .progress-segment {
        height: 100%;
        transition: width 0.5s ease;

        &.critical {
          background-color: #f53f3f;
        }
        &.important {
          background-color: #ff7d00;
        }
      }
    }

    .progress-labels {
      display: flex;
      justify-content: space-between;
      font-size: 12px;

      .stat-label {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #495057;

        &.critical i {
          color: #f53f3f;
          font-size: 8px;
        }
        &.important i {
          color: #ff7d00;
          font-size: 8px;
        }

        .count {
          color: #868e96;
          margin-left: 2px;
        }
      }
    }
  }
}

// 2. 漏洞概览卡片
.vul-card {
  flex: 3; // 30% width
  position: relative;
  overflow: hidden;

  .vul-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 1;
  }

  .vul-number {
    font-size: 42px;
    font-weight: 700;
    color: #409eff; // OpsMind Blue
    line-height: 1;
    margin-bottom: 8px;
  }

  .vul-label {
    font-size: 13px;
    color: #495057;
    margin-bottom: 12px;
  }

  .vul-sub-metric {
    font-size: 12px;
    color: #868e96;
    background: #f8f9fa;
    padding: 4px 12px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 6px;

    i {
      color: #adb5bd;
    }
  }

  .vul-icon-bg {
    position: absolute;
    right: -20px;
    bottom: -20px;
    font-size: 120px;
    color: rgba(64, 158, 255, 0.05);
    z-index: 0;
    transform: rotate(-15deg);
  }
}

// 3. 主机影响卡片
.host-card {
  flex: 3; // 30% width

  .host-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
    flex: 1;
    justify-content: center;
  }

  .host-total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;

    .label {
      font-size: 13px;
      color: #495057;
    }
    .value {
      font-size: 16px;
      font-weight: 600;
      color: #212529;
    }
  }

  .impact-item {
    .impact-header {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 6px;

      .label-critical {
        color: #f53f3f;
        font-weight: 500;
      }
      .label-important {
        color: #ff7d00;
        font-weight: 500;
      }
      .value {
        color: #868e96;
      }
    }

    .progress-track {
      height: 8px;
      background: #f1f3f5;
      border-radius: 4px;
      overflow: hidden;

      .progress-fill {
        height: 100%;
        border-radius: 4px;

        &.critical {
          background: #f53f3f;
        }
        &.important {
          background: #ff7d00;
        }
      }
    }
  }
}

// 响应式调整
@media (max-width: 1200px) {
  .stats-dashboard {
    flex-wrap: wrap;
  }
  .patch-card {
    flex: 100%;
    order: 1;
  }
  .vul-card {
    flex: 48%;
    order: 2;
  }
  .host-card {
    flex: 48%;
    order: 3;
  }
}

// 导航标签 - 简洁样式
.nav-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 16px;
  border-bottom: 1px solid #dee2e6;
  background: transparent;
}

.nav-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 14px;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  background: transparent;

  &:hover {
    color: #0d6efd;
  }

  &--active {
    color: #0d6efd;
    font-weight: 500;
    border-bottom-color: #0d6efd;
  }

  i {
    font-size: 14px;
  }
}

// 标签内容
.tab-content {
  display: flex;
  flex-direction: column;
  padding: 0 !important;
  height: calc(100% - 300px);
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

.table-toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid #e9ecef;
}

// 主机链接样式
.host-link {
  color: #409eff;
  text-decoration: none;
  cursor: pointer;
  user-select: text;

  &:hover {
    color: #66b1ff;
    text-decoration: underline;
  }
}

// 补丁链接样式
.patch-link {
  color: #6c757d;
  text-decoration: none;
  cursor: pointer;
  user-select: text;

  &:hover {
    color: #495057;
    text-decoration: underline;
  }
}

// CVE 徽章样式
.cve-badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 12px;
  background: #6c757d;
  color: #fff;
  border-radius: 4px;
  text-decoration: none;

  &:hover {
    background: #495057;
    color: #fff;
  }
}

// 筛选器栏
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 4px;

  label {
    font-size: 12px;
    color: #6c757d;
  }
}

.filter-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

// 软件包列表
.pkg-list {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

// 可点击的状态标签
.clickable-status {
  cursor: pointer;

  &:hover {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

// 修复漏洞对话框
.fix-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 200px;
}

.fix-info-card {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  overflow: hidden;
}

.fix-info-header {
  padding: 8px 12px;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
  font-weight: 500;
  font-size: 14px;
  color: #303133;

  i {
    margin-right: 8px;
  }
}

.fix-info-body {
  padding: 12px;
  max-height: 150px;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.8;
  color: #606266;
}

// 文字颜色 - Element UI 色值
// 严重 - 红色 (Critical - Red)
.text-danger {
  color: #f53f3f;
}

// 重要 - 橙色 (Important - Orange)
.text-warning {
  color: #ff7d00;
}

// 中等 - 金色
.text-dark {
  color: #ffc72e;
}

// 低 - 蓝色 (primary)
.text-info {
  color: #165dff;
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

// 主机选择器区域
.host-selector-area {
  width: 100%;
}

.host-selector-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;

  .host-count {
    font-size: 13px;
    color: #606266;

    strong {
      color: #409eff;
    }
  }
}

.host-tags-area {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 150px;
  overflow-y: auto;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.empty-host-tip {
  padding: 24px;
  text-align: center;
  color: #909399;
  background: #f5f7fa;
  border-radius: 4px;
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

.ops-filter-bar {
  :deep(.el-form-item) {
    margin-right: 24px !important;
  }
}
</style>
