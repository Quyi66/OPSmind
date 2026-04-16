<template>
  <div class="instance-selector">
    <!-- 筛选工具栏 -->
    <div class="filter-toolbar">
      <strong class="filter-label">筛选</strong>
      <!-- 分组树形选择器 -->
      <el-popover placement="bottom-start" :width="300" trigger="click" :teleported="false">
        <template #reference>
          <el-button class="group-select-btn">
            <i class="fa fa-sitemap me-1" />
            {{ selectedGroupName || '选择分组' }}
            <i class="fa fa-caret-down ms-2" />
          </el-button>
        </template>
        <div class="group-tree-dropdown">
          <div class="tree-item all-item" @click="selectGroup('@@', '所有')">
            <i class="fa fa-globe me-1" />
            所有
          </div>
          <el-tree
            ref="groupTreeRef"
            :data="groupTreeData"
            :props="{ label: 'name', children: 'children' }"
            node-key="path"
            default-expand-all
            :expand-on-click-node="false"
            @node-click="handleGroupNodeClick"
          >
            <template #default="{ node }">
              <span class="tree-node-content">
                <i class="fa fa-folder text-warning me-1" />
                {{ node.label }}
              </span>
            </template>
          </el-tree>
        </div>
      </el-popover>
      <!-- 标签选择器 -->
      <el-select
        v-model="tagFilter"
        placeholder="全部标签"
        clearable
        size="small"
        :loading="tagLoading"
        :teleported="false"
        @change="handleTagFilter"
      >
        <el-option label="全部标签" value="@@" />
        <el-option
          v-for="tag in tagList"
          :key="tag.name"
          :label="`${tag.name} (${tag.hostCount || 0})`"
          :value="tag.name"
        />
      </el-select>
    </div>

    <!-- 主机列表表格 -->
    <el-table
      ref="tableRef"
      :data="tableData"
      v-loading="loading"
      height="350"
      style="width: 100%"
      row-key="id"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" reserve-selection />
      <el-table-column prop="IP" label="IP地址" min-width="120" show-overflow-tooltip />
      <el-table-column prop="hostname" label="主机名" min-width="120" show-overflow-tooltip />
      <el-table-column prop="os_distro" label="操作系统" min-width="120" show-overflow-tooltip />
      <el-table-column prop="os_version" label="系统版本" width="120" show-overflow-tooltip />
      <el-table-column label="连通状态" width="120" align="left">
        <template #default="{ row }">
          <el-tag
            :type="
              [1, '1'].includes(row.CONN_LATEST_STATUS)
                ? 'success'
                : [0, '0'].includes(row.CONN_LATEST_STATUS)
                  ? 'danger'
                  : 'info'
            "
            size="small"
          >
            {{
              [1, '1'].includes(row.CONN_LATEST_STATUS)
                ? '在线'
                : [0, '0'].includes(row.CONN_LATEST_STATUS)
                  ? '离线'
                  : '未知'
            }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="CONN_RATE" label="连通率" width="100" align="left">
        <template #default="{ row }">
          {{ row.CONN_RATE ? `${row.CONN_RATE}%` : '-' }}
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick, computed } from 'vue'
import { ElMessage } from 'element-plus'
import * as jaoApi from '@/modules/automation/api/jao'

const props = defineProps({
  ciType: { type: String, required: true },
  modelValue: { type: Array, default: () => [] },
  options: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:modelValue'])

const tableRef = ref(null)
const groupTreeRef = ref(null)
const loading = ref(false)
const tableData = ref([])
const groupFilter = ref('@@')
const selectedGroupName = ref('')
const tagFilter = ref('@@')
const groupList = ref([])
const groupTreeData = ref([])
const tagList = ref([])
const groupLoading = ref(false)
const tagLoading = ref(false)
const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0
})

const isSingleSelector = computed(() => props.options.selector === 'single')

// 防止循环更新的标志
let isInternalUpdate = false

watch(
  () => props.ciType,
  newVal => {
    if (newVal) {
      fetchData()
      fetchGroupList()
      fetchTagList()
    }
  },
  { immediate: true }
)

// 监听外部 modelValue 变化，同步选中状态到表格
// 只在外部改变时才同步（比如从父组件删除一个已选主机）
watch(
  () => props.modelValue,
  async (newVal, oldVal) => {
    // 如果是内部更新触发的，跳过
    if (isInternalUpdate) {
      return
    }

    await nextTick()
    syncSelectionFromModelValue()
  },
  { deep: true }
)

onMounted(() => {
  fetchData()
})

// 获取分组列表
async function fetchGroupList() {
  if (!props.ciType) {
    console.warn('fetchGroupList: ciType 为空')
    return
  }
  groupLoading.value = true
  try {
    const response = await jaoApi.queryAcmGroups(props.ciType)
    const data = response?.data || response || []
    // 将分组路径转换为可用的选项
    if (Array.isArray(data)) {
      groupList.value = data.map(path => {
        const name = path === '/' ? '根目录' : path.split('/').filter(Boolean).pop() || path
        return { path, name: `${name} (${path})` }
      })
      // 构建树形结构
      groupTreeData.value = buildGroupTree(data)
    } else {
      groupList.value = []
      groupTreeData.value = []
    }
  } catch (error) {
    console.error('Failed to fetch group list:', error)
    groupList.value = []
    groupTreeData.value = []
  } finally {
    groupLoading.value = false
  }
}

// 从平铺的路径列表构建树形结构
function buildGroupTree(paths) {
  const root = { name: '~', path: '/', children: [] }

  // 过滤掉根路径，排序确保父路径在前
  const sortedPaths = paths.filter(p => p && p !== '/').sort((a, b) => a.length - b.length)

  sortedPaths.forEach(path => {
    const parts = path.split('/').filter(Boolean)
    let current = root
    let currentPath = ''

    parts.forEach(part => {
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

  return [root]
}

// 选择分组
function selectGroup(path, name) {
  groupFilter.value = path
  selectedGroupName.value = path === '@@' ? '' : name
  handleGroupFilter()
}

// 处理分组树节点点击
function handleGroupNodeClick(node) {
  selectGroup(node.path, node.name)
}

// 获取标签列表
async function fetchTagList() {
  if (!props.ciType) {
    console.warn('fetchTagList: ciType 为空')
    return
  }
  tagLoading.value = true
  try {
    const response = await jaoApi.queryAcmTags(props.ciType)
    const data = response?.data || response || []
    if (Array.isArray(data)) {
      tagList.value = data.map(tag => ({
        name: tag.name || tag.tagName || tag,
        hostCount: tag.hostCount || tag.count || 0
      }))
    } else {
      tagList.value = []
    }
  } catch (error) {
    console.error('Failed to fetch tag list:', error)
    tagList.value = []
  } finally {
    tagLoading.value = false
  }
}

async function fetchData() {
  if (!props.ciType) return

  loading.value = true
  try {
    // 构建 tags 参数 - 需要是 JSON 格式的数组或 "@@"
    let tagsParam = '@@'
    if (tagFilter.value && tagFilter.value !== '@@') {
      tagsParam = JSON.stringify([{ key: tagFilter.value, value: tagFilter.value }])
    }

    const response = await jaoApi.queryAcmInstances({
      ciType: props.ciType,
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
      groups: groupFilter.value || '@@',
      tags: tagsParam
    })

    // 处理响应数据
    const data = response?.data || response
    const records = Array.isArray(data?.records) ? data.records : Array.isArray(data) ? data : []

    // 保持原始字段名，确保每条记录有唯一id
    tableData.value = records.map((item, index) => ({
      ...item,
      id: item.id || item.ci_id || `row-${index}`
    }))

    pagination.value.total = data?.total || tableData.value.length

    // 数据加载后恢复选中状态
    await nextTick()
    restoreSelection()
  } catch (error) {
    console.error('Failed to fetch ACM instances:', error)
    tableData.value = []
    pagination.value.total = 0
  } finally {
    loading.value = false
  }
}

// 恢复选中状态
function restoreSelection() {
  if (!tableRef.value || !props.modelValue?.length) return

  isInternalUpdate = true
  tableData.value.forEach(row => {
    const isSelected = props.modelValue.some(item => item.key === row.id || item.value === row.IP)
    if (isSelected) {
      tableRef.value.toggleRowSelection(row, true)
    }
  })
  // 延迟重置标志，确保 selection-change 事件已处理
  setTimeout(() => {
    isInternalUpdate = false
  }, 0)
}

// 从 modelValue 同步选中状态到表格
function syncSelectionFromModelValue() {
  if (!tableRef.value || !tableData.value.length) return

  isInternalUpdate = true
  tableRef.value.clearSelection()

  if (props.modelValue?.length) {
    tableData.value.forEach(row => {
      const isSelected = props.modelValue.some(item => item.key === row.id || item.value === row.IP)
      if (isSelected) {
        tableRef.value.toggleRowSelection(row, true)
      }
    })
  }

  setTimeout(() => {
    isInternalUpdate = false
  }, 0)
}

function handleSelectionChange(selection) {
  // 如果是内部同步触发的，跳过
  if (isInternalUpdate) {
    return
  }

  let effectiveSelection = Array.isArray(selection) ? [...selection] : []

  if (isSingleSelector.value && effectiveSelection.length > 1) {
    const latestRow = effectiveSelection[effectiveSelection.length - 1]
    effectiveSelection = latestRow ? [latestRow] : []

    isInternalUpdate = true
    tableRef.value?.clearSelection()
    if (latestRow) {
      tableRef.value?.toggleRowSelection(latestRow, true)
    }
    setTimeout(() => {
      isInternalUpdate = false
    }, 0)
  }

  // 将选中的行转换为标准格式
  const selectedHosts = effectiveSelection.map(row => ({
    key: row.id,
    value: row.IP,
    assetType: props.ciType
  }))

  // 合并：保留不在当前页的已选项 + 当前页的选择
  const currentPageIds = tableData.value.map(row => row.id)
  const otherPageSelections = (props.modelValue || []).filter(
    item => !currentPageIds.includes(item.key)
  )

  const mergedSelection = isSingleSelector.value ? selectedHosts.slice(0, 1) : [...otherPageSelections, ...selectedHosts]

  isInternalUpdate = true
  emit('update:modelValue', mergedSelection)
  setTimeout(() => {
    isInternalUpdate = false
  }, 0)
}

function handleGroupFilter() {
  pagination.value.page = 1
  fetchData()
}

function handleTagFilter() {
  pagination.value.page = 1
  fetchData()
}
</script>

<style scoped>
.instance-selector {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.instance-selector .filter-toolbar {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  flex-wrap: nowrap;
  background-color: var(--el-fill-color-light);
  padding: 12px 16px;
  margin-bottom: 16px;
  border-radius: 6px;
}

.instance-selector .filter-toolbar .filter-label {
  font-weight: 600;
  color: var(--el-text-color-regular);
  white-space: nowrap;
}

.instance-selector .filter-toolbar :deep(.el-select) {
  width: 200px;
}

.instance-selector .filter-toolbar .group-select-btn {
  min-width: 150px;
  justify-content: flex-start;
}

.group-tree-dropdown {
  max-height: 350px;
  overflow-y: auto;
}

.group-tree-dropdown .all-item {
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--el-border-color-light);
  font-weight: 500;
}

.group-tree-dropdown .all-item:hover {
  background-color: var(--el-bg-color-page);
}

.group-tree-dropdown .tree-node-content {
  display: flex;
  align-items: center;
}

.group-tree-dropdown :deep(.el-tree-node__content) {
  height: 32px;
}

.group-tree-dropdown :deep(.el-tree-node__content:hover) {
  background-color: var(--el-bg-color-page);
}

.instance-selector .pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  padding-top: 8px;
}

/* 确保表格checkbox可以正常点击 */
.instance-selector :deep(.el-table) {
  --el-table-border-color: var(--el-border-color-lighter);
}

.instance-selector :deep(.el-table .el-table__header-wrapper) {
  position: relative;
  z-index: 1;
}

.instance-selector :deep(.el-table .el-checkbox) {
  display: inline-flex;
  align-items: center;
}

.instance-selector :deep(.el-table .el-checkbox__input) {
  cursor: pointer;
}

.instance-selector :deep(.el-table .el-checkbox__inner) {
  width: 14px;
  height: 14px;
  cursor: pointer;
}

.instance-selector :deep(.el-table .cell) {
  padding: 0 8px;
}

.instance-selector :deep(.el-table td.el-table__cell .cell) {
  display: flex;
  align-items: center;
}
</style>
