<template>
  <div class="software-home">
    <!-- KPI 卡片区域 -->
    <div class="kpi-section">
      <div
        v-for="item in statsData"
        :key="item.name"
        class="kpi-card"
        :class="'kpi-' + (item.theme || 'secondary')"
        @click="handleKpiClick(item)"
      >
        <div class="kpi-label">{{ item.name }}</div>
        <div class="kpi-value">{{ item.value?.toLocaleString() || 0 }}</div>
        <div class="kpi-icon">
          <i :class="item.icon" />
        </div>
        <div v-if="item.date" class="kpi-date">{{ formatDate(item.date) }}</div>
        <div class="kpi-info">
          <i class="fa fa-info-circle" />
        </div>
      </div>
    </div>

    <!-- 导航 Tab -->
    <div class="nav-section">
      <div class="tab-nav">
        <div
          class="tab-item"
          :class="{ active: activeTab === 'hosts' }"
          @click="activeTab = 'hosts'"
        >
          <i class="fa fa-laptop-house" />
          <span>主机概览</span>
          <i class="fa fa-external-link-alt" style="margin-left: 4px; font-size: 10px;" />
        </div>
        <div
          class="tab-item"
          :class="{ active: activeTab === 'packages' }"
          @click="activeTab = 'packages'"
        >
          <i class="fa fa-cubes" />
          <span>可用软件包</span>
        </div>
      </div>
      <div class="tab-actions">
        <el-input
          v-model="searchText"
          placeholder=""
          style="width: 200px"
          size="small"
          clearable
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <i class="fa fa-search" />
          </template>
        </el-input>
        <el-button link size="small" @click="handleExport">
          <i class="fa fa-download" />
        </el-button>
        <el-button link size="small" @click="handleRefresh">
          <i class="fa fa-sync" />
        </el-button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="content-section">
      <!-- 主机概览 -->
      <div v-if="activeTab === 'hosts'" class="tab-content">
        <HostOverviewTable ref="hostTableRef" :search-text="searchText" @rescan="handleRescan" />
      </div>

      <!-- 可用软件包 -->
      <div v-if="activeTab === 'packages'" class="tab-content">
        <AvailablePackagesTable ref="pkgTableRef" :search-text="searchText" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { softwareStatsApi } from '../api'
import HostOverviewTable from '../components/HostOverviewTable.vue'
import AvailablePackagesTable from '../components/AvailablePackagesTable.vue'

// KPI 统计数据
const statsData = ref([])
const loading = ref(false)
const searchText = ref('')

// 当前激活的 Tab
const activeTab = ref('hosts')

// 表格引用
const hostTableRef = ref(null)
const pkgTableRef = ref(null)

// 格式化日期
function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 处理搜索
const handleSearch = () => {
  // 搜索会通过 props 传递给子组件
}

// 处理导出
const handleExport = () => {
  ElMessage.info('导出功能开发中')
}

// 处理刷新
const handleRefresh = () => {
  loadStatsData()
  if (activeTab.value === 'hosts' && hostTableRef.value?.refresh) {
    hostTableRef.value.refresh()
  } else if (activeTab.value === 'packages' && pkgTableRef.value?.refresh) {
    pkgTableRef.value.refresh()
  }
}

// KPI 定义（与源系统一致）
const kpiDefs = {
  scan_count_host: { title: '扫描主机数', icon: 'fa fa-desktop', linkPage: 'hosts', order: 1, theme: 'secondary' },
  scan_count_repos: { title: '仓库', icon: 'fa fa-laptop-house', linkPage: 'repos', order: 2, theme: 'primary' },
  scan_count_pkgs: { title: '可用软件包数', icon: 'fa fa-cube', linkPage: 'packages', order: 3, theme: 'info' },
  scan_count_installed_pkgs: { title: '已安装软件包数', icon: 'fa fa-check-circle', linkPage: 'installed', order: 4, theme: 'success' }
}

// 加载统计数据
async function loadStatsData() {
  loading.value = true
  try {
    const response = await softwareStatsApi.getStats()
    const data = response?.data || response
    const records = data?.records || []

    // 根据返回数据结构处理
    // 如果返回的是 KPI 统计数据（包含 name, value 字段）
    if (records.length > 0 && records[0].name && records[0].value !== undefined) {
      const result = []
      records.forEach(rec => {
        const def = kpiDefs[rec.name]
        if (def) {
          result.push({
            name: def.title,
            value: rec.value,
            date: rec.updated_at,
            icon: def.icon,
            linkPage: def.linkPage,
            theme: def.theme,
            _order: def.order
          })
        }
      })
      statsData.value = result.sort((a, b) => a._order - b._order)
    }
    // 如果返回的是主机列表数据（需要前端统计）
    else if (records.length > 0 && records[0].host_key) {
      const hostCount = records.length
      const repoCount = records.reduce((sum, r) => sum + (r.repo_count || 0), 0)
      const installedCount = records.reduce((sum, r) => sum + (r.installed_pkgs_count || 0), 0)

      statsData.value = [
        { name: '扫描主机数', value: data.total || hostCount, icon: 'fa fa-desktop', theme: 'secondary', _order: 1 },
        { name: '仓库', value: repoCount, icon: 'fa fa-laptop-house', theme: 'primary', _order: 2 },
        { name: '可用软件包数', value: 0, icon: 'fa fa-cube', theme: 'info', _order: 3 },
        { name: '已安装软件包数', value: installedCount, icon: 'fa fa-check-circle', theme: 'success', _order: 4 }
      ]
    }
  } catch (error) {
    console.error('Failed to load stats:', error)
    statsData.value = []
  } finally {
    loading.value = false
  }
}

// KPI 卡片点击
function handleKpiClick(item) {
  ElMessage.info(`${item.name}: ${item.value}`)
}

// 重新扫描
function handleRescan() {
  ElMessage.info('正在启动软件包扫描...')
  // TODO: 调用扫描 API
}

onMounted(() => {
  loadStatsData()
})
</script>

<style scoped lang="scss">
.software-home {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f7fa;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  padding: 16px 16px 8px;
}

.kpi-section {
  display: flex;
  gap: 12px;
  padding: 8px 16px 16px;
  flex-wrap: wrap;
}

.kpi-card {
  flex: 1;
  min-width: 180px;
  position: relative;
  padding: 16px 20px;
  border-radius: 6px;
  color: #fff;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  // 源系统配色：secondary=灰色
  &.kpi-secondary {
    background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
  }

  // 源系统配色：primary=蓝色
  &.kpi-primary {
    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
  }

  // 源系统配色：info=绿色 (rgb(146, 208, 80))
  &.kpi-info {
    background: linear-gradient(135deg, #92d050 0%, #6fba2c 100%);
  }

  // 源系统配色：success=黄色 (rgb(255, 192, 0))
  &.kpi-success {
    background: linear-gradient(135deg, #ffc000 0%, #d9a300 100%);
  }

  .kpi-label {
    font-size: 13px;
    opacity: 0.9;
    margin-bottom: 6px;
  }

  .kpi-value {
    font-size: 28px;
    font-weight: 700;
    line-height: 1.2;
  }

  .kpi-date {
    font-size: 11px;
    opacity: 0.8;
    margin-top: 4px;
  }

  .kpi-icon {
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 48px;
    opacity: 0.2;
  }

  .kpi-info {
    position: absolute;
    right: 8px;
    top: 8px;
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.2s;

    &:hover {
      opacity: 1;
    }

    i {
      font-size: 14px;
    }
  }
}

.nav-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  padding: 0 16px;
  border-bottom: 1px solid #e4e7ed;
  margin: 0 16px;
  border-radius: 6px 6px 0 0;

  .tab-nav {
    display: flex;
    gap: 4px;
  }

  .tab-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 12px 16px;
    font-size: 14px;
    color: #64748b;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;

    &:hover {
      color: #409eff;
    }

    &.active {
      color: #409eff;
      border-bottom-color: #409eff;
    }

    i:first-child {
      font-size: 14px;
    }
  }

  .tab-actions {
    display: flex;
    align-items: center;
    gap: 8px;

    :deep(.el-input) {
      .el-input__wrapper {
        border-radius: 4px;
      }
    }

    :deep(.el-button) {
      color: #64748b;
      padding: 4px 8px;

      &:hover {
        color: #409eff;
      }

      i {
        font-size: 14px;
      }
    }
  }
}

.content-section {
  flex: 1;
  margin: 0 16px 16px;
  background: #fff;
  border-radius: 0 0 6px 6px;
  overflow: hidden;
}

.tab-content {
  height: 100%;
  overflow: auto;
}
</style>
