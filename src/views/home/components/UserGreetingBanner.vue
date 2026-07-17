<template>
  <div class="user-greeting-banner">
    <div class="user-profile-content">
      <div class="user-avatar">
        <img :src="userInfo.avatar" :alt="userInfo.name" class="avatar-image" />
      </div>
      <div class="user-info">
        <h3 class="user-greeting">{{ userInfo.greeting }}</h3>
        <p class="user-date">{{ userInfo.date }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { authService } from '@/core/auth'
import { accountService } from '@/core/account'

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
  greeting: '管理员上午好，欢迎登录',
  date: getCurrentDate()
})

// 获取用户信息
const loadUserInfo = async () => {
  try {
    let displayName = '管理员'
    let avatarUrl = avatarImage

    const cached = accountService.getCached()
    if (cached) {
      if (cached.fullName || cached.login) {
        displayName = cached.fullName || cached.login
      }
      if (cached.imageUrl) {
        avatarUrl = `/sjxy-upload${cached.imageUrl}`
      }
    } else {
      try {
        const account = await accountService.getAccount()
        if (account) {
          if (account.fullName || account.login) {
            displayName = account.fullName || account.login
          }
          if (account.imageUrl) {
            avatarUrl = `/sjxy-upload${account.imageUrl}`
          }
        }
      } catch {
        const user = authService.getCurrentUser()
        if (user) {
          displayName = user.fullName || user.name || user.login || '管理员'
        }
      }
    }

    const timeOfDay = getTimeOfDay()
    userInfo.value = {
      name: displayName,
      avatar: avatarUrl,
      greeting: `${displayName}${timeOfDay}好，欢迎登录`,
      date: getCurrentDate()
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
  }
}

const handleAccountUpdated = () => {
  void loadUserInfo()
}

onMounted(() => {
  window.addEventListener('account-updated', handleAccountUpdated)
  void loadUserInfo()
})

onUnmounted(() => {
  window.removeEventListener('account-updated', handleAccountUpdated)
})
</script>

<style scoped lang="scss">
.user-greeting-banner {
  height: 100%;
  width: 100%;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  display: flex;
  align-items: center;
  padding: 0 20px;
  overflow: hidden;
  box-sizing: border-box;
}

.user-profile-content {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
}

.user-avatar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.avatar-image {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow:
    0 2px 8px rgba(37, 99, 235, 0.15),
    0 0 0 2px #ffffff;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-greeting {
  font-size: 14px;
  font-weight: 700;
  margin: 0 0 3px 0;
  color: #1e3a8a;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-date {
  font-size: 12px;
  color: #2563eb;
  margin: 0;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
