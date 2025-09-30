<template>
  <div class="quick-actions">
    <h2 class="section-title">快速操作</h2>

    <div class="actions-grid">
      <!-- 常用操作 -->
      <div class="action-group">
        <h3 class="group-title">常用操作</h3>
        <div class="action-items">
          <div
            v-for="action in commonActions"
            :key="action.id"
            class="action-item"
            @click="handleActionClick(action)"
          >
            <div class="action-icon" :style="{ backgroundColor: action.color }">
              <i :class="action.icon"></i>
            </div>
            <div class="action-content">
              <div class="action-title">{{ action.title }}</div>
              <div class="action-description">{{ action.description }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 最近活动 -->
      <div class="action-group">
        <h3 class="group-title">最近活动</h3>
        <div class="recent-activities">
          <div v-for="activity in recentActivities" :key="activity.id" class="activity-item">
            <div class="activity-icon">
              <i :class="activity.icon"></i>
            </div>
            <div class="activity-content">
              <div class="activity-title">{{ activity.title }}</div>
              <div class="activity-time">{{ formatTime(activity.time) }}</div>
            </div>
            <div class="activity-status" :class="activity.status">
              {{ getStatusText(activity.status) }}
            </div>
          </div>

          <div v-if="recentActivities.length === 0" class="empty-state">
            <i class="fa fa-inbox"></i>
            <p>暂无最近活动</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const commonActions = ref([
  {
    id: 'create-job',
    title: '创建作业',
    description: '快速创建新的作业任务',
    icon: 'fa-plus-circle',
    color: '#52c41a',
    action: 'create-job'
  },
  {
    id: 'upload-script',
    title: '上传脚本',
    description: '上传新的脚本文件',
    icon: 'fa-upload',
    color: '#1890ff',
    action: 'upload-script'
  },
  {
    id: 'system-check',
    title: '系统巡检',
    description: '执行系统健康检查',
    icon: 'fa-shield-alt',
    color: '#722ed1',
    action: 'system-check'
  },
  {
    id: 'view-logs',
    title: '查看日志',
    description: '查看系统运行日志',
    icon: 'fa-file-alt',
    color: '#fa8c16',
    action: 'view-logs'
  }
])

const recentActivities = ref([])

onMounted(() => {
  loadRecentActivities()
})

const loadRecentActivities = () => {
  // 模拟最近活动数据
  recentActivities.value = [
    {
      id: 1,
      title: '作业 "数据备份" 执行完成',
      time: new Date(Date.now() - 5 * 60 * 1000), // 5分钟前
      icon: 'fa-check-circle',
      status: 'success'
    },
    {
      id: 2,
      title: '脚本 "清理临时文件" 上传成功',
      time: new Date(Date.now() - 15 * 60 * 1000), // 15分钟前
      icon: 'fa-upload',
      status: 'success'
    },
    {
      id: 3,
      title: '系统巡检发现 2 个警告',
      time: new Date(Date.now() - 30 * 60 * 1000), // 30分钟前
      icon: 'fa-exclamation-triangle',
      status: 'warning'
    },
    {
      id: 4,
      title: '作业 "系统更新" 执行失败',
      time: new Date(Date.now() - 60 * 60 * 1000), // 1小时前
      icon: 'fa-times-circle',
      status: 'error'
    }
  ]
}

const handleActionClick = action => {
  switch (action.action) {
    case 'create-job':
      ElMessage.info('跳转到作业创建页面...')
      // 实际应该通过 postMessage 通知父窗口跳转
      break
    case 'upload-script':
      ElMessage.info('跳转到脚本上传页面...')
      break
    case 'system-check':
      ElMessage.info('启动系统巡检...')
      break
    case 'view-logs':
      ElMessage.info('跳转到日志查看页面...')
      break
    default:
      ElMessage.info(`执行操作: ${action.title}`)
  }
}

const formatTime = time => {
  const now = new Date()
  const diff = now - time
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  return `${days}天前`
}

const getStatusText = status => {
  const statusMap = {
    success: '成功',
    warning: '警告',
    error: '失败',
    running: '运行中'
  }
  return statusMap[status] || '未知'
}
</script>

<style scoped lang="scss">
.quick-actions {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #262626;
  margin: 0 0 24px 0;
  border-bottom: 2px solid #1890ff;
  padding-bottom: 8px;
}

.actions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
}

.action-group {
  .group-title {
    font-size: 16px;
    font-weight: 600;
    color: #262626;
    margin: 0 0 16px 0;
  }
}

.action-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #f5f5f5;
  }
}

.action-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #fff;
  font-size: 16px;
}

.action-content {
  flex: 1;
}

.action-title {
  font-size: 14px;
  font-weight: 500;
  color: #262626;
  margin-bottom: 4px;
}

.action-description {
  font-size: 12px;
  color: #8c8c8c;
}

.recent-activities {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
}

.activity-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #f5f5f5;
  color: #8c8c8c;
  font-size: 14px;
}

.activity-content {
  flex: 1;
}

.activity-title {
  font-size: 13px;
  color: #262626;
  margin-bottom: 4px;
}

.activity-time {
  font-size: 12px;
  color: #8c8c8c;
}

.activity-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;

  &.success {
    background-color: #f6ffed;
    color: #52c41a;
  }

  &.warning {
    background-color: #fffbe6;
    color: #faad14;
  }

  &.error {
    background-color: #fff2f0;
    color: #f5222d;
  }

  &.running {
    background-color: #e6f7ff;
    color: #1890ff;
  }
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #8c8c8c;

  i {
    font-size: 32px;
    margin-bottom: 12px;
    display: block;
  }

  p {
    margin: 0;
    font-size: 14px;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .actions-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .action-item {
    padding: 8px;
  }

  .action-icon {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }
}
</style>
