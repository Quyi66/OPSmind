<template>
  <div id="app" class="opsmind-app">
    <router-view />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // 初始化应用
  console.log('OpsMind Dashboard App mounted')
})
</script>

<style scoped>
.opsmind-app {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
</style>
