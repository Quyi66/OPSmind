<template>
  <div
    class="login-page relative w-full h-screen min-h-[580px] overflow-hidden flex items-center justify-center select-none bg-slate-50"
  >
    <!-- 全屏 3D 背景图 -->
    <div class="absolute inset-0 z-0">
      <img
        src="@/assets/images/login-bg.png"
        alt=""
        aria-hidden="true"
        class="block w-full h-full object-fill"
      />
    </div>

    <!-- 以 1920 × 1080 设计画布为基准叠加前景登录面板。 -->
    <main class="login-design-layer absolute inset-0 z-20 pointer-events-none">
      <img
        src="@/assets/images/loginForm-bg.png"
        alt=""
        aria-hidden="true"
        class="login-card-art pointer-events-none"
      />

      <div class="login-form-overlay pointer-events-auto">
        <LoginForm />
      </div>
    </main>
  </div>
</template>

<script setup>
import LoginForm from '@/components/auth/LoginForm.vue'
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  min-height: 100dvh;
}

.login-design-layer {
  width: 100%;
  height: 100%;
  inset: 0;
}

.login-card-art {
  position: absolute;
  top: 22.592593%;
  left: 28.020833%;
  width: 43.4375%;
  height: 62.916667%;
  object-fit: fill;
}

.login-form-overlay {
  position: absolute;
  top: 29.537037%;
  left: 37.5%;
  width: 25%;
  height: 37.12963%;
  container-type: size;
}
</style>
