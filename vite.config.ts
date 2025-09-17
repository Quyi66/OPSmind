import { defineConfig, loadEnv, type UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'path'

// 插件 (可选，需要时安装)
// import { createHtmlPlugin } from 'vite-plugin-html'
// import { visualizer } from 'rollup-plugin-visualizer'
// import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ command, mode }): UserConfig => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '')
  const isProduction = mode === 'production'
  const isDevelopment = mode === 'development'

  return {
    plugins: [
      vue({
        script: {
          defineModel: true,
          propsDestructure: true
        }
      }),
      // 在开发环境下，将 /ops 重定向为 /ops/，避免 Vite base 提示
      {
        name: 'ops-trailing-slash-redirect',
        configureServer(server) {
          const base = (mode === 'production' ? '/ops/' : '/ops/')
          const noSlash = base.endsWith('/') ? base.slice(0, -1) : base
          server.middlewares.use((req, res, next) => {
            const url = req.url || '/'
            const path = url.split('?')[0]
            if (path === noSlash) {
              const query = url.slice(path.length)
              res.statusCode = 302
              res.setHeader('Location', `${base}${query}`)
              res.end()
              return
            }
            next()
          })
        }
      }
    ],

    // 设置基础路径，开发环境使用ops路径，生产环境使用子路径
    base: mode === 'production' ? '/ops/' : '/ops/',

    // 开发服务器配置
    server: {
      port: parseInt(env.VITE_DEV_PORT) || 5173,
      host: env.VITE_DEV_HOST || '0.0.0.0',
      open: env.VITE_DEV_OPEN === 'true',
      cors: env.VITE_DEV_CORS === 'true',
      // 禁止缓存（开发环境）
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
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
          rewrite: (path: string) => {
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
          configure: (proxy) => {
            proxy.on('error', (err) => {
              console.log('❌ Angular proxy error:', err.message)
            })
            proxy.on('proxyReq', (proxyReq, req) => {
              console.log('📡 Proxying to Angular:', req.method, req.url, '->', proxyReq.path)
            })
            proxy.on('proxyRes', (proxyRes) => {
              proxyRes.headers['cache-control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
              proxyRes.headers['pragma'] = 'no-cache'
              proxyRes.headers['expires'] = '0'
            })
          }
        },

        // API 请求代理到后台服务器
        '/oplus-portal': {
          target: env.VITE_BACKEND_PROXY_URL || 'http://10.1.40.112:80',
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('error', (err) => {
              console.log('Proxy error:', err.message)
            })
            proxy.on('proxyReq', (proxyReq, req) => {
              console.log('Proxying request:', req.method, req.url)
            })
            proxy.on('proxyRes', (proxyRes) => {
              proxyRes.headers['cache-control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
              proxyRes.headers['pragma'] = 'no-cache'
              proxyRes.headers['expires'] = '0'
            })
          }
        },
        // AngularJS 静态文件代理
        '/oplus/base': {
          target: env.VITE_ANGULARJS_PROXY_URL || 'http://localhost:8080',
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('error', (err, _req, res) => {
              console.log('AngularJS proxy error:', err.message)
              // 如果 AngularJS 服务器不可用，返回一个错误页面
              if (res && typeof res.writeHead === 'function') {
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
              }
            })
            proxy.on('proxyReq', (proxyReq, req) => {
              console.log('AngularJS proxy:', req.method, req.url)
            })
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

    // 构建配置
    build: {
      outDir: env.VITE_BUILD_OUTDIR || 'dist',
      assetsDir: env.VITE_BUILD_ASSETSDIR || 'assets',
      sourcemap: isDevelopment || env.VITE_BUILD_SOURCEMAP === 'true',

      // 构建目标
      target: 'es2020',

      // 资源内联限制
      assetsInlineLimit: 4096,

      // 分包策略
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html')
        },
        output: {
          // 更细粒度的分包（避免循环依赖造成的执行顺序问题）
          manualChunks: (id: string) => {
            // 第三方库
            if (id.includes('node_modules')) {
              // 将 Vue 生态 + Element Plus 合并到同一块，避免互相引用导致的 TDZ 问题
              if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router') || id.includes('element-plus') || id.includes('@element-plus')) {
                return 'vue-stack'
              }
              if (id.includes('axios')) return 'http'
              if (id.includes('crypto-js')) return 'crypto'
              return 'vendor'
            }

            // 核心模块
            if (id.includes('/src/core/')) return 'core'
            // 共享模块
            if (id.includes('/src/shared/')) return 'shared'

            // 业务模块
            if (id.includes('/src/modules/')) {
              const match = id.match(/\/src\/modules\/([^\/]+)\//)
              if (match) return `module-${match[1]}`
            }
          },

          // 文件命名
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId
            if (facadeModuleId && facadeModuleId.includes('/src/modules/')) {
              return 'js/modules/[name]-[hash].js'
            }
            return 'js/[name]-[hash].js'
          },
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            // 使用 names 数组的第一个元素，如果不存在则使用默认名称
            const fileName = assetInfo.names?.[0] || 'asset'
            const info = fileName.split('.')
            const ext = info[info.length - 1]

            if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/i.test(fileName)) {
              return `media/[name]-[hash].${ext}`
            }
            if (/\.(png|jpe?g|gif|svg)(\?.*)?$/i.test(fileName)) {
              return `images/[name]-[hash].${ext}`
            }
            if (/\.(woff2?|eot|ttf|otf)(\?.*)?$/i.test(fileName)) {
              return `fonts/[name]-[hash].${ext}`
            }
            return `assets/[name]-[hash].${ext}`
          }
        }
      },

      // 构建优化
      minify: isProduction ? 'terser' : false,
      terserOptions: isProduction ? {
        compress: {
          drop_console: !env.VITE_DEBUG,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info']
        },
        mangle: {
          safari10: true
        }
      } : undefined,

      // 构建报告
      reportCompressedSize: isProduction,
      chunkSizeWarningLimit: 1000
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
