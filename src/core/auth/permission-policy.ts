import type { RouteLocationNormalizedLoaded } from 'vue-router'
import type { AccountInfo, AccountRolePermission } from '@/core/account'
import type { AppletInfo } from '@/core/applet'
import { getMenuPermissions, getMenuDefaultRoute } from '@/config/menu.config.js'

type PermissionChecker = (permission: string) => boolean

const ADMIN_ROLE_NAMES = new Set(['admin', 'role_admin', 'role_super_admin', 'super_admin'])

const SPECIAL_MENU_REQUIREMENTS: Record<string, string[]> = {
  admin: ['admin'],
  'super-admin': ['admin']
}

const SPECIAL_MENU_DEFAULT_ROUTES: Record<string, string> = {
  admin: '/admin/assets/auto-config',
  'super-admin': '/admin/assets/auto-config'
}

function normalizeValue(value?: string | null): string {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function buildPermissionTokens(permission?: AccountRolePermission | null): string[] {
  if (!permission) return []

  const domain = normalizeValue(permission.domain)
  const action = normalizeValue(permission.action) || 'view'
  const target = normalizeValue(permission.target) || '*'

  if (!domain) return []

  return [domain, `${domain}:${action}`, `${domain}:${action}:${target}`]
}

export function isAdminRoleName(roleName?: string | null): boolean {
  const normalized = normalizeValue(roleName)
  return ADMIN_ROLE_NAMES.has(normalized) || normalized.includes('admin')
}

export function extractRoleNames(account?: AccountInfo | null): string[] {
  const roleNames = new Set<string>()

  if (!account?.roles?.length) {
    if (normalizeValue(account?.login) === 'admin') roleNames.add('admin')
    return Array.from(roleNames)
  }

  account.roles.forEach(role => {
    const normalized = normalizeValue(role?.name)
    if (!normalized) return
    roleNames.add(normalized)
    if (isAdminRoleName(normalized)) roleNames.add('admin')
  })

  if (normalizeValue(account?.login) === 'admin') roleNames.add('admin')

  return Array.from(roleNames)
}

export function extractPermissionTokensFromAccount(account?: AccountInfo | null): string[] {
  const tokens = new Set<string>()

  extractRoleNames(account).forEach(role => tokens.add(role))

  account?.roles?.forEach(role => {
    role?.permissions?.forEach(permission => {
      buildPermissionTokens(permission).forEach(token => tokens.add(token))
    })
  })

  return Array.from(tokens)
}

export function mergePermissionTokens(
  ...permissionLists: Array<string[] | null | undefined>
): string[] {
  const tokens = new Set<string>()

  permissionLists.forEach(permissionList => {
    ;(permissionList || []).forEach(permission => {
      const normalized = normalizeValue(permission)
      if (!normalized) return
      tokens.add(normalized)

      if (!normalized.includes(':')) {
        tokens.add(`${normalized}:view`)
      }
    })
  })

  if (tokens.has('admin') || tokens.has('role_admin')) {
    tokens.add('admin')
  }

  return Array.from(tokens)
}

export function getMenuRequirements(menuCode?: string | null): string[] {
  const normalized = normalizeValue(menuCode)
  const modulePermissions = getMenuPermissions(normalized)
  return modulePermissions.length ? modulePermissions : SPECIAL_MENU_REQUIREMENTS[normalized] || []
}

export function canAccessMenuCode(
  checkPermission: PermissionChecker,
  menuCode?: string | null
): boolean {
  const requirements = getMenuRequirements(menuCode)
  if (!requirements.length) return true
  return requirements.some(requirement => checkPermission(requirement))
}

export function filterAccessibleMenuGroups<
  T extends { code: string; hidden?: boolean; children?: Array<{ code: string }> }
>(groups: T[], checkPermission: PermissionChecker): T[] {
  return groups
    .filter(group => !group.hidden)
    .map(group => {
      const children = Array.isArray(group.children)
        ? group.children.filter(child => canAccessMenuCode(checkPermission, child.code))
        : []

      return {
        ...group,
        children
      }
    })
    .filter(group => Array.isArray(group.children) && group.children.length > 0)
}

export function getDefaultRouteForMenuCode(menuCode?: string | null): string {
  const normalized = normalizeValue(menuCode)
  return (
    getMenuDefaultRoute(normalized) ||
    SPECIAL_MENU_DEFAULT_ROUTES[normalized] ||
    (normalized ? `/${normalized}` : '/home')
  )
}

export function getGroupDefaultRoute(
  group: { children?: Array<{ code: string }> } | null | undefined,
  checkPermission: PermissionChecker
): string {
  const firstAccessibleChild = (group?.children || []).find(child =>
    canAccessMenuCode(checkPermission, child.code)
  )

  return getDefaultRouteForMenuCode(firstAccessibleChild?.code || 'home')
}

export function resolveMenuCodeFromRoutePath(path?: string | null): string | null {
  const normalizedPath = String(path || '').trim()
  if (!normalizedPath) return null

  const segments = normalizedPath.split('/').filter(Boolean)
  if (!segments.length) return 'home'

  const [first] = segments
  if (first === 'login' || first === 'about' || first.startsWith('error')) return null
  if (first === 'yum-repo' || first === 'software') return 'patches'

  return first || null
}

export function resolveMenuCodeFromRoute(
  route: Pick<RouteLocationNormalizedLoaded, 'path' | 'meta'> | { path?: string | null; meta?: any }
): string | null {
  if (route?.meta?.menuCode) {
    return route.meta.menuCode
  }
  return resolveMenuCodeFromRoutePath(route?.path)
}

export function extractAppletTokens(applets?: AppletInfo[] | null): string[] {
  const tokens = new Set<string>()

  ;(applets || []).forEach(applet => {
    const name = normalizeValue(applet?.name)
    if (!name) return

    const enabled = applet?._user_applet !== false
    const status = normalizeValue(applet?.status)
    if (!enabled) return
    if (status && !['p', 'o'].includes(status)) return

    tokens.add(`applet:${name}`)
  })

  return Array.from(tokens)
}
