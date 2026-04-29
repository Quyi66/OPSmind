<template>
  <div class="side-menu">
    <!-- 菜单项列表 -->
    <div class="menu-items" v-if="currentGroup">
      <div v-for="menuItem in currentGroup.children" :key="menuItem.code" class="menu-item" :class="{
        active: activeMenuItem === menuItem.code
      }" @click="handleMenuItemClick(menuItem, $event)">
        <div class="menu-item-content">
          <i :class="menuItem.icon" class="menu-item-icon"></i>
          <span class="menu-item-text">{{ menuItem.name }}</span>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div class="empty-state" v-if="!currentGroup">
      <i class="fas fa-mouse-pointer"></i>
      <p>请选择顶部菜单</p>
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { getMenuGroup } from '@/config/menu.config.js'

const props = defineProps({
  activeGroup: {
    type: String,
    default: ''
  },
  activeMenuItem: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['menu-item-click'])

// 计算属性
const currentGroup = computed(() => {
  return props.activeGroup ? getMenuGroup(props.activeGroup) : null
})

// 方法
const handleMenuItemClick = (menuItem, event) => {

  // 创建水波纹效果
  createRippleEffect(event)

  // 发射事件给父组件
  emit('menu-item-click', menuItem)

  // URL 更新与模块加载由父级处理（MainLayout → menuStore.setActiveMenuItem）
}

// 创建水波纹效果
const createRippleEffect = event => {
  const button = event.currentTarget
  const rect = button.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  const x = event.clientX - rect.left - size / 2
  const y = event.clientY - rect.top - size / 2

  // 移除之前的水波纹
  const existingRipple = button.querySelector('.ripple')
  if (existingRipple) {
    existingRipple.remove()
  }

  // 创建新的水波纹元素
  const ripple = document.createElement('span')
  ripple.className = 'ripple'
  ripple.style.width = ripple.style.height = `${size}px`
  ripple.style.left = `${x}px`
  ripple.style.top = `${y}px`

  button.appendChild(ripple)

  // 动画结束后移除元素
  setTimeout(() => {
    if (ripple.parentNode) {
      ripple.parentNode.removeChild(ripple)
    }
  }, 600)
}

// 监听activeGroup变化
watch(() => props.activeGroup, (newGroup) => {
})
</script>

<style scoped lang="scss">
.side-menu {
  width: 60px;
  background: var(--el-bg-color);
  border-right: 0;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 100;
}

.menu-header {
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--el-bg-color);

  .group-info {
    display: flex;
    align-items: center;
    flex: 1;

    .group-icon {
      font-size: 18px;
      color: #1890ff;
      margin-right: 12px;
    }

    .group-name {
      font-size: 16px;
      font-weight: 600;
      color: #262626;
    }
  }

  .collapse-btn {
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    color: #8c8c8c;
    transition: all 0.2s ease;

    &:hover {
      background: #f0f0f0;
      color: #1890ff;
    }
  }
}

.menu-items {
  flex: 1;
  padding: 8px 0;
  overflow-y: auto;
}

.menu-item {
  cursor: pointer;
  transition: all 0.2s ease;
  margin: 3px;
  border-radius: 6px;
  position: relative;
  overflow: hidden;

  &:hover:not(.active) {
    background: var(--el-bg-color-page);
    transform: translateY(-1px);
  }

  &.active {
    background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);

    .menu-item-content {
      .menu-item-icon {
        color: #1890ff;
        transform: scale(1.1);
      }

      .menu-item-text {
        color: #1890ff;
        font-weight: 600;
      }
    }
  }
}

.menu-item-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 2px;
  text-align: center;
  min-height: 45px;

  .menu-item-icon {
    font-size: 18px;
    color: #595959;
    margin-bottom: 4px;
    width: auto;
    text-align: center;
    transition: all 0.3s ease;
  }

  .menu-item-text {
    font-family: 'PingFang-Medium', -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 500;
    color: #262626;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    line-height: 1.1;
    transition: all 0.3s ease;
  }
}

// 水波纹效果
.ripple {
  position: absolute;
  border-radius: 50%;
  background: rgba(24, 144, 255, 0.3);
  transform: scale(0);
  animation: ripple-animation 0.6s linear;
  pointer-events: none;
}

@keyframes ripple-animation {
  to {
    transform: scale(2);
    opacity: 0;
  }
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #bfbfbf;
  padding: 40px 20px;

  i {
    font-size: 48px;
    margin-bottom: 16px;
  }

  p {
    font-size: 14px;
    margin: 0;
  }
}

// 响应式设计
@media (min-width: 1600px) {
  .side-menu {
    width: 76px;
  }

  .menu-item-content {
    padding: 14px 6px;
    min-height: 70px;

    .menu-item-icon {
      font-size: 22px;
    }

    .menu-item-text {
      font-size: 14px;
      line-height: 1.2;
    }
  }
}

@media (min-width: 1920px) {
  .side-menu {
    width: 84px;
  }

  .menu-item-content {
    padding: 16px 8px;
    min-height: 78px;

    .menu-item-icon {
      font-size: 24px;
    }

    .menu-item-text {
      font-size: 15px;
    }
  }
}

@media (max-width: 992px) {
  .side-menu {
    width: 56px;
  }

  .menu-item-content {
    padding: 10px 4px;
    min-height: 56px;

    .menu-item-icon {
      font-size: 18px;
      margin-bottom: 4px;
    }

    .menu-item-text {
      font-size: 11px;
      line-height: 1.2;
    }
  }
}

@media (max-width: 768px) {
  .side-menu {
    width: 54px;
    background: var(--el-bg-color);
    box-shadow: 2px 0 12px rgba(0, 0, 0, 0.15);
  }

  .menu-item {
    margin: 1px;
  }

  .menu-item-content {
    padding: 8px 2px;
    min-height: 52px;

    .menu-item-icon {
      font-size: 16px;
      margin-bottom: 3px;
    }

    .menu-item-text {
      font-size: 10px;
      line-height: 1.1;
    }
  }
}

@media (max-width: 576px) {
  .side-menu {
    width: 50px;
  }

  .menu-item-content {
    padding: 6px 1px;
    min-height: 48px;

    .menu-item-icon {
      font-size: 14px;
      margin-bottom: 2px;
    }

    .menu-item-text {
      font-size: 9px;
      line-height: 1;
    }
  }

  .empty-state {
    padding: 20px 10px;

    i {
      font-size: 32px;
      margin-bottom: 8px;
    }

    p {
      font-size: 12px;
    }
  }
}

// 横屏移动端优化
@media (max-width: 768px) and (orientation: landscape) {
  .side-menu {
    width: 52px;
  }

  .menu-item-content {
    padding: 6px 2px;
    min-height: 46px;

    .menu-item-icon {
      font-size: 15px;
      margin-bottom: 2px;
    }

    .menu-item-text {
      font-size: 9px;
    }
  }
}
</style>
