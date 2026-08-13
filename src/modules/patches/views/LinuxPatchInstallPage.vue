<template>
  <div class="ops-page-layout ops-page-layout--page-scroll linux-patch-install-page">
    <!-- 顶部 Tab 导航 -->
    <div class="nav-tabs">
      <div
        class="nav-tab"
        :class="{ 'nav-tab--active': activeTab === 'host' }"
        @click="handleTabChange('host')"
      >
        <i class="fa fa-laptop" style="margin-right: 6px" />
        按主机安装
      </div>
      <div
        class="nav-tab"
        :class="{ 'nav-tab--active': activeTab === 'patch' }"
        @click="handleTabChange('patch')"
      >
        <i class="fa fa-download" style="margin-right: 6px" />
        按补丁安装
      </div>
    </div>

    <!-- 按主机安装 Tab 内容 -->
    <div v-if="activeTab === 'host'" class="tab-content">
      <!-- 主机筛选栏 -->
      <div class="ops-filter-bar">
        <el-form :model="hostFilters" inline size="small">
          <el-form-item label="操作系统">
            <el-select
              v-model="hostFilters.os_distro"
              placeholder="全部"
              clearable
              filterable
              allow-create
              default-first-option
              style="width: 180px" @change="handleHostFilter">
              <el-option v-for="item in osDistroList" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
          <el-form-item label="系统版本">
            <el-select
              v-model="hostVersionFilter"
              placeholder="全部"
              clearable
              filterable
              allow-create
              default-first-option
              style="width: 180px"
              @change="handleHostVersionChange"
            >
              <el-option
                v-for="item in hostOsVersionOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="标签">
            <el-select
              v-model="hostFilters.tags"
              placeholder="全部标签"
              multiple
              collapse-tags
              collapse-tags-tooltip
              clearable
              filterable
              :loading="hostTagLoading"
              style="width: 180px" @change="handleHostFilter">
              <el-option v-for="tag in hostTagOptions" :key="tag" :label="tag" :value="tag" />
            </el-select>
          </el-form-item>
          <el-form-item label="关键词">
            <el-input
              v-model="hostFilters.keyword"
              placeholder="主机名 / IP / 资产 ID"
              style="width: 220px"
              clearable @keyup.enter="handleHostFilter" @clear="handleHostFilter">
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="hostLoading" @click="handleHostFilter">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="handleHostReset">
              <el-icon><RefreshRight /></el-icon>
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 操作栏 -->
      <div class="ops-action-bar">
        <el-button
          type="primary"
          plain
          size="small"
          :disabled="batchSelectedHosts.length === 0"
          @click="handleOpenBatchInstallDrawer"
        >
          <i class="fa fa-chevron-circle-right" />
          安装选中主机补丁 ({{ batchSelectedHosts.length }})
        </el-button>
        <el-button
          type="primary"
          plain
          size="small"
          :disabled="batchSelectedHosts.length === 0"
          :loading="rescanLoading"
          @click="handleRescan"
        >
          <i class="fa fa-bug" />
          重新扫描补丁 ({{ batchSelectedHosts.length }})
        </el-button>
        <el-button
          size="small"
          :type="hostAllSelected ? 'default' : 'primary'"
          @click="handleToggleHostSelectAll"
          plain
        >
          <i :class="`fa fa-${hostAllSelected ? 'times' : 'check-double'} me-1`" />
          {{ hostAllSelected ? '一键取消' : '一键全选' }}
        </el-button>
        <span style="flex: 1"></span>
        <el-button
          class="toolbar-icon-btn"
          circle
          size="small"
          :loading="hostLoading"
          @click="loadHostData"
          title="刷新"
        >
          <el-icon v-show="!hostLoading"><Refresh /></el-icon>
        </el-button>
      </div>

      <!-- 主机表格 -->
      <div class="ops-table-wrapper">
        <el-table
          ref="hostTableRef"
          v-loading="hostLoading"
          :data="hostTableData"
          class="natural-height-table"
          style="width: 100%"
          @select="handleHostTableSelect"
          @select-all="handleHostTableSelect"
        >
          <el-table-column type="selection" width="45" />
          <el-table-column prop="host_key" label="主机" width="140">
            <template #default="{ row }">
              <el-link type="primary" underline="never" @click="handleHostClick(row)">
                {{ row.host_key }}
              </el-link>
            </template>
          </el-table-column>
          <el-table-column prop="num_critical" width="80">
            <template #header>
              严重
              <i class="fa fa-circle text-danger" />
            </template>
            <template #default="{ row }">
              <span class="severity-count">{{ row.num_critical }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="num_important" width="80">
            <template #header>
              重要
              <i class="fa fa-circle text-warning" />
            </template>
            <template #default="{ row }">
              <span class="severity-count">{{ row.num_important }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="num_moderate" width="80">
            <template #header>
              中等
              <i class="fa fa-circle text-dark" />
            </template>
            <template #default="{ row }">
              <span class="severity-count">{{ row.num_moderate }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="num_low" width="80">
            <template #header>
              低
              <i class="fa fa-circle text-info" />
            </template>
            <template #default="{ row }">
              <span class="severity-count">{{ row.num_low }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="hostname" label="主机名" min-width="120" show-overflow-tooltip />
          <el-table-column prop="tags" label="标签" min-width="140">
            <template #default="{ row }">
              <div v-if="Array.isArray(row.tags) && row.tags.length" class="host-list-tags">
                <el-tag
                  v-for="(tag, index) in row.tags"
                  :key="`${tag}-${index}`"
                  size="small"
                  effect="plain"
                >
                  {{ tag }}
                </el-tag>
              </div>
              <span v-else class="text-muted">-</span>
            </template>
          </el-table-column>
          <el-table-column label="系统版本" min-width="200">
            <template #default="{ row }">
              {{ row.os_distro }} {{ [row.os_version, row.os_sp_version].filter(Boolean).join(' ') || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="scan_timestamp" label="最后扫描时间" width="200" sortable>
            <template #default="{ row }">
              {{ formatDateTime(row.scan_timestamp) }}
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 主机分页 -->
      <div class="ops-pagination-wrapper">
        <el-pagination
          v-model:current-page="hostPagination.page"
          v-model:page-size="hostPagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="hostPagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleHostSizeChange"
          @current-change="handleHostPageChange"
        />
      </div>
    </div>

    <!-- 按补丁安装 Tab 内容 -->
    <!-- eslint-disable-next-line vue/no-v-else-if-without-v-else -->
    <div v-else-if="activeTab === 'patch'" class="tab-content">
      <!-- 补丁筛选区 -->
      <div class="ops-filter-bar">
        <el-form :model="filters" inline size="small">
          <el-form-item label="严重程度">
            <el-select
              v-model="filters.severity"
              multiple
              placeholder="请选择"
              style="width: auto"
              @change="handleSearch"
            >
              <el-option label="严重" value="Critical" />
              <el-option label="重要" value="Important" />
              <el-option label="中等" value="Moderate" />
              <el-option label="低危" value="Low" />
            </el-select>
          </el-form-item>
          <el-form-item label="关键词">
            <el-input
              v-model="filters.keyword"
              placeholder="搜索补丁编号、概要、漏洞编号..."
              style="width: 240px"
              clearable
              @keyup.enter="handleSearch"
              @clear="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="loading" @click="handleSearch">
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

      <!-- 补丁操作区 -->
      <div class="ops-action-bar">
        <el-button
          type="primary"
          size="small"
          plain
          :disabled="selectedPatchIds.length === 0"
          @click="handleInstallSelected"
        >
          安装选中的补丁 ({{ selectedPatchIds.length }})
        </el-button>
        <el-button
          size="small"
          :type="allSelected ? 'default' : 'primary'"
          @click="handleToggleSelectAll"
          plain
        >
          <i :class="`fa fa-${allSelected ? 'times' : 'check-double'} me-1`" />
          {{ allSelected ? '一键取消' : '一键全选' }}
        </el-button>
        <span style="flex: 1"></span>
        <el-button
          class="toolbar-icon-btn"
          circle
          size="small"
          :loading="loading"
          @click="loadData"
          title="刷新"
        >
          <el-icon v-show="!loading"><Refresh /></el-icon>
        </el-button>
      </div>

      <!-- 补丁表格 -->
      <div class="ops-table-wrapper">
        <el-table
          ref="tableRef"
          v-loading="loading"
          :data="paginatedData"
          class="natural-height-table"
          @select="handleTableSelect"
          @select-all="handleTableSelect"
        >
          <el-table-column type="selection" width="50" />
          <el-table-column prop="patch_id" label="补丁编号" min-width="160" sortable>
            <template #default="{ row }">
              <el-link type="primary" underline="never" @click="handleViewPatchDetail(row)">
                {{ row.patch_id }}
              </el-link>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="概要" min-width="220" show-overflow-tooltip />
          <el-table-column prop="severity" label="严重性" width="100" sortable>
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
          <el-table-column prop="publish_date" label="发布时间" width="120" sortable>
            <template #default="{ row }">
              {{ formatDate(row.publish_date) }}
            </template>
          </el-table-column>
          <el-table-column prop="related_vuls" label="关联漏洞" min-width="320">
            <template #default="{ row }">
              <CveLinkList
                :cves="row.related_vuls"
                :url-resolver="cve => getCveUrl(cve, resolvePatchDistro(row))"
              />
            </template>
          </el-table-column>
          <el-table-column prop="effect_host_count" label="受影响的主机" width="130" align="left">
            <template #default="{ row }">
              <el-link type="primary" underline="never" @click="handleViewAffectedHosts(row)">
                {{ row.effect_host_count }}
              </el-link>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 补丁分页 -->
      <div class="ops-pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="totalCount"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- 作业运行结果对话框 -->
    <ExecuteResultDialog
      v-if="runResultDialogVisible"
      v-model:visible="runResultDialogVisible"
      :run-id="runResultRunId"
      @close="handleRunResultClose"
    />

    <!-- 操作记录对话框 -->
    <OperationLogsDialog v-model="operationLogsVisible" :highlight-run-id="lastSubmittedRunId" />

    <!-- 补丁详情对话框 -->
    <el-dialog
      v-model="patchDetailVisible"
      title="补丁详情"
      width="800px"
      :close-on-click-modal="false"
      class="patch-detail-dialog"
    >
      <PatchDetailContent
        :patch="patchDetail || {}"
        :loading="patchDetailLoading"
        :cve-source="resolvePatchDistro(patchDetail)"
      />
    </el-dialog>

    <!-- 批量安装补丁抽屉 -->
    <BatchInstallPatchDrawer
      v-model:visible="batchInstallDrawerVisible"
      :hosts="batchSelectedHosts"
      @success="handleBatchInstallSuccess"
    />

    <!-- 统一补丁向导组件 -->
    <PatchInstallWizard
      v-model:visible="installDialogVisible"
      :patches-to-install="patchesToInstall"
      @success="handleInstallSuccess"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Refresh, RefreshRight } from '@element-plus/icons-vue'
import { getCveUrl } from '../composables/useFormatters'
import { patchInstallApi, patchScanApi, vulnerabilityApi } from '../api'
import { dataManageApi, agentApi } from '@/modules/asset/api'
import { parseOsVersionFilter } from '../utils/linuxPatchScan'
import { formatDateTime } from '@/utils/date'
import PatchInstallWizard from '../components/patch-task/wizard/PatchInstallWizard.vue'
import BatchInstallPatchDrawer from '../components/host-detail/dialogs/BatchInstallPatchDrawer.vue'
import PatchDetailContent from '../components/common/PatchDetailContent.vue'
import CveLinkList from '../components/common/CveLinkList.vue'
import { useTableSelectAll } from '../composables/useTableSelectAll'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import OperationLogsDialog from '../components/logs/OperationLogsDialog.vue'
// [Agent 功能暂停] import {
// [Agent 功能暂停]   validateAgentCapability,
// [Agent 功能暂停]   getAgentCapabilityIssues,
// [Agent 功能暂停]   formatAgentCapabilityIssues,
// [Agent 功能暂停]   resolveAgentCapabilityHosts
// [Agent 功能暂停] } from '../utils/agentCapability'

// Router & Route
const route = useRoute()
const router = useRouter()

// 当前激活的 Tab
const activeTab = ref('host')
const hostDataLoaded = ref(false)
const patchDataLoaded = ref(false)

// 加载状态
const loading = ref(false)

// ============================================================
// 主机维度数据加载与操作 (按主机安装)
// ============================================================
const hostTableRef = ref(null)
const hostLoading = ref(false)
const allHostData = ref([])
const hostTagLoading = ref(false)
const hostTagOptions = ref([])
const osDistroList = ref([])
const osVersionList = ref([])
const hostOsVersionOptions = ref([])
const hostVersionFilter = ref('')

const hostFilters = reactive({
  os_distro: '',
  os_version: '',
  os_sp_version: '',
  tags: [],
  keyword: ''
})

const hostPagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const batchSelectedHosts = ref([])
const batchInstallDrawerVisible = ref(false)

const hostFilteredData = computed(() => {
  return allHostData.value
})

const hostTableData = computed(() => {
  const start = (hostPagination.page - 1) * hostPagination.pageSize
  const end = start + hostPagination.pageSize
  return hostFilteredData.value.slice(start, end)
})

// [Agent 功能暂停] const batchInstallCapabilityIssues = computed(() =>
// [Agent 功能暂停]   getAgentCapabilityIssues(batchSelectedHosts.value, 'patch', hostTableData.value || [])
// [Agent 功能暂停] )
// [Agent 功能暂停] const batchScanCapabilityIssues = computed(() =>
// [Agent 功能暂停]   getAgentCapabilityIssues(batchSelectedHosts.value, 'scan', hostTableData.value || [])
// [Agent 功能暂停] )
// [Agent 功能暂停] const batchInstallCapabilityHint = computed(() => formatAgentCapabilityIssues(batchInstallCapabilityIssues.value))
// [Agent 功能暂停] const batchScanCapabilityHint = computed(() => formatAgentCapabilityIssues(batchScanCapabilityIssues.value))

const {
  allSelected: hostAllSelected,
  handleToggleAllSelection: handleToggleHostSelectAll,
  handleTableSelect: handleHostTableSelect,
  resetAllSelected: resetHostAllSelected,
  restorePageSelection: restoreHostPageSelection
} = useTableSelectAll(hostTableRef, {
  tableData: hostTableData,
  filteredData: hostFilteredData,
  selectedItems: batchSelectedHosts,
  matchFn: (a, b) =>
    (a.host_id || a.id || a.host_key || '') === (b.host_id || b.id || b.host_key || '')
})

// 重新扫描相关状态
const rescanLoading = ref(false)
const runResultDialogVisible = ref(false)
const runResultRunId = ref('')
const operationLogsVisible = ref(false)
const lastSubmittedRunId = ref('')

async function loadHostData() {
  hostLoading.value = true
  try {
    const params = {
      page: 0,
      size: 10000,
      os_distro: hostFilters.os_distro,
      os_version: hostFilters.os_version,
      os_sp_version: hostFilters.os_sp_version,
      tags: hostFilters.tags,
      keyword: hostFilters.keyword
    }
    const response = await patchScanApi.getScanResults(params)
    const data = response?.data || response || {}
    const records = Array.isArray(data.records)
      ? data.records
      : Array.isArray(data.content)
        ? data.content
        : []
    // [Agent 功能暂停] try {
    //   await enrichHostAgentInfo(records)
    // } catch (error) {
    //   console.warn('获取主机 Agent 信息失败:', error)
    // }
    mergeHostOsVersionOptions(records)

    allHostData.value = records
    hostPagination.total = records.length

    nextTick(() => {
      restoreHostPageSelection()
    })
  } catch (error) {
    console.error('Failed to load host data:', error)
    allHostData.value = []
    hostPagination.total = 0
  } finally {
    hostLoading.value = false
    hostDataLoaded.value = true
  }
}

// [Agent 功能暂停] async function enrichHostAgentInfo(records) {
// [Agent 功能暂停]   const hostIds = [...new Set(records
// [Agent 功能暂停]     .map(row => row.host_id || row.hostId || row.id || row.hosts_id || row.hostsId)
// [Agent 功能暂停]     .filter(Boolean))]
// [Agent 功能暂停]   if (hostIds.length === 0) return
// [Agent 功能暂停] 
// [Agent 功能暂停]   const infoByHostId = new Map()
// [Agent 功能暂停]   for (let index = 0; index < hostIds.length; index += 100) {
// [Agent 功能暂停]     const result = await agentApi.getHostAgentInfo(hostIds.slice(index, index + 100))
// [Agent 功能暂停]     if (Array.isArray(result)) {
// [Agent 功能暂停]       result.forEach(info => {
// [Agent 功能暂停]         if (info?.hostId) infoByHostId.set(String(info.hostId), info)
// [Agent 功能暂停]       })
// [Agent 功能暂停]     }
// [Agent 功能暂停]   }
// [Agent 功能暂停] 
// [Agent 功能暂停]   records.forEach(row => {
// [Agent 功能暂停]     const hostId = String(row.host_id || row.hostId || row.id || row.hosts_id || row.hostsId || '')
// [Agent 功能暂停]     const info = infoByHostId.get(hostId)
// [Agent 功能暂停]     if (!info) return
// [Agent 功能暂停]     row.connectionType = info.connectionType || row.connectionType
// [Agent 功能暂停]     row.agentStatus = info.agentStatus ?? row.agentStatus
// [Agent 功能暂停]     row.capabilities = info.capabilities ?? row.capabilities
// [Agent 功能暂停]   })
// [Agent 功能暂停] }

function mergeHostOsVersionOptions(records = []) {
  const optionMap = new Map(hostOsVersionOptions.value.map(item => [item.value, item]))
  records.forEach(item => {
    const osVersion = item.os_major_version || item.os_version || ''
    const osSpVersion = item.os_sp_version || ''
    const label = [osVersion, osSpVersion].filter(Boolean).join(' ')
    if (!label) return
    optionMap.set(label, {
      label,
      value: label,
      osVersion,
      osSpVersion
    })
  })
  hostOsVersionOptions.value = [...optionMap.values()]
}

async function loadHostTagOptions() {
  hostTagLoading.value = true
  try {
    const responses = await Promise.all([
      dataManageApi.getAllTags('linux'),
      dataManageApi.getAllTags('host')
    ])
    const records = responses.flatMap(response =>
      Array.isArray(response?.records) ? response.records : []
    )
    hostTagOptions.value = [
      ...new Set(
        records
          .map(item => (typeof item === 'string' ? item : item?.name || item?.tagName))
          .filter(Boolean)
      )
    ].sort((a, b) => a.localeCompare(b, 'zh-CN'))
  } catch (error) {
    console.error('Failed to load host tags:', error)
  } finally {
    hostTagLoading.value = false
  }
}

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
      const records = osVersionRes.data.records
      osVersionList.value = [
        ...new Set(records.map(item => item.os_major_version || item.os_version).filter(Boolean))
      ]
      mergeHostOsVersionOptions(records)
    }
  } catch (error) {
    console.error('Failed to load OS metadata lists:', error)
  }
}

function handleHostFilter() {
  resetHostAllSelected()
  batchSelectedHosts.value = []
  hostPagination.page = 1
  loadHostData()
}

function handleHostVersionChange(value) {
  const option = hostOsVersionOptions.value.find(item => item.value === value)
  const parsedValue = parseOsVersionFilter(value)
  hostFilters.os_version = option?.osVersion || parsedValue.osVersion
  hostFilters.os_sp_version = option?.osSpVersion || parsedValue.osSpVersion
  handleHostFilter()
}

function handleHostReset() {
  resetHostAllSelected()
  batchSelectedHosts.value = []
  hostFilters.os_distro = ''
  hostFilters.os_version = ''
  hostFilters.os_sp_version = ''
  hostFilters.tags = []
  hostVersionFilter.value = ''
  hostFilters.keyword = ''
  hostPagination.page = 1
  hostPagination.pageSize = 20
  loadHostData()
}

function handleHostPageChange(page) {
  hostPagination.page = page
}

function handleHostSizeChange(size) {
  hostPagination.pageSize = size
  hostPagination.page = 1
}

function handleHostClick(row) {
  router.push({
    name: 'patches-hostDetail',
    query: {
      host_key: row.host_key || row.hostKey || '',
      host_id: row.host_id || row.hostId || row.id || '',
      os_distro: row.os_distro,
      os_version: row.os_version,
      hostname: row.hostname,
      fromLabel: '补丁安装',
      fromRouteName: 'patches-patchInstall'
    }
  })
}

function handleBatchInstallSuccess() {
  resetHostAllSelected()
  batchSelectedHosts.value = []
  loadHostData()
}

function handleRunResultClose(payload) {
  if (payload?.succeeded) {
    loadHostData()
  }
}

// 重新扫描逻辑
async function handleRescan() {
  if (batchSelectedHosts.value.length === 0) {
    ElMessage.warning('请先在列表中勾选要重新扫描的主机')
    return
  }
  await submitRescan(batchSelectedHosts.value)
}

function normalizeRescanHost(host) {
  if (typeof host === 'object' && host !== null) {
    return {
      key: host.host_id || host.hostId || host.id || host.key || host.host_key || host.hostKey || '',
      value: host.host_key || host.hostKey || host.hostname || host.value || host.name || '',
      assetType: host.assetType || host.asset_type || 'linux'
    }
  }
  return {
    key: '',
    value: String(host || '').trim(),
    assetType: 'linux'
  }
}

async function submitRescan(hosts) {
// [Agent 功能暂停]   let resolvedHosts
// [Agent 功能暂停]   try {
// [Agent 功能暂停]     resolvedHosts = await resolveAgentCapabilityHosts(hosts)
// [Agent 功能暂停]   } catch (error) {
// [Agent 功能暂停]     console.error('Failed to refresh Agent status before scan:', error)
// [Agent 功能暂停]     ElMessage.error(error?.message || '无法确认目标主机的 Agent 状态，已阻止扫描')
// [Agent 功能暂停]     return false
// [Agent 功能暂停]   }
// [Agent 功能暂停] 
// [Agent 功能暂停]   if (!validateAgentCapability(resolvedHosts, 'scan', [])) {
// [Agent 功能暂停]     return false
// [Agent 功能暂停]   }
  const resolvedHosts = hosts // [Agent 功能暂停] 跳过 Agent 能力校验

  const normalizedHosts = resolvedHosts
    .map(normalizeRescanHost)
    .filter(item => item.value)

  if (normalizedHosts.length === 0) {
    ElMessage.warning('请选择至少一个有效的待扫描主机')
    return false
  }

  rescanLoading.value = true
  try {
    const { executeJob } = await import('@/modules/automation/api/jao')
    const response = await executeJob({
      jobId: '0g3GfW',
      params: { hosts: normalizedHosts }
    })

    const runId = response?.data?.[0]?.runId || response?.[0]?.runId
    if (!runId) {
      ElMessage.error('扫描任务提交失败：未返回运行ID')
      return false
    }

    ElMessage.success('扫描任务已提交')

    lastSubmittedRunId.value = runId
    runResultRunId.value = runId
    runResultDialogVisible.value = true

    setTimeout(() => {
      loadHostData()
    }, 2000)

    return true
  } catch (error) {
    console.error('Scan failed:', error)
    ElMessage.error(`扫描任务提交失败: ${error.message || '未知错误'}`)
    return false
  } finally {
    rescanLoading.value = false
  }
}


// ============================================================
// 补丁维度数据加载与操作 (按补丁安装)
// ============================================================
const filters = reactive({
  severity: ['Critical', 'Important', 'Moderate', 'Low'],
  keyword: ''
})

const tableRef = ref(null)
const allData = ref([])
const selectedRows = ref([])

const selectedPatchIds = computed(() => selectedRows.value.map(r => r.patch_id))

const pagination = reactive({
  page: 1,
  pageSize: 10
})

const filteredData = computed(() => {
  let data = allData.value
  if (filters.keyword) {
    const keyword = filters.keyword.toLowerCase().trim()
    data = data.filter(
      item =>
        item.patch_id?.toLowerCase().includes(keyword) ||
        item.title?.toLowerCase().includes(keyword) ||
        item.related_vuls?.toLowerCase().includes(keyword)
    )
  }
  return data
})

const paginatedData = computed(() => {
  const start = (pagination.page - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return filteredData.value.slice(start, end)
})

const totalCount = computed(() => filteredData.value.length)

const patchDetailVisible = ref(false)
const patchDetail = ref(null)
const patchDetailLoading = ref(false)

const installDialogVisible = ref(false)
const patchesToInstall = ref([])

function handleViewAffectedHosts(row) {
  patchesToInstall.value = [row]
  installDialogVisible.value = true
}

async function handleOpenBatchInstallDrawer() {
// [Agent 功能暂停]   let resolvedHosts
// [Agent 功能暂停]   try {
// [Agent 功能暂停]     resolvedHosts = await resolveAgentCapabilityHosts(batchSelectedHosts.value)
// [Agent 功能暂停]   } catch (error) {
// [Agent 功能暂停]     console.error('Failed to refresh Agent status before install:', error)
// [Agent 功能暂停]     ElMessage.error(error?.message || '无法确认目标主机的 Agent 状态，已阻止安装')
// [Agent 功能暂停]     return
// [Agent 功能暂停]   }
// [Agent 功能暂停] 
// [Agent 功能暂停]   if (!validateAgentCapability(resolvedHosts, 'patch', [])) {
// [Agent 功能暂停]     return
// [Agent 功能暂停]   }
  const resolvedHosts = batchSelectedHosts.value // [Agent 功能暂停] 跳过 Agent 能力校验
  batchSelectedHosts.value = resolvedHosts
  batchInstallDrawerVisible.value = true
}

function handleInstallSelected() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要安装的补丁')
    return
  }
  // 注意：selectedRows 是补丁维度记录，Agent 能力校验在安装向导中基于实际目标主机进行
  patchesToInstall.value = [...selectedRows.value]
  installDialogVisible.value = true
}

function handleInstallSuccess() {
  resetAllSelected()
  loadData()
}

function getSeverityLabel(severity) {
  const map = {
    Critical: '严重',
    Important: '重要',
    Moderate: '中等',
    Low: '低危'
  }
  return map[severity] || severity
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date
    .toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    .replace(/\//g, '-')
}

function resolvePatchDistro(patch) {
  if (!patch) return ''
  if (patch.os_distro || patch.vendor) return patch.os_distro || patch.vendor
  const patchId = String(patch.patch_id || '').toUpperCase()
  if (patchId.includes('KYSA')) return 'kylin'
  if (patchId.includes('SUSE') || patchId.includes('SLES')) return 'suse'
  return 'redhat'
}

async function loadData() {
  loading.value = true
  try {
    const params = {}
    if (filters.severity.length > 0) {
      params.severity = filters.severity.join(',')
    }
    const response = await patchInstallApi.getAvailablePatches(params)
    if (response?.data) {
      allData.value = response.data.records || response.data || []
    }
    resetAllSelected()
  } catch (error) {
    console.error('Failed to load patches:', error)
    ElMessage.error('加载可安装补丁失败，请稍后重试')
    allData.value = []
  } finally {
    loading.value = false
    patchDataLoaded.value = true
  }
}

function handleSearch() {
  resetAllSelected()
  pagination.page = 1
  loadData()
}

function handleReset() {
  resetAllSelected()
  filters.severity = ['Critical', 'Important', 'Moderate', 'Low']
  filters.keyword = ''
  pagination.page = 1
  pagination.pageSize = 10
  loadData()
}

const {
  allSelected,
  handleToggleAllSelection: handleToggleSelectAll,
  handleTableSelect,
  resetAllSelected
} = useTableSelectAll(tableRef, {
  tableData: paginatedData,
  filteredData,
  selectedItems: selectedRows
})

function handlePageChange(page) {
  pagination.page = page
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
}

function handleViewPatchDetail(row) {
  patchDetailVisible.value = true
  loadPatchDetail(row.patch_id)
}

async function loadPatchDetail(patchId) {
  patchDetailLoading.value = true
  patchDetail.value = null
  try {
    const response = await patchInstallApi.getPatchDetail({ patch_id: patchId })
    if (response?.data?.records?.length > 0) {
      patchDetail.value = response.data.records[0]
    }
  } catch (error) {
    console.error('Failed to load patch detail:', error)
    ElMessage.error('加载补丁详情失败，请稍后重试')
    patchDetail.value = null
  } finally {
    patchDetailLoading.value = false
  }
}

// ============================================================
// Tab 切换逻辑
// ============================================================
function handleTabChange(tab) {
  activeTab.value = tab
  // 切换路由查询参数，维持状态在刷新后不丢失
  router.replace({
    query: {
      ...route.query,
      tab
    }
  })
  if (tab === 'host') {
    if (!hostDataLoaded.value) {
      loadOsLists()
      loadHostTagOptions()
      loadHostData()
    }
  } else {
    if (!patchDataLoaded.value) {
      loadData()
    }
  }
}

function refresh() {
  if (activeTab.value === 'host') {
    loadHostData()
  } else {
    loadData()
  }
}

// 挂载周期与路由参数自动响应
onMounted(async () => {
  const queryTab = route.query.tab
  if (queryTab === 'host' || !queryTab) {
    activeTab.value = 'host'
    loadOsLists()
    loadHostTagOptions()
    await loadHostData()
  } else if (queryTab === 'patch') {
    activeTab.value = 'patch'
    loadData()
  }
})

// 暴露刷新接口
defineExpose({ refresh })
</script>

<style scoped lang="scss">
// 导航标签 - 保留原配色与风格的微调增强
.nav-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: transparent;
  flex-shrink: 0;
}

.nav-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 15px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 3px solid transparent;
  margin-bottom: -1px;
  background: transparent;
  user-select: none;

  i {
    font-size: 15px;
    transition: color 0.2s ease;
  }

  &:hover {
    color: #0d6efd;
  }

  &--active {
    color: #0d6efd;
    font-weight: 600;
    border-bottom-color: #0d6efd;

    i {
      color: #0d6efd;
    }
  }
}

.tab-content {
  flex: none;
  display: flex;
  flex-direction: column;
  min-height: auto;
  height: auto;
}

.host-list-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px 0;
}



.severity-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  font-weight: 500;
}

.text-danger {
  color: #f53f3f;
}

.text-warning {
  color: #ff7d00;
}

.text-dark {
  color: #ffc72e;
}

.text-info {
  color: #165dff;
}

.severity-tag {
  font-weight: 600;
  letter-spacing: 0.5px;
  border: none;

  &.is-critical {
    background-color: #dc3545;
    color: #fff;
  }

  &.is-important {
    background-color: #fd7e14;
    color: #fff;
  }

  &.is-moderate {
    background-color: #ffc107;
    color: #5c3c00;
  }

  &.is-low {
    background-color: #6c757d;
    color: #fff;
  }
}
</style>
