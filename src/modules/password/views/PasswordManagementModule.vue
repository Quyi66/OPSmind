<template>
  <div class="ops-module__content">
    <!-- 管理员面板模式 -->
    <AdminPanelView v-if="showAdminPanel" @back="showAdminPanel = false" />

    <!-- 普通模式 -->
    <router-view v-else />
  </div>
</template>

<script setup>
import { ref, provide } from 'vue'
import AdminPanelView from '../components/AdminPanelView.vue'

const showAdminPanel = ref(false)

// 提供打开管理员面板方法给子组件使用
function goToAdminPanel() {
  showAdminPanel.value = true
}

provide('goToAdminPanel', goToAdminPanel)
</script>

<style scoped lang="scss">
.ops-module__content {
  flex: 1;
  overflow: auto;
  min-height: 0;
}
</style>
