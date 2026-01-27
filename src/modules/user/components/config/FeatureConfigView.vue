<template>
  <div class="ops-page-layout" style="padding: 0; gap: 0;">
    <!-- 标签页导航 -->
    <div class="type-tabs-wrapper">
      <div class="type-tabs">
        <div
          v-for="tab in tabs"
          :key="tab.key"
          :class="['type-tab', { active: activeTab === tab.key }]"
          @click="activeTab = tab.key"
        >
          <i :class="tab.icon"></i>
          <span>{{ tab.label }}</span>
        </div>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="ops-page-layout">
      <!-- 计划任务 -->
      <template v-if="activeTab === 'schedule'">
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
                <el-icon><Search /></el-icon> 搜索
              </el-button>
              <el-button @click="handleResetTaskFilter">
                <el-icon><RefreshRight /></el-icon> 重置
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 操作按钮区域 -->
        <div class="ops-action-bar">
          <span style="flex: 1;"></span>
          <el-button class="toolbar-icon-btn" circle size="small" :loading="loadingTasks" @click="loadScheduleTasks" title="刷新">
            <el-icon v-show="!loadingTasks"><Refresh /></el-icon>
          </el-button>
        </div>

        <!-- 数据表格 -->
        <div class="ops-table-wrapper">
          <el-table
            :data="scheduleTasks"
            v-loading="loadingTasks"
            stripe
            max-height="calc(100vh - 350px)"
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
            <el-table-column label="操作" width="110" fixed="right">
              <template #default="{ row }">
                <el-button text type="primary" size="small" @click="handleEditTask(row)">编辑</el-button>
                <el-button text type="danger" size="small" @click="handleDeleteTask(row)">删除</el-button>
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
      </template>

      <!-- sudo模板 -->
      <template v-if="activeTab === 'sudo'">
        <!-- 筛选区域 -->
        <div class="ops-filter-bar">
          <el-form :inline="true" size="small">
            <el-form-item label="关键词">
              <el-input
                v-model="templateKeyword"
                placeholder="模板名称/备注"
                clearable
                style="width: 200px"
                maxlength="50"
                @keyup.enter="handleSearchTemplates"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSearchTemplates">
                <el-icon><Search /></el-icon> 搜索
              </el-button>
              <el-button @click="handleResetTemplateFilter">
                <el-icon><RefreshRight /></el-icon> 重置
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 操作按钮区域 -->
        <div class="ops-action-bar">
          <el-button type="primary" size="small" @click="showCreateTemplateDialog = true">
            <el-icon><Plus /></el-icon> 新建模板
          </el-button>
          <span style="flex: 1;"></span>
          <el-button class="toolbar-icon-btn" circle size="small" :loading="loadingTemplates" @click="loadSudoTemplates" title="刷新">
            <el-icon v-show="!loadingTemplates"><Refresh /></el-icon>
          </el-button>
        </div>

        <!-- 数据表格 -->
        <div class="ops-table-wrapper">
          <el-table
            :data="sudoTemplates"
            v-loading="loadingTemplates"
            stripe
            max-height="calc(100vh - 300px)"
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

        <!-- 分页 -->
        <div class="ops-pagination-wrapper">
          <el-pagination
            v-model:current-page="templatePage"
            v-model:page-size="templatePageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="templateTotal"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @size-change="loadSudoTemplates"
            @current-change="loadSudoTemplates"
          />
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
          <el-input v-model="newCommand.command" placeholder="请输入命令" maxlength="500" />
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
          <el-input v-model="newTemplate.name" placeholder="请输入模板名称" maxlength="50" />
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
        <el-button type="primary" :loading="creatingTemplate" @click="handleCreateTemplate">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Plus, Search, RefreshRight } from '@element-plus/icons-vue'
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

// 计划任务分页
const taskPage = ref(1)
const taskPageSize = ref(10)
const taskTotal = ref(0)

// Sudo模板分页
const templatePage = ref(1)
const templatePageSize = ref(10)
const templateTotal = ref(0)

// Sudo模板筛选
const templateKeyword = ref('')

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
    if (typeof isoString === 'string' && isoString.includes('T')) {
      return isoString.replace('T', ' ').split('.')[0]
    }
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return isoString
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
    const allTasks = response || []
    // 客户端筛选
    if (taskKeyword.value) {
      const kw = taskKeyword.value.toLowerCase()
      scheduleTasks.value = allTasks.filter(task =>
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

// 加载sudo模板
async function loadSudoTemplates() {
  loadingTemplates.value = true
  try {
    const response = await userApi.getSudoTemplates({
      page: templatePage.value,
      size: templatePageSize.value,
      keyword: templateKeyword.value
    })
    sudoTemplates.value = response?.records || response?.data?.records || []
    templateTotal.value = response?.total || response?.data?.total || 0
  } catch (error) {
    console.error('Failed to load sudo templates:', error)
    sudoTemplates.value = []
  } finally {
    loadingTemplates.value = false
  }
}

// 搜索模板
function handleSearchTemplates() {
  templatePage.value = 1
  loadSudoTemplates()
}

// 重置模板筛选
function handleResetTemplateFilter() {
  templateKeyword.value = ''
  templatePage.value = 1
  loadSudoTemplates()
}

// 计划任务操作
function handleEditTask(task) {
}

function handleDeleteTask(task) {
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
// 标签页样式 - 与 AssetInfo.vue 保持一致
.type-tabs-wrapper {
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 16px;
}

.type-tabs {
  display: flex;
  gap: 4px;
}

.type-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  color: #606266;
  font-size: 14px;
  transition: all 0.2s;

  &:hover {
    color: #409eff;
  }

  &.active {
    color: #409eff;
    border-bottom-color: #409eff;
    font-weight: 500;
  }

  i {
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

  .command-pagination {
    margin-top: 12px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
