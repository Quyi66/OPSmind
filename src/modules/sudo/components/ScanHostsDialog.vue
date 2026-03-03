<template>
  <el-dialog
    v-model="visible"
    title="扫描主机"
    width="700px"
    :close-on-click-modal="false"
    :close-on-press-escape="!submitting"
    :show-close="!submitting"
    @close="handleClose"
  >
    <div class="scan-hosts-content">
      <!-- 主机选择 -->
      <!-- <div class="form-section">
        <div class="section-title">选择主机</div>
        <div class="section-content">

        </div>
      </div> -->
      <AcmDeviceSelector
        v-model="selectedHosts"
        ci-types="linux"
        :options="{ label: '选择主机' }"
        :disabled="submitting"
      />
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
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose" :disabled="submitting && isRunning">
          {{ isSuccess || isFailed ? '关闭' : '取消' }}
        </el-button>
        <el-button
          v-if="!isSuccess && !isFailed"
          type="primary"
          size="small"
          :loading="submitting"
          :disabled="selectedHosts.length === 0"
          @click="handleStartScan"
        >
          开始扫描
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
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
    case 'WAITING': return '等待执行...'
    case 'RUNNING': return '正在扫描...'
    case 'SUCCESS':
    case 'COMPLETED': return '扫描完成'
    case 'FAILED':
    case 'ERROR': return '扫描失败'
    default: return jobStatus.value
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

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    resetForm()
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
  if (!val) {
    stopPolling()
  }
})

function resetForm() {
  selectedHosts.value = []
  jobStatus.value = ''
  jobResult.value = null
}

async function handleStartScan() {
  if (selectedHosts.value.length === 0) {
    ElMessage.warning('请选择需要扫描的主机')
    return
  }

  submitting.value = true
  jobStatus.value = 'WAITING'

  try {
    const hosts = selectedHosts.value.map(h => ({
      key: h.key || h.value || h,
      value: h.value || h.key || h,
      assetType: h.assetType || 'linux'
    }))

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
        onSuccess: (res) => {
          jobResult.value = res
          jobStatus.value = 'COMPLETED'
          submitting.value = false
          emit('completed')
        },
        onError: (res) => {
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
    jobStatus.value = 'ERROR'
    ElMessage.error('启动扫描失败')
  }
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
.scan-hosts-content {
  padding: 10px 0;
}

.form-section {
  margin-bottom: 20px;
  background: var(--el-bg-color-page);
  border-radius: 6px;
  overflow: hidden;

  .section-title {
    padding: 10px 16px;
    font-weight: 500;
    color: #1e293b;
    background: #e2e8f0;
    font-size: 14px;
  }

  .section-content {
    padding: 16px;
  }
}

.job-status {
  margin-top: 20px;
  padding: 16px;
  background: #f1f5f9;
  border-radius: 6px;

  .status-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;

    .text-success {
      color: #22c55e;
    }

    .text-danger {
      color: #ef4444;
    }
  }

  .status-detail {
    margin-top: 8px;
    font-size: 12px;
    color: #64748b;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 10px;
}
</style>
