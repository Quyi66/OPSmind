declare module 'unplugin-icons/vite' {
  import type { Plugin } from 'vite'

  const icons: (options?: any) => Plugin
  export default icons
}

declare module 'unplugin-icons/resolver' {
  import type { ComponentResolver } from 'unplugin-vue-components'

  const resolver: (options?: any) => ComponentResolver
  export default resolver
}
