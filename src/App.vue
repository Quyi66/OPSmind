<template>
  <el-config-provider :locale="elementLocale">
    <div id="app" class="opsmind-app">
      <router-view />
    </div>
  </el-config-provider>
</template>

<script setup>
import { ElConfigProvider } from 'element-plus'
import { elementLocale } from '@/core/i18n/element-locale'
import { useUpdateChecker } from '@/composables/useUpdateChecker'

// 启动前端版本更新检测（生产环境生效）
useUpdateChecker()
</script>

<style scoped>
.opsmind-app {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
</style>
