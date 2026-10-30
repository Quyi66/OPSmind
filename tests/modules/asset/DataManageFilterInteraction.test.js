import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, KeepAlive } from 'vue'
import {
  ElForm,
  ElInput,
  ElMessage,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs
} from 'element-plus'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import Page from '@/modules/asset/views/DataManagePage.vue'
import LogPage from '@/modules/asset/views/OperationLogPage.vue'

const api = vi.hoisted(() => ({
  getResourceTypes: vi.fn(),
  getAllGroups: vi.fn(),
  getAllTags: vi.fn(),
  deleteGroup: vi.fn(),
  deleteTag: vi.fn(),
  getOperationLogs: vi.fn()
}))
vi.mock('@/modules/asset/api', () => ({ dataManageApi: api, operationLogApi: api }))
vi.mock('@/composables/useActiveTaskListPolling', () => ({ useActiveTaskListPolling() {} }))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { template: '<aside />' }
}))
vi.mock('@/modules/asset/components/data/DataAddGroupDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/asset/components/data/DataAddTagDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/asset/components/data/DataEditGroupDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/asset/components/data/DataEditTagDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/asset/components/data/GroupAssetDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/asset/components/data/TagAssetDialog.vue', () => ({
  default: { template: '<div />' }
}))
let wrapper, router, root
const state = () => wrapper.vm.$.setupState
async function open(query = { tab: 'tag', keyword: '标签1' }, cached = false) {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/acm/data', component: Page },
      { path: '/acm/log', component: LogPage }
    ]
  })
  await router.push({ path: '/acm/data', query })
  await router.isReady()
  const Host = defineComponent({
    setup: () => () =>
      h(RouterView, null, {
        default: ({ Component }) =>
          h(KeepAlive, null, { default: () => (Component ? h(Component) : null) })
      })
  })
  root = mount(cached ? Host : Page, {
    global: {
      plugins: [router],
      components: { ElTabs, ElTabPane, ElSelect, ElOption, ElTable, ElTableColumn, ElPagination },
      stubs: {
        'router-view': false,
        'el-form': ElForm,
        'el-form-item': { template: '<div><slot /></div>' },
        'el-input': ElInput,
        'el-button': { template: '<button><slot /></button>' },
        'el-link': { template: '<button><slot /></button>' },
        'el-tag': { template: '<span><slot /></span>' },
        'el-alert': true,
        'el-icon': true
      },
      directives: { loading() {} }
    }
  })
  wrapper = cached ? root.findComponent(Page) : root
  await flushPromises()
}
beforeEach(() => {
  Object.values(api).forEach(mock => mock.mockReset())
  api.getResourceTypes.mockResolvedValue({ records: [{ code: 'windows', title: 'Windows' }] })
  api.getAllGroups.mockResolvedValue({ records: [] })
  api.getOperationLogs.mockResolvedValue({ records: [], total: 0 })
  api.getAllTags.mockImplementation(ciType =>
    Promise.resolve({
      records: Array.from({ length: 25 }, (_, i) => ({
        id: `tag-${i}`,
        name: `标签${i + 1}`,
        ci_type: ciType,
        total: 0
      }))
    })
  )
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
})

async function sortColumn(label, direction) {
  const heading = wrapper.findAll('th').find(item => item.text() === label)
  await heading.get(`.sort-caret.${direction}`).trigger('click')
  await flushPromises()
}

describe.each([
  ['group', 'getAllGroups', 'groupList', 'path', '分组路径', 'currentGroup'],
  ['tag', 'getAllTags', 'tagList', 'name', '标签名称', 'currentTag']
])('%s全匹配集排序', (tab, method, listKey, field, label, selectedKey) => {
  it('25条跨页完整排序，切换页签保留表头顺序，清除恢复API原序及真实行ID', async () => {
    const source = Array.from({ length: 25 }, (_, i) => {
      const n = ((i * 7 + 12) % 25) + 1
      return { id: `real-${n}`, [field]: `A${n}`, ci_type: 'windows', total: n - 1 }
    })
    api[method].mockResolvedValue({ records: source })
    await open({ tab })
    await sortColumn(label, 'ascending')
    expect(state()[listKey].map(row => row[field])).toEqual(
      Array.from({ length: 10 }, (_, i) => `A${i + 1}`)
    )
    const pagination = wrapper.findComponent(ElPagination)
    pagination.vm.$emit('update:current-page', 2)
    pagination.vm.$emit('current-change', 2)
    await flushPromises()
    expect(state()[listKey][0].id).toBe('real-11')
    await wrapper.find('.el-table__body-wrapper tbody tr').get('button.path-link').trigger('click')
    expect(state()[selectedKey].id).toBe('real-11')
    await sortColumn(label, 'descending')
    expect(state()[`${tab}Pagination`].page).toBe(1)
    expect(state()[listKey][0].id).toBe('real-25')
    const otherTab = tab === 'group' ? 'tag' : 'group'
    await wrapper.get(`#tab-${otherTab}`).trigger('click')
    await flushPromises()
    await wrapper.get(`#tab-${tab}`).trigger('click')
    await flushPromises()
    expect(
      wrapper
        .findAll('th')
        .find(item => item.text() === label)
        .classes()
    ).toContain('descending')
    expect(state()[listKey][0].id).toBe('real-25')
    await sortColumn(label, 'descending')
    expect(state()[listKey][0].id).toBe('real-13')
    expect(source[0].id).toBe('real-13')
    expect(api.deleteGroup).not.toHaveBeenCalled()
    expect(api.deleteTag).not.toHaveBeenCalled()
  })

  it('主机数按数值排序，0保留且未知值双向居后，不改原记录', async () => {
    const source = [
      { id: 'unknown', [field]: '未知', total: null },
      { id: 'ten', [field]: '十', total: '10' },
      { id: 'zero', [field]: '零', total: 0 },
      { id: 'two', [field]: '二', total: 2 }
    ]
    api[method].mockResolvedValue({ records: source })
    await open({ tab })
    await sortColumn('已绑主机数', 'ascending')
    expect(state()[listKey].map(row => row.id)).toEqual(['zero', 'two', 'ten', 'unknown'])
    await sortColumn('已绑主机数', 'descending')
    expect(state()[listKey].map(row => row.id)).toEqual(['ten', 'two', 'zero', 'unknown'])
    expect(source[0].id).toBe('unknown')
  })
})

it('快速切类型时旧标签响应不覆盖新类型结果', async () => {
  let resolve
  const pending = new Promise(yes => {
    resolve = yes
  })
  api.getAllTags.mockReturnValueOnce(pending)
  await open({ tab: 'tag' })
  const select = wrapper.findComponent(ElSelect)
  select.vm.$emit('update:modelValue', 'windows')
  select.vm.$emit('change', 'windows')
  await flushPromises()
  expect(state().tagList.every(row => row.ci_type === 'windows')).toBe(true)
  resolve({ records: [{ id: 'stale', name: '旧类型标签', ci_type: 'linux' }] })
  await flushPromises()
  expect(state().tagPagination.total).toBe(25)
  expect(state().tagList.every(row => row.ci_type === 'windows')).toBe(true)
  expect(wrapper.text()).not.toContain('旧类型标签')
})

it('卸载后不处理迟到标签错误，不弹出旧页面提示', async () => {
  let reject
  api.getAllTags.mockReturnValueOnce(
    new Promise((_, no) => {
      reject = no
    })
  )
  vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
  await open({ tab: 'tag' })
  wrapper.unmount()
  reject(new Error('late query'))
  await flushPromises()
  expect(ElMessage.error).not.toHaveBeenCalled()
})
afterEach(() => {
  root?.unmount()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('分组没有类型筛选，旧URL类型不进入状态或请求，搜索重置保留原分页与排序', async () => {
  await open({ tab: 'group', ciType: 'windows', keyword: '分组' })
  const filterBar = wrapper.get('.ops-filter-bar')
  expect(filterBar.text()).not.toContain('类型')
  expect(filterBar.findComponent(ElSelect).exists()).toBe(false)
  expect(state().groupFilter).toEqual({ keyword: '分组' })
  expect(api.getAllGroups).toHaveBeenLastCalledWith('')
  await wrapper
    .findAll('button')
    .find(item => item.text() === '搜索')
    .trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.query).toEqual({ tab: 'group', keyword: '分组' })
  await wrapper
    .findAll('button')
    .find(item => item.text() === '重置')
    .trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.query).toEqual({ tab: 'group' })
  expect(state().groupFilter).toEqual({ keyword: '' })
  expect(api.getAllGroups.mock.calls.every(args => args.length === 1 && args[0] === '')).toBe(true)
})

it.each(['group', 'tag'])(
  '缓存%s页后进入日志搜索不调用分组/标签接口，返回时仅恢复对应页面',
  async tab => {
    const query =
      tab === 'group' ? { tab, keyword: '分组' } : { tab, ciType: 'windows', keyword: '标签1' }
    await open(query, true)
    const groupCalls = api.getAllGroups.mock.calls.length
    const tagCalls = api.getAllTags.mock.calls.length
    await router.push('/acm/log')
    await flushPromises()
    const logPage = root.findComponent(LogPage)
    expect(logPage.exists()).toBe(true)
    expect(api.getAllGroups).toHaveBeenCalledTimes(groupCalls)
    expect(api.getAllTags).toHaveBeenCalledTimes(tagCalls)
    await logPage.get('input[placeholder="搜索执行节点..."]').setValue('node-a')
    await logPage.get('input[placeholder="搜索执行节点..."]').trigger('keyup', { key: 'Enter' })
    await flushPromises()
    expect(api.getOperationLogs).toHaveBeenCalledTimes(2)
    expect(api.getAllGroups).toHaveBeenCalledTimes(groupCalls)
    expect(api.getAllTags).toHaveBeenCalledTimes(tagCalls)
    expect(state().activeTab).toBe(tab)
    expect(state()[`${tab}Filter`].keyword).toBe(query.keyword)
    await router.push({ path: '/acm/data', query })
    await flushPromises()
    expect(api.getAllGroups).toHaveBeenCalledTimes(groupCalls + (tab === 'group' ? 1 : 0))
    expect(api.getAllTags).toHaveBeenCalledTimes(tagCalls + (tab === 'tag' ? 1 : 0))
    expect(api.getOperationLogs).toHaveBeenCalledTimes(2)
  }
)

describe('资产标签筛选与分组交互一致', () => {
  it('改变资产类型立即查询并回首页，保留关键词和URL筛选', async () => {
    await open()
    wrapper.findComponent(ElPagination).vm.$emit('update:current-page', 2)
    wrapper.findComponent(ElPagination).vm.$emit('current-change', 2)
    await flushPromises()
    expect(state().tagPagination.page).toBe(2)
    const select = wrapper.findComponent(ElSelect)
    select.vm.$emit('update:modelValue', 'windows')
    select.vm.$emit('change', 'windows')
    await flushPromises()
    expect(api.getAllTags).toHaveBeenLastCalledWith('windows')
    expect(state().tagPagination.page).toBe(1)
    expect(state().tagPagination.total).toBe(11)
    expect(router.currentRoute.value.query).toEqual({
      tab: 'tag',
      keyword: '标签1',
      ciType: 'windows'
    })
    expect(state().tagList.every(row => row.ci_type === 'windows')).toBe(true)
    expect(api.deleteTag).not.toHaveBeenCalled()
  })

  it('点击关键词清除叉号恢复当前类型全部标签并清URL关键词，不执行写操作', async () => {
    await open({ tab: 'tag', ciType: 'windows', keyword: '标签1' })
    const input = wrapper.findComponent(ElInput)
    await input.trigger('mouseenter')
    await input.get('.el-input__clear').trigger('click')
    await flushPromises()
    expect(state().tagFilter.keyword).toBe('')
    expect(state().tagPagination.total).toBe(25)
    expect(state().tagPagination.page).toBe(1)
    expect(router.currentRoute.value.query).toEqual({ tab: 'tag', ciType: 'windows' })
    expect(api.getAllTags).toHaveBeenLastCalledWith('windows')
    expect(api.deleteGroup).not.toHaveBeenCalled()
    expect(api.deleteTag).not.toHaveBeenCalled()
  })
})
