<template>
  <div class="feature-config-view">
    <!-- 标签页导航 -->
    <div class="config-tabs">
      <div
        v-for="tab in tabs"
        :key="tab.key"
        :class="['config-tab', { 'config-tab--active': activeTab === tab.key }]"
        @click="activeTab = tab.key"
      >
        <i :class="tab.icon"></i>
        {{ tab.label }}
      </div>
    </div>

    <!-- 标签页内容 -->
    <div class="config-content">
      <!-- 计划任务 -->
      <div v-if="activeTab === 'schedule'" class="schedule-task-panel">
        <div class="panel-header">
          <h3 class="panel-title">任务调度管理</h3>
          <div class="panel-toolbar">
            <el-input
              v-model="taskKeyword"
              size="small"
              placeholder=""
              clearable
              style="width: 200px"
            />
            <el-button size="small" @click="loadScheduleTasks">
              <i class="fa fa-search"></i>
            </el-button>
            <el-button size="small" @click="loadScheduleTasks">
              <i class="fa fa-sync"></i>
            </el-button>
          </div>
        </div>

        <el-table
          :data="scheduleTasks"
          v-loading="loadingTasks"
          border
          style="width: 100%"
        >
          <el-table-column prop="id" label="任务ID" width="120" />
          <el-table-column prop="description" label="任务描述" min-width="150" />
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
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="handleEditTask(row)">编辑</el-button>
              <el-button type="danger" link size="small" @click="handleDeleteTask(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="empty-state" v-if="!loadingTasks && !scheduleTasks.length">
          <i class="fa fa-database"></i>
          <p>没有数据</p>
        </div>
      </div>

      <!-- sudo模板 -->
      <div v-if="activeTab === 'sudo'" class="sudo-template-panel">
        <!-- 创建模板表单 -->
        <div class="create-form">
          <div class="form-row">
            <div class="form-item">
              <label>模板名称</label>
              <el-input v-model="newTemplate.name" placeholder="请输入模板名称" size="small" />
            </div>
            <div class="form-item">
              <label>描述</label>
              <el-input v-model="newTemplate.description" placeholder="请输入描述" size="small" />
            </div>
            <div class="form-item form-item--action">
              <el-button
                type="primary"
                plain
                size="small"
                :disabled="!newTemplate.name"
                @click="handleCreateTemplate"
              >
                <i class="fa fa-plus-circle"></i> 创建模板
              </el-button>
            </div>
          </div>
        </div>

        <!-- 模板列表 -->
        <div class="table-toolbar">
          <div class="table-toolbar__right">
            <el-button size="small" @click="loadSudoTemplates">
              <i class="fa fa-sync"></i>
            </el-button>
          </div>
        </div>

        <el-table
          :data="sudoTemplates"
          v-loading="loadingTemplates"
          border
          style="width: 100%"
        >
          <el-table-column prop="name" label="模板名称" min-width="150">
            <template #default="{ row }">
              <el-button type="primary" link @click="handleViewTemplate(row)">
                {{ row.name }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
          <el-table-column prop="created_at" label="创建时间" width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column prop="updated_at" label="修改时间" width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.updated_at) }}
            </template>
          </el-table-column>
          <el-table-column prop="created_by" label="创建者" width="100" />
          <el-table-column prop="updated_by" label="修改者" width="100" />
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-popconfirm
                title="确定要删除该模板吗？"
                @confirm="handleDeleteTemplate(row)"
              >
                <template #reference>
                  <el-button type="danger" plain size="small">
                    <i class="fa fa-minus-square"></i> 删除
                  </el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>

        <div class="empty-state" v-if="!loadingTemplates && !sudoTemplates.length">
          <i class="fa fa-file-alt"></i>
          <p>暂无sudo模板</p>
        </div>
      </div>
    </div>

    <!-- 模板详情对话框 -->
    <el-dialog
      v-model="showTemplateDialog"
      :title="currentTemplate?.name || '模板详情'"
      width="800px"
    >
      <div class="template-detail" v-if="currentTemplate">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="模板名称">{{ currentTemplate.name }}</el-descriptions-item>
          <el-descriptions-item label="描述">{{ currentTemplate.description }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(currentTemplate.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="创建者">{{ currentTemplate.created_by }}</el-descriptions-item>
        </el-descriptions>

        <div class="command-section">
          <div class="section-title">
            <span>sudo命令列表</span>
            <el-button type="primary" size="small" @click="handleAddCommand">
              <i class="fa fa-plus"></i> 添加命令
            </el-button>
          </div>
          <el-table :data="templateCommands" stripe size="small">
            <el-table-column prop="command" label="命令" min-width="200" />
            <el-table-column prop="description" label="描述" min-width="150" />
            <el-table-column prop="createdAt" label="创建时间" width="150" />
            <el-table-column label="操作" width="80">
              <template #default="{ row }">
                <el-button type="danger" link size="small" @click="handleDeleteCommand(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
      <template #footer>
        <el-button @click="showTemplateDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { apiService } from '@/core/api'
import * as userApi from '@/modules/user/api'

const tabs = [
  { key: 'schedule', label: '计划任务', icon: 'fa fa-clock' },
  { key: 'sudo', label: 'Sudo模板', icon: 'fa fa-user-shield' }
]

const activeTab = ref('schedule')
const loadingTasks = ref(false)
const loadingTemplates = ref(false)
const scheduleTasks = ref([])
const sudoTemplates = ref([])
const taskKeyword = ref('')


// 创建模板表单
const newTemplate = reactive({
  name: '',
  description: ''
})

// 模板详情
const showTemplateDialog = ref(false)
const currentTemplate = ref(null)
const templateCommands = ref([])

// 格式化日期时间
function formatDateTime(isoString) {
  if (!isoString) return '-'
  try {
    const date = new Date(isoString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  } catch {
    return isoString
  }
}

// 加载定时任务
async function loadScheduleTasks() {
  loadingTasks.value = true
  try {
    const response = await apiService.get('/jao/api/jao/cron/app', {
      params: { appCode: 'uim' }
    })
    scheduleTasks.value = response || []
  } catch (error) {
    console.error('Failed to load schedule tasks:', error)
    scheduleTasks.value = []
  } finally {
    loadingTasks.value = false
  }
}

// 加载sudo模板
async function loadSudoTemplates() {
  loadingTemplates.value = true
  try {
    const response = await userApi.getSudoTemplates()
    sudoTemplates.value = response?.records || response?.data?.records || []
  } catch (error) {
    console.error('Failed to load sudo templates:', error)
    sudoTemplates.value = []
  } finally {
    loadingTemplates.value = false
  }
}

// 计划任务操作
function handleEditTask(task) {
  console.log('编辑计划任务:', task)
}

function handleDeleteTask(task) {
  console.log('删除计划任务:', task)
}

// sudo模板操作
async function handleCreateTemplate() {
  if (!newTemplate.name) {
    ElMessage.warning('请输入模板名称')
    return
  }

  try {
    await userApi.createSudoTemplate({
      id: null,
      name: newTemplate.name,
      description: newTemplate.description
    })

    ElMessage.success('模板创建成功')
    newTemplate.name = ''
    newTemplate.description = ''
    loadSudoTemplates()
  } catch (error) {
    ElMessage.error('创建失败: ' + (error?.message || '未知错误'))
  }
}

async function handleViewTemplate(template) {
  currentTemplate.value = template
  showTemplateDialog.value = true

  // 加载模板命令
  try {
    const response = await userApi.getSudoCommandsByTemplate(template.id)
    templateCommands.value = response?.records || response?.data?.records || []
  } catch (error) {
    console.error('Failed to load template commands:', error)
    templateCommands.value = []
  }
}

async function handleDeleteTemplate(template) {
  try {
    await userApi.deleteSudoTemplate(template.id)

    ElMessage.success('模板已删除')
    loadSudoTemplates()
  } catch (error) {
    ElMessage.error('删除失败: ' + (error?.message || '未知错误'))
  }
}

function handleAddCommand() {
  console.log('添加sudo命令')
}

function handleDeleteCommand(command) {
  console.log('删除sudo命令:', command)
}

onMounted(() => {
  loadScheduleTasks()
  loadSudoTemplates()
})
</script>

<style scoped lang="scss">
.feature-config-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.config-tabs {
  display: flex;
  gap: 0;
  border-bottom: 2px solid #e5e7eb;
  background: #f9fafb;
}

.config-tab {
  padding: 12px 24px;
  font-size: 14px;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.2s;

  &:hover {
    color: #3b82f6;
    background: #eff6ff;
  }

  &--active {
    color: #3b82f6;
    border-bottom-color: #3b82f6;
    background: #fff;
    font-weight: 500;
  }

  i { font-size: 14px; }
}

.config-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;

  i { color: #3b82f6; }
}

// 创建表单
.create-form {
  margin-bottom: 20px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.form-row {
  display: flex;
  gap: 16px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.form-item {
  flex: 1;
  min-width: 200px;

  label {
    display: block;
    font-size: 13px;
    color: #64748b;
    margin-bottom: 6px;
  }

  &--action {
    flex: 0 0 auto;
    min-width: auto;
  }
}

.table-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #9ca3af;

  i {
    font-size: 48px;
    margin-bottom: 16px;
  }

  p {
    margin: 0;
    font-size: 14px;
  }
}

// 模板详情
.template-detail {
  .command-section {
    margin-top: 20px;
  }

  .section-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    font-weight: 600;
    color: #1e293b;
  }
}
</style>
