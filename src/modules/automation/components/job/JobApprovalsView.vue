<template>
  <div class="placeholder-card">
    <el-empty
      image-size="120"
      description="审批列表暂未迁移至新版界面"
    >
      <div class="tips">
        您可以继续使用旧版页面处理审批任务
      </div>
      <el-button type="primary" text @click="openLegacy">
        打开旧版作业审批
      </el-button>
    </el-empty>
  </div>
</template>

<script setup lang="ts">
import { appUrlManager } from '@/config/module-urls.config'

function openLegacy() {
  const url = appUrlManager.getAppUrl('jao')
  window.open(`${url.replace(/#.*$/, '')}#/jao/approve/list`, '_blank', 'noopener')
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
