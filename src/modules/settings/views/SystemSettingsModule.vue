<template>
  <div class="ops-module__content">
    <router-view />
  </div>
</template>

<script setup>
// 系统设置模块内容容器，由 SettingsGroupLayout 提供分组侧边菜单
</script>

<style scoped lang="scss">
.ops-module__content {
  flex: 1;
  overflow: auto;
  min-height: 0;
}
</style>
