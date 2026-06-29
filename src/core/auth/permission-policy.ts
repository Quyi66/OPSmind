import type { RouteLocationNormalizedLoaded } from 'vue-router'
import type { AccountInfo, AccountRolePermission } from '@/core/account'
import type { AppletInfo } from '@/core/applet'

type PermissionChecker = (permission: string) => boolean

const ADMIN_ROLE_NAMES = new Set(['admin', 'role_admin', 'role_super_admin', 'super_admin'])

const WINDOWS_PATCH_ROUTE_ALIASES: Record<string, string> = {
  windowsUpdate: 'windowsVulnerability',
  windowsView: 'windowsRollback'
}

const WINDOWS_PATCH_PATHS = new Set([
  'windowsVulnerability',
  'windowsWsus',
  'windowsRollback',
  'windowsCveList'
])

export const MENU_ACCESS_REQUIREMENTS: Record<string, string[]> = {
  home: [],
  dashboard: [],
  settings: [],
  aiops: [],
  'auto-workbench': ['jao:view', 'gfs:view', 'cmd:view'],
  jao: ['jao:view'],
  'task-scheduler': ['jao:view'],
  gfs: ['gfs:view'],
  cmd: ['cmd:view'],
  'review-center': ['jao:view', 'gfs:view', 'cmd:view'],
  patches: ['applet:vap'],
  'windows-patches': ['applet:vap'],
  'patch-logs': ['applet:vap'],
  'patch-process-logs': ['applet:vap'],
  'yum-repo': ['applet:spm', 'applet:vap'],
  software: ['applet:spm', 'applet:vap'],
  cac: ['applet:cac'],
  acm: ['applet:acm'],
  users: ['applet:uim'],
  flow: ['applet:flow'],
  sudo: ['applet:sudo'],
  password: ['applet:pmsv2'],
  uam: ['applet:uim'],
  ssc: ['applet:uim'],
  admin: ['applet:uim'],
  'super-admin': ['admin']
}

export const MENU_DEFAULT_ROUTES: Record<string, string> = {
  home: '/home',
  settings: '/settings',
  'auto-workbench': '/auto-workbench/overview',
  jao: '/jao/jobs',
  'task-scheduler': '/jao/taskScheduler',
  gfs: '/gfs/scriptLibrary',
  cmd: '/cmd/list',
  patches: '/patches/cveList',
  'windows-patches': '/patches/windowsVulnerability',
  'patch-logs': '/patches/logs',
  'patch-process-logs': '/patches/processLogs',
  'yum-repo': '/yum-repo/repos',
  software: '/yum-repo/repos',
  cac: '/cac/overview',
  acm: '/acm/overview',
  users: '/users/users',
  flow: '/flow/list',
  sudo: '/sudo/permission',
  password: '/password/application',
  uam: '/uam/user',
  ssc: '/ssc/applet',
  admin: '/admin/assets/auto-config',
  aiops: '/aiops'
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
  return MENU_ACCESS_REQUIREMENTS[normalizeValue(menuCode)] || []
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
  return MENU_DEFAULT_ROUTES[normalized] || (normalized ? `/${normalized}` : '/home')
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

  const [first, second] = segments

  if (first === 'jao' && second === 'taskScheduler') {
    return 'task-scheduler'
  }

  if (first === 'patches') {
    const normalizedPatchPath = WINDOWS_PATCH_ROUTE_ALIASES[second || ''] || second || ''

    if (second === 'windowsYumRepo' || second === 'linuxYumManage') return 'yum-repo'
    if (second === 'logs') return 'patch-logs'
    if (second === 'processLogs') return 'patch-process-logs'
    if (WINDOWS_PATCH_PATHS.has(normalizedPatchPath)) return 'windows-patches'
    return 'patches'
  }

  if (first === 'yum-repo') {
    return 'yum-repo'
  }
  if (first === 'software') {
    return 'yum-repo'
  }
  if (first === 'admin') return 'admin'
  if (first === 'login' || first === 'about' || first.startsWith('error')) return null

  return first || null
}

export function resolveMenuCodeFromRoute(
  route: Pick<RouteLocationNormalizedLoaded, 'path'> | { path?: string | null }
): string | null {
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
