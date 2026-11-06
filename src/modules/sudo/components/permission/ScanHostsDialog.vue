<template>
  <AcmDeviceSelectorDialog
    :model-value="visible && !jobStatus"
    ci-types="linux"
    :initial-selection="selectedHosts"
    :options="{ selectMode: 'host,group,tag,input,recently', selector: 'multiple' }"
    title="选择设备 · 扫描 sudo 权限"
    confirm-text="开始扫描"
    description="点击“开始扫描”后将立即采集所选主机的 sudo 权限配置。"
    :allow-empty="false"
    :close-on-confirm="false"
    :submitting="submitting"
    @update:model-value="handleSelectorVisibleChange"
    @confirm="handleStartScan"
  />
  <el-dialog
    :model-value="visible && !!jobStatus"
    title="sudo 权限扫描进度"
    width="700px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="!submitting"
    :before-close="handleBeforeClose"
  >
    <div v-if="jobStatus" class="job-status">
      <div class="status-header">
        <i class="fa fa-spinner fa-spin" v-if="isRunning"></i>
        <i class="fa fa-check-circle text-success" v-else-if="isSuccess"></i>
        <i class="fa fa-times-circle text-danger" v-else-if="isFailed"></i>
        <span>{{ statusText }}</span>
      </div>
      <div v-if="jobResult" class="status-detail">
        <div v-if="jobResult.startTime">开始时间：{{ formatDateTime(jobResult.startTime) }}</div>
        <div v-if="jobResult.endTime">结束时间：{{ formatDateTime(jobResult.endTime) }}</div>
      </div>
    </div>
    <p>关闭窗口不会取消已提交的后台扫描任务。</p>
    <template #footer>
      <el-button @click="handleClose" :disabled="submitting && isRunning">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AcmDeviceSelectorDialog from '@/modules/automation/components/job/schedule/components/AcmDeviceSelectorDialog.vue'
import { normalizeAcmDeviceJobHosts } from '@/modules/automation/components/job/schedule/components/acmDeviceSelector.utils'
import * as sudoApi from '@/modules/sudo/api'
import { useJobPolling } from '@/composables/useJobPolling'

// 使用作业轮询 composable
const { startPolling, stopPolling } = useJobPolling()

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'completed'])

const visible = ref(props.modelValue)
const selectedHosts = ref([])
const submitting = ref(false)
const jobStatus = ref('')
const jobResult = ref(null)

// 状态判断
const isRunning = computed(() => jobStatus.value === 'WAITING' || jobStatus.value === 'RUNNING')
const isSuccess = computed(() => jobStatus.value === 'SUCCESS' || jobStatus.value === 'COMPLETED')
const isFailed = computed(() => jobStatus.value === 'FAILED' || jobStatus.value === 'ERROR')

const statusText = computed(() => {
  switch (jobStatus.value) {
    case 'WAITING':
      return '等待执行...'
    case 'RUNNING':
      return '正在扫描...'
    case 'SUCCESS':
    case 'COMPLETED':
      return '扫描完成'
    case 'FAILED':
    case 'ERROR':
      return '扫描失败'
    default:
      return jobStatus.value
  }
})

// 格式化日期时间
function formatDateTime(dateStr) {
  if (!dateStr) return '-----'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

watch(
  () => props.modelValue,
  val => {
    visible.value = val
    if (val) {
      resetForm()
    }
  },
  { immediate: true }
)

watch(visible, val => {
  emit('update:modelValue', val)
  if (!val) {
    stopPolling()
  }
})

function resetForm() {
  submitting.value = false
  selectedHosts.value = []
  jobStatus.value = ''
  jobResult.value = null
}

async function handleStartScan(selection = selectedHosts.value) {
  if (submitting.value) return
  selectedHosts.value = selection
  if (selectedHosts.value.length === 0) {
    ElMessage.warning('请选择需要扫描的主机')
    return
  }

  submitting.value = true

  try {
    const hosts = normalizeAcmDeviceJobHosts(selectedHosts.value, 'linux')

    const response = await sudoApi.scanSudoHosts({ hosts })

    const result = response?.data || response
    const runResult = Array.isArray(result) ? result[0] : result

    if (runResult?.runId) {
      jobStatus.value = runResult.status || 'WAITING'
      // 使用 composable 轮询
      startPolling(runResult.runId, {
        interval: 5000,
        successMessage: '扫描完成',
        errorMessage: '扫描失败',
        onSuccess: res => {
          jobResult.value = res
          jobStatus.value = 'COMPLETED'
          submitting.value = false
          emit('completed')
        },
        onError: res => {
          jobResult.value = res
          jobStatus.value = 'FAILED'
          submitting.value = false
        }
      })
    } else {
      throw new Error('未获取到执行ID')
    }
  } catch (error) {
    console.error('Failed to start scan:', error)
    submitting.value = false
    jobStatus.value = ''
    ElMessage.error('启动扫描失败')
  } finally {
    submitting.value = false
  }
}

function handleSelectorVisibleChange(value) {
  if (!value) handleClose()
}

function handleBeforeClose(done) {
  if (submitting.value && isRunning.value) return
  handleClose()
  done()
}

function handleClose() {
  if (submitting.value && isRunning.value) {
    return
  }
  visible.value = false
  stopPolling()
}
</script>

<style scoped lang="scss">
.job-status {
  margin-top: 20px;
  padding: 16px;
  background: var(--el-bg-color-page);
  border-radius: 6px;

  .status-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;

    .text-success {
      color: var(--el-color-success);
    }

    .text-danger {
      color: var(--el-color-danger);
    }
  }

  .status-detail {
    margin-top: 8px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}
</style>
