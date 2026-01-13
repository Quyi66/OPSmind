/**
 * 通知消息 API 服务
 * 参照 oplus-modules/src/webapp/app/modules/mac/api/message.api.js
 */

import { apiService } from './index.js'

/**
 * 获取新消息数量
 * @param {number} lastTimestamp 上次轮询时间戳
 * @returns {Promise<number>} 新消息数量
 */
export async function fetchNewMessagesCount(lastTimestamp = 0) {
  try {
    const cacheBuster = Date.now()
    const response = await apiService.get(
      `/mac/api/mac/messages/count`,
      {
        params: {
          lastTimestamp,
          cacheBuster
        }
      }
    )
    return response || 0
  } catch (error) {
    console.error('获取新消息数量失败:', error)
    return 0
  }
}

/**
 * 分页获取消息列表
 * @param {number} pageNum 页码，默认 1
 * @param {number} pageSize 每页数量，默认 5
 * @returns {Promise<Array>} 通知列表
 */
export async function fetchMessages(pageNum = 1, pageSize = 5) {
  const cacheBuster = Date.now()

  try {
    const response = await apiService.get(
      `/mac/api/mac/messages`,
      {
        params: {
          pageNum,
          pageSize,
          cacheBuster
        }
      }
    )
    return response || []
  } catch (error) {
    console.error('获取通知消息失败:', error)
    throw error
  }
}

/**
 * 处理消息（标记为已读）
 * @param {string} messageId 消息 ID
 * @returns {Promise<void>}
 */
export async function handleMessage(messageId) {
  try {
    await apiService.put(`/mac/api/mac/messages/${messageId}`)
  } catch (error) {
    console.error('处理消息失败:', error)
    throw error
  }
}

// 兼容旧接口名称
export const getMessages = fetchMessages
export const markAsRead = handleMessage

// 导出默认对象
export default {
  fetchNewMessagesCount,
  fetchMessages,
  handleMessage,
  getMessages,
  markAsRead
}
