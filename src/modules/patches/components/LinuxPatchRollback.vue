<template>
  <div class="patch-rollback">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="page-header__title">补丁回退</div>
      <div class="page-header__actions">
        <el-button
          type="danger"
          plain
          :disabled="selectedIds.length === 0"
          @click="handleBatchDelete"
        >
          <i class="fa fa-trash-alt" />
          删除
        </el-button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="page-content">
      <!-- 筛选工具栏 -->
      <div class="filter-toolbar">
        <div class="filter-item">
          <span class="filter-label">IP</span>
          <el-input
            v-model="filters.host_key"
            placeholder="请输入IP"
            style="width: 200px"
            clearable
            size="small"
          />
        </div>
        <div class="filter-item">
          <span class="filter-label">CVE</span>
          <el-input
            v-model="filters.vul_id"
            placeholder="请输入CVE"
            style="width: 200px"
            clearable
            size="small"
          />
        </div>
        <el-button type="primary" size="small" @click="handleSearch">
          <i class="fa fa-search" />
          查询
        </el-button>
        <el-button size="small" @click="handleReset">
          <i class="fa fa-redo" />
          重置
        </el-button>
      </div>

      <!-- 更新记录表格 -->
      <div class="table-section">
        <el-table
          ref="tableRef"
          v-loading="loading"
          :data="tableData"
          stripe
          style="width: 100%"
          size="small"
          height="100%"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="40" />
          <el-table-column prop="hosts" label="主机" min-width="150">
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
          <el-table-column prop="update_id" label="更新维度（CVE/PKG）" min-width="160" show-overflow-tooltip />
          <el-table-column prop="patch_id" label="修复补丁编号" min-width="140" show-overflow-tooltip />
          <el-table-column prop="update_pkgs" label="更新软件" min-width="280">
            <template #default="{ row }">
              <div class="update-pkgs-cell">
                <div v-for="(pkg, idx) in parseUpdatePkgs(row.update_pkgs).slice(0, 2)" :key="idx" class="pkg-update">
                  {{ pkg.old_pkg }} <span class="arrow">→</span> {{ pkg.new_pkg }}
                </div>
                <el-popover
                  v-if="parseUpdatePkgs(row.update_pkgs).length > 2"
                  placement="top"
                  trigger="hover"
                  :width="400"
                >
                  <template #reference>
                    <span class="more-link">+{{ parseUpdatePkgs(row.update_pkgs).length - 2 }} 更多</span>
                  </template>
                  <div class="pkgs-popover">
                    <div v-for="(pkg, idx) in parseUpdatePkgs(row.update_pkgs)" :key="idx" class="pkg-update">
                      {{ pkg.old_pkg }} <span class="arrow">→</span> {{ pkg.new_pkg }}
                    </div>
                  </div>
                </el-popover>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="update_time" label="更新时间" width="160" sortable>
            <template #default="{ row }">
              {{ formatDateTime(row.update_time) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="{ row }">
              <el-button
                type="info"
                size="small"
                round
                @click="handleRollback(row)"
              >
                <i class="fa fa-history" />
                回退
              </el-button>
              <el-button
                type="danger"
                size="small"
                round
                @click="handleDelete(row)"
              >
                <i class="fa fa-trash-alt" />
                删除
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

      <!-- 批量回退按钮 -->
      <div class="batch-actions">
        <el-button
          type="primary"
          plain
          :disabled="selectedIds.length === 0"
          @click="handleBatchRollback"
        >
          <i class="fa fa-history" />
          批量回退
        </el-button>
      </div>
    </div>

    <!-- 回退确认对话框 -->
    <el-dialog
      v-model="rollbackDialogVisible"
      title="确认回退"
      width="500px"
    >
      <div class="rollback-confirm">
        <el-alert type="warning" :closable="false" show-icon>
          <template #title>
            确定要回退选中的 {{ rollbackIds.length }} 条更新记录吗？
          </template>
          <template #default>
            回退操作将把软件包恢复到更新前的版本，此操作不可撤销。
          </template>
        </el-alert>
      </div>
      <template #footer>
        <el-button @click="rollbackDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="rollbackLoading" @click="executeRollback">
          确认回退
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
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
const tableData = ref([])
const selectedRows = ref([])

// 选中的ID列表
const selectedIds = computed(() => selectedRows.value.map(r => r.id))

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 回退对话框
const rollbackDialogVisible = ref(false)
const rollbackIds = ref([])

// 解析主机列表
function parseHosts(hostsStr) {
  if (!hostsStr) return []
  return hostsStr.split(',').map(h => h.trim()).filter(h => h)
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
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).replace(/\//g, '-')
}

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      size: pagination.pageSize,
      host_key: filters.host_key,
      vul_id: filters.vul_id
    }
    const response = await patchRollbackApi.getHistUpdatePkgs(params)
    if (response?.data) {
      tableData.value = response.data.records || []
      pagination.total = response.data.total || 0
    }
  } catch (error) {
    console.error('Failed to load rollback history:', error)
    // 模拟数据
    tableData.value = generateMockData()
    pagination.total = tableData.value.length
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
  loadData()
}

function handleReset() {
  filters.host_key = ''
  filters.vul_id = ''
  pagination.page = 1
  loadData()
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

// 单条回退
function handleRollback(row) {
  rollbackIds.value = [row.id]
  rollbackDialogVisible.value = true
}

// 批量回退
function handleBatchRollback() {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请先选择要回退的记录')
    return
  }
  rollbackIds.value = [...selectedIds.value]
  rollbackDialogVisible.value = true
}

// 执行回退
async function executeRollback() {
  rollbackLoading.value = true
  try {
    await patchRollbackApi.rollback({
      histUpdateIds: rollbackIds.value
    })
    ElMessage.success('回退任务已提交')
    rollbackDialogVisible.value = false
    loadData()
  } catch (error) {
    console.error('Rollback failed:', error)
    ElMessage.error('回退任务提交失败')
  } finally {
    rollbackLoading.value = false
  }
}

// 单条删除
function handleDelete(row) {
  ElMessageBox.confirm('确定要删除这条更新记录吗？', '确认删除', {
    type: 'warning'
  }).then(async () => {
    try {
      await patchRollbackApi.deleteHistUpdatePkgs([row.id])
      ElMessage.success('删除成功')
      loadData()
    } catch (error) {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

// 批量删除
function handleBatchDelete() {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请先选择要删除的记录')
    return
  }
  ElMessageBox.confirm(`确定要删除选中的 ${selectedIds.value.length} 条记录吗？`, '确认删除', {
    type: 'warning'
  }).then(async () => {
    try {
      await patchRollbackApi.deleteHistUpdatePkgs(selectedIds.value)
      ElMessage.success('删除成功')
      loadData()
    } catch (error) {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
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
.patch-rollback {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e9ecef;

  &__title {
    font-size: 16px;
    font-weight: 600;
    color: #212529;
  }

  &__actions {
    display: flex;
    gap: 8px;
  }
}

.page-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  overflow: hidden;
  min-height: 0;
}

.filter-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 4px;
  flex-wrap: wrap;

  .filter-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .filter-label {
    font-size: 13px;
    color: #495057;
    white-space: nowrap;
  }
}

.table-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  min-height: 0;

  :deep(.el-table) {
    flex: 1;
  }
}

.table-footer {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid #e9ecef;
  background: #fff;
}

.batch-actions {
  flex-shrink: 0;
  margin-top: 16px;
}

.hosts-cell {
  font-size: 13px;
  line-height: 1.5;
}

.more-link {
  color: #0d6efd;
  cursor: pointer;
  font-size: 12px;

  &:hover {
    text-decoration: underline;
  }
}

.hosts-popover {
  max-height: 200px;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.6;
}

.update-pkgs-cell {
  font-size: 12px;
  line-height: 1.5;
}

.pkg-update {
  .arrow {
    color: #6c757d;
    margin: 0 4px;
  }
}

.pkgs-popover {
  max-height: 250px;
  overflow-y: auto;

  .pkg-update {
    padding: 4px 0;
    border-bottom: 1px dashed #e9ecef;
    font-size: 12px;

    &:last-child {
      border-bottom: none;
    }
  }
}

.rollback-confirm {
  padding: 8px 0;
}
</style>
