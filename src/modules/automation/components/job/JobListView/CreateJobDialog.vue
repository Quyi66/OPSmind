<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="1200px"
    destroy-on-close
    @close="handleClose"
    :close-on-click-modal="false"
    class="create-job-dialog"
  >
    <div class="dialog-body-wrapper">
      <!-- 左侧导航 -->
      <nav class="section-nav">
        <ul class="nav-list">
          <li
            v-for="section in navSections"
            :key="section.id"
            class="nav-item"
            :class="{ 'is-active': activeSection === section.id }"
            @click="scrollToSection(section.id)"
          >
            {{ section.label }}
          </li>
        </ul>
      </nav>

      <!-- 右侧表单内容 -->
      <el-scrollbar class="form-content" ref="scrollbarRef">
        <form class="op-smartform form-vertical op-bold-label" id="js-job-edit-new">
          <!-- 基本设置 -->
          <fieldset id="section-base" class="form-fieldset">
            <legend class="form-legend">基本设置</legend>

            <div class="form-group">
              <label class="control-label">标题 <span class="required-mark">*</span></label>
              <div class="form-control-wrapper">
                <el-input v-model="job.title" placeholder="请输入作业标题" />
              </div>
            </div>

            <div class="form-group">
              <label class="control-label">描述</label>
              <div class="form-control-wrapper">
                <el-input
                  v-model="job.description"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入作业描述"
                />
              </div>
            </div>
          </fieldset>

          <!-- 脚本作业配置 (Script类型) -->
          <fieldset v-if="job.type === 'script'" id="section-script" class="form-fieldset">
            <legend class="form-legend">脚本设置</legend>

          <!-- 脚本类型 -->
          <div class="form-group">
            <label class="control-label">脚本类型</label>
            <div class="form-control-wrapper d-inline-block">
              <div class="opx-check-group opx-secondary btn-group">
                <input
                  type="radio"
                  name="job_scriptType"
                  value="playbook"
                  v-model="jobConfig.scriptType"
                  id="job_scriptType_playbook"
                >
                <label for="job_scriptType_playbook">Ansible Playbook</label>
                <input
                  type="radio"
                  name="job_scriptType"
                  value="adhoc"
                  v-model="jobConfig.scriptType"
                  id="job_scriptType_adhoc"
                >
                <label for="job_scriptType_adhoc">普通脚本</label>
              </div>
            </div>
          </div>

          <!-- 脚本任务步骤 -->
          <div class="form-group">
            <div
              v-for="(task, taskIndex) in jobConfig.tasks"
              :key="taskIndex"
              class="task-card"
            >
              <div v-if="jobConfig.tasks.length > 1" class="task-card-header">
                <h4 class="task-title">
                  <span class="task-badge">{{ taskIndex + 1 }}</span>
                </h4>
                <el-button size="small" @click="removeTask(taskIndex)">删除步骤</el-button>
              </div>

              <div class="task-card-body">
                <!-- 脚本选择 -->
                <div class="form-group op-align-horizontal">
                  <label class="control-label font-weight-bold text-left" style="width: 4rem;">脚本 <span class="required-mark">*</span></label>
                  <div class="form-control-wrapper">
                    <!-- 已选脚本列表 -->
                    <div v-if="task.scripts && task.scripts.length > 0" class="selected-scripts">
                      <el-button size="small" @click="openFileSelector(taskIndex)">
                        共 <strong>{{ task.scripts.length }}</strong> 个文件
                      </el-button>
                      <table class="scripts-table">
                        <tbody>
                          <tr v-for="(script, scriptIndex) in task.scripts" :key="scriptIndex">
                            <td style="max-width: 300px;">
                              <div class="script-path">
                                <span
                                  v-if="fileStatusMap[script.location]"
                                  class="gfs-missing-file"
                                  title="文件不存在"
                                >
                                  {{ script.location }}
                                  <i class="fa fa-exclamation-triangle text-warning"></i>
                                </span>
                                <span v-else>{{ script.location }}</span>
                              </div>
                            </td>
                            <td style="width: 240px;">
                              <el-input
                                v-model="script.argline"
                                size="small"
                                placeholder="ansible-playbook 额外参数"
                              />
                            </td>
                            <td style="width: 150px;">
                              <el-input
                                v-model="script.tag"
                                size="small"
                                placeholder="tag标签"
                              />
                            </td>
                            <td style="width: 60px;" class="text-center">
                              <el-button
                                size="small"
                                link
                                type="danger"
                                @click="removeScript(task, scriptIndex)"
                              >
                                <i class="fa fa-minus"></i>
                              </el-button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <!-- 空状态 - 选择文件按钮 -->
                    <div v-else class="op-blank-slate bg-light p-3">
                      <div class="op-blank-slate-icon">
                        <i class="fa fa-file-alt" style="font-size: 3rem; color: #909399;"></i>
                      </div>
                      <div style="margin-top: 12px;">
                        <el-button @click="openFileSelector(taskIndex)">
                          选择文件
                        </el-button>
                      </div>
                    </div>

                    <!-- 脚本参数提示 -->
                    <details class="help-block">
                      <summary>脚本参数</summary>
                      <div>支持使用参数变量，格式：&#123;&#123;param_name&#125;&#125;</div>
                      <div v-if="jobConfig.scriptType === 'playbook'">
                        使用 Ansible Playbook 时，参数会传入 extra_vars:
                        <ul>
                          <li>字符串、数字：直接传入</li>
                          <li>数组：转换为 JSON 字符串</li>
                        </ul>
                      </div>
                    </details>
                  </div>
                </div>

                <!-- 主机配置 -->
                <div class="form-group op-align-horizontal">
                  <label class="control-label font-weight-bold text-left" style="width: 4rem;">
                    主机
                    <el-tooltip content="指定脚本执行的目标主机" placement="top">
                      <i class="fa fa-question-circle text-muted"></i>
                    </el-tooltip>
                  </label>
                  <div class="form-control-wrapper">
                    <div class="w-full">
                      <!-- 主机模式选择 -->
                      <div class="opx-check-group opx-secondary btn-group">
                        <input
                          type="radio"
                          :name="'hostsMode_' + taskIndex"
                          v-model="task.hostsMode"
                          :id="'hosts_by_param_' + taskIndex"
                          value="param"
                        >
                        <label :for="'hosts_by_param_' + taskIndex">
                          <i class="fa fa-brackets-curly"></i> 参数传入
                        </label>
                        <input
                          type="radio"
                          :name="'hostsMode_' + taskIndex"
                          v-model="task.hostsMode"
                          :id="'hosts_defined_' + taskIndex"
                          value=""
                        >
                        <label :for="'hosts_defined_' + taskIndex">
                          <i class="fa fa-list-ul"></i> 预定义
                        </label>
                      </div>

                      <!-- 预定义主机 -->
                      <div v-if="task.hostsMode !== 'param'" class="mt-3">
                        <AcmDeviceSelector
                          v-model="task.hosts"
                          ci-types="[auto]"
                        />
                      </div>

                      <!-- 参数传入 -->
                      <div v-if="task.hostsMode === 'param'" class="mt-3 d-flex align-items-center">
                        <label class="control-label w-auto ms-3">变量名</label>
                        <el-input
                          v-model="task.hostsParam"
                          placeholder="主机参数名称"
                          style="width: 200px; margin-left: 12px;"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 回调API -->
          <div class="form-group">
            <label class="control-label">
              回调API
              <el-tooltip content="作业执行完成后回调的URL地址" placement="top">
                <i class="fa fa-question-circle text-muted"></i>
              </el-tooltip>
            </label>
            <div class="form-control-wrapper">
              <el-input v-model="jobConfig.callback" placeholder="执行完成后回调的URL" />
            </div>
          </div>

          <!-- 任务超时 -->
          <div class="form-group">
            <label class="control-label">
              任务超时
              <el-tooltip content="任务执行超时时间，-1表示不限制" placement="top">
                <i class="fa fa-question-circle text-muted"></i>
              </el-tooltip>
            </label>
            <div class="form-control-wrapper">
              <div class="input-group w-sm">
                <el-input-number
                  v-model="jobConfig.taskTimeout"
                  :min="-1"
                  :step="60"
                  controls-position="right"
                  style="width: 150px;"
                />
                <span class="input-group-text">秒</span>
              </div>
            </div>
          </div>

          <!-- 详细输出 -->
          <div class="form-group">
            <label class="control-label">
              详细输出
              <el-tooltip content="控制ansible执行时的输出详细程度" placement="top">
                <i class="fa fa-question-circle text-muted"></i>
              </el-tooltip>
            </label>
            <div class="form-control-wrapper">
              <el-select v-model="jobConfig.verbosity" style="width: 200px;">
                <el-option label="正常" :value="0" />
                <el-option label="详细 (-v)" :value="1" />
                <el-option label="更详细 (-vv)" :value="2" />
                <el-option label="调试 (-vvv)" :value="3" />
                <el-option label="连接调试 (-vvvv)" :value="4" />
              </el-select>
            </div>
          </div>
        </fieldset>

        <!-- REST 作业配置 -->
        <fieldset v-if="job.type === 'rest'" id="section-rest" class="form-fieldset">
          <legend class="form-legend">REST设置</legend>

          <div class="form-group">
            <label class="control-label">CURL <span class="required-mark">*</span></label>
            <div class="form-control-wrapper">
              <el-input
                v-model="restConfig.curl"
                type="textarea"
                :rows="8"
                :placeholder="curlPlaceholder"
                style="font-family: 'Consolas', 'Monaco', monospace;"
              />
            </div>
            <div class="help-block">
              支持使用参数变量，格式：<code v-pre>{{param_name}}</code>
            </div>
          </div>
        </fieldset>

        <!-- 命令作业配置 -->
        <fieldset v-if="job.type === 'command'" id="section-command" class="form-fieldset">
          <legend class="form-legend">命令设置</legend>

          <div class="form-group">
            <div class="d-flex mb-3">
              <label class="control-label">执行步骤</label>
            </div>
            <div
              v-for="(task, taskIndex) in commandConfig.tasks"
              :key="taskIndex"
              class="task-card"
            >
              <div class="task-card-body">
                <!-- 命令选择 -->
                <div class="form-group op-align-horizontal">
                  <label class="control-label font-weight-bold text-left" style="width: 4rem;">命令 <span class="required-mark">*</span></label>
                  <div class="form-control-wrapper">
                    <!-- 已选命令列表 -->
                    <div v-if="task.commands && task.commands.length > 0" class="selected-commands">
                      <div class="d-flex flex-nowrap align-items-center">
                        <el-button size="small" @click="openCommandSelector(taskIndex)">
                          共 <strong>{{ task.commands.length }}</strong> 条命令
                        </el-button>
                        <el-input
                          v-model="task.commandFilter"
                          placeholder="搜索命令"
                          clearable
                          size="small"
                          class="ms-auto"
                          style="width: 200px;"
                        />
                      </div>
                      <div class="command-preview-list">
                        <pre
                          v-for="(cmd, cmdIndex) in filteredTaskCommands(task)"
                          :key="cmdIndex"
                          class="command-preview-item"
                        >{{ cmd.cmd || cmd.command }}</pre>
                      </div>
                    </div>

                    <!-- 空状态 - 选择命令按钮 -->
                    <div v-else class="op-blank-slate bg-light p-3">
                      <div class="op-blank-slate-icon">
                        <i class="fa fa-terminal" style="font-size: 3rem; color: #909399;"></i>
                      </div>
                      <div style="margin-top: 12px;">
                        <el-button @click="openCommandSelector(taskIndex)">
                          选择命令
                        </el-button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 主机配置 -->
                <div class="form-group op-align-horizontal">
                  <label class="control-label font-weight-bold text-left" style="width: 4rem;">
                    主机 <span class="required-mark">*</span>
                    <el-tooltip content="指定命令执行的目标主机" placement="top">
                      <i class="fa fa-question-circle text-muted"></i>
                    </el-tooltip>
                  </label>
                  <div class="form-control-wrapper">
                    <AcmDeviceSelector
                      v-model="task.hosts"
                      ci-types="[auto]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </fieldset>

        <!-- 运行参数 -->
        <fieldset v-if="job.type !== 'command'" id="section-params" class="form-fieldset">
          <legend class="form-legend">
            运行参数
            <el-tooltip content="定义作业执行时需要传入的参数" placement="top">
              <i class="fa fa-question-circle text-muted" style="margin-left: 4px;"></i>
            </el-tooltip>
          </legend>

          <div class="form-group">
            <div class="d-flex">
              <el-button @click="addParamAuto" title="自动从脚本或CURL中解析变量参数">
                <i class="fa fa-brackets-curly"></i>
                解析参数
              </el-button>
              <el-button class="ms-auto" @click="addParam" title="添加参数">
                <i class="fa fa-plus"></i>
              </el-button>
            </div>

            <el-table
              v-if="job.params && job.params.length > 0"
              :data="job.params"
              border
              size="small"
              class="param-table mt-3"
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
                  <el-select v-model="row.type" size="small" placeholder="类型">
                    <el-option
                      v-for="pt in paramTypeList"
                      :key="pt.type"
                      :label="pt.title"
                      :value="pt.type"
                    />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="加密" width="70" align="left">
                <template #default="{ row }">
                  <el-checkbox v-model="row.secret" />
                </template>
              </el-table-column>
              <el-table-column label="" width="50" align="left">
                <template #default="{ row }">
                  <el-button
                    size="small"
                    link
                    type="danger"
                    @click="deleteParam(row)"
                    title="删除参数"
                  >
                    <i class="fa fa-minus"></i>
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </fieldset>

        <!-- 日志和审核 -->
        <fieldset id="section-audit" class="form-fieldset">
          <legend class="form-legend">日志和审核</legend>

          <!-- 审批与复核 -->
          <div class="form-group">
            <label class="control-label">操作审批</label>
            <div class="form-control-wrapper op-combo">
              <div class="checkbox checkbox-secondary">
                <input
                  type="checkbox"
                  v-model="job.needApprove"
                  id="je_needApprove"
                  :disabled="job.needReview"
                >
                <label for="je_needApprove">
                  需要审批
                  <el-tooltip content="执行前需要审批人员批准" placement="top">
                    <i class="fa fa-question-circle text-muted"></i>
                  </el-tooltip>
                </label>
              </div>
              <div class="checkbox checkbox-secondary">
                <input
                  type="checkbox"
                  v-model="job.needReview"
                  id="je_needReview"
                  :disabled="job.needApprove"
                >
                <label for="je_needReview">
                  双人复核
                  <el-tooltip content="执行结果需要复核人员确认" placement="top">
                    <i class="fa fa-question-circle text-muted"></i>
                  </el-tooltip>
                </label>
              </div>
            </div>
          </div>

          <!-- 操作日志 -->
          <div v-if="job.type !== 'command'" class="form-group">
            <label class="control-label">操作日志</label>
            <div class="form-control-wrapper">
              <div class="checkbox checkbox-secondary">
                <input
                  type="checkbox"
                  v-model="jobConfig.audit.enabled"
                  id="je_auditenabled"
                >
                <label for="je_auditenabled">
                  记录操作日志
                  <el-tooltip content="记录作业执行的详细日志" placement="top">
                    <i class="fa fa-question-circle text-muted"></i>
                  </el-tooltip>
                </label>
              </div>
            </div>

            <!-- 日志详细配置 -->
            <div v-if="jobConfig.audit.enabled" class="op-form-subgroup d-flex mt-2">
              <div class="form-control-wrapper op-combo">
                <label class="control-label">
                  模块
                  <el-tooltip content="日志所属的功能模块" placement="top">
                    <i class="fa fa-question-circle text-muted"></i>
                  </el-tooltip>
                </label>
                <el-input
                  v-model="jobConfig.audit.module"
                  maxlength="50"
                  style="width: 150px; margin-left: 8px;"
                />
                <label class="control-label" style="margin-left: 16px;">
                  操作
                  <el-tooltip content="具体的操作类型" placement="top">
                    <i class="fa fa-question-circle text-muted"></i>
                  </el-tooltip>
                </label>
                <el-input
                  v-model="jobConfig.audit.action"
                  maxlength="100"
                  style="width: 150px; margin-left: 8px;"
                />
              </div>
            </div>
          </div>

          <!-- 操作延时 -->
          <div class="form-group">
            <label class="control-label">操作延时</label>
            <div class="form-control-wrapper op-combo">
              <div class="checkbox checkbox-secondary">
                <input
                  type="checkbox"
                  v-model="job.needDelayed"
                  id="je_needDelayed"
                >
                <label for="je_needDelayed">
                  延时执行
                  <el-tooltip content="执行时可以设置延迟时间" placement="top">
                    <i class="fa fa-question-circle text-muted"></i>
                  </el-tooltip>
                </label>
              </div>
            </div>
          </div>
        </fieldset>

        <!-- 测试作业 -->
        <fieldset id="section-test" class="form-fieldset">
          <legend class="form-legend">测试作业</legend>

          <div class="test-job-section">
            <div class="d-flex align-items-center justify-content-between">
              <!-- 运行状态 -->
              <div v-if="testJobStatus" class="test-status">
                <el-button
                  :type="testJobStatus.type"
                  :class="['status-btn', `status-${testJobStatus.name}`]"
                  @click="viewTestResult"
                >
                  <i :class="['fa', 'fa-fw', testJobStatus.icon]"></i>
                  <span>{{ testJobStatus.title }}</span>
                </el-button>
              </div>

              <!-- 运行按钮 -->
              <div class="ms-auto">
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
            </div>

            <!-- 运行结果预览 -->
            <div
              v-if="testJobResult"
              class="test-result-preview"
            >
              <pre>{{ JSON.stringify(testJobResult, null, 2) }}</pre>
            </div>
          </div>
        </fieldset>
        </form>
      </el-scrollbar>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="save"
        >
          保存并关闭
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
import { JOB_TYPE_OPTIONS } from '@/modules/automation/stores/useJobStore'

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
  sections.push({ id: 'section-test', label: '测试作业' })

  return sections
})

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
        taskConfig.hosts = task.hosts || []
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
      hosts: task.hosts || [],
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
    console.log('查看执行结果:', testRunId.value)
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
          hosts: task.hosts || [],
          hostsMode: task.hostsMode || (task.hostsParam ? 'param' : ''),
          hostsParam: task.hostsParam || 'hosts',
          hostsText: Array.isArray(task.hosts) ? task.hosts.join('\n') : ''
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
          hosts: task.hosts || [],
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
    padding: 0;
  }
}

// 对话框主体容器
.dialog-body-wrapper {
  display: flex;
  height: 70vh;
  overflow: hidden;
}

// 左侧导航
.section-nav {
  width: 140px;
  min-width: 140px;
  background-color: var(--el-fill-color-light);
  border-right: 1px solid var(--el-border-color-lighter);
  padding: 16px 0;

  .nav-list {
    list-style: none;
    margin: 0;
    padding: 0 12px;
  }

  .nav-item {
    padding: 10px 12px;
    cursor: pointer;
    border-radius: 4px;
    font-size: 14px;
    color: var(--el-text-color-regular);
    transition: all 0.2s;
    margin-bottom: 4px;

    &:hover {
      background-color: var(--el-fill-color);
      color: var(--el-color-primary);
    }

    &.is-active {
      background-color: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
      font-weight: 500;
    }
  }
}

// 右侧表单内容区
.form-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.op-smartform {
  .form-fieldset {
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 4px;
    padding: 16px 20px;
    margin-bottom: 24px;
    background-color: var(--el-fill-color-blank);

    .form-legend {
      font-size: 15px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      padding: 0 8px;
      margin-bottom: 0;
      width: auto;
      border: none;
    }
  }

  .form-group {
    margin-bottom: 18px;

    .control-label {
      font-weight: 500;
      color: var(--el-text-color-primary);
      margin-bottom: 8px;
      display: inline-block;
    }

    .required-mark {
      color: var(--el-color-danger);
    }
  }

  .op-align-horizontal {
    display: flex;
    align-items: flex-start;

    .control-label {
      flex-shrink: 0;
      padding-top: 8px;
    }

    .form-control-wrapper {
      flex: 1;
    }
  }
}

// 复选框组样式（模拟原Angular项目样式）
.opx-check-group.btn-group {
  display: inline-flex;

  input[type="radio"] {
    display: none;

    &:checked + label {
      background-color: var(--el-color-primary);
      color: #fff;
      border-color: var(--el-color-primary);
    }
  }

  label {
    padding: 6px 16px;
    border: 1px solid var(--el-border-color);
    background-color: #fff;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;

    &:first-of-type {
      border-radius: 4px 0 0 4px;
    }

    &:last-of-type {
      border-radius: 0 4px 4px 0;
    }

    &:not(:first-of-type) {
      margin-left: -1px;
    }

    &:hover {
      color: var(--el-color-primary);
    }

    i {
      margin-right: 4px;
    }
  }
}

// 复选框样式
.checkbox {
  display: flex;
  align-items: center;
  margin-right: 20px;
  margin-bottom: 8px;

  input[type="checkbox"] {
    margin-right: 8px;
    width: 16px;
    height: 16px;
  }

  label {
    cursor: pointer;
    user-select: none;
  }
}

.op-combo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

// 任务卡片
.task-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  margin-bottom: 16px;
  background-color: #fafafa;

  .task-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background-color: var(--el-fill-color-light);
    border-bottom: 1px solid var(--el-border-color-lighter);

    .task-title {
      margin: 0;
      font-size: 14px;
    }

    .task-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      background-color: var(--el-color-primary);
      color: #fff;
      border-radius: 50%;
      font-size: 12px;
    }
  }

  .task-card-body {
    padding: 16px;
  }
}

// 脚本列表
.selected-scripts {
  .scripts-table {
    margin-top: 12px;
    width: 100%;
    border-collapse: collapse;

    td {
      padding: 8px 12px;
      vertical-align: middle;
      border: 1px solid var(--el-border-color-lighter);
    }
  }

  .script-path {
    word-break: break-all;
  }

  .gfs-missing-file {
    color: var(--el-color-danger);
  }
}

// 命令列表
.selected-commands {
  .command-preview-list {
    max-height: 200px;
    overflow-y: auto;
    margin-top: 12px;
    background: #f8f9fa;
    border-radius: 4px;

    &::-webkit-scrollbar {
      width: 5px;
    }

    &::-webkit-scrollbar-track {
      background-color: #f8f9fa;
    }

    &::-webkit-scrollbar-thumb {
      border-radius: 5px;
      background-color: #e9ecef;
    }
  }

  .command-preview-item {
    margin: 0;
    padding: 8px 12px;
    border: none;
    background: transparent;
    line-height: 1.6;
    font-size: 13px;
    font-family: 'Consolas', 'Monaco', monospace;
    white-space: pre-wrap;
    word-break: break-all;

    &:not(:last-child) {
      border-bottom: 1px solid #e9ecef;
    }
  }
}

// 空状态
.op-blank-slate {
  text-align: center;
  padding: 24px;
  border: 2px dashed var(--el-border-color);
  border-radius: 4px;
}

// 帮助文本
.help-block {
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);

  summary {
    cursor: pointer;
    color: var(--el-color-primary);

    &:hover {
      text-decoration: underline;
    }
  }

  ul {
    margin: 8px 0 0 20px;
    padding: 0;
  }
}

// 输入组
.input-group {
  display: inline-flex;
  align-items: center;

  &.w-sm {
    width: auto;
  }

  .input-group-text {
    padding: 0 12px;
    background-color: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color);
    border-left: none;
    border-radius: 0 4px 4px 0;
    height: 32px;
    line-height: 32px;
    font-size: 14px;
  }

  :deep(.el-input-number) {
    .el-input__wrapper {
      border-radius: 4px 0 0 4px;
    }
  }
}

// 子表单组
.op-form-subgroup {
  padding-left: 20px;
  border-left: 3px solid var(--el-border-color-light);
  margin-left: 20px;
}

// 参数表格
.param-table {
  :deep(.el-table__header) {
    th {
      background-color: var(--el-fill-color-light);
      font-weight: 600;
    }
  }

  :deep(.el-input),
  :deep(.el-select) {
    width: 100%;
  }
}

// 底部按钮
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

// 测试作业区域
.test-job-section {
  .test-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .test-status {
    .status-btn {
      border-radius: 50px;
      padding: 8px 20px;
      font-size: 14px;
      min-width: 8rem;
      transition: all 0.2s;

      &.status-running {
        animation: ani-glow-primary 2s infinite;
      }

      &.status-success {
        box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.2);
      }

      &.status-error {
        box-shadow: 0 0 0 3px rgba(245, 108, 108, 0.2);
      }

      &.status-timeout {
        box-shadow: 0 0 0 3px rgba(230, 162, 60, 0.2);
      }
    }
  }

  .test-result-preview {
    margin-top: 16px;
    padding: 12px;
    background-color: #2d3748;
    color: #e2e8f0;
    border-radius: 4px;
    max-height: 20rem;
    overflow: auto;

    pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-all;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 13px;
    }
  }

  .test-hint {
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }
}

@keyframes ani-glow-primary {
  0% {
    box-shadow: 0 0 0 0 transparent;
  }
  50% {
    box-shadow: 0 0 0 6px rgba(64, 158, 255, 0.3);
  }
  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}

// 工具类
.d-flex {
  display: flex;
}

.d-inline-block {
  display: inline-block;
}

.align-items-center {
  align-items: center;
}

.justify-content-between {
  justify-content: space-between;
}

.justify-content-start {
  justify-content: flex-start;
}

.mt-2 {
  margin-top: 8px;
}

.mt-3 {
  margin-top: 12px;
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

.text-center {
  text-align: center;
}

.text-muted {
  color: var(--el-text-color-secondary);
}

.font-weight-bold {
  font-weight: 600;
}

.bg-light {
  background-color: var(--el-fill-color-light);
}

.p-3 {
  padding: 12px;
}

.mb-3 {
  margin-bottom: 12px;
}

.flex-nowrap {
  flex-wrap: nowrap;
}

.text-warning {
  color: var(--el-color-warning);
}
</style>
