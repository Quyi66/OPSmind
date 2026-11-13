import { t } from '@/core/i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as jaoApi from '@/modules/automation/api/jao'
import { h } from 'vue'
import { getCronTaskConfirmation as taskName } from '@/modules/automation/utils/cronTaskPresentation'

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
        ElMessage.error(t('automation.schedule.noSchedule'))
        return
      }

      const content = []
      if (row.triggerStatus === '1') {
        // 停止任务
        content.push(h('div', t('automation.list.disableCronConfirm', { name: taskName(row) })))
      } else {
        // 启动任务
        content.push(h('div', t('automation.list.enableCronConfirm', { name: taskName(row) })))

        // 检查是否高频任务
        if (nextExecTimes.length >= 2) {
          const interval = calculateInterval(nextExecTimes[0], nextExecTimes[1])
          if (interval.isHighFrequency) {
            content.push(h('p', { style: { color: 'var(--el-color-warning)' } }, t('automation.list.highFrequencyHint')))
          }
        }

        // 显示下次执行时间
        content.push(h('p', t('automation.schedule.nextTimes')))
        nextExecTimes.slice(0, 5).forEach(time => {
          content.push(h('div', String(time)))
        })
      }

      await ElMessageBox.confirm(h('div', content), t('automation.list.confirmOperation'), {
        closeOnClickModal: false,
        closeOnPressEscape: false,
        confirmButtonText: t('automation.file.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      })

      row._switching = true
      try {
        if (row.triggerStatus === '1') {
          // 当前是启用状态，调用停止接口
          await jaoApi.stopCronJob(row.id)
          row.triggerStatus = '0'
          ElMessage.success(t('automation.cron.disabledNotice', { name: taskName(row) }))
        } else {
          // 当前是停用状态，调用启动接口
          await jaoApi.startCronJob(row.id)
          row.triggerStatus = '1'
          ElMessage.success(t('automation.cron.enabledNotice', { name: taskName(row) }))
        }
      } catch (error) {
        ElMessage.error(error?.message || t('automation.list.toggleFailed'))
        throw error
      }
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error?.message || t('automation.list.toggleFailed'))
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

    try {
      await ElMessageBox.confirm(
        t('automation.list.batchToggleConfirm', { count: selectedRows.length, tasks: selectedRows.map(taskName).join('\n') }),
        t('automation.list.batchToggle'),
        {
          closeOnClickModal: false,
          closeOnPressEscape: false,
          confirmButtonText: t('automation.file.confirm'),
          cancelButtonText: t('common.cancel'),
          type: 'warning'
        }
      )

      const statusData = selectedRows.reduce((obj, row) => {
        // 传递当前状态，后端会自动取反处理
        obj[row.id] = row.triggerStatus
        return obj
      }, {})

      await jaoApi.batchToggleCronJobs(statusData)
      ElMessage.success(t('automation.list.batchSucceeded'))
      refreshCallback()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error?.message || t('automation.list.batchFailed'))
      }
    }
  }

  /**
   * 立即执行一次任务
   */
  async function handleExecuteOnce(row) {
    try {
      await ElMessageBox.confirm(t('automation.cron.executeConfirm', { name: taskName(row) }), t('automation.list.confirmOperation'), {
        closeOnClickModal: false,
        closeOnPressEscape: false,
        confirmButtonText: t('automation.file.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      })

      await jaoApi.executeCronJob(row.id)
      ElMessage.success(t('automation.cron.executionTriggered', { name: taskName(row) }))
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error?.message || t('automation.list.cronFailed', { name: taskName(row) }))
      }
    }
  }

  /**
   * 复制任务
   */
  async function handleCopy(row) {
    try {
      await ElMessageBox.confirm(t('automation.list.copyCronConfirm', { name: taskName(row) }), t('automation.list.confirmOperation'), {
        closeOnClickModal: false,
        closeOnPressEscape: false,
        confirmButtonText: t('automation.file.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'info'
      })

      await jaoApi.copyCronJob(row.id)
      ElMessage.success(t('automation.workbench.copied'))
      refreshCallback()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error?.message || t('automation.workbench.copyFailed'))
      }
    }
  }

  /**
   * 删除任务
   */
  async function handleDelete(row) {
    try {
      await ElMessageBox.confirm(t('automation.workbench.deleteCronConfirm', { name: taskName(row) }), t('automation.list.confirmDelete'), {
        closeOnClickModal: false,
        closeOnPressEscape: false,
        confirmButtonText: t('automation.file.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      })

      await jaoApi.deleteCronJob(row.id)
      ElMessage.success(t('automation.list.cronDeleted', { name: taskName(row) }))
      refreshCallback()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error?.message || t('automation.workbench.deleteFailed'))
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
