<template>
  <div class="ops-page-layout">
    <el-card class="config-card">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
        label-position="top"
        v-loading="loading"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="form.username"
            type="email"
            placeholder="输入邮箱用户名"
            maxlength="100"
          />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="输入邮箱密码或授权码"
            show-password
            autocomplete="new-password"
            maxlength="100"
          />
        </el-form-item>

        <el-form-item label="邮件服务器" prop="host">
          <el-input v-model="form.host" placeholder="如：smtp.163.com" maxlength="100" />
        </el-form-item>

        <el-form-item label="服务器端口" prop="port">
          <el-input-number v-model="formPort" :min="1" :max="65535" style="width: 200px" />
        </el-form-item>

        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="发件人" prop="from">
              <el-input
                v-model="form.from"
                type="email"
                placeholder="发件人邮箱地址（通常与用户名相同）"
                maxlength="100"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="收件人类型" prop="recipient_type">
              <el-select v-model="form.recipient_type" style="width: 200px">
                <el-option label="TO（主送）" value="to" />
                <el-option label="CC（抄送）" value="cc" />
                <el-option label="BCC（密送）" value="bcc" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <div class="switch-group">
          <el-form-item label="调试模式">
            <el-switch v-model="debugOnOff" />
          </el-form-item>
          <el-form-item label="SSL认证">
            <el-switch v-model="sslOnOff" />
          </el-form-item>
        </div>

        <el-form-item class="form-actions">
          <el-button @click="handleTest">
            <i class="fa fa-paper-plane"></i>
            测试发送
          </el-button>
          <el-button type="primary" @click="handleSave" :loading="saving">
            <i class="fa fa-save"></i>
            保存
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 测试发送对话框 -->
    <el-dialog v-model="testDialogVisible" title="测试发送邮件" width="400px" destroy-on-close>
      <el-form @submit.prevent="handleSendTest">
        <el-form-item label="收件人邮箱">
          <el-input
            v-model="testRecipient"
            type="email"
            placeholder="输入收件人邮箱地址"
            maxlength="100"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="testDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          @click="handleSendTest"
          :loading="sending"
          :disabled="!testRecipient"
        >
          发送
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiService } from '@/core/api'

const formRef = ref(null)
const loading = ref(false)
const saving = ref(false)

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
const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }
  ],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  host: [{ required: true, message: '请输入邮件服务器', trigger: 'blur' }],
  from: [
    { required: true, message: '请输入发件人', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }
  ]
}

// 测试发送
const testDialogVisible = ref(false)
const testRecipient = ref('')
const sending = ref(false)

// 加载配置
async function loadConfig() {
  loading.value = true
  try {
    const response = await apiService.get(`/api/email-config?cacheBuster=${Date.now()}`)
    const data = response?.data || response

    if (data) {
      Object.assign(form, data)
      originalData.value = { ...data }
      // 清除初始验证状态
      setTimeout(() => {
        formRef.value?.clearValidate()
      }, 0)
    }
  } catch (error) {
    console.error('Failed to load email config:', error)
    ElMessage.error('加载邮件配置失败')
  } finally {
    loading.value = false
  }
}

// 检查是否有未保存的修改
function hasUnsavedChanges() {
  return JSON.stringify(form) !== JSON.stringify(originalData.value)
}

// 保存配置
async function handleSave() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  try {
    await ElMessageBox.confirm('确定要保存邮件配置吗？', '变更操作', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  saving.value = true
  try {
    const response = await apiService.post('/api/email-config', form)

    if (response?.code === '200' || response?.data?.code === '200') {
      ElMessage.success('邮件配置保存成功')
      originalData.value = { ...form }
    } else {
      ElMessage.error(response?.msg || response?.data?.msg || '保存失败')
    }
  } catch (error) {
    console.error('Failed to save email config:', error)
    ElMessage.error('保存邮件配置失败')
  } finally {
    saving.value = false
  }
}

// 打开测试对话框
function handleTest() {
  if (hasUnsavedChanges()) {
    ElMessage.warning('请先保存配置后再进行测试')
    return
  }

  testRecipient.value = ''
  testDialogVisible.value = true
}

// 发送测试邮件
async function handleSendTest() {
  if (!testRecipient.value) {
    ElMessage.warning('请输入收件人邮箱')
    return
  }

  sending.value = true
  try {
    const response = await apiService.get(
      `/api/email-config/${encodeURIComponent(testRecipient.value)}`
    )

    if (response?.code === '200' || response?.data?.code === '200') {
      ElMessage.success('测试邮件发送成功')
      testDialogVisible.value = false
    } else {
      ElMessage.error(response?.msg || response?.data?.msg || '发送失败')
    }
  } catch (error) {
    console.error('Failed to send test email:', error)
    ElMessage.error('测试邮件发送失败')
  } finally {
    sending.value = false
  }
}

onMounted(() => {
  loadConfig()
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
