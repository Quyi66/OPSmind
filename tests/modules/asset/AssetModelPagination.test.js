import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ElPagination, ElTable, ElTableColumn } from 'element-plus'
import { createMemoryHistory, createRouter } from 'vue-router'
import Page from '@/modules/asset/views/AssetModelPage.vue'

const getAssetTypes = vi.hoisted(() => vi.fn())
vi.mock('@/modules/asset/api', () => ({ assetApi: { getAssetTypes } }))
vi.mock('@/modules/asset/views/ModelEditor.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/modules/asset/components/model/ImportModelDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/asset/components/model/ModelDetailDialog.vue', () => ({
  default: { template: '<div />' }
}))

const models = count =>
  Array.from({ length: count }, (_, i) => ({
    id: `model-${i + 1}`,
    code: `ci-${i + 1}`,
    title: `模型-${i + 1}`,
    count: i,
    is_auto: 1
  }))
let wrapper
const viewAssetType = vi.fn()
const state = () => wrapper.vm.$.setupState
async function open() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/acm/model', component: Page }]
  })
  await router.push('/acm/model')
  await router.isReady()
  wrapper = mount(Page, {
    global: {
      plugins: [router],
      components: { ElTable, ElTableColumn, ElPagination },
      provide: { handleViewAssetType: viewAssetType },
      stubs: {
        'el-button': { template: '<button><slot /></button>' },
        'el-link': { template: '<button><slot /></button>' },
        'el-icon': true,
        'el-tag': { template: '<span><slot /></span>' }
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
}
async function page(value) {
  wrapper.findComponent(ElPagination).vm.$emit('update:current-page', value)
  await flushPromises()
}
beforeEach(() => {
  getAssetTypes.mockReset().mockResolvedValue({ records: models(25) })
  viewAssetType.mockReset()
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

describe('资产模型列表分页', () => {
  it('25条模型按10/10/5展示，翻页不请求，模型链接仍使用本行真实资产代码', async () => {
    await open()
    expect(wrapper.findAll('.el-table__body-wrapper tbody tr')).toHaveLength(10)
    await page(2)
    const firstRow = wrapper.findAll('.el-table__body-wrapper tbody tr')[0]
    expect(firstRow.text()).toContain('模型-11')
    await firstRow.get('button.model-name-link').trigger('click')
    expect(viewAssetType).toHaveBeenCalledWith('ci-11')
    await page(3)
    expect(wrapper.findAll('.el-table__body-wrapper tbody tr')).toHaveLength(5)
    expect(getAssetTypes).toHaveBeenCalledTimes(1)
  })

  it('改变每页条数回首页，展示20条且不重新加载', async () => {
    await open()
    await page(3)
    const pagination = wrapper.findComponent(ElPagination)
    pagination.vm.$emit('update:page-size', 20)
    pagination.vm.$emit('size-change', 20)
    await flushPromises()
    expect(state().pagination.page).toBe(1)
    expect(wrapper.findAll('.el-table__body-wrapper tbody tr')).toHaveLength(20)
    expect(getAssetTypes).toHaveBeenCalledTimes(1)
  })

  it('刷新保持现有页码，数量减少及空列表时分页/表格一致', async () => {
    await open()
    await page(3)
    await wrapper.get('button[title="刷新"]').trigger('click')
    await flushPromises()
    expect(state().pagination.page).toBe(3)
    getAssetTypes.mockResolvedValueOnce({ records: models(11) })
    await wrapper.get('button[title="刷新"]').trigger('click')
    await flushPromises()
    expect(state().pagination.page).toBe(2)
    expect(state().paginatedModelList).toHaveLength(1)
    getAssetTypes.mockResolvedValueOnce({ records: [] })
    await wrapper.get('button[title="刷新"]').trigger('click')
    await flushPromises()
    expect(state().pagination.page).toBe(1)
    expect(state().paginatedModelList).toEqual([])
  })
})
