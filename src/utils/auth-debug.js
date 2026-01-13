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


  if (sessionUser) {
    try {
      const parsedUser = JSON.parse(sessionUser)
      //   login: parsedUser.login,
      //   name: parsedUser.name,
      //   tenantId: parsedUser.tenantId
      // })
    } catch (e) {
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

  iframes.forEach((iframe, index) => {
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

  iframes.forEach((iframe, index) => {
    if (iframe.contentWindow) {
      try {
        iframe.contentWindow.postMessage(testMessage, '*')
      } catch (error) {
      }
    } else {
    }
  })
  console.groupEnd()
}

/**
 * 强制重新发送认证数据到iframe
 */
export function forceResendAuthData() {
  try {

    // 使用单iframe管理器发送认证数据
    import('@/utils/single-iframe-manager').then(({ singleIframeManager }) => {
      singleIframeManager.sendAuthData()
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

  logAuthStatus()
  logStorageAuth()
  logIframeStatus()

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
