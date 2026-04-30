<template>
  <div class="password-manage-page">
    <!-- 重置密码区域 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <span class="card-title">
            <i class="fa fa-key"></i>
            重置密码
          </span>
          <span class="card-desc">批量更新主机上指定用户的密码</span>
        </div>
      </template>
      <el-form
        ref="resetFormRef"
        :model="resetForm"
        :rules="resetFormRules"
        label-width="140px"
        class="reset-password-form"
      >
        <!-- 主机选择 -->
        <el-form-item label="选择需更新的主机" prop="hosts" required>
          <AcmDeviceSelector
            v-model="resetForm.hosts"
            ci-types="linux"
            :options="{ label: '选择主机' }"
            :disabled="resetting"
            @change="() => resetFormRef?.validateField('hosts')"
          />
        </el-form-item>

        <!-- 用户名 -->
        <el-form-item label="需更新的用户名" prop="user" class="inline-item">
          <el-input
            v-model="resetForm.user"
            placeholder="请输入用户名"
            :disabled="resetting"
            autocomplete="new-password"
            name="sudo_user_field"
            style="width: 200px"
          />
        </el-form-item>

        <!-- 密码 -->
        <el-form-item label="重置密码" prop="password" class="inline-item">
          <div class="password-row">
            <el-input
              v-model="resetForm.password"
              type="password"
              placeholder="请输入密码（8-16位）"
              :disabled="resetting"
              show-password
              autocomplete="new-password"
              name="sudo_password_field"
              class="password-input"
            />
            <el-button @click="generateRandomPassword" :disabled="resetting || !passwordConfig">
              <i class="fa fa-random"></i>
              随机密码
            </el-button>
          </div>
          <div class="form-item-hint">密码长度8-16位</div>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :loading="resetting"
            :disabled="!canReset"
            @click="handleResetPassword"
          >
            <i class="fa fa-sync-alt" v-if="!resetting"></i>
            开始重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 密码策略区域 -->
    <el-card v-loading="policyLoading">
      <template #header>
        <div class="card-header">
          <span class="card-title">
            <i class="fa fa-cog"></i>
            密码策略
          </span>
          <span class="card-desc">配置密码复杂度要求，用于随机生成符合规范的密码</span>
        </div>
      </template>
      <el-form label-width="120px" class="policy-form">
        <el-form-item label="密码长度">
          <el-input-number
            v-model="policyForm.passwd_length"
            :min="minPasswordLength"
            :max="32"
            :disabled="savingPolicy"
            @change="onPasswordLengthChange"
          />
        </el-form-item>

        <el-form-item label="最少小写字母数">
          <el-input-number
            v-model="policyForm.lcredit"
            :min="0"
            :max="maxCharTypeValue"
            :disabled="savingPolicy"
          />
        </el-form-item>

        <el-form-item label="最少大写字母数">
          <el-input-number
            v-model="policyForm.ucredit"
            :min="0"
            :max="maxCharTypeValue"
            :disabled="savingPolicy"
          />
        </el-form-item>

        <el-form-item label="最少数字个数">
          <el-input-number
            v-model="policyForm.dcredit"
            :min="0"
            :max="maxCharTypeValue"
            :disabled="savingPolicy"
          />
        </el-form-item>

        <el-form-item label="最少特殊符号数">
          <el-input-number
            v-model="policyForm.ocredit"
            :min="0"
            :max="maxCharTypeValue"
            :disabled="savingPolicy"
          />
          <div class="form-item-hint">特殊符号：~!@#$%^&*?</div>
        </el-form-item>

        <!-- 验证提示 -->
        <el-form-item>
          <el-alert
            v-if="policyValidationError"
            :title="policyValidationError"
            type="error"
            :closable="false"
            show-icon
          />
          <el-alert
            v-else
            :title="`当前字符要求总和：${totalCharRequirements} / ${policyForm.passwd_length}`"
            type="info"
            :closable="false"
            show-icon
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :loading="savingPolicy"
            :disabled="!canSavePolicy"
            @click="handleSavePolicy"
          >
            <i class="fa fa-save" v-if="!savingPolicy"></i>
            保存策略
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import * as sudoApi from '@/modules/sudo/api'
import { useJobPolling } from '@/composables/useJobPolling'

const { startPolling, stopPolling } = useJobPolling()

// ==================== 重置密码相关 ====================
const resetFormRef = ref(null)
const resetting = ref(false)
const passwordConfig = ref(null)

const resetForm = reactive({
  hosts: [],
  user: '',
  password: ''
})

const resetFormRules = {
  hosts: [
    {
      required: true,
      validator: (rule, value, callback) => {
        if (!value || value.length === 0) {
          callback(new Error('请选择主机'))
        } else {
          callback()
        }
      },
      trigger: ['change', 'blur']
    }
  ],
  user: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value && (value.length < 8 || value.length > 16)) {
          callback(new Error('密码长度需在8-16位之间'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const canReset = computed(() => {
  return (
    resetForm.hosts.length > 0 &&
    resetForm.user.trim() !== '' &&
    resetForm.password.length >= 8 &&
    resetForm.password.length <= 16
  )
})

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
  list.forEach(item => {
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

  const lcredit = 'abcdefghijklmnopqrstuvwsyz'
  const ucredit = 'ABCDEFGHIJKLMNOPQRSTUVWSYZ'
  const dcredit = '0123456789'
  const ocredit = '~!@#$%^&*?-'

  const lcreditNum = config.lcredit || 0
  const ucreditNum = config.ucredit || 0
  const ocreditNum = config.ocredit || 0
  const dcreditNum = config.dcredit || 0
  const passwdLength = config.passwd_length || 16

  const remainingLength = passwdLength - lcreditNum - ucreditNum - ocreditNum - dcreditNum

  const password = shuffleStr(
    getRandomStr(lcredit, lcreditNum) +
      getRandomStr(ucredit, ucreditNum) +
      getRandomStr(ocredit, ocreditNum) +
      getRandomStr(dcredit, dcreditNum) +
      getRandomStr(lcredit + ucredit + ocredit + dcredit, remainingLength)
  )

  resetForm.password = password
}

async function handleResetPassword() {
  const valid = await resetFormRef.value?.validate().catch(() => false)
  if (!valid) return

  resetting.value = true

  try {
    const hosts = resetForm.hosts.map(h => ({
      key: h.key || h.value || h,
      value: h.value || h.key || h,
      assetType: h.assetType || 'linux'
    }))

    const response = await sudoApi.resetPassword({
      hosts,
      user: resetForm.user,
      password: resetForm.password
    })

    const result = response?.data || response
    const runResult = Array.isArray(result) ? result[0] : result

    if (runResult?.runId) {
      ElMessage.info('任务已提交成功，正在查询执行结果')
      startPolling(runResult.runId, {
        interval: 3000,
        onSuccess: () => {
          resetting.value = false
          ElMessage.success('密码重置成功')
          resetForm.hosts = []
          resetForm.user = ''
          resetForm.password = ''
          resetFormRef.value?.resetFields()
        },
        onError: () => {
          resetting.value = false
          ElMessage.error('密码重置失败')
        }
      })
    } else {
      throw new Error('未获取到执行ID')
    }
  } catch (error) {
    console.error('Failed to reset password:', error)
    resetting.value = false
    ElMessage.error('执行失败')
  }
}

// ==================== 密码策略相关 ====================
const policyLoading = ref(false)
const savingPolicy = ref(false)

const policyForm = reactive({
  passwd_length: 8,
  lcredit: 1,
  ucredit: 1,
  dcredit: 1,
  ocredit: 1
})

const maxCharTypeValue = computed(() => {
  return Math.max(0, policyForm.passwd_length)
})

const totalCharRequirements = computed(() => {
  return policyForm.lcredit + policyForm.ucredit + policyForm.dcredit + policyForm.ocredit
})

const minPasswordLength = computed(() => {
  return Math.max(1, totalCharRequirements.value)
})

const policyValidationError = computed(() => {
  if (policyForm.passwd_length < 1) {
    return '密码长度必须至少为1'
  }
  if (totalCharRequirements.value > policyForm.passwd_length) {
    return `字符要求总和(${totalCharRequirements.value})不能超过密码长度(${policyForm.passwd_length})`
  }
  return ''
})

const canSavePolicy = computed(() => {
  return (
    policyForm.ocredit >= 0 &&
    policyForm.dcredit >= 0 &&
    policyForm.ucredit >= 0 &&
    policyForm.lcredit >= 0 &&
    policyForm.passwd_length >= 1 &&
    !policyValidationError.value
  )
})

function onPasswordLengthChange(newLength) {
  if (policyForm.lcredit > newLength) policyForm.lcredit = newLength
  if (policyForm.ucredit > newLength) policyForm.ucredit = newLength
  if (policyForm.dcredit > newLength) policyForm.dcredit = newLength
  if (policyForm.ocredit > newLength) policyForm.ocredit = newLength
}

async function loadPolicyConfig() {
  policyLoading.value = true
  try {
    const response = await sudoApi.getSystemParams()
    const result = response?.data || response
    const records = result?.records || []

    const configItem = records.find(r => r.name === 'password_complexity')
    if (configItem) {
      const config = JSON.parse(configItem.value)
      policyForm.passwd_length = config.passwd_length || 8
      policyForm.lcredit = config.lcredit || 0
      policyForm.ucredit = config.ucredit || 0
      policyForm.dcredit = config.dcredit || 0
      policyForm.ocredit = config.ocredit || 0

      passwordConfig.value = config
    }
  } catch (error) {
    console.error('Failed to load config:', error)
    ElMessage.error('加载配置失败')
  } finally {
    policyLoading.value = false
  }
}

async function handleSavePolicy() {
  if (!canSavePolicy.value) {
    ElMessage.warning('请填写有效的配置值')
    return
  }

  savingPolicy.value = true

  try {
    const response = await sudoApi.savePasswordComplexity({
      ocredit: policyForm.ocredit,
      dcredit: policyForm.dcredit,
      ucredit: policyForm.ucredit,
      lcredit: policyForm.lcredit,
      passwd_length: policyForm.passwd_length
    })

    const result = response?.data || response
    const runResult = Array.isArray(result) ? result[0] : result

    if (runResult?.status === 'COMPLETED' || runResult?.status === 'SUCCESS') {
      savingPolicy.value = false
      ElMessage.success('配置保存成功')
      passwordConfig.value = { ...policyForm }
    } else if (runResult?.status === 'FAILED' || runResult?.error) {
      savingPolicy.value = false
      ElMessage.error(runResult?.error || '配置保存失败')
    } else if (runResult?.runId) {
      ElMessage.info('任务已提交，正在查询执行结果')
      startPolling(runResult.runId, {
        interval: 3000,
        onSuccess: () => {
          savingPolicy.value = false
          ElMessage.success('配置保存成功')
          passwordConfig.value = { ...policyForm }
        },
        onError: () => {
          savingPolicy.value = false
          ElMessage.error('配置保存失败')
        }
      })
    } else {
      savingPolicy.value = false
      ElMessage.success('配置保存成功')
      passwordConfig.value = { ...policyForm }
    }
  } catch (error) {
    console.error('Failed to save config:', error)
    savingPolicy.value = false
    ElMessage.error('保存失败')
  }
}

onMounted(() => {
  loadPolicyConfig()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped lang="scss">
.password-manage-page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  overflow-y: auto;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  display: flex;
  align-items: center;
  gap: 8px;

  i {
    color: var(--el-color-primary);
  }
}

.card-desc {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

// 重置密码表单
.reset-password-form {
  :deep(.el-form-item__label) {
    font-weight: 500;
  }
}

.password-row {
  display: flex;
  gap: 10px;

  .password-input {
    flex: 1;
  }
}

.form-item-hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

// 密码策略表单
.policy-form {
  max-width: 500px;
}

:deep(.el-card__body) {
  padding: 10px 16px;
}
</style>
