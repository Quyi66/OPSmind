import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ElForm, ElInput, ElPagination, ElTable, ElTableColumn } from 'element-plus'
import Page from '@/modules/settings/views/SscTaskSchedulerPage.vue'

const get = vi.hoisted(() => vi.fn())
vi.mock('@/core/api', () => ({ apiService: { get } }))
const tasks = count =>
  Array.from({ length: count }, (_, i) => ({
    id: `real-task-${i + 1}`,
    description: `例行任务-${i + 1}`,
    cronExpression: '0 0 * * *',
    status: 'ENABLED'
  }))
let wrapper
const state = () => wrapper.vm.$.setupState
const button = text => wrapper.findAll('button').find(item => item.text() === text)
async function open() {
  wrapper = mount(Page, {
    global: {
      components: { ElTable, ElTableColumn, ElPagination },
      stubs: {
        'el-input': ElInput,
        'el-form': ElForm,
        'el-form-item': { template: '<div><slot /></div>' },
        'el-button': { template: '<button><slot /></button>' },
        'el-icon': true,
        'el-tag': { template: '<span><slot /></span>' }
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
}
async function page(number) {
  wrapper.findComponent(ElPagination).vm.$emit('update:current-page', number)
  await flushPromises()
}
beforeEach(() => {
  get.mockReset().mockResolvedValue({ data: tasks(25) })
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

describe('系统设置计划任务分页', () => {
  it('每页只显示对应记录，翻页使用已加载的数据而不重复GET', async () => {
    await open()
    expect(wrapper.findAll('.el-table__body-wrapper tbody tr')).toHaveLength(10)
    expect(state().paginatedTasks[0].id).toBe('real-task-1')
    await page(2)
    expect(wrapper.text()).toContain('例行任务-11')
    expect(wrapper.findAll('.el-table__body-wrapper tbody tr')[0].text()).toContain('例行任务-11')
    expect(state().paginatedTasks.at(-1).id).toBe('real-task-20')
    expect(get).toHaveBeenCalledTimes(1)
    expect(get).toHaveBeenCalledWith('/workflow/api/workflow/cron/app', {
      params: { appCode: 'uim' }
    })
  })

  it('每页条数变化回首页，不重新请求全量任务', async () => {
    await open()
    await page(3)
    const pagination = wrapper.findComponent(ElPagination)
    pagination.vm.$emit('update:page-size', 20)
    pagination.vm.$emit('size-change', 20)
    await flushPromises()
    expect(state().taskPage).toBe(1)
    expect(wrapper.findAll('.el-table__body-wrapper tbody tr')).toHaveLength(20)
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('搜索回首页，首尾空格不影响匹配，重置恢复原列表', async () => {
    await open()
    await page(3)
    await wrapper.get('input').setValue(' 任务-1 ')
    await button('搜索').trigger('click')
    await flushPromises()
    expect(state().taskPage).toBe(1)
    expect(state().taskTotal).toBe(11)
    expect(state().paginatedTasks[0].id).toBe('real-task-1')
    await button('重置').trigger('click')
    await flushPromises()
    expect(state().taskKeyword).toBe('')
    expect(state().taskTotal).toBe(25)
    expect(state().taskPage).toBe(1)
  })

  it('刷新保持当前页，缩量回有效页；查询失败不保留过期总数', async () => {
    await open()
    await page(3)
    await wrapper.get('button[title="刷新"]').trigger('click')
    await flushPromises()
    expect(state().taskPage).toBe(3)
    get.mockResolvedValueOnce({ data: tasks(11) })
    await wrapper.get('button[title="刷新"]').trigger('click')
    await flushPromises()
    expect(state().taskPage).toBe(2)
    expect(state().paginatedTasks).toHaveLength(1)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    get.mockRejectedValueOnce(new Error('read failed'))
    await wrapper.get('button[title="刷新"]').trigger('click')
    await flushPromises()
    expect(state().taskTotal).toBe(0)
    expect(state().taskPage).toBe(1)
    expect(wrapper.findComponent(ElPagination).exists()).toBe(false)
  })
})

it('搜索表单阻止原生提交，Enter仍按原接口只查询一次', async () => {
  await open()
  const submit = new Event('submit', { bubbles: true, cancelable: true })
  wrapper.get('form').element.dispatchEvent(submit)
  expect(submit.defaultPrevented).toBe(true)
  expect(get).toHaveBeenCalledTimes(1)
  await wrapper.get('input').setValue('任务-1')
  await wrapper.get('input').trigger('keyup', { key: 'Enter' })
  await flushPromises()
  expect(get).toHaveBeenCalledTimes(2)
  expect(state().taskTotal).toBe(11)
  expect(state().taskPage).toBe(1)
})
