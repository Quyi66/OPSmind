/**
 * iframe 资源不足错误修复工具
 * 专门解决 net::ERR_INSUFFICIENT_RESOURCES 问题
 */

/**
 * 防抖函数，避免频繁的iframe操作
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      func.apply(null, args)
    }, wait)
  }
}

/**
 * 清理iframe资源，防止资源泄漏
 */
export function cleanupIframeResources(iframe: HTMLIFrameElement) {
  try {
    // 停止iframe中的所有网络请求
    if (iframe.contentWindow) {
      // 尝试停止加载
      iframe.contentWindow.stop?.()
    }

    // 清空src，释放资源
    iframe.src = 'about:blank'

    console.log('🧹 Iframe resources cleaned up')
  } catch (error) {
    console.warn('⚠️ Failed to cleanup iframe resources:', error)
  }
}

/**
 * 安全地设置iframe src，避免资源冲突
 */
export function safeSetIframeSrc(iframe: HTMLIFrameElement, src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // 设置超时，避免无限等待
    const timeout = setTimeout(() => {
      reject(new Error('Iframe load timeout'))
    }, 15000)

    const onLoad = () => {
      clearTimeout(timeout)
      iframe.removeEventListener('load', onLoad)
      iframe.removeEventListener('error', onError)
      resolve()
    }

    const onError = () => {
      clearTimeout(timeout)
      iframe.removeEventListener('load', onLoad)
      iframe.removeEventListener('error', onError)
      reject(new Error('Iframe load error'))
    }

    iframe.addEventListener('load', onLoad)
    iframe.addEventListener('error', onError)

    // 设置src
    iframe.src = src
  })
}

/**
 * 检查是否需要重新加载iframe
 */
export function shouldReloadIframe(currentSrc: string, newSrc: string): boolean {
  if (!currentSrc || !newSrc) {
    return true
  }

  // 解析URL，只比较主要部分
  try {
    const current = new URL(currentSrc)
    const newUrl = new URL(newSrc)

    // 如果主机、路径或hash不同，需要重新加载
    return (
      current.origin !== newUrl.origin ||
      current.pathname !== newUrl.pathname ||
      current.hash !== newUrl.hash
    )
  } catch (error) {
    // URL解析失败，保守起见重新加载
    return true
  }
}

/**
 * 限制并发iframe操作
 */
class IframeOperationQueue {
  private queue: Array<() => Promise<void>> = []
  private running = false

  async add(operation: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          await operation()
          resolve()
        } catch (error) {
          reject(error)
        }
      })

      this.process()
    })
  }

  private async process() {
    if (this.running || this.queue.length === 0) {
      return
    }

    this.running = true

    while (this.queue.length > 0) {
      const operation = this.queue.shift()
      if (operation) {
        try {
          await operation()
        } catch (error) {
          console.error('❌ Iframe operation failed:', error)
        }

        // 在操作之间添加小延迟，避免资源冲突
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }

    this.running = false
  }
}

// 全局iframe操作队列
export const iframeOperationQueue = new IframeOperationQueue()

/**
 * 修复iframe资源不足问题的主要函数
 */
export function applyIframeResourceFix() {
  // 监听全局错误，捕获资源不足错误
  window.addEventListener('error', (event) => {
    if (event.message?.includes('ERR_INSUFFICIENT_RESOURCES')) {
      console.warn('🚨 Detected ERR_INSUFFICIENT_RESOURCES, applying fixes...')

      // 清理所有iframe资源
      const iframes = document.querySelectorAll('iframe')
      iframes.forEach(iframe => {
        if (iframe.src !== 'about:blank') {
          cleanupIframeResources(iframe)
        }
      })
    }
  })

  console.log('🔧 Iframe resource fix applied')
}
