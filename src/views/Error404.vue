<template>
  <div class="error-404">
    <div class="content">
      <h1>404</h1>
      <p>抱歉，您访问的页面不存在。</p>
      <el-button type="primary" @click="goHome">返回首页</el-button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
const goHome = () => router.replace('/home')
</script>

<style scoped>
.error-404 {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #f6f8fa;
}
.content {
  text-align: center;
}
h1 {
  font-size: 72px;
  margin: 0 0 12px;
  color: #1f2937;
}
p {
  color: #6b7280;
  margin-bottom: 20px;
}
</style>

