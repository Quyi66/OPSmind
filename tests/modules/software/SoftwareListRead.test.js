import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import { computed, defineComponent, h, inject, KeepAlive, nextTick, provide, ref } from 'vue'
import ElPagination from 'element-plus/es/components/pagination/index.mjs'
import HostOverviewTable from '@/modules/software/components/overview/HostOverviewTable.vue'
import AvailablePackagesTable from '@/modules/software/components/overview/AvailablePackagesTable.vue'
import RepoManagementPage from '@/modules/software/views/RepoManagementPage.vue'
import CustomRepoTab from '@/modules/software/components/repo/CustomRepoTab.vue'
import { useSoftwareListRead } from '@/modules/software/composables/useSoftwareListRead'

const mocks = vi.hoisted(() => ({
  hosts: vi.fn(),
  packages: vi.fn(),
  base: vi.fn(),
  custom: vi.fn(),
  defaultHosts: vi.fn(),
  deleteRepo: vi.fn(),
  confirm: vi.fn(),
  warning: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  scan: vi.fn()
}))
vi.mock('@/modules/software/api', () => ({
  hostOverviewApi: { getList: mocks.hosts },
  packageApi: { getAvailableList: mocks.packages },
  repoApi: {
    getRepoList: mocks.base,
    getCustomRepoList: mocks.custom,
    getRepoDefaultHosts: mocks.defaultHosts,
    deleteCustomRepo: mocks.deleteRepo
  },
  softwareScanApi: { scan: mocks.scan }
}))
vi.mock('element-plus', () => ({
  ElMessage: { warning: mocks.warning, success: mocks.success, error: mocks.error },
  ElMessageBox: { confirm: mocks.confirm }
}))
vi.mock('@/composables/useJobPolling', () => ({
  useJobPolling: () => ({ startPolling: vi.fn(), isPolling: ref(false) })
}))
vi.mock('@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue', () => ({
  default: { template: '<div />' }
}))

const result = (id = 'record-1', total = 37) => ({
  data: { records: [{ id, repo_name: id, repo_id: id, host_key: id, pkg_name: id }], total }
})
const empty = () => ({ data: { records: [], total: 0 } })
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const wrappers = []
const Table = defineComponent({
  name: 'ElTable',
  props: ['data', 'emptyText'],
  emits: ['selection-change'],
  setup(props) {
    provide(
      'listRows',
      computed(() => props.data)
    )
  },
  template: '<div><slot /><p v-if="!data.length">{{ emptyText }}</p></div>'
})
const Column = defineComponent({
  name: 'ElTableColumn',
  inheritAttrs: false,
  props: ['type', 'selectable'],
  setup(_props, { slots }) {
    const rows = inject('listRows')
    return () => rows.value.flatMap(row => slots.default?.({ row }) || [])
  }
})
const global = {
  renderStubDefaultSlot: true,
  stubs: {
    ElTable: Table,
    ElTableColumn: Column,
    'el-button': {
      name: 'ElButton',
      props: ['disabled', 'loading'],
      emits: ['click'],
      template:
        '<button :disabled="disabled || loading" @click="$emit(\'click\')"><slot /></button>'
    },
    ElAlert: {
      name: 'ElAlert',
      props: ['title'],
      template: '<aside role="alert">{{ title }}<slot name="title" /></aside>'
    },
    ElPagination: {
      name: 'ElPagination',
      props: ['total', 'currentPage', 'pageSize'],
      template: '<nav>{{ total }}</nav>'
    },
    ElForm: { template: '<div><slot /></div>' },
    ElFormItem: { template: '<div><slot /></div>' },
    ElInput: { template: '<input />' },
    ElIcon: { template: '<span><slot /></span>' },
    ElCheckboxGroup: { template: '<div><slot /></div>' },
    ElCheckbox: { template: '<div><slot /></div>' },
    ElTooltip: { template: '<span><slot /></span>' },
    ElTag: { template: '<span><slot /></span>' },
    ElDialog: { template: '<div />' },
    RepoDetailDialog: { template: '<div />' },
    HostDetailDialog: { template: '<div />' },
    ConfigRepoToHostDialog: {
      name: 'ConfigRepoToHostDialog',
      props: ['modelValue', 'selectedRepos'],
      template: '<div />'
    },
    RepoAddDialog: {
      name: 'RepoAddDialog',
      props: ['modelValue', 'repoData'],
      template: '<div />'
    },
    RepoImportDialog: { template: '<div />' }
  },
  directives: { loading: () => {} }
}
const cases = [
  {
    name: '主机概览',
    component: HostOverviewTable,
    api: mocks.hosts,
    params: { page: 1, size: 10, orderBy: 'scan_date desc' }
  },
  {
    name: '可用软件包',
    component: AvailablePackagesTable,
    api: mocks.packages,
    params: { page: 1, size: 10, filter: '' }
  },
  {
    name: '基准仓库',
    component: RepoManagementPage,
    api: mocks.base,
    params: { page: 1, size: 10, repoStatus: 'enabled' },
    base: true
  },
  { name: '自定义仓库', component: CustomRepoTab, api: mocks.custom, params: { page: 1, size: 10 } }
]
function open(testCase) {
  const wrapper = shallowMount(testCase.component, { global })
  wrappers.push(wrapper)
  return wrapper
}
function rows(wrapper, testCase) {
  return testCase.base ? wrapper.vm.baseRepoData : wrapper.vm.tableData
}
function load(wrapper, testCase) {
  return testCase.base ? wrapper.vm.loadBaseRepos() : wrapper.vm.loadData()
}
function readLoading(wrapper, testCase) {
  return testCase.base ? wrapper.vm.baseRepoLoading : wrapper.vm.loading
}
function retryButton(wrapper) {
  return wrapper
    .findAll('button')
    .find(button => button.attributes('title') === '重试读取' || button.text() === '重试读取')
}
function action(wrapper, label) {
  return wrapper.findAll('button').find(button => button.text() === label)
}

beforeEach(() => {
  vi.resetAllMocks()
  for (const testCase of cases) testCase.api.mockResolvedValue(result())
  mocks.defaultHosts.mockResolvedValue(empty())
  mocks.confirm.mockResolvedValue('confirm')
  mocks.deleteRepo.mockResolvedValue({})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.restoreAllMocks()
})

describe.each(cases)('$name 的只读读取反馈', testCase => {
  it('区分首次失败与成功空结果，使用唯一重试入口恢复且不展示未核实总数', async () => {
    testCase.api.mockRejectedValueOnce(new Error('network'))
    const wrapper = open(testCase)
    await flushPromises()
    expect(wrapper.text()).toContain('读取失败')
    expect(wrapper.text()).not.toContain('暂无数据')
    expect(wrapper.findComponent({ name: 'ElPagination' }).exists()).toBe(false)
    expect(retryButton(wrapper)).toBeDefined()
    testCase.api.mockResolvedValueOnce(empty())
    await retryButton(wrapper).trigger('click')
    await flushPromises()
    expect(testCase.api).toHaveBeenLastCalledWith(testCase.params)
    expect(wrapper.text()).toContain('暂无数据')
    expect(wrapper.text()).not.toContain('读取失败')
    expect(wrapper.findComponent({ name: 'ElPagination' }).props('total')).toBe(0)
    expect(mocks.scan).not.toHaveBeenCalled()
    expect(mocks.deleteRepo).not.toHaveBeenCalled()
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it('同条件刷新失败保留行和总数，只有重试成功才替换并消除过期提示', async () => {
    const wrapper = open(testCase)
    await flushPromises()
    testCase.api.mockRejectedValueOnce(new Error('offline'))
    await load(wrapper, testCase)
    await nextTick()
    expect(rows(wrapper, testCase)).toEqual(result().data.records)
    expect(wrapper.findComponent({ name: 'ElPagination' }).props('total')).toBe(37)
    expect(wrapper.text()).toContain('可能已过期')
    const pending = deferred()
    testCase.api.mockReturnValueOnce(pending.promise)
    await retryButton(wrapper).trigger('click')
    expect(wrapper.text()).toContain('可能已过期')
    pending.resolve(result('fresh', 41))
    await flushPromises()
    expect(rows(wrapper, testCase)[0].id).toBe('fresh')
    expect(wrapper.findComponent({ name: 'ElPagination' }).props('total')).toBe(41)
    expect(wrapper.text()).not.toContain('可能已过期')
  })

  it('成功空结果后刷新失败也标记为上次成功结果', async () => {
    testCase.api.mockResolvedValueOnce(empty())
    const wrapper = open(testCase)
    await flushPromises()
    testCase.api.mockRejectedValueOnce(new Error('offline'))
    await load(wrapper, testCase)
    await nextTick()
    expect(wrapper.text()).toContain('上次成功结果')
    expect(wrapper.text()).not.toContain('暂无数据')
    expect(wrapper.findComponent({ name: 'ElPagination' }).props('total')).toBe(0)
  })

  it('换页失败不混用旧页数据，重试保留页码和页大小', async () => {
    const wrapper = open(testCase)
    await flushPromises()
    if (testCase.base) {
      wrapper.vm.baseRepoPage = 3
      wrapper.vm.baseRepoPageSize = 20
    } else if (testCase.name === '自定义仓库') {
      wrapper.vm.currentPage = 3
      wrapper.vm.pageSize = 20
    } else {
      wrapper.vm.pagination.page = 3
      wrapper.vm.pagination.pageSize = 20
    }
    testCase.api.mockRejectedValueOnce(new Error('page failed'))
    await load(wrapper, testCase)
    await nextTick()
    expect(rows(wrapper, testCase)).toEqual([])
    expect(wrapper.text()).not.toContain('上次成功结果')
    expect(wrapper.findComponent({ name: 'ElPagination' }).exists()).toBe(false)
    await retryButton(wrapper).trigger('click')
    await flushPromises()
    expect(testCase.api).toHaveBeenLastCalledWith({ ...testCase.params, page: 3, size: 20 })
    expect(wrapper.findComponent({ name: 'ElPagination' }).props('currentPage')).toBe(3)
  })

  it('新查询读取中不沿用旧查询失败提示，迟到旧响应不能填入新页', async () => {
    const wrapper = open(testCase)
    await flushPromises()
    testCase.api.mockRejectedValueOnce(new Error('old query failure'))
    await load(wrapper, testCase)
    const old = deferred(),
      latest = deferred()
    testCase.api.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    const first = load(wrapper, testCase)
    if (testCase.base) wrapper.vm.baseRepoPage = 2
    else if (testCase.name === '自定义仓库') wrapper.vm.currentPage = 2
    else wrapper.vm.pagination.page = 2
    const second = load(wrapper, testCase)
    await nextTick()
    expect(wrapper.text()).not.toContain('刷新失败')
    expect(rows(wrapper, testCase)).toEqual([])
    old.resolve(result('old-page'))
    await first
    expect(rows(wrapper, testCase)).toEqual([])
    expect(readLoading(wrapper, testCase)).toBe(true)
    latest.resolve(result('page-2'))
    await second
    expect(rows(wrapper, testCase)[0].id).toBe('page-2')
  })

  it('迟到失败不能清新数据或提前结束新请求loading，迟到成功也不能覆盖新结果', async () => {
    const wrapper = open(testCase)
    await flushPromises()
    const old = deferred(),
      latest = deferred()
    testCase.api.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    const first = load(wrapper, testCase),
      second = load(wrapper, testCase)
    old.reject(new Error('old failure'))
    await first
    expect(readLoading(wrapper, testCase)).toBe(true)
    latest.resolve(result('latest'))
    await second
    const lateSuccess = deferred()
    testCase.api.mockReturnValueOnce(lateSuccess.promise).mockResolvedValueOnce(result('newest'))
    const third = load(wrapper, testCase)
    await load(wrapper, testCase)
    lateSuccess.resolve(result('obsolete'))
    await third
    expect(rows(wrapper, testCase)[0].id).toBe('newest')
    expect(readLoading(wrapper, testCase)).toBe(false)
    expect(wrapper.text()).not.toContain('读取失败')
  })

  it('卸载后忽略在途结果', async () => {
    const pending = deferred()
    testCase.api.mockReturnValueOnce(pending.promise)
    const wrapper = open(testCase),
      vm = wrapper.vm
    wrapper.unmount()
    pending.resolve(result('unmounted'))
    await flushPromises()
    expect(testCase.base ? vm.baseRepoData : vm.tableData).toEqual([])
  })

  it('权限拒绝清除旧结果且不提供普通网络重试', async () => {
    const wrapper = open(testCase)
    await flushPromises()
    if (testCase.base) wrapper.vm.selectedBaseRepos = result().data.records
    if (testCase.name === '自定义仓库') wrapper.vm.selectedRows = result().data.records
    testCase.api.mockRejectedValueOnce(new Error('Access denied'))
    await load(wrapper, testCase)
    await nextTick()
    expect(rows(wrapper, testCase)).toEqual([])
    expect(wrapper.text()).toContain('无权访问')
    expect(wrapper.text()).not.toContain('可能已过期')
    const button = retryButton(wrapper)
    if (button) expect(button.element.disabled).toBe(true)
    if (testCase.base) expect(wrapper.vm.selectedBaseRepos).toEqual([])
    if (testCase.name === '自定义仓库') expect(wrapper.vm.selectedRows).toEqual([])
  })
})

describe('查询草稿与仓库操作边界', () => {
  it.each(cases)(
    '$name 使用真实Element分页时，刷新失败保留当前页与总数且不额外发请求',
    async testCase => {
      testCase.api.mockResolvedValue(result('record', 97))
      const wrapper = shallowMount(testCase.component, {
        global: { ...global, stubs: { ...global.stubs, ElPagination } }
      })
      wrappers.push(wrapper)
      await flushPromises()
      if (testCase.base) {
        wrapper.vm.baseRepoPage = 3
        wrapper.vm.baseRepoPageSize = 20
      } else if (testCase.name === '自定义仓库') {
        wrapper.vm.currentPage = 3
        wrapper.vm.pageSize = 20
      } else {
        wrapper.vm.pagination.page = 3
        wrapper.vm.pagination.pageSize = 20
      }
      await load(wrapper, testCase)
      await flushPromises()
      const calls = testCase.api.mock.calls.length
      testCase.api.mockRejectedValueOnce(new Error('refresh failed'))
      await load(wrapper, testCase)
      await flushPromises()
      const pagination = wrapper.findComponent(ElPagination)
      expect(pagination.props('currentPage')).toBe(3)
      expect(pagination.props('pageSize')).toBe(20)
      expect(pagination.props('total')).toBe(97)
      expect(testCase.api).toHaveBeenCalledTimes(calls + 1)
      expect(wrapper.text()).toContain('可能已过期')
    }
  )

  it.each(cases.slice(0, 2))(
    '$name 重试不提交尚未搜索的草稿，显式搜索才切换条件',
    async testCase => {
      const wrapper = open(testCase)
      await flushPromises()
      const field = testCase.name === '主机概览' ? 'localSearchText' : 'filterText'
      wrapper.vm[field] = 'alpha'
      wrapper.vm.handleSearch()
      await flushPromises()
      wrapper.vm.handlePageChange(3)
      await flushPromises()
      testCase.api.mockRejectedValueOnce(new Error('refresh failed'))
      await wrapper.vm.refresh()
      wrapper.vm[field] = 'draft-beta'
      await nextTick()
      await retryButton(wrapper).trigger('click')
      await flushPromises()
      expect(testCase.api).toHaveBeenLastCalledWith({
        ...testCase.params,
        filter: 'alpha',
        page: 3
      })
      expect(wrapper.vm[field]).toBe('draft-beta')
      wrapper.vm.handleSearch()
      await flushPromises()
      expect(testCase.api).toHaveBeenLastCalledWith({
        ...testCase.params,
        filter: 'draft-beta',
        page: 1
      })
    }
  )

  it('基准仓库换状态失败不回退旧筛选，原页码保持且旧选择清空', async () => {
    const wrapper = open(cases[2])
    await flushPromises()
    wrapper.vm.selectedBaseRepos = result().data.records
    wrapper.vm.baseRepoStatus = ['disabled']
    wrapper.vm.baseRepoPage = 3
    mocks.base.mockRejectedValueOnce(new Error('status failed'))
    await wrapper.vm.loadBaseRepos()
    await nextTick()
    expect(wrapper.vm.selectedBaseRepos).toEqual([])
    expect(wrapper.vm.baseRepoData).toEqual([])
    await retryButton(wrapper).trigger('click')
    await flushPromises()
    expect(mocks.base).toHaveBeenLastCalledWith({ page: 3, size: 10, repoStatus: 'disabled' })
  })

  it.each(cases.slice(2))(
    '$name 旧仓库行仅供查看，关联操作不可用，独立入口保留',
    async testCase => {
      const wrapper = open(testCase)
      await flushPromises()
      const selected = testCase.base ? 'selectedBaseRepos' : 'selectedRows'
      wrapper.vm[selected] = result().data.records
      testCase.api.mockRejectedValueOnce(new Error('offline'))
      await load(wrapper, testCase)
      await nextTick()
      expect(action(wrapper, '配置到主机').element.disabled).toBe(true)
      const selection = wrapper
        .findAllComponents(Column)
        .find(column => column.props('type') === 'selection')
      expect(selection.props('selectable')()).toBe(false)
      if (testCase.base) wrapper.vm.handleConfigRepoToHost()
      else {
        expect(action(wrapper, '编辑').element.disabled).toBe(true)
        expect(action(wrapper, '删除').element.disabled).toBe(true)
        expect(action(wrapper, '添加仓库').element.disabled).toBe(false)
        expect(action(wrapper, '仓库导入').element.disabled).toBe(false)
        expect(action(wrapper, '模板下载').element.disabled).toBe(false)
        wrapper.vm.handleEdit(result().data.records[0])
        await wrapper.vm.handleDelete(result().data.records[0])
        wrapper.vm.handleConfigToHost()
        expect(wrapper.vm.addDialogVisible).toBe(false)
      }
      expect(wrapper.vm.configDialogVisible).toBe(false)
      expect(mocks.confirm).not.toHaveBeenCalled()
      expect(mocks.deleteRepo).not.toHaveBeenCalled()
      await retryButton(wrapper).trigger('click')
      await flushPromises()
      wrapper.vm[selected] = result().data.records
      await nextTick()
      expect(action(wrapper, '配置到主机').element.disabled).toBe(false)
    }
  )

  it('自定义仓库确认期间读取失效后不提交删除；正常确认保留原id和必要确认', async () => {
    const wrapper = open(cases[3])
    await flushPromises()
    const confirmation = deferred()
    mocks.confirm.mockReturnValueOnce(confirmation.promise)
    const deleting = wrapper.vm.handleDelete({ id: 'real-id' })
    mocks.custom.mockRejectedValueOnce(new Error('refresh failed'))
    await wrapper.vm.loadData()
    confirmation.resolve('confirm')
    await deleting
    expect(mocks.deleteRepo).not.toHaveBeenCalled()
    await wrapper.vm.retry()
    await wrapper.vm.handleDelete({ id: 0 })
    expect(mocks.confirm).toHaveBeenLastCalledWith('确认删除选中镜像源？', '确认删除', {
      type: 'warning'
    })
    expect(mocks.deleteRepo).toHaveBeenCalledExactlyOnceWith(0)
  })

  it('离开基准tab后忽略旧请求，回来不自动重读，可以手动恢复原参数', async () => {
    const pending = deferred()
    mocks.base.mockReturnValueOnce(pending.promise)
    const wrapper = open(cases[2])
    wrapper.vm.handleTabChange('customRepo')
    await nextTick()
    pending.resolve(result('obsolete'))
    await flushPromises()
    wrapper.vm.handleTabChange('baseRepo')
    await nextTick()
    expect(wrapper.vm.baseRepoData).toEqual([])
    expect(wrapper.vm.baseRepoLoading).toBe(false)
    expect(wrapper.text()).toContain('读取已中断')
    expect(mocks.base).toHaveBeenCalledTimes(1)
    await retryButton(wrapper).trigger('click')
    await flushPromises()
    expect(mocks.base).toHaveBeenLastCalledWith(cases[2].params)
    expect(wrapper.vm.baseRepoData[0].id).toBe('record-1')
  })
})

describe('缓存失活与认证分类', () => {
  function harness(fetcher) {
    let state
    const show = ref(true)
    const Reader = defineComponent({
      name: 'SoftwareReadHarness',
      setup() {
        state = useSoftwareListRead(fetcher)
        return () => h('div')
      }
    })
    const Parent = defineComponent({
      setup: () => () => h(KeepAlive, null, { default: () => (show.value ? h(Reader) : null) })
    })
    const wrapper = mount(Parent)
    wrappers.push(wrapper)
    return { state, show }
  }

  it('KeepAlive失活使旧请求失效，激活保留旧成功结果与重试条件而不自动发请求', async () => {
    const api = vi.fn().mockResolvedValue(result('before'))
    const { state, show } = harness(api)
    await state.load({ page: 3, size: 20 })
    const pending = deferred()
    api.mockReturnValueOnce(pending.promise)
    const reading = state.load({ page: 3, size: 20 })
    show.value = false
    await nextTick()
    expect(state.canUseRows.value).toBe(false)
    pending.resolve(result('late'))
    await reading
    show.value = true
    await nextTick()
    expect(state.rows.value[0].id).toBe('before')
    expect(state.loading.value).toBe(false)
    expect(state.errorMessage.value).toContain('读取已中断')
    expect(state.canUseRows.value).toBe(false)
    expect(api).toHaveBeenCalledTimes(2)
    await state.retry()
    expect(api).toHaveBeenLastCalledWith({ page: 3, size: 20 })
    expect(state.canUseRows.value).toBe(true)
  })

  it.each([
    new Error('Authentication expired'),
    new Error('Access denied'),
    { response: { status: 401 } },
    { response: { status: 403 } }
  ])('认证/权限拒绝不保留旧行且不进行页面重试：%j', async failure => {
    const api = vi.fn().mockResolvedValue(result())
    const { state } = harness(api)
    await state.load({ page: 1 })
    api.mockRejectedValueOnce(failure)
    await state.load({ page: 1 })
    expect(state.rows.value).toEqual([])
    expect(state.hasResult.value).toBe(false)
    expect(state.canRetry.value).toBe(false)
    await state.retry()
    expect(api).toHaveBeenCalledTimes(2)
  })
})
