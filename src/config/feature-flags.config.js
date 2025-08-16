/**
 * 功能开关配置
 * 支持模块迁移的灰度发布和 A/B 测试
 */

// 功能开关类型
export const FLAG_TYPES = {
  BOOLEAN: 'boolean',           // 简单开关
  PERCENTAGE: 'percentage',     // 百分比灰度
  USER_GROUP: 'user_group',     // 用户组
  TIME_WINDOW: 'time_window'    // 时间窗口
}

// 用户组定义
export const USER_GROUPS = {
  ADMIN: 'admin',               // 管理员
  DEVELOPER: 'developer',       // 开发人员
  BETA_TESTER: 'beta_tester',   // Beta 测试用户
  POWER_USER: 'power_user',     // 高级用户
  REGULAR_USER: 'regular_user'  // 普通用户
}

// 功能开关配置
export const FEATURE_FLAGS = {
  // 模块迁移相关
  'migration.dashboard_vue': {
    type: FLAG_TYPES.BOOLEAN,
    enabled: true,
    description: '启用 Vue 版本的仪表盘',
    module: 'dashboard'
  },

  'migration.cac_vue_config': {
    type: FLAG_TYPES.PERCENTAGE,
    enabled: true,
    percentage: 20, // 20% 的用户使用 Vue 版本
    description: 'CAC 模块配置管理功能的 Vue 版本',
    module: 'cac',
    feature: 'config'
  },

  'migration.cac_vue_audit': {
    type: FLAG_TYPES.USER_GROUP,
    enabled: true,
    userGroups: [USER_GROUPS.ADMIN, USER_GROUPS.DEVELOPER],
    description: 'CAC 模块审计功能的 Vue 版本',
    module: 'cac',
    feature: 'audit'
  },

  'migration.jao_vue_workflow': {
    type: FLAG_TYPES.BOOLEAN,
    enabled: false,
    description: 'JAO 模块工作流功能的 Vue 版本',
    module: 'jao',
    feature: 'workflow'
  },

  // UI/UX 改进
  'ui.new_navigation': {
    type: FLAG_TYPES.PERCENTAGE,
    enabled: true,
    percentage: 50,
    description: '新版导航界面',
    module: 'layout'
  },

  'ui.dark_mode': {
    type: FLAG_TYPES.BOOLEAN,
    enabled: true,
    description: '暗色主题模式',
    module: 'theme'
  },

  'ui.mobile_responsive': {
    type: FLAG_TYPES.BOOLEAN,
    enabled: true,
    description: '移动端响应式布局',
    module: 'layout'
  },

  // 性能优化
  'performance.lazy_loading': {
    type: FLAG_TYPES.BOOLEAN,
    enabled: true,
    description: '模块懒加载',
    module: 'core'
  },

  'performance.virtual_scroll': {
    type: FLAG_TYPES.USER_GROUP,
    enabled: true,
    userGroups: [USER_GROUPS.POWER_USER, USER_GROUPS.ADMIN],
    description: '虚拟滚动优化',
    module: 'table'
  },

  // 开发和调试
  'debug.migration_tracker': {
    type: FLAG_TYPES.USER_GROUP,
    enabled: true,
    userGroups: [USER_GROUPS.ADMIN, USER_GROUPS.DEVELOPER],
    description: '迁移进度跟踪器',
    module: 'migration'
  },

  'debug.performance_monitor': {
    type: FLAG_TYPES.BOOLEAN,
    enabled: false,
    description: '性能监控面板',
    module: 'debug'
  },

  // 实验性功能
  'experimental.micro_frontend': {
    type: FLAG_TYPES.USER_GROUP,
    enabled: false,
    userGroups: [USER_GROUPS.DEVELOPER],
    description: '微前端架构实验',
    module: 'core'
  },

  'experimental.pwa_support': {
    type: FLAG_TYPES.BOOLEAN,
    enabled: false,
    description: 'PWA 支持',
    module: 'core'
  }
}

// 时间窗口配置示例
export const TIME_WINDOWS = {
  'migration.weekend_rollout': {
    start: '2024-03-01T18:00:00Z',
    end: '2024-03-03T06:00:00Z',
    description: '周末迁移发布窗口'
  }
}

// 用户组检查函数
export const checkUserGroup = (user, requiredGroups) => {
  if (!user || !user.groups) return false
  return requiredGroups.some(group => user.groups.includes(group))
}

// 百分比检查函数 (基于用户ID的一致性哈希)
export const checkPercentage = (userId, percentage) => {
  if (!userId) return false
  
  // 简单的哈希函数，确保同一用户总是得到相同的结果
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 转换为32位整数
  }
  
  const userPercentage = Math.abs(hash) % 100
  return userPercentage < percentage
}

// 时间窗口检查函数
export const checkTimeWindow = (windowConfig) => {
  const now = new Date()
  const start = new Date(windowConfig.start)
  const end = new Date(windowConfig.end)
  
  return now >= start && now <= end
}

// 功能开关评估器
export class FeatureFlagEvaluator {
  constructor(user = null) {
    this.user = user
  }

  /**
   * 检查功能是否启用
   */
  isEnabled(flagKey) {
    const flag = FEATURE_FLAGS[flagKey]
    if (!flag) {
      console.warn(`Feature flag not found: ${flagKey}`)
      return false
    }

    if (!flag.enabled) {
      return false
    }

    switch (flag.type) {
      case FLAG_TYPES.BOOLEAN:
        return true

      case FLAG_TYPES.PERCENTAGE:
        if (!this.user?.id) return false
        return checkPercentage(this.user.id, flag.percentage)

      case FLAG_TYPES.USER_GROUP:
        if (!this.user) return false
        return checkUserGroup(this.user, flag.userGroups)

      case FLAG_TYPES.TIME_WINDOW:
        const windowConfig = TIME_WINDOWS[flag.timeWindow]
        if (!windowConfig) return false
        return checkTimeWindow(windowConfig)

      default:
        console.warn(`Unknown flag type: ${flag.type}`)
        return false
    }
  }

  /**
   * 批量检查功能开关
   */
  getEnabledFlags(flagKeys) {
    const result = {}
    flagKeys.forEach(key => {
      result[key] = this.isEnabled(key)
    })
    return result
  }

  /**
   * 获取模块相关的功能开关
   */
  getModuleFlags(moduleCode) {
    const moduleFlags = {}
    Object.entries(FEATURE_FLAGS).forEach(([key, flag]) => {
      if (flag.module === moduleCode) {
        moduleFlags[key] = this.isEnabled(key)
      }
    })
    return moduleFlags
  }

  /**
   * 获取迁移相关的功能开关
   */
  getMigrationFlags() {
    const migrationFlags = {}
    Object.entries(FEATURE_FLAGS).forEach(([key, flag]) => {
      if (key.startsWith('migration.')) {
        migrationFlags[key] = this.isEnabled(key)
      }
    })
    return migrationFlags
  }

  /**
   * 检查模块功能是否启用 Vue 版本
   */
  shouldUseVueVersion(moduleCode, feature = null) {
    const flagKey = feature 
      ? `migration.${moduleCode}_vue_${feature}`
      : `migration.${moduleCode}_vue`
    
    return this.isEnabled(flagKey)
  }

  /**
   * 获取功能开关统计
   */
  getStats() {
    const allFlags = Object.keys(FEATURE_FLAGS)
    const enabledFlags = allFlags.filter(key => this.isEnabled(key))
    
    const statsByType = {}
    const statsByModule = {}
    
    allFlags.forEach(key => {
      const flag = FEATURE_FLAGS[key]
      const isEnabled = this.isEnabled(key)
      
      // 按类型统计
      if (!statsByType[flag.type]) {
        statsByType[flag.type] = { total: 0, enabled: 0 }
      }
      statsByType[flag.type].total++
      if (isEnabled) statsByType[flag.type].enabled++
      
      // 按模块统计
      if (!statsByModule[flag.module]) {
        statsByModule[flag.module] = { total: 0, enabled: 0 }
      }
      statsByModule[flag.module].total++
      if (isEnabled) statsByModule[flag.module].enabled++
    })
    
    return {
      total: allFlags.length,
      enabled: enabledFlags.length,
      byType: statsByType,
      byModule: statsByModule
    }
  }
}

// 默认导出
export default {
  FEATURE_FLAGS,
  FLAG_TYPES,
  USER_GROUPS,
  TIME_WINDOWS,
  FeatureFlagEvaluator,
  checkUserGroup,
  checkPercentage,
  checkTimeWindow
}
