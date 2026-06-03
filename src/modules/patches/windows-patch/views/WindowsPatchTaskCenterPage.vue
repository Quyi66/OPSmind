<template>
  <div class="ops-page-layout win-patch-page">
    <div class="ops-filter-bar">
      <el-form :inline="true" size="small">
        <el-form-item label="主机">
          <el-input
            v-model="filters.hostId"
            placeholder="按主机 ID 过滤"
            clearable
            style="width: 220px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="ops-action-bar">
      <el-button
        type="primary"
        size="small"
        :disabled="rollbackableSelection.length === 0"
        @click="rollbackDialogVisible = true"
      >
        回滚选中记录
      </el-button>
      <el-button
        size="small"
        type="danger"
        :disabled="selectedRows.length === 0"
        @click="handleDeleteHistory"
      >
        删除选中记录
      </el-button>
      <span class="win-patch-selection-text">
        已选 {{ selectedRows.length }} 条记录（{{ rollbackableSelection.length }} 条可回滚）
      </span>
      <span style="flex: 1"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="loading"
        @click="loadLogs()"
      >
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <div class="ops-table-wrapper">
      <el-table
        v-loading="loading"
        :data="logList"
        height="100%"
        @selection-change="selection => (selectedRows = selection)"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column label="主机" width="130" show-overflow-tooltip>
          <template #default="{ row }">
            {{ pickValue(row, ['hostKey', 'host_key'], '-') }}
          </template>
        </el-table-column>
        <el-table-column label="KB 编号" width="130">
          <template #default="{ row }">
            {{ pickValue(row, ['kbNumber', 'kb_number'], '-') }}
          </template>
        </el-table-column>
        <el-table-column label="标题" min-width="240" show-overflow-tooltip>
          <template #default="{ row }">
            {{ pickValue(row, ['title'], '-') }}
          </template>
        </el-table-column>
        <el-table-column label="动作" width="100">
          <template #default="{ row }">
            <el-tag :type="getInstallActionTagType(row)" size="small" effect="plain">
              {{ getInstallActionLabel(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="结果" width="100">
          <template #default="{ row }">
            <el-tag :type="getInstallResultTagType(row)" size="small">
              {{ getInstallResultLabel(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="执行时间" width="190">
          <template #default="{ row }">
            {{ formatDateTime(pickValue(row, ['executedDate', 'executed_date'], '')) }}
          </template>
        </el-table-column>
        <el-table-column label="错误信息" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            {{ pickValue(row, ['errorMessage', 'error_message'], '-') }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              text
              type="primary"
              size="small"
              :disabled="!isRollbackSelectable(row)"
              @click="openSingleRollback(row)"
            >
              回滚
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="WIN_PATCH_PAGE_SIZE_OPTIONS"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <WinPatchRollbackConfirmDialog
      v-model="rollbackDialogVisible"
      :selected-rows="rollbackDialogRows"
      @submitted="handleRollbackSubmitted"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import WinPatchRollbackConfirmDialog from '../components/WinPatchRollbackConfirmDialog.vue'
import { winPatchApi } from '../api'
import { WIN_PATCH_PAGE_SIZE_OPTIONS } from '../constants'
import {
  formatDateTime,
  getInstallActionLabel,
  getInstallActionTagType,
  getInstallResultLabel,
  getInstallResultTagType,
  isRollbackSelectable,
  parsePageResponse,
  pickValue
} from '../utils'

const loading = ref(false)
const logList = ref([])
const selectedRows = ref([])
const rollbackDialogVisible = ref(false)
const rollbackDialogRows = ref([])

const filters = reactive({
  hostId: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const rollbackableSelection = computed(() =>
  selectedRows.value.filter(row => isRollbackSelectable(row))
)

async function loadLogs() {
  loading.value = true
  try {
    const response = await winPatchApi.getInstallLogs({
      hostId: filters.hostId || undefined,
      page: pagination.page - 1,
      size: pagination.pageSize
    })
    const page = parsePageResponse(response)
    logList.value = page.content
    pagination.total = page.total
    selectedRows.value = []
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  loadLogs()
}

function handleReset() {
  filters.hostId = ''
  pagination.page = 1
  pagination.pageSize = 20
  loadLogs()
}

function handlePageChange(page) {
  pagination.page = page
  loadLogs()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  loadLogs()
}

function openSingleRollback(row) {
  rollbackDialogRows.value = [row]
  rollbackDialogVisible.value = true
}

function handleRollbackSubmitted() {
  loadLogs()
}

async function handleDeleteHistory() {
  const ids = selectedRows.value.map(row => pickValue(row, ['id'], '')).filter(Boolean)
  if (ids.length === 0) return

  try {
    await ElMessageBox.confirm(`确定删除选中的 ${ids.length} 条历史记录？此操作仅删除前端记录，不影响目标机。`, '删除确认', {
      type: 'warning'
    })
    await winPatchApi.deleteRollbackHistory(ids)
    ElMessage.success('删除成功')
    loadLogs()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      console.error('删除回滚历史失败:', error)
      ElMessage.error('删除回滚历史失败')
    }
  }
}

onMounted(() => {
  loadLogs()
})
</script>

<style scoped lang="scss">
.win-patch-page {
  gap: 12px;
}

.win-patch-selection-text {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>
