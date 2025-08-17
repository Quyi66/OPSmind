/**
 * Angular 模块配置 - TypeScript版本
 * 统一管理所有Angular模块的路由和配置信息
 */

interface ModuleRoutes {
  [key: string]: string
}

interface AngularModuleConfig {
  code: string
  name: string
  title: string
  icon: string
  color: string
  description: string
  angularModule: string
  entryUrl: string
  routes: ModuleRoutes
  defaultRoute: string
  features: string[]
  permissions?: string[]
  enabled?: boolean
}

interface AngularModulesConfig {
  [key: string]: AngularModuleConfig
}

export const ANGULAR_MODULES_CONFIG: AngularModulesConfig = {
  // CAC - 配置审计与合规性检查
  cac: {
    code: 'cac',
    name: 'CAC 配置管理',
    title: '配置审计与合规性检查',
    icon: 'fa-cogs',
    color: '#28a745',
    description: '系统配置审计、合规性检查和配置管理',
    angularModule: 'oplus.cac',
    // 入口URL - 会自动跳转到具体页面
    entryUrl: '/cac',
    // 可用的子路由
    routes: {
      main: '/cac', // 主入口，会自动跳转
      dashboard: '/cac/template/square', // 仪表盘
      template: '/cac/template', // 模板管理
      rules: '/cac/rules', // 规则管理
      hosts: '/cac/hosts', // 主机管理
      jobs: '/cac/jobs', // 作业管理
      results: '/cac/results', // 结果查看
      script: '/cac/script' // 脚本管理
    },
    defaultRoute: '/cac',
    features: ['配置检查', '合规审计', '模板管理', '主机管理', '脚本管理']
  },

  // JAO - 作业编排
  jao: {
    code: 'jao',
    name: 'JAO 作业编排',
    title: '自动化作业编排与调度',
    icon: 'fa-tasks',
    color: '#007bff',
    description: '自动化作业编排、调度和执行管理',
    angularModule: 'oplus.jao',
    entryUrl: '/jao',
    routes: {
      main: '/jao',
      jobs: '/jao/jobs',
      commands: '/jao/commands',
      flows: '/jao/flows',
      schedules: '/jao/schedules',
      history: '/jao/history'
    },
    defaultRoute: '/jao',
    features: ['作业编排', '命令管理', '流程设计', '调度管理', '执行历史']
  },

  // SIM - 系统信息管理
  sim: {
    code: 'sim',
    name: 'SIM 系统信息',
    title: '系统信息管理与监控',
    icon: 'fa-server',
    color: '#6f42c1',
    description: '系统信息收集、管理和监控',
    angularModule: 'oplus.sim',
    entryUrl: '/sim',
    routes: {
      main: '/sim',
      hosts: '/sim/hosts',
      monitoring: '/sim/monitoring',
      reports: '/sim/reports',
      settings: '/sim/settings'
    },
    defaultRoute: '/sim',
    features: ['主机信息', '系统监控', '报表管理', '配置设置']
  },

  // UIM - 用户身份管理
  uim: {
    code: 'uim',
    name: 'UIM 用户管理',
    title: '用户身份与权限管理',
    icon: 'fa-users',
    color: '#dc3545',
    description: '用户身份管理、权限控制和访问管理',
    angularModule: 'oplus.uim',
    entryUrl: '/uim',
    routes: {
      main: '/uim',
      users: '/uim/users',
      roles: '/uim/roles',
      permissions: '/uim/permissions',
      groups: '/uim/groups'
    },
    defaultRoute: '/uim',
    features: ['用户管理', '角色管理', '权限管理', '用户组管理']
  }
}

/**
 * 获取模块配置
 */
export function getModuleConfig(moduleCode: string): AngularModuleConfig | null {
  return ANGULAR_MODULES_CONFIG[moduleCode] || null
}

/**
 * 获取所有模块配置
 */
export function getAllModuleConfigs(): AngularModuleConfig[] {
  return Object.values(ANGULAR_MODULES_CONFIG)
}

/**
 * 获取启用的模块配置
 */
export function getEnabledModuleConfigs(): AngularModuleConfig[] {
  return getAllModuleConfigs().filter(config => config.enabled !== false)
}

/**
 * 检查模块是否存在
 */
export function hasModule(moduleCode: string): boolean {
  return moduleCode in ANGULAR_MODULES_CONFIG
}

/**
 * 获取模块的默认路由
 */
export function getModuleDefaultRoute(moduleCode: string): string | null {
  const config = getModuleConfig(moduleCode)
  return config?.defaultRoute || null
}

/**
 * 获取模块的所有路由
 */
export function getModuleRoutes(moduleCode: string): ModuleRoutes | null {
  const config = getModuleConfig(moduleCode)
  return config?.routes || null
}

/**
 * 检查路由是否属于指定模块
 */
export function isModuleRoute(moduleCode: string, route: string): boolean {
  const config = getModuleConfig(moduleCode)
  if (!config) return false
  
  return Object.values(config.routes).includes(route)
}

/**
 * 根据路由获取模块代码
 */
export function getModuleCodeByRoute(route: string): string | null {
  for (const [code, config] of Object.entries(ANGULAR_MODULES_CONFIG)) {
    if (Object.values(config.routes).includes(route)) {
      return code
    }
  }
  return null
}

/**
 * 获取模块的权限要求
 */
export function getModulePermissions(moduleCode: string): string[] {
  const config = getModuleConfig(moduleCode)
  return config?.permissions || []
}

/**
 * 模块配置验证器
 */
export class ModuleConfigValidator {
  /**
   * 验证模块配置的完整性
   */
  static validate(config: AngularModuleConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!config.code) {
      errors.push('模块代码不能为空')
    }

    if (!config.name) {
      errors.push('模块名称不能为空')
    }

    if (!config.entryUrl) {
      errors.push('入口URL不能为空')
    }

    if (!config.routes || Object.keys(config.routes).length === 0) {
      errors.push('路由配置不能为空')
    }

    if (!config.defaultRoute) {
      errors.push('默认路由不能为空')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 验证所有模块配置
   */
  static validateAll(): { valid: boolean; moduleErrors: Record<string, string[]> } {
    const moduleErrors: Record<string, string[]> = {}
    let allValid = true

    for (const [code, config] of Object.entries(ANGULAR_MODULES_CONFIG)) {
      const result = this.validate(config)
      if (!result.valid) {
        moduleErrors[code] = result.errors
        allValid = false
      }
    }

    return {
      valid: allValid,
      moduleErrors
    }
  }
}

// 导出类型
export type { 
  AngularModuleConfig, 
  ModuleRoutes, 
  AngularModulesConfig 
}
