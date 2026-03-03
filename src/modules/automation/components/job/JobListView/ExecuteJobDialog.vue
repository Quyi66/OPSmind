<template>
  <el-dialog
    v-model="dialogVisible"
    title="执行作业"
    width="1000px"
    destroy-on-close
    @close="handleClose"
  >
    <div class="execute-dialog" v-loading="detailLoading">
      <el-form
        v-if="formSchema.length"
        :model="formValues"
        label-width="0"
        label-position="top"
      >
        <template v-for="field in formSchema" :key="field.name">
          <el-form-item :label="field.label">
            <el-input v-model="formValues[field.name]" />
            <div v-if="field.description" class="field-description">
              {{ field.description }}
            </div>
          </el-form-item>
        </template>
      </el-form>
      <div v-else class="execute-dialog__empty">
        当前作业暂无可配置参数
      </div>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <div
          v-if="executionStatusLabel"
          class="execute-status"
          :class="executionStatusClass"
        >
          <span>{{ executionStatusLabel }}</span>
        </div>
        <div class="dialog-footer__actions">
          <el-button @click="handleClose">取消</el-button>
          <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
            执行作业
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as jaoApi from '@/modules/automation/api/jao'
import {
  JOB_STATUS_LABELS,
  JOB_STATUS_CLASS_MAP
} from '@/modules/automation/constants/jobStatus'

const props = defineProps({
  visible: { type: Boolean, default: false },
  jobId: { type: String, default: '' },
  jobType: { type: String, default: '' },
  fallbackConfigJson: { type: [String, Object], default: '' }
})

const emit = defineEmits(['update:visible'])

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const detailLoading = ref(false)
const submitLoading = ref(false)
const formSchema = ref([])
const formValues = ref({})
const jobDetail = ref({})
const lastLoadedJobId = ref('')
const executionStatus = ref('')
const pollingTimer = ref()

const executionStatusLabel = computed(() => {
  if (!executionStatus.value) return ''
  return JOB_STATUS_LABELS[executionStatus.value] || executionStatus.value
})

const executionStatusClass = computed(() => {
  if (!executionStatus.value) return ''
  return JOB_STATUS_CLASS_MAP[executionStatus.value] || 'is-info'
})

watch(
  () => [props.visible, props.jobId],
  ([visible, jobId]) => {
    if (visible && jobId) {
      fetchJobDetail(jobId)
    }
  },
  { immediate: true }
)

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      resetForm()
    }
  }
)

/** 获取作业详情 */
async function fetchJobDetail(jobId) {
  if (!jobId || lastLoadedJobId.value === jobId) {
    return
  }
  detailLoading.value = true
  try {
    const response = await jaoApi.getJobDetail(jobId)
    const detail = response.data ?? {}
    jobDetail.value = detail
    lastLoadedJobId.value = jobId
    initializeForm(detail)
  } catch (error) {
    ElMessage.error(error?.message || '获取作业详情失败')
  } finally {
    detailLoading.value = false
  }
}

/** 初始化执行表单 */
function initializeForm(detail) {
  const params = Array.isArray(detail?.params) ? detail.params : []
  formSchema.value = params.map((item) => ({
    name: item.name,
    label: item.label || item.name,
    description: item.description || '',
    defaultValue: item.defaultValue ?? ''
  }))
  const defaults = {}
  formSchema.value.forEach((field) => {
    defaults[field.name] = field.defaultValue
  })
  formValues.value = defaults
}

/** 重置表单 */
function resetForm() {
  formSchema.value = []
  formValues.value = {}
  jobDetail.value = {}
  lastLoadedJobId.value = ''
  executionStatus.value = ''
  stopResultPolling()
}

/** 关闭弹窗 */
function handleClose() {
  stopResultPolling()
  dialogVisible.value = false
}

/** 提交执行作业 */
async function handleSubmit() {
  if (!props.jobId) {
    ElMessage.warning('缺少作业标识')
    return
  }
  executionStatus.value = ''
  submitLoading.value = true
  try {
    const payload = buildPayload()
    const response = await jaoApi.executeJob(payload)
    const result = response?.data ?? response
    const status = result?.status ?? ''
    const runId = result?.runId ?? result?.id ?? ''
    handleStatusTransition(status, runId)
  } catch (error) {
    ElMessage.error(error?.message || '执行作业失败')
  } finally {
    submitLoading.value = false
  }
}

/** 组装执行参数 */
function buildPayload() {
  return {
    jobId: props.jobId,
    type: jobDetail.value?.type || props.jobType || '',
    configJson: normalizeConfigJson(jobDetail.value?.configJson || props.fallbackConfigJson || ''),
    options: {
      secretParams: [],
      params: { ...formValues.value }
    }
  }
}

/** 标准化 configJson */
function normalizeConfigJson(configJson) {
  if (!configJson) return ''
  if (typeof configJson === 'string') {
    return configJson
  }
  try {
    return JSON.stringify(configJson)
  } catch (error) {
    console.warn('Failed to stringify configJson', error)
    return ''
  }
}

/** 根据状态更新提示并处理轮询 */
function handleStatusTransition(status, runId) {
  executionStatus.value = status || ''
  if (status === 'WAITING' && runId) {
    scheduleResultPolling(runId)
  } else {
    stopResultPolling()
  }
}

/** 启动轮询执行结果 */
function scheduleResultPolling(runId) {
  stopResultPolling()
  pollingTimer.value = setTimeout(() => {
    void pollExecuteResult(runId)
  }, 5000)
}

/** 停止轮询执行结果 */
function stopResultPolling() {
  if (pollingTimer.value) {
    clearTimeout(pollingTimer.value)
    pollingTimer.value = undefined
  }
}

/** 查询执行结果 */
async function pollExecuteResult(runId) {
  if (!runId) return
  try {
    const response = await jaoApi.getExecuteResult(runId)
    const status = response?.data?.status ?? response?.status ?? ''
    handleStatusTransition(status, runId)
  } catch (error) {
    stopResultPolling()
    ElMessage.error(error?.message || '获取执行结果失败')
  }
}

onBeforeUnmount(() => {
  stopResultPolling()
})
</script>

<style scoped>
.execute-dialog {
  min-height: 220px;
}

.execute-dialog__empty {
  padding: 32px 0;
  color: #909399;
  text-align: center;
}

.field-description {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.dialog-footer {
  display: flex;
  align-items: center;
  gap: 16px;
}

.dialog-footer__actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}

.execute-status {
  min-width: 96px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid var(--el-border-color-light);
  color: #606266;
  background: #f4f4f5;
}

.execute-status.is-success {
  border-color: #67c23a;
  color: #67c23a;
  background: #f0f9eb;
}

.execute-status.is-danger {
  border-color: #f56c6c;
  color: #f56c6c;
  background: #fef0f0;
}

.execute-status.is-warning {
  border-color: #e6a23c;
  color: #e6a23c;
  background: #fdf6ec;
}

.execute-status.is-waiting {
  border-color: #909399;
  color: #606266;
  background: #f4f4f5;
}

.execute-status.is-info {
  border-color: #c0c4cc;
  color: #909399;
  background: #f4f4f5;
}
</style>
