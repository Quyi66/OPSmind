import { defineConfig, loadEnv, type Plugin, type UserConfig } from 'vite'
import { transform as esbuildTransform } from 'esbuild'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'path'
import { createHash } from 'node:crypto'
import { writeFileSync, readFileSync, existsSync } from 'node:fs'

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

/**
 * 加载本地 SSL 证书（用于 Vite dev server HTTPS）
 * 证书不存在时返回 undefined，Vite 将回退到 HTTP
 */
function loadDevSSL(): { key: Buffer; cert: Buffer } | undefined {
  const keyPath = resolve(import.meta.dirname, 'docker/nginx/ssl/server.key')
  const certPath = resolve(import.meta.dirname, 'docker/nginx/ssl/server.crt')
  if (existsSync(keyPath) && existsSync(certPath)) {
    return {
      key: readFileSync(keyPath),
      cert: readFileSync(certPath)
    }
  }
  console.warn('[vite-config] SSL certs not found at docker/nginx/ssl/, falling back to HTTP.')
  return undefined
}

// 构建时生成唯一 hash，用于前端版本更新检测
function buildVersionPlugin(buildHash: string, outDir: string): Plugin {
  return {
    name: 'opsmind-build-version',
    apply: 'build',
    closeBundle() {
      const versionData = JSON.stringify({ hash: buildHash, buildTime: new Date().toISOString() })
      writeFileSync(resolve(import.meta.dirname, outDir, 'version.json'), versionData)
    }
  }
}

/**
 * Vite 8 的 Rolldown/Oxc minifier 暂不支持 dropConsole，
 * 通过 esbuild transform API 在构建时移除 console/debugger 语句。
 */
function dropConsolePlugin(
  drop: ('console' | 'debugger')[],
  { sourceRoot, sourcemap }: { sourceRoot: string; sourcemap: boolean }
): Plugin {
  const normalizedSourceRoot = `${sourceRoot.replace(/\\/g, '/')}/`

  return {
    name: 'opsmind-drop-console',
    apply: 'build',
    enforce: 'post',
    async transform(code, id) {
      const filepath = id.replace(/\\/g, '/')
      if (
        !id.includes('?') &&
        !id.startsWith('\0') &&
        filepath.startsWith(normalizedSourceRoot) &&
        /\.(vue|ts|js|tsx|jsx|mts|cts)$/.test(filepath)
      ) {
        const ext = filepath.split('.').pop()
        const loader = ext && ['js', 'jsx', 'ts', 'tsx'].includes(ext) ? (ext as any) : 'js'
        const result = await esbuildTransform(code, {
          loader,
          drop,
          minify: false,
          sourcemap
        })
        return { code: result.code, map: result.map || null }
      }
    }
  }
}

export default defineConfig(({ command, mode }): UserConfig => {
  const env = loadEnv(mode, process.cwd(), '')
  const isProduction = mode === 'production'
  const isDevelopment = mode === 'development'
  const shouldGenerateSourceMap = isDevelopment || env.VITE_BUILD_SOURCEMAP === 'true'
  const shouldCompress = isProduction && env.VITE_BUILD_GZIP !== 'false'
  const shouldReportPluginTimings = env.VITE_BUILD_PLUGIN_TIMINGS === 'true'
  const backendTarget = normalizeTarget(
    env.VITE_BACKEND_URL || env.VITE_BACKEND_PROXY_URL,
    DEFAULT_BACKEND_TARGET
  )

  // 每次构建生成唯一 hash
  const buildHash = createHash('md5').update(Date.now().toString() + Math.random().toString()).digest('hex').slice(0, 12)

  return {
    plugins: [
      vue({
        script: {
          defineModel: true,
          propsDestructure: true
        }
      }),

      // 构建时生成 version.json（仅生产环境）
      ...(isProduction ? [buildVersionPlugin(buildHash, env.VITE_BUILD_OUTDIR || 'dist')] : []),

      // 生产环境移除 console/debugger（Vite 8 Rolldown/Oxc 暂不支持 dropConsole，通过 esbuild transform 实现）
      ...(isProduction
        ? [
            dropConsolePlugin(
              env.VITE_DEBUG === 'true' ? ['debugger'] : ['console', 'debugger'],
              {
                sourceRoot: resolve(import.meta.dirname, 'src'),
                sourcemap: shouldGenerateSourceMap
              }
            )
          ]
        : []),

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
        // Declarations are only needed by the editor/type checker. Avoid rewriting
        // them during production builds, where Windows may have them temporarily locked.
        dts: isProduction ? false : 'src/auto-imports.d.ts'
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
        // See the AutoImport declaration setting above.
        dts: isProduction ? false : 'src/components.d.ts'
      }),

      // 图标支持（按需加载）
      Icons({
        autoInstall: true
      }),

      // 在开发环境下，将 /KoreOPS 重定向为 /KoreOPS/，避免 Vite base 提示
      {
        name: 'ops-trailing-slash-redirect',
        configureServer(server) {
          const base = mode === 'production' ? '/KoreOPS/' : '/KoreOPS/'
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

      // 生产环境启用 gzip 和 brotli 压缩；可用 VITE_BUILD_GZIP=false 跳过本地预压缩。
      ...(shouldCompress
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

    base: mode === 'production' ? '/KoreOPS/' : '/KoreOPS/',

    server: {
      port: parseInt(env.VITE_DEV_PORT) || 5173,
      host: env.VITE_DEV_HOST || '0.0.0.0',
      open: env.VITE_DEV_OPEN === 'true',
      cors: env.VITE_DEV_CORS === 'true',
      https: loadDevSSL(),
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0'
      },
      fs: {
        allow: ['..']
      },
      proxy: {
        // 开发环境下将服务器挂载的 changelog 静态文件转发到目标 Nginx。
        // 前端可与生产环境一致，始终使用 /KoreOPS/changelog/... 相对路径。
        '/KoreOPS/changelog': {
          target: backendTarget,
          changeOrigin: true,
          secure: false
        },
        '/sjxy-console': {
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
        '/sjxy-upload': {
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
      sourcemap: shouldGenerateSourceMap,
      target: ['chrome89', 'edge89', 'firefox89', 'safari15'],
      assetsInlineLimit: 4096,
      // 启用 CSS 代码分割
      cssCodeSplit: true,
      // 禁用模块预加载 - 让大型库真正按需加载
      modulePreload: false,

      rolldownOptions: {
        checks: {
          pluginTimings: shouldReportPluginTimings
        },
        input: {
          main: resolve(import.meta.dirname, 'index.html')
        },
        output: {
          // 优化代码分割，减少首屏加载体积
          codeSplitting: {
            minSize: 20000,
            groups: [
              {
                name: 'vendor-element',
                test: /node_modules[\\/](element-plus|@element-plus|@popperjs|@floating-ui)/,
                priority: 100
              },
              {
                name: 'vendor-echarts',
                test: /node_modules[\\/](vue-echarts|echarts)/,
                priority: 95
              },
              {
                name: 'vendor-zrender',
                test: /node_modules[\\/]zrender/,
                priority: 90
              },
              {
                name: 'vendor-codemirror',
                test: /node_modules[\\/](codemirror|@codemirror|@lezer|vue-codemirror)/,
                priority: 85
              },
              {
                name: 'vendor-bpmn',
                test: /node_modules[\\/](bpmn-js|diagram-js)/,
                priority: 80
              },
              {
                name: 'vendor-bpmn-core',
                test: /node_modules[\\/](bpmn-moddle|moddle|moddle-xml|saxen|bluebird)/,
                priority: 75
              },
              {
                name: 'vendor-xlsx',
                test: /node_modules[\\/]xlsx/,
                priority: 70
              },
              {
                name: 'vendor-doc',
                test: /node_modules[\\/](mammoth|jszip|@xmldom|dingbat-to-unicode)/,
                priority: 65
              },
              {
                name: 'vendor-lodash',
                test: /node_modules[\\/](lodash|lodash-es|lodash-unified|lodash\.merge)/,
                priority: 60
              },
              {
                name: 'vendor-vue',
                test: /node_modules[\\/](vue-router|pinia|@vue\/|vue$|vue[\\/]dist)/,
                priority: 55
              },
              {
                name: 'vendor-utils',
                test: /node_modules[\\/](axios|crypto-js)/,
                priority: 50
              },
              {
                name: 'vendor',
                test: /node_modules/,
                priority: 10
              }
            ]
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


      reportCompressedSize: shouldCompress,
      chunkSizeWarningLimit: 1000 // ECharts 体积较大但已懒加载，保留接近实际上限的预警阈值
    },

    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@/styles/variables.scss" as *;`
        }
      }
    },

    // console/debugger 移除已通过 dropConsolePlugin 实现（见插件配置）

    define: {
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
      __APP_BUILD_HASH__: JSON.stringify(buildHash)
    }
  }
})
