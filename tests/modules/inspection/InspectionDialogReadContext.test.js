import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import { useResultDetailDialogs } from '@/modules/inspection/composables/useResultDetailDialogs'
import CheckItemDetailDialog from '@/modules/inspection/components/result-detail/CheckItemDetailDialog.vue'

const api = vi.hoisted(() => ({
  getMachineInfo: vi.fn(),
  getCheckItemMachineDetail: vi.fn(),
  getCheckItemByStatus: vi.fn(),
  getCheckItemInfo: vi.fn(),
  getCheckItemDetail: vi.fn(),
  saveWhitelist: vi.fn(),
  deleteWhitelist: vi.fn()
}))
vi.mock('@/modules/inspection/api', () => ({ dtsApi: api, whitelistApi: api }))
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
let wrapper, dialogs, jobId, jobInfo, routeKey
const firstHost = { host_id: 'id-a', host_key: 'host-a' }
const secondHost = { host_id: 'id-b', host_key: 'host-b' }
const payload = record => ({ data: { records: [record] } })
function open() {
  wrapper = mount(
    defineComponent({
      setup() {
        jobId = ref('run-a')
        jobInfo = ref({ templateId: 'template-a' })
        routeKey = ref('/cac/results/run-a')
        dialogs = useResultDetailDialogs(jobId, jobInfo, () => routeKey.value)
        return () => h('div')
      }
    })
  )
}
beforeEach(() => {
  Object.values(api).forEach(mock => mock.mockReset().mockResolvedValue(payload({ id: 'initial' })))
  vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  wrapper?.unmount()
  vi.restoreAllMocks()
})

describe('巡检只读详情的当前窗口上下文', () => {
  it.each([0, false, '', null, undefined])(
    '详情呈现输出 %s，蛇形主机字段也显示原主机名',
    output => {
      wrapper = mount(CheckItemDetailDialog, {
        props: {
          visible: true,
          item: { host_key: 'host-a', name: 'check', output },
          showWhitelistButton: false
        },
        global: {
          stubs: {
            'el-dialog': {
              name: 'ElDialog',
              props: ['title'],
              template: '<div><slot /><slot name="footer" /></div>'
            },
            'el-tag': { template: '<span><slot /></span>' },
            'el-button': { template: '<button><slot /></button>' }
          },
          directives: { loading() {} }
        }
      })
      expect(wrapper.findComponent({ name: 'ElDialog' }).props('title')).toBe('host-a')
      expect(wrapper.get('pre').text()).toBe(
        output === 0 || output === false ? String(output) : '无输出内容'
      )
    }
  )

  it('主机A迟到信息与检查项不填入主机B，旧finally不结束B加载', async () => {
    open()
    const oldInfo = deferred(),
      oldItems = deferred(),
      newInfo = deferred(),
      newItems = deferred()
    api.getMachineInfo.mockReturnValueOnce(oldInfo.promise).mockReturnValueOnce(newInfo.promise)
    api.getCheckItemMachineDetail
      .mockReturnValueOnce(oldItems.promise)
      .mockReturnValueOnce(newItems.promise)
    dialogs.showHostDetail(firstHost)
    dialogs.showHostDetail(secondHost)
    oldInfo.resolve(payload({ id: 'old-info' }))
    oldItems.resolve(payload({ id: 'old-item' }))
    await flushPromises()
    expect(dialogs.hostMachineInfo.value).toEqual({})
    expect(dialogs.hostCheckItems.value).toEqual([])
    expect(dialogs.hostCheckItemsLoading.value).toBe(true)
    newInfo.resolve(payload({ id: 'new-info' }))
    newItems.resolve(payload({ id: 'new-item' }))
    await flushPromises()
    expect(dialogs.hostMachineInfo.value).toEqual({ id: 'new-info' })
    expect(dialogs.hostCheckItems.value).toEqual([{ id: 'new-item' }])
    expect(api.getMachineInfo.mock.calls).toEqual([['id-a'], ['id-b']])
    expect(api.getCheckItemMachineDetail.mock.calls[1]).toEqual([
      { host_key: 'host-b', job_id: 'run-a', status: 'all' },
      { size: 100, page: 1 }
    ])
  })

  it('同主机连续切状态只接纳最新检查项，旧失败不提示', async () => {
    open()
    const old = deferred(),
      latest = deferred()
    api.getCheckItemMachineDetail
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(latest.promise)
    dialogs.showItemsByStatus(firstHost, 'FAILED')
    dialogs.hostDetailStatusFilter.value = 'OK'
    dialogs.loadHostCheckItems()
    old.reject(new Error('old'))
    await flushPromises()
    expect(ElMessage.error).not.toHaveBeenCalled()
    expect(dialogs.hostCheckItemsLoading.value).toBe(true)
    latest.resolve(payload({ name: 'passed', status: 'OK' }))
    await flushPromises()
    expect(dialogs.hostCheckItems.value).toEqual([{ name: 'passed', status: 'OK' }])
  })

  it.each(['resolve', 'reject'])('KPI切换后旧%s不覆盖最新状态数据/加载', async method => {
    open()
    const old = deferred(),
      latest = deferred()
    api.getCheckItemByStatus.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    dialogs.showKpiDialog('FAILED')
    dialogs.showKpiDialog('OK')
    old[method](method === 'resolve' ? payload({ id: 'old' }) : new Error('old'))
    await flushPromises()
    expect(dialogs.kpiDialogTitle.value).toBe('检查通过 - 详情')
    expect(dialogs.kpiDialogData.value).toEqual([])
    expect(dialogs.kpiDialogLoading.value).toBe(true)
    expect(ElMessage.error).not.toHaveBeenCalled()
    latest.resolve(payload({ id: 'latest' }))
    await flushPromises()
    expect(dialogs.kpiDialogData.value).toEqual([{ id: 'latest' }])
  })

  it('快速切检查项详情不串输出，真实数值0输出保留', async () => {
    open()
    const old = deferred(),
      latest = deferred()
    api.getCheckItemInfo.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    dialogs.showCheckItemDetail({ id: 'item-a' })
    dialogs.showCheckItemDetail({ id: 'item-b' })
    latest.resolve(payload({ name: 'second', status: 'OK', output: 0 }))
    await flushPromises()
    old.resolve(payload({ name: 'first', status: 'FAILED', output: 'old' }))
    await flushPromises()
    expect(dialogs.currentCheckItem.value).toMatchObject({
      id: 'item-b',
      name: 'second',
      output: 0
    })
    expect(dialogs.checkItemDetailLoading.value).toBe(false)
  })

  it('关联主机切换检查项和状态时忽略旧结果，API参数保持原样', async () => {
    open()
    const old = deferred(),
      latest = deferred()
    api.getCheckItemDetail.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    dialogs.showCheckItemHostsDialog({ name: 'first' })
    dialogs.showCheckItemHostsDialog({ name: 'second' })
    old.resolve(payload({ host_key: 'old' }))
    await flushPromises()
    expect(dialogs.checkItemHostsData.value).toEqual([])
    expect(dialogs.checkItemHostsLoading.value).toBe(true)
    latest.resolve(payload({ host_key: 'new' }))
    await flushPromises()
    expect(dialogs.checkItemHostsData.value).toEqual([{ host_key: 'new' }])
    expect(api.getCheckItemDetail.mock.calls[1]).toEqual([
      { job_id: 'run-a', name: 'second', status: 'all' },
      { size: 100, page: 1 }
    ])
  })

  it.each([
    [
      'KPI',
      'showKpiDialog',
      'kpiDialogVisible',
      'kpiDialogData',
      'kpiDialogLoading',
      'getCheckItemByStatus',
      'FAILED'
    ],
    [
      '关联主机',
      'showCheckItemHostsDialog',
      'checkItemHostsVisible',
      'checkItemHostsData',
      'checkItemHostsLoading',
      'getCheckItemDetail',
      { name: 'item' }
    ]
  ])(
    '%s关闭重开同一对象，旧响应不能回填',
    async (_label, show, visible, data, loading, read, arg) => {
      open()
      const old = deferred(),
        latest = deferred()
      api[read].mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
      dialogs[show](arg)
      dialogs[visible].value = false
      dialogs[show](arg)
      old.resolve(payload({ id: 'old' }))
      await flushPromises()
      expect(dialogs[data].value).toEqual([])
      expect(dialogs[loading].value).toBe(true)
      latest.resolve(payload({ id: 'new' }))
      await flushPromises()
      expect(dialogs[data].value).toEqual([{ id: 'new' }])
    }
  )

  it.each(['job', 'template', 'route', 'unmount'])('%s变化关闭只读详情并丢弃旧响应', async kind => {
    open()
    const old = deferred()
    api.getCheckItemByStatus.mockReturnValueOnce(old.promise)
    dialogs.showKpiDialog('FAILED')
    if (kind === 'job') jobId.value = 'run-b'
    if (kind === 'template') jobInfo.value = { templateId: 'template-b' }
    if (kind === 'route') routeKey.value = '/cac/results/run-b'
    if (kind === 'unmount') wrapper.unmount()
    old.resolve(payload({ id: 'old' }))
    await flushPromises()
    expect(dialogs.kpiDialogVisible.value).toBe(false)
    expect(dialogs.kpiDialogData.value).toEqual([])
    expect(dialogs.kpiDialogLoading.value).toBe(false)
    expect(api.saveWhitelist).not.toHaveBeenCalled()
    expect(api.deleteWhitelist).not.toHaveBeenCalled()
  })

  it('当前请求失败仍沿原提示结束加载', async () => {
    open()
    api.getCheckItemByStatus.mockRejectedValueOnce(new Error('current'))
    await dialogs.showKpiDialog('FAILED')
    expect(ElMessage.error).toHaveBeenCalledExactlyOnceWith('获取详情失败')
    expect(dialogs.kpiDialogLoading.value).toBe(false)
  })
})
