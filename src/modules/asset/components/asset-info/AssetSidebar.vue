<template>
  <div :class="['asset-sidebar', { collapsed: isCollapsed }]">
    <!-- 折叠切换按钮 -->
    <div
      class="collapse-btn"
      @click="toggleCollapse"
      :title="isCollapsed ? '展开侧边栏' : '收起侧边栏'"
    >
      <el-icon>
        <component :is="isCollapsed ? ArrowRight : ArrowLeft" />
      </el-icon>
    </div>

    <div v-show="!isCollapsed" class="sidebar-content">
      <!-- 搜索过滤 -->
      <div class="sidebar-search">
        <el-input v-model="filterText" placeholder="快速查找分组/标签..." clearable size="small">
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>

      <!-- 分组与标签 Tab -->
      <el-tabs v-model="activeTab" class="sidebar-tabs">
        <el-tab-pane name="group">
          <template #label>
            <span class="tab-label">
              <i class="fa fa-folder-open"></i>
              分组架构
            </span>
          </template>

          <div class="tree-container">
            <div
              class="tree-node-item all-item"
              :class="{ active: selectedGroup === 'all' && !selectedTag }"
              @click="handleSelectGroup('all', '全部设备')"
            >
              <i class="fa fa-server all-icon"></i>
              <span class="node-text">全部主机</span>
            </div>

            <el-tree
              ref="groupTreeRef"
              :data="groupTreeData"
              :props="treeProps"
              node-key="path"
              default-expand-all
              :filter-node-method="filterGroupNode"
              @node-click="handleGroupNodeClick"
              class="custom-tree"
            >
              <template #default="{ node, data }">
                <div class="custom-tree-node" :class="{ active: selectedGroup === data.path }">
                  <i class="fa fa-folder node-folder-icon"></i>
                  <span class="node-label-text">{{ node.label }}</span>
                </div>
              </template>
            </el-tree>

            <el-empty v-if="groupTreeData.length === 0" description="暂无分组" :image-size="40" />
          </div>
        </el-tab-pane>

        <el-tab-pane name="tag">
          <template #label>
            <span class="tab-label">
              <i class="fa fa-tags"></i>
              常用标签
            </span>
          </template>

          <div class="tag-container">
            <div
              class="tag-node-item all-item"
              :class="{ active: !selectedTag && selectedGroup === 'all' }"
              @click="handleSelectGroup('all', '全部设备')"
            >
              <i class="fa fa-server all-icon"></i>
              <span class="node-text">全部主机</span>
            </div>

            <div class="tag-list">
              <div
                v-for="tag in filteredTags"
                :key="tag.name"
                class="tag-item-row"
                :class="{ active: selectedTag === tag.name }"
                @click="handleSelectTag(tag)"
              >
                <div class="tag-item-inner">
                  <i class="fa fa-tag tag-icon"></i>
                  <span class="tag-name">{{ tag.name }}</span>
                </div>
              </div>

              <el-empty
                v-if="filteredTags.length === 0"
                description="未找到标签"
                :image-size="40"
              />
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ArrowLeft, ArrowRight, Search } from '@element-plus/icons-vue'

const props = defineProps({
  groupTreeData: {
    type: Array,
    default: () => []
  },
  tagList: {
    type: Array,
    default: () => []
  },
  selectedGroup: {
    type: String,
    default: 'all'
  },
  selectedTag: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['select-group', 'select-tag'])

const isCollapsed = ref(false)
const activeTab = ref('group')
const filterText = ref('')
const groupTreeRef = ref(null)

const treeProps = {
  label: 'name',
  children: 'children'
}

// 切换折叠
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

// 监听搜索框输入，如果是分组 Tab，则过滤树节点
watch(filterText, val => {
  if (activeTab.value === 'group' && groupTreeRef.value) {
    groupTreeRef.value.filter(val)
  }
})

// 过滤分组节点
const filterGroupNode = (value, data) => {
  if (!value) return true
  return data.name && data.name.toLowerCase().includes(value.toLowerCase())
}

// 过滤标签列表
const filteredTags = computed(() => {
  if (!filterText.value) return props.tagList
  const search = filterText.value.toLowerCase()
  return props.tagList.filter(tag => tag.name && tag.name.toLowerCase().includes(search))
})

// 选择分组
const handleSelectGroup = (path, name) => {
  emit('select-group', path, name)
}

// 树节点点击
const handleGroupNodeClick = data => {
  handleSelectGroup(data.path, data.name || data.path)
}

// 选择标签
const handleSelectTag = tag => {
  emit('select-tag', tag)
}
</script>

<style scoped lang="scss">
.asset-sidebar {
  width: 240px;
  flex-shrink: 0;
  align-self: stretch;
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-light);
  display: flex;
  flex-direction: column;
  position: relative;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;

  &.collapsed {
    width: 0;
    min-width: 0;
    flex-shrink: 0;
    overflow: visible;
    border-right: none;
    padding: 0;
    background: transparent;

    .collapse-btn {
      left: 6px;
      right: auto;
      border: 1px solid var(--el-color-primary-light-7);
      border-radius: 20px;
      box-shadow:
        0 4px 12px rgba(64, 158, 255, 0.12),
        0 1px 3px rgba(0, 0, 0, 0.05);

      &:hover {
        transform: translateY(-50%) scale(1.08);
        .el-icon {
          transform: translateX(2px);
        }
      }
    }
  }

  .collapse-btn {
    position: absolute;
    top: 50%;
    right: -12px;
    transform: translateY(-50%);
    width: 24px;
    height: 56px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid var(--el-color-primary-light-7);
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 100;
    box-shadow:
      0 4px 12px rgba(64, 158, 255, 0.08),
      0 1px 2px rgba(0, 0, 0, 0.04);
    color: var(--el-color-primary);
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);

    .el-icon {
      font-size: 14px;
      transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    }

    &:hover {
      color: #ffffff;
      background: linear-gradient(135deg, var(--el-color-primary) 0%, #53a8ff 100%);
      border-color: var(--el-color-primary-light-3);
      box-shadow:
        0 6px 16px rgba(64, 158, 255, 0.4),
        0 2px 4px rgba(64, 158, 255, 0.15);
      transform: translateY(-50%) scale(1.08);

      .el-icon {
        transform: translateX(-2px);
      }
    }
  }

  .sidebar-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 16px 12px;
    overflow: hidden;
    height: 100%;
  }

  .sidebar-search {
    margin-bottom: 14px;
  }

  .sidebar-tabs {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: none;

    :deep(.el-tabs__header) {
      margin: 0 0 12px 0;
      border-bottom: 1px solid var(--el-border-color-lighter);
    }

    :deep(.el-tabs__nav-wrap::after) {
      display: none;
    }

    :deep(.el-tabs__nav) {
      width: 100%;
      display: flex;
    }

    :deep(.el-tabs__item) {
      flex: 1;
      padding: 0;
      text-align: center;
      font-size: 13px;
      height: 38px;
      line-height: 38px;
      color: var(--el-text-color-regular);

      &.is-active {
        color: var(--el-color-primary);
        font-weight: 600;
      }
    }

    :deep(.el-tabs__content) {
      flex: 1;
      overflow: hidden;

      .el-tab-pane {
        height: 100%;
        display: flex;
        flex-direction: column;
      }
    }
  }

  .tab-label {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;

    i {
      font-size: 13px;
    }
  }

  .tree-container,
  .tag-container {
    flex: 1;
    overflow-y: auto;
    padding-right: 2px;

    &::-webkit-scrollbar {
      width: 4px;
    }
    &::-webkit-scrollbar-thumb {
      background: var(--el-border-color-lighter);
      border-radius: 4px;
    }
  }

  .tree-node-item,
  .tag-node-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    margin-bottom: 6px;
    cursor: pointer;
    border-radius: 6px;
    font-size: 13px;
    color: var(--el-text-color-regular);
    transition: all 0.2s;

    &:hover {
      background: var(--el-fill-color-light);
      color: var(--el-text-color-primary);
    }

    &.active {
      background: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
      font-weight: 500;
    }

    .all-icon {
      color: var(--el-color-primary);
      font-size: 13px;
    }
  }

  .custom-tree {
    background: transparent;

    :deep(.el-tree-node__content) {
      height: 36px;
      border-radius: 6px;
      margin-bottom: 2px;
      padding-left: 8px !important;

      &:hover {
        background: var(--el-fill-color-light);
      }
    }

    :deep(.el-tree-node.is-current > .el-tree-node__content) {
      background: transparent; // Element default reset
    }

    .custom-tree-node {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      height: 100%;
      font-size: 13px;
      color: var(--el-text-color-regular);

      &.active {
        color: var(--el-color-primary);
        font-weight: 500;
      }

      .node-folder-icon {
        color: #e6a23c;
        font-size: 13px;
      }
    }
  }

  .tag-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .tag-item-row {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    cursor: pointer;
    border-radius: 6px;
    font-size: 13px;
    color: var(--el-text-color-regular);
    transition: all 0.2s;

    &:hover {
      background: var(--el-fill-color-light);
      color: var(--el-text-color-primary);
    }

    &.active {
      background: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
      font-weight: 500;

      .tag-icon {
        color: var(--el-color-primary);
      }
    }

    .tag-item-inner {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .tag-icon {
      color: #909399;
      font-size: 12px;
    }
  }
}

html.dark {
  .asset-sidebar {
    background: var(--el-bg-color);
    border-right: 1px solid var(--el-border-color-darker);

    .collapse-btn {
      background: rgba(30, 30, 30, 0.85);
      border-color: rgba(64, 158, 255, 0.25);
      box-shadow:
        0 4px 12px rgba(0, 0, 0, 0.35),
        0 1px 2px rgba(0, 0, 0, 0.25);
      color: var(--el-color-primary-light-3);

      &:hover {
        color: #ffffff;
        background: linear-gradient(135deg, var(--el-color-primary) 0%, #337ecc 100%);
        border-color: var(--el-color-primary-light-5);
        box-shadow: 0 6px 16px rgba(64, 158, 255, 0.35);
      }
    }

    &.collapsed {
      .collapse-btn {
        border-color: rgba(64, 158, 255, 0.25);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
      }
    }

    .tree-node-item,
    .tag-node-item {
      &:hover {
        background: var(--el-fill-color-darker);
      }
      &.active {
        background: rgba(64, 158, 255, 0.15);
      }
    }

    .custom-tree {
      :deep(.el-tree-node__content) {
        &:hover {
          background: var(--el-fill-color-darker);
        }
      }
      .custom-tree-node.active {
        color: var(--el-color-primary-light-3);
      }
    }

    .tag-item-row {
      &:hover {
        background: var(--el-fill-color-darker);
      }
      &.active {
        background: rgba(64, 158, 255, 0.15);
      }
    }
  }
}
</style>
