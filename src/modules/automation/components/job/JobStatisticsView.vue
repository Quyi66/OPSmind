<template>
  <div class="stats-wrapper">
    <div class="stats-header">
      <h3>近30天执行作业</h3>
      <span class="hint">统计视图正在开发中</span>
    </div>
    <el-empty
      image-size="160"
      description="数据统计重构中，请稍后查看"
    >
      <el-button type="primary" text @click="openLegacy">
        打开旧版统计视图
      </el-button>
    </el-empty>
  </div>
</template>

<script setup lang="ts">
import { appUrlManager } from '@/config/module-urls.config'

function openLegacy() {
  const url = appUrlManager.getAppUrl('jao')
  window.open(`${url.replace(/#.*$/, '')}#/jao/stats`, '_blank', 'noopener')
}
</script>

<style scoped>
.stats-wrapper {
  background: #fff;
  border-radius: 12px;
  border: 1px dashed rgba(148, 163, 184, 0.4);
  padding: 32px 24px;
  text-align: center;
}

.stats-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  justify-content: center;
  margin-bottom: 16px;
}

.stats-header h3 {
  margin: 0;
  font-size: 20px;
  color: #111827;
}

.hint {
  font-size: 14px;
  color: #9ca3af;
}
</style>
