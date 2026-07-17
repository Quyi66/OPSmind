<template>
  <div class="ops-page-layout">
    <div class="ops-filter-bar">
      <el-form inline size="small">
        <el-form-item label="过滤">
          <el-select
            v-model="filterParams.availablePkg"
            placeholder="全部"
            style="width: auto"
            multiple @change="handleSearch">
            <el-option label="全部" value="all" />
            <el-option label="可升级" value="可升级" />
          </el-select>
        </el-form-item>

        <el-form-item label="搜索">
          <el-input
            v-model="filterParams.keyword"
            placeholder="软件包名称/ID"
            style="width: 240px"
            clearable
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix>
              <i class="fa fa-search" />
            </template>
          </el-input>
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

    <div class="ops-action-bar">
      <el-button
        type="primary"
        size="small"
        :disabled="selectedRows.length === 0"
        @click="handleUpgrade"
      >
        <i class="fa fa-chevron-circle-up" style="margin-right: 4px" />
        批量升级
      </el-button>
      <el-button
        type="primary"
        size="small"
        :disabled="selectedRows.length === 0"
        @click="handleRollback"
      >
        <i class="fa fa-undo-alt" style="margin-right: 4px" />
        批量回滚
      </el-button>
      <el-button
        type="danger"
        size="small"
        :disabled="selectedRows.length === 0"
        @click="handleUninstall"
      >
        <i class="fa fa-minus-circle" style="margin-right: 4px" />
        批量卸载
      </el-button>
      <div style="flex: 1"></div>
      <el-button circle size="small" @click="loadData">
        <el-icon><Refresh /></el-icon>
      </el-button>
    </div>

    <div class="ops-table-wrapper" v-loading="loading">
      <el-table
        :data="tableData"
        style="width: 100%"
        height="100%"
        size="small"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" align="center" />

        <el-table-column prop="pkg_name" label="名称" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link type="primary" underline="never" @click="openDetail(row)">
              {{ row.pkg_name }}
            </el-link>
          </template>
        </el-table-column>

        <el-table-column prop="pkg_id" label="软件包" min-width="250" show-overflow-tooltip />
        <el-table-column prop="pkg_arch" label="架构" width="100" />
        <el-table-column prop="pkg_version" label="当前版本" min-width="150" />
        <el-table-column prop="available_pkg_version" label="可升级版本" min-width="150">
          <template #default="{ row }">
            <el-tag
              v-if="row.available_pkg_version && row.available_pkg_version !== '无'"
              type="success"
              effect="plain"
            >
              {{ row.available_pkg_version }}
            </el-tag>
            <el-tag v-else type="info" effect="plain">无</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 软件包详情弹窗 - 主机列表 -->
    <el-dialog
      v-model="detailVisible"
      :title="detailTitle"
      width="800px"
      destroy-on-close
      append-to-body
    >
      <div class="ops-table-wrapper" style="height: 400px; margin: 0" v-loading="detailLoading">
        <el-table :data="detailData" style="width: 100%" height="100%" size="small">
          <el-table-column prop="host_key" label="主机及IP" min-width="150" show-overflow-tooltip />
          <el-table-column prop="os_distro" label="操作系统" width="120" />
          <el-table-column prop="os_version" label="系统版本" width="120" />
          <el-table-column prop="scan_timestamp" label="最后扫描时间" min-width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.scan_timestamp) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="ops-pagination-wrapper" style="padding-right: 0; border: none">
        <el-pagination
          v-model:current-page="detailPagination.page"
          v-model:page-size="detailPagination.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="detailPagination.total"
          layout="total, sizes, prev, pager, next"
          size="small"
          background
          @size-change="handleDetailSizeChange"
          @current-change="handleDetailCurrentChange"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatDateTime as formatDateTimeGlobal } from '@/utils/date'
import { Search, RefreshRight, Refresh } from '@element-plus/icons-vue'
import { packageApi } from '../api'

const loading = ref(false)
const tableData = ref([])
const selectedRows = ref([])

const filterParams = reactive({
  availablePkg: ['all', '可升级'], // 默认全选
  keyword: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 详情弹窗相关
const detailVisible = ref(false)
const detailTitle = ref('')
const detailLoading = ref(false)
const detailData = ref([])
const currentDetailPkgId = ref('')
const detailPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

async function loadData() {
  loading.value = true
  try {
    const availablePkgStr = Array.isArray(filterParams.availablePkg)
      ? filterParams.availablePkg.join(',')
      : filterParams.availablePkg || 'all'

    const response = await packageApi.getAllInstalledPackages({
      page: pagination.page,
      size: pagination.pageSize,
      availablePkg: availablePkgStr,
      filter: filterParams.keyword ? `pkg_name|pkg_id:*${filterParams.keyword}*` : ''
    })

    const data = response?.data || response
    tableData.value = data.records || []
    pagination.total = data.total || 0
  } catch (error) {
    console.error('Failed to load installed packages:', error)
    ElMessage.error('加载软件包失败')
  } finally {
    loading.value = false
  }
}

// 加载详情数据(主机列表)
async function loadDetailData() {
  detailLoading.value = true
  try {
    // Angular 参数: params: { pkgs: ... }
    const response = await packageApi.getInstalledPkgMachines({
      pkgId: currentDetailPkgId.value,
      page: detailPagination.page,
      size: detailPagination.pageSize
    })

    const data = response?.data || response
    detailData.value = data.records || []
    detailPagination.total = data.total || 0
  } catch (error) {
    console.error('Failed to load pkg machines:', error)
    ElMessage.error('加载主机列表失败')
  } finally {
    detailLoading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  loadData()
}

function handleReset() {
  filterParams.availablePkg = ['all', '可升级']
  filterParams.keyword = ''
  handleSearch()
}

function handleSelectionChange(selection) {
  selectedRows.value = selection
}

function handleSizeChange(val) {
  pagination.pageSize = val
  loadData()
}

function handleCurrentChange(val) {
  pagination.page = val
  loadData()
}

// 详情弹窗分页
function handleDetailSizeChange(val) {
  detailPagination.pageSize = val
  loadDetailData()
}

function handleDetailCurrentChange(val) {
  detailPagination.page = val
  loadDetailData()
}

// 格式化时间
function formatDateTime(dateStr) {
  if (!dateStr) return ''
  return formatDateTimeGlobal(dateStr)
}

// 打开详情
function openDetail(row) {
  detailTitle.value = `目标主机 - ${row.pkg_name}`
  currentDetailPkgId.value = row.pkg_id || row.pkg_name // 优先使用ID，兜底用Name
  detailPagination.page = 1
  detailData.value = []

  detailVisible.value = true
  loadDetailData()
}

// 批量升级
function handleUpgrade() {
  const count = selectedRows.value.length
  ElMessageBox.confirm(`确定要升级选中的 ${count} 个软件包吗？`, '批量升级', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    // 调用升级API
    // 示例：const pkgs = selectedRows.value.map(row => row.pkg_id)
    // packageApi.upgradePackages({ updatePkgs: pkgs })
    ElMessage.success('任务已提交')
  })
}

// 批量回滚
function handleRollback() {
  const count = selectedRows.value.length
  ElMessageBox.confirm(`确定要回滚选中的 ${count} 个软件包吗？`, '批量回滚', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    ElMessage.success('任务已提交')
  })
}

// 批量卸载
function handleUninstall() {
  const count = selectedRows.value.length
  ElMessageBox.confirm(`确定要卸载选中的 ${count} 个软件包吗？`, '批量卸载', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    ElMessage.success('任务已提交')
  })
}

onMounted(() => {
  loadData()
})
</script>
