<template>
  <el-dialog
    v-model="visible"
    title="重置密码"
    width="600px"
    :close-on-click-modal="false"
    :close-on-press-escape="!submitting"
    :show-close="!submitting"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      label-position="top"
      class="reset-password-form"
    >
      <!-- 主机选择 -->
      <el-form-item label="选择需更新的主机" prop="hosts" required>
        <AcmDeviceSelector
          v-model="formData.hosts"
          ci-types="linux"
          :options="{ label: '选择主机' }"
          :disabled="submitting"
          @change="() => formRef?.validateField('hosts')"
        />
      </el-form-item>

      <!-- 用户名 -->
      <el-form-item label="需更新的用户名" prop="user">
        <el-input
          v-model="formData.user"
          placeholder="请输入用户名"
          :disabled="submitting"
          autocomplete="new-password"
          name="sudo_user_field"
        />
      </el-form-item>

      <!-- 密码 -->
      <el-form-item label="重置密码" prop="password">
        <div class="password-row">
          <el-input
            v-model="formData.password"
            type="password"
            placeholder="请输入密码（8-16位）"
            :disabled="submitting"
            show-password
            autocomplete="new-password"
            name="sudo_password_field"
            class="password-input"
          />
          <el-button @click="generateRandomPassword" :disabled="submitting || !passwordConfig">
            <i class="fa fa-random"></i>
            随机密码
          </el-button>
        </div>
        <div class="form-item-hint">密码长度8-16位</div>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose" :disabled="submitting">取消</el-button>
        <el-button
          type="primary"
          :loading="submitting"
          :disabled="!canSubmit"
          @click="handleSubmit"
        >
          开始重置
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
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

const formRef = ref(null)
const visible = ref(props.modelValue)
const submitting = ref(false)
const passwordConfig = ref(null)

const formData = reactive({
  hosts: [],
  user: '',
  password: ''
})

// 表单验证规则
const formRules = {
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

// 是否可以提交
const canSubmit = computed(() => {
  return (
    formData.hosts.length > 0 &&
    formData.user.trim() !== '' &&
    formData.password.length >= 8 &&
    formData.password.length <= 16
  )
})

watch(
  () => props.modelValue,
  val => {
    visible.value = val
    if (val) {
      resetForm()
      loadPasswordConfig()
    }
  }
)

watch(visible, val => {
  emit('update:modelValue', val)
  if (!val) {
    stopPolling()
  }
})

function resetForm() {
  formData.hosts = []
  formData.user = ''
  formData.password = ''
  formRef.value?.resetFields()
}

async function loadPasswordConfig() {
  if (passwordConfig.value) return // 已加载过则不重复加载

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

async function handleSubmit() {
  // 表单验证
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }

  submitting.value = true

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
      ElMessage.info('任务已提交成功，正在查询执行结果')
      // 使用 composable 轮询查询执行结果
      startPolling(runResult.runId, {
        interval: 3000,
        onSuccess: () => {
          submitting.value = false
          ElMessage.success('密码重置成功')
          emit('saved')
          visible.value = false
        },
        onError: () => {
          submitting.value = false
          ElMessage.error('密码重置失败')
        }
      })
    } else {
      throw new Error('未获取到执行ID')
    }
  } catch (error) {
    console.error('Failed to reset password:', error)
    submitting.value = false
    ElMessage.error('执行失败')
  }
}

function handleClose() {
  if (submitting.value) {
    return
  }
  visible.value = false
  stopPolling()
}

onMounted(() => {
  loadPasswordConfig()
})
</script>

<style scoped lang="scss">
.reset-password-form {
  padding: 10px 0;

  :deep(.el-form-item__label) {
    font-weight: 500;
    color: var(--el-text-color-primary);
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

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 10px;
}
</style>
