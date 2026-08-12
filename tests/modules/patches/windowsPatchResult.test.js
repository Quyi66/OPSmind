import { describe, expect, it } from 'vitest'
import {
  getWindowsPatchResultMeta,
  isPatchRollbackable,
  isRollbackSelectable
} from '@/modules/patches/windows-patch/utils'

describe('getWindowsPatchResultMeta', () => {
  it('keeps old backend records unobtrusive', () => {
    expect(getWindowsPatchResultMeta({ status: 'SUCCESS' })).toEqual({
      rebootRequired: null,
      uninstallable: null,
      hresult: '',
      resultCode: '',
      errorDescription: '',
      hasData: false
    })
  })

  it('normalizes Agent/WUA result fields from camelCase and snake_case records', () => {
    expect(getWindowsPatchResultMeta({
      reboot_required: 1,
      uninstallable: false,
      hresult: 0x80240034,
      result_code: 'FAILED'
    })).toEqual({
      rebootRequired: true,
      uninstallable: false,
      hresult: '0x80240034',
      resultCode: 'FAILED',
      errorDescription: 'Windows Update 下载更新失败',
      hasData: true
    })
  })

  it('reads nested WUA result payloads', () => {
    expect(getWindowsPatchResultMeta({
      wuaResult: {
        rebootRequired: 'false',
        isUninstallable: 'true',
        hResult: '0x00000000'
      }
    })).toMatchObject({
      rebootRequired: false,
      uninstallable: true,
      hresult: '0x00000000',
      hasData: true
    })
  })

  it('blocks rollback when WUA explicitly marks the update as non-uninstallable', () => {
    const patch = { patchStatus: 'INSTALLED', uninstallable: false }
    const history = {
      action: 'INSTALL',
      result: 'SUCCESS',
      uninstallable: false
    }

    expect(isPatchRollbackable(patch)).toBe(false)
    expect(isRollbackSelectable(history)).toBe(false)
  })
})
