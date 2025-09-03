<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 flex items-center justify-center">
    <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
      <h1 class="text-2xl font-bold text-gray-800 mb-4 text-center">Tailwind CSS 测试</h1>
      <div class="space-y-4">
        <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p class="text-blue-800">这是一个蓝色的提示框</p>
        </div>
        <div class="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p class="text-green-800">这是一个绿色的成功框</p>
        </div>
        <button class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-200">
          测试按钮
        </button>
        <div class="flex space-x-2">
          <div class="w-4 h-4 bg-red-500 rounded-full animate-bounce"></div>
          <div class="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
          <div class="w-4 h-4 bg-blue-500 rounded-full animate-ping"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// 测试组件
</script>
