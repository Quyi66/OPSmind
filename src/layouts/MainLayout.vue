<template>
  <div class="main-layout">
    <!-- 顶部菜单 -->
    <TopNavMenu
      :user="currentUser"
    />

    <!-- 主内容区域 -->
    <div class="main-content">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import TopNavMenu from '@/components/TopNavMenu.vue'
import { useDashboardStore } from '@/stores/dashboard'

const dashboardStore = useDashboardStore()

const currentUser = computed(() => dashboardStore.currentUser)

// 菜单点击事件现在完全由TopNavMenu组件内部处理
</script>

<style scoped lang="scss">
.main-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

.main-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
