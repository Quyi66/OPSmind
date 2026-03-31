import { apiService } from '@/core/api'

export interface UserAppletInfo {
  id?: string
  name: string
  title?: string | null
  description?: string | null
  status?: string | null
  tenantId?: string | null
  tenantUserId?: string | null
  login?: string | null
  _user_applet?: boolean
}

const STORAGE_KEY = 'oplus_user_applets'

function readCache(): UserAppletInfo[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeCache(data: UserAppletInfo[], persist: boolean = false): void {
  try {
    const json = JSON.stringify(data)
    if (persist) {
      localStorage.setItem(STORAGE_KEY, json)
      sessionStorage.removeItem(STORAGE_KEY)
      return
    }

    sessionStorage.setItem(STORAGE_KEY, json)
  } catch {}
}

function clearCache(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

function normalizeApplets(data: unknown): UserAppletInfo[] {
  if (!Array.isArray(data)) return []

  return data.filter(item => item && typeof item === 'object') as UserAppletInfo[]
}

export const appletService = {
  getCached(): UserAppletInfo[] {
    return readCache()
  },

  setCache(data: UserAppletInfo[], persist: boolean = false): void {
    writeCache(normalizeApplets(data), persist)
  },

  clear(): void {
    clearCache()
  },

  async getUserApplets(
    account?: { login?: string | null; tenantUserId?: string | null } | null,
    options?: { forceRefresh?: boolean; persist?: boolean }
  ): Promise<UserAppletInfo[]> {
    const forceRefresh = !!options?.forceRefresh
    const persist = !!options?.persist

    if (!forceRefresh) {
      const cached = readCache()
      if (cached.length) return cached
    }

    const login = String(account?.login || '').trim()
    const tenantUserId = String(account?.tenantUserId || '').trim()
    if (!login || !tenantUserId) return []

    try {
      const response = await apiService.get(
        `/udp/api/udp/applets/tenant/user?cacheBuster=${Date.now()}&login=${encodeURIComponent(login)}&tenantUserId=${encodeURIComponent(tenantUserId)}`,
        { cache: false }
      )
      const applets = normalizeApplets(response?.data || response)
      writeCache(applets, persist)
      return applets
    } catch {
      return readCache()
    }
  }
}

export type { UserAppletInfo as AppletInfo }
