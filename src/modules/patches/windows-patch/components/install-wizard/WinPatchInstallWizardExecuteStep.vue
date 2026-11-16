<template>
  <div class="task-step-content win-patch-execute-step">
    <el-alert
      v-if="!taskId"
      :title="t('patches.windows.installReady')"
      type="info"
      :closable="false"
      show-icon
    />

    <template v-else>
      <div class="task-step-editor">
        <div class="task-step-editor__title">
          <i class="fa fa-download" style="margin-right: 6px"></i>
          {{ t('patches.windows.executeInstall') }}
        </div>
        <div class="install-summary-card">
          <div class="install-summary-row">
            <span class="install-summary-label">{{ t('patches.linux.patchesToInstall') }}</span>
            <div class="install-summary-list">
              <div v-if="selectedPatches.length === 0" class="install-summary-empty">{{ t('common.noData') }}</div>
              <div
                v-for="item in selectedPatches"
                :key="item.id || item.kbNumber"
                class="install-summary-item"
              >
                <div>{{ item.kbNumber || '-' }}</div>
                <div v-if="item.title" class="install-summary-subtext">{{ item.title }}</div>
              </div>
            </div>
          </div>
          <div class="install-summary-row">
            <span class="install-summary-label">{{ t('execution.ui.targetHost') }}</span>
            <div class="install-summary-list">
              <template v-if="isMultiHost">
                <div class="install-summary-item">{{ t('patches.linux.totalPrefix') }} {{ hostSummaries.length }} {{ t('patches.windows.hostUnit') }}</div>
                <div v-for="host in hostSummaries" :key="resolveHostId(host)" class="install-summary-subtext">
                  {{ resolveHostKey(host) }}（{{ resolveHostId(host) || '-' }}）
                </div>
              </template>
              <template v-else>
                <div class="install-summary-item">{{ resolveHostKey(hostSummary) }}</div>
                <div class="install-summary-subtext">
                  {{ t('patches.windows.hostIdLabel') }}{{ resolveHostId(hostSummary) || '-' }}
                </div>
                <div class="install-summary-subtext">
                  {{ pickValue(hostSummary, ['osDistro', 'os_distro'], '-') }} /
                  {{ pickValue(hostSummary, ['osVersion', 'os_version'], '-') }} /
                  {{ pickValue(hostSummary, ['osArch', 'os_arch'], '-') }}
                </div>
              </template>
            </div>
          </div>
          <div class="install-summary-row">
            <span class="install-summary-label">{{ t('patches.windows.scriptSettings') }}</span>
            <div class="install-summary-list">
              <div class="install-summary-item">
                {{ t('patches.windows.preCheckLabel') }}{{ getScriptSummary(preScriptConfig, 'pre-check') }}
              </div>
              <div class="install-summary-item">
                {{ t('patches.windows.validateLabel') }}{{ getScriptSummary(validateScriptConfig, 'validate') }}
              </div>
            </div>
          </div>
          <div class="install-summary-row">
            <span class="install-summary-label">{{ t('automation.approval.executionPolicy') }}</span>
            <div class="install-summary-list">
              <div class="install-summary-item">
                {{ getInstallStrategySummary(installOptions, skippedSteps) }}
              </div>
            </div>
          </div>
          <div v-if="availableRunItems.length" class="install-summary-row">
            <span class="install-summary-label">{{ t('patches.windows.executionResults') }}</span>
            <div class="win-patch-execute-step__runs-list">
              <el-tag
                v-for="item in availableRunItems"
                :key="`${item.label}-${item.runId}`"
                size="small"
                effect="plain"
                class="clickable-tag"
                @click="emit('view-run', item.runId, item.label, item.key)"
              >
                {{ item.label }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>

      <div class="task-step-action" v-if="pipelineStatus !== 'idle'">
        <div class="pipeline-timeline">
          <div
            v-for="(item, index) in pipelineItems"
            :key="item.key"
            class="timeline-item"
            :class="{
              'is-active': item.uiStatus === 'running',
              'is-success': item.uiStatus === 'success' || item.uiStatus === 'skipped',
              'is-failed': item.uiStatus === 'failed',
              'is-skipped': item.uiStatus === 'skipped',
              'is-pending': item.uiStatus === 'pending' || item.uiStatus === 'idle'
            }"
          >
            <div class="timeline-node">
              <i
                v-if="item.uiStatus === 'success' || item.uiStatus === 'skipped'"
                class="fa fa-check"
              />
              <i v-else-if="item.uiStatus === 'failed'" class="fa fa-times" />
              <i v-else-if="item.uiStatus === 'running'" class="fa fa-spinner fa-spin" />
              <span v-else>{{ index + 1 }}</span>
            </div>
            <div class="timeline-content">
              <div class="timeline-info">
                <div class="timeline-title">{{ item.label }}</div>
                <div class="timeline-status-text">{{ resolveStatusText(item) }}</div>
                <div v-if="item.remark" class="timeline-remark">{{ item.remark }}</div>
              </div>
              <div class="timeline-actions" v-if="item.runId">
                <el-button
                  type="primary"
                  link
                  size="small"
                  @click="emit('view-run', item.runId, item.label, item.key)"
                >
                  {{ t('automation.flow.details') }}
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <el-alert
          v-if="pipelineFinished"
          :type="pipelineStatus === 'success' ? 'success' : 'error'"
          :closable="false"
          show-icon
          :title="pipelineStatus === 'success' ? t('patches.linux.allCompleted') : t('patches.linux.taskInterrupted')"
          class="task-step-alert"
        >
          <template #default>
            <div v-if="pipelineStatus === 'success'" class="timeline-status-text">
              {{ t('patches.windows.installCompletedDetail') }}
            </div>
            <div v-else class="timeline-status-text">
              {{ t('patches.windows.taskStopped', { error: errorMessage || t('patches.linux.unknownError') }) }}
            </div>
          </template>
        </el-alert>
      </div>
    </template>
  </div>
</template>

<script setup>
import { t } from '@/core/i18n'
import { computed } from 'vue'
import { pickValue, resolveHostId, resolveHostKey } from '../../utils'

const props = defineProps({
  availableRunItems: {
    type: Array,
    default: () => []
  },
  errorMessage: {
    type: String,
    default: ''
  },
  hostSummaries: {
    type: Array,
    default: () => []
  },
  hostSummary: {
    type: Object,
    default: null
  },
  installOptions: {
    type: Object,
    default: () => ({
      reboot: false,
      rescanAfter: false
    })
  },
  pipelineItems: {
    type: Array,
    default: () => []
  },
  pipelineStatus: {
    type: String,
    default: 'idle'
  },
  preScriptConfig: {
    type: Object,
    default: () => ({})
  },
  selectedPatches: {
    type: Array,
    default: () => []
  },
  skippedSteps: {
    type: Object,
    default: () => ({})
  },
  taskId: {
    type: String,
    default: ''
  },
  validateScriptConfig: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['view-run'])

const isMultiHost = computed(() => props.hostSummaries.length > 0)
const pipelineFinished = computed(() => ['success', 'failed'].includes(props.pipelineStatus))

function getScriptSummary(scriptConfig = {}, stepKey = '') {
  if (props.skippedSteps?.[stepKey]) {
    return t('patches.windows.skipConfigured')
  }

  const mode = scriptConfig?.mode === 'upload' ? 'upload' : 'edit'
  const hasContent =
    mode === 'upload'
      ? Boolean(scriptConfig?.file || scriptConfig?.fileName)
      : Boolean(String(scriptConfig?.content || '').trim())

  if (!hasContent) return t('patches.windows.skipUnconfigured')
  return mode === 'upload' ? t('patches.windows.scriptFileUploaded') : t('patches.windows.scriptEdited')
}

function getInstallStrategySummary(installOptions = {}, skippedSteps = {}) {
  const restartText = skippedSteps?.restart
    ? t('patches.windows.skipRestartConfigured')
    : installOptions?.reboot
      ? t('patches.windows.rebootAfterInstall')
      : t('patches.windows.noRebootAfterInstall')
  const rescanText = installOptions?.rescanAfter ? t('patches.windows.rescanAfterCompletion') : t('patches.windows.noRescanAfterCompletion')
  return `${restartText}；${rescanText}`
}

function resolveStatusText(item) {
  if (item.uiStatus === 'running') return t('patches.linux.executing')
  if (item.uiStatus === 'success') return t('common.pollingSuccess')
  if (item.uiStatus === 'skipped') return t('patches.linux.systemSkipped')
  if (item.uiStatus === 'failed') return t('patches.linux.taskFailedCheck')
  return t('patches.linux.waitingSchedule')
}
</script>

<style scoped lang="scss">
.win-patch-execute-step {
  min-height: 280px;
}

.task-step-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
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
}

.task-step-action {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  margin-top: 4px;
}

.task-step-alert {
  width: 100%;
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

.install-summary-value {
  color: var(--el-text-color-primary);
  word-break: break-all;
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

.install-summary-item--inline {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.install-summary-subtext {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.install-summary-empty {
  color: var(--el-text-color-placeholder);
}

.win-patch-execute-step__runs-list {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.pipeline-timeline {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  padding: 10px 0;
}

.timeline-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background-color: var(--el-fill-color-blank);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}

.timeline-item.is-active {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}

.timeline-item.is-success {
  border-color: var(--el-color-success-light-5);
  background-color: var(--el-color-success-light-9);
}

.timeline-item.is-failed {
  border-color: var(--el-color-danger-light-5);
  background-color: var(--el-color-danger-light-9);
}

.timeline-item.is-skipped {
  border-style: dashed;
  opacity: 0.7;
  filter: grayscale(0.5);
}

.timeline-node {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  background-color: var(--el-fill-color-light);
  color: var(--el-text-color-placeholder);
  flex-shrink: 0;
}

.is-active .timeline-node {
  background-color: var(--el-color-primary);
  color: #fff;
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

.timeline-status-text,
.timeline-remark {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.is-active .timeline-title {
  color: var(--el-color-primary);
}

.is-success .timeline-title {
  color: var(--el-color-success);
}

.is-failed .timeline-title {
  color: var(--el-color-danger);
}

.timeline-actions .el-button {
  font-size: 14px;
  font-weight: 500;
  padding: 4px 0;
}

.clickable-tag {
  cursor: pointer;
}

@media (max-width: 960px) {
  .timeline-content {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
