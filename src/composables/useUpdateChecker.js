/**
 * 前端版本更新检测
 *
 * 构建时 Vite 会把当前 buildHash 注入 `__APP_BUILD_HASH__`，
 * 同时在 dist 根目录输出 version.json（{ hash, buildTime }）。
 *
 * 该 composable 在以下时机检查远端 version.json：
 *  1. 每隔 POLL_INTERVAL（默认 5 分钟）轮询
 *  2. 页面从后台切回前台（visibilitychange）
 *  3. 路由切换（节流，最短间隔 THROTTLE_MS）
 *
 * 检测到版本不一致时，通过 Element Plus ElNotification 提示用户刷新，
 * 并停止后续轮询。
 */
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElNotification } from 'element-plus'

/* eslint-disable no-undef */
const BUILD_HASH = typeof __APP_BUILD_HASH__ !== 'undefined' ? __APP_BUILD_HASH__ : ''

const POLL_INTERVAL = 5 * 60 * 1000 // 5 分钟
const THROTTLE_MS = 60 * 1000 // 路由切换 / visibilitychange 检查最短间隔
const VERSION_URL = `${import.meta.env.BASE_URL}version.json`

// 模块级状态
let notified = false
let lastCheckTime = 0
let updateDetected = false

async function fetchRemoteHash() {
  try {
    const res = await fetch(`${VERSION_URL}?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.hash || null
  } catch {
    return null
  }
}

function showUpdateNotification() {
  if (notified) return
  notified = true

  ElNotification({
    title: '发现新版本',
    message: '系统已更新，请刷新页面以获取最新功能。',
    type: 'warning',
    duration: 0, // 不自动关闭
    position: 'top-left',
    customClass: 'update-notification',
    onClick() {
      window.location.reload()
    },
    onClose() {
      // 用户手动关闭后，下次事件触发时再提醒一次
      notified = false
    }
  })
}

async function checkUpdate(onDetected) {
  if (!BUILD_HASH || import.meta.env.DEV || updateDetected) return
  const remoteHash = await fetchRemoteHash()
  if (remoteHash && remoteHash !== BUILD_HASH) {
    updateDetected = true
    onDetected?.()
    showUpdateNotification()
  }
}

/**
 * 节流版检查——路由切换和 visibilitychange 共享同一个冷却时间
 */
function throttledCheck(onDetected) {
  const now = Date.now()
  if (now - lastCheckTime < THROTTLE_MS) return
  lastCheckTime = now
  checkUpdate(onDetected)
}

/**
 * 在 Vue 组件 setup 中调用，自动启动版本轮询。
 * 推荐在 App.vue 中调用一次即可。
 */
export function useUpdateChecker() {
  const hasUpdate = ref(false)
  let timer = null

  function onDetected() {
    hasUpdate.value = true
    stopPolling() // 已检测到更新，停止轮询
  }

  // 定时轮询
  function startPolling() {
    stopPolling()
    timer = setInterval(() => checkUpdate(onDetected), POLL_INTERVAL)
  }

  function stopPolling() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  // 页面可见性切换时检查（节流）
  function onVisibilityChange() {
    if (document.visibilityState === 'visible') {
      throttledCheck(onDetected)
    }
  }

  // 路由切换时检查（节流）
  let removeAfterEach = null
  try {
    const router = useRouter()
    removeAfterEach = router.afterEach(() => {
      throttledCheck(onDetected)
    })
  } catch {
    // 非 setup 上下文调用时忽略
  }

  // 启动
  document.addEventListener('visibilitychange', onVisibilityChange)
  startPolling()
  // 首次延迟 30s 后检查一次（避免刚加载就弹通知）
  const initialTimer = setTimeout(() => checkUpdate(onDetected), 30 * 1000)

  onUnmounted(() => {
    stopPolling()
    document.removeEventListener('visibilitychange', onVisibilityChange)
    clearTimeout(initialTimer)
    if (removeAfterEach) removeAfterEach()
  })

  return { hasUpdate }
}
