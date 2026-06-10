<template>
  <div class="ops-page-layout">
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small">
        <el-form-item label="任务类型">
          <el-select v-model="filters.taskType" clearable placeholder="全部" style="width: 140px">
            <el-option label="全部" value="" />
            <el-option label="补丁安装" value="install" />
            <el-option label="变更回滚" value="rollback" />
            <el-option label="软件包更新" value="pkg_update" />
            <el-option label="漏洞修复" value="vuln_fix" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作人">
          <el-input
            v-model="filters.operator"
            placeholder="请输入"
            clearable
            style="width: 180px"
          />
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="filters.timeRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD"
            style="width: 280px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><RefreshRight /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="ops-action-bar">
      <span style="flex: 1"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="loading"
        @click="loadData"
        title="刷新"
      >
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <div class="ops-table-wrapper">
      <el-table v-loading="loading" :data="tableData" max-height="calc(100vh - 280px)">
        <el-table-column prop="createdTime" label="记录时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.createdTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="taskType" label="任务类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTaskTypeTagType(row.taskType)" size="small" effect="light">
              {{ formatTaskType(row.taskType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag
              :type="getTaskStatusTagType(row.status)"
              size="small"
              class="status-tag--clickable"
              @click="openDetail(row)"
            >
              {{ formatTaskStatus(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="osType" label="系统类型" width="120">
          <template #default="{ row }">
            <span class="os-type-cell">
              <i
                v-if="getOsIcon(row.osType)"
                :class="[getOsIcon(row.osType), 'os-brand-icon']"
              />
              <span>{{ row.osType }}</span>
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="createdBy" label="操作人" width="120" show-overflow-tooltip />
        <el-table-column label="涉及软件包" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatJsonArray(row.patchPkgs) || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="openDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <el-dialog
      v-model="detailVisible"
      title="流程操作详情"
      width="1000px"
      top="5vh"
      :close-on-click-modal="false"
      destroy-on-close
      class="process-log-dialog"
      @closed="handleDetailClosed"
    >
      <div v-loading="detailLoading" class="process-detail">
        <template v-if="detailTask">
          <div class="ops-stepper process-detail__stepper">
            <template v-for="(step, idx) in detailWizardSteps" :key="step.key">
              <div
                class="stepper-item stepper-item--clickable"
                :class="{
                  'is-active': detailStep === idx,
                  'is-success': getWizardStepState(step.key) === 'success',
                  'is-failed': getWizardStepState(step.key) === 'failed'
                }"
                @click="detailStep = idx"
              >
                <div class="stepper-icon">
                  <i v-if="getWizardStepState(step.key) === 'failed'" class="fa fa-times"></i>
                  <i v-else-if="getWizardStepState(step.key) === 'success'" class="fa fa-check"></i>
                  <span v-else>{{ idx + 1 }}</span>
                </div>
                <div class="stepper-title">{{ step.title }}</div>
              </div>
              <div
                v-if="idx < detailWizardSteps.length - 1"
                class="stepper-line"
                :class="{ 'is-active': getWizardStepState(step.key) === 'success' }"
              ></div>
            </template>
          </div>

          <div v-show="detailCurrentStepKey === 'select'" class="install-content">
            <div class="install-card">
              <div class="card-header">
                <i class="fa fa-lock" />
                {{ detailOperationConfig.selectionTitle }}
              </div>
              <div class="card-body card-body--scroll">
                <div v-if="detailSelectionItems.length === 0" class="no-data">暂无数据</div>
                <div v-for="item in detailSelectionItems" :key="item.key" class="selection-item">
                  <div class="selection-item__primary">{{ item.primary }}</div>
                  <div v-if="item.secondary" class="selection-item__secondary">
                    {{ item.secondary }}
                  </div>
                </div>
              </div>
            </div>

            <div class="install-card">
              <div class="card-header">
                <i class="fa fa-cube" />
                {{ detailOperationConfig.packageCardTitle }}
              </div>
              <div class="card-body card-body--scroll">
                <div v-for="pkg in detailAffectedPackages" :key="pkg" class="package-item">
                  {{ pkg }}
                </div>
                <div v-if="detailAffectedPackages.length === 0" class="no-data">暂无数据</div>
              </div>
            </div>

            <div class="install-card mt-3">
              <div class="card-header">
                <i class="fa fa-list" />
                {{ detailOperationConfig.hostCardTitle }}
              </div>
              <div class="card-body card-body--scroll">
                <div class="selection-item__primary">共 {{ detailHosts.length }} 台</div>
                <div v-for="host in detailHosts" :key="host" class="selection-item">
                  <div class="selection-item__primary">{{ host }}</div>
                </div>
                <div v-if="detailHosts.length === 0" class="no-data">暂无数据</div>
              </div>
            </div>
          </div>
          <div v-show="detailCurrentStepKey === 'pre'" class="task-step-content">
            <div class="task-step-editor">
              <div class="task-step-editor__title">
                <i class="fa fa-code" style="margin-right: 6px"></i>
                预执行脚本
              </div>
              <el-alert
                :type="preCheckAlert.type"
                :closable="false"
                show-icon
                :title="preCheckAlert.title"
                class="task-step-alert"
              >
                <template #default>
                  <div v-if="getPreCheckRunId()" class="task-detail-info">
                    <el-button
                      type="primary"
                      link
                      style="font-size: 14px"
                      @click="openExecuteResult(getPreCheckRunId(), '预执行脚本')"
                    >
                      查看执行详情
                    </el-button>
                  </div>
                </template>
              </el-alert>
              <div class="detail-block">
                <div class="detail-block__title">脚本内容</div>
                <pre class="detail-block__content">{{ preCheckScriptContent || '未配置脚本' }}</pre>
              </div>
            </div>
          </div>

          <div v-show="detailCurrentStepKey === 'validate'" class="task-step-content">
            <div class="task-step-editor">
              <div class="task-step-editor__title">
                <i class="fa fa-check-square-o" style="margin-right: 6px"></i>
                校验脚本
              </div>
              <el-alert
                :type="validateAlert.type"
                :closable="false"
                show-icon
                :title="validateAlert.title"
                class="task-step-alert"
              >
                <template #default>
                  <div v-if="getValidateRunId()" class="task-detail-info">
                    <el-button
                      type="primary"
                      link
                      style="font-size: 14px"
                      @click="openExecuteResult(getValidateRunId(), '校验脚本')"
                    >
                      查看执行详情
                    </el-button>
                  </div>
                </template>
              </el-alert>
              <div class="detail-block">
                <div class="detail-block__title">脚本内容</div>
                <pre class="detail-block__content">{{ validateScriptContent || '未配置脚本' }}</pre>
              </div>
            </div>
          </div>

          <div v-show="detailCurrentStepKey === 'restart'" class="task-step-content">
            <div class="task-step-editor">
              <div class="task-step-editor__title">
                <i class="fa fa-refresh" style="margin-right: 6px"></i>
                重启策略
              </div>
              <el-alert
                :type="restartAlert.type"
                :closable="false"
                show-icon
                :title="restartAlert.title"
                class="task-step-alert"
              >
                <template #default>
                  <div class="task-detail-info">
                    <div>{{ detailTask.restartReason || '未提供重启说明' }}</div>
                    <el-button
                      v-if="getRestartRunId()"
                      type="primary"
                      link
                      style="font-size: 14px"
                      @click="openExecuteResult(getRestartRunId(), '执行重启')"
                    >
                      查看执行详情
                    </el-button>
                  </div>
                </template>
              </el-alert>
            </div>
          </div>

          <div v-show="detailCurrentStepKey === 'execute'" class="task-step-content">
            <div class="task-step-editor">
              <div class="task-step-editor__title">
                <i class="fa fa-download" style="margin-right: 6px"></i>
                {{ detailOperationConfig.executeTitle }}
              </div>
              <div class="install-summary-card">
                <div class="install-summary-row">
                  <span class="install-summary-label">
                    {{ detailOperationConfig.selectionSummaryLabel }}
                  </span>
                  <div class="install-summary-list">
                    <div v-if="detailSelectionItems.length === 0" class="install-summary-empty">
                      暂无数据
                    </div>
                    <div
                      v-for="item in detailSelectionItems"
                      :key="item.key"
                      class="install-summary-item"
                    >
                      <div>{{ item.primary }}</div>
                      <div v-if="item.secondary" class="install-summary-subtext">
                        {{ item.secondary }}
                      </div>
                    </div>
                  </div>
                </div>
                <div class="install-summary-row">
                  <span class="install-summary-label">目标主机</span>
                  <div class="install-summary-list">
                    <div v-if="detailHosts.length === 0" class="install-summary-empty">
                      暂无主机
                    </div>
                    <div v-for="host in detailHosts" :key="host" class="install-summary-item">
                      {{ host }}
                    </div>
                  </div>
                </div>
                <div class="install-summary-row">
                  <span class="install-summary-label">
                    {{ detailOperationConfig.packageSummaryLabel }}
                  </span>
                  <div class="install-summary-list">
                    <div v-if="detailAffectedPackages.length === 0" class="install-summary-empty">
                      暂无软件包
                    </div>
                    <div
                      v-for="pkg in detailAffectedPackages"
                      :key="pkg"
                      class="install-summary-item"
                    >
                      {{ pkg }}
                    </div>
                  </div>
                </div>
              </div>

              <div class="pipeline-timeline mt-3">
                <div
                  v-for="item in pipelineItems"
                  :key="item.key"
                  class="timeline-item"
                  :class="{
                    'is-success': item.state === 'success',
                    'is-failed': item.state === 'failed'
                  }"
                >
                  <div class="timeline-node">
                    <i v-if="item.state === 'success'" class="fa fa-check"></i>
                    <i v-else-if="item.state === 'failed'" class="fa fa-times"></i>
                    <i v-else class="fa fa-clock-o"></i>
                  </div>
                  <div class="timeline-content">
                    <div class="timeline-info">
                      <div class="timeline-title">{{ item.label }}</div>
                      <div class="timeline-status-text">{{ item.text }}</div>
                    </div>
                    <div class="timeline-actions" v-if="item.runId">
                      <el-button
                        type="primary"
                        link
                        size="small"
                        @click="openExecuteResult(item.runId, item.label)"
                      >
                        查看详情
                      </el-button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <template #footer>
        <div class="dialog-footer process-detail__footer">
          <el-button @click="detailVisible = false">关闭</el-button>
          <el-button :disabled="detailStep === 0" @click="detailStep -= 1">上一步</el-button>
          <el-button
            :disabled="detailStep >= detailWizardSteps.length - 1"
            type="primary"
            @click="detailStep += 1"
          >
            下一步
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
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, RefreshRight, Search } from '@element-plus/icons-vue'
import { patchInstallApi, patchLogsApi } from '../api'
import {
  getPatchTaskDisplayConfig,
  getPatchTaskWizardSteps,
  resolvePatchTaskDisplayType
} from '../constants/task-display'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'

const loading = ref(false)
const tableData = ref([])
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailRow = ref(null)
const detailTaskData = ref(null)
const detailHistory = ref([])
const detailSteps = ref([])
const detailStep = ref(0)
const executeResultVisible = ref(false)
const currentExecuteRunId = ref('')
const currentExecuteJobTitle = ref('')

const filters = reactive({
  taskType: '',
  operator: '',
  timeRange: []
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const TASK_TYPE_MAP = {
  install: '补丁安装',
  rollback: '变更回滚',
  pkg_update: '软件包更新',
  vuln_fix: '漏洞修复'
}

const STEP_MAP = {
  CREATE: '任务创建',
  PRE_CHECK: '预检查',
  SCRIPT: '脚本处理',
  INSTALL: '安装执行',
  ROLLBACK: '回滚执行',
  RESTART: '重启处理',
  VALIDATE: '校验执行'
}

const ACTION_MAP = {
  TASK_CREATED: '创建任务',
  EXECUTE: '开始执行',
  SKIP: '跳过步骤',
  COMPLETE: '执行成功',
  FAILED: '执行失败',
  SCRIPT_UPLOAD: '上传脚本',
  SCRIPT_UPDATE: '编辑脚本',
  RESTART_CONFIRM: '确认重启',
  RESTART_SKIP: '跳过重启'
}

const STATUS_MAP = {
  SUCCESS: '成功',
  FAILED: '失败',
  RUNNING: '执行中',
  SKIPPED: '已跳过'
}

const TASK_STATUS_MAP = {
  CREATED: '已创建',
  PRE_CHECKING: '预检查中',
  PRE_CHECK_DONE: '预检查完成',
  PRE_CHECK_FAILED: '预检查失败',
  INSTALLING: '执行中',
  INSTALL_DONE: '执行完成',
  INSTALL_FAILED: '执行失败',
  ROLLING_BACK: '回滚中',
  ROLLBACK_DONE: '回滚完成',
  ROLLBACK_FAILED: '回滚失败',
  RESTART_PENDING: '等待重启',
  RESTARTING: '重启中',
  RESTART_DONE: '重启完成',
  VALIDATING: '校验中',
  VALIDATE_FAILED: '校验失败',
  COMPLETED: '已完成',
  FAILED: '失败'
}

const detailTask = computed(() => detailTaskData.value)
const detailTaskType = computed(
  () => detailTask.value?.taskType || detailRow.value?.taskType || 'install'
)
const detailDisplayType = computed(() =>
  resolvePatchTaskDisplayType({ taskType: detailTaskType.value })
)
const detailOperationConfig = computed(() => getPatchTaskDisplayConfig(detailDisplayType.value))
const detailWizardSteps = computed(() => getPatchTaskWizardSteps(detailDisplayType.value))
const detailCurrentStepKey = computed(
  () => detailWizardSteps.value[detailStep.value]?.key || 'select'
)
const sortedDetailHistory = computed(() =>
  [...detailHistory.value].sort((left, right) => {
    const seqDiff = Number(left?.seqNo ?? 0) - Number(right?.seqNo ?? 0)
    if (seqDiff !== 0) return seqDiff
    return new Date(left?.createdTime || 0).getTime() - new Date(right?.createdTime || 0).getTime()
  })
)
const preCheckRecords = computed(() =>
  sortedDetailHistory.value.filter(
    record =>
      record.step === 'PRE_CHECK' ||
      (record.step === 'SCRIPT' && String(record.scriptType || '').toLowerCase() === 'pre-check')
  )
)
const validateRecords = computed(() =>
  sortedDetailHistory.value.filter(
    record =>
      record.step === 'VALIDATE' ||
      (record.step === 'SCRIPT' && String(record.scriptType || '').toLowerCase() === 'validate')
  )
)
const restartRecords = computed(() =>
  sortedDetailHistory.value.filter(record => record.step === 'RESTART')
)
const executeRecords = computed(() =>
  sortedDetailHistory.value.filter(record => ['INSTALL', 'ROLLBACK'].includes(record.step))
)
const detailSelectionItems = computed(() =>
  buildDetailSelectionItems(detailTask.value, detailHistory.value)
)
const detailHosts = computed(() => toDisplayArray(detailTask.value?.hostIds))
const detailAffectedPackages = computed(() =>
  buildAffectedPackageList(detailTask.value, detailHistory.value)
)
const preCheckScriptContent = computed(() => {
  return (
    getLatestRecord(
      preCheckRecords.value,
      record =>
        record.step === 'SCRIPT' && String(record.scriptType || '').toLowerCase() === 'pre-check'
    )?.scriptContent ||
    detailTask.value?.preCheckScript ||
    ''
  )
})
const validateScriptContent = computed(() => {
  return (
    getLatestRecord(
      validateRecords.value,
      record =>
        record.step === 'SCRIPT' && String(record.scriptType || '').toLowerCase() === 'validate'
    )?.scriptContent ||
    detailTask.value?.validateScript ||
    ''
  )
})
const preCheckLatestRecord = computed(() =>
  getLatestRecord(preCheckRecords.value, isExecutionLikeRecord)
)
const validateLatestRecord = computed(() =>
  getLatestRecord(validateRecords.value, isExecutionLikeRecord)
)
const restartLatestRecord = computed(() =>
  getLatestRecord(restartRecords.value, isExecutionLikeRecord)
)
const executeLatestRecord = computed(() =>
  getLatestRecord(executeRecords.value, isExecutionLikeRecord)
)
const preCheckAlert = computed(() =>
  buildScriptAlert(
    'pre',
    preCheckLatestRecord.value,
    preCheckScriptContent.value,
    getStepStatus('PRE_CHECK')
  )
)
const validateAlert = computed(() =>
  buildScriptAlert(
    'validate',
    validateLatestRecord.value,
    validateScriptContent.value,
    getStepStatus('VALIDATE')
  )
)
const restartAlert = computed(() =>
  buildRestartAlert(detailTask.value, restartLatestRecord.value, getStepStatus('RESTART'))
)
const pipelineItems = computed(() => {
  const executeStepKey = detailTaskType.value === 'rollback' ? 'ROLLBACK' : 'INSTALL'
  return [
    buildPipelineItem('pre-check', '预检查', preCheckRecords.value, {
      fallbackRunId: detailTask.value?.preCheckRunId || '',
      stepStatus: getStepStatus('PRE_CHECK'),
      stepRunId: getStepRunId('PRE_CHECK')
    }),
    buildPipelineItem(
      detailTaskType.value === 'rollback' ? 'rollback' : 'execute',
      detailOperationConfig.value.executeTitle,
      executeRecords.value,
      {
        fallbackRunId: detailTask.value?.executeRunId || '',
        stepStatus: getStepStatus(executeStepKey),
        stepRunId: getStepRunId(executeStepKey)
      }
    ),
    buildPipelineItem('restart', '重启策略', restartRecords.value, {
      treatNoneAsSuccess: detailTask.value?.restartType === 'none',
      fallbackRunId: detailTask.value?.restartRunId || '',
      stepStatus: getStepStatus('RESTART'),
      stepRunId: getStepRunId('RESTART')
    }),
    buildPipelineItem('validate', '脚本校验', validateRecords.value, {
      fallbackRunId: detailTask.value?.validateRunId || '',
      stepStatus: getStepStatus('VALIDATE'),
      stepRunId: getStepRunId('VALIDATE')
    })
  ]
})

async function loadData() {
  loading.value = true
  try {
    const response = await patchLogsApi.getAuditLogs({
      taskType: filters.taskType || undefined,
      operator: filters.operator.trim() || undefined,
      startTime: buildDateRangeBoundary(filters.timeRange?.[0], 'start'),
      endTime: buildDateRangeBoundary(filters.timeRange?.[1], 'end'),
      page: pagination.page - 1,
      size: pagination.pageSize
    })
    const data = response?.data || response || {}
    tableData.value = data.content || []
    pagination.total = data.totalElements || 0
  } catch (error) {
    console.error('Failed to load process logs:', error)
    ElMessage.error('加载流程操作记录失败')
    tableData.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  loadData()
}

function handleReset() {
  filters.taskType = ''
  filters.operator = ''
  filters.timeRange = []
  pagination.page = 1
  pagination.pageSize = 20
  loadData()
}

function buildDateRangeBoundary(dateValue, boundary) {
  if (!dateValue) return undefined
  return `${dateValue} ${boundary === 'end' ? '23:59:59' : '00:00:00'}`
}

function handlePageChange(page) {
  pagination.page = page
  loadData()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  loadData()
}

async function openDetail(row) {
  detailRow.value = row
  detailVisible.value = true
  detailLoading.value = true
  // 列表返回的已经是 PatchInstallTask，可直接作为初始任务数据
  detailTaskData.value = row || null
  detailHistory.value = []
  detailSteps.value = []
  detailStep.value = 0

  const taskId = row?.id
  if (!taskId) {
    detailLoading.value = false
    return
  }

  try {
    const res = await patchInstallApi.getAuditDetail(taskId)
    const detail = res?.data || res || {}

    if (detail.task) {
      detailTaskData.value = detail.task
    }
    if (Array.isArray(detail.steps)) {
      detailSteps.value = detail.steps
    }
    if (Array.isArray(detail.logs)) {
      detailHistory.value = detail.logs
    }
  } catch {
    // 新接口失败时降级到旧接口
    const [taskResult, historyResult] = await Promise.allSettled([
      patchInstallApi.getTask(taskId),
      patchInstallApi.getTaskAuditHistoryAll(taskId)
    ])

    if (taskResult.status === 'fulfilled') {
      detailTaskData.value = taskResult.value?.data || taskResult.value || row
    }

    if (historyResult.status === 'fulfilled') {
      const historyData = historyResult.value?.data || historyResult.value || []
      detailHistory.value = Array.isArray(historyData) ? historyData : []
    }

    if (taskResult.status === 'rejected' || historyResult.status === 'rejected') {
      ElMessage.warning('部分详情数据加载失败，已展示当前可用信息')
    }
  }

  detailLoading.value = false
}

function openExecuteResult(runId, jobTitle) {
  if (!runId) return
  currentExecuteRunId.value = runId
  currentExecuteJobTitle.value = jobTitle
  executeResultVisible.value = true
}

function handleDetailClosed() {
  detailLoading.value = false
  detailRow.value = null
  detailTaskData.value = null
  detailHistory.value = []
  detailSteps.value = []
  detailStep.value = 0
  executeResultVisible.value = false
  currentExecuteRunId.value = ''
  currentExecuteJobTitle.value = ''
}

function findStepData(stepKey) {
  return detailSteps.value.find(s => s.step === stepKey) || null
}

function getStepStatus(stepKey) {
  return findStepData(stepKey)?.status || null
}

function getStepRunId(stepKey) {
  return findStepData(stepKey)?.runId || ''
}

function formatTaskFieldValue(value) {
  if (value === null || value === undefined || value === '') return ''

  if (typeof value === 'string') {
    return value
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function getPreCheckRunId() {
  return (
    getStepRunId('PRE_CHECK') ||
    preCheckLatestRecord.value?.runId ||
    detailTask.value?.preCheckRunId ||
    ''
  )
}

function getValidateRunId() {
  return (
    getStepRunId('VALIDATE') ||
    validateLatestRecord.value?.runId ||
    detailTask.value?.validateRunId ||
    ''
  )
}

function getRestartRunId() {
  return (
    getStepRunId('RESTART') ||
    restartLatestRecord.value?.runId ||
    detailTask.value?.restartRunId ||
    ''
  )
}

function formatTaskType(taskType) {
  return TASK_TYPE_MAP[taskType] || taskType || '-'
}

function getTaskTypeTagType(taskType) {
  if (taskType === 'install') return 'primary'
  if (taskType === 'rollback') return 'danger'
  if (taskType === 'pkg_update') return 'warning'
  if (taskType === 'vuln_fix') return 'success'
  return 'info'
}

function formatStep(step) {
  return STEP_MAP[step] || step || '-'
}

function formatAction(action) {
  return ACTION_MAP[action] || action || '-'
}

function formatStatus(status) {
  return STATUS_MAP[status] || status || '-'
}

function getStatusType(status) {
  if (status === 'SUCCESS') return 'success'
  if (status === 'FAILED') return 'danger'
  if (status === 'RUNNING') return 'primary'
  if (status === 'SKIPPED') return 'info'
  return 'info'
}

function getOsIcon(osType) {
  if (!osType) return ''
  const type = String(osType).toLowerCase()
  if (type.includes('windows')) {
    return 'fab fa-windows'
  }
  if (type.includes('linux')) {
    return 'fab fa-linux'
  }
  return ''
}

function formatTaskStatus(status) {
  return TASK_STATUS_MAP[status] || status || '-'
}

function getTaskStatusTagType(status) {
  if (status === 'COMPLETED') return 'success'
  if (status === 'FAILED' || status?.endsWith('_FAILED')) return 'danger'
  if (status?.endsWith('ING')) return 'primary'
  if (status === 'CREATED' || status === 'RESTART_PENDING') return 'info'
  if (status?.endsWith('_DONE')) return 'success'
  return 'info'
}

function formatDateTime(value) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return value
  }
}

function formatRestartType(value) {
  if (value === 'system') return '系统重启'
  if (value === 'service') return '服务重启'
  if (value === 'none') return '无需重启'
  return value || '-'
}

function formatJsonArray(value) {
  if (!value) return ''
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return Array.isArray(parsed) ? parsed.filter(Boolean).join(', ') : String(value)
  } catch {
    return String(value)
  }
}

function parseMaybeJson(value) {
  if (value === null || value === undefined || value === '') return null
  if (Array.isArray(value) || typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function toDisplayArray(value) {
  const parsed = parseMaybeJson(value)
  if (Array.isArray(parsed)) {
    return parsed.map(item => String(item || '').trim()).filter(Boolean)
  }
  if (typeof parsed === 'string') {
    return parsed
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  }
  return []
}

function parsePackageEntry(entry) {
  const [pkgName, fullPkgName, patchId] = String(entry || '').split('#')
  return {
    primary: pkgName || fullPkgName || String(entry || '-'),
    secondary: [fullPkgName && fullPkgName !== pkgName ? fullPkgName : '', patchId]
      .filter(Boolean)
      .join(' / ')
  }
}

function buildFallbackTask(row) {
  const snapshot = parseMaybeJson(row?.taskSnapshot) || {}
  return {
    id: row?.taskId || snapshot.id || '',
    taskType: row?.taskType || snapshot.taskType || 'install',
    status: snapshot.status || '',
    currentStep: snapshot.currentStep || row?.step || '',
    hostIds: snapshot.hostIds || row?.hostIds || [],
    patchIds: snapshot.patchIds || row?.patchIds || [],
    patchPkgs: snapshot.patchPkgs || row?.affectedPackages || [],
    packages: snapshot.packages || [],
    histUpdateIds: snapshot.histUpdateIds || [],
    executeRunId: snapshot.executeRunId || '',
    restartType: snapshot.restartType || row?.restartType || '',
    restartReason: snapshot.restartReason || row?.remark || '',
    restartAction: snapshot.restartAction || row?.restartAction || '',
    restartConfirmed:
      snapshot.restartConfirmed === undefined ? row?.restartConfirmed : snapshot.restartConfirmed,
    preCheckScript:
      String(row?.scriptType || '').toLowerCase() === 'pre-check' ? row?.scriptContent || '' : '',
    validateScript:
      String(row?.scriptType || '').toLowerCase() === 'validate' ? row?.scriptContent || '' : '',
    createdTime: snapshot.createdTime || row?.createdTime || ''
  }
}

function buildDetailSelectionItems(task, history) {
  if (!task) return []

  if (task.taskType === 'pkg_update') {
    return toDisplayArray(task.packages).map((entry, index) => ({
      key: `pkg-${index}-${entry}`,
      ...parsePackageEntry(entry)
    }))
  }

  if (task.taskType === 'rollback') {
    const histUpdateIds = toDisplayArray(task.histUpdateIds)
    if (histUpdateIds.length > 0) {
      return histUpdateIds.map((item, index) => ({
        key: `hist-${index}-${item}`,
        primary: item,
        secondary: toDisplayArray(task.patchIds).join(', ')
      }))
    }
  }

  const patchIds = toDisplayArray(task.patchIds)
  if (patchIds.length > 0) {
    return patchIds.map((item, index) => ({
      key: `patch-${index}-${item}`,
      primary: item,
      secondary: task.taskType === 'vuln_fix' ? '按补丁任务修复' : ''
    }))
  }

  const latestRecord = getLatestRecord(history, record => !!record.remark)
  return latestRecord
    ? [
        {
          key: `remark-${latestRecord.id || latestRecord.createdTime}`,
          primary: latestRecord.remark,
          secondary: latestRecord.createdTime ? formatDateTime(latestRecord.createdTime) : ''
        }
      ]
    : []
}

function buildAffectedPackageList(task, history) {
  const patchPkgs = toDisplayArray(task?.patchPkgs)
  if (patchPkgs.length > 0) return patchPkgs

  const packageEntries = toDisplayArray(task?.packages)
  if (packageEntries.length > 0) {
    return packageEntries.map(entry => parsePackageEntry(entry).primary)
  }

  return Array.from(new Set(history.flatMap(record => toDisplayArray(record.affectedPackages))))
}

function isExecutionLikeRecord(record) {
  return Boolean(record?.action || record?.status)
}

function getLatestRecord(records = [], predicate = () => true) {
  for (let index = records.length - 1; index >= 0; index -= 1) {
    if (predicate(records[index])) {
      return records[index]
    }
  }
  return null
}

function getRecordDisplayState(record) {
  if (!record) return 'idle'
  if (record.action === 'FAILED' || record.status === 'FAILED') return 'failed'
  if (record.status === 'RUNNING') return 'running'
  if (record.action === 'SKIP' || record.action === 'RESTART_SKIP' || record.status === 'SKIPPED') {
    return 'success'
  }
  if (
    ['TASK_CREATED', 'SCRIPT_UPLOAD', 'SCRIPT_UPDATE', 'COMPLETE', 'RESTART_CONFIRM'].includes(
      record.action
    ) ||
    record.status === 'SUCCESS'
  ) {
    return 'success'
  }
  return 'idle'
}

function stepStatusToDisplayState(status) {
  if (!status) return 'idle'
  if (status === 'SUCCESS') return 'success'
  if (status === 'FAILED') return 'failed'
  if (status === 'SKIPPED') return 'success'
  if (status === 'RUNNING') return 'running'
  if (status === 'PENDING') return 'idle'
  return 'idle'
}

function getWizardStepState(stepKey) {
  if (stepKey === 'select') {
    return detailTask.value ? 'success' : 'idle'
  }

  if (stepKey === 'pre') {
    const status = getStepStatus('PRE_CHECK')
    if (status) return stepStatusToDisplayState(status)
    return getRecordDisplayState(
      preCheckLatestRecord.value || getLatestRecord(preCheckRecords.value)
    )
  }

  if (stepKey === 'validate') {
    const status = getStepStatus('VALIDATE')
    if (status) return stepStatusToDisplayState(status)
    return getRecordDisplayState(
      validateLatestRecord.value || getLatestRecord(validateRecords.value)
    )
  }

  if (stepKey === 'restart') {
    const status = getStepStatus('RESTART')
    if (status) return stepStatusToDisplayState(status)
    if (detailTask.value?.restartType === 'none' && restartRecords.value.length === 0) {
      return 'success'
    }
    return getRecordDisplayState(restartLatestRecord.value || getLatestRecord(restartRecords.value))
  }

  if (stepKey !== 'execute') {
    return 'idle'
  }

  const executeStepKey = detailTaskType.value === 'rollback' ? 'ROLLBACK' : 'INSTALL'
  const executeStatus = getStepStatus(executeStepKey)
  if (executeStatus) return stepStatusToDisplayState(executeStatus)
  return getRecordDisplayState(executeLatestRecord.value || getLatestRecord(executeRecords.value))
}

function buildScriptAlert(type, record, scriptContent, stepStatus) {
  // 优先使用 steps 数据中的 status
  if (stepStatus === 'FAILED') {
    return {
      type: 'error',
      title: `执行失败：${record?.errorMessage || record?.remark || '未知错误'}`
    }
  }
  if (stepStatus === 'SKIPPED') {
    return {
      type: 'success',
      title: type === 'pre' ? '已跳过预执行脚本' : '已跳过校验脚本'
    }
  }
  if (stepStatus === 'SUCCESS') {
    return {
      type: 'success',
      title: type === 'pre' ? '预执行脚本执行完毕' : '全部校验通过'
    }
  }
  if (stepStatus === 'RUNNING') {
    return {
      type: 'warning',
      title: type === 'pre' ? '预执行脚本执行中...' : '校验脚本执行中...'
    }
  }

  // 降级：无 stepStatus 时从日志记录推导
  if (getRecordDisplayState(record) === 'failed') {
    return {
      type: 'error',
      title: `执行失败：${record?.errorMessage || record?.remark || '未知错误'}`
    }
  }

  if (record?.action === 'SKIP' || record?.status === 'SKIPPED') {
    return {
      type: 'success',
      title: type === 'pre' ? '已跳过预执行脚本' : '已跳过校验脚本'
    }
  }

  if (record?.action === 'COMPLETE' || record?.status === 'SUCCESS') {
    return {
      type: 'success',
      title: type === 'pre' ? '预执行脚本执行完毕' : '全部校验通过'
    }
  }

  if (scriptContent) {
    return {
      type: 'info',
      title: type === 'pre' ? '已配置预执行脚本' : '已配置校验脚本'
    }
  }

  return {
    type: 'info',
    title: type === 'pre' ? '未配置预执行脚本' : '未配置校验脚本'
  }
}

function buildRestartAlert(task, record, stepStatus) {
  // 优先使用 steps 数据中的 status
  if (stepStatus === 'FAILED') {
    return {
      type: 'error',
      title: `重启失败：${record?.errorMessage || record?.remark || '未知错误'}`
    }
  }
  if (stepStatus === 'SKIPPED') {
    return { type: 'success', title: '已跳过重启' }
  }
  if (stepStatus === 'SUCCESS') {
    return { type: 'success', title: '重启完成' }
  }
  if (stepStatus === 'RUNNING') {
    return { type: 'warning', title: '正在重启中...' }
  }

  // 降级：无 stepStatus 时从日志记录推导
  if (task?.restartType === 'none' && !record) {
    return { type: 'info', title: '无需重启' }
  }

  if (getRecordDisplayState(record) === 'failed') {
    return {
      type: 'error',
      title: `重启失败：${record?.errorMessage || record?.remark || '未知错误'}`
    }
  }

  if (record?.action === 'RESTART_SKIP' || record?.status === 'SKIPPED') {
    return { type: 'success', title: '已跳过重启' }
  }

  if (record?.action === 'COMPLETE' || record?.status === 'SUCCESS') {
    return { type: 'success', title: '重启完成' }
  }

  if (record?.action === 'RESTART_CONFIRM') {
    return { type: 'success', title: '已确认重启' }
  }

  return {
    type: 'info',
    title: `重启策略：${formatRestartType(task?.restartType)}`
  }
}

function buildPipelineItem(key, label, records, options = {}) {
  const latestRecord = getLatestRecord(records, isExecutionLikeRecord)

  // 优先使用 steps 中的 status
  let state
  if (options.stepStatus) {
    state = stepStatusToDisplayState(options.stepStatus)
  } else if (options.treatNoneAsSuccess && records.length === 0) {
    state = 'success'
  } else {
    state = getRecordDisplayState(latestRecord)
  }

  return {
    key,
    label,
    state,
    runId: options.stepRunId || latestRecord?.runId || options.fallbackRunId || '',
    text: getPipelineText(state, latestRecord, options)
  }
}

function getPipelineText(state, record, options = {}) {
  if (options.treatNoneAsSuccess && !record) {
    return '当前任务无需重启'
  }
  if (options.stepStatus === 'SKIPPED') {
    return '系统已跳过执行'
  }
  if (state === 'success') {
    if (
      record?.action === 'SKIP' ||
      record?.action === 'RESTART_SKIP' ||
      record?.status === 'SKIPPED'
    ) {
      return '系统已跳过执行'
    }
    return '任务执行成功'
  }
  if (state === 'failed') {
    return `任务执行失败${record?.errorMessage ? `：${record.errorMessage}` : ''}`
  }
  if (state === 'running') {
    return '正在执行中...'
  }
  return '等待调度中'
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.os-type-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;

  .os-brand-icon {
    font-size: 16px;
    color: var(--el-text-color-regular);
    width: 16px;
    text-align: center;
    display: inline-block;
    vertical-align: middle;

    :deep(path) {
      fill: currentColor !important;
    }
  }
}

:deep(.process-log-dialog) {
  .el-dialog {
    border-radius: 12px;
    overflow: hidden;
    max-height: calc(100vh - 40px);
    display: flex;
    flex-direction: column;
  }

  .el-dialog__header {
    margin-right: 0;
    padding: 18px 24px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .el-dialog__body {
    padding: 20px 24px 12px;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }

  .el-dialog__footer {
    padding: 12px 24px 20px;
    border-top: 1px solid var(--el-border-color-lighter);
  }
}

.ops-stepper {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  margin-bottom: 30px;
  padding: 0 40px;
}

.stepper-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 90px;
  position: relative;
  z-index: 1;
}

.stepper-item--clickable {
  cursor: pointer;
}

.stepper-item .stepper-icon {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background-color: var(--el-bg-color, #fff);
  border: 2px solid var(--el-text-color-placeholder, #a8abb2);
  color: var(--el-text-color-placeholder, #a8abb2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  margin-bottom: 6px;
  transition: all 0.3s;
}

.stepper-item .stepper-title {
  font-size: 12px;
  color: var(--el-text-color-regular, #606266);
  font-weight: 500;
  transition: all 0.3s;
  text-align: center;
  white-space: nowrap;
}

.stepper-item.is-active .stepper-icon {
  border-color: var(--el-color-primary, #409eff);
  background-color: var(--el-color-primary, #409eff);
  color: #fff;
}

.stepper-item.is-active .stepper-title {
  color: var(--el-color-primary, #409eff);
  font-weight: bold;
}

.stepper-item.is-success .stepper-icon {
  border-color: var(--el-color-success, #67c23a);
  color: var(--el-color-success, #67c23a);
}

.stepper-item.is-success .stepper-title {
  color: var(--el-color-success, #67c23a);
}

.stepper-item.is-failed .stepper-icon {
  border-color: var(--el-color-danger, #f56c6c);
  background-color: var(--el-color-danger, #f56c6c);
  color: #fff;
}

.stepper-item.is-failed .stepper-title {
  color: var(--el-color-danger, #f56c6c);
}

.stepper-line {
  flex: 1;
  height: 2px;
  background-color: var(--el-border-color-lighter, #ebeef5);
  margin: 12px -30px 0;
  z-index: 0;
  transition: all 0.3s;
}

.stepper-line.is-active {
  background-color: var(--el-color-success, #67c23a);
}

.process-detail {
  min-height: 420px;
  padding-right: 4px;
}

.process-detail__stepper {
  margin-bottom: 24px;
}

.process-detail__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.install-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.install-card {
  margin-bottom: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  overflow: hidden;
}

.install-card .card-header {
  background: var(--el-fill-color-light);
  padding: 8px 12px;
  font-weight: 500;
  font-size: 13px;
  color: var(--el-text-color-primary);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.install-card .card-body {
  padding: 10px 12px;
  background: var(--el-bg-color);
  font-size: 13px;
  color: var(--el-text-color-primary);
}

.card-body--scroll {
  max-height: 220px;
  overflow-y: auto;
}

.selection-item {
  padding: 6px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.selection-item:last-child {
  border-bottom: none;
}

.selection-item__primary {
  color: var(--el-text-color-primary);
  word-break: break-all;
}

.selection-item__secondary {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin-top: 2px;
  word-break: break-all;
}

.package-item {
  font-family: monospace;
  font-size: 12px;
  margin-bottom: 4px;
  color: #666;
}

.task-step-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 280px;
}

.task-step-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-step-editor__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  padding: 4px 0;
  display: flex;
  align-items: center;
  gap: 4px;
}

.task-step-alert {
  width: 100%;
}

.task-detail-info {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.detail-block {
  margin-top: 16px;
}

.detail-block__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 8px;
}

.detail-block__content {
  margin: 0;
  padding: 12px;
  border-radius: 6px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.detail-block__content--error {
  color: var(--el-color-danger);
}

.install-summary-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  overflow: hidden;
  margin-top: 4px;
}

.install-summary-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 14px;
  font-size: 13px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.install-summary-row:last-child {
  border-bottom: none;
}

.install-summary-label {
  min-width: 90px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
  font-size: 12px;
}

.install-summary-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.install-summary-item {
  color: var(--el-text-color-primary);
  word-break: break-all;
  line-height: 1.5;
}

.install-summary-subtext {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.install-summary-empty,
.no-data {
  color: var(--el-text-color-placeholder);
}

.pipeline-timeline {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.timeline-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 18px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background-color: var(--el-fill-color-blank);
}

.timeline-item.is-success {
  border-color: var(--el-color-success-light-5);
  background-color: var(--el-color-success-light-9);
}

.timeline-item.is-failed {
  border-color: var(--el-color-danger-light-5);
  background-color: var(--el-color-danger-light-9);
}

.timeline-node {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  background-color: var(--el-fill-color);
  color: var(--el-text-color-placeholder);
  flex-shrink: 0;
}

.is-success .timeline-node {
  background-color: var(--el-color-success);
  color: #fff;
}

.is-failed .timeline-node {
  background-color: var(--el-color-danger);
  color: #fff;
}

.timeline-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.timeline-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.timeline-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.timeline-status-text {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.timeline-actions {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  word-break: break-all;
}

.mt-3 {
  margin-top: 12px;
}

@media (max-width: 900px) {
  :deep(.process-log-dialog) {
    .el-dialog {
      width: calc(100vw - 24px) !important;
      margin: 0 auto;
    }

    .el-dialog__header,
    .el-dialog__body,
    .el-dialog__footer {
      padding-left: 16px;
      padding-right: 16px;
    }
  }

  .timeline-content {
    flex-direction: column;
    align-items: flex-start;
  }
}

:deep(.el-date-editor) {
  height: 32px !important;
}

.status-tag--clickable {
  cursor: pointer;
  transition: opacity 0.2s, filter 0.2s;
}

.status-tag--clickable:hover {
  opacity: 0.8;
  filter: brightness(1.1);
}
</style>
