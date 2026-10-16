import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import OperationLogsPage from '@/modules/patches/views/OperationLogsPage.vue'
import OperationLogsDialog from '@/modules/patches/components/logs/OperationLogsDialog.vue'
import { patchLogsApi } from '@/modules/patches/api'
import { formatPatchLogMessage } from '@/modules/patches/utils/operationLogMessages'
import { initTranslations } from '@/utils/i18n'

const translations = vi.hoisted(() => {
  let release
  const ready = new Promise(resolve => {
    release = resolve
  })
  vi.stubGlobal(
    'fetch',
    vi.fn(async url => {
      if (!String(url).endsWith('/app_vap.json')) return { ok: false }
      await ready
      return {
        ok: true,
        json: async () => (await import('../../../public/i18n/zh-cn/app_vap.json')).default
      }
    })
  )
  return { release }
})

vi.mock('@/modules/patches/api', () => ({ patchLogsApi: { getLogs: vi.fn() } }))
vi.mock('@/core/api', () => ({ useApi: () => ({}) }))
vi.mock('@/core/auth', () => ({ authService: {} }))
vi.mock('@/composables/useActiveTaskListPolling', () => ({ useActiveTaskListPolling: vi.fn() }))
vi.mock('@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/patches/components/logs/ScanReportDialog.vue', () => ({
  default: { template: '<div />' }
}))
vi.mock('@/modules/patches/components/logs/WindowsScanReportDialog.vue', () => ({
  default: { template: '<div />' }
}))

let wrappers = []
afterEach(() => {
  wrappers.forEach(wrapper => wrapper.unmount())
  wrappers = []
})
afterAll(() => vi.unstubAllGlobals())

describe('补丁日志真实翻译消费者', () => {
  it('页面与弹窗并行查询并等待翻译就绪，原记录和查询契约保持不变', async () => {
    const logs = Object.freeze([
      Object.freeze({
        message: '{"msg_id":"app_secops.log.patch_is_update"}',
        run_id: 'original-run'
      })
    ])
    patchLogsApi.getLogs.mockResolvedValue({ records: logs, total: 1 })
    wrappers = [OperationLogsPage, OperationLogsDialog].map(component =>
      shallowMount(component, {
        props: component === OperationLogsDialog ? { modelValue: true } : {},
        global: {
          stubs: Object.fromEntries(
            [
              'el-option',
              'el-select',
              'el-icon',
              'el-table-column',
              'el-table',
              'el-pagination',
              'el-tooltip',
              'el-empty',
              'el-scrollbar',
              'el-tag'
            ].map(name => [name, true])
          ),
          directives: { loading: () => {} }
        }
      })
    )
    await flushPromises()
    expect(patchLogsApi.getLogs).toHaveBeenCalledTimes(2)
    for (const wrapper of wrappers) {
      expect(wrapper.vm.$.setupState.tableData).toEqual([])
      expect(wrapper.vm.$.setupState.loading).toBe(true)
    }
    for (const [params] of patchLogsApi.getLogs.mock.calls) {
      expect(params).toMatchObject({ page: 1, size: 10, action: 'all', status: 'all', day: 1 })
    }
    translations.release()
    await initTranslations()
    await flushPromises()
    for (const [index, wrapper] of wrappers.entries()) {
      const state = wrapper.vm.$.setupState
      expect(state.tableData).toEqual(logs)
      expect(state.loading).toBe(false)
      expect(state[index === 0 ? 'translateMessage' : 'formatMessage'](logs[0].message)).toBe(
        '补丁库数据已为最新'
      )
    }
    expect(logs[0].message).toBe('{"msg_id":"app_secops.log.patch_is_update"}')
    expect(wrappers[0].vm.$.setupState.translateMessage('')).toBe('')
    expect(wrappers[1].vm.$.setupState.formatMessage('')).toBe('-')
  })

  it.each([
    ['exec_script_fail', '执行脚本出错，未输出结果文件，请检查详细信息'],
    ['patch_is_update', '补丁库数据已为最新'],
    ['rollback_success', '补丁回退执行成功'],
    ['install_success', '补丁安装执行完成']
  ])('只兼容实测完整键 app_secops.log.%s，同时保留旧键格式', (suffix, expected) => {
    const key = `app_secops.log.${suffix}`
    expect(formatPatchLogMessage(JSON.stringify({ msg_id: key }))).toBe(expected)
    expect(formatPatchLogMessage(key)).toBe(expected)
    expect(formatPatchLogMessage(`结果：#{${key}}`)).toBe(`结果：${expected}`)
    expect(formatPatchLogMessage(JSON.stringify({ msg_id: `app_vap.log.${suffix}` }))).toBe(
      expected
    )
    expect(formatPatchLogMessage(`#{app_vap.log.${suffix}}`)).toBe(expected)
  })

  it('使用真实 Windows 扫描字段并保留零耗时', () => {
    const record = Object.freeze({
      kbCount: 1,
      time: 0,
      msg_id: 'app_secops.log.win_scan_success',
      machineCount: 1
    })
    expect(formatPatchLogMessage(JSON.stringify(record))).toBe(
      'Windows补丁扫描执行成功，扫描机器数量为1，扫描存在漏洞数量为1，ETL处理耗时为0s'
    )
    expect(record.time).toBe(0)
  })

  it('保留旧模板参数插值，包括零值与缺失值', () => {
    expect(
      formatPatchLogMessage(
        JSON.stringify({
          msg_id: 'app_vap.log.scan_success',
          scan_count: 0,
          scan_packages: 5,
          scan_patch: 2,
          scan_time: 0
        })
      )
    ).toBe(
      '补丁扫描执行成功，扫描机器数量为0，扫描软件包数量为5，扫描存在漏洞数量为2，ETL处理耗时为0s'
    )
    expect(
      formatPatchLogMessage('{"msg_id":"app_vap.log.exec_install_fail","msg_info":null}')
    ).toBe('执行补丁安装出现错误，原因是')
  })

  it('Linux 扫描使用实测字段，不把扫描机器数扩展为所有目标数', () => {
    const record = Object.freeze({
      msg_id: 'app_secops.log.scan_success',
      scan_count: 1,
      scan_packages: 465,
      scan_patch: 101,
      scan_time: 6,
      scan_failed_count: 99,
      scan_failed_hosts: ['original-host']
    })
    expect(formatPatchLogMessage(JSON.stringify(record))).toBe(
      '补丁扫描执行成功，扫描机器数量为1，扫描软件包数量为465，扫描存在漏洞数量为101，ETL处理耗时为6s'
    )
    expect(record.scan_failed_count).toBe(99)
    expect(record.scan_failed_hosts).toEqual(['original-host'])
    expect(
      formatPatchLogMessage(
        JSON.stringify({ ...record, scan_packages: 1421, scan_patch: 91, scan_time: 0 })
      )
    ).toBe(
      '补丁扫描执行成功，扫描机器数量为1，扫描软件包数量为1421，扫描存在漏洞数量为91，ETL处理耗时为0s'
    )
  })

  it('预检查消息只描述执行结果，不推断是否允许继续安装', () => {
    expect(
      formatPatchLogMessage('{"msg_id":"app_secops.log.pre_check_success","msg_info":""}')
    ).toBe('预检查执行成功')
  })

  it('回滚任务失败展示原始说明，缺失说明时仍有结果名称', () => {
    const msg_info = 'Windows补丁回滚失败：存在未成功卸载的补丁或结果解析异常，详见审计日志'
    expect(
      formatPatchLogMessage(
        JSON.stringify({ msg_id: 'app_secops.log.exec_rollback_task_fail', msg_info })
      )
    ).toBe(msg_info)
    expect(formatPatchLogMessage('{"msg_id":"app_secops.log.exec_rollback_task_fail"}')).toBe(
      '补丁回滚任务失败'
    )
  })

  it('先解析 JSON，不因说明包含表达式而直接显示整段 JSON', () => {
    expect(
      formatPatchLogMessage(
        '{"msg_id":"app_vap.log.exec_install_fail","msg_info":"原始说明 #{custom.key}"}'
      )
    ).toBe('执行补丁安装出现错误，原因是原始说明 #{custom.key}')
  })

  it('预检查不满足时保留原阻断结论，不将任务执行成功当作允许安装', () => {
    const msg_info =
      '预检查结论：不满足（存在阻断项，已阻断安装）。主机阻断项：主机连通性（SSH 不可达）。'
    const record = Object.freeze({ msg_id: 'app_secops.log.pre_check_not_satisfied', msg_info })
    expect(formatPatchLogMessage(JSON.stringify(record))).toBe(msg_info)
    expect(
      formatPatchLogMessage('{"msg_id":"app_secops.log.pre_check_not_satisfied","msg_info":" "}')
    ).toBe('预检查不满足安装条件')
  })

  it('区分实测重启、回滚任务与既有回退成功消息', () => {
    expect(formatPatchLogMessage('{"msg_id":"app_secops.log.restart_success","msg_info":""}')).toBe(
      '重启执行成功'
    )
    expect(
      formatPatchLogMessage(
        '{"msg_id":"app_secops.log.rollback_task_success","msg_info":"Windows补丁回滚执行完成"}'
      )
    ).toBe('Windows补丁回滚执行完成')
    expect(
      formatPatchLogMessage('{"msg_id":"app_secops.log.rollback_task_success","msg_info":null}')
    ).toBe('补丁回滚执行完成')
  })

  it('安装执行失败使用既有模板并完整保留内嵌原始输出', () => {
    const msg_info = JSON.stringify({
      plays: [
        {
          play: { name: 'Sjxy Vul and Patch' },
          tasks: [{ hosts: [{ unreachable: true, msg: 'No route to host' }] }]
        }
      ]
    })
    expect(
      formatPatchLogMessage(
        JSON.stringify({ msg_id: 'app_secops.log.exec_install_fail', msg_info })
      )
    ).toBe(`执行补丁安装出现错误，原因是${msg_info}`)
  })

  it('保留普通文本、无消息 ID 的 JSON、损坏内容和未知键的既有回退', () => {
    for (const text of [
      '用户自定义结果',
      '{invalid',
      '{"message":"原始记录"}',
      '{"msg_id":"","msg_info":"原始记录"}',
      'null',
      '42',
      'exec_script_fail'
    ]) {
      expect(formatPatchLogMessage(text)).toBe(text)
    }
    expect(formatPatchLogMessage('{"msg_id":"custom.log.exec_script_fail"}')).toBe(
      'exec_script_fail'
    )
    expect(formatPatchLogMessage('{"msg_id":"app_secops.log.unconfirmed_key"}')).toBe(
      'unconfirmed_key'
    )
  })
})
