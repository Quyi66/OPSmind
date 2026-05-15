<template>
  <div class="ops-module__content">
    <router-view />
  </div>
</template>

<script setup>
import { provide } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 提供导航方法给子组件使用
function handleNavigate({ view, params = {} }) {
  if (view) {
    // 将params作为query参数传递
    router.push({
      path: `/users/${view}`,
      query: params
    })
  }
}

provide('handleNavigate', handleNavigate)
</script>

<style scoped lang="scss">
.ops-module__content {
  flex: 1;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
</style>
