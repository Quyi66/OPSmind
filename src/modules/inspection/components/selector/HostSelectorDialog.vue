<template>
  <el-dialog
    v-model="dialogVisible"
    title="选择设备"
    width="1000px"
    :close-on-click-modal="false"
    class="host-selector-dialog"
    append-to-body
    @close="handleClose"
  >
    <div class="selector-container">
      <!-- 已选主机卡片 -->
      <div class="selected-card">
        <div class="card-header" @click="showSelectedHosts = !showSelectedHosts">
          <i class="fas fa-briefcase-medical text-muted"></i>
          <span>已选主机</span>
          <span class="badge">{{ selectedHosts.length }}</span>
        </div>
        <div v-if="showSelectedHosts && selectedHosts.length > 0" class="card-body">
          <ul class="host-list">
            <li v-for="(host, index) in selectedHosts" :key="index" class="host-item">
              <span class="host-badge">
                {{ host.value || host }}
                <a class="remove-btn" @click.stop="removeHost(index)">×</a>
              </span>
            </li>
          </ul>
        </div>
      </div>

      <!-- 选择模式标签页 -->
      <ul class="nav-tabs">
        <li
          v-for="mode in selectModes"
          :key="mode.key"
          class="nav-item"
          :class="{ active: currentMode === mode.key }"
          @click="currentMode = mode.key"
        >
          <a class="nav-link">
            <i :class="mode.icon"></i>
            {{ mode.title }}
          </a>
        </li>
      </ul>

      <!-- 按设备模式 -->
      <div v-show="currentMode === 'host'" class="tab-content">
        <!-- 过滤栏 -->
        <div class="filter-bar">
          <strong>过滤</strong>
          <!-- 选择分组 - 树形下拉 -->
          <el-popover ref="groupPopoverRef" placement="bottom-start" :width="200" trigger="click">
            <template #reference>
              <el-button>选择分组</el-button>
            </template>
            <div class="group-dropdown-tree">
              <div class="dropdown-item" @click="handleGroupFilter('')">所有</div>
              <el-tree
                :data="groupTreeData"
                :props="{ label: 'name', children: 'children' }"
                node-key="path"
                default-expand-all
                :expand-on-click-node="false"
                @node-click="handleGroupNodeClick"
              >
                <template #default="{ node }">
                  <span class="tree-node">
                    <i class="fas fa-folder text-warning"></i>
                    <span>{{ node.label }}</span>
                  </span>
                </template>
              </el-tree>
            </div>
          </el-popover>

          <!-- 选择标签 - 带数字徽章的列表 -->
          <el-popover ref="tagPopoverRef" placement="bottom-start" :width="180" trigger="click">
            <template #reference>
              <el-button>
                <i class="fas fa-list-ul"></i>
                选择标签
              </el-button>
            </template>
            <div class="tag-dropdown-list">
              <div
                v-for="tag in hostTags"
                :key="tag.id"
                class="tag-dropdown-item"
                @click="handleTagNodeClick(tag)"
              >
                <span>{{ tag.name }}</span>
                <span class="tag-badge">{{ tag.count || 0 }}</span>
              </div>
              <div v-if="hostTags.length === 0" class="no-data">暂无标签</div>
            </div>
          </el-popover>
        </div>

        <!-- 主机表格 -->
        <div class="table-container">
          <div class="table-toolbar">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索"
              clearable
              style="width: 200px"
              @input="handleSearch"
            >
              <template #prefix>
                <i class="fas fa-search"></i>
              </template>
            </el-input>
            <el-button :icon="Refresh" @click="loadHostData" />
          </div>
          <el-table
            ref="hostTableRef"
            v-loading="loading"
            :data="pagedHosts"
            border
            height="320"
            @selection-change="handleHostSelectionChange"
          >
            <el-table-column type="selection" width="45" />
            <el-table-column prop="ip" label="纳管IP" min-width="130" />
            <el-table-column prop="status" label="连通状态" width="90" align="left">
              <template #default="{ row }">
                <i v-if="row.status === 'online'" class="fas fa-check-circle text-success"></i>
                <i v-else class="fas fa-times-circle text-danger"></i>
              </template>
            </el-table-column>
            <el-table-column prop="connectRate" label="连通率" width="80">
              <template #default="{ row }">
                <span v-if="row.connectRate" class="text-primary">{{ row.connectRate }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="hostname" label="主机名" min-width="120" />
            <el-table-column prop="os" label="操作系统" min-width="160" />
            <el-table-column prop="osVersion" label="系统版本" width="90" />
            <el-table-column prop="owner" label="负责人" width="80" />
            <el-table-column prop="systemName" label="系统名称" width="100" />
          </el-table>
          <div class="table-footer">
            <el-select v-model="pageSize" style="width: 70px" @change="handlePageSizeChange">
              <el-option :value="10" label="10" />
              <el-option :value="20" label="20" />
              <el-option :value="50" label="50" />
            </el-select>
            <span class="pagination-info">{{ paginationInfo }}</span>
          </div>
        </div>
      </div>

      <!-- 按分组模式 -->
      <div v-show="currentMode === 'group'" class="tab-content">
        <div class="group-tree-container">
          <el-tree
            ref="groupTreeRef"
            :data="groupTreeData"
            :props="{ label: 'name', children: 'children' }"
            show-checkbox
            node-key="path"
            default-expand-all
            @check="handleGroupCheck"
          />
        </div>
      </div>

      <!-- 按标签模式 -->
      <div v-show="currentMode === 'tag'" class="tab-content">
        <div class="tag-cards">
          <div
            v-for="tag in hostTags"
            :key="tag.name"
            class="tag-card"
            :class="{ selected: selectedTagNames.includes(tag.name) }"
            @click="toggleTagSelection(tag)"
          >
            <i class="fas fa-tag"></i>
            <span>{{ tag.name }}</span>
            <span v-if="tag.count" class="tag-count">({{ tag.count }})</span>
          </div>
        </div>
      </div>

      <!-- 手动输入模式 -->
      <div v-show="currentMode === 'input'" class="tab-content">
        <div class="input-form">
          <div class="form-row">
            <label>属性</label>
            <el-select v-model="inputAttrCode" style="width: 100%">
              <el-option label="IP" value="IP" />
            </el-select>
          </div>
          <div class="form-row">
            <label>匹配以下数据</label>
            <el-input
              v-model="inputSearchText"
              type="textarea"
              :rows="10"
              placeholder="请输入要搜索的值，支持多行，一行输入一个搜索值"
            />
            <p class="help-text">请输入要搜索的值，支持多行，一行输入一个搜索值</p>
          </div>
          <div class="form-row separator-row">
            <label>其它分隔符</label>
            <div class="separator-options">
              <el-checkbox v-model="useSeparatorSpace">空格</el-checkbox>
              <el-checkbox v-model="useSeparatorComma">逗号</el-checkbox>
            </div>
          </div>
          <div class="form-row">
            <el-button type="info" @click="searchByInput">
              <i class="fas fa-search"></i>
              开始查找
            </el-button>
          </div>
        </div>
      </div>

      <!-- 最近作业设备模式 -->
      <div v-show="currentMode === 'recently'" class="tab-content">
        <div class="table-toolbar">
          <el-input
            v-model="recentlySearchText"
            placeholder="搜索..."
            clearable
            style="width: 200px"
          >
            <template #prefix>
              <i class="fas fa-search"></i>
            </template>
          </el-input>
          <el-button :icon="Refresh" @click="loadRecentlyData" title="刷新" />
        </div>
        <el-table
          ref="recentlyTableRef"
          :data="filteredRecentlyHosts"
          border
          height="350"
          @selection-change="handleRecentlySelectionChange"
        >
          <el-table-column type="selection" width="45" />
          <el-table-column prop="jobTitle" label="作业" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">
              <a href="javascript:void(0)" class="text-primary">{{ row.jobTitle }}</a>
            </template>
          </el-table-column>
          <el-table-column prop="hosts" label="执行主机" min-width="130">
            <template #default="{ row }">
              <div class="hosts-cell">
                <span v-for="(host, idx) in row.hosts" :key="idx">
                  {{ host }}
                  <br v-if="idx < row.hosts.length - 1" />
                </span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="jobType" label="类型" width="80" />
          <el-table-column prop="endTime" label="结束时间" width="160" />
          <el-table-column prop="ataNode" label="Ansible Node" min-width="130">
            <template #default="{ row }">
              <div class="ata-node-cell">
                <span v-for="(node, idx) in row.ataNode" :key="idx" class="badge badge-secondary">
                  {{ node }}
                </span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="90">
            <template #default="{ row }">
              <span :class="['status-badge', getStatusClass(row.status)]">
                {{ getStatusText(row.status) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="statsJson" label="详情" width="80">
            <template #default="{ row }">
              <span v-html="formatJobStats(row.statsJson)"></span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <template #footer>
      <el-button type="primary" @click="handleConfirm">
        <i class="fas fa-check"></i>
        确认
      </el-button>
      <el-button @click="handleClose">
        <i class="fas fa-reply"></i>
        取消
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { apiService } from '@/core/api'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  selected: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:visible', 'confirm'])

// 对话框可见性
const dialogVisible = computed({
  get: () => props.visible,
  set: val => emit('update:visible', val)
})

// 选择模式配置
const selectModes = [
  { key: 'host', title: '按设备', icon: 'fas fa-list' },
  { key: 'group', title: '按分组', icon: 'fas fa-code' },
  { key: 'tag', title: '按标签', icon: 'fas fa-tags' },
  { key: 'input', title: '手动输入', icon: 'fas fa-pencil-alt' },
  { key: 'recently', title: '最近作业设备', icon: 'fas fa-history' }
]

// 状态
const currentMode = ref('host')
const showSelectedHosts = ref(true)
const selectedHosts = ref([])
const searchKeyword = ref('')
const filterGroup = ref('')
const filterTag = ref('')
const loading = ref(false)

// 分页
const pageSize = ref(10)
const currentPage = ref(1)

// 主机数据
const allHosts = ref([])
const hostGroups = ref([])
const hostTags = ref([])
const recentlyUsedHosts = ref([])

// 表格选中
const hostTableRef = ref(null)
const groupTreeRef = ref(null)
const recentlyTableRef = ref(null)
const selectedTableHosts = ref([])
const selectedRecentlyHosts = ref([])

// Popover refs
const groupPopoverRef = ref(null)
const tagPopoverRef = ref(null)

// 分组树数据
const groupTreeData = ref([])

// 标签选中
const selectedTagNames = ref([])

// IP输入模式
const inputAttrCode = ref('IP')
const inputSearchText = ref('')
const useSeparatorSpace = ref(false)
const useSeparatorComma = ref(false)

// 最近作业搜索
const recentlySearchText = ref('')

// 过滤后的主机列表
const filteredHosts = computed(() => {
  let result = [...allHosts.value]

  if (filterGroup.value) {
    result = result.filter(
      h => h.groupPath === filterGroup.value || h.groupPath?.startsWith(filterGroup.value + '/')
    )
  }

  if (filterTag.value) {
    result = result.filter(h => h.tags?.includes(filterTag.value))
  }

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(
      h =>
        (h.ip && h.ip.toLowerCase().includes(keyword)) ||
        (h.hostname && h.hostname.toLowerCase().includes(keyword))
    )
  }

  return result
})

// 过滤后的最近作业列表
const filteredRecentlyHosts = computed(() => {
  if (!recentlySearchText.value) {
    return recentlyUsedHosts.value
  }
  const keyword = recentlySearchText.value.toLowerCase()
  return recentlyUsedHosts.value.filter(
    h =>
      (h.jobTitle && h.jobTitle.toLowerCase().includes(keyword)) ||
      (h.jobType && h.jobType.toLowerCase().includes(keyword)) ||
      (h.hosts && h.hosts.some(host => host.toLowerCase().includes(keyword)))
  )
})

// 分页后的主机列表
const pagedHosts = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredHosts.value.slice(start, end)
})

// 分页信息
const paginationInfo = computed(() => {
  const total = filteredHosts.value.length
  const start = Math.min((currentPage.value - 1) * pageSize.value + 1, total)
  const end = Math.min(currentPage.value * pageSize.value, total)
  return `${start} - ${end} / ${total}`
})

// 加载主机数据
async function loadHostData() {
  loading.value = true
  try {
    // 通过 ACM 直接接口获取主机列表
    // ACM_GET_CI_BY_SELECTOR → POST /acm/api/acm/ci/list-by-groups-tags
    const res = await apiService
      .post('/acm/api/acm/ci/list-by-groups-tags', {
        groups: '@@',
        tags: '@@',
        dynamicTags: '@@',
        assetType: 'linux',
        dataType: 'undefined',
        size: 200,
        page: 1
      })
      .catch(() => null)

    const payload = res?.data?.data ?? res?.data ?? res
    const list = Array.isArray(payload?.records)
      ? payload.records
      : Array.isArray(payload?.content)
        ? payload.content
        : Array.isArray(payload)
          ? payload
          : []

    allHosts.value = list.map(h => ({
      id: h.id,
      key: h.id,
      value: h.IP || h.ip,
      ip: h.IP || h.ip,
      hostname: h.hostname || h.name,
      os: h.os_distro || h.os,
      osVersion: h.os_version || h.osVersion,
      status: h.CONN_LATEST_STATUS === 1 || h.status === 1 ? 'online' : 'offline',
      connectRate: h.CONN_RATE ? `${h.CONN_RATE}%` : '',
      owner: h['负责人'] || h.owner,
      systemName: h['系统名称'] || h.systemName,
      groupPath: h.groupPath || h.groups,
      tags: h.tags,
      assetType: h.ciType || h.assetType || 'linux'
    }))

    // 设置初始选中状态
    setInitialSelection()
  } catch (error) {
    console.error('加载主机数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载分组数据
async function loadGroupData() {
  try {
    const res = await apiService.get('/acm/api/acm/query/group/view/linux').catch(() => null)
    if (res) {
      const groupPaths = res.data || res || []
      if (Array.isArray(groupPaths) && groupPaths.length > 0) {
        hostGroups.value = groupPaths.map(path => ({
          path: path,
          name:
            path === '/'
              ? '~'
              : path
                  .split('/')
                  .filter(s => s)
                  .pop() || path
        }))
        groupTreeData.value = buildGroupTreeFromPaths(groupPaths)
      }
    }
  } catch (error) {
    console.error('加载分组数据失败:', error)
  }
}

// 加载标签数据
async function loadTagData() {
  try {
    const res = await apiService.get('/acm/api/acm/query/tag/view/linux').catch(() => null)
    if (res) {
      const tags = res.data || res || []
      if (Array.isArray(tags)) {
        hostTags.value = tags
      }
    }
  } catch (error) {
    console.error('加载标签数据失败:', error)
  }
}

// 加载最近使用数据
async function loadRecentlyData() {
  try {
    const res = await apiService
      .post('/jao/api/jao/jobs/recently', {
        jobTypes: 'script,command',
        limit: 100
      })
      .catch(() => null)

    if (res) {
      const list = res.data || res || []
      recentlyUsedHosts.value = list.map(h => {
        const hosts = h.run_result_hosts ? h.run_result_hosts.map(host => host.value) : []
        const ataNode = h.ata_node || []
        let totalHosts = 0
        if (h.statsJson) {
          try {
            totalHosts = JSON.parse(h.statsJson).totalHosts || 0
          } catch (e) {}
        }
        return {
          id: h.id,
          jobTitle: h.jobTitle,
          jobType: h.jobType,
          hosts: hosts,
          ataNode: ataNode,
          startTime: h.startTime,
          endTime: formatDate(h.startTime),
          status: h.status,
          statsJson: h.statsJson,
          key: h.id,
          value: h.jobTitle,
          runType: h.jobType,
          assetType: 'host',
          total_hosts: totalHosts,
          run_result_hosts: h.run_result_hosts || []
        }
      })
    }
  } catch (error) {
    console.error('加载最近使用数据失败:', error)
  }
}

// 获取状态样式类
function getStatusClass(status) {
  const statusMap = {
    RUNNING: 'status-primary',
    COMPLETED: 'status-success',
    ERROR: 'status-warning',
    INTERRUPTED: 'status-dark',
    FAILED: 'status-danger',
    CALLBACK: 'status-primary',
    WAITING: 'status-secondary'
  }
  return statusMap[status] || 'status-danger'
}

// 获取状态文本
function getStatusText(status) {
  const statusMap = {
    RUNNING: '运行中',
    COMPLETED: '完成',
    ERROR: '错误',
    INTERRUPTED: '已中断',
    FAILED: '运行失败',
    CALLBACK: '运行中',
    WAITING: '等待中'
  }
  return statusMap[status] || '运行失败'
}

// 格式化作业统计信息
function formatJobStats(statsJson) {
  if (!statsJson) return ''
  try {
    const stats = JSON.parse(statsJson)
    let html = ''
    if (stats.ok) html += `<span class="text-success">${stats.ok}</span>/`
    if (stats.changed) html += `<span class="text-warning">${stats.changed}</span>/`
    if (stats.unreachable) html += `<span class="text-danger">${stats.unreachable}</span>/`
    if (stats.failed) html += `<span class="text-danger">${stats.failed}</span>`
    return html || '-'
  } catch (e) {
    return '-'
  }
}

// 构建分组树
function buildGroupTreeFromPaths(paths) {
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

// 分组筛选
function handleGroupFilter(groupPath) {
  filterGroup.value = groupPath
  currentPage.value = 1
  groupPopoverRef.value?.hide?.()
}

// 分组节点点击
function handleGroupNodeClick(data) {
  filterGroup.value = data.path
  currentPage.value = 1
  groupPopoverRef.value?.hide?.()
}

// 标签节点点击
function handleTagNodeClick(tag) {
  filterTag.value = tag.name
  currentPage.value = 1
  tagPopoverRef.value?.hide?.()
}

// 搜索
function handleSearch() {
  currentPage.value = 1
}

// 分页大小变化
function handlePageSizeChange() {
  currentPage.value = 1
}

// 主机表格选择变化
function handleHostSelectionChange(selection) {
  selectedTableHosts.value = selection

  // 获取当前页的主机 key 列表
  const currentPageKeys = pagedHosts.value.map(h => h.key)
  const selectedKeys = selection.map(h => h.key)

  // 移除当前页中被取消选中的主机
  currentPageKeys.forEach(key => {
    if (!selectedKeys.includes(key)) {
      const idx = selectedHosts.value.findIndex(h => h.key === key)
      if (idx > -1) {
        selectedHosts.value.splice(idx, 1)
      }
    }
  })

  // 添加新选中的主机（避免重复）
  selection.forEach(host => {
    if (!selectedHosts.value.some(h => h.key === host.key || h.value === host.value)) {
      selectedHosts.value.push({
        key: host.key,
        value: host.value,
        assetType: host.assetType || 'linux'
      })
    }
  })
}

// 分组选择变化
function handleGroupCheck(data, { checkedKeys }) {
  selectedHosts.value = selectedHosts.value.filter(h => !h.isGroup)
  checkedKeys.forEach(path => {
    if (path && !selectedHosts.value.some(h => h.key === path)) {
      selectedHosts.value.push({
        key: path,
        value: path + '(host)',
        assetType: 'linux',
        isGroup: true
      })
    }
  })
}

// 切换标签选择
function toggleTagSelection(tag) {
  const index = selectedTagNames.value.indexOf(tag.name)
  if (index > -1) {
    selectedTagNames.value.splice(index, 1)
    const hostIndex = selectedHosts.value.findIndex(h => h.key === '#' + tag.name)
    if (hostIndex > -1) {
      selectedHosts.value.splice(hostIndex, 1)
    }
  } else {
    selectedTagNames.value.push(tag.name)
    selectedHosts.value.push({
      key: '#' + tag.name,
      value: '#' + tag.name + '(host)',
      assetType: 'linux',
      isTag: true
    })
  }
}

// IP输入搜索
function searchByInput() {
  if (!inputSearchText.value.trim()) {
    ElMessage.warning('请输入IP地址')
    return
  }

  let separators = ['\\n', ';']
  if (useSeparatorSpace.value) {
    separators.push('\\s')
  }
  if (useSeparatorComma.value) {
    separators.push(',')
  }
  const separatorRegex = new RegExp('[' + separators.join('') + ']+')

  const ips = inputSearchText.value
    .split(separatorRegex)
    .map(ip => ip.trim())
    .filter(ip => ip)

  let addedCount = 0
  ips.forEach(ip => {
    if (!selectedHosts.value.some(h => h.value === ip)) {
      selectedHosts.value.push({
        key: ip,
        value: ip,
        assetType: 'linux'
      })
      addedCount++
    }
  })

  if (addedCount > 0) {
    ElMessage.success(`已添加 ${addedCount} 个主机`)
    inputSearchText.value = ''
  } else {
    ElMessage.info('所有主机已在列表中')
  }
}

// 最近使用选择变化
function handleRecentlySelectionChange(selection) {
  selectedRecentlyHosts.value = selection
  selection.forEach(job => {
    // 将作业中的主机添加到已选列表
    if (job.run_result_hosts) {
      job.run_result_hosts.forEach(host => {
        if (!selectedHosts.value.some(h => h.value === host.value)) {
          selectedHosts.value.push({
            key: host.key || host.value,
            value: host.value,
            assetType: host.assetType || 'linux'
          })
        }
      })
    }
  })
}

// 移除主机
function removeHost(index) {
  const host = selectedHosts.value[index]
  selectedHosts.value.splice(index, 1)

  // 同步取消表格选中状态
  if (hostTableRef.value) {
    const row = allHosts.value.find(h => h.key === host.key)
    if (row) {
      hostTableRef.value.toggleRowSelection(row, false)
    }
  }

  // 同步取消标签选中状态
  if (host.isTag && host.key?.startsWith('#')) {
    const tagName = host.key.substring(1)
    const tagIndex = selectedTagNames.value.indexOf(tagName)
    if (tagIndex > -1) {
      selectedTagNames.value.splice(tagIndex, 1)
    }
  }
}

// 设置初始选中状态
function setInitialSelection() {
  nextTick(() => {
    if (!hostTableRef.value || !props.selected?.length) return

    props.selected.forEach(selected => {
      const host = allHosts.value.find(
        h => h.key === selected.key || h.ip === selected.value || h.value === selected.value
      )
      if (host) {
        hostTableRef.value?.toggleRowSelection(host, true)
      }
    })
  })
}

// 关闭对话框
function handleClose() {
  dialogVisible.value = false
}

// 确认选择
function handleConfirm() {
  emit('confirm', [...selectedHosts.value])
  dialogVisible.value = false
}

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date
    .toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    .replace(/\//g, '-')
}

// 加载所有数据
async function loadAllData() {
  await Promise.all([loadHostData(), loadGroupData(), loadTagData(), loadRecentlyData()])
}

// 对话框打开时加载数据
watch(
  () => props.visible,
  val => {
    if (val) {
      // 初始化已选主机
      selectedHosts.value = [...(props.selected || [])]
      loadAllData()
    }
  }
)
</script>

<style scoped lang="scss">
.selector-container {
  min-height: 500px;
}

// 已选主机卡片
.selected-card {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  margin-bottom: 16px;
  background: var(--el-bg-color);

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: var(--el-fill-color-light);
    border-bottom: 1px solid var(--el-border-color);
    cursor: pointer;

    .text-muted {
      color: var(--el-text-color-secondary);
    }

    .badge {
      background: #dc3545;
      color: #fff;
      padding: 2px 10px;
      border-radius: 10px;
      font-size: 12px;
      margin-left: 12px;
    }
  }

  .card-body {
    padding: 12px 16px;
  }
}

.host-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 150px;
  overflow-y: auto;
}

.host-item {
  display: inline-block;
}

.host-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  background: #6c757d;
  color: #fff;
  border-radius: 4px;
  font-size: 13px;

  .remove-btn {
    margin-left: 8px;
    cursor: pointer;
    color: #fff;
    text-decoration: none;

    &:hover {
      color: var(--el-fill-color-blank);
    }
  }
}

// 导航标签页
.nav-tabs {
  display: flex;
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
  border-bottom: 1px solid var(--el-border-color);
}

.nav-item {
  cursor: pointer;

  .nav-link {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    color: var(--el-text-color-regular);
    text-decoration: none;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;

    i {
      font-size: 14px;
    }
  }

  &:hover .nav-link {
    color: var(--el-color-primary);
  }

  &.active .nav-link {
    color: var(--el-color-primary);
    border-bottom-color: var(--el-color-primary);
  }
}

// 标签页内容
.tab-content {
  min-height: 380px;
}

// 过滤栏
.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: var(--el-fill-color-light);
  margin-bottom: 12px;
  border-radius: 4px;

  strong {
    margin-right: 4px;
  }
}

// 分组下拉树样式
.group-dropdown-tree {
  max-height: 300px;
  overflow-y: auto;

  .dropdown-item {
    padding: 8px 12px;
    cursor: pointer;
    border-bottom: 1px solid var(--el-border-color-lighter);

    &:hover {
      background: var(--el-bg-color-page);
    }
  }

  .tree-node {
    display: flex;
    align-items: center;
    gap: 6px;

    .text-warning {
      color: #e6a23c;
    }
  }

  :deep(.el-tree-node__content) {
    height: 28px;
  }

  :deep(.el-tree-node__expand-icon) {
    font-size: 12px;
  }
}

// 标签下拉列表样式
.tag-dropdown-list {
  max-height: 250px;
  overflow-y: auto;

  .tag-dropdown-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    cursor: pointer;
    border-bottom: 1px solid var(--el-border-color-light);

    &:hover {
      background: var(--el-bg-color-page);
    }

    &:last-child {
      border-bottom: none;
    }

    .tag-badge {
      background: #0d6efd;
      color: #fff;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      min-width: 20px;
      text-align: center;
    }
  }

  .no-data {
    padding: 12px;
    text-align: center;
    color: var(--el-text-color-placeholder);
    font-size: 13px;
  }
}

// 表格容器
.table-container {
  .table-toolbar {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .table-footer {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 8px;
    padding: 8px 0;

    .pagination-info {
      color: var(--el-text-color-secondary);
      font-size: 13px;
    }
  }
}

// 分组树容器
.group-tree-container {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  padding: 12px;
  max-height: 380px;
  overflow-y: auto;
}

// 标签卡片
.tag-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 8px;
}

.tag-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  &.selected {
    background: #0d6efd;
    color: #fff;
    border-color: var(--el-color-primary);
  }

  .tag-count {
    font-size: 12px;
    opacity: 0.8;
  }
}

// 表格工具栏
.table-toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

// 输入表单
.input-form {
  padding: 16px;

  .form-row {
    margin-bottom: 16px;

    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: var(--el-text-color-primary);
    }

    .help-text {
      margin-top: 8px;
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }

  .separator-row {
    display: flex;
    align-items: center;
    margin-bottom: 16px;

    label {
      margin-right: 12px;
      margin-bottom: 0;
      font-weight: 500;
      color: var(--el-text-color-primary);
    }

    .separator-options {
      display: flex;
      align-items: center;
      gap: 16px;
    }
  }
}

// 状态图标
.text-success {
  color: #28a745;
}

.text-danger {
  color: #dc3545;
}

.text-warning {
  color: #ffc107;
}

.text-primary {
  color: #0d6efd;
}

// 状态徽章
.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #fff;

  &.status-success {
    background-color: #28a745;
  }

  &.status-danger {
    background-color: #dc3545;
  }

  &.status-warning {
    background-color: #ffc107;
    color: #212529;
  }

  &.status-info {
    background-color: #17a2b8;
  }

  &.status-primary {
    background-color: #0d6efd;
  }

  &.status-secondary {
    background-color: #6c757d;
  }

  &.status-dark {
    background-color: #343a40;
  }
}

// Ansible Node 徽章
.badge-secondary {
  display: inline-block;
  padding: 2px 6px;
  margin: 2px;
  border-radius: 4px;
  font-size: 12px;
  background-color: #6c757d;
  color: #fff;
}

// 主机单元格
.hosts-cell {
  line-height: 1.6;
}

// Ansible Node 单元格
.ata-node-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

// 对话框样式
:deep(.el-dialog__header) {
  border-bottom: 1px solid var(--el-border-color);
  padding: 16px 20px;
  margin: 0;
}

:deep(.el-dialog__body) {
  padding: 20px;
}

:deep(.el-dialog__footer) {
  border-top: 1px solid var(--el-border-color);
  padding: 12px 20px;
}

:deep(.el-table) {
  font-size: 13px;

  .el-table__header th {
    font-weight: 500;
  }
}

:deep(.el-tree-node__content) {
  height: 32px;
}
</style>
