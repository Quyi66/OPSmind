import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { ElNotification } from 'element-plus'

const router = vi.hoisted(() => ({ afterEach: vi.fn(), remove: vi.fn(), callback: null }))
vi.mock('vue-router', () => ({ useRouter: () => ({ afterEach: router.afterEach }) }))

let wrapper, setLocale, useUpdateChecker, state
beforeEach(async () => {
  vi.resetModules()
  vi.useFakeTimers()
  vi.stubEnv('DEV', false)
  vi.stubGlobal('__APP_BUILD_HASH__', 'current-build')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ hash: 'new-build' }) }))
  router.afterEach.mockImplementation(callback => { router.callback = callback; return router.remove })
  ;({ setLocale } = await import('@/core/i18n'))
  await setLocale('zh-CN')
  ;({ useUpdateChecker } = await import('@/composables/useUpdateChecker'))
})
afterEach(async () => {
  wrapper?.unmount()
  ElNotification.closeAll()
  await nextTick()
  await vi.runOnlyPendingTimersAsync()
  document.querySelectorAll('.update-notification').forEach(el => el.remove())
  await setLocale('zh-CN')
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})
function open() {
  wrapper = mount({ setup() { state = useUpdateChecker(); return () => h('div') } })
}
async function detect() {
  await vi.advanceTimersByTimeAsync(30_000)
  await flushPromises()
  await nextTick()
}

describe('App 版本更新通知中英文适配', () => {
  it('已显示的真实 Element 通知原位切换语言，不重复查询、创建通知或重启轮询', async () => {
    open()
    await detect()
    const notification = document.querySelector('.update-notification')
    expect(notification.textContent).toContain('发现新版本')
    expect(notification.textContent).toContain('系统已更新，请刷新页面以获取最新功能。')
    expect(state.hasUpdate.value).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(1)
    await setLocale('en-US')
    await nextTick()
    expect(document.querySelector('.update-notification')).toBe(notification)
    expect(document.querySelectorAll('.update-notification')).toHaveLength(1)
    expect(notification.textContent).toContain('Update available')
    expect(notification.textContent).toContain('Refresh the page to get the latest features.')
    expect(notification.textContent).not.toContain('发现新版本')
    await vi.advanceTimersByTimeAsync(600_000)
    router.callback()
    await flushPromises()
    expect(fetch).toHaveBeenCalledTimes(1)
    await setLocale('zh-CN')
    await nextTick()
    expect(notification.textContent).toContain('发现新版本')
  })

  it('首次通知采用当前英文，保持不自动关闭的提醒', async () => {
    await setLocale('en-US')
    open()
    await detect()
    expect(document.querySelector('.update-notification').textContent).toContain('Update available')
    await vi.advanceTimersByTimeAsync(10_000)
    expect(document.querySelector('.update-notification')).not.toBeNull()
  })

  it('版本相同不通知，保留后续轮询及卸载清理', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ hash: 'current-build' }) })
    open()
    await detect()
    expect(state.hasUpdate.value).toBe(false)
    expect(document.querySelector('.update-notification')).toBeNull()
    await vi.advanceTimersByTimeAsync(270_000)
    expect(fetch).toHaveBeenCalledTimes(2)
    wrapper.unmount()
    expect(router.remove).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(600_000)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('请求失败不弹通知，下次轮询可以恢复检测', async () => {
    fetch.mockRejectedValueOnce(new Error('offline'))
    open()
    await detect()
    expect(document.querySelector('.update-notification')).toBeNull()
    await vi.advanceTimersByTimeAsync(270_000)
    expect(state.hasUpdate.value).toBe(true)
    expect(document.querySelector('.update-notification').textContent).toContain('发现新版本')
  })
})
