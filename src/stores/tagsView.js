import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authService } from '@/core/auth'

const LEGACY_PERSIST_KEY = 'tags-view-visited'
const PERSIST_KEY_PREFIX = `${LEGACY_PERSIST_KEY}:`

function getPersistKey() {
  const user = authService.getCurrentUser()
  const userId = user?.id || user?.login

  if (!userId) return null

  const tenantId = user?.tenantId || 'default'
  return `${PERSIST_KEY_PREFIX}${encodeURIComponent(tenantId)}:${encodeURIComponent(userId)}`
}

export const useTagsViewStore = defineStore('tagsView', () => {
  // 状态
  const visitedViews = ref([])
  const cachedViews = ref([])
  const iframeViews = ref([])
  const isFullscreen = ref(false)
  let loadedPersistKey = null

  const clearViewState = () => {
    visitedViews.value = []
    cachedViews.value = []
    iframeViews.value = []
    isFullscreen.value = false
  }

  // 辅助方法：持久化缓存
  const saveVisitedViews = () => {
    const persistKey = getPersistKey()
    if (!persistKey) return

    const toSave = visitedViews.value
      .filter(v => !(v.meta && v.meta.affix))
      .map(v => ({
        path: v.path,
        fullPath: v.fullPath,
        name: v.name,
        title: v.title || v.meta?.title || 'no-name',
        query: v.query,
        meta: { ...v.meta }
      }))
    localStorage.setItem(persistKey, JSON.stringify(toSave))
  }

  const loadPersistedViews = () => {
    try {
      const persistKey = getPersistKey()
      if (!persistKey || loadedPersistKey === persistKey) return

      // 旧版本使用全局 key，无法安全归属到任何用户，升级后直接丢弃。
      localStorage.removeItem(LEGACY_PERSIST_KEY)

      // 账号发生切换时，连同 KeepAlive 和 iframe 状态一起清空，避免页面实例跨用户复用。
      clearViewState()
      loadedPersistKey = persistKey

      const stored = localStorage.getItem(persistKey)
      if (stored) {
        const views = JSON.parse(stored)
        views.forEach(view => {
          addVisitedView(view)
        })
      }
    } catch (e) {
      console.error('Failed to load persisted tags', e)
    }
  }

  // 动作
  const addView = (view) => {
    addVisitedView(view)
    addCachedView(view)
  }

  const addIframeView = (view) => {
    if (iframeViews.value.some(v => v.path === view.path)) return
    iframeViews.value.push(
      Object.assign({}, view, {
        title: view.meta?.title || 'no-name'
      })
    )
  }

  const addVisitedView = (view) => {
    if (visitedViews.value.some(v => v.path === view.path)) return
    
    // 确保有正确的 title
    const title = view.meta?.title || view.title || 'no-name'
    visitedViews.value.push(
      Object.assign({}, view, {
        title
      })
    )
    saveVisitedViews()
  }

  const addAffixView = (view) => {
    if (visitedViews.value.some(v => v.path === view.path)) return
    const title = view.meta?.title || view.title || 'no-name'
    visitedViews.value.unshift(
      Object.assign({}, view, {
        title
      })
    )
  }

  const addCachedView = (view) => {
    if (cachedViews.value.includes(view.name)) return
    if (view.meta && !view.meta.noCache && view.name) {
      cachedViews.value.push(view.name)
    }
  }

  const delView = (view) => {
    return new Promise(resolve => {
      delVisitedView(view)
      delCachedView(view)
      resolve({
        visitedViews: [...visitedViews.value],
        cachedViews: [...cachedViews.value]
      })
    })
  }

  const delVisitedView = (view) => {
    return new Promise(resolve => {
      for (const [i, v] of visitedViews.value.entries()) {
        if (v.path === view.path) {
          visitedViews.value.splice(i, 1)
          break
        }
      }
      iframeViews.value = iframeViews.value.filter(item => item.path !== view.path)
      saveVisitedViews()
      resolve([...visitedViews.value])
    })
  }

  const delIframeView = (view) => {
    return new Promise(resolve => {
      iframeViews.value = iframeViews.value.filter(item => item.path !== view.path)
      resolve([...iframeViews.value])
    })
  }

  const delCachedView = (view) => {
    return new Promise(resolve => {
      if (view.name) {
        const index = cachedViews.value.indexOf(view.name)
        if (index > -1) {
          cachedViews.value.splice(index, 1)
        }
      }
      resolve([...cachedViews.value])
    })
  }

  const delOthersViews = (view) => {
    return new Promise(resolve => {
      delOthersVisitedViews(view)
      delOthersCachedViews(view)
      resolve({
        visitedViews: [...visitedViews.value],
        cachedViews: [...cachedViews.value]
      })
    })
  }

  const delOthersVisitedViews = (view) => {
    return new Promise(resolve => {
      visitedViews.value = visitedViews.value.filter(v => {
        return (v.meta && v.meta.affix) || v.path === view.path
      })
      iframeViews.value = iframeViews.value.filter(item => item.path === view.path)
      saveVisitedViews()
      resolve([...visitedViews.value])
    })
  }

  const delOthersCachedViews = (view) => {
    return new Promise(resolve => {
      if (view.name) {
        const index = cachedViews.value.indexOf(view.name)
        if (index > -1) {
          cachedViews.value = cachedViews.value.slice(index, index + 1)
        } else {
          cachedViews.value = []
        }
      } else {
        cachedViews.value = []
      }
      resolve([...cachedViews.value])
    })
  }

  const delAllViews = () => {
    return new Promise(resolve => {
      delAllVisitedViews()
      delAllCachedViews()
      resolve({
        visitedViews: [...visitedViews.value],
        cachedViews: [...cachedViews.value]
      })
    })
  }

  const delAllVisitedViews = () => {
    return new Promise(resolve => {
      const affixTags = visitedViews.value.filter(tag => tag.meta && tag.meta.affix)
      visitedViews.value = affixTags
      iframeViews.value = []
      const persistKey = getPersistKey()
      if (persistKey) localStorage.removeItem(persistKey)
      resolve([...visitedViews.value])
    })
  }

  const delAllCachedViews = () => {
    return new Promise(resolve => {
      cachedViews.value = []
      resolve([...cachedViews.value])
    })
  }

  const updateVisitedView = (view) => {
    for (let v of visitedViews.value) {
      if (v.path === view.path) {
        Object.assign(v, view)
        break
      }
    }
  }

  const delRightTags = (view) => {
    return new Promise(resolve => {
      const index = visitedViews.value.findIndex(v => v.path === view.path)
      if (index === -1) {
        return resolve([...visitedViews.value])
      }
      visitedViews.value = visitedViews.value.filter((item, idx) => {
        if (idx <= index || (item.meta && item.meta.affix)) {
          return true
        }
        const i = cachedViews.value.indexOf(item.name)
        if (i > -1) {
          cachedViews.value.splice(i, 1)
        }
        if (item.meta && item.meta.link) {
          const fi = iframeViews.value.findIndex(v => v.path === item.path)
          if (fi > -1) iframeViews.value.splice(fi, 1)
        }
        return false
      })
      saveVisitedViews()
      resolve([...visitedViews.value])
    })
  }

  const delLeftTags = (view) => {
    return new Promise(resolve => {
      const index = visitedViews.value.findIndex(v => v.path === view.path)
      if (index === -1) {
        return resolve([...visitedViews.value])
      }
      visitedViews.value = visitedViews.value.filter((item, idx) => {
        if (idx >= index || (item.meta && item.meta.affix)) {
          return true
        }
        const i = cachedViews.value.indexOf(item.name)
        if (i > -1) {
          cachedViews.value.splice(i, 1)
        }
        if (item.meta && item.meta.link) {
          const fi = iframeViews.value.findIndex(v => v.path === item.path)
          if (fi > -1) iframeViews.value.splice(fi, 1)
        }
        return false
      })
      saveVisitedViews()
      resolve([...visitedViews.value])
    })
  }

  const toggleFullscreen = () => {
    isFullscreen.value = !isFullscreen.value
  }

  const setFullscreen = (value) => {
    isFullscreen.value = value
  }

  return {
    visitedViews,
    cachedViews,
    iframeViews,
    isFullscreen,
    loadPersistedViews,
    addView,
    addVisitedView,
    addAffixView,
    addCachedView,
    addIframeView,
    delView,
    delVisitedView,
    delCachedView,
    delIframeView,
    delOthersViews,
    delAllViews,
    updateVisitedView,
    delRightTags,
    delLeftTags,
    toggleFullscreen,
    setFullscreen
  }
})
