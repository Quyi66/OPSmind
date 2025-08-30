<template>
  <div class="ai-assistant">
    <!-- 智能助手横幅 -->
    <div class="assistant-banner">
      <!-- 左侧：图标与文字 -->
      <div class="banner-left">
        <img src="@/assets/icons/aiOPS2@2x.png" alt="AI助手" class="ai-ops-icon" />
        <div class="banner-text">
          <h3 class="banner-title">OPS智能助手，很高兴为你服务</h3>
          <p class="banner-subtitle">为运维人员设计的助手Agent，帮助解决系统维护问题。</p>
        </div>
      </div>

      <!-- 右侧：搜索栏 -->
      <div class="search-container">
        <div class="search-input-wrapper">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="问我想要做的地方"
            class="search-input"
            @keyup.enter="handleSearch"
          />
          <button @click="handleSearch" class="search-btn" :disabled="!searchQuery.trim()">
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

// 处理聊天记录点击（预留功能）
// const handleChatClick = chat => {
//   searchQuery.value = chat.question
//   ElMessage.info(`重新提问: ${chat.question}`)
// }
</script>

<style scoped lang="scss">
.ai-assistant {
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.assistant-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f8f9fa;
  border-radius: 10px;
  padding: 12px 16px;
  gap: 20px;
  height: 100%;
}

.banner-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.ai-ops-icon {
  width: 40px;
  height: 40px;
  object-fit: contain;
  flex-shrink: 0;
}

.banner-text {
  flex: 1;
}

.banner-title {
  font-size: 16px;
  font-weight: 700;
  color: #262626;
  margin: 0 0 4px 0;
  line-height: 1.2;
}

.banner-subtitle {
  font-size: 12px;
  font-weight: 400;
  color: #8c8c8c;
  margin: 0;
  line-height: 1.3;
}

.search-container {
  flex: 2;
  display: flex;
  justify-content: flex-end;
  padding-left: 16px;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid #d9d9d9;
  border-radius: 12px;
  padding: 8px 16px;
  width: 100%;
  min-width: 280px;
  height: 40px;
  transition: border-color 0.3s ease;

  &:focus-within {
    border-color: #2d8cf0;
    box-shadow: 0 0 0 2px rgba(45, 140, 240, 0.1);
  }
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 15px;
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
    color: #2d8cf0;
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
    align-items: flex-start;
    gap: 16px;
  }

  .banner-left {
    width: 100%;
  }

  .search-container {
    width: 100%;
    justify-content: stretch;
    padding-left: 0;
  }

  .search-input-wrapper {
    width: 100%;
    min-width: auto;
  }
}

@media (max-width: 768px) {
  .ai-assistant {
    padding: 0;
  }

  .assistant-banner {
    padding: 12px 16px;
  }

  .ai-ops-icon {
    width: 36px;
    height: 36px;
  }

  .banner-title {
    font-size: 15px;
  }

  .banner-subtitle {
    font-size: 11px;
  }

  .search-input-wrapper {
    padding: 8px 12px;
    height: 40px;
  }

  .search-input {
    font-size: 14px;
  }
}
</style>
