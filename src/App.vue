<template>
  <div id="app" class="opsmind-app">
    <router-view />
    <!-- Angular 初始化器 -->
    <AngularInitializer />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import AngularInitializer from '@/components/AngularInitializer.vue'

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
