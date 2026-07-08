import { authService } from '@/core/auth'
import { getModuleDefinition } from '@/modules/registry'

export const MENU_CONFIG = {
  // 特殊菜单项（首页）
  homeMenu: {
    code: 'home',
    name: '首页',
    icon: 'fas fa-home',
    description: '系统仪表盘',
    type: 'home',
    permissions: [],
    defaultRoute: '/home'
  },

  // 一级菜单分组定义：仅声明分组和包含的二级菜单代码，顺序即为展示顺序
  groups: [
    {
      code: 'asset-management',
      name: '资产管理',
      icon: 'fas fa-server',
      description: 'IT基础设施资产管理',
      children: ['acm']
    },
    {
      code: 'automation',
      name: '自动化管理',
      icon: 'fas fa-robot',
      description: '自动化运维工具、脚本、命令执行和主机用户管理',
      children: [
        'auto-workbench',
        'jao',
        'gfs',
        'cmd',
        'task-scheduler',
        'run-records',
        'review-center',
        'flow'
      ]
    },
    {
      code: 'patch-testing',
      name: '补丁漏洞',
      icon: 'fas fa-shield-virus',
      description: '补丁测试和漏洞管理',
      children: [
        'patches',
        'windows-patches',
        'patch-logs',
        'patch-process-logs',
        'middleware-cve'
      ]
    },
    {
      code: 'system-inspection',
      name: '系统巡检',
      icon: 'fas fa-search',
      description: '系统配置审计与合规性检查',
      children: ['cac']
    },
    {
      code: 'flow-management',
      name: '主机用户管理',
      icon: 'fas fa-users',
      description: '主机用户与权限管理',
      children: ['users']
    },
    {
      code: 'user-management',
      name: '平台用户管理',
      icon: 'fas fa-users-cog',
      description: '平台用户与团队管理',
      children: ['uam']
    },
    {
      code: 'security-management',
      name: '安全中心',
      hidden: true,
      icon: 'fas fa-lock',
      description: '系统安全与权限控制',
      children: ['sudo', 'password']
    },
    {
      code: 'system-settings',
      name: '系统设置',
      icon: 'fas fa-cogs',
      description: '系统配置与平台管理',
      children: ['ssc']
    }
  ]
}

// 一级分组简写（URL友好别名）
export const GROUP_ALIAS_MAP = {
  automation: 'auto',
  'patch-testing': 'pt',
  'system-inspection': 'si',
  'asset-management': 'am',
  'flow-management': 'flow',
  'user-management': 'um',
  'security-management': 'sec',
  'system-settings': 'sys',
  home: 'home'
}

// 反向映射
const ALIAS_TO_GROUP = Object.fromEntries(Object.entries(GROUP_ALIAS_MAP).map(([k, v]) => [v, k]))

/**
 * 获取首页菜单项
 */
export function getHomeMenu() {
  return MENU_CONFIG.homeMenu
}

let cachedResolvedGroups = null

// 从统一模块注册中心解析生成完整的菜单组结构，供权限过滤和 UI 渲染使用
const getResolvedGroups = () => {
  if (cachedResolvedGroups) {
    return cachedResolvedGroups
  }
  cachedResolvedGroups = MENU_CONFIG.groups.map(group => {
    const children = group.children
      .map(code => {
        const def = getModuleDefinition(code)
        if (!def) return null
        return {
          code: def.code,
          name: def.name,
          icon: def.icon,
          description: def.description
        }
      })
      .filter(Boolean)

    return {
      ...group,
      children
    }
  })
  return cachedResolvedGroups
}

/**
 * 获取所有一级菜单分组
 */
export function getMenuGroups() {
  const resolved = getResolvedGroups()
  return resolved
    .filter(group => !group.hidden)
    .map(group => {
      const children = group.children.filter(child => {
        const permissions = getMenuPermissions(child.code)
        if (!permissions.length) return true
        return permissions.some(permission => authService.hasPermission(permission))
      })
      return {
        ...group,
        children
      }
    })
    .filter(group => group.children.length > 0)
}

/**
 * 根据分组代码获取分组信息
 */
export function getMenuGroup(groupCode) {
  return getMenuGroups().find(group => group.code === groupCode)
}

/**
 * 根据分组代码获取二级菜单项
 */
export function getSubMenus(groupCode) {
  const group = getMenuGroup(groupCode)
  return group ? group.children : []
}

/**
 * 根据菜单代码获取菜单项信息（包括所属分组）
 */
export function getMenuItemInfo(menuCode) {
  for (const group of getMenuGroups()) {
    const menuItem = group.children.find(child => child.code === menuCode)
    if (menuItem) {
      return {
        group,
        menuItem
      }
    }
  }
  return null
}

/**
 * 获取所有二级菜单项的平铺列表
 */
export function getAllMenuItems() {
  const allItems = []
  getMenuGroups().forEach(group => {
    group.children.forEach(child => {
      allItems.push({
        ...child,
        groupCode: group.code,
        groupName: group.name
      })
    })
  })
  return allItems
}

/**
 * 获取分组的URL简写
 */
export function getGroupAlias(groupCode) {
  return GROUP_ALIAS_MAP[groupCode] || groupCode
}

/**
 * 将URL中的简写还原为真实分组代码
 */
export function resolveGroupCode(aliasOrCode) {
  return ALIAS_TO_GROUP[aliasOrCode] || aliasOrCode
}

/**
 * 获取菜单项的权限要求
 * @param {string} menuCode - 菜单代码
 * @returns {string[]} 权限token数组，为空表示无权限限制
 */
export function getMenuPermissions(menuCode) {
  if (menuCode === 'home') return []
  return getModuleDefinition(menuCode)?.permissions || []
}

/**
 * 获取菜单项的默认路由
 * @param {string} menuCode - 菜单代码
 * @returns {string|null} 默认路由路径
 */
export function getMenuDefaultRoute(menuCode) {
  if (menuCode === 'home') return '/home'
  return getModuleDefinition(menuCode)?.defaultRoute || null
}
