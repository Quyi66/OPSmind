<template>
  <div class="module-side-menu-wrapper" :class="{ 'is-collapsed': isCollapsed }">
    <!-- 头部插槽区域 -->
    <slot name="header" />

    <el-menu
      :default-active="activeIndex"
      :default-openeds="defaultOpeneds"
      :collapse="isCollapsed"
      class="module-side-menu"
      background-color="#ffffff"
      text-color="#333333"
      active-text-color="#409eff"
      @select="handleSelect"
    >
      <!-- 首页（可选） -->
      <el-menu-item v-if="showHome" index="home" @click="handleHomeClick">
        <el-icon><i class="fas fa-home" /></el-icon>
        <template #title>首页</template>
      </el-menu-item>

      <!-- 单一分组模式：直接展示子菜单作为一级菜单 -->
      <template v-if="isSingleGroup">
        <el-menu-item
          v-for="item in singleGroupChildren"
          :key="item.key"
          :index="`${menuGroups[0].code}-${item.key}`"
        >
          <el-icon><i :class="item.icon" /></el-icon>
          <template #title>{{ item.label }}</template>
        </el-menu-item>
      </template>

      <!-- 多分组模式：使用折叠菜单 -->
      <template v-else>
        <template v-for="group in menuGroups" :key="group.code">
          <!-- 有子菜单的情况：使用 el-sub-menu -->
          <el-sub-menu v-if="group.children && group.children.length > 0" :index="group.code">
            <template #title>
              <el-icon><i :class="group.icon" /></el-icon>
              <span>{{ group.name }}</span>
            </template>
            <el-menu-item
              v-for="item in group.children"
              :key="item.key"
              :index="`${group.code}-${item.key}`"
            >
              <template #title>{{ item.label }}</template>
            </el-menu-item>
          </el-sub-menu>

          <!-- 没有子菜单的情况：直接使用 el-menu-item -->
          <el-menu-item v-else :index="group.code">
            <el-icon><i :class="group.icon" /></el-icon>
            <template #title>{{ group.name }}</template>
          </el-menu-item>
        </template>
      </template>
    </el-menu>

    <!-- 折叠/展开按钮 - 圆形样式，放在左下角 -->
    <div class="collapse-toggle" @click="toggleCollapse">
      <el-icon v-if="isCollapsed"><ArrowRight /></el-icon>
      <el-icon v-else><ArrowLeft /></el-icon>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'

const props = defineProps({
  // 菜单组数据
  menuGroups: {
    type: Array,
    required: true
  },
  // 模块基础路径（用于单模块时的路径前缀）
  basePath: {
    type: String,
    default: ''
  },
  // 是否显示首页菜单
  showHome: {
    type: Boolean,
    default: false
  },
  // 默认展开的菜单组
  defaultOpeneds: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['select', 'home-click', 'collapse-change'])

const route = useRoute()
const router = useRouter()

// 折叠状态
const isCollapsed = ref(false)

// 判断是否只有一个分组
const isSingleGroup = computed(() => {
  return props.menuGroups.length === 1 &&
         props.menuGroups[0].children &&
         props.menuGroups[0].children.length > 0
})

// 单一分组时的子菜单
const singleGroupChildren = computed(() => {
  return isSingleGroup.value ? props.menuGroups[0].children : []
})

// 切换折叠状态
function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
  emit('collapse-change', isCollapsed.value)
}

// 计算当前激活的菜单项
const activeIndex = computed(() => {
  const path = route.path
  // 遍历所有菜单组找到匹配的菜单项
  for (const group of props.menuGroups) {
    if (group.children) {
      for (const item of group.children) {
        const itemPath = item.path || `${props.basePath}/${item.key}`
        // 检查路径是否匹配
        if (path === itemPath || path.startsWith(itemPath + '/')) {
          return `${group.code}-${item.key}`
        }
      }
    }
  }
  return ''
})

// 菜单选择处理
function handleSelect(index) {
  if (index === 'home') return

  // 解析 index：格式为 "groupCode-itemKey"
  const [groupCode, ...itemKeyParts] = index.split('-')
  const itemKey = itemKeyParts.join('-') // 支持 item key 中包含 '-'

  // 查找对应的菜单项
  for (const group of props.menuGroups) {
    if (group.code === groupCode && group.children) {
      const item = group.children.find(child => child.key === itemKey)
      if (item) {
        const targetPath = item.path || `${props.basePath}/${item.key}`
        router.push(targetPath)
        emit('select', item, group)
        return
      }
    }
  }
}

// 首页点击处理
function handleHomeClick() {
  emit('home-click')
  router.push('/home')
}
</script>

<style scoped lang="scss">
.module-side-menu-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 180px;
  min-width: 180px;
  background-color: #fff;
  transition: width 0.3s ease, min-width 0.3s ease;
  position: relative;
  border-right: 1px solid #e8e8e8;

  // 右侧灰色隔断条
  &::after {
    content: '';
    position: absolute;
    right: -9px;
    top: 0;
    bottom: 0;
    width: 8px;
    background-color: #f5f5f5;
  }

  &.is-collapsed {
    width: 64px;
    min-width: 64px;
  }
}

.module-side-menu {
  flex: 1;
  border-right: none !important;
  overflow-y: auto;
  overflow-x: hidden;
  // padding: 16px 0;

  // 折叠状态样式
  &.el-menu--collapse {
    width: 64px;
  }

  // 一级菜单项样式（带图标）
  :deep(> .el-menu-item) {
    height: 48px;
    line-height: 48px;
    font-size: 14px;
    color: #333;
    padding-left: 20px !important;

    &:hover {
      background-color: transparent !important;
      color: #409eff;
    }

    &.is-active {
      background-color: #e6f4ff !important;
      color: #409eff !important;
      border-right: 3px solid #409eff;
    }

    .el-icon {
      width: 20px;
      font-size: 16px;
      margin-right: 12px;
      color: inherit;

      i {
        font-size: 16px;
      }
    }
  }

  // 子菜单标题样式（一级菜单带展开箭头）
  :deep(.el-sub-menu__title) {
    height: 48px;
    line-height: 48px;
    font-size: 14px;
    color: #333;
    padding-left: 20px !important;

    &:hover {
      background-color: transparent !important;
      color: #409eff;
    }

    .el-icon {
      width: 20px;
      font-size: 16px;
      margin-right: 12px;
      color: inherit;

      i {
        font-size: 16px;
      }
    }

    .el-sub-menu__icon-arrow {
      color: #999;
      font-size: 12px;
      right: 16px;
    }
  }

  // 子菜单展开后的项目（二级菜单，无图标）
  :deep(.el-sub-menu .el-menu-item) {
    padding-left: 52px !important;
    height: 44px;
    line-height: 44px;
    min-width: auto;
    font-size: 14px;
    color: #333;

    &:hover {
      background-color: transparent !important;
      color: #409eff;
    }

    &.is-active {
      background-color: #e6f4ff !important;
      color: #409eff !important;
      border-right: 3px solid #409eff;
    }

    // 子菜单项不显示图标
    .el-icon {
      display: none;
    }
  }

  // 子菜单背景 - 白色
  :deep(.el-sub-menu .el-menu) {
    background-color: #fff !important;
  }

  // 激活的子菜单标题
  :deep(.el-sub-menu.is-active > .el-sub-menu__title) {
    color: #409eff;
  }
}

// 折叠/展开按钮 - 圆形样式，放在左下角
.collapse-toggle {
  position: absolute;
  left: 28px;
  bottom: 80px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  transition: all 0.3s;
  z-index: 10;

  &:hover {
    background: #409eff;
  }

  .el-icon {
    font-size: 14px;
  }
}

// 折叠状态下按钮位置调整
.is-collapsed .collapse-toggle {
  left: 16px;
}
</style>
