<template>
  <div>
    <!-- 补丁安装向导对话框 -->
    <el-dialog
      v-model="isVisible"
      title="补丁安装向导"
      width="1000px"
      :close-on-click-modal="false"
      class="install-dialog"
      top="5vh"
      @closed="resetInstallState"
    >
      <!-- 自定义步骤条（新6步） -->
      <div class="ops-stepper">
        <template v-for="(step, idx) in wizardSteps" :key="idx">
          <div
            class="stepper-item"
            :class="{
              'is-active': installStep === idx,
              'is-success': installStep > idx,
              'is-failed': stepStates[idx] === 'failed'
            }"
          >
            <div class="stepper-icon">
              <i v-if="stepStates[idx] === 'failed'" class="fa fa-times"></i>
              <i v-else-if="installStep > idx" class="fa fa-check"></i>
              <span v-else>{{ idx + 1 }}</span>
            </div>
            <div class="stepper-title">{{ step.title }}</div>
          </div>
          <div
            v-if="idx < wizardSteps.length - 1"
            class="stepper-line"
            :class="{ 'is-active': installStep > idx }"
          ></div>
        </template>
      </div>

      <!-- Step 0: 选择目标主机 -->
      <div v-show="installStep === 0" class="install-content" v-loading="installDataLoading">
        <!-- 更新补丁 -->
        <div class="install-card">
          <div class="card-header">
            <i class="fa fa-lock" />
            更新补丁
          </div>
          <div class="card-body">
            {{ patchesToInstall.map(p => p.patch_id).join(', ') }}
          </div>
        </div>

        <!-- 待更新软件包 -->
        <div class="install-card">
          <div class="card-header">
            <i class="fa fa-cube" />
            待更新软件包
          </div>
          <div class="card-body card-body--scroll">
            <div v-for="pkg in affectedPackages" :key="pkg" class="package-item">
              {{ pkg }}
            </div>
            <div v-if="affectedPackages.length === 0" class="no-data">暂无数据</div>
          </div>
        </div>

        <!-- 更新主机 -->
        <div class="install-card mt-3">
          <div class="card-header">
            <i class="fa fa-list" />
            更新主机
          </div>
          <div class="card-body" v-if="fixedHost">
             共 1 台：{{ fixedHost.hostname || fixedHost.hostKey || fixedHost.hostId || '当前主机' }}
          </div>
          <div class="card-body" v-else>
            <div class="host-toolbar">
              <el-select v-model="hostFilter" size="small" style="width: 140px">
                <el-option label="@@(linux)" value="@@(linux)">
                  <i class="fa fa-server" />
                  @@(linux)
                </el-option>
              </el-select>
              <el-input
                v-model="hostSearchText"
                placeholder="搜索"
                prefix-icon="Search"
                size="small"
                style="width: 200px"
                clearable
              />
            </div>
            <el-table
              ref="hostTableRef"
              :data="filteredHosts"
              size="small"
              height="220"
              @selection-change="handleHostSelectionChange"
            >
              <el-table-column type="selection" width="40" />
              <el-table-column prop="hostKey" label="主机" min-width="200" sortable>
                <template #default="{ row }">
                  <span class="host-link">{{ row.hostKey }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="os_distro" label="OS" width="100" sortable />
              <el-table-column prop="os_version" label="OS版本" width="100" sortable />
              <el-table-column prop="scan_timestamp" label="上次扫描时间" width="180" sortable>
                <template #default="{ row }">
                  {{ formatDateTime(row.scan_timestamp) }}
                </template>
              </el-table-column>
            </el-table>
            <div class="host-pagination">
              <el-pagination
                v-model:current-page="hostPagination.page"
                v-model:page-size="hostPagination.pageSize"
                :page-sizes="[10, 20, 50]"
                :total="hostPagination.total"
                layout="total, sizes, prev, pager, next, jumper"
                size="small"
                background
                @size-change="handleHostSizeChange"
                @current-change="handleHostPageChange"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Step 1: 预执行脚本 -->
      <div v-show="installStep === 1" class="task-step-content">
        <div class="task-step-editor">
          <div class="task-step-editor__title">
            <i class="fa fa-code" style="margin-right:6px"></i>预执行脚本
            <span class="task-step-editor__hint">（可编辑，执行前将提交至后端）</span>
          </div>
          <el-input
            type="textarea"
            v-model="installConfig.preScript"
            :autosize="{ minRows: 8, maxRows: 16 }"
            placeholder="#!/bin/bash&#10;# 在此输入升级前需要执行的命令或脚本"
            class="script-input"
            :disabled="stepStates[1] === 'running' || stepStates[1] === 'success'"
          />
        </div>
        <!-- 执行状态展示 -->
        <div class="task-step-action">
          <el-alert
            v-if="stepStates[1] === 'success' || stepStates[1] === 'failed'"
            :type="stepStates[1] === 'success' ? 'success' : 'error'"
            :closable="false"
            show-icon
            :title="stepStates[1] === 'success' ? '预执行脚本执行完毕' : '执行失败：' + taskErrorMessage"
            class="task-step-alert"
          >
            <template #default v-if="taskDetailData && taskDetailData.preCheckRunId">
              <div class="task-detail-info">
                <el-button type="primary" link @click="openExecuteResult(taskDetailData.preCheckRunId, '预执行脚本')" style="font-size: 14px">查看执行详情</el-button>
              </div>
            </template>
          </el-alert>
        </div>
      </div>

      <!-- Step 2: 补丁安装 -->
      <div v-show="installStep === 2" class="task-step-content">
        <div class="task-step-editor">
          <div class="task-step-editor__title">
            <i class="fa fa-download" style="margin-right:6px"></i>补丁安装
          </div>
          <div class="install-summary-card">
            <div class="install-summary-row">
              <span class="install-summary-label">待安装补丁</span>
              <span class="install-summary-value">{{ patchesToInstall.map(p => p.patch_id).join(', ') }}</span>
            </div>
            <div class="install-summary-row">
              <span class="install-summary-label">目标主机</span>
              <span class="install-summary-value">共 {{ selectedHosts.length }} 台</span>
            </div>
            <div class="install-summary-row">
              <span class="install-summary-label">待更新软件包</span>
              <span class="install-summary-value">{{ affectedPackages.length }} 个</span>
            </div>
          </div>
        </div>
        <!-- 执行状态展示 -->
        <div class="task-step-action">
          <el-alert
            v-if="stepStates[2] === 'success' || stepStates[2] === 'failed'"
            :type="stepStates[2] === 'success' ? 'success' : 'error'"
            :closable="false"
            show-icon
            :title="stepStates[2] === 'success' ? '补丁安装完成' : '安装失败：' + taskErrorMessage"
            class="task-step-alert"
          >
            <template #default v-if="taskDetailData && taskDetailData.installRunId">
              <div class="task-detail-info">
                <el-button type="primary" link @click="openExecuteResult(taskDetailData.installRunId, '补丁安装')" style="font-size: 14px">查看执行详情</el-button>
              </div>
            </template>
          </el-alert>
        </div>
      </div>

      <!-- Step 3: 校验脚本 -->
      <div v-show="installStep === 3" class="task-step-content">
        <div class="task-step-editor">
          <div class="task-step-editor__title">
            <i class="fa fa-check-square-o" style="margin-right:6px"></i>校验脚本
            <span class="task-step-editor__hint">（可编辑，执行前将提交至后端）</span>
          </div>
          <el-input
            type="textarea"
            v-model="installConfig.postScript"
            :autosize="{ minRows: 8, maxRows: 16 }"
            placeholder="#!/bin/bash&#10;# 在此输入系统升级完成后的校验脚本"
            class="script-input"
            :disabled="stepStates[3] === 'running' || stepStates[3] === 'success'"
          />
        </div>
        <!-- 执行状态展示 -->
        <div class="task-step-action">
          <el-alert
            v-if="stepStates[3] === 'success' || stepStates[3] === 'failed'"
            :type="stepStates[3] === 'success' ? 'success' : 'error'"
            :closable="false"
            show-icon
            :title="stepStates[3] === 'success' ? '全部校验通过' : '校验失败：' + taskErrorMessage"
            class="task-step-alert"
          >
            <template #default v-if="taskDetailData && taskDetailData.validateRunId">
              <div class="task-detail-info">
                <el-button type="primary" link @click="openExecuteResult(taskDetailData.validateRunId, '校验脚本')" style="font-size: 14px">查看执行详情</el-button>
              </div>
            </template>
          </el-alert>
        </div>
      </div>

      <!-- Step 4: 重启策略 -->
      <div v-show="installStep === 4" class="task-step-content">
        <div class="task-step-editor">
          <div class="task-step-editor__title">
            <i class="fa fa-refresh" style="margin-right:6px"></i>重启策略
          </div>
          <el-alert
            :title="'系统重启建议：' + (backendRestartReason || smartRestartGuess)"
            type="info"
            show-icon
            :closable="false"
            style="margin-bottom: 16px; line-height: 1.4; width: 100%"
          />
          <el-radio-group
            v-model="installConfig.restartPolicy"
            class="restart-radio-group"
            :disabled="stepStates[4] === 'running' || stepStates[4] === 'success'"
          >
            <el-radio label="system">系统重启</el-radio>
            <el-radio label="service">服务重启</el-radio>
            <el-radio label="none">不重启（跳过）</el-radio>
          </el-radio-group>
        </div>
        <!-- 执行状态展示 -->
        <div class="task-step-action">
          <el-alert
            v-if="stepStates[4] === 'success' || stepStates[4] === 'failed'"
            :type="stepStates[4] === 'success' ? 'success' : 'error'"
            :closable="false"
            show-icon
            :title="stepStates[4] === 'success' ? (installConfig.restartPolicy === 'none' ? '已跳过重启' : '重启完成') : '重启失败：' + taskErrorMessage"
            class="task-step-alert"
          >
            <template #default v-if="taskDetailData && taskDetailData.restartRunId">
              <div class="task-detail-info">
                <el-button type="primary" link @click="openExecuteResult(taskDetailData.restartRunId, '执行重启')" style="font-size: 14px">查看执行详情</el-button>
              </div>
            </template>
          </el-alert>
        </div>
      </div>

      <!-- Step 5: 完成 -->
      <div v-show="installStep === 5" class="task-done-content">
        <div class="task-done-icon">
          <i class="fa fa-check-circle" style="font-size:56px; color: var(--el-color-success);"></i>
        </div>
        <div class="task-done-title">补丁安装任务已全部完成</div>
        <div class="task-done-desc">
          共安装 {{ patchesToInstall.length }} 个补丁，目标主机 {{ selectedHosts.length }} 台。
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <!-- Step 0 取消 -->
          <el-button v-if="installStep === 0" @click="isVisible = false">取消</el-button>

          <!-- 上一步：仅在非执行中时允许回退 -->
          <el-button
            v-if="installStep > 0 && installStep < 5 && stepStates[installStep] !== 'running'"
            @click="goBack"
          >
            <i class="fa fa-chevron-left" style="margin-right: 4px" /> 上一步
          </el-button>

          <!-- 执行动作按钮：只有当当前步骤在1~4且为未执行或执行失败时显示 -->
          <el-button
            v-if="installStep >= 1 && installStep <= 4 && (stepStates[installStep] === 'idle' || stepStates[installStep] === 'failed')"
            type="primary"
            @click="executeStep(installStep)"
          >
            <i class="fa fa-play" style="margin-right:6px"></i>
            <span v-if="installStep === 1">{{ stepStates[1] === 'failed' ? '重新执行预检查' : '执行预检查' }}</span>
            <span v-else-if="installStep === 2">{{ stepStates[2] === 'failed' ? '重试安装' : '开始安装' }}</span>
            <span v-else-if="installStep === 3">{{ stepStates[3] === 'failed' ? '重新执行校验' : '执行校验' }}</span>
            <span v-else-if="installStep === 4">{{
              stepStates[4] === 'failed' ? '重试执行重启' :
              (installConfig.restartPolicy === 'none' ? '跳过重启，继续' : '确认并执行重启')
            }}</span>
          </el-button>

          <!-- 正在执行按钮：只为展示 loading 状态 -->
          <el-button
            v-if="installStep >= 1 && installStep <= 4 && stepStates[installStep] === 'running'"
            type="primary"
            loading
            disabled
          >
            <span v-if="installStep === 1">正在执行...</span>
            <span v-else-if="installStep === 2">正在安装...</span>
            <span v-else-if="installStep === 3">正在校验...</span>
            <span v-else-if="installStep === 4">{{ installConfig.restartPolicy === 'system' ? '正在执行系统重启...' : installConfig.restartPolicy === 'service' ? '正在执行服务重启...' : '正在跳过重启...' }}</span>
          </el-button>

          <!-- 下一步按钮：仅在第一步选择了主机或中间步骤成功后出现 -->
          <el-button
            v-if="installStep === 0 || (installStep >= 1 && installStep <= 4 && stepStates[installStep] === 'success')"
            type="primary"
            :disabled="installStep === 0 && selectedHosts.length === 0"
            @click="handleNextStep"
          >
            下一步 <i class="fa fa-chevron-right" style="margin-left: 4px" />
          </el-button>

          <!-- 完成关闭 -->
          <el-button
            v-if="installStep === 5"
            type="primary"
            @click="isVisible = false"
          >
            <i class="fa fa-check" style="margin-right: 4px" />
            完成
          </el-button>
        </div>
      </template>
    </el-dialog>

    <ExecuteResultDialog
      v-model:visible="executeResultVisible"
      :run-id="currentExecuteRunId"
      :job-title="currentExecuteJobTitle"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { patchInstallApi } from '../../api'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  patchesToInstall: { type: Array, default: () => [] },
  fixedHost: { type: Object, default: null } // 如果有，跳过步骤0的主机选择
})
const emit = defineEmits(['update:visible', 'success'])

const isVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const installDataLoading = ref(false)
const affectedPackages = ref([])
const affectedHosts = ref([])
const selectedHosts = ref([])

// watch visibility to load data
watch(() => props.visible, (val) => {
  if (val) {
    if (props.fixedHost) {
      selectedHosts.value = [props.fixedHost]
      affectedHosts.value = [props.fixedHost]
    }
    loadInstallData(props.patchesToInstall.map(p => p.patch_id))
  } else {
    resetInstallState()
  }
})

// 加载安装相关数据（软件包列表、主机列表）
async function loadInstallData(patchIds) {
  if (!patchIds || patchIds.length === 0) return
  installDataLoading.value = true
  affectedPackages.value = []
  if (props.fixedHost) {
    affectedHosts.value = [props.fixedHost]
    selectedHosts.value = [props.fixedHost]
  } else {
    affectedHosts.value = []
    selectedHosts.value = []
  }
  try {
    const promises = [patchInstallApi.getAffectedPackages({ patch_ids: patchIds })]
    if (!props.fixedHost) {
      promises.push(patchInstallApi.getMachinesByPatch({ patch_ids: patchIds, hostId: '@@(linux)' }))
    }
    const responses = await Promise.all(promises)
    const pkgResponse = responses[0]

    if (pkgResponse?.data?.records) {
      affectedPackages.value = pkgResponse.data.records.map(r => r.file_name || r.pkg_name)
    }

    if (!props.fixedHost) {
      const hostResponse = responses[1]
      if (hostResponse?.data?.records) {
        affectedHosts.value = hostResponse.data.records
      }
    }
  } catch (error) {
    console.error('Failed to load install data:', error)
  } finally {
    installDataLoading.value = false
  }
}

const hostTableRef = ref(null)
const hostFilter = ref('@@(linux)')
const hostSearchText = ref('')
const hostPagination = reactive({ page: 1, pageSize: 10, total: 0 })

// 过滤后的主机列表
const filteredHosts = computed(() => {
  let hosts = affectedHosts.value
  if (hostSearchText.value) {
    const keyword = hostSearchText.value.toLowerCase()
    hosts = hosts.filter(
      h =>
        h.hostKey?.toLowerCase().includes(keyword) || h.os_distro?.toLowerCase().includes(keyword)
    )
  }
  // 更新总数
  hostPagination.total = hosts.length
  // 分页
  const start = (hostPagination.page - 1) * hostPagination.pageSize
  const end = start + hostPagination.pageSize
  return hosts.slice(start, end)
})

// 主机分页处理
function handleHostPageChange(page) {
  hostPagination.page = page
}

function handleHostSizeChange(size) {
  hostPagination.pageSize = size
  hostPagination.page = 1
}

function handleHostSelectionChange(selection) {
  selectedHosts.value = selection
}

// 格式化日期时间
function formatDateTime(timestamp) {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date
    .toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    .replace(/\//g, '-')
}

// ============================================================
// 新向导步骤定义（6步）
// ============================================================
const wizardSteps = [
  { title: '选择目标主机' },
  { title: '预执行脚本' },
  { title: '补丁安装' },
  { title: '校验脚本' },
  { title: '重启策略' },
  { title: '完成' }
]

// Wizard state
const installStep = ref(0)
const createdTaskId = ref('')
const backendRestartReason = ref('')
const installConfig = reactive({
  preScript: '',
  restartPolicy: 'none',
  postScript: ''
})

// 每步的执行状态: 'idle' | 'running' | 'success' | 'failed'
const stepStates = reactive(['idle', 'idle', 'idle', 'idle', 'idle', 'idle'])
const taskStatus = ref('')       // 后端任务状态
const taskErrorMessage = ref('') // 错误信息
const taskDetailData = ref(null) // 从接口返回的任务详情
let pollTimer = null

// 执行详情弹窗
const executeResultVisible = ref(false)
const currentExecuteRunId = ref('')
const currentExecuteJobTitle = ref('')

function openExecuteResult(runId, jobTitle) {
  currentExecuteRunId.value = runId
  currentExecuteJobTitle.value = jobTitle
  executeResultVisible.value = true
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onUnmounted(() => stopPolling())

function resetInstallState() {
  stopPolling()
  installStep.value = 0
  createdTaskId.value = ''
  backendRestartReason.value = ''
  installConfig.preScript = ''
  installConfig.restartPolicy = 'none'
  installConfig.postScript = ''
  if (!props.fixedHost) {
    selectedHosts.value = []
  }
  taskStatus.value = ''
  taskErrorMessage.value = ''
  taskDetailData.value = null
  for (let i = 0; i < stepStates.length; i++) stepStates[i] = 'idle'
}

// Smart reboot guess
const smartRestartGuess = computed(() => {
  const patches = props.patchesToInstall
  let needsSystem = false
  let needsService = false
  for (const patch of patches) {
    const id = patch.patch_id?.toLowerCase() || ''
    if (patch.rebootStatus === 'system' || patch.isKernel === 'is_kernel' || id.includes('kernel')) {
      needsSystem = true
    } else if (patch.rebootStatus === 'service') {
      needsService = true
    }
  }
  const pkgs = affectedPackages.value.join(' ').toLowerCase()
  if (pkgs.includes('kernel')) {
    needsSystem = true
  }

  if (needsSystem) return '系统重启 (System Restart)'
  if (needsService || pkgs.includes('glibc') || pkgs.includes('openssl')) return '服务重启 (Service Restart)'
  return '无需重启 (None)'
})

// 步骤0 → 创建任务并进入步骤1
async function handleNextStep() {
  const step = installStep.value

  if (step === 0) {
    if (selectedHosts.value.length === 0) return

    installDataLoading.value = true
    try {
      const res = await patchInstallApi.createTask({
        hostIds: selectedHosts.value.map(h => h.hostId || h.id), // support both
        patchIds: props.patchesToInstall.map(p => p.patch_id),
        patchStatusIds: props.patchesToInstall.map(p => p.id).filter(Boolean),
        osType: 'linux'
      })

      if (res?.data) {
        createdTaskId.value = res.data.id || ''
        if (res.data.restartType && ['system', 'service', 'none'].includes(res.data.restartType)) {
          installConfig.restartPolicy = res.data.restartType
        } else {
          installConfig.restartPolicy = 'none'
        }
        backendRestartReason.value = res.data.restartReason || ''
        if (res.data.preCheckScript && !installConfig.preScript) {
          installConfig.preScript = res.data.preCheckScript
        }
        if (res.data.validateScript && !installConfig.postScript) {
          installConfig.postScript = res.data.validateScript
        }
      }
      installStep.value = 1
    } catch (error) {
      console.warn('API /create failed, falling back to local heuristic', error)
      ElMessage.warning('未能连接后端智能预判接口，已自动降级为本地启发式策略。')
      backendRestartReason.value = '（后端评估网络异常，目前显示本地启发式评估）'
      installStep.value = 1
    } finally {
      installDataLoading.value = false
    }
    return
  }

  if (step >= 1 && step <= 4) {
    if (stepStates[step] === 'success') {
      installStep.value = step + 1
    } else if (stepStates[step] === 'failed') {
      stepStates[step] = 'idle'
      taskErrorMessage.value = ''
    }
  }
}

function goBack() {
  if (installStep.value > 0) {
    installStep.value--
  }
}

async function executeStep(step) {
  if (!createdTaskId.value) {
    ElMessage.error('任务ID不存在，请重试')
    return
  }
  stepStates[step] = 'running'
  taskErrorMessage.value = ''
  stopPolling()

  try {
    if (step === 1) {
      await patchInstallApi.executePreCheck(createdTaskId.value)
      pollStatus(step, ['PRE_CHECKING'], ['PRE_CHECK_DONE'], ['PRE_CHECK_FAILED'])
    } else if (step === 2) {
      await patchInstallApi.executeInstallTask(createdTaskId.value)
      pollStatus(step, ['INSTALLING'], ['INSTALL_DONE'], ['INSTALL_FAILED'])
    } else if (step === 3) {
      await patchInstallApi.executeValidate(createdTaskId.value)
      pollStatus(step, ['VALIDATING'], ['COMPLETED'], ['VALIDATE_FAILED'])
    } else if (step === 4) {
      if (installConfig.restartPolicy === 'none') {
        stepStates[4] = 'success'
        return
      }
      const restartAction = ['system', 'service'].includes(installConfig.restartPolicy)
        ? installConfig.restartPolicy
        : 'system'
      await patchInstallApi.confirmRestart(createdTaskId.value, restartAction)
      await patchInstallApi.executeRestart(createdTaskId.value)
      pollStatus(step, ['RESTARTING', 'RESTART_PENDING'], ['RESTART_DONE'], ['RESTART_FAILED'])
    }
  } catch (error) {
    stepStates[step] = 'failed'
    taskErrorMessage.value = error?.message || '接口调用失败'
    ElMessage.error(`步骤执行失败：${taskErrorMessage.value}`)
  }
}

function pollStatus(step, runningStatuses, successStatuses, failedStatuses) {
  stopPolling()
  pollTimer = setInterval(async () => {
    try {
      const res = await patchInstallApi.getTask(createdTaskId.value)
      const data = res?.data
      if (!data) return

      taskStatus.value = data.status
      taskErrorMessage.value = data.errorMessage || ''
      taskDetailData.value = data

      if (successStatuses.includes(data.status)) {
        stepStates[step] = 'success'
        stopPolling()
        if (step === 4) emit('success')
      } else if (failedStatuses.includes(data.status)) {
        stepStates[step] = 'failed'
        taskErrorMessage.value = data.errorMessage || `${wizardSteps[step]?.title || '任务'}失败`
        stopPolling()
      }
    } catch (error) {
      console.error('轮询任务状态失败:', error)
    }
  }, 3000)
}
</script>

<style scoped lang="scss">
.ops-stepper { display: flex; align-items: flex-start; justify-content: center; margin-bottom: 30px; padding: 0 40px; }
.stepper-item { display: flex; flex-direction: column; align-items: center; width: 90px; position: relative; z-index: 1; }
.stepper-item .stepper-icon { width: 26px; height: 26px; border-radius: 50%; background-color: var(--el-bg-color, #fff); border: 2px solid var(--el-text-color-placeholder, #a8abb2); color: var(--el-text-color-placeholder, #a8abb2); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-bottom: 6px; transition: all 0.3s; }
.stepper-item .stepper-title { font-size: 12px; color: var(--el-text-color-regular, #606266); font-weight: 500; transition: all 0.3s; text-align: center; white-space: nowrap; }
.stepper-item.is-active .stepper-icon { border-color: var(--el-color-primary, #409eff); background-color: var(--el-color-primary, #409eff); color: #fff; }
.stepper-item.is-active .stepper-title { color: var(--el-color-primary, #409eff); font-weight: bold; }
.stepper-item.is-success .stepper-icon { border-color: var(--el-color-success, #67c23a); color: var(--el-color-success, #67c23a); background-color: var(--el-bg-color, #fff); }
.stepper-item.is-success .stepper-title { color: var(--el-color-success, #67c23a); }
.stepper-item.is-failed .stepper-icon { border-color: var(--el-color-danger, #f56c6c); background-color: var(--el-color-danger, #f56c6c); color: #fff; }
.stepper-item.is-failed .stepper-title { color: var(--el-color-danger, #f56c6c); }
.stepper-line { flex: 1; height: 2px; background-color: var(--el-border-color-lighter, #ebeef5); margin: 12px -30px 0; z-index: 0; transition: all 0.3s; }
.stepper-line.is-active { background-color: var(--el-color-success, #67c23a); }
.task-step-content { display: flex; flex-direction: column; gap: 16px; min-height: 280px; }
.task-step-editor { display: flex; flex-direction: column; gap: 10px; }
.task-step-editor__title { font-size: 14px; font-weight: 600; color: var(--el-text-color-primary); padding: 4px 0; display: flex; align-items: center; gap: 4px; }
.task-step-editor__hint { font-size: 12px; color: var(--el-text-color-secondary); font-weight: 400; }
.task-step-action { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; margin-top: 4px; }
.task-step-alert { width: 100%; }
.task-detail-info { font-size: 13px; margin-top: 4px; color: var(--el-text-color-regular); }
.install-summary-card { border: 1px solid var(--el-border-color-lighter); border-radius: 6px; overflow: hidden; margin-top: 4px; }
.install-summary-row { display: flex; align-items: flex-start; gap: 12px; padding: 10px 14px; font-size: 13px; border-bottom: 1px solid var(--el-border-color-lighter); }
.install-summary-row:last-child { border-bottom: none; }
.install-summary-label { min-width: 90px; color: var(--el-text-color-secondary); flex-shrink: 0; font-size: 12px; }
.install-summary-value { color: var(--el-text-color-primary); word-break: break-all; }
.task-done-content { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 320px; gap: 16px; text-align: center; }
.task-done-icon { animation: pulse-success 0.6s ease-out; }
@keyframes pulse-success { 0% { transform: scale(0.6); opacity: 0; } 70% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
.install-card { margin-bottom: 16px; border: 1px solid var(--el-border-color-lighter); border-radius: 4px; overflow: hidden; }
.install-card .card-header { background: var(--el-fill-color-light); padding: 8px 12px; font-weight: 500; font-size: 13px; color: var(--el-text-color-primary); border-bottom: 1px solid var(--el-border-color-lighter); }
.install-card .card-body { padding: 10px 12px; background: var(--el-bg-color); font-size: 13px; color: var(--el-text-color-primary); }
.package-item { font-family: monospace; font-size: 12px; margin-bottom: 4px; color: #666; }
.card-body--scroll { max-height: 200px; overflow-y: auto; }
.host-toolbar { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--el-border-color-lighter); }
.host-pagination { display: flex; justify-content: flex-end; padding: 8px; }
.mt-3 { margin-top: 12px; }
.script-input :deep(.el-textarea__inner) { font-family: monospace; background-color: #fafafa; }
.restart-radio-group { display: flex; gap: 16px; padding: 10px 0; }
</style>
