<template>
  <div class="placeholder-card">
    <el-empty
      image-size="120"
      description="暂无作业申请记录"
    >
      <div class="tips">
        作业申请迁移尚未完成，可先通过旧版系统查看
      </div>
      <el-button type="primary" text @click="openLegacy">
        打开旧版我的申请
      </el-button>
    </el-empty>
  </div>
</template>

<script setup lang="ts">
import { appUrlManager } from '@/config/module-urls.config'

function openLegacy() {
  const url = appUrlManager.getAppUrl('jao')
  window.open(`${url.replace(/#.*$/, '')}#/jao/approve/my`, '_blank', 'noopener')
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
