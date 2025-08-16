import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],

  // 路径别名
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },

  test: {
    // 测试环境
    environment: 'jsdom',

    // 全局测试设置
    globals: true,

    // 包含的测试文件
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],

    // 排除的文件
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],

    // 测试覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/main.js',
        'src/router/',
        '**/*.config.js',
        '**/*.config.ts',
        'tests/'
      ]
    },

    // 测试超时时间
    testTimeout: 10000,

    // 钩子超时时间
    hookTimeout: 10000,

    // 设置文件
    setupFiles: ['./tests/setup.js']
  }
})
