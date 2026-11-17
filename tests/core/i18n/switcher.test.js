import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher.vue'
import { currentLocale, setLocale, t } from '@/core/i18n'
import { LOCALE_STORAGE_KEY } from '@/core/i18n/locales'

afterEach(async () => {
  await setLocale('zh-CN', { persist: false })
  localStorage.removeItem(LOCALE_STORAGE_KEY)
})

describe('language switch control', () => {
  it('provides only enabled choices and keeps unsaved parent input while switching', async () => {
    const Parent = defineComponent({
      components: { LanguageSwitcher },
      setup: () => ({ draft: ref('尚未保存的输入'), t }),
      template:
        '<main><input v-model="draft" /><LanguageSwitcher /><p>{{ t("common.profile") }}</p></main>'
    })
    const wrapper = mount(Parent)
    expect(wrapper.findAll('option').map(option => option.text())).toEqual(['中', 'EN'])
    expect(wrapper.findAll('option').map(option => option.attributes('aria-label'))).toEqual(['简体中文', 'English'])
    await wrapper.find('select').setValue('en-US')
    await vi.waitFor(() => expect(currentLocale.value).toBe('en-US'))
    await flushPromises()
    expect(currentLocale.value).toBe('en-US')
    expect(wrapper.find('p').text()).toBe('Profile')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en-US')
    expect(document.documentElement.lang).toBe('en-US')
    await wrapper.find('select').setValue('zh-CN')
    await vi.waitFor(() => expect(currentLocale.value).toBe('zh-CN'))
    await flushPromises()
    expect(wrapper.find('p').text()).toBe('个人资料')
    expect(wrapper.find('input').element.value).toBe('尚未保存的输入')
    wrapper.unmount()
  })
})
