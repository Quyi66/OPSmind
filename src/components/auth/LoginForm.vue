<template>
  <div class="login-form-shell">
    <!-- 品牌标题 -->
    <div class="login-heading">
      <h1>KoreOPS</h1>
    </div>

    <!-- 密码登录表单主区域 -->
    <form
      class="login-form-content"
      :class="{ 'login-form-content--with-otp': showOTP }"
      autocomplete="on"
      @submit.prevent="handleLogin"
      novalidate
    >
      <!-- Error Alert -->
      <div v-if="authError" class="login-error" role="alert" aria-live="assertive">
        <svg aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p>{{ errorMessage }}</p>
      </div>

      <!-- 用户名框 -->
      <div class="login-field login-field--username">
        <label for="username">用户名</label>
        <input
          id="username"
          name="username"
          v-model="loginForm.username"
          type="text"
          placeholder="请输入用户名"
          autocomplete="username"
          spellcheck="false"
          class="login-text-input login-text-input--username"
          :class="{
            'login-text-input--error': authError && !loginForm.username
          }"
          :disabled="loading"
          :aria-invalid="authError && !loginForm.username ? 'true' : 'false'"
          required
        />
      </div>

      <!-- 密码框 -->
      <div class="login-field login-field--password">
        <label for="password">密码</label>
        <div class="login-password-control">
          <input
            id="password"
            name="password"
            v-model="loginForm.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="请输入密码"
            autocomplete="current-password"
            spellcheck="false"
            class="login-text-input login-text-input--password"
            :class="{ 'login-text-input--error': authError && !loginForm.password }"
            :disabled="loading"
            :aria-invalid="authError && !loginForm.password ? 'true' : 'false'"
            :aria-describedby="capsLockOn ? 'capslock-hint' : undefined"
            @keyup="checkCaps"
            @keydown="checkCaps"
            required
          />
          <button
            type="button"
            class="password-visibility-button"
            :disabled="loading"
            :aria-label="showPassword ? '隐藏密码' : '显示密码'"
            :aria-pressed="showPassword"
            @click="showPassword = !showPassword"
          >
            <svg v-if="showPassword" aria-hidden="true" viewBox="0 0 24 24">
              <path d="M3 3l18 18" />
              <path d="M10.6 10.6a2 2 0 002.8 2.8" />
              <path
                d="M9.9 5.3A10.7 10.7 0 0112 5.1c6.2 0 9.5 6.9 9.5 6.9a15.9 15.9 0 01-2.5 3.5M6.2 6.2C3.8 7.8 2.5 12 2.5 12s3.3 6.9 9.5 6.9a9.7 9.7 0 004.1-.9"
              />
            </svg>
            <svg v-else aria-hidden="true" viewBox="0 0 24 24">
              <path d="M2.5 12s3.3-6.9 9.5-6.9 9.5 6.9 9.5 6.9-3.3 6.9-9.5 6.9S2.5 12 2.5 12z" />
              <circle cx="12" cy="12" r="2.6" />
            </svg>
          </button>
        </div>
        <p v-if="capsLockOn" id="capslock-hint" class="caps-lock-hint">大写锁定已开启</p>
      </div>

      <!-- OTP Field (if enabled) -->
      <div v-if="showOTP" class="login-field login-field--otp">
        <label for="otp">动态验证码</label>
        <input
          id="otp"
          v-model="loginForm.otpCode"
          type="text"
          placeholder="请输入 6 位动态验证码"
          autocomplete="one-time-code"
          spellcheck="false"
          inputmode="numeric"
          pattern="[0-9]*"
          class="login-text-input login-text-input--otp"
          :disabled="loading"
          maxlength="6"
        />
      </div>

      <!-- Options Row -->
      <div class="login-options">
        <label>
          <input
            v-model="loginForm.rememberMe"
            type="checkbox"
            name="rememberMe"
            :disabled="loading"
          />
          <span>保持登录状态</span>
        </label>
      </div>

      <!-- 登录按钮 -->
      <div class="login-submit-wrap">
        <button
          type="submit"
          class="login-submit-button"
          :class="{ 'login-submit-button--loading': loading }"
          :disabled="loading || !loginForm.username || !loginForm.password"
          :aria-label="loading ? '登录中，请稍候' : '登录'"
        >
          <span v-if="loading" class="login-loading">
            <svg aria-hidden="true" class="animate-spin" fill="none" viewBox="0 0 24 24">
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
  rememberMe: true
})

const loading = ref(false)
const authError = ref(false)
const errorMessage = ref('')
const showOTP = ref(false)
const initializing = ref(true)
const tenants = ref([])
const licenseInfo = ref(null)
const capsLockOn = ref(false)
const showPassword = ref(false)

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

    const result = await authService.login({
      username: loginForm.username,
      password: loginForm.password,
      otpCode: loginForm.otpCode,
      rememberMe: loginForm.rememberMe
    })

    if (result.success !== true) {
      ElMessage.error('用户名或密码错误')
      return
    }
    ElMessage.success('登录成功')

    // 确保认证状态已更新，然后跳转到仪表盘
    await new Promise(resolve => setTimeout(resolve, 100))

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
      const account = await accountService.getAccount({
        forceRefresh: true,
        persist: !!loginForm.rememberMe
      })
      authService.applyAccountInfo(account)
      if (account) {
        await authService.syncUserApplets(account, {
          forceRefresh: true,
          persist: !!loginForm.rememberMe
        })
      }
    } catch (e) {
      console.warn('⚠️ Failed to fetch account info after login:', e)
    }

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
    // 使用单iframe管理器发送认证更新
    try {
      const { singleIframeManager } = await import('@/utils/single-iframe-manager')
      singleIframeManager.sendAuthData()
    } catch (error) {
      console.warn('⚠️ [Login] Failed to load iframe manager:', error)
    }

    // 认证数据已通过URL参数传递给iframe，无需postMessage
    const iframes = document.querySelectorAll('iframe')

    if (iframes.length > 0) {
      const token = authService.getToken()
      const user = authService.getCurrentUser()

      if (token && user) {
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
  } catch (error) {
    console.error('❌ [Login] Failed to notify iframe modules:', error)
  }
}

const initializeLoginPage = async () => {
  try {
    initializing.value = true

    const result = await authService.initializeLogin()

    tenants.value = result.tenants || []
    licenseInfo.value = result.license
    showOTP.value = result.otpEnabled || false
  } catch (error) {
    console.error('❌ Failed to initialize login page:', error)
    // 即使初始化失败，也允许用户尝试登录
  } finally {
    initializing.value = false

    // 自动聚焦到用户名输入框
    setTimeout(() => {
      const usernameInput = document.getElementById('username')
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

<style scoped>
.login-form-shell {
  position: relative;
  width: 100%;
  height: 100%;
  color: #344054;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.login-heading {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 15.461347cqh;
}

.login-heading h1 {
  margin: 0;
  color: #0088ee;
  font-family: 'Arial Black', Arial, 'Helvetica Neue', sans-serif;
  font-size: 8.333333cqw;
  font-style: italic;
  font-weight: 900;
  letter-spacing: 0.208333cqw;
  line-height: 15.461347cqh;
  text-shadow: 0 0.498753cqh 1.666667cqw rgba(0, 136, 238, 0.1);
  user-select: none;
}

.login-form-content {
  position: relative;
  width: 100%;
  margin-top: 7.481297cqh;
}

.login-error {
  position: absolute;
  top: -7.23192cqh;
  left: 0;
  display: flex;
  align-items: center;
  gap: 1.25cqw;
  max-width: 100%;
  min-height: 5.985037cqh;
  padding: 0 1.666667cqw;
  color: #e5484d;
  font-size: 2.5cqw;
  line-height: 4.488778cqh;
  border: 1px solid rgba(229, 72, 77, 0.32);
  border-radius: 0.833333cqw;
  background: rgba(255, 245, 245, 0.92);
}

.login-error svg {
  width: 2.916667cqw;
  height: 3.491272cqh;
  flex: 0 0 auto;
}

.login-error p {
  margin: 0;
}

.login-field {
  position: relative;
  width: 100%;
}

.login-field label {
  display: block;
  height: 4.987531cqh;
  color: #344054;
  font-size: 3.75cqw;
  font-weight: 500;
  line-height: 4.987531cqh;
  text-align: left;
}

.login-field--username {
  margin-bottom: 6.234414cqh;
}

.login-field--username label {
  margin-bottom: 2.992519cqh;
}

.login-field--password label,
.login-field--otp label {
  margin-bottom: 2.992519cqh;
}

.login-field--otp {
  margin-top: 6.234414cqh;
}

.login-text-input {
  box-sizing: border-box;
  display: block;
  width: 100%;
  padding: 0 3.125cqw;
  color: #27364a;
  font-family: 'Source Code Pro', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 3.75cqw;
  font-weight: 400;
  line-height: 1;
  border: 1px solid #d9e0e8;
  border-radius: 1.041667cqw;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: inset 0 1px 2px rgba(40, 75, 115, 0.035);
  outline: none;
  transition:
    border-color 0.16s ease,
    background-color 0.16s ease,
    box-shadow 0.16s ease;
}

.login-text-input--username {
  height: 12.468828cqh;
}

.login-text-input--password,
.login-text-input--otp {
  height: 10.972569cqh;
}

.login-password-control {
  position: relative;
  width: 100%;
}

.login-password-control .login-text-input {
  padding-right: 10cqw;
}

.password-visibility-button {
  position: absolute;
  top: 50%;
  right: 2.083333cqw;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 6.666667cqw;
  height: 7.98005cqh;
  padding: 0;
  color: #7a8ba0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  transform: translateY(-50%);
  transition:
    color 0.16s ease,
    background-color 0.16s ease;
}

.password-visibility-button:hover:not(:disabled) {
  color: #0088ee;
  background: rgba(0, 136, 238, 0.07);
}

.password-visibility-button:focus-visible {
  outline: 0.416667cqw solid rgba(0, 136, 238, 0.32);
  outline-offset: 0.208333cqw;
}

.password-visibility-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.password-visibility-button svg {
  width: 3.75cqw;
  height: 4.488778cqh;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.login-text-input::placeholder {
  color: #aeb7c2;
  opacity: 1;
}

.login-text-input:not(.login-text-input--error):-webkit-autofill,
.login-text-input:not(.login-text-input--error):-webkit-autofill:hover {
  caret-color: #27364a;
  -webkit-text-fill-color: #27364a;
  -webkit-box-shadow:
    0 0 0 1000px #ffffff inset,
    inset 0 1px 2px rgba(40, 75, 115, 0.035);
  transition: background-color 9999s ease-out 0s;
}

.login-text-input:hover:not(:disabled) {
  border-color: #b7c5d4;
}

.login-text-input:focus {
  border-color: #0088ee;
  background: #ffffff;
  box-shadow:
    0 0 0 0.625cqw rgba(0, 136, 238, 0.09),
    inset 0 1px 2px rgba(40, 75, 115, 0.025);
}

.login-text-input:not(.login-text-input--error):-webkit-autofill:focus {
  -webkit-box-shadow:
    0 0 0 1000px #ffffff inset,
    0 0 0 0.625cqw rgba(0, 136, 238, 0.09),
    inset 0 1px 2px rgba(40, 75, 115, 0.025);
}

.login-text-input:disabled {
  cursor: not-allowed;
}

.caps-lock-hint {
  position: absolute;
  top: calc(100% + 0.74813cqh);
  left: 0;
  margin: 0;
  color: #9a6700;
  font-size: 2.291667cqw;
  line-height: 4.488778cqh;
}

.login-options {
  height: 4.239401cqh;
  margin-top: 6.234414cqh;
}

.login-options label {
  position: relative;
  top: -1.870324cqh;
  display: inline-flex;
  align-items: center;
  gap: 0;
  height: 7.98005cqh;
  color: #005cb2;
  font-family: 'Source Code Pro', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 2.708333cqw;
  font-weight: 400;
  line-height: 4.239401cqh;
  cursor: pointer;
  user-select: none;
}

.login-options input {
  appearance: none;
  width: 2.916667cqw;
  height: 3.491272cqh;
  margin: 0 1.145833cqw;
  flex: 0 0 auto;
  border: 1px solid #005cb2;
  border-radius: 0.625cqw;
  background: transparent;
  cursor: pointer;
  transition:
    border-color 0.16s ease,
    background-color 0.16s ease,
    box-shadow 0.16s ease;
}

.login-options input:checked {
  border-color: #0088ee;
  background-color: #0088ee;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 10'%3E%3Cpath d='M1 5l3 3 7-7' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: center;
  background-size: 72% 72%;
}

.login-options input:hover:not(:disabled) {
  border-color: #0088ee;
  box-shadow: 0 0 0 0.416667cqw rgba(0, 136, 238, 0.08);
}

.login-options input:focus-visible {
  outline: 0.416667cqw solid rgba(0, 136, 238, 0.28);
  outline-offset: 0.416667cqw;
}

.login-options input:disabled,
.login-options input:disabled + span {
  cursor: not-allowed;
}

.login-submit-wrap {
  width: 100%;
  height: 13.466334cqh;
  margin-top: 7.481297cqh;
}

.login-submit-button {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 0;
  color: #ffffff;
  font-family: 'Source Code Pro', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 4.166667cqw;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0;
  border: 0;
  border-radius: 1.25cqw;
  background: linear-gradient(100deg, #078fe9 0%, #0088ee 55%, #087fe2 100%);
  box-shadow: 0 1.995012cqh 3.75cqw rgba(0, 111, 205, 0.16);
  cursor: pointer;
  transition:
    transform 0.16s ease,
    background 0.16s ease,
    box-shadow 0.16s ease;
}

.login-submit-button:hover:not(:disabled) {
  transform: translateY(-1px);
  background: linear-gradient(100deg, #0088ee 0%, #007edc 100%);
  box-shadow: 0 2.493766cqh 4.583333cqw rgba(0, 111, 205, 0.2);
}

.login-submit-button:active:not(:disabled) {
  transform: translateY(0);
  background: #0078d2;
  box-shadow: 0 0.997506cqh 2.083333cqw rgba(0, 111, 205, 0.15);
}

.login-submit-button:focus-visible {
  outline: 0.416667cqw solid rgba(0, 136, 238, 0.35);
  outline-offset: 0.416667cqw;
}

.login-submit-button:disabled {
  color: rgba(255, 255, 255, 0.92);
  background: linear-gradient(100deg, #91c5e8 0%, #83bde5 100%);
  box-shadow: none;
  cursor: not-allowed;
}

.login-submit-button--loading:disabled {
  color: #ffffff;
  background: linear-gradient(100deg, #078fe9 0%, #0088ee 55%, #087fe2 100%);
  box-shadow: 0 1.995012cqh 3.75cqw rgba(0, 111, 205, 0.16);
}

.login-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.666667cqw;
}

.login-loading svg {
  width: 3.333333cqw;
  height: 3.990025cqh;
}

.login-text-input--error {
  border-color: #f87171 !important;
  background-color: #fef2f2 !important;
}

.login-text-input--error:focus {
  border-color: #ef4444 !important;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12) !important;
}
</style>
