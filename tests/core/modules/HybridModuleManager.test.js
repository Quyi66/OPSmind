import { describe, it, expect, beforeEach, vi } from 'vitest'
import { hybridModuleManager, MODULE_TYPES, MODULE_STATUS } from '@/core/modules/HybridModuleManager.js'

// 模拟 Angular 模块配置
vi.mock('@/config/angular-modules.config.js', () => ({
  ANGULAR_MODULES_CONFIG: {
    cac: {
      code: 'cac',
      name: 'CAC 配置管理',
      features: ['配置检查', '合规审计', '模板管理']
    },
    jao: {
      code: 'jao',
      name: 'JAO 作业编排',
      features: ['作业定义', '流程编排', '执行监控']
    }
  }
}))

describe('Hybrid Module Manager', () => {
  beforeEach(() => {
    // 清理模块注册表
    hybridModuleManager.modules.clear()
    hybridModuleManager.migrationConfig.clear()
    hybridModuleManager.featureFlags.clear()
    
    // 重新初始化
    hybridModuleManager.initializeModules()
  })

  describe('模块注册', () => {
    it('should register Vue native module', () => {
      const moduleConfig = {
        code: 'test-vue',
        name: '测试 Vue 模块',
        type: MODULE_TYPES.VUE_NATIVE,
        component: () => import('@/views/TestView.vue'),
        features: ['功能1', '功能2']
      }

      const module = hybridModuleManager.registerVueModule(moduleConfig)

      expect(module.code).toBe('test-vue')
      expect(module.type).toBe(MODULE_TYPES.VUE_NATIVE)
      expect(module.metadata.isModern).toBe(true)
      expect(hybridModuleManager.getModule('test-vue')).toEqual(module)
    })

    it('should register Angular iframe module from config', () => {
      const cacModule = hybridModuleManager.getModule('cac')
      
      expect(cacModule).toBeDefined()
      expect(cacModule.code).toBe('cac')
      expect(cacModule.name).toBe('CAC 配置管理')
      expect(cacModule.type).toBe(MODULE_TYPES.ANGULAR_IFRAME)
      expect(cacModule.metadata.isLegacy).toBe(true)
    })

    it('should mark module as hybrid', () => {
      const migratedFeatures = ['配置检查']
      
      hybridModuleManager.markAsHybrid('cac', migratedFeatures)
      
      const cacModule = hybridModuleManager.getModule('cac')
      expect(cacModule.type).toBe(MODULE_TYPES.HYBRID)
      expect(cacModule.metadata.migratedFeatures).toEqual(migratedFeatures)
      expect(cacModule.metadata.remainingFeatures).toEqual(['合规审计', '模板管理'])
    })
  })

  describe('功能开关', () => {
    it('should set and check feature flags', () => {
      hybridModuleManager.setFeatureFlag('cac', 'config', true)
      hybridModuleManager.setFeatureFlag('cac', 'audit', false)

      expect(hybridModuleManager.isFeatureEnabled('cac', 'config')).toBe(true)
      expect(hybridModuleManager.isFeatureEnabled('cac', 'audit')).toBe(false)
      expect(hybridModuleManager.isFeatureEnabled('cac', 'unknown')).toBe(true) // 默认启用
    })
  })

  describe('模块查询', () => {
    it('should get modules by type', () => {
      // 注册一个 Vue 模块
      hybridModuleManager.registerVueModule({
        code: 'test-vue',
        name: '测试模块',
        component: () => import('@/views/Test.vue')
      })

      const vueModules = hybridModuleManager.getModulesByType(MODULE_TYPES.VUE_NATIVE)
      const angularModules = hybridModuleManager.getModulesByType(MODULE_TYPES.ANGULAR_IFRAME)

      expect(vueModules).toHaveLength(2) // dashboard + test-vue
      expect(angularModules).toHaveLength(2) // cac + jao
      expect(vueModules.every(m => m.type === MODULE_TYPES.VUE_NATIVE)).toBe(true)
      expect(angularModules.every(m => m.type === MODULE_TYPES.ANGULAR_IFRAME)).toBe(true)
    })

    it('should get available modules', () => {
      const availableModules = hybridModuleManager.getAvailableModules()
      
      expect(availableModules.length).toBeGreaterThan(0)
      expect(availableModules.every(m => m.status !== MODULE_STATUS.DEPRECATED)).toBe(true)
    })
  })

  describe('迁移统计', () => {
    beforeEach(() => {
      // 设置测试数据
      hybridModuleManager.registerVueModule({
        code: 'vue-module',
        name: 'Vue 模块'
      })
      
      hybridModuleManager.markAsHybrid('cac', ['配置检查'])
    })

    it('should calculate migration statistics', () => {
      const stats = hybridModuleManager.getMigrationStats()

      expect(stats.total).toBeGreaterThan(0)
      expect(stats.vue).toBeGreaterThan(0)
      expect(stats.angular).toBeGreaterThan(0)
      expect(stats.hybrid).toBeGreaterThan(0)
      expect(stats.migrationProgress).toBeDefined()
      expect(stats.migrationProgress.percentage).toBeGreaterThan(0)
    })

    it('should calculate migration progress correctly', () => {
      const progress = hybridModuleManager.calculateMigrationProgress()

      expect(progress.percentage).toBeGreaterThanOrEqual(0)
      expect(progress.percentage).toBeLessThanOrEqual(100)
      expect(progress.completed).toBeGreaterThanOrEqual(0)
      expect(progress.inProgress).toBeGreaterThanOrEqual(0)
      expect(progress.remaining).toBeGreaterThanOrEqual(0)
    })
  })

  describe('迁移优先级', () => {
    it('should return correct migration priority', () => {
      expect(hybridModuleManager.getMigrationPriority('cac')).toBe('high')
      expect(hybridModuleManager.getMigrationPriority('dashboard')).toBe('high')
      expect(hybridModuleManager.getMigrationPriority('jao')).toBe('medium')
      expect(hybridModuleManager.getMigrationPriority('unknown')).toBe('low')
    })

    it('should return estimated effort', () => {
      expect(hybridModuleManager.getEstimatedEffort('cac')).toBe('4-6周')
      expect(hybridModuleManager.getEstimatedEffort('dashboard')).toBe('2-3周')
      expect(hybridModuleManager.getEstimatedEffort('unknown')).toBe('待评估')
    })

    it('should return recommended migration path', () => {
      const path = hybridModuleManager.getRecommendedMigrationPath()

      expect(Array.isArray(path)).toBe(true)
      expect(path.length).toBeGreaterThan(0)
      
      // 应该按优先级排序
      const priorities = path.map(m => m.priority)
      const highPriorityCount = priorities.filter(p => p === 'high').length
      const mediumPriorityCount = priorities.filter(p => p === 'medium').length
      
      // 高优先级应该在前面
      if (highPriorityCount > 0 && mediumPriorityCount > 0) {
        const firstHighIndex = priorities.indexOf('high')
        const firstMediumIndex = priorities.indexOf('medium')
        expect(firstHighIndex).toBeLessThan(firstMediumIndex)
      }
    })
  })

  describe('模块元数据', () => {
    it('should store module metadata correctly', () => {
      const cacModule = hybridModuleManager.getModule('cac')
      
      expect(cacModule.metadata).toBeDefined()
      expect(cacModule.metadata.isLegacy).toBe(true)
      expect(cacModule.metadata.migrationPriority).toBe('high')
      expect(cacModule.metadata.estimatedMigrationEffort).toBe('4-6周')
    })

    it('should update metadata when marking as hybrid', () => {
      const migratedFeatures = ['配置检查', '合规审计']
      hybridModuleManager.markAsHybrid('cac', migratedFeatures)
      
      const cacModule = hybridModuleManager.getModule('cac')
      expect(cacModule.metadata.migratedFeatures).toEqual(migratedFeatures)
      expect(cacModule.metadata.remainingFeatures).toEqual(['模板管理'])
    })
  })
})
