/**
 * 新导航菜单配置
 * 用于 OpsLayout 纯左侧导航结构
 * 将原二级模块提升为一级导航
 */

import {
    JAO_NAV_ITEMS,
    GFS_NAV_ITEMS,
    CMD_NAV_ITEMS,
    PATCHES_NAV_ITEMS,
    SOFTWARE_NAV_ITEMS,
    CAC_NAV_ITEMS,
    ACM_NAV_ITEMS,
    USERS_NAV_ITEMS,
    FLOW_NAV_ITEMS,
    SUDO_NAV_ITEMS,
    PASSWORD_NAV_ITEMS,
    SSC_NAV_ITEMS
} from './module-nav.config.js'

/**
 * Font Awesome 图标到 Element Plus 图标的映射
 * 只用于一级菜单
 */
const ICON_MAP = {
    'fas fa-tasks': 'Document',
    'fas fa-file-code': 'Document',
    'fas fa-terminal': 'Monitor',
    'fas fa-download': 'Download',
    'fas fa-box': 'Box',
    'fas fa-search': 'Search',
    'fas fa-server': 'Monitor',
    'fas fa-users': 'User',
    'fas fa-project-diagram': 'Connection',
    'fas fa-user-shield': 'Key',
    'fas fa-key': 'Key',
    'fas fa-users-cog': 'UserFilled',
    'fas fa-cog': 'Setting'
}

/**
 * 转换图标名称
 */
function convertIcon(faIcon) {
    return ICON_MAP[faIcon] || 'Document'
}

/**
 * 生成扁平化的导航菜单配置
 * 将原二级模块直接提升为一级菜单
 * @returns {Array} 菜单项数组
 */
export function generateNavMenu() {
    return [
        // ============ 作业中心 ============
        {
            path: '/jao',
            title: '作业中心',
            icon: 'Document',
            children: JAO_NAV_ITEMS.map(item => ({
                path: item.path,
                title: item.label
            }))
        },
        // ============ 脚本中心 ============
        {
            path: '/gfs',
            title: '脚本中心',
            icon: 'Document',
            children: GFS_NAV_ITEMS.map(item => ({
                path: item.path,
                title: item.label
            }))
        },
        // ============ 命令中心 ============
        {
            path: '/cmd',
            title: '命令中心',
            icon: 'Monitor',
            children: CMD_NAV_ITEMS.map(item => ({
                path: item.path,
                title: item.label
            }))
        },
        // ============ 补丁管理 ============
        {
            path: '/patches',
            title: '补丁管理',
            icon: 'Download',
            children: PATCHES_NAV_ITEMS.map(item => ({
                path: item.path,
                title: item.label
            }))
        },
        // ============ 软件管理 ============
        {
            path: '/software',
            title: '软件管理',
            icon: 'Box',
            children: SOFTWARE_NAV_ITEMS.map(item => ({
                path: item.path,
                title: item.label
            }))
        },
        // ============ 系统巡检 ============
        {
            path: '/cac',
            title: '系统巡检',
            icon: 'Search',
            children: CAC_NAV_ITEMS.map(item => ({
                path: item.path,
                title: item.label
            }))
        },
        // ============ 资产管理 ============
        {
            path: '/acm',
            title: '资产管理',
            icon: 'Monitor',
            children: ACM_NAV_ITEMS.map(item => ({
                path: item.path,
                title: item.label
            }))
        },
        // ============ 用户管理 ============
        {
            path: '/users',
            title: '用户管理',
            icon: 'User',
            children: USERS_NAV_ITEMS.map(item => ({
                path: item.path,
                title: item.label
            }))
        },
        // ============ 流程管理 ============
        {
            path: '/flow',
            title: '流程管理',
            icon: 'Connection',
            children: FLOW_NAV_ITEMS.map(item => ({
                path: item.path,
                title: item.label
            }))
        },
        // ============ sudo权限 ============
        {
            path: '/sudo',
            title: 'sudo权限',
            icon: 'Key',
            children: SUDO_NAV_ITEMS.map(item => ({
                path: item.path,
                title: item.label
            }))
        },
        // ============ 密码管理 ============
        {
            path: '/password',
            title: '密码管理',
            icon: 'Lock',
            children: PASSWORD_NAV_ITEMS.map(item => ({
                path: item.path,
                title: item.label
            }))
        },
        // ============ 系统设置 ============
        {
            path: '/ssc',
            title: '系统设置',
            icon: 'Setting',
            children: SSC_NAV_ITEMS.map(item => ({
                path: item.path,
                title: item.label
            }))
        }
    ]
}

/**
 * 导出生成的菜单配置
 */
export const NAV_MENU_LIST = generateNavMenu()
