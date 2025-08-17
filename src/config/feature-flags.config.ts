/**
 * 功能开关配置 - TypeScript版本
 * 支持模块迁移的灰度发布和 A/B 测试
 */

// 功能开关类型
export const FLAG_TYPES = {
  BOOLEAN: 'boolean',           // 简单开关
  PERCENTAGE: 'percentage',     // 百分比灰度
  USER_GROUP: 'user_group',     // 用户组
  TIME_WINDOW: 'time_window'    // 时间窗口
} as const

// 用户组定义
export const USER_GROUPS = {
  ADMIN: 'admin',               // 管理员
  DEVELOPER: 'developer',       // 开发人员
  BETA_TESTER: 'beta_tester',   // Beta 测试用户
  POWER_USER: 'power_user',     // 高级用户
  REGULAR_USER: 'regular_user'  // 普通用户
} as const

type FlagType = typeof FLAG_TYPES[keyof typeof FLAG_TYPES]
type UserGroup = typeof USER_GROUPS[keyof typeof USER_GROUPS]

interface BaseFeatureFlag {
  type: FlagType
  enabled: boolean
  description: string
  module?: string
  feature?: string
}

interface BooleanFlag extends BaseFeatureFlag {
  type: typeof FLAG_TYPES.BOOLEAN
}

interface PercentageFlag extends BaseFeatureFlag {
  type: typeof FLAG_TYPES.PERCENTAGE
  percentage: number
}

interface UserGroupFlag extends BaseFeatureFlag {
  type: typeof FLAG_TYPES.USER_GROUP
  userGroups: UserGroup[]
}

interface TimeWindowFlag extends BaseFeatureFlag {
  type: typeof FLAG_TYPES.TIME_WINDOW
  startTime: string
  endTime: string
}

type FeatureFlag = BooleanFlag | PercentageFlag | UserGroupFlag | TimeWindowFlag

interface FeatureFlags {
  [key: string]: FeatureFlag
}

// 功能开关配置
export const FEATURE_FLAGS: FeatureFlags = {
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

  // UI 功能开关
  'ui.new_header': {
    type: FLAG_TYPES.BOOLEAN,
    enabled: true,
    description: '启用新版本的页面头部'
  },

  'ui.dark_mode': {
    type: FLAG_TYPES.USER_GROUP,
    enabled: true,
    userGroups: [USER_GROUPS.DEVELOPER, USER_GROUPS.BETA_TESTER],
    description: '启用暗色主题模式'
  },

  // 性能优化
  'performance.lazy_loading': {
    type: FLAG_TYPES.BOOLEAN,
    enabled: true,
    description: '启用模块懒加载'
  },

  'performance.virtual_scroll': {
    type: FLAG_TYPES.PERCENTAGE,
    enabled: true,
    percentage: 50,
    description: '启用虚拟滚动优化'
  }
}

interface User {
  id: string
  login: string
  groups?: UserGroup[]
  role?: string
}

/**
 * 功能开关评估器
 */
export class FeatureFlagEvaluator {
  private user: User | null = null

  setUser(user: User): void {
    this.user = user
  }

  /**
   * 评估功能开关是否启用
   */
  isEnabled(flagKey: string): boolean {
    const flag = FEATURE_FLAGS[flagKey]
    if (!flag || !flag.enabled) {
      return false
    }

    switch (flag.type) {
      case FLAG_TYPES.BOOLEAN:
        return true

      case FLAG_TYPES.PERCENTAGE:
        return this.evaluatePercentage(flag as PercentageFlag)

      case FLAG_TYPES.USER_GROUP:
        return this.evaluateUserGroup(flag as UserGroupFlag)

      case FLAG_TYPES.TIME_WINDOW:
        return this.evaluateTimeWindow(flag as TimeWindowFlag)

      default:
        return false
    }
  }

  /**
   * 评估百分比开关
   */
  private evaluatePercentage(flag: PercentageFlag): boolean {
    if (!this.user) return false
    
    // 使用用户ID生成一个0-100的数字
    const hash = this.hashString(this.user.id)
    const userPercentage = hash % 100
    return userPercentage < flag.percentage
  }

  /**
   * 评估用户组开关
   */
  private evaluateUserGroup(flag: UserGroupFlag): boolean {
    if (!this.user) return false

    // 检查用户角色
    if (this.user.role && flag.userGroups.includes(this.user.role as UserGroup)) {
      return true
    }

    // 检查用户组
    if (this.user.groups) {
      return this.user.groups.some(group => flag.userGroups.includes(group))
    }

    return false
  }

  /**
   * 评估时间窗口开关
   */
  private evaluateTimeWindow(flag: TimeWindowFlag): boolean {
    const now = new Date()
    const startTime = new Date(flag.startTime)
    const endTime = new Date(flag.endTime)
    
    return now >= startTime && now <= endTime
  }

  /**
   * 简单的字符串哈希函数
   */
  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return Math.abs(hash)
  }

  /**
   * 获取所有启用的功能开关
   */
  getEnabledFlags(): string[] {
    return Object.keys(FEATURE_FLAGS).filter(key => this.isEnabled(key))
  }

  /**
   * 获取模块的功能开关状态
   */
  getModuleFlags(moduleCode: string): Record<string, boolean> {
    const moduleFlags: Record<string, boolean> = {}
    
    Object.entries(FEATURE_FLAGS).forEach(([key, flag]) => {
      if (flag.module === moduleCode) {
        moduleFlags[key] = this.isEnabled(key)
      }
    })
    
    return moduleFlags
  }
}

// 创建全局实例
export const featureFlagEvaluator = new FeatureFlagEvaluator()

// 导出类型
export type { 
  FeatureFlag, 
  BooleanFlag, 
  PercentageFlag, 
  UserGroupFlag, 
  TimeWindowFlag,
  User,
  FlagType,
  UserGroup
}
