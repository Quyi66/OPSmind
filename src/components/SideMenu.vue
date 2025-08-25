<template>
  <div class="side-menu" :class="{ 'collapsed': collapsed }">
    <!-- 菜单头部 -->
    <div class="menu-header" v-if="currentGroup">
      <div class="group-info">
        <i :class="currentGroup.icon" class="group-icon"></i>
        <span class="group-name" v-if="!collapsed">{{ currentGroup.name }}</span>
      </div>
      <div class="collapse-btn" @click="toggleCollapse" v-if="!collapsed">
        <i class="fas fa-chevron-left"></i>
      </div>
    </div>

    <!-- 菜单项列表 -->
    <div class="menu-items" v-if="currentGroup">
      <div
        v-for="menuItem in currentGroup.children"
        :key="menuItem.code"
        class="menu-item"
        :class="{
          'active': activeMenuItem === menuItem.code,
          'collapsed': collapsed
        }"
        @click="handleMenuItemClick(menuItem)"
        :title="collapsed ? menuItem.name : ''"
      >
        <div class="menu-item-content">
          <i :class="menuItem.icon" class="menu-item-icon"></i>
          <span class="menu-item-text" v-if="!collapsed">{{ menuItem.name }}</span>
        </div>
      </div>
    </div>

    <!-- 展开按钮（折叠状态下） -->
    <div class="expand-btn" v-if="collapsed" @click="toggleCollapse">
      <i class="fas fa-chevron-right"></i>
    </div>

    <!-- 空状态 -->
    <div class="empty-state" v-if="!currentGroup && !collapsed">
      <i class="fas fa-mouse-pointer"></i>
      <p>请选择顶部菜单</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getMenuGroup } from '@/config/menu.config.js'

const router = useRouter()

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

const emit = defineEmits(['menu-item-click', 'collapse-change'])

// 响应式数据
const collapsed = ref(false)

// 计算属性
const currentGroup = computed(() => {
  return props.activeGroup ? getMenuGroup(props.activeGroup) : null
})

// 方法
const handleMenuItemClick = (menuItem) => {
  console.log('🚀 Side menu item clicked:', menuItem.name, 'with code:', menuItem.code)

  // 发射事件给父组件
  emit('menu-item-click', menuItem)

  // 更新浏览器URL
  router.push(`/${menuItem.code}`)

  // 注意：不再触发弹窗模式的iframe，而是在主内容区域显示
  // 这个逻辑将在主布局中处理

  console.log('🔗 Browser URL updated to:', `/${menuItem.code}`)
}

const toggleCollapse = () => {
  collapsed.value = !collapsed.value
  emit('collapse-change', collapsed.value)
  console.log('📱 Side menu collapsed:', collapsed.value)
}

// 监听activeGroup变化，自动展开菜单
watch(() => props.activeGroup, (newGroup) => {
  if (newGroup && collapsed.value) {
    collapsed.value = false
    emit('collapse-change', collapsed.value)
  }
})
</script>

<style scoped lang="scss">
.side-menu {
  width: 240px;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  position: relative;
  z-index: 100;

  &.collapsed {
    width: 60px;
  }
}

.menu-header {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fafafa;

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
  margin: 2px 8px;
  border-radius: 6px;

  &:hover {
    background: #f0f7ff;
  }

  &.active {
    background: #e6f7ff;
    border-left: 3px solid #1890ff;
    margin-left: 8px;

    .menu-item-content {
      .menu-item-icon {
        color: #1890ff;
      }
      .menu-item-text {
        color: #1890ff;
        font-weight: 500;
      }
    }
  }

  &.collapsed {
    margin: 2px 4px;

    .menu-item-content {
      justify-content: center;
      padding: 12px 8px;
    }
  }
}

.menu-item-content {
  display: flex;
  align-items: center;
  padding: 12px 16px;

  .menu-item-icon {
    font-size: 16px;
    color: #595959;
    margin-right: 12px;
    width: 16px;
    text-align: center;
  }

  .menu-item-text {
    font-size: 14px;
    color: #262626;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.expand-btn {
  position: absolute;
  top: 50%;
  right: -12px;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;

  &:hover {
    background: #f0f7ff;
    border-color: #1890ff;
    color: #1890ff;
  }

  i {
    font-size: 12px;
    color: #8c8c8c;
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
@media (max-width: 768px) {
  .side-menu {
    width: 200px;

    &.collapsed {
      width: 50px;
    }
  }

  .menu-header {
    padding: 12px;

    .group-info {
      .group-icon {
        font-size: 16px;
        margin-right: 8px;
      }

      .group-name {
        font-size: 14px;
      }
    }
  }

  .menu-item-content {
    padding: 10px 12px;

    .menu-item-icon {
      font-size: 14px;
      margin-right: 8px;
    }

    .menu-item-text {
      font-size: 13px;
    }
  }
}
</style>
