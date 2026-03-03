<template>
  <div class="ops-page-layout">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small">
        <el-form-item label="IP">
          <el-input
            v-model="filters.host_key"
            placeholder="请输入IP"
            style="width: 200px"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="CVE">
          <el-input v-model="filters.vul_id" placeholder="请输入CVE" style="width: 200px" clearable>
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <!-- <el-button type="primary" :loading="loading" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button> -->
          <el-button @click="handleReset">
            <el-icon><RefreshRight /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 操作区 -->
    <div class="ops-action-bar">
      <el-button
        type="primary"
        size="small"
        :disabled="selectedIds.length === 0"
        @click="handleBatchRollback"
      >
        批量回滚
      </el-button>
      <el-button
        type="danger"
        size="small"
        :disabled="selectedIds.length === 0"
        @click="handleBatchDelete"
      >
        删除
      </el-button>
      <span style="flex: 1"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="loading"
        @click="loadData"
        title="刷新"
      >
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <!-- 表格区域 -->
    <div class="ops-table-wrapper">
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="pagedData"
        max-height="calc(100vh - 230px)"
        @selection-change="handleSelectionChange"
        @sort-change="handleSortChange"
        :default-sort="sortState"
      >
        <el-table-column type="selection" width="40" />
        <el-table-column prop="hosts" label="主机" min-width="120" sortable="custom">
          <template #default="{ row }">
            <div class="hosts-cell">
              <div v-for="(host, idx) in parseHosts(row.hosts).slice(0, 2)" :key="idx">
                {{ host }}
              </div>
              <el-popover
                v-if="parseHosts(row.hosts).length > 2"
                placement="top"
                trigger="hover"
                :width="200"
              >
                <template #reference>
                  <span class="more-link">+{{ parseHosts(row.hosts).length - 2 }} 更多</span>
                </template>
                <div class="hosts-popover">
                  <div v-for="(host, idx) in parseHosts(row.hosts)" :key="idx">{{ host }}</div>
                </div>
              </el-popover>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          prop="update_id"
          label="更新维度（CVE/PKG）"
          min-width="160"
          show-overflow-tooltip
        />
        <el-table-column
          prop="patch_id"
          label="修复补丁编号"
          min-width="140"
          show-overflow-tooltip
        />
        <el-table-column prop="update_pkgs" label="更新软件" min-width="280">
          <template #default="{ row }">
            <div class="update-pkgs-cell">
              <div
                v-for="(pkg, idx) in parseUpdatePkgs(row.update_pkgs).slice(0, 2)"
                :key="idx"
                class="pkg-update"
              >
                {{ pkg.old_pkg }}
                <span class="arrow">→</span>
                {{ pkg.new_pkg }}
              </div>
              <el-popover
                v-if="parseUpdatePkgs(row.update_pkgs).length > 2"
                placement="top"
                trigger="hover"
                :width="400"
              >
                <template #reference>
                  <span class="more-link">
                    +{{ parseUpdatePkgs(row.update_pkgs).length - 2 }} 更多
                  </span>
                </template>
                <div class="pkgs-popover">
                  <div
                    v-for="(pkg, idx) in parseUpdatePkgs(row.update_pkgs)"
                    :key="idx"
                    class="pkg-update"
                  >
                    {{ pkg.old_pkg }}
                    <span class="arrow">→</span>
                    {{ pkg.new_pkg }}
                  </div>
                </div>
              </el-popover>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="update_time" label="更新时间" width="180" sortable="custom">
          <template #default="{ row }">
            {{ formatDateTime(row.update_time) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="handleRollback(row)">
              回滚
            </el-button>
            <el-button text type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页区域 -->
    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="totalCount"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 回滚确认对话框 -->
    <el-dialog v-model="rollbackDialogVisible" title="确认回滚" width="500px">
      <div class="rollback-confirm">
        <el-alert type="warning" :closable="false" show-icon>
          <template #title>确定要回滚选中的 {{ rollbackIds.length }} 条更新记录吗？</template>
          <template #default>回滚操作将把软件包恢复到更新前的版本，此操作不可撤销。</template>
        </el-alert>
      </div>
      <template #footer>
        <el-button @click="rollbackDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="rollbackLoading" @click="executeRollback">
          确认回滚
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search, RefreshRight } from '@element-plus/icons-vue'
import { patchRollbackApi } from '../api'

// 加载状态
const loading = ref(false)
const rollbackLoading = ref(false)

// 筛选条件
const filters = reactive({
  host_key: '',
  vul_id: ''
})

// 表格数据
const tableRef = ref(null)
const allData = ref([])
const selectedRows = ref([])

// 排序状态（默认按更新时间倒序）
const sortState = reactive({ prop: 'update_time', order: 'descending' })

// 选中的ID列表
const selectedIds = computed(() => selectedRows.value.map(r => r.id))

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 先按排序状态排序再做过滤
const sortedData = computed(() => {
  const data = [...allData.value]
  const { prop, order } = sortState

  if (!prop || !order) return data

  const direction = order === 'ascending' ? 1 : -1

  const getValue = item => {
    if (prop === 'update_time') return new Date(item.update_time || 0).getTime()
    if (prop === 'hosts') return parseHosts(item.hosts)[0] || ''
    if (prop === 'update_pkgs') return parseUpdatePkgs(item.update_pkgs).length
    const val = item[prop]
    return typeof val === 'string' ? val.toLowerCase() : (val ?? '')
  }

  return data.sort((a, b) => {
    const va = getValue(a)
    const vb = getValue(b)
    if (va === vb) return 0
    return va > vb ? direction : -direction
  })
})

// 过滤后的数据
const filteredData = computed(() => {
  let data = sortedData.value || []

  if (filters.host_key) {
    const keyword = filters.host_key.toLowerCase().trim()
    data = data.filter(item => parseHosts(item.hosts).some(h => h.toLowerCase().includes(keyword)))
  }

  if (filters.vul_id) {
    const keyword = filters.vul_id.toLowerCase().trim()
    data = data.filter(item => item.update_id?.toLowerCase().includes(keyword))
  }

  return data
})

// 分页后的数据
const pagedData = computed(() => {
  const start = (pagination.page - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return filteredData.value.slice(start, end)
})

// 总数（基于前端过滤）
const totalCount = computed(() => filteredData.value.length)

// 回滚对话框
const rollbackDialogVisible = ref(false)
const rollbackIds = ref([])

// 解析主机列表
function parseHosts(hostsStr) {
  if (!hostsStr) return []
  return hostsStr
    .split(',')
    .map(h => h.trim())
    .filter(h => h)
}

// 解析更新软件包
function parseUpdatePkgs(pkgsStr) {
  if (!pkgsStr) return []
  try {
    return JSON.parse(pkgsStr)
  } catch {
    return []
  }
}

// 格式化日期时间
function formatDateTime(dateStr) {
  if (!dateStr) return '-'
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

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const params = {
      page: 1,
      size: 1000,
      host_key: '',
      vul_id: ''
    }
    const response = await patchRollbackApi.getHistUpdatePkgs(params)
    if (response?.data) {
      allData.value = response.data.records || []
    }
  } catch (error) {
    console.error('Failed to load rollback history:', error)
    // 模拟数据
    allData.value = generateMockData()
  } finally {
    loading.value = false
  }
}

// 生成模拟数据
function generateMockData() {
  const data = []
  for (let i = 0; i < 10; i++) {
    data.push({
      id: `hist-${i + 1}`,
      hosts: `192.168.1.${100 + i},192.168.1.${200 + i}`,
      update_id: `CVE-2025-${10000 + i}`,
      patch_id: `RHSA-2025:${20000 + i}`,
      update_pkgs: JSON.stringify([
        { old_pkg: `glibc-2.17-${50 + i}.el7`, new_pkg: `glibc-2.17-${55 + i}.el7` },
        { old_pkg: `openssl-1.0.2k-${10 + i}.el7`, new_pkg: `openssl-1.0.2k-${12 + i}.el7` }
      ]),
      update_time: new Date(Date.now() - i * 86400000).toISOString()
    })
  }
  return data
}

// 事件处理
function handleSelectionChange(selection) {
  selectedRows.value = selection
}

function handleSearch() {
  pagination.page = 1
}

function handleReset() {
  filters.host_key = ''
  filters.vul_id = ''
  pagination.page = 1
}

function handlePageChange(page) {
  pagination.page = page
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
}

function handleSortChange({ prop, order }) {
  // Element Plus 传入 order 为 ascending / descending / null
  if (!order) {
    sortState.prop = 'update_time'
    sortState.order = 'descending'
  } else {
    sortState.prop = prop
    sortState.order = order
  }
  pagination.page = 1
}

// 单条回滚
function handleRollback(row) {
  rollbackIds.value = [row.id]
  rollbackDialogVisible.value = true
}

// 批量回滚
function handleBatchRollback() {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请先选择要回滚的记录')
    return
  }
  rollbackIds.value = [...selectedIds.value]
  rollbackDialogVisible.value = true
}

// 执行回滚
async function executeRollback() {
  rollbackLoading.value = true
  try {
    await patchRollbackApi.rollback({
      histUpdateIds: rollbackIds.value
    })
    ElMessage.success('回滚任务已提交')
    rollbackDialogVisible.value = false
    loadData()
  } catch (error) {
    console.error('Rollback failed:', error)
    ElMessage.error('回滚任务提交失败')
  } finally {
    rollbackLoading.value = false
  }
}

// 单条删除
function handleDelete(row) {
  ElMessageBox.confirm('确定要删除这条更新记录吗？', '确认删除', {
    type: 'warning'
  })
    .then(async () => {
      try {
        await patchRollbackApi.deleteHistUpdatePkgs([row.id])
        ElMessage.success('删除成功')
        loadData()
      } catch (error) {
        ElMessage.error('删除失败')
      }
    })
    .catch(() => {})
}

// 批量删除
function handleBatchDelete() {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请先选择要删除的记录')
    return
  }
  ElMessageBox.confirm(`确定要删除选中的 ${selectedIds.value.length} 条记录吗？`, '确认删除', {
    type: 'warning'
  })
    .then(async () => {
      try {
        await patchRollbackApi.deleteHistUpdatePkgs(selectedIds.value)
        ElMessage.success('删除成功')
        loadData()
      } catch (error) {
        ElMessage.error('删除失败')
      }
    })
    .catch(() => {})
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
// 组件特定样式

.hosts-cell {
  // font-size: 13px;
  line-height: 1.5;
}

.more-link {
  color: var(--el-color-primary);
  cursor: pointer;
  font-size: 12px;

  &:hover {
    text-decoration: underline;
  }
}

.hosts-popover {
  max-height: 200px;
  overflow-y: auto;
  // font-size: 13px;
  line-height: 1.6;
}

.update-pkgs-cell {
  font-size: 12px;
  line-height: 1.5;
}

.pkg-update {
  .arrow {
    color: var(--el-text-color-secondary);
    margin: 0 4px;
  }
}

.pkgs-popover {
  max-height: 250px;
  overflow-y: auto;

  .pkg-update {
    padding: 4px 0;
    border-bottom: 1px dashed var(--el-border-color-light);
    font-size: 12px;

    &:last-child {
      border-bottom: none;
    }
  }
}

.rollback-confirm {
  padding: 8px 0;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 24px;

  &:last-child {
    margin-right: 0;
  }
}

.filter-label {
  font-size: 13px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
}
</style>
