import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import {
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElSwitch,
  ElTable,
  ElTableColumn
} from 'element-plus'
import WsusPage from '@/modules/patches/windows-patch/views/WindowsPatchWsusConfigPage.vue'
import WsusDialog from '@/modules/patches/windows-patch/components/wsus/WinPatchWsusConfigDialog.vue'

const api = vi.hoisted(() => ({
  getWsusConfigs: vi.fn(),
  saveWsusConfig: vi.fn(),
  deleteWsusConfig: vi.fn()
}))
vi.mock('@/modules/patches/windows-patch/api', () => ({ winPatchApi: api }))

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const Button = {
  props: ['disabled', 'loading'],
  template: '<button :disabled="disabled || loading"><slot /></button>'
}
let wrapper
function openPage() {
  wrapper = mount(WsusPage, {
    global: {
      components: { ElTable, ElTableColumn },
      stubs: {
        'el-button': Button,
        'el-icon': true,
        'el-tag': { template: '<span><slot /></span>' },
        'el-alert': { props: ['title'], template: '<div role="alert">{{ title }}<slot /></div>' },
        WinPatchWsusConfigDialog: {
          name: 'WinPatchWsusConfigDialog',
          emits: ['saved'],
          template: '<div />'
        }
      },
      directives: { loading() {} }
    }
  })
  return flushPromises()
}
async function openDialog(configData) {
  wrapper = mount(WsusDialog, {
    props: { modelValue: false, configData },
    global: {
      components: { ElForm, ElFormItem, ElInput, ElInputNumber, ElSwitch },
      stubs: {
        'el-form': false,
        'el-form-item': false,
        'el-input': false,
        'el-button': Button,
        'el-dialog': {
          props: ['modelValue'],
          template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>'
        }
      }
    }
  })
  await wrapper.setProps({ modelValue: true })
  await flushPromises()
}
const button = text => wrapper.findAll('button').find(item => item.text() === text)

beforeEach(() => {
  Object.values(api).forEach(mock => mock.mockReset())
  api.getWsusConfigs.mockResolvedValue({ data: [] })
  api.saveWsusConfig.mockResolvedValue({ data: { id: 'wsus-a' } })
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  wrapper?.unmount()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('WSUS 配置读取反馈', () => {
  it('首次读取失败保留页面错误与重试，重试成功后才显示空配置', async () => {
    api.getWsusConfigs.mockRejectedValueOnce(new Error('offline'))
    await openPage()
    expect(wrapper.text()).toContain('加载 WSUS 配置失败，请重试')
    expect(wrapper.text()).not.toContain('暂无 WSUS 配置')
    await button('重试').trigger('click')
    await flushPromises()
    expect(api.getWsusConfigs).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).not.toContain('加载 WSUS 配置失败，请重试')
    expect(wrapper.text()).toContain('暂无 WSUS 配置')
  })

  it('刷新失败清除旧可编辑记录，不把失败当成空列表或继续操作旧对象', async () => {
    api.getWsusConfigs.mockResolvedValueOnce({ data: [{ id: 'wsus-a', wsusUrl: 'http://wsus-a' }] })
    await openPage()
    expect(wrapper.findComponent(ElTable).props('data')).toHaveLength(1)
    api.getWsusConfigs.mockRejectedValueOnce(new Error('offline'))
    await wrapper.get('button.toolbar-icon-btn').trigger('click')
    await flushPromises()
    expect(wrapper.findComponent(ElTable).props('data')).toEqual([])
    expect(wrapper.text()).toContain('加载 WSUS 配置失败，请重试')
    expect(api.deleteWsusConfig).not.toHaveBeenCalled()
    expect(api.saveWsusConfig).not.toHaveBeenCalled()
  })

  it.each(['resolve', 'reject'])('迟到的旧%s不覆盖当前结果或结束新加载', async method => {
    await openPage()
    const old = deferred(),
      latest = deferred()
    api.getWsusConfigs.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    wrapper.findComponent({ name: 'WinPatchWsusConfigDialog' }).vm.$emit('saved')
    await flushPromises()
    wrapper.findComponent({ name: 'WinPatchWsusConfigDialog' }).vm.$emit('saved')
    await flushPromises()
    old[method](method === 'resolve' ? { data: [{ id: 'old' }] } : new Error('old'))
    await flushPromises()
    expect(wrapper.findComponent(ElTable).props('data')).toEqual([])
    expect(wrapper.vm.$.setupState.loading).toBe(true)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    latest.resolve({ data: [{ id: 'latest' }] })
    await flushPromises()
    expect(wrapper.findComponent(ElTable).props('data')).toEqual([{ id: 'latest' }])
  })

  it('接口返回非列表时显示读取失败，保留既有数组响应契约', async () => {
    api.getWsusConfigs.mockResolvedValueOnce({ data: { message: 'invalid' } })
    await openPage()
    expect(wrapper.text()).toContain('加载 WSUS 配置失败，请重试')
    expect(wrapper.text()).not.toContain('暂无 WSUS 配置')
  })
})

describe('WSUS 编辑 HTTPS 与原配置保持一致', () => {
  it.each([false, 'false', 0, '0'])('关闭值 %s 编辑后不被自动开启', async useSsl => {
    await openDialog({
      id: 'wsus-a',
      wsus_url: 'http://wsus-a',
      wsus_port: 8530,
      use_ssl: useSsl,
      description: 'old'
    })
    expect(wrapper.findComponent(ElSwitch).props('modelValue')).toBe(false)
    await wrapper.get('textarea').setValue('description only')
    await button('保存').trigger('click')
    await flushPromises()
    expect(api.saveWsusConfig).toHaveBeenCalledExactlyOnceWith({
      id: 'wsus-a',
      wsusUrl: 'http://wsus-a',
      wsusPort: 8530,
      useSsl: false,
      description: 'description only'
    })
    expect(wrapper.emitted('saved')).toHaveLength(1)
  })

  it.each([true, 'true', 1, '1'])('开启值 %s 及手动切换保持正常', async useSsl => {
    await openDialog({ id: 'wsus-a', wsusUrl: 'https://wsus-a', wsusPort: 8531, useSsl })
    expect(wrapper.findComponent(ElSwitch).props('modelValue')).toBe(true)
    await wrapper.findComponent(ElSwitch).trigger('click')
    await button('保存').trigger('click')
    await flushPromises()
    expect(api.saveWsusConfig.mock.calls[0][0].useSsl).toBe(false)
  })

  it('新建仍默认关闭，表单阻止原生提交', async () => {
    await openDialog(null)
    expect(wrapper.findComponent(ElSwitch).props('modelValue')).toBe(false)
    expect(wrapper.findComponent(ElInputNumber).props('modelValue')).toBe(8530)
    const event = new Event('submit', { bubbles: true, cancelable: true })
    wrapper.get('form').element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(api.saveWsusConfig).not.toHaveBeenCalled()
  })
})
