import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { setLocale } from '@/core/i18n'
import AnsibleLogViewer from '@/modules/automation/components/job/AnsibleLogViewer.vue'

const api = vi.hoisted(() => ({ getLog: vi.fn(), success: vi.fn(), error: vi.fn() }))
vi.mock('@/modules/automation/api/jao', () => ({ getExecuteLogText: api.getLog }))
vi.mock('element-plus', () => ({ ElMessage: { success: api.success, error: api.error } }))

const wrappers = []
const sockets = []
class FakeSocket {
  static OPEN = 1
  readyState = 1
  constructor(url) {
    this.url = url
    sockets.push(this)
  }
  close = vi.fn(() => {
    this.readyState = 3
    this.onclose?.()
  })
}
const state = wrapper => wrapper.vm.$.setupState
const raw = 'TASK [后端任务]\nok: [主机甲] #{raw-key} {{原文}} <script>保留</script>\n中文日志'
function open(props) {
  const wrapper = mount(AnsibleLogViewer, {
    props,
    global: { stubs: { ElTooltip: { template: '<div><slot /></div>' }, ElButtonGroup: true } }
  })
  wrappers.push(wrapper)
  return wrapper
}
beforeEach(async () => {
  api.getLog.mockReset()
  api.success.mockReset()
  api.error.mockReset()
  sockets.length = 0
  vi.stubGlobal('WebSocket', FakeSocket)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  )
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  await setLocale('zh-CN', { persist: false })
})

describe('execution log language boundaries', () => {
  it('preserves live batches, search and websocket while translating connection controls', async () => {
    const wrapper = open({ runId: 'actual-run', active: true, status: 'RUNNING' })
    await flushPromises()
    const vm = state(wrapper),
      socket = sockets[0]
    socket.onopen()
    socket.onmessage({ data: JSON.stringify({ batchId: 'batch-中文', message: raw }) })
    await flushPromises()
    vm.autoScroll = false
    vm.searchKeyword = '中文'
    vm.handleSearch()
    const data = vm.batchData,
      matches = vm.searchMatches
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(wrapper.text()).toContain('Live log')
    expect(vm.logContent).toBe(raw)
    expect(vm.batchData).toBe(data)
    expect(vm.activeBatch).toBe('batch-中文')
    expect(vm.searchKeyword).toBe('中文')
    expect(vm.searchMatches).toBe(matches)
    expect(vm.autoScroll).toBe(false)
    expect(sockets).toHaveLength(1)
    expect(socket.url).toContain('/sjxy-ws/log/actual-run')
    expect(socket.close).not.toHaveBeenCalled()
    expect(api.getLog).not.toHaveBeenCalled()
    expect(wrapper.find('.line-content script').exists()).toBe(false)
  })
  it('only translates a locally generated missing-log notice, preserving a backend 404 message', async () => {
    api.getLog.mockRejectedValueOnce({ response: { status: 404 } })
    const local = open({ runId: 'missing-log', active: true, status: 'COMPLETED' })
    await flushPromises()
    const before = state(local).logContent
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(state(local).logContent).not.toBe(before)
    expect(state(local).logContent).toBe(
      'No historical log was found. The task may not exist, may have no output yet, or its log may have expired.'
    )
    expect(api.getLog).toHaveBeenCalledExactlyOnceWith('missing-log')
    api.getLog.mockRejectedValueOnce({ response: { status: 404, data: '后端中文日志提示 #{raw}' } })
    const backend = open({ runId: 'server-notice', active: true, status: 'FAILED' })
    await flushPromises()
    await setLocale('zh-CN', { persist: false })
    expect(state(backend).logContent).toBe('后端中文日志提示 #{raw}')
  })
  it('downloads the original log bytes in English mode without translating backend content', async () => {
    const wrapper = open({ runId: 'raw-run', content: raw })
    let downloaded
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL = vi.fn(blob => {
          downloaded = blob
          return 'blob:test'
        })
        static revokeObjectURL = vi.fn()
      }
    )
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    await setLocale('en-US', { persist: false })
    await state(wrapper).handleDownload()
    const content = await new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.readAsText(downloaded)
    })
    expect(content).toBe(raw)
    expect(api.success).toHaveBeenCalledWith('Downloaded successfully')
    expect(api.error).not.toHaveBeenCalled()
  })
})
