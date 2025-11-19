<template>
  <div class="placeholder-card">
    <el-empty
      image-size="120"
      description="运行记录列表即将上线"
    >
      <div class="tips">
        在迁移完成前，可跳转旧版查看作业运行历史
      </div>
      <el-button type="primary" text @click="openLegacy">
        打开旧版运行记录
      </el-button>
    </el-empty>
  </div>
</template>

<script setup lang="ts">
import { appUrlManager } from '@/config/module-urls.config'

function openLegacy() {
  const url = appUrlManager.getAppUrl('jao')
  window.open(`${url.replace(/#.*$/, '')}#/jao/runlogs`, '_blank', 'noopener')
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
