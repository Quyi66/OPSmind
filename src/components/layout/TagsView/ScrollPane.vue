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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const tagAndTagSpacing = ref(4)
const scrollContainer = ref(null)

const scrollWrapper = computed(() => {
  return scrollContainer.value?.wrapRef
})

const emits = defineEmits(['scroll'])

function handleScroll(e) {
  const eventDelta = e.wheelDelta || -e.deltaY * 40
  const wrapper = scrollWrapper.value
  if (wrapper) {
    wrapper.scrollLeft = wrapper.scrollLeft + eventDelta / 4
  }
}

function moveToTarget(currentTag) {
  const container = scrollContainer.value?.$el
  const wrapper = scrollWrapper.value
  if (!container || !wrapper) return

  const containerWidth = container.offsetWidth
  const tagList = wrapper.querySelectorAll('.tags-view-item')

  let firstTag = null
  let lastTag = null

  if (tagList.length > 0) {
    firstTag = tagList[0]
    lastTag = tagList[tagList.length - 1]
  }

  if (firstTag === currentTag) {
    wrapper.scrollLeft = 0
  } else if (lastTag === currentTag) {
    wrapper.scrollLeft = wrapper.scrollWidth - containerWidth
  } else {
    const currentIndex = [...tagList].findIndex(item => item.dataset.path === currentTag.path)

    if (currentIndex === -1) return

    const prevTag = tagList[currentIndex - 1]
    const nextTag = tagList[currentIndex + 1]

    const afterNextTagOffsetLeft = nextTag ? nextTag.offsetLeft + nextTag.offsetWidth + tagAndTagSpacing.value : 0
    const beforePrevTagOffsetLeft = prevTag ? prevTag.offsetLeft - tagAndTagSpacing.value : 0

    if (afterNextTagOffsetLeft > wrapper.scrollLeft + containerWidth) {
      wrapper.scrollLeft = afterNextTagOffsetLeft - containerWidth
    } else if (beforePrevTagOffsetLeft < wrapper.scrollLeft) {
      wrapper.scrollLeft = beforePrevTagOffsetLeft
    }
  }
}

defineExpose({
  moveToTarget
})
</script>

<style lang="scss" scoped>
.scroll-container {
  white-space: nowrap;
  position: relative;
  overflow: hidden;
  width: 100%;

  :deep(.el-scrollbar__bar) {
    bottom: 0px;
  }

  :deep(.el-scrollbar__wrap) {
    height: 49px;
  }
}
</style>
