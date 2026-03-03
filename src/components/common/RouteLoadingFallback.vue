<template>
  <div class="route-loading-fallback">
    <div class="loading-content">
      <!-- 骨架屏效果 -->
      <div class="skeleton-header">
        <div class="skeleton-bar short"></div>
        <div class="skeleton-actions">
          <div class="skeleton-btn"></div>
          <div class="skeleton-btn"></div>
        </div>
      </div>
      <div class="skeleton-body">
        <div class="skeleton-bar"></div>
        <div class="skeleton-bar medium"></div>
        <div class="skeleton-bar long"></div>
        <div class="skeleton-bar"></div>
        <div class="skeleton-bar short"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
// 纯展示组件，无逻辑
</script>

<style scoped lang="scss">
.route-loading-fallback {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 200px;
  padding: 24px;
  background: var(--el-bg-color);
  width: 100%;
}

.loading-content {
  width: 100%;
}

.skeleton-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.skeleton-actions {
  display: flex;
  gap: 8px;
}

.skeleton-btn {
  width: 80px;
  height: 32px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  border-radius: 4px;
}

.skeleton-bar {
  height: 16px;
  margin-bottom: 12px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  border-radius: 4px;
  width: 100%;

  &.short {
    width: 30%;
  }

  &.medium {
    width: 60%;
  }

  &.long {
    width: 85%;
  }
}

.skeleton-body {
  .skeleton-bar {
    &:nth-child(1) {
      animation-delay: 0s;
    }

    &:nth-child(2) {
      animation-delay: 0.1s;
    }

    &:nth-child(3) {
      animation-delay: 0.2s;
    }

    &:nth-child(4) {
      animation-delay: 0.3s;
    }

    &:nth-child(5) {
      animation-delay: 0.4s;
    }
  }
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}
</style>
