<template>
  <el-dialog
    v-model="visible"
    title="补丁安装任务执行进度"
    width="580px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="isDone"
    append-to-body
    @open="startWorkflow"
    @closed="handleClosed"
  >
    <div style="padding: 10px 24px 0;">
      <!-- 自定义步骤条 -->
      <div style="display: flex; flex-direction: column;">

        <!-- Step 1: 预检查 -->
        <div style="display: flex; gap: 16px; min-height: 80px;">
          <div style="display: flex; flex-direction: column; align-items: center; flex-shrink: 0;">
            <div :style="iconStyle(1, 'PRE_CHECK_FAILED')">
              <i v-if="stepIsDone(1)" class="fa fa-check"></i>
              <i v-else-if="stepIsActive(1) && !hasError" class="fa fa-spinner fa-spin"></i>
              <i v-else-if="stepIsFailed('PRE_CHECK_FAILED')" class="fa fa-times"></i>
              <span v-else>1</span>
            </div>
            <div :style="lineStyle(1)"></div>
          </div>
          <div style="padding: 4px 0 16px; flex: 1;">
            <div :style="titleStyle(1, 'PRE_CHECK_FAILED')">预检查</div>
            <div style="font-size: 12px; line-height: 1.6; margin-top: 3px;">
              <span v-if="stepIsActive(1) && !hasError" style="color: #409eff;">正在执行环境安全预检...磁盘、进程锁、负载等</span>
              <span v-else-if="stepIsDone(1)" style="color: #67c23a;">预检查通过</span>
              <span v-else-if="stepIsFailed('PRE_CHECK_FAILED')" style="color: #f56c6c;">{{ errorMessage || '预检查失败' }}</span>
              <span v-else style="color: #a8abb2;">等待执行</span>
            </div>
          </div>
        </div>

        <!-- Step 2: 补丁安装 -->
        <div style="display: flex; gap: 16px; min-height: 80px;">
          <div style="display: flex; flex-direction: column; align-items: center; flex-shrink: 0;">
            <div :style="iconStyle(2, 'INSTALL_FAILED')">
              <i v-if="stepIsDone(2)" class="fa fa-check"></i>
              <i v-else-if="stepIsActive(2) && !hasError" class="fa fa-spinner fa-spin"></i>
              <i v-else-if="stepIsFailed('INSTALL_FAILED')" class="fa fa-times"></i>
              <span v-else>2</span>
            </div>
            <div :style="lineStyle(2)"></div>
          </div>
          <div style="padding: 4px 0 16px; flex: 1;">
            <div :style="titleStyle(2, 'INSTALL_FAILED')">补丁安装</div>
            <div style="font-size: 12px; line-height: 1.6; margin-top: 3px;">
              <span v-if="stepIsActive(2) && !hasError" style="color: #409eff;">正在下载并安装升级包...</span>
              <span v-else-if="stepIsDone(2)" style="color: #67c23a;">安装执行完毕</span>
              <span v-else-if="stepIsFailed('INSTALL_FAILED')" style="color: #f56c6c;">{{ errorMessage || '安装失败' }}</span>
              <span v-else style="color: #a8abb2;">等待执行</span>
            </div>
          </div>
        </div>

        <!-- Step 3: 重启 -->
        <div style="display: flex; gap: 16px; min-height: 80px;">
          <div style="display: flex; flex-direction: column; align-items: center; flex-shrink: 0;">
            <div :style="iconStyle(3, 'RESTART_FAILED')">
              <i v-if="restartPolicy === 'none'" class="fa fa-forward"></i>
              <i v-else-if="stepIsDone(3)" class="fa fa-check"></i>
              <i v-else-if="stepIsActive(3) && !hasError" class="fa fa-spinner fa-spin"></i>
              <i v-else-if="stepIsFailed('RESTART_FAILED')" class="fa fa-times"></i>
              <span v-else>3</span>
            </div>
            <div :style="lineStyle(3)"></div>
          </div>
          <div style="padding: 4px 0 16px; flex: 1;">
            <div :style="titleStyle(3, 'RESTART_FAILED')">
              {{ restartPolicy === 'system' ? '系统重启' : restartPolicy === 'service' ? '服务重启' : '重启（跳过）' }}
            </div>
            <div style="font-size: 12px; line-height: 1.6; margin-top: 3px;">
              <span v-if="restartPolicy === 'none'" style="color: #909399; font-style: italic;">restartType=none，已自动跳过</span>
              <span v-else-if="stepIsActive(3) && !hasError" style="color: #409eff;">执行 {{ restartPolicy === 'system' ? '系统' : '服务' }} 重启中...</span>
              <span v-else-if="stepIsDone(3)" style="color: #67c23a;">重启完成</span>
              <span v-else-if="stepIsFailed('RESTART_FAILED')" style="color: #f56c6c;">{{ errorMessage || '重启失败' }}</span>
              <span v-else style="color: #a8abb2;">等待执行</span>
            </div>
          </div>
        </div>

        <!-- Step 4: 校验 -->
        <div style="display: flex; gap: 16px; min-height: 60px;">
          <div style="display: flex; flex-direction: column; align-items: center; flex-shrink: 0;">
            <div :style="iconStyle(4, 'VALIDATE_FAILED')">
              <i v-if="taskStatus === 'COMPLETED'" class="fa fa-check"></i>
              <i v-else-if="stepIsActive(4) && !hasError" class="fa fa-spinner fa-spin"></i>
              <i v-else-if="stepIsFailed('VALIDATE_FAILED')" class="fa fa-times"></i>
              <span v-else>4</span>
            </div>
          </div>
          <div style="padding: 4px 0; flex: 1;">
            <div :style="titleStyle(4, 'VALIDATE_FAILED')">安装后校验</div>
            <div style="font-size: 12px; line-height: 1.6; margin-top: 3px;">
              <span v-if="stepIsActive(4) && !hasError" style="color: #409eff;">正在校验服务与环境状态...</span>
              <span v-else-if="taskStatus === 'COMPLETED'" style="color: #67c23a;">全部校验通过，流程已结束</span>
              <span v-else-if="stepIsFailed('VALIDATE_FAILED')" style="color: #f56c6c;">{{ errorMessage || '校验失败' }}</span>
              <span v-else style="color: #a8abb2;">等待执行</span>
            </div>
          </div>
        </div>

      </div>

      <!-- 错误信息 -->
      <el-alert
        v-if="hasError"
        :title="'任务异常中断：' + errorMessage"
        type="error"
        show-icon
        style="margin-top: 20px"
        :closable="false"
      />
    </div>

    <template #footer>
      <div style="display: flex; justify-content: flex-end;">
        <el-button v-if="isDone" type="primary" @click="visible = false">关闭</el-button>
        <el-button v-else disabled>执行中，请勿关闭...</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { patchInstallApi } from '../../api'

const props = defineProps({
  taskId: { type: String, required: true },
  restartPolicy: { type: String, default: 'none' }
})

const emit = defineEmits(['done'])

const visible = ref(false)
const taskStatus = ref('CREATED')
const errorMessage = ref('')
let pollTimer = null

// 映射状态 → 步骤进度索引 (1-4)
const activeStep = computed(() => {
  const s = taskStatus.value
  if (s === 'CREATED') return 0
  if (s === 'PRE_CHECKING' || s === 'PRE_CHECK_FAILED') return 1
  if (s === 'PRE_CHECK_DONE' || s === 'INSTALLING' || s === 'INSTALL_FAILED') return 2
  if (['INSTALL_DONE', 'RESTART_PENDING', 'RESTARTING', 'RESTART_FAILED'].includes(s)) return 3
  if (s === 'RESTART_DONE' || s === 'VALIDATING' || s === 'VALIDATE_FAILED') return 4
  if (s === 'COMPLETED') return 5
  return 0
})

const hasError = computed(() => taskStatus.value.includes('FAILED'))
const isDone = computed(() => taskStatus.value === 'COMPLETED' || hasError.value)

function stepIsActive(idx) { return activeStep.value === idx }
function stepIsDone(idx) { return activeStep.value > idx }
function stepIsFailed(failState) { return taskStatus.value === failState }

// 计算圆圈样式（直接返回 style 对象）
function iconStyle(idx, failState) {
  const base = {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600',
    flexShrink: '0',
    transition: 'all 0.3s',
    border: '2px solid'
  }
  if (taskStatus.value === failState) {
    return { ...base, background: '#f56c6c', color: '#fff', borderColor: '#f56c6c' }
  }
  if (activeStep.value > idx) {
    return { ...base, background: '#67c23a', color: '#fff', borderColor: '#67c23a' }
  }
  if (activeStep.value === idx) {
    return { ...base, background: '#409eff', color: '#fff', borderColor: '#409eff', boxShadow: '0 0 0 4px rgba(64,158,255,0.2)' }
  }
  return { ...base, background: '#f4f4f5', color: '#a8abb2', borderColor: '#dcdfe6' }
}

// 连接线样式
function lineStyle(idx) {
  const done = activeStep.value > idx
  return {
    flex: '1',
    width: '2px',
    background: done ? '#67c23a' : '#e4e7ed',
    margin: '6px 0 0',
    transition: 'background 0.4s'
  }
}

// 标题样式
function titleStyle(idx, failState) {
  const base = { fontSize: '14px', fontWeight: '600', marginBottom: '2px', transition: 'color 0.3s' }
  if (taskStatus.value === failState) return { ...base, color: '#f56c6c' }
  if (activeStep.value > idx || taskStatus.value === 'COMPLETED') return { ...base, color: '#303133' }
  if (activeStep.value === idx) return { ...base, color: '#409eff' }
  return { ...base, color: '#a8abb2' }
}

function open() {
  taskStatus.value = 'CREATED'
  errorMessage.value = ''
  visible.value = true
}

async function startWorkflow() {
  if (!props.taskId) return
  try {
    await patchInstallApi.executePreCheck(props.taskId)
    taskStatus.value = 'PRE_CHECKING'
    pollTimer = setInterval(pollTaskStatus, 3000)
  } catch (error) {
    taskStatus.value = 'PRE_CHECK_FAILED'
    errorMessage.value = '触发预检查失败: ' + (error.message || '未知错误')
  }
}

async function pollTaskStatus() {
  if (isDone.value) { stopPolling(); return }
  try {
    const res = await patchInstallApi.getTask(props.taskId)
    const data = res?.data
    if (!data || data.status === taskStatus.value) return

    taskStatus.value = data.status
    errorMessage.value = data.errorMessage || ''

    if (data.status === 'PRE_CHECK_DONE') {
      await patchInstallApi.executeInstallTask(props.taskId)
    } else if (data.status === 'INSTALL_DONE') {
      if (props.restartPolicy === 'none') {
        await patchInstallApi.executeValidate(props.taskId)
      } else {
        // confirmRestart 接口只接受 'system' 或 'service'，不接受 'smart'
        // smart 模式下，后端创建任务时已通过 restartType 给出建议值，
        // 此处 restartPolicy 在父组件创建任务后会被替换为具体值（system/service/none）
        // 如果仍为 smart（极端降级情况），兜底为 'system'
        const restartAction = ['system', 'service'].includes(props.restartPolicy)
          ? props.restartPolicy
          : 'system'
        await patchInstallApi.confirmRestart(props.taskId, restartAction)
        await patchInstallApi.executeRestart(props.taskId)
      }
    } else if (data.status === 'RESTART_DONE') {
      await patchInstallApi.executeValidate(props.taskId)
    }

    if (isDone.value) {
      stopPolling()
      emit('done', taskStatus.value === 'COMPLETED')
    }
  } catch (error) {
    console.error('Task status polling failed:', error)
  }
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function handleClosed() {
  stopPolling()
}

onUnmounted(() => {
  stopPolling()
})

defineExpose({ open })
</script>

<style scoped>
.text-muted {
  color: var(--el-text-color-secondary);
}
.text-primary {
  color: var(--el-color-primary);
}
.text-success {
  color: var(--el-color-success);
}
</style>
