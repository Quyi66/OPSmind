<template>
  <div class="login-container">
    <!-- Logo 区域 -->
    <div class="logo-section">
      <div class="logo">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="#2196F3"/>
          <path d="M8 12h16v8H8z" fill="white" opacity="0.9"/>
          <path d="M12 8h8v16h-8z" fill="white" opacity="0.7"/>
        </svg>
        <span class="logo-text">OpsMind</span>
      </div>
    </div>

    <!-- 主要内容区域 - 统一的白色卡片 -->
    <div class="main-content">
      <div class="login-card">
        <!-- 左侧插图区域 -->
        <div class="login-illustration">
          <div class="illustration-content">
            <img src="@/assets/images/login-illustration.svg" alt="OpsMind Dashboard" class="illustration-image" />
          </div>
        </div>

        <!-- 右侧登录表单区域 -->
        <div class="login-form-section">
        <div class="login-header">
          <h1>用户登录</h1>
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
            <el-checkbox v-model="loginForm.rememberMe" :disabled="loading">保持登录状态</el-checkbox>
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
        </div>
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
    await notifyIframeModulesAuthUpdate()

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
const notifyIframeModulesAuthUpdate = async () => {
  try {
    console.log('🚀 [Login] Starting iframe modules auth update notification...')

    // 使用iframe管理器广播认证更新
    try {
      const { GlobalIframeManager } = await import('@/utils/iframe-manager')
      const iframeManager = GlobalIframeManager.getInstance()
      console.log('🔗 [Login] Using GlobalIframeManager for auth broadcast')
      iframeManager.broadcastAuthUpdate()
    } catch (error) {
      console.warn('⚠️ [Login] Failed to load iframe manager:', error)
    }

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
  background: linear-gradient(135deg, #4a90e2 0%, #357abd 50%, #1e5f99 100%);
  position: relative;
  overflow: hidden;
  padding: 40px;
}

/* 添加背景装饰点 */
.login-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image:
    radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
    radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
    radial-gradient(circle at 40% 40%, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size:
    50px 50px,
    80px 80px,
    100px 100px;
  pointer-events: none;
}

/* Logo 区域 */
.logo-section {
  position: absolute;
  top: 60px;
  left: 60px;
  z-index: 10;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-text {
  color: white;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.5px;
}

/* 主要内容区域 */
.main-content {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

/* 统一的白色卡片容器 */
.login-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  display: flex;
  overflow: hidden;
  width: 800px;
  height: 520px;
  position: relative;
  z-index: 1;
}

/* 左侧插图区域 */
.login-illustration {
  flex: 0 0 480px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #f8fbff 0%, #e8f4fd 100%);
  padding: 60px 40px;
}

.illustration-content {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

.illustration-image {
  width: 100%;
  height: 100%;
  max-width: 400px;
  max-height: 300px;
  object-fit: contain;
}

/* 右侧登录表单区域 */
.login-form-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 40px 32px;
  background: white;
}

.login-header {
  text-align: left;
  margin-bottom: 24px;
}

.login-header h1 {
  color: #333;
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 16px 0;
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
  margin-bottom: 0;
}

.error-message {
  margin-bottom: 16px;
}

/* 表单项样式 */
.login-form :deep(.el-form-item) {
  margin-bottom: 16px;
}

.login-form :deep(.el-input__wrapper) {
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  box-shadow: none;
  padding: 10px 12px;
  height: 40px;
}

.login-form :deep(.el-input__wrapper:hover) {
  border-color: #2196f3;
}

.login-form :deep(.el-input__wrapper.is-focus) {
  border-color: #2196f3;
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
}

.login-form :deep(.el-input__inner) {
  font-size: 14px;
  color: #333;
}

.login-form :deep(.el-input__inner::placeholder) {
  color: #999;
}

/* 复选框样式 */
.login-form :deep(.el-checkbox__label) {
  font-size: 14px;
  color: #666;
}

.login-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 20px;
}

.login-button {
  width: 100%;
  height: 40px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  background: #2196f3;
  border: none;
}

.login-button:hover {
  background: #1976d2;
}

.login-button-dev {
  flex: 1;
  height: 40px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  background: #2196f3;
  border: none;
}

.login-button-dev:hover {
  background: #1976d2;
}

.quick-login-button {
  height: 40px;
  font-size: 12px;
  font-weight: 500;
  min-width: 80px;
  flex-shrink: 0;
  border-radius: 6px;
}

.initializing-container {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.loading-spinner {
  margin-top: 16px;
  font-size: 24px;
  color: #2196f3;
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
@media (max-width: 900px) {
  .login-container {
    padding: 20px;
  }

  .login-card {
    width: 90%;
    max-width: 700px;
    height: auto;
    min-height: 450px;
  }

  .login-illustration {
    flex: 0 0 400px;
    padding: 40px 30px;
  }

  .login-form-section {
    padding: 30px 24px;
  }
}

@media (max-width: 768px) {
  .login-card {
    flex-direction: column;
    width: 95%;
    max-width: 400px;
    height: auto;
  }

  .login-illustration {
    flex: none;
    padding: 30px;
    height: 200px;
  }

  .illustration-content {
    height: 100%;
  }

  .illustration-image {
    max-width: 250px;
    max-height: 150px;
  }

  .login-form-section {
    flex: none;
    padding: 24px 32px 32px;
  }

  .login-header h1 {
    font-size: 18px;
  }
}

@media (max-width: 480px) {
  .login-container {
    padding: 16px;
  }

  .login-card {
    width: 100%;
    max-width: 350px;
  }

  .login-illustration {
    padding: 20px;
    height: 160px;
  }

  .illustration-image {
    max-width: 200px;
    max-height: 120px;
  }

  .login-form-section {
    padding: 20px 24px 24px;
  }

  .logo-section {
    top: 20px;
    left: 20px;
  }

  .logo-text {
    font-size: 18px;
  }
}
</style>
