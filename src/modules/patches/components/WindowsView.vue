<template>
  <div class="windows-view">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="page-header__actions">
        <el-button plain @click="handleRefresh">
          <i class="fa fa-sync" />
          刷新
        </el-button>
        <el-button plain @click="handleExport">
          <i class="fa fa-download" />
          导出
        </el-button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="page-content">
      <!-- 统计卡片 -->
      <div class="stats-cards">
        <div class="stats-card stats-card--primary">
          <div class="stats-card__icon">
            <i class="fab fa-windows" />
          </div>
          <div class="stats-card__content">
            <div class="stats-card__value">{{ stats.totalHosts }}</div>
            <div class="stats-card__label">Windows主机总数</div>
          </div>
        </div>
        <div class="stats-card stats-card--success">
          <div class="stats-card__icon">
            <i class="fa fa-check-circle" />
          </div>
          <div class="stats-card__content">
            <div class="stats-card__value">{{ stats.upToDate }}</div>
            <div class="stats-card__label">已更新</div>
          </div>
        </div>
        <div class="stats-card stats-card--warning">
          <div class="stats-card__icon">
            <i class="fa fa-exclamation-triangle" />
          </div>
          <div class="stats-card__content">
            <div class="stats-card__value">{{ stats.pendingUpdates }}</div>
            <div class="stats-card__label">待更新</div>
          </div>
        </div>
        <div class="stats-card stats-card--danger">
          <div class="stats-card__icon">
            <i class="fa fa-times-circle" />
          </div>
          <div class="stats-card__content">
            <div class="stats-card__value">{{ stats.offline }}</div>
            <div class="stats-card__label">离线</div>
          </div>
        </div>
      </div>

      <!-- 筛选区域 -->
      <div class="filter-section">
        <el-input
          v-model="filterText"
          placeholder="搜索主机名..."
          prefix-icon="Search"
          style="width: 300px"
          clearable
          @input="handleFilter"
        />
        <el-select v-model="osFilter" placeholder="操作系统" clearable style="width: 180px" @change="handleFilter">
          <el-option label="Windows Server 2019" value="2019" />
          <el-option label="Windows Server 2016" value="2016" />
          <el-option label="Windows Server 2012 R2" value="2012r2" />
          <el-option label="Windows 10" value="win10" />
          <el-option label="Windows 11" value="win11" />
        </el-select>
        <el-select v-model="statusFilter" placeholder="状态" clearable style="width: 120px" @change="handleFilter">
          <el-option label="在线" value="online" />
          <el-option label="离线" value="offline" />
        </el-select>
      </div>

      <!-- 主机表格 -->
      <div class="table-section">
        <div class="table-header">
          <h3>Windows主机列表</h3>
        </div>

        <el-table
          v-loading="loading"
          :data="tableData"
          stripe
          style="width: 100%"
          size="small"
        >
          <el-table-column prop="hostname" label="主机名" min-width="150">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="handleViewDetail(row)">
                {{ row.hostname }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column prop="ip" label="IP地址" width="140" />
          <el-table-column prop="os_version" label="操作系统" min-width="180" show-overflow-tooltip />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'online' ? 'success' : 'danger'" size="small">
                {{ row.status === 'online' ? '在线' : '离线' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="pending_updates" label="待更新数" width="100">
            <template #default="{ row }">
              <span :class="{ 'text-warning font-bold': row.pending_updates > 0 }">
                {{ row.pending_updates }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="installed_updates" label="已安装更新" width="100" />
          <el-table-column prop="last_scan" label="最后扫描" width="160" />
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" link @click="handleScan(row)">
                扫描
              </el-button>
              <el-button type="primary" size="small" link @click="handleUpdate(row)">
                更新
              </el-button>
              <el-button type="info" size="small" link @click="handleViewDetail(row)">
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="table-footer">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            size="small"
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </div>

    <!-- 主机详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="selectedHost?.hostname"
      width="800px"
    >
      <div class="host-detail" v-if="selectedHost">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="主机名">{{ selectedHost.hostname }}</el-descriptions-item>
          <el-descriptions-item label="IP地址">{{ selectedHost.ip }}</el-descriptions-item>
          <el-descriptions-item label="操作系统" :span="2">{{ selectedHost.os_version }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="selectedHost.status === 'online' ? 'success' : 'danger'" size="small">
              {{ selectedHost.status === 'online' ? '在线' : '离线' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="最后扫描">{{ selectedHost.last_scan }}</el-descriptions-item>
          <el-descriptions-item label="待更新数">{{ selectedHost.pending_updates }}</el-descriptions-item>
          <el-descriptions-item label="已安装更新">{{ selectedHost.installed_updates }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

// 加载状态
const loading = ref(false)

// 统计数据
const stats = reactive({
  totalHosts: 0,
  upToDate: 0,
  pendingUpdates: 0,
  offline: 0
})

// 筛选
const filterText = ref('')
const osFilter = ref('')
const statusFilter = ref('')

// 表格数据
const tableData = ref([])
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 详情对话框
const detailDialogVisible = ref(false)
const selectedHost = ref(null)

// 加载数据
async function loadData() {
  loading.value = true
  try {
    // TODO: 调用实际 API
    // 模拟数据
    stats.totalHosts = 45
    stats.upToDate = 30
    stats.pendingUpdates = 12
    stats.offline = 3

    tableData.value = [
      { hostname: 'WIN-SERVER01', ip: '192.168.1.101', os_version: 'Windows Server 2019 Datacenter', status: 'online', pending_updates: 5, installed_updates: 120, last_scan: '2024-01-15 10:30:00' },
      { hostname: 'WIN-SERVER02', ip: '192.168.1.102', os_version: 'Windows Server 2019 Standard', status: 'online', pending_updates: 3, installed_updates: 118, last_scan: '2024-01-15 10:25:00' },
      { hostname: 'WIN-SERVER03', ip: '192.168.1.103', os_version: 'Windows Server 2016 Datacenter', status: 'online', pending_updates: 0, installed_updates: 95, last_scan: '2024-01-15 10:20:00' },
      { hostname: 'WIN-DC01', ip: '192.168.1.10', os_version: 'Windows Server 2019 Datacenter', status: 'online', pending_updates: 2, installed_updates: 122, last_scan: '2024-01-15 10:15:00' },
      { hostname: 'WIN-WEB01', ip: '192.168.1.201', os_version: 'Windows Server 2012 R2 Standard', status: 'offline', pending_updates: 15, installed_updates: 80, last_scan: '2024-01-10 09:00:00' }
    ]
    pagination.total = tableData.value.length
  } catch (error) {
    console.error('Failed to load data:', error)
  } finally {
    loading.value = false
  }
}

function handleFilter() {
  pagination.page = 1
  loadData()
}

function handleRefresh() {
  loadData()
}

function handleExport() {
  ElMessage.info('导出功能开发中...')
}

function handlePageChange(page) {
  pagination.page = page
  loadData()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  loadData()
}

function handleScan(row) {
  ElMessage.info(`扫描主机: ${row.hostname}`)
}

function handleUpdate(row) {
  ElMessage.info(`更新主机: ${row.hostname}`)
}

function handleViewDetail(row) {
  selectedHost.value = row
  detailDialogVisible.value = true
}

function refresh() {
  loadData()
}

onMounted(() => {
  loadData()
})

defineExpose({ refresh })
</script>

<style scoped lang="scss">
.windows-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f8f9fa;
}

.page-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #e9ecef;

  &__actions {
    display: flex;
    gap: 8px;
  }
}

.page-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

// 统计卡片
.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.stats-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e9ecef;

  &--primary {
    border-left: 4px solid #0d6efd;
  }

  &--success {
    border-left: 4px solid #198754;
  }

  &--warning {
    border-left: 4px solid #ffc107;
  }

  &--danger {
    border-left: 4px solid #dc3545;
  }

  &__icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    color: #6c757d;
    background: #f8f9fa;
    border-radius: 8px;
  }

  &--primary &__icon {
    color: #0d6efd;
    background: #e7f1ff;
  }

  &--success &__icon {
    color: #198754;
    background: #d1e7dd;
  }

  &--warning &__icon {
    color: #ffc107;
    background: #fff3cd;
  }

  &--danger &__icon {
    color: #dc3545;
    background: #f8d7da;
  }

  &__content {
    flex: 1;
  }

  &__value {
    font-size: 28px;
    font-weight: 700;
    color: #212529;
    line-height: 1;
  }

  &__label {
    font-size: 13px;
    color: #6c757d;
    margin-top: 4px;
  }
}

.filter-section {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.table-section {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e9ecef;

  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #212529;
  }
}

.table-footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid #e9ecef;
}

.text-warning {
  color: #ffc107;
}

.font-bold {
  font-weight: 600;
}

@media (max-width: 1200px) {
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-cards {
    grid-template-columns: 1fr;
  }
}
</style>
