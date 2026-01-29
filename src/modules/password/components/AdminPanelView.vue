<template>
  <div class="ops-page-layout">
    <!-- 面包屑导航 -->
    <div class="ops-breadcrumb-bar">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item>
          <a @click.prevent="handleBack">申请审批</a>
        </el-breadcrumb-item>
        <el-breadcrumb-item>管理员面板</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <!-- 顶部操作栏：筛选 -->
    <div class="ops-filter-bar">
      <el-form :inline="true" size="small">
        <el-form-item label="选择主机">
          <AcmDeviceSelector
            v-model="selectedHosts"
            ci-types="linux"
            :options="{ label: '' }"
            @change="loadData"
            :showTagList="false"
          />
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索 IP/主机名/用户名"
            clearable
            style="width: 200px;"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon> 搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><RefreshRight /></el-icon> 重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 功能按钮区 -->
    <div class="ops-action-bar">
      <el-button type="primary" size="small" @click="handleBatchModify">
        批量修改
      </el-button>
      <el-button size="small" :disabled="!selectedRows.length" @click="handleSelectModify">
        选择修改
      </el-button>
      <el-button size="small" @click="handleCheckPasswordState">
        检查密码状态
      </el-button>
      <el-button size="small" @click="handleRevertPassword">
        重置密码
      </el-button>
      <!-- <el-button size="small" @click="handleExportPassword">
        导出密码
      </el-button> -->
      <el-button size="small" @click="handleImportInitPassword">
        导入初始密码
      </el-button>
      <el-button size="small" @click="handleDownloadTemplate">
        模板下载
      </el-button>
      <span style="flex: 1;"></span>
      <el-button class="toolbar-icon-btn" circle size="small" :loading="loading" @click="loadData" title="刷新">
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <!-- 数据表格 -->
    <div class="ops-table-wrapper">
      <el-table
        ref="tableRef"
        :data="filteredTableData"
        v-loading="loading"
       
        style="width: 100%"
        max-height="calc(100vh - 350px)"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" :selectable="isRowSelectable" />
        <el-table-column prop="host_key" label="IP" width="150" show-overflow-tooltip />
        <el-table-column prop="hostname" label="主机名" min-width="150" show-overflow-tooltip />
        <el-table-column prop="username" label="用户名" width="100" />
        <el-table-column prop="check_status" label="密码状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getCheckStatusType(row.check_status)" size="small">
              <i :class="['fa', getCheckStatusIcon(row.check_status)]"></i>
              {{ getCheckStatusText(row.check_status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="expired_date" label="密码过期时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.expired_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="last_setup_time" label="上次修改时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.last_setup_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="check_time" label="上次检查时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.check_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="operator_name" label="操作人" width="100" />
        <el-table-column label="操作" width="176" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button
                text
                type="primary"
                size="small"
                :disabled="row.setup_status === 'PROCESS' || row.setup_status === 'RESET'"
                @click="handleViewPassword(row)"
              >
                查看密码
              </el-button>
              <el-button
                text
                type="primary"
                size="small"
                :disabled="row.setup_status === 'PROCESS' || row.setup_status === 'RESET'"
                @click="handleViewHistory(row)"
              >
                操作历史
              </el-button>
              <el-button
                v-if="row.setup_status === 'PROCESS'"
                text
                type="info"
                size="small"
                disabled
              >
                修改中
              </el-button>
              <el-button
                v-if="row.setup_status === 'RESET'"
                text
                type="info"
                size="small"
                disabled
              >
                重置中
              </el-button>
            </div>
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
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="loadData"
        @current-change="loadData"
      />
    </div>

    <!-- 对话框组件 -->
    <ViewPasswordDialog
      v-model="viewPasswordDialogVisible"
      :server-id="currentServerId"
    />

    <OperationHistoryDialog
      v-model="operationHistoryDialogVisible"
      :assests-id="currentAssetsId"
      :username="currentUsername"
      :host-key="currentHostKey"
    />

    <BatchModifyDialog
      v-model="batchModifyDialogVisible"
      @success="handleDialogSuccess"
    />

    <SelectModifyDialog
      v-model="selectModifyDialogVisible"
      :comma-ip-str="selectedCommaIpStr"
      @success="handleDialogSuccess"
    />

    <CheckPasswordStateDialog
      v-model="checkPasswordStateDialogVisible"
      :comma-ip-str="selectedCommaIpStr"
      @success="handleDialogSuccess"
    />

    <RevertPasswordDialog
      v-model="revertPasswordDialogVisible"
      :comma-ip-str="selectedCommaIpStr"
      @success="handleDialogSuccess"
    />

    <ImportInitPasswordDialog
      v-model="importInitPasswordDialogVisible"
      @imported="handleDialogSuccess"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, RefreshRight } from '@element-plus/icons-vue'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import * as pmsApi from '@/modules/password/api'

// 对话框组件
import ViewPasswordDialog from './ViewPasswordDialog.vue'
import OperationHistoryDialog from './OperationHistoryDialog.vue'
import BatchModifyDialog from './BatchModifyDialog.vue'
import SelectModifyDialog from './SelectModifyDialog.vue'
import CheckPasswordStateDialog from './CheckPasswordStateDialog.vue'
import RevertPasswordDialog from './RevertPasswordDialog.vue'
import ImportInitPasswordDialog from './ImportInitPasswordDialog.vue'

const emit = defineEmits(['back'])

const loading = ref(false)
const tableData = ref([])
const tableRef = ref(null)
const selectedRows = ref([])
const selectedHosts = ref([])
const searchKeyword = ref('')
const appliedSearch = ref('')

// 对话框可见状态
const viewPasswordDialogVisible = ref(false)
const operationHistoryDialogVisible = ref(false)
const batchModifyDialogVisible = ref(false)
const selectModifyDialogVisible = ref(false)
const checkPasswordStateDialogVisible = ref(false)
const revertPasswordDialogVisible = ref(false)
const importInitPasswordDialogVisible = ref(false)

// 当前选中行的相关信息
const currentServerId = ref('')
const currentAssetsId = ref('')
const currentUsername = ref('')
const currentHostKey = ref('')

// 选中的服务器逗号分隔字符串，格式: assests_id@@host_key@@username
const selectedCommaIpStr = computed(() => {
  if (!selectedRows.value.length) return ''
  return selectedRows.value.map(row => {
    return `${row.assests_id || row.id}@@${row.host_key}@@${row.username}`
  }).join(',')
})

// 过滤后的表格数据
const filteredTableData = computed(() => {
  if (!appliedSearch.value) {
    return tableData.value
  }
  const keyword = appliedSearch.value.toLowerCase()
  return tableData.value.filter(row => {
    return (
      (row.host_key && row.host_key.toLowerCase().includes(keyword)) ||
      (row.hostname && row.hostname.toLowerCase().includes(keyword)) ||
      (row.username && row.username.toLowerCase().includes(keyword))
    )
  })
})

function handleSearch() {
  appliedSearch.value = searchKeyword.value
  pagination.page = 1
}

function handleReset() {
  searchKeyword.value = ''
  appliedSearch.value = ''
  selectedHosts.value = []
  pagination.page = 1
  loadData()
}

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 检查状态配置
const checkStatusConfig = {
  USABLE: { text: '可用', type: 'success', icon: 'fa-check' },
  UNABLE: { text: '不可用', type: 'danger', icon: 'fa-times' },
  PROCESSING: { text: '检查中', type: 'primary', icon: 'fa-spinner fa-spin' },
  UNKNOWN: { text: '未知', type: 'warning', icon: 'fa-question' }
}

onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  try {
    // 构建设备筛选参数
    let assestsObjects = '@@(linux)'
    if (selectedHosts.value && selectedHosts.value.length > 0) {
      assestsObjects = selectedHosts.value.map(h => h.key || h.value || h).join(',')
    }

    const response = await pmsApi.getPmsServerList(assestsObjects)
    const result = response?.data || response
    tableData.value = result?.records || []
    pagination.total = result?.total || tableData.value.length
  } catch (error) {
    console.error('Failed to load server list:', error)
    ElMessage.error('加载服务器列表失败')
  } finally {
    loading.value = false
  }
}

function handleSelectionChange(selection) {
  selectedRows.value = selection
}

// 行是否可选（处理中或重置中的行不可选）
function isRowSelectable(row) {
  return row.setup_status !== 'PROCESS' && row.setup_status !== 'RESET'
}

function getCheckStatusType(status) {
  return checkStatusConfig[status]?.type || 'info'
}

function getCheckStatusText(status) {
  return checkStatusConfig[status]?.text || status
}

function getCheckStatusIcon(status) {
  return checkStatusConfig[status]?.icon || 'fa-question'
}

function formatTime(time) {
  if (!time) return '-'
  try {
    if (typeof time === 'string' && time.includes('T')) {
      return time.replace('T', ' ').split('.')[0]
    }
    const date = new Date(time)
    if (isNaN(date.getTime())) return time
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  } catch {
    return time
  }
}

// 操作handlers
function handleBack() {
  emit('back')
}

function handleBatchModify() {
  batchModifyDialogVisible.value = true
}

function handleSelectModify() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要修改的服务器')
    return
  }
  selectModifyDialogVisible.value = true
}

function handleCheckPasswordState() {
  checkPasswordStateDialogVisible.value = true
}

function handleRevertPassword() {
  revertPasswordDialogVisible.value = true
}

function handleExportPassword() {
  pmsApi.exportPasswords()
}

function handleImportInitPassword() {
  importInitPasswordDialogVisible.value = true
}

function handleDownloadTemplate() {
  // 下载模板文件（位于 public/templates/pms/ 目录）
  const link = document.createElement('a')
  link.href = '/templates/pms/host_password_template.xlsx'
  link.download = 'host_password_template.xlsx'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function handleViewPassword(row) {
  currentServerId.value = row.id
  viewPasswordDialogVisible.value = true
}

function handleViewHistory(row) {
  currentAssetsId.value = row.assests_id || row.id
  currentUsername.value = row.username
  currentHostKey.value = row.host_key
  operationHistoryDialogVisible.value = true
}

function handleDialogSuccess() {
  loadData()
}
</script>

<style scoped lang="scss">
// 面包屑导航栏
.ops-breadcrumb-bar {
  flex-shrink: 0;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid #ebeef5;

  :deep(.el-breadcrumb) {
    font-size: 14px;

    .el-breadcrumb__item {
      .el-breadcrumb__inner {
        a {
          color: #409eff;
          font-weight: normal;
          cursor: pointer;

          &:hover {
            color: #66b1ff;
          }
        }
      }

      &:last-child .el-breadcrumb__inner {
        color: #606266;
        font-weight: 500;
      }
    }
  }
}

// 组件特有样式
.action-buttons {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
</style>
