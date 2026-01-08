<template>
  <!-- 新布局下，侧边栏已由 OpsLayout 提供，模块只需输出内容 -->
  <div class="ops-module-content">
    <router-view />
  </div>
</template>

<script setup>
// 模块组件 - 命令中心
// 侧边栏导航已移至 OpsLayout，此组件仅作为路由容器
</script>

<style scoped lang="scss">
.ops-module-content {
  height: 100%;
  overflow: auto;
}
</style>
