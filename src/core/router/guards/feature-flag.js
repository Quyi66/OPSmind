/**
 * 功能开关路由守卫
 */

import { FeatureFlagEvaluator } from '@/config/feature-flags.config.js'
import { authService } from '@/core/auth'

export function setupFeatureFlagGuard(router) {
  router.beforeEach(async (to, from, next) => {
    // 检查功能开关
    if (to.meta.featureFlag) {
      const currentUser = authService.getCurrentUser()
      const evaluator = new FeatureFlagEvaluator(currentUser)

      const isEnabled = evaluator.isEnabled(to.meta.featureFlag)

      if (!isEnabled) {
        // 重定向到首页或显示功能不可用页面
        next('/home')
        return
      }
    }

    // 检查模块迁移功能开关
    if (to.meta.moduleCode && to.meta.feature) {
      const currentUser = authService.getCurrentUser()
      const evaluator = new FeatureFlagEvaluator(currentUser)

      const shouldUseVue = evaluator.shouldUseVueVersion(to.meta.moduleCode, to.meta.feature)

      if (shouldUseVue && to.meta.vueComponent) {
        // 重定向到 Vue 版本
        // 这里可以动态修改组件或重定向到 Vue 路由
      }
    }

    next()
  })
}
