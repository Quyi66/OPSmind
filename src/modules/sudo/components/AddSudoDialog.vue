<template>
  <el-dialog
    v-model="visible"
    title="添加用户权限"
    width="700px"
    :close-on-click-modal="false"
    :close-on-press-escape="!submitting"
    :show-close="!submitting"
    @close="handleClose"
  >
    <div class="add-sudo-content">
      <!-- 主机选择 -->
      <div class="form-section">
        <div class="section-title">主机</div>
        <div class="section-content">
          <AcmDeviceSelector
            v-model="formData.hosts"
            ci-types="linux"
            :options="{ label: '选择主机' }"
            :disabled="submitting"
          />
        </div>
      </div>

      <!-- 有效时长 -->
      <div class="form-section">
        <div class="section-title">有效时长</div>
        <div class="section-content">
          <div class="duration-inputs">
            <div class="duration-item">
              <el-input-number
                v-model="formData.days"
                :min="0"
                :max="365"
                size="default"
                :disabled="submitting"
              />
              <span class="duration-label">天</span>
            </div>
            <div class="duration-item">
              <el-input-number
                v-model="formData.hours"
                :min="0"
                :max="23"
                size="default"
                :disabled="submitting"
              />
              <span class="duration-label">小时</span>
            </div>
            <div class="duration-item">
              <el-input-number
                v-model="formData.mins"
                :min="0"
                :max="59"
                size="default"
                :disabled="submitting"
              />
              <span class="duration-label">分钟</span>
            </div>
          </div>
          <div class="duration-hint">权限的有效期，设置为0表示永久有效</div>
        </div>
      </div>

      <!-- 用户 -->
      <div class="form-section">
        <div class="section-title">用户</div>
        <div class="section-content">
          <el-input
            v-model="formData.users"
            placeholder="请输入用户名"
            :disabled="submitting"
          />
          <div class="input-hint">要添加权限的用户列表,多个用户之间采用逗号，空格，换行分隔</div>
        </div>
      </div>

      <!-- 执行状态 -->
      <div v-if="jobStatus" class="job-status">
        <div class="status-header">
          <i class="fa fa-spinner fa-spin" v-if="isRunning"></i>
          <i class="fa fa-check-circle text-success" v-else-if="isSuccess"></i>
          <i class="fa fa-times-circle text-danger" v-else-if="isFailed"></i>
          <span>{{ statusText }}</span>
        </div>
        <div v-if="jobResult" class="status-detail">
          <div v-if="jobResult.startTime">开始时间：{{ jobResult.startTime }}</div>
          <div v-if="jobResult.endTime">结束时间：{{ jobResult.endTime }}</div>
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
          :loading="submitting"
          :disabled="!canSubmit"
          @click="handleSubmit"
        >
          开始执行
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
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

const emit = defineEmits(['update:modelValue', 'saved'])

const visible = ref(props.modelValue)
const submitting = ref(false)
const jobStatus = ref('')
const jobResult = ref(null)

const formData = reactive({
  hosts: [],
  days: 0,
  hours: 0,
  mins: 0,
  users: ''
})

// 计算 valid_period（分钟数）
const validPeriod = computed(() => {
  return formData.days * 24 * 60 + formData.hours * 60 + formData.mins
})

// 是否可以提交
const canSubmit = computed(() => {
  return formData.hosts.length > 0 && formData.users.trim() !== ''
})

// 状态判断
const isRunning = computed(() => jobStatus.value === 'WAITING' || jobStatus.value === 'RUNNING')
const isSuccess = computed(() => jobStatus.value === 'SUCCESS' || jobStatus.value === 'COMPLETED')
const isFailed = computed(() => jobStatus.value === 'FAILED' || jobStatus.value === 'ERROR')

const statusText = computed(() => {
  switch (jobStatus.value) {
    case 'WAITING': return '等待执行...'
    case 'RUNNING': return '正在执行...'
    case 'SUCCESS':
    case 'COMPLETED': return '执行成功'
    case 'FAILED':
    case 'ERROR': return '执行失败'
    default: return jobStatus.value
  }
})

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
  formData.hosts = []
  formData.days = 0
  formData.hours = 0
  formData.mins = 0
  formData.users = ''
  jobStatus.value = ''
  jobResult.value = null
}

async function handleSubmit() {
  if (!canSubmit.value) {
    ElMessage.warning('请填写必要信息')
    return
  }

  submitting.value = true
  jobStatus.value = 'WAITING'

  try {
    const hosts = formData.hosts.map(h => ({
      key: h.key || h.value || h,
      value: h.value || h.key || h,
      assetType: h.assetType || 'linux'
    }))

    const response = await sudoApi.addSudoPermission({
      hosts,
      users: formData.users,
      valid_period: validPeriod.value
    })

    const result = response?.data || response
    const runResult = Array.isArray(result) ? result[0] : result

    if (runResult?.runId) {
      jobStatus.value = runResult.status || 'WAITING'
      // 使用 composable 轮询
      startPolling(runResult.runId, {
        interval: 5000,
        successMessage: '执行成功',
        errorMessage: '执行失败',
        onSuccess: (res) => {
          jobResult.value = res
          jobStatus.value = 'COMPLETED'
          submitting.value = false
          emit('saved')
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
    console.error('Failed to add sudo permission:', error)
    submitting.value = false
    jobStatus.value = 'ERROR'
    ElMessage.error('执行失败')
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
.add-sudo-content {
  padding: 10px 0;
}

.form-section {
  margin-bottom: 20px;
  background: #f8fafc;
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

.duration-inputs {
  display: flex;
  gap: 20px;
  align-items: center;
}

.duration-item {
  display: flex;
  align-items: center;
  gap: 8px;

  .duration-label {
    color: #64748b;
    font-size: 14px;
  }
}

.duration-hint,
.input-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #94a3b8;
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
