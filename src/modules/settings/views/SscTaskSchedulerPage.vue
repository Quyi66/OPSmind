<template>
  <div class="ops-page-layout">
    <!-- 筛选区域 -->
    <div class="ops-filter-bar">
      <el-form :inline="true" size="small" @submit.prevent>
        <el-form-item :label="t('settings.user.keyword')">
          <el-input
            v-model="taskKeyword"
            :placeholder="t('settings.scheduler.search')"
            clearable
            style="width: 200px"
            maxlength="50"
            @keyup.enter="handleSearchTasks"
            @clear="handleSearchTasks"
          >
            <template #prefix>
              <i class="fa fa-search"></i>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearchTasks">
            <el-icon><Search /></el-icon>
            {{ t('common.search') }}
          </el-button>
          <el-button @click="handleResetTaskFilter">
            <el-icon><RefreshRight /></el-icon>
            {{ t('common.reset') }}
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 操作按钮区域 -->
    <div class="ops-action-bar">
      <span style="flex: 1"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="loadingTasks"
        @click="loadScheduleTasks"
        :title="t('common.refresh')"
      >
        <el-icon v-show="!loadingTasks"><Refresh /></el-icon>
      </el-button>
    </div>

    <!-- 数据表格 -->
    <div class="ops-table-wrapper">
      <el-table :data="paginatedTasks" v-loading="loadingTasks" max-height="calc(100vh - 304px)">
        <el-table-column
          prop="description"
          :label="t('settings.scheduler.description')"
          min-width="150"
          show-overflow-tooltip
        />
        <el-table-column prop="cronExpression" :label="t('settings.scheduler.cron')" width="140" />
        <el-table-column prop="jobType" :label="t('settings.scheduler.type')" width="100" />
        <el-table-column prop="status" :label="t('settings.scheduler.status')" min-width="130">
          <template #default="{ row }">
            <el-tag :type="row.status === 'ENABLED' ? 'success' : 'info'" size="small">
              {{ row.status === 'ENABLED' ? t('settings.scheduler.enabled') : t('settings.scheduler.disabled') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdBy" :label="t('settings.scheduler.creator')" width="100" />
        <el-table-column prop="remark" :label="t('common.view')" width="100" />
        <el-table-column :label="t('common.actions')" min-width="150" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="handleEditTask(row)">
              {{ t('common.edit') }}
            </el-button>
            <el-button text type="danger" size="small" @click="handleDeleteTask(row)">
              {{ t('common.delete') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="ops-pagination-wrapper" v-if="taskTotal > 0">
      <el-pagination
        v-model:current-page="taskPage"
        v-model:page-size="taskPageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="taskTotal"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handleTaskPageSizeChange"
      />
    </div>
  </div>
</template>

<script setup>
import { t } from '@/core/i18n'
import { ref, computed, onMounted } from 'vue'
import { Search, Refresh, RefreshRight } from '@element-plus/icons-vue'
import { apiService } from '@/core/api'

const loadingTasks = ref(false)
const scheduleTasks = ref([])
const taskKeyword = ref('')

// 计划任务分页
const taskPage = ref(1)
const taskPageSize = ref(10)
const taskTotal = ref(0)
const paginatedTasks = computed(() => {
  const start = (taskPage.value - 1) * taskPageSize.value
  return scheduleTasks.value.slice(start, start + taskPageSize.value)
})

function handleSearchTasks() {
  taskPage.value = 1
  loadScheduleTasks()
}

function handleTaskPageSizeChange() {
  taskPage.value = 1
}

// 加载定时任务
async function loadScheduleTasks() {
  loadingTasks.value = true
  try {
    const response = await apiService.get('/workflow/api/workflow/cron/app', {
      params: { appCode: 'uim' }
    })
    const allTasks = response?.data || response || []
    // 客户端筛选
    const kw = taskKeyword.value.trim().toLowerCase()
    if (kw) {
      scheduleTasks.value = allTasks.filter(
        task =>
          task.description?.toLowerCase().includes(kw) ||
          task.cronExpression?.toLowerCase().includes(kw)
      )
    } else {
      scheduleTasks.value = allTasks
    }
    taskTotal.value = scheduleTasks.value.length
    const lastPage = Math.max(1, Math.ceil(taskTotal.value / taskPageSize.value))
    taskPage.value = Math.min(taskPage.value, lastPage)
  } catch (error) {
    console.error('Failed to load schedule tasks:', error)
    scheduleTasks.value = []
    taskTotal.value = 0
    taskPage.value = 1
  } finally {
    loadingTasks.value = false
  }
}

// 重置任务筛选
function handleResetTaskFilter() {
  taskKeyword.value = ''
  taskPage.value = 1
  loadScheduleTasks()
}

// 计划任务操作
function handleEditTask(task) {
  // TODO: 实现编辑逻辑
}

function handleDeleteTask(task) {
  // TODO: 实现删除逻辑
}

onMounted(() => {
  loadScheduleTasks()
})
</script>

<style scoped lang="scss">
/* 样式复用全局样式 */
</style>
