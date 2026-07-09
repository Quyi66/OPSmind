<template>
  <div class="ops-page-layout">
    <!-- 筛选区域 -->
    <div class="ops-filter-bar">
      <el-form :inline="true" size="small">
        <el-form-item label="关键词">
          <el-input
            v-model="taskKeyword"
            placeholder="搜索任务"
            clearable
            style="width: 200px"
            maxlength="50"
            @keyup.enter="loadScheduleTasks"
          >
            <template #prefix>
              <i class="fa fa-search"></i>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadScheduleTasks">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleResetTaskFilter">
            <el-icon><RefreshRight /></el-icon>
            重置
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
        title="刷新"
      >
        <el-icon v-show="!loadingTasks"><Refresh /></el-icon>
      </el-button>
    </div>

    <!-- 数据表格 -->
    <div class="ops-table-wrapper">
      <el-table :data="scheduleTasks" v-loading="loadingTasks" max-height="calc(100vh - 304px)">
        <el-table-column prop="id" label="任务ID" width="120" />
        <el-table-column
          prop="description"
          label="任务备注"
          min-width="150"
          show-overflow-tooltip
        />
        <el-table-column prop="cronExpression" label="CRON表达式" width="140" />
        <el-table-column prop="appResource" label="应用资源" width="120" />
        <el-table-column prop="jobType" label="作业类型" width="100" />
        <el-table-column prop="status" label="当前状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'ENABLED' ? 'success' : 'info'" size="small">
              {{ row.status === 'ENABLED' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdBy" label="创建者" width="100" />
        <el-table-column prop="remark" label="查看" width="100" />
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="handleEditTask(row)">
              编辑
            </el-button>
            <el-button text type="danger" size="small" @click="handleDeleteTask(row)">
              删除
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
        @size-change="loadScheduleTasks"
        @current-change="loadScheduleTasks"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Search, Refresh, RefreshRight } from '@element-plus/icons-vue'
import { apiService } from '@/core/api'

const loadingTasks = ref(false)
const scheduleTasks = ref([])
const taskKeyword = ref('')

// 计划任务分页
const taskPage = ref(1)
const taskPageSize = ref(10)
const taskTotal = ref(0)

// 加载定时任务
async function loadScheduleTasks() {
  loadingTasks.value = true
  try {
    const response = await apiService.get('/workflow/api/workflow/cron/app', {
      params: { appCode: 'uim' }
    })
    const allTasks = response?.data || response || []
    // 客户端筛选
    if (taskKeyword.value) {
      const kw = taskKeyword.value.toLowerCase()
      scheduleTasks.value = allTasks.filter(
        task =>
          task.id?.toLowerCase().includes(kw) ||
          task.description?.toLowerCase().includes(kw) ||
          task.cronExpression?.toLowerCase().includes(kw)
      )
    } else {
      scheduleTasks.value = allTasks
    }
    taskTotal.value = scheduleTasks.value.length
  } catch (error) {
    console.error('Failed to load schedule tasks:', error)
    scheduleTasks.value = []
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
