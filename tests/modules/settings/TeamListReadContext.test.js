import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, KeepAlive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import {
  ElForm,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElPagination,
  ElTable,
  ElTableColumn
} from 'element-plus'
import Page from '@/modules/settings/views/UamTeamPage.vue'

const api = vi.hoisted(() => ({ getTeams: vi.fn(), deleteTeam: vi.fn() }))
vi.mock('@/modules/settings/api/team', () => api)
vi.mock('@/modules/settings/components/team/TeamEditDialog.vue', () => ({
  default: { props: ['team', 'mode', 'modelValue'], template: '<aside />' }
}))
const teams = count =>
  Array.from({ length: count }, (_, id) => ({
    id,
    name: `Team-${id}`,
    code: id === 0 ? 0 : `code-${id}`,
    description: 'original-description',
    tenantName: 'original-tenant',
    updatedAt: '2026-10-30T12:00:00Z'
  }))
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
let wrapper, router
const page = () => wrapper.findComponent(Page)
const state = () => page().vm.$.setupState
const button = text =>
  page()
    .findAll('button')
    .find(item => item.text() === text)
async function open(routed = false) {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/uam/team', component: Page },
      { path: '/other', component: { template: '<div />' } }
    ]
  })
  await router.push('/uam/team')
  await router.isReady()
  const Host = defineComponent({
    setup: () => () =>
      h(RouterView, null, {
        default: ({ Component, route }) =>
          h(KeepAlive, null, { default: () => h(Component, { key: route.path }) })
      })
  })
  wrapper = mount(routed ? Host : Page, {
    global: {
      plugins: [router],
      directives: { loading() {} },
      stubs: {
        'router-view': false,
        'el-form': ElForm,
        'el-form-item': { template: '<div><slot /></div>' },
        'el-input': ElInput,
        'el-table': ElTable,
        'el-table-column': ElTableColumn,
        'el-pagination': ElPagination,
        'el-icon': true,
        'el-button': {
          props: ['loading', 'disabled'],
          template: '<button :disabled="loading || disabled"><slot /></button>'
        },
        'el-alert': { props: ['title'], template: '<div role="alert">{{title}}<slot /></div>' }
      }
    }
  })
  await flushPromises()
}
beforeEach(() => {
  api.getTeams.mockReset().mockResolvedValue({ data: teams(45) })
  api.deleteTeam.mockReset().mockResolvedValue({})
  vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
  vi.spyOn(ElMessage, 'success').mockImplementation(() => {})
  vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm')
  vi.spyOn(console, 'error').mockImplementation(() => {})
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
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('团队列表读取与分页', () => {
  it('搜索trim/忽略大小写并回首页，可搜索数值编码0，不重新GET', async () => {
    await open()
    await page().get('.el-pagination .btn-next').trigger('click')
    expect(state().pagination.page).toBe(2)
    await page().get('input[placeholder="搜索团队名称/编码"]').setValue('  TEAM-4  ')
    await flushPromises()
    expect(state().pagination.page).toBe(1)
    expect(state().pagination.total).toBe(6)
    await page().get('input[placeholder="搜索团队名称/编码"]').setValue('0')
    await flushPromises()
    expect(state().filteredRows.some(row => row.id === 0)).toBe(true)
    await page().get('input[placeholder="搜索团队名称/编码"]').setValue('no-matching-team')
    await flushPromises()
    expect(page().text()).toContain('没有匹配的团队')
    expect(api.getTeams).toHaveBeenCalledTimes(1)
  })
  it('分页切片、刷新保留有效页、缩量回末页、变条数回首页', async () => {
    await open()
    await page().get('.el-pagination .btn-next').trigger('click')
    await page().get('.el-pagination .btn-next').trigger('click')
    expect(state().filteredData).toHaveLength(5)
    await page().get('button[title="刷新"]').trigger('click')
    await flushPromises()
    expect(state().pagination.page).toBe(3)
    api.getTeams.mockResolvedValueOnce({ data: teams(21) })
    await page().get('button[title="刷新"]').trigger('click')
    await flushPromises()
    expect(state().pagination.page).toBe(2)
    expect(state().filteredData).toHaveLength(1)
    const pagination = page().findComponent(ElPagination)
    pagination.vm.$emit('update:page-size', 10)
    pagination.vm.$emit('size-change', 10)
    await flushPromises()
    expect(state().pagination.page).toBe(1)
    expect(state().filteredData).toHaveLength(10)
  })
  it('失败隐藏过期操作并持久提示，原查询/页码重试恢复', async () => {
    await open()
    await page().get('.el-pagination .btn-next').trigger('click')
    api.getTeams.mockRejectedValueOnce(new Error('read-failed'))
    await page().get('button[title="刷新"]').trigger('click')
    await flushPromises()
    expect(page().get('[role="alert"]').text()).toContain('加载团队列表失败')
    expect(button('编辑')).toBeUndefined()
    expect(page().findComponent(ElPagination).exists()).toBe(false)
    expect(state().pagination.page).toBe(2)
    await button('重试').trigger('click')
    await flushPromises()
    expect(state().pagination.page).toBe(2)
    expect(state().filteredData[0].id).toBe(20)
  })
  it.each(['resolve', 'reject'])('旧%s不能替换最新列表或停止其加载', async method => {
    await open()
    const old = deferred(),
      latest = deferred()
    api.getTeams.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    const first = state().loadData(),
      second = state().loadData()
    old[method](method === 'resolve' ? { data: teams(1) } : new Error('old'))
    await first
    expect(state().loading).toBe(true)
    expect(state().tableData).toHaveLength(45)
    expect(ElMessage.error).not.toHaveBeenCalled()
    latest.resolve({ data: teams(2) })
    await second
    await flushPromises()
    expect(state().pagination.total).toBe(2)
  })
  it('缓存离开忽略旧结果，返回同实例重读并保持有效页', async () => {
    await open(true)
    const context = state(),
      pending = deferred()
    context.pagination.page = 2
    api.getTeams.mockReturnValueOnce(pending.promise)
    await page().get('button[title="刷新"]').trigger('click')
    await router.push('/other')
    await flushPromises()
    pending.resolve({ data: teams(1) })
    await flushPromises()
    expect(context.tableData).toHaveLength(45)
    await router.push('/uam/team')
    await flushPromises()
    expect(state()).toBe(context)
    expect(state().pagination.page).toBe(2)
    expect(api.getTeams).toHaveBeenCalledTimes(3)
  })
  it.each(['resolve', 'reject'])('卸载后%s不更新列表或弹错', async method => {
    const pending = deferred()
    api.getTeams.mockReturnValueOnce(pending.promise)
    await open()
    const context = state()
    wrapper.unmount()
    pending[method](method === 'resolve' ? { data: teams(1) } : new Error('late'))
    await flushPromises()
    expect(context.tableData).toEqual([])
    expect(ElMessage.error).not.toHaveBeenCalled()
  })
  it('原团队对象/删除ID和确认保持，非法时间占位且零时间有效', async () => {
    await open()
    const row = state().filteredData[0]
    await button('编辑').trigger('click')
    expect(state().selectedTeam).toBe(row)
    expect(state().dialogMode).toBe('edit')
    await button('删除').trigger('click')
    await flushPromises()
    expect(ElMessageBox.confirm).toHaveBeenCalledWith(
      '确定要删除团队 "Team-0" 吗？',
      '确认删除',
      expect.objectContaining({ closeOnClickModal: false, closeOnPressEscape: false })
    )
    expect(api.deleteTeam).toHaveBeenCalledWith(0)
    expect(state().formatTime('invalid')).toBe('-')
    expect(state().formatTime(0)).not.toBe('-')
    const event = new Event('submit', { bubbles: true, cancelable: true })
    page().get('form').element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })
})
