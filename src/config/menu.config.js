/**
 * 菜单配置文件
 * 定义一级分组菜单和二级子菜单的层级结构
 */

import { authService } from '@/core/auth'
import { filterAccessibleMenuGroups } from '@/core/auth/permission-policy'

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
      code: 'automation',
      name: '自动化管理',
      icon: 'fas fa-robot',
      description: '自动化运维工具、脚本、命令执行、rpm包安装和主机账号管理',
      children: [
        {
          code: 'auto-workbench',
          name: '工作台',
          icon: 'fas fa-th-large',
          description: '自动化待办与运行态总览'
        },
        {
          code: 'jao',
          name: '运维工具箱',
          icon: 'fas fa-tasks',
          description: '自动化运维工具编排和调度管理'
        },
        {
          code: 'gfs',
          name: '脚本中心',
          icon: 'fas fa-file-code',
          description: '脚本文件管理和版本控制'
        },
        {
          code: 'cmd',
          name: '命令执行',
          icon: 'fas fa-terminal',
          description: '系统命令管理和执行'
        },
        {
          code: 'run-records',
          name: '运行记录',
          icon: 'fas fa-history',
          description: '统一查看自动化任务运行记录和统计'
        },
        {
          code: 'review-center',
          name: '审批中心',
          icon: 'fas fa-stamp',
          description: '运维工具审批、命令审核与脚本审核的统一入口'
        },
        {
          code: 'users',
          name: '主机账号',
          icon: 'fas fa-users',
          description: '主机账号与权限管理'
        },
        {
          code: 'rpm-install',
          name: 'rpm包安装',
          icon: 'fas fa-box-open',
          description: '上传rpm包并分发到目标主机安装'
        }
      ]
    },
    {
      code: 'patch-testing',
      name: '补丁漏洞',
      icon: 'fas fa-shield-virus',
      description: '补丁测试和漏洞管理',
      children: [
        {
          code: 'patches',
          name: '补丁管理',
          icon: 'fab fa-linux',
          description: '系统补丁和更新管理'
        },
        {
          code: 'windows-patches',
          name: '补丁管理(win)',
          icon: 'fab fa-windows',
          description: 'Windows系统补丁和更新管理'
        },
        {
          code: 'patch-logs',
          name: '变更日志查询',
          icon: 'fas fa-history',
          description: '查看补丁相关执行日志'
        },
        {
          code: 'patch-process-logs',
          name: '流程操作记录',
          icon: 'fas fa-stream',
          description: '查看补丁向导流程步骤记录'
        },
        {
          code: 'yum-repo',
          name: 'Yum仓库管理',
          icon: 'fas fa-database',
          description: 'Yum 仓库管理与源清单查看'
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
          name: '巡检中心',
          icon: 'fas fa-search',
          description: '系统配置审计与合规性检查'
        }
      ]
    },
    {
      code: 'flow-management',
      name: '流程管理',
      icon: 'fas fa-project-diagram',
      description: '业务流程设计与审批管理',
      children: [
        {
          code: 'flow',
          name: '流程中心',
          icon: 'fas fa-project-diagram',
          description: '流程设计与任务管理'
        }
      ]
    },
    {
      code: 'user-management',
      name: '平台用户管理',
      icon: 'fas fa-users-cog',
      description: '平台用户与团队管理',
      children: [
        {
          code: 'uam',
          name: '用户管理',
          icon: 'fas fa-users-cog',
          description: '平台用户与团队管理'
        }
      ]
    },
    {
      code: 'security-management',
      name: '安全中心',
      hidden: true,
      icon: 'fas fa-lock',
      description: '系统安全与权限控制',
      children: [
        {
          code: 'sudo',
          name: 'Sudo权限',
          icon: 'fas fa-user-shield',
          description: 'sudo权限分配和管理'
        },
        {
          code: 'password',
          name: '密码管理',
          icon: 'fas fa-key',
          description: '密码策略和安全管理'
        }
      ]
    },
    {
      code: 'system-settings',
      name: '系统设置',
      icon: 'fas fa-cogs',
      description: '系统配置与平台管理',
      children: [
        {
          code: 'ssc',
          name: '系统设置',
          icon: 'fas fa-cogs',
          description: '系统配置与平台管理'
        }
      ]
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

/**
 * 获取所有一级菜单分组
 */
export function getMenuGroups() {
  return filterAccessibleMenuGroups(MENU_CONFIG.groups, permission =>
    authService.hasPermission(permission)
  )
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
