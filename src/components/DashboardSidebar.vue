<template>
  <div class="dashboard-sidebar">
    <!-- 个人信息卡片 -->
    <div class="user-profile-section">
      <div class="user-profile-card">
        <div class="user-avatar">
          <img :src="userInfo.avatar" :alt="userInfo.name" class="avatar-image">
        </div>
        <div class="user-info">
          <h3 class="user-greeting">{{ userInfo.greeting }}</h3>
          <p class="user-date">{{ userInfo.date }}</p>
        </div>
      </div>
    </div>

    <!-- 我的待办 -->
    <div class="todo-section">
      <div class="section-card">
        <div class="section-header">
          <h4 class="section-title">我的待办</h4>
        </div>

        <div class="todo-list">
          <div
            v-for="todo in todoList"
            :key="todo.id"
            class="todo-item"
            @click="handleTodoClick(todo)"
          >
            <div class="todo-content">
              <div class="todo-indicator">
                <i class="fas fa-exclamation-triangle text-red-500"></i>
              </div>
              <div class="todo-details">
                <p class="todo-text">{{ todo.title }}</p>
                <p class="todo-time">{{ todo.time }}</p>
                <div class="todo-actions">
                  <button
                    @click.stop="handleTodoProcess(todo)"
                    class="process-btn"
                  >
                    立即处理
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 最近使用 -->
    <div class="recent-section">
      <div class="section-card">
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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElButton, ElMessage } from 'element-plus'

import avatarImage from '@/assets/icons/avatar@2x.png'

// 用户信息
const userInfo = ref({
  name: '管理员',
  avatar: avatarImage,
  greeting: '管理员 下午好，欢迎登录',
  date: '今天是2025-07-16 星期三'
})

// 待办事项列表
const todoList = ref([
  {
    id: 1,
    title: '您有新的脚本需求审批，请及时查看',
    time: '2025-07-14 10:22:34',
    priority: 'high'
  },
  {
    id: 2,
    title: '您有新的脚本需求审批，请及时查看',
    time: '2025-07-14 10:22:34',
    priority: 'normal'
  },
  {
    id: 3,
    title: '您有新的脚本需求审批，请及时查看',
    time: '2025-07-14 10:22:34',
    priority: 'normal'
  }
])

// 最近使用的功能模块
const recentItems = ref([
  { id: 1, name: '命令管理', icon: 'fas fa-terminal' },
  { id: 2, name: '资源信息', icon: 'fas fa-server' },
  { id: 3, name: '数据管理', icon: 'fas fa-database' },
  { id: 4, name: '资源权限', icon: 'fas fa-key' },
  { id: 5, name: '异常设备', icon: 'fas fa-exclamation-triangle' },
  { id: 6, name: '操作记录', icon: 'fas fa-history' },
  { id: 7, name: '系统监控', icon: 'fas fa-chart-line' },
  { id: 8, name: '用户管理', icon: 'fas fa-users' }
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
  border-right: 1px solid #e8eaed;
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh; // 动态视口高度支持
  overflow-y: auto;
  flex-shrink: 0;
  font-family: "PingFang SC", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

  // 自定义滚动条
  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: #f8f9fa;
  }

  &::-webkit-scrollbar-thumb {
    background: #dee2e6;
    border-radius: 2px;

    &:hover {
      background: #adb5bd;
    }
  }
}

// 个人信息区域
.user-profile-section {
  padding: 16px;
}

.user-profile-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #2D8CF0 0%, #19BE6B 100%);
  border-radius: 12px;
  color: white;
  box-shadow: 0 4px 20px rgba(45, 140, 240, 0.15);
}

.user-avatar {
  flex-shrink: 0;
}

.avatar-image {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid white;
  object-fit: cover;
}

.user-info {
  flex: 1;
}

.user-greeting {
  font-size: 14px;
  font-weight: 500;
  margin: 0 0 4px 0;
  color: white;
}

.user-date {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
}

// 通用区域样式
.todo-section,
.recent-section {
  padding: 0 16px 16px 16px;
}

.section-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #f0f0f0;
  overflow: hidden;
}

.section-header {
  padding: 16px 16px 12px 16px;
  border-bottom: 1px solid #f5f5f5;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  margin: 0;
}

.view-all-btn {
  font-size: 12px;
  color: #2D8CF0;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;

  &:hover {
    color: #1890ff;
  }
}

// 待办事项样式
.todo-list {
  padding: 0 16px 16px 16px;
}

.todo-item {
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: #fafafa;
  }
}

.todo-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.todo-indicator {
  flex-shrink: 0;
  margin-top: 2px;

  i {
    font-size: 12px;
  }
}

.todo-details {
  flex: 1;
  min-width: 0;
}

.todo-text {
  font-size: 13px;
  color: #262626;
  line-height: 1.4;
  margin: 0 0 4px 0;
}

.todo-time {
  font-size: 11px;
  color: #8c8c8c;
  margin: 0 0 8px 0;
}

.todo-actions {
  display: flex;
  justify-content: flex-end;
}

.process-btn {
  font-size: 12px;
  color: #2D8CF0;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;

  &:hover {
    color: #1890ff;
  }
}

// 最近使用样式
.recent-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 16px;
}

.recent-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  border-radius: 8px;
  background: #f8f9fa;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #e9ecef;
    transform: translateY(-1px);
  }
}

.recent-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #dee2e6;
  border-radius: 6px;
  margin-bottom: 6px;

  i {
    font-size: 14px;
    color: #495057;
  }
}

.recent-name {
  font-size: 11px;
  color: #495057;
  text-align: center;
  line-height: 1.2;
  word-break: break-all;
}





// 响应式设计
@media (max-width: 1200px) {
  .dashboard-sidebar {
    width: 260px;
  }

  .user-profile-section {
    padding: 12px;
  }

  .user-profile-card {
    padding: 14px;
  }

  .avatar-image {
    width: 40px;
    height: 40px;
  }

  .user-greeting {
    font-size: 13px;
  }

  .user-date {
    font-size: 11px;
  }
}

@media (max-width: 992px) {
  .dashboard-sidebar {
    width: 240px;
  }

  .recent-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    padding: 12px;
  }

  .recent-item {
    padding: 10px 6px;
  }

  .recent-icon {
    width: 28px;
    height: 28px;

    i {
      font-size: 12px;
    }
  }

  .recent-name {
    font-size: 10px;
  }
}

@media (max-width: 768px) {
  .dashboard-sidebar {
    width: 100%;
    height: auto;
    border-right: none;
    border-bottom: 1px solid #e8eaed;
    position: relative;
  }

  .user-profile-section {
    padding: 12px;
  }

  .user-profile-card {
    padding: 12px;
  }

  .avatar-image {
    width: 36px;
    height: 36px;
  }

  .user-greeting {
    font-size: 12px;
  }

  .user-date {
    font-size: 10px;
  }

  .todo-section,
  .recent-section {
    padding: 0 12px 12px 12px;
  }

  .section-title {
    font-size: 13px;
  }

  .recent-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    padding: 12px;
  }

  .recent-item {
    padding: 8px 4px;
  }

  .recent-icon {
    width: 24px;
    height: 24px;

    i {
      font-size: 11px;
    }
  }

  .recent-name {
    font-size: 9px;
  }

  .todo-item {
    padding: 10px 0;
  }

  .todo-text {
    font-size: 12px;
  }

  .todo-time {
    font-size: 10px;
  }
}

@media (max-width: 576px) {
  .dashboard-sidebar {
    width: 100%;
  }

  .user-profile-section {
    padding: 10px;
  }

  .user-profile-card {
    padding: 10px;
  }

  .avatar-image {
    width: 32px;
    height: 32px;
  }

  .user-greeting {
    font-size: 11px;
  }

  .user-date {
    font-size: 9px;
  }

  .todo-section,
  .recent-section {
    padding: 0 10px 10px 10px;
  }

  .recent-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 4px;
    padding: 10px;
  }

  .recent-item {
    padding: 6px 4px;
  }

  .recent-icon {
    width: 20px;
    height: 20px;

    i {
      font-size: 10px;
    }
  }

  .recent-name {
    font-size: 8px;
  }
}
</style>
