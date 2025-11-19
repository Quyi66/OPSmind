/**
 * 全局指令注册
 */

import { authService } from '@/core/auth'

/**
 * 权限指令
 * 用法: v-permission="'admin'" 或 v-permission="['admin', 'user']"
 */
const permission = {
  mounted(el, binding) {
    const { value } = binding
    if (!value) return

    const hasPermission = Array.isArray(value)
      ? value.some(p => authService.hasPermission(p))
      : authService.hasPermission(value)

    if (!hasPermission) {
      el.style.display = 'none'
    }
  },
  updated(el, binding) {
    const { value } = binding
    if (!value) return

    const hasPermission = Array.isArray(value)
      ? value.some(p => authService.hasPermission(p))
      : authService.hasPermission(value)

    el.style.display = hasPermission ? '' : 'none'
  }
}

/**
 * 角色指令
 * 用法: v-role="'admin'" 或 v-role="['admin', 'user']"
 */
const role = {
  mounted(el, binding) {
    const { value } = binding
    if (!value) return

    const hasRole = Array.isArray(value)
      ? value.some(r => authService.hasRole(r))
      : authService.hasRole(value)

    if (!hasRole) {
      el.style.display = 'none'
    }
  },
  updated(el, binding) {
    const { value } = binding
    if (!value) return

    const hasRole = Array.isArray(value)
      ? value.some(r => authService.hasRole(r))
      : authService.hasRole(value)

    el.style.display = hasRole ? '' : 'none'
  }
}

/**
 * 加载指令
 * 用法: v-loading="isLoading"
 */
const loading = {
  mounted(el, binding) {
    const { value } = binding
    if (value) {
      el.classList.add('is-loading')
    }
  },
  updated(el, binding) {
    const { value } = binding
    if (value) {
      el.classList.add('is-loading')
    } else {
      el.classList.remove('is-loading')
    }
  }
}

/**
 * 防抖指令
 * 用法: v-debounce:click="handleClick" 或 v-debounce:input.500="handleInput"
 */
const debounce = {
  mounted(el, binding) {
    const { value, arg, modifiers } = binding
    const delay = Object.keys(modifiers)[0] || 300

    let timer = null
    const handler = (...args) => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        value(...args)
      }, delay)
    }

    el.addEventListener(arg || 'click', handler)
    el._debounceHandler = handler
  },
  unmounted(el, binding) {
    const { arg } = binding
    if (el._debounceHandler) {
      el.removeEventListener(arg || 'click', el._debounceHandler)
      delete el._debounceHandler
    }
  }
}

/**
 * 节流指令
 * 用法: v-throttle:click="handleClick" 或 v-throttle:scroll.1000="handleScroll"
 */
const throttle = {
  mounted(el, binding) {
    const { value, arg, modifiers } = binding
    const delay = Object.keys(modifiers)[0] || 300

    let timer = null
    let lastTime = 0

    const handler = (...args) => {
      const now = Date.now()
      if (now - lastTime >= delay) {
        value(...args)
        lastTime = now
      }
    }

    el.addEventListener(arg || 'click', handler)
    el._throttleHandler = handler
  },
  unmounted(el, binding) {
    const { arg } = binding
    if (el._throttleHandler) {
      el.removeEventListener(arg || 'click', el._throttleHandler)
      delete el._throttleHandler
    }
  }
}

/**
 * 复制指令
 * 用法: v-copy="textToCopy"
 */
const copy = {
  mounted(el, binding) {
    const { value } = binding

    const handler = async () => {
      try {
        await navigator.clipboard.writeText(value)
        //console.log('📋 Text copied to clipboard')

        // 可以添加成功提示
        el.classList.add('copy-success')
        setTimeout(() => {
          el.classList.remove('copy-success')
        }, 1000)
      } catch (error) {
        console.error('Failed to copy text:', error)
      }
    }

    el.addEventListener('click', handler)
    el._copyHandler = handler
  },
  updated(el, binding) {
    // 更新要复制的文本
    el._copyText = binding.value
  },
  unmounted(el) {
    if (el._copyHandler) {
      el.removeEventListener('click', el._copyHandler)
      delete el._copyHandler
    }
  }
}

/**
 * 懒加载指令
 * 用法: v-lazy="imageSrc"
 */
const lazy = {
  mounted(el, binding) {
    const { value } = binding

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target
          img.src = value
          img.classList.remove('lazy-loading')
          img.classList.add('lazy-loaded')
          observer.unobserve(img)
        }
      })
    })

    el.classList.add('lazy-loading')
    observer.observe(el)
    el._lazyObserver = observer
  },
  unmounted(el) {
    if (el._lazyObserver) {
      el._lazyObserver.disconnect()
      delete el._lazyObserver
    }
  }
}

/**
 * 注册全局指令
 */
export function setupGlobalDirectives(app) {
  app.directive('permission', permission)
  app.directive('role', role)
  app.directive('loading', loading)
  app.directive('debounce', debounce)
  app.directive('throttle', throttle)
  app.directive('copy', copy)
  app.directive('lazy', lazy)

  //console.log('📝 Global directives registered')
}
