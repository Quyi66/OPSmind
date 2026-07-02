/**
 * ACM Automation service
 * - Batch update managed devices passwords via Excel upload (form-data)
 */

import { apiService } from '@/core/api'
import type { BatchUpdateResult } from '@/types/acm'

const BATCH_UPDATE_URL = '/cmdb/api/cmdb/auto/password/batch-update'

export async function batchUpdateDevicePasswords(
  file: File,
  onProgress?: (percent: number) => void
): Promise<BatchUpdateResult> {
  // Leverage apiService.upload which posts FormData('file', file)
  const res = await apiService.upload(BATCH_UPDATE_URL, file, onProgress || null)
  return res?.data as BatchUpdateResult
}

export default {
  batchUpdateDevicePasswords
}
