<template>
  <div class="ops-page-layout">
    <!-- 筛选栏 -->
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small">
        <el-form-item label="关键词">
          <el-input v-model="searchKeyword" placeholder="搜索..." clearable style="width: 240px;">
            <template #prefix>
              <el-icon>
                <Search />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
        <!-- <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSearch">
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

    <!-- 功能按钮区 -->
    <div class="ops-action-bar">
      <el-button type="primary" size="small" :icon="Plus" @click="handleCreate">
        新增任务
      </el-button>
      <el-button size="small" :disabled="!selectedRows.length" @click="() => handleBatchToggle(selectedRows)">
        <el-icon>
          <Grid />
        </el-icon>
        批量启停CRON
      </el-button>
      <span style="flex: 1;"></span>
      <el-button class="toolbar-icon-btn" circle size="small" :loading="loading" @click="handleRefresh" title="刷新">
        <el-icon v-show="!loading">
          <Refresh />
        </el-icon>
      </el-button>
    </div>

    <!-- 表格区域 -->
    <div class="ops-table-wrapper">
      <CronJobTable :data="filteredTableData" :loading="loading" :applet-map="appletMap"
        @selection-change="handleSelectionChange" @edit="handleEdit" @delete="handleDelete" @copy="handleCopy"
        @execute="handleExecuteOnce" @toggle-status="handleToggleStatus" @query-next-time="handleQueryNextTime" />
    </div>

    <!-- 编辑表单对话框（按需加载） -->
    <CronJobFormDialog v-if="formDialogVisible" v-model="formDialogVisible" :editing-id="editingId"
      :applets-list="appletsList" @success="handleFormSuccess" />

    <!-- 下次执行时间对话框（按需加载） -->
    <NextExecutionTimeDialog v-if="nextTimeVisible" v-model="nextTimeVisible" :schedule-conf="currentScheduleConf" />
  </div>
</template>

<script setup>
import { ref, reactive, defineAsyncComponent } from 'vue'
import { Plus, Refresh, Grid, Search, RefreshRight } from '@element-plus/icons-vue'
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

// 筛选表单对象
const filters = reactive({
  keyword: ''
})

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

/**
 * 重置搜索
 */
function handleReset() {
  searchKeyword.value = ''
  handleSearch()
}
</script>

<style scoped lang="scss">
@use '@/styles/common.scss' as *;
</style>
