import { apiService } from '@/core/api'

export type JobType = 'script' | 'command' | 'rest' | 'process'

export interface JobQuery {
  type?: JobType | 'all'
  appletCode?: string
  keyword?: string
}

export interface JobSummary {
  id: string
  title: string
  description?: string
  type?: JobType | string
  appletCode?: string | null
  updatedBy?: string
  updatedAt?: string | number | Date
  lastRunTime?: string | number | Date
  [key: string]: unknown
}

function buildQueryString(params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === 'string' && value.trim() !== '') {
      searchParams.append(key, value)
    }
  })

  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

function buildDeleteIdsParam(jobIds: string[]) {
  return JSON.stringify(jobIds.filter((id) => typeof id === 'string' && id.trim() !== ''))
}

export async function fetchJobs(query: JobQuery = {}): Promise<JobSummary[]> {
  const { type, appletCode, keyword } = query
  const normalizedType = type && type !== 'all' ? type : undefined
  const normalizedApplet = appletCode && appletCode !== 'ALL' ? appletCode : undefined

  const queryString = buildQueryString({
    type: normalizedType,
    appletCode: normalizedApplet,
    keyword: keyword?.trim()
  })

  const response = await apiService.get(`/workflow/api/workflow/jobs/app${queryString}`)
  const data = response?.data

  if (Array.isArray(data)) {
    return data as JobSummary[]
  }

  if (data?.content && Array.isArray(data.content)) {
    return data.content as JobSummary[]
  }

  return []
}

export async function deleteJob(jobId: string): Promise<void> {
  if (!jobId) return
  await deleteJobs([jobId])
}

export async function deleteJobs(jobIds: string[]): Promise<void> {
  if (!jobIds.length) return
  const ids = buildDeleteIdsParam(jobIds)
  if (!ids || ids === '[]') return

  await apiService.delete('/workflow/api/workflow/jobs/delete-batch', {
    params: {
      ids
    }
  })
}

export async function copyJob(jobId: string): Promise<void> {
  if (!jobId) return
  await apiService.get(`/workflow/api/workflow/jobs/clone/${encodeURIComponent(jobId)}`)
}

export async function moveJobs(jobIds: string[], targetApplet: string): Promise<void> {
  if (!jobIds.length || !targetApplet) return
  const payload = jobIds.map((id) => ({ id }))
  await apiService.put(`/workflow/api/workflow/jobs/move/${encodeURIComponent(targetApplet)}`, payload)
}

export async function fetchRunLogs(params: Record<string, string | number | undefined> = {}) {
  const queryString = buildQueryString(
    Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, value?.toString()])
    )
  )
  const response = await apiService.get(`/workflow/api/workflow/runlogs${queryString}`)
  return response?.data ?? []
}
