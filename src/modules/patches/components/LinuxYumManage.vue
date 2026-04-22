<template>
  <div class="ops-page-layout">
    <!-- Tab 导航 -->
    <el-tabs v-model="activeTab" class="yum-tabs">
      <el-tab-pane name="custom_repo">
        <template #label>
          <span>
            <i class="fa fa-user-cog" />
            YUM源配置
          </span>
        </template>
      </el-tab-pane>
      <el-tab-pane name="repo_list">
        <template #label>
          <span>
            <i class="fa fa-tools" />
            YUM源清单
          </span>
        </template>
      </el-tab-pane>
    </el-tabs>

    <!-- YUM源配置 Tab -->
    <template v-if="activeTab === 'custom_repo'">
      <!-- 筛选区 -->
      <div class="ops-filter-bar">
        <el-form :model="filters" inline size="small">
          <el-form-item label="关键词">
            <el-input
              v-model="filterText"
              placeholder="搜索..."
              style="width: 200px"
              clearable
              maxlength="50"
            >
              <template #prefix>
                <el-icon>
                  <Search />
                </el-icon>
              </template>
            </el-input>
          </el-form-item>
          <!-- <el-form-item>
            <el-button type="primary" :loading="loading" @click="handleFilter">
              <el-icon>
                <Search />
              </el-icon>
              搜索
            </el-button>
            <el-button @click="handleReset">
              <el-icon>
                <RefreshRight />
              </el-icon>
              重置
            </el-button>
          </el-form-item> -->
        </el-form>
      </div>

      <!-- 操作区 -->
      <div class="ops-action-bar">
        <el-button type="primary" size="small" @click="handleAddRepo">YUM源配置录入</el-button>
        <el-button
          size="small"
          :loading="batchCollecting"
          :disabled="customRepoData.length === 0"
          @click="handleCollectAll"
        >
          全部采集
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
          <el-icon v-show="!loading">
            <Refresh />
          </el-icon>
        </el-button>
      </div>

      <!-- 表格区域 -->
      <div class="ops-table-wrapper">
        <el-table v-loading="loading" :data="paginatedCustomRepoData" height="100%">
          <el-table-column prop="name" label="YUM源名称" min-width="120" sortable />
          <el-table-column prop="description" label="描述" min-width="120" sortable />
          <el-table-column
            prop="baseurl"
            label="YUM源地址"
            min-width="280"
            sortable
            show-overflow-tooltip
          />
          <el-table-column
            prop="file"
            label="YUM源文件"
            min-width="180"
            sortable
            show-overflow-tooltip
          />
          <el-table-column label="采集状态" width="110" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="getCollectStatusTagType(row)">
                {{ getCollectStatusLabel(row) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="包数量" width="90" align="center">
            <template #default="{ row }">
              {{ row.packageCount ?? '-' }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right" align="left">
            <template #default="{ row }">
              <el-button
                text
                type="primary"
                size="small"
                :loading="collectingConfigId === resolveYumConfigId(row)"
                @click="handleCollect(row)"
              >
                采集
              </el-button>
              <el-button text type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
              <el-button text type="primary" size="small" @click="handleConfig(row)">
                配置
              </el-button>
              <el-button text type="danger" size="small" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页区域 -->
      <div class="ops-pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="filteredCustomRepoData.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </template>

    <!-- YUM源清单 Tab -->
    <template v-if="activeTab === 'repo_list'">
      <!-- 筛选区 -->
      <div class="ops-filter-bar">
        <el-form :model="hostFilters" inline size="small">
          <el-form-item label="关键词">
            <el-input
              v-model="hostFilterText"
              placeholder="搜索..."
              style="width: 200px"
              clearable
              maxlength="50"
            >
              <template #prefix>
                <el-icon>
                  <Search />
                </el-icon>
              </template>
            </el-input>
          </el-form-item>
          <!-- <el-form-item>
            <el-button type="primary" :loading="hostLoading" @click="handleHostFilter">
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
          </el-form-item> -->
        </el-form>
      </div>

      <!-- 操作区 -->
      <div class="ops-action-bar">
        <el-button type="primary" size="small" @click="handleScanRepoList">YUM源清单扫描</el-button>
        <span style="flex: 1"></span>
        <el-button
          class="toolbar-icon-btn"
          circle
          size="small"
          :loading="hostLoading"
          @click="loadHostData"
          title="刷新"
        >
          <el-icon v-show="!hostLoading">
            <Refresh />
          </el-icon>
        </el-button>
      </div>

      <!-- 表格区域 -->
      <div class="ops-table-wrapper">
        <el-table v-loading="hostLoading" :data="paginatedHostTableData" height="100%">
          <el-table-column prop="$data_owner" label="主机" min-width="150">
            <template #default="{ row }">
              <el-link type="primary" :underline="false" @click="handleViewHostDetail(row)">
                {{ row.$data_owner }}
              </el-link>
            </template>
          </el-table-column>
          <el-table-column prop="os_distro" label="操作系统" min-width="200" sortable />
          <el-table-column prop="os_version" label="操作系统版本" min-width="150" sortable />
          <el-table-column prop="yum_count" label="已配置yum源数量" min-width="130" sortable />
        </el-table>
      </div>

      <!-- 分页区域 -->
      <div class="ops-pagination-wrapper">
        <el-pagination
          v-model:current-page="hostPagination.page"
          v-model:page-size="hostPagination.pageSize"
          :page-sizes="[10, 20, 50, 500]"
          :total="filteredHostTableData.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleHostSizeChange"
          @current-change="handleHostPageChange"
        />
      </div>
    </template>

    <!-- 添加/编辑YUM源对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingRepo ? '编辑YUM源' : 'YUM源配置录入'"
      width="600px"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="YUM源名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入YUM源名称" maxlength="50" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="formData.description" placeholder="请输入描述" maxlength="200" />
        </el-form-item>
        <el-form-item label="YUM源地址" prop="baseurl">
          <el-input v-model="formData.baseurl" placeholder="请输入YUM源地址" maxlength="500" />
        </el-form-item>
        <el-form-item label="YUM源文件" prop="file">
          <el-input
            v-model="formData.file"
            placeholder="如：/etc/yum.repos.d/local.repo"
            maxlength="256"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 设备选择器对话框 (用于配置和扫描) -->
    <AcmDeviceSelectorDialog
      v-model="deviceSelectorVisible"
      ci-types="[auto]"
      :initial-selection="selectedDevices"
      :options="{
        selectMode: 'host,group,tag,input,recently',
        selector: 'multiple'
      }"
      @confirm="handleDeviceSelected"
    />

    <!-- 选择目标主机对话框 -->
    <el-dialog
      v-model="selectHostDialogVisible"
      title="选择目标主机"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="select-host-dialog-content">
        <!-- 使用 AcmDeviceSelector 组件 -->
        <AcmDeviceSelector
          v-model="selectedDevices"
          ci-types="[auto]"
          :options="{
            selectMode: 'host,group,tag,input,recently',
            selector: 'multiple',
            label: '选择设备'
          }"
        />
      </div>
      <template #footer>
        <el-button @click="selectHostDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="jobExecuting"
          :disabled="selectedDevices.length === 0"
          @click="executeJob"
        >
          {{ currentOperation === 'config' ? '开始配置' : '开始扫描' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 主机YUM源详情对话框 -->
    <el-dialog
      v-model="hostDetailDialogVisible"
      :title="`${currentHostDetail?.$data_owner || ''} - YUM源详情`"
      width="1400px"
      :close-on-click-modal="false"
    >
      <div class="host-detail-dialog-content">
        <!-- 筛选区 -->
        <div class="ops-filter-bar">
          <el-form inline size="small">
            <el-form-item label="状态">
              <el-select v-model="detailRepoStatus" placeholder="请选择" style="width: 120px">
                <el-option value="enabled" label="启用" />
                <el-option value="disabled" label="禁用" />
              </el-select>
            </el-form-item>
            <el-form-item label="关键词">
              <el-input
                v-model="detailFilterText"
                placeholder="搜索名称、地址..."
                style="width: 220px"
                clearable
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleDetailFilterChange">
                <el-icon><Search /></el-icon>
                搜索
              </el-button>
              <el-button @click="handleDetailReset">
                <el-icon><RefreshRight /></el-icon>
                重置
              </el-button>
              <el-button :loading="hostDetailLoading" @click="loadHostRepoDetail">
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- YUM源详情表格 -->
        <el-table
          v-loading="hostDetailLoading"
          :data="paginatedRepoDetailData"
          style="width: 100%"
          size="small"
          max-height="500"
        >
          <el-table-column prop="$data_owner" label="主机" min-width="100" />
          <el-table-column prop="repo-name" label="名称" min-width="120" />
          <el-table-column prop="repo-pkgs" label="软件包数" min-width="80" />
          <el-table-column
            prop="repo-baseurl"
            label="Base URL"
            min-width="250"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              <div class="url-badges">
                <el-tag
                  v-for="(url, idx) in parseUrls(row['repo-baseurl'])"
                  :key="idx"
                  type="info"
                  size="small"
                  class="url-tag"
                >
                  {{ url }}
                </el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="repo-file" label="YUM文件" min-width="150" show-overflow-tooltip />
          <el-table-column prop="repo-status" label="状态" width="90" align="left">
            <template #default="{ row }">
              <el-tag :type="row['repo-status'] === 'enabled' ? 'success' : 'info'" size="small">
                {{ row['repo-status'] === 'enabled' ? 'Enabled' : 'Disabled' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="repo-size" label="大小" width="80" />
          <el-table-column prop="repo-updated" label="更新时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row['repo-updated']) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="88" fixed="right" align="left">
            <template #default="{ row }">
              <el-button
                v-if="row['repo-status'] === 'disabled'"
                text
                type="primary"
                size="small"
                @click="handleEnableRepo(row)"
              >
                启用
              </el-button>
              <el-button
                v-if="row['repo-status'] === 'enabled'"
                text
                type="warning"
                size="small"
                @click="handleDisableRepo(row)"
              >
                禁用
              </el-button>
              <el-button text type="danger" size="small" @click="handleDeleteRepo(row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="dialog-pagination">
          <el-pagination
            v-model:current-page="detailPagination.page"
            v-model:page-size="detailPagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="filteredRepoDetailData.length"
            layout="total, sizes, prev, pager, next, jumper"
            size="small"
            background
          />
        </div>
      </div>
    </el-dialog>

    <!-- 作业执行确认对话框 -->
    <el-dialog v-model="jobConfirmDialogVisible" :title="jobConfirmTitle" width="600px">
      <div class="job-confirm-content">
        <el-alert
          :title="`即将对 ${selectedDevices.length} 台主机执行操作`"
          type="info"
          show-icon
          :closable="false"
          class="mb-3"
        />

        <!-- YUM源配置信息 (配置操作时显示) -->
        <div v-if="currentOperation === 'config' && configRepo" class="config-info mb-3">
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="YUM源名称">{{ configRepo.name }}</el-descriptions-item>
            <el-descriptions-item label="描述">
              {{ configRepo.description || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="YUM源地址">{{ configRepo.baseurl }}</el-descriptions-item>
            <el-descriptions-item label="YUM源文件">{{ configRepo.file }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 操作类型选择 (配置操作时显示) -->
        <div v-if="currentOperation === 'config'" class="operation-select mb-3">
          <el-form-item label="操作类型" label-width="80px">
            <el-radio-group v-model="configAction">
              <el-radio value="add">添加YUM源</el-radio>
              <el-radio value="remove">移除YUM源</el-radio>
            </el-radio-group>
          </el-form-item>
        </div>

        <!-- 已选主机列表 -->
        <div class="selected-hosts-list">
          <div class="list-header">
            <span>
              <i class="fa fa-server me-2" />
              已选主机（
              <strong>{{ selectedDevices.length }}</strong>
              ）
            </span>
          </div>
          <div class="list-body">
            <el-tag v-for="(host, index) in selectedDevices" :key="index" type="primary">
              {{ host.value || host.hostname || host }}
            </el-tag>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="jobConfirmDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="jobExecuting" @click="executeJob">
          <i class="fa fa-play me-1" />
          {{ jobConfirmButtonText }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search, RefreshRight } from '@element-plus/icons-vue'
import { yumManageApi } from '../api'
import {
  getCollectStatusLabel,
  getCollectStatusTagType,
  normalizeYumConfigRecord,
  resolveYumConfigId
} from '../windows-patch/yumRepoUtils'
import AcmDeviceSelectorDialog from '@/modules/automation/components/job/schedule/components/AcmDeviceSelectorDialog.vue'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import { runJob } from '@/modules/automation/api/command'
import { useJobPolling } from '@/composables/useJobPolling'

// 使用作业轮询 composable
const { startPolling } = useJobPolling()

// 常量定义
const YUM_JOB_ID = 'IxL8nr' // YUM操作作业ID

// Tab状态
const activeTab = ref('custom_repo')

// 监听Tab切换，自动加载对应数据
watch(activeTab, newTab => {
  if (newTab === 'repo_list' && hostTableData.value.length === 0) {
    loadHostData()
  }
})

// ============ YUM源配置 Tab ============
const loading = ref(false)
const submitting = ref(false)
const collectingConfigId = ref('')
const batchCollecting = ref(false)
const filterText = ref('')
const customRepoData = ref([])
const filters = reactive({
  keyword: ''
})
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 分页信息
const paginationInfo = computed(() => {
  const start = (pagination.page - 1) * pagination.pageSize + 1
  const end = Math.min(pagination.page * pagination.pageSize, filteredCustomRepoData.value.length)
  return `${start} - ${end} / ${filteredCustomRepoData.value.length}`
})

// 前端筛选数据
const filteredCustomRepoData = computed(() => {
  if (!filterText.value) return customRepoData.value
  const keyword = filterText.value.toLowerCase()
  return customRepoData.value.filter(item => {
    return (
      item.name?.toLowerCase().includes(keyword) ||
      item.description?.toLowerCase().includes(keyword) ||
      item.baseurl?.toLowerCase().includes(keyword) ||
      item.file?.toLowerCase().includes(keyword) ||
      item.collectStatus?.toLowerCase().includes(keyword)
    )
  })
})

// 前端分页数据
const paginatedCustomRepoData = computed(() => {
  const start = (pagination.page - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return filteredCustomRepoData.value.slice(start, end)
})

// 对话框
const dialogVisible = ref(false)
const editingRepo = ref(null)
const formRef = ref(null)
const formData = reactive({
  name: '',
  description: '',
  baseurl: '',
  file: ''
})

const formRules = {
  name: [{ required: true, message: '请输入YUM源名称', trigger: 'blur' }],
  baseurl: [{ required: true, message: '请输入YUM源地址', trigger: 'blur' }],
  file: [{ required: true, message: '请输入YUM源文件路径', trigger: 'blur' }]
}

// 设备选择器对话框
const deviceSelectorVisible = ref(false)
const selectedDevices = ref([])

// 选择目标主机对话框
const selectHostDialogVisible = ref(false)

// 作业执行确认对话框
const jobConfirmDialogVisible = ref(false)
const jobExecuting = ref(false)
const currentOperation = ref('') // 'config' | 'scan'
const configRepo = ref(null)
const configAction = ref('add')

const jobConfirmTitle = computed(() => {
  if (currentOperation.value === 'config') {
    return '选择目标主机'
  } else if (currentOperation.value === 'scan') {
    return '选择目标主机'
  }
  return '选择目标主机'
})

const jobConfirmButtonText = computed(() => {
  if (currentOperation.value === 'config') {
    return 'YUM源配置'
  } else if (currentOperation.value === 'scan') {
    return '开始扫描'
  }
  return '执行'
})

// ============ YUM源清单 Tab ============
const hostLoading = ref(false)
const hostFilterText = ref('')
const hostTableData = ref([])
const hostFilters = reactive({
  keyword: ''
})
const hostPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// ============ 主机YUM源详情 ============
const hostDetailDialogVisible = ref(false)
const hostDetailLoading = ref(false)
const currentHostDetail = ref(null)
const hostRepoDetailData = ref([])
const detailRepoStatus = ref('enabled')
const detailFilterText = ref('')
const detailPagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 过滤后的数据
const filteredRepoDetailData = computed(() => {
  if (!detailFilterText.value) return hostRepoDetailData.value
  const keyword = detailFilterText.value.toLowerCase()
  return hostRepoDetailData.value.filter(row => {
    return (
      row['repo-name']?.toLowerCase().includes(keyword) ||
      row['repo-baseurl']?.toLowerCase().includes(keyword) ||
      row['repo-file']?.toLowerCase().includes(keyword)
    )
  })
})

// 分页后的详情数据
const paginatedRepoDetailData = computed(() => {
  const start = (detailPagination.page - 1) * detailPagination.pageSize
  const end = start + detailPagination.pageSize
  return filteredRepoDetailData.value.slice(start, end)
})

function handleDetailFilterChange() {
  detailPagination.page = 1
}

/**
 * 重置详情筛选
 */
function handleDetailReset() {
  detailFilterText.value = ''
  detailRepoStatus.value = 'enabled'
  handleDetailFilterChange()
}

const hostPaginationInfo = computed(() => {
  const start = (hostPagination.page - 1) * hostPagination.pageSize + 1
  const end = Math.min(
    hostPagination.page * hostPagination.pageSize,
    filteredHostTableData.value.length
  )
  return `${start} - ${end} / ${filteredHostTableData.value.length}`
})

// 前端筛选主机数据
const filteredHostTableData = computed(() => {
  if (!hostFilterText.value) return hostTableData.value
  const keyword = hostFilterText.value.toLowerCase()
  return hostTableData.value.filter(item => {
    return (
      item.$data_owner?.toLowerCase().includes(keyword) ||
      item.os_distro?.toLowerCase().includes(keyword) ||
      item.os_version?.toLowerCase().includes(keyword)
    )
  })
})

// 前端分页主机数据
const paginatedHostTableData = computed(() => {
  const start = (hostPagination.page - 1) * hostPagination.pageSize
  const end = start + hostPagination.pageSize
  return filteredHostTableData.value.slice(start, end)
})

// ============ 数据加载方法 ============

// 加载YUM源配置数据
async function loadCustomRepoData() {
  loading.value = true
  try {
    const response = await yumManageApi.getYumRepoConfigs()
    const rawData = response?.data || response || []
    customRepoData.value = Array.isArray(rawData)
      ? rawData.map(item => normalizeYumConfigRecord(item))
      : []
  } catch (error) {
    console.error('Failed to load custom repo data:', error)
    customRepoData.value = []
  } finally {
    loading.value = false
  }
}

// 加载主机YUM源清单数据
async function loadHostData() {
  hostLoading.value = true
  try {
    // 改为全量加载，以便前端筛选
    const response = await yumManageApi.getHostYumList({
      page: 1,
      size: 1000 // 获取足够多的数据
    })
    if (response?.data) {
      hostTableData.value = response.data.records || response.data || []
    }
  } catch (error) {
    console.error('Failed to load host data:', error)
    hostTableData.value = []
  } finally {
    hostLoading.value = false
  }
}

// ============ 事件处理方法 ============

function handleFilter() {
  pagination.page = 1
}

function handleReset() {
  filterText.value = ''
  pagination.page = 1
  pagination.pageSize = 10
}

function handleRefresh() {
  loadCustomRepoData()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
}

function handleHostFilter() {
  hostPagination.page = 1
}

function handleHostReset() {
  hostFilterText.value = ''
  hostPagination.page = 1
  hostPagination.pageSize = 10
}

function handleHostSizeChange(size) {
  hostPagination.pageSize = size
  hostPagination.page = 1
}

function handlePageChange(page) {
  pagination.page = page
}

function handleHostPageChange(page) {
  hostPagination.page = page
}

function handleAddRepo() {
  editingRepo.value = null
  Object.assign(formData, {
    name: '',
    description: '',
    baseurl: '',
    file: ''
  })
  dialogVisible.value = true
}

function handleEdit(row) {
  editingRepo.value = row
  Object.assign(formData, {
    name: row.name,
    description: row.description || '',
    baseurl: row.baseurl,
    file: row.file || ''
  })
  dialogVisible.value = true
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定要删除 "${row.name}" 吗？此操作不可恢复。`, '警告', {
      type: 'warning'
    })
    await yumManageApi.deleteYumConfig(resolveYumConfigId(row))
    ElMessage.success('删除成功')
    loadCustomRepoData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Delete failed:', error)
    }
  }
}

async function handleCollect(row) {
  const dcDataId = resolveYumConfigId(row)
  if (!dcDataId) {
    ElMessage.warning('未获取到可采集的 YUM 源配置 ID')
    return
  }

  collectingConfigId.value = dcDataId
  try {
    const response = await yumManageApi.collectYumRepo({ dcDataId })
    const data = response?.data || response || {}
    ElMessage.success(data?.message || '采集任务已提交')
    await loadCustomRepoData()
  } catch (error) {
    console.error('Collect failed:', error)
    ElMessage.error('触发采集失败')
  } finally {
    collectingConfigId.value = ''
  }
}

async function handleCollectAll() {
  const dcDataIds = customRepoData.value.map(item => resolveYumConfigId(item)).filter(Boolean)
  if (dcDataIds.length === 0) {
    ElMessage.warning('当前没有可采集的 YUM 源配置')
    return
  }

  batchCollecting.value = true
  try {
    const response = await yumManageApi.collectYumRepoBatch({ dcDataIds })
    const data = response?.data || response || {}
    const successCount = Number(data.successCount || 0)
    const failCount = Number(data.failCount || 0)

    await loadCustomRepoData()

    if (successCount > 0) {
      ElMessage.success(
        failCount > 0
          ? `批量采集已提交：成功 ${successCount} 条，失败 ${failCount} 条`
          : `批量采集已提交：成功 ${successCount} 条`
      )
      return
    }

    ElMessage.warning(
      failCount > 0 ? `批量采集提交失败：共 ${failCount} 条失败` : '批量采集未提交任何任务'
    )
  } catch (error) {
    console.error('Batch collect failed:', error)
    ElMessage.error('批量触发采集失败')
  } finally {
    batchCollecting.value = false
  }
}

// 配置按钮 - 打开选择目标主机对话框
function handleConfig(row) {
  configRepo.value = row
  currentOperation.value = 'config'
  configAction.value = 'add'
  selectedDevices.value = []
  selectHostDialogVisible.value = true
}

// YUM源清单扫描按钮 - 打开选择目标主机对话框
function handleScanRepoList() {
  currentOperation.value = 'scan'
  configRepo.value = null
  selectedDevices.value = []
  selectHostDialogVisible.value = true
}

// 打开主机选择器
function openHostSelector() {
  deviceSelectorVisible.value = true
}

// 移除已选主机
function removeSelectedHost(index) {
  selectedDevices.value.splice(index, 1)
}

// 设备选择确认回调
function handleDeviceSelected(devices) {
  selectedDevices.value = devices
}

// 执行作业
async function executeJob() {
  if (selectedDevices.value.length === 0) {
    ElMessage.warning('请选择至少一台主机')
    return
  }

  jobExecuting.value = true
  try {
    // 构建主机参数
    const hosts = selectedDevices.value.map(host => ({
      key: host.key || host.id,
      value: host.value || host.hostname || host.$data_owner,
      assetType: host.ci_type || host.assetType || 'linux'
    }))

    // 构建作业参数
    const params = {
      hosts: hosts,
      func: currentOperation.value === 'scan' ? 'yum-list' : 'yum-configs'
    }

    // 配置操作时添加额外参数
    if (currentOperation.value === 'config' && configRepo.value) {
      params.action = configAction.value
      params.repo_name = configRepo.value.name
      params.repo_desc = configRepo.value.description || ''
      params.repo_url = configRepo.value.baseurl
      params.repo_file = configRepo.value.file
      params.repo_status = ''
    }

    // 调用作业执行API
    const response = await runJob(YUM_JOB_ID, { params })
    const runResult = (response?.data || response || [])[0]

    if (runResult && runResult.runId) {
      ElMessage.success(currentOperation.value === 'scan' ? '扫描任务已提交' : '配置任务已提交')
      jobConfirmDialogVisible.value = false // 修正：关闭确认弹窗

      // 使用 composable 开始轮询任务状态
      startPolling(runResult.runId, {
        successMessage: '任务执行成功',
        errorMessage: '任务执行失败',
        onSuccess: () => {
          // 如果是扫描任务，刷新数据
          if (currentOperation.value === 'scan') {
            loadHostData()
          }
        },
        onComplete: () => {
          jobExecuting.value = false
        }
      })
    } else {
      throw new Error('未获取到任务运行ID')
    }
  } catch (error) {
    console.error('Job execution failed:', error)
    ElMessage.error('任务执行失败: ' + (error.message || '未知错误'))
    jobExecuting.value = false
  }
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
    submitting.value = true

    if (editingRepo.value) {
      await yumManageApi.updateYumConfig(editingRepo.value.id, formData)
      ElMessage.success('更新成功')
    } else {
      await yumManageApi.createYumConfig(formData)
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
    loadCustomRepoData()
  } catch (error) {
    console.error('Submit failed:', error)
  } finally {
    submitting.value = false
  }
}

// 查看主机YUM源详情
function handleViewHostDetail(row) {
  currentHostDetail.value = row
  detailRepoStatus.value = 'enabled'
  detailFilterText.value = ''
  detailPagination.page = 1
  hostDetailDialogVisible.value = true
  loadHostRepoDetail()
}

// 加载主机YUM源详情数据
async function loadHostRepoDetail() {
  if (!currentHostDetail.value) return

  hostDetailLoading.value = true
  try {
    const response = await yumManageApi.getHostRepoDetail({
      data_owner: currentHostDetail.value.$data_owner,
      repo_status: detailRepoStatus.value
    })
    hostRepoDetailData.value = response?.data?.records || response?.data || []
    detailPagination.page = 1 // 每次成功加载新状态时重置页码
  } catch (error) {
    console.error('Failed to load host repo detail:', error)
    hostRepoDetailData.value = []
  } finally {
    hostDetailLoading.value = false
  }
}

// 解析URL列表
function parseUrls(urlStr) {
  if (!urlStr) return []
  return urlStr.split(',').filter(url => url.trim())
}

// 格式化日期
function formatDate(timestamp) {
  if (!timestamp) return '-'
  try {
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return '-'
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return '-'
  }
}

// 导出主机YUM源详情
function exportHostRepoDetail() {
  // TODO: 实现导出功能
  ElMessage.info('导出功能开发中')
}

// 启用YUM源
async function handleEnableRepo(row) {
  try {
    await ElMessageBox.confirm(`确定要启用 "${row['repo-name']}" 吗？`, '确认', { type: 'info' })

    // 构建参数执行作业
    const hosts = [
      {
        key: currentHostDetail.value.$data_owner_id || currentHostDetail.value.$id,
        value: currentHostDetail.value.$data_owner,
        assetType: 'linux'
      }
    ]

    const repoFile = extractRepoFileName(row['repo-file'])

    await runJob(YUM_JOB_ID, {
      params: {
        func: 'yum-configs',
        hosts: hosts,
        action: 'edit',
        repo_name: row['repo-name'],
        repo_desc: '',
        repo_url: row['repo-baseurl'],
        repo_file: repoFile,
        repo_status: 'true'
      }
    })

    ElMessage.success('启用任务已提交')
    setTimeout(() => loadHostRepoDetail(), 2000)
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Enable repo failed:', error)
      ElMessage.error('操作失败')
    }
  }
}

// 禁用YUM源
async function handleDisableRepo(row) {
  try {
    await ElMessageBox.confirm(`确定要禁用 "${row['repo-name']}" 吗？`, '确认', { type: 'warning' })

    const hosts = [
      {
        key: currentHostDetail.value.$data_owner_id || currentHostDetail.value.$id,
        value: currentHostDetail.value.$data_owner,
        assetType: 'linux'
      }
    ]

    const repoFile = extractRepoFileName(row['repo-file'])

    await runJob(YUM_JOB_ID, {
      params: {
        func: 'yum-configs',
        hosts: hosts,
        action: 'edit',
        repo_name: row['repo-name'],
        repo_desc: '',
        repo_url: row['repo-baseurl'],
        repo_file: repoFile,
        repo_status: 'false'
      }
    })

    ElMessage.success('禁用任务已提交')
    setTimeout(() => loadHostRepoDetail(), 2000)
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Disable repo failed:', error)
      ElMessage.error('操作失败')
    }
  }
}

// 删除YUM源
async function handleDeleteRepo(row) {
  try {
    await ElMessageBox.confirm(`确定要删除 "${row['repo-name']}" 吗？此操作不可恢复。`, '警告', {
      type: 'warning'
    })

    const hosts = [
      {
        key: currentHostDetail.value.$data_owner_id || currentHostDetail.value.$id,
        value: currentHostDetail.value.$data_owner,
        assetType: 'linux'
      }
    ]

    const repoFile = extractRepoFileName(row['repo-file'])

    await runJob(YUM_JOB_ID, {
      params: {
        func: 'yum-configs',
        hosts: hosts,
        action: 'remove',
        repo_name: row['repo-name'],
        repo_desc: '',
        repo_url: '',
        repo_file: repoFile,
        repo_status: ''
      }
    })

    ElMessage.success('删除任务已提交')
    setTimeout(() => loadHostRepoDetail(), 2000)
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Delete repo failed:', error)
      ElMessage.error('操作失败')
    }
  }
}

// 从文件路径中提取repo文件名（不含扩展名）
function extractRepoFileName(filePath) {
  if (!filePath) return ''
  const startIndex = filePath.lastIndexOf('/') + 1
  const endIndex = filePath.lastIndexOf('.repo')
  if (endIndex === -1) return filePath.slice(startIndex)
  return filePath.slice(startIndex, endIndex)
}

function refresh() {
  if (activeTab.value === 'custom_repo') {
    loadCustomRepoData()
  } else {
    loadHostData()
  }
}

onMounted(() => {
  loadCustomRepoData()
})

defineExpose({ refresh })
</script>

<style scoped lang="scss">
// Tab样式
.yum-tabs {
  margin-bottom: 16px;

  :deep(.el-tabs__header) {
    margin: 0;
  }

  :deep(.el-tabs__content) {
    display: none;
  }
}

// 作业确认对话框样式
.job-confirm-content {
  .config-info {
    margin-bottom: 16px;
  }

  .operation-select {
    margin-bottom: 16px;
  }

  .selected-hosts-list {
    border: 1px solid var(--el-border-color-light);
    border-radius: 4px;

    .list-header {
      padding: 10px 16px;
      background: var(--el-fill-color-light);
      border-bottom: 1px solid var(--el-border-color-light);
      font-size: 14px;
      font-weight: 500;
      color: var(--el-text-color-regular);
    }

    .list-body {
      padding: 12px 16px;
      max-height: 200px;
      overflow-y: auto;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  }
}

// 选择目标主机对话框样式
.select-host-dialog-content {
  padding: 8px;

  .select-btn-row {
    margin-bottom: 12px;
  }

  .execute-btn-row {
    margin-bottom: 16px;
  }

  .selected-hosts-area {
    border: 1px solid var(--el-border-color-light);
    border-radius: 4px;
    margin-top: 16px;

    .hosts-header {
      padding: 10px 16px;
      background: var(--el-fill-color-light);
      border-bottom: 1px solid var(--el-border-color-light);
      font-size: 14px;
      font-weight: 500;
      color: var(--el-text-color-regular);
    }

    .hosts-body {
      padding: 12px 16px;
      min-height: 100px;
      max-height: 300px;
      overflow-y: auto;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  }
}

.mb-3 {
  margin-bottom: 16px;
}

.me-1 {
  margin-right: 4px;
}

.me-2 {
  margin-right: 8px;
}

// 主机详情对话框样式
.host-detail-dialog-content {
  .url-badges {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .url-tag {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .dialog-pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}
</style>
