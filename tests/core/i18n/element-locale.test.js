import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import ConfigProvider from 'element-plus/es/components/config-provider/src/config-provider.mjs'
import { useGlobalConfig } from 'element-plus/es/components/config-provider/src/hooks/use-global-config.mjs'
import dayjs from 'dayjs'
import { elementLocale } from '@/core/i18n/element-locale'
import { setLocale } from '@/core/i18n'

afterEach(() => setLocale('zh-CN', { persist: false }))

describe('component and date locale integration', () => {
  it('keeps component and imperative-service defaults in sync with enabled languages', async () => {
    const Root = defineComponent({
      setup: () => () =>
        h(ConfigProvider, { locale: elementLocale.value }, { default: () => h('div') })
    })
    const wrapper = mount(Root)
    const globalLocale = useGlobalConfig('locale')
    for (const [locale, name, confirm] of [
      ['zh-CN', 'zh-cn', '确定'],
      ['en-US', 'en', 'OK']
    ]) {
      await setLocale(locale, { persist: false })
      await nextTick()
      expect(elementLocale.value.name).toBe(name)
      expect(globalLocale.value.el.messagebox.confirm).toBe(confirm)
      expect(dayjs.locale()).toBe(name)
    }
    wrapper.unmount()
  })
})
