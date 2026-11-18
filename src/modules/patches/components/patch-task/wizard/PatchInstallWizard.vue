<template>
  <div>
    <!-- 补丁安装向导对话框 -->
    <el-dialog
      v-model="isVisible"
      :title="wizardDialogTitle"
      width="1080px"
      top="5vh"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="!dialogBusy"
      :before-close="handleBeforeClose"
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
            :placeholder="t('patches.linux.searchEllipsis')"
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
            <div class="selection-item__primary">{{ t('patches.linux.totalPrefix') }} {{ resolvedFixedHosts.length }} {{ t('patches.linux.hostUnit') }}</div>
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
              <div class="host-filter">
              <span class="host-filter__label">{{ t('patches.linux.group') }}</span>
              <el-select
                v-model="selectedGroupIds"
                multiple
                filterable
                clearable
                collapse-tags
                collapse-tags-tooltip
                :loading="groupLoading"
                :placeholder="t('patches.linux.allGroups')"
                :aria-label="t('patches.linux.filterHostsGroup')"
                size="small"
                style="width: 180px"
                @change="handleHostGroupChange"
              >
                <el-option
                  v-for="group in groupOptions"
                  :key="group.id"
                  :label="group.label"
                  :value="group.id"
                />
              </el-select>
              </div>
              <div class="host-filter">
              <span class="host-filter__label">{{ t('automation.job.tag') }}</span>
              <el-select
                v-model="selectedTagNames"
                multiple
                filterable
                clearable
                collapse-tags
                collapse-tags-tooltip
                :loading="groupLoading"
                :placeholder="t('patches.linux.allTags')"
                :aria-label="t('patches.linux.filterHostsTag')"
                size="small"
                style="width: 180px"
                @change="handleHostGroupChange"
              >
                <el-option
                  v-for="tag in tagOptions"
                  :key="tag.name"
                  :label="tag.label"
                  :value="tag.name"
                />
              </el-select>
              </div>
              <el-input
                v-model="hostSearchText"
                :placeholder="t('common.search')"
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
                {{ hostAllSelected ? t('patches.linux.clearAll') : t('patches.linux.selectAll') }}
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
              <el-table-column prop="hostKey" :label="t('execution.ui.host')" min-width="200" sortable>
                <template #default="{ row }">
                  <span class="host-link">{{ row.hostKey }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="os_distro" label="OS" width="100" sortable />
              <el-table-column prop="os_version" :label="t('patches.linux.osVersionShort')" width="100" sortable />
              <el-table-column prop="scan_timestamp" :label="t('patches.linux.previousScan')" width="180" sortable>
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
        :title="t('patches.linux.preScript')"
        icon="fa-code"
        :placeholder="preScriptPlaceholder"
        :state="stepStates[stepIndexes.pre]"
        :skipped="isSkipped.pre"
        :file-name="scriptFiles.pre"
        :run-id="taskDetailData?.preCheckRunId || ''"
        :error-message="taskErrorMessage"
        :success-title="t('patches.linux.preScriptDone')"
        :skipped-title="t('patches.linux.preScriptSkipped')"
        :failure-prefix="t('patches.linux.executionFailurePrefix')"
        @upload="handleScriptUpload('pre', $event)"
        @show-result="runId => openExecuteResult(runId, message('patches.linux.preScript'))"
      />

      <!-- Step 3: 校验脚本 -->
      <PatchTaskScriptConfigStep
        v-show="currentStepKey === 'validate'"
        v-model="installConfig.postScript"
        v-model:mode="scriptModes.post"
        :title="t('patches.linux.validationScript')"
        icon="fa-check-square-o"
        :placeholder="postScriptPlaceholder"
        :state="stepStates[stepIndexes.validate]"
        :skipped="isSkipped.validate"
        :file-name="scriptFiles.post"
        :run-id="taskDetailData?.validateRunId || ''"
        :error-message="taskErrorMessage"
        :success-title="t('patches.linux.allValidated')"
        :skipped-title="t('patches.linux.validationSkipped')"
        :failure-prefix="t('patches.linux.validationFailurePrefix')"
        @upload="handleScriptUpload('post', $event)"
        @show-result="runId => openExecuteResult(runId, message('patches.linux.validationScript'))"
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
        @show-result="runId => openExecuteResult(runId, message('patches.linux.executeRestart'))"
      />

      <!-- Step 5/6: 执行汇总 -->
      <div v-show="currentStepKey === 'execute'" class="task-step-content">
        <PatchImplementationPlan v-if="!createdTaskId" v-model="planDraft" :disabled="executionSubmitting" />
        <el-alert v-if="taskDetailData?.status === 'PENDING_APPROVAL'"
          :title="t('patches.linux.awaitApprovalHint')" :closable="false" type="info" />
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
              :no-match-text="t('patches.linux.noMatches')"
              @load-more="loadMoreSummarySelectionItems"
            />
            <PatchTaskSummaryRow
              v-model:search-text="hostSummarySearchText"
              :label="t('execution.ui.targetHost')"
              :items="displayedSummaryHosts"
              :total="confirmedHosts.length"
              :filtered-total="filteredSummaryHosts.length"
              :has-more="hasMoreSummaryHosts"
              :search-threshold="5"
              :item-formatter="formatHostDisplay"
              :unit="t('patches.linux.hostUnit')"
              contained
              :empty-text="t('patches.linux.noHosts')"
              :no-match-text="t('patches.linux.noHostMatches')"
              :search-placeholder="t('patches.linux.searchTargetHosts')"
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
              :empty-text="t('patches.linux.noPackages')"
              :no-match-text="t('patches.linux.noPackageMatches')"
              :search-placeholder="t('patches.linux.searchPackages')"
              @load-more="loadMorePackages"
            />
            <div class="install-summary-row">
              <span class="install-summary-label">{{ t('patches.linux.restartPolicy') }}</span>
              <span class="install-summary-value">{{ restartStrategySummary }}</span>
            </div>
          </div>
        </div>
        <!-- 任务链执行进度展示 -->
        <div ref="pipelineSectionRef" class="task-step-action" v-if="pipelineStatus !== 'idle'">
          <PatchTaskPipeline :items="pipelineItems" @show-result="openPipelineResult" />

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
            :title="
              pipelineStatus === 'success'
                ? t('patches.linux.allCompleted')
                : pipelineStatus === 'paused'
                  ? t('patches.linux.statusTemporarilyUnavailable')
                  : t('patches.linux.taskInterrupted')
            "
            class="task-step-alert mt-3"
          >
            <template #default>
              <div v-if="pipelineStatus === 'success'" style="font-size: 13px">
                {{ pipelineSuccessDescription }}
              </div>
              <div v-else-if="pipelineStatus === 'paused'" style="font-size: 13px">
                {{ t('patches.linux.queryMayContinue', { error: taskErrorMessage }) }}
              </div>
              <div v-else style="font-size: 13px">
                {{ t('patches.linux.taskStopped', { error: taskErrorMessage }) }}
              </div>
            </template>
          </el-alert>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button v-if="taskDetailData?.status === 'PENDING_APPROVAL'" tag="router-link"
            :to="{ name: 'patches-installTasks', query: { taskId: createdTaskId } }">
            {{ t('patches.changeControl.openApplication') }}
          </el-button>
          <el-button v-if="createdTaskId && inspectionAvailable" @click="inspectionVisible = true">
            {{ t('patches.changeControl.inspection') }}
          </el-button>
          <!-- Step 0 取消 -->
          <el-button v-if="currentStepKey === 'select'" @click="isVisible = false">{{ t('common.cancel') }}</el-button>

          <!-- 上一步：仅在非执行中时允许回退 -->
          <el-button v-if="installStep > 0 && !configurationLocked" @click="goBack">
            <i class="fa fa-chevron-left" style="margin-right: 4px" />
            {{ t('patches.linux.previousStep') }}
          </el-button>

          <el-button
            v-if="currentStepKey === 'execute' && createdTaskId && !isRollbackTask && canViewPatchTaskFailedHosts(taskDetailData)"
            type="primary"
            plain
            @click="failedHostsVisible = true"
          >
            {{ t('patches.linux.viewFailedHosts') }}
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
            <span>{{ pipelineStatus === 'running' ? t('patches.linux.executingEllipsis') : t('patches.linux.preparingExecution') }}</span>
          </el-button>

          <!-- 跳过按钮：针对 RPM 预检、预执行、校验脚本和重启配置 -->
          <el-button
            v-if="currentStepSkippable"
            :disabled="configurationLocked"
            @click="handleSkipStep"
          >
            {{ t('patches.linux.skipStep') }}
          </el-button>

          <!-- 下一步按钮：配置步骤直接进入下一步 -->
          <el-button
            v-if="currentStepKey !== 'execute'"
            type="primary"
            :loading="stepTransitionLoading"
            :disabled="
              configurationLocked ||
              (currentStepKey === 'select' && selectedHosts.length === 0) ||
              (currentStepKey === 'restart' &&
                requiresRestartConfirm &&
                !restartConfirmationValid)
            "
            @click="handleAdvanceStep"
          >
            {{ t('patches.linux.nextStep') }}
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
              {{ t('patches.linux.recheck') }}
            </el-button>
            <el-button
              type="danger"
              plain
              :loading="executionSubmitting"
              @click="handleSkipPreCheck"
            >
              <i class="fa fa-forward" style="margin-right: 4px" />
              {{ t('patches.linux.skipAndContinue') }}
            </el-button>
          </template>

          <!-- 最后一步确认与离开按钮 -->
          <el-button
            v-else-if="
              installStep === finalStepIndex && pipelineStatus !== 'running' && !executionSubmitting &&
              taskDetailData?.status !== 'PENDING_APPROVAL'
            "
            type="primary"
            @click="handlePrimaryAction"
          >
            <i
              :class="pipelineStatus === 'success' ? 'fa fa-check' : 'fa fa-play'"
              style="margin-right: 4px"
            />
            {{
              pipelineStatus === 'success'
                ? t('execution.jobStatus.COMPLETED')
                : pipelineStatus === 'paused'
                  ? t('patches.linux.resumeQuery')
                  : t('patches.linux.startTask')
            }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <PatchTaskFailedHostsDialog v-model="failedHostsVisible" :task-id="createdTaskId" />
    <TaskInspectionDialog v-if="inspectionVisible" v-model="inspectionVisible"
      :task-id="createdTaskId" :is-admin="user?.login === 'admin'" />

    <ExecuteResultDialog
      v-model:visible="executeResultVisible"
      :run-id="currentExecuteRunId"
      :job-title="currentExecuteJobTitle"
    />
  </div>
</template>

<script setup>
import { t, currentLocale } from '@/core/i18n'
import { message, messageRef } from '@/core/i18n/feedback'
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
import PatchTaskFailedHostsDialog from '../dialogs/PatchTaskFailedHostsDialog.vue'
import PatchImplementationPlan from '../../change-control/PatchImplementationPlan.vue'
import TaskInspectionDialog from '../../change-control/TaskInspectionDialog.vue'
import { useAuth } from '@/core/auth'
import { canInspectPatchTask, canViewPatchTaskFailedHosts } from '../../../utils/patchInstallSchedule'
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
const { user } = useAuth()
const planDraft = ref({})
const inspectionVisible = ref(false)
const inspectionAvailable = computed(() => canInspectPatchTask(taskDetailData.value))

const isVisible = computed({
  get: () => props.visible,
  set: val => {
    if (!val && dialogBusy.value) return
    emit('update:visible', val)
  }
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
  groupLoading,
  groupOptions,
  handleHostGroupChange,
  handleHostPageChange,
  handleHostSizeChange,
  handleHostTableSelect,
  handleToggleHostSelectAll,
  hostAllSelected,
  hostPagination,
  hostSearchText,
  hostTableRef,
  installDataLoading,
  openTargetSelection,
  packageEmptyText,
  resetHostAllSelected,
  selectedHosts,
  selectedGroupIds,
  selectedTagNames,
  tagOptions,
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
  getSearchContext: () => currentLocale.value,
  searchFn: (item, keyword, locale) => {
    const primary = String(item.primary || '').toLowerCase()
    const secondary = String(item.getSearchText?.(locale) ?? item.secondary ?? '').toLowerCase()
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
const failedHostsVisible = ref(false)
const restartConfirmText = ref('')
const pipelineStatus = ref('idle')
const dialogBusy = computed(
  () =>
    executionSubmitting.value || stepTransitionLoading.value || pipelineStatus.value === 'running'
)
const configurationLocked = computed(() => dialogBusy.value || pipelineStatus.value === 'paused' ||
  taskDetailData.value?.status === 'PENDING_APPROVAL')

function handleBeforeClose(done) {
  if (!dialogBusy.value) done()
}

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
  restartConfirmationValid,
  restartConfirmSubmitText,
  restartOptions,
  restartStrategySummary
} = usePatchTaskRestartAdvice({
  props,
  affectedPackages,
  createdTaskId,
  installConfig,
  isSkipped,
  restartConfirmText
})
const taskStatus = ref('') // 后端任务状态
const taskErrorMessage = messageRef('') // 错误信息
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
  planDraft,
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
  restartConfirmationValid,
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

    failedHostsVisible.value = false
    inspectionVisible.value = false
    planDraft.value = {}
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
    { key: 'pre', get label() { return t('patches.linux.precheck') }, idx: stepIndexes.value.pre, runKey: 'preCheckRunId' },
    {
      key: 'execute',
      label: executeStepTitle.value,
      idx: stepIndexes.value.execute,
      runKey: 'executeRunId'
    },
    { key: 'restart', get label() { return t('patches.linux.restartPolicy') }, idx: stepIndexes.value.restart, runKey: 'restartRunId' },
    { key: 'validate', get label() { return t('patches.linux.scriptValidation') }, idx: stepIndexes.value.validate, runKey: 'validateRunId' }
  ]

  return items.map(item => {
    const state = stepStates[item.idx] || 'idle'
    const skipped = Boolean(isSkipped[item.key] && state === 'success')
    const text =
      state === 'running'
        ? t('patches.linux.executing')
        : state === 'success'
          ? skipped
            ? t('patches.linux.systemSkipped')
            : t('common.pollingSuccess')
          : state === 'failed'
            ? taskErrorMessage.value || t('patches.linux.taskFailedCheck')
            : t('patches.linux.waitingSchedule')

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
const currentExecuteJobTitle = messageRef('')

function openExecuteResult(runId, jobTitle) {
  currentExecuteRunId.value = runId
  currentExecuteJobTitle.value = jobTitle
  executeResultVisible.value = true
}

function openPipelineResult(runId, _label, step) {
  const stepKeys = {
    pre: 'patches.linux.precheck',
    restart: 'patches.linux.restartPolicy',
    validate: 'patches.linux.scriptValidation'
  }
  const operationKeys = {
    patch: 'patches.linux.patchInstall',
    package: 'patches.linux.packageUpdate',
    vulnerability: 'patches.linux.vulnFix',
    rollback: 'patches.linux.changeRollback'
  }
  openExecuteResult(runId, message(stepKeys[step] || operationKeys[displayOperationType.value]))
}

function getTaskRunId(taskData, runKey) {
  if (!taskData || !runKey) return ''
  return taskData[runKey] || ''
}

function resolveApiErrorMessage(error, fallback = t('patches.linux.operationFailedRetry')) {
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

watch(
  createdTaskId,
  () => {
    failedHostsVisible.value = false
    resetPreCheckResultSnapshot()
  },
  { flush: 'sync' }
)

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
    t('patches.linux.skipPrecheckConfirm'),
    t('patches.linux.notice'),
    {
      closeOnClickModal: false,
      closeOnPressEscape: false,
      get confirmButtonText() { return t('patches.linux.confirmSkip') },
      get cancelButtonText() { return t('common.cancel') },
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

:deep(.patch-task-package-list__item) {
  color: #666;
}

:global(html.dark) :deep(.patch-task-package-list__item) {
  color: var(--el-text-color-secondary);
}
</style>
