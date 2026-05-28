import { ElMessage, ElMessageBox } from 'element-plus'
import * as jaoApi from '@/modules/automation/api/jao'

/**
 * CRON 任务操作行为
 * 处理启停、删除、复制、执行等操作
 */
export function useCronJobActions(refreshCallback) {
  /**
   * 查询下次执行时间
   */
  async function fetchNextExecutionTimes(scheduleConf) {
    try {
      const response = await jaoApi.queryNextExecutionTime(scheduleConf)
      const data = response.data || response
      if (data && data.length > 0 && data[0].next) {
        return data[0].next
      }
      return []
    } catch (error) {
      console.error('获取执行时间失败:', error)
      return []
    }
  }

  /**
   * 计算时间间隔
   */
  function calculateInterval(time1, time2) {
    const diff = new Date(time2).getTime() - new Date(time1).getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    let text = ''
    if (days >= 1) text += `${days}天`
    if (hours % 24 >= 1) text += `${hours % 24}时`
    if (minutes % 60 > 0) text += `${minutes % 60}分`
    if (seconds % 60 > 0) text += `${seconds % 60}秒`

    // 高频任务：间隔小于1小时且不包含"天"
    const isHighFrequency = hours < 1 && days === 0

    return { text, isHighFrequency }
  }

  /**
   * 启停任务状态切换
   */
  async function handleToggleStatus(row) {
    try {
      const nextExecTimes = await fetchNextExecutionTimes(row.scheduleConf)

      if (nextExecTimes.length === 0) {
        ElMessage.error('该任务没有执行计划，是否已禁用？')
        return
      }

      let content = ''
      if (row.triggerStatus === '1') {
        // 停止任务
        content = `停止ID为【${row.id}】定时任务`
      } else {
        // 启动任务
        content = `<div>启动ID为【${row.id}】定时任务</div>`

        // 检查是否高频任务
        if (nextExecTimes.length >= 2) {
          const interval = calculateInterval(nextExecTimes[0], nextExecTimes[1])
          if (interval.isHighFrequency) {
            content += `<div style="color: #f56c6c; font-weight: bold; margin-top: 12px;">当前CRON表达式为高频率执行,请谨慎!</div>`
          }
        }

        // 显示下次执行时间
        content += `<div style="margin-top: 16px;"><div style="font-weight: bold; margin-bottom: 8px;">下次执行时间</div>`
        nextExecTimes.slice(0, 5).forEach(time => {
          content += `<div>${time}</div>`
        })
        content += `</div>`
      }

      await ElMessageBox.confirm(content, '确认操作', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
        dangerouslyUseHTMLString: true
      })

      row._switching = true
      try {
        if (row.triggerStatus === '1') {
          // 当前是启用状态，调用停止接口
          await jaoApi.stopCronJob(row.id)
          row.triggerStatus = '0'
          ElMessage.success(`停止ID为【${row.id}】定时任务`)
        } else {
          // 当前是停用状态，调用启动接口
          await jaoApi.startCronJob(row.id)
          row.triggerStatus = '1'
          ElMessage.success(`启动ID为【${row.id}】定时任务`)
        }
      } catch (error) {
        ElMessage.error(error?.message || '状态切换失败')
        throw error
      }
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error?.message || '状态切换失败')
      }
    } finally {
      row._switching = false
    }
  }

  /**
   * 批量启停任务
   */
  async function handleBatchToggle(selectedRows) {
    if (!selectedRows.length) return

    const ids = selectedRows.map(r => r.id).join(', ')

    try {
      await ElMessageBox.confirm(
        `确定要批量启停选中的 ${selectedRows.length} 个任务吗？<br/>ID: ${ids}`,
        '批量启停',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
          dangerouslyUseHTMLString: true
        }
      )

      const statusData = selectedRows.reduce((obj, row) => {
        // 传递当前状态，后端会自动取反处理
        obj[row.id] = row.triggerStatus
        return obj
      }, {})

      await jaoApi.batchToggleCronJobs(statusData)
      ElMessage.success('批量操作成功')
      refreshCallback()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error?.message || '批量操作失败')
      }
    }
  }

  /**
   * 立即执行一次任务
   */
  async function handleExecuteOnce(row) {
    try {
      await ElMessageBox.confirm(`确定要立即执行一次任务 ID: ${row.id} 吗？`, '确认操作', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })

      await jaoApi.executeCronJob(row.id)
      ElMessage.success(`任务 ${row.id} 执行成功`)
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error?.message || `任务 ${row.id} 执行失败`)
      }
    }
  }

  /**
   * 复制任务
   */
  async function handleCopy(row) {
    try {
      await ElMessageBox.confirm('确定要复制该定时任务吗？', '确认操作', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      })

      await jaoApi.copyCronJob(row.id)
      ElMessage.success('复制成功')
      refreshCallback()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error?.message || '复制失败')
      }
    }
  }

  /**
   * 删除任务
   */
  async function handleDelete(row) {
    try {
      await ElMessageBox.confirm(`确定要删除定时任务 ID: ${row.id} 吗？`, '确认删除', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })

      await jaoApi.deleteCronJob(row.id)
      ElMessage.success(`任务 ${row.id} 已删除`)
      refreshCallback()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error?.message || '删除失败')
      }
    }
  }

  return {
    handleToggleStatus,
    handleBatchToggle,
    handleExecuteOnce,
    handleCopy,
    handleDelete,
    fetchNextExecutionTimes
  }
}
