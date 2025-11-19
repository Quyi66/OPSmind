/**
 * 认证调试工具
 * 提供便捷的方法来查看和调试认证状态
 */

import { authService } from '@/core/auth'

/**
 * 打印当前认证状态
 */
export function logAuthStatus() {
  const token = authService.getToken()
  const user = authService.getCurrentUser()
  const isAuthenticated = authService.isAuthenticated()

  console.group('🔐 [AuthDebug] Current Auth Status')
  //console.log('Is Authenticated:', isAuthenticated)
  //console.log('Has Token:', !!token)
  //console.log('Token Length:', token?.length || 0)
  //console.log('Token Preview:', token ? `${token.substring(0, 20)}...` : 'null')
  //console.log('Has User:', !!user)
  //console.log('User Login:', user?.login || 'null')
  //console.log('User Name:', user?.name || 'null')
  //console.log('User Role:', user?.role || 'null')
  //console.log('Tenant ID:', user?.tenantId || 'null')
  //console.log('Permissions Count:', user?.permissions?.length || 0)
  //console.log('Last Activity:', authService.isLoading() ? 'Loading...' : 'Available')
  console.groupEnd()
}

/**
 * 打印存储中的认证数据
 */
export function logStorageAuth() {
  const localToken = localStorage.getItem('oplus_token')
  const localUser = localStorage.getItem('oplus_user')
  const sessionToken = sessionStorage.getItem('oplus_token')
  const sessionUser = sessionStorage.getItem('oplus_user')
  const vueBridge = sessionStorage.getItem('vue-auth-bridge')

  console.group('💾 [AuthDebug] Storage Auth Data')
  //console.log('localStorage:')
  //console.log('  - oplus_token:', !!localToken, localToken?.length || 0)
  //console.log('  - oplus_user:', !!localUser)

  //console.log('sessionStorage:')
  //console.log('  - oplus_token:', !!sessionToken, sessionToken?.length || 0)
  //console.log('  - oplus_user:', !!sessionUser)
  //console.log('  - vue-auth-bridge:', !!vueBridge)

  if (sessionUser) {
    try {
      const parsedUser = JSON.parse(sessionUser)
      //console.log('  - parsed user:', {
      //   login: parsedUser.login,
      //   name: parsedUser.name,
      //   tenantId: parsedUser.tenantId
      // })
    } catch (e) {
      //console.log('  - user parse error:', e.message)
    }
  }
  console.groupEnd()
}

/**
 * 打印iframe状态
 */
export function logIframeStatus() {
  const iframes = document.querySelectorAll('iframe')

  console.group('🖼️ [AuthDebug] Iframe Status')
  //console.log('Total iframes found:', iframes.length)

  iframes.forEach((iframe, index) => {
    //console.log(`Iframe ${index + 1}:`, {
    //   src: iframe.src,
    //   hasContentWindow: !!iframe.contentWindow,
    //   display: iframe.style.display,
    //   width: iframe.style.width || iframe.width,
    //   height: iframe.style.height || iframe.height
    // })
  })
  console.groupEnd()
}

/**
 * 发送测试消息到所有iframe
 */
export function sendTestMessageToIframes() {
  const iframes = document.querySelectorAll('iframe')
  const testMessage = {
    type: 'auth-debug-test',
    timestamp: Date.now(),
    message: 'Test message from Vue app'
  }

  console.group('📤 [AuthDebug] Sending Test Messages')
  //console.log('Sending to', iframes.length, 'iframes')

  iframes.forEach((iframe, index) => {
    if (iframe.contentWindow) {
      try {
        iframe.contentWindow.postMessage(testMessage, '*')
        //console.log(`✅ Test message sent to iframe ${index + 1}:`, iframe.src)
      } catch (error) {
        //console.log(`❌ Failed to send test message to iframe ${index + 1}:`, error)
      }
    } else {
      //console.log(`⚠️ Iframe ${index + 1} has no contentWindow`)
    }
  })
  console.groupEnd()
}

/**
 * 强制重新发送认证数据到iframe
 */
export function forceResendAuthData() {
  try {
    //console.log('🔄 [AuthDebug] Force resending auth data...')

    // 使用单iframe管理器发送认证数据
    import('@/utils/single-iframe-manager').then(({ singleIframeManager }) => {
      singleIframeManager.sendAuthData()
      //console.log('✅ [AuthDebug] Auth data resent via single iframe manager')
    }).catch(error => {
      console.error('❌ [AuthDebug] Failed to load single iframe manager:', error)
    })

  } catch (error) {
    console.error('❌ [AuthDebug] Failed to resend auth data:', error)
  }
}

/**
 * 完整的认证调试报告
 */
export function generateAuthDebugReport() {
  //console.log('🔍 [AuthDebug] Generating complete auth debug report...')
  //console.log('='.repeat(60))

  logAuthStatus()
  logStorageAuth()
  logIframeStatus()

  //console.log('='.repeat(60))
  //console.log('✅ [AuthDebug] Debug report completed')
}

/**
 * 在控制台中暴露调试方法
 */
export function exposeDebugMethods() {
  if (typeof window !== 'undefined') {
    window.authDebug = {
      logAuthStatus,
      logStorageAuth,
      logIframeStatus,
      sendTestMessageToIframes,
      forceResendAuthData,
      generateAuthDebugReport
    }
  }
}

// 在开发环境中自动暴露调试方法
if (import.meta.env.DEV) {
  exposeDebugMethods()
}
