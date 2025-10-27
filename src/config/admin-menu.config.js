/**
 * 管理后台菜单配置
 */

export const ADMIN_MENU_CONFIG = [
  {
    code: 'assets',
    name: '资产管理',
    icon: 'fas fa-server',
    children: [
      { code: 'auto-config', name: '自动化配置', icon: 'fas fa-cogs' }
    ]
  }
]

export function getDefaultAdminTarget() {
  const group = ADMIN_MENU_CONFIG[0]
  const child = group?.children?.[0]
  return {
    groupCode: group?.code || '',
    groupName: group?.name || '',
    pageCode: child?.code || '',
    pageName: child?.name || ''
  }
}
