import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  FeatureFlagEvaluator,
  FLAG_TYPES,
  USER_GROUPS,
  checkUserGroup,
  checkPercentage,
  checkTimeWindow
} from '@/config/feature-flags.config.js'

describe('Feature Flags', () => {
  describe('FeatureFlagEvaluator', () => {
    let evaluator
    let mockUser

    beforeEach(() => {
      mockUser = {
        id: 'user123',
        login: 'testuser',
        groups: [USER_GROUPS.REGULAR_USER]
      }
      evaluator = new FeatureFlagEvaluator(mockUser)
    })

    describe('Boolean flags', () => {
      it('should return true for enabled boolean flags', () => {
        const result = evaluator.isEnabled('migration.dashboard_vue')
        expect(result).toBe(true)
      })

      it('should return false for disabled boolean flags', () => {
        const result = evaluator.isEnabled('migration.jao_vue_workflow')
        expect(result).toBe(false)
      })
    })

    describe('Percentage flags', () => {
      it('should evaluate percentage flags based on user ID', () => {
        // 测试一致性 - 同一用户应该总是得到相同结果
        const result1 = evaluator.isEnabled('migration.cac_vue_config')
        const result2 = evaluator.isEnabled('migration.cac_vue_config')
        expect(result1).toBe(result2)
      })

      it('should return false for percentage flags without user', () => {
        const evaluatorWithoutUser = new FeatureFlagEvaluator()
        const result = evaluatorWithoutUser.isEnabled('migration.cac_vue_config')
        expect(result).toBe(false)
      })

      it('should distribute users across percentage buckets', () => {
        // 测试多个用户的分布
        const users = Array.from({ length: 100 }, (_, i) => ({
          id: `user${i}`,
          groups: [USER_GROUPS.REGULAR_USER]
        }))

        const enabledCount = users.filter(user => {
          const userEvaluator = new FeatureFlagEvaluator(user)
          return userEvaluator.isEnabled('ui.new_navigation') // 50% flag
        }).length

        // 应该大致是 50%，允许一些偏差
        expect(enabledCount).toBeGreaterThan(30)
        expect(enabledCount).toBeLessThan(70)
      })
    })

    describe('User group flags', () => {
      it('should enable for users in required groups', () => {
        const adminUser = {
          id: 'admin123',
          groups: [USER_GROUPS.ADMIN]
        }
        const adminEvaluator = new FeatureFlagEvaluator(adminUser)

        const result = adminEvaluator.isEnabled('migration.cac_vue_audit')
        expect(result).toBe(true)
      })

      it('should disable for users not in required groups', () => {
        const result = evaluator.isEnabled('migration.cac_vue_audit')
        expect(result).toBe(false)
      })

      it('should enable for users in any of the required groups', () => {
        const developerUser = {
          id: 'dev123',
          groups: [USER_GROUPS.DEVELOPER]
        }
        const devEvaluator = new FeatureFlagEvaluator(developerUser)

        const result = devEvaluator.isEnabled('migration.cac_vue_audit')
        expect(result).toBe(true)
      })

      it('should return false for user group flags without user', () => {
        const evaluatorWithoutUser = new FeatureFlagEvaluator()
        const result = evaluatorWithoutUser.isEnabled('migration.cac_vue_audit')
        expect(result).toBe(false)
      })
    })

    describe('Batch evaluation', () => {
      it('should evaluate multiple flags at once', () => {
        const flags = ['migration.dashboard_vue', 'migration.cac_vue_config', 'ui.dark_mode']

        const results = evaluator.getEnabledFlags(flags)

        expect(Object.keys(results)).toEqual(flags)
        expect(typeof results['migration.dashboard_vue']).toBe('boolean')
        expect(typeof results['migration.cac_vue_config']).toBe('boolean')
        expect(typeof results['ui.dark_mode']).toBe('boolean')
      })

      it('should get module-specific flags', () => {
        const moduleFlags = evaluator.getModuleFlags('migration')

        expect(Object.keys(moduleFlags).length).toBeGreaterThan(0)
        Object.keys(moduleFlags).forEach(key => {
          expect(key).toMatch(/^migration\./)
        })
      })

      it('should get migration flags', () => {
        const migrationFlags = evaluator.getMigrationFlags()

        expect(Object.keys(migrationFlags).length).toBeGreaterThan(0)
        Object.keys(migrationFlags).forEach(key => {
          expect(key).toMatch(/^migration\./)
        })
      })
    })

    describe('Vue version checking', () => {
      it('should check if should use Vue version for module', () => {
        const result = evaluator.shouldUseVueVersion('dashboard')
        expect(typeof result).toBe('boolean')
      })

      it('should check if should use Vue version for module feature', () => {
        const result = evaluator.shouldUseVueVersion('cac', 'config')
        expect(typeof result).toBe('boolean')
      })
    })

    describe('Statistics', () => {
      it('should generate flag statistics', () => {
        const stats = evaluator.getStats()

        expect(stats.total).toBeGreaterThan(0)
        expect(stats.enabled).toBeGreaterThanOrEqual(0)
        expect(stats.enabled).toBeLessThanOrEqual(stats.total)
        expect(stats.byType).toBeDefined()
        expect(stats.byModule).toBeDefined()
      })
    })

    describe('Error handling', () => {
      it('should handle unknown flags gracefully', () => {
        const result = evaluator.isEnabled('unknown.flag')
        expect(result).toBe(false)
      })

      it('should handle disabled flags', () => {
        const result = evaluator.isEnabled('experimental.pwa_support')
        expect(result).toBe(false)
      })
    })
  })

  describe('Helper functions', () => {
    describe('checkUserGroup', () => {
      it('should return true if user has required group', () => {
        const user = { groups: [USER_GROUPS.ADMIN, USER_GROUPS.DEVELOPER] }
        const result = checkUserGroup(user, [USER_GROUPS.ADMIN])
        expect(result).toBe(true)
      })

      it('should return false if user does not have required group', () => {
        const user = { groups: [USER_GROUPS.REGULAR_USER] }
        const result = checkUserGroup(user, [USER_GROUPS.ADMIN])
        expect(result).toBe(false)
      })

      it('should return false for user without groups', () => {
        const user = {}
        const result = checkUserGroup(user, [USER_GROUPS.ADMIN])
        expect(result).toBe(false)
      })
    })

    describe('checkPercentage', () => {
      it('should return consistent results for same user', () => {
        const userId = 'test123'
        const percentage = 50

        const result1 = checkPercentage(userId, percentage)
        const result2 = checkPercentage(userId, percentage)

        expect(result1).toBe(result2)
      })

      it('should return false for empty user ID', () => {
        const result = checkPercentage('', 50)
        expect(result).toBe(false)
      })

      it('should return false for null user ID', () => {
        const result = checkPercentage(null, 50)
        expect(result).toBe(false)
      })
    })

    describe('checkTimeWindow', () => {
      beforeEach(() => {
        vi.useFakeTimers()
      })

      afterEach(() => {
        vi.useRealTimers()
      })

      it('should return true when current time is within window', () => {
        const now = new Date('2024-03-02T12:00:00Z')
        vi.setSystemTime(now)

        const windowConfig = {
          start: '2024-03-01T18:00:00Z',
          end: '2024-03-03T06:00:00Z'
        }

        const result = checkTimeWindow(windowConfig)
        expect(result).toBe(true)
      })

      it('should return false when current time is before window', () => {
        const now = new Date('2024-02-28T12:00:00Z')
        vi.setSystemTime(now)

        const windowConfig = {
          start: '2024-03-01T18:00:00Z',
          end: '2024-03-03T06:00:00Z'
        }

        const result = checkTimeWindow(windowConfig)
        expect(result).toBe(false)
      })

      it('should return false when current time is after window', () => {
        const now = new Date('2024-03-04T12:00:00Z')
        vi.setSystemTime(now)

        const windowConfig = {
          start: '2024-03-01T18:00:00Z',
          end: '2024-03-03T06:00:00Z'
        }

        const result = checkTimeWindow(windowConfig)
        expect(result).toBe(false)
      })
    })
  })
})
