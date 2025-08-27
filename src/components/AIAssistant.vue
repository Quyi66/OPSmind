<template>
  <div class="ai-assistant">
    <div class="flex items-center space-x-3 mb-4">
      <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
        <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <div>
        <h3 class="font-medium text-gray-900">OPS智能助手，很高兴为你服务</h3>
        <p class="text-sm text-gray-500">为运维人员设计的助手Agent，帮助解决系统维护问题。</p>
      </div>
    </div>
    
    <div class="bg-gray-50 rounded-lg p-3 mb-3">
      <input 
        v-model="searchQuery"
        type="text" 
        placeholder="问我想要做的地方" 
        class="w-full bg-transparent text-sm text-gray-700 placeholder-gray-400 border-none outline-none"
        @keyup.enter="handleSearch"
      >
    </div>
    
    <div class="flex justify-end">
      <button 
        @click="handleSearch"
        class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
        :disabled="!searchQuery.trim()"
      >
        <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
        </svg>
      </button>
    </div>

    <!-- 快捷操作 -->
    <div v-if="quickActions.length > 0" class="mt-4">
      <h4 class="text-xs font-medium text-gray-500 mb-2">快捷操作</h4>
      <div class="space-y-2">
        <button
          v-for="action in quickActions"
          :key="action.id"
          @click="handleQuickAction(action)"
          class="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <i :class="action.icon" class="mr-2"></i>
          {{ action.label }}
        </button>
      </div>
    </div>

    <!-- 最近对话 -->
    <div v-if="recentChats.length > 0" class="mt-4">
      <h4 class="text-xs font-medium text-gray-500 mb-2">最近对话</h4>
      <div class="space-y-1">
        <div
          v-for="chat in recentChats"
          :key="chat.id"
          class="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
          @click="handleChatClick(chat)"
        >
          <div class="truncate">{{ chat.question }}</div>
          <div class="text-xs text-gray-400 mt-1">{{ chat.time }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

// 搜索查询
const searchQuery = ref('')

// 快捷操作
const quickActions = ref([
  {
    id: 1,
    label: '检查系统状态',
    icon: 'fa fa-heartbeat'
  },
  {
    id: 2,
    label: '查看错误日志',
    icon: 'fa fa-exclamation-triangle'
  },
  {
    id: 3,
    label: '性能监控',
    icon: 'fa fa-chart-line'
  },
  {
    id: 4,
    label: '重启服务',
    icon: 'fa fa-refresh'
  }
])

// 最近对话
const recentChats = ref([
  {
    id: 1,
    question: '如何查看服务器CPU使用率？',
    time: '2分钟前'
  },
  {
    id: 2,
    question: '数据库连接异常怎么处理？',
    time: '10分钟前'
  },
  {
    id: 3,
    question: '如何配置负载均衡？',
    time: '1小时前'
  }
])

// 事件处理
const handleSearch = () => {
  if (!searchQuery.value.trim()) {
    ElMessage.warning('请输入您的问题')
    return
  }
  
  ElMessage.info(`正在处理您的问题: ${searchQuery.value}`)
  // 这里可以调用AI助手API
  console.log('AI Assistant Query:', searchQuery.value)
  
  // 模拟添加到最近对话
  recentChats.value.unshift({
    id: Date.now(),
    question: searchQuery.value,
    time: '刚刚'
  })
  
  // 限制最近对话数量
  if (recentChats.value.length > 5) {
    recentChats.value = recentChats.value.slice(0, 5)
  }
  
  searchQuery.value = ''
}

const handleQuickAction = (action) => {
  ElMessage.info(`执行操作: ${action.label}`)
  console.log('Quick Action:', action)
}

const handleChatClick = (chat) => {
  searchQuery.value = chat.question
  ElMessage.info(`重新提问: ${chat.question}`)
}
</script>

<style scoped lang="scss">
.ai-assistant {
  height: 100%;
  display: flex;
  flex-direction: column;
}

// 响应式设计
@media (max-width: 768px) {
  .ai-assistant {
    padding: 12px;
  }
}
</style>
