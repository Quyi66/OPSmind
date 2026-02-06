<template>
  <div class="ops-page-layout">
    <!-- KPI 卡片区域 -->
    <div class="kpi-section">
      <div
        v-for="item in statsData"
        :key="item.name"
        class="kpi-card"
        :class="'kpi-' + (item.theme || 'secondary')"
        @click="handleKpiClick(item)"
      >
        <!-- 头部：图标盒子 + 标题 -->
        <div class="kpi-header">
          <div class="kpi-icon-box">
            <i :class="item.icon" />
          </div>
          <div class="kpi-label">{{ item.name }}</div>
        </div>

        <!-- 中部：数值 -->
        <div class="kpi-body">
          <div class="kpi-value">{{ item.value?.toLocaleString() || 0 }}</div>
        </div>

        <!-- 底部：时间 -->
        <div v-if="item.date" class="kpi-footer">
          <div class="kpi-date">{{ formatDate(item.date) }}</div>
        </div>

        <!-- 背景装饰大图标 -->
        <div class="kpi-bg-icon">
          <i :class="item.icon" />
        </div>

        <!-- Info 按钮 -->
        <div class="kpi-info-btn">
          <i class="fa fa-ellipsis-h" />
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
          <div class="external-link-icon">
            <i class="fa fa-external-link-alt" />
          </div>
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
    </div>

    <!-- 内容区域 -->
    <div class="content-section">
      <!-- 主机概览 -->
      <div v-if="activeTab === 'hosts'" class="tab-content">
        <HostOverviewTable ref="hostTableRef" @rescan="handleRescan" />
      </div>

      <!-- 可用软件包 -->
      <div v-if="activeTab === 'packages'" class="tab-content">
        <AvailablePackagesTable ref="pkgTableRef" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { softwareStatsApi } from '../api'
import HostOverviewTable from '../components/HostOverviewTable.vue'
import AvailablePackagesTable from '../components/AvailablePackagesTable.vue'

const router = useRouter()

// KPI 统计数据
const statsData = ref([])
const loading = ref(false)

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
        { name: '扫描主机数', value: data.total || hostCount, icon: 'fa fa-desktop', theme: 'secondary', linkPage: 'hosts', _order: 1 },
        { name: '仓库', value: repoCount, icon: 'fa fa-laptop-house', theme: 'primary', linkPage: 'repos', _order: 2 },
        { name: '可用软件包数', value: 0, icon: 'fa fa-cube', theme: 'info', linkPage: 'packages', _order: 3 },
        { name: '已安装软件包数', value: installedCount, icon: 'fa fa-check-circle', theme: 'success', linkPage: 'installed', _order: 4 }
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
  if (item.linkPage === 'hosts') {
    activeTab.value = 'hosts'
  } else if (item.linkPage === 'packages') {
    activeTab.value = 'packages'
  } else if (item.linkPage === 'repos') {
    router.push('/software/repos')
  } else if (item.linkPage === 'installed') {
    // 跳转到已安装软件包列表页面
    router.push('/software/installed')
  } else {
    ElMessage.info(`${item.name} 数据`)
  }
}

// 扫描完成后刷新统计数据
function handleRescan() {
  loadStatsData()
}

onMounted(() => {
  loadStatsData()
})
</script>

<style scoped lang="scss">
.ops-page-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.kpi-section {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.kpi-card {
  flex: 1;
  min-width: 240px;
  position: relative;
  padding: 20px 24px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: all 0.2s ease-in-out;
  border-left: 4px solid transparent;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
    border-color: #cbd5e1;

    .kpi-bg-icon {
      transform: scale(1.1) rotate(0deg);
      opacity: 0.15;
    }
  }

  // 头部布局
  .kpi-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  // 图标盒子
  .kpi-icon-box {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
  }

  // 标题
  .kpi-label {
    font-size: 14px;
    font-weight: 600;
    color: #64748b;
    line-height: 1.4;
  }

  // 数值部分
  .kpi-body {
    position: relative;
    z-index: 2;
  }

  .kpi-value {
    font-size: 36px;
    font-weight: 700;
    line-height: 1;
    font-family:
      'Inter',
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      Roboto,
      sans-serif;
    letter-spacing: -1px;
    margin-bottom: 4px;
  }

  // 底部时间
  .kpi-footer {
    margin-top: 8px;
    position: relative;
    z-index: 2;
  }

  .kpi-date {
    font-size: 12px;
    color: #94a3b8;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  // 背景大图标
  .kpi-bg-icon {
    position: absolute;
    right: -16px;
    bottom: -16px;
    font-size: 120px;
    opacity: 0.08;
    transform: rotate(-15deg);
    transition: all 0.4s ease;
    z-index: 0;
    pointer-events: none;
  }

  // 右上角菜单
  .kpi-info-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    color: #cbd5e1;
    transition: color 0.2s;

    &:hover {
      color: #94a3b8;
    }
  }

  // === 主题配色 ===

  // 灰色 (Secondary)
  &.kpi-secondary {
    border-left-color: #64748b;
    .kpi-icon-box {
      background: #f1f5f9;
      color: #475569;
    }
    .kpi-value {
      color: #334155;
    }
    .kpi-bg-icon {
      color: #64748b;
    }
  }

  // 蓝色 (Primary)
  &.kpi-primary {
    border-left-color: #3b82f6;
    .kpi-icon-box {
      background: #eff6ff;
      color: #2563eb;
    }
    .kpi-value {
      color: #1e40af;
    }
    .kpi-bg-icon {
      color: #3b82f6;
    }
  }

  // 绿色 (Info)
  &.kpi-info {
    border-left-color: #10b981;
    .kpi-icon-box {
      background: #ecfdf5;
      color: #059669;
    }
    .kpi-value {
      color: #047857;
    }
    .kpi-bg-icon {
      color: #10b981;
    }
  }

  // 橙色 (Success)
  &.kpi-success {
    border-left-color: #f59e0b;
    .kpi-icon-box {
      background: #fffbeb;
      color: #d97706;
    }
    .kpi-value {
      color: #b45309;
    }
    .kpi-bg-icon {
      color: #f59e0b;
    }
  }
}

.nav-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 16px;

  .tab-nav {
    display: flex;
    gap: 24px;
  }

  .tab-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 0;
    font-size: 14px;
    font-weight: 500;
    color: #64748b;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
    position: relative;
    top: 1px;

    &:hover {
      color: #3b82f6;
    }

    &.active {
      color: #3b82f6;
      border-bottom-color: #3b82f6;
    }

    .external-link-icon {
      font-size: 10px;
      margin-left: -2px;
      opacity: 0.6;
    }
  }
}

.content-section {
  flex: 1;
  background: #fff;
}

.tab-content {
  height: 100%;
}
</style>
