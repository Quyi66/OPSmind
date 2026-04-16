import { onUnmounted, ref } from 'vue'

export function useWinPatchPolling(defaultInterval = 5000) {
  const isPolling = ref(false)
  let timer = null
  let runner = null
  let pollSessionId = 0
  let isTicking = false

  function clearTimer() {
    if (timer) {
      window.clearTimeout(timer)
      timer = null
    }
  }

  function schedule(sessionId) {
    if (!isPolling.value || sessionId !== pollSessionId) return

    clearTimer()
    timer = window.setTimeout(() => {
      void tick(sessionId)
    }, defaultInterval)
  }

  async function tick(sessionId) {
    if (!isPolling.value || sessionId !== pollSessionId || typeof runner !== 'function' || isTicking) {
      return
    }

    isTicking = true

    try {
      await runner()
    } finally {
      isTicking = false

      if (isPolling.value && sessionId === pollSessionId) {
        schedule(sessionId)
      }
    }
  }

  function start(task, options = {}) {
    const { immediate = false } = options

    runner = task

    if (isPolling.value) {
      if (immediate && !isTicking) {
        clearTimer()
        void tick(pollSessionId)
      }
      return
    }

    isPolling.value = true
    pollSessionId += 1

    if (immediate) {
      void tick(pollSessionId)
      return
    }

    schedule(pollSessionId)
  }

  function stop() {
    isPolling.value = false
    runner = null
    pollSessionId += 1

    clearTimer()
  }

  onUnmounted(() => {
    stop()
  })

  return {
    isPolling,
    start,
    stop
  }
}

export default useWinPatchPolling
