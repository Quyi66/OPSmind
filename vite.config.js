import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],

  // 设置基础路径，开发环境使用根路径，生产环境使用子路径
  base: process.env.NODE_ENV === 'production' ? '/opsmind/base/' : '/',
  
  // 开发服务器配置
  server: {
    port: 5173,  // 使用默认端口
    host: '0.0.0.0',
    open: true,  // 自动打开浏览器
    cors: true,
    // 静态文件服务
    fs: {
      allow: ['..']  // 允许访问上级目录
    },
    // 代理配置
    proxy: {
      // Angular 应用代理 - 将 /angular 代理到 Angular 服务器
      '/angular': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => {
          // 处理不同的路径模式
          let newPath = path.replace(/^\/angular/, '')

          // 特殊处理：/angular/oplus/base/app/xxx -> /app/xxx
          if (newPath.startsWith('/oplus/base/app/')) {
            newPath = newPath.replace('/oplus/base', '')
          }
          // 特殊处理：/angular/oplus/base/content/xxx -> /content/xxx
          else if (newPath.startsWith('/oplus/base/content/')) {
            newPath = newPath.replace('/oplus/base', '')
          }
          // 特殊处理：/angular/oplus/base/lib/xxx -> /lib/xxx
          else if (newPath.startsWith('/oplus/base/lib/')) {
            newPath = newPath.replace('/oplus/base', '')
          }
          // 特殊处理：/angular/oplus/base/node_modules/xxx -> /node_modules/xxx
          else if (newPath.startsWith('/oplus/base/node_modules/')) {
            newPath = newPath.replace('/oplus/base', '')
          }

          console.log('🔄 Angular proxy rewrite:', path, '->', newPath)
          return newPath
        },
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('❌ Angular proxy error:', err.message)
          })
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('📡 Proxying to Angular:', req.method, req.url, '->', proxyReq.path)
          })
        }
      },

      // API 请求代理到后台服务器
      '/oplus-portal': {
        target: 'http://10.1.40.112:80',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error:', err.message)
          })
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxying request:', req.method, req.url)
          })
        }
      },
      // AngularJS 静态文件代理
      '/oplus/base': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('AngularJS proxy error:', err.message)
            // 如果 AngularJS 服务器不可用，返回一个错误页面
            res.writeHead(503, { 'Content-Type': 'text/html' })
            res.end(`
              <html>
                <body>
                  <h2>AngularJS 模块暂时不可用</h2>
                  <p>请启动 AngularJS 开发服务器或检查配置</p>
                  <script>
                    // 通知父窗口模块加载失败
                    if (window.parent !== window) {
                      window.parent.postMessage({
                        type: 'MODULE_LOAD_ERROR',
                        message: 'AngularJS server not available'
                      }, '*')
                    }
                  </script>
                </body>
              </html>
            `)
          })
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('AngularJS proxy:', req.method, req.url)
          })
        }
      },

    }
  },
  
  // 路径别名
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  
  // 构建配置
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 生成 source map 用于调试
    sourcemap: true,
    // 分包策略
    rollupOptions: {
      output: {
        manualChunks: {
          'element-plus': ['element-plus'],
          'vue-vendor': ['vue', 'vue-router', 'pinia']
        }
      }
    }
  },
  
  // CSS 配置
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    }
  }
})
