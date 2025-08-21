<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1>OpsMind Dashboard</h1>
        <p>运维管理平台</p>
        <!-- 开发环境提示 -->
        <div v-if="isDev" class="dev-notice">
          <el-alert
            title="开发环境"
            type="info"
            :closable="false"
            show-icon
          >
            <template #default>
              <p>默认账号: <strong>admin</strong></p>
              <p>默认密码: <strong>Oplus@2020</strong></p>
            </template>
          </el-alert>
        </div>
      </div>

      <div v-if="initializing" class="initializing-container">
        <p>正在初始化登录页面...</p>
        <div class="loading-spinner">
          <i class="el-icon-loading"></i>
        </div>
      </div>

      <el-form
        v-else
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        @submit.prevent="handleLogin"
      >
        <div v-if="authError" class="error-message">
          <el-alert :title="errorMessage" type="error" :closable="false" show-icon></el-alert>
        </div>

        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="用户名"
            size="large"
            prefix-icon="User"
            :disabled="loading"
          ></el-input>
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="密码"
            size="large"
            prefix-icon="Lock"
            :disabled="loading"
            @keyup.enter="handleLogin"
          ></el-input>
        </el-form-item>

        <el-form-item v-if="showOTP" prop="otpCode">
          <el-input
            v-model="loginForm.otpCode"
            placeholder="动态验证码"
            size="large"
            prefix-icon="Key"
            :disabled="loading"
            maxlength="6"
            @keyup.enter="handleLogin"
          ></el-input>
        </el-form-item>

        <el-form-item>
          <el-checkbox v-model="loginForm.rememberMe" :disabled="loading">记住我</el-checkbox>
        </el-form-item>

        <el-form-item>
          <div class="login-buttons">
            <el-button
              type="primary"
              size="large"
              :loading="loading"
              @click="handleLogin"
              :class="isDev ? 'login-button-dev' : 'login-button'"
            >
              {{ loading ? '登录中...' : '登录' }}
            </el-button>

            <!-- 开发环境快速登录按钮 -->
            <el-button
              v-if="isDev"
              type="success"
              size="large"
              :loading="loading"
              @click="handleQuickLogin"
              class="quick-login-button"
            >
              快速登录
            </el-button>
          </div>
        </el-form-item>
      </el-form>

      <div class="login-footer">
        <p>&copy; 2024 OpsMind. All rights reserved.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElForm, ElFormItem, ElInput, ElButton, ElCheckbox, ElAlert, ElMessage } from 'element-plus'
import { authService } from '@/core/auth'
import { getDevLoginDefaults, logDevInfo, isDevelopment } from '@/config/dev-defaults'

const router = useRouter()
const loginFormRef = ref()

// 开发环境标识
const isDev = isDevelopment()

// 获取开发环境默认值
const devDefaults = getDevLoginDefaults()

const loginForm = reactive({
  username: devDefaults.username,
  password: devDefaults.password,
  otpCode: '',
  rememberMe: devDefaults.rememberMe
})

const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 1, max: 50, message: '用户名长度在 1 到 50 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 4, max: 100, message: '密码长度在 4 到 100 个字符', trigger: 'blur' }
  ],
  otpCode: [{ len: 6, message: '动态验证码必须是6位数字', trigger: 'blur' }]
}

const loading = ref(false)
const authError = ref(false)
const errorMessage = ref('')
const showOTP = ref(false)
const initializing = ref(true)
const tenants = ref([])
const licenseInfo = ref(null)

const handleLogin = async () => {
  if (loading.value) return

  try {
    await loginFormRef.value.validate()

    loading.value = true
    authError.value = false

    console.log('🔐 Attempting login:', loginForm.username)

    const result = await authService.login({
      username: loginForm.username,
      password: loginForm.password,
      otpCode: loginForm.otpCode,
      rememberMe: loginForm.rememberMe
    })

    console.log('✅ Login successful:', result)
    ElMessage.success('登录成功')

    // 确保认证状态已更新，然后跳转到仪表盘
    await new Promise(resolve => setTimeout(resolve, 100))

    // 验证认证状态
    const isAuthenticated = authService.isAuthenticated()
    const currentUser = authService.getCurrentUser()
    console.log('🔍 Auth status before navigation:', {
      isAuthenticated,
      hasUser: !!currentUser,
      userLogin: currentUser?.login
    })

    // 登录成功后通知所有iframe模块更新认证状态
    notifyIframeModulesAuthUpdate()

    console.log('🔄 Navigating to home...')
    await router.push('/home')
  } catch (error) {
    console.error('❌ Login failed:', error)
    authError.value = true

    if (error.code === 'UnknownAccount') {
      errorMessage.value = '用户不存在'
    } else if (error.code === 'IncorrectCredentials') {
      errorMessage.value = '用户名或密码错误'
    } else if (error.code === 'UnknownTenantAccount') {
      errorMessage.value = '用户未注册到当前租户'
    } else {
      errorMessage.value = error.message || '登录失败，请检查用户名和密码'
    }
  } finally {
    loading.value = false
  }
}

// 开发环境快速登录
const handleQuickLogin = async () => {
  if (!isDev) return

  // 确保表单已填充默认值
  const defaults = getDevLoginDefaults()
  loginForm.username = defaults.username
  loginForm.password = defaults.password
  loginForm.rememberMe = defaults.rememberMe

  // 直接调用登录
  await handleLogin()
}

// 通知所有iframe模块认证状态更新
const notifyIframeModulesAuthUpdate = () => {
  try {
    console.log('🚀 [Login] Starting iframe modules auth update notification...')

    // 使用iframe管理器广播认证更新
    const { GlobalIframeManager } = require('@/utils/iframe-manager')
    const iframeManager = GlobalIframeManager.getInstance()
    console.log('🔗 [Login] Using GlobalIframeManager for auth broadcast')
    iframeManager.broadcastAuthUpdate()

    // 认证数据已通过URL参数传递给iframe，无需postMessage
    const iframes = document.querySelectorAll('iframe')
    console.log(`🔗 [Login] Found ${iframes.length} iframes - auth data passed via URL`)

    if (iframes.length > 0) {
      const token = authService.getToken()
      const user = authService.getCurrentUser()

      if (token && user) {
        console.log('✅ [Login] Auth data available and passed via URL to iframes:', {
          hasToken: !!token,
          userLogin: user.login,
          tenantId: user.tenantId,
          iframeCount: iframes.length
        })
      } else {
        console.warn('⚠️ [Login] No auth data available:', {
          hasToken: !!token,
          hasUser: !!user
        })
      }
    }

    console.log('✅ [Login] Auth update notification completed successfully')
  } catch (error) {
    console.error('❌ [Login] Failed to notify iframe modules:', error)
  }
}

const initializeLoginPage = async () => {
  try {
    initializing.value = true
    console.log('🔄 Initializing login page...')

    const result = await authService.initializeLogin()

    tenants.value = result.tenants || []
    licenseInfo.value = result.license
    showOTP.value = result.otpEnabled || false

    console.log('✅ Login page initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize login page:', error)
    // 即使初始化失败，也允许用户尝试登录
  } finally {
    initializing.value = false

    // 自动聚焦到用户名输入框
    setTimeout(() => {
      const usernameInput = document.querySelector('input[placeholder="用户名"]')
      if (usernameInput) {
        usernameInput.focus()
      }
    }, 100)
  }
}

onMounted(() => {
  initializeLoginPage()

  // 开发环境提示
  if (isDev) {
    logDevInfo()
  }
})
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 100%;
  max-width: 400px;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-header h1 {
  color: #2c3e50;
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.login-header p {
  color: #7f8c8d;
  font-size: 14px;
  margin: 0;
}

.dev-notice {
  margin-top: 16px;
  text-align: left;
}

.dev-notice .el-alert {
  border-radius: 8px;
}

.dev-notice p {
  margin: 4px 0;
  font-size: 13px;
}

.login-form {
  margin-bottom: 24px;
}

.error-message {
  margin-bottom: 20px;
}

.login-buttons {
  display: flex;
  gap: 12px;
  align-items: center;
}

.login-button {
  width: 100%;
  height: 44px;
  font-size: 16px;
  font-weight: 500;
}

.login-button-dev {
  flex: 1;
  height: 44px;
  font-size: 16px;
  font-weight: 500;
}

.quick-login-button {
  height: 44px;
  font-size: 14px;
  font-weight: 500;
  min-width: 100px;
  flex-shrink: 0;
}

.login-footer {
  text-align: center;
  color: #95a5a6;
  font-size: 12px;
}

.login-footer p {
  margin: 0;
}

.initializing-container {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.loading-spinner {
  margin-top: 16px;
  font-size: 24px;
  color: #409eff;
}

.loading-spinner i {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 响应式设计 */
@media (max-width: 480px) {
  .login-card {
    padding: 24px;
    margin: 0 16px;
  }

  .login-header h1 {
    font-size: 24px;
  }
}
</style>
