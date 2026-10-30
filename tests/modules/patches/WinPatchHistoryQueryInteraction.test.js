import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import {
  ElForm,
  ElFormItem,
  ElInput,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn
} from 'element-plus'
import { createMemoryHistory, createRouter } from 'vue-router'
import History from '@/modules/patches/windows-patch/views/WinPatchInstallHistoryPage.vue'

const api = vi.hoisted(() => ({ getInstallLogs: vi.fn() }))
vi.mock('@/modules/patches/windows-patch/api', () => ({ winPatchApi: api }))
vi.mock('@/modules/patches/windows-patch/components/tasks/WinPatchRollbackDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/patches/windows-patch/components/kb/WindowsKbDetailDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/patches/windows-patch/components/kb/WindowsKbLinkList.vue', () => ({
  default: { template: '<div />' }
}))

const response = (rows = [], total = 65) => ({ data: { content: rows, totalElements: total } })
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
let wrapper
const button = text => wrapper.findAll('button').find(item => item.text() === text)
const refresh = () => wrapper.get('button.toolbar-icon-btn').trigger('click')
async function open(hostId = 'host-a') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/patches/windowsRollback', name: 'patches-windowsRollback', component: History }
    ]
  })
  await router.push({ name: 'patches-windowsRollback', query: { hostId } })
  await router.isReady()
  wrapper = mount(History, {
    global: {
      plugins: [router],
      components: { ElForm, ElFormItem, ElInput, ElPagination, ElTable, ElTableColumn },
      stubs: {
        'el-form': false,
        'el-form-item': false,
        'el-input': false,
        'el-button': {
          props: ['disabled', 'loading'],
          template: '<button :disabled="disabled || loading"><slot /></button>'
        },
        'el-icon': true,
        'el-alert': { props: ['title'], template: '<div role="alert">{{ title }}<slot /></div>' }
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
}
async function page(number) {
  await wrapper
    .findAll('.el-pager li')
    .find(item => item.text() === String(number))
    .trigger('click')
  await flushPromises()
}
beforeEach(() => {
  api.getInstallLogs.mockReset().mockResolvedValue(response())
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
})

describe('Windows 变更回滚的已应用主机条件与分页', () => {
  it('输入草稿后翻页/刷新保持原主机，搜索才应用新主机并回首页', async () => {
    await open()
    await wrapper.get('.ops-filter-bar input').setValue('  host-b  ')
    await page(2)
    expect(api.getInstallLogs).toHaveBeenLastCalledWith({ hostId: 'host-a', page: 1, size: 20 })
    await refresh()
    await flushPromises()
    expect(api.getInstallLogs).toHaveBeenLastCalledWith({ hostId: 'host-a', page: 1, size: 20 })
    await button('搜索').trigger('click')
    await flushPromises()
    expect(api.getInstallLogs).toHaveBeenLastCalledWith({ hostId: 'host-b', page: 0, size: 20 })
    expect(wrapper.findComponent(ElPagination).props('currentPage')).toBe(1)
  })

  it('变更每页数量只读取一次首页，保持已应用条件，清除按原动作查询全部', async () => {
    await open()
    await page(3)
    await wrapper.get('.ops-filter-bar input').setValue('unapplied')
    api.getInstallLogs.mockClear()
    wrapper.findComponent(ElPagination).findComponent(ElSelect).vm.$emit('update:modelValue', 50)
    wrapper.findComponent(ElPagination).findComponent(ElSelect).vm.$emit('change', 50)
    await flushPromises()
    expect(api.getInstallLogs).toHaveBeenCalledExactlyOnceWith({
      hostId: 'host-a',
      page: 0,
      size: 50
    })
    wrapper.findComponent(ElInput).vm.$emit('update:modelValue', '')
    wrapper.findComponent(ElInput).vm.$emit('clear')
    await flushPromises()
    expect(api.getInstallLogs).toHaveBeenLastCalledWith({ hostId: undefined, page: 0, size: 50 })
  })

  it('刷新后总数缩小，最多补读最后有效页且不使用输入草稿', async () => {
    await open()
    await page(3)
    await wrapper.get('.ops-filter-bar input').setValue('unapplied')
    api.getInstallLogs.mockClear()
    api.getInstallLogs
      .mockResolvedValueOnce(response([], 21))
      .mockResolvedValueOnce(response([{ id: 'last', hosts: 'correct-host' }], 21))
    await refresh()
    await flushPromises()
    expect(api.getInstallLogs.mock.calls.map(([query]) => query)).toEqual([
      { hostId: 'host-a', page: 2, size: 20 },
      { hostId: 'host-a', page: 1, size: 20 }
    ])
    expect(wrapper.findComponent(ElPagination).props('currentPage')).toBe(2)
    expect(wrapper.findComponent(ElTable).props('data')[0].hosts).toBe('correct-host')
  })

  it('缺少明确总数不将本页条数误作失效页依据', async () => {
    await open()
    await page(3)
    api.getInstallLogs.mockClear().mockResolvedValueOnce({ data: { content: [{ id: 'last' }] } })
    await refresh()
    await flushPromises()
    expect(api.getInstallLogs).toHaveBeenCalledTimes(1)
    expect(api.getInstallLogs.mock.calls[0][0].page).toBe(2)
    expect(wrapper.findComponent(ElTable).props('data')).toEqual([{ id: 'last' }])
  })

  it('补查期间再次缩量时显示可重试错误，不循环请求', async () => {
    await open()
    await page(3)
    api.getInstallLogs.mockClear()
    api.getInstallLogs
      .mockResolvedValueOnce(response([], 21))
      .mockResolvedValueOnce(response([], 0))
    await refresh()
    await flushPromises()
    expect(api.getInstallLogs).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('加载安装历史失败，请重试')
    expect(wrapper.findComponent(ElTable).props('data')).toEqual([])
    await button('重试').trigger('click')
    await flushPromises()
    expect(wrapper.text()).not.toContain('加载安装历史失败，请重试')
  })

  it('新搜索使旧补查失效，旧结果不覆盖新主机记录', async () => {
    await open()
    await page(3)
    const old = deferred()
    api.getInstallLogs.mockResolvedValueOnce(response([], 21)).mockReturnValueOnce(old.promise)
    await refresh()
    await flushPromises()
    await wrapper.get('.ops-filter-bar input').setValue('host-b')
    api.getInstallLogs.mockResolvedValueOnce(response([{ id: 'new', hosts: 'host-b' }], 1))
    await wrapper.get('.ops-filter-bar input').trigger('keyup.enter')
    await flushPromises()
    old.resolve(response([{ id: 'old', hosts: 'host-a' }], 21))
    await flushPromises()
    expect(wrapper.findComponent(ElTable).props('data')).toEqual([{ id: 'new', hosts: 'host-b' }])
    expect(wrapper.findComponent(ElPagination).props('currentPage')).toBe(1)
  })

  it('失败后重试保持已应用主机，表单阻止原生页面提交', async () => {
    await open()
    await wrapper.get('.ops-filter-bar input').setValue('unapplied')
    api.getInstallLogs.mockRejectedValueOnce(new Error('read failed'))
    await refresh()
    await flushPromises()
    await button('重试').trigger('click')
    await flushPromises()
    expect(api.getInstallLogs).toHaveBeenLastCalledWith({ hostId: 'host-a', page: 0, size: 20 })
    const event = new Event('submit', { bubbles: true, cancelable: true })
    wrapper.get('form').element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })
})
