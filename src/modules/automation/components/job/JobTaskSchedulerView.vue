<template>
  <div class="placeholder-card">
    <el-empty
      image-size="140"
      description="任务调度列表正在升级"
    >
      <div class="tips">
        使用旧版界面可继续创建和管理定时任务
      </div>
      <el-button type="primary" text @click="openLegacy">
        打开旧版任务调度
      </el-button>
    </el-empty>
  </div>
</template>

<script setup lang="ts">
import { appUrlManager } from '@/config/module-urls.config'

function openLegacy() {
  const url = appUrlManager.getAppUrl('jao')
  window.open(`${url.replace(/#.*$/, '')}#/jao/cron-list`, '_blank', 'noopener')
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

.tips {
  color: #64748b;
  margin-bottom: 12px;
}
</style>
