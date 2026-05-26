<template>
  <div class="ops-page-layout">
    <!-- 资产类型标签页 (使用 el-tabs 提升视觉与易用性) -->
    <div class="type-tabs-wrapper">
      <el-tabs v-model="currentType" class="modern-tabs" @tab-change="handleTypeChange">
        <el-tab-pane
          v-for="item in assetTypes"
          :key="item.code"
          :label="item.title"
          :name="item.code"
        />
      </el-tabs>
    </div>

    <!-- 主体区域：左边常驻侧边栏，右边列表内容 -->
    <div class="main-body-layout">
      <!-- 左侧边栏 -->
      <AssetSidebar
        :group-tree-data="groupTreeData"
        :tag-list="tagList"
        :selected-group="selectedGroup"
        :selected-tag="selectedTag"
        @select-group="handleSelectGroup"
        @select-tag="handleSelectTag"
      />

      <!-- 右侧内容区 -->
      <div class="content-view-area">
        <!-- 筛选区域 -->
        <div class="ops-filter-bar">
          <el-form :inline="true" size="small">
            <el-form-item label="在线状态">
              <el-select v-model="filters.status" style="width: 85px">
                <el-option label="全部" value="all" />
                <el-option label="在线" value="1" />
                <el-option label="下线" value="0" />
              </el-select>
            </el-form-item>

            <el-form-item label="最近连通">
              <el-select v-model="filters.connLatestStatus" style="width: 105px">
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
                style="width: 130px"
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
              <el-input
                v-model="searchText"
                placeholder="IP/主机名/责任人"
                clearable
                style="width: 240px"
                @keyup.enter="handleSearch"
              />
            </el-form-item>

            <el-form-item class="filter-actions">
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
          <div class="action-left">
            <el-button type="primary" @click="handleAutoEntry" size="small">
              <i class="fa fa-plus" style="margin-right: 4px"></i>
              自动化设备录入
            </el-button>
            <el-button size="small" @click="importDialogVisible = true">
              <i class="fa fa-file-import" style="margin-right: 4px"></i>
              导入设备
            </el-button>
            <el-button size="small" @click="exportDialogVisible = true">
              <i class="fa fa-file-export" style="margin-right: 4px"></i>
              设备信息导出
            </el-button>
            <el-button type="danger" plain size="small" @click="deleteImportDialogVisible = true">
              <i class="fa fa-trash-alt" style="margin-right: 4px"></i>
              批量删除设备
            </el-button>
          </div>
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

        <!-- 批量操作栏（设计为带滑动动画并在表格上方展示） -->
        <transition name="slide-fade">
          <div v-if="hasSelection" class="selection-action-bar-top animate-fade">
            <div class="selection-action-bar__summary">
              <i class="fa fa-info-circle text-primary" style="margin-right: 6px"></i>
              已选择 <strong>{{ selectedRows.length }}</strong> 台主机设备
            </div>
            <div class="selection-action-bar__actions">
              <el-button :icon="Edit" size="small" type="primary" plain @click="handleEdit">批量修改</el-button>
              <el-button size="small" @click="handleAddTag">
                <i class="fa fa-tag" style="margin-right: 4px"></i>
                添加标签
              </el-button>
              <el-button size="small" @click="handleAddGroup">
                <i class="fa fa-folder" style="margin-right: 4px"></i>
                添加分组
              </el-button>
              <el-button :icon="Top" size="small" type="success" plain @click="handleOnline">上线</el-button>
              <el-button :icon="Bottom" size="small" type="info" plain @click="handleOffline">下线</el-button>
              <el-button type="danger" :icon="Delete" size="small" @click="handleDelete">
                删除
              </el-button>
            </div>
          </div>
        </transition>

        <!-- 数据表格 -->
        <div class="ops-table-wrapper card-table">
          <el-table
            ref="tableRef"
            v-loading="loading"
            :data="tableData"
            height="100%"
            @selection-change="handleSelectionChange"
            row-class-name="modern-table-row"
          >
            <el-table-column type="selection" width="40" fixed="left" />

            <!-- 1. 设备标识复合列 -->
            <el-table-column label="设备标识" min-width="220" fixed="left">
              <template #default="{ row }">
                <div class="composite-identity-cell">
                  <el-tag
                    :type="row.status === 1 ? 'success' : 'info'"
                    size="small"
                    round
                    class="status-pill-tag"
                  >
                    <span class="status-dot-pulse" :class="{ 'is-online': row.status === 1 }"></span>
                    {{ row.status === 1 ? '在线' : '离线' }}
                  </el-tag>
                  <div class="identity-text">
                    <el-link type="primary" :underline="false" class="hostname-link" @click="handleView(row)">
                      {{ row.hostname || '-' }}
                    </el-link>
                    <span class="ip-subtext">{{ row.IP || '-' }}</span>
                  </div>
                </div>
              </template>
            </el-table-column>

            <!-- 3. 系统环境复合列 -->
            <el-table-column label="系统环境" min-width="160" show-overflow-tooltip>
              <template #default="{ row }">
                <div class="os-env-cell">
                  <i :class="[getOsIcon(row.os_distro), 'os-brand-icon']"></i>
                  <div class="os-text-wrapper">
                    <span class="os-distro-name">{{ row.os_distro || '-' }}</span>
                    <span class="os-version-sub">{{ row.os_version || '-' }}</span>
                  </div>
                </div>
              </template>
            </el-table-column>

            <!-- 4. 重启建议 -->
            <el-table-column label="重启建议" width="110" align="left">
              <template #default="{ row }">
                <el-tag
                  v-if="row.needReboot == 1"
                  type="danger"
                  size="small"
                  effect="light"
                  class="reboot-tag"
                >
                  <i class="fa fa-exclamation-triangle" style="margin-right: 2px"></i> 待重启
                </el-tag>
                <el-tag
                  v-else-if="row.needReboot == 0"
                  type="info"
                  size="small"
                  effect="plain"
                  class="reboot-tag-none"
                >
                  无需重启
                </el-tag>
                <span v-else class="placeholder-dash">-</span>
              </template>
            </el-table-column>

            <!-- 5. 连通巡检复合列 -->
            <el-table-column label="连通巡检" min-width="190" align="left">
              <template #default="{ row }">
                <div class="health-cell">
                  <el-tag
                    :type="row.CONN_LATEST_STATUS === '1' ? 'success' : (row.CONN_LATEST_STATUS === '0' ? 'danger' : 'warning')"
                    size="small"
                    effect="light"
                    class="health-status-tag"
                  >
                    <i :class="row.CONN_LATEST_STATUS === '1' ? 'fa fa-check-circle' : (row.CONN_LATEST_STATUS === '0' ? 'fa fa-times-circle' : 'fa fa-question-circle')"></i>
                    <span style="margin-left: 4px">
                      {{ row.CONN_LATEST_STATUS === '1' ? '正常' : (row.CONN_LATEST_STATUS === '0' ? '失联' : '未知') }}
                    </span>
                  </el-tag>

                  <div class="conn-rate-progress">
                    <el-progress
                      :percentage="getProgressRate(row.CONN_RATE)"
                      :status="getProgressRate(row.CONN_RATE) >= 80 ? 'success' : (getProgressRate(row.CONN_RATE) >= 50 ? 'warning' : 'exception')"
                      :stroke-width="5"
                      :show-text="false"
                      style="width: 80px"
                    />
                  </div>

                  <!-- Hover 时显现的快捷诊断按钮 -->
                  <el-tooltip content="发起连通性诊断" placement="top" :enterable="false">
                    <el-button
                      type="primary"
                      link
                      size="small"
                      class="hover-diagnostic-btn"
                      :loading="checkingConnIds.includes(row.id)"
                      @click.stop="handleCheckSingleConn(row)"
                    >
                      <el-icon><Refresh /></el-icon>
                    </el-button>
                  </el-tooltip>
                </div>
              </template>
            </el-table-column>

            <!-- 6. 责任人 (使用彩色头像首字母) -->
            <el-table-column label="责任人" width="120" show-overflow-tooltip>
              <template #default="{ row }">
                <div class="owner-cell" v-if="row.负责人">
                  <el-avatar
                    :size="22"
                    :style="{ backgroundColor: getAvatarColor(row.负责人) }"
                    class="owner-avatar"
                  >
                    {{ getInitials(row.负责人) }}
                  </el-avatar>
                  <span class="owner-name">{{ row.负责人 }}</span>
                </div>
                <span v-else class="placeholder-dash">-</span>
              </template>
            </el-table-column>

            <!-- 7. 最后同步 -->
            <el-table-column label="最后同步" width="180">
              <template #default="{ row }">
                <span>{{ formatDateTime(row.updated_at) }}</span>
              </template>
            </el-table-column>

            <!-- 8. 操作 -->
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button text type="primary" size="small" @click="handleEditRow(row)">编辑</el-button>
                <el-button text type="primary" size="small" @click="handleHistory(row)">历史</el-button>
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
    </div>

    <!-- 所有弹窗和抽屉组件 -->
    <AssetDetailDialog v-model="detailDialogVisible" :asset-id="currentAssetId" />

    <AssetEditDialog
      v-model="editDialogVisible"
      :asset-id="currentAssetId"
      @saved="handleEditSaved"
    />

    <AssetHistoryDialog
      v-model="historyDialogVisible"
      :asset-id="currentAssetId"
      :asset-ip="currentAssetIp"
    />

    <AutoEntryDialog
      v-model="autoEntryDialogVisible"
      :asset-type="currentType"
      @saved="handleAutoEntrySaved"
    />

    <ImportAssetDialog v-model="importDialogVisible" :tenant-id="currentTenantId" @saved="handleAssetDataSaved" />

    <ExportAssetDialog v-model="exportDialogVisible" :default-ci-type="currentType" />

    <DeleteAssetImportDialog v-model="deleteImportDialogVisible" @saved="handleAssetDataSaved" />

    <BatchEditDialog
      v-model="batchEditDialogVisible"
      :ci-ids="selectedRows.map(row => row.id)"
      :asset-type="currentType"
      @saved="handleBatchEditSaved"
    />

    <AddTagDialog
      v-model="addTagDialogVisible"
      :ci-ids="selectedRows.map(row => row.id)"
      :asset-type="currentType"
      @saved="handleAddTagSaved"
    />

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
  RefreshRight,
  Clock
} from '@element-plus/icons-vue'
import { assetApi, dataManageApi } from '../api'
import { apiService } from '@/core/api'
import { pollJobStatus } from '@/composables/useJobPolling'
import AssetSidebar from '../components/asset-info/AssetSidebar.vue'
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

// 设备详情弹窗
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

// 设备类型列表
const assetTypes = ref([])
const currentType = ref('')

// 主机选择器数据
const groupTreeData = ref([])
const tagList = ref([])
const selectedGroup = ref('all')
const selectedGroupName = ref('全部设备')
const selectedTag = ref('')

// 树形组件配置
const treeProps = {
  label: 'name',
  children: 'children'
}

// 将路径数组转换为树形结构
const buildGroupTreeFromPaths = paths => {
  if (!paths || paths.length === 0) return []

  const root = { path: '/', name: '根分组', children: [] }
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

function createDefaultFilters() {
  return {
    hostKeys: '@@',
    status: 'all',
    connLatestStatus: 'all',
    osVersion: []
  }
}

// 筛选条件
const filters = ref(createDefaultFilters())

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

// 解决 ElProgress 异常连通率转换并进行类型安全防御
const getProgressRate = rate => {
  if (rate === null || rate === undefined || rate === '' || rate === 'null') {
    return 0
  }
  const parsed = parseInt(rate, 10)
  return isNaN(parsed) ? 0 : Math.max(0, Math.min(100, parsed))
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
    tagList.value = Array.isArray(res) ? res : []
  } catch (error) {
    console.error('加载标签列表失败:', error)
    tagList.value = []
  }
}

// 选择分组 (侧边栏触发)
const handleSelectGroup = (groupId, groupName = '全部设备') => {
  selectedGroup.value = groupId
  selectedGroupName.value = groupId === 'all' ? '全部设备' : groupName
  selectedTag.value = ''
  if (groupId === 'all') {
    filters.value.hostKeys = '@@'
  } else {
    filters.value.hostKeys = groupId
  }
  currentPage.value = 1
  loadAssetList()
}

// 选择标签 (侧边栏触发)
const handleSelectTag = tag => {
  selectedTag.value = tag.name
  selectedGroup.value = ''
  filters.value.hostKeys = `,#${tag.name}`
  currentPage.value = 1
  loadAssetList()
}

// 加载设备类型列表
const loadAssetTypes = async () => {
  try {
    const res = await assetApi.getAssetTypes()
    if (res.records && res.records.length > 0) {
      assetTypes.value = res.records
      const typeFromQuery = route.query.type
      if (typeFromQuery && res.records.some(r => r.code === typeFromQuery)) {
        currentType.value = typeFromQuery
      } else if (!currentType.value) {
        currentType.value = res.records[0].code
      }
    }
  } catch (error) {
    console.error('加载设备类型失败:', error)
    ElMessage.error('加载设备类型失败')
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

// 加载设备列表
const loadAssetList = async () => {
  if (!currentType.value) return
  loading.value = true
  try {
    const params = {
      hostKeys: filters.value.hostKeys,
      assetType: currentType.value,
      permission: 'r',
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
    console.error('加载设备列表失败:', error)
    ElMessage.error('加载设备列表失败')
  } finally {
    loading.value = false
  }
}

// 设备类型切换
const handleTypeChange = code => {
  currentType.value = code
}

// 监听类型变化
watch(currentType, () => {
  currentPage.value = 1
  selectedGroup.value = 'all'
  selectedGroupName.value = '全部设备'
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

// 搜索输入防抖
let searchDebounceTimer = null
watch(searchText, (newVal) => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  if (!newVal) {
    handleSearch()
  } else {
    searchDebounceTimer = setTimeout(() => {
      handleSearch()
    }, 300)
  }
})

// 重置
const handleReset = () => {
  filters.value = createDefaultFilters()
  searchText.value = ''
  selectedGroup.value = 'all'
  selectedGroupName.value = '全部设备'
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
    ElMessage.warning('请先选择要修改的设备')
    return
  }
  batchEditDialogVisible.value = true
}

const handleBatchEditSaved = () => {
  loadAssetList()
}

const handleAddTag = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要添加标签的设备')
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
    ElMessage.warning('请先选择要添加分组的设备')
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
    ElMessage.warning('请先选择要上线的设备')
    return
  }
  ElMessageBox.confirm('是否将选中的设备设置为在线状态？', '上线确认', {
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
    ElMessage.warning('请先选择要下线的设备')
    return
  }
  ElMessageBox.confirm('是否将选中的设备设置为下线状态？', '下线确认', {
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
    ElMessage.warning('请先选择要删除的设备')
    return
  }
  ElMessageBox.confirm('是否确认删除选中的设备？此操作不可恢复！', '删除确认', {
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
  loadAssetList()
}

// 获取 OS 对应的 FontAwesome 图标
const getOsIcon = (distro) => {
  if (!distro) return 'fa fa-linux'
  const d = distro.toLowerCase()
  if (d.includes('centos')) return 'fab fa-centos'
  if (d.includes('ubuntu')) return 'fab fa-ubuntu'
  if (d.includes('redhat') || d.includes('red hat')) return 'fab fa-redhat'
  if (d.includes('kylin') || d.includes('麒麟')) return 'fa fa-dragon'
  if (d.includes('oracle')) return 'fa fa-database'
  if (d.includes('windows')) return 'fab fa-windows'
  if (d.includes('debian')) return 'fab fa-debian'
  if (d.includes('suse')) return 'fab fa-suse'
  if (d.includes('fedora')) return 'fab fa-fedora'
  return 'fa fa-linux'
}

// 获取责任人彩色头像背景颜色
const getAvatarColor = (name) => {
  if (!name) return '#909399'
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#9b59b6', '#34495e', '#1abc9c']
  return colors[Math.abs(hash) % colors.length]
}

// 获取责任人首字母
const getInitials = (name) => {
  if (!name) return '?'
  return name.trim().charAt(0).toUpperCase()
}

// 初始化
onMounted(() => {
  if (route.query.ip) {
    searchText.value = route.query.ip
  }
  loadAssetTypes()
  loadCurrentTenantId()
})

// 监听路由参数变化进行联动搜索
watch(
  () => route.query,
  (query) => {
    if (query.ip) {
      searchText.value = query.ip
      loadAssetList()
    }
  }
)
</script>
<style scoped lang="scss">


// 批量操作栏
.selection-action-bar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-8);
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(64, 158, 255, 0.05);
  flex-shrink: 0;

  &__summary {
    color: var(--el-text-color-primary);
    font-size: 13px;
    display: flex;
    align-items: center;

    strong {
      color: var(--el-color-primary);
      font-weight: 600;
      margin: 0 4px;
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }
}

// Table cell visual styles
.composite-identity-cell {
  display: flex;
  align-items: center;
  gap: 10px;

  .status-pill-tag {
    height: 22px;
    padding: 0 8px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: none;
  }

  .status-dot-pulse {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--el-color-info);
    display: inline-block;

    &.is-online {
      background-color: var(--el-color-success);
      box-shadow: 0 0 6px var(--el-color-success-light-5);
    }
  }

  .identity-text {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    line-height: 1.4;

    .hostname-link {
      font-size: 13px;
      font-weight: 600;
      color: var(--el-color-primary);
    }

    .ip-subtext {
      font-size: 11px;
      color: var(--el-text-color-secondary);
    }
  }
}




.os-env-cell {
  display: flex;
  align-items: center;
  gap: 8px;

  .os-brand-icon {
    font-size: 16px;
    color: var(--el-text-color-regular);
    width: 16px;
    text-align: center;
  }

  .os-text-wrapper {
    display: flex;
    flex-direction: column;
    line-height: 1.3;

    .os-distro-name {
      font-size: 13px;
      font-weight: 500;
    }

    .os-version-sub {
      font-size: 11px;
      color: var(--el-text-color-secondary);
    }
  }
}

.reboot-tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-weight: 500;
}

.health-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  position: relative;

  .health-status-tag {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
  }

  .conn-rate-progress {
    flex-shrink: 0;

    :deep(.el-progress-bar__outer) {
      background-color: var(--el-border-color-lighter);
    }
  }

  .hover-diagnostic-btn {
    opacity: 0;
    transform: scale(0.9);
    transition: all 0.2s ease;
    margin-left: auto;

    &:hover {
      transform: scale(1.05);
    }
  }
}

// Trigger diagnostic button hover effect
:deep(.el-table__row:hover) {
  .hover-diagnostic-btn {
    opacity: 1;
    transform: scale(1);
  }
}

.owner-cell {
  display: flex;
  align-items: center;
  gap: 8px;

  .owner-avatar {
    font-size: 10px;
    font-weight: bold;
    color: #ffffff;
  }

  .owner-name {
    font-size: 13px;
  }
}



// Fade animation for selection bar
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}
.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
</style>
