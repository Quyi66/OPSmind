<template>
  <div class="h-full">
    <!-- 8等份垂直布局容器 -->
    <div class="flex flex-col h-full">
      <!-- 上边距 (2) -->
      <div class="flex-[2]"></div>

      <!-- 用户登录标题 (1) -->
      <div class="flex-1 flex items-center">
        <h2 class="text-lg font-medium text-gray-800">用户登录</h2>
      </div>

      <!-- Loading State -->
      <div
        v-if="initializing"
        class="flex-[4] flex items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <div class="text-center">
          <div
            class="inline-block animate-spin rounded-full h-5 w-5 border-3 border-blue-500 border-t-transparent"
            aria-hidden="true"
          ></div>
          <p class="mt-2 text-gray-600 text-xs font-medium">正在初始化登录页面...</p>
          <span class="sr-only">页面加载中，请稍候</span>
        </div>
      </div>

      <!-- Login Form -->
      <template v-else>
        <!-- 用户名输入框 (1) -->
        <div class="flex-1 flex items-center">
          <div class="w-full">
            <!-- Error Message -->
            <div
              v-if="authError"
              class="mb-2 p-2 bg-red-50 border-l-3 border-red-400 rounded"
              role="alert"
              aria-live="assertive"
            >
              <p class="text-xs font-medium text-red-800">{{ errorMessage }}</p>
            </div>

            <label for="username" class="sr-only">用户名</label>
            <input
              id="username"
              v-model="loginForm.username"
              type="text"
              placeholder="用户名"
              autocomplete="username"
              spellcheck="false"
              class="w-full px-4 py-3.5 text-base border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-200 placeholder-gray-500 disabled:bg-gray-100 disabled:text-gray-500"
              :class="{
                'border-red-300 focus:ring-red-500': authError && !loginForm.username
              }"
              :disabled="loading"
              :aria-invalid="authError && !loginForm.username ? 'true' : 'false'"
              :aria-describedby="authError && !loginForm.username ? 'username-error' : undefined"
              required
            />
          </div>
        </div>

        <!-- 密码输入框 (1) -->
        <div class="flex-1 flex items-center">
          <div class="w-full">
            <label for="password" class="sr-only">密码</label>
            <input
              id="password"
              v-model="loginForm.password"
              type="password"
              placeholder="密码"
              autocomplete="current-password"
              spellcheck="false"
              class="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-200 placeholder-gray-500 disabled:bg-gray-100 disabled:text-gray-500"
              :class="{
                'border-red-300 focus:ring-red-500': authError && !loginForm.password
              }"
              :disabled="loading"
              :aria-invalid="authError && !loginForm.password ? 'true' : 'false'"
              :aria-describedby="authError && !loginForm.password ? 'password-error' : undefined"
              @keyup.enter="handleLogin"
              required
            />

            <!-- OTP Field (if enabled) -->
            <div v-if="showOTP" class="mt-2">
              <label for="otp" class="sr-only">动态验证码</label>
              <input
                id="otp"
                v-model="loginForm.otpCode"
                type="text"
                placeholder="动态验证码"
                autocomplete="one-time-code"
                spellcheck="false"
                inputmode="numeric"
                pattern="[0-9]*"
                class="w-full px-3 py-2 text-xs border border-gray-300 rounded bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-200 placeholder-gray-500 disabled:bg-gray-100 disabled:text-gray-500 text-center tracking-widest"
                :disabled="loading"
                maxlength="6"
                @keyup.enter="handleLogin"
              />
            </div>

            <!-- Remember Me Checkbox -->
            <div class="mt-2 flex items-center">
              <input
                id="remember"
                v-model="loginForm.rememberMe"
                type="checkbox"
                class="w-3 h-3 text-blue-600 bg-white border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 transition-colors duration-200 disabled:opacity-50"
                :disabled="loading"
              />
              <label for="remember" class="ml-2 text-xs text-gray-600 cursor-pointer select-none">
                保持登录状态
              </label>
            </div>
          </div>
        </div>

        <!-- 登录按钮 (1) -->
        <div class="flex-1 flex items-center">
          <button
            type="submit"
            class="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="loading || !loginForm.username || !loginForm.password"
            :aria-label="loading ? '登录中，请稍候' : '登录'"
            @click="handleLogin"
          >
            <span v-if="loading" class="flex items-center justify-center">
              <svg
                class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>登录中...</span>
            </span>
            <span v-else>登录</span>
          </button>
        </div>
      </template>

      <!-- 下边距 (1) -->
      <div class="flex-1"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { authService } from '@/core/auth'

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
