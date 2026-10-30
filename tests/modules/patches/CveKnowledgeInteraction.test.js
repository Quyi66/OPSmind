import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ElMessage, ElTable, ElTableColumn } from 'element-plus'
import { createMemoryHistory, createRouter } from 'vue-router'
import CommonCvePage from '@/modules/patches/views/CveListPage.vue'
import MiddlewareCvePage from '@/modules/patches/views/MiddlewareCveListPage.vue'

const api = vi.hoisted(() => ({
  common: vi.fn(),
  middleware: vi.fn(),
  stats: vi.fn(),
  types: vi.fn()
}))
vi.mock('@/modules/patches/api', () => ({
  cveApi: { getCveList: api.common, getStatistics: api.stats },
  middlewareCveApi: { getList: api.middleware, getMiddlewareTypes: api.types }
}))
vi.mock('@/modules/patches/components/cve/details/CveDetail.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/patches/components/cve/details/MiddlewareCveDetail.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/patches/components/cve/MiddlewareAffectedHostsDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/patches/components/cve/dialogs/ManualExportDialog.vue', () => ({
  default: { template: '<div />' }
}))

const DatePicker = {
  name: 'ElDatePicker',
  props: ['modelValue'],
  emits: ['update:modelValue', 'change'],
  template: '<input />'
}
const Pagination = {
  name: 'ElPagination',
  emits: ['update:currentPage', 'current-change'],
  template: '<div />'
}
const response = rows => ({ data: { content: rows, totalElements: rows.length, number: 0 } })
let wrapper
const state = () => wrapper.vm.$.setupState
async function open(component) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component }]
  })
  await router.push('/')
  await router.isReady()
  wrapper = mount(component, {
    global: {
      plugins: [router],
      components: { ElTable, ElTableColumn },
      stubs: {
        'el-form': { template: '<form @submit.prevent><slot /></form>' },
        'el-form-item': { template: '<div><slot /></div>' },
        'el-input': true,
        'el-select': { template: '<div><slot /></div>' },
        'el-option': true,
        'el-date-picker': DatePicker,
        'el-pagination': Pagination,
        'el-button': { template: '<button><slot /></button>' },
        'el-icon': true,
        'el-tag': { template: '<span><slot /></span>' }
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
}
async function date(index, value) {
  const picker = wrapper.findAllComponents(DatePicker)[index]
  picker.vm.$emit('update:modelValue', value)
  picker.vm.$emit('change', value)
  await flushPromises()
}
beforeEach(() => {
  Object.values(api).forEach(mock => mock.mockReset())
  api.common.mockResolvedValue(response([]))
  api.middleware.mockResolvedValue(response([]))
  api.stats.mockResolvedValue({ data: { totalCves: 0, bySeverity: {} } })
  api.types.mockResolvedValue({ data: ['Tomcat'] })
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
  ['通用漏洞', CommonCvePage, api.common],
  ['中间件漏洞', MiddlewareCvePage, api.middleware]
])('%s列表日期与评分', (_, component, getList) => {
  it('CVSS数值0和数字字符串正确展示，空值/非法值不伪造为分数', async () => {
    getList.mockResolvedValue(
      response(
        [0, '9.8', null, 'invalid', 11].map((cvss3Score, index) => ({
          cveId: `CVE-score-${index}`,
          cvss3Score
        }))
      )
    )
    await open(component)
    const scores = wrapper
      .findAll('.el-table__body-wrapper tbody tr')
      .map(row => row.findAll('td')[component === CommonCvePage ? 2 : 3].text())
    expect(scores).toEqual(['0.0', '9.8', '-', '-', '-'])
  })

  it('选日期立即查询并回首页，自动结束日期回显，清空与重置同步参数', async () => {
    await open(component)
    state().searchParams.page = 3
    state().searchParams.size = 50
    await date(0, '2026-01-12')
    expect(getList.mock.calls.at(-1)[0]).toMatchObject({
      startDate: '2026-01-12',
      endDate: '2027-01-12',
      page: 0,
      size: 50
    })
    expect(wrapper.findAllComponents(DatePicker)[1].props('modelValue')).toBe('2027-01-12')
    expect(getList).toHaveBeenCalledTimes(2)
    await date(1, '2026-09-12')
    expect(getList.mock.calls.at(-1)[0].endDate).toBe('2026-09-12')
    await date(0, null)
    expect(getList.mock.calls.at(-1)[0].startDate).toBe('')
    await wrapper
      .findAll('button')
      .find(item => item.text() === '重置')
      .trigger('click')
    await flushPromises()
    expect(getList.mock.calls.at(-1)[0]).toMatchObject({ startDate: '', endDate: '', page: 0 })
    expect(wrapper.findAllComponents(DatePicker).map(item => item.props('modelValue'))).toEqual([
      null,
      null
    ])
  })

  it('倒置日期不提交搜索或分页请求，修正后正常查询', async () => {
    vi.spyOn(ElMessage, 'warning').mockImplementation(() => {})
    await open(component)
    await date(1, '2026-02-01')
    const count = getList.mock.calls.length
    await date(0, '2026-03-01')
    expect(getList).toHaveBeenCalledTimes(count)
    expect(ElMessage.warning).toHaveBeenCalledWith('开始日期不能晚于结束日期')
    wrapper.findComponent(Pagination).vm.$emit('current-change', 2)
    await flushPromises()
    expect(getList).toHaveBeenCalledTimes(count)
    await date(1, '2026-04-01')
    expect(getList).toHaveBeenCalledTimes(count + 1)
  })
})

it('通用漏洞刷新保留当前页、排序及每页条数，搜索仍回首页', async () => {
  await open(CommonCvePage)
  Object.assign(state().searchParams, { page: 3, size: 50, sortBy: 'cvss3Score', sortDir: 'asc' })
  await wrapper.get('button[title="刷新"]').trigger('click')
  await flushPromises()
  expect(api.common.mock.calls.at(-1)[0]).toMatchObject({
    page: 3,
    size: 50,
    sortBy: 'cvss3Score',
    sortDir: 'asc'
  })
  await wrapper
    .findAll('button')
    .find(item => item.text() === '搜索')
    .trigger('click')
  await flushPromises()
  expect(api.common.mock.calls.at(-1)[0].page).toBe(0)
})
