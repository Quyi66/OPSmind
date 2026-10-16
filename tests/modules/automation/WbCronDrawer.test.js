import { afterEach, describe, expect, it, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { toRaw } from 'vue'
import WbCronDrawer from '@/modules/automation/components/workbench/WbCronDrawer.vue'
import { fetchCacJobs } from '@/modules/automation/api/jao'

vi.mock('@/modules/automation/api/jao', () => ({ fetchCacJobs: vi.fn() }))

let wrapper
afterEach(() => {
  wrapper?.unmount()
  vi.resetAllMocks()
})
function open(jobs) {
  wrapper = shallowMount(WbCronDrawer, {
    props: { visible: true, jobs },
    global: {
      stubs: {
        ElDrawer: { template: '<div><slot /><slot name="footer" /></div>' },
        ElTag: true,
        ElSelect: true,
        ElOption: true,
        ElEmpty: true,
        'el-button': { template: '<button><slot /></button>' }
      }
    }
  })
  return wrapper.vm.$.setupState
}

describe('定时任务抽屉简洁展示', () => {
  it('取消名称补充请求，所有操作仍传递包含原接口关联的完整任务', async () => {
    const task = {
      id: 'scheduler-a',
      jobId: 'audit-a',
      jobDesc: '每日巡检',
      jobType: 'audit',
      appCode: 'legacy-app',
      author: 'operator',
      triggerStatus: '1',
      scheduleConf: '0 0 12 * * ?'
    }
    open([task])
    expect(wrapper.text()).toContain('每日巡检')
    expect(wrapper.text()).toContain(task.scheduleConf)
    for (const hidden of ['scheduler-a', 'audit-a', 'legacy-app', 'operator', '执行工具', '作者'])
      expect(wrapper.text()).not.toContain(hidden)
    expect(fetchCacJobs).not.toHaveBeenCalled()
    const buttons = wrapper.find('.wb-cron-item__actions').findAll('button')
    const events = ['execute', 'toggle', 'edit', 'copy', 'delete']
    for (let i = 0; i < events.length; i++) {
      await buttons[i].trigger('click')
      expect(toRaw(wrapper.emitted(events[i])[0][0])).toBe(task)
    }
    expect(task.appCode).toBe('legacy-app')
    expect(task.jobId).toBe('audit-a')
  })

  it('按名称、表达式、ID 和启停状态筛选，重开恢复默认条件', async () => {
    const state = open([
      {
        id: 1,
        jobDesc: '每日巡检',
        author: 'hidden-author',
        jobType: 'audit',
        triggerStatus: '1',
        scheduleConf: '0 0 12 * * ?'
      },
      { id: 2, jobDesc: '每周扫描', triggerStatus: '0', scheduleConf: '0 0 2 ? * SUN' }
    ])
    for (const keyword of ['每日', '12']) {
      state.filters.keyword = keyword
      state.handleSearch()
      expect(state.filteredJobs.map(task => task.id)).toEqual([1])
    }
    state.filters.keyword = 'hidden-author'
    state.handleSearch()
    expect(state.filteredJobs).toEqual([])
    state.filters.keyword = 'ID:2'
    state.handleSearch()
    expect(state.filteredJobs.map(task => task.id)).toEqual([2])
    state.filters.keyword = '2'
    state.handleSearch()
    expect(state.filteredJobs.map(task => task.id)).toEqual([1, 2]) // 表达式也包含 2
    state.filters.keyword = ''
    state.filters.status = '0'
    state.handleSearch()
    expect(state.filteredJobs.map(task => task.id)).toEqual([2])
    await wrapper.setProps({ visible: false })
    await wrapper.setProps({ visible: true })
    expect(state.filteredJobs).toHaveLength(2)
  })

  it('同名和缺名时显示类型与稳定调度 ID，按 ID 搜索仍保留身份，操作传原对象', async () => {
    const jobs = [
      { id: 'task-rest-123456789', jobDesc: 'PMS回收过期密码', jobType: 'rest' },
      { id: 'task-audit-123456789', jobDesc: 'PMS回收过期密码', jobType: 'audit' },
      { id: 0, jobDesc: '', jobType: 'script' },
      { id: 99, jobType: 'cmd' }
    ].map(row => ({ ...row, triggerStatus: '0', scheduleConf: '0 0/5 * * * ?' }))
    const state = open(jobs)
    expect(wrapper.text()).toContain('PMS回收过期密码（REST接口 · ID：task-r…456789）')
    expect(wrapper.text()).toContain('PMS回收过期密码（巡检任务 · ID：task-a…456789）')
    expect(wrapper.text()).toContain('未命名定时任务（脚本任务 · ID：0）')
    expect(wrapper.text()).toContain('未命名定时任务（命令任务 · ID：99）')
    expect(wrapper.find('.wb-cron-item__name').attributes('title')).toContain(jobs[0].id)
    state.filters.keyword = jobs[0].id
    state.handleSearch()
    await wrapper.vm.$nextTick()
    expect(state.filteredJobs.map(row => row.id)).toEqual([jobs[0].id])
    expect(wrapper.text()).toContain('task-r…456789')
    await wrapper.find('.wb-cron-item__actions button').trigger('click')
    expect(toRaw(wrapper.emitted('execute')[0][0])).toBe(jobs[0])
  })
})
