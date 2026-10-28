import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, inject, provide } from 'vue'
import { flushPromises, shallowMount } from '@vue/test-utils'
import CronJobTable from '@/modules/automation/components/job/components/CronJobTable.vue'
import { useCronJobList } from '@/modules/automation/components/job/composables/useCronJobList'
import { useCronJobActions } from '@/modules/automation/components/job/composables/useCronJobActions'
import { useAutomationWorkbench } from '@/modules/automation/composables/useAutomationWorkbench'
import {
  getCronTaskConfirmation,
  getCronTaskDisplayName
} from '@/modules/automation/utils/cronTaskPresentation'
import * as api from '@/modules/automation/api/jao'
import { ElMessage, ElMessageBox } from 'element-plus'

vi.mock('@/modules/automation/api/jao', () => ({
  fetchCronJobs: vi.fn(),
  queryNextExecutionTime: vi.fn(),
  startCronJob: vi.fn(),
  stopCronJob: vi.fn(),
  executeCronJob: vi.fn(),
  deleteCronJob: vi.fn()
}))
vi.mock('@/modules/automation/api/command', () => ({}))
vi.mock('@/modules/automation/api/gfs', () => ({}))
vi.mock('@/stores/useReviewCountStore.js', () => ({ useReviewCountStore: () => ({}) }))
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn() }
}))

const tasks = [
  { id: 'id-rest-123456789', jobDesc: 'PMS回收过期密码', jobType: 'rest' },
  { id: 'id-audit-123456789', jobDesc: 'PMS回收过期密码', jobType: 'audit' },
  { id: 0, jobDesc: '', jobType: 'script' },
  { id: 99, jobDesc: '  ', jobType: 'cmd' }
].map(row =>
  Object.freeze({
    ...row,
    triggerStatus: '0',
    scheduleConf: '0 0/5 * * * ?',
    appCode: 'legacy-app',
    jobId: 'original-tool'
  })
)
let wrappers = []
beforeEach(() => {
  vi.resetAllMocks()
  api.fetchCronJobs.mockResolvedValue({ data: tasks })
  api.queryNextExecutionTime.mockResolvedValue({ data: [{ next: ['2026-10-17 00:00:00'] }] })
})
afterEach(() => {
  wrappers.forEach(wrapper => wrapper.unmount())
  wrappers = []
})

function useInComponent(composable) {
  let state
  wrappers.push(
    shallowMount(
      defineComponent({
        setup() {
          state = composable()
          return () => null
        }
      })
    )
  )
  return state
}

describe('定时任务跨消费者辨认', () => {
  it('列表渲染同名/缺名身份，与抽屉共用规则，筛选后仍参照全目录', async () => {
    const wrapper = shallowMount(CronJobTable, {
      props: { data: tasks, identityData: tasks },
      global: {
        stubs: {
          ElTable: defineComponent({
            props: ['data'],
            setup(props) {
              provide(
                'rows',
                computed(() => props.data)
              )
            },
            template: '<div><slot /></div>'
          }),
          ElTableColumn: defineComponent({
            setup() {
              return { rows: inject('rows') }
            },
            template: '<div><slot v-for="row in rows" :row="row" /></div>'
          }),
          ElTag: { template: '<span><slot /></span>' },
          ElButton: true,
          ElPagination: true
        },
        directives: { loading: () => {} }
      }
    })
    wrappers.push(wrapper)
    for (const task of tasks) expect(wrapper.text()).toContain(getCronTaskDisplayName(task, tasks))
    expect(wrapper.text()).not.toContain('legacy-app')
    await wrapper.setProps({ data: [tasks[0]] })
    expect(wrapper.text()).toContain(getCronTaskDisplayName(tasks[0], tasks))
  })

  it('列表可按完整数字/字符串 ID 检索，不匹配所属应用及关联工具', async () => {
    const state = useInComponent(useCronJobList)
    await flushPromises()
    for (const task of tasks) {
      state.searchKeyword.value = String(task.id)
      expect(state.filteredTableData.value.map(row => row.id)).toContain(task.id)
      state.searchKeyword.value = `ID:${task.id}`
      expect(state.filteredTableData.value.map(row => row.id)).toEqual([task.id])
    }
    state.searchKeyword.value = tasks[0].id
    expect(state.filteredTableData.value.map(row => row.id)).toEqual([tasks[0].id])
    for (const keyword of ['legacy-app', 'original-tool']) {
      state.searchKeyword.value = keyword
      expect(state.filteredTableData.value).toEqual([])
    }
  })

  it('长 ID 短标识冲突时使用完整 ID，缺失 ID 不伪造', () => {
    const rows = [
      { id: 'prefix111111suffix', jobDesc: '' },
      { id: 'prefix222222suffix', jobDesc: '' }
    ]
    for (const row of rows) expect(getCronTaskDisplayName(row, rows)).toContain(row.id)
    expect(getCronTaskConfirmation({})).toContain('ID：未返回')
  })

  it.each(tasks)(
    '列表操作确认包含任务 $id 的类型/短标识及完整 ID；取消不调用写接口',
    async task => {
      ElMessageBox.confirm.mockRejectedValue('cancel')
      const actions = useCronJobActions(vi.fn())
      const row = { ...task }
      await actions.handleExecuteOnce(row)
      await actions.handleToggleStatus(row)
      await actions.handleDelete(row)
      expect(ElMessageBox.confirm).toHaveBeenCalledTimes(3)
      for (const [content] of ElMessageBox.confirm.mock.calls) {
        const text = typeof content === 'string' ? content : JSON.stringify(content)
        expect(text).toContain(getCronTaskConfirmation(task))
      }
      for (const method of [
        api.executeCronJob,
        api.startCronJob,
        api.stopCronJob,
        api.deleteCronJob
      ])
        expect(method).not.toHaveBeenCalled()
      expect(row.appCode).toBe('legacy-app')
      expect(row.jobId).toBe('original-tool')
    }
  )

  it('工作台执行、启停确认包含同一身份，取消/关闭不会发起业务写入', async () => {
    const state = useInComponent(useAutomationWorkbench)
    for (const reason of ['cancel', 'close']) {
      ElMessageBox.confirm.mockRejectedValue(reason)
      for (const task of tasks) {
        expect(await state.executeCronJobNow(task)).toBeNull()
        await state.toggleCronJob(task)
      }
    }
    expect(ElMessageBox.confirm).toHaveBeenCalledTimes(16)
    ElMessageBox.confirm.mock.calls.forEach(([text], index) => {
      expect(text).toContain(getCronTaskConfirmation(tasks[Math.floor(index / 2) % 4]))
    })
    expect(api.executeCronJob).not.toHaveBeenCalled()
    expect(api.startCronJob).not.toHaveBeenCalled()
    expect(ElMessage.error).not.toHaveBeenCalled()
  })

  it('工作台确认后仍仅传原调度 ID，不将工具关联或展示名写入请求', async () => {
    ElMessageBox.confirm.mockResolvedValue('confirm')
    api.executeCronJob.mockResolvedValue({ data: { runId: 'original-run' } })
    const state = useInComponent(useAutomationWorkbench)
    expect(await state.executeCronJobNow(tasks[0])).toEqual({ runId: 'original-run' })
    await state.toggleCronJob(tasks[0])
    await state.toggleCronJob({ ...tasks[1], triggerStatus: '1' })
    expect(api.executeCronJob).toHaveBeenCalledWith(tasks[0].id)
    expect(api.startCronJob).toHaveBeenCalledWith(tasks[0].id)
    expect(api.stopCronJob).toHaveBeenCalledWith(tasks[1].id)
    expect(tasks[0].appCode).toBe('legacy-app')
    expect(tasks[0].jobId).toBe('original-tool')
  })
})
