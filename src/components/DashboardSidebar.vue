<template>
  <div class="dashboard-sidebar">
    <!-- 欢迎信息区域 -->
    <div class="welcome-section">
      <div class="user-avatar">
        <img :src="userInfo.avatar" :alt="userInfo.name" />
      </div>
      <div class="welcome-content">
        <h3 class="welcome-title">{{ userInfo.greeting }}</h3>
        <p class="welcome-subtitle">{{ userInfo.subtitle }}</p>
      </div>
    </div>

    <!-- 我的待办区域 -->
    <div class="todo-section">
      <div class="section-header">
        <h4 class="section-title">我的待办</h4>
        <el-button type="text" size="small" @click="viewAllTodos">查看全部</el-button>
      </div>
      <div class="todo-list">
        <div
          v-for="todo in todoList"
          :key="todo.id"
          class="todo-item"
        >
          <div class="todo-indicator" :class="todo.priority"></div>
          <div class="todo-content">
            <div class="todo-title">{{ todo.title }}</div>
            <div class="todo-meta">
              <span class="todo-source">{{ todo.source }}</span>
              <span class="todo-time">{{ todo.time }}</span>
            </div>
          </div>
          <el-button
            type="primary"
            size="small"
            class="todo-action-btn"
            @click="handleTodoProcess(todo)"
          >
            立即处理
          </el-button>
        </div>
      </div>
    </div>

    <!-- 最近使用区域 -->
    <div class="recent-section">
      <div class="section-header">
        <h4 class="section-title">最近使用</h4>
      </div>
      <div class="recent-grid">
        <div
          v-for="item in recentItems"
          :key="item.id"
          class="recent-item"
          @click="handleRecentClick(item)"
        >
          <div class="recent-icon">
            <i :class="item.icon"></i>
          </div>
          <span class="recent-name">{{ item.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElButton, ElMessage } from 'element-plus'

// 用户信息
const userInfo = ref({
  name: '管理员',
  avatar: 'https://via.placeholder.com/60x60/667eea/ffffff?text=管',
  greeting: '管理员下午好，欢迎登录',
  subtitle: '今天是2025-07-16 星期三'
})

// 待办事项列表
const todoList = ref([
  {
    id: 1,
    title: '您有新的系统通知，请及时查看',
    source: 'system',
    time: '2025-07-14 10:52:34',
    priority: 'high'
  },
  {
    id: 2,
    title: '您有新的系统通知，请及时查看',
    source: 'system',
    time: '2025-07-14 10:52:34',
    priority: 'normal'
  },
  {
    id: 3,
    title: '您有新的系统通知，请及时查看',
    source: 'system',
    time: '2025-07-14 10:52:34',
    priority: 'normal'
  }
])

// 最近使用的功能模块
const recentItems = ref([
  { id: 1, name: '命令管理', icon: 'fa-terminal' },
  { id: 2, name: '资产信息', icon: 'fa-server' },
  { id: 3, name: '数据管理', icon: 'fa-database' },
  { id: 4, name: '资源权限', icon: 'fa-key' },
  { id: 5, name: '异常设备', icon: 'fa-exclamation-triangle' },
  { id: 6, name: '操作记录', icon: 'fa-history' }
])

// 事件处理
const handleTodoClick = (todo) => {
  ElMessage.info(`点击待办: ${todo.title}`)
}

const handleTodoProcess = (todo) => {
  ElMessage.success(`正在处理: ${todo.title}`)
}

const viewAllTodos = () => {
  ElMessage.info('查看全部待办')
}

const handleRecentClick = (item) => {
  ElMessage.info(`打开模块: ${item.name}`)
}
</script>

<style scoped lang="scss">
.dashboard-sidebar {
  width: 280px;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow-y: auto;
}

// 欢迎信息区域
.welcome-section {
  padding: 24px 20px;
  background: linear-gradient(135deg, #2D8CF0 0%, #19BE6B 100%);
  color: white;
  display: flex;
  align-items: center;
  gap: 16px;
  border-radius: 12px;
  margin: 16px;
  box-shadow: 0 4px 20px rgba(45, 140, 240, 0.15);
}

.user-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid rgba(255, 255, 255, 0.3);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.welcome-content {
  flex: 1;
}

.welcome-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.welcome-subtitle {
  font-size: 12px;
  opacity: 0.9;
  margin: 0;
}

// 我的待办区域
.todo-section {
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  margin: 0;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.todo-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background: #fff;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }
}

.todo-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;

  &.high {
    background-color: #ff4d4f;
  }

  &.normal {
    background-color: #52c41a;
  }

  &.low {
    background-color: #faad14;
  }
}

.todo-content {
  flex: 1;
  min-width: 0;
}

.todo-action-btn {
  background: #2D8CF0;
  border-color: #2D8CF0;
  border-radius: 8px;
  font-size: 12px;
  padding: 4px 12px;
  height: auto;

  &:hover {
    background: #1c7ed6;
    border-color: #1c7ed6;
  }
}

.todo-title {
  font-size: 13px;
  color: #262626;
  line-height: 1.4;
  margin-bottom: 4px;
}

.todo-meta {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #8c8c8c;
}

.todo-source {
  color: #1890ff;
}

// 最近使用区域
.recent-section {
  padding: 20px;
  flex: 1;
}

.recent-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 0 16px;
}

.recent-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 6px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  &:hover {
    background-color: #f8f9fa;
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }
}

.recent-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(45, 140, 240, 0.1);
  border-radius: 8px;
  margin-bottom: 6px;
  font-size: 14px;
  color: #2D8CF0;
}

.recent-name {
  font-size: 12px;
  color: #262626;
  text-align: center;
  line-height: 1.2;
}

// 响应式设计
@media (max-width: 768px) {
  .dashboard-sidebar {
    width: 100%;
    height: auto;
    border-right: none;
    border-bottom: 1px solid #e8e8e8;
  }

  .welcome-section {
    padding: 16px;
  }

  .todo-section,
  .recent-section {
    padding: 16px;
  }

  .recent-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
