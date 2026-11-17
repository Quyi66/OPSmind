import { currentLocale, t } from './index'

// Recognized former static captions only; never translate arbitrary business titles.
const historicalRouteTitles = {
  'navigation.pages.acm.model': ['模型定义'],
  'navigation.pages.cac.structuralDiagram': ['架构图']
}

export function localizeNavItem(item) {
  const parts = String(item.path || '')
    .split('/')
    .filter(Boolean)
  const pageKey = parts.length >= 2 ? `${parts[0]}.${parts[1]}` : null
  const labelKey =
    item.labelKey ||
    (pageKey ? `navigation.navOverrides.${pageKey}` : `navigation.extras.${item.key}`)
  const fallback = pageKey ? t(`navigation.pages.${pageKey}`, {}, item.label) : item.label
  return {
    ...item,
    labelKey,
    label: t(labelKey, {}, fallback),
    ...(item.children ? { children: item.children.map(localizeNavItem) } : {})
  }
}

export function getViewTitle(view, router) {
  const raw = view?.title || view?.meta?.title || ''
  const current =
    router && (view?.fullPath || view?.path)
      ? router.resolve(view.fullPath || view.path)
      : undefined
  const routeKey = current?.meta?.titleKey
  // A former branch exposed this page. Translate its cached tab only; do not
  // register or reactivate the removed feature.
  if (
    currentLocale.value === 'en-US' &&
    !routeKey &&
    view?.path === '/patches/urgencyDashboard' &&
    raw === '紧急度评估'
  ) {
    return t('navigation.historical.urgencyAssessment', {}, raw)
  }
  if (
    currentLocale.value === 'en-US' &&
    routeKey &&
    historicalRouteTitles[routeKey]?.includes(raw)
  ) {
    return t(routeKey, view?.titleParams || {}, raw)
  }
  // Preserve user-supplied and backend titles instead of replacing them with a static route label.
  // Old cached labels without matching metadata are ambiguous and keep their original text too.
  if (view?.title && view?.meta?.title && view.title !== view.meta.title) return view.title
  const key = view?.titleKey || view?.meta?.titleKey
  if (key) return t(key, view?.titleParams || {}, raw)
  if (router && (view?.fullPath || view?.path)) {
    if (current.meta.titleKey && (!raw || raw === current.meta.title)) {
      return t(current.meta.titleKey, {}, raw)
    }
  }
  return raw
}
