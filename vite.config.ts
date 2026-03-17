import { defineConfig, loadEnv, type Plugin, type UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'path'

// Element Plus 按需导入插件
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'

// 生产环境压缩插件
import { compression } from 'vite-plugin-compression2'

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

      // 生产环境将构建产物 CSS 设为非阻塞加载
      ...(isProduction
        ? [
            {
              name: 'defer-build-css',
              enforce: 'post' as const,
              transformIndexHtml(html: string) {
                const cssAssetRegex =
                  /<link\s+rel=["']stylesheet["']([^>]*?)href=["']([^"']*\/assets\/[^"']+\.css)["']([^>]*)>/g

                return html.replace(
                  cssAssetRegex,
                  (_match: string, preAttrs: string, href: string, postAttrs: string) => {
                    const mergedAttrs = `${preAttrs || ''} ${postAttrs || ''}`
                      .replace(/\s+/g, ' ')
                      .trim()
                    const attrs = mergedAttrs ? ` ${mergedAttrs}` : ''

                    const preload = `<link rel="preload" as="style" href="${href}"${attrs} onload="this.onload=null;this.rel='stylesheet'">`
                    const noscript = `<noscript><link rel="stylesheet" href="${href}"${attrs}></noscript>`

                    return `${preload}\n    ${noscript}`
                  }
                )
              }
            } satisfies Plugin
          ]
        : []),

      // 自动导入 Vue/Element Plus API（如 ref, ElMessage 等）
      AutoImport({
        imports: ['vue', 'vue-router'],
        resolvers: [
          ElementPlusResolver({
            importStyle: 'css'
          }),
          // 自动导入图标
          IconsResolver({
            prefix: 'Icon'
          })
        ],
        dts: 'src/auto-imports.d.ts'
      }),

      // 自动注册 Element Plus 组件（无需手动 import）
      Components({
        resolvers: [
          // Element Plus 组件解析器（启用 CSS 按需导入）
          ElementPlusResolver({
            importStyle: 'css'
          }),
          // 图标解析器（使用 i-ep-xxx 语法）
          IconsResolver({
            enabledCollections: ['ep']
          })
        ],
        dts: 'src/components.d.ts'
      }),

      // 图标支持（按需加载）
      Icons({
        autoInstall: true
      }),

      // 在开发环境下，将 /opsMind 重定向为 /opsMind/，避免 Vite base 提示
      {
        name: 'ops-trailing-slash-redirect',
        configureServer(server) {
          const base = mode === 'production' ? '/opsMind/' : '/opsMind/'
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
      },

      // 生产环境启用 gzip 和 brotli 压缩
      ...(isProduction
        ? [
            compression({
              algorithms: ['gzip'],
              exclude: [/\.(br)$/, /\.(gz)$/],
              threshold: 1024 // 只压缩大于 1KB 的文件
            }),
            compression({
              algorithms: ['brotliCompress'],
              exclude: [/\.(br)$/, /\.(gz)$/],
              threshold: 1024
            })
          ]
        : [])
    ],

    base: mode === 'production' ? '/opsMind/' : '/opsMind/',

    server: {
      port: parseInt(env.VITE_DEV_PORT) || 5173,
      host: env.VITE_DEV_HOST || '0.0.0.0',
      open: env.VITE_DEV_OPEN === 'true',
      cors: env.VITE_DEV_CORS === 'true',
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0'
      },
      fs: {
        allow: ['..']
      },
      proxy: {
        '/sjxy-portal': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
          configure: proxy => {
            proxy.on('proxyRes', proxyRes => {
              proxyRes.headers['cache-control'] =
                'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
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
      // 启用 CSS 代码分割
      cssCodeSplit: true,
      // 禁用模块预加载 - 让大型库真正按需加载
      modulePreload: false,

      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html')
        },
        output: {
          // 优化代码分割，减少首屏加载体积
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined

            // Element Plus 合并为一个 chunk（避免组件间循环依赖导致初始化错误）
            if (/element-plus|@element-plus|@popperjs|@floating-ui/.test(id))
              return 'vendor-element'

            // 大型库单独分割（懒加载）
            if (/vue-echarts|echarts/.test(id)) return 'vendor-echarts'
            if (/codemirror|@codemirror|vue-codemirror/.test(id)) return 'vendor-codemirror'
            if (/bpmn-js|diagram-js/.test(id)) return 'vendor-bpmn'
            if (/xlsx|mammoth/.test(id)) return 'vendor-doc'

            // Vue 核心（首屏必需）
            if (/vue-router|pinia|@vue\//.test(id)) return 'vendor-vue'
            if (/^vue$|vue[\\/]dist/.test(id)) return 'vendor-vue'

            // 工具类库（首屏必需，体积小）
            if (/axios|crypto-js/.test(id)) return 'vendor-utils'

            return 'vendor'
          },
          chunkFileNames: 'js/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: assetInfo => {
            const fileName = assetInfo.names?.[0] || 'asset'
            const info = fileName.split('.')
            const ext = info[info.length - 1]
            if (/(\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$)/i.test(fileName))
              return `media/[name]-[hash].${ext}`
            if (/(\.(png|jpe?g|gif|svg)(\?.*)?$)/i.test(fileName))
              return `images/[name]-[hash].${ext}`
            if (/(\.(woff2?|eot|ttf|otf)(\?.*)?$)/i.test(fileName))
              return `fonts/[name]-[hash].${ext}`
            return `assets/[name]-[hash].${ext}`
          }
        }
      },

      minify: isProduction ? 'esbuild' : false,

      reportCompressedSize: isProduction,
      chunkSizeWarningLimit: 500 // 降低警告阈值，鼓励更细粒度分割
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
