<template>
  <div class="ops-page-layout">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small">
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部" style="width: 140px">
            <el-option label="全部" value="all" />
            <el-option label="待提交" value="new" />
            <el-option label="待审批" value="approving" />
            <el-option label="已拒绝" value="reject" />
            <el-option label="密码生成中" value="processing" />
            <el-option label="密码生成失败" value="failed" />
            <el-option label="密码已生成" value="success" />
            <el-option label="密码生成异常" value="exception" />
            <el-option label="密码已回收" value="recovered" />
            <el-option label="密码回收异常" value="fail_recovered" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索"
            clearable
            style="width: 200px"
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

    <!-- 功能按钮区 -->
    <div class="ops-action-bar">
      <el-button type="primary" size="small" @click="handleApply">
        <i class="fa fa-fist-raised"></i>
        申请临时密码
      </el-button>
      <el-button size="small" @click="handleBatchImport">
        <i class="fa fa-upload"></i>
        批量申请临时密码
      </el-button>
      <el-button plain size="small" @click="handleAdminPanel" v-if="hasAdminRole">
        <i class="fa fa-sign-in-alt"></i>
        进入管理员面板
      </el-button>
      <span style="flex: 1;"></span>
      <el-button class="toolbar-icon-btn" circle size="small" :loading="loading" @click="loadData" title="刷新">
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <!-- 数据表格 -->
    <div class="ops-table-wrapper">
      <el-table
        :data="tableData"
        v-loading="loading"
       
        style="width: 100%"
      >
        <el-table-column prop="intention" label="用途" min-width="180" show-overflow-tooltip />
        <el-table-column prop="applicant_name" label="申请人" width="100" />
        <el-table-column prop="username" label="账号" width="100" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.username }}
          </template>
        </el-table-column>
        <el-table-column prop="hostKeys" label="主机" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.hostKeys }}
          </template>
        </el-table-column>
        <el-table-column prop="effective_hours" label="时长" width="80">
          <template #default="{ row }">
            {{ row.effective_hours === 0 ? '永久' : row.effective_hours }}
          </template>
        </el-table-column>
        <el-table-column prop="expired_date" label="到期时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.expired_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
            <span v-if="row.status === 'exception' && row.failUserCount" class="text-danger ml-2">
              <i class="fa fa-key"></i> {{ row.failUserCount }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="apply_time" label="申请时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.apply_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="approve_time" label="审批时间" width="160">
          <template #default="{ row }">
            <div>{{ formatTime(row.approve_time) }}</div>
            <div v-if="row.approver_name" class="text-muted">{{ row.approver_name }}</div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <!-- 编辑 -->
              <el-button
                v-if="canEdit(row)"
                text
                type="primary"
                size="small"
                @click="handleEdit(row)"
              >
                编辑
              </el-button>
              <!-- 提交 -->
              <el-button
                v-if="canSubmit(row)"
                text
                type="primary"
                size="small"
                @click="handleSubmit(row)"
              >
                提交
              </el-button>
              <!-- 审批 -->
              <el-button
                v-if="canApprove(row)"
                text
                type="primary"
                size="small"
                @click="handleApprove(row)"
              >
                审批
              </el-button>
              <!-- 查看密码 -->
              <el-button
                v-if="canViewPassword(row)"
                text
                type="primary"
                size="small"
                @click="handleViewPassword(row)"
              >
                查看密码
              </el-button>
              <!-- 再次申请 -->
              <el-button
                v-if="canReapply(row)"
                text
                type="primary"
                size="small"
                @click="handleReapply(row)"
              >
                再次申请
              </el-button>
              <!-- 删除 -->
              <el-button
                v-if="canDelete(row)"
                text
                type="danger"
                size="small"
                @click="handleDelete(row)"
              >
                删除
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

    <!-- 申请临时密码弹窗 -->
    <ApplyPasswordDialog
      v-model="applyDialogVisible"
      :edit-data="editingRow"
      @saved="loadData"
    />

    <!-- 批量申请弹窗 -->
    <BatchImportDialog
      v-model="batchImportDialogVisible"
      @imported="loadData"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, inject } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, RefreshRight } from '@element-plus/icons-vue'
import * as pmsApi from '@/modules/password/api'
import ApplyPasswordDialog from './ApplyPasswordDialog.vue'
import BatchImportDialog from './BatchImportDialog.vue'

// 从父组件注入 goToAdminPanel 函数
const goToAdminPanel = inject('goToAdminPanel', null)

const loading = ref(false)
const tableData = ref([])
const applyDialogVisible = ref(false)
const batchImportDialogVisible = ref(false)
const editingRow = ref(null)

// 模拟当前用户登录ID（实际应从全局状态获取）
const currentUserLogin = ref('admin')
const hasAdminRole = ref(true) // 是否有管理员角色

const filters = reactive({
  status: 'all',
  keyword: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 状态配置
const statusConfig = {
  new: { text: '待提交', type: 'info' },
  approving: { text: '待审批', type: 'info' },
  reject: { text: '已拒绝', type: 'warning' },
  processing: { text: '密码生成中', type: 'info' },
  failed: { text: '密码生成失败', type: 'danger' },
  success: { text: '密码已生成', type: 'success' },
  exception: { text: '密码生成异常', type: 'danger' },
  recovered: { text: '密码已回收', type: 'info' },
  fail_recovered: { text: '密码回收异常', type: 'danger' }
}

function handleSearch() {
  pagination.page = 1
  loadData()
}

function handleReset() {
  filters.status = 'all'
  filters.keyword = ''
  pagination.page = 1
  pagination.pageSize = 10
  loadData()
}

onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  try {
    const response = await pmsApi.getApplicationList({
      status: filters.status,
      applicantLogin: currentUserLogin.value
    })

    const result = response?.data || response
    tableData.value = result?.records || []
    pagination.total = result?.total || 0
  } catch (error) {
    console.error('Failed to load applications:', error)
    ElMessage.error('加载申请列表失败')
  } finally {
    loading.value = false
  }
}

// 权限判断
function canEdit(row) {
  return row.status === 'new' && row.applicant_login === currentUserLogin.value
}

function canSubmit(row) {
  return row.status === 'new' && row.applicant_login === currentUserLogin.value
}

function canApprove(row) {
  return row.status === 'approving' && hasAdminRole.value
}

function canViewPassword(row) {
  return (row.status === 'success' || row.status === 'exception') &&
         row.applicant_login === currentUserLogin.value
}

function canReapply(row) {
  return row.status !== 'processing' && row.applicant_login === currentUserLogin.value
}

function canDelete(row) {
  return (row.status === 'new' || row.status === 'approving') &&
         row.applicant_login === currentUserLogin.value
}

function getStatusType(status) {
  return statusConfig[status]?.type || 'info'
}

function getStatusText(status) {
  return statusConfig[status]?.text || status
}

function formatTime(time) {
  if (!time) return ''
  try {
    const date = new Date(time)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return time
  }
}

function formatMultiLine(value) {
  if (!value) return ''
  return value.replace(/,/g, '\n')
}

// 操作handlers
function handleApply() {
  editingRow.value = null
  applyDialogVisible.value = true
}

function handleBatchImport() {
  batchImportDialogVisible.value = true
}

function handleAdminPanel() {
  if (goToAdminPanel) {
    goToAdminPanel()
  }
}

function handleEdit(row) {
  editingRow.value = row
  applyDialogVisible.value = true
}

async function handleSubmit(row) {
  try {
    await ElMessageBox.confirm('确定要提交此申请吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    })

    await pmsApi.submitApplication(row.id)
    ElMessage.success('提交成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to submit:', error)
      ElMessage.error('提交失败')
    }
  }
}

function handleApprove(row) {
  ElMessage.info('审批弹窗待实现')
}

function handleViewPassword(row) {
  ElMessage.info('查看密码弹窗待实现')
}

async function handleReapply(row) {
  try {
    await pmsApi.reapplyApplication(row.id)
    ElMessage.success('再次申请成功')
    loadData()
  } catch (error) {
    console.error('Failed to reapply:', error)
    ElMessage.error('再次申请失败')
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm('确定要删除此申请吗？删除后无法恢复。', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await pmsApi.deleteApplication(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to delete:', error)
      ElMessage.error('删除失败')
    }
  }
}
</script>

<style scoped lang="scss">
.application-approval-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
  background: #f8fafc;
}

.page-header {
  margin-bottom: 16px;

  .page-title {
    font-size: 18px;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }
}

.toolbar {
  margin-bottom: 16px;

  .toolbar-left {
    display: flex;
    gap: 10px;
  }
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

  .filter-left {
    display: flex;
    gap: 10px;
    align-items: center;
  }
}

.table-container {
  flex: 1;
  min-height: 0;
  background: #fff;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.multi-line-cell {
  white-space: pre-line;
  line-height: 1.4;
}

.action-buttons {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.text-danger {
  color: #ef4444;
}

.text-muted {
  color: #94a3b8;
  font-size: 12px;
}

.ml-2 {
  margin-left: 8px;
}
</style>
