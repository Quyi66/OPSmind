<template>
  <div class="min-h-screen login-background relative overflow-hidden">
    <!-- Background Pattern -->
    <div class="absolute inset-0 opacity-20">
      <div class="absolute top-20 left-20 w-2 h-2 bg-white rounded-full"></div>
      <div class="absolute top-32 left-40 w-1 h-1 bg-white rounded-full"></div>
      <div class="absolute top-40 left-60 w-2 h-2 bg-white rounded-full"></div>
      <div class="absolute top-60 left-80 w-1 h-1 bg-white rounded-full"></div>
      <div class="absolute top-80 left-32 w-2 h-2 bg-white rounded-full"></div>
      <div class="absolute bottom-40 right-40 w-2 h-2 bg-white rounded-full"></div>
      <div class="absolute bottom-60 right-60 w-1 h-1 bg-white rounded-full"></div>
      <div class="absolute bottom-80 right-80 w-2 h-2 bg-white rounded-full"></div>
      <!-- Dotted pattern -->
      <div class="absolute bottom-0 right-0 w-96 h-96 opacity-30">
        <div class="grid grid-cols-12 gap-2 p-8">
          <div v-for="i in 144" :key="i" class="w-1 h-1 bg-white rounded-full"></div>
        </div>
      </div>
    </div>

    <!-- Header -->
    <header class="relative z-10 p-6">
      <div class="flex items-center">
        <img src="@/assets/icons/logo@2x.png" alt="OpsMind" class="h-10 w-auto object-contain" />
      </div>
    </header>

    <!-- Main Content -->
    <div class="relative z-10 flex items-center justify-center min-h-[calc(100vh-120px)]">
      <div class="bg-white rounded-2xl shadow-2xl overflow-hidden w-[768px] h-[480px] border border-gray-100">
        <div class="flex h-full">
          <!-- Left Side - Illustration -->
          <div class="w-1/2 relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <div class="absolute inset-0 bg-gradient-to-br from-blue-400/5 via-indigo-400/5 to-purple-400/5"></div>
            <img
              src="@/assets/images/login-illu@2x.png"
              alt="OpsMind Login Illustration"
              class="w-full h-full object-cover drop-shadow-lg"
              loading="eager"
            />
          </div>

          <!-- Right Side - Login Form -->
          <div class="w-1/2 bg-gradient-to-br from-gray-50/50 to-white flex flex-col justify-center p-12">
            <div class="w-full max-w-sm mx-auto">
              <!-- Loading State -->
              <div v-if="initializing" class="text-center py-8" role="status" aria-live="polite">
                <div class="inline-block animate-spin rounded-full h-6 w-6 border-3 border-blue-500 border-t-transparent" aria-hidden="true"></div>
                <p class="mt-3 text-gray-600 text-sm font-medium">正在初始化登录页面...</p>
                <span class="sr-only">页面加载中，请稍候</span>
              </div>

              <!-- Login Form - Modern 5 Row Layout -->
              <form v-else @submit.prevent="handleLogin" class="space-y-5" novalidate>
                <!-- Error Message -->
                <div
                  v-if="authError"
                  class="p-4 bg-red-50 border-l-4 border-red-400 rounded-lg"
                  role="alert"
                  aria-live="assertive"
                >
                  <div class="flex items-start">
                    <svg
                      class="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                    <div>
                      <p class="text-sm font-medium text-red-800">登录失败</p>
                      <p class="text-sm text-red-700 mt-1">{{ errorMessage }}</p>
                    </div>
                  </div>
                </div>

                <!-- Row 1: Username Field -->
                <div class="form-group">
                  <label for="username" class="sr-only">用户名</label>
                  <div class="relative group">
                    <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                      <svg
                        class="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                      </svg>
                    </div>
                    <input
                      id="username"
                      v-model="loginForm.username"
                      type="text"
                      placeholder="用户名"
                      autocomplete="username"
                      spellcheck="false"
                      class="w-full pl-12 pr-4 py-4 text-base border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400 hover:shadow-sm placeholder-gray-500 disabled:bg-gray-50 disabled:text-gray-500"
                      :class="{ 'border-red-300 focus:ring-red-500': authError && !loginForm.username }"
                      :disabled="loading"
                      :aria-invalid="authError && !loginForm.username ? 'true' : 'false'"
                      :aria-describedby="authError && !loginForm.username ? 'username-error' : undefined"
                      required
                    />
                  </div>
                  <p v-if="authError && !loginForm.username" id="username-error" class="mt-1 text-sm text-red-600" role="alert">
                    请输入用户名
                  </p>
                </div>

                <!-- Row 2: Password Field -->
                <div class="form-group">
                  <label for="password" class="sr-only">密码</label>
                  <div class="relative group">
                    <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                      <svg
                        class="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
                      </svg>
                    </div>
                    <input
                      id="password"
                      v-model="loginForm.password"
                      type="password"
                      placeholder="密码"
                      autocomplete="current-password"
                      spellcheck="false"
                      class="w-full pl-12 pr-4 py-4 text-base border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400 hover:shadow-sm placeholder-gray-500 disabled:bg-gray-50 disabled:text-gray-500"
                      :class="{ 'border-red-300 focus:ring-red-500': authError && !loginForm.password }"
                      :disabled="loading"
                      :aria-invalid="authError && !loginForm.password ? 'true' : 'false'"
                      :aria-describedby="authError && !loginForm.password ? 'password-error' : undefined"
                      @keyup.enter="handleLogin"
                      required
                    />
                  </div>
                  <p v-if="authError && !loginForm.password" id="password-error" class="mt-1 text-sm text-red-600" role="alert">
                    请输入密码
                  </p>
                </div>

                <!-- Row 3: OTP Field (if enabled) -->
                <div v-if="showOTP" class="form-group">
                  <label for="otp" class="sr-only">动态验证码</label>
                  <div class="relative group">
                    <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                      <svg
                        class="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path fill-rule="evenodd" d="M18 8A6 6 0 006 8v2.133a2 2 0 00-1.2 1.8L4 17.2a2 2 0 002 2h8a2 2 0 002-2l-.8-5.267A2 2 0 0014 10.133V8zM8 8a2 2 0 114 0v2H8V8z" clip-rule="evenodd" />
                      </svg>
                    </div>
                    <input
                      id="otp"
                      v-model="loginForm.otpCode"
                      type="text"
                      placeholder="动态验证码"
                      autocomplete="one-time-code"
                      spellcheck="false"
                      inputmode="numeric"
                      pattern="[0-9]*"
                      class="w-full pl-12 pr-4 py-4 text-base border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400 hover:shadow-sm placeholder-gray-500 disabled:bg-gray-50 disabled:text-gray-500 text-center tracking-widest"
                      :disabled="loading"
                      maxlength="6"
                      @keyup.enter="handleLogin"
                    />
                  </div>
                  <p class="mt-1 text-xs text-gray-500 text-center">请输入6位动态验证码</p>
                </div>

                <!-- Row 4: Remember Me Checkbox -->
                <div class="form-group">
                  <div class="flex items-center">
                    <input
                      id="remember"
                      v-model="loginForm.rememberMe"
                      type="checkbox"
                      class="w-4 h-4 text-blue-600 bg-white border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 transition-colors duration-200 disabled:opacity-50"
                      :disabled="loading"
                    />
                    <label for="remember" class="ml-3 text-sm font-medium text-gray-700 cursor-pointer select-none">
                      保持登录状态
                    </label>
                  </div>
                </div>

                <!-- Row 5: Login Button -->
                <button
                  type="submit"
                  class="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-xl font-semibold text-base shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-lg"
                  :disabled="loading || !loginForm.username || !loginForm.password"
                  :aria-label="loading ? '登录中，请稍候' : '登录到 OpsMind'"
                >
                  <span v-if="loading" class="flex items-center justify-center">
                    <svg
                      class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>登录中...</span>
                  </span>
                  <span v-else class="flex items-center justify-center">
                    <svg
                      class="w-5 h-5 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path fill-rule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                    <span>登录</span>
                  </span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { authService } from '@/core/auth'

// Re-export ElMessage for template usage
const { ElMessage: ElMessageInstance } = { ElMessage }

const router = useRouter()

const loginForm = reactive({
  username: '',
  password: '',
  otpCode: '',
  rememberMe: false
})

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
    // 简单的表单验证
    if (!loginForm.username || !loginForm.password) {
      authError.value = true
      errorMessage.value = '请输入用户名和密码'
      return
    }

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

// 通知所有iframe模块认证状态更新
const notifyIframeModulesAuthUpdate = async () => {
  try {
    console.log('🚀 [Login] Starting iframe modules auth update notification...')

    // 使用单iframe管理器发送认证更新
    try {
      const { singleIframeManager } = await import('@/utils/single-iframe-manager')
      console.log('🔗 [Login] Using SingleIframeManager for auth broadcast')
      singleIframeManager.sendAuthData()
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
})
</script>

<style scoped>
/* Login Background */
.login-background {
  background-image: url('@/assets/images/bg-login@2x.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

/* 自定义动画 */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}

/* Tailwind CSS 样式已经通过类名应用，这里只需要添加自定义动画 */


</style>
