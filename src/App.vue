<template>
  <el-config-provider :locale="zhCn">
    <div id="app" class="opsmind-app">
      <router-view />
    </div>
  </el-config-provider>
</template>

<script setup>
import { onMounted } from 'vue'
import { ElConfigProvider } from 'element-plus'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import { useUpdateChecker } from '@/composables/useUpdateChecker'

// 启动前端版本更新检测（生产环境生效）
useUpdateChecker()

onMounted(() => {
  // 初始化应用
})
</script>

<style scoped>
.opsmind-app {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
</style>
