<template>
  <div class="ai-assistant">
    <!-- 操作提示横幅 -->
    <div class="assistant-banner">
      <div class="banner-content">
        <div class="robot-icon">
          <i class="fas fa-robot"></i>
        </div>
        <div class="banner-text">
          <h3 class="banner-title">OPS智能助手，很高兴为您服务</h3>
        </div>
      </div>
      <div class="search-container">
        <div class="search-input-wrapper">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="问我想要做的地方"
            class="search-input"
            @keyup.enter="handleSearch"
          >
          <button
            @click="handleSearch"
            class="search-btn"
            :disabled="!searchQuery.trim()"
          >
            <i class="fas fa-search"></i>
          </button>
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
  padding: 12px 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.assistant-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f8f9fa;
  border-radius: 10px;
  padding: 10px 16px;
  gap: 16px;
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 2;
}

.robot-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #2D8CF0 0%, #19BE6B 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  i {
    font-size: 14px;
    color: white;
  }
}

.banner-text {
  flex: 1;
}

.banner-title {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  margin: 0;
  line-height: 1.3;
}

.search-container {
  flex: 3;
  display: flex;
  justify-content: flex-end;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid #d9d9d9;
  border-radius: 16px;
  padding: 5px 10px;
  width: 100%;
  max-width: 280px;
  height: 32px;
  transition: border-color 0.3s ease;

  &:focus-within {
    border-color: #2D8CF0;
    box-shadow: 0 0 0 2px rgba(45, 140, 240, 0.1);
  }
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: #262626;
  padding: 0;

  &::placeholder {
    color: #8c8c8c;
  }
}

.search-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  margin-left: 8px;
  color: #8c8c8c;
  transition: color 0.3s ease;

  &:hover:not(:disabled) {
    color: #2D8CF0;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  i {
    font-size: 14px;
  }
}

// 响应式设计
@media (max-width: 1024px) {
  .assistant-banner {
    flex-direction: column;
    gap: 16px;
  }

  .search-input-wrapper {
    min-width: 100%;
  }
}

@media (max-width: 768px) {
  .ai-assistant {
    padding: 16px;
  }

  .assistant-banner {
    padding: 12px 16px;
  }

  .robot-icon {
    width: 36px;
    height: 36px;

    i {
      font-size: 16px;
    }
  }

  .banner-title {
    font-size: 14px;
  }

  .search-input-wrapper {
    padding: 6px 10px;
  }

  .search-input {
    font-size: 13px;
  }
}
</style>
