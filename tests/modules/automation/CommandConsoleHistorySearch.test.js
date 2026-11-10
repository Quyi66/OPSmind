import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ElInput, ElPagination, ElTable, ElTableColumn } from 'element-plus'
import ConsolePage from '@/modules/automation/views/command/CommandConsolePage.vue'

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/core/api', () => ({ useApi: () => api }))
vi.mock('@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue', () => ({
  default: { template: '<div />' }
}))
let wrapper
const state = () => wrapper.vm.$.setupState
const button = text => wrapper.findAll('button').find(item => item.text() === text)
const search = () => wrapper.get('input[placeholder="搜索命令、主机、创建人..."]')
async function open() {
  wrapper = mount(ConsolePage, {
    global: {
      components: { ElInput, ElPagination, ElTable, ElTableColumn },
      stubs: {
        'el-input': ElInput,
        'el-button': { template: '<button type="button"><slot /></button>' },
        'el-dialog': {
          props: ['modelValue'],
          template: '<aside v-if="modelValue"><slot /><slot name="footer" /></aside>'
        },
        'el-form': { template: '<form><slot /></form>' },
        'el-form-item': { template: '<div><slot /></div>' },
        'el-select': { template: '<div><slot /></div>' },
        'el-option': true,
        'el-switch': true,
        'el-tag': true
      }
    }
  })
  await button('运行记录').trigger('click')
  await flushPromises()
}
async function page(value) {
  wrapper.findComponent(ElPagination).vm.$emit('update:current-page', value)
  await flushPromises()
}
beforeEach(() => {
  api.get.mockReset().mockResolvedValue({
    data: Array.from({ length: 65 }, (_, index) => ({
      id: `console-history-${index}`,
      cmdConfig: JSON.stringify([
        { cmd: index < 35 ? `echo Alpha-${index}` : `echo Other-${index}`, type: 'shell' }
      ]),
      hostConfig: JSON.stringify([
        { key: 'host', value: `host-${index}`, id: `actual-host-${index}` }
      ]),
      createdBy: index === 44 ? 'Owner-44' : 'admin',
      createdAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
      lastRunTime: index === 0 ? null : new Date(Date.UTC(2026, 2, 66 - index)).toISOString(),
      runNumber: index === 64 ? null : index % 2 ? String((index * 17) % 65) : (index * 17) % 65
    }))
  })
  api.post.mockReset()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
})
afterEach(() => {
  wrapper?.unmount()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('命令控制台历史搜索', () => {
  it('后页输入即时回首页，首尾空格和大小写不影响已加载记录匹配', async () => {
    await open()
    await page(6)
    await search().setValue(' ALPHA ')
    await flushPromises()
    expect(state().historyCurrentPage).toBe(1)
    expect(state().filteredHistoryData).toHaveLength(35)
    expect(wrapper.text()).toContain('echo Alpha-0')
    expect(wrapper.text()).not.toContain('echo Other-')
    expect(api.get).toHaveBeenCalledTimes(1)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('零匹配后真实清除恢复完整记录的首页，不读取或执行新任务', async () => {
    await open()
    await search().setValue('找不到的命令')
    await flushPromises()
    expect(state().paginatedHistoryData).toEqual([])
    await wrapper.get('.el-input').trigger('mouseenter')
    await wrapper.get('.el-input__clear').trigger('click')
    await flushPromises()
    expect(state().filteredHistoryData).toHaveLength(65)
    expect(state().historyCurrentPage).toBe(1)
    expect(api.get).toHaveBeenCalledTimes(1)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('按主机或创建人定位后沿原动作填回命令、语法和真实主机配置，不自动执行', async () => {
    await open()
    await search().setValue(' HOST-44 ')
    await flushPromises()
    expect(state().filteredHistoryData.map(row => row.id)).toEqual(['console-history-44'])
    await search().setValue(' OWNER-44 ')
    await flushPromises()
    expect(state().filteredHistoryData).toHaveLength(1)
    await button('填回控制台').trigger('click')
    expect(state().command).toBe('echo Other-44')
    expect(state().commandType).toBe('shell')
    expect(state().hosts).toEqual([{ key: 'host', value: 'host-44', id: 'actual-host-44' }])
    expect(state().lineCount).toBe(1)
    expect(state().historyDialogVisible).toBe(false)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('执行次数先排全部历史再分页，保留数值0/数字字符串，取消恢复原记录顺序', async () => {
    await open()
    await page(6)
    const heading = wrapper.findAll('th').find(item => item.text() === '执行次数')
    await heading.get('.sort-caret.descending').trigger('click')
    await flushPromises()
    expect(state().historyCurrentPage).toBe(1)
    expect(state().paginatedHistoryData[0].id).toBe('console-history-42')
    await page(2)
    expect(state().paginatedHistoryData[0].runNumber).toBe('54')
    await heading.get('.sort-caret.ascending').trigger('click')
    await flushPromises()
    expect(state().paginatedHistoryData[0].runNumber).toBe(0)
    expect(state().sortedHistoryData.at(-1).id).toBe('console-history-64')
    await heading.get('.sort-caret.ascending').trigger('click')
    await flushPromises()
    expect(state().paginatedHistoryData[0].id).toBe('console-history-0')
    expect(state().historyData.map(row => row.id)).toEqual(
      Array.from({ length: 65 }, (_, index) => `console-history-${index}`)
    )
    expect(api.get).toHaveBeenCalledTimes(1)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('原两时间表头排序覆盖其他页，筛选及翻页沿同一排序，空时间始终后置', async () => {
    await open()
    const sort = async (label, direction) => {
      const heading = wrapper.findAll('th').find(item => item.text() === label)
      await heading.get(`.sort-caret.${direction}`).trigger('click')
      await flushPromises()
    }
    await sort('创建时间', 'descending')
    expect(state().paginatedHistoryData[0].id).toBe('console-history-64')
    await page(2)
    expect(state().paginatedHistoryData[0].id).toBe('console-history-54')
    await search().setValue('alpha')
    await flushPromises()
    expect(state().paginatedHistoryData[0].id).toBe('console-history-34')
    await sort('最后执行时间', 'ascending')
    expect(state().paginatedHistoryData[0].id).toBe('console-history-34')
    expect(state().sortedHistoryData.at(-1).id).toBe('console-history-0')
    await sort('最后执行时间', 'descending')
    expect(state().paginatedHistoryData[0].id).toBe('console-history-1')
    expect(state().sortedHistoryData.at(-1).id).toBe('console-history-0')
    expect(api.get).toHaveBeenCalledTimes(1)
    expect(api.post).not.toHaveBeenCalled()
  })
})
