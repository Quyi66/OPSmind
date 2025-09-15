/**
 * Angular 模块配置 - TypeScript版本
 * 统一管理所有Angular模块的路由和配置信息
 * URL 配置已抽取到 module-urls.config.ts 中单独管理
 */

import { appUrlManager } from './module-urls.config'

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
    features: ['作业编排', '命令管理', '流程设计', '调度管理', '执行历史']
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
 * 获取模块的入口 URL
 */
export function getModuleEntryUrl(moduleCode: string): string | null {
  return appUrlManager.getAppUrl(moduleCode)
}

/**
 * 检查模块是否可用
 */
export function isModuleAvailable(moduleCode: string): boolean {
  return appUrlManager.hasApp(moduleCode)
}

/**
 * 获取所有可用模块的代码
 */
export function getAvailableModuleCodes(): string[] {
  return appUrlManager.getAvailableApps()
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

    if (!config.title) {
      errors.push('模块标题不能为空')
    }

    if (!config.angularModule) {
      errors.push('Angular模块名不能为空')
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
