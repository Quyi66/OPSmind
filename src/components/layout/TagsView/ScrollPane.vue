<template>
  <el-scrollbar
    ref="scrollContainer"
    :vertical="false"
    class="scroll-container"
    @wheel.prevent="handleScroll"
  >
    <slot />
  </el-scrollbar>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const tagAndTagSpacing = 4

const scrollContainer = ref(null)
const emit = defineEmits(['scroll', 'updateArrows'])

const scrollWrapper = computed(() => {
  return (
    scrollContainer.value?.wrapRef ||
    scrollContainer.value?.$el?.querySelector('.el-scrollbar__wrap')
  )
})

function emitScroll() {
  emit('scroll')
  emit('updateArrows')
}

let resizeObserver = null

onMounted(() => {
  if (scrollWrapper.value) {
    scrollWrapper.value.addEventListener('scroll', emitScroll, true)
  }

  // 使用 ResizeObserver 监听容器与内部视口尺寸变化，以自动且完美同步更新箭头状态
  const containerEl = scrollContainer.value?.$el
  const viewEl = containerEl?.querySelector('.el-scrollbar__view')
  if (typeof ResizeObserver !== 'undefined' && containerEl && viewEl) {
    resizeObserver = new ResizeObserver(() => {
      emit('updateArrows')
    })
    resizeObserver.observe(containerEl)
    resizeObserver.observe(viewEl)
  }
})

onBeforeUnmount(() => {
  if (scrollWrapper.value) {
    scrollWrapper.value.removeEventListener('scroll', emitScroll, true)
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})

function smoothScrollTo(target) {
  const $scrollWrapper = scrollWrapper.value
  if (!$scrollWrapper) return
  const start = $scrollWrapper.scrollLeft
  const distance = target - start
  const duration = 300
  let startTime = null

  function ease(t, b, c, d) {
    t /= d / 2
    if (t < 1) return (c / 2) * t * t + b
    t--
    return (-c / 2) * (t * (t - 2) - 1) + b
  }

  function step(timestamp) {
    if (!startTime) startTime = timestamp
    const elapsed = timestamp - startTime
    $scrollWrapper.scrollLeft = ease(elapsed, start, distance, duration)
    if (elapsed < duration) {
      requestAnimationFrame(step)
    } else {
      $scrollWrapper.scrollLeft = target
      emit('updateArrows')
    }
  }

  requestAnimationFrame(step)
}

function handleScroll(e) {
  const eventDelta = -e.deltaY * 40
  const $scrollWrapper = scrollWrapper.value
  if (!$scrollWrapper) return
  $scrollWrapper.scrollLeft = $scrollWrapper.scrollLeft + eventDelta / 4
  emit('updateArrows')
}

function moveToTarget(currentTag, tagListRefs) {
  const $container = scrollContainer.value?.$el
  if (!$container) return
  const $containerWidth = $container.offsetWidth
  const $scrollWrapper = scrollWrapper.value
  if (!$scrollWrapper) return

  const tagList = tagListRefs || []

  let firstTag = null
  let lastTag = null

  if (tagList.length > 0) {
    firstTag = tagList[0]
    lastTag = tagList[tagList.length - 1]
  }

  // 获取 DOM 元素：在 Vue 3 中，可以使用 ref 的 DOM 元素或组件实例
  const getTagEl = tag => {
    return tag?.$el || tag
  }

  const currentTagEl = getTagEl(currentTag)
  const firstTagEl = getTagEl(firstTag)
  const lastTagEl = getTagEl(lastTag)

  if (firstTagEl === currentTagEl) {
    smoothScrollTo(0)
  } else if (lastTagEl === currentTagEl) {
    smoothScrollTo($scrollWrapper.scrollWidth - $containerWidth)
  } else {
    const currentIndex = tagList.findIndex(item => getTagEl(item) === currentTagEl)
    if (currentIndex === -1) return
    const prevTag = tagList[currentIndex - 1]
    const nextTag = tagList[currentIndex + 1]

    const prevTagEl = getTagEl(prevTag)
    const nextTagEl = getTagEl(nextTag)

    if (!prevTagEl || !nextTagEl) return

    const afterNextTagOffsetLeft = nextTagEl.offsetLeft + nextTagEl.offsetWidth + tagAndTagSpacing
    const beforePrevTagOffsetLeft = prevTagEl.offsetLeft - tagAndTagSpacing

    if (afterNextTagOffsetLeft > $scrollWrapper.scrollLeft + $containerWidth) {
      smoothScrollTo(afterNextTagOffsetLeft - $containerWidth)
    } else if (beforePrevTagOffsetLeft < $scrollWrapper.scrollLeft) {
      smoothScrollTo(beforePrevTagOffsetLeft)
    }
  }
}

function scrollLeft() {
  const $scrollWrapper = scrollWrapper.value
  if (!$scrollWrapper) return
  smoothScrollTo(Math.max(0, $scrollWrapper.scrollLeft - 200))
}

function scrollRight() {
  const $scrollWrapper = scrollWrapper.value
  if (!$scrollWrapper) return
  const maxScroll = $scrollWrapper.scrollWidth - $scrollWrapper.clientWidth
  smoothScrollTo(Math.min(maxScroll, $scrollWrapper.scrollLeft + 200))
}

function scrollToStart() {
  smoothScrollTo(0)
}

function scrollToEnd() {
  const $scrollWrapper = scrollWrapper.value
  if (!$scrollWrapper) return
  smoothScrollTo($scrollWrapper.scrollWidth - $scrollWrapper.clientWidth)
}

function getScrollState() {
  const $scrollWrapper = scrollWrapper.value
  if (!$scrollWrapper) return { canLeft: false, canRight: false }

  return {
    canLeft: $scrollWrapper.scrollLeft > 0,
    canRight:
      $scrollWrapper.scrollLeft < $scrollWrapper.scrollWidth - $scrollWrapper.clientWidth - 1
  }
}

defineExpose({
  moveToTarget,
  scrollLeft,
  scrollRight,
  scrollToStart,
  scrollToEnd,
  getScrollState
})
</script>

<style lang="scss" scoped>
.scroll-container {
  white-space: nowrap;
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
  :deep() {
    .el-scrollbar__bar {
      bottom: 0px;
    }
    .el-scrollbar__wrap {
      height: 100%;
      display: flex;
      align-items: center;
    }
    .el-scrollbar__view {
      display: flex;
      align-items: center;
      height: 100%;
    }
  }
}
</style>
