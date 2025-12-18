import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import {
  fetchJobs,
  deleteJob as apiDeleteJob,
  deleteJobs as apiDeleteJobs,
  copyJob as apiCopyJob,
  moveJobs,
  type JobSummary,
  type JobType
} from '@/modules/automation/api/jobApi'

export interface JobFilters {
  type: JobType | 'all'
  appletCode: string
  keyword: string
}

export interface JobTypeOption {
  label: string
  value: JobType | ''
  icon: string
}

export const JOB_TYPE_OPTIONS: JobTypeOption[] = [
  { label: '全部类型', value: '', icon: 'fa-list' },
  { label: '脚本作业', value: 'script', icon: 'fa-file-alt' },
  { label: '命令作业', value: 'command', icon: 'fa-terminal' },
  { label: 'REST 作业', value: 'rest', icon: 'fa-cloud-upload' },
  // { label: '流程作业', value: 'process', icon: 'fa-random' }
]

export const useAutomationJobStore = defineStore('automation/jobs', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const jobs = ref<JobSummary[]>([])

  const filters = reactive<JobFilters>({
    type: 'all',
    appletCode: 'ALL',
    keyword: ''
  })

  const filteredJobs = computed(() => {
    const keyword = filters.keyword.trim().toLowerCase()

    return jobs.value.filter((job) => {
      if (filters.type !== 'all' && job.type !== filters.type) {
        return false
      }

      if (filters.appletCode && filters.appletCode !== 'ALL') {
        if (filters.appletCode === '__UNASSIGNED__') {
          if (job.appletCode) {
            return false
          }
        } else if (job.appletCode !== filters.appletCode) {
          return false
        }
      }

      if (!keyword) {
        return true
      }

      const haystack = [
        job.title,
        job.description,
        job.appletCode,
        job.updatedBy
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(keyword)
    })
  })

  async function loadJobs() {
    try {
      loading.value = true
      error.value = null

      const data = await fetchJobs({
        type: filters.type,
        appletCode: filters.appletCode === '__UNASSIGNED__' ? '' : filters.appletCode
      })

      jobs.value = Array.isArray(data) ? data : []
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载作业列表失败'
      error.value = message
      jobs.value = []
    } finally {
      loading.value = false
    }
  }

  async function deleteJobs(jobIds: string[]) {
    if (!jobIds.length) return

    if (jobIds.length === 1) {
      await apiDeleteJob(jobIds[0])
    } else {
      await apiDeleteJobs(jobIds)
    }

    await loadJobs()
  }

  async function duplicateJob(jobId: string) {
    if (!jobId) return
    await apiCopyJob(jobId)
    // await loadJobs()
  }

  async function moveSelected(jobIds: string[], targetApplet: string) {
    if (!jobIds.length || !targetApplet) return
    await moveJobs(jobIds, targetApplet)
    await loadJobs()
  }

  function setType(value: JobType | 'all') {
    filters.type = value
  }

  function setApplet(value: string) {
    filters.appletCode = value
  }

  function setKeyword(value: string) {
    filters.keyword = value
  }

  return {
    loading,
    error,
    jobs,
    filters,
    filteredJobs,
    loadJobs,
    deleteJobs,
    duplicateJob,
    moveSelected,
    setType,
    setApplet,
    setKeyword
  }
})
