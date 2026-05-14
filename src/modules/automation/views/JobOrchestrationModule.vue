<template>
  <div class="ops-module__content">
    <router-view />
  </div>
</template>

<script setup>
// 作业编排模块 - 侧边菜单已提升至 MainLayout
</script>

<style scoped lang="scss">
.ops-module__content {
  flex: 1;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
</style>
