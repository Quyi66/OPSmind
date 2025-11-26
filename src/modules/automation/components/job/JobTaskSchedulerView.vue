<template>
  <div class="scheduler-view">
    <!-- DataTable 工具栏 -->
    <div class="datatable-toolbar">
      <div class="toolbar-left">
        <el-button type="primary" plain :icon="Plus" @click="handleCreate">
          新增任务
        </el-button>
        <el-button
          type="primary"
          plain
          :disabled="!selectedRows.length"
          @click="() => handleBatchToggle(selectedRows)"
        >
          <el-icon><Grid /></el-icon>
          批量启停CRON
        </el-button>
      </div>

      <div class="toolbar-right">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索..."
          clearable
          class="search-input"
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button :icon="RefreshRight" @click="handleRefresh" />
      </div>
    </div>

    <!-- 表格组件 -->
    <CronJobTable
      :data="filteredTableData"
      :loading="loading"
      :applet-map="appletMap"
      @selection-change="handleSelectionChange"
      @edit="handleEdit"
      @delete="handleDelete"
      @copy="handleCopy"
      @execute="handleExecuteOnce"
      @toggle-status="handleToggleStatus"
      @query-next-time="handleQueryNextTime"
    />

    <!-- 编辑表单对话框（按需加载） -->
    <CronJobFormDialog
      v-if="formDialogVisible"
      v-model="formDialogVisible"
      :editing-id="editingId"
      :applets-list="appletsList"
      @success="handleFormSuccess"
    />

    <!-- 下次执行时间对话框（按需加载） -->
    <NextExecutionTimeDialog
      v-if="nextTimeVisible"
      v-model="nextTimeVisible"
      :schedule-conf="currentScheduleConf"
    />
  </div>
</template>

<script setup>
import { ref, defineAsyncComponent } from 'vue'
import { Plus, RefreshRight, Grid, Search } from '@element-plus/icons-vue'
import CronJobTable from './components/CronJobTable.vue'
import { useCronJobList } from './composables/useCronJobList'
import { useCronJobActions } from './composables/useCronJobActions'
import { useAppletTranslation } from './composables/useAppletTranslation'

// 按需加载对话框组件
const CronJobFormDialog = defineAsyncComponent(() =>
  import('./components/CronJobFormDialog.vue')
)
const NextExecutionTimeDialog = defineAsyncComponent(() =>
  import('./components/NextExecutionTimeDialog.vue')
)

// 使用列表管理 composable
const {
  loading,
  tableData,
  searchKeyword,
  filteredTableData,
  selectedRows,
  fetchData,
  handleSelectionChange,
  handleSearch,
  handleRefresh
} = useCronJobList()

// 使用应用资源翻译 composable
const {
  appletMap,
  appletsList
} = useAppletTranslation()

// 使用操作行为 composable
const {
  handleToggleStatus,
  handleBatchToggle,
  handleExecuteOnce,
  handleCopy,
  handleDelete
} = useCronJobActions(fetchData)

// 对话框状态
const formDialogVisible = ref(false)
const nextTimeVisible = ref(false)
const editingId = ref(null)
const currentScheduleConf = ref('')

/**
 * 新增任务
 */
function handleCreate() {
  editingId.value = null
  formDialogVisible.value = true
}

/**
 * 编辑任务
 */
function handleEdit(row) {
  editingId.value = row.id
  formDialogVisible.value = true
}

/**
 * 查询下次执行时间
 */
function handleQueryNextTime(row) {
  currentScheduleConf.value = row.scheduleConf
  nextTimeVisible.value = true
}

/**
 * 表单成功回调
 */
function handleFormSuccess() {
  fetchData()
}
</script>

<style scoped>
.scheduler-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border-radius: 12px;
  padding: 20px;
}

.datatable-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 16px;
}

.toolbar-left {
  display: flex;
  gap: 12px;
  flex: 0 0 auto;
}

.toolbar-right {
  display: flex;
  gap: 8px;
  align-items: center;
  flex: 0 0 auto;
}

.search-input {
  width: 240px;
}
</style>
