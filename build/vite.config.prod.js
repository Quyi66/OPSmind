import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// 生产环境专用配置
export default defineConfig({
  plugins: [vue()],
  
  base: '/ops/',
  
  resolve: {
    alias: {
      '@': resolve(__dirname, '../src')
    }
  },
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    
    // 分包策略优化（将 Vue/Pinia/Vue Router/Element Plus 合并，避免循环依赖）
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-stack': ['vue', 'vue-router', 'pinia', 'element-plus', '@element-plus/icons-vue'],
          'utils': ['axios', 'crypto-js'],
          'services': [/src\/services/],
          'stores': [/src\/stores/]
        },
        
        // 文件命名策略
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          
          if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/i.test(assetInfo.name)) {
            return `media/[name]-[hash].${ext}`
          }
          if (/\.(png|jpe?g|gif|svg)(\?.*)?$/i.test(assetInfo.name)) {
            return `images/[name]-[hash].${ext}`
          }
          if (/\.(woff2?|eot|ttf|otf)(\?.*)?$/i.test(assetInfo.name)) {
            return `fonts/[name]-[hash].${ext}`
          }
          return `assets/[name]-[hash].${ext}`
        }
      },
      
      // 外部依赖（如果需要 CDN）
      external: [
        // 'vue',
        // 'vue-router',
        // 'element-plus'
      ]
    },
    
    // 压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
        passes: 2
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
    
    // 构建优化
    chunkSizeWarningLimit: 1000,
    assetsInlineLimit: 4096,
    
    // 报告配置
    reportCompressedSize: true,
    
    // CSS 代码分割
    cssCodeSplit: true
  },
  
  // CSS 优化
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    }
  },
  
  // 定义全局常量
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false
  }
})
