export const LEGACY_TAGS_VIEW_PERSIST_KEY = 'tags-view-visited'

const TAGS_VIEW_PERSIST_KEY_PREFIX = `${LEGACY_TAGS_VIEW_PERSIST_KEY}:`

interface TagsViewStorageUser {
  id?: string | number | null
  login?: string | null
  tenantId?: string | number | null
}

export function getTagsViewPersistKey(user?: TagsViewStorageUser | null): string | null {
  const userId = user?.id || user?.login

  if (!userId) return null

  const tenantId = user?.tenantId || 'default'
  return `${TAGS_VIEW_PERSIST_KEY_PREFIX}${encodeURIComponent(
    String(tenantId)
  )}:${encodeURIComponent(String(userId))}`
}

export function clearPersistedTagsView(user?: TagsViewStorageUser | null): void {
  localStorage.removeItem(LEGACY_TAGS_VIEW_PERSIST_KEY)

  const persistKey = getTagsViewPersistKey(user)
  if (persistKey) {
    localStorage.removeItem(persistKey)
  }
}
