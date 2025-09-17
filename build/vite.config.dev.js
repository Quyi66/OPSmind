import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    vue({
      script: {
        defineModel: true,
        propsDestructure: true
      }
    })
  ],



  // 设置基础路径
  base: '/ops/',

  // 开发服务器配置
  server: {
    port: 5173,
    host: '0.0.0.0',
    open: true,
    cors: true,
    // 禁止缓存（开发环境）
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    },

    // 热更新配置
    hmr: {
      overlay: true
    },

    // 静态文件服务
    fs: {
      allow: ['..']
    },

    // 代理配置
    proxy: {
      '/angular': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => {
          let newPath = path.replace(/^\/angular/, '')
          if (newPath.startsWith('/oplus/base/app/')) {
            newPath = newPath.replace('/oplus/base', '')
          } else if (newPath.startsWith('/oplus/base/content/')) {
            newPath = newPath.replace('/oplus/base', '')
          } else if (newPath.startsWith('/oplus/base/lib/')) {
            newPath = newPath.replace('/oplus/base', '')
          } else if (newPath.startsWith('/oplus/base/node_modules/')) {
            newPath = newPath.replace('/oplus/base', '')
          }
          console.log('🔄 Angular proxy rewrite:', path, '->', newPath)
          return newPath
        },
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['cache-control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
            proxyRes.headers['pragma'] = 'no-cache'
            proxyRes.headers['expires'] = '0'
          })
        }
      },

      '/oplus-portal': {
        target: 'http://localhost:18080',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['cache-control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
            proxyRes.headers['pragma'] = 'no-cache'
            proxyRes.headers['expires'] = '0'
          })
        }
      },

      '/oplus/base': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['cache-control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
            proxyRes.headers['pragma'] = 'no-cache'
            proxyRes.headers['expires'] = '0'
          })
        }
      }
    }
  },

  // 路径别名
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('../src', import.meta.url)),
      '@core': fileURLToPath(new URL('../src/core', import.meta.url)),
      '@shared': fileURLToPath(new URL('../src/shared', import.meta.url)),
      '@modules': fileURLToPath(new URL('../src/modules', import.meta.url)),
      '@views': fileURLToPath(new URL('../src/views', import.meta.url)),
      '@config': fileURLToPath(new URL('../src/config', import.meta.url)),
      '@assets': fileURLToPath(new URL('../src/assets', import.meta.url)),
      '@styles': fileURLToPath(new URL('../src/styles', import.meta.url))
    }
  },

  // 开发构建配置
  build: {
    sourcemap: true,
    minify: false,

    rollupOptions: {
      output: {
        manualChunks: undefined // 开发环境不分包
      }
    }
  },

  // CSS 配置
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/variables.scss" as *;`
      }
    }
  },

  // 定义全局常量
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: true,
    __DEV__: true
  },

  // 优化配置
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'pinia',
      'element-plus',
      'axios'
    ],
    exclude: [
      '@vitejs/plugin-vue'
    ]
  }
})
