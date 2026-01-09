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
function handleNavigate({ view }) {
  if (view) {
    router.push(`/users/${view}`)
  }
}

provide('handleNavigate', handleNavigate)
</script>

<style scoped lang="scss">
.ops-module__content {
  flex: 1;
  overflow: auto;
  min-height: 0;
}
</style>
