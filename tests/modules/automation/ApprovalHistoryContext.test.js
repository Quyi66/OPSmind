import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ElDialog, ElMessage, ElTable, ElTableColumn } from 'element-plus'
import History from '@/modules/automation/components/script/dialogs/ApprovalHistoryDialog.vue'

const api = vi.hoisted(() => ({
  getAllApproveHistory: vi.fn(),
  getFileApproveHistory: vi.fn(),
  getApprovalDetail: vi.fn()
}))
vi.mock('@/modules/automation/api/gfs', () => api)
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const list = rows => ({ data: { _status: 'ok', result: rows } })
const records = [
  {
    id: 'approval-a',
    approvalFileCount: 0,
    actionDate: '2026-10-20T12:00:00Z',
    onlineStatus: 'PUBLISHED'
  },
  {
    id: 'approval-b',
    approvalFileCount: 2,
    actionDate: '2026-10-21T12:00:00Z',
    onlineStatus: 'REJECTED'
  }
]
let wrapper
const Dialog = {
  name: 'ElDialog',
  props: ['modelValue', 'title'],
  emits: ['open', 'closed'],
  template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>'
}
async function open(props = {}, realDialog = false) {
  wrapper = mount(History, {
    props: { modelValue: false, repo: '$tnt', ...props },
    global: {
      components: { ElTable, ElTableColumn, ElDialog },
      stubs: {
        'el-dialog': realDialog ? false : Dialog,
        'el-button': { template: '<button><slot /></button>' },
        'el-alert': { props: ['title'], template: '<div role="alert">{{ title }}<slot /></div>' },
        teleport: true,
        transition: false
      },
      directives: { loading() {} }
    }
  })
  await wrapper.setProps({ modelValue: true })
  // The stub deliberately emits the existing open event; the component must not read twice.
  if (!realDialog) wrapper.findComponent(Dialog).vm.$emit('open')
  await flushPromises()
}
const state = () => wrapper.vm.$.setupState
const button = text => wrapper.findAll('button').find(item => item.text() === text)
beforeEach(() => {
  Object.values(api).forEach(mock => mock.mockReset())
  api.getAllApproveHistory.mockResolvedValue(list(records))
  api.getFileApproveHistory.mockResolvedValue(
    list([{ id: 'file-history', onlineStatus: 'PUBLISHED' }])
  )
  api.getApprovalDetail.mockResolvedValue({
    data: {
      _status: 'ok',
      result: { paths: ['/real/file.sh'], repo: 'detail-repo', onlineStatus: 'PUBLISHED' }
    }
  })
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
})
afterEach(() => {
  wrapper?.unmount()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('脚本审批历史只读上下文', () => {
  it('0文件仍显示0，原审批ID读取和文件预览参数保持', async () => {
    await open()
    expect(api.getAllApproveHistory).toHaveBeenCalledExactlyOnceWith('$tnt')
    expect(button('0')).toBeDefined()
    await button('2').trigger('click')
    await flushPromises()
    expect(api.getApprovalDetail).toHaveBeenCalledExactlyOnceWith('$tnt', 'approval-b')
    await button('/real/file.sh').trigger('click')
    expect(wrapper.emitted('open-file')).toEqual([[{ path: '/real/file.sh', repo: 'detail-repo' }]])
    await button('返回列表').trigger('click')
    expect(state().historyList.map(row => row.id)).toEqual(['approval-a', 'approval-b'])
    expect(api.getAllApproveHistory).toHaveBeenCalledTimes(1)
  })

  it.each(['resolve', 'reject'])('关闭全部历史再开文件历史，旧%s不污染新窗口', async method => {
    const old = deferred(),
      latest = deferred()
    api.getAllApproveHistory.mockReturnValueOnce(old.promise)
    await open()
    await wrapper.setProps({ modelValue: false })
    api.getFileApproveHistory.mockReturnValueOnce(latest.promise)
    await wrapper.setProps({
      mode: 'singleFile',
      file: { name: 'b.sh', path: '/exact/b.sh' },
      modelValue: true
    })
    wrapper.findComponent(Dialog).vm.$emit('open')
    await flushPromises()
    old[method](method === 'resolve' ? list(records) : new Error('old'))
    await flushPromises()
    expect(state().historyList).toEqual([])
    expect(state().loading).toBe(true)
    expect(ElMessage.error).not.toHaveBeenCalled()
    latest.resolve(list([{ id: 'new-file-history' }]))
    await flushPromises()
    expect(state().historyList.map(row => row.id)).toEqual(['new-file-history'])
    expect(api.getFileApproveHistory).toHaveBeenCalledExactlyOnceWith('$tnt', '/exact/b.sh')
  })

  it('切仓库或文件时沿原API重新读取，只展示当前上下文', async () => {
    await open({ mode: 'singleFile', file: { name: 'a.sh', path: '/a.sh' } })
    await wrapper.setProps({ repo: 'other-repo', file: { name: 'b.sh', path: '/b.sh' } })
    await flushPromises()
    expect(api.getFileApproveHistory).toHaveBeenLastCalledWith('other-repo', '/b.sh')
    expect(api.getFileApproveHistory).toHaveBeenCalledTimes(2)
    expect(wrapper.findComponent(Dialog).props('title')).toBe('审批历史 - b.sh')
  })

  it('关闭后重开，迟到closed事件不清除新历史或通知父页清空file', async () => {
    await open()
    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({
      modelValue: true,
      mode: 'singleFile',
      file: { name: 'b.sh', path: '/b.sh' }
    })
    wrapper.findComponent(Dialog).vm.$emit('open')
    await flushPromises()
    wrapper.findComponent(Dialog).vm.$emit('closed')
    await flushPromises()
    expect(state().historyList.map(row => row.id)).toEqual(['file-history'])
    expect(wrapper.emitted('closed')).toBeUndefined()
  })

  it('关闭中的旧详情响应不能把新窗口切回审批文件详情', async () => {
    await open()
    const old = deferred()
    api.getApprovalDetail.mockReturnValueOnce(old.promise)
    await button('2').trigger('click')
    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })
    wrapper.findComponent(Dialog).vm.$emit('open')
    await flushPromises()
    old.resolve({ data: { _status: 'ok', result: { paths: ['/old/file.sh'] } } })
    await flushPromises()
    expect(state().viewMode).toBe('all')
    expect(state().detailPaths).toEqual([])
    expect(wrapper.text()).not.toContain('/old/file.sh')
  })

  it('当前列表读取失败有可重试提示，重试成功清除错误', async () => {
    api.getAllApproveHistory.mockRejectedValueOnce(new Error('历史读取失败'))
    await open()
    expect(wrapper.text()).toContain('历史读取失败')
    await button('重试').trigger('click')
    await flushPromises()
    expect(state().historyList).toHaveLength(2)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('详情失败重试只读原审批ID，返回列表不重读', async () => {
    await open()
    api.getApprovalDetail.mockRejectedValueOnce(new Error('详情读取失败'))
    await button('2').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('详情读取失败')
    await button('重试').trigger('click')
    await flushPromises()
    expect(api.getApprovalDetail.mock.calls).toEqual([
      ['$tnt', 'approval-b'],
      ['$tnt', 'approval-b']
    ])
    expect(state().viewMode).toBe('approvalDetail')
  })

  it('真实Element对话框打开只发一次历史读取', async () => {
    await open({}, true)
    expect(api.getAllApproveHistory).toHaveBeenCalledExactlyOnceWith('$tnt')
    expect(wrapper.findComponent(ElDialog).props('modelValue')).toBe(true)
  })

  it('卸载后旧错误不提示且不填充数据', async () => {
    const old = deferred()
    api.getAllApproveHistory.mockReturnValueOnce(old.promise)
    await open()
    const context = state()
    wrapper.unmount()
    old.reject(new Error('old'))
    await flushPromises()
    expect(context.historyList).toEqual([])
    expect(ElMessage.error).not.toHaveBeenCalled()
  })
})
