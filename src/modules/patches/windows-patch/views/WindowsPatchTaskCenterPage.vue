<template>
  <div class="ops-page-layout win-patch-page">
    <el-tabs v-model="activeTab">
      <el-tab-pane label="任务列表" name="tasks">
        <div class="win-patch-task-pane">
          <!-- <WinPatchSummaryCards :items="summaryCards" compact /> -->

          <div class="ops-filter-bar win-patch-task-pane__filters">
            <el-form :inline="true" size="small">
              <el-form-item label="任务类型">
                <el-select v-model="filters.taskType" clearable placeholder="全部" style="width: 160px">
                  <el-option
                    v-for="item in WIN_PATCH_TASK_TYPE_OPTIONS"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" :loading="loading" @click="handleSearch">搜索</el-button>
                <el-button @click="handleReset">重置</el-button>
              </el-form-item>
            </el-form>
          </div>

          <div class="ops-action-bar">
            <el-switch v-model="autoPollingEnabled" active-text="自动轮询 5 秒" />
            <span style="flex: 1"></span>
            <el-button class="toolbar-icon-btn" circle size="small" :loading="loading" @click="loadTasks()">
              <el-icon v-show="!loading"><Refresh /></el-icon>
            </el-button>
          </div>

          <div class="ops-table-wrapper">
            <el-table v-loading="loading" :data="taskList" max-height="calc(100vh - 340px)">
            <el-table-column label="任务类型" width="120">
              <template #default="{ row }">
                <el-tag :type="getTaskTypeTagType(row)" size="small" effect="plain">
                  {{ getTaskTypeLabel(row) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="120">
              <template #default="{ row }">
                <el-tag
                  :type="getTaskStatusTagType(row)"
                  size="small"
                  :class="{ 'clickable-tag': getTaskRunId(row) }"
                  @click="getTaskRunId(row) && handleViewRunResult(row)"
                >
                  {{ getTaskStatusLabel(row) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="当前步骤" width="120">
              <template #default="{ row }">
                <el-tag
                  v-if="getTaskStepLabel(row) !== '-'"
                  :type="getTaskStepTagType(row)"
                  size="small"
                  effect="plain"
                >
                  {{ getTaskStepLabel(row) }}
                </el-tag>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="主机数" width="100" align="center">
              <template #default="{ row }">
                {{ pickValue(row, ['hostCount', 'host_count'], 0) }}
              </template>
            </el-table-column>
            <el-table-column label="创建人" min-width="120" show-overflow-tooltip>
              <template #default="{ row }">
                {{ pickValue(row, ['createdBy', 'created_by'], '-') }}
              </template>
            </el-table-column>
            <el-table-column label="创建时间" width="190" class-name="win-patch-table__time-column">
              <template #default="{ row }">
                {{ formatDateTime(pickValue(row, ['createdDate', 'created_date'], '')) }}
              </template>
            </el-table-column>
            <el-table-column label="完成时间" width="190" class-name="win-patch-table__time-column">
              <template #default="{ row }">
                {{ formatDateTime(pickValue(row, ['completedDate', 'completed_date'], '')) }}
              </template>
            </el-table-column>
            <el-table-column label="错误信息" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">
                {{ pickValue(row, ['errorMessage', 'error_message'], '-') }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150" fixed="right">
              <template #default="{ row }">
                <el-button text type="primary" size="small" @click="openTaskDrawer(row)">
                  {{ isStepControlledTask(row) && getTaskStatusLabel(row) === '待执行' ? '处理' : '任务详情' }}
                </el-button>
                <el-button text type="primary" size="small" @click="getTaskRunId(row) && handleViewRunResult(row)">
                  作业详情
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

          <WinPatchTaskDetailDrawer v-model="taskDrawerVisible" :task-id="currentTaskId" />
          <ExecuteResultDialog v-model:visible="showRunResultDialog" :run-id="currentRunId" />
        </div>
      </el-tab-pane>

      <el-tab-pane label="安装回滚历史" name="history">
        <WinPatchInstallHistoryPanel v-if="activeTab === 'history'" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Refresh } from '@element-plus/icons-vue'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import WinPatchInstallHistoryPanel from '../components/WinPatchInstallHistoryPanel.vue'
import WinPatchSummaryCards from '../components/WinPatchSummaryCards.vue'
import WinPatchTaskDetailDrawer from '../components/WinPatchTaskDetailDrawer.vue'
import { winPatchApi } from '../api'
import { WIN_PATCH_PAGE_SIZE_OPTIONS, WIN_PATCH_TASK_TYPE_OPTIONS } from '../constants'
import { useWinPatchPolling } from '../composables/useWinPatchPolling'
import {
  formatDateTime,
  formatNumber,
  getTaskStepLabel,
  getTaskStepTagType,
  getTaskStatusLabel,
  getTaskStatusTagType,
  getTaskTypeLabel,
  getTaskTypeTagType,
  isStepControlledTask,
  isTaskRunning,
  parsePageResponse,
  pickValue
} from '../utils'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const taskList = ref([])
const taskDrawerVisible = ref(false)
const currentTaskId = ref('')
const showRunResultDialog = ref(false)
const currentRunId = ref('')
const autoPollingEnabled = ref(true)
const activeTab = ref('tasks')

const filters = reactive({
  taskType: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const { isPolling, start, stop } = useWinPatchPolling(5000)
let loadTasksRequestId = 0

const summaryCards = computed(() => {
  const runningCount = taskList.value.filter(item => isTaskRunning(item)).length
  const completedCount = taskList.value.filter(item => getTaskStatusLabel(item) === '已完成').length
  const failedCount = taskList.value.filter(item => getTaskStatusLabel(item) === '失败').length

  return [
    {
      label: '任务总数',
      value: formatNumber(pagination.total),
      helper: '当前筛选条件下的任务数'
    },
    {
      label: '执行中',
      value: formatNumber(runningCount),
      helper: '当前页仍在运行的任务'
    },
    {
      label: '已完成',
      value: formatNumber(completedCount),
      helper: '当前页已完成任务'
    },
    {
      label: '失败',
      value: formatNumber(failedCount),
      helper: '当前页失败任务'
    }
  ]
})

async function loadTasks(options = {}) {
  const requestId = ++loadTasksRequestId
  loading.value = !options.silent

  try {
    const response = await winPatchApi.getTasks({
      taskType: filters.taskType || undefined,
      page: pagination.page - 1,
      size: pagination.pageSize
    })

    if (requestId !== loadTasksRequestId) {
      return
    }

    const page = parsePageResponse(response)
    taskList.value = page.content
    pagination.total = page.total

    if (
      activeTab.value !== 'tasks' ||
      !autoPollingEnabled.value ||
      !taskList.value.some(item => isTaskRunning(item))
    ) {
      stop()
    } else if (!isPolling.value) {
      start(() => loadTasks({ silent: true }))
    }
  } finally {
    if (requestId === loadTasksRequestId) {
      loading.value = false
    }
  }
}

function handleSearch() {
  pagination.page = 1
  loadTasks()
}

function handleReset() {
  filters.taskType = ''
  pagination.page = 1
  pagination.pageSize = 20
  loadTasks()
}

function handlePageChange(page) {
  pagination.page = page
  loadTasks()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  loadTasks()
}

function openTaskDrawer(task) {
  currentTaskId.value = pickValue(task, ['id'], '')
  taskDrawerVisible.value = Boolean(currentTaskId.value)
}

function getTaskRunId(task) {
  return String(pickValue(task, ['runId', 'run_id'], '')).trim()
}

function handleViewRunResult(task) {
  const runId = getTaskRunId(task)
  if (!runId) return

  currentRunId.value = runId
  showRunResultDialog.value = true
}

function normalizeTabValue(value) {
  return String(value || '').trim().toLowerCase() === 'history' ? 'history' : 'tasks'
}

watch(
  () => autoPollingEnabled.value,
  value => {
    if (!value) {
      stop()
      return
    }

    if (activeTab.value === 'tasks' && taskList.value.some(item => isTaskRunning(item))) {
      start(() => loadTasks({ silent: true }))
    }
  }
)

watch(
  () => route.query.tab,
  value => {
    activeTab.value = normalizeTabValue(value)
  },
  { immediate: true }
)

watch(activeTab, value => {
  const nextTab = normalizeTabValue(value)
  const currentTab = normalizeTabValue(route.query.tab)

  if (nextTab === 'history') {
    stop()

    if (nextTab !== currentTab) {
      router.replace({ path: '/patches/windowsRollback', query: { tab: 'history' } })
    }

    return
  }

  if (nextTab !== currentTab) {
    router.replace({ path: '/patches/windowsRollback' })
  }

  loadTasks()
})

onMounted(() => {
  if (activeTab.value === 'tasks') {
    loadTasks()
  }
})

watch(
  () => showRunResultDialog.value,
  visible => {
    if (!visible) {
      currentRunId.value = ''
    }
  }
)
</script>

<style scoped lang="scss">
.win-patch-page {
  gap: 12px;
}

.win-patch-task-pane {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.win-patch-task-pane__filters {
  margin-top: 4px;
}

.clickable-tag {
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

:deep(.win-patch-table__time-column .cell) {
  white-space: nowrap;
}
</style>
