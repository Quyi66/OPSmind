import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],

  // 路径别名
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@modules': fileURLToPath(new URL('./src/modules', import.meta.url)),
      '@views': fileURLToPath(new URL('./src/views', import.meta.url)),
      '@config': fileURLToPath(new URL('./src/config', import.meta.url)),
      '@assets': fileURLToPath(new URL('./src/assets', import.meta.url)),
      '@styles': fileURLToPath(new URL('./src/styles', import.meta.url))
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
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/main.js',
        'src/core/router/',
        '**/*.config.js',
        '**/*.config.ts',
        'tests/',
        'build/',
        'dist/',
        '.husky/',
        '.github/',
        '**/*.d.ts'
      ],
      include: [
        'src/**/*.{js,ts,vue}'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },

    // 测试超时时间
    testTimeout: 10000,

    // 钩子超时时间
    hookTimeout: 10000,

    // 设置文件
    setupFiles: ['./tests/setup.js']
  }
})
