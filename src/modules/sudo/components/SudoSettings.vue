<template>
  <div class="ops-page-layout" style="background: #f1f5f9; overflow: auto;">
    <div class="page-content">
      <div class="form-card">
        <div class="card-header">
          <div class="card-title">密码策略</div>
          <el-button
            type="primary"
            :loading="saving"
            :disabled="!canSave"
            @click="handleSave"
          >
            保存
          </el-button>
        </div>

        <div class="form-content" v-loading="loading">
          <!-- 密码长度 -->
          <div class="form-row">
            <label class="form-label">密码长度</label>
            <div class="form-control">
              <el-input-number
                v-model="formData.passwd_length"
                :min="minPasswordLength"
                :max="32"
                :disabled="saving"
                @change="onPasswordLengthChange"
              />
            </div>
          </div>

          <!-- 最少小写字母数 -->
          <div class="form-row">
            <label class="form-label">最少小写字母数</label>
            <div class="form-control">
              <el-input-number
                v-model="formData.lcredit"
                :min="0"
                :max="maxCharTypeValue"
                :disabled="saving"
                @change="validateCharRequirements"
              />
            </div>
          </div>

          <!-- 最少大写字母数 -->
          <div class="form-row">
            <label class="form-label">最少大写字母数</label>
            <div class="form-control">
              <el-input-number
                v-model="formData.ucredit"
                :min="0"
                :max="maxCharTypeValue"
                :disabled="saving"
                @change="validateCharRequirements"
              />
            </div>
          </div>

          <!-- 最少数字个数 -->
          <div class="form-row">
            <label class="form-label">最少数字个数</label>
            <div class="form-control">
              <el-input-number
                v-model="formData.dcredit"
                :min="0"
                :max="maxCharTypeValue"
                :disabled="saving"
                @change="validateCharRequirements"
              />
            </div>
          </div>

          <!-- 最少特殊符号数 -->
          <div class="form-row">
            <label class="form-label">最少特殊符号数</label>
            <div class="form-control">
              <el-input-number
                v-model="formData.ocredit"
                :min="0"
                :max="maxCharTypeValue"
                :disabled="saving"
                @change="validateCharRequirements"
              />
              <div class="form-hint">特殊符号：~!@#$%^&*?</div>
            </div>
          </div>

          <!-- 验证提示 -->
          <div v-if="validationError" class="validation-error">
            <i class="fa fa-exclamation-triangle"></i>
            {{ validationError }}
          </div>
          <div v-else class="validation-info">
            <i class="fa fa-info-circle"></i>
            当前字符要求总和：{{ totalCharRequirements }} / {{ formData.passwd_length }}
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
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import * as sudoApi from '@/modules/sudo/api'
import { useJobPolling } from '@/composables/useJobPolling'

// 使用作业轮询 composable
const { startPolling, stopPolling } = useJobPolling()

const loading = ref(false)
const saving = ref(false)
const jobStatus = ref('')
const jobResult = ref(null)

const formData = reactive({
  passwd_length: 8,
  lcredit: 1,
  ucredit: 1,
  dcredit: 1,
  ocredit: 1
})

// 状态判断
const isRunning = computed(() => jobStatus.value === 'WAITING' || jobStatus.value === 'RUNNING')
const isSuccess = computed(() => jobStatus.value === 'SUCCESS' || jobStatus.value === 'COMPLETED')
const isFailed = computed(() => jobStatus.value === 'FAILED' || jobStatus.value === 'ERROR')

const statusText = computed(() => {
  switch (jobStatus.value) {
    case 'WAITING': return '等待执行...'
    case 'RUNNING': return '正在保存...'
    case 'SUCCESS':
    case 'COMPLETED': return '保存成功'
    case 'FAILED':
    case 'ERROR': return '保存失败'
    default: return jobStatus.value
  }
})

// 计算各字符类型要求的最大值（不能超过密码长度）
const maxCharTypeValue = computed(() => {
  return Math.max(0, formData.passwd_length)
})

// 计算所有字符要求的总和
const totalCharRequirements = computed(() => {
  return formData.lcredit + formData.ucredit + formData.dcredit + formData.ocredit
})

// 密码长度的最小值（不能小于字符要求总和）
const minPasswordLength = computed(() => {
  return Math.max(1, totalCharRequirements.value)
})

// 验证错误信息
const validationError = computed(() => {
  if (formData.passwd_length < 1) {
    return '密码长度必须至少为1'
  }
  if (totalCharRequirements.value > formData.passwd_length) {
    return `字符要求总和(${totalCharRequirements.value})不能超过密码长度(${formData.passwd_length})`
  }
  return ''
})

// 是否可以保存
const canSave = computed(() => {
  return formData.ocredit >= 0 &&
         formData.dcredit >= 0 &&
         formData.ucredit >= 0 &&
         formData.lcredit >= 0 &&
         formData.passwd_length >= 1 &&
         !validationError.value
})

// 当密码长度改变时，调整各字符要求不超过新的密码长度
function onPasswordLengthChange(newLength) {
  if (formData.lcredit > newLength) formData.lcredit = newLength
  if (formData.ucredit > newLength) formData.ucredit = newLength
  if (formData.dcredit > newLength) formData.dcredit = newLength
  if (formData.ocredit > newLength) formData.ocredit = newLength
}

// 验证字符要求（当任意字符要求改变时）
function validateCharRequirements() {
  // 自动调整，确保总和不超过密码长度
  // 这里只做提示，不自动调整
}

onMounted(() => {
  loadConfig()
})

async function loadConfig() {
  loading.value = true
  try {
    const response = await sudoApi.getSystemParams()
    const result = response?.data || response
    const records = result?.records || []

    const configItem = records.find(r => r.name === 'password_complexity')
    if (configItem) {
      const config = JSON.parse(configItem.value)
      formData.passwd_length = config.passwd_length || 8
      formData.lcredit = config.lcredit || 0
      formData.ucredit = config.ucredit || 0
      formData.dcredit = config.dcredit || 0
      formData.ocredit = config.ocredit || 0
    }
  } catch (error) {
    console.error('Failed to load config:', error)
    ElMessage.error('加载配置失败')
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  if (!canSave.value) {
    ElMessage.warning('请填写有效的配置值')
    return
  }

  saving.value = true
  jobStatus.value = 'WAITING'

  try {
    const response = await sudoApi.savePasswordComplexity({
      ocredit: formData.ocredit,
      dcredit: formData.dcredit,
      ucredit: formData.ucredit,
      lcredit: formData.lcredit,
      passwd_length: formData.passwd_length
    })

    const result = response?.data || response
    const runResult = Array.isArray(result) ? result[0] : result

    // 处理直接返回执行结果的情况（status: COMPLETED）
    if (runResult?.status === 'COMPLETED' || runResult?.status === 'SUCCESS') {
      jobStatus.value = 'COMPLETED'
      saving.value = false
      ElMessage.success('配置保存成功')
    } else if (runResult?.status === 'FAILED' || runResult?.error) {
      jobStatus.value = 'FAILED'
      saving.value = false
      ElMessage.error(runResult?.error || '配置保存失败')
    } else if (runResult?.runId) {
      // 如果返回 runId，使用 composable 轮询
      jobStatus.value = runResult.status || 'WAITING'
      startPolling(runResult.runId, {
        interval: 5000,
        successMessage: '配置保存成功',
        errorMessage: '配置保存失败',
        onSuccess: () => {
          jobStatus.value = 'COMPLETED'
          saving.value = false
        },
        onError: () => {
          jobStatus.value = 'FAILED'
          saving.value = false
        },
        onComplete: (res) => {
          jobResult.value = res
        }
      })
    } else {
      // 无法识别的响应格式
      jobStatus.value = 'COMPLETED'
      saving.value = false
      ElMessage.success('配置保存成功')
    }
  } catch (error) {
    console.error('Failed to save config:', error)
    saving.value = false
    jobStatus.value = 'ERROR'
    ElMessage.error('保存失败')
  }
}
</script>

<style scoped lang="scss">
.settings-container {
  height: 100%;
  background: #f1f5f9;
  padding: 16px;
  overflow: auto;
}

.page-content {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

.form-card {
  width: 100%;
  max-width: 600px;
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.form-content {
  min-height: 200px;
}

.form-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 20px;

  .form-label {
    width: 140px;
    padding-top: 8px;
    font-weight: 500;
    color: #334155;
    font-size: 14px;
    flex-shrink: 0;
  }

  .form-control {
    flex: 1;
  }
}

.form-hint {
  margin-top: 6px;
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
}

.validation-error {
  margin-top: 16px;
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;

  i {
    color: #ef4444;
  }
}

.validation-info {
  margin-top: 16px;
  padding: 12px 16px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  color: #1d4ed8;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;

  i {
    color: #3b82f6;
  }
}
</style>
