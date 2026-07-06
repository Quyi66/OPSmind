/**
 * 从 Vue 组件对象中解析组件名称
 * 用于 keep-alive 的 include 匹配
 *
 * 注意：对于通过 () => import(...) 懒加载的路由组件，
 * 只有在组件被首次导航后（Vue Router 已解析并缓存组件），
 * 才能正确获取组件名称。对于未加载的异步组件，返回空字符串。
 *
 * @param {object|Function} component - Vue 组件对象或异步组件 wrapper
 * @returns {string} 组件名称
 */
export function resolveComponentName(component) {
  const normalizedComponent = component?.__vccOpts || component?.default || component

  if (typeof normalizedComponent === 'function') {
    return normalizedComponent.displayName || normalizedComponent.name || ''
  }

  return normalizedComponent?.name || normalizedComponent?.__name || ''
}

/**
 * 根据缓存的路由名称列表，解析对应的组件名称集合
 * 用于 keep-alive 的 :include 属性
 *
 * @param {import('vue-router').Router} router - Vue Router 实例
 * @param {string[]} cachedRouteNames - 需要缓存的路由 name 列表
 * @returns {string[]} 组件名称数组
 */
export function buildKeepAliveIncludes(router, cachedRouteNames) {
  const includes = new Set()

  cachedRouteNames.forEach(routeName => {
    const matchedRoute = router.getRoutes().find(item => item.name === routeName)
    const component = matchedRoute?.components?.default || matchedRoute?.component
    const componentName = resolveComponentName(component)

    if (componentName) {
      includes.add(componentName)
    }
  })

  return Array.from(includes)
}
