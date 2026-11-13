import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import Page from '@/views/admin/AutoConfig.vue'
import { setLocale } from '@/core/i18n'

const api = vi.hoisted(() => ({ get: vi.fn(), batch: vi.fn(), error: vi.fn() }))
vi.mock('@/core/api', () => ({ apiService: { get: api.get } }))
vi.mock('@/services/acm/automation.service', () => ({ batchUpdateDevicePasswords: api.batch }))
vi.mock('element-plus', () => ({ ElMessage: { error: api.error, info: vi.fn() } }))
const Slot = {
  template: '<div><slot /><slot name="label" /><slot name="footer" /><slot name="tip" /></div>'
}
const stubs = Object.fromEntries(
  [
    'el-tabs',
    'el-tab-pane',
    'el-form',
    'el-form-item',
    'el-button',
    'el-icon',
    'el-select',
    'el-option',
    'el-tag',
    'el-upload'
  ].map(name => [name, Slot])
)
Object.assign(stubs, {
  'el-input': { props: ['modelValue'], template: '<input :value="modelValue" />' },
  'el-dialog': {
    props: ['title'],
    template: '<section><h2>{{ title }}</h2><slot /><slot name="footer" /></section>'
  },
  'el-alert': { props: ['description'], template: '<p>{{ description }}</p>' },
  'el-table': Slot,
  'el-table-column': { props: ['label'], template: '<span>{{ label }}</span>' },
  'el-progress': true
})
let wrapper
const state = () => wrapper.vm.$.setupState
async function open() {
  wrapper = mount(Page, { global: { stubs } })
  await flushPromises()
}
beforeEach(async () => {
  api.get
    .mockReset()
    .mockImplementation(url =>
      Promise.resolve({
        data: url.includes('resource-type')
          ? [{ code: 'linux', title: '后端资产类型' }]
          : url.includes('all-asset-auto-config')
            ? [{ id: 'cred-1', name: '后端凭据名称' }]
            : [
                {
                  id: 'row-id',
                  ci_type: 'linux',
                  ip: '10.0.0.7',
                  ansibleConfigId: 'cred-1',
                  login_user: '原始登录用户',
                  run_user: '原始执行用户'
                }
              ]
      })
    )
  api.batch.mockReset()
  api.error.mockReset()
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrapper?.unmount()
  await setLocale('zh-CN', { persist: false })
})
describe('admin credential language changes', () => {
  it('retains filters, pagination, selected upload and raw credential identities without refetching', async () => {
    await open()
    const vm = state(),
      rows = vm.rows,
      file = new File(['raw xlsx'], '中文凭据.xlsx')
    vm.filterOS = 'linux'
    vm.keyword = '未提交搜索'
    vm.currentPage = 2
    vm.pageSize = 20
    vm.openBatchDialog()
    vm.onFilePicked({ raw: file }, [{ name: file.name, raw: file }])
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(wrapper.text()).toContain('Connection credentials')
    expect(wrapper.text()).toContain('Update managed devices in bulk')
    expect(vm.rows).toBe(rows)
    expect(rows[0]).toMatchObject({
      id: 'row-id',
      name: '后端凭据名称',
      loginUser: '原始登录用户',
      execUser: '原始执行用户'
    })
    expect(vm.osOptions[0]).toEqual({ value: 'linux', label: '后端资产类型' })
    expect(vm.filterOS).toBe('linux')
    expect(vm.keyword).toBe('未提交搜索')
    expect(vm.currentPage).toBe(2)
    expect(vm.pageSize).toBe(20)
    expect(vm.selectedFile).toBe(file)
    expect(vm.batchVisible).toBe(true)
    expect(api.get).toHaveBeenCalledTimes(3)
    expect(api.get).toHaveBeenLastCalledWith('/cmdb/api/cmdb/dashboard/automation', {
      params: { cit: 'sjxy_all', param: 'x', size: 100, page: 1 }
    })
    expect(api.batch).not.toHaveBeenCalled()
  })
  it('preserves an in-flight batch and translates its result shell without rewriting server details', async () => {
    await open()
    let finish
    api.batch.mockImplementation((file, progress) => {
      progress(38)
      return new Promise(resolve => {
        finish = resolve
      })
    })
    const vm = state(),
      file = new File(['xlsx bytes'], '实际文件.xlsx')
    vm.openBatchDialog()
    vm.onFilePicked({ raw: file }, [])
    const request = vm.submitBatch()
    await setLocale('en-US', { persist: false })
    expect(vm.uploading).toBe(true)
    expect(vm.uploadPercent).toBe(38)
    expect(vm.selectedFile).toBe(file)
    expect(api.batch).toHaveBeenCalledTimes(1)
    expect(api.batch.mock.calls[0][0]).toBe(file)
    const result = {
      total: 2,
      successCount: 1,
      failCount: 1,
      successList: [{ ciId: 'ci-id', message: '原始成功信息' }],
      failList: [{ ciId: 'failed-id', message: '原始中文错误' }]
    }
    finish(result)
    await request
    await flushPromises()
    expect(wrapper.text()).toContain('Total: 2')
    expect(wrapper.text()).toContain('Succeeded: 1')
    expect(wrapper.text()).toContain('Failed: 1')
    expect(vm.batchResult.failList[0].message).toBe('原始中文错误')
    expect(vm.batchResult.successList[0].ciId).toBe('ci-id')
    expect(vm.batchResultVisible).toBe(true)
    expect(vm.uploading).toBe(false)
    await setLocale('zh-CN', { persist: false })
    await flushPromises()
    expect(wrapper.text()).toContain('总计: 2')
    expect(api.batch).toHaveBeenCalledTimes(1)
    expect(api.get).toHaveBeenCalledTimes(4)
  })
})
