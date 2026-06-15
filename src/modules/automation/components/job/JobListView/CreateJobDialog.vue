<template>
  <el-drawer
    v-model="visible"
    :title="dialogTitle"
    size="76%"
    direction="rtl"
    destroy-on-close
    @close="handleClose"
    :close-on-click-modal="false"
    class="create-job-drawer"
    append-to-body
  >
    <div class="create-job-drawer__layout">
      <div class="create-job-drawer__masthead">
        <div class="create-job-drawer__summary">
          <span class="create-job-drawer__eyebrow">{{ drawerModeLabel }}</span>
          <div class="create-job-drawer__meta">
            <span class="create-job-drawer__meta-item">
              <em>运维工具类型</em>
              <strong>{{ currentTypeLabel }}</strong>
            </span>
            <span class="create-job-drawer__meta-item">
              <em>所属应用</em>
              <strong>{{ currentAppletLabel }}</strong>
            </span>
          </div>
        </div>
        <div class="create-job-drawer__nav">
          <button
            v-for="section in navSections"
            :key="section.id"
            type="button"
            class="create-job-drawer__nav-item"
            :class="{ 'is-active': activeSection === section.id }"
            @click="scrollToSection(section.id)"
          >
            {{ section.label }}
          </button>
        </div>
      </div>

      <el-scrollbar ref="scrollbarRef" class="create-job-drawer__scroll" @scroll="handleFormScroll">
        <div v-loading="loading" class="create-job-drawer__content">
          <el-form
            ref="formRef"
            :model="job"
            label-width="100px"
            :disabled="formDisabled"
            class="job-form"
          >
            <!-- 基本设置 -->
            <div id="section-base" class="form-section">
              <div class="section-title">基本设置</div>

              <el-form-item label="标题" required>
                <el-input v-model="job.title" placeholder="请输入运维工具标题" />
              </el-form-item>

              <el-form-item label="描述">
                <el-input
                  v-model="job.description"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入运维工具描述"
                />
              </el-form-item>
            </div>

            <!-- 脚本作业配置 -->
            <div v-if="job.type === 'script'" id="section-script" class="form-section">
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
                        共
                        <strong>{{ task.scripts.length }}</strong>
                        个文件
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
                    style="width: 200px; margin-top: 8px; display: block"
                  />
                  <AcmDeviceSelector
                    v-else
                    v-model="task.hosts"
                    ci-types="[auto]"
                    style="margin-top: 8px"
                  />
                </div>
              </el-form-item>

              <el-form-item label="回调API">
                <el-input v-model="jobConfig.callback" placeholder="执行完成后回调的URL" />
              </el-form-item>

              <el-form-item label="任务超时">
                <el-input-number v-model="jobConfig.taskTimeout" :min="-1" :step="60" />
                <span style="margin-left: 8px">秒</span>
              </el-form-item>

              <el-form-item label="详细输出">
                <el-select v-model="jobConfig.verbosity" style="width: 200px">
                  <el-option label="正常" :value="0" />
                  <el-option label="详细 (-v)" :value="1" />
                  <el-option label="更详细 (-vv)" :value="2" />
                  <el-option label="调试 (-vvv)" :value="3" />
                  <el-option label="连接调试 (-vvvv)" :value="4" />
                </el-select>
              </el-form-item>
            </div>

            <!-- REST 作业配置 -->
            <div v-if="job.type === 'rest'" id="section-rest" class="form-section">
              <div class="section-title">REST设置</div>

              <el-form-item label="CURL" required>
                <el-input
                  v-model="restConfig.curl"
                  type="textarea"
                  :rows="8"
                  :placeholder="curlPlaceholder"
                  style="font-family: 'Consolas', 'Monaco', monospace"
                />
                <div class="help-text">
                  支持使用参数变量，格式：
                  <code v-pre>{{ param_name }}</code>
                </div>
              </el-form-item>
            </div>

            <!-- 命令作业配置 -->
            <div v-if="job.type === 'command'" id="section-command" class="form-section">
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
                        共
                        <strong>{{ task.commands.length }}</strong>
                        条命令
                      </el-button>
                      <el-input
                        v-model="task.commandFilter"
                        placeholder="搜索命令"
                        clearable
                        size="small"
                        style="width: 200px; margin-left: auto"
                      />
                    </div>
                    <div class="command-list">
                      <pre
                        v-for="(cmd, cmdIndex) in filteredTaskCommands(task)"
                        :key="cmdIndex"
                        class="command-item"
                        >{{ cmd.cmd || cmd.command }}</pre
                      >
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
                  <AcmDeviceSelector v-model="task.hosts" ci-types="[auto]" />
                </div>
              </el-form-item>
            </div>

            <!-- 运行参数 -->
            <div v-if="job.type !== 'command'" id="section-params" class="form-section">
              <div class="section-header">
                <div class="section-title">运行参数</div>
                <span class="section-badge">{{ job.params.length }} 项</span>
              </div>

              <el-form-item>
                <div class="params-panel">
                  <div class="params-toolbar">
                    <span class="params-toolbar__summary">
                      {{
                        job.params.length
                          ? `已配置 ${job.params.length} 个运行参数`
                          : '当前未配置运行参数'
                      }}
                    </span>
                    <div class="params-toolbar__actions">
                      <el-button class="ms-auto" @click="addParam">
                        <i class="fa fa-plus"></i>
                        添加参数
                      </el-button>
                      <el-button @click="addParamAuto">
                        <i class="fa fa-brackets-curly"></i>
                        解析参数
                      </el-button>
                    </div>
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
                        <el-button size="small" link type="danger" @click="deleteParam(row)">
                          <el-icon><Delete /></el-icon>
                        </el-button>
                      </template>
                    </el-table-column>
                  </el-table>

                  <div v-else class="section-empty-state">
                    <i class="fa fa-sliders-h"></i>
                    <strong>暂无运行参数</strong>
                    <span>可以手动新增，也可以先配置脚本或 CURL 后自动解析。</span>
                  </div>
                </div>
              </el-form-item>
            </div>

            <!-- 日志和审核 -->
            <div id="section-audit" class="form-section">
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
                <el-checkbox v-model="jobConfig.audit.enabled">记录操作日志</el-checkbox>
              </el-form-item>

              <el-form-item v-if="jobConfig.audit.enabled" label="模块">
                <el-input
                  v-model="jobConfig.audit.module"
                  maxlength="50"
                  style="width: 300px"
                  placeholder="日志所属的功能模块"
                />
              </el-form-item>

              <el-form-item v-if="jobConfig.audit.enabled" label="操作">
                <el-input
                  v-model="jobConfig.audit.action"
                  maxlength="100"
                  style="width: 300px"
                  placeholder="具体的操作类型"
                />
              </el-form-item>

              <el-form-item label="操作延时">
                <el-checkbox v-model="job.needDelayed">延时执行</el-checkbox>
              </el-form-item>
            </div>

            <!-- 测试运维工具 -->
            <div v-if="!viewMode" id="section-test" class="form-section">
              <div class="section-header">
                <div class="section-title">测试运维工具</div>
                <div class="test-section-meta">
                  <span class="section-badge">{{ testStatusLabel }}</span>
                  <span v-if="testRunId && !testJobResult" class="test-section-run-id">
                    Run ID {{ testRunId }}
                  </span>
                </div>
              </div>

              <el-form-item>
                <div class="test-panel">
                  <div class="test-controls">
                    <el-button
                      v-if="testJobStatus && (testRunId || testJobResult)"
                      text
                      type="primary"
                      class="test-result-link"
                      @click="viewTestResult"
                    >
                      <i class="fa fa-fw fa-arrow-down"></i>
                      <span>查看结果</span>
                    </el-button>

                    <el-button
                      type="primary"
                      :loading="testJobRunning"
                      :disabled="testJobRunning || !canRunSavedJobTest"
                      @click="runTestJob"
                    >
                      <i class="fa fa-fw fa-chevron-right"></i>
                      运行测试
                    </el-button>

                    <span v-if="!isEditMode" class="test-hint">请先保存运维工具，再运行测试。</span>
                  </div>

                  <div
                    v-if="testJobResult"
                    ref="testResultRef"
                    :class="['test-result-preview', `is-${testResultPreviewState}`]"
                  >
                    <div class="test-result-preview__header">
                      <span>运行结果预览</span>
                      <span v-if="testRunId" class="test-result-preview__meta">
                        Run ID: {{ testRunId }}
                      </span>
                    </div>
                    <pre>{{ formattedTestJobResult }}</pre>
                  </div>
                </div>
              </el-form-item>
            </div>
          </el-form>
        </div>
      </el-scrollbar>

      <div v-if="viewMode" class="dialog-footer create-job-drawer__footer">
        <div class="create-job-drawer__footer-info">
          <span v-for="item in footerFacts" :key="item" class="create-job-drawer__footer-pill">
            {{ item }}
          </span>
        </div>
        <div class="create-job-drawer__footer-actions">
          <el-button @click="handleClose">关闭</el-button>
        </div>
      </div>
      <div v-else class="dialog-footer create-job-drawer__footer">
        <div class="create-job-drawer__footer-info">
          <span v-for="item in footerFacts" :key="item" class="create-job-drawer__footer-pill">
            {{ item }}
          </span>
        </div>
        <div class="create-job-drawer__footer-actions">
          <el-button @click="handleClose">取消</el-button>
          <el-button type="primary" :loading="submitting" :disabled="loading" @click="save">
            保存
          </el-button>
        </div>
      </div>
    </div>
  </el-drawer>

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
import { ref, computed, watch, reactive, nextTick } from 'vue'
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
  set: val => emit('update:modelValue', val)
})

// 是否为编辑模式
const isEditMode = computed(() => !!props.jobId)

// 加载中状态
const loading = ref(false)

const dialogTitle = computed(() => {
  const typeOption = CREATE_JOB_TYPE_OPTIONS.find(opt => opt.value === job.type)
  if (props.viewMode) {
    return typeOption ? `查看${typeOption.label}` : '查看运维工具'
  }
  if (isEditMode.value) {
    return typeOption ? `编辑${typeOption.label}` : '编辑运维工具'
  }
  return typeOption ? `新建${typeOption.label}` : '新建运维工具'
})

const drawerModeLabel = computed(() => {
  if (props.viewMode) {
    return '查看模式'
  }
  return isEditMode.value ? '编辑模式' : '新建模式'
})

const currentTypeLabel = computed(() => {
  const currentType = job.type || props.jobType
  const typeOption = CREATE_JOB_TYPE_OPTIONS.find(opt => opt.value === currentType)
  return typeOption?.label || '待选择'
})

const currentAppletLabel = computed(() => {
  const currentAppletCode = job.appletCode || props.appletCode
  if (!currentAppletCode) {
    return '未指定'
  }

  const matchedApplet = props.appletsList.find(item => item.name === currentAppletCode)
  return (
    matchedApplet?.displayTitle || matchedApplet?.title || matchedApplet?.name || currentAppletCode
  )
})

const scriptFileCount = computed(() =>
  jobConfig.tasks.reduce((count, task) => count + (task.scripts?.length || 0), 0)
)

const commandCount = computed(() =>
  commandConfig.tasks.reduce((count, task) => count + (task.commands?.length || 0), 0)
)

const testStatusLabel = computed(() => testJobStatus.value?.title || '未运行')

const footerFacts = computed(() => {
  const facts = [currentTypeLabel.value, currentAppletLabel.value]

  if (job.type === 'script') {
    facts.push(`脚本 ${scriptFileCount.value}`)
  } else if (job.type === 'command') {
    facts.push(`命令 ${commandCount.value}`)
  } else if (job.type === 'rest') {
    facts.push(restConfig.curl ? '已配置 CURL' : '未配置 CURL')
  }

  if (job.type !== 'command') {
    facts.push(`参数 ${job.params.length}`)
  }

  if (!props.viewMode) {
    facts.push(`测试 ${testStatusLabel.value}`)
  }

  return facts
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
const testResultRef = ref(null)
const canRunSavedJobTest = computed(() => canRunTest.value && isEditMode.value)
const testResultPreviewState = computed(() => testJobStatus.value?.name || 'default')
const formattedTestJobResult = computed(() => formatTestJobResult(testJobResult.value))

// 导航区块配置
const navSections = computed(() => {
  const sections = [{ id: 'section-base', label: '基本设置' }]

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
    sections.push({ id: 'section-test', label: '测试运维工具' })
  }

  return sections
})

// 表单是否禁用（查看模式下禁用所有表单元素）
const formDisabled = computed(() => props.viewMode || loading.value)

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

function formatTestJobResult(result) {
  if (!result) return ''
  if (typeof result === 'string') return result
  try {
    return JSON.stringify(result, null, 2)
  } catch {
    return String(result)
  }
}

function extractResponseData(response) {
  return response?.data ?? response ?? null
}

function extractRunId(result) {
  if (Array.isArray(result)) {
    const firstItem = result[0] || {}
    return firstItem.runId || firstItem.id || ''
  }
  return result?.runId || result?.id || ''
}

function normalizeStatus(status) {
  return String(status || '').toLowerCase()
}

/**
 * 滚动到指定区块
 */
function scrollToSection(sectionId) {
  activeSection.value = sectionId
  const wrap = getScrollbarWrap()
  const element = wrap?.querySelector(`#${sectionId}`) || document.getElementById(sectionId)
  if (wrap && element) {
    wrap.scrollTo({
      top: Math.max(element.offsetTop - 12, 0),
      behavior: 'smooth'
    })
    return
  }

  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function getScrollbarWrap() {
  return scrollbarRef.value?.wrapRef || null
}

function updateActiveSection(scrollTop = 0) {
  const wrap = getScrollbarWrap()
  if (!wrap) return

  const current = [...navSections.value].reverse().find(section => {
    const element = wrap.querySelector(`#${section.id}`)
    return element ? scrollTop + 36 >= element.offsetTop : false
  })

  activeSection.value = current?.id || navSections.value[0]?.id || 'section-base'
}

function handleFormScroll({ scrollTop }) {
  updateActiveSection(scrollTop)
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
  tasks: [
    {
      scripts: [],
      hosts: [],
      hostsMode: 'param',
      hostsParam: 'hosts',
      hostsText: ''
    }
  ],
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
  tasks: [
    {
      commands: [],
      hosts: [],
      hostsMode: 'param',
      commandFilter: ''
    }
  ]
})

// 当前任务的脚本列表（用于文件选择器）
const currentTaskScripts = computed(() => {
  const task = jobConfig.tasks[currentTaskIndex.value]
  if (!task || !task.scripts) return []
  return task.scripts.map(s => ({ path: s.location }))
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
  return task.commands.filter(
    cmd =>
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

  task.scripts = files.map(f => ({
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

  const paths = scripts.map(s => s.location)
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
    jobConfig.tasks.forEach(task => {
      task.scripts.forEach(script => {
        // 从 argline 中提取参数
        const matches = (script.argline || '').match(/\{\{(\w+)\}\}/g)
        if (matches) {
          matches.forEach(match => {
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
      matches.forEach(match => {
        const paramName = match.replace(/\{\{|\}\}/g, '')
        if (!paramList.includes(paramName)) {
          paramList.push(paramName)
        }
      })
    }
  }

  // 过滤掉已存在的参数
  const existingParams = job.params.map(p => p.name)
  const newParams = paramList.filter(p => !existingParams.includes(p))

  if (newParams.length === 0) {
    ElMessage.info('未发现新参数')
    return
  }

  // 添加新参数
  newParams.forEach(paramName => {
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
    config.tasks = jobConfig.tasks.map(task => {
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
    config.tasks = commandConfig.tasks.map(task => ({
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
    ElMessage.warning('请输入运维工具标题')
    return false
  }

  if (job.type === 'script') {
    // 检查是否有脚本
    const hasScripts = jobConfig.tasks.some(task => task.scripts && task.scripts.length > 0)
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
    const hasCommands = commandConfig.tasks.some(task => task.commands && task.commands.length > 0)
    if (!hasCommands) {
      ElMessage.warning('请至少选择一条命令')
      return false
    }
    // 检查是否有主机
    const hasHosts = commandConfig.tasks.some(task => task.hosts && task.hosts.length > 0)
    if (!hasHosts) {
      ElMessage.warning('请至少选择一台主机')
      return false
    }
  }

  // 验证参数名称唯一性
  const paramNames = job.params.map(p => p.name).filter(Boolean)
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
  jobConfig.tasks = [
    {
      scripts: [],
      hosts: [],
      hostsMode: 'param',
      hostsParam: 'hosts',
      hostsText: ''
    }
  ]
  jobConfig.audit = {
    enabled: false,
    module: '',
    action: ''
  }

  restConfig.curl = ''

  commandConfig.tasks = [
    {
      commands: [],
      hosts: [],
      hostsMode: 'param',
      commandFilter: ''
    }
  ]

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
    ElMessage.warning('请先完善运维工具配置')
    return
  }

  if (!props.jobId) {
    ElMessage.warning('请先保存运维工具后再运行测试')
    return
  }

  testJobRunning.value = true
  testJobStatus.value = {
    name: 'running',
    title: '运行中',
    icon: 'fa-spinner fa-pulse',
    type: 'primary'
  }
  testJobResult.value = null
  testRunId.value = null

  try {
    // 构建执行参数
    const params = {}
    job.params.forEach(p => {
      if (p.name && p.defaultValue !== undefined) {
        params[p.name] = p.defaultValue
      }
    })

    const payload = {
      jobId: props.jobId,
      title: job.title,
      type: job.type,
      configJson: toConfigJson(),
      params,
      isTest: true
    }

    const response = await jaoApi.executeJob(payload)
    const result = extractResponseData(response)
    testRunId.value = extractRunId(result)

    if (testRunId.value) {
      // 轮询获取结果
      pollTestResult()
    } else {
      const status = normalizeStatus(Array.isArray(result) ? result[0]?.status : result?.status)
      if (['running', 'pending', 'waiting'].includes(status)) {
        testJobStatus.value = {
          name: 'running',
          title: '运行中',
          icon: 'fa-spinner fa-pulse',
          type: 'primary'
        }
      } else if (['error', 'failed', 'failure'].includes(status)) {
        testJobStatus.value = {
          name: 'error',
          title: '执行失败',
          icon: 'fa-exclamation-triangle',
          type: 'danger'
        }
      } else {
        testJobStatus.value = {
          name: 'success',
          title: '执行成功',
          icon: 'fa-check-circle',
          type: 'success'
        }
      }
      testJobResult.value = result
    }
  } catch (error) {
    testJobStatus.value = {
      name: 'error',
      title: '执行失败',
      icon: 'fa-exclamation-triangle',
      type: 'danger'
    }
    testJobResult.value = extractResponseData(error?.response) || {
      error: error?.message || '执行失败'
    }
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
      const result = extractResponseData(response)
      const status = normalizeStatus(result?.status)

      if (['running', 'pending', 'waiting'].includes(status)) {
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, pollInterval)
        } else {
          testJobStatus.value = {
            name: 'timeout',
            title: '执行超时',
            icon: 'fa-clock',
            type: 'warning'
          }
          testJobResult.value = result
        }
      } else if (['success', 'completed', 'ok'].includes(status)) {
        testJobStatus.value = {
          name: 'success',
          title: '执行成功',
          icon: 'fa-check-circle',
          type: 'success'
        }
        testJobResult.value = result
      } else {
        testJobStatus.value = {
          name: 'error',
          title: '执行失败',
          icon: 'fa-exclamation-triangle',
          type: 'danger'
        }
        testJobResult.value = result
      }
    } catch (error) {
      testJobStatus.value = {
        name: 'error',
        title: '获取结果失败',
        icon: 'fa-exclamation-triangle',
        type: 'danger'
      }
      testJobResult.value = extractResponseData(error?.response) || {
        error: error?.message || '获取结果失败'
      }
    }
  }

  poll()
}

/**
 * 查看测试结果
 */
function viewTestResult() {
  if (testResultRef.value) {
    testResultRef.value.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }

  scrollToSection('section-test')
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
          hostsText: normalizeAcmDeviceSelection(task.hosts, 'linux')
            .map(host => host.value)
            .join('\n')
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
    console.error('加载运维工具详情失败:', error)
    ElMessage.error('加载运维工具详情失败')
  } finally {
    loading.value = false
    await nextTick()
    updateActiveSection(getScrollbarWrap()?.scrollTop || 0)
  }
}

// 监听对话框打开，初始化数据
watch(
  () => props.modelValue,
  async newVal => {
    if (newVal) {
      resetForm()
      if (props.jobId) {
        // 编辑模式：加载作业详情
        await loadJobDetail(props.jobId)
      } else {
        // 新建模式
        job.type = props.jobType || ''
        job.appletCode = props.appletCode || ''
        await nextTick()
        const wrap = getScrollbarWrap()
        wrap?.scrollTo({ top: 0 })
        updateActiveSection(0)
      }
    }
  },
  { immediate: true }
)

// 监听 jobType prop 变化
watch(
  () => props.jobType,
  async newVal => {
    if (props.modelValue && !isEditMode.value) {
      job.type = newVal || ''
      await nextTick()
      updateActiveSection(getScrollbarWrap()?.scrollTop || 0)
    }
  }
)

watch(
  () => job.type,
  async () => {
    if (!props.modelValue) return
    await nextTick()
    updateActiveSection(getScrollbarWrap()?.scrollTop || 0)
  }
)
</script>

<style scoped lang="scss">
:global(.create-job-drawer) {
  max-width: 1320px;
  --create-job-drawer-surface: var(--el-bg-color);
  --create-job-drawer-divider: var(--el-border-color-lighter);
  --create-job-drawer-masthead-bg: linear-gradient(
    180deg,
    color-mix(in srgb, var(--el-color-primary-light-9) 78%, transparent) 0%,
    transparent 100%
  );
  --create-job-drawer-eyebrow-bg: var(--el-color-primary-light-9);
  --create-job-drawer-eyebrow-text: var(--el-color-primary);
  --create-job-drawer-meta-bg: var(--el-fill-color-blank);
  --create-job-drawer-meta-border: var(--el-border-color-light);
  --create-job-drawer-nav-bg: var(--el-bg-color);
  --create-job-drawer-nav-hover-bg: var(--el-color-primary-light-9);
  --create-job-drawer-nav-active-bg: color-mix(in srgb, var(--el-color-primary-light-9) 76%, white);
  --create-job-drawer-footer-bg: linear-gradient(
    0deg,
    var(--el-fill-color-light) 0%,
    var(--el-bg-color) 100%
  );
  --create-job-drawer-footer-pill-bg: var(--el-fill-color-light);
  --create-job-drawer-command-list-bg: var(--el-fill-color-light);
  --create-job-drawer-command-item-bg: var(--el-bg-color);
  --create-job-drawer-command-item-border: var(--el-border-color-lighter);
  --create-job-drawer-command-text: var(--el-text-color-primary);
}

:global(.create-job-drawer .el-drawer) {
  background: var(--create-job-drawer-surface);
}

:global(.create-job-drawer .el-drawer__header) {
  margin-bottom: 0;
  padding: 16px 20px 10px;
  border-bottom: 1px solid var(--create-job-drawer-divider);
  background: var(--create-job-drawer-surface);
}

:global(.create-job-drawer .el-drawer__title) {
  font-size: 20px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

:global(.create-job-drawer .el-drawer__body) {
  padding: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--create-job-drawer-surface);
}

.create-job-drawer__layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.create-job-drawer__masthead {
  padding: 10px 20px 12px;
  border-bottom: 1px solid var(--create-job-drawer-divider);
  background: var(--create-job-drawer-masthead-bg);
}

.create-job-drawer__summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.create-job-drawer__eyebrow {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--create-job-drawer-eyebrow-bg);
  color: var(--create-job-drawer-eyebrow-text);
  font-size: 12px;
  font-weight: 600;
}

.create-job-drawer__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.create-job-drawer__meta-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  background: var(--create-job-drawer-meta-bg);
  border: 1px solid var(--create-job-drawer-meta-border);
}

.create-job-drawer__meta-item em {
  font-style: normal;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.create-job-drawer__meta-item strong {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.create-job-drawer__nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.create-job-drawer__nav-item {
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 999px;
  background: var(--create-job-drawer-nav-bg);
  color: var(--el-text-color-regular);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.create-job-drawer__nav-item:hover {
  border-color: var(--el-color-primary-light-5);
  background: var(--create-job-drawer-nav-hover-bg);
  color: var(--el-color-primary);
}

.create-job-drawer__nav-item.is-active {
  border-color: var(--el-color-primary-light-5);
  background: var(--create-job-drawer-nav-active-bg);
  color: var(--el-color-primary);
}

.create-job-drawer__scroll {
  flex: 1;
  min-height: 0;
}

.create-job-drawer__content {
  padding: 14px 20px 20px;
}

.create-job-drawer__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-shrink: 0;
  padding: 14px 20px 18px;
  border-top: 1px solid var(--create-job-drawer-divider);
  background: var(--create-job-drawer-footer-bg);
}

.create-job-drawer__footer-info {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.create-job-drawer__footer-pill {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--create-job-drawer-footer-pill-bg);
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.create-job-drawer__footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-left: auto;
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
  margin-bottom: 16px;
  padding: 14px 16px 2px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background-color: var(--el-fill-color-blank);
  scroll-margin-top: 18px;

  &:last-child {
    margin-bottom: 0;
  }

  .section-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin-bottom: 14px;
  }

  .el-form-item {
    margin-bottom: 16px;
  }
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.test-section-meta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.test-section-run-id {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.section-badge {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-size: 12px;
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

.params-panel {
  width: 100%;
}

.params-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.params-toolbar__summary {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.params-toolbar__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.section-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 180px;
  margin-top: 10px;
  border: 1px dashed var(--el-border-color);
  border-radius: 10px;
  background: var(--el-fill-color-lighter);
  text-align: center;
  color: var(--el-text-color-secondary);
}

.section-empty-state i {
  font-size: 24px;
  color: var(--el-text-color-placeholder);
}

.section-empty-state strong {
  font-size: 15px;
  color: var(--el-text-color-primary);
}

.section-empty-state span {
  max-width: 420px;
  font-size: 12px;
  line-height: 1.6;
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
  background-color: var(--create-job-drawer-command-list-bg);
  border: 1px solid var(--create-job-drawer-command-item-border);
  border-radius: 8px;
  padding: 8px;
  margin-top: 8px;

  .command-item {
    margin: 0;
    padding: 8px 12px;
    background: var(--create-job-drawer-command-item-bg);
    border: 1px solid var(--create-job-drawer-command-item-border);
    border-radius: 6px;
    line-height: 1.6;
    font-size: 13px;
    font-family: 'Consolas', 'Monaco', monospace;
    color: var(--create-job-drawer-command-text);
    white-space: pre-wrap;
    word-break: break-all;

    &:not(:last-child) {
      margin-bottom: 8px;
    }
  }
}

// 测试控件
.test-controls {
  width: 100%;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;

  :deep(.el-button) {
    &[type='success'] {
      box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.2);
    }

    &[type='danger'] {
      box-shadow: 0 0 0 3px rgba(245, 108, 108, 0.2);
    }

    &[type='warning'] {
      box-shadow: 0 0 0 3px rgba(230, 162, 60, 0.2);
    }
  }
}

.test-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.test-result-link {
  padding-left: 0;
}

.test-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

// 测试结果预览
.test-result-preview {
  width: 100%;
  box-sizing: border-box;
  padding: 16px;
  background: linear-gradient(180deg, #2f3b52 0%, #1f2937 100%);
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 8px;
  max-height: 360px;
  overflow: auto;

  &.is-error {
    border-color: rgba(248, 113, 113, 0.35);
  }

  &.is-success {
    border-color: rgba(74, 222, 128, 0.35);
  }

  &.is-timeout {
    border-color: rgba(251, 191, 36, 0.35);
  }

  .test-result-preview__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    color: #f8fafc;
    font-size: 13px;
    font-weight: 600;
  }

  .test-result-preview__meta {
    font-size: 12px;
    font-weight: 500;
    color: #cbd5e1;
  }

  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    overflow-wrap: anywhere;
    line-height: 1.6;
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

@media (max-width: 960px) {
  .create-job-drawer {
    :deep(.el-drawer) {
      width: 100% !important;
      max-width: none;
    }
  }

  .create-job-drawer__masthead,
  .create-job-drawer__content,
  .create-job-drawer__footer {
    padding-left: 14px;
    padding-right: 14px;
  }

  .create-job-drawer__summary {
    flex-direction: column;
  }

  .create-job-drawer__footer {
    flex-direction: column;
    align-items: stretch;
  }

  .create-job-drawer__footer-actions {
    margin-left: 0;
  }

  .section-header,
  .params-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .test-section-meta {
    width: 100%;
    justify-content: flex-start;
  }
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

<style lang="scss">
html.dark .create-job-drawer {
  --create-job-drawer-surface: linear-gradient(
    180deg,
    rgba(17, 24, 39, 0.98) 0%,
    rgba(15, 23, 42, 0.98) 100%
  );
  --create-job-drawer-divider: rgba(71, 85, 105, 0.62);
  --create-job-drawer-masthead-bg: linear-gradient(
    180deg,
    rgba(59, 130, 246, 0.14) 0%,
    rgba(15, 23, 42, 0) 100%
  );
  --create-job-drawer-eyebrow-bg: rgba(59, 130, 246, 0.16);
  --create-job-drawer-eyebrow-text: #93c5fd;
  --create-job-drawer-meta-bg: rgba(15, 23, 42, 0.9);
  --create-job-drawer-meta-border: rgba(71, 85, 105, 0.62);
  --create-job-drawer-nav-bg: rgba(15, 23, 42, 0.92);
  --create-job-drawer-nav-hover-bg: rgba(30, 41, 59, 0.94);
  --create-job-drawer-nav-active-bg: rgba(59, 130, 246, 0.18);
  --create-job-drawer-footer-bg: linear-gradient(
    0deg,
    rgba(15, 23, 42, 0.98) 0%,
    rgba(17, 24, 39, 0.94) 100%
  );
  --create-job-drawer-footer-pill-bg: rgba(30, 41, 59, 0.9);
  --create-job-drawer-command-list-bg: rgba(30, 41, 59, 0.74);
  --create-job-drawer-command-item-bg: rgba(15, 23, 42, 0.96);
  --create-job-drawer-command-item-border: rgba(71, 85, 105, 0.58);
  --create-job-drawer-command-text: #e5eefc;
}

html.dark .create-job-drawer .create-job-drawer__nav-item.is-active {
  border-color: rgba(96, 165, 250, 0.42);
  color: #93c5fd;
}
html.dark .create-job-drawer .create-job-drawer__nav-item:hover {
  border-color: rgba(96, 165, 250, 0.42);
  color: #93c5fd;
}
</style>
