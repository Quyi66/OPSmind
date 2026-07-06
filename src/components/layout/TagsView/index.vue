<template>
  <div
    id="tags-view-container"
    class="tags-view-container"
  >
    <span
      class="tags-nav-btn tags-nav-btn--left"
      :class="{ disabled: !canScrollLeft }"
      @click="scrollLeft"
    >
      <el-icon><ArrowLeft /></el-icon>
    </span>

    <ScrollPane
      ref="scrollPane"
      class="tags-view-wrapper"
      @scroll="handleScroll"
      @update-arrows="updateArrowState"
    >
      <router-link
        v-for="tag in visitedViews"
        :key="tag.path"
        :to="{ path: tag.path, query: tag.query }"
        custom
        v-slot="{ navigate }"
      >
        <span
          :ref="setTagRef"
          :data-path="tag.path"
          class="tags-view-item"
          :class="{ active: isActive(tag) }"

          @click="navigate"
          @click.middle="!isAffix(tag) ? closeSelectedTag(tag) : ''"
          @contextmenu.prevent="openMenu(tag, $event)"
        >
          {{ tag.title }}
          <el-icon
            v-if="!isAffix(tag)"
            class="icon-close"
            @click.prevent.stop="closeSelectedTag(tag)"
          >
            <Close />
          </el-icon>
        </span>
      </router-link>
    </ScrollPane>

    <span
      class="tags-nav-btn tags-nav-btn--right"
      :class="{ disabled: !canScrollRight }"
      @click="scrollRight"
    >
      <el-icon><ArrowRight /></el-icon>
    </span>

    <el-dropdown
      class="tags-action-dropdown"
      trigger="click"
      placement="bottom-end"
      @command="handleDropdownCommand"
    >
      <span class="tags-action-btn">
        <el-icon><ArrowDown /></el-icon>
      </span>
      <template #dropdown>
        <el-dropdown-menu class="tags-dropdown-menu">
          <el-dropdown-item v-if="!isAffix(selectedDropdownTag)" command="close">
            <el-icon><Close /></el-icon>
            关闭当前
          </el-dropdown-item>
          <el-dropdown-item command="closeOthers">
            <el-icon><CircleClose /></el-icon>
            关闭其他
          </el-dropdown-item>
          <el-dropdown-item command="closeLeft" :disabled="isFirstView()">
            <el-icon><Back /></el-icon>
            关闭左侧
          </el-dropdown-item>
          <el-dropdown-item command="closeRight" :disabled="isLastView()">
            <el-icon><Right /></el-icon>
            关闭右侧
          </el-dropdown-item>
          <el-dropdown-item command="closeAll">
            <el-icon><CircleClose /></el-icon>
            全部关闭
          </el-dropdown-item>
          <el-dropdown-item command="fullscreen" divided>
            <template v-if="!isFullscreen">
              <el-icon><FullScreen /></el-icon>
              全屏显示
            </template>
            <template v-else>
              <el-icon><Close /></el-icon>
              退出全屏
            </template>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <span
      class="tags-action-btn tags-refresh-btn"
      title="刷新页面"
      @click="refreshSelectedTag(selectedDropdownTag)"
    >
      <el-icon><RefreshRight /></el-icon>
      <span class="refresh-text">刷新</span>
    </span>

    <ul v-show="visible" :style="{ left: `${left}px`, top: `${top}px` }" class="contextmenu">
      <li @click="refreshSelectedTag(selectedTag)">
        <el-icon><RefreshRight /></el-icon>
        刷新页面
      </li>
      <li v-if="!isAffix(selectedTag)" @click="closeSelectedTag(selectedTag)">
        <el-icon><Close /></el-icon>
        关闭当前
      </li>
      <li @click="closeOthersTags">
        <el-icon><CircleClose /></el-icon>
        关闭其他
      </li>
      <li v-if="!isFirstView()" @click="closeLeftTags">
        <el-icon><Back /></el-icon>
        关闭左侧
      </li>
      <li v-if="!isLastView()" @click="closeRightTags">
        <el-icon><Right /></el-icon>
        关闭右侧
      </li>
      <li @click="closeAllTags">
        <el-icon><CircleClose /></el-icon>
        全部关闭
      </li>
    </ul>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onBeforeUpdate, onMounted, computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Back,
  CircleClose,
  Close,
  FullScreen,
  RefreshRight,
  Right
} from '@element-plus/icons-vue'
import { useTagsViewStore } from '@/stores/tagsView'
import ScrollPane from './ScrollPane.vue'

const tagsViewStore = useTagsViewStore()
const { visitedViews, isFullscreen } = storeToRefs(tagsViewStore)

const route = useRoute()
const router = useRouter()

const visible = ref(false)
const top = ref(0)
const left = ref(0)
const selectedTag = ref({})
const affixTags = ref([])
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

const scrollPane = ref(null)
const tagRefs = ref([])



const selectedDropdownTag = computed(() => {
  return visitedViews.value.find(tag => isActive(tag)) || {}
})



const setTagRef = el => {
  if (el) {
    tagRefs.value.push(el)
  }
}

// Vue 3 推荐：在每次更新前清空动态 ref 列表，避免时序问题
onBeforeUpdate(() => {
  tagRefs.value = []
})

watch(
  visitedViews,
  () => {
    nextTick(() => {
      updateArrowState()
    })
  },
  { deep: true }
)

watch(route, () => {
  addTags()
  moveToCurrentTag()
})

watch(visible, value => {
  if (value) {
    document.body.addEventListener('click', closeMenu)
  } else {
    document.body.removeEventListener('click', closeMenu)
  }
})

onMounted(() => {
  initTags()
  addTags()
  window.addEventListener('resize', updateArrowState)
  window.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
  // 退出时恢复全屏状态
  if (isFullscreen.value) {
    tagsViewStore.setFullscreen(false)
  }
  document.body.removeEventListener('click', closeMenu)
  window.removeEventListener('resize', updateArrowState)
  window.removeEventListener('keydown', handleKeyDown)
})

function handleKeyDown(event) {
  if (event.key === 'Escape' && isFullscreen.value) {
    tagsViewStore.toggleFullscreen()
  }
}



function isActive(tagRoute) {
  return tagRoute.path === route.path
}



function isAffix(tag) {
  return Boolean(tag?.meta?.affix)
}

function getCurrentContextTag() {
  return selectedTag.value?.fullPath ? selectedTag.value : selectedDropdownTag.value
}

function isFirstView() {
  const tag = getCurrentContextTag()
  if (!tag?.fullPath) {
    return false
  }

  return tag.fullPath === '/home' || tag.fullPath === visitedViews.value[0]?.fullPath
}

function isLastView() {
  const tag = getCurrentContextTag()
  if (!tag?.fullPath) {
    return false
  }

  return tag.fullPath === visitedViews.value[visitedViews.value.length - 1]?.fullPath
}

function filterAffixTags(routes) {
  const tags = []

  routes.forEach(routeRecord => {
    if (routeRecord.meta?.affix) {
      tags.push({
        fullPath: routeRecord.path,
        path: routeRecord.path,
        name: routeRecord.name,
        meta: { ...routeRecord.meta },
        title: routeRecord.meta.title || '首页'
      })
    }
  })

  return tags
}

function initTags() {
  tagsViewStore.loadPersistedViews()
  affixTags.value = filterAffixTags(router.getRoutes())

  affixTags.value.forEach(tag => {
    if (tag.name) {
      tagsViewStore.addAffixView(tag)
    }
  })
}

function addTags() {
  if (route.path === '/home' || route.path === '/') return
  if (route.name && route.meta?.title) {
    tagsViewStore.addView({
      path: route.path,
      fullPath: route.fullPath,
      name: route.name,
      meta: { ...route.meta },
      query: route.query
    })
  }
}

function moveToCurrentTag() {
  nextTick(() => {
    for (const tagEl of tagRefs.value) {
      if (!tagEl) {
        continue
      }

      const tagPath = tagEl.getAttribute('data-path')
      if (tagPath !== route.path) {
        continue
      }

      scrollPane.value?.moveToTarget(tagEl, tagRefs.value)

      const tagView = visitedViews.value.find(tag => tag.path === tagPath)
      if (tagView && tagView.fullPath !== route.fullPath) {
        tagsViewStore.updateVisitedView({
          path: route.path,
          fullPath: route.fullPath,
          name: route.name,
          meta: { ...route.meta },
          query: route.query
        })
      }

      break
    }
    updateArrowState()
  })
}

function scrollLeft() {
  if (canScrollLeft.value) {
    scrollPane.value?.scrollLeft()
  }
}

function scrollRight() {
  if (canScrollRight.value) {
    scrollPane.value?.scrollRight()
  }
}

function updateArrowState() {
  const update = () => {
    if (!scrollPane.value) return
    const state = scrollPane.value.getScrollState()
    canScrollLeft.value = state?.canLeft ?? false
    canScrollRight.value = state?.canRight ?? false
  }
  nextTick(update)
  setTimeout(update, 100)
}

function toggleFullscreen() {
  tagsViewStore.toggleFullscreen()
}

function handleDropdownCommand(command) {
  selectedTag.value = selectedDropdownTag.value

  switch (command) {
    case 'refresh':
      refreshSelectedTag(selectedTag.value)
      break
    case 'fullscreen':
      toggleFullscreen()
      break
    case 'close':
      closeSelectedTag(selectedTag.value)
      break
    case 'closeOthers':
      closeOthersTags()
      break
    case 'closeLeft':
      closeLeftTags()
      break
    case 'closeRight':
      closeRightTags()
      break
    case 'closeAll':
      closeAllTags()
      break
  }
}

function refreshSelectedTag(view) {
  if (!view?.path) {
    return
  }

  router.replace({
    path: `/redirect${view.path}`,
    query: view.query
  }).catch(err => {
    console.warn('[TagsView] 刷新页面失败，redirect 路由可能未正确注册：', err)
  })
}

function closeSelectedTag(view) {
  tagsViewStore.delView(view).then(({ visitedViews: nextVisitedViews }) => {
    if (isActive(view)) {
      toLastView(nextVisitedViews)
    }
  })
}

function closeRightTags() {
  tagsViewStore.delRightTags(selectedTag.value).then(nextVisitedViews => {
    if (!nextVisitedViews.find(tag => tag.path === route.path)) {
      toLastView(nextVisitedViews)
    }
  })
}

function closeLeftTags() {
  tagsViewStore.delLeftTags(selectedTag.value).then(nextVisitedViews => {
    if (!nextVisitedViews.find(tag => tag.path === route.path)) {
      toLastView(nextVisitedViews)
    }
  })
}

function closeOthersTags() {
  router.push(selectedTag.value.fullPath).catch(() => {})
  tagsViewStore.delOthersViews(selectedTag.value).then(() => {
    moveToCurrentTag()
  })
}

function closeAllTags() {
  tagsViewStore.delAllViews().then(({ visitedViews: nextVisitedViews }) => {
    if (!affixTags.value.some(tag => tag.path === route.path)) {
      toLastView(nextVisitedViews)
    }
  })
}

function toLastView(currentVisitedViews) {
  const latestView = currentVisitedViews.slice(-1)[0]
  if (latestView) {
    router.push(latestView.fullPath)
  } else {
    router.push('/home')
  }
}

function openMenu(tag, event) {
  const menuWidth = 160
  const menuHeight = 210
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  left.value = event.clientX + menuWidth > viewportWidth
    ? viewportWidth - menuWidth - 8
    : event.clientX
  top.value = event.clientY + menuHeight > viewportHeight
    ? viewportHeight - menuHeight - 8
    : event.clientY

  visible.value = true
  selectedTag.value = tag
}

function closeMenu() {
  visible.value = false
}

function handleScroll() {
  closeMenu()
  updateArrowState()
}
</script>

<style lang="scss" scoped>
$tags-bar-height: 34px;

.tags-view-container {
  width: 100%;
  height: $tags-bar-height;
  display: flex;
  align-items: center;
  overflow: hidden;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);

  $btn-width: 32px;
  $btn-color: var(--el-text-color-regular);
  $btn-hover-bg: var(--el-fill-color-light);
  $btn-hover-color: var(--el-text-color-primary);
  $btn-disabled-color: var(--el-text-color-disabled);
  $divider: 1px solid var(--el-border-color-light);

  .tags-nav-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: $btn-width;
    height: $tags-bar-height;
    color: $btn-color;
    font-size: 13px;
    cursor: pointer;
    user-select: none;
    transition:
      background 0.15s,
      color 0.15s;

    &:hover:not(.disabled) {
      background: $btn-hover-bg;
      color: $btn-hover-color;
    }

    &.disabled {
      color: $btn-disabled-color;
      cursor: not-allowed;
    }

    &--left {
      border-right: $divider;
    }

    &--right {
      border-left: $divider;
    }
  }

  .tags-view-wrapper {
    flex: 1;
    min-width: 0;
    height: 100%;

    .tags-view-item {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 24px;
      margin: 5px 0 5px 5px;
      padding: 0 8px;
      color: var(--el-text-color-regular);
      font-size: 12px;
      line-height: 24px;
      text-decoration: none;
      cursor: pointer;
      background: var(--el-bg-color);
      border: 1px solid var(--el-border-color-light);
      border-radius: 4px;
      transition: all 0.2s;

      &:first-of-type {
        margin-left: 6px;
      }

      &:last-of-type {
        margin-right: 15px;
      }

      &:hover {
        color: var(--el-text-color-primary);
        background-color: var(--el-fill-color-lighter);
      }

      &.active {
        color: #409EFF !important;

        &::before {
          position: relative;
          display: inline-block;
          width: 6px;
          height: 6px;
          content: '';
          background: #409EFF;
          border-radius: 50%;
        }
      }

      .icon-close {
        width: 14px;
        height: 14px;
        font-size: 10px;
        text-align: center;
        border-radius: 50%;
        transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);

        &:hover {
          color: #fff;
          background-color: var(--el-text-color-placeholder);
        }
      }
    }
  }

  .tags-action-dropdown {
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  .tags-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: $btn-width;
    height: $tags-bar-height;
    color: $btn-color;
    font-size: 13px;
    cursor: pointer;
    user-select: none;
    border-left: $divider;
    transition:
      background 0.15s,
      color 0.15s;

    &:hover {
      background: $btn-hover-bg;
      color: $btn-hover-color;
    }
  }

  .tags-refresh-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    width: 64px;
    height: $tags-bar-height;
    color: $btn-color;
    font-size: 12px;
    cursor: pointer;
    user-select: none;
    border-left: $divider;
    transition: all 0.2s;

    &:hover {
      background: $btn-hover-bg;
      color: $btn-hover-color;
    }

    .refresh-text {
      font-size: 12px;
    }
  }

  .contextmenu {
    position: fixed;
    z-index: 3000;
    margin: 0;
    padding: 5px 0;
    color: var(--el-text-color-primary);
    font-size: 12px;
    font-weight: 400;
    list-style-type: none;
    background: var(--el-bg-color-overlay);
    border: 1px solid var(--el-border-color-light);
    border-radius: 4px;
    box-shadow: var(--el-box-shadow-light);

    li {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0;
      padding: 7px 16px;
      cursor: pointer;

      &:hover {
        color: var(--el-color-primary);
        background: var(--el-fill-color-light);
      }
    }
  }
}
</style>
