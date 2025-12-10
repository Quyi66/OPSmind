<template>
  <div class="reset-password-container">
    <div class="page-content">
      <div class="form-card">
        <div class="card-title">重置密码</div>

        <!-- 主机选择 -->
        <div class="form-section">
          <div class="section-label">选择需更新的主机</div>
          <div class="section-content">
            <AcmDeviceSelector
              v-model="formData.hosts"
              ci-types="linux"
              :options="{ label: '选择主机' }"
              :disabled="submitting"
            />
          </div>
        </div>

        <!-- 用户名 -->
        <div class="form-section">
          <div class="section-label">需更新的用户名</div>
          <div class="section-content">
            <el-input
              v-model="formData.user"
              placeholder="请输入用户名"
              :disabled="submitting"
            />
          </div>
        </div>

        <!-- 密码 -->
        <div class="form-section">
          <div class="section-label">重置密码</div>
          <div class="section-content password-row">
            <el-input
              v-model="formData.password"
              placeholder="请输入密码（8-16位）"
              :disabled="submitting"
              show-password
              class="password-input"
            />
            <el-button
              @click="generateRandomPassword"
              :disabled="submitting || !passwordConfig"
            >
              <i class="fa fa-random"></i>
              随机密码
            </el-button>
          </div>
          <div class="input-hint">密码长度8-16位</div>
        </div>

        <!-- 执行按钮 -->
        <div class="form-section">
          <el-button
            type="primary"
            :loading="submitting"
            :disabled="!canSubmit"
            @click="handleSubmit"
          >
            <i class="fa fa-redo-alt" v-if="!submitting"></i>
            开始重置
          </el-button>
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
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import * as sudoApi from '@/modules/sudo/api'

const formData = reactive({
  hosts: [],
  user: '',
  password: ''
})

const passwordConfig = ref(null)
const submitting = ref(false)
const jobStatus = ref('')
const jobResult = ref(null)
let pollTimer = null

// 状态判断
const isRunning = computed(() => jobStatus.value === 'WAITING' || jobStatus.value === 'RUNNING')
const isSuccess = computed(() => jobStatus.value === 'SUCCESS' || jobStatus.value === 'COMPLETED')
const isFailed = computed(() => jobStatus.value === 'FAILED' || jobStatus.value === 'ERROR')

const statusText = computed(() => {
  switch (jobStatus.value) {
    case 'WAITING': return '等待执行...'
    case 'RUNNING': return '正在重置...'
    case 'SUCCESS':
    case 'COMPLETED': return '重置成功'
    case 'FAILED':
    case 'ERROR': return '重置失败'
    default: return jobStatus.value
  }
})

// 是否可以提交
const canSubmit = computed(() => {
  return formData.hosts.length > 0 &&
         formData.user.trim() !== '' &&
         formData.password.length >= 8 &&
         formData.password.length <= 16
})

onMounted(() => {
  loadPasswordConfig()
})

onUnmounted(() => {
  stopPolling()
})

async function loadPasswordConfig() {
  try {
    const response = await sudoApi.getSystemParams()
    const result = response?.data || response
    const records = result?.records || []

    const configItem = records.find(r => r.name === 'password_complexity')
    if (configItem) {
      passwordConfig.value = JSON.parse(configItem.value)
    }
  } catch (error) {
    console.error('Failed to load password config:', error)
  }
}

function getRandomStr(defaultStr, length) {
  const list = defaultStr.split('')
  let str = ''
  const defaultLength = defaultStr.length - 1
  for (let i = 0; i < length; i++) {
    str += list[Math.ceil(Math.random() * defaultLength)]
  }
  return str
}

function shuffleStr(str) {
  const list = str.split('')
  const newList = []
  list.forEach((item) => {
    const newListIndex = Math.round(Math.random() * newList.length)
    newList.splice(newListIndex, 0, item)
  })
  return newList.join('')
}

function generateRandomPassword() {
  if (!passwordConfig.value) {
    ElMessage.warning('密码配置未加载')
    return
  }

  const config = passwordConfig.value

  // 字符集
  const lcredit = 'abcdefghijklmnopqrstuvwsyz' // 小写字母
  const ucredit = 'ABCDEFGHIJKLMNOPQRSTUVWSYZ' // 大写字母
  const dcredit = '0123456789' // 数字
  const ocredit = '~!@#$%^&*?-' // 特殊字符

  // 从配置中获取各类字符数量
  const lcreditNum = config.lcredit || 0
  const ucreditNum = config.ucredit || 0
  const ocreditNum = config.ocredit || 0
  const dcreditNum = config.dcredit || 0
  const passwdLength = config.passwd_length || 16

  // 计算剩余长度
  const remainingLength = passwdLength - lcreditNum - ucreditNum - ocreditNum - dcreditNum

  // 生成密码
  const password = shuffleStr(
    getRandomStr(lcredit, lcreditNum) +
    getRandomStr(ucredit, ucreditNum) +
    getRandomStr(ocredit, ocreditNum) +
    getRandomStr(dcredit, dcreditNum) +
    getRandomStr(lcredit + ucredit + ocredit + dcredit, remainingLength)
  )

  formData.password = password
}

function stopPolling() {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
}

async function pollJobResult(runId) {
  try {
    const response = await sudoApi.getJobResult(runId)
    const result = response?.data || response
    jobResult.value = result
    jobStatus.value = result.status

    if (result.status === 'WAITING' || result.status === 'RUNNING') {
      pollTimer = setTimeout(() => pollJobResult(runId), 5000)
    } else {
      submitting.value = false
      if (result.status === 'SUCCESS' || result.status === 'COMPLETED') {
        ElMessage.success('密码重置成功')
      } else {
        ElMessage.error('密码重置失败')
      }
    }
  } catch (error) {
    console.error('Failed to poll job result:', error)
    submitting.value = false
    jobStatus.value = 'ERROR'
    ElMessage.error('获取执行结果失败')
  }
}

async function handleSubmit() {
  if (!canSubmit.value) {
    ElMessage.warning('请填写完整信息，密码长度需在8-16位之间')
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

    const response = await sudoApi.resetPassword({
      hosts,
      user: formData.user,
      password: formData.password
    })

    const result = response?.data || response
    const runResult = Array.isArray(result) ? result[0] : result

    if (runResult?.runId) {
      jobStatus.value = runResult.status || 'WAITING'
      pollJobResult(runResult.runId)
    } else {
      throw new Error('未获取到执行ID')
    }
  } catch (error) {
    console.error('Failed to reset password:', error)
    submitting.value = false
    jobStatus.value = 'ERROR'
    ElMessage.error('执行失败')
  }
}
</script>

<style scoped lang="scss">
.reset-password-container {
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

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.form-section {
  margin-bottom: 20px;

  .section-label {
    font-weight: 500;
    color: #334155;
    margin-bottom: 8px;
    font-size: 14px;
  }

  .section-content {
    &.password-row {
      display: flex;
      gap: 10px;

      .password-input {
        flex: 1;
      }
    }
  }
}

.input-hint {
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

  .status-detail {
    margin-top: 8px;
    font-size: 12px;
    color: #64748b;
  }
}
</style>
