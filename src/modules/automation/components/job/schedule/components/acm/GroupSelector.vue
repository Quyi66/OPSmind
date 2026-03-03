<template>
  <div class="group-selector">
    <!-- 下拉模式 - 用于筛选工具栏 -->
    <el-dropdown v-if="options.showAs === 'dropdown'" trigger="click" @command="handleSelect">
      <el-button>
        <span v-if="!selectedGroup">
          {{ options.dropdownText || '选择分组' }}
        </span>
        <span v-else>
          分组:
          <strong class="text-primary">{{ selectedGroup }}</strong>
        </span>
      </el-button>
      <template #dropdown>
        <el-scrollbar max-height="300px">
          <el-tree
            ref="treeRef"
            :data="treeData"
            :props="treeProps"
            node-key="path"
            default-expand-all
            @node-click="handleNodeClick"
          />
        </el-scrollbar>
      </template>
    </el-dropdown>

    <!-- 树形模式 - 按分组选择设备（完整视图） -->
    <div v-else class="group-tree-view">
      <!-- 所有选项 -->
      <div class="tree-header" @click="selectAll">
        <span>所有</span>
      </div>

      <!-- 分组树 -->
      <div class="tree-container">
        <el-tree
          ref="treeRef"
          :data="treeData"
          :props="treeProps"
          node-key="path"
          default-expand-all
          :expand-on-click-node="false"
          show-checkbox
          check-strictly
          @check="handleCheck"
        >
          <template #default="{ node, data }">
            <span class="custom-tree-node">
              <i
                :class="
                  data.children && data.children.length > 0
                    ? 'fa fa-folder-open text-warning'
                    : 'fa fa-folder text-warning'
                "
                style="margin-right: 6px"
              ></i>
              <span>{{ node.label }}</span>
              <span v-if="data.count" class="node-count">({{ data.count }})</span>
            </span>
          </template>
        </el-tree>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed, nextTick } from 'vue'
import * as jaoApi from '@/modules/automation/api/jao'

const props = defineProps({
  ciType: { type: String, required: true },
  modelValue: { type: Array, default: () => [] },
  options: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:modelValue', 'select'])

const treeRef = ref(null)
const treeData = ref([])
const selectedGroup = ref(null)

const treeProps = {
  label: 'name',
  children: 'children'
}

watch(
  () => props.ciType,
  () => {
    fetchGroups()
  },
  { immediate: true }
)

onMounted(() => {
  fetchGroups()
})

async function fetchGroups() {
  try {
    const response = await jaoApi.queryAcmGroups(props.ciType)
    const data = response?.data || response

    // API 返回的是平铺的路径列表，如 ["/21", "/测试机器", "/测试机器/test1111"]
    if (Array.isArray(data)) {
      treeData.value = buildTreeFromPaths(data)
    } else if (data && typeof data === 'object') {
      treeData.value = processTreeData([data])
    } else {
      treeData.value = []
    }

    // 数据加载完成后同步选中状态
    await nextTick()
    syncTreeSelection()
  } catch (error) {
    console.error('Failed to fetch ACM groups:', error)
    treeData.value = []
  }
}

// 同步选中状态
function syncTreeSelection() {
  if (!treeRef.value || !props.modelValue) return

  const groupKeys = props.modelValue.filter(item => item.runType === 'group').map(item => item.key)

  treeRef.value.setCheckedKeys(groupKeys)
}

watch(
  () => props.modelValue,
  () => {
    syncTreeSelection()
  },
  { deep: true }
)

// 从平铺的路径列表构建树形结构
function buildTreeFromPaths(paths) {
  const root = { children: [] }

  paths.forEach(path => {
    if (!path || path === '/') return

    const parts = path.split('/').filter(Boolean)
    let current = root
    let currentPath = ''

    parts.forEach((part, index) => {
      currentPath += '/' + part

      let child = current.children.find(c => c.name === part)
      if (!child) {
        child = {
          name: part,
          path: currentPath,
          children: []
        }
        current.children.push(child)
      }
      current = child
    })
  })

  return root.children
}

// 处理树形数据，确保有正确的结构
function processTreeData(data) {
  return data.map(item => ({
    ...item,
    name: item.name || item.title || item.label || '',
    path: item.path || item.id || item.key || '',
    children: item.children ? processTreeData(item.children) : []
  }))
}

function handleNodeClick(node) {
  selectedGroup.value = node.name
  emit('select', node.path)

  if (props.options.groupCallBack) {
    props.options.groupCallBack(node.path)
  }
}

function handleCheck(data, { checkedNodes }) {
  // 将选中的分组转换为主机选择格式
  const selectedGroups = checkedNodes.map(node => ({
    key: node.path,
    value: node.name,
    runType: 'group',
    total_hosts: node.count || 0,
    assetType: props.ciType
  }))

  // 保留非分组类型的已选项 (如 specific hosts, tags 等)
  const otherSelections = (props.modelValue || []).filter(item => item.runType !== 'group')

  emit('update:modelValue', [...otherSelections, ...selectedGroups])
}

function selectAll() {
  // 选择所有设备
  const allSelection = [
    {
      key: '@@',
      value: '所有',
      runType: 'all',
      assetType: props.ciType
    }
  ]
  emit('update:modelValue', allSelection)
}
</script>

<style scoped>
.group-selector {
  width: 100%;
}

.group-tree-view {
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  background: var(--el-bg-color);
}

.tree-header {
  padding: 10px 16px;
  border-bottom: 1px solid var(--el-border-color-light);
  cursor: pointer;
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.tree-header:hover {
  background: var(--el-bg-color-page);
}

.tree-container {
  padding: 10px;
  max-height: 400px;
  overflow-y: auto;
}

.custom-tree-node {
  display: flex;
  align-items: center;
  font-size: 14px;
}

.node-count {
  margin-left: 6px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.text-warning {
  color: #e6a23c;
}
</style>
