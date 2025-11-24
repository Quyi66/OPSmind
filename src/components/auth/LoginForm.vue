<template>
  <div class="h-full">
    <!-- 优化的垂直布局容器：使用固定内边距与间距，移除上下挤压 -->
    <div class="flex flex-col h-full px-1 py-6 justify-center">
      <!-- 用户登录标题 -->
      <div class="-mt-2 mb-6">
        <h2 class="text-lg font-medium text-gray-800 text-left">用户登录</h2>
      </div>

      <!-- Login Form -->
      <!-- 表单区域（语义化 form，便于键盘提交与无障碍） -->
      <form class="space-y-6" @submit.prevent="handleLogin" novalidate>
        <!-- Error Message -->
        <div
          v-if="authError"
          class="p-3 bg-red-50 border border-red-200 rounded"
          role="alert"
          aria-live="assertive"
        >
          <p class="text-sm font-medium text-red-800">{{ errorMessage }}</p>
        </div>

        <!-- 用户名输入框 -->
        <div>
          <label for="username" class="sr-only">用户名</label>
          <input
            id="username"
            v-model="loginForm.username"
            type="text"
            placeholder="用户名"
            autocomplete="username"
            spellcheck="false"
            class="w-full h-10 px-4 text-sm border border-transparent rounded bg-gray-50 focus:outline-none focus:ring-0 focus:border-blue-500 focus:bg-white transition-all duration-200 placeholder-gray-500 disabled:bg-gray-100 disabled:text-gray-500"
            :class="{
              'border-red-300 focus:ring-red-500 focus:bg-red-50': authError && !loginForm.username
            }"
            :disabled="loading"
            :aria-invalid="authError && !loginForm.username ? 'true' : 'false'"
            :aria-describedby="authError && !loginForm.username ? 'username-error' : undefined"
            required
          />
        </div>

        <!-- 密码输入框 -->
        <div>
          <label for="password" class="sr-only">密码</label>
          <div class="relative">
            <input
              id="password"
              v-model="loginForm.password"
              type="password"
              placeholder="密码"
              autocomplete="current-password"
              spellcheck="false"
              class="w-full h-10 px-4 text-sm border border-transparent rounded bg-gray-50 focus:outline-none focus:ring-0 focus:border-blue-500 focus:bg-white transition-all duration-200 placeholder-gray-500 disabled:bg-gray-100 disabled:text-gray-500"
              :class="{
                'border-red-300 focus:ring-red-500 focus:bg-red-50':
                  authError && !loginForm.password
              }"
              :disabled="loading"
              :aria-invalid="authError && !loginForm.password ? 'true' : 'false'"
              :aria-describedby="
                [
                  authError && !loginForm.password ? 'password-error' : '',
                  capsLockOn ? 'capslock-hint' : ''
                ]
                  .filter(Boolean)
                  .join(' ') || undefined
              "
              @keyup="checkCaps"
              @keydown="checkCaps"
              required
            />
          </div>
          <p
            v-if="capsLockOn"
            id="capslock-hint"
            class="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 inline-block"
          >
            大写锁定已开启，可能导致密码错误
          </p>
        </div>

        <!-- OTP Field (if enabled) -->
        <div v-if="showOTP">
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
            class="w-full h-10 px-4 text-sm border border-transparent rounded bg-gray-50 focus:outline-none focus:ring-0 focus:border-blue-500 focus:bg-white transition-all duration-200 placeholder-gray-500 disabled:bg-gray-100 disabled:text-gray-500 text-center tracking-widest"
            :disabled="loading"
            maxlength="6"
          />
        </div>

        <!-- Remember Me -->
        <div class="flex items-center">
          <input
            id="remember"
            v-model="loginForm.rememberMe"
            type="checkbox"
            class="w-4 h-4 text-blue-600 bg-white border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 transition-colors duration-200 disabled:opacity-50"
            :disabled="loading"
          />
          <label for="remember" class="ml-2 text-sm text-gray-600 cursor-pointer select-none">
            保持登录状态
          </label>
        </div>

        <!-- 登录按钮 -->
        <div>
          <button
            type="submit"
            class="w-full h-10 bg-blue-500 text-white px-4 rounded font-medium text-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition-all duration-200 disabled:cursor-not-allowed shadow-sm"
            :disabled="loading || !loginForm.username || !loginForm.password"
            :aria-label="loading ? '登录中，请稍候' : '登录'"
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
      </form>

      <!-- 固定底部间距通过父容器 py 控制，无需额外挤压占位 -->
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { authService } from '@/core/auth'
import { accountService } from '@/core/account'

const router = useRouter()

// 本地存储键名
const REMEMBER_KEY = 'ops_remember_me'
const LAST_USERNAME_KEY = 'ops_last_login_username'

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
const capsLockOn = ref(false)

const checkCaps = e => {
  try {
    capsLockOn.value = !!e.getModifierState && e.getModifierState('CapsLock')
    // eslint-disable-next-line no-unused-vars
  } catch (_) {
    capsLockOn.value = false
  }
}

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

    //console.log('🔐 Attempting login:', loginForm.username)

    const result = await authService.login({
      username: loginForm.username,
      password: loginForm.password,
      otpCode: loginForm.otpCode,
      rememberMe: loginForm.rememberMe
    })

    //console.log('✅ Login successful:', result)
    ElMessage.success('登录成功')

    // 确保认证状态已更新，然后跳转到仪表盘
    await new Promise(resolve => setTimeout(resolve, 100))

    // 验证认证状态
    const isAuthenticated = authService.isAuthenticated()
    const currentUser = authService.getCurrentUser()
    //console.log('🔍 Auth status before navigation:', {
    //   isAuthenticated,
    //   hasUser: !!currentUser,
    //   userLogin: currentUser?.login
    // })

    // 持久化“保持登录状态”偏好与最后登录用户名
    try {
      localStorage.setItem(REMEMBER_KEY, String(!!loginForm.rememberMe))
      if (loginForm.rememberMe) {
        localStorage.setItem(LAST_USERNAME_KEY, loginForm.username || '')
      } else {
        localStorage.removeItem(LAST_USERNAME_KEY)
      }
    } catch {
      /* empty */
    }

    // 登录成功后通知所有iframe模块更新认证状态
    await notifyIframeModulesAuthUpdate()

    // 登录成功后获取并缓存账户信息（优先 fullName 展示）
    try {
      await accountService.getAccount({ forceRefresh: true })
      //console.log('✅ Account info fetched and cached after login')
    } catch (e) {
      console.warn('⚠️ Failed to fetch account info after login:', e)
    }

    //console.log('🔄 Navigating to home...')
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
    //console.log('🚀 [Login] Starting iframe modules auth update notification...')

    // 使用单iframe管理器发送认证更新
    try {
      const { singleIframeManager } = await import('@/utils/single-iframe-manager')
      //console.log('🔗 [Login] Using SingleIframeManager for auth broadcast')
      singleIframeManager.sendAuthData()
    } catch (error) {
      console.warn('⚠️ [Login] Failed to load iframe manager:', error)
    }

    // 认证数据已通过URL参数传递给iframe，无需postMessage
    const iframes = document.querySelectorAll('iframe')
    //console.log(`🔗 [Login] Found ${iframes.length} iframes - auth data passed via URL`)

    if (iframes.length > 0) {
      const token = authService.getToken()
      const user = authService.getCurrentUser()

      if (token && user) {
        //console.log('✅ [Login] Auth data available and passed via URL to iframes:', {
        //   hasToken: !!token,
        //   userLogin: user.login,
        //   tenantId: user.tenantId,
        //   iframeCount: iframes.length
        // })
      } else {
        console.warn('⚠️ [Login] No auth data available:', {
          hasToken: !!token,
          hasUser: !!user
        })
      }
    }

    //console.log('✅ [Login] Auth update notification completed successfully')
  } catch (error) {
    console.error('❌ [Login] Failed to notify iframe modules:', error)
  }
}

const initializeLoginPage = async () => {
  try {
    initializing.value = true
    //console.log('🔄 Initializing login page...')

    const result = await authService.initializeLogin()

    tenants.value = result.tenants || []
    licenseInfo.value = result.license
    showOTP.value = result.otpEnabled || false

    //console.log('✅ Login page initialized successfully')
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
  // 读取“保持登录状态”与最近登录用户名
  try {
    const remembered = localStorage.getItem(REMEMBER_KEY)
    if (remembered != null) {
      loginForm.rememberMe = remembered === 'true'
    }
    if (loginForm.rememberMe) {
      const lastUser = localStorage.getItem(LAST_USERNAME_KEY)
      if (lastUser) loginForm.username = lastUser
    }
  } catch {
    /* empty */
  }

  initializeLoginPage()
})

// 在勾选变化时立即保存偏好
watch(
  () => loginForm.rememberMe,
  val => {
    try {
      localStorage.setItem(REMEMBER_KEY, String(!!val))
      if (!val) {
        localStorage.removeItem(LAST_USERNAME_KEY)
      }
    } catch {
      /* empty */
    }
  }
)
</script>
