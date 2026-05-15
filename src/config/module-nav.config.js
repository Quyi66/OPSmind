/**
 * 模块页面导航配置
 * 定义每个模块内部的页面导航项
 */

import { authService } from '@/core/auth'
import { canAccessMenuCode } from '@/core/auth/permission-policy'

import { PATCHES_ROUTE_DEFS } from '@/modules/patches/routes.js'
import { YUM_REPO_ROUTE_DEFS } from '@/modules/yum-repo/routes.js'
import { CAC_ROUTE_DEFS } from '@/modules/inspection/routes.js'
import { ACM_ROUTE_DEFS } from '@/modules/asset/routes.js'
import { USERS_ROUTE_DEFS } from '@/modules/user/routes.js'
import {
  JAO_ROUTE_DEFS,
  RUN_RECORDS_ROUTE_DEFS,
  GFS_ROUTE_DEFS,
  CMD_ROUTE_DEFS,
  RPM_INSTALL_ROUTE_DEFS
} from '@/modules/automation/routes.js'
import { FLOW_ROUTE_DEFS } from '@/modules/flow/routes.js'
import { SUDO_ROUTE_DEFS } from '@/modules/sudo/routes.js'
import { PASSWORD_ROUTE_DEFS } from '@/modules/password/routes.js'
import { SSC_ROUTE_DEFS, UAM_ROUTE_DEFS } from '@/modules/settings/routes.js'

// 自动化管理 - 作业模块的页面导航
export const JAO_NAV_ITEMS = JAO_ROUTE_DEFS.filter(def => def.navLabel).map(def => ({
  key: def.key,
  label: def.navLabel || def.title,
  icon: def.icon,
  path: `/jao/${def.path}`
}))

// 自动化管理 - 运行记录模块的页面导航
export const RUN_RECORDS_NAV_ITEMS = RUN_RECORDS_ROUTE_DEFS.filter(def => def.navLabel).map(def => ({
  key: def.key,
  label: def.navLabel || def.title,
  icon: def.icon,
  path: `/run-records/${def.path}`
}))

// 自动化管理 - 脚本模块的页面导航
export const GFS_NAV_ITEMS = GFS_ROUTE_DEFS.filter(def => def.navLabel).map(def => ({
  key: def.key,
  label: def.navLabel || def.title,
  icon: def.icon,
  path: `/gfs/${def.path}`
}))

const CMD_SECONDARY_NAV_ITEMS = CMD_ROUTE_DEFS.filter(
  def => def.navLabel && !['list', 'job'].includes(def.key)
).map(def => ({
  key: def.key,
  label: def.navLabel || def.title,
  icon: def.icon,
  path: `/cmd/${def.path}`
}))

// 自动化管理 - 命令模块的页面导航
export const CMD_NAV_ITEMS = [
  {
    key: 'workspace',
    label: '命令与作业',
    icon: 'fas fa-layer-group',
    path: '/cmd/list'
  },
  ...CMD_SECONDARY_NAV_ITEMS
]

// 自动化管理 - rpm 包安装模块的页面导航
export const RPM_INSTALL_NAV_ITEMS = RPM_INSTALL_ROUTE_DEFS.filter(def => def.navLabel).map(def => ({
  key: def.key,
  label: def.navLabel || def.title,
  icon: def.icon,
  path: `/rpm-install/${def.path}`
}))

// 补丁漏洞 - 补丁模块(Linux/Common，不包含日志)的页面导航
export const PATCHES_NAV_ITEMS = PATCHES_ROUTE_DEFS.filter(
  def => def.navLabel && def.platform !== 'windows' && !['logs', 'processLogs'].includes(def.key)
).map(def => ({
  key: def.key,
  label: def.navLabel || def.title,
  icon: def.icon,
  path: `/patches/${def.path}`,
  platform: def.platform || 'common'
}))

// 补丁漏洞 - 补丁模块(Win)的页面导航
export const WINDOWS_PATCHES_NAV_ITEMS = PATCHES_ROUTE_DEFS.filter(
  def => def.navLabel && def.platform === 'windows' && def.key !== 'windowsYumRepo'
).map(def => ({
  key: def.key,
  label: def.navLabel || def.title, // 取路由内的中文如“补丁安装”
  icon: def.icon,
  path: `/patches/${def.path}`,
  platform: def.platform || 'windows'
}))

// 补丁漏洞 - 变更日志查询的导航
export const PATCH_LOGS_NAV_ITEMS = PATCHES_ROUTE_DEFS.filter(
  def => def.navLabel && def.key === 'logs'
).map(def => ({
  key: def.key,
  label: def.navLabel || def.title,
  icon: def.icon,
  path: `/patches/${def.path}`,
  platform: 'common'
}))

// 补丁漏洞 - 流程操作记录的导航
export const PATCH_PROCESS_LOGS_NAV_ITEMS = PATCHES_ROUTE_DEFS.filter(
  def => def.navLabel && def.key === 'processLogs'
).map(def => ({
  key: def.key,
  label: def.navLabel || def.title,
  icon: def.icon,
  path: `/patches/${def.path}`,
  platform: 'common'
}))

// 补丁漏洞 - Yum仓库管理模块的页面导航
export const YUM_REPO_NAV_ITEMS = YUM_REPO_ROUTE_DEFS.filter(def => def.navLabel).map(def => ({
  key: def.key,
  label: def.navLabel || def.title,
  icon: def.icon,
  path: `/yum-repo/${def.path}`
}))

export const SOFTWARE_NAV_ITEMS = YUM_REPO_NAV_ITEMS

// 系统巡检 - 巡检模块的页面导航
export const CAC_NAV_ITEMS = CAC_ROUTE_DEFS.filter(def => def.navLabel).map(def => ({
  key: def.key,
  label: def.navLabel || def.title,
  icon: def.icon,
  path: `/cac/${def.path}`
}))

// 资产管理 - 资产模块的页面导航
export const ACM_NAV_ITEMS = ACM_ROUTE_DEFS.filter(def => def.navLabel).map(def => ({
  key: def.key,
  label: def.navLabel || def.title,
  icon: def.icon,
  path: `/acm/${def.path}`
}))

// 用户管理模块的页面导航
export const USERS_NAV_ITEMS = USERS_ROUTE_DEFS.filter(def => def.navLabel).map(def => ({
  key: def.key,
  label: def.navLabel || def.title,
  icon: def.icon,
  path: `/users/${def.path}`
}))

// 流程管理模块的页面导航
export const FLOW_NAV_ITEMS = FLOW_ROUTE_DEFS.filter(def => def.navLabel).map(def => ({
  key: def.key,
  label: def.navLabel || def.title,
  icon: def.icon,
  path: `/flow/${def.path}`
}))

// sudo权限管理模块的页面导航
export const SUDO_NAV_ITEMS = SUDO_ROUTE_DEFS.filter(def => def.navLabel).map(def => ({
  key: def.key,
  label: def.navLabel || def.title,
  icon: def.icon,
  path: `/sudo/${def.path}`
}))

// 密码管理模块的页面导航
export const PASSWORD_NAV_ITEMS = PASSWORD_ROUTE_DEFS.filter(def => def.navLabel).map(def => ({
  key: def.key,
  label: def.navLabel || def.title,
  icon: def.icon,
  path: `/password/${def.path}`
}))

// 系统设置模块的页面导航
export const SSC_NAV_ITEMS = SSC_ROUTE_DEFS.filter(def => def.navLabel).map(def => ({
  key: def.key,
  label: def.navLabel || def.title,
  icon: def.icon,
  path: `/ssc/${def.path}`
}))

// 用户与团队模块的页面导航
export const UAM_NAV_ITEMS = UAM_ROUTE_DEFS.filter(def => def.navLabel).map(def => ({
  key: def.key,
  label: def.navLabel || def.title,
  icon: def.icon,
  path: `/uam/${def.path}`
}))

/**
 * 模块导航配置映射
 * 键为模块代码，值为该模块的页面导航配置
 */
export const MODULE_NAV_CONFIG = {
  jao: JAO_NAV_ITEMS,
  'run-records': RUN_RECORDS_NAV_ITEMS,
  gfs: GFS_NAV_ITEMS,
  cmd: CMD_NAV_ITEMS,
  'rpm-install': RPM_INSTALL_NAV_ITEMS,
  patches: PATCHES_NAV_ITEMS,
  'windows-patches': WINDOWS_PATCHES_NAV_ITEMS,
  'patch-logs': PATCH_LOGS_NAV_ITEMS,
  'patch-process-logs': PATCH_PROCESS_LOGS_NAV_ITEMS,
  'yum-repo': YUM_REPO_NAV_ITEMS,
  software: YUM_REPO_NAV_ITEMS,
  cac: CAC_NAV_ITEMS,
  acm: ACM_NAV_ITEMS,
  users: USERS_NAV_ITEMS,
  flow: FLOW_NAV_ITEMS,
  sudo: SUDO_NAV_ITEMS,
  password: PASSWORD_NAV_ITEMS,
  uam: UAM_NAV_ITEMS,
  ssc: SSC_NAV_ITEMS
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

  return group.children
    .filter(module =>
      canAccessMenuCode(permission => authService.hasPermission(permission), module.code)
    )
    .map(module => ({
      code: module.code,
      name: module.name,
      icon: module.icon,
      children: MODULE_NAV_CONFIG[module.code] || []
    }))
}
