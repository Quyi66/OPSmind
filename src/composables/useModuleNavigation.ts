/**
 * 模块导航 Composable
 * 提供安全的模块导航功能
 */

import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

export function useModuleNavigation() {
  const router = useRouter()

  /**
   * 导航到指定模块
   */
  const navigateToModule = async (moduleCode: string): Promise<boolean> => {
    try {
      // 清理模块代码
      const cleanModuleCode = moduleCode.replace(/^__/, '')


      // 检查当前路由，避免重复导航
      const currentPath = router.currentRoute.value.path
      if (currentPath === `/${cleanModuleCode}` || currentPath === `/module/${cleanModuleCode}`) {
        return true
      }

      // 尝试多种路由方式进行导航
      try {
        // 首先尝试使用具体的模块路由 (如 cac-main)
        await router.push({
          name: `${cleanModuleCode}-main`
        })
        return true
      } catch (specificRouteError) {

        // 如果具体路由不存在，尝试使用通用模块路由
        try {
          await router.push({
            name: 'module',
            params: { moduleCode: cleanModuleCode }
          })
          return true
        } catch (genericRouteError) {

          // 最后尝试直接路径导航
          await router.push(`/${cleanModuleCode}`)
          return true
        }
      }

    } catch (error) {
      console.error('❌ Navigation failed:', error)

      // 显示错误提示
      ElMessage.error(`无法打开模块: ${moduleCode}`)

      return false
    }
  }

  /**
   * 返回首页
   */
  const navigateToHome = async (): Promise<boolean> => {
    try {
      await router.push({ name: 'home' })
      return true
    } catch (error) {
      console.error('❌ Failed to navigate to home:', error)
      return false
    }
  }

  /**
   * 检查是否在模块页面
   */
  const isOnModulePage = (moduleCode?: string): boolean => {
    const currentRoute = router.currentRoute.value
    const routeName = currentRoute.name as string

    // 检查是否是通用模块路由
    if (routeName === 'module') {
      if (moduleCode) {
        return currentRoute.params.moduleCode === moduleCode
      }
      return true
    }

    // 检查是否是具体模块路由 (如 cac-main, jao-main 等)
    if (routeName && routeName.endsWith('-main')) {
      const currentModuleCode = routeName.replace('-main', '')
      if (moduleCode) {
        return currentModuleCode === moduleCode
      }
      return true
    }

    // 检查是否是子路由 (如 cac-sub, jao-sub 等)
    if (routeName && routeName.endsWith('-sub')) {
      const currentModuleCode = routeName.replace('-sub', '')
      if (moduleCode) {
        return currentModuleCode === moduleCode
      }
      return true
    }

    return false
  }

  /**
   * 获取当前模块代码
   */
  const getCurrentModuleCode = (): string | null => {
    const currentRoute = router.currentRoute.value
    const routeName = currentRoute.name as string

    // 通用模块路由
    if (routeName === 'module') {
      return currentRoute.params.moduleCode as string
    }

    // 具体模块路由 (如 cac-main, jao-main 等)
    if (routeName && routeName.endsWith('-main')) {
      return routeName.replace('-main', '')
    }

    // 子路由 (如 cac-sub, jao-sub 等)
    if (routeName && routeName.endsWith('-sub')) {
      return routeName.replace('-sub', '')
    }

    return null
  }

  return {
    navigateToModule,
    navigateToHome,
    isOnModulePage,
    getCurrentModuleCode
  }
}
