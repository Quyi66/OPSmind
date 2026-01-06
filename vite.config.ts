import { defineConfig, loadEnv, type UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'path'

const DEFAULT_BACKEND_TARGET = 'http://10.1.40.112:80'

function normalizeTarget(value: string | undefined, fallback: string): string {
  if (!value) return fallback
  const trimmed = value.trim()
  if (!trimmed) return fallback
  const sanitized = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
  if (!/^https?:\/\//.test(sanitized)) {
    console.warn(`[vite-config] Invalid target "${value}". Falling back to ${fallback}.`)
    return fallback
  }
  return sanitized
}

// 插件 (可选，需要时安装)
// import { createHtmlPlugin } from 'vite-plugin-html'
// import { visualizer } from 'rollup-plugin-visualizer'
// import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ command, mode }): UserConfig => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '')
  const isProduction = mode === 'production'
  const isDevelopment = mode === 'development'
  const backendTarget = normalizeTarget(
    env.VITE_BACKEND_URL || env.VITE_BACKEND_PROXY_URL,
    DEFAULT_BACKEND_TARGET
  )

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
        // API 请求代理到后台服务器
        '/oplus-portal': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('error', (err) => {
              //console.log('Proxy error:', err.message)
            })
            proxy.on('proxyReq', (proxyReq, req) => {
              //console.log('Proxying request:', req.method, req.url)
            })
            proxy.on('proxyRes', (proxyRes) => {
              proxyRes.headers['cache-control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
              proxyRes.headers['pragma'] = 'no-cache'
              proxyRes.headers['expires'] = '0'
            })
          }
        },
        // 文件上传服务代理
        '/oplus-upload': {
          target: backendTarget,
          changeOrigin: true,
          secure: false
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
        '@styles': fileURLToPath(new URL('./src/styles', import.meta.url)),
        // Fix vue-demi resolution for Element Plus nested dependencies
        'vue-demi': fileURLToPath(new URL('./node_modules/vue-demi/lib/index.mjs', import.meta.url))
      }
    },

    // 构建配置
    build: {
      outDir: env.VITE_BUILD_OUTDIR || 'dist',
      assetsDir: env.VITE_BUILD_ASSETSDIR || 'assets',
      sourcemap: isDevelopment || env.VITE_BUILD_SOURCEMAP === 'true',

      // 构建目标：启用顶层 await 支持
      target: 'es2022',

      // 资源内联限制
      assetsInlineLimit: 4096,

      // 分包策略
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html')
        },
        output: {
          // 移除 manualChunks，让 Rollup 自动处理分包，避免循环依赖问题
          // manualChunks 容易导致模块初始化顺序问题

          // 文件命名
          chunkFileNames: 'js/[name]-[hash].js',
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
