<template>
  <div class="ops-page-layout ops-page-layout--page-scroll">
    <el-alert v-if="loadError" :title="loadError" type="error" :closable="false" show-icon>
      <el-button
        link
        type="primary"
        :loading="loading"
        :disabled="saving || sending"
        @click="loadConfig"
      >
        {{ t('settings.team.retryMembers') }}
      </el-button>
    </el-alert>
    <el-card class="config-card">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules" :validate-on-rule-change="false"
        label-width="120px"
        label-position="top"
        v-loading="loading"
        :disabled="loading || saving || sending || !configReady"
        @submit.prevent
      >
        <el-form-item :label="t('common.username')" prop="username">
          <el-input
            v-model="form.username"
            type="email"
            :placeholder="t('settings.email.usernamePlaceholder')"
            maxlength="100"
          />
        </el-form-item>

        <el-form-item :label="t('common.password')" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            :placeholder="t('settings.email.passwordPlaceholder')"
            show-password
            autocomplete="new-password"
            maxlength="100"
          />
        </el-form-item>

        <el-form-item :label="t('settings.email.server')" prop="host">
          <el-input v-model="form.host" :placeholder="t('settings.email.serverExample')" maxlength="100" />
        </el-form-item>

        <el-form-item :label="t('settings.email.port')" prop="port">
          <el-input-number v-model="formPort" :min="1" :max="65535" style="width: 200px" />
        </el-form-item>

        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item :label="t('settings.email.from')" prop="from">
              <el-input
                v-model="form.from"
                type="email"
                :placeholder="t('settings.email.fromPlaceholder')"
                maxlength="100"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('settings.email.recipientType')" prop="recipient_type">
              <el-select v-model="form.recipient_type" style="width: 200px">
                <el-option :label="t('settings.email.to')" value="to" />
                <el-option :label="t('settings.email.cc')" value="cc" />
                <el-option :label="t('settings.email.bcc')" value="bcc" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <div class="switch-group">
          <el-form-item :label="t('settings.email.debug')">
            <el-switch v-model="debugOnOff" />
          </el-form-item>
          <el-form-item :label="t('settings.email.ssl')">
            <el-switch v-model="sslOnOff" />
          </el-form-item>
        </div>

        <el-form-item class="form-actions">
          <el-button @click="handleTest">
            <i class="fa fa-paper-plane"></i>
            {{ t('settings.email.test') }}
          </el-button>
          <el-button type="primary" @click="handleSave" :loading="saving">
            <i class="fa fa-save"></i>
            {{ t('common.save') }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 测试发送对话框 -->
    <el-dialog
      v-model="testDialogVisible"
      :title="t('settings.email.testTitle')"
      width="400px"
      destroy-on-close
      :close-on-click-modal="false"
      :close-on-press-escape="false"
    >
      <el-form @submit.prevent="handleSendTest">
        <el-form-item :label="t('settings.email.recipient')">
          <el-input
            v-model="testRecipient"
            type="email"
            :placeholder="t('settings.email.recipientPlaceholder')"
            maxlength="100"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="testDialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button
          type="primary"
          @click="handleSendTest"
          :loading="sending"
          :disabled="!testRecipient"
        >
          {{ t('settings.email.send') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { t } from '@/core/i18n'
import { useLocalizedValidation } from '@/core/i18n/validation'
import { message, messageRef } from '@/core/i18n/feedback'
import {
  ref,
  reactive,
  onMounted,
  computed,
  nextTick,
  onBeforeUnmount,
  onActivated,
  onDeactivated
} from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiService } from '@/core/api'

const formRef = ref(null)
const loading = ref(false)
const saving = ref(false)
const loadError = messageRef('')
const configReady = ref(false)
let active = true
let readRequestId = 0
let interrupted = false

// 表单数据
const form = reactive({
  username: '',
  password: '',
  host: '',
  port: '25',
  from: '',
  debug_on_off: 'no',
  ssl_on_off: 'no',
  recipient_type: 'to'
})

// 原始数据（用于变更检测）
const originalData = ref({})

// 端口号转换
const formPort = computed({
  get: () => parseInt(form.port) || 25,
  set: val => {
    form.port = String(val)
  }
})

// 开关转换
const debugOnOff = computed({
  get: () => form.debug_on_off === 'yes',
  set: val => {
    form.debug_on_off = val ? 'yes' : 'no'
  }
})

const sslOnOff = computed({
  get: () => form.ssl_on_off === 'yes',
  set: val => {
    form.ssl_on_off = val ? 'yes' : 'no'
  }
})

// 表单验证规则
useLocalizedValidation(formRef)

const rules = computed(() => ({
  username: [
    { required: true, message: t('settings.email.enterUsername'), trigger: 'blur' },
    { type: 'email', message: t('settings.user.validEmail'), trigger: 'blur' }
  ],
  password: [{ required: true, message: t('settings.email.enterPassword'), trigger: 'blur' }],
  host: [{ required: true, message: t('settings.email.enterServer'), trigger: 'blur' }],
  from: [
    { required: true, message: t('settings.email.enterFrom'), trigger: 'blur' },
    { type: 'email', message: t('settings.user.validEmail'), trigger: 'blur' }
  ]
}))

// 测试发送
const testDialogVisible = ref(false)
const testRecipient = ref('')
const sending = ref(false)

// 加载配置
async function loadConfig() {
  if (!active) return
  const request = ++readRequestId
  loading.value = true
  configReady.value = false
  loadError.value = ''
  try {
    const response = await apiService.get('/api/email-config')
    if (!active || request !== readRequestId) return
    const data = response?.data || response

    if (data) {
      Object.assign(form, data)
      originalData.value = { ...form }
      // 清除初始验证状态
      await nextTick()
      if (!active || request !== readRequestId) return
      formRef.value?.clearValidate()
    }
    configReady.value = true
  } catch (error) {
    if (!active || request !== readRequestId) return
    console.error('Failed to load email config:', error)
    loadError.value = message('settings.email.readFailed')
    ElMessage.error(t('settings.email.loadFailed'))
  } finally {
    if (active && request === readRequestId) loading.value = false
  }
}

// 检查是否有未保存的修改
function hasUnsavedChanges() {
  return JSON.stringify(form) !== JSON.stringify(originalData.value)
}

// 保存配置
async function handleSave() {
  if (!active || !configReady.value || loading.value || saving.value || sending.value) return
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  try {
    await ElMessageBox.confirm(t('settings.email.saveConfirm'), t('settings.email.changeTitle'), {
      closeOnClickModal: false,
      closeOnPressEscape: false,
      confirmButtonText: t('settings.email.confirm'),
      cancelButtonText: t('common.cancel'),
      type: 'warning'
    })
  } catch {
    return
  }

  saving.value = true
  try {
    const response = await apiService.post('/api/email-config', form)

    if (response?.code === '200' || response?.data?.code === '200') {
      ElMessage.success(t('settings.email.saved'))
      originalData.value = { ...form }
    } else {
      ElMessage.error(response?.msg || response?.data?.msg || t('settings.user.saveFailed'))
    }
  } catch (error) {
    console.error('Failed to save email config:', error)
    ElMessage.error(t('settings.email.saveFailed'))
  } finally {
    saving.value = false
  }
}

// 打开测试对话框
function handleTest() {
  if (!active || !configReady.value || loading.value || saving.value || sending.value) return
  if (hasUnsavedChanges()) {
    ElMessage.warning(t('settings.email.saveBeforeTest'))
    return
  }

  testRecipient.value = ''
  testDialogVisible.value = true
}

// 发送测试邮件
async function handleSendTest() {
  if (!active || !configReady.value || loading.value || saving.value || sending.value) return
  if (!testRecipient.value) {
    ElMessage.warning(t('settings.email.enterRecipient'))
    return
  }

  sending.value = true
  try {
    const response = await apiService.get(
      `/api/email-config/${encodeURIComponent(testRecipient.value)}`
    )

    if (response?.code === '200' || response?.data?.code === '200') {
      ElMessage.success(t('settings.email.sent'))
      testDialogVisible.value = false
    } else {
      ElMessage.error(response?.msg || response?.data?.msg || t('settings.email.sendFailed'))
    }
  } catch (error) {
    console.error('Failed to send test email:', error)
    ElMessage.error(t('settings.email.testFailed'))
  } finally {
    sending.value = false
  }
}

onMounted(() => {
  loadConfig()
})

function pauseReading() {
  active = false
  interrupted = loading.value
  readRequestId += 1
  if (loading.value) loadError.value = message('settings.email.interrupted')
  loading.value = false
}
onDeactivated(pauseReading)
onBeforeUnmount(pauseReading)
onActivated(() => {
  if (active) return
  active = true
  if (interrupted) {
    interrupted = false
    loadConfig()
  }
})
</script>

<style scoped lang="scss">
.email-config {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;

  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

.config-card {
  max-width: 900px;
}

.switch-group {
  display: flex;
  gap: 40px;

  :deep(.el-form-item) {
    margin-bottom: 0;
  }
}

.ml-4 {
  margin-left: 40px;
}

.form-actions {
  margin-top: 24px;
  margin-bottom: 0;

  :deep(.el-form-item__content) {
    justify-content: flex-end !important;
  }

  .el-button {
    i {
      margin-right: 6px;
    }
  }
}
</style>
