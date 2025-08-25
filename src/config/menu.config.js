/**
 * 菜单配置文件
 * 定义一级分组菜单和二级子菜单的层级结构
 */

export const MENU_CONFIG = {
  // 特殊菜单项（首页）
  homeMenu: {
    code: 'home',
    name: '首页',
    icon: 'fas fa-home',
    description: '系统仪表盘',
    type: 'home'
  },

  // 一级菜单分组
  groups: [
    {
      code: 'automation',
      name: '自动化管理',
      icon: 'fas fa-robot',
      description: '自动化脚本、作业和命令管理',
      children: [
        {
          code: 'gfs',
          name: '脚本',
          icon: 'fas fa-file-code',
          description: '脚本文件管理和版本控制'
        },
        {
          code: 'jao',
          name: '作业',
          icon: 'fas fa-tasks',
          description: '自动化作业编排和调度管理'
        },
        {
          code: 'cmd',
          name: '命令',
          icon: 'fas fa-terminal',
          description: '系统命令管理和执行'
        }
      ]
    },
    {
      code: 'patch-vulnerability',
      name: '补丁漏洞',
      icon: 'fas fa-shield-alt',
      description: '补丁和软件管理',
      children: [
        {
          code: 'patches',
          name: '补丁',
          icon: 'fas fa-download',
          description: '系统补丁和更新管理'
        },
        {
          code: 'software',
          name: '软件',
          icon: 'fas fa-box',
          description: '软件包安装和管理'
        }
      ]
    },
    {
      code: 'system-inspection',
      name: '系统巡检',
      icon: 'fas fa-search',
      description: '系统配置审计与合规性检查',
      children: [
        {
          code: 'cac',
          name: '巡检',
          icon: 'fas fa-search',
          description: '系统配置审计与合规性检查'
        }
      ]
    },
    {
      code: 'asset-management',
      name: '资产管理',
      icon: 'fas fa-server',
      description: 'IT基础设施资产管理',
      children: [
        {
          code: 'acm',
          name: '资产',
          icon: 'fas fa-server',
          description: 'IT基础设施资产管理'
        }
      ]
    },
    {
      code: 'user-management',
      name: '用户管理',
      icon: 'fas fa-users',
      description: '用户账户和权限管理',
      children: [
        {
          code: 'users',
          name: '用户',
          icon: 'fas fa-users',
          description: '用户账户和权限管理'
        },
        {
          code: 'sudo',
          name: 'sudo权限',
          icon: 'fas fa-user-shield',
          description: 'sudo权限分配和管理'
        },
        {
          code: 'password',
          name: '密码',
          icon: 'fas fa-key',
          description: '密码策略和安全管理'
        }
      ]
    }
  ]
}

/**
 * 获取首页菜单项
 */
export function getHomeMenu() {
  return MENU_CONFIG.homeMenu
}

/**
 * 获取所有一级菜单分组
 */
export function getMenuGroups() {
  return MENU_CONFIG.groups
}

/**
 * 根据分组代码获取分组信息
 */
export function getMenuGroup(groupCode) {
  return MENU_CONFIG.groups.find(group => group.code === groupCode)
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
  for (const group of MENU_CONFIG.groups) {
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
  MENU_CONFIG.groups.forEach(group => {
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
