import { afterEach, describe, expect, it } from 'vitest'
import { i18n, setLocale, t } from '@/core/i18n'
import { message, messageRef } from '@/core/i18n/feedback'
import { getViewTitle, localizeNavItem } from '@/core/i18n/navigation'
import { flattenTranslations } from '@/core/i18n/legacy-resources'
import zhCN from '@/locales/zh-CN'
import enUS from '@/locales/en-US'

afterEach(() => setLocale('zh-CN', { persist: false }))
describe('local messages and navigation', () => {
  it('keeps active resource key sets and interpolation parameters identical', () => {
    const base = flattenTranslations(zhCN)
    for (const data of [enUS]) {
      const other = flattenTranslations(data)
      expect(Object.keys(other).sort()).toEqual(Object.keys(base).sort())
      for (const key of Object.keys(base)) {
        const params = value => [...new Set([...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]))].sort()
        expect(params(other[key]), key).toEqual(params(base[key]))
      }
    }
  })
  it('updates long-lived local feedback but preserves raw backend messages', async () => {
    const feedback = messageRef(message('auth.required'))
    expect(feedback.value).toBe('请输入用户名和密码')
    await setLocale('en-US')
    expect(feedback.value).toBe('Enter your username and password')
    feedback.value = '后端原始中文 #{key} {{value}}'
    await setLocale('zh-CN')
    expect(feedback.value).toBe('后端原始中文 #{key} {{value}}')
  })
  it('translates a persisted route title and preserves dynamic titles', async () => {
    const meta = { title: '用户列表', titleKey: 'navigation.pages.users.users' }
    const stored = { title: '用户列表', meta }
    await setLocale('en-US')
    expect(getViewTitle(stored)).toBe('User list')
    expect(getViewTitle({ ...stored, title: '客户自定义标题' })).toBe('客户自定义标题')
    const router = { resolve: () => ({ meta }) }
    expect(getViewTitle({ path: '/users/users', title: '用户列表' }, router)).toBe('User list')
    await setLocale('zh-CN')
    expect(getViewTitle(stored)).toBe('用户列表')
  })
  it('preserves ambiguous historical cache labels rather than overwriting possible custom titles', async () => {
    const meta = { title: '用户列表', titleKey: 'navigation.pages.users.users' }
    const router = { resolve: () => ({ meta }) }
    const cached = { path: '/users/users', title: '旧版主机用户页面' }
    await setLocale('en-US', { persist: false })
    expect(getViewTitle(cached, router)).toBe('旧版主机用户页面')
    expect(getViewTitle({ ...cached, meta }, router)).toBe('旧版主机用户页面')
    const oldMeta = { title: cached.title, titleKey: meta.titleKey }
    expect(getViewTitle({ ...cached, meta: oldMeta }, router)).toBe('User list')
    await setLocale('zh-CN', { persist: false })
    expect(getViewTitle(cached, router)).toBe('旧版主机用户页面')
    expect(cached.title).toBe('旧版主机用户页面')
  })
  it.each([
    ['navigation.pages.acm.model', '模型定义', '资产类型', 'Asset types'],
    ['navigation.pages.cac.structuralDiagram', '架构图', '业务拓扑分析', 'Business topology']
  ])('translates the recognized historical caption for %s without changing stored data or Chinese presentation', async (titleKey, oldTitle, title, expected) => {
    const cached = { path: '/fixture', fullPath: '/fixture?raw=1', title: oldTitle, meta: { title: oldTitle } }
    const original = JSON.stringify(cached)
    const router = { resolve: () => ({ meta: { title, titleKey } }) }
    expect(getViewTitle(cached, router)).toBe(oldTitle)
    await setLocale('en-US', { persist: false })
    expect(getViewTitle(cached, router)).toBe(expected)
    expect(getViewTitle({ ...cached, title: '客户自定义标题' }, router)).toBe('客户自定义标题')
    expect(getViewTitle(cached, { resolve: () => ({ meta: { title: '其他页面', titleKey: 'navigation.pages.users.users' } }) })).toBe(oldTitle)
    expect(JSON.stringify(cached)).toBe(original)
    await setLocale('zh-CN', { persist: false })
    expect(getViewTitle(cached, router)).toBe(oldTitle)
  })
  it('translates only the known cached caption of a removed branch page without adding a route', async () => {
    const view = { path: '/patches/urgencyDashboard', title: '紧急度评估' }
    const router = { resolve: () => ({ meta: {} }) }
    await setLocale('en-US', { persist: false })
    expect(getViewTitle(view, router)).toBe('Urgency assessment')
    expect(getViewTitle({ ...view, title: '自定义评估标题' }, router)).toBe('自定义评估标题')
    expect(getViewTitle({ ...view, path: '/another-page' }, router)).toBe('紧急度评估')
    await setLocale('zh-CN', { persist: false })
    expect(getViewTitle(view, router)).toBe('紧急度评估')
  })
  it('translates nested cross-module navigation without changing routes, codes or source objects', async () => {
    const item = {
      key: 'yumRepoManage',
      label: 'Yum仓库',
      children: [
        { key: 'repos', label: '配置下发', path: '/yum-repo/repos', accessCode: 'yum-repo' }
      ]
    }
    await setLocale('en-US')
    const localized = localizeNavItem(item)
    expect(localized.label).toBe('Yum repositories')
    expect(localized.children[0]).toMatchObject({
      path: '/yum-repo/repos',
      accessCode: 'yum-repo',
      label: 'Configuration deployment'
    })
    expect(item.children[0].label).toBe('配置下发')
  })
  it('selects the English singular and plural forms from named count parameters', async () => {
    await setLocale('en-US', { persist: false })
    expect(t('automation.approval.durationHours', { count: 1 })).toBe('1 hour')
    expect(t('automation.approval.durationHours', { count: 2 })).toBe('2 hours')
    expect(t('selection.selectedCount', { count: 1 })).toBe('1 item selected')
    expect(t('selection.selectedCount', { count: 0 })).toBe('0 items selected')
    await setLocale('zh-CN', { persist: false })
    expect(t('automation.approval.durationHours', { count: 1 })).toBe('1 小时')
  })
  it('supports nested and dotted legacy keys and explicit Simplified Chinese fallback', async () => {
    expect(
      flattenTranslations({ app: { 'page.title': '标题', child: { label: '名称' } } })
    ).toEqual({ 'app.page.title': '标题', 'app.child.label': '名称' })
    i18n.global.mergeLocaleMessage('zh-CN', { fallbackTest: '简体回退' })
    await setLocale('en-US')
    expect(t('fallbackTest')).toBe('简体回退')
    expect(t('missing.key', {}, 'safe fallback')).toBe('safe fallback')
  })
})
