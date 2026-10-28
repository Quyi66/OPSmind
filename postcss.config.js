import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import legacyColorMixFallback from './scripts/postcss-legacy-colors.js'

export default {
  plugins: [tailwindcss(), autoprefixer(), legacyColorMixFallback()]
}
