<template>
  <div class="linux-yum-manage">
    <!-- 描述区域 -->
    <div class="desc-section">
      <p class="desc-text">用于管理YUM源，进行统一的YUM源配置和变更。</p>
    </div>

    <!-- Tab 导航 -->
    <el-tabs v-model="activeTab" class="yum-tabs">
        <el-tab-pane name="custom_repo">
          <template #label>
            <span><i class="fa fa-user-cog" /> YUM源配置</span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="repo_list">
          <template #label>
            <span><i class="fa fa-tools" /> YUM源清单</span>
          </template>
        </el-tab-pane>
      </el-tabs>

    <!-- YUM源配置 Tab -->
    <div v-if="activeTab === 'custom_repo'" class="tab-content">
      <div class="card-section">
        <div class="card-header">
          <span class="card-title">配置</span>
        </div>
        <div class="card-body">
          <!-- 操作按钮和搜索 -->
          <div class="toolbar-row">
            <div class="toolbar-left">
              <el-button type="primary" plain size="small" @click="handleAddRepo">
                <i class="fa fa-plus" /> YUM源配置录入
              </el-button>
            </div>
            <div class="toolbar-right">
              <el-input
                v-model="filterText"
                placeholder="搜索..."
                size="small"
                style="width: 200px"
                clearable
                @input="handleFilter"
              >
                <template #prefix>
                  <i class="fa fa-search" />
                </template>
              </el-input>
              <el-button size="small" @click="handleRefresh">
                <i class="fa fa-sync" />
              </el-button>
            </div>
          </div>

          <!-- YUM源配置表格 -->
          <el-table
            v-loading="loading"
            :data="customRepoData"
            border
            style="width: 100%"
            size="small"
          >
            <el-table-column prop="name" label="YUM源名称" min-width="120" sortable />
            <el-table-column prop="description" label="描述" min-width="120" sortable />
            <el-table-column prop="baseurl" label="YUM源地址" min-width="280" sortable show-overflow-tooltip />
            <el-table-column prop="file" label="YUM源文件" min-width="180" sortable show-overflow-tooltip />
            <el-table-column label="操作" width="132" fixed="right" align="center">
              <template #default="{ row }">
                <el-button text type="primary" size="small" @click="handleEdit(row)">
                  编辑
                </el-button>
                <el-button text type="danger" size="small" @click="handleDelete(row)">
                  删除
                </el-button>
                <el-button text type="primary" size="small" @click="handleConfig(row)">
                  配置
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 分页 -->
          <div class="table-footer">
            <div class="pagination-info">
              <el-select v-model="pagination.pageSize" size="small" style="width: 70px" @change="handleSizeChange">
                <el-option :value="10" label="10" />
                <el-option :value="20" label="20" />
                <el-option :value="50" label="50" />
                <el-option :value="100" label="100" />
              </el-select>
              <span class="page-info">{{ paginationInfo }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- YUM源清单 Tab -->
    <div v-if="activeTab === 'repo_list'" class="tab-content">
      <div class="card-section">
        <div class="card-header">
          <span class="card-title">清单</span>
        </div>
        <div class="card-body">
          <!-- 操作按钮和搜索 -->
          <div class="toolbar-row">
            <div class="toolbar-left">
              <el-button type="primary" plain size="small" @click="handleScanRepoList">
                <i class="fa fa-th-list" /> YUM源清单扫描
              </el-button>
            </div>
            <div class="toolbar-right">
              <el-input
                v-model="hostFilterText"
                placeholder="搜索..."
                size="small"
                style="width: 200px"
                clearable
                @input="handleHostFilter"
              >
                <template #prefix>
                  <i class="fa fa-search" />
                </template>
              </el-input>
              <el-button size="small" @click="loadHostData">
                <i class="fa fa-sync" />
              </el-button>
            </div>
          </div>

          <!-- 主机列表表格 -->
          <el-table
            v-loading="hostLoading"
            :data="hostTableData"
            border
            style="width: 100%"
            size="small"
          >
            <el-table-column prop="$data_owner" label="主机" min-width="150">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="handleViewHostDetail(row)">
                  {{ row.$data_owner }}
                </el-button>
              </template>
            </el-table-column>
            <el-table-column prop="os_distro" label="操作系统" min-width="200" sortable />
            <el-table-column prop="os_version" label="操作系统版本" min-width="150" sortable />
            <el-table-column prop="yum_count" label="已配置yum源数量" min-width="130" sortable />
          </el-table>

          <!-- 分页 -->
          <div class="table-footer">
            <div class="pagination-info">
              <el-select v-model="hostPagination.pageSize" size="small" style="width: 70px" @change="handleHostSizeChange">
                <el-option :value="10" label="10" />
                <el-option :value="20" label="20" />
                <el-option :value="50" label="50" />
                <el-option :value="500" label="500" />
              </el-select>
              <span class="page-info">{{ hostPaginationInfo }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加/编辑YUM源对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingRepo ? '编辑YUM源' : 'YUM源配置录入'"
      width="600px"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="YUM源名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入YUM源名称" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="formData.description" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="YUM源地址" prop="baseurl">
          <el-input v-model="formData.baseurl" placeholder="请输入YUM源地址" />
        </el-form-item>
        <el-form-item label="YUM源文件" prop="file">
          <el-input v-model="formData.file" placeholder="如：/etc/yum.repos.d/local.repo" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 设备选择器对话框 (用于配置和扫描) -->
    <HostSelectorDialog
      v-model:visible="deviceSelectorVisible"
      v-model="selectedDevices"
      @confirm="handleDeviceSelected"
    />

    <!-- 选择目标主机对话框 -->
    <el-dialog
      v-model="selectHostDialogVisible"
      title="选择目标主机"
      width="800px"
      :close-on-click-modal="false"
    >
      <div class="select-host-dialog-content">
        <!-- 选择按钮 -->
        <div class="select-btn-row">
          <el-button @click="openHostSelector">
            <i class="fa fa-list" /> 选择
          </el-button>
        </div>

        <!-- 执行按钮 -->
        <div class="execute-btn-row">
          <el-button type="primary" :loading="jobExecuting" @click="executeJob">
            <i class="fa fa-play-circle" /> {{ currentOperation === 'config' ? '开始配置' : '开始扫描' }}
          </el-button>
        </div>

        <!-- 已选主机展示区域 -->
        <div v-if="selectedDevices.length > 0" class="selected-hosts-area">
          <div class="hosts-header">
            <span>已选主机 ({{ selectedDevices.length }})</span>
          </div>
          <div class="hosts-body">
            <el-tag
              v-for="(host, index) in selectedDevices"
              :key="index"
              closable
              type="info"
              class="host-tag"
              @close="removeSelectedHost(index)"
            >
              {{ host.value || host.hostname || host }}
            </el-tag>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 主机YUM源详情对话框 -->
    <el-dialog
      v-model="hostDetailDialogVisible"
      :title="`${currentHostDetail?.$data_owner || ''} - YUM源详情`"
      width="1000px"
      :close-on-click-modal="false"
    >
      <div class="host-detail-dialog-content">
        <!-- 工具栏 -->
        <div class="toolbar-row">
          <div class="toolbar-left">
            <el-form-item label="状态：" size="small" style="margin-bottom: 0;">
              <el-select v-model="detailRepoStatus" placeholder="请选择" style="width: 120px" @change="loadHostRepoDetail">
                <el-option value="enabled" label="启用" />
                <el-option value="disabled" label="禁用" />
              </el-select>
            </el-form-item>
          </div>
          <div class="toolbar-right">
            <el-button size="small" @click="loadHostRepoDetail">
              <i class="fa fa-sync" /> 刷新
            </el-button>
            <el-button size="small" @click="exportHostRepoDetail">
              <i class="fa fa-download" /> 导出
            </el-button>
          </div>
        </div>

        <!-- YUM源详情表格 -->
        <el-table
          v-loading="hostDetailLoading"
          :data="hostRepoDetailData"
          border
          style="width: 100%"
          size="small"
          max-height="400"
        >
          <el-table-column prop="$data_owner" label="主机" min-width="120" />
          <el-table-column prop="repo-name" label="名称" min-width="100" />
          <el-table-column prop="repo-pkgs" label="软件包数" min-width="80" />
          <el-table-column prop="repo-baseurl" label="Base URL" min-width="250" show-overflow-tooltip>
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
          <el-table-column prop="repo-status" label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="row['repo-status'] === 'enabled' ? 'success' : 'info'" size="small">
                {{ row['repo-status'] === 'enabled' ? 'Enabled' : 'Disabled' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="repo-size" label="大小" width="80" />
          <el-table-column prop="repo-updated" label="更新时间" width="150">
            <template #default="{ row }">
              {{ formatDate(row['repo-updated']) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="88" fixed="right" align="center">
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
              <el-button
                text
                type="danger"
                size="small"
                @click="handleDeleteRepo(row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <!-- 作业执行确认对话框 -->
    <el-dialog
      v-model="jobConfirmDialogVisible"
      :title="jobConfirmTitle"
      width="600px"
    >
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
            <el-descriptions-item label="描述">{{ configRepo.description || '-' }}</el-descriptions-item>
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
            <span><i class="fa fa-server me-2" />已选主机 ({{ selectedDevices.length }})</span>
          </div>
          <div class="list-body">
            <el-tag
              v-for="(host, index) in selectedDevices"
              :key="index"
              type="info"
              class="host-tag"
            >
              {{ host.value || host.hostname || host }}
            </el-tag>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="jobConfirmDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="jobExecuting" @click="executeJob">
          <i class="fa fa-play me-1" /> {{ jobConfirmButtonText }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { yumManageApi } from '../api'
import HostSelectorDialog from '@/modules/automation/components/command/dialogs/HostSelectorDialog.vue'
import { runJob } from '@/modules/automation/api/command'

// 常量定义
const YUM_JOB_ID = 'IxL8nr'  // YUM操作作业ID

// Tab状态
const activeTab = ref('custom_repo')

// 监听Tab切换，自动加载对应数据
watch(activeTab, (newTab) => {
  if (newTab === 'repo_list' && hostTableData.value.length === 0) {
    loadHostData()
  }
})

// ============ YUM源配置 Tab ============
const loading = ref(false)
const submitting = ref(false)
const filterText = ref('')
const customRepoData = ref([])
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 分页信息
const paginationInfo = computed(() => {
  const start = (pagination.page - 1) * pagination.pageSize + 1
  const end = Math.min(pagination.page * pagination.pageSize, pagination.total)
  return `${start} - ${end} / ${pagination.total}`
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
const hostPagination = reactive({
  page: 1,
  pageSize: 500,
  total: 0
})

// ============ 主机YUM源详情 ============
const hostDetailDialogVisible = ref(false)
const hostDetailLoading = ref(false)
const currentHostDetail = ref(null)
const hostRepoDetailData = ref([])
const detailRepoStatus = ref('enabled')

const hostPaginationInfo = computed(() => {
  const start = (hostPagination.page - 1) * hostPagination.pageSize + 1
  const end = Math.min(hostPagination.page * hostPagination.pageSize, hostPagination.total)
  return `${start} - ${end} / ${hostPagination.total}`
})

// ============ 数据加载方法 ============

// 加载YUM源配置数据
async function loadCustomRepoData() {
  loading.value = true
  try {
    const response = await yumManageApi.getYumConfigs()
    const rawData = response?.data || response || []
    // 解析 dataJson 字段
    customRepoData.value = rawData.map(item => {
      const dataJson = typeof item.dataJson === 'string' ? JSON.parse(item.dataJson) : (item.dataJson || {})
      return {
        id: item.id,
        name: dataJson.name || '',
        description: dataJson.description || '',
        baseurl: dataJson.baseurl || '',
        file: dataJson.file || '',
        createTime: item.createTime,
        updateTime: item.updateTime
      }
    })
    pagination.total = customRepoData.value.length
  } catch (error) {
    console.error('Failed to load custom repo data:', error)
    customRepoData.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

// 加载主机YUM源清单数据
async function loadHostData() {
  hostLoading.value = true
  try {
    const response = await yumManageApi.getHostYumList()
    if (response?.data) {
      hostTableData.value = response.data.records || response.data || []
      hostPagination.total = response.data.total || hostTableData.value.length
    }
  } catch (error) {
    console.error('Failed to load host data:', error)
    hostTableData.value = []
    hostPagination.total = 0
  } finally {
    hostLoading.value = false
  }
}

// ============ 事件处理方法 ============

function handleFilter() {
  pagination.page = 1
  loadCustomRepoData()
}

function handleRefresh() {
  loadCustomRepoData()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  loadCustomRepoData()
}

function handleHostFilter() {
  hostPagination.page = 1
  loadHostData()
}

function handleHostSizeChange(size) {
  hostPagination.pageSize = size
  hostPagination.page = 1
  loadHostData()
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
    await ElMessageBox.confirm(
      `确定要删除 "${row.name}" 吗？此操作不可恢复。`,
      '警告',
      { type: 'warning' }
    )
    await yumManageApi.deleteYumConfig(row.id)
    ElMessage.success('删除成功')
    loadCustomRepoData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Delete failed:', error)
    }
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
      value: host.value || host.hostname || host.$data_owner
    }))

    // 构建作业参数
    const params = {
      hosts: hosts,
      func: currentOperation.value === 'scan' ? 'yum-list' : 'yum-config'
    }

    // 配置操作时添加额外参数
    if (currentOperation.value === 'config' && configRepo.value) {
      params.action = configAction.value
      params.repo_name = configRepo.value.name
      params.repo_desc = configRepo.value.description || ''
      params.repo_url = configRepo.value.baseurl
      params.repo_file = configRepo.value.file
      params.repo_status = 'true'
    }

    // 调用作业执行API
    await runJob(YUM_JOB_ID, { params })

    ElMessage.success(currentOperation.value === 'scan' ? '扫描任务已提交' : '配置任务已提交')
    selectHostDialogVisible.value = false

    // 扫描完成后刷新清单数据
    if (currentOperation.value === 'scan') {
      setTimeout(() => {
        loadHostData()
      }, 2000)
    }
  } catch (error) {
    console.error('Job execution failed:', error)
    ElMessage.error('任务执行失败: ' + (error.message || '未知错误'))
  } finally {
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
    await ElMessageBox.confirm(
      `确定要启用 "${row['repo-name']}" 吗？`,
      '确认',
      { type: 'info' }
    )

    // 构建参数执行作业
    const hosts = [{
      key: currentHostDetail.value.$data_owner_id || currentHostDetail.value.$id,
      value: currentHostDetail.value.$data_owner,
      assetType: 'linux'
    }]

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
    await ElMessageBox.confirm(
      `确定要禁用 "${row['repo-name']}" 吗？`,
      '确认',
      { type: 'warning' }
    )

    const hosts = [{
      key: currentHostDetail.value.$data_owner_id || currentHostDetail.value.$id,
      value: currentHostDetail.value.$data_owner,
      assetType: 'linux'
    }]

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
    await ElMessageBox.confirm(
      `确定要删除 "${row['repo-name']}" 吗？此操作不可恢复。`,
      '警告',
      { type: 'warning' }
    )

    const hosts = [{
      key: currentHostDetail.value.$data_owner_id || currentHostDetail.value.$id,
      value: currentHostDetail.value.$data_owner,
      assetType: 'linux'
    }]

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
.linux-yum-manage {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

// 描述区域
.desc-section {
  padding: 40px 24px;
  background: #fff;

  .desc-text {
    color: #17a2b8;
    font-size: 14px;
    margin: 0;
    font-style: italic;
  }
}

// Tab样式
.yum-tabs {
  :deep(.el-tabs__header) {
    margin: 0;
    padding: 0 16px;
    background: #fff;
    border-bottom: 2px solid #e9ecef;
  }

  :deep(.el-tabs__nav-wrap::after) {
    display: none;
  }

  :deep(.el-tabs__item) {
    height: 44px;
    line-height: 44px;
    font-size: 14px;
    color: #495057;

    &.is-active {
      color: #0d6efd;
      font-weight: 500;
    }

    i {
      margin-right: 6px;
    }
  }

  :deep(.el-tabs__active-bar) {
    background-color: #0d6efd;
    height: 3px;
  }

  :deep(.el-tabs__content) {
    display: none;
  }
}

// Tab内容区
.tab-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

// 卡片区域
.card-section {
  background: #fff;
  border: 1px solid #dee2e6;
  border-radius: 4px;

  .card-header {
    padding: 10px 16px;
    border-bottom: 1px solid #dee2e6;
    background: #f8f9fa;

    .card-title {
      font-size: 14px;
      font-weight: 500;
      color: #212529;
    }
  }

  .card-body {
    padding: 16px;
  }
}

// 工具栏 - 左右布局
.toolbar-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

// 操作按钮换行显示
.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
}

// 表格底部
.table-footer {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 12px 0;
  margin-top: 12px;

  .pagination-info {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #6c757d;
  }

  .page-info {
    margin-left: 8px;
  }
}

// 表格样式
:deep(.el-table) {
  font-size: 13px;

  .el-table__header th {
    background-color: #f8f9fa !important;
    color: #495057;
    font-weight: 500;
  }

  .el-table__cell {
    padding: 8px 0;
  }
}

// 按钮样式
:deep(.el-button--primary.is-plain) {

  &:hover {
    background: #0d6efd;
    color: #fff;
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
    border: 1px solid #e9ecef;
    border-radius: 4px;

    .list-header {
      padding: 10px 16px;
      background: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
      font-size: 14px;
      font-weight: 500;
      color: #495057;
    }

    .list-body {
      padding: 12px 16px;
      max-height: 200px;
      overflow-y: auto;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .host-tag {
      margin: 0;
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
    border: 1px solid #e9ecef;
    border-radius: 4px;
    margin-top: 16px;

    .hosts-header {
      padding: 10px 16px;
      background: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
      font-size: 14px;
      font-weight: 500;
      color: #495057;
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

    .host-tag {
      margin: 0;
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
  .toolbar-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

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
}
</style>
