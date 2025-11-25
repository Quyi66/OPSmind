<template>
  <transition name="viewer-fade">
    <div v-if="visible" class="flow-instance-viewer">
      <div class="viewer__backdrop" @click="handleClose" />
      <div class="viewer__panel" @click.stop>
        <header class="viewer__header">
          <div class="header-info">
            <h3 class="header-title">{{ instanceData?.name || '流程实例详情' }}</h3>
            <div class="header-meta">
              <span><strong>步骤：</strong>{{ instanceData?.steps?.length || 0 }}</span>
              <span><strong>主机：</strong>{{ instanceData?.hosts?.length || 0 }}</span>
              <span><strong>开始时间：</strong>{{ formatDateTime(instanceData?.createdAt) }}</span>
            </div>
          </div>
          <el-button @click="handleClose">关闭</el-button>
        </header>

        <el-scrollbar class="viewer__body">
          <div v-loading="loading" class="viewer-content">
            <template v-if="instanceData">
              <!-- 执行状态表格 -->
              <div class="status-table-wrapper">
                <h4 class="section-title">执行结果</h4>
                <div class="status-legend">
                  <span class="legend-item">
                    <i class="fa fa-running status-icon status-running" />运行中
                  </span>
                  <span class="legend-item">
                    <i class="fa fa-check status-icon status-success" />成功
                  </span>
                  <span class="legend-item">
                    <i class="fa fa-times status-icon status-failed" />失败
                  </span>
                  <span class="legend-item">
                    <i class="fa fa-minus status-icon status-pending" />待执行
                  </span>
                </div>

                <table class="status-table">
                  <thead>
                    <tr>
                      <th>主机</th>
                      <th v-for="(step, index) in instanceData.steps" :key="step.id">
                        {{ step.name || `步骤${index + 1}` }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="hostStatus in hostStatusList" :key="hostStatus.hostId">
                      <td class="host-cell">{{ hostStatus.hostkey }}</td>
                      <td
                        v-for="step in instanceData.steps"
                        :key="step.id"
                        class="status-cell status-cell-clickable"
                        :class="`status-${hostStatus[step.id] || 'pending'}`"
                        @click="handleCellClick(step.id, hostStatus.hostId, hostStatus.hostkey)"
                      >
                        <i
                          class="fa status-icon"
                          :class="{
                            'fa-running status-running': hostStatus[step.id] === 'running',
                            'fa-check status-success': hostStatus[step.id] === 'finished',
                            'fa-times status-failed': hostStatus[step.id] === 'failed',
                            'fa-minus status-pending': !hostStatus[step.id] || hostStatus[step.id] === 'pending'
                          }"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
          </div>
        </el-scrollbar>
      </div>
    </div>
  </transition>

  <!-- 主机输出弹窗 -->
  <el-dialog
    v-model="hostOutputVisible"
    title="主机输出"
    width="700px"
    append-to-body
    :z-index="3000"
  >
    <div v-loading="hostOutputLoading" class="host-output-dialog">
      <div class="host-output-header">
        <p class="host-output-label">IP</p>
        <el-tag size="large" type="info">{{ currentHostKey }}</el-tag>
      </div>
      <div class="host-output-body">
        <p class="host-output-label">输出</p>
        <div class="host-output-list">
          <div
            v-for="(task, index) in hostOutputTasks"
            :key="index"
            class="task-item"
          >
            <h4 class="task-header">
              <el-tag
                :type="getTaskStatusType(task.status)"
                size="large"
              >
                {{ task.status }}
              </el-tag>
              <span class="task-name">{{ task.task }}</span>
            </h4>
            <pre v-if="task.output" class="task-output">{{ task.output }}</pre>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as jaoApi from '@/modules/automation/api/jao'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  instanceId: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const loading = ref(false)
const instanceData = ref(null)
const hostStatusList = ref([])
const hostOutputVisible = ref(false)
const hostOutputLoading = ref(false)
const hostOutputTasks = ref([])
const currentHostKey = ref('')

watch(visible, (val) => {
  if (val && props.instanceId) {
    fetchInstanceView()
  } else {
    resetData()
  }
})

async function fetchInstanceView() {
  if (!props.instanceId) return

  loading.value = true
  try {
    const response = await jaoApi.fetchFlowInstanceView(props.instanceId)
    const data = response?.data || response
    instanceData.value = data.instance
    hostStatusList.value = data.statusView || []
  } catch (error) {
    ElMessage.error(error?.message || '获取实例详情失败')
  } finally {
    loading.value = false
  }
}

async function handleCellClick(stepId, hostId, hostKey) {
  if (!stepId || !hostId) return

  currentHostKey.value = hostKey
  hostOutputVisible.value = true
  hostOutputLoading.value = true
  hostOutputTasks.value = []

  try {
    const response = await jaoApi.fetchFlowHostResult(stepId, hostId)
    const data = response?.data || response

    // 解析 result 字段
    if (data.result) {
      try {
        hostOutputTasks.value = JSON.parse(data.result)
      } catch {
        hostOutputTasks.value = []
      }
    }
  } catch (error) {
    ElMessage.error(error?.message || '获取主机输出失败')
  } finally {
    hostOutputLoading.value = false
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
  return statusMap[status] || 'info'
}

function resetData() {
  instanceData.value = null
  hostStatusList.value = []
  hostOutputVisible.value = false
  hostOutputTasks.value = []
  currentHostKey.value = ''
}

function handleClose() {
  visible.value = false
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const pad = (n) => (n < 10 ? `0${n}` : String(n))
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
</script>

<style scoped>
.flow-instance-viewer {
  position: fixed;
  inset: 0;
  z-index: 2048;
  display: flex;
  align-items: center;
  justify-content: center;
}

.viewer__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
}

.viewer__panel {
  position: relative;
  width: min(1200px, 95vw);
  max-height: 95vh;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 25px 55px rgba(15, 23, 42, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.viewer__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  flex-shrink: 0;
}

.header-info {
  flex: 1;
}

.header-title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
}

.header-meta {
  display: flex;
  gap: 24px;
  font-size: 13px;
  color: #64748b;
}

.header-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.viewer__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.viewer__body :deep(.el-scrollbar__view) {
  padding: 24px;
}

.viewer-content {
  min-height: 400px;
}

.section-title {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.status-table-wrapper {
  margin-bottom: 32px;
}

.status-legend {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
  font-size: 13px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #e5e7eb;
  background: #fff;
}

.status-table th,
.status-table td {
  border: 1px solid #e5e7eb;
  padding: 12px;
  text-align: center;
}

.status-table th {
  background: #f8fafc;
  font-weight: 600;
  color: #475569;
}

.host-cell {
  font-weight: 500;
  text-align: left !important;
}

.status-cell {
  font-size: 18px;
}

.status-cell-clickable {
  cursor: pointer;
  transition: background-color 0.2s;
}

.status-cell-clickable:hover {
  background-color: #f1f5f9;
}

.status-icon {
  display: inline-block;
  width: 20px;
  height: 20px;
  line-height: 20px;
}

.status-running {
  color: #3b82f6;
  animation: rotating 1.2s linear infinite;
}

.status-success {
  color: #10b981;
}

.status-failed {
  color: #ef4444;
}

.status-pending {
  color: #94a3b8;
}

@keyframes rotating {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.host-output-dialog {
  min-height: 200px;
}

.host-output-header {
  margin-bottom: 20px;
}

.host-output-label {
  margin: 0 0 8px;
  font-weight: 600;
  color: #475569;
}

.host-output-body {
  margin-top: 20px;
}

.host-output-list {
  max-height: 500px;
  overflow-y: auto;
}

.task-item {
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.task-item:last-child {
  margin-bottom: 0;
}

.task-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 12px;
  font-size: 16px;
}

.task-name {
  color: #1e293b;
  font-weight: 600;
}

.task-output {
  margin: 0;
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #1e293b;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-x: auto;
}

.viewer-fade-enter-active,
.viewer-fade-leave-active {
  transition: opacity 0.2s ease;
}

.viewer-fade-enter-from,
.viewer-fade-leave-to {
  opacity: 0;
}
</style>
