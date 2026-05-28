import { ref, watch } from 'vue'

const isDark = ref(localStorage.getItem('ops_theme') === 'dark')

/**
 * 切换深色模式
 * @param {MouseEvent} event 可选，用于执行圆形扩散动画的点击事件
 */
function toggleDark(event) {
  // 兼容性检查：如果浏览器不支持 View Transition API，直接切换
  if (typeof document.startViewTransition !== 'function') {
    isDark.value = !isDark.value
    return
  }

  const x = event?.clientX ?? window.innerWidth / 2
  const y = event?.clientY ?? window.innerHeight / 2
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  )

  const transition = document.startViewTransition(() => {
    isDark.value = !isDark.value
  })

  transition.ready.then(() => {
    const clipPath = [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`]
    document.documentElement.animate(
      {
        clipPath
      },
      {
        duration: 500,
        easing: 'ease-in-out',
        pseudoElement: '::view-transition-new(root)'
      }
    )
  })
}

// 监听状态变化同步到DOM和本地存储
watch(
  isDark,
  val => {
    localStorage.setItem('ops_theme', val ? 'dark' : 'light')
    const htmlEl = document.documentElement
    if (val) {
      htmlEl.classList.add('dark')
    } else {
      htmlEl.classList.remove('dark')
    }
  },
  { immediate: true }
)

export function useTheme() {
  return {
    isDark,
    toggleDark
  }
}
