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
              <el-select v-model="filters.status" style="width: 85px" @change="handleSearch">
                <el-option label="全部" value="all" />
                <el-option label="在线" value="1" />
                <el-option label="下线" value="0" />
              </el-select>
            </el-form-item>

            <el-form-item label="连接方式">
              <el-select v-model="filters.connectionType" style="width: 105px" @change="handleSearch">
                <el-option label="全部" value="all" />
                <el-option label="Agent" value="koreops_agent" />
                <el-option label="SSH" value="ssh" />
              </el-select>
            </el-form-item>

            <el-form-item label="Agent 状态">
              <el-select v-model="filters.agentStatus" style="width: 105px" @change="handleSearch">
                <el-option label="全部" value="all" />
                <el-option label="在线" value="online" />
                <el-option label="离线" value="offline" />
                <el-option label="未知" value="unknown" />
              </el-select>
            </el-form-item>

            <el-form-item label="最近连通">
              <el-select v-model="filters.connLatestStatus" style="width: 105px" @change="handleSearch">
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
                style="width: 130px" @change="handleSearch">
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
                placeholder="IP/主机名"
                clearable
                style="width: 240px"
                @keyup.enter="handleSearch"
                @clear="handleSearch"
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
            <el-button type="success" size="small" @click="agentEnrollmentVisible = true">
              <i class="fa fa-plug" style="margin-right: 4px"></i>
              Agent 接入
            </el-button>
            <el-button size="small" @click="importDialogVisible = true">
              <i class="fa fa-file-import" style="margin-right: 4px"></i>
              导入设备
            </el-button>

            <el-button type="danger" plain size="small" @click="deleteImportDialogVisible = true">
              <i class="fa fa-trash-alt" style="margin-right: 4px"></i>
              批量删除设备
            </el-button>
            <el-button size="small" @click="handleCustomView">
              <i class="fa fa-sliders-h" style="margin-right: 4px"></i>
              自定义视图配置
            </el-button>
            <el-button
              size="small"
              :type="allSelected ? 'default' : 'primary'"
              :loading="selectAllLoading"
              @click="handleToggleSelectAll"
            >
              <i
                :class="`fa fa-${allSelected ? 'times' : 'check-double'}`"
                style="margin-right: 4px"
              ></i>
              {{ allSelected ? '一键取消' : '一键全选' }}
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
              已选择
              <strong>{{ selectedCount }}</strong>
              台主机设备
            </div>
            <div class="selection-action-bar__actions">
              <el-button :icon="Edit" size="small" type="primary" plain @click="handleEdit">
                批量修改
              </el-button>

              <el-button size="small" @click="handleBatchLocation">
                <i class="fa fa-map-marker-alt" style="margin-right: 4px"></i>
                标记区域
              </el-button>
              <el-button size="small" @click="handleAddTag">
                <i class="fa fa-tag" style="margin-right: 4px"></i>
                添加标签
              </el-button>
              <el-button size="small" @click="handleAddGroup">
                <i class="fa fa-folder" style="margin-right: 4px"></i>
                添加分组
              </el-button>
              <el-button :icon="Top" size="small" type="success" plain @click="handleOnline">
                上线
              </el-button>
              <el-button :icon="Bottom" size="small" type="info" plain @click="handleOffline">
                下线
              </el-button>
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
            @select="handleTableSelect"
            @select-all="handleTableSelect"
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
                    <span
                      class="status-dot-pulse"
                      :class="{ 'is-online': row.status === 1 }"
                    ></span>
                    {{ row.status === 1 ? '在线' : '离线' }}
                  </el-tag>
                  <div class="identity-text">
                    <el-link
                      type="primary"
                      underline="never"
                      class="hostname-link"
                      @click="handleView(row)"
                    >
                      {{ row.hostname || '-' }}
                    </el-link>
                    <span class="ip-subtext">{{ row.IP || '-' }}</span>
                  </div>
                </div>
              </template>
            </el-table-column>

            <!-- Agent 接入通道与能力列 (F3) -->
            <el-table-column label="接入通道" min-width="130">
              <template #default="{ row }">
                <el-tag
                  size="small"
                  :type="getConnectionTypeTag(row)"
                >
                  {{ getConnectionTypeLabel(row) }}
                </el-tag>
                <div v-if="row.clientId || row.client_id" class="text-xs text-muted font-mono" :title="row.clientId || row.client_id">
                  {{ (row.clientId || row.client_id).length > 10 ? (row.clientId || row.client_id).slice(0, 10) + '...' : (row.clientId || row.client_id) }}
                </div>
              </template>
            </el-table-column>

            <el-table-column label="Agent 状态与能力" min-width="160">
              <template #default="{ row }">
                <template v-if="['koreops_agent', 'agent', 'oplus_agent'].includes(row.connectionType || row.connection_type)">
                  <el-tag
                    size="small"
                    :type="getAgentStatusTag(row)"
                  >
                    {{ getAgentStatusLabel(row) }}
                  </el-tag>
                  <span v-if="row.agentVersion" class="text-xs text-muted ms-1">v{{ row.agentVersion }}</span>
                  <div v-if="row.capabilities" class="text-xs text-secondary mt-1">
                    {{ Array.isArray(row.capabilities) ? row.capabilities.join(',') : row.capabilities }}
                  </div>
                  <div v-if="row.lastSeenAt" class="text-xs text-muted mt-1">
                    最后在线：{{ formatDateTime(row.lastSeenAt) }}
                  </div>
                </template>
                <span v-else class="text-muted">-</span>
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
                  <i class="fa fa-exclamation-triangle" style="margin-right: 2px"></i>
                  待重启
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

            <!-- 动态展示列 (R3) -->
            <template v-for="col in activeColumns" :key="col">
              <!-- 系统环境 -->
              <el-table-column
                v-if="col === 'OS'"
                label="系统环境"
                min-width="160"
                show-overflow-tooltip
              >
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

              <!-- 网络区域 -->
              <el-table-column
                v-else-if="col === 'LOCATION'"
                label="网络区域"
                min-width="140"
                show-overflow-tooltip
              >
                <template #default="{ row }">
                  <el-tag v-if="row.location" size="small" effect="plain" type="info">
                    {{ row.location }}
                  </el-tag>
                  <span v-else class="text-muted">-</span>
                </template>
              </el-table-column>

              <!-- 运行环境 -->
              <el-table-column v-else-if="col === 'RUN_ENVIRONMENT'" label="运行环境" width="120">
                <template #default="{ row }">
                  <span>{{ row.location || '-' }}</span>
                </template>
              </el-table-column>

              <!-- 连通巡检 -->
              <el-table-column
                v-else-if="col === 'CONN_LATEST_STATUS'"
                label="连通巡检"
                min-width="190"
                align="left"
              >
                <template #default="{ row }">
                  <div class="health-cell">
                    <el-tooltip content="点击发起连通性诊断" placement="top" :enterable="false">
                      <el-tag
                        :type="
                          row.CONN_LATEST_STATUS === '1'
                            ? 'success'
                            : row.CONN_LATEST_STATUS === '0'
                              ? 'danger'
                              : 'warning'
                        "
                        size="small"
                        effect="light"
                        class="health-status-tag clickable-tag"
                        :class="{ 'is-loading': checkingConnIds.includes(row.id) }"
                        @click.stop="
                          !checkingConnIds.includes(row.id) && handleCheckSingleConn(row)
                        "
                      >
                        <i
                          v-if="checkingConnIds.includes(row.id)"
                          class="fa fa-spinner fa-spin"
                        ></i>
                        <i
                          v-else
                          :class="
                            row.CONN_LATEST_STATUS === '1'
                              ? 'fa fa-check-circle'
                              : row.CONN_LATEST_STATUS === '0'
                                ? 'fa fa-times-circle'
                                : 'fa fa-question-circle'
                          "
                        ></i>
                        <span style="margin-left: 4px">
                          {{
                            checkingConnIds.includes(row.id)
                              ? '诊断中...'
                              : row.CONN_LATEST_STATUS === '1'
                                ? '正常'
                                : row.CONN_LATEST_STATUS === '0'
                                  ? '失联'
                                  : '未知'
                          }}
                        </span>
                      </el-tag>
                    </el-tooltip>

                    <div class="conn-rate-progress">
                      <el-progress
                        :percentage="getProgressRate(row.CONN_RATE)"
                        :status="
                          getProgressRate(row.CONN_RATE) >= 80
                            ? 'success'
                            : getProgressRate(row.CONN_RATE) >= 50
                              ? 'warning'
                              : 'exception'
                        "
                        :stroke-width="5"
                        :show-text="false"
                        style="width: 80px"
                      />
                    </div>
                  </div>
                </template>
              </el-table-column>

              <!-- 处置团队 (DEPT_NAME) -->
              <el-table-column
                v-else-if="col === 'DEPT_NAME'"
                label="处置团队"
                width="130"
                show-overflow-tooltip
              >
                <template #default="{ row }">
                  <span>{{ row.dept_name || row.DEPT_NAME || '-' }}</span>
                </template>
              </el-table-column>

              <!-- 应用系统 (APPLICATION_SYSTEM) -->
              <el-table-column
                v-else-if="col === 'APPLICATION_SYSTEM'"
                label="应用系统"
                width="140"
                show-overflow-tooltip
              >
                <template #default="{ row }">
                  <span>{{ row.application_system || row.APPLICATION_SYSTEM || '-' }}</span>
                </template>
              </el-table-column>

              <!-- 主机风险等级 (HOST_RISK_LEVEL) -->
              <el-table-column
                v-else-if="col === 'HOST_RISK_LEVEL'"
                label="主机风险等级"
                width="130"
              >
                <template #default="{ row }">
                  <span>{{ row.host_risk_level || row.HOST_RISK_LEVEL || '-' }}</span>
                </template>
              </el-table-column>



              <!-- 责任人 (负责人 / OWNER) -->
              <el-table-column
                v-else-if="col === 'OWNER'"
                label="责任人"
                width="120"
                show-overflow-tooltip
              >
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

              <!-- 纳管IP -->
              <el-table-column v-else-if="col === 'IP'" label="纳管IP" width="130">
                <template #default="{ row }">
                  <span>{{ row.IP || '-' }}</span>
                </template>
              </el-table-column>

              <!-- 主机名 -->
              <el-table-column
                v-else-if="col === 'HOSTNAME'"
                label="主机名"
                width="150"
                show-overflow-tooltip
              >
                <template #default="{ row }">
                  <span>{{ row.hostname || row.HOSTNAME || '-' }}</span>
                </template>
              </el-table-column>

              <!-- 最后同步 -->
              <el-table-column v-else-if="col === 'updated_at'" label="最后同步" width="180">
                <template #default="{ row }">
                  <span>{{ formatDateTime(row.updated_at) }}</span>
                </template>
              </el-table-column>
            </template>

            <!-- 8. 操作 -->
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
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
            @current-change="handlePageChange"
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

    <ImportAssetDialog
      v-model="importDialogVisible"
      :tenant-id="currentTenantId"
      @saved="handleAssetDataSaved"
    />


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

    <!-- 自定义视图配置弹窗 -->
    <CustomViewDialog v-model="customViewVisible" @success="loadTableColumnsConfig" />

    <!-- 批量标记区域弹窗 -->
    <BatchLocationDialog
      v-model="batchLocationVisible"
      :hosts="selectedRows"
      @success="loadAssetList"
    />

    <!-- Agent 接入向导弹窗 -->
    <AgentEnrollmentDialog v-model="agentEnrollmentVisible" @success="handleAgentEnrollmentSuccess" />

  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import AgentEnrollmentDialog from '../components/asset-info/AgentEnrollmentDialog.vue'
import {
  Edit,
  Delete,
  Top,
  Bottom,
  Refresh,
  Search,
  RefreshRight,
  Clock as _Clock
} from '@element-plus/icons-vue'
import { assetApi, dataManageApi, agentApi } from '../api'
import { apiService } from '@/core/api'
import { pollJobStatus } from '@/composables/useJobPolling'
import AssetSidebar from '../components/asset-info/AssetSidebar.vue'
import AssetDetailDialog from '../components/asset-info/AssetDetailDialog.vue'
import AssetEditDialog from '../components/asset-info/AssetEditDialog.vue'
import AssetHistoryDialog from '../components/asset-info/AssetHistoryDialog.vue'
import AutoEntryDialog from '../components/asset-info/AutoEntryDialog.vue'
import ImportAssetDialog from '../components/asset-info/ImportAssetDialog.vue'
import DeleteAssetImportDialog from '../components/asset-info/DeleteAssetImportDialog.vue'
import BatchEditDialog from '../components/asset-info/BatchEditDialog.vue'
import AddTagDialog from '../components/asset-info/AddTagDialog.vue'
import AddGroupDialog from '../components/asset-info/AddGroupDialog.vue'
import CustomViewDialog from '@/modules/patches/components/host-detail/dialogs/CustomViewDialog.vue'
import BatchLocationDialog from '@/modules/patches/components/host-detail/dialogs/BatchLocationDialog.vue'

import { viewConfigApi } from '@/modules/patches/api'
import { formatDateTime } from '../utils/helpers'

// 路由
const route = useRoute()

// 设备详情弹窗
const detailDialogVisible = ref(false)
const editDialogVisible = ref(false)
const historyDialogVisible = ref(false)
const autoEntryDialogVisible = ref(false)
const importDialogVisible = ref(false)
const deleteImportDialogVisible = ref(false)
const batchEditDialogVisible = ref(false)
const addTagDialogVisible = ref(false)
const addGroupDialogVisible = ref(false)
const currentAssetId = ref('')
const currentAssetIp = ref('')
const currentTenantId = ref('')

// 自定义列及视图配置 (R3)
const customViewVisible = ref(false)
const batchLocationVisible = ref(false)
const agentEnrollmentVisible = ref(false)

const activeColumns = ref(['OS', 'LOCATION', 'RUN_ENVIRONMENT', 'CONN_LATEST_STATUS', 'DEPT_NAME'])

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
const _treeProps = {
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
      currentPath = `${currentPath}/${segment}`
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
    connectionType: 'all',
    agentStatus: 'all',
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
const allSelected = ref(false)
const excludedRowIds = ref([])
const selectAllLoading = ref(false)

// 分页
const pageSize = ref(10)
const currentPage = ref(1)
const total = ref(0)
const checkingConnIds = ref([])

// 计算属性
const selectedCount = computed(() => {
  if (!allSelected.value) {
    return selectedRows.value.length
  }

  return Math.max(total.value - excludedRowIds.value.length, 0)
})
const hasSelection = computed(() => selectedCount.value > 0)

const getAssetRowId = row => row?.id || row?.host_id || row?.hostId || null

const normalizeAssetRecord = item => {
  const locationNames = ['互联网', '外联网', '内网环境、孤岛环境']
  const tags = item.tags || item.Tags || []
  const matchedTag = tags.find(tag => locationNames.includes(tag.name || tag))

  const rawLocation = item.location || item.LOCATION || item.Location
  let locationVal = ''
  if (rawLocation) {
    locationVal =
      typeof rawLocation === 'object'
        ? rawLocation.name || rawLocation.title || rawLocation.value || ''
        : rawLocation
  }
  if (!locationVal && matchedTag) {
    locationVal = matchedTag.name || matchedTag
  }

  return {
    ...item,
    location: locationVal || null
  }
}

const isAgentConnection = connectionType => ['koreops_agent', 'agent', 'oplus_agent'].includes(connectionType)

const getConnectionType = record => {
  const connectionType = record.connectionType || record.connection_type
  if (isAgentConnection(connectionType)) return 'koreops_agent'
  if (connectionType === 'ssh') return 'ssh'
  return 'unknown'
}

const getConnectionTypeLabel = record => {
  const connectionType = getConnectionType(record)
  if (connectionType === 'koreops_agent') return 'Agent'
  if (connectionType === 'ssh') return 'SSH'
  return '未知'
}

const getConnectionTypeTag = record => {
  const connectionType = getConnectionType(record)
  if (connectionType === 'koreops_agent') return 'success'
  if (connectionType === 'ssh') return 'info'
  return 'warning'
}

const getAgentStatus = record => record.agentStatus || record.agent_status || 'unknown'
const getAgentStatusLabel = record => ({ online: '在线', offline: '离线', unknown: '未知' })[getAgentStatus(record)] || '未知'
const getAgentStatusTag = record => ({ online: 'success', offline: 'danger', unknown: 'warning' })[getAgentStatus(record)] || 'warning'

const hasAgentLocalFilter = () =>
  filters.value.connectionType !== 'all' || filters.value.agentStatus !== 'all'

const matchesAgentFilters = record => {
  const connectionType = getConnectionType(record)
  if (filters.value.connectionType !== 'all' && connectionType !== filters.value.connectionType) {
    return false
  }
  if (filters.value.agentStatus === 'all') return true
  return connectionType === 'koreops_agent' && getAgentStatus(record) === filters.value.agentStatus
}

const enrichAssetAgentInfo = async records => {
  const hostIds = records
    .map(r => r.id || r.host_id || r.hostId)
    .filter(Boolean)
  if (hostIds.length === 0) return records

  const agentInfoArr = []
  // host-info 使用 GET query；分批避免大量资产导致 URL 过长。
  for (let index = 0; index < hostIds.length; index += 100) {
    const agentInfoList = await agentApi.getHostAgentInfo(hostIds.slice(index, index + 100))
    if (Array.isArray(agentInfoList)) agentInfoArr.push(...agentInfoList)
  }
  const agentMap = new Map()
  agentInfoArr.forEach(info => {
    if (info?.hostId) agentMap.set(String(info.hostId), info)
  })

  records.forEach(record => {
    const hid = String(record.id || record.host_id || record.hostId || '')
    const agentInfo = agentMap.get(hid)
    if (!agentInfo) {
      record.connectionType = 'unknown'
      record.agentStatus = 'unknown'
      record.agentInfoUnavailable = true
      return
    }
    record.connectionType = agentInfo.connectionType || record.connectionType
    record.agentStatus = agentInfo.agentStatus ?? record.agentStatus
    record.capabilities = agentInfo.capabilities ?? record.capabilities
    record.clientId = agentInfo.agentClientId || agentInfo.clientId || record.clientId
    record.agentVersion = agentInfo.agentVersion || record.agentVersion
    record.lastSeenAt = agentInfo.lastSeenAt || record.lastSeenAt
    record.agentMode = agentInfo.agentMode || record.agentMode
    record.agentInfoUnavailable = false
  })

  return records
}

const buildAssetListParams = () => ({
  hostKeys: filters.value.hostKeys,
  assetType: currentType.value,
  permission: 'r',
  status: filters.value.status,
  CONN_LATEST_STATUS:
    filters.value.connLatestStatus === 'all' ? '' : filters.value.connLatestStatus,
  system_name: ' ',
  os_version: filters.value.osVersion.length > 0 ? filters.value.osVersion.join(',') : ' '
})

const resetSelectionState = () => {
  allSelected.value = false
  excludedRowIds.value = []
  selectedRows.value = []
  tableRef.value?.clearSelection()
}

const restorePageSelection = () => {
  if (!tableRef.value) return

  tableRef.value.clearSelection()
  if (allSelected.value) {
    tableData.value.forEach(row => {
      if (!excludedRowIds.value.includes(getAssetRowId(row))) {
        tableRef.value.toggleRowSelection(row, true)
      }
    })
    return
  }

  const selectedIds = new Set(selectedRows.value.map(getAssetRowId).filter(Boolean))
  if (selectedIds.size === 0) return

  tableData.value.forEach(row => {
    if (selectedIds.has(getAssetRowId(row))) {
      tableRef.value.toggleRowSelection(row, true)
    }
  })
}

const fetchAllMatchedAssets = async () => {
  const requestParams = buildAssetListParams()
  const batchSize = Math.max(pageSize.value, 200)
  let page = 1
  // total.value 在 Agent 本地筛选时是筛选后的数量，不能用于原始资产列表分页。
  let totalCount = 0
  const allRows = []

  while (true) {
    const response = await assetApi.getAssetList(requestParams, {
      size: batchSize,
      page,
      filter: searchText.value
    })
    const pageRows = Array.isArray(response.records)
      ? response.records.map(normalizeAssetRecord)
      : []

    allRows.push(...pageRows)

    if (!totalCount) {
      totalCount = Number(response.total || 0)
    }

    if (pageRows.length === 0 || pageRows.length < batchSize || allRows.length >= totalCount) {
      break
    }

    page += 1
  }

  if (!hasAgentLocalFilter()) return allRows
  await enrichAssetAgentInfo(allRows)
  return allRows.filter(matchesAgentFilters)
}

const handleTableSelect = selection => {
  if (!allSelected.value) {
    selectedRows.value = selection
    return
  }

  const currentPageIds = tableData.value.map(getAssetRowId).filter(Boolean)
  const currentSelectedIds = new Set(selection.map(getAssetRowId).filter(Boolean))
  const nextExcludedIds = new Set(excludedRowIds.value)

  currentPageIds.forEach(id => {
    nextExcludedIds.delete(id)
  })

  currentPageIds.forEach(id => {
    if (!currentSelectedIds.has(id)) {
      nextExcludedIds.add(id)
    }
  })

  excludedRowIds.value = Array.from(nextExcludedIds)
  selectedRows.value = selection

  if (total.value > 0 && excludedRowIds.value.length >= total.value) {
    resetSelectionState()
  }
}

const handleToggleSelectAll = async () => {
  if (allSelected.value) {
    resetSelectionState()
    return
  }

  if (total.value === 0) {
    return
  }

  allSelected.value = true
  excludedRowIds.value = []
  selectedRows.value = [...tableData.value]
  await nextTick()
  restorePageSelection()
}

const resolveSelectedRowsForAction = async warningMessage => {
  if (!allSelected.value && selectedRows.value.length === 0) {
    ElMessage.warning(warningMessage)
    return null
  }

  if (!allSelected.value) {
    return [...selectedRows.value]
  }

  selectAllLoading.value = true
  try {
    const excludedIdSet = new Set(excludedRowIds.value)
    const allRows = await fetchAllMatchedAssets()
    const finalRows = allRows.filter(row => !excludedIdSet.has(getAssetRowId(row)))
    selectedRows.value = finalRows
    return finalRows
  } catch (error) {
    console.error('加载全量设备选择失败:', error)
    ElMessage.error('加载全量设备失败，请稍后重试')
    return null
  } finally {
    selectAllLoading.value = false
  }
}

// 获取连通率样式
const _getConnRateClass = rate => {
  if (!rate) return 'text-secondary'
  if (rate >= 50) return 'text-primary'
  return 'text-warning'
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
const loadAssetList = async ({ preserveSelection = false } = {}) => {
  if (!currentType.value) return
  if (!preserveSelection) {
    resetSelectionState()
  }
  loading.value = true
  try {
    let normalizedRecords
    if (hasAgentLocalFilter()) {
      // 原资产列表接口不认识 connectionType，必须先富化后在前端筛选，再自行分页。
      const matchedRecords = await fetchAllMatchedAssets()
      total.value = matchedRecords.length
      const start = (currentPage.value - 1) * pageSize.value
      normalizedRecords = matchedRecords.slice(start, start + pageSize.value)
    } else {
      const params = buildAssetListParams()
      const res = await assetApi.getAssetList(params, {
        size: pageSize.value,
        page: currentPage.value,
        filter: searchText.value
      })
      normalizedRecords = (res.records || []).map(normalizeAssetRecord)
      try {
        await enrichAssetAgentInfo(normalizedRecords)
      } catch (agentErr) {
        // Agent 富化不可用时保留原有资产列表，避免影响 SSH 主机管理。
        console.warn('获取主机 Agent 附加信息失败（不影响主列表）:', agentErr)
        normalizedRecords.forEach(record => {
          record.connectionType = 'unknown'
          record.agentStatus = 'unknown'
          record.agentInfoUnavailable = true
        })
      }
      total.value = res.total || 0
    }

    tableData.value = normalizedRecords
    if (preserveSelection && allSelected.value) {
      await nextTick()
      restorePageSelection()
    }
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

const handleAgentEnrollmentSuccess = async boundHostId => {
  await loadAssetList()
  if (boundHostId) {
    currentAssetId.value = String(boundHostId)
    detailDialogVisible.value = true
  }
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
  loadAssetList({ preserveSelection: allSelected.value })
}

const handlePageChange = page => {
  currentPage.value = page
  loadAssetList({ preserveSelection: allSelected.value })
}

const handleEdit = async () => {
  const rows = await resolveSelectedRowsForAction('请先选择要修改的设备')
  if (!rows?.length) return
  batchEditDialogVisible.value = true
}

const handleBatchEditSaved = () => {
  loadAssetList()
}

const handleAddTag = async () => {
  const rows = await resolveSelectedRowsForAction('请先选择要添加标签的设备')
  if (!rows?.length) return
  addTagDialogVisible.value = true
}

const handleAddTagSaved = () => {
  loadAssetList()
  loadTagList()
}

const handleAddGroup = async () => {
  const rows = await resolveSelectedRowsForAction('请先选择要添加分组的设备')
  if (!rows?.length) return
  addGroupDialogVisible.value = true
}

const handleAddGroupSaved = () => {
  loadAssetList()
  loadGroupTree()
}

const handleOnline = async () => {
  const rows = await resolveSelectedRowsForAction('请先选择要上线的设备')
  if (!rows?.length) return
  ElMessageBox.confirm('是否将选中的设备设置为在线状态？', '上线确认', {
    type: 'warning'
  })
    .then(async () => {
      try {
        const ids = rows.map(row => row.id).join(',')
        await apiService.post(`/workflow/api/workflow/jobs/QqUnBG/run?cacheBuster=${Date.now()}`, {
          params: {
            status: 1,
            id: ids
          }
        })
        ElMessage.success('上线成功')
        loadAssetList()
      } catch (error) {
        console.error('上线失败:', error)
        ElMessage.error(`上线失败: ${error.response?.data?.message || error.message}`)
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

const handleCheckSingleConn = async row => {
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
      `/workflow/api/workflow/jobs/M1x855/run?cacheBuster=${cacheBuster}`,
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

const handleOffline = async () => {
  const rows = await resolveSelectedRowsForAction('请先选择要下线的设备')
  if (!rows?.length) return
  ElMessageBox.confirm('是否将选中的设备设置为下线状态？', '下线确认', {
    type: 'warning'
  })
    .then(async () => {
      try {
        const ids = rows.map(row => row.id).join(',')
        await apiService.post(`/workflow/api/workflow/jobs/QqUnBG/run?cacheBuster=${Date.now()}`, {
          params: {
            status: 0,
            id: ids
          }
        })
        ElMessage.success('下线成功')
        loadAssetList()
      } catch (error) {
        console.error('下线失败:', error)
        ElMessage.error(`下线失败: ${error.response?.data?.message || error.message}`)
      }
    })
    .catch(() => {})
}

const handleDelete = async () => {
  const rows = await resolveSelectedRowsForAction('请先选择要删除的设备')
  if (!rows?.length) return
  ElMessageBox.confirm('是否确认删除选中的设备？此操作不可恢复！', '删除确认', {
    type: 'warning'
  })
    .then(async () => {
      try {
        const ids = rows.map(row => row.id).join(',')
        await apiService.post(`/workflow/api/workflow/jobs/CdPKGF/run?cacheBuster=${Date.now()}`, {
          params: {
            id: ids
          }
        })
        ElMessage.success('删除成功')
        loadAssetList()
      } catch (error) {
        console.error('删除失败:', error)
        ElMessage.error(`删除失败: ${error.response?.data?.message || error.message}`)
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
const getOsIcon = distro => {
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
const getAvatarColor = name => {
  if (!name) return '#909399'
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#9b59b6', '#34495e', '#1abc9c']
  return colors[Math.abs(hash) % colors.length]
}

// 获取责任人首字母
const getInitials = name => {
  if (!name) return '?'
  return name.trim().charAt(0).toUpperCase()
}

// 自定义列视图配置
async function loadTableColumnsConfig() {
  try {
    const res = await viewConfigApi.getViewConfig({ ciType: 'host', scope: 'user' })
    const data = res?.data || res
    if (data && data.viewJson) {
      let config = {}
      if (typeof data.viewJson === 'string') {
        try {
          config = JSON.parse(data.viewJson)
        } catch {
          config = {}
        }
      } else {
        config = data.viewJson
      }
      if (config.listColumns && config.listColumns.length > 0) {
        activeColumns.value = config.listColumns
      }
    }
  } catch (error) {
    console.error('加载自定义列配置失败:', error)
  }
}

function handleCustomView() {
  customViewVisible.value = true
}

async function handleBatchLocation() {
  const rows = await resolveSelectedRowsForAction('请先选择要配置区域的设备')
  if (!rows?.length) return
  batchLocationVisible.value = true
}



// 初始化
onMounted(() => {
  if (route.query.ip) {
    searchText.value = route.query.ip
  }
  loadAssetTypes()
  loadCurrentTenantId()
  loadTableColumnsConfig()
})

// 监听路由参数变化进行联动搜索
watch(
  () => route.query,
  query => {
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
  gap: 4px;
  width: 100%;
  position: relative;

  .health-status-tag {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;

    &.clickable-tag {
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover:not(.is-loading) {
        filter: brightness(0.95);
        transform: translateY(-1px);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
      }

      &.is-loading {
        cursor: not-allowed;
        pointer-events: none;
      }
    }
  }

  .conn-rate-progress {
    flex-shrink: 0;

    :deep(.el-progress-bar__outer) {
      background-color: var(--el-border-color-lighter);
    }
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
