<template>
  <ModulePageLayout
    title="命令中心"
    description="统一执行历史、命令模板与权限控制即将迁移至 Vue 原生命令中心。"
  >
    <section class="module-section">
      <el-card shadow="hover" class="module-card">
        <template #header>
          <div class="module-card__header">
            <span>即将上线</span>
            <el-tag type="info" size="small">规划阶段</el-tag>
          </div>
        </template>
        <p class="module-card__text">
          命令树、执行日志与审批流程将依据新的 API 规范重新实现。
        </p>
      </el-card>

      <el-card shadow="never" class="module-card module-card--placeholder">
        <el-empty description="命令模块重构中" />
      </el-card>
    </section>
  </ModulePageLayout>
</template>

<script setup>
import ModulePageLayout from '@/modules/shared/components/ModulePageLayout.vue'

defineProps({
  moduleCode: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  moduleDefinition: {
    type: Object,
    default: null
  }
})
</script>

<style scoped lang="scss">
.module-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.module-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.module-card__text {
  margin: 0;
  color: #475569;
  line-height: 1.7;
}

.module-card--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
}
</style>
