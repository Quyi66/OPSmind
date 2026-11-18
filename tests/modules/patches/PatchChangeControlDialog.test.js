import ElementPlus, { ElCheckbox, ElDatePicker, ElInput, ElSelectV2, ElTimePicker } from 'element-plus'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { t } from '@/core/i18n'
import { patchChangeControlApi } from '@/modules/patches/api'
import PatchChangeControlDialog from '@/modules/patches/components/change-control/PatchChangeControlDialog.vue'

vi.mock('@/modules/patches/api', () => ({
  patchChangeControlApi: {
    getConfig: vi.fn(),
    saveConfig: vi.fn()
  }
}))

describe('PatchChangeControlDialog', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', function () {
      return { observe: vi.fn(), disconnect: vi.fn() }
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('selects the evaluation time zone and preserves all supported window time formats', async () => {
    const dateRange = {
      type: 'DATE_RANGE',
      startTime: '2026-12-01 20:00',
      endTime: '2026-12-02 06:00:25'
    }
    const config = {
      windowEnabled: true,
      timezone: 'GMT+08:00',
      offHoursPolicy: 'CONFIRM',
      approvalRequired: true,
      workHours: { days: [1, 2, 3, 4, 5], start: '09:00', end: '18:00' },
      windows: [{ type: 'WEEKLY', days: [6], start: '22:00', end: '24:00' }, dateRange]
    }
    patchChangeControlApi.getConfig.mockResolvedValue({ data: config })
    patchChangeControlApi.saveConfig.mockResolvedValue({})
    const wrapper = mount(PatchChangeControlDialog, {
      props: { modelValue: true, isAdmin: true },
      global: {
        plugins: [ElementPlus],
        stubs: {
          teleport: true,
          'el-dialog': { template: '<section><slot /><slot name="footer" /></section>' },
          'el-form': { template: '<div><slot /></div>' },
          'el-form-item': { template: '<div><slot /></div>' },
          'el-button': { template: '<button type="button"><slot /></button>' },
          'el-select': true,
          ElSelectV2: true,
          'el-switch': true
        }
      }
    })

    try {
      await flushPromises()
      const timezone = wrapper.getComponent(ElSelectV2)
      expect(timezone.props()).toMatchObject({ modelValue: 'GMT+08:00', filterable: true, allowCreate: false })
      expect(timezone.props('options')).toEqual(expect.arrayContaining([
        { value: 'Asia/Shanghai', label: 'Asia/Shanghai' },
        { value: 'Asia/Hong_Kong', label: 'Asia/Hong_Kong' },
        { value: 'GMT+08:00', label: 'GMT+08:00' }
      ]))
      timezone.vm.$emit('update:modelValue', 'Asia/Hong_Kong')

      const times = wrapper.findAllComponents(ElTimePicker)
      expect(times.map(picker => picker.props('valueFormat'))).toEqual(Array(4).fill('HH:mm'))
      expect(times.every(picker => !picker.props('editable'))).toBe(true)
      expect(times.slice(0, 3).map(picker => picker.getComponent(ElInput).props('modelValue')))
        .toEqual(['09:00', '18:00', '22:00'])
      expect(times[3].props()).toMatchObject({ disabled: true, placeholder: '24:00' })

      const [endOfWorkDay, endOfWindowDay] = wrapper.findAllComponents(ElCheckbox)
        .filter(checkbox => checkbox.text() === t('patches.changeControl.endOfDay'))
      await endOfWorkDay.get('input').setValue(true)
      await endOfWindowDay.get('input').setValue(false)
      expect(times[3].props('disabled')).toBe(false)
      times[3].vm.$emit('update:modelValue', '06:00')

      const dates = wrapper.findAllComponents(ElDatePicker)
      expect(dates.map(picker => picker.props('valueFormat')))
        .toEqual(['YYYY-MM-DD HH:mm', 'YYYY-MM-DD HH:mm:ss'])
      expect(dates.every(picker => !picker.props('editable'))).toBe(true)
      dates[0].vm.$emit('update:modelValue', '2026-12-01 21:30')

      await wrapper.findAll('button').find(button => button.text() === t('common.save')).trigger('click')
      expect(patchChangeControlApi.saveConfig).toHaveBeenCalledExactlyOnceWith({
        ...config,
        timezone: 'Asia/Hong_Kong',
        workHours: { ...config.workHours, end: '24:00' },
        windows: [
          { type: 'WEEKLY', days: [6], start: '22:00', end: '06:00' },
          { ...dateRange, startTime: '2026-12-01 21:30' }
        ]
      })
      await flushPromises()
    } finally {
      wrapper.unmount()
    }
  })
})
