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
      <!-- 弱化左下角装饰元素的遮罩 -->
      <div class="login-bottom-left-mask" aria-hidden="true"></div>
    </div>

    <!-- 以 1920 × 1080 设计画布为基准叠加前景登录面板。 -->
    <main class="login-design-layer absolute inset-0 z-20 pointer-events-none">
      <img
        src="@/assets/images/bottom-shadow.png"
        alt=""
        aria-hidden="true"
        class="login-card-reflection pointer-events-none"
      />

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
  z-index: 1;
  top: 22.592593%;
  left: 28.020833%;
  width: 43.4375%;
  height: 62.916667%;
  object-fit: fill;
}

.login-card-reflection {
  position: absolute;
  z-index: 0;
  top: 76.851852%;
  left: 28.020833%;
  width: 43.90625%;
  height: 23.796296%;
  object-fit: fill;
  opacity: 0.55;
  filter: blur(0.6px);
  -webkit-mask-image: linear-gradient(to bottom, #000 0%, rgba(0, 0, 0, 0.7) 34%, transparent 100%);
  mask-image: linear-gradient(to bottom, #000 0%, rgba(0, 0, 0, 0.7) 34%, transparent 100%);
}

.login-form-overlay {
  position: absolute;
  z-index: 2;
  top: 29.537037%;
  left: 37.5%;
  width: 25%;
  height: 37.12963%;
  container-type: size;
}

.login-bottom-left-mask {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 18%;
  height: 35%;
  background: radial-gradient(
    ellipse at 0% 100%,
    rgba(225, 233, 243, 0.75) 0%,
    rgba(225, 233, 243, 0.5) 40%,
    transparent 72%
  );
  pointer-events: none;
}
</style>
