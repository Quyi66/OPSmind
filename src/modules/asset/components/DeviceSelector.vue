<template>
  <div class="device-selector">
    <!-- 已选设备显示 -->
    <div v-if="selectedHosts.length > 0" class="selected-devices">
      <div class="selected-header">
        <el-button
          type="default"
          size="small"
          class="select-btn"
          @click="openSelectDialog"
        >
          <span>共选择 <strong class="text-primary">{{ selectedHosts.length }}</strong> 项</span>
        </el-button>
        <el-input
          v-model="filterText"
          placeholder="搜索"
          clearable
          size="small"
          style="width: 150px"
          :prefix-icon="Search"
        />
      </div>
      <ul class="host-list">
        <li v-for="(host, index) in filteredHosts" :key="index" class="host-item">
          <span class="host-badge">
            {{ host.value || host.key || host }}
            <a class="remove-btn" @click="removeHost(index)">×</a>
          </span>
        </li>
      </ul>
    </div>

    <!-- 空状态 - 点击选择 -->
    <div v-else class="empty-state">
      <el-button type="default" @click="openSelectDialog">
        <i class="fa fa-server" style="margin-right: 4px"></i>
        目 选择
      </el-button>
    </div>

    <!-- 设备选择对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="选择设备"
      width="800px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <div class="selector-dialog-content">
        <!-- 资产类型选择 -->
        <div v-if="assetTypeOptions.length > 1" class="asset-type-select">
          <el-select v-model="currentAssetType" style="width: 150px">
            <el-option
              v-for="item in assetTypeOptions"
              :key="item.value"
              :label="item.title"
              :value="item.value"
            />
          </el-select>
        </div>

        <!-- 已选主机显示区 -->
        <div class="selected-panel">
          <div class="panel-header">
            <i class="fa fa-briefcase-medical text-muted"></i>
            <span>已选主机</span>
            <span class="badge" @click="showSelectedList = !showSelectedList">
              {{ tempSelected.length }}
            </span>
          </div>
          <div v-if="tempSelected.length > 0 && showSelectedList" class="panel-body">
            <ul class="temp-host-list">
              <li v-for="(host, index) in tempSelected" :key="index" class="temp-host-item">
                <span class="host-badge">
                  {{ host.value || host.key || host }}
                  <a class="remove-btn" @click="removeTempHost(index)">×</a>
                </span>
              </li>
            </ul>
          </div>
        </div>

        <!-- 选择模式 Tab -->
        <el-tabs v-model="selectMode" class="mode-tabs">
          <el-tab-pane name="host" label="主机">
            <template #label>
              <span><i class="fa fa-server"></i> 主机</span>
            </template>
          </el-tab-pane>
          <el-tab-pane name="group" label="分组">
            <template #label>
              <span><i class="fa fa-folder"></i> 分组</span>
            </template>
          </el-tab-pane>
        </el-tabs>

        <!-- 主机列表 -->
        <div v-show="selectMode === 'host'" class="host-select-panel">
          <div class="search-bar">
            <el-input
              v-model="hostSearch"
              placeholder="搜索主机..."
              clearable
              :prefix-icon="Search"
              @input="handleSearchHost"
            />
          </div>
          <div class="host-table-wrapper">
            <el-table
              ref="hostTableRef"
              :data="hostList"
              v-loading="loadingHosts"
              height="300"
              @selection-change="handleHostSelectionChange"
            >
              <el-table-column type="selection" width="50" />
              <el-table-column prop="value" label="主机" />
              <el-table-column prop="ci_type" label="类型" width="100" />
            </el-table>
          </div>
          <div class="ops-pagination-wrapper">
            <el-pagination
              v-model:current-page="hostPage"
              v-model:page-size="hostPageSize"
              :page-sizes="[10, 50, 100]"
              :total="hostTotal"
              layout="total, sizes, prev, pager, next, jumper"
              background
              @size-change="loadHostList"
              @current-change="loadHostList"
            />
          </div>
        </div>

        <!-- 分组列表 -->
        <div v-show="selectMode === 'group'" class="group-select-panel">
          <div class="search-bar">
            <el-input
              v-model="groupSearch"
              placeholder="搜索分组..."
              clearable
              :prefix-icon="Search"
            />
          </div>
          <div class="group-list-wrapper" v-loading="loadingGroups">
            <el-checkbox-group v-model="selectedGroupIds" @change="handleGroupChange">
              <div
                v-for="group in filteredGroups"
                :key="group.id"
                class="group-item"
              >
                <el-checkbox :label="group.id">
                  {{ group.path }} ({{ group.total_hosts || 0 }})
                </el-checkbox>
              </div>
            </el-checkbox-group>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmSelect">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { dtsApi } from '../api'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  assetTypes: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue'])

// 已选主机
const selectedHosts = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 过滤文本
const filterText = ref('')

// 过滤后的已选主机
const filteredHosts = computed(() => {
  if (!filterText.value) return selectedHosts.value
  const keyword = filterText.value.toLowerCase()
  return selectedHosts.value.filter(host => {
    const val = host.value || host.key || host
    return val.toLowerCase().includes(keyword)
  })
})

// 弹窗状态
const dialogVisible = ref(false)
const showSelectedList = ref(true)

// 选择模式
const selectMode = ref('host')

// 资产类型
const assetTypeOptions = computed(() => props.assetTypes)
const currentAssetType = ref('')

// 临时选中
const tempSelected = ref([])

// 主机列表
const loadingHosts = ref(false)
const hostList = ref([])
const hostSearch = ref('')
const hostPage = ref(1)
const hostPageSize = ref(50)
const hostTotal = ref(0)
const hostTableRef = ref(null)

// 分组列表
const loadingGroups = ref(false)
const groupList = ref([])
const groupSearch = ref('')
const selectedGroupIds = ref([])

// 过滤后的分组
const filteredGroups = computed(() => {
  if (!groupSearch.value) return groupList.value
  const keyword = groupSearch.value.toLowerCase()
  return groupList.value.filter(g => g.path?.toLowerCase().includes(keyword))
})

// 打开选择对话框
async function openSelectDialog() {
  dialogVisible.value = true
  tempSelected.value = [...selectedHosts.value]

  // 设置默认资产类型
  if (assetTypeOptions.value.length > 0 && !currentAssetType.value) {
    currentAssetType.value = assetTypeOptions.value[0].value
  }

  // 加载数据
  await loadHostList()
  await loadGroupList()
}

// 加载主机列表
async function loadHostList() {
  loadingHosts.value = true
  try {
    const response = await dtsApi.queryData('ACM_CI_BY_CIT', {
      ciType: currentAssetType.value || 'linux',
      param: ''
    }, {
      size: hostPageSize.value,
      page: hostPage.value,
      filter: hostSearch.value
    })

    hostList.value = (response?.records || []).map(item => ({
      key: item.cid,
      value: item.hostKey || item.ip || item.cid,
      ci_type: item.ci_type,
      ...item
    }))
    hostTotal.value = response?.total || 0

    // 恢复选中状态
    restoreHostSelection()
  } catch (error) {
    console.error('加载主机列表失败:', error)
  } finally {
    loadingHosts.value = false
  }
}

// 恢复主机选中状态
function restoreHostSelection() {
  if (!hostTableRef.value) return

  hostList.value.forEach(row => {
    const isSelected = tempSelected.value.some(s =>
      (s.key === row.key) || (s.value === row.value) || (s === row.key)
    )
    if (isSelected) {
      hostTableRef.value.toggleRowSelection(row, true)
    }
  })
}

// 加载分组列表
async function loadGroupList() {
  loadingGroups.value = true
  try {
    const response = await dtsApi.queryData('ACM_GET_GROUP_BY_CIT', {
      ciType: currentAssetType.value || 'linux'
    })
    groupList.value = response?.records || []
  } catch (error) {
    console.error('加载分组列表失败:', error)
  } finally {
    loadingGroups.value = false
  }
}

// 处理主机搜索
let searchTimer = null
function handleSearchHost() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    hostPage.value = 1
    loadHostList()
  }, 300)
}

// 处理主机选择变化
function handleHostSelectionChange(selection) {
  // 移除当前页未选中的
  const currentPageKeys = hostList.value.map(h => h.key)
  tempSelected.value = tempSelected.value.filter(s => {
    const key = s.key || s
    return !currentPageKeys.includes(key)
  })

  // 添加选中的
  selection.forEach(row => {
    if (!tempSelected.value.some(s => (s.key === row.key) || (s === row.key))) {
      tempSelected.value.push(row)
    }
  })
}

// 处理分组选择变化
async function handleGroupChange(groupIds) {
  // 加载分组下的主机
  for (const groupId of groupIds) {
    const group = groupList.value.find(g => g.id === groupId)
    if (group && !tempSelected.value.some(s => s.groupId === groupId)) {
      // 添加分组标记
      tempSelected.value.push({
        key: groupId,
        value: group.path,
        runType: 'group',
        total_hosts: group.total_hosts,
        groupId
      })
    }
  }

  // 移除取消选择的分组
  tempSelected.value = tempSelected.value.filter(s => {
    if (s.runType === 'group') {
      return groupIds.includes(s.groupId)
    }
    return true
  })
}

// 移除临时选中
function removeTempHost(index) {
  const removed = tempSelected.value[index]
  tempSelected.value.splice(index, 1)

  // 如果是分组，更新分组选中状态
  if (removed.groupId) {
    selectedGroupIds.value = selectedGroupIds.value.filter(id => id !== removed.groupId)
  }

  // 如果是主机，更新表格选中状态
  if (hostTableRef.value && removed.key) {
    const row = hostList.value.find(h => h.key === removed.key)
    if (row) {
      hostTableRef.value.toggleRowSelection(row, false)
    }
  }
}

// 移除已选主机
function removeHost(index) {
  const hosts = [...selectedHosts.value]
  hosts.splice(index, 1)
  selectedHosts.value = hosts
}

// 确认选择
function confirmSelect() {
  selectedHosts.value = [...tempSelected.value]
  dialogVisible.value = false
}

// 监听资产类型变化
watch(currentAssetType, () => {
  hostPage.value = 1
  loadHostList()
  loadGroupList()
})
</script>

<style scoped lang="scss">
.device-selector {
  width: 100%;
}

.selected-devices {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 12px;
  background: #f5f7fa;
}

.selected-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;

  .select-btn {
    cursor: pointer;
  }

  .text-primary {
    color: #409eff;
  }
}

.host-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 150px;
  overflow-y: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.host-item {
  display: inline-block;
}

.host-badge {
  display: inline-flex;
  align-items: center;
  background: #6c757d;
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;

  .remove-btn {
    margin-left: 6px;
    cursor: pointer;
    color: #fff;
    text-decoration: none;
    font-size: 14px;

    &:hover {
      color: #f56c6c;
    }
  }
}

.empty-state {
  padding: 12px 0;
}

// 对话框内容
.selector-dialog-content {
  min-height: 400px;
}

.asset-type-select {
  margin-bottom: 12px;
}

.selected-panel {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  margin-bottom: 12px;

  .panel-header {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    background: #f5f7fa;
    border-bottom: 1px solid #e4e7ed;

    i {
      margin-right: 8px;
    }

    .badge {
      margin-left: 12px;
      background: #f56c6c;
      color: #fff;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 12px;
      cursor: pointer;
    }
  }

  .panel-body {
    padding: 12px;
  }
}

.temp-host-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 100px;
  overflow-y: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.temp-host-item {
  display: inline-block;
}

.mode-tabs {
  margin-bottom: 12px;

  :deep(.el-tabs__nav-wrap::after) {
    height: 1px;
  }
}

.search-bar {
  margin-bottom: 12px;
}

.host-table-wrapper {
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.pagination-bar {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.group-list-wrapper {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 12px;
}

.group-item {
  padding: 6px 0;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
}
</style>
