import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ElInput, ElPagination, ElTable, ElTableColumn, ElTabPane, ElTabs } from 'element-plus'
import Page from '@/modules/settings/views/SscParamPage.vue'

const api = vi.hoisted(() => ({ getSysParams: vi.fn(), getAppParams: vi.fn() }))
vi.mock('@/modules/settings/api/params', () => api)
const records = Array.from({ length: 25 }, (_, i) => ({
  id: `param-${i}`,
  domain: 'test',
  name: `Param-${i + 1}`,
  value: `value-${i + 1}`,
  description: ''
}))
let wrapper
const state = () => wrapper.vm.$.setupState
async function open(tab) {
  wrapper = mount(Page, {
    global: {
      components: { ElTabs, ElTabPane, ElTable, ElTableColumn, ElPagination },
      stubs: {
        'el-input': ElInput,
        'el-form': { template: '<form @submit.prevent><slot /></form>' },
        'el-form-item': { template: '<div><slot /></div>' },
        'el-button': { template: '<button><slot /></button>' },
        'el-icon': true,
        'el-dialog': { template: '<div />' }
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
  if (tab === 'appParams') {
    await wrapper.get('#tab-appParams').trigger('click')
    await flushPromises()
  }
}
beforeEach(() => {
  Object.values(api).forEach(mock => mock.mockReset().mockResolvedValue({ data: records }))
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

describe.each([
  ['系统参数', 'sysParams', 'sys', 0],
  ['应用参数', 'appParams', 'app', 1]
])('%s搜索分页', (_, tab, prefix, index) => {
  it('复制带首尾空格的关键词仍正常匹配并回首页，不改写参数原值', async () => {
    await open(tab)
    const pagination = wrapper.findAllComponents(ElPagination)[index]
    pagination.vm.$emit('update:current-page', 3)
    await flushPromises()
    await wrapper.get(`#pane-${tab} input`).setValue(' PARAM ')
    await flushPromises()
    expect(state()[`${prefix}CurrentPage`]).toBe(1)
    expect(state()[`${prefix}AppliedSearchKeyword`]).toBe('PARAM')
    expect(state()[prefix === 'sys' ? 'filteredSysParams' : 'filteredAppParams']).toHaveLength(25)
    expect(state()[`${prefix}Params`]).toEqual(records)
    expect(api[prefix === 'sys' ? 'getSysParams' : 'getAppParams']).toHaveBeenCalledTimes(1)
  })

  it('改变每页条数回首页，两个页签的页码/筛选独立', async () => {
    await open(tab)
    const pagination = wrapper.findAllComponents(ElPagination)[index]
    pagination.vm.$emit('update:current-page', 3)
    await flushPromises()
    pagination.vm.$emit('update:page-size', 20)
    pagination.vm.$emit('size-change', 20)
    await flushPromises()
    expect(state()[`${prefix}CurrentPage`]).toBe(1)
    expect(state()[prefix === 'sys' ? 'paginatedSysParams' : 'paginatedAppParams']).toHaveLength(20)
    expect(state()[`${prefix === 'sys' ? 'app' : 'sys'}CurrentPage`]).toBe(1)
    expect(api[prefix === 'sys' ? 'getSysParams' : 'getAppParams']).toHaveBeenCalledTimes(1)
  })
})
