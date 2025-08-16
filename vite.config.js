import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue()],

    // 设置基础路径，开发环境使用根路径，生产环境使用子路径
    base: mode === 'production' ? '/opsmind/base/' : '/',

    // 开发服务器配置
    server: {
      port: parseInt(env.VITE_DEV_PORT) || 5173,
      host: env.VITE_DEV_HOST || '0.0.0.0',
      open: env.VITE_DEV_OPEN === 'true',
      cors: env.VITE_DEV_CORS === 'true',
      // 静态文件服务
      fs: {
        allow: ['..'] // 允许访问上级目录
      },
      // 代理配置
      proxy: {
        // Angular 应用代理 - 将 /angular 代理到 Angular 服务器
        '/angular': {
          target: env.VITE_ANGULAR_PROXY_URL || 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
          rewrite: path => {
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
          configure: proxy => {
            proxy.on('error', err => {
              console.log('❌ Angular proxy error:', err.message)
            })
            proxy.on('proxyReq', (proxyReq, req) => {
              console.log('📡 Proxying to Angular:', req.method, req.url, '->', proxyReq.path)
            })
          }
        },

        // API 请求代理到后台服务器
        '/oplus-portal': {
          target: env.VITE_BACKEND_PROXY_URL || 'http://10.1.40.112:80',
          changeOrigin: true,
          secure: false,
          configure: proxy => {
            proxy.on('error', err => {
              console.log('Proxy error:', err.message)
            })
            proxy.on('proxyReq', (proxyReq, req) => {
              console.log('Proxying request:', req.method, req.url)
            })
          }
        },
        // AngularJS 静态文件代理
        '/oplus/base': {
          target: env.VITE_ANGULARJS_PROXY_URL || 'http://localhost:8080',
          changeOrigin: true,
          secure: false,
          configure: proxy => {
            proxy.on('error', (err, _req, res) => {
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
            proxy.on('proxyReq', (proxyReq, req) => {
              console.log('AngularJS proxy:', req.method, req.url)
            })
          }
        }
      }
    },

    // 路径别名
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },

    // 构建配置
    build: {
      outDir: env.VITE_BUILD_OUTDIR || 'dist',
      assetsDir: env.VITE_BUILD_ASSETSDIR || 'assets',
      // 生成 source map 用于调试
      sourcemap: mode === 'development' || env.VITE_BUILD_SOURCEMAP === 'true',
      // 分包策略
      rollupOptions: {
        output: {
          manualChunks: {
            'element-plus': ['element-plus'],
            'vue-vendor': ['vue', 'vue-router', 'pinia'],
            crypto: ['crypto-js'],
            axios: ['axios']
          }
        }
      },
      // 构建优化
      minify: mode === 'production' ? 'terser' : false,
      terserOptions:
        mode === 'production'
          ? {
            compress: {
              drop_console: true,
              drop_debugger: true
            }
          }
          : undefined
    },

    // CSS 配置
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@/styles/variables.scss" as *;`
        }
      }
    },

    // 定义全局常量
    define: {
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false
    }
  }
})
