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

  it('仅按可见名称、表达式和启停状态筛选，重开恢复默认条件', async () => {
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
    state.filters.keyword = ''
    state.filters.status = '0'
    state.handleSearch()
    expect(state.filteredJobs.map(task => task.id)).toEqual([2])
    await wrapper.setProps({ visible: false })
    await wrapper.setProps({ visible: true })
    expect(state.filteredJobs).toHaveLength(2)
  })
})
