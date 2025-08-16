<template>
  <div class="migration-dashboard">
    <div class="dashboard-header">
      <h1>模块迁移管理</h1>
      <p class="subtitle">Angular → Vue 3 迁移进度跟踪</p>
    </div>

    <!-- 总体进度 -->
    <div class="progress-overview">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="metric-card">
            <div class="metric">
              <div class="metric-value">{{ report.summary.completionRate }}%</div>
              <div class="metric-label">完成率</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="metric-card">
            <div class="metric">
              <div class="metric-value">{{ report.summary.completedModules }}</div>
              <div class="metric-label">已完成模块</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="metric-card">
            <div class="metric">
              <div class="metric-value">{{ report.summary.inProgressModules }}</div>
              <div class="metric-label">进行中模块</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="metric-card">
            <div class="metric">
              <div class="metric-value">{{ report.summary.blockedTasks }}</div>
              <div class="metric-label">阻塞任务</div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 迁移阶段分布 -->
    <el-card class="phase-distribution">
      <template #header>
        <span>迁移阶段分布</span>
      </template>
      <el-row :gutter="20">
        <el-col 
          v-for="phase in report.phases" 
          :key="phase.phase"
          :span="4"
        >
          <div class="phase-item">
            <div class="phase-count">{{ phase.count }}</div>
            <div class="phase-name">{{ getPhaseLabel(phase.phase) }}</div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 任务列表 -->
    <el-card class="task-list">
      <template #header>
        <div class="task-header">
          <span>迁移任务</span>
          <el-select v-model="selectedPhase" placeholder="筛选阶段" clearable>
            <el-option
              v-for="phase in Object.values(MIGRATION_PHASES)"
              :key="phase"
              :label="getPhaseLabel(phase)"
              :value="phase"
            />
          </el-select>
        </div>
      </template>

      <el-table :data="filteredTasks" style="width: 100%">
        <el-table-column prop="moduleName" label="模块名称" width="150" />
        <el-table-column prop="priority" label="优先级" width="100">
          <template #default="{ row }">
            <el-tag :type="getPriorityType(row.priority)">
              {{ getPriorityLabel(row.priority) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="phase" label="阶段" width="120">
          <template #default="{ row }">
            <el-tag :type="getPhaseType(row.phase)">
              {{ getPhaseLabel(row.phase) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="进度" width="200">
          <template #default="{ row }">
            <el-progress 
              :percentage="row.progress" 
              :status="row.progress === 100 ? 'success' : ''"
            />
          </template>
        </el-table-column>
        <el-table-column prop="estimatedEffort" label="预估工作量" width="120">
          <template #default="{ row }">
            {{ row.estimatedEffort }}周
          </template>
        </el-table-column>
        <el-table-column prop="assignee" label="负责人" width="120" />
        <el-table-column label="阻塞问题" width="100">
          <template #default="{ row }">
            <el-badge 
              v-if="getActiveBlockers(row).length > 0"
              :value="getActiveBlockers(row).length" 
              type="danger"
            >
              <el-button type="text" @click="showBlockers(row)">
                查看
              </el-button>
            </el-badge>
            <span v-else class="text-success">无</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="text" @click="showTaskDetail(row)">
              详情
            </el-button>
            <el-button type="text" @click="editTask(row)">
              编辑
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 任务详情对话框 -->
    <el-dialog 
      v-model="taskDetailVisible" 
      :title="selectedTask?.moduleName"
      width="60%"
    >
      <div v-if="selectedTask" class="task-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="模块代码">
            {{ selectedTask.moduleCode }}
          </el-descriptions-item>
          <el-descriptions-item label="优先级">
            <el-tag :type="getPriorityType(selectedTask.priority)">
              {{ getPriorityLabel(selectedTask.priority) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="当前阶段">
            <el-tag :type="getPhaseType(selectedTask.phase)">
              {{ getPhaseLabel(selectedTask.phase) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="预估工作量">
            {{ selectedTask.estimatedEffort }}周
          </el-descriptions-item>
          <el-descriptions-item label="负责人">
            {{ selectedTask.assignee }}
          </el-descriptions-item>
          <el-descriptions-item label="开始日期">
            {{ selectedTask.startDate || '未开始' }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="feature-progress">
          <h4>功能迁移进度</h4>
          <el-row :gutter="10">
            <el-col 
              v-for="feature in selectedTask.features" 
              :key="feature"
              :span="8"
            >
              <div class="feature-item">
                <el-checkbox 
                  :model-value="selectedTask.completedFeatures.includes(feature)"
                  @change="toggleFeature(selectedTask.moduleCode, feature)"
                >
                  {{ feature }}
                </el-checkbox>
              </div>
            </el-col>
          </el-row>
        </div>

        <div v-if="selectedTask.notes" class="task-notes">
          <h4>备注</h4>
          <p>{{ selectedTask.notes }}</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useMigrationTracker, MIGRATION_PHASES, MIGRATION_PRIORITY } from '@/core/migration/MigrationTracker.js'

const {
  tasks,
  report,
  markFeatureCompleted,
  getMigrationTask
} = useMigrationTracker()

// 响应式数据
const selectedPhase = ref('')
const taskDetailVisible = ref(false)
const selectedTask = ref(null)

// 计算属性
const filteredTasks = computed(() => {
  if (!selectedPhase.value) return tasks.value
  return tasks.value.filter(task => task.phase === selectedPhase.value)
})

// 方法
const getPhaseLabel = (phase) => {
  const labels = {
    [MIGRATION_PHASES.PLANNING]: '规划',
    [MIGRATION_PHASES.ANALYSIS]: '分析',
    [MIGRATION_PHASES.DEVELOPMENT]: '开发',
    [MIGRATION_PHASES.TESTING]: '测试',
    [MIGRATION_PHASES.DEPLOYMENT]: '部署',
    [MIGRATION_PHASES.COMPLETED]: '完成',
    [MIGRATION_PHASES.CANCELLED]: '取消'
  }
  return labels[phase] || phase
}

const getPriorityLabel = (priority) => {
  const labels = {
    [MIGRATION_PRIORITY.CRITICAL]: '关键',
    [MIGRATION_PRIORITY.HIGH]: '高',
    [MIGRATION_PRIORITY.MEDIUM]: '中',
    [MIGRATION_PRIORITY.LOW]: '低'
  }
  return labels[priority] || priority
}

const getPhaseType = (phase) => {
  const types = {
    [MIGRATION_PHASES.PLANNING]: 'info',
    [MIGRATION_PHASES.ANALYSIS]: 'warning',
    [MIGRATION_PHASES.DEVELOPMENT]: 'primary',
    [MIGRATION_PHASES.TESTING]: 'warning',
    [MIGRATION_PHASES.DEPLOYMENT]: 'success',
    [MIGRATION_PHASES.COMPLETED]: 'success',
    [MIGRATION_PHASES.CANCELLED]: 'danger'
  }
  return types[phase] || 'info'
}

const getPriorityType = (priority) => {
  const types = {
    [MIGRATION_PRIORITY.CRITICAL]: 'danger',
    [MIGRATION_PRIORITY.HIGH]: 'warning',
    [MIGRATION_PRIORITY.MEDIUM]: 'primary',
    [MIGRATION_PRIORITY.LOW]: 'info'
  }
  return types[priority] || 'info'
}

const getActiveBlockers = (task) => {
  return task.blockers?.filter(blocker => !blocker.resolved) || []
}

const showTaskDetail = (task) => {
  selectedTask.value = task
  taskDetailVisible.value = true
}

const editTask = (task) => {
  // 实现编辑功能
  console.log('Edit task:', task.moduleCode)
}

const showBlockers = (task) => {
  // 显示阻塞问题
  console.log('Show blockers for:', task.moduleCode)
}

const toggleFeature = (moduleCode, feature) => {
  markFeatureCompleted(moduleCode, feature)
  // 刷新选中的任务数据
  selectedTask.value = getMigrationTask(moduleCode)
}
</script>

<style scoped>
.migration-dashboard {
  padding: 20px;
}

.dashboard-header {
  margin-bottom: 20px;
}

.dashboard-header h1 {
  margin: 0;
  color: #303133;
}

.subtitle {
  color: #909399;
  margin: 5px 0 0 0;
}

.progress-overview {
  margin-bottom: 20px;
}

.metric-card {
  text-align: center;
}

.metric-value {
  font-size: 2em;
  font-weight: bold;
  color: #409eff;
}

.metric-label {
  color: #909399;
  margin-top: 5px;
}

.phase-distribution {
  margin-bottom: 20px;
}

.phase-item {
  text-align: center;
  padding: 10px;
}

.phase-count {
  font-size: 1.5em;
  font-weight: bold;
  color: #303133;
}

.phase-name {
  color: #909399;
  margin-top: 5px;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-detail {
  padding: 20px 0;
}

.feature-progress {
  margin: 20px 0;
}

.feature-item {
  margin: 10px 0;
}

.task-notes {
  margin: 20px 0;
}

.text-success {
  color: #67c23a;
}
</style>
