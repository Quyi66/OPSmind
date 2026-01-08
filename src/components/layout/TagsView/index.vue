<template>
  <div class="tags-view-container">
    <ScrollPane ref="scrollPaneRef" class="tags-view-wrapper" @scroll="handleScroll">
      <router-link
        v-for="tag in visitedViews"
        :key="tag.path"
        :data-path="tag.path"
        :class="isActive(tag) ? 'active' : ''"
        :to="{ path: tag.path, query: tag.query, fullPath: tag.fullPath }"
        class="tags-view-item"
        @click.middle="!isAffix(tag) ? closeSelectedTag(tag) : ''"
        @contextmenu.prevent="openMenu(tag, $event)"
      >
        {{ tag.title }}
        <span v-if="!isAffix(tag)" class="tag-close" @click.prevent.stop="closeSelectedTag(tag)">
          <Close class="el-icon-close" />
        </span>
      </router-link>
    </ScrollPane>

    <!-- 右键菜单 -->
    <ul v-show="visible" :style="{ left: left + 'px', top: top + 'px' }" class="contextmenu">
      <li @click="refreshSelectedTag(selectedTag)">
        <Refresh style="width: 1em; height: 1em; margin-right: 4px;" /> 刷新页面
      </li>
      <li v-if="!isAffix(selectedTag)" @click="closeSelectedTag(selectedTag)">
        <Close style="width: 1em; height: 1em; margin-right: 4px;" /> 关闭当前
      </li>
      <li @click="closeOthersTags">
        <CircleClose style="width: 1em; height: 1em; margin-right: 4px;" /> 关闭其他
      </li>
      <li v-if="!isFirstView()" @click="closeLeftTags">
        <Back style="width: 1em; height: 1em; margin-right: 4px;" /> 关闭左侧
      </li>
      <li v-if="!isLastView()" @click="closeRightTags">
        <Right style="width: 1em; height: 1em; margin-right: 4px;" /> 关闭右侧
      </li>
      <li @click="closeAllTags(selectedTag)">
        <CircleClose style="width: 1em; height: 1em; margin-right: 4px;" /> 全部关闭
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, getCurrentInstance, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Close, Refresh, CircleClose, Back, Right } from '@element-plus/icons-vue'
import ScrollPane from './ScrollPane.vue'
import { useTagsViewStore } from '@/stores/tagsView'

const visible = ref(false)
const top = ref(0)
const left = ref(0)
const selectedTag = ref({})
const affixTags = ref([])
const scrollPaneRef = ref(null)

const { proxy } = getCurrentInstance()
const route = useRoute()
const router = useRouter()
const tagsViewStore = useTagsViewStore()

const visitedViews = computed(() => tagsViewStore.visitedViews)

watch(route, () => {
  addTags()
  moveToCurrentTag()
})

watch(visible, (value) => {
  if (value) {
    document.body.addEventListener('click', closeMenu)
  } else {
    document.body.removeEventListener('click', closeMenu)
  }
})

onMounted(() => {
  initTags()
  addTags()
})

function isActive(r) {
  return r.path === route.path
}

function isAffix(tag) {
  return tag.meta && tag.meta.affix
}

function isFirstView() {
  try {
    return selectedTag.value.fullPath === '/home' || selectedTag.value.fullPath === visitedViews.value[0]?.fullPath
  } catch (err) {
    return false
  }
}

function isLastView() {
  try {
    return selectedTag.value.fullPath === visitedViews.value[visitedViews.value.length - 1]?.fullPath
  } catch (err) {
    return false
  }
}

function filterAffixTags(routes, basePath = '') {
  let tags = []
  if (!routes) return tags

  routes.forEach(route => {
    if (route.meta && route.meta.affix) {
      const tagPath = basePath ? `${basePath}/${route.path}` : route.path
      tags.push({
        fullPath: tagPath,
        path: tagPath,
        name: route.name,
        meta: { ...route.meta }
      })
    }
    if (route.children) {
      const tempTags = filterAffixTags(route.children, route.path)
      if (tempTags.length >= 1) {
        tags = [...tags, ...tempTags]
      }
    }
  })
  return tags
}

function initTags() {
  // 添加首页为固定标签
  tagsViewStore.addVisitedView({
    path: '/home',
    name: 'home',
    fullPath: '/home',
    meta: { title: '首页', affix: true }
  })
}

function addTags() {
  const { name } = route
  if (name) {
    tagsViewStore.addView(route)
  }
  return false
}

function moveToCurrentTag() {
  nextTick(() => {
    for (const r of visitedViews.value) {
      if (r.path === route.path) {
        scrollPaneRef.value?.moveToTarget(r)
        if (r.fullPath !== route.fullPath) {
          tagsViewStore.updateVisitedView(route)
        }
      }
    }
  })
}

function refreshSelectedTag(view) {
  tagsViewStore.delCachedView(view)
  const { fullPath } = view
  nextTick(() => {
    router.replace({ path: '/redirect' + fullPath })
  })
}

function closeSelectedTag(view) {
  tagsViewStore.delView(view).then(({ visitedViews }) => {
    if (isActive(view)) {
      toLastView(visitedViews, view)
    }
  })
}

function closeRightTags() {
  tagsViewStore.delRightTags(selectedTag.value).then(visitedViews => {
    if (!visitedViews.find(i => i.fullPath === route.fullPath)) {
      toLastView(visitedViews)
    }
  })
}

function closeLeftTags() {
  tagsViewStore.delLeftTags(selectedTag.value).then(visitedViews => {
    if (!visitedViews.find(i => i.fullPath === route.fullPath)) {
      toLastView(visitedViews)
    }
  })
}

function closeOthersTags() {
  router.push(selectedTag.value).catch(() => {})
  tagsViewStore.delOthersViews(selectedTag.value).then(() => {
    moveToCurrentTag()
  })
}

function closeAllTags(view) {
  tagsViewStore.delAllViews().then(({ visitedViews }) => {
    if (affixTags.value.some(tag => tag.path === route.path)) {
      return
    }
    toLastView(visitedViews, view)
  })
}

function toLastView(visitedViews, view) {
  const latestView = visitedViews.slice(-1)[0]
  if (latestView) {
    router.push(latestView.fullPath)
  } else {
    router.push('/home')
  }
}

function openMenu(tag, e) {
  const menuMinWidth = 105
  // 使用固定定位，直接使用 clientX/clientY
  left.value = e.clientX
  top.value = e.clientY

  // 确保菜单不会超出屏幕右边界
  const menuWidth = 120
  if (left.value + menuWidth > window.innerWidth) {
    left.value = window.innerWidth - menuWidth - 10
  }

  // 确保菜单不会超出屏幕下边界
  const menuHeight = 180
  if (top.value + menuHeight > window.innerHeight) {
    top.value = window.innerHeight - menuHeight - 10
  }

  visible.value = true
  selectedTag.value = tag
}

function closeMenu() {
  visible.value = false
}

function handleScroll() {
  closeMenu()
}
</script>

<style lang="scss" scoped>
.tags-view-container {
  height: 34px;
  width: 100%;
  background: #f5f7fa;
  border-bottom: 1px solid #d8dce5;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.12), 0 0 3px 0 rgba(0, 0, 0, 0.04);

  .tags-view-wrapper {
    .tags-view-item {
      display: inline-block;
      position: relative;
      cursor: pointer;
      height: 100%;
      line-height: 28px;
      border-left: 1px solid #d8dce5;
      color: #495060;
      // background: #fff;
      padding: 0 12px;
      font-size: 12px;
      // margin-left: 5px;
      margin-top: 4px;
      text-decoration: none;

      &:first-of-type {
        // margin-left: 15px;
        border-left: none;
      }

      &:last-of-type {
        margin-right: 15px;
        border-right: 1px solid #d8dce5;
      }

      &.active {
        background-color: #fff;
        color: #409eff;
        // border-color: #409EFF;

        // &::before {
        //   content: "";
        //   background: #fff;
        //   display: inline-block;
        //   width: 8px;
        //   height: 8px;
        //   border-radius: 50%;
        //   position: relative;
        //   margin-right: 5px;
        // }
      }

      .tag-close {
        // margin-left: 4px;
        width: 16px;
        height: 16px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        vertical-align: middle;
        transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);

        .el-icon-close {
          width: 12px;
          height: 12px;
        }

        &:hover {
          background-color: #b4bccc;
          color: #fff;
        }
      }
    }
  }

  .contextmenu {
    margin: 0;
    background: #fff;
    z-index: 3000;
    position: fixed;
    list-style-type: none;
    padding: 5px 0;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 400;
    color: #333;
    box-shadow: 2px 2px 3px 0 rgba(0, 0, 0, 0.3);

    li {
      margin: 0;
      padding: 7px 16px;
      cursor: pointer;
      display: flex;
      align-items: center;

      &:hover {
        background: #eee;
      }
    }
  }
}

:deep(.el-scrollbar__view) {
  height: 100%;
}
</style>
