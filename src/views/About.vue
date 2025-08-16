<template>
  <div class="about">
    <div class="about-container">
      <div class="about-header">
        <img src="/content/images/logo-default.png" alt="OpsMind" class="logo" />
        <h1>OpsMind Dashboard</h1>
        <p class="version">Version 1.0.0</p>
      </div>

      <div class="about-content">
        <div class="info-section">
          <h2>关于 OpsMind</h2>
          <p>
            OpsMind 是一个现代化的运维管理平台，提供统一的运维工具和服务。 本仪表盘基于 Vue 3
            构建，与现有 AngularJS 系统无缝集成。
          </p>
        </div>

        <div class="tech-section">
          <h2>技术栈</h2>
          <div class="tech-grid">
            <div class="tech-item">
              <i class="fab fa-vuejs"></i>
              <span>Vue 3</span>
            </div>
            <div class="tech-item">
              <i class="fas fa-cube"></i>
              <span>Vite</span>
            </div>
            <div class="tech-item">
              <i class="fas fa-palette"></i>
              <span>Element Plus</span>
            </div>
            <div class="tech-item">
              <i class="fas fa-store"></i>
              <span>Pinia</span>
            </div>
          </div>
        </div>

        <div class="actions-section">
          <el-button type="primary" @click="goBack">返回仪表盘</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goBack = () => {
  router.push('/')
}
</script>

<style scoped lang="scss">
.about {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.about-container {
  background: #fff;
  border-radius: 12px;
  padding: 40px;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.about-header {
  text-align: center;
  margin-bottom: 40px;
}

.logo {
  height: 64px;
  margin-bottom: 16px;
}

h1 {
  font-size: 28px;
  font-weight: 600;
  color: #262626;
  margin: 0 0 8px 0;
}

.version {
  color: #8c8c8c;
  font-size: 14px;
  margin: 0;
}

.about-content {
  .info-section,
  .tech-section {
    margin-bottom: 32px;
  }

  h2 {
    font-size: 20px;
    font-weight: 600;
    color: #262626;
    margin: 0 0 16px 0;
  }

  p {
    color: #595959;
    line-height: 1.6;
    margin: 0;
  }
}

.tech-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.tech-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 6px;

  i {
    font-size: 20px;
    color: #1890ff;
  }

  span {
    font-weight: 500;
    color: #262626;
  }
}

.actions-section {
  text-align: center;
}

@media (max-width: 768px) {
  .about-container {
    padding: 24px;
  }

  .tech-grid {
    grid-template-columns: 1fr;
  }
}
</style>
