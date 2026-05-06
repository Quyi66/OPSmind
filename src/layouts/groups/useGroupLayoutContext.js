import { computed, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export function provideCurrentGroupModuleCode(defaultModuleCode) {
  const route = useRoute()
  const currentModuleCode = computed(() => String(route.params.moduleCode || defaultModuleCode))

  provide('currentModuleCode', currentModuleCode)

  return { currentModuleCode }
}

export function provideGroupPathNavigation(defaultModuleCode, options = {}) {
  const router = useRouter()
  const { currentModuleCode } = provideCurrentGroupModuleCode(defaultModuleCode)
  const { resolveNavigationTarget } = options

  const handleNavigate = ({ view, moduleCode, params = {} }) => {
    if (!view) return

    const target = resolveNavigationTarget?.({
      view,
      moduleCode,
      params,
      currentModuleCode: currentModuleCode.value
    })

    if (target) {
      router.push(target)
      return
    }

    router.push({
      path: `/${moduleCode || currentModuleCode.value}/${view}`,
      query: params
    })
  }

  provide('handleNavigate', handleNavigate)

  return { currentModuleCode, handleNavigate }
}
