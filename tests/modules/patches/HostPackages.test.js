import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { usePackageList } from '@/modules/patches/composables/usePackageList'
import PackagesTab from '@/modules/patches/components/host-detail/tabs/PackagesTab.vue'

const api = vi.hoisted(() => ({ scan: vi.fn(), compatibility: vi.fn() }))
vi.mock('@/modules/patches/api', () => ({
  rpmInfoApi: { getInstalledScanList: api.scan },
  patchScanApi: { getMachinePackages: api.compatibility }
}))
vi.mock('element-plus', () => ({ ElMessage: { error: vi.fn(), warning: vi.fn() } }))
vi.mock('@/modules/patches/components/rpm/RpmPackageDetailDialog.vue', () => ({
  default: { template: '<div />' }
}))

const installed = ['kernel-4.18.0-477.10.1.el8_8.x86_64', 'kernel-4.18.0-477.15.1.el8_8.x86_64']
const updatePkg = 'kernel-4.18.0-553.5.1.el8_10.x86_64.rpm'
const wrappers = []

function scanRow(currentPackage, affected = true) {
  return {
    hostId: 'host-151',
    currentPackage,
    pkgName: 'kernel',
    pkgArch: 'x86_64',
    affected,
    packageInfo: { name: 'kernel', version: '4.18.0-553.5.1.el8_10', architecture: 'x86_64' }
  }
}

function mapping(installedPkg, patchId = 'RHSA-2026:1234') {
  return { pkgName: 'kernel', installedPkg, updatePkg, patchId, severity: 'important' }
}

function mockResponses(rows, mappings) {
  api.scan.mockResolvedValue({ data: { content: rows, totalElements: rows.length } })
  api.compatibility.mockResolvedValue({
    data: { records: [{ affected_pkgs: JSON.stringify(mappings) }] }
  })
}

async function loadList() {
  let list
  wrappers.push(
    mount({
      setup() {
        list = usePackageList(ref('host-151'))
        return () => null
      }
    })
  )
  await list.loadPackageList()
  return list
}

beforeEach(() => vi.resetAllMocks())
afterEach(() => wrappers.splice(0).forEach(wrapper => wrapper.unmount()))

describe('主机软件包安装版本与补丁映射', () => {
  it('保留两条真实安装版本，只为匹配版本补充更新信息', async () => {
    mockResponses(
      [scanRow(installed[0], false), scanRow(installed[1])],
      [mapping(`${installed[1]}.rpm`)]
    )
    const list = await loadList()
    const rows = list.packageTableData.value

    expect(list.packagePagination.total).toBe(2)
    expect(rows.map(row => row.installedPkg)).toEqual(installed)
    expect(rows.map(row => row.currentPackage)).toEqual(installed)
    expect(rows.map(row => row.pkgId)).toEqual(installed)
    expect(rows[0]).toMatchObject({ affected: false, hasUpdateInfo: false, updatePkg: null })
    expect(rows[1]).toMatchObject({ affected: true, hasUpdateInfo: true, updatePkg })
    expect(rows[1].packages).toBe(`kernel#${updatePkg}#RHSA-2026:1234`)
  })

  it.each(['', '.rpm'])('完整版本匹配兼容后缀 %s', async suffix => {
    mockResponses([scanRow(installed[1])], [mapping(`${installed[1]}${suffix}`)])
    const list = await loadList()
    expect(list.packageTableData.value[0]).toMatchObject({
      installedPkg: installed[1],
      hasUpdateInfo: true,
      updatePkg
    })
  })

  it.each([installed[0], installed[1].replace('x86_64', 'aarch64')])(
    '同名但版本或架构不同的映射不能用于当前行：%s',
    async otherPackage => {
      mockResponses([scanRow(installed[1])], [mapping(`${otherPackage}.rpm`)])
      const list = await loadList()
      expect(list.packageTableData.value[0]).toMatchObject({
        installedPkg: installed[1],
        hasUpdateInfo: false,
        patchId: '',
        packages: ''
      })
    }
  )

  it('兼容仅提供包名的旧映射，同时保留扫描安装版本', async () => {
    mockResponses([scanRow(installed[0])], [mapping('')])
    const list = await loadList()
    expect(list.packageTableData.value[0]).toMatchObject({
      installedPkg: installed[0],
      hasUpdateInfo: true,
      updatePkg
    })
  })

  it('补丁映射不可用时仍显示扫描得到的不同版本', async () => {
    mockResponses(
      installed.map(pkg => scanRow(pkg)),
      []
    )
    const list = await loadList()
    expect(list.packageTableData.value.map(row => row.installedPkg)).toEqual(installed)
    expect(list.packageTableData.value.every(row => !row.hasUpdateInfo)).toBe(true)
  })

  it('勾选和恢复选择时区分同包名、同补丁的不同安装版本', async () => {
    mockResponses(
      installed.map(pkg => scanRow(pkg)),
      installed.map(pkg => mapping(`${pkg}.rpm`))
    )
    const clearSelection = vi.fn()
    const toggleRowSelection = vi.fn()
    const wrapper = mount(PackagesTab, {
      props: { hostId: 'host-151' },
      global: {
        stubs: {
          'el-table': {
            setup(_, { expose }) {
              expose({ clearSelection, toggleRowSelection })
              return () => null
            }
          },
          'el-table-column': true,
          'el-pagination': true,
          'el-icon': true
        },
        directives: { loading() {} }
      }
    })
    wrappers.push(wrapper)
    await wrapper.vm.loadPackageList()
    const state = wrapper.vm.$.setupState
    const [first, second] = state.packageTableData
    state.selectedPackages = [state.packageFilteredData[1]]
    state.handleTableSelect([first])
    expect(state.selectedPackages.map(row => row.installedPkg)).toEqual([installed[0]])

    toggleRowSelection.mockClear()
    state.selectedPackages = [state.packageFilteredData[1]]
    state.packageTableData = [...state.packageTableData]
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    expect(toggleRowSelection.mock.calls).toEqual([[second, true]])
  })
})
