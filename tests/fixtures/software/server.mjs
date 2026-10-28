import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'

const root = path.dirname(fileURLToPath(import.meta.url))
const workspace = path.resolve(root, '../../..')
const normalize = value => value.replaceAll('\\', '/')
const apiPath = normalize(path.join(workspace, 'src/modules/software/api'))
const server = await createServer({
  configFile: false,
  root,
  cacheDir: path.join(workspace, 'node_modules/.vite-software-fixture'),
  plugins: [
    {
      name: 'software-fixture-isolation',
      enforce: 'pre',
      resolveId(source, importer) {
        const resolved =
          source.startsWith('.') && importer
            ? normalize(path.resolve(path.dirname(importer.split('?')[0]), source))
            : normalize(source)
        if ([apiPath, `${apiPath}/index.js`, '@/modules/software/api'].includes(resolved)) {
          return path.join(root, 'mockApi.js')
        }
        if (
          resolved.includes('/composables/useJobPolling') ||
          /AcmDeviceSelector(?:Dialog)?\.vue$/.test(resolved)
        ) {
          return path.join(root, 'blockedDependencies.js')
        }
        if (resolved.includes('/core/api')) {
          throw new Error(`Real API dependency is forbidden in this fixture: ${source}`)
        }
      },
      configureServer(devServer) {
        devServer.middlewares.use((req, res, next) => {
          if (/^\/(?:api|workflow|dashboard|secops|workspace)(?:\/|$)/.test(req.url || '')) {
            res.statusCode = 403
            res.end('Business requests are forbidden in the software fixture')
            return
          }
          next()
        })
      }
    },
    vue()
  ],
  resolve: { alias: { '@': path.join(workspace, 'src') } },
  server: { host: '127.0.0.1', port: 5586, strictPort: true, fs: { allow: [workspace] } }
})
await server.listen()
console.log('Software fixture: http://127.0.0.1:5586/ (mock only; type q to stop)')
process.stdin.setEncoding('utf8')
process.stdin.on('data', async input => {
  if (input.trim() === 'q') {
    await server.close()
    process.exit(0)
  }
})
