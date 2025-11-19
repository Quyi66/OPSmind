<template>
  <div class="placeholder-card">
    <el-empty
      image-size="120"
      description="作业编排功能正在迁移中，请稍后再试"
    >
      <el-button type="primary" text @click="openLegacy">打开旧版作业编排</el-button>
    </el-empty>
  </div>
</template>

<script setup lang="ts">
import { appUrlManager } from '@/config/module-urls.config'

function openLegacy() {
  const url = appUrlManager.getAppUrl('jao')
  window.open(`${url.replace(/#.*$/, '')}#/jao/jobs/script`, '_blank', 'noopener')
}
</script>

<style scoped>
.placeholder-card {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
  background: #fff;
  border-radius: 12px;
  border: 1px dashed rgba(148, 163, 184, 0.4);
}
</style>
