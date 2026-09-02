<template>
  <div>
    <!-- 补丁安装向导对话框 -->
    <el-dialog
      v-model="isVisible"
      :title="wizardDialogTitle"
      width="1000px"
      top="5vh"
      :close-on-click-modal="false"
      class="install-dialog"
      @closed="resetInstallState"
    >
      <PatchTaskStepper :steps="wizardSteps" :active-index="installStep" :states="stepStates" />

      <!-- Step 0: 选择目标主机 -->
      <PatchTaskSelectionOverview
        v-show="currentStepKey === 'select'"
        :loading="installDataLoading"
        :selection-title="selectionCardTitle"
        :selection-items="selectionDisplayItems"
        :package-title="packageCardTitle"
        :host-title="hostCardTitle"
      >
        <template #package-actions>
          <el-input
            v-if="affectedPackages.length > 10"
            v-model="packageSearchText"
            placeholder="搜索..."
            size="small"
            clearable
            style="width: 240px"
          />
        </template>

        <template #packages>
          <PatchTaskPackageList
            class="card-body card-body--scroll"
            :items="displayedPackages"
            :loading="affectedPackagesLoading"
            :empty-text="packageEmptyText"
            :has-more="hasMorePackages"
            :total="filteredPackages.length"
            @load-more="loadMorePackages"
          />
        </template>

        <template #hosts>
          <div v-if="hasFixedHosts" class="card-body card-body--scroll">
            <div class="selection-item__primary">共 {{ resolvedFixedHosts.length }} 台</div>
            <div
              v-for="host in resolvedFixedHosts"
              :key="host.hostId || host.id || host.hostKey"
              class="selection-item"
            >
              <div class="selection-item__primary">{{ formatHostDisplay(host) }}</div>
            </div>
          </div>
          <div v-else class="card-body">
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
                :prefix-icon="Search"
                size="small"
                style="width: 200px"
                clearable
              />
              <el-button
                size="small"
                :type="hostAllSelected ? 'default' : 'primary'"
                @click="handleToggleHostSelectAll"
              >
                <i :class="`fa fa-${hostAllSelected ? 'times' : 'check-double'} me-1`" />
                {{ hostAllSelected ? '一键取消' : '一键全选' }}
              </el-button>
            </div>
            <el-table
              ref="hostTableRef"
              :data="filteredHosts"
              size="small"
              max-height="320"
              @select="handleHostTableSelect"
              @select-all="handleHostTableSelect"
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
        </template>
      </PatchTaskSelectionOverview>

      <!-- Step 1: 预执行脚本 -->
      <PatchTaskScriptConfigStep
        v-show="currentStepKey === 'pre'"
        v-model="installConfig.preScript"
        v-model:mode="scriptModes.pre"
        title="预执行脚本"
        icon="fa-code"
        :placeholder="preScriptPlaceholder"
        :state="stepStates[stepIndexes.pre]"
        :skipped="isSkipped.pre"
        :file-name="scriptFiles.pre"
        :run-id="taskDetailData?.preCheckRunId || ''"
        :error-message="taskErrorMessage"
        success-title="预执行脚本执行完毕"
        skipped-title="已跳过预执行脚本"
        failure-prefix="执行失败："
        @upload="handleScriptUpload('pre', $event)"
        @show-result="openExecuteResult"
      />

      <!-- Step 3: 校验脚本 -->
      <PatchTaskScriptConfigStep
        v-show="currentStepKey === 'validate'"
        v-model="installConfig.postScript"
        v-model:mode="scriptModes.post"
        title="校验脚本"
        icon="fa-check-square-o"
        :placeholder="postScriptPlaceholder"
        :state="stepStates[stepIndexes.validate]"
        :skipped="isSkipped.validate"
        :file-name="scriptFiles.post"
        :run-id="taskDetailData?.validateRunId || ''"
        :error-message="taskErrorMessage"
        success-title="全部校验通过"
        skipped-title="已跳过校验脚本"
        failure-prefix="校验失败："
        @upload="handleScriptUpload('post', $event)"
        @show-result="openExecuteResult"
      />

      <!-- Step 4: 重启策略 -->
      <PatchTaskRestartStep
        v-show="currentStepKey === 'restart'"
        v-model="restartConfirmText"
        :advice-title="restartAdviceTitle"
        :advice-description="restartAdviceDescription"
        :requires-confirm="requiresRestartConfirm"
        :confirm-keyword="restartConfirmKeyword"
        :restart-policy="installConfig.restartPolicy"
        :state="stepStates[stepIndexes.restart]"
        :skipped="isSkipped.restart"
        :error-message="taskErrorMessage"
        :run-id="taskDetailData?.restartRunId || ''"
        @show-result="openExecuteResult"
      />

      <!-- Step 5/6: 执行汇总 -->
      <div v-show="currentStepKey === 'execute'" class="task-step-content">
        <div class="task-step-editor">
          <div class="task-step-editor__title">
            <i class="fa fa-download" style="margin-right: 6px"></i>
            {{ executeStepTitle }}
          </div>
          <div class="install-summary-card">
            <PatchTaskSummaryRow
              v-model:search-text="selectionSummarySearchText"
              :label="selectionSummaryLabel"
              :items="displayedSummarySelectionItems"
              :total="selectionDisplayItems.length"
              :filtered-total="filteredSummarySelectionItems.length"
              :has-more="hasMoreSummarySelectionItems"
              :search-threshold="5"
              contained
              no-match-text="未匹配到相关内容"
              @load-more="loadMoreSummarySelectionItems"
            />
            <PatchTaskSummaryRow
              v-model:search-text="hostSummarySearchText"
              label="目标主机"
              :items="displayedSummaryHosts"
              :total="confirmedHosts.length"
              :filtered-total="filteredSummaryHosts.length"
              :has-more="hasMoreSummaryHosts"
              :search-threshold="5"
              :item-formatter="formatHostDisplay"
              unit="台"
              contained
              empty-text="暂无主机"
              no-match-text="未匹配到相关主机"
              search-placeholder="搜索目标主机..."
              @load-more="loadMoreSummaryHosts"
            />
            <PatchTaskSummaryRow
              v-model:search-text="packageSearchText"
              :label="packageSummaryLabel"
              :items="displayedPackages"
              :total="affectedPackages.length"
              :filtered-total="filteredPackages.length"
              :has-more="hasMorePackages"
              :search-threshold="10"
              max-height="200px"
              contained
              package-style
              empty-text="暂无软件包"
              no-match-text="未匹配到相关软件包"
              search-placeholder="搜索软件包..."
              @load-more="loadMorePackages"
            />
            <div class="install-summary-row">
              <span class="install-summary-label">重启策略</span>
              <span class="install-summary-value">{{ restartStrategySummary }}</span>
            </div>
          </div>
        </div>
        <!-- 任务链执行进度展示 -->
        <div ref="pipelineSectionRef" class="task-step-action" v-if="pipelineStatus !== 'idle'">
          <PatchTaskPipeline :items="pipelineItems" @show-result="openExecuteResult" />

          <PatchTaskPreCheckResult
            :result="parsedPreCheckResult"
            :host-name-resolver="getHostDisplayName"
          />

          <!-- 全流程终点提示 -->
          <el-alert
            v-if="pipelineFinished"
            :type="pipelineStatus === 'success' ? 'success' : 'error'"
            :closable="false"
            show-icon
            :title="pipelineStatus === 'success' ? '所有任务已全部完成' : '执行任务中断'"
            class="task-step-alert mt-3"
          >
            <template #default>
              <div v-if="pipelineStatus === 'success'" style="font-size: 13px">
                {{ pipelineSuccessDescription }}
              </div>
              <div v-else style="font-size: 13px">
                由于部分环节出现异常（{{ taskErrorMessage }}），任务已停止。请检查原因并重试。
              </div>
            </template>
          </el-alert>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <!-- Step 0 取消 -->
          <el-button v-if="currentStepKey === 'select'" @click="isVisible = false">取消</el-button>

          <!-- 上一步：仅在非执行中时允许回退 -->
          <el-button
            v-if="installStep > 0 && stepStates[installStep] !== 'running'"
            @click="goBack"
          >
            <i class="fa fa-chevron-left" style="margin-right: 4px" />
            上一步
          </el-button>

          <!-- 正在执行按钮 -->
          <el-button
            v-if="
              currentStepKey === 'execute' && (pipelineStatus === 'running' || executionSubmitting)
            "
            type="primary"
            loading
            disabled
          >
            <span>{{ pipelineStatus === 'running' ? '执行中...' : '准备执行...' }}</span>
          </el-button>

          <!-- 跳过按钮：针对 RPM 预检、预执行、校验脚本和重启配置 -->
          <el-button
            v-if="currentStepSkippable"
            :disabled="stepTransitionLoading"
            @click="handleSkipStep"
          >
            跳过此步
          </el-button>

          <!-- 下一步按钮：配置步骤直接进入下一步 -->
          <el-button
            v-if="currentStepKey !== 'execute'"
            type="primary"
            :loading="stepTransitionLoading"
            :disabled="
              stepTransitionLoading ||
              (currentStepKey === 'select' && selectedHosts.length === 0) ||
              (currentStepKey === 'restart' &&
                requiresRestartConfirm &&
                restartConfirmText !== restartConfirmKeyword)
            "
            @click="handleAdvanceStep"
          >
            下一步
            <i class="fa fa-chevron-right" style="margin-left: 4px" />
          </el-button>

          <!-- 预检查失败时的特定操作 -->
          <template
            v-if="
              installStep === finalStepIndex &&
              stepStates[stepIndexes.pre] === 'failed' &&
              pipelineStatus === 'failed'
            "
          >
            <el-button type="primary" :loading="executionSubmitting" @click="handleRetryPreCheck">
              <i class="fa fa-refresh" style="margin-right: 4px" />
              重新检查
            </el-button>
            <el-button
              type="danger"
              plain
              :loading="executionSubmitting"
              @click="handleSkipPreCheck"
            >
              <i class="fa fa-forward" style="margin-right: 4px" />
              跳过检查并继续
            </el-button>
          </template>

          <!-- 最后一步确认与离开按钮 -->
          <el-button
            v-else-if="
              installStep === finalStepIndex && pipelineStatus !== 'running' && !executionSubmitting
            "
            type="primary"
            @click="handlePrimaryAction"
          >
            <i
              :class="pipelineStatus === 'success' ? 'fa fa-check' : 'fa fa-play'"
              style="margin-right: 4px"
            />
            {{ pipelineStatus === 'success' ? '完成' : '开始执行任务' }}
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
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { formatDateTime } from '@/utils/date'
import { ElMessageBox } from 'element-plus'
import { getPatchTaskWizardSteps } from '../../../constants/task-display'
import { formatHostDisplay } from './patchTaskWizardUtils'
import { usePatchTaskBackendRestartAdvice } from './usePatchTaskBackendRestartAdvice'
import { usePatchTaskDisplay } from './usePatchTaskDisplay'
import { usePatchTaskFlow } from './usePatchTaskFlow'
import { usePatchTaskPipeline } from './usePatchTaskPipeline'
import { usePatchTaskPreparedState } from './usePatchTaskPreparedState'
import { usePatchTaskRestartAdvice } from './usePatchTaskRestartAdvice'
import { usePatchTaskScripts } from './usePatchTaskScripts'
import { usePatchTaskTaskCreation } from './usePatchTaskTaskCreation'
import { usePatchTaskTaskPreparation } from './usePatchTaskTaskPreparation'
import { useLazyDisplayList } from '../../../composables/useLazyDisplayList'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import PatchTaskPackageList from '../PatchTaskPackageList.vue'
import PatchTaskPipeline from '../PatchTaskPipeline.vue'
import PatchTaskPreCheckResult from '../PatchTaskPreCheckResult.vue'
import PatchTaskSelectionOverview from '../PatchTaskSelectionOverview.vue'
import PatchTaskStepper from '../PatchTaskStepper.vue'
import PatchTaskSummaryRow from '../PatchTaskSummaryRow.vue'
import PatchTaskRestartStep from './PatchTaskRestartStep.vue'
import PatchTaskScriptConfigStep from './PatchTaskScriptConfigStep.vue'
import { usePatchTaskTargetSelection } from './usePatchTaskTargetSelection'

const props = defineProps({
  visible: { type: Boolean, default: false },
  patchesToInstall: { type: Array, default: () => [] },
  fixedHost: { type: Object, default: null }, // 如果有，跳过步骤0的主机选择
  fixedHosts: { type: Array, default: () => [] },
  packageCandidates: { type: Array, default: () => [] },
  taskPackages: { type: Array, default: () => [] },
  histUpdateIds: { type: Array, default: () => [] },
  taskMode: { type: String, default: 'install' },
  operationType: { type: String, default: 'patch' },
  selectionSummaryItems: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:visible', 'success'])

const isVisible = computed({
  get: () => props.visible,
  set: val => emit('update:visible', val)
})

const isRollbackTask = computed(() => props.taskMode === 'rollback')
const isPackageTask = computed(() => props.operationType === 'package')
const isVulnerabilityTask = computed(() => props.operationType === 'vulnerability')
const resolvedFixedHosts = computed(() => {
  if (props.fixedHosts.length > 0) {
    return props.fixedHosts
  }

  return props.fixedHost ? [props.fixedHost] : []
})
const hasFixedHosts = computed(() => resolvedFixedHosts.value.length > 0)
const {
  displayOperationType,
  executeStepTitle,
  hostCardTitle,
  packageCardTitle,
  packageSummaryLabel,
  pipelineSuccessDescription,
  postScriptPlaceholder,
  preScriptPlaceholder,
  selectionCardTitle,
  selectionDisplayItems,
  selectionSummaryLabel,
  wizardDialogTitle
} = usePatchTaskDisplay(props)

const {
  affectedPackages,
  affectedPackagesLoading,
  closeTargetSelection,
  confirmedHosts,
  filteredHosts,
  handleHostPageChange,
  handleHostSizeChange,
  handleHostTableSelect,
  handleToggleHostSelectAll,
  hostAllSelected,
  hostFilter,
  hostPagination,
  hostSearchText,
  hostTableRef,
  installDataLoading,
  openTargetSelection,
  packageEmptyText,
  resetHostAllSelected,
  selectedHosts,
  syncAffectedPackagesForHosts,
  validateSelectedHostCapabilities
} = usePatchTaskTargetSelection({
  props,
  hasFixedHosts,
  resolvedFixedHosts,
  isRollbackTask,
  isPackageTask,
  isVulnerabilityTask
})

// 软件包渲染性能优化：分页与过滤
const {
  searchText: packageSearchText,
  displayedList: displayedPackages,
  hasMore: hasMorePackages,
  loadMore: loadMorePackages,
  filteredList: filteredPackages
} = useLazyDisplayList(affectedPackages, {
  initialCount: 50,
  stepCount: 100
})

// 目标主机汇总渲染性能优化：分页与过滤
const {
  searchText: hostSummarySearchText,
  displayedList: displayedSummaryHosts,
  hasMore: hasMoreSummaryHosts,
  loadMore: loadMoreSummaryHosts,
  filteredList: filteredSummaryHosts
} = useLazyDisplayList(confirmedHosts, {
  initialCount: 20,
  stepCount: 50,
  searchFn: (host, keyword) => formatHostDisplay(host).toLowerCase().includes(keyword)
})

// 待更新软件包/补丁/漏洞汇总列表渲染性能优化：分页与过滤
const {
  searchText: selectionSummarySearchText,
  displayedList: displayedSummarySelectionItems,
  hasMore: hasMoreSummarySelectionItems,
  loadMore: loadMoreSummarySelectionItems,
  filteredList: filteredSummarySelectionItems
} = useLazyDisplayList(selectionDisplayItems, {
  initialCount: 20,
  stepCount: 50,
  searchFn: (item, keyword) => {
    const primary = String(item.primary || '').toLowerCase()
    const secondary = String(item.secondary || '').toLowerCase()
    return primary.includes(keyword) || secondary.includes(keyword)
  }
})

const pipelineSectionRef = ref(null)
const executionSubmitting = ref(false)
const stepTransitionLoading = ref(false)

const installConfig = reactive({
  preScript: '',
  restartPolicy: 'none',
  postScript: ''
})

// ============================================================
// 向导步骤定义
// ============================================================
const wizardSteps = computed(() => getPatchTaskWizardSteps(displayOperationType.value))

// Wizard state
const installStep = ref(0)
const currentStepKey = computed(() => wizardSteps.value[installStep.value]?.key || 'select')
const stepIndexes = computed(() =>
  wizardSteps.value.reduce((result, step, index) => {
    result[step.key] = index
    return result
  }, {})
)
const finalStepIndex = computed(() => Math.max(0, wizardSteps.value.length - 1))
const currentStepSkippable = computed(() =>
  ['pre', 'validate', 'restart'].includes(currentStepKey.value)
)
const createdTaskId = ref('')
const restartConfirmText = ref('')
const pipelineStatus = ref('idle')

// 每步的执行状态: 'idle' | 'running' | 'success' | 'failed'
const stepStates = reactive(['idle', 'idle', 'idle', 'idle', 'idle'])
const isSkipped = reactive({ pre: false, validate: false, restart: false })
const {
  applyLocalRestartAdvice,
  backendRestartReason,
  requiresRestartConfirm,
  resetRestartOptions,
  restartAdviceCacheKey,
  restartAdviceDescription,
  restartAdviceSource,
  restartAdviceTitle,
  restartConfirmKeyword,
  restartConfirmSubmitText,
  restartOptions,
  restartStrategySummary
} = usePatchTaskRestartAdvice({
  props,
  affectedPackages,
  createdTaskId,
  installConfig,
  isSkipped
})
const taskStatus = ref('') // 后端任务状态
const taskErrorMessage = ref('') // 错误信息
const taskDetailData = ref(null) // 从接口返回的任务详情
const pipelineFinished = ref(false) // 只有通过 startPipeline 的才是真完成
const { loadRestartOptions, loadRollbackInfo } = usePatchTaskTaskPreparation({
  props,
  createdTaskId,
  isRollbackTask,
  installConfig,
  restartOptions,
  restartAdviceSource,
  backendRestartReason,
  affectedPackages
})
const { createExecutionTask } = usePatchTaskTaskCreation({
  props,
  confirmedHosts,
  isRollbackTask,
  isPackageTask,
  isVulnerabilityTask,
  createdTaskId,
  taskDetailData,
  installConfig,
  backendRestartReason,
  resolveApiErrorMessage
})
const { startPipeline, stopPolling } = usePatchTaskPipeline({
  createdTaskId,
  stepStates,
  taskStatus,
  taskErrorMessage,
  taskDetailData,
  pipelineStatus,
  pipelineFinished,
  installConfig,
  isSkipped,
  isRollbackTask,
  executeStepTitle,
  restartConfirmSubmitText,
  resolveApiErrorMessage,
  loadRestartOptions,
  loadRollbackInfo,
  emitSuccess: () => emit('success'),
  pipelineSectionRef,
  getStepIndex
})
const { resetPipelineState, canReusePreparedTask, invalidatePreparedTask } =
  usePatchTaskPreparedState({
    stopPolling,
    createdTaskId,
    pipelineStatus,
    pipelineFinished,
    stepStates,
    taskStatus,
    taskErrorMessage,
    taskDetailData,
    resetRestartOptions
  })
const { handleScriptUpload, resetScriptState, scriptFiles, scriptModes, syncScriptConfig } =
  usePatchTaskScripts({
    installConfig,
    createdTaskId,
    invalidatePreparedTask
  })
const { loadRestartAdviceByHostPatch } = usePatchTaskBackendRestartAdvice({
  props,
  confirmedHosts,
  installConfig,
  restartOptions,
  restartAdviceSource,
  restartAdviceCacheKey,
  applyLocalRestartAdvice
})
const {
  goBack,
  handleAdvanceStep,
  handlePrimaryAction,
  handleSkipStep,
  resetInstallState,
  executeStep
} = usePatchTaskFlow({
  createdTaskId,
  executionSubmitting,
  pipelineStatus,
  installStep,
  getStepIndex,
  confirmedHosts,
  canReusePreparedTask,
  resetPipelineState,
  resetRestartOptions,
  createExecutionTask,
  syncScriptConfig,
  loadRestartOptions,
  loadRollbackInfo,
  requiresRestartConfirm,
  isSkipped,
  restartConfirmText,
  restartConfirmKeyword,
  currentStepKey,
  stepTransitionLoading,
  selectedHosts,
  stepStates,
  resetSkippedSteps,
  taskDetailData,
  taskErrorMessage,
  taskStatus,
  pipelineFinished,
  finalStepIndex,
  loadRestartAdviceByHostPatch,
  currentStepSkippable,
  isVisible,
  startPipeline,
  resolveApiErrorMessage,
  stopPolling,
  backendRestartReason,
  installConfig,
  resetScriptState,
  hasFixedHosts,
  resetHostAllSelected,
  validateSelectedHosts: validateSelectedHostCapabilities,
  syncAffectedPackages: syncAffectedPackagesForHosts
})

watch(
  () => props.visible,
  visible => {
    if (visible) {
      openTargetSelection()
      return
    }

    closeTargetSelection()
    resetInstallState()
  }
)

watch(
  () =>
    selectedHosts.value
      .map(host => host?.hostId || host?.id || host?.hostKey || host?.hostname || '')
      .join('|'),
  invalidatePreparedTask
)

const pipelineItems = computed(() => {
  const items = [
    { key: 'pre', label: '预检查', idx: stepIndexes.value.pre, runKey: 'preCheckRunId' },
    {
      key: 'execute',
      label: executeStepTitle.value,
      idx: stepIndexes.value.execute,
      runKey: 'executeRunId'
    },
    { key: 'restart', label: '重启策略', idx: stepIndexes.value.restart, runKey: 'restartRunId' },
    { key: 'validate', label: '脚本校验', idx: stepIndexes.value.validate, runKey: 'validateRunId' }
  ]

  return items.map(item => {
    const state = stepStates[item.idx] || 'idle'
    const skipped = Boolean(isSkipped[item.key] && state === 'success')
    const text =
      state === 'running'
        ? '正在执行中...'
        : state === 'success'
          ? skipped
            ? '系统已跳过执行'
            : '任务执行成功'
          : state === 'failed'
            ? taskErrorMessage.value || '任务执行失败，请检查'
            : '等待调度中'

    return {
      ...item,
      state,
      skipped,
      text,
      runId: getTaskRunId(taskDetailData.value, item.runKey)
    }
  })
})

// 执行详情弹窗
const executeResultVisible = ref(false)
const currentExecuteRunId = ref('')
const currentExecuteJobTitle = ref('')

function openExecuteResult(runId, jobTitle) {
  currentExecuteRunId.value = runId
  currentExecuteJobTitle.value = jobTitle
  executeResultVisible.value = true
}

function getTaskRunId(taskData, runKey) {
  if (!taskData || !runKey) return ''
  return taskData[runKey] || ''
}

function resolveApiErrorMessage(error, fallback = '操作失败，请稍后重试') {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.response?.data?.msg ||
    error?.message ||
    fallback
  )
}

function getStepIndex(stepKey) {
  const index = stepIndexes.value[stepKey]
  return Number.isInteger(index) ? index : -1
}

function resetSkippedSteps() {
  isSkipped.pre = false
  isSkipped.validate = false
  isSkipped.restart = false
}

const parsedPreCheckResult = ref(null)
let hasCapturedPreCheckResult = false

function parsePreCheckResult(rawResult) {
  if (!rawResult) return null
  try {
    return typeof rawResult === 'string' ? JSON.parse(rawResult) : rawResult
  } catch (e) {
    console.error('Failed to parse preCheckResult:', e)
    return null
  }
}

function resetPreCheckResultSnapshot() {
  parsedPreCheckResult.value = null
  hasCapturedPreCheckResult = false
}

function findScrollableAncestor(element) {
  let ancestor = element?.parentElement

  while (ancestor) {
    const { overflowY } = window.getComputedStyle(ancestor)
    const allowsScrolling = ['auto', 'scroll', 'overlay'].includes(overflowY)
    const hasScrollableOverflow = ancestor.scrollHeight > ancestor.clientHeight + 1

    if (allowsScrolling && hasScrollableOverflow) return ancestor
    ancestor = ancestor.parentElement
  }

  return document.scrollingElement
}

async function scrollToPreCheckTaskStatus() {
  await nextTick()
  await new Promise(resolve => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(resolve))
  })

  const pipelineSection = pipelineSectionRef.value
  const scrollContainer = findScrollableAncestor(pipelineSection)
  if (!pipelineSection || !scrollContainer) return

  const pipelineRect = pipelineSection.getBoundingClientRect()
  const containerRect = scrollContainer.getBoundingClientRect()
  const isDocumentScroller = scrollContainer === document.scrollingElement
  const containerTop = isDocumentScroller ? 0 : containerRect.top
  const topPadding = 16

  scrollContainer.scrollTo({
    top: scrollContainer.scrollTop + pipelineRect.top - containerTop - topPadding,
    behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'auto' : 'smooth'
  })
}

watch(createdTaskId, resetPreCheckResultSnapshot, { flush: 'sync' })

watch(
  pipelineStatus,
  status => {
    if (status === 'running') resetPreCheckResultSnapshot()
  },
  { flush: 'sync' }
)

watch(
  taskDetailData,
  taskDetail => {
    if (!taskDetail) {
      resetPreCheckResultSnapshot()
      return
    }

    // 重新检查会产生一份新结果，完成前不再展示上一轮结果。
    if (taskDetail.status === 'PRE_CHECKING') {
      if (hasCapturedPreCheckResult) resetPreCheckResultSnapshot()
      return
    }

    // 后续安装阶段仍会轮询任务详情。这里只截取一次预检查终态结果，
    // 避免轮询更新打断用户阅读或重置用户手动调整的折叠状态。
    if (
      hasCapturedPreCheckResult ||
      !['PRE_CHECK_DONE', 'PRE_CHECK_FAILED', 'FAILED'].includes(taskDetail.status)
    ) {
      return
    }

    const result = parsePreCheckResult(taskDetail.preCheckResult)
    if (!result) return

    parsedPreCheckResult.value = result
    hasCapturedPreCheckResult = true
    scrollToPreCheckTaskStatus()
  },
  { immediate: true, flush: 'sync' }
)

function getHostDisplayName(hostId) {
  const host = confirmedHosts.value.find(h => (h.hostId || h.id || h.hostKey) === hostId)
  return host ? formatHostDisplay(host) : hostId
}

function handleRetryPreCheck() {
  isSkipped.pre = false
  executeStep()
}

function handleSkipPreCheck() {
  ElMessageBox.confirm(
    '前置环境检查未通过，跳过检查强行安装可能导致安装失败。是否确认跳过检查并继续？',
    '提示',
    {
      confirmButtonText: '确认跳过',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(() => {
      isSkipped.pre = true
      executeStep()
    })
    .catch(() => {})
}
</script>

<style scoped lang="scss">
@use './PatchTaskWizard.scss' as *;
</style>
