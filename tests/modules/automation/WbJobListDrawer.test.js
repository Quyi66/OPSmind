import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import WbJobListDrawer from '@/modules/automation/components/workbench/WbJobListDrawer.vue'
import { appTableList } from '@/modules/automation/api/jao'

vi.mock('@/modules/automation/api/jao', () => ({ appTableList: vi.fn() }))
vi.mock('@/utils/i18n', () => ({ translateText: text => text || '' }))

let wrapper
beforeEach(() => {
  vi.mocked(appTableList)
    .mockReset()
    .mockResolvedValue({
      data: [
        {
          id: 'tool-1',
          title: '连通性检测',
          type: 'script',
          appletCode: 'legacy-app-code',
          description: '检查服务器网络',
          updatedBy: 'operator'
        }
      ]
    })
})
afterEach(() => wrapper?.unmount())

async function openDrawer() {
  wrapper = shallowMount(WbJobListDrawer, {
    props: { visible: false },
    global: {
      stubs: { ElDrawer: { template: '<div><slot /><slot name="footer" /></div>' }, ElAlert: true },
      directives: { loading: () => {} }
    }
  })
  await wrapper.setProps({ visible: true })
  await flushPromises()
  return wrapper.vm.$.setupState
}

describe('工具列表取消旧所属应用概念', () => {
  it('数据带旧应用字段时仍展示工具，但不展示应用信息', async () => {
    const state = await openDrawer()
    expect(state.filteredJobs).toHaveLength(1)
    expect(wrapper.text()).toContain('operator')
    expect(wrapper.text()).not.toContain('legacy-app-code')
    expect(wrapper.text()).not.toContain('应用范围')
  })

  it('关键词不再匹配隐藏的应用字段，仍可匹配工具说明和更新人', async () => {
    const state = await openDrawer()
    state.filters.keyword = 'legacy-app-code'
    state.handleSearch()
    expect(state.filteredJobs).toHaveLength(0)
    for (const keyword of ['网络', 'operator', 'tool-1']) {
      state.filters.keyword = keyword
      state.handleSearch()
      expect(state.filteredJobs).toHaveLength(1)
    }
    state.handleReset()
    expect(state.hasActiveFilters).toBe(false)
  })
})
