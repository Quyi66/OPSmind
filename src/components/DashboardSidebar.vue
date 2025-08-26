<template>
  <div class="dashboard-sidebar">
    <!-- 欢迎信息区域 -->
    <div class="welcome-section">
      <div class="user-avatar">
        <!-- 纯图标，通过CSS显示 -->
      </div>
      <div class="welcome-content">
        <div class="welcome-line1">{{ userInfo.greeting }}</div>
        <div class="welcome-line2">{{ userInfo.subtitle }}</div>
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
            <!-- 第一行：待办提示 -->
            <div class="todo-title">{{ todo.title }}</div>
            <!-- 第二行：From 与时间 -->
            <div class="todo-meta">
              <span class="todo-source">From {{ todo.source }}</span>
              <span class="todo-time">{{ todo.time }}</span>
            </div>
            <!-- 第三行：忽略与立即处理按钮 -->
            <div class="todo-actions">
              <el-button
                type="text"
                size="small"
                class="ignore-btn"
                @click="handleTodoIgnore(todo)"
              >
                忽略
              </el-button>
              <el-button
                type="primary"
                size="small"
                class="process-btn"
                @click="handleTodoProcess(todo)"
              >
                立即处理
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 最近使用区域 -->
    <div class="recent-section">
      <div class="section-header">
        <h4 class="section-title">最近使用</h4>
      </div>
      <div class="recent-list">
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

const handleTodoIgnore = (todo) => {
  ElMessage.info(`已忽略: ${todo.title}`)
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
  padding: 16px;
  background: linear-gradient(135deg, #2D8CF0 0%, #19BE6B 100%);
  color: white;
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 12px;
  margin: 16px;
  box-shadow: 0 4px 20px rgba(45, 140, 240, 0.15);
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  // 使用图标而不是图片
  &::before {
    content: '👤';
    font-size: 20px;
    color: white;
  }
}

.welcome-content {
  flex: 1;
}

.welcome-line1 {
  font-size: 13px;
  font-weight: 500;
  margin: 0 0 2px 0;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.welcome-line2 {
  font-size: 11px;
  opacity: 0.8;
  margin: 0;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  gap: 8px;
}

.todo-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border-radius: 8px;
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
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.todo-title {
  font-size: 13px;
  color: #262626;
  line-height: 1.4;
  font-weight: 500;
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

.todo-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 2px;
}

.ignore-btn {
  font-size: 10px;
  color: #8c8c8c;
  padding: 2px 6px;
  height: auto;
  min-height: auto;

  &:hover {
    color: #262626;
  }
}

.process-btn {
  background: #2D8CF0;
  border-color: #2D8CF0;
  border-radius: 4px;
  font-size: 10px;
  padding: 3px 8px;
  height: auto;

  &:hover {
    background: #1c7ed6;
    border-color: #1c7ed6;
  }
}

// 最近使用区域
.recent-section {
  padding: 20px;
  flex: 1;
}

.recent-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 8px;
  border-radius: 8px;
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
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(45, 140, 240, 0.1);
  border-radius: 6px;
  font-size: 12px;
  color: #2D8CF0;
  flex-shrink: 0;
}

.recent-name {
  font-size: 11px;
  color: #262626;
  line-height: 1.2;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

  .recent-list {
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }

  .recent-item {
    padding: 10px 6px;
  }

  .recent-icon {
    width: 28px;
    height: 28px;
    font-size: 12px;
  }

  .recent-name {
    font-size: 11px;
  }
}
</style>
