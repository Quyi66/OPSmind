import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { flushPromises, shallowMount } from '@vue/test-utils'
import LinuxPatchInstallPage from '@/modules/patches/views/LinuxPatchInstallPage.vue'
import { patchInstallApi } from '@/modules/patches/api'
import { ElMessage, ElPagination } from 'element-plus'

vi.mock('element-plus', async importOriginal => ({
  ...(await importOriginal()),
  ElMessage: { error: vi.fn(), warning: vi.fn() }
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: { tab: 'patch' } }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() })
}))
vi.mock('@/modules/patches/api', () => ({
  patchInstallApi: { getAvailablePatches: vi.fn() },
  patchScanApi: { getScanResults: vi.fn().mockResolvedValue({ data: { records: [] } }) },
  vulnerabilityApi: {
    getOsDistroList: vi.fn().mockResolvedValue({}),
    getOsVersionList: vi.fn().mockResolvedValue({})
  }
}))
vi.mock('@/modules/asset/api', () => ({
  dataManageApi: { getAllTags: vi.fn().mockResolvedValue({ records: [] }) },
  agentApi: {}
}))
vi.mock('@/modules/patches/components/patch-task/wizard/PatchInstallWizard.vue', () => ({
  default: {
    name: 'PatchInstallWizard',
    props: ['visible', 'patchesToInstall'],
    template: '<div />'
  }
}))
vi.mock('@/modules/patches/components/host-detail/dialogs/BatchInstallPatchDrawer.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/patches/components/logs/OperationLogsDialog.vue', () => ({
  default: { template: '<div />' }
}))

const TableStub = defineComponent({
  name: 'ElTable',
  props: ['data'],
  emits: ['select', 'select-all'],
  methods: { clearSelection: vi.fn(), toggleRowSelection: vi.fn() },
  template: '<div />'
})

let wrapper
let records

async function mountPage({ realPagination = false } = {}) {
  wrapper = shallowMount(LinuxPatchInstallPage, {
    global: {
      renderStubDefaultSlot: true,
      stubs: {
        ElTable: TableStub,
        ElTableColumn: true,
        ElPagination: realPagination
          ? ElPagination
          : {
              name: 'ElPagination',
              props: ['currentPage', 'pageSize'],
              template: '<div />'
            },
        ElSelect: true,
        ElOption: true,
        ElIcon: true,
        ElLink: true,
        ElTag: true
      },
      directives: { loading: () => {} }
    }
  })
  await flushPromises()
  return wrapper.findComponent(TableStub)
}

function installButton() {
  return wrapper
    .findAllComponents({ name: 'ElButton' })
    .find(button => button.text().includes('安装选中的补丁'))
}

async function selectRows(rows) {
  wrapper.findComponent(TableStub).vm.$emit('select', rows)
  await nextTick()
}

beforeEach(() => {
  vi.clearAllMocks()
  records = Array.from({ length: 12 }, (_, index) => ({
    patch_id: `KYSA-202503-${1055 + index}`,
    effect_host_count: 10
  }))
  // 每次刷新返回新的对象，模拟真实接口响应。
  patchInstallApi.getAvailablePatches.mockImplementation(async () => ({
    data: { records: records.map(record => ({ ...record })) }
  }))
})

afterEach(() => {
  wrapper?.unmount()
  vi.restoreAllMocks()
})

function buttonWithText(text) {
  return wrapper
    .findAllComponents({ name: 'ElButton' })
    .find(button => button.text().includes(text))
}

function deferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('LinuxPatchInstallPage patch selection', () => {
  it('clears selection after installation and passes only the new row to the next install', async () => {
    const table = await mountPage()
    await selectRows([table.props('data')[0]])
    await installButton().trigger('click')
    const wizard = wrapper.findComponent({ name: 'PatchInstallWizard' })
    expect(wizard.props('patchesToInstall')).toHaveLength(1)

    records[0].effect_host_count = 5
    TableStub.methods.clearSelection.mockClear()
    wizard.vm.$emit('success')
    await flushPromises()

    expect(installButton().text()).toContain('(0)')
    expect(TableStub.methods.clearSelection).toHaveBeenCalled()
    await selectRows([table.props('data')[0]])
    await installButton().trigger('click')

    expect(installButton().text()).toContain('(1)')
    expect(wizard.props('patchesToInstall')).toEqual([records[0]])
  })

  it('clears cross-page selections on refresh but preserves them while paging', async () => {
    const table = await mountPage()
    await selectRows([table.props('data')[0]])
    wrapper.findComponent({ name: 'ElPagination' }).vm.$emit('current-change', 2)
    await nextTick()
    await selectRows([table.props('data')[0]])
    expect(installButton().text()).toContain('(2)')

    await wrapper.vm.refresh()
    await flushPromises()
    expect(installButton().text()).toContain('(0)')
  })

  it('matches rows by patch ID when merging the current page selection', async () => {
    const table = await mountPage()
    const row = table.props('data')[0]
    await selectRows([{ ...row }])
    await selectRows([row])
    expect(installButton().text()).toContain('(1)')

    await selectRows([])
    expect(installButton().text()).toContain('(0)')
  })

  it('selects all pages, deselects one page, then clears all selections', async () => {
    const table = await mountPage()
    await buttonWithText('一键全选').trigger('click')
    expect(installButton().text()).toContain('(12)')
    table.vm.$emit('select-all', [])
    await nextTick()
    expect(installButton().text()).toContain('(2)')
    await installButton().trigger('click')
    expect(wrapper.findComponent({ name: 'PatchInstallWizard' }).props('patchesToInstall')).toEqual(
      records.slice(10)
    )
    await buttonWithText('一键全选').trigger('click')
    await buttonWithText('一键取消').trigger('click')
    expect(installButton().text()).toContain('(0)')
  })

  it('preserves selections when changing page size', async () => {
    const table = await mountPage()
    await selectRows([table.props('data')[0]])
    const pagination = wrapper.findComponent({ name: 'ElPagination' })
    pagination.vm.$emit('current-change', 2)
    await nextTick()
    await selectRows([table.props('data')[0]])
    pagination.vm.$emit('size-change', 20)
    await flushPromises()
    expect(table.props('data')).toHaveLength(12)
    expect(installButton().text()).toContain('(2)')
    await selectRows([table.props('data')[10]])
    expect(installButton().text()).toContain('(1)')
  })

  it.each(['搜索', '重置'])('clears selected rows on %s', async action => {
    const table = await mountPage()
    await selectRows([table.props('data')[0]])
    await buttonWithText(action).trigger('click')
    await flushPromises()
    expect(installButton().text()).toContain('(0)')
    await selectRows([table.props('data')[0]])
    expect(installButton().text()).toContain('(1)')
  })

  it('clears selection when severity filters change', async () => {
    const table = await mountPage()
    await selectRows([table.props('data')[0]])
    const select = wrapper.findComponent({ name: 'ElSelect' })
    select.vm.$emit('update:modelValue', ['Critical'])
    select.vm.$emit('change', ['Critical'])
    await flushPromises()
    expect(patchInstallApi.getAvailablePatches).toHaveBeenLastCalledWith({ severity: 'Critical' })
    expect(installButton().text()).toContain('(0)')
  })

  it('clears stale selection on request failure and can select again after retry', async () => {
    const table = await mountPage()
    await selectRows([table.props('data')[0]])
    vi.spyOn(console, 'error').mockImplementation(() => {})
    patchInstallApi.getAvailablePatches.mockRejectedValueOnce(new Error('network failure'))
    wrapper.vm.refresh()
    await flushPromises()
    expect(table.props('data')).toEqual([])
    expect(installButton().text()).toContain('(0)')
    expect(ElMessage.error).toHaveBeenCalledOnce()
    wrapper.vm.refresh()
    await flushPromises()
    await selectRows([table.props('data')[0]])
    expect(installButton().text()).toContain('(1)')
  })

  it('reopens the wizard with the latest selection after cancellation', async () => {
    const table = await mountPage()
    await selectRows([table.props('data')[0]])
    await installButton().trigger('click')
    const wizard = wrapper.findComponent({ name: 'PatchInstallWizard' })
    wizard.vm.$emit('update:visible', false)
    await nextTick()
    await selectRows([table.props('data')[1]])
    await installButton().trigger('click')
    expect(wizard.props('visible')).toBe(true)
    expect(wizard.props('patchesToInstall')).toEqual([records[1]])
  })

  it('clears selection when no patches remain after installation', async () => {
    const table = await mountPage()
    await selectRows([table.props('data')[0]])
    records = []
    wrapper.findComponent({ name: 'PatchInstallWizard' }).vm.$emit('success')
    await flushPromises()
    expect(table.props('data')).toEqual([])
    expect(installButton().text()).toContain('(0)')
    expect(installButton().attributes('disabled')).toBe('true')
  })

  it('restores visible selection after switching away and back to the patch tab', async () => {
    const table = await mountPage()
    await selectRows([table.props('data')[0]])
    await wrapper.findAll('.nav-tab')[0].trigger('click')
    await flushPromises()
    TableStub.methods.toggleRowSelection.mockClear()
    await wrapper.findAll('.nav-tab')[1].trigger('click')
    await flushPromises()
    expect(installButton().text()).toContain('(1)')
    expect(TableStub.methods.toggleRowSelection).toHaveBeenCalledWith(records[0], true)
  })

  it('returns to a valid page when remaining patches shrink after installation', async () => {
    await mountPage({ realPagination: true })
    wrapper.findComponent({ name: 'ElPagination' }).vm.$emit('current-change', 2)
    await nextTick()
    records = records.slice(0, 2)
    wrapper.findComponent({ name: 'PatchInstallWizard' }).vm.$emit('success')
    await flushPromises()
    expect(wrapper.findComponent(TableStub).props('data')).toEqual(records)
    expect(wrapper.findComponent({ name: 'ElPagination' }).props('currentPage')).toBe(1)
  })

  it.each(['resolve', 'reject'])(
    'ignores an older request that finishes via %s after the latest request',
    async outcome => {
      const table = await mountPage()
      const older = deferred()
      const newer = deferred()
      patchInstallApi.getAvailablePatches
        .mockReturnValueOnce(older.promise)
        .mockReturnValueOnce(newer.promise)
      wrapper.vm.refresh()
      wrapper.vm.refresh()
      const latestRows = [{ patch_id: 'latest-patch' }]
      newer.resolve({ data: { records: latestRows } })
      await flushPromises()
      vi.spyOn(console, 'error').mockImplementation(() => {})
      if (outcome === 'resolve') older.resolve({ data: { records: [] } })
      else older.reject(new Error('old request failed'))
      await flushPromises()
      expect(table.props('data')).toEqual(latestRows)
      expect(ElMessage.error).not.toHaveBeenCalled()
    }
  )
})
