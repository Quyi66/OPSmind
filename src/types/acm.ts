/**
 * ACM related types
 */

export interface BatchUpdateItem {
  rowNum: number
  hostIp: string
  ciId?: string | null
  hostname?: string | null
  status: 'success' | 'fail' | string
  message?: string | null
}

export interface BatchUpdateResult {
  total: number
  successCount: number
  failCount: number
  successList: BatchUpdateItem[]
  failList: BatchUpdateItem[]
}

