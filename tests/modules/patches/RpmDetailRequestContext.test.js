import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ElMessage, ElPagination, ElTable, ElTableColumn } from 'element-plus'
import Catalog from '@/modules/patches/views/RpmPackageListPage.vue'
import Installed from '@/modules/patches/views/LinuxMachinePackageListPage.vue'

const api = vi.hoisted(() => ({ catalog: vi.fn(), byName: vi.fn(), installed: vi.fn() }))
const fixtures = vi.hoisted(() => ({
  catalog: ['a', 'b'].map((key, i) => ({
    id: i + 101,
    completePackageName: `pkg-${key}-1.x86_64`,
    source: 'redhat',
    architecture: 'x86_64',
    osVersion: '9'
  })),
  installed: ['a', 'b'].map(key => ({
    hostId: `host-${key}`,
    hostKey: `host-${key}`,
    currentPackage: `pkg-${key}-1.x86_64`,
    pkgName: `pkg-${key}`,
    pkgVersion: '1.0',
    pkgArch: 'x86_64',
    source: 'redhat',
    osDistro: 'Red Hat',
    osVersion: '9',
    osArch: 'x86_64'
  }))
}))
vi.mock('@/modules/patches/api', () => ({
  rpmInfoApi: {
    getPackageDetailById: api.catalog,
    getPackageDetail: api.byName,
    getInstalledDetail: api.installed
  }
}))
vi.mock('@/modules/patches/composables/useRpmPackageList', async () => {
  const { ref, reactive } = await import('vue')
  return {
    useRpmPackageList: () => ({
      filters: reactive({ source: '', name: '', arch: '', osVersion: '' }),
      loading: ref(false),
      pagination: reactive({ page: 1, pageSize: 10, total: 2 }),
      tableData: ref(fixtures.catalog),
      archOptions: ref([]),
      osVersionOptions: ref([]),
      loadArchOptions() {},
      loadOsVersionOptions() {},
      loadData() {},
      handleSearch() {},
      handleReset() {},
      handlePageChange() {},
      handleSizeChange() {}
    })
  }
})
vi.mock('@/modules/patches/composables/useLinuxMachinePackageList', async () => {
  const { ref, reactive } = await import('vue')
  return {
    useLinuxMachinePackageList: () => ({
      exporting: ref(false),
      filters: reactive({}),
      loading: ref(false),
      pagination: reactive({ page: 1, pageSize: 10, total: 2 }),
      tableData: ref(fixtures.installed),
      selectedHosts: ref([]),
      loadData() {},
      handleSearch() {},
      handleReset() {},
      handleExport() {},
      handlePageChange() {},
      handleSizeChange() {}
    })
  }
})
vi.mock('@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/patches/components/rpm/RpmPackageDetailDialog.vue', () => ({
  default: {
    name: 'RpmPackageDetailDialog',
    props: ['modelValue', 'loading', 'detailData'],
    emits: ['update:modelValue'],
    template:
      '<section v-if="modelValue" data-detail><span>{{ detailData.name }}</span><button data-detail-close @click="$emit(\'update:modelValue\', false)">关闭</button></section>'
  }
}))

const Slot = { template: '<div><slot /></div>' }
let wrapper
const state = () => wrapper.vm.$.setupState
const detail = () => wrapper.findComponent({ name: 'RpmPackageDetailDialog' })
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
async function open(component) {
  wrapper = mount(component, {
    global: {
      components: { ElTable, ElTableColumn, ElPagination },
      stubs: {
        'el-form': Slot,
        'el-form-item': Slot,
        'el-input': true,
        'el-select': Slot,
        'el-option': true,
        'el-button': { template: '<button><slot /></button>' },
        'el-link': { template: '<button><slot /></button>' },
        'el-tag': Slot,
        'el-icon': true,
        'el-popover': true,
        'el-tooltip': Slot
      },
      directives: { loading() {} }
    }
  })
  await flushPromises()
}
async function openRow(index) {
  await wrapper.findAll('.el-table__body-wrapper tbody tr')[index].get('button').trigger('click')
  await flushPromises()
}
beforeEach(() => {
  Object.values(api).forEach(mock => mock.mockReset())
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

describe.each([
  ['软件包查询', Catalog, api.catalog],
  ['机器包清单', Installed, api.installed]
])('%s只读详情上下文', (_, component, query) => {
  it('关闭A再打开B时，A迟到成功不能填入B或提前结束B的加载，原参数保持', async () => {
    const a = deferred(),
      b = deferred()
    query.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise)
    await open(component)
    await openRow(0)
    await wrapper.get('[data-detail-close]').trigger('click')
    await openRow(1)
    a.resolve({ data: { name: 'old-a' } })
    await flushPromises()
    expect(detail().props('modelValue')).toBe(true)
    expect(state().detailLoading).toBe(true)
    expect(state().detailData).toEqual({})
    b.resolve({ data: { name: 'current-b' } })
    await flushPromises()
    expect(detail().props('detailData').name).toBe('current-b')
    expect(state().detailLoading).toBe(false)
    expect(query).toHaveBeenCalledTimes(2)
    if (component === Catalog) {
      expect(query.mock.calls.map(call => call[0])).toEqual([101, 102])
    } else {
      expect(query.mock.calls[1][0]).toEqual({
        version: '1.0',
        pkgName: 'pkg-b',
        source: 'redhat',
        arch: 'x86_64',
        osDistro: 'Red Hat',
        osVersion: '9',
        osArch: 'x86_64'
      })
    }
  })

  it('关闭A并查看B后，A迟到失败不弹旧错误或关闭B', async () => {
    const a = deferred()
    query.mockReturnValueOnce(a.promise).mockResolvedValueOnce({ data: { name: 'current-b' } })
    vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
    await open(component)
    await openRow(0)
    await wrapper.get('[data-detail-close]').trigger('click')
    await openRow(1)
    a.reject(new Error('obsolete-a'))
    await flushPromises()
    expect(detail().props('modelValue')).toBe(true)
    expect(detail().props('detailData').name).toBe('current-b')
    expect(ElMessage.error).not.toHaveBeenCalled()
  })

  it('页面卸载后忽略迟到错误，不改变其他页面或自动重查', async () => {
    const a = deferred()
    query.mockReturnValueOnce(a.promise)
    vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
    await open(component)
    await openRow(0)
    wrapper.unmount()
    a.reject(new Error('unmounted'))
    await flushPromises()
    expect(ElMessage.error).not.toHaveBeenCalled()
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('当前可见详情查询失败仍沿原提示并关闭，不吞掉当前错误', async () => {
    query.mockRejectedValueOnce(new Error('current read failed'))
    vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await open(component)
    await openRow(0)
    expect(ElMessage.error).toHaveBeenCalledWith(
      component === Catalog ? '获取 RPM 包详情失败' : '获取软件包详情失败'
    )
    expect(detail().props('modelValue')).toBe(false)
    expect(state().detailLoading).toBe(false)
    expect(query).toHaveBeenCalledTimes(1)
  })
})
