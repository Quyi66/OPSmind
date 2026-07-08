/**
 * 模块页面导航配置
 * 从统一注册中心动态拼装生成每个模块内部的页面导航项
 */

import { authService } from '@/core/auth'
import { canAccessMenuCode } from '@/core/auth/permission-policy'
import { registeredModules, getModuleDefinition } from '@/modules/registry'

// 辅助函数：根据路由定义自动派生默认的侧边导航栏项
function buildDefaultNavItems(routes, basePath) {
  return (routes || [])
    .filter(def => def.navLabel)
    .map(def => ({
      key: def.key,
      label: def.navLabel || def.title,
      icon: def.icon,
      path: `${basePath}/${def.path}`,
      accessCode: def.accessCode
    }))
}

export const MODULE_NAV_CONFIG = {}

// 遍历注册的模块定义，动态组装导航配置
registeredModules.forEach(m => {
  if (m.navItems) {
    MODULE_NAV_CONFIG[m.code] = m.navItems
  } else if (m.routes) {
    MODULE_NAV_CONFIG[m.code] = buildDefaultNavItems(m.routes, `/${m.code}`)
  } else {
    MODULE_NAV_CONFIG[m.code] = []
  }
})

// 兼容别名映射
MODULE_NAV_CONFIG['software'] = MODULE_NAV_CONFIG['yum-repo']

// 挂载 yum-repo 子页面导航到 patches 导航中 (以避免模块层面的打包循环依赖)
const patchesDef = getModuleDefinition('patches')
if (patchesDef && patchesDef.navItems) {
  const yumRepoItem = patchesDef.navItems.find(item => item.key === 'yumRepoManage')
  if (yumRepoItem) {
    const yumRepoDef = getModuleDefinition('yum-repo')
    if (yumRepoDef) {
      yumRepoItem.children = buildDefaultNavItems(yumRepoDef.routes, '/yum-repo')
    }
  }
}

/**
 * 获取指定模块的页面导航配置
 * @param {string} moduleCode - 模块代码
 * @returns {Array} 页面导航配置数组
 */
export function getModuleNav(moduleCode) {
  return MODULE_NAV_CONFIG[moduleCode] || []
}

/**
 * 根据分组代码获取该分组下所有模块的完整菜单配置
 * 用于生成Element-UI的el-menu所需的菜单组数据
 * @param {string} groupCode - 分组代码
 * @param {Object} MENU_CONFIG - 菜单配置对象
 * @returns {Array} 菜单组配置数组
 */
export function getGroupMenuConfig(groupCode, MENU_CONFIG) {
  const group = MENU_CONFIG.groups.find(g => g.code === groupCode)
  if (!group) return []

  const checkPermission = permission => authService.hasPermission(permission)

  return group.children
    .map(childCode => {
      const moduleDef = typeof childCode === 'string' ? getModuleDefinition(childCode) : childCode
      if (!moduleDef) return null
      return {
        code: moduleDef.code,
        name: moduleDef.name,
        icon: moduleDef.icon,
        description: moduleDef.description
      }
    })
    .filter(Boolean)
    .filter(module => canAccessMenuCode(checkPermission, module.code))
    .map(module => ({
      code: module.code,
      name: module.name,
      icon: module.icon,
      children: (MODULE_NAV_CONFIG[module.code] || []).filter(item =>
        canAccessMenuCode(checkPermission, item.accessCode || module.code)
      )
    }))
    .filter(module => module.children.length > 0)
}
