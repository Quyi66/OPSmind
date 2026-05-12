<template>
  <div class="ops-page-layout" style="padding: 0; gap: 0">
    <!-- 资产类型标签页 -->
    <div class="type-tabs-wrapper">
      <div class="type-tabs">
        <div
          v-for="item in assetTypes"
          :key="item.code"
          :class="['type-tab', { active: currentType === item.code }]"
          @click="handleTypeChange(item.code)"
        >
          <!-- <i :class="['fa', item.icon || 'fa-server']"></i> -->
          <span>{{ item.title }}</span>
        </div>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="ops-page-layout">
      <!-- 筛选区域 -->
      <div class="ops-filter-bar">
        <el-form :inline="true" size="small">
          <el-form-item label="数据过滤">
            <el-popover
              placement="bottom-start"
              :width="360"
              trigger="click"
              v-model:visible="hostSelectorVisible"
            >
              <template #reference>
                <el-button size="small">
                  <i class="fa fa-list-ul" style="margin-right: 4px"></i>
                  {{ selectedFilterText }}
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
                      <span>
                        <i class="fa fa-code-branch" style="margin-right: 4px"></i>
                        按分组
                      </span>
                    </template>
                    <div class="group-tree-container">
                      <div
                        class="group-item all-item"
                        :class="{ active: selectedGroup === 'all' }"
                        @click="handleSelectGroup('all')"
                      >
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
                      <span>
                        <i class="fa fa-tag" style="margin-right: 4px"></i>
                        按标签
                      </span>
                    </template>
                    <div class="tag-list-container">
                      <el-empty
                        v-if="tagList.length === 0"
                        description="没有数据"
                        :image-size="60"
                      />
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
          </el-form-item>

          <el-form-item label="权限过滤">
            <el-select v-model="filters.permission" style="width: 80px">
              <el-option label="可读" value="r" />
              <el-option label="可写" value="rw" />
              <el-option label="可执行" value="rwx" />
            </el-select>
          </el-form-item>

          <el-form-item label="状态过滤">
            <el-select v-model="filters.status" style="width: 80px">
              <el-option label="全部" value="all" />
              <el-option label="在线" value="1" />
              <el-option label="下线" value="0" />
            </el-select>
          </el-form-item>

          <el-form-item label="最近连通状态">
            <el-select v-model="filters.connLatestStatus" style="width: 100px">
              <el-option label="所有" value="all" />
              <el-option label="连通成功" value="1" />
              <el-option label="连通失败" value="0" />
              <el-option label="未测试" value="null" />
            </el-select>
          </el-form-item>

          <el-form-item label="系统版本">
            <el-select
              v-model="filters.osVersion"
              placeholder="所有"
              multiple
              collapse-tags
              collapse-tags-tooltip
              clearable
              style="width: 120px"
            >
              <el-option
                v-for="item in osVersionOptions"
                :key="item.value"
                :label="item.value"
                :value="item.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="关键词">
            <el-input v-model="searchText" placeholder="搜索" clearable style="width: 150px" />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="handleSearch">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="handleReset">
              <el-icon><RefreshRight /></el-icon>
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 操作按钮区域 -->
      <div class="ops-action-bar">
        <el-button type="primary" @click="handleAutoEntry" size="small">
          <i class="fa fa-plus" style="margin-right: 4px"></i>
          自动化资产录入
        </el-button>
        <el-button size="small" @click="importDialogVisible = true">
          <i class="fa fa-file-import" style="margin-right: 4px"></i>
          导入资产
        </el-button>
        <el-button size="small" @click="exportDialogVisible = true">
          <i class="fa fa-file-export" style="margin-right: 4px"></i>
          资产信息导出
        </el-button>
        <el-button size="small" @click="deleteImportDialogVisible = true">
          <i class="fa fa-trash-alt" style="margin-right: 4px"></i>
          批量删除资产
        </el-button>
        <el-button :icon="Edit" :disabled="!hasSelection" @click="handleEdit" size="small">
          修改
        </el-button>
        <el-button :disabled="!hasSelection" @click="handleAddTag" size="small">
          <i class="fa fa-tag" style="margin-right: 4px"></i>
          添加标签
        </el-button>
        <el-button :disabled="!hasSelection" @click="handleAddGroup" size="small">
          <i class="fa fa-code" style="margin-right: 4px"></i>
          添加分组
        </el-button>
        <el-button :icon="Top" :disabled="!hasSelection" @click="handleOnline" size="small">
          上线
        </el-button>
        <el-button :icon="Bottom" :disabled="!hasSelection" @click="handleOffline" size="small">
          下线
        </el-button>
        <el-button
          type="danger"
          :icon="Delete"
          :disabled="!hasSelection"
          @click="handleDelete"
          size="small"
        >
          删除
        </el-button>
        <span style="flex: 1"></span>
        <el-button
          class="toolbar-icon-btn"
          circle
          size="small"
          :loading="loading"
          @click="handleRefresh"
          title="刷新"
        >
          <el-icon v-show="!loading"><Refresh /></el-icon>
        </el-button>
      </div>

      <!-- 数据表格 -->
      <div class="ops-table-wrapper">
        <el-table
          ref="tableRef"
          v-loading="loading"
          :data="tableData"
          max-height="calc(100vh - 340px)"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="40" fixed="left" />

          <el-table-column label="资产状态" width="80" fixed="left">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
                {{ row.status === 1 ? '在线' : '离线' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="IP" label="纳管IP" width="130" />
          <el-table-column prop="needReboot" label="是否需要重启" width="120">
            <template #default="{ row }">
              <el-tag
                :type="
                  row.needReboot === 1 ? 'danger' : row.needReboot === 0 ? 'success' : 'warning'
                "
                size="small"
                round
              >
                {{ row.needReboot === 1 ? '是' : row.needReboot === 0 ? '否' : '未知' }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="连通状态" width="100" align="left" prop="CONN_LATEST_STATUS">
            <template #default="{ row }">
              <el-button link :loading="checkingConnIds.includes(row.id)" @click="handleCheckSingleConn(row)" style="padding: 0; line-height: 1">
                <i v-if="row.CONN_LATEST_STATUS === '1'" class="fa fa-check-circle text-success">
                  已联通
                </i>
                <i v-else-if="row.CONN_LATEST_STATUS === '0'" class="fa fa-times-circle text-danger">
                  未联通
                </i>
                <i v-else class="fa fa-question-circle text-warning">未知</i>
              </el-button>
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
          <el-table-column prop="os_version" label="系统版本" width="110" />
          <el-table-column
            prop="os_distro"
            label="操作系统"
            min-width="200"
            show-overflow-tooltip
          />
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

          <el-table-column label="更新时间" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.updated_at) }}
            </template>
          </el-table-column>

          <el-table-column label="操作" width="132" fixed="right">
            <template #default="{ row }">
              <el-button text type="primary" size="small" @click="handleView(row)">查看</el-button>
              <el-button text type="primary" size="small" @click="handleEditRow(row)">
                编辑
              </el-button>
              <el-button text type="primary" size="small" @click="handleHistory(row)">
                历史
              </el-button>
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
    <AssetDetailDialog v-model="detailDialogVisible" :asset-id="currentAssetId" />

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

    <ImportAssetDialog v-model="importDialogVisible" :tenant-id="currentTenantId" @saved="handleAssetDataSaved" />

    <ExportAssetDialog v-model="exportDialogVisible" :default-ci-type="currentType" />

    <DeleteAssetImportDialog v-model="deleteImportDialogVisible" @saved="handleAssetDataSaved" />

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
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Edit,
  Delete,
  Top,
  Bottom,
  Refresh,
  Search,
  RefreshRight
} from '@element-plus/icons-vue'
import { assetApi, dataManageApi } from '../api'
import { apiService } from '@/core/api'
import { pollJobStatus } from '@/composables/useJobPolling'
import AssetDetailDialog from '../components/asset-info/AssetDetailDialog.vue'
import AssetEditDialog from '../components/asset-info/AssetEditDialog.vue'
import AssetHistoryDialog from '../components/asset-info/AssetHistoryDialog.vue'
import AutoEntryDialog from '../components/asset-info/AutoEntryDialog.vue'
import ImportAssetDialog from '../components/asset-info/ImportAssetDialog.vue'
import ExportAssetDialog from '../components/asset-info/ExportAssetDialog.vue'
import DeleteAssetImportDialog from '../components/asset-info/DeleteAssetImportDialog.vue'
import BatchEditDialog from '../components/asset-info/BatchEditDialog.vue'
import AddTagDialog from '../components/asset-info/AddTagDialog.vue'
import AddGroupDialog from '../components/asset-info/AddGroupDialog.vue'

// 路由
const route = useRoute()

// 资产详情弹窗
const detailDialogVisible = ref(false)
const editDialogVisible = ref(false)
const historyDialogVisible = ref(false)
const autoEntryDialogVisible = ref(false)
const importDialogVisible = ref(false)
const exportDialogVisible = ref(false)
const deleteImportDialogVisible = ref(false)
const batchEditDialogVisible = ref(false)
const addTagDialogVisible = ref(false)
const addGroupDialogVisible = ref(false)
const currentAssetId = ref('')
const currentAssetIp = ref('')
const currentTenantId = ref('')

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
const selectedGroupName = ref('所有')
const selectedTag = ref('')
const selectedHostCount = computed(() => selectedRows.value.length)

// 计算选中的过滤文本
const selectedFilterText = computed(() => {
  if (selectedTag.value) {
    return `#${selectedTag.value}`
  }
  return selectedGroupName.value || '@@'
})

// 树形组件配置
const treeProps = {
  label: 'name',
  children: 'children'
}

// 将路径数组转换为树形结构
const buildGroupTreeFromPaths = paths => {
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
  connLatestStatus: 'all',
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
const pageSize = ref(10)
const currentPage = ref(1)
const total = ref(0)
const checkingConnIds = ref([])

// 计算属性
const hasSelection = computed(() => selectedRows.value.length > 0)

const paginationInfo = computed(() => {
  if (total.value === 0) return '0 - 0 / 0'
  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(currentPage.value * pageSize.value, total.value)
  return `${start} - ${end} / ${total.value}`
})

// 获取连通率样式
const getConnRateClass = rate => {
  if (!rate) return 'text-secondary'
  if (rate >= 50) return 'text-primary'
  return 'text-warning'
}

// 格式化日期时间
const formatDateTime = dateStr => {
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
const handleView = row => {
  currentAssetId.value = row.id
  detailDialogVisible.value = true
}

const handleEditRow = row => {
  currentAssetId.value = row.id
  editDialogVisible.value = true
}

const handleEditSaved = () => {
  // 刷新列表
  loadAssetList()
}

const handleHistory = row => {
  currentAssetId.value = row.id
  currentAssetIp.value = row.IP || ''
  historyDialogVisible.value = true
}

// 加载分组树
const loadGroupTree = async () => {
  if (!currentType.value) return
  try {
    const res = await assetApi.getGroupList(currentType.value)
    // 接口返回的是路径字符串数组，如 ["/", "/21", "/dev"]
    const paths = res.records || []
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
    // 接口返回的是标签数组，格式如 [{name: "xxx", ...}]
    tagList.value = res.records || []
  } catch (error) {
    console.error('加载标签列表失败:', error)
    tagList.value = []
  }
}

// 选择分组
const handleSelectGroup = (groupId, groupName = '所有') => {
  selectedGroup.value = groupId
  selectedGroupName.value = groupName
  selectedTag.value = ''
  if (groupId === 'all') {
    filters.value.hostKeys = '@@'
  } else {
    filters.value.hostKeys = groupId
  }
  hostSelectorVisible.value = false
}

// 分组树节点点击
const handleGroupNodeClick = data => {
  handleSelectGroup(data.path, data.name)
}

// 选择标签
const handleSelectTag = tag => {
  selectedTag.value = tag.name
  selectedGroup.value = ''
  filters.value.hostKeys = `,#${tag.name}`
  hostSelectorVisible.value = false
}

// 加载资产类型列表
const loadAssetTypes = async () => {
  try {
    const res = await assetApi.getAssetTypes()
    if (res.records && res.records.length > 0) {
      assetTypes.value = res.records
      // 检查 URL 参数中是否有指定的资产类型
      const typeFromQuery = route.query.type
      if (typeFromQuery && res.records.some(r => r.code === typeFromQuery)) {
        currentType.value = typeFromQuery
      } else if (!currentType.value) {
        // 默认选中第一个
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
      CONN_LATEST_STATUS:
        filters.value.connLatestStatus === 'all' ? '' : filters.value.connLatestStatus,
      system_name: ' ',
      os_version: filters.value.osVersion.length > 0 ? filters.value.osVersion.join(',') : ' '
    }
    const res = await assetApi.getAssetList(params, {
      size: pageSize.value,
      page: currentPage.value,
      filter: searchText.value
    })
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
const handleTypeChange = code => {
  currentType.value = code
}

// 监听类型变化
watch(currentType, () => {
  currentPage.value = 1
  selectedGroup.value = 'all'
  selectedGroupName.value = '所有'
  selectedTag.value = ''
  filters.value.hostKeys = '@@'
  loadOsVersionOptions()
  loadGroupTree()
  loadTagList()
  loadAssetList()
})

// 搜索
const handleSearch = () => {
  currentPage.value = 1
  loadAssetList()
}

// 重置
const handleReset = () => {
  filters.value = {
    hostKeys: '@@',
    permission: 'r',
    status: '1',
    connLatestStatus: 'all',
    osVersion: []
  }
  searchText.value = ''
  selectedGroup.value = 'all'
  selectedGroupName.value = '所有'
  selectedTag.value = ''
  currentPage.value = 1
  loadAssetList()
}

// 刷新
const handleRefresh = () => {
  loadAssetList()
}

const loadCurrentTenantId = async () => {
  try {
    currentTenantId.value = await dataManageApi.getCurrentTenantId()
  } catch (error) {
    console.error('加载租户ID失败:', error)
  }
}

const handleAssetDataSaved = () => {
  loadOsVersionOptions()
  loadGroupTree()
  loadTagList()
  loadAssetList()
}

// 分页大小变化
const handlePageSizeChange = () => {
  currentPage.value = 1
  loadAssetList()
}

// 选择变化
const handleSelectionChange = rows => {
  selectedRows.value = rows
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
  })
    .then(async () => {
      try {
        const ids = selectedRows.value.map(row => row.id).join(',')
        await apiService.post(`/jao/api/jao/jobs/QqUnBG/run?cacheBuster=${Date.now()}`, {
          params: {
            status: 1,
            id: ids
          }
        })
        ElMessage.success('上线成功')
        loadAssetList()
      } catch (error) {
        console.error('上线失败:', error)
        ElMessage.error('上线失败: ' + (error.response?.data?.message || error.message))
      }
    })
    .catch(() => {})
}

function removeCheckingId(id) {
  const idx = checkingConnIds.value.indexOf(id)
  if (idx > -1) {
    checkingConnIds.value.splice(idx, 1)
  }
}



const handleCheckSingleConn = async (row) => {
  const ip = row.IP || row.ip
  try {
    await ElMessageBox.confirm(`是否重新检查主机${ip}的连通性？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  checkingConnIds.value.push(row.id)

  try {
    const host = {
      key: row.id || row.key,
      value: row.IP || row.ip,
      assetType: currentType.value || row.ciType || 'linux'
    }

    const cacheBuster = Date.now()
    const { data } = await apiService.post(
      `/jao/api/jao/jobs/M1x855/run?cacheBuster=${cacheBuster}`,
      {
        params: { hosts: [host] }
      }
    )

    const result = Array.isArray(data) ? data[0] : data

    if (result?.status === 'WAITING' || result?.status === 'RUNNING') {
      ElMessage.success(`检查连通性任务已发起`)
      pollJobStatus(result.runId, {
        interval: 5000,
        successMessage: '连通性检查完成',
        errorMessage: '连通性检查失败',
        onSuccess: () => {
          removeCheckingId(row.id)
          loadAssetList()
        },
        onError: () => {
          removeCheckingId(row.id)
        },
        onComplete: () => {
          removeCheckingId(row.id)
        }
      })
    } else if (result?.status === 'COMPLETED' || result?.status === 'SUCCESS') {
      ElMessage.success(`连通性检查完成`)
      removeCheckingId(row.id)
      loadAssetList()
    } else if (result?.status === 'FAILED' || result?.status === 'ERROR') {
      removeCheckingId(row.id)
      ElMessage.error(result?.error || '连通性检查失败')
    } else {
      ElMessage.success(`检查连通性任务已启动`)
      removeCheckingId(row.id)
    }
  } catch (error) {
    removeCheckingId(row.id)
    console.error('检查连通性失败', error)
    ElMessage.error('检查连通性失败')
  }
}


const handleOffline = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要下线的资产')
    return
  }
  ElMessageBox.confirm('是否将选中的资产设置为下线状态？', '下线确认', {
    type: 'warning'
  })
    .then(async () => {
      try {
        const ids = selectedRows.value.map(row => row.id).join(',')
        await apiService.post(`/jao/api/jao/jobs/QqUnBG/run?cacheBuster=${Date.now()}`, {
          params: {
            status: 0,
            id: ids
          }
        })
        ElMessage.success('下线成功')
        loadAssetList()
      } catch (error) {
        console.error('下线失败:', error)
        ElMessage.error('下线失败: ' + (error.response?.data?.message || error.message))
      }
    })
    .catch(() => {})
}

const handleDelete = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要删除的资产')
    return
  }
  ElMessageBox.confirm('是否确认删除选中的资产？此操作不可恢复！', '删除确认', {
    type: 'warning'
  })
    .then(async () => {
      try {
        const ids = selectedRows.value.map(row => row.id).join(',')
        await apiService.post(`/jao/api/jao/jobs/CdPKGF/run?cacheBuster=${Date.now()}`, {
          params: {
            id: ids
          }
        })
        ElMessage.success('删除成功')
        loadAssetList()
      } catch (error) {
        console.error('删除失败:', error)
        ElMessage.error('删除失败: ' + (error.response?.data?.message || error.message))
      }
    })
    .catch(() => {})
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
  loadCurrentTenantId()
})
</script>

<style scoped lang="scss">
.asset-info {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--el-bg-color);
}

.page-header {
  padding: 16px 20px 8px;

  .page-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

// 顶部横向标签页
.type-tabs-wrapper {
  padding: 0 20px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.type-tabs {
  display: flex;
  gap: 24px;

  .type-tab {
    display: flex;
    align-items: center;
    padding: 12px 0;
    cursor: pointer;
    color: var(--el-text-color-regular); // 未激活状态使用灰色
    font-size: 14px;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
    text-align: center;

    i {
      margin-right: 6px;
      font-size: 14px;
    }

    &:hover {
      color: var(--el-color-primary);
    }

    &.active {
      color: var(--el-color-primary); // 激活状态使用蓝色
      font-weight: 500;
      border-bottom-color: var(--el-color-primary);
    }
  }
}

// 内容区 - 覆盖全局样式以适应此页面
.ops-page-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 20px;
  background: var(--el-bg-color);
  border-radius: 0;
  overflow: hidden;
}

.ops-action-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 0;

  .action-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.ops-filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: nowrap;

  .filter-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;

    .filter-item {
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;

      .filter-label {
        font-size: 13px;
        color: var(--el-text-color-regular);
      }
    }
  }

  .filter-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
}

.ops-table-wrapper {
  flex: 1;
  min-height: 0;
  background: var(--el-bg-color);
  border-radius: 4px;
  overflow: hidden;
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
    border-bottom: 1px solid var(--el-border-color-light);
    margin-bottom: 8px;
    font-size: 14px;
    color: var(--el-text-color-primary);
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
        background: var(--el-bg-color-page);
      }

      &.active {
        background: var(--el-color-primary-light-9);
        color: var(--el-color-primary);
      }

      &.all-item {
        background: var(--el-bg-color-page);
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
          background: var(--el-bg-color-page);
        }

        &.active {
          background: var(--el-color-primary-light-9);
          color: var(--el-color-primary);
        }
      }
    }
  }
}
</style>
