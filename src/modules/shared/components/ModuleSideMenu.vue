<template>
  <div class="module-side-menu-wrapper" :class="{ 'is-collapsed': isCollapsed }">
    <!-- 头部插槽区域 -->
    <slot name="header" />

    <el-menu
      :default-active="activeIndex"
      :default-openeds="computedDefaultOpeneds"
      :collapse="isCollapsed"
      unique-opened
      class="module-side-menu"
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
          :index="`${menuGroups[0].code}::${item.key}`"
        >
          <el-icon><i :class="item.icon" /></el-icon>
          <template #title>{{ item.label }}</template>
        </el-menu-item>
      </template>

      <!-- 多分组模式：使用折叠菜单 -->
      <template v-else>
        <template v-for="group in menuGroups" :key="group.code">
          <!-- 有子菜单且有多个子项的情况：使用 el-sub-menu -->
          <el-sub-menu v-if="group.children && group.children.length > 1" :index="group.code">
            <template #title>
              <el-icon><i :class="group.icon" /></el-icon>
              <span>{{ group.name }}</span>
              <span
                v-if="getGroupBadgeCount(group) > 0"
                class="menu-badge-pill"
                style="margin-left: 4px;"
              >{{ getGroupBadgeCount(group) }}</span>
            </template>
            <!-- 递归或者判断一层嵌套：如果有三级树 -->
            <template v-for="item in group.children" :key="item.key">
              <!-- 第三层子菜单 -->
              <el-sub-menu
                v-if="item.children && item.children.length > 0"
                :index="`${group.code}::${item.key}`"
              >
                <template #title>
                  <span>{{ item.label }}</span>
                </template>
                <el-menu-item
                  v-for="sub in item.children"
                  :key="sub.key"
                  :index="`${group.code}::${item.key}::${sub.key}`"
                >
                  <template #title>{{ sub.label }}</template>
                </el-menu-item>
              </el-sub-menu>

              <!-- 正常的二级菜单 -->
              <el-menu-item v-else :index="`${group.code}::${item.key}`">
                <template #title>
                  <span>{{ item.label }}</span>
                  <span
                    v-if="badgeCounts[`${group.code}::${item.key}`] > 0"
                    class="menu-badge-pill"
                  >{{ badgeCounts[`${group.code}::${item.key}`] }}</span>
                </template>
              </el-menu-item>
            </template>
          </el-sub-menu>

          <!-- 只有1个子菜单的情况：直接平铺为一个一级菜单项，但使用其子项用于路由 -->
          <el-menu-item
            v-else-if="group.children && group.children.length === 1"
            :index="`${group.code}::${group.children[0].key}`"
          >
            <el-icon><i :class="group.icon || group.children[0].icon" /></el-icon>
            <template #title>{{ group.name }}</template>
          </el-menu-item>

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
  },
  // badge 计数映射：key 为 "groupCode::itemKey"，值为待处理数量
  badgeCounts: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['select', 'home-click', 'collapse-change'])

const route = useRoute()
const router = useRouter()

function getItemTargetPath(item) {
  return item.path || `${props.basePath}/${item.key}`
}

function getItemMatchPaths(item) {
  const extraPaths = Array.isArray(item.matchPaths) ? item.matchPaths.filter(Boolean) : []
  return [getItemTargetPath(item), ...extraPaths]
}

function matchesItemPath(currentPath, item) {
  return getItemMatchPaths(item).some(matchPath =>
    currentPath === matchPath || currentPath.startsWith(matchPath + '/')
  )
}

// 折叠状态
const isCollapsed = ref(false)

// 判断是否只有一个分组
const isSingleGroup = computed(() => {
  return (
    props.menuGroups.length === 1 &&
    props.menuGroups[0].children &&
    props.menuGroups[0].children.length > 0
  )
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
        if (item.children) {
          for (const sub of item.children) {
            if (matchesItemPath(path, sub)) {
              return `${group.code}::${item.key}::${sub.key}`
            }
          }
        } else {
          if (matchesItemPath(path, item)) {
            return `${group.code}::${item.key}`
          }
        }
      }
    }
  }
  return ''
})

// 计算默认展开的菜单组 - 只展开当前激活项所在的分组
const computedDefaultOpeneds = computed(() => {
  const active = activeIndex.value
  if (!active) {
    // 如果没有激活项，使用传入的 defaultOpeneds 中的第一个
    return props.defaultOpeneds.length > 0 ? [props.defaultOpeneds[0]] : []
  }
  // 从 activeIndex 中提取 groupCode（格式为 "groupCode::itemKey"）
  const groupCode = active.split('::')[0]
  return groupCode ? [groupCode] : []
})

// 菜单选择处理
function handleSelect(index) {
  if (index === 'home') return

  // 解析 index：格式为 "groupCode::itemKey::subKey"
  const parts = index.split('::')
  const groupCode = parts[0]

  // 查找对应的菜单项
  for (const group of props.menuGroups) {
    if (group.code === groupCode && group.children) {
      if (parts.length === 3) {
        // 三级树导航
        const itemKey = parts[1]
        const subKey = parts[2]
        const item = group.children.find(child => child.key === itemKey)
        if (item && item.children) {
          const sub = item.children.find(s => s.key === subKey)
          if (sub) {
            const targetPath = sub.path || `${props.basePath}/${sub.key}`
            router.push(targetPath)
            emit('select', sub, group)
            return
          }
        }
      } else {
        // 普通两级导航
        const itemKey = parts.slice(1).join('::')
        const item = group.children.find(child => child.key === itemKey)
        if (item) {
          const targetPath = getItemTargetPath(item)
          router.push(targetPath)
          emit('select', item, group)
          return
        }
      }
    }
  }
}

// 首页点击处理
function handleHomeClick() {
  emit('home-click')
  router.push('/home')
}

// 计算某个分组的 badge 总数（对所有子项计数求和）
function getGroupBadgeCount(group) {
  if (!group.children) return 0
  return group.children.reduce((sum, item) => {
    return sum + (props.badgeCounts[`${group.code}::${item.key}`] || 0)
  }, 0)
}
</script>

<style scoped lang="scss">
.module-side-menu-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 180px;
  min-width: 180px;
  background-color: var(--el-bg-color);
  transition:
    width 0.3s ease,
    min-width 0.3s ease;
  position: relative;
  border-right: 1px solid var(--el-border-color-light);
  margin-right: 12px;

  // 右侧灰色隔断条
  &::after {
    content: '';
    position: absolute;
    right: -9px;
    top: 0;
    bottom: 0;
    width: 8px;
    background-color: var(--el-bg-color-page);
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
    color: var(--el-text-color-primary);
    padding-left: 20px !important;

    &:hover {
      background-color: transparent !important;
      color: #409eff;
    }

    &.is-active {
      background-color: var(--el-color-primary-light-9) !important;
      color: var(--el-color-primary) !important;
      border-right: 3px solid var(--el-color-primary);
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
    color: var(--el-text-color-primary);
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
      color: var(--el-text-color-regular);
      font-size: 12px;
      right: 12px;
    }
  }

  // 子菜单展开后的项目（二级菜单，无图标）
  :deep(.el-sub-menu .el-menu-item) {
    padding-left: 52px !important;
    height: 44px;
    line-height: 44px;
    min-width: auto;
    font-size: 14px;
    color: var(--el-text-color-primary);

    &:hover {
      background-color: transparent !important;
      color: #409eff;
    }

    &.is-active {
      background-color: var(--el-color-primary-light-9) !important;
      color: var(--el-color-primary) !important;
      border-right: 3px solid var(--el-color-primary);
    }

    // 子菜单项不显示图标
    .el-icon {
      display: none;
    }
  }

  // 包含三级菜单嵌套的菜单背景
  :deep(.el-sub-menu .el-menu) {
    background-color: var(--el-bg-color) !important;
  }

  // 激活的子菜单标题
  :deep(.el-sub-menu.is-active > .el-sub-menu__title) {
    color: #409eff;
  }

  // 二级菜单带有子菜单时的标题样式调整（即三级菜单的父节点）
  :deep(.el-sub-menu .el-sub-menu > .el-sub-menu__title) {
    padding-left: 52px !important;
    height: 44px;
    line-height: 44px;
    font-size: 14px;
    color: var(--el-text-color-primary);
    font-weight: normal;

    // 防止被前面的 el-icon 样式污染导致拉扯
    .el-sub-menu__icon-arrow {
      position: absolute;
      right: 16px;
      width: auto;
      margin: 0;
      color: var(--el-text-color-regular);
      top: 50%;
      transform: translateY(-50%) !important;
    }
  }

  // 展开状态的三级父级标题高亮
  :deep(.el-sub-menu .el-sub-menu.is-opened > .el-sub-menu__title) {
    color: #409eff;
    font-weight: 500;
  }

  // 新增：第三层级子菜单项样式，增加左侧内边距区分层级
  :deep(.el-sub-menu .el-sub-menu .el-menu-item) {
    padding-left: 60px !important; // 从68降到60，增加右侧呼吸感，配合更小的字号
    height: 38px;
    line-height: 38px;
    color: var(--el-text-color-regular);
    margin: 2px 0; // 增加上下微小间距

    &:hover {
      color: #409eff;
      background-color: transparent !important; // 去掉hover背景，仅文字变色，更清爽
    }

    &.is-active {
      background-color: transparent !important; // 三级子菜单也去掉背景色
      color: #409eff !important;
      border-right: none; // 三级不显示右border，维持主层级的标识感
      font-weight: 600;
      position: relative;
    }
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
  background: var(--el-text-color-regular);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--el-bg-color);
  transition: all 0.3s;
  z-index: 10;

  &:hover {
    background: var(--el-color-primary);
  }

  .el-icon {
    font-size: 14px;
  }
}

// 折叠状态下按钮位置调整
.is-collapsed .collapse-toggle {
  left: 16px;
}

// Badge 样式 - 内联 pill，跟随文字流，紧贴展开箭头左侧
.menu-badge-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: var(--el-color-danger);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  margin-left: auto;
  margin-right: 20px;
  flex-shrink: 0;
}
</style>
