import { defineStore } from 'pinia'

/**
 * TagsView 标签页状态管理
 * 用于管理多标签页的状态
 */
export const useTagsViewStore = defineStore('tagsView', {
  state: () => ({
    // 已访问的视图列表
    visitedViews: [],
    // 缓存的视图列表（用于keep-alive）
    cachedViews: [],
    // iframe视图列表
    iframeViews: []
  }),

  actions: {
    /**
     * 添加视图（同时添加到已访问和缓存列表）
     */
    addView(view) {
      this.addVisitedView(view)
      this.addCachedView(view)
    },

    /**
     * 添加到已访问视图列表
     * 确保 affix 标签（如首页）始终在第一位
     */
    addVisitedView(view) {
      // 如果已存在则不重复添加
      if (this.visitedViews.some(v => v.path === view.path)) return

      const newView = Object.assign({}, view, {
        title: view.meta?.title || 'no-name'
      })

      this.visitedViews.push(newView)

      // 排序：affix 标签在前，非 affix 标签在后
      this.visitedViews.sort((a, b) => {
        const aAffix = a.meta?.affix ? 1 : 0
        const bAffix = b.meta?.affix ? 1 : 0
        return bAffix - aAffix
      })
    },

    /**
     * 添加到缓存视图列表
     */
    addCachedView(view) {
      if (this.cachedViews.includes(view.name)) return
      if (!view.meta?.noCache) {
        this.cachedViews.push(view.name)
      }
    },

    /**
     * 添加iframe视图
     */
    addIframeView(view) {
      if (this.iframeViews.some(v => v.path === view.path)) return
      this.iframeViews.push(
        Object.assign({}, view, {
          title: view.meta?.title || 'no-name'
        })
      )
    },

    /**
     * 删除视图
     */
    delView(view) {
      return new Promise(resolve => {
        this.delVisitedView(view)
        this.delCachedView(view)
        resolve({
          visitedViews: [...this.visitedViews],
          cachedViews: [...this.cachedViews]
        })
      })
    },

    /**
     * 删除已访问视图
     */
    delVisitedView(view) {
      return new Promise(resolve => {
        for (const [i, v] of this.visitedViews.entries()) {
          if (v.path === view.path) {
            this.visitedViews.splice(i, 1)
            break
          }
        }
        this.iframeViews = this.iframeViews.filter(item => item.path !== view.path)
        resolve([...this.visitedViews])
      })
    },

    /**
     * 删除缓存视图
     */
    delCachedView(view) {
      return new Promise(resolve => {
        const index = this.cachedViews.indexOf(view.name)
        if (index > -1) {
          this.cachedViews.splice(index, 1)
        }
        resolve([...this.cachedViews])
      })
    },

    /**
     * 删除iframe视图
     */
    delIframeView(view) {
      return new Promise(resolve => {
        this.iframeViews = this.iframeViews.filter(item => item.path !== view.path)
        resolve([...this.iframeViews])
      })
    },

    /**
     * 删除其他视图
     */
    delOthersViews(view) {
      return new Promise(resolve => {
        this.delOthersVisitedViews(view)
        this.delOthersCachedViews(view)
        resolve({
          visitedViews: [...this.visitedViews],
          cachedViews: [...this.cachedViews]
        })
      })
    },

    /**
     * 删除其他已访问视图
     */
    delOthersVisitedViews(view) {
      return new Promise(resolve => {
        this.visitedViews = this.visitedViews.filter(v => {
          return v.meta?.affix || v.path === view.path
        })
        this.iframeViews = this.iframeViews.filter(item => item.path === view.path)
        resolve([...this.visitedViews])
      })
    },

    /**
     * 删除其他缓存视图
     */
    delOthersCachedViews(view) {
      return new Promise(resolve => {
        const index = this.cachedViews.indexOf(view.name)
        if (index > -1) {
          this.cachedViews = this.cachedViews.slice(index, index + 1)
        } else {
          this.cachedViews = []
        }
        resolve([...this.cachedViews])
      })
    },

    /**
     * 删除所有视图
     */
    delAllViews() {
      return new Promise(resolve => {
        this.delAllVisitedViews()
        this.delAllCachedViews()
        resolve({
          visitedViews: [...this.visitedViews],
          cachedViews: [...this.cachedViews]
        })
      })
    },

    /**
     * 删除所有已访问视图
     */
    delAllVisitedViews() {
      return new Promise(resolve => {
        // 保留固定标签
        const affixTags = this.visitedViews.filter(tag => tag.meta?.affix)
        this.visitedViews = affixTags
        this.iframeViews = []
        resolve([...this.visitedViews])
      })
    },

    /**
     * 删除所有缓存视图
     */
    delAllCachedViews() {
      return new Promise(resolve => {
        this.cachedViews = []
        resolve([...this.cachedViews])
      })
    },

    /**
     * 更新已访问视图
     */
    updateVisitedView(view) {
      for (let v of this.visitedViews) {
        if (v.path === view.path) {
          v = Object.assign(v, view)
          break
        }
      }
    },

    /**
     * 删除右侧标签
     */
    delRightTags(view) {
      return new Promise(resolve => {
        const index = this.visitedViews.findIndex(v => v.path === view.path)
        if (index === -1) return

        this.visitedViews = this.visitedViews.filter((item, idx) => {
          if (idx <= index || (item.meta && item.meta.affix)) {
            return true
          }
          const i = this.cachedViews.indexOf(item.name)
          if (i > -1) {
            this.cachedViews.splice(i, 1)
          }
          if (item.meta?.link) {
            const fi = this.iframeViews.findIndex(v => v.path === item.path)
            if (fi > -1) this.iframeViews.splice(fi, 1)
          }
          return false
        })
        resolve([...this.visitedViews])
      })
    },

    /**
     * 删除左侧标签
     */
    delLeftTags(view) {
      return new Promise(resolve => {
        const index = this.visitedViews.findIndex(v => v.path === view.path)
        if (index === -1) return

        this.visitedViews = this.visitedViews.filter((item, idx) => {
          if (idx >= index || (item.meta && item.meta.affix)) {
            return true
          }
          const i = this.cachedViews.indexOf(item.name)
          if (i > -1) {
            this.cachedViews.splice(i, 1)
          }
          if (item.meta?.link) {
            const fi = this.iframeViews.findIndex(v => v.path === item.path)
            if (fi > -1) this.iframeViews.splice(fi, 1)
          }
          return false
        })
        resolve([...this.visitedViews])
      })
    }
  }
})
