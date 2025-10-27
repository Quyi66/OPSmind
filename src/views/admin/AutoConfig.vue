<template>
  <div class="auto-config">
    <!-- 顶部标题与操作 -->
    <div class="ac-header">
      <h2 class="ac-title">自动化配置</h2>
      <div class="ac-actions">
        <el-button type="primary" plain size="small">
          <el-icon style="margin-right:6px"><Plus /></el-icon>
          新增Ansible连接配置
        </el-button>
        <el-button size="small" plain>设备纳管</el-button>
      </div>
    </div>

    <!-- 标签页 -->
    <el-tabs v-model="activeTab" class="ac-tabs">
      <el-tab-pane name="info">
        <template #label>
          <span class="tab-label">
            <el-icon class="tab-icon"><InfoFilled /></el-icon>
            自动化配置信息
          </span>
        </template>
      </el-tab-pane>
      <el-tab-pane name="ansible">
        <template #label>
          <span class="tab-label">
            <el-icon class="tab-icon"><Connection /></el-icon>
            Ansible连接配置
          </span>
        </template>
      </el-tab-pane>
    </el-tabs>

    <!-- 提示信息 -->
    <el-alert
      type="success"
      :closable="false"
      class="ac-alert"
      show-icon
      description="注意：自动化配置是针对每一个自动化资产的默认连接配置进行修改，使用场景如下：执行用户/密码、登录用户/密码、执行引擎节点配置等"
    />

    <!-- 工具栏：筛选 + 搜索 -->
    <div class="ac-toolbar">
      <div class="left">
        <el-select v-model="filterOS" size="small" style="width: 140px">
          <el-option label="全部" value="all" />
          <el-option label="linux" value="linux" />
          <el-option label="windows" value="windows" />
        </el-select>
      </div>
      <div class="right">
        <el-input
          v-model="keyword"
          size="small"
          placeholder=""
          style="width: 260px"
          clearable
          @keyup.enter.native="applySearch"
        >
          <template #suffix>
            <el-icon class="search-icon"><Search /></el-icon>
          </template>
        </el-input>
      </div>
    </div>

    <!-- 数据表 -->
    <el-table
      :data="pagedRows"
      size="small"
      border
      class="ac-table"
      header-cell-class-name="ac-th"
    >
      <el-table-column prop="assetCode" label="资产代码" width="120" />
      <el-table-column prop="ip" label="IP" width="160" />
      <el-table-column prop="name" label="自动化配置名称" min-width="160" />
      <el-table-column prop="instanceGroup" label="执行引擎节点(instance group)" min-width="220" />
      <el-table-column prop="aapGroup" label="AAP instance group" min-width="180" />
      <el-table-column prop="loginUser" label="登录用户" width="120" />
      <el-table-column prop="execUser" label="执行用户" width="120" />
      <el-table-column prop="updatedAt" label="更新时间" width="200" />
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-tooltip content="编辑" placement="top">
            <el-button link type="primary" size="small" @click="editRow(row)">
              <el-icon><EditPen /></el-icon>
            </el-button>
          </el-tooltip>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页区（简化为每页条数 + 统计） -->
    <div class="ac-pager">
      <el-select v-model="pageSize" size="small" style="width: 80px">
        <el-option v-for="s in pageSizeOptions" :key="s" :label="s" :value="s" />
      </el-select>
      <span class="pager-info">{{ pageFrom }} - {{ pageTo }} / {{ filteredRows.length }}</span>
    </div>
  </div>
  
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, EditPen, Search, InfoFilled, Connection } from '@element-plus/icons-vue'

// Tabs
const activeTab = ref('info')

// Filters
const filterOS = ref('all')
const keyword = ref('')

// Pagination
const pageSizeOptions = [10, 20, 50, 100]
const pageSize = ref(100)
const currentPage = ref(1)

// Mock rows (示例数据)
const rows = ref([
  { assetCode: 'linux', ip: '172.12.88.195', name: '', instanceGroup: '', aapGroup: '', loginUser: 'root', execUser: 'ansible', updatedAt: '2025-10-15 17:28:05' },
  { assetCode: 'linux', ip: '192.168.1.156', name: '', instanceGroup: '', aapGroup: '', loginUser: 'root', execUser: 'ansible', updatedAt: '2025-10-15 17:28:05' },
  { assetCode: 'linux', ip: '10.234.156.99', name: '', instanceGroup: '', aapGroup: '', loginUser: 'root', execUser: 'ansible', updatedAt: '2025-10-15 17:28:05' },
  { assetCode: 'linux', ip: '192.168.1.200', name: 'default', instanceGroup: '', aapGroup: '', loginUser: '', execUser: '', updatedAt: '2025-10-15 17:58:56' },
  { assetCode: 'linux', ip: '192.168.1.15', name: 'default', instanceGroup: '', aapGroup: '', loginUser: 'root', execUser: 'root', updatedAt: '2025-10-21 10:29:46' }
])

const filteredRows = computed(() => {
  let data = rows.value
  if (filterOS.value !== 'all') {
    data = data.filter(r => r.assetCode === filterOS.value)
  }
  if (keyword.value && keyword.value.trim()) {
    const k = keyword.value.trim().toLowerCase()
    data = data.filter(r =>
      r.assetCode.toLowerCase().includes(k) ||
      r.ip.toLowerCase().includes(k) ||
      (r.name || '').toLowerCase().includes(k)
    )
  }
  return data
})

const pagedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredRows.value.slice(start, end)
})

const pageFrom = computed(() => {
  if (!filteredRows.value.length) return 0
  return (currentPage.value - 1) * pageSize.value + 1
})
const pageTo = computed(() => Math.min(filteredRows.value.length, currentPage.value * pageSize.value))

function editRow(row) {
  ElMessage.info(`编辑：${row.ip}`)
}

function applySearch() {
  currentPage.value = 1
}
</script>

<style scoped>
.auto-config {
  min-height: 100%;
}
.ac-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0 0 0;
}
.ac-title { font-size: 18px; font-weight: 600; margin: 0; }
.ac-actions { display: flex; gap: 8px; }

.ac-tabs { padding: 0; }
.tab-label { display: inline-flex; align-items: center; gap: 6px; }
.tab-icon { color: #409eff; }

.ac-alert { margin: 8px 0 12px; }

.ac-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0 8px;
}
.ac-toolbar .right { display: flex; align-items: center; gap: 8px; }

.ac-table {
  margin: 0;
}
.ac-th { background: #f5f7fa; }

/* 更轻的链接编辑按钮交互态 */
.ac-table :deep(.el-button.is-link) {
  color: #2563eb;
  padding: 4px 6px;
  border-radius: 6px;
}
.ac-table :deep(.el-button.is-link:hover) {
  background: #eff6ff;
}

.ac-pager {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0 0;
}
.pager-info { color: #6b7280; font-size: 13px; }
</style>
