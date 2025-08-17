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
      
      console.log(`🧭 Navigating to module: ${cleanModuleCode}`)
      
      // 检查当前路由，避免重复导航
      if (router.currentRoute.value.path === `/module/${cleanModuleCode}`) {
        console.log('⚠️ Already on target route, skipping navigation')
        return true
      }
      
      // 使用 Vue Router 进行导航
      await router.push({
        name: 'module',
        params: { moduleCode: cleanModuleCode }
      })
      
      console.log(`✅ Successfully navigated to module: ${cleanModuleCode}`)
      return true
      
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
    
    if (currentRoute.name !== 'module') {
      return false
    }
    
    if (moduleCode) {
      return currentRoute.params.moduleCode === moduleCode
    }
    
    return true
  }

  /**
   * 获取当前模块代码
   */
  const getCurrentModuleCode = (): string | null => {
    const currentRoute = router.currentRoute.value
    
    if (currentRoute.name === 'module') {
      return currentRoute.params.moduleCode as string
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
