<template>
  <div class="ops-module__content">
    <router-view />
  </div>
</template>

<script setup>
// 系统设置模块 - 侧边菜单已提升至 MainLayout
</script>

<style scoped lang="scss">
.ops-module__content {
  flex: 1;
  overflow: auto;
  min-height: 0;
}
</style>
