<template>
  <el-popover
    ref="popoverRef"
    :visible="visible"
    placement="bottom-end"
    :width="360"
    trigger="click"
    popper-class="notification-popover"
    @update:visible="handleVisibleChange"
  >
    <template #reference>
      <slot></slot>
    </template>

    <div class="notification-panel" @click.stop>
      <!-- 消息列表 -->
      <div class="notification-body" v-loading="loading">
        <!-- 有消息时 -->
        <template v-if="messages.length > 0">
          <div
            v-for="msg in messages"
            :key="msg.id"
            class="notification-item"
          >
            <!-- 发送者 -->
            <div class="notification-item-header">
              <span class="notification-sender">From: {{ msg.addresserName }}</span>
              <span
                class="status-dot"
                :class="msg.status === 0 ? 'is-unread' : 'is-read'"
              ></span>
            </div>

            <!-- 时间 -->
            <div class="notification-time">{{ msg.createAt }}</div>

            <!-- 内容 -->
            <div class="notification-content">{{ msg.content }}</div>

            <!-- 操作按钮 -->
            <div class="notification-actions">
              <el-button
                v-if="msg.status === 0"
                size="small"
                @click="handleIgnore(msg)"
              >
                忽略
              </el-button>
              <el-button
                :type="msg.status === 0 ? 'primary' : 'default'"
                size="small"
                @click="handleProcess(msg)"
              >
                {{ msg.status === 0 ? '立即处理' : '查看' }}
              </el-button>
            </div>
          </div>

          <!-- 加载更多 -->
          <div v-if="hasMore" class="load-more">
            <el-button type="primary" link @click="fetchMoreMessages" :loading="loadingMore">
              加载更多
            </el-button>
          </div>
          <div v-else class="no-more">
            <span>没有更多消息了</span>
          </div>
        </template>

        <!-- 无消息时 -->
        <div v-else class="empty-state">
          <p>暂无消息</p>
          <el-button type="primary" link @click="loadHistoryMessages">
            查看历史消息
          </el-button>
        </div>
      </div>
    </div>
  </el-popover>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchMessages, handleMessage } from '@/core/api/notification.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'count-change'])

const popoverRef = ref(null)
const loading = ref(false)
const loadingMore = ref(false)
const messages = ref([])
const hasMore = ref(true)
const pageNum = ref(1)
const pageSize = ref(5)

// 获取消息列表
const loadMessages = async (page = 1, size = 5, isNew = false) => {
  try {
    const {data} = await fetchMessages(page, size)
    const newMessages = data || []

    if (isNew) {
      // 新消息插入到头部（轮询用）
      const existingIds = messages.value.map(m => m.id)
      const diff = newMessages.filter(m => !existingIds.includes(m.id))
      messages.value.unshift(...diff)
    } else {
      // 加载更多追加到尾部
      const existingIds = messages.value.map(m => m.id)
      const diff = newMessages.filter(m => !existingIds.includes(m.id))
      messages.value.push(...diff)
    }

    // 判断是否还有更多
    if (newMessages.length < size) {
      hasMore.value = false
    }

    // 更新未读数量
    const unreadCount = messages.value.filter(m => m.status === 0).length
    emit('count-change', unreadCount)

  } catch (error) {
    console.error('获取通知失败:', error)
  }
}

// 初始加载
const initLoad = async () => {
  loading.value = true
  messages.value = []
  pageNum.value = 1
  hasMore.value = true

  try {
    await loadMessages(1, pageSize.value, false)
  } finally {
    loading.value = false
  }
}

// 加载更多
const fetchMoreMessages = async () => {
  loadingMore.value = true

  try {
    // 计算正确的页码
    const currentSize = pageSize.value + (messages.value.length % pageSize.value)
    pageNum.value = Math.floor(messages.value.length / currentSize) + 1

    await loadMessages(pageNum.value, currentSize, false)
  } finally {
    loadingMore.value = false
  }
}

// 查看历史消息
const loadHistoryMessages = async () => {
  loading.value = true
  try {
    await loadMessages(pageNum.value, pageSize.value, false)
  } finally {
    loading.value = false
  }
}

// 处理忽略（仅标记已读，不跳转）
const handleIgnore = async (msg) => {
  if (msg.status === 0) {
    try {
      await handleMessage(msg.id)
      msg.status = 1
      const unreadCount = messages.value.filter(m => m.status === 0).length
      emit('count-change', unreadCount)
    } catch (error) {
      console.warn('标记已读失败:', error)
    }
  }
}

// 处理立即处理/查看（标记已读）
const handleProcess = async (msg) => {
  // 先标记为已读
  if (msg.status === 0) {
    try {
      await handleMessage(msg.id)
      msg.status = 1
      const unreadCount = messages.value.filter(m => m.status === 0).length
      emit('count-change', unreadCount)
    } catch (error) {
      console.warn('标记已读失败:', error)
    }
  }

  // 处理链接跳转
  // 注意：由于 Vue 系统路由与原 Angular 系统不兼容，internal 链接暂不支持跳转
  if (msg.linkType === 'external' && msg.link) {
    window.open(msg.link, '_blank')
    emit('update:visible', false)
  } else {
    // internal 类型或无链接的消息，仅标记已读，不跳转
    // 后续可根据需要添加 Vue 路由映射
    ElMessage.success('已标记为已读')
  }
}

// 处理弹窗显隐
const handleVisibleChange = (val) => {
  emit('update:visible', val)
  if (val) {
    initLoad()
  }
}

// 暴露刷新方法供外部调用
defineExpose({
  refresh: initLoad
})
</script>

<style lang="scss">
.notification-popover {
  padding: 0 !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12) !important;
}
</style>

<style scoped lang="scss">
.notification-panel {
  display: flex;
  flex-direction: column;
}

.notification-body {
  max-height: 480px;
  min-height: 200px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 2px;
  }
}

.notification-item {
  position: relative;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;

  &:last-child {
    border-bottom: none;
  }
}

.notification-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.notification-sender {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;

  &.is-unread {
    background-color: #ef4444;
  }

  &.is-read {
    background-color: #9ca3af;
  }
}

.notification-time {
  font-size: 13px;
  color: #3b82f6;
  margin-bottom: 8px;
}

.notification-content {
  font-size: 14px;
  color: #374151;
  line-height: 1.5;
  margin-bottom: 12px;
}

.notification-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.load-more,
.no-more {
  padding: 12px;
  text-align: center;
}

.no-more {
  color: #9ca3af;
  font-size: 13px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #9ca3af;

  p {
    margin-bottom: 12px;
    font-size: 14px;
  }
}
</style>
