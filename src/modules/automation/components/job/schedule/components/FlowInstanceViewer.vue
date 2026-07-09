<template>
  <teleport to="body">
    <transition name="viewer-fade">
      <div v-if="visible" class="flow-instance-viewer" :style="{ zIndex: viewerZIndex }">
        <div class="viewer__backdrop" @click="handleClose" />
        <div class="viewer__panel" @click.stop>
          <header class="viewer__header">
            <div class="viewer__heading">
              <div class="viewer__eyebrow">流程实例详情</div>
              <h3 class="header-title">{{ instanceData?.name || '流程实例详情' }}</h3>
              <div class="header-meta">
                <span>执行人 {{ instanceData?.createdBy || '-' }}</span>
                <span>开始时间 {{ formatDateTime(instanceData?.createdAt) }}</span>
                <span>主机 {{ hostRows.length }}</span>
                <span>步骤 {{ normalizedSteps.length }}</span>
              </div>
            </div>
            <el-button class="header-close" text circle @click="handleClose">
              <i class="fa fa-times" />
            </el-button>
          </header>

          <el-scrollbar class="viewer__body">
            <div v-loading="loading" class="viewer-content">
              <template v-if="instanceData">
                <section class="viewer-summary-grid">
                  <article class="summary-card">
                    <span class="summary-card__label">目标主机</span>
                    <strong class="summary-card__value">{{ hostRows.length }}</strong>
                  </article>
                  <article class="summary-card">
                    <span class="summary-card__label">流程步骤</span>
                    <strong class="summary-card__value">{{ normalizedSteps.length }}</strong>
                  </article>
                  <article class="summary-card">
                    <span class="summary-card__label">全局参数</span>
                    <strong class="summary-card__value">{{ globalParamCount }}</strong>
                  </article>
                  <article class="summary-card">
                    <span class="summary-card__label">整体状态</span>
                    <strong class="summary-card__value">{{ overallStatusText }}</strong>
                  </article>
                </section>

                <section class="viewer-section is-step-overview">
                  <div class="section-heading">
                    <div>
                      <h4 class="section-title">步骤概览</h4>
                    </div>
                  </div>
                  <div class="step-overview-grid">
                    <article
                      v-for="step in normalizedSteps"
                      :key="step.id"
                      class="step-overview-card"
                      :class="`is-${step.aggregateBucket}`"
                    >
                      <div class="step-overview-card__main">
                        <div class="step-overview-card__meta">
                          <span class="step-overview-card__index">步骤 {{ step.index }}</span>
                          <strong class="step-overview-card__title">{{ step.name }}</strong>
                          <span class="step-overview-card__script">
                            {{ step.scriptPath || '未配置脚本路径' }}
                          </span>
                        </div>
                        <el-tag
                          class="step-overview-card__status"
                          size="small"
                          :type="getStatusTagType(step.aggregateBucket)"
                          effect="light"
                        >
                          {{ getStatusLabel(step.aggregateBucket) }}
                        </el-tag>
                      </div>
                      <div class="step-overview-card__stats">
                        <span>
                          <b>{{ step.summary.success }}</b>
                          成功
                        </span>
                        <span>
                          <b>{{ step.summary.running }}</b>
                          运行中
                        </span>
                        <span>
                          <b>{{ step.summary.failed }}</b>
                          失败
                        </span>
                        <span>
                          <b>{{ step.summary.pending }}</b>
                          待执行
                        </span>
                      </div>
                    </article>
                  </div>
                </section>

                <section class="viewer-section">
                  <div class="section-heading">
                    <div>
                      <h4 class="section-title">主机执行矩阵</h4>
                      <p class="section-subtitle">
                        点击状态单元格可查看该主机在对应步骤上的具体输出。
                      </p>
                    </div>
                    <div class="status-legend">
                      <span class="legend-item is-success">成功</span>
                      <span class="legend-item is-running">运行中</span>
                      <span class="legend-item is-failed">失败</span>
                      <span class="legend-item is-pending">待执行</span>
                    </div>
                  </div>

                  <div v-if="hostRows.length && normalizedSteps.length" class="status-matrix-wrap">
                    <table class="status-table">
                      <thead>
                        <tr>
                          <th class="status-table__host-head">主机</th>
                          <th
                            v-for="step in normalizedSteps"
                            :key="step.id"
                            class="status-table__step-head"
                          >
                            <div class="status-table__step-name">{{ step.name }}</div>
                            <div class="status-table__step-script">
                              {{ step.scriptPath || '未配置脚本' }}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="host in hostRows" :key="host.hostId">
                          <td class="host-cell">
                            <strong>{{ host.hostKey }}</strong>
                            <span>{{ host.assetType || '未知类型' }}</span>
                          </td>
                          <td v-for="step in normalizedSteps" :key="step.id" class="status-cell">
                            <button
                              type="button"
                              class="status-pill"
                              :class="[
                                `is-${getStepStatusBucket(host.stepStates[step.id])}`,
                                {
                                  'is-disabled': !canInspectStatus(host.stepStates[step.id]),
                                  'is-active':
                                    currentCell.stepId === step.id &&
                                    currentCell.hostId === host.hostId
                                }
                              ]"
                              :disabled="!canInspectStatus(host.stepStates[step.id])"
                              @click="handleCellClick(step, host)"
                            >
                              <i class="fa" :class="getStatusIconClass(host.stepStates[step.id])" />
                              <span>{{ getStatusLabel(host.stepStates[step.id]) }}</span>
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div v-else class="viewer-empty-state">
                    <i class="fa fa-stream" />
                    <h4>暂无可展示的执行矩阵</h4>
                    <p>当前实例没有返回主机状态视图，稍后可刷新后再试。</p>
                  </div>
                </section>
              </template>
            </div>
          </el-scrollbar>
        </div>
      </div>
    </transition>
  </teleport>

  <el-drawer
    v-model="hostOutputVisible"
    direction="rtl"
    size="min(720px, 92vw)"
    append-to-body
    :with-header="false"
    class="host-output-drawer"
  >
    <div v-loading="hostOutputLoading" class="host-output-drawer__body">
      <div class="host-output-drawer__header">
        <div>
          <div class="host-output-drawer__eyebrow">主机执行输出</div>
          <h4 class="host-output-drawer__title">{{ currentCell.stepName || '步骤输出' }}</h4>
          <div class="host-output-drawer__meta">
            <span>{{ currentCell.hostKey || '-' }}</span>
            <span>{{ getStatusLabel(currentCell.status) }}</span>
          </div>
        </div>
        <el-button text circle @click="hostOutputVisible = false">
          <i class="fa fa-times" />
        </el-button>
      </div>

      <div class="host-output-drawer__content">
        <template v-if="hostOutputTasks.length">
          <article v-for="(task, index) in hostOutputTasks" :key="index" class="task-item">
            <div class="task-header">
              <div class="task-header__meta">
                <el-tag :type="getTaskStatusType(task.status)" size="small">
                  {{ formatTaskStatus(task.status) }}
                </el-tag>
                <strong class="task-name">{{ task.task || `任务 ${index + 1}` }}</strong>
              </div>
            </div>
            <pre v-if="task.output" class="task-output">{{ task.output }}</pre>
            <div v-else class="task-output task-output--empty">该任务没有返回输出内容。</div>
          </article>
        </template>
        <div v-else class="viewer-empty-state is-compact">
          <i class="fa fa-file-alt" />
          <h4>暂无主机输出</h4>
          <p>该步骤当前没有返回可展示的任务输出。</p>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage, useZIndex } from 'element-plus'
import { formatDateTime } from '@/modules/automation/utils/helpers'
import * as jaoApi from '@/modules/automation/api/jao'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  instanceId: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])
const { nextZIndex } = useZIndex()

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const viewerZIndex = ref(2000)
const loading = ref(false)
const instanceData = ref(null)
const hostStatusList = ref([])
const hostOutputVisible = ref(false)
const hostOutputLoading = ref(false)
const hostOutputTasks = ref([])
const currentCell = ref({
  stepId: '',
  stepName: '',
  hostId: '',
  hostKey: '',
  status: ''
})

const normalizedSteps = computed(() => {
  const steps = Array.isArray(instanceData.value?.steps) ? instanceData.value.steps : []
  return steps.map((step, index) => {
    const summary = summarizeStep(step.id)
    return {
      ...step,
      index: index + 1,
      name: step.name || `步骤 ${index + 1}`,
      scriptPath: getStepScriptPath(step),
      summary,
      aggregateBucket: getAggregateBucket(summary)
    }
  })
})

const hostRows = computed(() => {
  const hosts = Array.isArray(instanceData.value?.hosts) ? instanceData.value.hosts : []
  const steps = Array.isArray(instanceData.value?.steps) ? instanceData.value.steps : []
  const statusMap = new Map(
    (Array.isArray(hostStatusList.value) ? hostStatusList.value : []).map(item => [
      item.hostId,
      item
    ])
  )
  const rows = hosts.map(host => buildHostRow(host, statusMap.get(host.key), steps))

  ;(Array.isArray(hostStatusList.value) ? hostStatusList.value : []).forEach(item => {
    if (!rows.some(row => row.hostId === item.hostId)) {
      rows.push(
        buildHostRow(
          {
            key: item.hostId,
            value: item.hostkey || item.hostId,
            assetType: ''
          },
          item,
          steps
        )
      )
    }
  })

  return rows
})

const globalParamCount = computed(() => {
  const params = safeJsonParseArray(instanceData.value?.globalParamsJson)
  return params.length
})

const overallStatusText = computed(() => {
  const summary = hostRows.value.reduce(
    (result, host) => {
      Object.values(host.stepStates).forEach(status => {
        const bucket = getStepStatusBucket(status)
        result[bucket] += 1
      })
      return result
    },
    { success: 0, running: 0, failed: 0, pending: 0 }
  )

  if (summary.failed) return '存在失败'
  if (summary.running) return '运行中'
  if (summary.success && !summary.pending) return '全部成功'
  if (summary.success) return '部分完成'
  return '待执行'
})

watch(
  visible,
  val => {
    if (val) {
      viewerZIndex.value = nextZIndex()
      if (props.instanceId) {
        fetchInstanceView()
      }
      return
    }

    resetData()
  },
  { immediate: true }
)

async function fetchInstanceView() {
  if (!props.instanceId) return

  loading.value = true
  try {
    const response = await jaoApi.fetchFlowInstanceView(props.instanceId)
    const data = response?.data || response
    instanceData.value = data.instance || null
    hostStatusList.value = Array.isArray(data.statusView) ? data.statusView : []
  } catch (error) {
    ElMessage.error(error?.message || '获取实例详情失败')
  } finally {
    loading.value = false
  }
}

async function handleCellClick(step, host) {
  if (!step?.id || !host?.hostId) return
  if (!canInspectStatus(host?.stepStates?.[step.id])) {
    ElMessage.info('该步骤尚未执行，暂无可查看输出')
    return
  }

  currentCell.value = {
    stepId: step.id,
    stepName: step.name,
    hostId: host.hostId,
    hostKey: host.hostKey,
    status: host.stepStates[step.id] || ''
  }
  hostOutputVisible.value = true
  hostOutputLoading.value = true
  hostOutputTasks.value = []

  try {
    const response = await jaoApi.fetchFlowHostResult(step.id, host.hostId)
    const data = response?.data || response
    hostOutputTasks.value = normalizeHostOutputTasks(data?.result)
  } catch (error) {
    ElMessage.error(error?.message || '获取主机输出失败')
  } finally {
    hostOutputLoading.value = false
  }
}

function buildHostRow(host, statusView, steps) {
  const stepStates = {}
  steps.forEach(step => {
    stepStates[step.id] = normalizeExecutionStatus(statusView?.[step.id])
  })

  return {
    hostId: host?.key || statusView?.hostId || '',
    hostKey: host?.value || statusView?.hostkey || host?.key || '-',
    assetType: host?.assetType || '',
    stepStates
  }
}

function summarizeStep(stepId) {
  return hostRows.value.reduce(
    (result, host) => {
      const bucket = getStepStatusBucket(host.stepStates[stepId])
      result[bucket] += 1
      return result
    },
    { success: 0, running: 0, failed: 0, pending: 0 }
  )
}

function getAggregateBucket(summary) {
  if (summary.failed) return 'failed'
  if (summary.running) return 'running'
  if (summary.success && !summary.pending) return 'success'
  if (summary.success) return 'running'
  return 'pending'
}

function getStepScriptPath(step) {
  const config = parseStepConfig(step)
  const scripts = Array.isArray(config?.tasks?.[0]?.scripts) ? config.tasks[0].scripts : []
  const firstScript = scripts[0]
  return firstScript?.location || firstScript?.path || ''
}

function parseStepConfig(step) {
  if (step?.config && typeof step.config === 'object') return step.config
  if (!step?.configJson) return null
  try {
    return JSON.parse(step.configJson)
  } catch {
    return null
  }
}

function normalizeExecutionStatus(status) {
  return String(status || '')
    .trim()
    .toLowerCase()
}

function getStepStatusBucket(status) {
  if (['finished', 'success', 'ok', 'changed', 'completed', 'done'].includes(status)) {
    return 'success'
  }
  if (['running', 'processing', 'started'].includes(status)) return 'running'
  if (['failed', 'error', 'aborted', 'cancelled', 'interrupted'].includes(status)) {
    return 'failed'
  }
  return 'pending'
}

function getStatusLabel(status) {
  const bucket = getStepStatusBucket(status)
  const labelMap = {
    success: '成功',
    running: '运行中',
    failed: '失败',
    pending: '待执行'
  }
  return labelMap[bucket] || '待执行'
}

function getStatusTagType(status) {
  const bucket = getStepStatusBucket(status)
  const typeMap = {
    success: 'success',
    running: 'primary',
    failed: 'danger',
    pending: 'info'
  }
  return typeMap[bucket] || 'info'
}

function getStatusIconClass(status) {
  const bucket = getStepStatusBucket(status)
  const iconMap = {
    success: 'fa-check-circle',
    running: 'fa-spinner',
    failed: 'fa-times-circle',
    pending: 'fa-clock'
  }
  return iconMap[bucket] || 'fa-clock'
}

function canInspectStatus(status) {
  return getStepStatusBucket(status) !== 'pending'
}

function normalizeHostOutputTasks(result) {
  if (!result) return []
  if (Array.isArray(result)) return result
  try {
    const parsed = JSON.parse(String(result))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function safeJsonParseArray(value) {
  if (!value) return []
  if (Array.isArray(value)) return value
  try {
    const parsed = JSON.parse(String(value))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function getTaskStatusType(status) {
  const statusMap = {
    changed: 'success',
    ok: 'success',
    success: 'success',
    finished: 'success',
    failed: 'danger',
    error: 'danger',
    running: 'primary',
    skipped: 'info'
  }
  return statusMap[String(status || '').toLowerCase()] || 'info'
}

function formatTaskStatus(status) {
  const labelMap = {
    changed: '已变更',
    ok: '成功',
    success: '成功',
    finished: '已完成',
    failed: '失败',
    error: '错误',
    running: '运行中',
    skipped: '已跳过'
  }
  const key = String(status || '').toLowerCase()
  return labelMap[key] || status || '未知'
}

function resetData() {
  instanceData.value = null
  hostStatusList.value = []
  hostOutputVisible.value = false
  hostOutputTasks.value = []
  currentCell.value = {
    stepId: '',
    stepName: '',
    hostId: '',
    hostKey: '',
    status: ''
  }
}

function handleClose() {
  visible.value = false
}


</script>

<style scoped lang="scss">
.flow-instance-viewer {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.viewer__backdrop {
  position: absolute;
  inset: 0;
  background: var(--viewer-backdrop-bg);
}

.viewer__panel {
  position: relative;
  width: min(1380px, 96vw);
  height: min(92vh, 960px);
  background: var(--viewer-panel-bg);
  border: 1px solid var(--viewer-panel-border);
  border-radius: 18px;
  box-shadow: var(--viewer-panel-shadow);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.viewer__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  padding: 20px 24px 18px;
  border-bottom: 1px solid var(--viewer-border);
  background: var(--viewer-header-bg);
  flex-shrink: 0;
}

.viewer__heading {
  min-width: 0;
}

.viewer__eyebrow {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--viewer-badge-bg);
  color: var(--viewer-badge-text);
  font-size: 12px;
  font-weight: 600;
}

.header-title {
  margin: 10px 0 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--viewer-text-primary);
}

.header-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.header-meta span {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--viewer-chip-bg);
  border: 1px solid var(--viewer-chip-border);
  color: var(--viewer-text-secondary);
  font-size: 12px;
}

.header-close {
  flex-shrink: 0;
  color: var(--viewer-text-secondary);
}

.viewer__body {
  flex: 1;
  min-height: 0;
}

.viewer__body :deep(.el-scrollbar__view) {
  padding: 24px;
}

.viewer-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100%;
}

.viewer-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.summary-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  min-height: 88px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--viewer-border);
  background: var(--viewer-card-bg);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.summary-card__label {
  display: block;
  font-size: 11px;
  line-height: 1.4;
  color: var(--viewer-text-secondary);
}

.summary-card__value {
  display: block;
  font-size: 20px;
  line-height: 1.2;
  color: var(--viewer-text-primary);
}

.viewer-section {
  padding: 16px 18px;
  border-radius: 14px;
  border: 1px solid var(--viewer-border);
  background: var(--viewer-section-bg);
  box-shadow: var(--viewer-section-shadow);
}

.viewer-section.is-step-overview {
  padding: 14px 16px;
}

.viewer-section.is-step-overview .section-heading {
  margin-bottom: 10px;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.section-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--viewer-text-primary);
}

.section-subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--viewer-text-secondary);
}

.step-overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 8px;
}

.step-overview-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--viewer-chip-border);
  background: var(--viewer-card-bg-plain);
}

.step-overview-card.is-success {
  border-color: var(--viewer-success-border);
  background: var(--viewer-success-bg-soft);
}

.step-overview-card.is-running {
  border-color: var(--viewer-running-border);
  background: var(--viewer-running-bg-soft);
}

.step-overview-card.is-failed {
  border-color: var(--viewer-failed-border);
  background: var(--viewer-failed-bg-soft);
}

.step-overview-card.is-pending {
  border-color: var(--viewer-pending-border);
  background: var(--viewer-pending-bg-soft);
}

.step-overview-card__main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.step-overview-card__meta {
  display: grid;
  grid-template-columns: auto minmax(80px, max-content) minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.step-overview-card__index {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--viewer-chip-bg);
  border: 1px solid var(--viewer-chip-border);
  font-size: 11px;
  font-weight: 700;
  color: var(--viewer-text-strong);
  white-space: nowrap;
}

.step-overview-card__title {
  min-width: 0;
  overflow: hidden;
  font-size: 14px;
  line-height: 1.4;
  color: var(--viewer-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.step-overview-card__script {
  min-width: 0;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.4;
  color: var(--viewer-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.step-overview-card__status {
  flex: 0 0 auto;
}

.step-overview-card__stats {
  display: grid;
  grid-template-columns: repeat(4, auto);
  align-items: center;
  justify-content: end;
  gap: 6px;
}

.step-overview-card__stats span {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  min-width: 52px;
  min-height: 24px;
  padding: 0 7px;
  border-radius: 999px;
  background: var(--viewer-chip-bg);
  border: 1px solid var(--viewer-chip-border);
  font-size: 12px;
  color: var(--viewer-text-strong);
  white-space: nowrap;
}

.step-overview-card__stats b {
  font-size: 13px;
  color: var(--viewer-text-primary);
}

.status-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.legend-item.is-success {
  background: var(--viewer-success-bg);
  color: var(--viewer-success-text);
}

.legend-item.is-running {
  background: var(--viewer-running-bg);
  color: var(--viewer-running-text);
}

.legend-item.is-failed {
  background: var(--viewer-failed-bg);
  color: var(--viewer-failed-text);
}

.legend-item.is-pending {
  background: var(--viewer-pending-bg);
  color: var(--viewer-pending-text);
}

.status-matrix-wrap {
  overflow: auto;
  border: 1px solid var(--viewer-border);
  border-radius: 16px;
  background: var(--viewer-card-bg-plain);
}

.status-table {
  width: 100%;
  min-width: 900px;
  border-collapse: separate;
  border-spacing: 0;
  background: var(--viewer-card-bg-plain);
}

.status-table th,
.status-table td {
  padding: 14px 12px;
  border-bottom: 1px solid var(--viewer-border);
  border-right: 1px solid var(--viewer-border-soft);
  vertical-align: middle;
}

.status-table thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--viewer-table-head-bg);
}

.status-table__host-head {
  left: 0;
  z-index: 3;
  min-width: 180px;
  text-align: left;
}

.status-table__step-head {
  min-width: 148px;
  text-align: left;
}

.status-table__step-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--viewer-text-primary);
}

.status-table__step-script {
  margin-top: 6px;
  font-size: 11px;
  line-height: 1.4;
  color: var(--viewer-text-secondary);
  word-break: break-all;
}

.host-cell {
  position: sticky;
  left: 0;
  z-index: 1;
  background: var(--viewer-host-cell-bg);
}

.host-cell strong {
  display: block;
  font-size: 13px;
  color: var(--viewer-text-primary);
}

.host-cell span {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: var(--viewer-text-tertiary);
}

.status-cell {
  text-align: center;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 40px;
  padding: 0 10px;
  border: 1px solid var(--viewer-border);
  border-radius: 12px;
  background: var(--viewer-status-pill-bg);
  color: var(--viewer-status-pill-text);
  cursor: pointer;
  transition: all 0.2s ease;
}

.status-pill:hover {
  transform: translateY(-1px);
  box-shadow: var(--viewer-status-hover-shadow);
}

.status-pill.is-disabled {
  cursor: not-allowed;
  opacity: 0.72;
  box-shadow: none;
}

.status-pill.is-disabled:hover {
  transform: none;
}

.status-pill.is-active {
  box-shadow: 0 0 0 2px var(--viewer-status-active-ring);
}

.status-pill.is-success {
  background: var(--viewer-success-bg);
  border-color: var(--viewer-success-border);
  color: var(--viewer-success-text);
}

.status-pill.is-running {
  background: var(--viewer-running-bg);
  border-color: var(--viewer-running-border);
  color: var(--viewer-running-text);
}

.status-pill.is-failed {
  background: var(--viewer-failed-bg);
  border-color: var(--viewer-failed-border);
  color: var(--viewer-failed-text);
}

.status-pill.is-pending {
  background: var(--viewer-pending-bg);
  border-color: var(--viewer-pending-border);
  color: var(--viewer-pending-text);
}

.viewer-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 240px;
  border: 1px dashed var(--viewer-empty-border);
  border-radius: 16px;
  background: var(--viewer-empty-bg);
  text-align: center;
  color: var(--viewer-text-secondary);
}

.viewer-empty-state.is-compact {
  min-height: 180px;
}

.viewer-empty-state i {
  font-size: 34px;
  color: var(--viewer-empty-icon);
}

.viewer-empty-state h4 {
  margin: 0;
  font-size: 18px;
  color: var(--viewer-text-primary);
}

.viewer-empty-state p {
  margin: 0;
  max-width: 420px;
  font-size: 13px;
  line-height: 1.6;
}

.host-output-drawer__body {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.host-output-drawer__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--viewer-border);
}

.host-output-drawer__eyebrow {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--viewer-badge-bg);
  color: var(--viewer-badge-text);
  font-size: 12px;
  font-weight: 600;
}

.host-output-drawer__title {
  margin: 10px 0 0;
  font-size: 20px;
  color: var(--viewer-text-primary);
}

.host-output-drawer__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.host-output-drawer__meta span {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--viewer-chip-bg);
  border: 1px solid var(--viewer-chip-border);
  font-size: 12px;
  color: var(--viewer-text-secondary);
}

.host-output-drawer__content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-top: 20px;
}

.task-item {
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid var(--viewer-border);
  border-radius: 12px;
  background: var(--viewer-card-bg-plain);
}

.task-item:last-child {
  margin-bottom: 0;
}

.task-header {
  margin-bottom: 12px;
}

.task-header__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.task-name {
  color: var(--viewer-text-primary);
  font-weight: 700;
}

.task-output {
  margin: 0;
  padding: 16px;
  border-radius: 10px;
  border: 1px solid var(--viewer-output-border);
  background: var(--viewer-output-bg);
  color: var(--viewer-output-text);
  font-family: Consolas, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-x: auto;
}

.task-output--empty {
  background: var(--viewer-empty-bg);
  color: var(--viewer-text-secondary);
  font-family: inherit;
}

:global(.host-output-drawer .el-drawer__body) {
  padding: 20px 24px;
  background: var(--viewer-panel-bg);
}

.viewer-fade-enter-active,
.viewer-fade-leave-active {
  transition: opacity 0.2s ease;
}

.viewer-fade-enter-from,
.viewer-fade-leave-to {
  opacity: 0;
}

@media (max-width: 1180px) {
  .viewer-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .step-overview-card {
    grid-template-columns: 1fr;
  }

  .step-overview-card__stats {
    justify-content: start;
  }

  .section-heading {
    flex-direction: column;
  }
}

@media (max-width: 768px) {
  .viewer__panel {
    width: 100vw;
    height: 100vh;
    border-radius: 0;
  }

  .viewer__header {
    padding: 18px 16px 16px;
  }

  .viewer__body :deep(.el-scrollbar__view) {
    padding: 16px;
  }

  .viewer-summary-grid,
  .step-overview-grid {
    grid-template-columns: 1fr;
  }

  .step-overview-card__main {
    align-items: flex-start;
    justify-content: space-between;
  }

  .step-overview-card__meta {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .step-overview-card__script {
    grid-column: 1 / -1;
  }

  .step-overview-card__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .step-overview-card__stats span {
    justify-content: center;
  }

  .header-meta {
    gap: 8px;
  }

  :global(.host-output-drawer .el-drawer__body) {
    padding: 16px;
  }
}
</style>

<style lang="scss">
.flow-instance-viewer,
.host-output-drawer {
  --viewer-backdrop-bg: rgba(15, 23, 42, 0.5);
  --viewer-panel-bg: #ffffff;
  --viewer-panel-border: rgba(226, 232, 240, 0.92);
  --viewer-panel-shadow: 0 30px 70px rgba(15, 23, 42, 0.24);
  --viewer-header-bg: linear-gradient(
    180deg,
    rgba(37, 99, 235, 0.06) 0%,
    rgba(255, 255, 255, 0) 100%
  );
  --viewer-border: #e2e8f0;
  --viewer-border-soft: #edf2f7;
  --viewer-chip-border: #dbe3f0;
  --viewer-card-bg: linear-gradient(180deg, rgba(248, 250, 252, 0.95) 0%, #ffffff 100%);
  --viewer-card-bg-plain: #ffffff;
  --viewer-section-bg: #ffffff;
  --viewer-section-shadow: 0 12px 30px rgba(15, 23, 42, 0.04);
  --viewer-table-head-bg: #f8fafc;
  --viewer-host-cell-bg: #ffffff;
  --viewer-chip-bg: rgba(248, 250, 252, 0.95);
  --viewer-badge-bg: rgba(37, 99, 235, 0.1);
  --viewer-badge-text: #2563eb;
  --viewer-text-primary: #0f172a;
  --viewer-text-secondary: #64748b;
  --viewer-text-tertiary: #94a3b8;
  --viewer-text-strong: #475569;
  --viewer-status-pill-bg: #f8fafc;
  --viewer-status-pill-text: #475569;
  --viewer-status-hover-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
  --viewer-status-active-ring: rgba(37, 99, 235, 0.18);
  --viewer-empty-bg: #f8fafc;
  --viewer-empty-border: #dbe3f0;
  --viewer-empty-icon: #94a3b8;
  --viewer-output-bg: #0f172a;
  --viewer-output-text: #e2e8f0;
  --viewer-output-border: #1e293b;
  --viewer-success-bg: rgba(16, 185, 129, 0.1);
  --viewer-success-bg-soft: linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, #ffffff 100%);
  --viewer-success-border: rgba(16, 185, 129, 0.28);
  --viewer-success-text: #059669;
  --viewer-running-bg: rgba(59, 130, 246, 0.1);
  --viewer-running-bg-soft: linear-gradient(180deg, rgba(59, 130, 246, 0.08) 0%, #ffffff 100%);
  --viewer-running-border: rgba(59, 130, 246, 0.25);
  --viewer-running-text: #2563eb;
  --viewer-failed-bg: rgba(239, 68, 68, 0.1);
  --viewer-failed-bg-soft: linear-gradient(180deg, rgba(239, 68, 68, 0.08) 0%, #ffffff 100%);
  --viewer-failed-border: rgba(239, 68, 68, 0.25);
  --viewer-failed-text: #dc2626;
  --viewer-pending-bg: rgba(148, 163, 184, 0.12);
  --viewer-pending-bg-soft: linear-gradient(180deg, rgba(148, 163, 184, 0.08) 0%, #ffffff 100%);
  --viewer-pending-border: rgba(148, 163, 184, 0.22);
  --viewer-pending-text: #64748b;
}

html.dark .flow-instance-viewer,
html.dark .host-output-drawer {
  --viewer-backdrop-bg: rgba(2, 6, 23, 0.72);
  --viewer-panel-bg: linear-gradient(
    180deg,
    rgba(15, 23, 42, 0.98) 0%,
    rgba(17, 24, 39, 0.96) 100%
  );
  --viewer-panel-border: rgba(71, 85, 105, 0.58);
  --viewer-panel-shadow: 0 34px 80px rgba(0, 0, 0, 0.48);
  --viewer-header-bg: linear-gradient(180deg, rgba(37, 99, 235, 0.2) 0%, rgba(15, 23, 42, 0) 100%);
  --viewer-border: rgba(51, 65, 85, 0.92);
  --viewer-border-soft: rgba(51, 65, 85, 0.72);
  --viewer-chip-border: rgba(71, 85, 105, 0.82);
  --viewer-card-bg: linear-gradient(180deg, rgba(30, 41, 59, 0.84) 0%, rgba(15, 23, 42, 0.94) 100%);
  --viewer-card-bg-plain: rgba(15, 23, 42, 0.9);
  --viewer-section-bg: rgba(15, 23, 42, 0.86);
  --viewer-section-shadow: 0 18px 36px rgba(0, 0, 0, 0.24);
  --viewer-table-head-bg: rgba(30, 41, 59, 0.96);
  --viewer-host-cell-bg: rgba(15, 23, 42, 0.98);
  --viewer-chip-bg: rgba(30, 41, 59, 0.9);
  --viewer-badge-bg: rgba(96, 165, 250, 0.16);
  --viewer-badge-text: #93c5fd;
  --viewer-text-primary: #e5eefc;
  --viewer-text-secondary: #94a3b8;
  --viewer-text-tertiary: #64748b;
  --viewer-text-strong: #cbd5e1;
  --viewer-status-pill-bg: rgba(30, 41, 59, 0.96);
  --viewer-status-pill-text: #cbd5e1;
  --viewer-status-hover-shadow: 0 12px 22px rgba(0, 0, 0, 0.26);
  --viewer-status-active-ring: rgba(96, 165, 250, 0.28);
  --viewer-empty-bg: rgba(15, 23, 42, 0.74);
  --viewer-empty-border: rgba(71, 85, 105, 0.82);
  --viewer-empty-icon: #64748b;
  --viewer-output-bg: #020617;
  --viewer-output-text: #cbd5e1;
  --viewer-output-border: rgba(71, 85, 105, 0.72);
  --viewer-success-bg: rgba(16, 185, 129, 0.18);
  --viewer-success-bg-soft: linear-gradient(
    180deg,
    rgba(16, 185, 129, 0.16) 0%,
    rgba(15, 23, 42, 0.92) 100%
  );
  --viewer-success-border: rgba(16, 185, 129, 0.34);
  --viewer-success-text: #34d399;
  --viewer-running-bg: rgba(59, 130, 246, 0.18);
  --viewer-running-bg-soft: linear-gradient(
    180deg,
    rgba(59, 130, 246, 0.16) 0%,
    rgba(15, 23, 42, 0.92) 100%
  );
  --viewer-running-border: rgba(59, 130, 246, 0.34);
  --viewer-running-text: #60a5fa;
  --viewer-failed-bg: rgba(239, 68, 68, 0.18);
  --viewer-failed-bg-soft: linear-gradient(
    180deg,
    rgba(239, 68, 68, 0.16) 0%,
    rgba(15, 23, 42, 0.92) 100%
  );
  --viewer-failed-border: rgba(239, 68, 68, 0.34);
  --viewer-failed-text: #f87171;
  --viewer-pending-bg: rgba(148, 163, 184, 0.16);
  --viewer-pending-bg-soft: linear-gradient(
    180deg,
    rgba(71, 85, 105, 0.24) 0%,
    rgba(15, 23, 42, 0.92) 100%
  );
  --viewer-pending-border: rgba(100, 116, 139, 0.34);
  --viewer-pending-text: #94a3b8;
}

.host-output-drawer .el-drawer,
.host-output-drawer .el-drawer__body {
  background: var(--viewer-panel-bg);
}
</style>
