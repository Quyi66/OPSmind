<template>
  <div class="min-h-screen login-background relative overflow-hidden">
    <!-- Background Pattern -->
    <div class="absolute inset-0 opacity-20">
      <div class="absolute top-20 left-20 w-2 h-2 bg-white rounded-full"></div>
      <div class="absolute top-32 left-40 w-1 h-1 bg-white rounded-full"></div>
      <div class="absolute top-40 left-60 w-2 h-2 bg-white rounded-full"></div>
      <div class="absolute top-60 left-80 w-1 h-1 bg-white rounded-full"></div>
      <div class="absolute top-80 left-32 w-2 h-2 bg-white rounded-full"></div>
      <div class="absolute bottom-40 right-40 w-2 h-2 bg-white rounded-full"></div>
      <div class="absolute bottom-60 right-60 w-1 h-1 bg-white rounded-full"></div>
      <div class="absolute bottom-80 right-80 w-2 h-2 bg-white rounded-full"></div>
      <!-- Dotted pattern -->
      <div class="absolute bottom-0 right-0 w-96 h-96 opacity-30">
        <div class="grid grid-cols-12 gap-2 p-8">
          <div v-for="i in 144" :key="i" class="w-1 h-1 bg-white rounded-full"></div>
        </div>
      </div>
    </div>

    <!-- Header -->
    <header class="relative z-10 p-6">
      <div class="flex items-center">
        <img src="@/assets/icons/logo@2x.png" alt="OpsMind" class="h-10 w-auto object-contain" />
      </div>
    </header>

    <!-- Main Content -->
    <div class="relative z-10 flex items-center justify-center min-h-[calc(100vh-120px)]">
      <!-- 合并的登录卡片控件 -->
      <div class="flex shadow-2xl rounded-2xl overflow-hidden border border-gray-100">
        <!-- 左侧插图卡片 -->
        <div
          class="w-[340px] h-[440px] relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"
        >
          <div
            class="absolute inset-0 bg-gradient-to-br from-blue-400/5 via-indigo-400/5 to-purple-400/5"
          ></div>
          <img
            src="@/assets/images/login-illu@2x.png"
            alt="OpsMind Login Illustration"
            class="w-full h-full object-cover drop-shadow-lg"
            loading="eager"
          />
        </div>

        <!-- 右侧登录表单卡片 -->
        <div class="w-[420px] h-[440px] bg-white flex">
          <!-- 左边距 (1) -->
          <div class="flex-1"></div>

          <!-- 登录表单内容 (4) -->
          <div class="flex-[4]">
            <LoginForm />
          </div>

          <!-- 右边距 (1) -->
          <div class="flex-1"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import LoginForm from '@/components/LoginForm.vue'
</script>

<style scoped>
/* Login Background */
.login-background {
  background-image: url('@/assets/images/bg-login@2x.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

/* 自定义动画 */
@keyframes float {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}

/* Tailwind CSS 样式已经通过类名应用，这里只需要添加自定义动画 */
</style>
