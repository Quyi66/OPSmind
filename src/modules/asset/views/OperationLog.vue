<template>
  <div class="operation-log">
    <nav class="navbar">
      <div class="navbar-title">操作记录</div>
    </nav>

    <div class="content-wrapper">
      <div class="placeholder-content">
        <i class="fas fa-history placeholder-icon"></i>
        <p>操作记录页面开发中...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
// TODO: 实现操作记录页面
</script>

<style scoped lang="scss">
.operation-log {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f7fa;
}

.navbar {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;

  .navbar-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }
}

.content-wrapper {
  flex: 1;
  padding: 20px;
  overflow: auto;
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  background: #fff;
  border-radius: 8px;
  color: #909399;

  .placeholder-icon {
    font-size: 48px;
    margin-bottom: 16px;
    color: #c0c4cc;
  }

  p {
    font-size: 14px;
  }
}
</style>
