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
      <div class="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full mx-4">
        <div class="flex">
          <!-- Left Side - Illustration -->
          <div class="hidden md:flex md:w-1/2 bg-gradient-to-br from-blue-50 to-blue-100 items-center justify-center p-12">
            <div class="relative">
              <!-- Login Illustration -->
              <img src="@/assets/images/login-illu@2x.png" alt="Login Illustration" class="w-80 h-80 object-contain" />
            </div>
          </div>

          <!-- Right Side - Login Form -->
          <div class="w-full md:w-1/2 p-12 flex items-center justify-center">
            <div class="max-w-sm w-full">
              <h2 class="text-2xl font-bold text-gray-800 mb-8 text-center">用户登录</h2>

              <div v-if="initializing" class="text-center py-8">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p class="mt-4 text-gray-600">正在初始化登录页面...</p>
              </div>

              <form v-else @submit.prevent="handleLogin" class="space-y-6">
                <div v-if="authError" class="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p class="text-sm text-red-800">{{ errorMessage }}</p>
                </div>

                <div>
                  <input
                    v-model="loginForm.username"
                    type="text"
                    placeholder="用户名"
                    autocomplete="username"
                    class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                    :disabled="loading"
                    required
                  />
                </div>

                <div>
                  <input
                    v-model="loginForm.password"
                    type="password"
                    placeholder="密码"
                    autocomplete="current-password"
                    class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                    :disabled="loading"
                    @keyup.enter="handleLogin"
                    required
                  />
                </div>

                <div v-if="showOTP">
                  <input
                    v-model="loginForm.otpCode"
                    type="text"
                    placeholder="动态验证码"
                    autocomplete="one-time-code"
                    class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                    :disabled="loading"
                    maxlength="6"
                    @keyup.enter="handleLogin"
                  />
                </div>

                <div class="flex items-center">
                  <input
                    v-model="loginForm.rememberMe"
                    type="checkbox"
                    id="remember"
                    class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    :disabled="loading"
                  />
                  <label for="remember" class="ml-2 text-sm text-gray-600">
                    保持登录状态
                  </label>
                </div>

                <button
                  type="submit"
                  class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 font-medium"
                  :disabled="loading"
                >
                  <span v-if="loading">登录中...</span>
                  <span v-else>登录</span>
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
