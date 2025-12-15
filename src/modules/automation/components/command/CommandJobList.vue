<template>
  <div class="command-job-list">
    <!-- 标题栏 -->
    <div class="job-list__header">
    </div>

    <!-- 主体区域 -->
    <div class="job-list__body">
      <!-- 侧边栏 -->
      <aside class="ops-sidebar-nav ops-sidebar-nav--wide">
        <div class="ops-sidebar-header">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索"
            style="width: 140px"
            clearable
          />
          <el-dropdown trigger="click" @command="handleSortChange">
            <el-button class="sort-btn">
              <i class="fas fa-line-height"></i>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="title">
                  名称
                  <i v-if="sortField === 'title'" :class="sortOrder === 'asc' ? 'fas fa-sort-alpha-up' : 'fas fa-sort-alpha-down-alt'" style="float: right; padding-top: 4px;"></i>
                </el-dropdown-item>
                <el-dropdown-item command="updatedAt">
                  修改时间
                  <i v-if="sortField === 'updatedAt'" :class="sortOrder === 'asc' ? 'fas fa-sort-alpha-up' : 'fas fa-sort-alpha-down-alt'" style="float: right; padding-top: 4px;"></i>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button class="add-btn" @click="handleCreateJob" title="创建作业">
            <i class="fas fa-plus"></i>
          </el-button>
        </div>

        <div class="ops-sidebar-content">
          <div v-if="loading" class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
          </div>
          <div v-else class="job-list">
            <a
              v-for="job in filteredJobs"
              :key="job.id"
              class="ops-sidebar-item job-item"
              :class="{ active: activeJobId === job.id }"
              @click="selectJob(job)"
              :title="job.title"
            >
              <h5 class="job-title">{{ job.title }}</h5>
              <div class="job-meta">
                {{ formatDate(job.updatedAt || job.createdAt) }}
              </div>
            </a>
          </div>
        </div>
      </aside>

      <!-- 作业详情区域 -->
      <main class="job-detail">
        <div v-if="!selectedJob" class="blank-state">
          <div class="blank-icon">
            <i class="fas fa-inbox"></i>
          </div>
        </div>

        <template v-else>
          <div class="detail-body">
            <el-form
              ref="formRef"
              :model="jobForm"
              :rules="formRules"
              :disabled="!isEditMode"
              label-width="100px"
              class="job-form"
            >
              <fieldset>
                <legend>作业设置</legend>

                <el-form-item label="作业标题" prop="title">
                  <el-input v-model="jobForm.title" placeholder="请输入作业标题" />
                </el-form-item>

                <el-form-item label="描述">
                  <el-input
                    v-model="jobForm.description"
                    type="textarea"
                    :rows="3"
                    placeholder="请输入作业描述"
                  />
                </el-form-item>
              </fieldset>

              <fieldset>
                <legend>命令配置</legend>

                <el-form-item label="命令列表">
                  <div class="command-selector">
                    <el-select
                      v-if="isEditMode"
                      v-model="selectedCommandIds"
                      multiple
                      filterable
                      placeholder="选择要执行的命令"
                      style="width: 100%"
                    >
                      <el-option
                        v-for="cmd in availableCommands"
                        :key="cmd.id"
                        :label="cmd.name"
                        :value="cmd.id"
                      />
                    </el-select>
                    <div v-else class="command-tags">
                      <el-tag
                        v-for="cmd in jobCommands"
                        :key="cmd.id"
                        type="info"
                        class="command-tag"
                      >
                        {{ cmd.name || cmd.id }}
                      </el-tag>
                      <span v-if="jobCommands.length === 0" class="text-muted">未配置命令</span>
                    </div>
                  </div>
                </el-form-item>

                <el-form-item label="目标主机">
                  <div v-if="isEditMode" class="host-editor">
                    <el-input
                      v-model="hostInput"
                      placeholder="输入主机IP，多个用逗号分隔"
                      @keyup.enter="addHosts"
                    >
                      <template #append>
                        <el-button @click="addHosts">添加</el-button>
                      </template>
                    </el-input>
                    <div v-if="jobHosts.length > 0" class="host-list">
                      <el-tag
                        v-for="(host, index) in jobHosts"
                        :key="index"
                        closable
                        type="success"
                        @close="removeHost(index)"
                      >
                        {{ host.value || host }}
                      </el-tag>
                    </div>
                  </div>
                  <div v-else class="host-tags">
                    <el-tag
                      v-for="(host, index) in jobHosts"
                      :key="index"
                      type="success"
                    >
                      {{ host.value || host }}
                    </el-tag>
                    <span v-if="jobHosts.length === 0" class="text-muted">未配置主机</span>
                  </div>
                </el-form-item>
              </fieldset>

              <!-- 运行作业 -->
              <fieldset v-if="!isEditMode">
                <legend>运行作业</legend>
                <div class="run-actions">
                  <el-button type="primary" :loading="running" @click="handleRunJob">
                    <i class="fas fa-play"></i>
                    执行作业
                  </el-button>
                  <el-button @click="isEditMode = true">
                    <i class="fas fa-edit"></i>
                    编辑作业
                  </el-button>
                  <el-button type="danger" plain @click="handleDeleteJob">
                    <i class="fas fa-trash"></i>
                    删除作业
                  </el-button>
                </div>

                <!-- 运行结果 -->
                <div v-if="runResult" class="run-result">
                  <pre>{{ JSON.stringify(runResult, null, 2) }}</pre>
                </div>
              </fieldset>

              <!-- 编辑模式按钮 -->
              <div v-if="isEditMode" class="edit-actions">
                <el-button type="primary" :loading="saving" @click="handleSaveJob">
                  保存作业
                </el-button>
                <el-button @click="handleCancelEdit">
                  取消
                </el-button>
              </div>
            </el-form>
          </div>
        </template>
      </main>
    </div>

    <!-- 创建作业对话框 -->
    <CreateJobDialog
      v-model:visible="createDialogVisible"
      @success="handleCreateSuccess"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  findAllJobs,
  findJobById,
  saveJob,
  deleteJob,
  runJob,
  findAllApproveCommand
} from '@/modules/automation/api/command'
import CreateJobDialog from './dialogs/CreateJobDialog.vue'

const props = defineProps({
  jobType: {
    type: String,
    default: 'command'
  }
})

// 状态
const loading = ref(false)
const jobs = ref([])
const searchKeyword = ref('')
const sortField = ref('updatedAt')
const sortOrder = ref('desc')

// 选中的作业
const activeJobId = ref(null)
const selectedJob = ref(null)
const isEditMode = ref(false)

// 表单
const formRef = ref(null)
const jobForm = ref({
  id: null,
  title: '',
  description: '',
  type: 'command',
  configJson: ''
})

// 作业配置
const selectedCommandIds = ref([])
const jobHosts = ref([])
const hostInput = ref('')

// 可用命令列表
const availableCommands = ref([])

// 运行状态
const running = ref(false)
const runResult = ref(null)

// 保存状态
const saving = ref(false)

// 创建对话框
const createDialogVisible = ref(false)

// 表单验证规则
const formRules = {
  title: [
    { required: true, message: '请输入作业标题', trigger: 'blur' }
  ]
}

// 过滤和排序后的作业列表
const filteredJobs = computed(() => {
  let result = [...jobs.value]

  // 搜索过滤
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(job =>
      job.title?.toLowerCase().includes(keyword)
    )
  }

  // 排序
  result.sort((a, b) => {
    let aVal = a[sortField.value] || ''
    let bVal = b[sortField.value] || ''
    if (sortField.value === 'updatedAt' || sortField.value === 'createdAt') {
      aVal = new Date(aVal).getTime() || 0
      bVal = new Date(bVal).getTime() || 0
    }
    if (sortOrder.value === 'asc') {
      return aVal > bVal ? 1 : -1
    } else {
      return aVal < bVal ? 1 : -1
    }
  })

  return result
})

// 作业中的命令
const jobCommands = computed(() => {
  try {
    const config = JSON.parse(selectedJob.value?.configJson || '{}')
    return config.tasks?.[0]?.commands || []
  } catch {
    return []
  }
})

// 加载作业列表
async function loadJobs() {
  loading.value = true
  try {
    const response = await findAllJobs(props.jobType)
    jobs.value = response.data || response || []
  } catch (error) {
    console.error('加载作业列表失败:', error)
    ElMessage.error('加载作业列表失败')
  } finally {
    loading.value = false
  }
}

// 加载可用命令
async function loadAvailableCommands() {
  try {
    const response = await findAllApproveCommand()
    availableCommands.value = response.data || response || []
  } catch (error) {
    console.error('加载命令列表失败:', error)
  }
}

// 选择作业
async function selectJob(job) {
  activeJobId.value = job.id
  isEditMode.value = false
  runResult.value = null

  try {
    const response = await findJobById(job.id)
    selectedJob.value = response.data || response

    // 解析配置
    jobForm.value = {
      id: selectedJob.value.id,
      title: selectedJob.value.title,
      description: selectedJob.value.description,
      type: selectedJob.value.type,
      configJson: selectedJob.value.configJson
    }

    const config = JSON.parse(selectedJob.value.configJson || '{}')
    const task = config.tasks?.[0] || {}
    selectedCommandIds.value = (task.commands || []).map(c => c.id)
    jobHosts.value = task.hosts || []
  } catch (error) {
    console.error('加载作业详情失败:', error)
    ElMessage.error('加载作业详情失败')
  }
}

// 排序变化
function handleSortChange(field) {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortOrder.value = 'desc'
  }
}

// 创建作业
function handleCreateJob() {
  createDialogVisible.value = true
}

// 创建成功
function handleCreateSuccess() {
  loadJobs()
}

// 添加主机
function addHosts() {
  if (!hostInput.value.trim()) return

  const hosts = hostInput.value.split(',').map(h => h.trim()).filter(h => h)
  hosts.forEach(host => {
    if (!jobHosts.value.some(h => (h.value || h) === host)) {
      jobHosts.value.push({
        key: host,
        value: host,
        assetType: 'host'
      })
    }
  })
  hostInput.value = ''
}

// 移除主机
function removeHost(index) {
  jobHosts.value.splice(index, 1)
}

// 保存作业
async function handleSaveJob() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  if (selectedCommandIds.value.length === 0) {
    ElMessage.error('请至少选择一个命令')
    return
  }
  if (jobHosts.value.length === 0) {
    ElMessage.error('请至少添加一个目标主机')
    return
  }

  saving.value = true
  try {
    const commands = selectedCommandIds.value.map(id => ({ id }))
    const configJson = JSON.stringify({
      tasks: [{
        commands,
        hosts: jobHosts.value
      }]
    })

    const job = {
      ...jobForm.value,
      configJson
    }

    await saveJob(job)
    ElMessage.success('作业保存成功')
    isEditMode.value = false
    loadJobs()

    // 刷新当前作业详情
    if (activeJobId.value) {
      const currentJob = jobs.value.find(j => j.id === activeJobId.value)
      if (currentJob) {
        selectJob(currentJob)
      }
    }
  } catch (error) {
    console.error('保存作业失败:', error)
    ElMessage.error('保存作业失败')
  } finally {
    saving.value = false
  }
}

// 取消编辑
function handleCancelEdit() {
  isEditMode.value = false
  if (selectedJob.value) {
    selectJob(selectedJob.value)
  }
}

// 运行作业
async function handleRunJob() {
  if (jobCommands.value.length === 0) {
    ElMessage.warning('作业未配置命令')
    return
  }

  running.value = true
  runResult.value = null
  try {
    const response = await runJob(selectedJob.value.id, {
      params: {}
    })
    runResult.value = response.data || response
    ElMessage.success('作业已提交执行')
  } catch (error) {
    console.error('运行作业失败:', error)
    ElMessage.error('运行作业失败')
  } finally {
    running.value = false
  }
}

// 删除作业
async function handleDeleteJob() {
  try {
    await ElMessageBox.confirm(
      `确定要删除作业 "${selectedJob.value.title}" 吗？`,
      '确认删除',
      { type: 'error', confirmButtonClass: 'el-button--danger' }
    )

    await deleteJob(selectedJob.value.id)
    ElMessage.success('作业已删除')
    selectedJob.value = null
    activeJobId.value = null
    loadJobs()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除作业失败:', error)
      ElMessage.error('删除作业失败')
    }
  }
}

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

// 刷新
function refresh() {
  loadJobs()
}

// 初始化
onMounted(() => {
  loadJobs()
  loadAvailableCommands()
})

// 暴露方法
defineExpose({
  refresh,
  loadJobs
})
</script>

<style scoped lang="scss">
.command-job-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.job-list__header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #dee2e6;
  background: #f8f9fa;

  .header-title {
    font-size: 16px;
    font-weight: 600;
    color: #212529;
  }
}

.job-list__body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.job-sidebar {
  width: 15rem;
  background: #fff;
  border-right: 1px solid #dee2e6;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid #dee2e6;
  background: #f8f9fa;

  .el-input {
    flex: 1;
  }

  .sort-btn,
  .add-btn {
    flex-shrink: 0;
    padding: 8px 10px;
  }
}

.sidebar-body {
  flex: 1;
  overflow-y: auto;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  color: #6c757d;
}

.job-list {
  padding: 0;
}

.job-item {
  display: block;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f1f3f5;
  position: relative;
  text-decoration: none;
  color: inherit;

  &:hover {
    background: #f8f9fa;
  }

  &.active {
    background: #e9ecef;
    border-left: 3px solid #0d6efd;
  }

  .job-title {
    margin: 0 0 4px;
    font-size: 14px;
    font-weight: 500;
    color: #212529;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .job-meta {
    font-size: 12px;
    color: #6c757d;
  }
}

.job-detail {
  flex: 1;
  overflow-y: auto;
  background: #f8f9fa;
}

.blank-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #adb5bd;
  background: #f8f9fa;

  .blank-icon {
    i {
      font-size: 64px;
    }
  }
}

.detail-body {
  padding: 24px;
}

.job-form {
  max-width: 800px;

  fieldset {
    border: none;
    padding: 0;
    margin: 0 0 24px;

    legend {
      font-size: 14px;
      font-weight: 600;
      color: #212529;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #dee2e6;
    }
  }
}

.command-tags,
.host-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  .text-muted {
    color: #6c757d;
    font-size: 13px;
  }
}

.host-editor {
  .el-input {
    margin-bottom: 12px;
  }
}

.host-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.run-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.run-result {
  background: #212529;
  color: #e9ecef;
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
  max-height: 300px;

  pre {
    margin: 0;
    font-family: monospace;
    font-size: 12px;
    white-space: pre-wrap;
  }
}

.edit-actions {
  display: flex;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #dee2e6;
}

:deep(.el-button) {
  border-radius: 4px;
}

:deep(.el-input__wrapper) {
  border-radius: 4px;
}
</style>
