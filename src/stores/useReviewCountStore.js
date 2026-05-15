import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fetchApproveList } from '@/modules/automation/api/jao.js'
import { findAllUnapprovedCommand } from '@/modules/automation/api/command.js'
import { listFiles } from '@/modules/automation/api/gfs.js'

/**
 * 审批中心待审批数量 store
 * 聚合作业审批、命令审核、脚本审核三类待处理数量
 */
export const useReviewCountStore = defineStore('reviewCount', () => {
  const approvalCount = ref(0)    // 作业审批：待审批数量
  const commandCount = ref(0)     // 命令审核：待审核数量
  const scriptCount = ref(0)      // 脚本审核：待审核数量
  const loading = ref(false)

  const totalCount = computed(() => approvalCount.value + commandCount.value + scriptCount.value)

  async function fetchApprovalCount() {
    try {
      const res = await fetchApproveList()
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
      // 状态为 0 表示待审批中
      approvalCount.value = list.filter(item => item.status === 0).length
    } catch {
      approvalCount.value = 0
    }
  }

  async function fetchCommandCount() {
    try {
      const res = await findAllUnapprovedCommand()
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
      commandCount.value = list.length
    } catch {
      commandCount.value = 0
    }
  }

  async function fetchScriptCount() {
    try {
      const files = await listFiles(null, '', 'stage')
      // stage 区中未被拒绝的文件（文件夹排除）视为待审核
      scriptCount.value = files.filter(f => !f.isDir && f.onlineStatus !== 'REJECTED').length
    } catch {
      scriptCount.value = 0
    }
  }

  async function fetchAll() {
    if (loading.value) return
    loading.value = true
    try {
      await Promise.allSettled([fetchApprovalCount(), fetchCommandCount(), fetchScriptCount()])
    } finally {
      loading.value = false
    }
  }

  return {
    approvalCount,
    commandCount,
    scriptCount,
    totalCount,
    loading,
    fetchAll,
    fetchApprovalCount,
    fetchCommandCount,
    fetchScriptCount
  }
})
