<template>
  <transition name="viewer-fade">
    <div v-if="visible" class="flow-instance-viewer">
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

              <section class="viewer-section">
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
                    <div class="step-overview-card__top">
                      <span class="step-overview-card__index">步骤 {{ step.index }}</span>
                      <el-tag
                        size="small"
                        :type="getStatusTagType(step.aggregateBucket)"
                        effect="light"
                      >
                        {{ getStatusLabel(step.aggregateBucket) }}
                      </el-tag>
                    </div>
                    <strong class="step-overview-card__title">{{ step.name }}</strong>
                    <span class="step-overview-card__script">
                      {{ step.scriptPath || '未配置脚本路径' }}
                    </span>
                    <div class="step-overview-card__stats">
                      <span>成功 {{ step.summary.success }}</span>
                      <span>运行中 {{ step.summary.running }}</span>
                      <span>失败 {{ step.summary.failed }}</span>
                      <span>待执行 {{ step.summary.pending }}</span>
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
import { ElMessage } from 'element-plus'
import * as jaoApi from '@/modules/automation/api/jao'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  instanceId: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

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
    if (val && props.instanceId) {
      fetchInstanceView()
    } else {
      resetData()
    }
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

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const pad = n => (n < 10 ? `0${n}` : String(n))
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
</script>

<style scoped lang="scss">
.flow-instance-viewer {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.viewer__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
}

.viewer__panel {
  position: relative;
  width: min(1380px, 96vw);
  height: min(92vh, 960px);
  background: var(--el-bg-color);
  border-radius: 18px;
  box-shadow: 0 30px 70px rgba(15, 23, 42, 0.24);
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
  border-bottom: 1px solid var(--el-border-color-light);
  background: linear-gradient(180deg, rgba(37, 99, 235, 0.06) 0%, rgba(255, 255, 255, 0) 100%);
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
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
  font-size: 12px;
  font-weight: 600;
}

.header-title {
  margin: 10px 0 0;
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
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
  background: rgba(248, 250, 252, 0.95);
  border: 1px solid #dbe3f0;
  color: #64748b;
  font-size: 12px;
}

.header-close {
  flex-shrink: 0;
  color: #64748b;
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
  border: 1px solid #e2e8f0;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.95) 0%, #ffffff 100%);
}

.summary-card__label {
  display: block;
  font-size: 11px;
  line-height: 1.4;
  color: #64748b;
}

.summary-card__value {
  display: block;
  font-size: 20px;
  line-height: 1.2;
  color: #0f172a;
}

.viewer-section {
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: #fff;
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
  color: #0f172a;
}

.section-subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  color: #64748b;
}

.step-overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.step-overview-card {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid #dbe3f0;
  background: #fff;
}

.step-overview-card.is-success {
  border-color: rgba(16, 185, 129, 0.28);
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, #ffffff 100%);
}

.step-overview-card.is-running {
  border-color: rgba(59, 130, 246, 0.25);
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.08) 0%, #ffffff 100%);
}

.step-overview-card.is-failed {
  border-color: rgba(239, 68, 68, 0.25);
  background: linear-gradient(180deg, rgba(239, 68, 68, 0.08) 0%, #ffffff 100%);
}

.step-overview-card.is-pending {
  border-color: rgba(148, 163, 184, 0.22);
  background: linear-gradient(180deg, rgba(148, 163, 184, 0.08) 0%, #ffffff 100%);
}

.step-overview-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.step-overview-card__index {
  font-size: 11px;
  font-weight: 700;
  color: #475569;
}

.step-overview-card__title {
  display: block;
  margin-top: 10px;
  font-size: 15px;
  color: #0f172a;
}

.step-overview-card__script {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: #64748b;
  word-break: break-all;
}

.step-overview-card__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.step-overview-card__stats span {
  font-size: 12px;
  color: #475569;
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
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.legend-item.is-running {
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
}

.legend-item.is-failed {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
}

.legend-item.is-pending {
  background: rgba(148, 163, 184, 0.14);
  color: #64748b;
}

.status-matrix-wrap {
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
}

.status-table {
  width: 100%;
  min-width: 900px;
  border-collapse: separate;
  border-spacing: 0;
  background: #fff;
}

.status-table th,
.status-table td {
  padding: 14px 12px;
  border-bottom: 1px solid #e2e8f0;
  border-right: 1px solid #edf2f7;
  vertical-align: middle;
}

.status-table thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #f8fafc;
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
  color: #0f172a;
}

.status-table__step-script {
  margin-top: 6px;
  font-size: 11px;
  line-height: 1.4;
  color: #64748b;
  word-break: break-all;
}

.host-cell {
  position: sticky;
  left: 0;
  z-index: 1;
  background: #fff;
}

.host-cell strong {
  display: block;
  font-size: 13px;
  color: #0f172a;
}

.host-cell span {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: #94a3b8;
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
  border: 1px solid transparent;
  border-radius: 12px;
  background: #f8fafc;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
}

.status-pill:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
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
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.18);
}

.status-pill.is-success {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.status-pill.is-running {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}

.status-pill.is-failed {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.status-pill.is-pending {
  background: rgba(148, 163, 184, 0.12);
  color: #64748b;
}

.viewer-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 240px;
  border: 1px dashed #dbe3f0;
  border-radius: 16px;
  background: #f8fafc;
  text-align: center;
  color: #64748b;
}

.viewer-empty-state.is-compact {
  min-height: 180px;
}

.viewer-empty-state i {
  font-size: 34px;
  color: #94a3b8;
}

.viewer-empty-state h4 {
  margin: 0;
  font-size: 18px;
  color: #0f172a;
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
  border-bottom: 1px solid var(--el-border-color-light);
}

.host-output-drawer__eyebrow {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.08);
  color: #2563eb;
  font-size: 12px;
  font-weight: 600;
}

.host-output-drawer__title {
  margin: 10px 0 0;
  font-size: 20px;
  color: #0f172a;
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
  background: #f8fafc;
  border: 1px solid #dbe3f0;
  font-size: 12px;
  color: #64748b;
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
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
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
  color: #0f172a;
  font-weight: 700;
}

.task-output {
  margin: 0;
  padding: 16px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #0f172a;
  color: #e2e8f0;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-x: auto;
}

.task-output--empty {
  background: #f8fafc;
  color: #64748b;
  font-family: inherit;
}

:global(.host-output-drawer .el-drawer__body) {
  padding: 20px 24px;
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

  .header-meta {
    gap: 8px;
  }

  :global(.host-output-drawer .el-drawer__body) {
    padding: 16px;
  }
}
</style>
