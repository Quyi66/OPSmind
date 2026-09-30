<template>
  <el-dialog
    v-model="dialogVisible"
    title="定时安装任务详情"
    width="900px"
    :close-on-click-modal="false"
    :close-on-press-escape="!actionLoading"
  >
    <div v-loading="loading" class="task-detail-body">
      <div v-if="loadError" class="task-load-error">
        <el-alert :title="loadError" type="error" :closable="false" show-icon />
        <el-button type="primary" :loading="loading" @click="retryLoadTask">重试加载</el-button>
      </div>
      <template v-if="taskDetail">
        <el-alert
          v-if="['PENDING_APPROVAL', 'CREATED', 'REJECTED', 'EXPIRED'].includes(taskDetail.status)"
          :title="formatTaskStatus(taskDetail.status)"
          :type="['REJECTED', 'EXPIRED'].includes(taskDetail.status) ? 'error' : 'info'"
          :closable="false"
          show-icon
        >
          {{ statusDescription }}
        </el-alert>

        <div class="ops-stepper">
          <div class="stepper-item is-success">
            <div class="stepper-icon"><i class="fa fa-check" /></div>
            <div class="stepper-title">创建任务</div>
          </div>
          <div class="stepper-line is-active" />
          <div class="stepper-item" :class="stepClass(stepStates[1])">
            <div class="stepper-icon">
              <i v-if="stepStates[1] === 'failed'" class="fa fa-times" />
              <i v-else-if="stepStates[1] === 'success'" class="fa fa-check" />
              <i v-else-if="stepStates[1] === 'active'" class="fa fa-spinner fa-spin" />
              <span v-else>2</span>
            </div>
            <div class="stepper-title">前置预检查</div>
          </div>
          <div class="stepper-line" :class="{ 'is-active': stepStates[2] !== 'idle' }" />
          <div class="stepper-item" :class="stepClass(stepStates[2])">
            <div class="stepper-icon">
              <i v-if="stepStates[2] === 'failed'" class="fa fa-times" />
              <i v-else-if="stepStates[2] === 'success'" class="fa fa-check" />
              <i v-else-if="stepStates[2] === 'active'" class="fa fa-spinner fa-spin" />
              <span v-else>3</span>
            </div>
            <div class="stepper-title">分批安装</div>
          </div>
        </div>

        <div class="task-summary">
          <div>
            <strong>安装内容：</strong>
            {{ installContent }}
          </div>
          <div>
            <strong>分批大小：</strong>
            {{ taskDetail.batchSize || 50 }} 台/批
          </div>
          <div>
            <strong>目标资产数：</strong>
            {{ targetCount }} 台
          </div>
          <div>
            <strong>任务状态：</strong>
            <el-tag
              :type="getTaskStatusTagType(taskDetail.status)"
              :style="getTaskStatusTagStyle(taskDetail.status)"
              size="small"
              effect="light"
              round
            >
              {{
                taskDetail.status === 'CREATED'
                  ? '等待定时执行'
                  : formatTaskStatus(taskDetail.status)
              }}
            </el-tag>
            <el-button
              v-if="taskDetail.executeRunId"
              type="primary"
              link
              size="small"
              @click="openExecuteResult"
            >
              查看作业详情
            </el-button>
          </div>
          <div>
            <strong>计划执行时间：</strong>
            {{ formatDateTime(taskDetail.scheduledTime) }}
          </div>
          <div>
            <strong>申请人：</strong>
            {{ taskDetail.createdBy || '-' }}
          </div>
          <div>
            <strong>审批人：</strong>
            {{ taskDetail.approvedBy || '-' }}
          </div>
          <div>
            <strong>审批时间：</strong>
            {{ formatDateTime(taskDetail.approvedTime) }}
          </div>
          <div class="task-summary__full">
            <strong>审批意见：</strong>
            {{ taskDetail.approvalComment || '-' }}
          </div>
          <div class="task-summary__full">
            <strong>软件包：</strong>
            {{ formatJsonArray(taskDetail.packages) || '-' }}
          </div>
          <div class="task-summary__full">
            <strong>目标主机：</strong>
            {{ formatJsonArray(taskDetail.hostIds) || '-' }}
          </div>
          <div v-if="taskDetail.errorMessage" class="task-summary__full task-error">
            <strong>异常原因：</strong>
            {{ taskDetail.errorMessage }}
          </div>
        </div>

        <div v-if="['PRE_CHECKING', 'INSTALLING'].includes(taskDetail.status)" class="task-running">
          <el-icon class="is-loading"><Loading /></el-icon>
          <div>
            {{
              taskDetail.status === 'PRE_CHECKING'
                ? '正在进行前置环境检查，请稍候…'
                : '正在分批执行安装，请稍候…'
            }}
          </div>
        </div>

        <section
          v-if="taskDetail.status === 'PRE_CHECK_FAILED' && parsedPreCheckResult"
          class="precheck-result"
        >
          <h4>前置环境检查未通过项</h4>
          <div v-if="parsedPreCheckResult.unreachable?.length" class="precheck-unreachable">
            <strong>不可达主机：</strong>
            <el-tag
              v-for="hostId in parsedPreCheckResult.unreachable"
              :key="hostId"
              type="danger"
              size="small"
            >
              {{ hostId }}
            </el-tag>
          </div>
          <el-collapse v-if="parsedPreCheckResult.results?.length" v-model="activeCollapseNames">
            <el-collapse-item
              v-for="hostResult in parsedPreCheckResult.results"
              :key="hostResult.host_id"
              :name="hostResult.host_id"
              :title="hostResult.host_id"
            >
              <div
                v-for="check in sortChecks(hostResult.checks)"
                :key="check.id"
                class="precheck-item"
              >
                <el-tag
                  :type="
                    check.status === 'fail'
                      ? 'danger'
                      : check.status === 'warn'
                        ? 'warning'
                        : 'success'
                  "
                  size="small"
                >
                  {{ check.status === 'fail' ? '阻断' : check.status === 'warn' ? '警告' : '通过' }}
                </el-tag>
                <strong>{{ checkTitles[check.id] || check.id }}</strong>
                <span>{{ check.detail }}</span>
              </div>
            </el-collapse-item>
          </el-collapse>
        </section>

        <el-alert
          v-if="['INSTALL_DONE', 'COMPLETED'].includes(taskDetail.status)"
          title="分批自动安装任务已完成"
          type="success"
          :closable="false"
          show-icon
        />
        <el-alert
          v-if="['INSTALL_FAILED', 'FAILED'].includes(taskDetail.status)"
          title="分批自动安装任务未能完全执行成功"
          type="error"
          :closable="false"
          show-icon
        />
      </template>
    </div>

    <template v-if="canHandlePreCheckFailure" #footer>
      <el-button type="warning" :loading="actionLoading" @click="handleSkipPreCheck">
        我已知晓风险，跳过并执行安装
      </el-button>
      <el-button type="primary" :loading="actionLoading" @click="handleRetryPreCheck">
        重新预检查
      </el-button>
    </template>
  </el-dialog>

  <ExecuteResultDialog
    v-model:visible="executeResultVisible"
    :run-id="taskDetail?.executeRunId || ''"
    job-title="一键安装作业详情"
  />
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import { patchInstallApi } from '../api'
import {
  formatDateTime,
  formatJsonArray,
  formatTaskStatus,
  getTaskStatusTagStyle,
  getTaskStatusTagType,
  toDisplayArray
} from '../utils/patchProcessLogs'
import { isPackageInstallFinished, isTaskExecutionBlocked } from '../utils/patchInstallSchedule'

const props = defineProps({
  visible: Boolean,
  taskId: {
    type: [String, Number],
    default: ''
  }
})
const emit = defineEmits(['update:visible'])

const dialogVisible = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value)
})
const loading = ref(false)
const requestPending = ref(false)
const loadError = ref('')
const actionLoading = ref(false)
const taskDetail = ref(null)
const activeCollapseNames = ref([])
const executeResultVisible = ref(false)
let pollingTimer = null
let requestId = 0

const stepStates = computed(() => {
  const states = ['success', 'idle', 'idle']
  const status = taskDetail.value?.status
  if (status === 'PRE_CHECKING') states[1] = 'active'
  else if (status === 'PRE_CHECK_FAILED') states[1] = 'failed'
  else if (
    [
      'PRE_CHECK_DONE',
      'INSTALLING',
      'INSTALL_DONE',
      'COMPLETED',
      'INSTALL_FAILED',
      'FAILED'
    ].includes(status)
  )
    states[1] = 'success'

  if (status === 'INSTALLING') states[2] = 'active'
  else if (['INSTALL_FAILED', 'FAILED'].includes(status)) states[2] = 'failed'
  else if (['INSTALL_DONE', 'COMPLETED'].includes(status)) states[2] = 'success'
  return states
})

const statusDescription = computed(() => {
  const status = taskDetail.value?.status
  if (status === 'PENDING_APPROVAL') return '等待管理员审批，计划时间前未获批准将自动失效。'
  if (status === 'CREATED') return '等待系统在计划时间自动触发预检查和分批安装，默认不重启。'
  return '本次任务不会执行，请重新提交安装申请。'
})

const targetCount = computed(() => {
  if (Array.isArray(taskDetail.value?.targets)) return taskDetail.value.targets.length
  return toDisplayArray(taskDetail.value?.hostIds).length
})

const installContent = computed(() => {
  if (taskDetail.value?.packageSetName) return taskDetail.value.packageSetName
  if (taskDetail.value?.packageSetId) return `软件包集 (${taskDetail.value.packageSetId})`
  return '自定义软件包 / 补丁'
})

const parsedPreCheckResult = computed(() => {
  const value = taskDetail.value?.preCheckResult
  if (!value) return null
  try {
    return typeof value === 'string' ? JSON.parse(value) : value
  } catch {
    return null
  }
})

const canHandlePreCheckFailure = computed(
  () => taskDetail.value?.status === 'PRE_CHECK_FAILED' && !isTaskExecutionBlocked(taskDetail.value)
)

const checkTitles = {
  conn: '连通性',
  sudo: '提权权限',
  os: '操作系统识别',
  pkg_manager: '包管理器',
  pkg_lock: '包管理器占用',
  pkg_db: '包数据库健康',
  disk: '磁盘空间',
  disk_boot: '/boot 空间',
  kernel_pending: '待重启内核',
  repo: '软件仓库',
  pkg_exists: '目标包存在性',
  version_ok: '目标版本可用性',
  depsolve: '依赖解析',
  already_satisfied: '已是目标版本',
  exec: '检查执行异常'
}

function stepClass(state) {
  return {
    'is-active': state === 'active',
    'is-success': state === 'success',
    'is-failed': state === 'failed'
  }
}

function sortChecks(checks) {
  const order = { fail: 0, warn: 1, ok: 2 }
  return Array.isArray(checks)
    ? [...checks].sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3))
    : []
}

async function loadTask({ silent = false } = {}) {
  if (!props.taskId || (silent && requestPending.value)) return false
  const currentRequest = ++requestId
  requestPending.value = true
  if (!silent) {
    loading.value = true
    taskDetail.value = null
  }
  loadError.value = ''
  try {
    const response = await patchInstallApi.getTask(props.taskId)
    if (currentRequest !== requestId) return false
    if (!response?.data) throw new Error('任务不存在或已无法访问')
    taskDetail.value = response.data
    const results = parsedPreCheckResult.value?.results
    activeCollapseNames.value = Array.isArray(results) ? results.map(item => item.host_id) : []
    if (isPackageInstallFinished(taskDetail.value?.status)) stopPolling()
    return true
  } catch (error) {
    if (currentRequest === requestId) {
      loadError.value = error?.response?.data?.message || error?.message || '获取任务详情失败'
      stopPolling()
    }
    return false
  } finally {
    if (currentRequest === requestId) {
      requestPending.value = false
      if (!silent) loading.value = false
    }
  }
}

async function retryLoadTask() {
  if (await loadTask() && !isPackageInstallFinished(taskDetail.value?.status)) startPolling()
}

function startPolling() {
  stopPolling()
  pollingTimer = setInterval(() => {
    if (dialogVisible.value && !requestPending.value && !loadError.value && !actionLoading.value)
      loadTask({ silent: true })
  }, 5000)
}

function stopPolling() {
  if (pollingTimer) clearInterval(pollingTimer)
  pollingTimer = null
}

async function handleRetryPreCheck() {
  actionLoading.value = true
  try {
    const response = await patchInstallApi.executePreCheck(taskDetail.value.id)
    taskDetail.value = response?.data || taskDetail.value
    ElMessage.success('已重新发起环境预检查')
    startPolling()
  } catch (error) {
    ElMessage.error(error?.message || '重新发起预检查失败')
  } finally {
    actionLoading.value = false
  }
}

async function handleSkipPreCheck() {
  try {
    await ElMessageBox.confirm('跳过阻断项并强行安装可能导致部署失败，是否继续？', '强制安装确认', {
      confirmButtonText: '确定跳过并安装',
      cancelButtonText: '取消',
      type: 'warning'
    })
    actionLoading.value = true
    await patchInstallApi.skipPreCheck(taskDetail.value.id)
    const response = await patchInstallApi.executeInstallTask(taskDetail.value.id)
    taskDetail.value = response?.data || taskDetail.value
    ElMessage.success('已跳过环境检查，开始推送安装')
    startPolling()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close')
      ElMessage.error(error?.message || '跳过预检查/启动安装失败')
  } finally {
    actionLoading.value = false
  }
}

function openExecuteResult() {
  executeResultVisible.value = true
}

watch(
  () => [props.visible, props.taskId],
  ([visible, taskId]) => {
    if (!visible || !taskId) {
      stopPolling()
      requestId += 1
      requestPending.value = false
      loading.value = false
      loadError.value = ''
      taskDetail.value = null
      activeCollapseNames.value = []
      return
    }
    loadTask()
    startPolling()
  },
  { immediate: true }
)

onUnmounted(() => {
  stopPolling()
  requestId += 1
})
</script>

<style scoped lang="scss">
@use './patch-task/wizard/PatchTaskWizard.scss' as *;

.task-detail-body {
  min-height: 120px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.task-load-error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}
.task-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 24px;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-light);
  font-size: 13px;
}
.task-summary__full {
  grid-column: 1 / -1;
}
.task-error {
  color: var(--el-color-danger);
}
.task-running {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px;
  border: 1px dashed var(--el-border-color);
  border-radius: 8px;
}
.task-running .el-icon {
  font-size: 32px;
  color: var(--el-color-primary);
}
.precheck-result {
  padding: 16px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
}
.precheck-result h4 {
  margin: 0 0 12px;
  color: var(--el-color-danger);
}
.precheck-unreachable {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}
.precheck-item {
  display: grid;
  grid-template-columns: auto 140px 1fr;
  align-items: start;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 13px;
}
</style>
