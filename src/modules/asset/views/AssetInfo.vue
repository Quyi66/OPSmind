<template>
  <div class="asset-info">
    <!-- 资产类型标签页 -->
    <div class="type-tabs-wrapper">
      <div class="type-tabs">
        <div
          v-for="item in assetTypes"
          :key="item.code"
          :class="['type-tab', { active: currentType === item.code }]"
          @click="handleTypeChange(item.code)"
        >
          <i :class="['fa', item.icon || 'fa-server']"></i>
          <span>{{ item.title }}</span>
        </div>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="asset-content">
      <!-- 操作按钮区域 -->
      <div class="action-bar">
        <div class="action-buttons">
          <el-tooltip content="导出" placement="top">
            <el-button :icon="Download" circle @click="handleExport" />
          </el-tooltip>
          <el-tooltip content="修改" placement="top">
            <el-button :icon="Edit" circle :disabled="!hasSelection" @click="handleEdit" />
          </el-tooltip>
          <el-tooltip content="添加标签" placement="top">
            <el-button circle :disabled="!hasSelection" @click="handleAddTag">
              <i class="fa fa-tag"></i>
            </el-button>
          </el-tooltip>
          <el-tooltip content="添加分组" placement="top">
            <el-button circle :disabled="!hasSelection" @click="handleAddGroup">
              <i class="fa fa-code"></i>
            </el-button>
          </el-tooltip>
          <el-tooltip content="上线" placement="top">
            <el-button :icon="Top" circle :disabled="!hasSelection" @click="handleOnline" />
          </el-tooltip>
          <el-tooltip content="下线" placement="top">
            <el-button :icon="Bottom" circle :disabled="!hasSelection" @click="handleOffline" />
          </el-tooltip>
          <el-tooltip content="删除" placement="top">
            <el-button :icon="Delete" circle :disabled="!hasSelection" @click="handleDelete" />
          </el-tooltip>
          <el-button type="primary" @click="handleAutoEntry">
            <i class="fa fa-plus" style="margin-right: 4px"></i>
            自动化资产录入
          </el-button>
        </div>
      </div>

      <!-- 筛选区域 -->
      <div class="filter-bar">
        <div class="filter-section">
          <div class="filter-item">
            <span class="filter-label">数据过滤</span>
            <el-popover
              placement="bottom-start"
              :width="360"
              trigger="click"
              v-model:visible="hostSelectorVisible"
            >
              <template #reference>
                <el-button size="default">
                  <i class="fa fa-list-ul" style="margin-right: 4px"></i>
                  @@
                  <i class="fa fa-caret-down" style="margin-left: 4px"></i>
                </el-button>
              </template>
              <div class="host-selector">
                <div class="host-selector-header">
                  <span>
                    <i class="fa fa-desktop" style="margin-right: 4px"></i>
                    已选主机
                  </span>
                  <el-tag size="small" type="danger">{{ selectedHostCount }}</el-tag>
                </div>
                <el-tabs v-model="hostSelectorTab">
                  <el-tab-pane label="按分组" name="group">
                    <template #label>
                      <span><i class="fa fa-code-branch" style="margin-right: 4px"></i>按分组</span>
                    </template>
                    <div class="group-tree-container">
                      <div class="group-item all-item" :class="{ active: selectedGroup === 'all' }" @click="handleSelectGroup('all')">
                        所有
                      </div>
                      <el-tree
                        v-if="groupTreeData.length > 0"
                        ref="groupTreeRef"
                        :data="groupTreeData"
                        :props="treeProps"
                        node-key="id"
                        default-expand-all
                        @node-click="handleGroupNodeClick"
                      >
                        <template #default="{ node }">
                          <span class="tree-node">
                            <i class="fa fa-folder" style="margin-right: 4px; color: #e6a23c"></i>
                            {{ node.label }}
                          </span>
                        </template>
                      </el-tree>
                      <el-empty v-else description="没有数据" :image-size="60" />
                    </div>
                  </el-tab-pane>
                  <el-tab-pane label="按标签" name="tag">
                    <template #label>
                      <span><i class="fa fa-tag" style="margin-right: 4px"></i>按标签</span>
                    </template>
                    <div class="tag-list-container">
                      <el-empty v-if="tagList.length === 0" description="没有数据" :image-size="60" />
                      <div v-else class="tag-list">
                        <div
                          v-for="tag in tagList"
                          :key="tag.name"
                          class="tag-item"
                          :class="{ active: selectedTag === tag.name }"
                          @click="handleSelectTag(tag)"
                        >
                          {{ tag.name }}
                        </div>
                      </div>
                    </div>
                  </el-tab-pane>
                </el-tabs>
              </div>
            </el-popover>
          </div>

          <div class="filter-item">
            <span class="filter-label">权限过滤</span>
            <el-select
              v-model="filters.permission"
              placeholder="请选择"
              size="default"
              style="width: 80px"
            >
              <el-option label="可读" value="r" />
              <el-option label="可写" value="rw" />
              <el-option label="可执行" value="rwx" />
            </el-select>
          </div>

          <div class="filter-item">
            <span class="filter-label">状态过滤</span>
            <el-select
              v-model="filters.status"
              placeholder="请选择"
              size="default"
              style="width: 80px"
            >
              <el-option label="全部" value="all" />
              <el-option label="在线" value="1" />
              <el-option label="下线" value="0" />
            </el-select>
          </div>

          <div class="filter-item">
            <span class="filter-label">最近连通状态</span>
            <el-select
              v-model="filters.connLatestStatus"
              placeholder="请选择"
              size="default"
              style="width: 160px"
            >
              <el-option label="所有" value="" />
              <el-option label="最近一次连通成功设备" value="1" />
              <el-option label="最近一次连通失败设备" value="0" />
              <el-option label="未测试设备" value="null" />
            </el-select>
          </div>

          <div class="filter-item">
            <span class="filter-label">系统版本</span>
            <el-select
              v-model="filters.osVersion"
              placeholder="所有"
              multiple
              collapse-tags
              collapse-tags-tooltip
              clearable
              size="default"
              style="width: 120px"
            >
              <el-option
                v-for="item in osVersionOptions"
                :key="item.value"
                :label="item.value"
                :value="item.value"
              />
            </el-select>
          </div>
        </div>

        <div class="search-section">
          <el-input
            v-model="searchText"
            placeholder="搜索"
            clearable
            size="default"
            style="width: 200px"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <i class="fa fa-search"></i>
            </template>
          </el-input>
          <el-button :icon="Refresh" circle size="small" @click="loadAssetList" />
        </div>
      </div>

      <!-- 数据表格 -->
      <div class="table-container">
        <el-table
          ref="tableRef"
          v-loading="loading"
          :data="tableData"
          stripe
          height="100%"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="40" fixed="left" />

          <el-table-column label="资产状态" width="80" fixed="left">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
                {{ row.status === 1 ? '在线' : '下线' }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="IP" label="纳管IP" width="130" />

          <el-table-column label="连通状态" width="80" align="center">
            <template #default="{ row }">
              <i
                v-if="row.CONN_LATEST_STATUS === 1"
                class="fa fa-check-circle text-success"
              ></i>
              <i
                v-else-if="row.CONN_LATEST_STATUS === 0"
                class="fa fa-times-circle text-danger"
              ></i>
              <i v-else class="fa fa-question-circle text-warning"></i>
            </template>
          </el-table-column>

          <el-table-column label="连通率" width="80">
            <template #default="{ row }">
              <span :class="getConnRateClass(row.CONN_RATE)">
                {{ row.CONN_RATE ? row.CONN_RATE + '%' : '未测试' }}
              </span>
            </template>
          </el-table-column>

          <el-table-column prop="业务系统" label="业务系统" width="100" show-overflow-tooltip />
          <el-table-column prop="os_version" label="系统版本" width="80" />
          <el-table-column prop="os_distro" label="操作系统" width="180" show-overflow-tooltip />
          <el-table-column prop="hostname" label="主机名" width="120" show-overflow-tooltip />
          <el-table-column prop="arch" label="系统架构" width="80" />
          <el-table-column prop="cpu_vcpus" label="cpu个数" width="80" />
          <el-table-column prop="kernel" label="内核" width="220" show-overflow-tooltip />
          <el-table-column prop="memtotal_mb" label="总内存" width="80" />
          <el-table-column prop="系统名称" label="系统名称" width="100" show-overflow-tooltip />
          <el-table-column prop="负责人" label="负责人" width="80" />
          <el-table-column prop="memfree_mb" label="可用内存" width="80" />
          <el-table-column prop="jdk_version" label="Java版本" width="150" show-overflow-tooltip />
          <el-table-column prop="系统模块" label="系统模块" width="100" show-overflow-tooltip />

          <el-table-column label="更新时间" width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.updated_at) }}
            </template>
          </el-table-column>

          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-tooltip content="查看" placement="top">
                <el-button link type="primary" size="small" @click="handleView(row)">
                  <i class="fa fa-eye"></i>
                </el-button>
              </el-tooltip>
              <el-tooltip content="编辑" placement="top">
                <el-button link type="primary" size="small" @click="handleEditRow(row)">
                  <i class="fa fa-pencil-alt"></i>
                </el-button>
              </el-tooltip>
              <el-tooltip content="历史" placement="top">
                <el-button link type="primary" size="small" @click="handleHistory(row)">
                  <i class="fa fa-chart-bar"></i>
                </el-button>
              </el-tooltip>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页 -->
      <div class="ops-pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handlePageSizeChange"
          @current-change="loadAssetList"
        />
      </div>
    </div>

    <!-- 资产详情弹窗 -->
    <AssetDetailDialog
      v-model="detailDialogVisible"
      :asset-id="currentAssetId"
    />

    <!-- 资产编辑弹窗 -->
    <AssetEditDialog
      v-model="editDialogVisible"
      :asset-id="currentAssetId"
      @saved="handleEditSaved"
    />

    <!-- 资产历史弹窗 -->
    <AssetHistoryDialog
      v-model="historyDialogVisible"
      :asset-id="currentAssetId"
      :asset-ip="currentAssetIp"
    />

    <!-- 自动化资产录入弹窗 -->
    <AutoEntryDialog
      v-model="autoEntryDialogVisible"
      :asset-type="currentType"
      @saved="handleAutoEntrySaved"
    />

    <!-- 批量编辑弹窗 -->
    <BatchEditDialog
      v-model="batchEditDialogVisible"
      :ci-ids="selectedRows.map(row => row.id)"
      :asset-type="currentType"
      @saved="handleBatchEditSaved"
    />

    <!-- 添加标签弹窗 -->
    <AddTagDialog
      v-model="addTagDialogVisible"
      :ci-ids="selectedRows.map(row => row.id)"
      :asset-type="currentType"
      @saved="handleAddTagSaved"
    />

    <!-- 添加分组弹窗 -->
    <AddGroupDialog
      v-model="addGroupDialogVisible"
      :ci-ids="selectedRows.map(row => row.id)"
      :asset-type="currentType"
      @saved="handleAddGroupSaved"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Download,
  Edit,
  Delete,
  Top,
  Bottom,
  Refresh
} from '@element-plus/icons-vue'
import { assetApi } from '../api'
import { apiService } from '@/core/api'
import AssetDetailDialog from '../components/AssetDetailDialog.vue'
import AssetEditDialog from '../components/AssetEditDialog.vue'
import AssetHistoryDialog from '../components/AssetHistoryDialog.vue'
import AutoEntryDialog from '../components/AutoEntryDialog.vue'
import BatchEditDialog from '../components/BatchEditDialog.vue'
import AddTagDialog from '../components/AddTagDialog.vue'
import AddGroupDialog from '../components/AddGroupDialog.vue'

// 资产详情弹窗
const detailDialogVisible = ref(false)
const editDialogVisible = ref(false)
const historyDialogVisible = ref(false)
const autoEntryDialogVisible = ref(false)
const batchEditDialogVisible = ref(false)
const addTagDialogVisible = ref(false)
const addGroupDialogVisible = ref(false)
const currentAssetId = ref('')
const currentAssetIp = ref('')

// 资产类型列表
const assetTypes = ref([])
const currentType = ref('')

// 主机选择器
const hostSelectorVisible = ref(false)
const hostSelectorTab = ref('group')
const groupTreeRef = ref(null)
const groupTreeData = ref([])
const tagList = ref([])
const selectedGroup = ref('all')
const selectedTag = ref('')
const selectedHostCount = computed(() => selectedRows.value.length)

// 树形组件配置
const treeProps = {
  label: 'name',
  children: 'children'
}

// 将路径数组转换为树形结构
const buildGroupTreeFromPaths = (paths) => {
  if (!paths || paths.length === 0) return []

  const root = { path: '/', name: '~', children: [] }
  const nodeMap = new Map()
  nodeMap.set('/', root)

  const sortedPaths = [...paths].filter(p => p && p !== '/').sort((a, b) => a.length - b.length)

  sortedPaths.forEach(path => {
    const segments = path.split('/').filter(s => s)
    let currentPath = ''
    let parent = root

    segments.forEach(segment => {
      currentPath = currentPath + '/' + segment
      if (!nodeMap.has(currentPath)) {
        const node = {
          path: currentPath,
          name: segment,
          children: []
        }
        nodeMap.set(currentPath, node)
        parent.children.push(node)
      }
      parent = nodeMap.get(currentPath)
    })
  })

  return [root]
}

// 筛选条件
const filters = ref({
  hostKeys: '@@',
  permission: 'r',
  status: '1',
  connLatestStatus: '',
  osVersion: []
})

// 系统版本选项
const osVersionOptions = ref([])

// 搜索
const searchText = ref('')

// 表格数据
const tableRef = ref()
const tableData = ref([])
const loading = ref(false)
const selectedRows = ref([])

// 分页
const pageSize = ref(100)
const currentPage = ref(1)
const total = ref(0)

// 计算属性
const hasSelection = computed(() => selectedRows.value.length > 0)

const paginationInfo = computed(() => {
  if (total.value === 0) return '0 - 0 / 0'
  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(currentPage.value * pageSize.value, total.value)
  return `${start} - ${end} / ${total.value}`
})

// 获取连通率样式
const getConnRateClass = (rate) => {
  if (!rate) return 'text-secondary'
  if (rate >= 50) return 'text-primary'
  return 'text-warning'
}

// 格式化日期时间
const formatDateTime = (dateStr) => {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    const second = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`
  } catch {
    return dateStr
  }
}

// 行操作
const handleView = (row) => {
  currentAssetId.value = row.id
  detailDialogVisible.value = true
}

const handleEditRow = (row) => {
  currentAssetId.value = row.id
  editDialogVisible.value = true
}

const handleEditSaved = () => {
  // 刷新列表
  loadAssetList()
}

const handleHistory = (row) => {
  currentAssetId.value = row.id
  currentAssetIp.value = row.IP || ''
  historyDialogVisible.value = true
}

// 加载分组树
const loadGroupTree = async () => {
  if (!currentType.value) return
  try {
    const res = await assetApi.getGroupList(currentType.value)
    console.log('分组列表原始数据:', res)
    // 接口返回的是路径字符串数组，如 ["/", "/21", "/dev"]
    const paths = Array.isArray(res) ? res : []
    groupTreeData.value = buildGroupTreeFromPaths(paths)
  } catch (error) {
    console.error('加载分组列表失败:', error)
    groupTreeData.value = []
  }
}

// 加载标签列表
const loadTagList = async () => {
  if (!currentType.value) return
  try {
    const res = await assetApi.getTagList(currentType.value)
    console.log('标签列表原始数据:', res)
    // 接口返回的是标签数组，格式如 [{name: "xxx", ...}]
    tagList.value = Array.isArray(res) ? res : []
  } catch (error) {
    console.error('加载标签列表失败:', error)
    tagList.value = []
  }
}

// 选择分组
const handleSelectGroup = (groupId) => {
  selectedGroup.value = groupId
  selectedTag.value = ''
  if (groupId === 'all') {
    filters.value.hostKeys = '@@'
  } else {
    filters.value.hostKeys = groupId
  }
  hostSelectorVisible.value = false
}

// 分组树节点点击
const handleGroupNodeClick = (data) => {
  handleSelectGroup(data.path)
}

// 选择标签
const handleSelectTag = (tag) => {
  selectedTag.value = tag.name
  selectedGroup.value = ''
  filters.value.hostKeys = `,#${tag.name}`
  hostSelectorVisible.value = false
}

// 加载资产类型列表
const loadAssetTypes = async () => {
  try {
    const res = await assetApi.getAssetTypes()
    console.log('资产类型列表:', res)
    if (res.records && res.records.length > 0) {
      assetTypes.value = res.records
      // 默认选中第一个
      if (!currentType.value) {
        currentType.value = res.records[0].code
      }
    }
  } catch (error) {
    console.error('加载资产类型失败:', error)
    ElMessage.error('加载资产类型失败')
  }
}

// 加载系统版本选项
const loadOsVersionOptions = async () => {
  if (!currentType.value) return
  try {
    const res = await assetApi.getAttrValues(currentType.value, 'os_version')
    console.log('系统版本选项:', res)
    osVersionOptions.value = res.records || []
  } catch (error) {
    console.error('加载系统版本选项失败:', error)
  }
}

// 加载资产列表
const loadAssetList = async () => {
  if (!currentType.value) return
  loading.value = true
  try {
    const params = {
      hostKeys: filters.value.hostKeys,
      assetType: currentType.value,
      permission: filters.value.permission,
      status: filters.value.status,
      CONN_LATEST_STATUS: filters.value.connLatestStatus,
      system_name: ' ',
      os_version: filters.value.osVersion.length > 0 ? filters.value.osVersion.join(',') : ' '
    }
    console.log('请求参数:', params)
    const res = await assetApi.getAssetList(params, {
      size: pageSize.value,
      page: currentPage.value,
      filter: searchText.value
    })
    console.log('资产列表响应:', res)
    tableData.value = res.records || []
    total.value = res.total || 0
  } catch (error) {
    console.error('加载资产列表失败:', error)
    ElMessage.error('加载资产列表失败')
  } finally {
    loading.value = false
  }
}

// 资产类型切换
const handleTypeChange = (code) => {
  currentType.value = code
}

// 监听类型变化
watch(currentType, () => {
  currentPage.value = 1
  selectedGroup.value = 'all'
  selectedTag.value = ''
  filters.value.hostKeys = '@@'
  loadOsVersionOptions()
  loadGroupTree()
  loadTagList()
  loadAssetList()
})

// 监听筛选条件变化 - 添加防抖
let filterTimer = null
watch(filters, () => {
  if (filterTimer) clearTimeout(filterTimer)
  filterTimer = setTimeout(() => {
    currentPage.value = 1
    loadAssetList()
  }, 300)
}, { deep: true })

// 搜索
const handleSearch = () => {
  currentPage.value = 1
  loadAssetList()
}

// 分页大小变化
const handlePageSizeChange = () => {
  currentPage.value = 1
  loadAssetList()
}

// 选择变化
const handleSelectionChange = (rows) => {
  selectedRows.value = rows
}

// 操作按钮 - 占位
const handleExport = () => {
  ElMessageBox.confirm('是否确认导出数据？', '导出确认', {
    type: 'warning'
  }).then(() => {
    ElMessage.info('导出功能待实现')
  }).catch(() => {})
}

const handleEdit = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要修改的资产')
    return
  }
  batchEditDialogVisible.value = true
}

const handleBatchEditSaved = () => {
  loadAssetList()
}

const handleAddTag = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要添加标签的资产')
    return
  }
  addTagDialogVisible.value = true
}

const handleAddTagSaved = () => {
  loadAssetList()
  loadTagList()
}

const handleAddGroup = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要添加分组的资产')
    return
  }
  addGroupDialogVisible.value = true
}

const handleAddGroupSaved = () => {
  loadAssetList()
  loadGroupTree()
}

const handleOnline = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要上线的资产')
    return
  }
  ElMessageBox.confirm('是否将选中的资产设置为在线状态？', '上线确认', {
    type: 'warning'
  }).then(async () => {
    try {
      const ids = selectedRows.value.map(row => row.id).join(',')
      await apiService.post(
        `/jao/api/jao/jobs/QqUnBG/run?cacheBuster=${Date.now()}`,
        {
          params: {
            status: 1,
            id: ids
          }
        }
      )
      ElMessage.success('上线成功')
      loadAssetList()
    } catch (error) {
      console.error('上线失败:', error)
      ElMessage.error('上线失败: ' + (error.response?.data?.message || error.message))
    }
  }).catch(() => {})
}

const handleOffline = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要下线的资产')
    return
  }
  ElMessageBox.confirm('是否将选中的资产设置为下线状态？', '下线确认', {
    type: 'warning'
  }).then(async () => {
    try {
      const ids = selectedRows.value.map(row => row.id).join(',')
      await apiService.post(
        `/jao/api/jao/jobs/QqUnBG/run?cacheBuster=${Date.now()}`,
        {
          params: {
            status: 0,
            id: ids
          }
        }
      )
      ElMessage.success('下线成功')
      loadAssetList()
    } catch (error) {
      console.error('下线失败:', error)
      ElMessage.error('下线失败: ' + (error.response?.data?.message || error.message))
    }
  }).catch(() => {})
}

const handleDelete = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要删除的资产')
    return
  }
  ElMessageBox.confirm('是否确认删除选中的资产？此操作不可恢复！', '删除确认', {
    type: 'warning'
  }).then(async () => {
    try {
      const ids = selectedRows.value.map(row => row.id).join(',')
      await apiService.post(
        `/jao/api/jao/jobs/CdPKGF/run?cacheBuster=${Date.now()}`,
        {
          params: {
            id: ids
          }
        }
      )
      ElMessage.success('删除成功')
      loadAssetList()
    } catch (error) {
      console.error('删除失败:', error)
      ElMessage.error('删除失败: ' + (error.response?.data?.message || error.message))
    }
  }).catch(() => {})
}

const handleAutoEntry = () => {
  autoEntryDialogVisible.value = true
}

const handleAutoEntrySaved = () => {
  // 刷新列表
  loadAssetList()
}

// 初始化
onMounted(() => {
  loadAssetTypes()
})
</script>

<style scoped lang="scss">
.asset-info {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.page-header {
  padding: 16px 20px 8px;

  .page-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }
}

// 顶部横向标签页
.type-tabs-wrapper {
  padding: 0 20px;
  border-bottom: 1px solid #ebeef5;
}

.type-tabs {
  display: flex;
  gap: 24px;

  .type-tab {
    display: flex;
    align-items: center;
    padding: 12px 0;
    cursor: pointer;
    color: #409eff;
    font-size: 14px;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;

    i {
      margin-right: 6px;
      font-size: 14px;
    }

    &:hover {
      color: #66b1ff;
    }

    &.active {
      color: #409eff;
      border-bottom-color: #409eff;
    }
  }
}

// 内容区
.asset-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px 20px;
  overflow: hidden;
  background: #f5f7fa;
}

// 操作按钮栏
.action-bar {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 12px;

  .action-buttons {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

// 筛选栏
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f0f2f5;
  border-radius: 4px;
  margin-bottom: 12px;
}

.filter-section {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;

  .filter-item {
    display: flex;
    align-items: center;
    gap: 8px;

    .filter-label {
      font-size: 13px;
      color: #606266;
      white-space: nowrap;
    }
  }
}

.search-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

// 表格容器
.table-container {
  flex: 1;
  background: #fff;
  border-radius: 4px;
  overflow: hidden;
}

// 分页
.pagination-container {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px;
  background: #ffffcc;
  margin-top: 8px;

  .pagination-info {
    font-size: 13px;
    color: #606266;
  }
}

// 文本颜色
.text-success {
  color: #67c23a;
}

.text-danger {
  color: #f56c6c;
}

.text-warning {
  color: #e6a23c;
}

.text-primary {
  color: #409eff;
}

.text-secondary {
  color: #909399;
}

// 主机选择器
.host-selector {
  .host-selector-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 12px;
    border-bottom: 1px solid #ebeef5;
    margin-bottom: 8px;
    font-size: 14px;
    color: #303133;
  }

  .group-tree-container {
    max-height: 300px;
    overflow-y: auto;

    .group-item {
      padding: 8px 12px;
      cursor: pointer;
      border-radius: 4px;
      margin-bottom: 4px;

      &:hover {
        background: #f5f7fa;
      }

      &.active {
        background: #ecf5ff;
        color: #409eff;
      }

      &.all-item {
        background: #f5f7fa;
        margin-bottom: 8px;
      }
    }

    .tree-node {
      display: flex;
      align-items: center;
    }
  }

  .tag-list-container {
    max-height: 300px;
    overflow-y: auto;

    .tag-list {
      .tag-item {
        padding: 8px 12px;
        cursor: pointer;
        border-radius: 4px;
        margin-bottom: 4px;

        &:hover {
          background: #f5f7fa;
        }

        &.active {
          background: #ecf5ff;
          color: #409eff;
        }
      }
    }
  }
}
</style>
