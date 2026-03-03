<template>
  <div class="dashboard-sidebar">
    <!-- 第一张卡片：个人信息 + 我的待办 -->
    <div class="user-todo-card">
      <!-- 个人信息区域 -->
      <div class="user-profile-card">
        <div class="user-avatar">
          <img :src="userInfo.avatar" :alt="userInfo.name" class="avatar-image" />
        </div>
        <div class="user-info">
          <h3 class="user-greeting">{{ userInfo.greeting }}</h3>
          <p class="user-date">{{ userInfo.date }}</p>
        </div>
      </div>

      <!-- 我的待办区域 -->
      <div class="todo-section">
        <div class="section-header">
          <h4 class="section-title">我的待办</h4>
        </div>

        <div class="todo-list fixed-height">
          <div v-if="!todoList.length" class="todo-empty">
            <i class="fas fa-clipboard-list"></i>
          </div>
          <div
            v-for="todo in todoList"
            :key="todo.id"
            class="todo-item"
            @click="handleTodoClick(todo)"
          >
            <div class="todo-content">
              <div class="todo-indicator">
                <div class="red-dot"></div>
              </div>
              <div class="todo-details">
                <p class="todo-text">{{ todo.title }}</p>
                <div class="todo-meta">
                  <span class="todo-sender">发送人:{{ todo.sender }}</span>
                  <span class="todo-time">{{ todo.time }}</span>
                </div>
                <div class="todo-actions">
                  <button @click.stop="handleTodoIgnore(todo)" class="ignore-btn">忽略</button>
                  <button @click.stop="handleTodoProcess(todo)" class="process-btn">
                    立即处理
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 第二张卡片：最近使用 -->
    <div class="recent-card">
      <div class="section-header">
        <h4 class="section-title">最近使用</h4>
      </div>

      <div class="recent-grid">
        <div
          v-for="item in displayRecentItems"
          :key="item.code"
          :class="['recent-item', { placeholder: item._placeholder }]"
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
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { authService } from '@/core/auth'
import { accountService } from '@/core/account'
import { useMenuStore } from '@/stores/menu.js'

import avatarImage from '@/assets/icons/avatar@2x.png'

// 获取当前时间段
const getTimeOfDay = () => {
  const hour = new Date().getHours()
  if (hour < 6) return '凌晨'
  if (hour < 12) return '上午'
  if (hour < 18) return '下午'
  return '晚上'
}

// 获取当前日期
const getCurrentDate = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const weekday = weekdays[now.getDay()]
  return `今天是${year}-${month}-${day} ${weekday}`
}

// 用户信息
const userInfo = ref({
  name: '管理员',
  avatar: avatarImage,
  greeting: '管理员下午好，欢迎登录',
  date: getCurrentDate()
})

// 获取用户信息（优先从 /api/account 使用 fullName）
const loadUserInfo = async () => {
  try {
    let displayName = '管理员'

    // 优先使用缓存；若无则拉取并缓存
    const cached = accountService.getCached()
    if (cached && (cached.fullName || cached.login)) {
      displayName = cached.fullName || cached.login
    } else {
      try {
        const account = await accountService.getAccount()
        if (account && (account.fullName || account.login)) {
          displayName = account.fullName || account.login
        }
        // eslint-disable-next-line no-unused-vars
      } catch (e) {
        // 接口不可用时回退到本地认证信息
        const user = authService.getCurrentUser()
        if (user) {
          displayName = (user && (user.fullName || user.name || user.login)) || '管理员'
        }
      }
    }

    const timeOfDay = getTimeOfDay()
    userInfo.value = {
      name: displayName,
      avatar: avatarImage,
      greeting: `${displayName}${timeOfDay}好，欢迎登录`,
      date: getCurrentDate()
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
  }
}

onMounted(() => {
  loadUserInfo()
})

// 待办事项列表（移除mock数据，保留固定展示高度）
const todoList = ref([])

// 最近使用：来源于菜单 Store，固定 10 个格子（5 行 × 2 列）
const menuStore = useMenuStore()
const router = useRouter()
const displayRecentItems = computed(() => {
  const items = (menuStore.recentItems || []).slice(0, 10)
  const padded = [...items]
  while (padded.length < 10) {
    padded.push({ code: `__placeholder_${padded.length}`, name: '', icon: '', _placeholder: true })
  }
  return padded
})

// 事件处理
const handleTodoClick = todo => {
  ElMessage.info(`点击待办: ${todo.title}`)
}

const handleTodoProcess = _todo => {
  ElMessage.info('我的待办功能开发中...')
}

const handleTodoIgnore = _todo => {
  ElMessage.info('我的待办功能开发中...')
}

const handleRecentClick = item => {
  if (item._placeholder) return
  // 激活模块并导航到可直达的路由 `/:code`
  try {
    menuStore.setActiveMenuItem(item.code)
    router.push(`/${item.code}`)
    // eslint-disable-next-line no-unused-vars
  } catch (e) {
    /* empty */
  }
}
</script>

<style scoped lang="scss">
.dashboard-sidebar {
  width: 360px;
  background: transparent;
  display: flex;
  flex-direction: column;
  /* 占满父容器高度，保证分隔线延伸到页面底部 */
  height: 100%;
  min-height: 0;
  align-self: stretch;
  overflow-y: auto;
  flex-shrink: 0;
  // 进一步调小：左 10px，右 5px（与内容左边距 5px 合计 10px）
  padding-left: 10px;
  padding-right: 5px;
  // 与仪表盘主内容底部间距一致
  padding-bottom: 16px;
  font-family:
    'PingFang SC',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    'Helvetica Neue',
    Arial,
    sans-serif;

  // 自定义滚动条
  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: var(--el-fill-color-lighter);
  }

  &::-webkit-scrollbar-thumb {
    background: #dee2e6;
    border-radius: 2px;

    &:hover {
      background: #adb5bd;
    }
  }
}

@media (min-width: 1600px) {
  .dashboard-sidebar {
    width: 400px;
  }

  /* 让两张卡片在大屏下竖向铺满侧栏高度 */
  .user-todo-card,
  .recent-card {
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    min-height: 0;
  }

  .todo-section {
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .todo-list {
    flex: 1 1 0;
    overflow: auto;
  }

  .dashboard-sidebar .recent-grid {
    height: auto;
    min-height: 0;
    flex: 1 1 0;
    overflow: auto;
  }

  .user-profile-card {
    padding: 24px 18px;
  }

  .avatar-image {
    width: 56px;
    height: 56px;
  }

  .user-greeting {
    font-size: 15px;
  }

  .user-date {
    font-size: 12px;
  }

  .section-title {
    font-size: 16px;
  }

  .todo-item {
    padding: 10px 0;
  }

  .todo-text {
    font-size: 14px;
  }

  .todo-sender,
  .todo-time {
    font-size: 12px;
  }

  .ignore-btn,
  .process-btn {
    font-size: 13px;
  }

  .process-btn {
    padding: 6px 14px;
  }

  .recent-grid {
    gap: 3px; /* 27寸：行间距调为原来的约1/3 */
  }

  .recent-item {
    gap: 8px;
    padding: 8px 8px;
    height: 100%;
  }

  .recent-icon {
    width: 28px;
    height: 28px;

    i {
      font-size: 14px;
    }
  }

  .recent-name {
    font-size: 13px; /* 大屏同步放大一档 */
  }
}

@media (min-width: 1920px) {
  .dashboard-sidebar {
    width: 440px;
  }

  .user-todo-card,
  .recent-card {
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    min-height: 0;
  }

  .todo-section {
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .todo-list {
    flex: 1 1 0;
    overflow: auto;
  }

  .dashboard-sidebar .recent-grid {
    height: auto;
    min-height: 0;
    flex: 1 1 0;
    overflow: auto;
  }

  .user-profile-card {
    padding: 26px 20px;
  }

  .avatar-image {
    width: 64px;
    height: 64px;
  }

  .user-greeting {
    font-size: 16px;
  }

  .user-date {
    font-size: 13px;
  }

  .section-title {
    font-size: 17px;
  }

  .todo-item {
    padding: 12px 0;
  }

  .todo-text {
    font-size: 15px;
  }

  .todo-sender,
  .todo-time {
    font-size: 13px;
  }

  .ignore-btn,
  .process-btn {
    font-size: 14px;
  }

  .process-btn {
    padding: 8px 16px;
  }

  .recent-grid {
    gap: 3px; /* 27寸+：继续保持紧凑 */
  }

  .recent-item {
    gap: 10px;
    padding: 10px 10px;
    height: 100%;
  }

  .recent-icon {
    width: 32px;
    height: 32px;

    i {
      font-size: 16px;
    }
  }

  .recent-name {
    font-size: 13px;
  }
}

// 第一张卡片：个人信息 + 待办
.user-todo-card {
  // 顶部间距更紧凑，与内容区保持一致
  margin: 16px 16px 16px 16px;
  background: var(--el-bg-color);
  border-radius: 4px;
  border: 1px solid var(--el-border-color-light);
  overflow: hidden;
}

.user-profile-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 16px;
  background: url('@/assets/icons/bg-avatar.png') no-repeat center center;
  background-size: cover;
  color: white;
}

.user-avatar {
  flex-shrink: 0;
}

.avatar-image {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  object-fit: cover;
}

.user-info {
  flex: 1;
}

.user-greeting {
  font-size: 13px;
  font-weight: 500;
  margin: 0 0 4px 0;
  color: white;
  line-height: 1.2;
}

.user-date {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  line-height: 1.2;
}

// 第二张卡片：最近使用
.recent-card {
  // 末卡片底部去掉外边距，统一由容器 padding-bottom 提供 16px 留白
  margin: 0 16px 0 16px;
  background: var(--el-bg-color);
  border-radius: 4px;
  border: 1px solid var(--el-border-color-light);
  overflow: hidden;
}

.section-header {
  padding: 16px 16px 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

// 最近使用标题更紧凑，且移除下分割线
.recent-card .section-header {
  padding: 10px 16px 8px 16px;
  border-bottom: none;
}

// 待办区域的标题不需要下边框，与个人信息紧贴
.todo-section .section-header {
  border-bottom: none;
  padding: 12px 16px 8px 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
}

.view-all-btn {
  font-size: 12px;
  color: #2d8cf0;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;

  &:hover {
    color: #1890ff;
  }
}

// 待办事项样式
.todo-section {
  background: var(--el-bg-color);
}

.todo-list {
  padding: 0 16px 12px 16px;
}

/* 固定高度：按3个待办项的视觉高度预留空间（不随内容增减） */
.todo-list.fixed-height {
  /* 约每项 ~68-72px（含标题、meta、按钮等），这里统一按 72px 估算 */
  min-height: 264px; /* 提高高度（约 3.5 行视觉空间） */
  max-height: 264px;
  overflow: hidden; /* 固定区域不滚动，保持卡片高度稳定 */
  display: block;
}

.todo-empty {
  height: 264px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-placeholder); /* 略深的中性灰 */
  position: relative;
}

.todo-empty i {
  font-size: 72px; /* 更大图标，类似背景的视觉效果 */
  opacity: 0.25; /* 更浅一些的背景效果 */
  transform: translateY(-6px); /* 轻微上移，视觉更平衡 */
}

.todo-item {
  padding: 6px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: var(--el-bg-color-page);
  }
}

.todo-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.todo-indicator {
  flex-shrink: 0;
  margin-top: 6px;
}

.red-dot {
  width: 8px;
  height: 8px;
  background-color: #ff4d4f;
  border-radius: 50%;
}

.todo-details {
  flex: 1;
  min-width: 0;
}

.todo-text {
  font-size: 13px;
  color: var(--el-text-color-primary);
  line-height: 1.3;
  margin: 0 0 4px 0;
}

.todo-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.todo-sender {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.todo-time {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.todo-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ignore-btn {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;

  &:hover {
    color: #595959;
  }
}

.process-btn {
  font-size: 12px;
  color: #2d8cf0;
  background: none;
  border: 1px solid #2d8cf0;
  border-radius: 4px;
  cursor: pointer;
  padding: 4px 12px;

  &:hover {
    color: #1890ff;
    border-color: #1890ff;
  }
}

// 最近使用样式
.recent-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr); /* 2 列，共 5 行 */
  gap: 6px; /* 行距 */
  padding: 8px 16px 8px; /* 与标题左右对齐 */
  /* 自适应行高：5 行等比分配可用高度，最小 36px */
  grid-template-rows: repeat(5, minmax(36px, 1fr));
  align-content: stretch;
}

.recent-item {
  display: flex;
  flex-direction: row; /* 左图标 右名称 */
  align-items: center;
  gap: 6px; /* 更紧凑的间距 */
  padding: 6px 6px; /* 再压缩行高，便于 5 行固定占位 */
  border-radius: 8px;
  background: var(--el-fill-color-light);
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 36px;
  height: 100%; /* 随网格行高自适应填满 */

  &:hover {
    background: var(--el-fill-color);
    transform: translateY(-1px);
  }
}

.recent-item.placeholder {
  background: transparent;
  pointer-events: none;
  visibility: hidden; /* 占位但不显示内容 */
}

.recent-icon {
  width: 24px; /* 更小图标 */
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-fill-color);
  border-radius: 6px;
  margin: 0; /* 水平布局不需要底部间距 */

  i {
    font-size: 12px;
    color: var(--el-text-color-regular);
  }
}

.recent-name {
  font-size: 12px; /* 文本整体放大一档 */
  color: var(--el-text-color-regular);
  text-align: left;
  line-height: 1.2;
  white-space: nowrap; /* 固定行高，避免换行增高 */
  overflow: hidden;
  text-overflow: ellipsis;
}

// 响应式设计
@media (max-width: 1200px) {
  .dashboard-sidebar {
    width: 340px;
  }

  .user-todo-card {
    margin: 20px 12px 12px 12px;
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
    width: 320px;
  }

  .recent-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    padding: 10px 10px 6px;
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
    font-size: 11px;
  }
}

@media (max-width: 768px) {
  .dashboard-sidebar {
    width: 100%;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--el-border-color-light);
    position: relative;
  }

  .user-todo-card {
    margin: 20px 12px 12px 12px;
  }

  .recent-card {
    margin: 0 12px 12px 12px;
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

  .user-todo-card,
  .recent-card {
    margin: 12px;
  }

  .section-title {
    font-size: 13px;
  }

  .recent-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    padding: 10px 10px 6px;
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
    font-size: 10px;
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

  .user-todo-card {
    margin: 18px 10px 10px 10px;
  }

  .recent-card {
    margin: 0 10px 8px 10px;
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

  .recent-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 4px;
    padding: 8px 8px 6px;
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
    font-size: 9px;
  }
}
</style>
