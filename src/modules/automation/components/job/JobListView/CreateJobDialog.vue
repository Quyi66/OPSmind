<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="1080px"
    destroy-on-close
    @close="handleClose"
    :close-on-click-modal="false"
    class="create-job-dialog"
  >
    <el-form
      ref="formRef"
      :model="job"
      label-width="100px"
      :disabled="formDisabled"
      class="job-form"
    >
      <!-- 基本设置 -->
      <div class="form-section">
        <div class="section-title">基本设置</div>

        <el-form-item label="标题" required>
          <el-input v-model="job.title" placeholder="请输入作业标题" />
        </el-form-item>

        <el-form-item label="描述">
          <el-input
            v-model="job.description"
            type="textarea"
            :rows="3"
            placeholder="请输入作业描述"
          />
        </el-form-item>
      </div>

      <!-- 脚本作业配置 -->
      <div v-if="job.type === 'script'" class="form-section">
        <div class="section-title">脚本设置</div>

        <el-form-item label="脚本类型">
          <el-radio-group v-model="jobConfig.scriptType">
            <el-radio-button value="playbook">Ansible Playbook</el-radio-button>
            <el-radio-button value="adhoc">普通脚本</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="脚本任务" required>
          <div class="task-list">
            <div
              v-for="(task, taskIndex) in jobConfig.tasks"
              :key="taskIndex"
              class="task-item"
            >
              <!-- 已选脚本列表 -->
              <div v-if="task.scripts && task.scripts.length > 0" class="selected-scripts">
                <el-button size="small" @click="openFileSelector(taskIndex)">
                  共 <strong>{{ task.scripts.length }}</strong> 个文件
                </el-button>
                <el-table :data="task.scripts" size="small" class="mt-2" max-height="300px">
                  <el-table-column label="脚本路径" min-width="200">
                    <template #default="{ row }">
                      <span v-if="fileStatusMap[row.location]" class="text-danger">
                        {{ row.location }}
                        <i class="fa fa-exclamation-triangle"></i>
                      </span>
                      <span v-else>{{ row.location }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="额外参数" width="200">
                    <template #default="{ row }">
                      <el-input v-model="row.argline" size="small" placeholder="参数" />
                    </template>
                  </el-table-column>
                  <el-table-column label="标签" width="120">
                    <template #default="{ row }">
                      <el-input v-model="row.tag" size="small" placeholder="tag" />
                    </template>
                  </el-table-column>
                  <el-table-column width="60" align="center">
                    <template #default="{ $index }">
                      <el-button link type="danger" @click="removeScript(task, $index)">
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
              <div v-else class="empty-state">
                <el-button @click="openFileSelector(taskIndex)">选择文件</el-button>
              </div>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="目标主机">
          <div v-for="(task, taskIndex) in jobConfig.tasks" :key="taskIndex">
            <el-radio-group v-model="task.hostsMode" class="mb-2">
              <el-radio-button value="param">参数传入</el-radio-button>
              <el-radio-button value="">预定义</el-radio-button>
            </el-radio-group>
            <el-input
              v-if="task.hostsMode === 'param'"
              v-model="task.hostsParam"
              placeholder="主机参数名称"
              style="width: 200px; margin-top: 8px; display: block;"
            />
            <AcmDeviceSelector
              v-else
              v-model="task.hosts"
              ci-types="[auto]"
              style="margin-top: 8px;"
            />
          </div>
        </el-form-item>

        <el-form-item label="回调API">
          <el-input v-model="jobConfig.callback" placeholder="执行完成后回调的URL" />
        </el-form-item>

        <el-form-item label="任务超时">
          <el-input-number v-model="jobConfig.taskTimeout" :min="-1" :step="60" />
          <span style="margin-left: 8px;">秒</span>
        </el-form-item>

        <el-form-item label="详细输出">
          <el-select v-model="jobConfig.verbosity" style="width: 200px;">
            <el-option label="正常" :value="0" />
            <el-option label="详细 (-v)" :value="1" />
            <el-option label="更详细 (-vv)" :value="2" />
            <el-option label="调试 (-vvv)" :value="3" />
            <el-option label="连接调试 (-vvvv)" :value="4" />
          </el-select>
        </el-form-item>
      </div>

      <!-- REST 作业配置 -->
      <div v-if="job.type === 'rest'" class="form-section">
        <div class="section-title">REST设置</div>

        <el-form-item label="CURL" required>
          <el-input
            v-model="restConfig.curl"
            type="textarea"
            :rows="8"
            :placeholder="curlPlaceholder"
            style="font-family: 'Consolas', 'Monaco', monospace;"
          />
          <div class="help-text">支持使用参数变量，格式：<code v-pre>{{param_name}}</code></div>
        </el-form-item>
      </div>

      <!-- 命令作业配置 -->
      <div v-if="job.type === 'command'" class="form-section">
        <div class="section-title">命令设置</div>

        <el-form-item label="执行命令" required>
          <div
            v-for="(task, taskIndex) in commandConfig.tasks"
            :key="taskIndex"
            class="w-full"
          >
            <!-- 已选命令列表 -->
            <div v-if="task.commands && task.commands.length > 0">
              <div class="d-flex mb-2">
                <el-button size="small" @click="openCommandSelector(taskIndex)">
                  共 <strong>{{ task.commands.length }}</strong> 条命令
                </el-button>
                <el-input
                  v-model="task.commandFilter"
                  placeholder="搜索命令"
                  clearable
                  size="small"
                  style="width: 200px; margin-left: auto;"
                />
              </div>
              <div class="command-list">
                <pre
                  v-for="(cmd, cmdIndex) in filteredTaskCommands(task)"
                  :key="cmdIndex"
                  class="command-item"
                >{{ cmd.cmd || cmd.command }}</pre>
              </div>
            </div>
            <!-- 空状态 -->
            <div v-else class="empty-state">
              <el-button @click="openCommandSelector(taskIndex)">选择命令</el-button>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="目标主机" required>
          <div v-for="(task, taskIndex) in commandConfig.tasks" :key="taskIndex">
            <AcmDeviceSelector
              v-model="task.hosts"
              ci-types="[auto]"
            />
          </div>
        </el-form-item>
      </div>

      <!-- 运行参数 -->
      <div v-if="job.type !== 'command'" class="form-section">
        <div class="section-title">运行参数</div>

        <el-form-item>
          <div>
            <el-button class="ms-auto" @click="addParam">
              <i class="fa fa-plus"></i>
              添加参数
            </el-button>
            <el-button @click="addParamAuto">
              <i class="fa fa-brackets-curly"></i>
              解析参数
            </el-button>
          </div>

          <el-table
            v-if="job.params && job.params.length > 0"
            :data="job.params"
            border
            size="small"
            class="mt-2"
            max-height="300px"
          >
            <el-table-column label="参数" width="130">
              <template #default="{ row }">
                <el-input v-model="row.name" size="small" placeholder="参数名" />
              </template>
            </el-table-column>
            <el-table-column label="显示名称" width="130">
              <template #default="{ row }">
                <el-input v-model="row.label" size="small" placeholder="显示名称" />
              </template>
            </el-table-column>
            <el-table-column label="描述" min-width="150">
              <template #default="{ row }">
                <el-input v-model="row.description" size="small" placeholder="参数描述" />
              </template>
            </el-table-column>
            <el-table-column label="默认值" width="120">
              <template #default="{ row }">
                <el-input v-model="row.defaultValue" size="small" placeholder="默认值" />
              </template>
            </el-table-column>
            <el-table-column label="类型" width="120">
              <template #default="{ row }">
                <el-select v-model="row.type" size="small">
                  <el-option
                    v-for="pt in paramTypeList"
                    :key="pt.type"
                    :label="pt.title"
                    :value="pt.type"
                  />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="加密" width="50">
              <template #default="{ row }">
                <el-checkbox v-model="row.secret" />
              </template>
            </el-table-column>
            <el-table-column width="50">
              <template #default="{ row }">
                <el-button
                  size="small"
                  link
                  type="danger"
                  @click="deleteParam(row)"
                >
                  <!-- <i class="fa fa-minus"></i> -->
                   <el-icon><Delete /></el-icon>
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-form-item>
      </div>

      <!-- 日志和审核 -->
      <div class="form-section">
        <div class="section-title">日志和审核</div>

        <el-form-item label="操作审批">
          <el-checkbox v-model="job.needApprove" :disabled="job.needReview">
            需要审批
          </el-checkbox>
          <el-checkbox v-model="job.needReview" :disabled="job.needApprove" class="ms-3">
            双人复核
          </el-checkbox>
        </el-form-item>

        <el-form-item v-if="job.type !== 'command'" label="操作日志">
          <el-checkbox v-model="jobConfig.audit.enabled">
            记录操作日志
          </el-checkbox>
        </el-form-item>

        <el-form-item v-if="jobConfig.audit.enabled" label="模块">
          <el-input
            v-model="jobConfig.audit.module"
            maxlength="50"
            style="width: 300px;"
            placeholder="日志所属的功能模块"
          />
        </el-form-item>

        <el-form-item v-if="jobConfig.audit.enabled" label="操作">
          <el-input
            v-model="jobConfig.audit.action"
            maxlength="100"
            style="width: 300px;"
            placeholder="具体的操作类型"
          />
        </el-form-item>

        <el-form-item label="操作延时">
          <el-checkbox v-model="job.needDelayed">
            延时执行
          </el-checkbox>
        </el-form-item>
      </div>

      <!-- 测试作业 -->
      <div v-if="!viewMode" class="form-section">
        <div class="section-title">测试作业</div>

        <el-form-item>
          <div class="test-controls d-flex w-full align-items-center">
            <!-- 运行状态 -->
            <div v-if="testJobStatus">
              <el-button
                :type="testJobStatus.type"
                @click="viewTestResult"
              >
                <i :class="['fa', 'fa-fw', testJobStatus.icon]"></i>
                <span>{{ testJobStatus.title }}</span>
              </el-button>
            </div>

            <!-- 运行按钮 -->
            <el-button
              type="primary"
              :loading="testJobRunning"
              :disabled="testJobRunning || !canRunTest"
              @click="runTestJob"
            >
              <i class="fa fa-fw fa-chevron-right"></i>
              运行测试
            </el-button>
          </div>

          <!-- 运行结果预览 -->
          <div
            v-if="testJobResult"
            class="test-result-preview"
            style="margin-top: 16px;"
          >
            <pre>{{ JSON.stringify(testJobResult, null, 2) }}</pre>
          </div>
        </el-form-item>
      </div>
    </el-form>

    <template #footer>
      <div v-if="viewMode" class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
      </div>
      <div v-else class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="save"
        >
          保存
        </el-button>
      </div>
    </template>
  </el-dialog>

  <!-- 文件选择器对话框 -->
  <FileSelectorDialog
    v-model="showFileSelector"
    :multiple-select="true"
    :pre-selected="currentTaskScripts"
    @confirm="handleFileSelect"
  />

  <!-- 命令选择器对话框 -->
  <CommandSelectorDialog
    v-model="showCommandSelector"
    :pre-selected="currentTaskCommands"
    @confirm="handleCommandSelect"
  />
</template>

<script setup>
import { ref, computed, watch, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import * as jaoApi from '@/modules/automation/api/jao'
import * as gfsApi from '@/modules/automation/api/gfs'
import FileSelectorDialog from './FileSelectorDialog.vue'
import CommandSelectorDialog from './CommandSelectorDialog.vue'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import {
  normalizeAcmDeviceJobHosts,
  normalizeAcmDeviceSelection
} from '@/modules/automation/components/job/schedule/components/acmDeviceSelector.utils'
import { JOB_TYPE_OPTIONS } from '@/modules/automation/stores/useJobStore'
import { Delete } from '@element-plus/icons-vue'

// 过滤掉"全部类型"选项，只保留实际的作业类型
const CREATE_JOB_TYPE_OPTIONS = JOB_TYPE_OPTIONS.filter(opt => opt.value !== '')

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  jobType: {
    type: String,
    default: ''
  },
  appletCode: {
    type: String,
    default: ''
  },
  appletsList: {
    type: Array,
    default: () => []
  },
  // 编辑模式：传入作业ID
  jobId: {
    type: String,
    default: ''
  },
  // 查看模式（只读，不可编辑）
  viewMode: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 是否为编辑模式
const isEditMode = computed(() => !!props.jobId)

// 加载中状态
const loading = ref(false)

const dialogTitle = computed(() => {
  const typeOption = CREATE_JOB_TYPE_OPTIONS.find((opt) => opt.value === job.type)
  if (props.viewMode) {
    return typeOption ? `查看${typeOption.label}` : '查看作业'
  }
  if (isEditMode.value) {
    return typeOption ? `编辑${typeOption.label}` : '编辑作业'
  }
  return typeOption ? `新建${typeOption.label}` : '新建作业'
})

// 参数类型列表
const paramTypeList = [
  { type: 'string', title: '字符串' },
  { type: 'string_pwd', title: '密码' },
  { type: 'number', title: '数字' },
  { type: 'date', title: '日期' },
  { type: 'boolean', title: '布尔' },
  { type: 'array', title: '数组' },
  { type: 'host', title: '主机' }
]

// 状态
const submitting = ref(false)
const showFileSelector = ref(false)
const showCommandSelector = ref(false)
const currentTaskIndex = ref(0)
const fileStatusMap = ref({})
const scrollbarRef = ref(null)
const activeSection = ref('section-base')

// 测试作业状态
const testJobRunning = ref(false)
const testJobStatus = ref(null)
const testJobResult = ref(null)
const testRunId = ref(null)

// 导航区块配置
const navSections = computed(() => {
  const sections = [
    { id: 'section-base', label: '基本设置' }
  ]

  if (job.type === 'script') {
    sections.push({ id: 'section-script', label: '脚本设置' })
  } else if (job.type === 'rest') {
    sections.push({ id: 'section-rest', label: 'REST设置' })
  } else if (job.type === 'command') {
    sections.push({ id: 'section-command', label: '命令设置' })
  }

  if (job.type !== 'command') {
    sections.push({ id: 'section-params', label: '运行参数' })
  }

  sections.push({ id: 'section-audit', label: '日志和审核' })
  if (!props.viewMode) {
    sections.push({ id: 'section-test', label: '测试作业' })
  }

  return sections
})

// 表单是否禁用（查看模式下禁用所有表单元素）
const formDisabled = computed(() => props.viewMode)

// 是否可以运行测试
const canRunTest = computed(() => {
  if (!job.title) return false
  if (job.type === 'script') {
    return jobConfig.tasks.some(task => task.scripts && task.scripts.length > 0)
  }
  if (job.type === 'rest') {
    return !!restConfig.curl
  }
  if (job.type === 'command') {
    return commandConfig.tasks.some(task => task.commands && task.commands.length > 0)
  }
  return false
})

/**
 * 滚动到指定区块
 */
function scrollToSection(sectionId) {
  activeSection.value = sectionId
  const element = document.getElementById(sectionId)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// 作业基本信息
const job = reactive({
  title: '',
  type: '',
  appletCode: '',
  description: '',
  params: [],
  needApprove: false,
  needReview: false,
  needDelayed: false
})

// 脚本作业配置
const jobConfig = reactive({
  scriptType: 'playbook',
  callback: '',
  taskTimeout: -1,
  verbosity: 0,
  tasks: [{
    scripts: [],
    hosts: [],
    hostsMode: 'param',
    hostsParam: 'hosts',
    hostsText: ''
  }],
  audit: {
    enabled: false,
    module: '',
    action: ''
  }
})

// REST 作业配置
const restConfig = reactive({
  curl: ''
})

// CURL placeholder 文本
const curlPlaceholder = `直接粘贴完整的 CURL 命令
例如：
curl -X POST 'http://api.example.com/data' \\
  -H 'Content-Type: application/json' \\
  -d '{"key": "{{param_value}}"}'`

// 命令作业配置
const commandConfig = reactive({
  tasks: [{
    commands: [],
    hosts: [],
    hostsMode: 'param',
    commandFilter: ''
  }]
})

// 当前任务的脚本列表（用于文件选择器）
const currentTaskScripts = computed(() => {
  const task = jobConfig.tasks[currentTaskIndex.value]
  if (!task || !task.scripts) return []
  return task.scripts.map((s) => ({ path: s.location }))
})

// 当前任务的命令列表（用于命令选择器）
const currentTaskCommands = computed(() => {
  const task = commandConfig.tasks[currentTaskIndex.value]
  if (!task || !task.commands) return []
  return task.commands
})

/**
 * 过滤任务中的命令（根据搜索关键词）
 */
function filteredTaskCommands(task) {
  if (!task.commands || task.commands.length === 0) return []
  if (!task.commandFilter) return task.commands
  const kw = task.commandFilter.toLowerCase()
  return task.commands.filter(cmd =>
    (cmd.cmd && cmd.cmd.toLowerCase().includes(kw)) ||
    (cmd.command && cmd.command.toLowerCase().includes(kw)) ||
    (cmd.name && cmd.name.toLowerCase().includes(kw))
  )
}

/**
 * 打开命令选择器
 */
function openCommandSelector(taskIndex) {
  currentTaskIndex.value = taskIndex
  showCommandSelector.value = true
}

/**
 * 处理命令选择
 */
function handleCommandSelect(commands) {
  const task = commandConfig.tasks[currentTaskIndex.value]
  if (!task) return
  task.commands = commands
}

/**
 * 打开文件选择器
 */
function openFileSelector(taskIndex) {
  currentTaskIndex.value = taskIndex
  showFileSelector.value = true
}

/**
 * 处理文件选择
 */
function handleFileSelect(files) {
  const task = jobConfig.tasks[currentTaskIndex.value]
  if (!task) return

  task.scripts = files.map((f) => ({
    location: f.path,
    argline: f.config || '',
    tag: f.tag || ''
  }))

  // 检查文件是否存在
  checkFilesExist(task.scripts)
}

/**
 * 检查文件是否存在
 */
async function checkFilesExist(scripts) {
  if (!scripts || scripts.length === 0) return

  const paths = scripts.map((s) => s.location)
  try {
    const response = await gfsApi.checkFileExist(paths)
    fileStatusMap.value = response.data || {}
  } catch (error) {
    console.error('检查文件存在性失败:', error)
  }
}

/**
 * 移除脚本
 */
function removeScript(task, index) {
  task.scripts.splice(index, 1)
}

/**
 * 添加任务步骤
 */
function addTask() {
  jobConfig.tasks.push({
    scripts: [],
    hosts: [],
    hostsMode: 'param',
    hostsParam: 'hosts',
    hostsText: ''
  })
}

/**
 * 移除任务步骤
 */
function removeTask(index) {
  if (jobConfig.tasks.length > 1) {
    jobConfig.tasks.splice(index, 1)
  }
}

/**
 * 添加参数
 */
function addParam() {
  job.params.push({
    name: '',
    label: '',
    description: '',
    type: 'string',
    defaultValue: '',
    secret: false
  })
}

/**
 * 删除参数
 */
function deleteParam(param) {
  const index = job.params.indexOf(param)
  if (index !== -1) {
    job.params.splice(index, 1)
  }
}

/**
 * 自动解析参数
 * 从脚本路径、argline、CURL等内容中提取 {{param}} 格式的变量
 */
function addParamAuto() {
  const paramList = []

  if (job.type === 'script') {
    // 从脚本配置中解析参数
    jobConfig.tasks.forEach((task) => {
      task.scripts.forEach((script) => {
        // 从 argline 中提取参数
        const matches = (script.argline || '').match(/\{\{(\w+)\}\}/g)
        if (matches) {
          matches.forEach((match) => {
            const paramName = match.replace(/\{\{|\}\}/g, '')
            if (!paramList.includes(paramName)) {
              paramList.push(paramName)
            }
          })
        }
      })

      // 如果使用参数传入主机，添加主机参数
      if (task.hostsMode === 'param' && task.hostsParam) {
        if (!paramList.includes(task.hostsParam)) {
          paramList.push(task.hostsParam)
        }
      }
    })
  } else if (job.type === 'rest') {
    // 从 CURL 命令中解析参数
    const matches = (restConfig.curl || '').match(/\{\{(\w+)\}\}/g)
    if (matches) {
      matches.forEach((match) => {
        const paramName = match.replace(/\{\{|\}\}/g, '')
        if (!paramList.includes(paramName)) {
          paramList.push(paramName)
        }
      })
    }
  }

  // 过滤掉已存在的参数
  const existingParams = job.params.map((p) => p.name)
  const newParams = paramList.filter((p) => !existingParams.includes(p))

  if (newParams.length === 0) {
    ElMessage.info('未发现新参数')
    return
  }

  // 添加新参数
  newParams.forEach((paramName) => {
    job.params.push({
      name: paramName,
      label: paramName,
      description: '',
      type: paramName.toLowerCase().includes('host') ? 'host' : 'string',
      defaultValue: '',
      secret: false
    })
  })

  ElMessage.success(`成功添加 ${newParams.length} 个参数`)
}

/**
 * 构建配置JSON
 */
function toConfigJson() {
  const config = {
    audit: {
      enabled: jobConfig.audit.enabled,
      module: jobConfig.audit.module,
      action: jobConfig.audit.action
    }
  }

  if (job.type === 'script') {
    config.scriptType = jobConfig.scriptType
    config.callback = jobConfig.callback
    config.taskTimeout = jobConfig.taskTimeout
    config.verbosity = jobConfig.verbosity

    // 构建 tasks
    config.tasks = jobConfig.tasks.map((task) => {
      const taskConfig = {
        scripts: task.scripts || [],
        hostsMode: task.hostsMode
      }

      if (task.hostsMode === 'param') {
        taskConfig.hostsParam = task.hostsParam || 'hosts'
        taskConfig.hosts = []
      } else {
        // 使用 AcmDeviceSelector 选择的主机
        taskConfig.hosts = normalizeAcmDeviceJobHosts(task.hosts, 'linux')
      }

      return taskConfig
    })
  } else if (job.type === 'rest') {
    config.curl = restConfig.curl
  } else if (job.type === 'command') {
    // 命令作业配置
    config.tasks = commandConfig.tasks.map((task) => ({
      commands: (task.commands || []).map(cmd => ({
        id: cmd.id,
        name: cmd.name,
        type: cmd.type,
        cmd: cmd.cmd || cmd.command
      })),
      hosts: normalizeAcmDeviceJobHosts(task.hosts, 'linux'),
      hostsMode: task.hostsMode || 'param'
    }))
  }

  return JSON.stringify(config)
}

/**
 * 验证表单
 */
function validateForm() {
  if (!job.title || !job.title.trim()) {
    ElMessage.warning('请输入作业标题')
    return false
  }

  if (job.type === 'script') {
    // 检查是否有脚本
    const hasScripts = jobConfig.tasks.some((task) => task.scripts && task.scripts.length > 0)
    if (!hasScripts) {
      ElMessage.warning('请至少选择一个脚本文件')
      return false
    }
  } else if (job.type === 'rest') {
    if (!restConfig.curl || !restConfig.curl.trim()) {
      ElMessage.warning('请输入 CURL 命令')
      return false
    }
  } else if (job.type === 'command') {
    // 检查是否有命令
    const hasCommands = commandConfig.tasks.some((task) => task.commands && task.commands.length > 0)
    if (!hasCommands) {
      ElMessage.warning('请至少选择一条命令')
      return false
    }
    // 检查是否有主机
    const hasHosts = commandConfig.tasks.some((task) => task.hosts && task.hosts.length > 0)
    if (!hasHosts) {
      ElMessage.warning('请至少选择一台主机')
      return false
    }
  }

  // 验证参数名称唯一性
  const paramNames = job.params.map((p) => p.name).filter(Boolean)
  const uniqueNames = new Set(paramNames)
  if (paramNames.length !== uniqueNames.size) {
    ElMessage.warning('参数名称不能重复')
    return false
  }

  return true
}

/**
 * 保存作业
 */
async function save() {
  if (!validateForm()) {
    return
  }

  submitting.value = true
  try {
    const payload = {
      title: job.title,
      type: job.type,
      appletCode: job.appletCode,
      description: job.description,
      params: job.params,
      needApprove: job.needApprove,
      needReview: job.needReview,
      needDelayed: job.needDelayed,
      configJson: toConfigJson()
    }

    if (isEditMode.value) {
      // 编辑模式：更新作业
      payload.id = props.jobId
      await jaoApi.updateJob(props.jobId, payload)
      ElMessage.success('保存成功')
    } else {
      // 新建模式
      await jaoApi.createJob(payload)
      ElMessage.success('创建成功')
    }
    emit('success')
    handleClose()
  } catch (error) {
    ElMessage.error(error?.message || (isEditMode.value ? '保存失败' : '创建失败'))
  } finally {
    submitting.value = false
  }
}

/**
 * 重置表单
 */
function resetForm() {
  job.title = ''
  job.type = ''
  job.appletCode = ''
  job.description = ''
  job.params = []
  job.needApprove = false
  job.needReview = false
  job.needDelayed = false

  jobConfig.scriptType = 'playbook'
  jobConfig.callback = ''
  jobConfig.taskTimeout = -1
  jobConfig.verbosity = 0
  jobConfig.tasks = [{
    scripts: [],
    hosts: [],
    hostsMode: 'param',
    hostsParam: 'hosts',
    hostsText: ''
  }]
  jobConfig.audit = {
    enabled: false,
    module: '',
    action: ''
  }

  restConfig.curl = ''

  commandConfig.tasks = [{
    commands: [],
    hosts: [],
    hostsMode: 'param',
    commandFilter: ''
  }]

  fileStatusMap.value = {}
  activeSection.value = 'section-base'
  testJobRunning.value = false
  testJobStatus.value = null
  testJobResult.value = null
  testRunId.value = null
}

/**
 * 关闭对话框
 */
function handleClose() {
  resetForm()
  emit('update:modelValue', false)
}

/**
 * 运行测试作业
 */
async function runTestJob() {
  if (!canRunTest.value) {
    ElMessage.warning('请先完善作业配置')
    return
  }

  testJobRunning.value = true
  testJobStatus.value = { name: 'running', title: '运行中', icon: 'fa-spinner fa-pulse', type: 'primary' }
  testJobResult.value = null

  try {
    // 构建执行参数
    const params = {}
    job.params.forEach(p => {
      if (p.name && p.defaultValue !== undefined) {
        params[p.name] = p.defaultValue
      }
    })

    const payload = {
      title: job.title,
      type: job.type,
      configJson: toConfigJson(),
      params,
      isTest: true
    }

    const response = await jaoApi.executeJob(payload)
    testRunId.value = response.data?.runId || response.data?.id

    if (testRunId.value) {
      // 轮询获取结果
      pollTestResult()
    } else {
      testJobStatus.value = { name: 'success', title: '执行成功', icon: 'fa-check-circle', type: 'success' }
      testJobResult.value = response.data
    }
  } catch (error) {
    testJobStatus.value = { name: 'error', title: '执行失败', icon: 'fa-exclamation-triangle', type: 'danger' }
    testJobResult.value = { error: error?.message || '执行失败' }
  } finally {
    testJobRunning.value = false
  }
}

/**
 * 轮询获取测试结果
 */
async function pollTestResult() {
  if (!testRunId.value) return

  let attempts = 0
  const maxAttempts = 60 // 最多轮询60次，每次2秒
  const pollInterval = 2000

  const poll = async () => {
    try {
      const response = await jaoApi.getExecuteResult(testRunId.value)
      const result = response.data

      if (result.status === 'running' || result.status === 'pending') {
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, pollInterval)
        } else {
          testJobStatus.value = { name: 'timeout', title: '执行超时', icon: 'fa-clock', type: 'warning' }
        }
      } else if (result.status === 'success' || result.status === 'completed') {
        testJobStatus.value = { name: 'success', title: '执行成功', icon: 'fa-check-circle', type: 'success' }
        testJobResult.value = result
      } else {
        testJobStatus.value = { name: 'error', title: '执行失败', icon: 'fa-exclamation-triangle', type: 'danger' }
        testJobResult.value = result
      }
    } catch (error) {
      testJobStatus.value = { name: 'error', title: '获取结果失败', icon: 'fa-exclamation-triangle', type: 'danger' }
    }
  }

  poll()
}

/**
 * 查看测试结果
 */
function viewTestResult() {
  if (testRunId.value) {
    // TODO: 可以打开执行结果详情对话框
  }
}

/**
 * 加载作业详情（编辑模式）
 */
async function loadJobDetail(jobId) {
  if (!jobId) return

  loading.value = true
  try {
    const response = await jaoApi.getJobDetail(jobId)
    const jobData = response.data

    // 填充基本信息
    job.title = jobData.title || ''
    job.type = jobData.type || ''
    job.appletCode = jobData.appletCode || ''
    job.description = jobData.description || ''
    job.params = jobData.params || []
    job.needApprove = jobData.needApprove || false
    job.needReview = jobData.needReview || false
    job.needDelayed = jobData.needDelayed || false

    // 解析 configJson
    const config = JSON.parse(jobData.configJson || '{}')

    // 填充审计配置
    if (config.audit) {
      jobConfig.audit.enabled = config.audit.enabled || false
      jobConfig.audit.module = config.audit.module || ''
      jobConfig.audit.action = config.audit.action || ''
    }

    if (jobData.type === 'script') {
      // 填充脚本作业配置
      jobConfig.scriptType = config.scriptType || 'playbook'
      jobConfig.callback = config.callback || ''
      jobConfig.taskTimeout = config.taskTimeout ?? -1
      jobConfig.verbosity = config.verbosity || 0

      if (config.tasks && config.tasks.length > 0) {
        jobConfig.tasks = config.tasks.map(task => ({
          scripts: task.scripts || [],
          hosts: normalizeAcmDeviceSelection(task.hosts, 'linux'),
          hostsMode: task.hostsMode || (task.hostsParam ? 'param' : ''),
          hostsParam: task.hostsParam || 'hosts',
          hostsText: normalizeAcmDeviceSelection(task.hosts, 'linux').map(host => host.value).join('\n')
        }))
      }
    } else if (jobData.type === 'rest') {
      // 填充 REST 作业配置
      restConfig.curl = config.curl || ''
    } else if (jobData.type === 'command') {
      // 填充命令作业配置
      if (config.tasks && config.tasks.length > 0) {
        commandConfig.tasks = config.tasks.map(task => ({
          commands: task.commands || [],
          hosts: normalizeAcmDeviceSelection(task.hosts, 'linux'),
          hostsMode: task.hostsMode || 'param',
          commandFilter: ''
        }))
      }
    }
  } catch (error) {
    console.error('加载作业详情失败:', error)
    ElMessage.error('加载作业详情失败')
  } finally {
    loading.value = false
  }
}

// 监听对话框打开，初始化数据
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    resetForm()
    if (props.jobId) {
      // 编辑模式：加载作业详情
      loadJobDetail(props.jobId)
    } else {
      // 新建模式
      job.type = props.jobType || ''
      job.appletCode = props.appletCode || ''
    }
  }
}, { immediate: true })

// 监听 jobType prop 变化
watch(() => props.jobType, (newVal) => {
  if (props.modelValue && !isEditMode.value) {
    job.type = newVal || ''
  }
})
</script>

<style scoped lang="scss">
.create-job-dialog {
  :deep(.el-dialog__body) {
    padding: 24px;
    max-height: 70vh;
    overflow-y: auto;
  }
}

// 表单容器
.job-form {
  :deep(.el-form-item__label) {
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  :deep(.el-form-item__content) {
    flex-wrap: wrap;
  }
}

// 表单分组
.form-section {
  // margin-bottom: 32px;
  // border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  // padding: 20px;
  background-color: var(--el-fill-color-blank);

  .section-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin-bottom: 20px;
    // padding-bottom: 12px;
    // border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .el-form-item {
    margin-bottom: 18px;
  }
}

// 帮助文本
.help-text {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;

  code {
    padding: 2px 6px;
    background-color: var(--el-fill-color-light);
    border-radius: 2px;
    font-family: 'Consolas', 'Monaco', monospace;
  }
}

// 任务列表
.task-list {
  width: 100%;

  .task-item {
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }
  }
}

// 选中脚本
.selected-scripts {
  width: 100%;

  .el-table {
    margin-top: 8px;
  }
}

// 空状态
.empty-state {
  :deep(.el-empty) {
    padding: 24px 0;
  }
}

// 命令列表
.command-list {
  max-height: 200px;
  overflow-y: auto;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
  padding: 8px;
  margin-top: 8px;

  .command-item {
    margin: 0;
    padding: 8px 12px;
    background: var(--el-bg-color);
    border-radius: 4px;
    line-height: 1.6;
    font-size: 13px;
    font-family: 'Consolas', 'Monaco', monospace;
    white-space: pre-wrap;
    word-break: break-all;

    &:not(:last-child) {
      margin-bottom: 8px;
    }
  }
}

// 测试控件
.test-controls {
  :deep(.el-button) {
    &[type="success"] {
      box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.2);
    }

    &[type="danger"] {
      box-shadow: 0 0 0 3px rgba(245, 108, 108, 0.2);
    }

    &[type="warning"] {
      box-shadow: 0 0 0 3px rgba(230, 162, 60, 0.2);
    }
  }
}

// 测试结果预览
.test-result-preview {
  padding: 12px;
  background-color: #2d3748;
  color: #e2e8f0;
  border-radius: 4px;
  max-height: 300px;
  overflow: auto;

  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-all;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 13px;
  }
}

// 底部按钮
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

// 工具类
.d-flex {
  display: flex;
}

.align-items-center {
  align-items: center;
}

.justify-content-between {
  justify-content: space-between;
}

.mt-2 {
  margin-top: 8px;
}

.mb-2 {
  margin-bottom: 8px;
}

.ms-auto {
  margin-left: auto;
}

.ms-3 {
  margin-left: 12px;
}

.w-full {
  width: 100%;
}
</style>
