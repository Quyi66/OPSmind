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

export default defineConfig(({ command, mode }): UserConfig => {
  const env = loadEnv(mode, process.cwd(), '')
  const isProduction = mode === 'production'
  const isDevelopment = mode === 'development'
  const backendTarget = normalizeTarget(env.VITE_BACKEND_URL || env.VITE_BACKEND_PROXY_URL, DEFAULT_BACKEND_TARGET)

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
          const base = mode === 'production' ? '/ops/' : '/ops/'
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

    base: mode === 'production' ? '/ops/' : '/ops/',

    server: {
      port: parseInt(env.VITE_DEV_PORT) || 5173,
      host: env.VITE_DEV_HOST || '0.0.0.0',
      open: env.VITE_DEV_OPEN === 'true',
      cors: env.VITE_DEV_CORS === 'true',
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      fs: {
        allow: ['..']
      },
      proxy: {
        '/oplus-portal': {
          target: backendTarget,
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
        '/oplus-upload': {
          target: backendTarget,
          changeOrigin: true,
          secure: false
        },
        '/mac': {
          target: backendTarget,
          changeOrigin: true,
          secure: false
        }
      }
    },

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

    build: {
      outDir: env.VITE_BUILD_OUTDIR || 'dist',
      assetsDir: env.VITE_BUILD_ASSETSDIR || 'assets',
      sourcemap: isDevelopment || env.VITE_BUILD_SOURCEMAP === 'true',
      target: 'es2022',
      assetsInlineLimit: 4096,

      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html')
        },
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            if (/element-plus|@element-plus/.test(id)) return 'vendor-element'
            if (/vue-echarts|echarts/.test(id)) return 'vendor-echarts'
            if (/codemirror|@codemirror|vue-codemirror/.test(id)) return 'vendor-codemirror'
            if (/bpmn-js|diagram-js/.test(id)) return 'vendor-bpmn'
            if (/xlsx|mammoth/.test(id)) return 'vendor-doc'
            if (/vue-router|pinia|@vue\//.test(id)) return 'vendor-vue'
            return 'vendor'
          },
          chunkFileNames: 'js/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const fileName = assetInfo.names?.[0] || 'asset'
            const info = fileName.split('.')
            const ext = info[info.length - 1]
            if (/(\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$)/i.test(fileName)) return `media/[name]-[hash].${ext}`
            if (/(\.(png|jpe?g|gif|svg)(\?.*)?$)/i.test(fileName)) return `images/[name]-[hash].${ext}`
            if (/(\.(woff2?|eot|ttf|otf)(\?.*)?$)/i.test(fileName)) return `fonts/[name]-[hash].${ext}`
            return `assets/[name]-[hash].${ext}`
          }
        }
      },

      minify: isProduction ? 'esbuild' : false,

      reportCompressedSize: isProduction,
      chunkSizeWarningLimit: 1000
    },

    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@/styles/variables.scss" as *;`
        }
      }
    },

    esbuild: isProduction
      ? {
        drop: env.VITE_DEBUG ? ['debugger'] : ['console', 'debugger']
      }
      : undefined,

    define: {
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false
    }
  }
})
