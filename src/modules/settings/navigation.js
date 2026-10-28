export const SSC_DEFAULT_ROUTE = '/ssc/param'

// Keep old addresses/names as redirects, without loading the retired pages.
export const RETIRED_SETTINGS_PAGES = [
  { path: 'applet', name: 'ssc-applet' },
  { path: 'tag', name: 'ssc-tag' },
  { path: 'appres', name: 'ssc-appres' }
]

export function isRetiredSettingsView(view) {
  const path = String(view?.path || view?.fullPath || '')
    .split(/[?#]/)[0]
    .replace(/\/$/, '')
    .toLowerCase()
  return RETIRED_SETTINGS_PAGES.some(
    page => view?.name === page.name || path === `/ssc/${page.path}`
  )
}
