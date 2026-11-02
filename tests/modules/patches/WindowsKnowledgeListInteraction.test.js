import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { ElTable, ElTableColumn } from 'element-plus'
import { ElMessage } from 'element-plus'
import { createMemoryHistory, createRouter } from 'vue-router'
import CvePage from '@/modules/patches/windows-patch/views/WindowsCveListPage.vue'
import KbPage from '@/modules/patches/windows-patch/views/WindowsKbListPage.vue'

const api = vi.hoisted(() => ({
  cveList: vi.fn(),
  kbList: vi.fn(),
  cveStats: vi.fn(),
  kbStats: vi.fn()
}))
vi.mock('@/modules/patches/api', () => ({
  winCveApi: { getCveList: api.cveList, getStatistics: api.cveStats },
  winKbApi: { getKbList: api.kbList, getStatistics: api.kbStats }
}))
vi.mock('@/modules/patches/components/cve/dialogs/ManualExportDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/patches/windows-patch/components/cve/details/WindowsCveDetail.vue', () => ({
  default: { name: 'WindowsCveDetail', props: ['cveId'], emits: ['back'], template: '<div />' }
}))
vi.mock('@/modules/patches/windows-patch/components/kb/WindowsKbDetail.vue', () => ({
  default: { name: 'WindowsKbDetail', props: ['kbNumber'], emits: ['back'], template: '<div />' }
}))
vi.mock('@/modules/patches/components/common/CveLinkList.vue', () => ({
  default: { template: '<div />' }
}))

const response = (rows = [], total = rows.length) => ({
  data: { content: rows, totalElements: total, totalPages: Math.ceil(total / 20), number: 0 }
})
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const DatePicker = {
  name: 'ElDatePicker',
  props: ['modelValue'],
  emits: ['update:modelValue', 'change'],
  template: '<input />'
}
const Select = {
  name: 'ElSelect',
  props: ['modelValue'],
  emits: ['update:modelValue', 'change'],
  template: '<div><slot /></div>'
}
const Input = {
  name: 'ElInput',
  props: ['modelValue'],
  emits: ['update:modelValue', 'clear'],
  template: '<input />'
}
let wrapper
const state = () => wrapper.vm.$.setupState
const button = text => wrapper.findAll('button').find(item => item.text() === text)
async function open(component = CvePage) {
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
        'el-button': {
          props: ['title', 'disabled'],
          template: '<button :title="title" :disabled="disabled"><slot /></button>'
        },
        'el-input': Input,
        'el-select': Select,
        'el-date-picker': DatePicker,
        'el-option': true,
        'el-icon': true,
        'el-link': true,
        'el-tag': { template: '<span><slot /></span>' },
        'el-pagination': {
          name: 'ElPagination',
          props: ['currentPage', 'pageSize', 'total'],
          emits: ['update:currentPage', 'current-change'],
          template: '<div />'
        }
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
}
async function changeDate(index, value) {
  const picker = wrapper.findAllComponents(DatePicker)[index]
  picker.vm.$emit('update:modelValue', value)
  picker.vm.$emit('change', value)
  await flushPromises()
}
beforeEach(() => {
  Object.values(api).forEach(mock => mock.mockReset())
  api.cveList.mockResolvedValue(response())
  api.kbList.mockResolvedValue(response())
  api.cveStats.mockResolvedValue({ data: { totalCves: 0, bySeverity: {} } })
  api.kbStats.mockResolvedValue({ data: {} })
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

describe('Windows 知识列表查询交互', () => {
  it('CVE选择发布日期立即查询、回首页，并回显原策略自动补齐的结束日期', async () => {
    await open()
    state().searchParams.page = 3
    state().searchParams.size = 50
    await changeDate(0, '2026-01-12')
    expect(api.cveList).toHaveBeenCalledTimes(2)
    expect(api.cveList.mock.calls.at(-1)[0]).toMatchObject({
      page: 0,
      size: 50,
      startDate: '2026-01-12',
      endDate: '2027-01-12'
    })
    expect(wrapper.findAllComponents(DatePicker)[1].props('modelValue')).toBe('2027-01-12')
    await changeDate(1, '2026-08-12')
    expect(api.cveList.mock.calls.at(-1)[0].endDate).toBe('2026-08-12')
    await changeDate(0, null)
    expect(api.cveList.mock.calls.at(-1)[0].startDate).toBe('')
    expect(api.cveList).toHaveBeenCalledTimes(4)
  })

  it('CVE当前页刷新保持页码和排序，明确搜索仍回首页', async () => {
    await open()
    state().searchParams.page = 3
    state().searchParams.sortBy = 'cvss3Score'
    state().searchParams.sortDir = 'asc'
    await wrapper.get('button[title="刷新"]').trigger('click')
    await flushPromises()
    expect(api.cveList.mock.calls.at(-1)[0]).toMatchObject({
      page: 3,
      sortBy: 'cvss3Score',
      sortDir: 'asc'
    })
    await button('搜索').trigger('click')
    await flushPromises()
    expect(state().searchParams.page).toBe(0)
  })

  it('CVE重置同步清除日期控件及查询字段', async () => {
    await open()
    await changeDate(0, '2026-01-12')
    await button('重置').trigger('click')
    await flushPromises()
    expect(wrapper.findAllComponents(DatePicker).map(picker => picker.props('modelValue'))).toEqual(
      [null, null]
    )
    expect(api.cveList.mock.calls.at(-1)[0]).toMatchObject({
      severity: 'all',
      startDate: '',
      endDate: '',
      page: 0,
      sortBy: 'publicDate',
      sortDir: 'desc'
    })
  })

  it('KB日期选择沿原查询，保留每页大小', async () => {
    await open(KbPage)
    state().searchParams.page = 2
    state().searchParams.size = 100
    await changeDate(0, '2026-01-12')
    expect(api.kbList.mock.calls.at(-1)[0]).toMatchObject({
      startDate: '2026-01-12',
      page: 0,
      size: 100
    })
    await nextTick()
  })
})

describe.each([
  {
    label: 'CVE',
    component: CvePage,
    getList: api.cveList,
    stateKey: 'cveList',
    scoreKey: 'cvss3Score'
  },
  {
    label: 'KB',
    component: KbPage,
    getList: api.kbList,
    stateKey: 'kbList',
    scoreKey: 'maxCvss3Score'
  }
])('$label列表连续查看', ({ component, getList, stateKey, scoreKey }) => {
  it('切换筛选时冻结每次参数，旧响应不能覆盖新结果/总数', async () => {
    await open(component)
    const old = deferred(),
      latest = deferred()
    getList.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    const select = wrapper.findComponent(Select)
    select.vm.$emit('update:modelValue', 'Critical')
    select.vm.$emit('change', 'Critical')
    await nextTick()
    select.vm.$emit('update:modelValue', 'Important')
    select.vm.$emit('change', 'Important')
    await nextTick()
    expect(getList.mock.calls[1][0].severity).toBe('Critical')
    expect(getList.mock.calls[2][0].severity).toBe('Important')
    const row = { id: 'current', cveId: 'CVE-current', kbNumber: 'KB-current' }
    latest.resolve(response([row], 1))
    await flushPromises()
    old.resolve(response([{ id: 'obsolete' }], 99))
    await flushPromises()
    expect(state()[stateKey]).toEqual([row])
    expect(state().pagination.totalElements).toBe(1)
    expect(state().loading).toBe(false)
  })

  it('旧查询失败不影响仍在途的新查询，不弹旧错误', async () => {
    vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
    await open(component)
    const old = deferred(),
      latest = deferred()
    getList.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    await button('搜索').trigger('click')
    await button('搜索').trigger('click')
    old.reject(new Error('obsolete'))
    await flushPromises()
    expect(ElMessage.error).not.toHaveBeenCalled()
    expect(state().loading).toBe(true)
    latest.resolve(response())
    await flushPromises()
    expect(state().loading).toBe(false)
  })

  it('卸载后不处理迟到的查询错误', async () => {
    vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
    await open(component)
    const pending = deferred()
    getList.mockReturnValueOnce(pending.promise)
    await button('搜索').trigger('click')
    wrapper.unmount()
    wrapper = null
    pending.reject(new Error('closed'))
    await flushPromises()
    expect(ElMessage.error).not.toHaveBeenCalled()
  })

  it('日期范围倒置时提示校验，修正后恢复原查询', async () => {
    vi.spyOn(ElMessage, 'warning').mockImplementation(() => {})
    await open(component)
    await changeDate(1, '2026-02-01')
    const previousCalls = getList.mock.calls.length
    await changeDate(0, '2026-03-01')
    expect(getList).toHaveBeenCalledTimes(previousCalls)
    expect(ElMessage.warning).toHaveBeenCalledWith('开始日期不能晚于结束日期')
    await wrapper.get('button[title="刷新"]').trigger('click')
    await flushPromises()
    expect(getList).toHaveBeenCalledTimes(previousCalls)
    await changeDate(1, '2026-04-01')
    expect(getList).toHaveBeenCalledTimes(previousCalls + 1)
    expect(getList.mock.calls.at(-1)[0]).toMatchObject({
      startDate: '2026-03-01',
      endDate: '2026-04-01'
    })
  })

  it('合法零分显示0.0，缺失及非法评分保持空值占位', async () => {
    getList.mockResolvedValue(
      response(
        [0, null, 'invalid'].map((score, index) => ({
          cveId: `CVE-score-${index}`,
          kbNumber: `KB-score-${index}`,
          [scoreKey]: score
        }))
      )
    )
    await open(component)
    const rows = wrapper.findAll('.el-table__body tbody tr')
    expect(rows[0].text()).toContain('0.0')
    expect(rows[1].text()).not.toContain('0.0')
    expect(rows[2].text()).not.toContain('NaN')
    expect(rows[2].text()).toContain('-')
  })
})
