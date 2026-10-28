import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import PatchTaskFailedHostsDialog from '@/modules/patches/components/patch-task/dialogs/PatchTaskFailedHostsDialog.vue'
import { hostDialogTestOptions, deferred } from './helpers/hostDialogTestUtils'

const api = vi.hoisted(() => ({ getFailedHosts: vi.fn() }))
vi.mock('@/modules/patches/api', () => ({
  patchInstallApi: { getFailedHosts: api.getFailedHosts }
}))

const wrappers = []
function mount(component, props) {
  const wrapper = shallowMount(component, {
    props,
    global: {
      ...hostDialogTestOptions,
      stubs: {
        ...hostDialogTestOptions.stubs,
        'el-input': {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
        },
        ElSelect: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>'
        },
        ElOption: {
          props: ['label', 'value'],
          template: '<option :value="value">{{ label }}</option>'
        }
      }
    }
  })
  wrappers.push(wrapper)
  return wrapper
}

beforeEach(() => {
  api.getFailedHosts.mockReset()
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
})

describe('安装任务失败主机', () => {
  it('does not fetch a closed dialog and displays separate failure groups with a unique count', async () => {
    const preCheckFailed = [{ hostId: 'h1', hostKey: '192.168.1.1', reason: 'SSH 不可达' }]
    const installFailed = [{ hostId: 'h1', hostKey: '192.168.1.1', reason: '软件包安装失败' }]
    api.getFailedHosts.mockResolvedValue({
      data: { preCheckFailed, installFailed, failedHostIds: ['h1'] }
    })
    const wrapper = mount(PatchTaskFailedHostsDialog, { taskId: 'task-1' })
    expect(api.getFailedHosts).not.toHaveBeenCalled()
    await wrapper.setProps({ modelValue: true })
    await flushPromises()

    expect(api.getFailedHosts).toHaveBeenCalledWith('task-1')
    expect(wrapper.findAll('h3').map(item => item.text())).toEqual([
      '预检失败（显示 1 / 共 1）',
      '安装失败（显示 1 / 共 1）',
      '未下发（无可更新包）（显示 0 / 共 0）'
    ])
    expect(wrapper.text()).toContain('失败主机共 1 台（去重）')
    expect(wrapper.text()).toContain('SSH 不可达')
    expect(wrapper.text()).toContain('软件包安装失败')
    expect(wrapper.find('[data-column="hostId"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('h1')
    expect(wrapper.text()).not.toContain('task-1')
  })

  it.each([{ failedHostIds: ['h1', 'h2'] }, { failedHostIds: undefined }])(
    'displays skipped hosts without including them in the failure count ($failedHostIds)',
    async ({ failedHostIds }) => {
      const preCheckReason = '未返回检查结果：主机无法连通……'
      const installReason = '未返回安装结果：所在执行机批次没有产出结果……'
      const skippedReason = '该主机扫描结果中没有本次清单里的可更新包，未下发'
      api.getFailedHosts.mockResolvedValue({
        data: {
          preCheckFailed: [{ hostId: 'h1', hostKey: '192.168.1.1', reason: preCheckReason }],
          installFailed: [
            { hostId: 'h1', hostKey: '192.168.1.1', reason: installReason },
            { hostId: 'h2', hostKey: '192.168.1.2', reason: installReason }
          ],
          skipped: [{ hostId: 'h3', hostKey: '192.168.1.94', reason: skippedReason }],
          failedHostIds
        }
      })
      const wrapper = mount(PatchTaskFailedHostsDialog, { modelValue: true, taskId: 'task-1' })
      await flushPromises()

      expect(wrapper.text()).toContain('失败主机共 2 台（去重）')
      expect(wrapper.text()).toContain(preCheckReason)
      expect(wrapper.text()).toContain(installReason)
      const skippedGroup = wrapper.findAll('section')[2]
      expect(skippedGroup.find('h3').text()).toBe('未下发（无可更新包）（显示 1 / 共 1）')
      expect(skippedGroup.text()).toContain('192.168.1.94')
      expect(skippedGroup.text()).toContain(skippedReason)
      expect(skippedGroup.find('[data-column="reason"]').text()).toContain('未下发原因')
      expect(skippedGroup.text()).not.toContain('失败原因')
    }
  )

  it.each([{ failedHostIds: [] }, { failedHostIds: undefined }])(
    'counts no failures when all hosts are skipped ($failedHostIds)',
    async ({ failedHostIds }) => {
      api.getFailedHosts.mockResolvedValue({
        data: {
          skipped: [{ hostId: 'h1', hostKey: '192.168.1.94', reason: '没有可更新包' }],
          failedHostIds
        }
      })
      const wrapper = mount(PatchTaskFailedHostsDialog, { modelValue: true, taskId: 'task-1' })
      await flushPromises()

      expect(wrapper.text()).toContain('失败主机共 0 台（去重）')
      expect(wrapper.text()).toContain('未下发（无可更新包）（显示 1 / 共 1）')
    }
  )

  it('shows a 404 message and can refresh to recover', async () => {
    api.getFailedHosts.mockRejectedValueOnce({ response: { status: 404 } })
    api.getFailedHosts.mockResolvedValue({
      data: { preCheckFailed: [], installFailed: [], failedHostIds: [] }
    })
    const wrapper = mount(PatchTaskFailedHostsDialog, { modelValue: true, taskId: 'missing' })
    await flushPromises()
    expect(wrapper.find('[role="alert"]').text()).toBe('任务不存在或已删除')
    const refresh = wrapper
      .findAllComponents({ name: 'ElButton' })
      .find(button => button.text() === '刷新')
    refresh.vm.$emit('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('暂无失败主机')
  })

  it('ignores a response for the previously selected task', async () => {
    const oldRequest = deferred()
    api.getFailedHosts.mockReturnValueOnce(oldRequest.promise)
    api.getFailedHosts.mockResolvedValue({
      data: {
        preCheckFailed: [],
        installFailed: [{ hostId: 'new-host', reason: '新的失败原因' }],
        failedHostIds: ['new-host']
      }
    })
    const wrapper = mount(PatchTaskFailedHostsDialog, { modelValue: true, taskId: 'old-task' })
    await wrapper.setProps({ taskId: 'new-task' })
    await flushPromises()
    oldRequest.resolve({
      data: { preCheckFailed: [{ hostId: 'old-host', reason: '旧的失败原因' }] }
    })
    await flushPromises()
    expect(wrapper.text()).toContain('新的失败原因')
    expect(wrapper.text()).not.toContain('new-host')
    expect(wrapper.text()).not.toContain('旧的失败原因')
  })
})

const searchInput = wrapper => wrapper.find('input[aria-label="搜索主机/IP或原因"]')
const categorySelect = wrapper => wrapper.find('select[aria-label="主机分类"]')
const headings = wrapper => wrapper.findAll('h3').map(heading => heading.text())
const tableRows = wrapper =>
  wrapper.findAllComponents({ name: 'ElTable' }).map(table => table.props('data'))
async function clickButton(wrapper, label) {
  wrapper
    .findAllComponents({ name: 'ElButton' })
    .find(button => button.text() === label)
    .vm.$emit('click')
  await flushPromises()
}
function failureSample() {
  return {
    preCheckFailed: [
      { hostId: 'h1', hostKey: 'Web-01', reason: 'SSH 不可达' },
      { hostId: 'h2', hostKey: '192.0.2.2', reason: '磁盘空间不足' }
    ],
    installFailed: [
      { hostId: 'h1', hostKey: 'Web-01', reason: '软件包安装失败' },
      { hostId: 'h3', hostKey: 'db-03', reason: '执行机未返回结果' }
    ],
    skipped: [{ hostId: 'h4', hostKey: 'cache-04', reason: '没有可更新包' }],
    failedHostIds: ['h1', 'h2', 'h3', 'h1']
  }
}
async function openSample(data = failureSample()) {
  api.getFailedHosts.mockResolvedValue({ data })
  const wrapper = mount(PatchTaskFailedHostsDialog, { modelValue: true, taskId: 'task-1' })
  await flushPromises()
  return wrapper
}

describe('失败主机清单定位', () => {
  it('searches displayed hosts, IPs and reasons locally without changing the overall unique count', async () => {
    const sample = failureSample()
    const original = JSON.stringify(sample)
    const wrapper = await openSample(sample)
    await searchInput(wrapper).setValue('  WEB-01  ')
    expect(tableRows(wrapper)).toEqual([[sample.preCheckFailed[0]], [sample.installFailed[0]], []])
    expect(headings(wrapper)).toEqual([
      '预检失败（显示 1 / 共 2）',
      '安装失败（显示 1 / 共 2）',
      '未下发（无可更新包）（显示 0 / 共 1）'
    ])
    expect(wrapper.text()).toContain('失败主机共 3 台（去重）')
    await searchInput(wrapper).setValue('192.0.2.2')
    expect(tableRows(wrapper)).toEqual([[sample.preCheckFailed[1]], [], []])
    await searchInput(wrapper).setValue('  ssh ')
    expect(tableRows(wrapper)).toEqual([[sample.preCheckFailed[0]], [], []])
    await searchInput(wrapper).setValue('执行机')
    expect(tableRows(wrapper)).toEqual([[], [sample.installFailed[1]], []])
    await searchInput(wrapper).setValue('h1')
    expect(tableRows(wrapper)).toEqual([[], [], []])
    expect(wrapper.text()).toContain('失败主机共 3 台（去重）')
    expect(api.getFailedHosts).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(sample)).toBe(original)
  })

  it('combines categories with the keyword and clears both to restore all three groups', async () => {
    const sample = failureSample()
    const wrapper = await openSample(sample)
    await searchInput(wrapper).setValue('web')
    await categorySelect(wrapper).setValue('installFailed')
    expect(tableRows(wrapper)).toEqual([[sample.installFailed[0]]])
    expect(headings(wrapper)).toEqual(['安装失败（显示 1 / 共 2）'])
    await categorySelect(wrapper).setValue('preCheckFailed')
    expect(tableRows(wrapper)).toEqual([[sample.preCheckFailed[0]]])
    await clickButton(wrapper, '清除筛选')
    expect(searchInput(wrapper).element.value).toBe('')
    expect(categorySelect(wrapper).element.value).toBe('all')
    expect(tableRows(wrapper)).toEqual([
      sample.preCheckFailed,
      sample.installFailed,
      sample.skipped
    ])
    expect(api.getFailedHosts).toHaveBeenCalledTimes(1)
  })

  it('keeps skipped hosts separate even when they are the only displayed matches', async () => {
    const sample = failureSample()
    const wrapper = await openSample(sample)
    await categorySelect(wrapper).setValue('skipped')
    await searchInput(wrapper).setValue('可更新包')
    expect(tableRows(wrapper)).toEqual([sample.skipped])
    expect(headings(wrapper)).toEqual(['未下发（无可更新包）（显示 1 / 共 1）'])
    expect(wrapper.text()).toContain('失败主机共 3 台（去重）')
    expect(wrapper.text()).toContain('未下发主机不计入失败，不参与重新建任务。')
    expect(wrapper.find('[data-column="reason"]').text()).toContain('未下发原因')
  })

  it('distinguishes no matches from empty source groups and tolerates missing display values', async () => {
    const wrapper = await openSample({ preCheckFailed: [{ hostId: 'h1' }] })
    await searchInput(wrapper).setValue('不存在')
    expect(tableRows(wrapper)).toEqual([[], [], []])
    const tables = wrapper.findAllComponents({ name: 'ElTable' })
    expect(tables.map(table => table.props('emptyText'))).toEqual([
      '未匹配到主机或原因，请调整或清除筛选',
      '暂无失败主机',
      '暂无未下发主机'
    ])
    await searchInput(wrapper).setValue('   ')
    expect(tableRows(wrapper)[0]).toEqual([{ hostId: 'h1' }])
    expect(wrapper.text()).toContain('失败主机共 1 台（去重）')
  })

  it('retains filters on refresh and error recovery while displaying only the new response', async () => {
    const wrapper = await openSample()
    await categorySelect(wrapper).setValue('installFailed')
    await searchInput(wrapper).setValue('db-03')
    api.getFailedHosts.mockRejectedValueOnce(new Error('offline'))
    await clickButton(wrapper, '刷新')
    expect(wrapper.find('[role="alert"]').text()).toContain('加载失败主机失败')
    expect(wrapper.findAll('section')).toHaveLength(0)
    const updated = { hostId: 'h3', hostKey: 'db-03', reason: '更新后的原因' }
    api.getFailedHosts.mockResolvedValueOnce({ data: { installFailed: [updated] } })
    await clickButton(wrapper, '刷新')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(searchInput(wrapper).element.value).toBe('db-03')
    expect(categorySelect(wrapper).element.value).toBe('installFailed')
    expect(tableRows(wrapper)).toEqual([[updated]])
    expect(wrapper.text()).not.toContain('执行机未返回结果')
    expect(api.getFailedHosts.mock.calls).toEqual([['task-1'], ['task-1'], ['task-1']])
  })

  it('resets filters when replacing the task and ignores its old pending refresh', async () => {
    const wrapper = await openSample()
    await searchInput(wrapper).setValue('web')
    await categorySelect(wrapper).setValue('preCheckFailed')
    const pending = deferred()
    api.getFailedHosts.mockReturnValueOnce(pending.promise)
    // Do not await the refresh response before replacing its task.
    wrapper
      .findAllComponents({ name: 'ElButton' })
      .find(button => button.text() === '刷新')
      .vm.$emit('click')
    api.getFailedHosts.mockResolvedValueOnce({
      data: { skipped: [{ hostId: 'new', hostKey: 'new-host' }] }
    })
    await wrapper.setProps({ taskId: 'task-2' })
    await flushPromises()
    pending.resolve({ data: failureSample() })
    await flushPromises()
    expect(searchInput(wrapper).element.value).toBe('')
    expect(categorySelect(wrapper).element.value).toBe('all')
    expect(headings(wrapper)).toHaveLength(3)
    expect(wrapper.text()).toContain('new-host')
    expect(wrapper.text()).not.toContain('Web-01')
    expect(wrapper.text()).toContain('失败主机共 0 台（去重）')
    expect(api.getFailedHosts.mock.calls.at(-1)).toEqual(['task-2'])
  })

  it('resets filters after closing and reopening the same task and ignores a late closed response', async () => {
    const wrapper = await openSample()
    await searchInput(wrapper).setValue('web')
    await categorySelect(wrapper).setValue('installFailed')
    const pending = deferred()
    api.getFailedHosts.mockReturnValueOnce(pending.promise)
    wrapper
      .findAllComponents({ name: 'ElButton' })
      .find(button => button.text() === '刷新')
      .vm.$emit('click')
    await wrapper.setProps({ modelValue: false })
    pending.resolve({ data: { installFailed: [{ hostKey: 'late-host' }] } })
    await flushPromises()
    expect(wrapper.text()).not.toContain('late-host')
    await wrapper.setProps({ modelValue: true })
    await flushPromises()
    expect(searchInput(wrapper).element.value).toBe('')
    expect(categorySelect(wrapper).element.value).toBe('all')
    expect(tableRows(wrapper).map(rows => rows.length)).toEqual([2, 2, 1])
    expect(api.getFailedHosts).toHaveBeenCalledTimes(3)
  })

  it('finds one host among hundreds while preserving duplicate-host failure counts across stages', async () => {
    const preCheckFailed = Array.from({ length: 300 }, (_, index) => ({
      hostId: `h-${index}`,
      hostKey: `Host-${index}`,
      reason: 'SSH 不可达'
    }))
    const installFailed = preCheckFailed.slice(0, 100).map(row => ({ ...row, reason: '安装失败' }))
    const wrapper = await openSample({ preCheckFailed, installFailed })
    await searchInput(wrapper).setValue('host-299')
    expect(tableRows(wrapper)).toEqual([[preCheckFailed[299]], [], []])
    expect(headings(wrapper)[0]).toBe('预检失败（显示 1 / 共 300）')
    expect(headings(wrapper)[1]).toBe('安装失败（显示 0 / 共 100）')
    expect(wrapper.text()).toContain('失败主机共 300 台（去重）')
    expect(preCheckFailed).toHaveLength(300)
    expect(installFailed).toHaveLength(100)
    expect(api.getFailedHosts).toHaveBeenCalledTimes(1)
  })
})
