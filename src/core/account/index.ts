/**
 * Account Service
 * - Fetches current account from backend: /oplus-portal/api/account
 * - Caches the payload in storage for reuse across views
 */

import { apiService } from '@/core/api'

export interface AccountRolePermission {
  id: string
  domain: string
  action: string
  target: string
  description?: string
  configJson?: any
  extraConfig?: any
}

export interface AccountRoleUserRef {
  id: string
  tenantId: string
  tenantUserId: string
  login: string
  fullName?: string
}

export interface AccountRole {
  id: string
  name: string
  visibility?: string
  description?: string
  users?: AccountRoleUserRef[] | null
  permissions?: AccountRolePermission[] | null
}

export interface AccountInfo {
  id: string
  tenantId: string
  tenantUserId?: string
  login: string
  fullName?: string
  authMode?: string
  department?: string | null
  email?: string | null
  mobile?: string | null
  telephoneNumber?: string | null
  imageUrl?: string | null
  activated?: boolean
  langKey?: string
  createdBy?: string
  createdDate?: string
  lastModifiedBy?: string
  lastModifiedDate?: string
  roles?: AccountRole[] | null
  tenantCodes?: string[] | null
  qrcodeImagePath?: string | null
}

const STORAGE_KEY = 'oplus_account'

function readCache(): AccountInfo | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as AccountInfo
    if (data && data.login) return data
  } catch {}
  return null
}

function writeCache(data: AccountInfo, persist: boolean = false): void {
  try {
    const json = JSON.stringify(data)
    if (persist) localStorage.setItem(STORAGE_KEY, json)
    else sessionStorage.setItem(STORAGE_KEY, json)
  } catch {}
}

function clearCache(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

async function fetchAccount(): Promise<AccountInfo | null> {
  try {
    const account = await apiService.getAccount()
    return account || null
  } catch {
    return null
  }
}

export const accountService = {
  /**
   * 获取账户信息（优先缓存，可强制刷新）
   */
  async getAccount(options?: { forceRefresh?: boolean; persist?: boolean }): Promise<AccountInfo | null> {
    const force = !!options?.forceRefresh
    const persist = !!options?.persist

    if (!force) {
      const cached = readCache()
      if (cached) return cached
    }

    const fresh = await fetchAccount()
    if (fresh) writeCache(fresh, persist)
    return fresh
  },

  /** 直接读取缓存（不发请求） */
  getCached(): AccountInfo | null {
    return readCache()
  },

  /** 设置缓存（外部已有数据时） */
  setCache(data: AccountInfo, persist: boolean = false): void {
    writeCache(data, persist)
  },

  /** 清除缓存（登出时调用） */
  clear(): void {
    clearCache()
  }
}

export type { AccountInfo }

