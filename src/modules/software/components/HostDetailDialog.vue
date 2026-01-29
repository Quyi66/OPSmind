<template>
  <el-dialog
    v-model="dialogVisible"
    title="扫描详情"
    width="1200px"
    destroy-on-close
    class="host-detail-dialog"
    @close="handleClose"
  >
    <!-- 主机信息头部 -->
    <div class="host-info-header">
      <h2 class="host-name">{{ hostKey }}</h2>
      <div class="host-meta">
        <p><strong>OS：</strong>{{ machineInfo.os_distro || '-' }} {{ machineInfo.os_version || '' }}</p>
        <p><strong>可用软件包：</strong>{{ machineInfo.yum_count || 0 }}</p>
        <p><strong>已安装软件包：</strong>{{ machineInfo.installed_count || 0 }}</p>
        <p><strong>上次扫描时间：</strong>{{ formatDate(machineInfo.scan_date) }}</p>
      </div>
    </div>

    <!-- Tab 导航 - 简洁样式 -->
    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <el-tab-pane name="repos">
        <template #label>
          <i class="fa fa-laptop-house" /> 仓库
        </template>
      </el-tab-pane>
      <el-tab-pane name="available">
        <template #label>
          <i class="fa fa-cube" /> 可用软件包
        </template>
      </el-tab-pane>
      <el-tab-pane name="installed">
        <template #label>
          <i class="fa fa-backpack" /> 已安装软件包
        </template>
      </el-tab-pane>
    </el-tabs>

    <!-- Tab 内容 -->
    <div class="tab-content">
      <!-- 仓库列表 -->
      <div v-if="activeTab === 'repos'">
        <!-- 状态筛选 -->
        <div class="filter-bar">
          <el-checkbox-group v-model="repoStatus" @change="loadRepos">
            <el-checkbox value="enabled">
              <el-tag type="success" size="small">启用</el-tag>
            </el-checkbox>
            <el-checkbox value="disabled">
              <el-tag type="warning" size="small">未启用</el-tag>
            </el-checkbox>
          </el-checkbox-group>
        </div>
        <el-table
          v-loading="reposLoading"
          :data="reposData"
         
          size="small"
          max-height="350px"
        >
          <el-table-column prop="repo_id" label="仓库" min-width="120" />
          <el-table-column prop="repo_name" label="名称" min-width="150" />
          <el-table-column prop="repo_file" label="配置文件" min-width="150" />
          <el-table-column prop="repo_baseurl" label="地址" min-width="200" show-overflow-tooltip />
          <el-table-column prop="repo_status" label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.repo_status === '启用' ? 'success' : 'warning'" size="small">
                {{ row.repo_status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="176" fixed="right">
            <template #default="{ row, $index }">
              <el-button
                v-if="row.repo_status === '未启用'"
                text
                type="success"
                size="small"
                :loading="isRepoActionLoading(row, $index)"
                @click="handleEnableRepo(row, $index)"
              >
                启用
              </el-button>
              <el-button
                v-if="row.repo_status === '启用'"
                text
                type="warning"
                size="small"
                :loading="isRepoActionLoading(row, $index)"
                @click="handleDisableRepo(row, $index)"
              >
                禁用
              </el-button>
              <el-button
                text
                type="danger"
                size="small"
                @click="handleDeleteRepo(row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="ops-pagination-wrapper">
          <el-pagination
            v-model:current-page="reposPagination.page"
            v-model:page-size="reposPagination.size"
            :page-sizes="[10, 20, 50, 100]"
            :total="reposPagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @size-change="loadRepos"
            @current-change="loadRepos"
          />
        </div>
      </div>

      <!-- 可用软件包 -->
      <div v-if="activeTab === 'available'">
        <!-- 操作按钮在表格上方 -->
        <div class="table-actions">
          <el-button
            type="primary"
            size="small"
            :disabled="selectedAvailablePackages.length === 0"
            @click="handleInstallSelected"
          >
            <i class="fa fa-chevron-circle-right" /> 安装选中的软件包
          </el-button>
        </div>
        <el-table
          ref="availableTableRef"
          v-loading="availableLoading"
          :data="availableData"
         
          size="small"
          max-height="350px"
          @selection-change="handleAvailableSelectionChange"
        >
          <el-table-column type="selection" width="45" />
          <el-table-column prop="pkg_name" label="名称" min-width="150" />
          <el-table-column prop="repo_id" label="仓库" width="120" />
          <el-table-column prop="pkg_envra" label="软件包" min-width="200" show-overflow-tooltip />
          <el-table-column prop="pkg_arch" label="架构" width="80" />
          <el-table-column prop="pkg_version" label="版本号" width="100" />
          <el-table-column prop="pkg_release" label="发行号" width="100" />
        </el-table>
        <div class="ops-pagination-wrapper">
          <el-pagination
            v-model:current-page="availablePagination.page"
            v-model:page-size="availablePagination.size"
            :page-sizes="[10, 20, 50, 100]"
            :total="availablePagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @size-change="loadAvailablePackages"
            @current-change="loadAvailablePackages"
          />
        </div>
      </div>

      <!-- 已安装软件包 -->
      <div v-if="activeTab === 'installed'">
        <!-- 操作按钮在表格上方 -->
        <div class="table-actions">
          <el-button
            type="primary"
            size="small"
            :disabled="selectedInstalledPackages.length === 0"
            :loading="uninstallSelectedLoading"
            @click="handleUninstallSelected"
          >
            <i class="fa fa-chevron-circle-right" /> 卸载选中的软件包
          </el-button>
          <el-button
            type="primary"
            size="small"
            :disabled="selectedInstalledPackages.length === 0"
            :loading="upgradeSelectedLoading"
            @click="handleUpgradeSelected"
          >
            <i class="fa fa-upload" /> 升级选中的软件包
          </el-button>
          <el-button
            type="primary"
            size="small"
            :disabled="selectedInstalledPackages.length === 0"
            :loading="rollbackSelectedLoading"
            @click="handleRollbackSelected"
          >
            <i class="fa fa-undo-alt" /> 回滚选中的软件包
          </el-button>
        </div>
        <el-table
          ref="installedTableRef"
          v-loading="installedLoading"
          :data="installedData"
         
          size="small"
          max-height="350px"
          @selection-change="handleInstalledSelectionChange"
        >
          <el-table-column type="selection" width="45" />
          <el-table-column prop="pkg_id" label="软件包" min-width="200" show-overflow-tooltip />
          <el-table-column prop="pkg_name" label="名称" min-width="120" />
          <el-table-column prop="pkg_version" label="安装版本" width="100" />
          <el-table-column prop="available_pkg_version" label="可升级版本" width="110">
            <template #default="{ row }">
              <span :class="{ 'text-success': row.available_pkg_version !== '无' }">
                {{ row.available_pkg_version }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="pkg_arch" label="架构" width="80" />
          <el-table-column prop="scan_timestamp" label="上次扫描时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.scan_timestamp) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="102" fixed="right">
            <template #default="{ row, $index }">
              <el-button
                v-if="row.available_pkg_version !== '无'"
                text
                type="primary"
                size="small"
                @click="handleUpgradePackage(row)"
              >
                升级
              </el-button>
              <el-button
                v-if="row.available_pkg_version === '无'"
                text
                type="primary"
                size="small"
                :loading="isInstalledActionLoading(row, $index)"
                @click="handleRollbackPackage(row, $index)"
              >
                回滚
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="ops-pagination-wrapper">
          <el-pagination
            v-model:current-page="installedPagination.page"
            v-model:page-size="installedPagination.size"
            :page-sizes="[10, 20, 50, 100]"
            :total="installedPagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @size-change="loadInstalledPackages"
            @current-change="loadInstalledPackages"
          />
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { hostOverviewApi } from '../api'
import { useJobPolling } from '@/composables/useJobPolling'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  hostId: {
    type: String,
    default: ''
  },
  hostKey: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'refresh'])

const dialogVisible = ref(false)
const activeTab = ref('repos')
const repoActionLoading = ref({})
const { startPolling } = useJobPolling()

// 主机信息
const machineInfo = ref({
  os_distro: '',
  os_version: '',
  yum_count: 0,
  installed_count: 0,
  scan_date: null
})

// 仓库数据
const reposLoading = ref(false)
const reposData = ref([])
const repoStatus = ref(['enabled'])
const reposPagination = reactive({
  page: 1,
  size: 10,
  total: 0
})

function resolveRepoKeys(row, index = 0) {
  const repoId = row?.refid || row?.repo_id || row?.repo_name || row?.repo_file
  const loadingKey = repoId || [
    'row',
    index,
    row?.repo_status || 'unknown-status'
  ].join('|')
  return { repoId, loadingKey }
}

function setRepoActionLoading(loadingKey, status) {
  if (!loadingKey) return
  repoActionLoading.value = {
    ...repoActionLoading.value,
    [loadingKey]: status
  }
}

function isRepoActionLoading(row, index) {
  const { loadingKey } = resolveRepoKeys(row, index)
  if (!loadingKey) return false
  return !!repoActionLoading.value[loadingKey]
}

// 可用软件包
const availableTableRef = ref(null)
const availableLoading = ref(false)
const availableData = ref([])
const selectedAvailablePackages = ref([])
const availablePagination = reactive({
  page: 1,
  size: 10,
  total: 0
})

// 已安装软件包
const installedTableRef = ref(null)
const installedLoading = ref(false)
const installedData = ref([])
const selectedInstalledPackages = ref([])
const installedPagination = reactive({
  page: 1,
  size: 10,
  total: 0
})
const uninstallSelectedLoading = ref(false)
const upgradeSelectedLoading = ref(false)
const rollbackSelectedLoading = ref(false)
const installedActionLoading = ref({})

function resolveInstalledKeys(row, index = 0) {
  const pkgId = row?.pkg_id || row?.pkg_name
  const loadingKey = pkgId || ['installed-row', index, row?.pkg_version || ''].join('|')
  return { pkgId, loadingKey }
}

function setInstalledActionLoading(loadingKey, status) {
  if (!loadingKey) return
  installedActionLoading.value = {
    ...installedActionLoading.value,
    [loadingKey]: status
  }
}

function isInstalledActionLoading(row, index) {
  const { loadingKey } = resolveInstalledKeys(row, index)
  if (!loadingKey) return false
  return !!installedActionLoading.value[loadingKey]
}

// 格式化日期
function formatDate(timestamp) {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 加载主机信息
async function loadMachineInfo() {
  if (!props.hostId) return
  try {
    const response = await hostOverviewApi.getMachineInfo(props.hostId)
    const data = response?.data || response
    if (data?.records?.[0]) {
      machineInfo.value = data.records[0]
    }
  } catch (error) {
    console.error('Failed to load machine info:', error)
  }
}

// 加载仓库列表
async function loadRepos() {
  if (!props.hostId) return
  reposLoading.value = true
  try {
    const response = await hostOverviewApi.getMachineRepos({
      hostId: props.hostId,
      repoStatus: repoStatus.value.join(','),
      page: reposPagination.page,
      size: reposPagination.size
    })
    const data = response?.data || response
    reposData.value = data?.records || []
    reposPagination.total = data?.total || 0
  } catch (error) {
    console.error('Failed to load repos:', error)
    reposData.value = []
    reposPagination.total = 0
  } finally {
    reposLoading.value = false
  }
}

// 加载可用软件包
async function loadAvailablePackages() {
  if (!props.hostId) return
  availableLoading.value = true
  try {
    const response = await hostOverviewApi.getMachineAvailablePackages({
      hostId: props.hostId,
      page: availablePagination.page,
      size: availablePagination.size
    })
    const data = response?.data || response
    availableData.value = data?.records || []
    availablePagination.total = data?.total || 0
  } catch (error) {
    console.error('Failed to load available packages:', error)
    availableData.value = []
    availablePagination.total = 0
  } finally {
    availableLoading.value = false
  }
}

// 加载已安装软件包
async function loadInstalledPackages() {
  if (!props.hostId) return
  installedLoading.value = true
  try {
    const response = await hostOverviewApi.getMachineInstalledPackages({
      hostId: props.hostId,
      page: installedPagination.page,
      size: installedPagination.size
    })
    const data = response?.data || response
    installedData.value = data?.records || []
    installedPagination.total = data?.total || 0
  } catch (error) {
    console.error('Failed to load installed packages:', error)
    installedData.value = []
    installedPagination.total = 0
  } finally {
    installedLoading.value = false
  }
}

// Tab 切换
function handleTabChange(tabName) {
  if (tabName === 'repos') {
    loadRepos()
  } else if (tabName === 'available') {
    loadAvailablePackages()
  } else if (tabName === 'installed') {
    loadInstalledPackages()
  }
}

// 启用仓库
async function handleEnableRepo(row, index) {
  const { repoId, loadingKey } = resolveRepoKeys(row, index)
  try {
    await ElMessageBox.confirm('确认启用该镜像源？', '确认', { type: 'info' })
    setRepoActionLoading(loadingKey, true)

    const response = await hostOverviewApi.toggleRepoStatus({
      repoName: repoId,
      repoStatus: 'yes',
      hostId: props.hostId,
      repoUrl: row.repo_baseurl,
      repoDesc: row.repo_name,
      repoFile: row.repo_file
    })

    const data = response?.data ?? response
    const runResult = Array.isArray(data) ? data[0] : data

    if (runResult?.runId) {
      startPolling(runResult.runId, {
        interval: 1000,
        successMessage: '启用成功',
        errorMessage: '启用失败',
        onSuccess: () => {
          loadRepos()
        },
        onComplete: () => {
          setRepoActionLoading(loadingKey, false)
        }
      })
    } else {
      ElMessage.success('启用成功')
      loadRepos()
      setRepoActionLoading(loadingKey, false)
    }
  } catch (error) {
    setRepoActionLoading(loadingKey, false)
    if (error !== 'cancel') {
      ElMessage.error('启用失败')
    }
  }
}

// 禁用仓库
async function handleDisableRepo(row, index) {
  const { repoId, loadingKey } = resolveRepoKeys(row, index)
  try {
    await ElMessageBox.confirm('确认禁用该镜像源？', '确认', { type: 'warning' })
    setRepoActionLoading(loadingKey, true)

    const response = await hostOverviewApi.toggleRepoStatus({
      repoName: repoId,
      repoStatus: 'no',
      hostId: props.hostId,
      repoUrl: row.repo_baseurl,
      repoDesc: row.repo_name,
      repoFile: row.repo_file
    })

    const data = response?.data ?? response
    const runResult = Array.isArray(data) ? data[0] : data

    if (runResult?.runId) {
      startPolling(runResult.runId, {
        interval: 1000,
        successMessage: '禁用成功',
        errorMessage: '禁用失败',
        onSuccess: () => {
          loadRepos()
        },
        onComplete: () => {
          setRepoActionLoading(loadingKey, false)
        }
      })
    } else {
      ElMessage.success('禁用成功')
      loadRepos()
      setRepoActionLoading(loadingKey, false)
    }
  } catch (error) {
    setRepoActionLoading(loadingKey, false)
    if (error !== 'cancel') {
      ElMessage.error('禁用失败')
    }
  }
}

// 删除仓库
async function handleDeleteRepo(row) {
  try {
    await ElMessageBox.confirm('确认删除该仓库？', '确认删除', { type: 'warning' })
    await hostOverviewApi.deleteHostRepo({
      repoName: row.refid,
      hostId: props.hostId,
      repoFile: row.repo_file
    })
    ElMessage.success('删除成功')
    loadRepos()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 关闭弹窗
function handleClose() {
  emit('update:modelValue', false)
}

// 监听显示状态
watch(() => props.modelValue, (val) => {
  dialogVisible.value = val
  if (val && props.hostId) {
    activeTab.value = 'repos'
    loadMachineInfo()
    loadRepos()
  }
})

watch(dialogVisible, (val) => {
  emit('update:modelValue', val)
})

// 可用软件包选择变更
function handleAvailableSelectionChange(selection) {
  selectedAvailablePackages.value = selection
}

// 已安装软件包选择变更
function handleInstalledSelectionChange(selection) {
  selectedInstalledPackages.value = selection
}

// 安装选中的软件包
async function handleInstallSelected() {
  const pkgNames = selectedAvailablePackages.value.map(pkg => pkg.pkg_name).join(',')
  try {
    await ElMessageBox.confirm('确认安装选中的软件包？', '确认', { type: 'info' })
    await hostOverviewApi.installPackages({
      installPkgs: pkgNames,
      hostId: props.hostId
    })
    ElMessage.success('安装任务已提交')
    loadAvailablePackages()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('安装失败')
    }
  }
}

// 卸载选中的软件包
async function handleUninstallSelected() {
  const pkgNames = selectedInstalledPackages.value.map(pkg => pkg.pkg_name).join(',')
  try {
    await ElMessageBox.confirm('确认卸载选中的软件包？', '确认', { type: 'warning' })
    uninstallSelectedLoading.value = true

    const response = await hostOverviewApi.uninstallPackages({
      pkgList: pkgNames,
      hostId: props.hostId
    })

    const data = response?.data ?? response
    const runResult = Array.isArray(data) ? data[0] : data

    if (runResult?.runId) {
      startPolling(runResult.runId, {
        interval: 2000,
        successMessage: '卸载成功',
        errorMessage: '卸载失败',
        onSuccess: () => {
          loadInstalledPackages()
        },
        onComplete: () => {
          uninstallSelectedLoading.value = false
        }
      })
    } else {
      ElMessage.success('卸载任务已提交')
      loadInstalledPackages()
      uninstallSelectedLoading.value = false
    }
  } catch (error) {
    uninstallSelectedLoading.value = false
    if (error !== 'cancel') {
      ElMessage.error('卸载失败')
    }
  }
}

// 升级选中的软件包
async function handleUpgradeSelected() {
  const pkgNames = selectedInstalledPackages.value.map(pkg => pkg.pkg_name).join(',')
  try {
    await ElMessageBox.confirm('确认升级选中的软件包？', '确认', { type: 'info' })
    upgradeSelectedLoading.value = true

    const response = await hostOverviewApi.upgradePackages({
      updatePkgs: pkgNames,
      hostId: props.hostId
    })

    const data = response?.data ?? response
    const runResult = Array.isArray(data) ? data[0] : data

    if (runResult?.runId) {
      startPolling(runResult.runId, {
        interval: 2000,
        successMessage: '升级成功',
        errorMessage: '升级失败',
        onSuccess: () => {
          loadInstalledPackages()
        },
        onComplete: () => {
          upgradeSelectedLoading.value = false
        }
      })
    } else {
      ElMessage.success('升级任务已提交')
      loadInstalledPackages()
      upgradeSelectedLoading.value = false
    }
  } catch (error) {
    upgradeSelectedLoading.value = false
    if (error !== 'cancel') {
      ElMessage.error('升级失败')
    }
  }
}

// 回滚选中的软件包
async function handleRollbackSelected() {
  const pkgNames = selectedInstalledPackages.value.map(pkg => pkg.pkg_name).join(',')
  try {
    await ElMessageBox.confirm('确认回滚选中的软件包？', '确认', { type: 'warning' })
    rollbackSelectedLoading.value = true
    await hostOverviewApi.rollbackPackages({
      updatePkgs: pkgNames,
      hostId: props.hostId
    })
    ElMessage.success('回滚任务已提交')
    loadInstalledPackages()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('回滚失败')
    }
  } finally {
    rollbackSelectedLoading.value = false
  }
}

// 升级单个软件包
async function handleUpgradePackage(row) {
  try {
    await ElMessageBox.confirm('确认升级该软件包？', '确认', { type: 'info' })
    await hostOverviewApi.upgradePackages({
      updatePkgs: row.pkg_name,
      hostId: props.hostId
    })
    ElMessage.success('升级任务已提交')
    loadInstalledPackages()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('升级失败')
    }
  }
}

// 回滚单个软件包
async function handleRollbackPackage(row, index) {
  const { loadingKey } = resolveInstalledKeys(row, index)
  try {
    await ElMessageBox.confirm('确认回滚该软件包？', '确认', { type: 'warning' })
    setInstalledActionLoading(loadingKey, true)
    await hostOverviewApi.rollbackPackages({
      updatePkgs: row.pkg_name,
      hostId: props.hostId
    })
    ElMessage.success('回滚任务已提交')
    loadInstalledPackages()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('回滚失败')
    }
  } finally {
    setInstalledActionLoading(loadingKey, false)
  }
}
</script>

<style scoped lang="scss">
.host-detail-dialog {
  :deep(.el-dialog__body) {
    padding-top: 0;
  }
}

.host-info-header {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;

  .host-name {
    font-size: 20px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 12px 0;
  }

  .host-meta {
    p {
      margin: 4px 0;
      font-size: 14px;
      color: #606266;
    }
  }
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.tab-content {
  min-height: 300px;
}

.table-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.text-success {
  color: #67c23a;
  font-weight: 500;
}

/* 使用全局的 ops-pagination-wrapper 样式 */
</style>
