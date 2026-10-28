import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive, nextTick } from 'vue'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { ElMessage, ElMessageBox } from 'element-plus'
import ResultDetailPage from '@/modules/inspection/views/ResultDetailPage.vue'
import { jobApi, dtsApi, whitelistApi } from '@/modules/inspection/api'

vi.mock('@/modules/inspection/api', () => ({
  jobApi: { getJob: vi.fn(), getHostCheckItems: vi.fn() },
  dtsApi: { getStatistics: vi.fn(), getCheckItemMachine: vi.fn() },
  whitelistApi: { saveWhitelist: vi.fn(), deleteWhitelist: vi.fn() }
}))
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn() }
}))
vi.mock('@/core/auth', () => ({ authService: {} }))
vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({ push: vi.fn() })
}))
vi.mock('@/modules/inspection/components/result-detail', () => {
  const component = { template: '<div />' }
  return Object.fromEntries(
    [
      'AssetModelConfigDialog',
      'StatisticsCards',
      'HostDetailDialog',
      'KpiDetailDialog',
      'CheckItemDetailDialog',
      'CheckItemHostsDialog',
      'WhitelistDialog',
      'ItemWhitelistDialog'
    ].map(name => [name, component])
  )
})

let route
let wrapper
let state
const host = { host_key: 'host-A', host_id: 'host-id-A' }
const item = {
  name: 'check-A',
  output: 'evidence',
  status: 'FAILED',
  hostKey: 'host-A',
  hostId: 'host-id-A',
  whetherWhiteList: 'y,real-id'
}
const rows = (count = 45, hostKey = 'host-A') =>
  Array.from({ length: count }, (_, index) => ({ ...item, name: `check-${index}`, hostKey }))
const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const Slot = { template: '<div><slot /></div>' }
const Input = {
  props: ['modelValue', 'size'],
  emits: ['update:modelValue'],
  template:
    '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
}

async function open() {
  wrapper = shallowMount(ResultDetailPage, {
    global: {
      stubs: {
        ...Object.fromEntries(
          [
            'el-breadcrumb-item',
            'el-breadcrumb',
            'el-tag',
            'el-descriptions-item',
            'el-descriptions',
            'el-collapse-item',
            'el-collapse',
            'el-tab-pane',
            'el-tabs',
            'el-table-column',
            'el-table',
            'el-pagination',
            'el-option',
            'el-select'
          ].map(name => [name, true])
        ),
        'el-dialog': Slot,
        'el-input': Input,
        'el-button': {
          props: ['disabled'],
          template: '<button :disabled="disabled"><slot /></button>'
        }
      },
      directives: { loading: () => {} }
    }
  })
  await flushPromises()
  state = wrapper.vm.$.setupState
  await state.handleHostClick(host)
}

async function locate(page = 2) {
  state.inspectionSearchText = 'check'
  state.inspectionResultFilter = 'FAILED'
  state.inspectionPageSize = 20
  await nextTick()
  state.inspectionPage = page
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  route = reactive({
    path: '/cac/results/runA',
    fullPath: '/cac/results/runA',
    params: {},
    query: {}
  })
  jobApi.getJob.mockResolvedValue({
    data: {
      templateId: 'template-A',
      templateName: 'original-name',
      auditParams: JSON.stringify([{ scripts: [{ scriptPath: '/original/check.yml' }], hosts: [] }])
    }
  })
  jobApi.getHostCheckItems.mockResolvedValue({ data: rows() })
  dtsApi.getStatistics.mockResolvedValue({ records: [{ name: 'FAILED', value: 45 }] })
  dtsApi.getCheckItemMachine.mockResolvedValue({ records: [host], total: 1 })
  ElMessageBox.confirm.mockResolvedValue()
  whitelistApi.saveWhitelist.mockResolvedValue()
  whitelistApi.deleteWhitelist.mockResolvedValue()
})
afterEach(() => {
  wrapper?.unmount()
  vi.restoreAllMocks()
})

describe('巡检名单操作保留查看上下文', () => {
  it.each(['handleAddToWhitelist', 'handleRemoveFromWhitelist'])(
    '%s 成功保留条件和有效页码、沿用原请求',
    async method => {
      await open()
      await locate()
      await state[method](item)
      expect(state.inspectionSearchText).toBe('check')
      expect(state.inspectionResultFilter).toBe('FAILED')
      expect(state.inspectionPageSize).toBe(20)
      expect(state.inspectionPage).toBe(2)
      expect(state.pagedInspectionData).toHaveLength(20)
      expect(jobApi.getHostCheckItems).toHaveBeenLastCalledWith('runA', 'template-A')
      expect(dtsApi.getStatistics).toHaveBeenLastCalledWith('runA')
      if (method === 'handleAddToWhitelist') {
        expect(ElMessageBox.confirm).toHaveBeenCalledWith(
          '确定要将此检查项添加到黑名单吗？',
          '确认'
        )
        expect(whitelistApi.saveWhitelist).toHaveBeenCalledExactlyOnceWith({
          templateId: 'template-A',
          templateName: 'original-name',
          scriptPath: '/original/check.yml',
          hostId: 'host-id-A',
          hostKey: 'host-A',
          checkName: 'check-A'
        })
      } else {
        expect(ElMessageBox.confirm).toHaveBeenCalledWith(
          '确定要将此检查项从黑名单移除吗？',
          '确认'
        )
        expect(whitelistApi.deleteWhitelist).toHaveBeenCalledExactlyOnceWith('real-id')
      }
    }
  )

  it.each([21, 0])('刷新后剩余 %i 项，页码收敛且条件保留', async count => {
    await open()
    await locate(3)
    jobApi.getHostCheckItems.mockResolvedValue(rows(count))
    await state.handleRemoveFromWhitelist(item)
    expect(state.inspectionPage).toBe(count ? 2 : 1)
    expect(state.inspectionSearchText).toBe('check')
    expect(state.inspectionResultFilter).toBe('FAILED')
  })

  it.each(['cancel', 'close', new Error('write failed')])(
    '取消、关闭确认或写入失败不清条件：%s',
    async failure => {
      await open()
      await locate()
      if (failure instanceof Error) whitelistApi.saveWhitelist.mockRejectedValue(failure)
      else ElMessageBox.confirm.mockRejectedValue(failure)
      await state.handleAddToWhitelist(item)
      expect(state.inspectionPage).toBe(2)
      expect(state.inspectionSearchText).toBe('check')
      expect(jobApi.getHostCheckItems).toHaveBeenCalledTimes(1)
      expect(state.inspectionDetailLoading).toBe(false)
      expect(ElMessage.error).toHaveBeenCalledTimes(failure instanceof Error ? 1 : 0)
    }
  )

  it('首次和切主机清条件，保留既有每页数量行为', async () => {
    await open()
    expect(state.inspectionSearchText).toBe('')
    await locate()
    await state.handleHostClick({ host_key: 'host-B' })
    expect(state.inspectionSearchText).toBe('')
    expect(state.inspectionResultFilter).toBe('')
    expect(state.inspectionPage).toBe(1)
    expect(state.inspectionPageSize).toBe(20)
    expect(state.inspectionDetailData).toEqual([])
  })

  it('刷新期间用户更新搜索，以最新条件为准；加载持续到刷新结束且禁止重复写入', async () => {
    await open()
    await locate()
    const read = deferred()
    jobApi.getHostCheckItems.mockReturnValueOnce(read.promise)
    const operation = state.handleAddToWhitelist(item)
    await flushPromises()
    expect(state.inspectionDetailLoading).toBe(true)
    await state.handleAddToWhitelist(item)
    await wrapper.find('input[placeholder="输入检查项或输出内容搜索"]').setValue('check-4')
    expect(state.inspectionPage).toBe(1)
    read.resolve(rows())
    await operation
    expect(state.inspectionSearchText).toBe('check-4')
    expect(state.filteredInspectionData).toHaveLength(6)
    expect(state.inspectionDetailLoading).toBe(false)
    expect(whitelistApi.saveWhitelist).toHaveBeenCalledTimes(1)
  })

  it('写成功但刷新失败，提示区分、保留条件、禁止再次写入；重试只读', async () => {
    await open()
    await locate()
    jobApi.getHostCheckItems.mockRejectedValueOnce(new Error('read failed'))
    await state.handleAddToWhitelist(item)
    expect(ElMessage.success).toHaveBeenCalledWith('添加黑名单成功')
    expect(ElMessage.error).toHaveBeenCalledExactlyOnceWith(
      '黑名单操作已成功，但检查项刷新失败，请重试刷新'
    )
    expect(state.inspectionPage).toBe(2)
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    await state.handleAddToWhitelist(item)
    const retry = wrapper.findAll('button').find(button => button.text() === '重试刷新')
    await retry.trigger('click')
    await flushPromises()
    expect(state.inspectionRefreshFailed).toBe(false)
    expect(state.inspectionSearchText).toBe('check')
    expect(whitelistApi.saveWhitelist).toHaveBeenCalledTimes(1)
    expect(jobApi.getHostCheckItems).toHaveBeenCalledTimes(3)
  })

  it('等待确认时切主机，不把旧检查项提交到新上下文', async () => {
    await open()
    const confirmation = deferred()
    ElMessageBox.confirm.mockReturnValueOnce(confirmation.promise)
    const operation = state.handleAddToWhitelist(item)
    await state.handleHostClick({ host_key: 'host-B' })
    confirmation.resolve()
    await operation
    expect(whitelistApi.saveWhitelist).not.toHaveBeenCalled()
  })

  it.each(['close-reopen', 'host', 'report', 'unmount'])(
    '写入中 %s，旧成功不刷新或重置新上下文',
    async change => {
      await open()
      const write = deferred()
      whitelistApi.saveWhitelist.mockReturnValueOnce(write.promise)
      const operation = state.handleAddToWhitelist(item)
      await flushPromises()
      if (change === 'close-reopen') {
        state.inspectionDetailVisible = false
        await state.handleHostClick(host)
      } else if (change === 'host') {
        await state.handleHostClick({ host_key: 'host-B' })
      } else if (change === 'report') {
        route.fullPath = '/cac/results/runB'
      } else wrapper.unmount()
      const reads = jobApi.getHostCheckItems.mock.calls.length
      const statisticsReads = dtsApi.getStatistics.mock.calls.length
      write.resolve()
      await operation
      expect(jobApi.getHostCheckItems).toHaveBeenCalledTimes(reads)
      expect(dtsApi.getStatistics).toHaveBeenCalledTimes(statisticsReads)
      expect(ElMessage.success).not.toHaveBeenCalled()
    }
  )

  it.each(['resolve', 'reject'])('旧读取 %s 不覆盖新主机数据、加载和提示', async outcome => {
    await open()
    const old = deferred()
    jobApi.getHostCheckItems.mockReturnValueOnce(old.promise)
    const first = state.handleHostClick(host)
    jobApi.getHostCheckItems.mockResolvedValueOnce(rows(1, 'host-B'))
    await state.handleHostClick({ host_key: 'host-B' })
    old[outcome](outcome === 'resolve' ? rows() : new Error('late failure'))
    await first
    expect(state.inspectionDetailData).toEqual(rows(1, 'host-B'))
    expect(state.inspectionDetailLoading).toBe(false)
    expect(ElMessage.error).not.toHaveBeenCalled()
  })

  it('操作触发的统计读取不在关闭后覆盖统计', async () => {
    await open()
    const stats = deferred()
    dtsApi.getStatistics.mockReturnValueOnce(stats.promise)
    await state.handleAddToWhitelist(item)
    state.inspectionDetailVisible = false
    stats.resolve({ records: [{ name: 'FAILED', value: 999 }] })
    await flushPromises()
    expect(state.statistics.FAILED).toBe(45)
  })

  it('较早的统计响应不覆盖较新一次结果', async () => {
    await open()
    const stats = deferred()
    dtsApi.getStatistics.mockReturnValueOnce(stats.promise)
    const first = state.loadStatistics()
    dtsApi.getStatistics.mockResolvedValueOnce({ records: [{ name: 'FAILED', value: 2 }] })
    await state.loadStatistics()
    stats.resolve({ records: [{ name: 'FAILED', value: 999 }] })
    await first
    expect(state.statistics.FAILED).toBe(2)
    expect(state.statsLoading).toBe(false)
  })
})
