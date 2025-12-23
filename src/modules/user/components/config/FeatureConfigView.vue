<template>
  <div class="feature-config-view">
    <!-- 简洁标签页导航 -->
    <el-tabs v-model="activeTab" class="simple-tabs">
      <el-tab-pane
        v-for="tab in tabs"
        :key="tab.key"
        :label="tab.label"
        :name="tab.key"
      >
        <template #label>
          <span class="tab-label">
            <i :class="tab.icon"></i>
            {{ tab.label }}
          </span>
        </template>
      </el-tab-pane>
    </el-tabs>

    <!-- 标签页内容 -->
    <div class="config-content ops-page-layout">
      <!-- 计划任务 -->
      <template v-if="activeTab === 'schedule'">
        <!-- 筛选栏 -->
        <div class="ops-filter-bar">
          <el-input
            v-model="taskKeyword"
            size="small"
            placeholder="搜索任务"
            clearable
            style="width: 200px"
            @keyup.enter="loadScheduleTasks"
          >
            <template #prefix>
              <i class="fa fa-search"></i>
            </template>
          </el-input>
          <el-button type="primary" size="small" @click="loadScheduleTasks">
            搜索
          </el-button>
        </div>

        <!-- 表格区域 -->
        <div class="ops-table-wrapper">
          <div class="table-toolbar-icons">
            <el-button class="toolbar-icon-btn" circle :loading="loadingTasks" @click="loadScheduleTasks" title="刷新">
              <el-icon><Refresh /></el-icon>
            </el-button>
          </div>
          <el-table
            :data="scheduleTasks"
            v-loading="loadingTasks"
            stripe
            max-height="calc(100vh - 280px)"
          >
            <el-table-column prop="id" label="任务ID" width="120" />
            <el-table-column prop="description" label="任务备注" min-width="150" show-overflow-tooltip />
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
                <el-button text type="primary" size="small" @click="handleEditTask(row)">编辑</el-button>
                <el-button text type="danger" size="small" @click="handleDeleteTask(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </template>

      <!-- sudo模板 -->
      <template v-if="activeTab === 'sudo'">
        <!-- 操作栏 -->
        <div class="ops-action-bar">
          <el-button type="primary" size="small" @click="showCreateTemplateDialog = true">
            <el-icon><Plus /></el-icon> 新建模板
          </el-button>
        </div>

        <!-- 表格区域 -->
        <div class="ops-table-wrapper">
          <div class="table-toolbar-icons">
            <el-button class="toolbar-icon-btn" circle :loading="loadingTemplates" @click="loadSudoTemplates" title="刷新">
              <el-icon><Refresh /></el-icon>
            </el-button>
          </div>
          <el-table
            :data="sudoTemplates"
            v-loading="loadingTemplates"
            stripe
            max-height="calc(100vh - 280px)"
          >
            <el-table-column prop="name" label="模板名称" min-width="150" />
            <el-table-column prop="description" label="备注" min-width="150" show-overflow-tooltip />
            <el-table-column prop="created_at" label="创建时间" width="180">
              <template #default="{ row }">
                {{ formatDateTime(row.created_at) }}
              </template>
            </el-table-column>
            <el-table-column prop="updated_at" label="修改时间" width="180">
              <template #default="{ row }">
                {{ formatDateTime(row.updated_at) }}
              </template>
            </el-table-column>
            <el-table-column prop="created_by" label="创建者" width="120" />
            <el-table-column prop="updated_by" label="修改者" width="120" />
            <el-table-column label="操作" width="110" fixed="right">
              <template #default="{ row }">
                <el-button text type="primary" size="small" @click="handleViewTemplate(row)">修改</el-button>
                <el-button text type="danger" size="small" @click="confirmDeleteTemplate(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </template>
    </div>

    <!-- 模板详情对话框 -->
    <el-dialog
      v-model="showTemplateDialog"
      :title="currentTemplate?.name || '模板详情'"
      width="1000px"
    >
      <div class="template-detail" v-if="currentTemplate">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="模板名称">{{ currentTemplate.name }}</el-descriptions-item>
          <el-descriptions-item label="备注">{{ currentTemplate.description }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(currentTemplate.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="创建者">{{ currentTemplate.created_by }}</el-descriptions-item>
        </el-descriptions>

        <div class="command-section">
          <div class="section-title">
            <span>sudo命令列表</span>
            <el-button type="primary" size="small" @click="showAddCommandDialog = true">
              <el-icon><Plus /></el-icon> 添加命令
            </el-button>
          </div>
          <el-table :data="templateCommands" stripe size="small" v-loading="loadingCommands">
            <el-table-column prop="command" label="命令" min-width="150" />
            <el-table-column prop="description" label="备注" min-width="150" />
            <el-table-column prop="created_at" label="创建时间" width="190">
              <template #default="{ row }">
                {{ formatDateTime(row.created_at) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="{ row }">
                <el-button text type="danger" size="small" @click="confirmDeleteCommand(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 分页器 -->
          <div class="command-pagination" v-if="commandTotal > 0">
            <el-pagination
              v-model:current-page="commandPage"
              v-model:page-size="commandPageSize"
              :total="commandTotal"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              size="small"
              background
              @size-change="loadTemplateCommands"
              @current-change="loadTemplateCommands"
            />
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showTemplateDialog = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 添加命令弹窗 -->
    <el-dialog
      v-model="showAddCommandDialog"
      title="添加 sudo 命令"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="addCommandFormRef"
        :model="newCommand"
        :rules="commandFormRules"
        label-width="80px"
      >
        <el-form-item label="命令" prop="command">
          <el-input v-model="newCommand.command" placeholder="请输入命令" />
        </el-form-item>
        <el-form-item label="备注" prop="description">
          <el-input
            v-model="newCommand.description"
            type="textarea"
            :rows="2"
            placeholder="请输入备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddCommandDialog = false">取消</el-button>
        <el-button type="primary" :loading="addingCommand" @click="handleAddCommand">添加</el-button>
      </template>
    </el-dialog>

    <!-- 新建模板弹窗 -->
    <el-dialog
      v-model="showCreateTemplateDialog"
      title="新建 sudo 模板"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="createTemplateFormRef"
        :model="newTemplate"
        :rules="templateFormRules"
        label-width="100px"
      >
        <el-form-item label="模板名称" prop="name">
          <el-input v-model="newTemplate.name" placeholder="请输入模板名称" />
        </el-form-item>
        <el-form-item label="备注" prop="description">
          <el-input
            v-model="newTemplate.description"
            type="textarea"
            :rows="3"
            placeholder="请输入模板备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateTemplateDialog = false">取消</el-button>
        <el-button type="primary" :loading="creatingTemplate" @click="handleCreateTemplate">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Plus } from '@element-plus/icons-vue'
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
const showCreateTemplateDialog = ref(false)
const createTemplateFormRef = ref(null)
const creatingTemplate = ref(false)
const templateFormRules = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }]
}

// 模板详情
const showTemplateDialog = ref(false)
const currentTemplate = ref(null)
const templateCommands = ref([])
const loadingCommands = ref(false)
const commandPage = ref(1)
const commandPageSize = ref(10)
const commandTotal = ref(0)

// 添加命令
const showAddCommandDialog = ref(false)
const addCommandFormRef = ref(null)
const addingCommand = ref(false)
const newCommand = reactive({
  command: '',
  description: ''
})
const commandFormRules = {
  command: [{ required: true, message: '请输入命令', trigger: 'blur' }]
}

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
  try {
    await createTemplateFormRef.value?.validate()
  } catch {
    return
  }

  creatingTemplate.value = true
  try {
    await userApi.createSudoTemplate({
      id: null,
      name: newTemplate.name,
      description: newTemplate.description
    })

    ElMessage.success('模板创建成功')
    showCreateTemplateDialog.value = false
    newTemplate.name = ''
    newTemplate.description = ''
    loadSudoTemplates()
  } catch (error) {
    ElMessage.error('创建失败: ' + (error?.message || '未知错误'))
  } finally {
    creatingTemplate.value = false
  }
}

async function handleViewTemplate(template) {
  currentTemplate.value = template
  commandPage.value = 1
  commandTotal.value = 0
  templateCommands.value = []
  showTemplateDialog.value = true
  await loadTemplateCommands()
}

// 加载模板命令
async function loadTemplateCommands() {
  if (!currentTemplate.value?.id) return

  loadingCommands.value = true
  try {
    const response = await userApi.getSudoCommandsByTemplate(currentTemplate.value.id, {
      page: commandPage.value,
      size: commandPageSize.value
    })
    templateCommands.value = response?.records || response?.data?.records || []
    commandTotal.value = response?.total || response?.data?.total || 0
  } catch (error) {
    console.error('Failed to load template commands:', error)
    templateCommands.value = []
  } finally {
    loadingCommands.value = false
  }
}

async function confirmDeleteTemplate(template) {
  try {
    await ElMessageBox.confirm(
      `确定要删除模板「${template.name}」吗？`,
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消'
      }
    )
    await handleDeleteTemplate(template)
  } catch {
    // 用户取消
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

// 添加命令
async function handleAddCommand() {
  try {
    await addCommandFormRef.value?.validate()
  } catch {
    return
  }

  addingCommand.value = true
  try {
    await userApi.createSudoCommand({
      templateId: currentTemplate.value.id,
      command: newCommand.command,
      description: newCommand.description
    })
    ElMessage.success('命令添加成功')
    showAddCommandDialog.value = false
    newCommand.command = ''
    newCommand.description = ''
    loadTemplateCommands()
  } catch (error) {
    ElMessage.error('添加失败: ' + (error?.message || '未知错误'))
  } finally {
    addingCommand.value = false
  }
}

// 删除命令确认
async function confirmDeleteCommand(command) {
  try {
    await ElMessageBox.confirm(
      `确定要删除命令「${command.command}」吗？`,
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消'
      }
    )
    await handleDeleteCommand(command)
  } catch {
    // 用户取消
  }
}

async function handleDeleteCommand(command) {
  try {
    await userApi.deleteSudoCommand(command.id)
    ElMessage.success('命令已删除')
    loadTemplateCommands()
  } catch (error) {
    ElMessage.error('删除失败: ' + (error?.message || '未知错误'))
  }
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

// 简洁的标签页样式
.simple-tabs {
  :deep(.el-tabs__header) {
    margin: 0;
    border-bottom: 1px solid #e4e7ed;
    background: transparent;
  }

  :deep(.el-tabs__nav-wrap::after) {
    display: none;
  }

  :deep(.el-tabs__item) {
    height: 40px;
    line-height: 40px;
    color: #606266;
    font-weight: normal;

    &:hover {
      color: #409eff;
    }

    &.is-active {
      color: #409eff;
      font-weight: 500;
    }
  }

  :deep(.el-tabs__active-bar) {
    background-color: #409eff;
  }

  .tab-label {
    display: flex;
    align-items: center;
    gap: 6px;

    i {
      font-size: 14px;
    }
  }
}

.config-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 0;
}

.filter-label {
  font-size: 13px;
  color: #606266;
  margin-left: 16px;
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

  .command-pagination {
    margin-top: 12px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
