<template>
  <div class="task-step-content win-patch-execute-step">
    <el-alert
      v-if="!taskId"
      title="所有回滚参数已经配置完成。点击“开始执行回滚”后，系统会自动创建任务并按步骤推进。"
      type="info"
      :closable="false"
      show-icon
    />

    <template v-else>
      <div class="task-step-editor">
        <div class="task-step-editor__title">
          <i class="fa fa-undo" style="margin-right: 6px"></i>
          执行回滚
        </div>
        <div class="install-summary-card">
          <div class="install-summary-row">
            <span class="install-summary-label">待回滚补丁</span>
            <div class="install-summary-list">
              <div v-if="selectedRollbackItems.length === 0" class="install-summary-empty">暂无数据</div>
              <div
                v-for="item in selectedRollbackItems"
                :key="item.id || `${item.hostId}-${item.kbNumber}`"
                class="install-summary-item"
              >
                <div>{{ item.kbNumber || '-' }}</div>
                <div class="install-summary-subtext">{{ item.hostKey || '-' }}</div>
                <div v-if="item.title" class="install-summary-subtext">{{ item.title }}</div>
              </div>
            </div>
          </div>
          <div class="install-summary-row">
            <span class="install-summary-label">目标主机</span>
            <div class="install-summary-list">
              <div v-if="hostItems.length === 0" class="install-summary-empty">暂无数据</div>
              <div v-for="item in hostItems" :key="`${item.hostId}-${item.hostKey}`" class="install-summary-item">
                <div>{{ item.hostKey || '-' }}</div>
                <div class="install-summary-subtext">主机 ID：{{ item.hostId || '-' }}</div>
              </div>
            </div>
          </div>
          <div class="install-summary-row">
            <span class="install-summary-label">脚本配置</span>
            <div class="install-summary-list">
              <div class="install-summary-item">预检查脚本：{{ getScriptSummary(preScriptConfig, 'pre-check') }}</div>
              <div class="install-summary-item">校验脚本：{{ getScriptSummary(validateScriptConfig, 'validate') }}</div>
            </div>
          </div>
          <div class="install-summary-row">
            <span class="install-summary-label">执行策略</span>
            <div class="install-summary-list">
              <div class="install-summary-item">{{ getRollbackStrategySummary(rollbackOptions, skippedSteps) }}</div>
            </div>
          </div>
          <div v-if="availableRunItems.length" class="install-summary-row">
            <span class="install-summary-label">作业详情</span>
            <div class="win-patch-execute-step__runs-list">
              <el-tag
                v-for="item in availableRunItems"
                :key="`${item.label}-${item.runId}`"
                size="small"
                effect="plain"
                class="clickable-tag"
                @click="emit('view-run', item.runId, item.label)"
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
              <i v-if="item.uiStatus === 'success' || item.uiStatus === 'skipped'" class="fa fa-check" />
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
                <el-button type="primary" link size="small" @click="emit('view-run', item.runId, item.label)">
                  查看详情
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
          :title="pipelineStatus === 'success' ? '所有任务已全部完成' : '执行任务中断'"
          class="task-step-alert"
        >
          <template #default>
            <div v-if="pipelineStatus === 'success'" class="timeline-status-text">
              Windows 补丁回滚流程已按既定步骤执行完成，可关闭向导或查看步骤详情确认结果。
            </div>
            <div v-else class="timeline-status-text">
              由于部分环节出现异常（{{ errorMessage || '未知错误' }}），任务已停止。请检查原因并重试。
            </div>
          </template>
        </el-alert>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  availableRunItems: {
    type: Array,
    default: () => []
  },
  errorMessage: {
    type: String,
    default: ''
  },
  hostItems: {
    type: Array,
    default: () => []
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
  rollbackOptions: {
    type: Object,
    default: () => ({
      reboot: false,
      rescanAfter: false
    })
  },
  selectedRollbackItems: {
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

const pipelineFinished = computed(() => ['success', 'failed'].includes(props.pipelineStatus))

function getScriptSummary(scriptConfig = {}, stepKey = '') {
  if (props.skippedSteps?.[stepKey]) {
    return '已设置为跳过，执行时会调用跳过接口'
  }

  const mode = scriptConfig?.mode === 'upload' ? 'upload' : 'edit'
  const hasContent = mode === 'upload'
    ? Boolean(scriptConfig?.file || scriptConfig?.fileName)
    : Boolean(String(scriptConfig?.content || '').trim())

  if (!hasContent) return '未配置，执行时会自动跳过'
  return mode === 'upload' ? '已上传脚本文件' : '手动编辑脚本'
}

function getRollbackStrategySummary(rollbackOptions = {}, skippedSteps = {}) {
  const restartText = skippedSteps?.restart
    ? '已设置为跳过重启步骤'
    : rollbackOptions?.reboot
      ? '回滚后自动重启'
      : '回滚后不重启'
  const rescanText = rollbackOptions?.rescanAfter ? '任务完成后自动重扫' : '任务完成后不自动重扫'
  return `${restartText}；${rescanText}`
}

function resolveStatusText(item) {
  if (item.uiStatus === 'running') return '正在执行中...'
  if (item.uiStatus === 'success') return '任务执行成功'
  if (item.uiStatus === 'skipped') return '系统已跳过执行'
  if (item.uiStatus === 'failed') return '任务执行失败，请检查'
  return '等待调度中'
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
