/**
 * 路由加载状态管理
 * 用于在路由切换、组件加载过程中显示加载状态
 */
import { ref, readonly } from 'vue'

// 加载状态
const isRouteLoading = ref(false)

// 加载开始时间（用于确保最小显示时间）
let loadingStartTime = 0

// 最小显示时间（毫秒），避免闪烁
const MIN_LOADING_DURATION = 200

/**
 * 开始加载
 */
export function startRouteLoading() {
  isRouteLoading.value = true
  loadingStartTime = Date.now()
}

/**
 * 结束加载（确保最小显示时间）
 */
export function finishRouteLoading() {
  const elapsed = Date.now() - loadingStartTime
  const remaining = MIN_LOADING_DURATION - elapsed

  if (remaining > 0) {
    setTimeout(() => {
      isRouteLoading.value = false
    }, remaining)
  } else {
    isRouteLoading.value = false
  }
}

/**
 * 获取只读的加载状态
 */
export function useRouteLoading() {
  return {
    isLoading: readonly(isRouteLoading)
  }
}

export default {
  isRouteLoading,
  startRouteLoading,
  finishRouteLoading,
  useRouteLoading
}
