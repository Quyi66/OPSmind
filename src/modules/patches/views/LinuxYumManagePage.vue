<template>
  <div class="ops-page-layout linux-yum-manage-page">
    <div class="ops-filter-bar">
      <el-form :model="hostFilters" inline size="small">
        <el-form-item label="关键词">
          <el-input
            v-model="hostFilterText"
            placeholder="搜索..."
            style="width: 200px"
            clearable
            maxlength="50"
          >
            <template #prefix>
              <el-icon>
                <Search />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
      </el-form>
    </div>

    <div class="ops-action-bar">
      <el-button type="primary" size="small" @click="handleScanRepoList">YUM源清单扫描</el-button>
      <span style="flex: 1"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="hostLoading"
        @click="loadHostData"
        title="刷新"
      >
        <el-icon v-show="!hostLoading">
          <Refresh />
        </el-icon>
      </el-button>
    </div>

    <div class="ops-table-wrapper">
      <el-table v-loading="hostLoading" :data="paginatedHostTableData" height="100%">
        <el-table-column prop="$data_owner" label="主机" min-width="150">
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="handleViewHostDetail(row)">
              {{ row.$data_owner }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="os_distro" label="操作系统" min-width="200" sortable />
        <el-table-column prop="os_version" label="操作系统版本" min-width="150" sortable />
        <el-table-column prop="yum_count" label="已配置yum源数量" min-width="130" sortable />
      </el-table>
    </div>

    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="hostPagination.page"
        v-model:page-size="hostPagination.pageSize"
        :page-sizes="[10, 20, 50, 500]"
        :total="filteredHostTableData.length"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handleHostSizeChange"
        @current-change="handleHostPageChange"
      />
    </div>

    <el-dialog
      v-model="selectHostDialogVisible"
      title="选择目标主机"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="select-host-dialog-content">
        <AcmDeviceSelector
          v-model="selectedDevices"
          ci-types="[auto]"
          :options="{
            selectMode: 'host,group,tag,input,recently',
            selector: 'multiple',
            label: '选择设备'
          }"
        />
      </div>
      <template #footer>
        <el-button @click="selectHostDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="jobExecuting"
          :disabled="selectedDevices.length === 0"
          @click="executeScanJob"
        >
          开始扫描
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="hostDetailDialogVisible"
      :title="`${currentHostDetail?.$data_owner || ''} - YUM源详情`"
      width="1400px"
      :close-on-click-modal="false"
    >
      <div class="host-detail-dialog-content">
        <div class="ops-filter-bar">
          <el-form inline size="small">
            <el-form-item label="状态">
              <el-select v-model="detailRepoStatus" placeholder="请选择" style="width: 120px">
                <el-option value="enabled" label="启用" />
                <el-option value="disabled" label="禁用" />
              </el-select>
            </el-form-item>
            <el-form-item label="关键词">
              <el-input
                v-model="detailFilterText"
                placeholder="搜索名称、地址..."
                style="width: 220px"
                clearable
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleDetailFilterChange">
                <el-icon><Search /></el-icon>
                搜索
              </el-button>
              <el-button @click="handleDetailReset">
                <el-icon><RefreshRight /></el-icon>
                重置
              </el-button>
              <el-button :loading="hostDetailLoading" @click="loadHostRepoDetail">
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <el-table
          v-loading="hostDetailLoading"
          :data="paginatedRepoDetailData"
          style="width: 100%"
          size="small"
          max-height="500"
        >
          <el-table-column prop="$data_owner" label="主机" min-width="100" />
          <el-table-column prop="repo-name" label="名称" min-width="120" />
          <el-table-column prop="repo-pkgs" label="软件包数" min-width="80" />
          <el-table-column prop="repo-baseurl" label="Base URL" min-width="250" show-overflow-tooltip>
            <template #default="{ row }">
              <div class="url-badges">
                <el-tag
                  v-for="(url, idx) in parseUrls(row['repo-baseurl'])"
                  :key="idx"
                  type="info"
                  size="small"
                  class="url-tag"
                >
                  {{ url }}
                </el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="repo-file" label="YUM文件" min-width="150" show-overflow-tooltip />
          <el-table-column prop="repo-status" label="状态" width="90" align="left">
            <template #default="{ row }">
              <el-tag :type="row['repo-status'] === 'enabled' ? 'success' : 'info'" size="small">
                {{ row['repo-status'] === 'enabled' ? 'Enabled' : 'Disabled' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="repo-size" label="大小" width="80" />
          <el-table-column prop="repo-updated" label="更新时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row['repo-updated']) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="88" fixed="right" align="left">
            <template #default="{ row }">
              <el-button
                v-if="row['repo-status'] === 'disabled'"
                text
                type="primary"
                size="small"
                @click="handleEnableRepo(row)"
              >
                启用
              </el-button>
              <el-button
                v-if="row['repo-status'] === 'enabled'"
                text
                type="warning"
                size="small"
                @click="handleDisableRepo(row)"
              >
                禁用
              </el-button>
              <el-button text type="danger" size="small" @click="handleDeleteRepo(row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="dialog-pagination">
          <el-pagination
            v-model:current-page="detailPagination.page"
            v-model:page-size="detailPagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="filteredRepoDetailData.length"
            layout="total, sizes, prev, pager, next, jumper"
            size="small"
            background
          />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search, RefreshRight } from '@element-plus/icons-vue'
import { yumManageApi } from '../api'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import { runJob } from '@/modules/automation/api/command'
import { useJobPolling } from '@/composables/useJobPolling'

const { startPolling } = useJobPolling()
const YUM_JOB_ID = 'IxL8nr'

const hostLoading = ref(false)
const hostFilterText = ref('')
const hostTableData = ref([])
const hostFilters = reactive({
  keyword: ''
})
const hostPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})
const selectHostDialogVisible = ref(false)
const selectedDevices = ref([])
const jobExecuting = ref(false)

const hostDetailDialogVisible = ref(false)
const hostDetailLoading = ref(false)
const currentHostDetail = ref(null)
const hostRepoDetailData = ref([])
const detailRepoStatus = ref('enabled')
const detailFilterText = ref('')
const detailPagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const filteredHostTableData = computed(() => {
  if (!hostFilterText.value) return hostTableData.value
  const keyword = hostFilterText.value.toLowerCase()
  return hostTableData.value.filter(item => {
    return (
      item.$data_owner?.toLowerCase().includes(keyword) ||
      item.os_distro?.toLowerCase().includes(keyword) ||
      item.os_version?.toLowerCase().includes(keyword)
    )
  })
})

const paginatedHostTableData = computed(() => {
  const start = (hostPagination.page - 1) * hostPagination.pageSize
  const end = start + hostPagination.pageSize
  return filteredHostTableData.value.slice(start, end)
})

const filteredRepoDetailData = computed(() => {
  if (!detailFilterText.value) return hostRepoDetailData.value
  const keyword = detailFilterText.value.toLowerCase()
  return hostRepoDetailData.value.filter(row => {
    return (
      row['repo-name']?.toLowerCase().includes(keyword) ||
      row['repo-baseurl']?.toLowerCase().includes(keyword) ||
      row['repo-file']?.toLowerCase().includes(keyword)
    )
  })
})

const paginatedRepoDetailData = computed(() => {
  const start = (detailPagination.page - 1) * detailPagination.pageSize
  const end = start + detailPagination.pageSize
  return filteredRepoDetailData.value.slice(start, end)
})

async function loadHostData() {
  hostLoading.value = true
  try {
    const response = await yumManageApi.getHostYumList({
      page: 1,
      size: 1000
    })
    if (response?.data) {
      hostTableData.value = response.data.records || response.data || []
    }
  } catch (error) {
    console.error('Failed to load host data:', error)
    hostTableData.value = []
  } finally {
    hostLoading.value = false
  }
}

function handleHostSizeChange(size) {
  hostPagination.pageSize = size
  hostPagination.page = 1
}

function handleHostPageChange(page) {
  hostPagination.page = page
}

function handleScanRepoList() {
  selectedDevices.value = []
  selectHostDialogVisible.value = true
}

async function executeScanJob() {
  if (selectedDevices.value.length === 0) {
    ElMessage.warning('请选择至少一台主机')
    return
  }

  jobExecuting.value = true
  try {
    const hosts = selectedDevices.value.map(host => ({
      key: host.key || host.id,
      value: host.value || host.hostname || host.$data_owner,
      assetType: host.ci_type || host.assetType || 'linux'
    }))

    const response = await runJob(YUM_JOB_ID, {
      params: {
        hosts,
        func: 'yum-list'
      }
    })
    const runResult = (response?.data || response || [])[0]

    if (!runResult?.runId) {
      throw new Error('未获取到任务运行ID')
    }

    ElMessage.success('扫描任务已提交')
    selectHostDialogVisible.value = false

    startPolling(runResult.runId, {
      successMessage: '任务执行成功',
      errorMessage: '任务执行失败',
      onSuccess: () => {
        loadHostData()
      },
      onComplete: () => {
        jobExecuting.value = false
      }
    })
  } catch (error) {
    console.error('Job execution failed:', error)
    ElMessage.error('任务执行失败: ' + (error.message || '未知错误'))
    jobExecuting.value = false
  }
}

function handleViewHostDetail(row) {
  currentHostDetail.value = row
  detailRepoStatus.value = 'enabled'
  detailFilterText.value = ''
  detailPagination.page = 1
  hostDetailDialogVisible.value = true
  loadHostRepoDetail()
}

function handleDetailFilterChange() {
  detailPagination.page = 1
}

function handleDetailReset() {
  detailFilterText.value = ''
  detailRepoStatus.value = 'enabled'
  handleDetailFilterChange()
}

async function loadHostRepoDetail() {
  if (!currentHostDetail.value) return

  hostDetailLoading.value = true
  try {
    const response = await yumManageApi.getHostRepoDetail({
      data_owner: currentHostDetail.value.$data_owner,
      repo_status: detailRepoStatus.value
    })
    hostRepoDetailData.value = response?.data?.records || response?.data || []
    detailPagination.page = 1
  } catch (error) {
    console.error('Failed to load host repo detail:', error)
    hostRepoDetailData.value = []
  } finally {
    hostDetailLoading.value = false
  }
}

function parseUrls(urlStr) {
  if (!urlStr) return []
  return urlStr.split(',').filter(url => url.trim())
}

function formatDate(timestamp) {
  if (!timestamp) return '-'
  try {
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return '-'
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return '-'
  }
}

async function handleEnableRepo(row) {
  try {
    await ElMessageBox.confirm(`确定要启用 "${row['repo-name']}" 吗？`, '确认', { type: 'info' })

    const hosts = [
      {
        key: currentHostDetail.value.$data_owner_id || currentHostDetail.value.$id,
        value: currentHostDetail.value.$data_owner,
        assetType: 'linux'
      }
    ]

    const repoFile = extractRepoFileName(row['repo-file'])

    await runJob(YUM_JOB_ID, {
      params: {
        func: 'yum-configs',
        hosts,
        action: 'edit',
        repo_name: row['repo-name'],
        repo_desc: '',
        repo_url: row['repo-baseurl'],
        repo_file: repoFile,
        repo_status: 'true'
      }
    })

    ElMessage.success('启用任务已提交')
    setTimeout(() => loadHostRepoDetail(), 2000)
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Enable repo failed:', error)
      ElMessage.error('操作失败')
    }
  }
}

async function handleDisableRepo(row) {
  try {
    await ElMessageBox.confirm(`确定要禁用 "${row['repo-name']}" 吗？`, '确认', { type: 'warning' })

    const hosts = [
      {
        key: currentHostDetail.value.$data_owner_id || currentHostDetail.value.$id,
        value: currentHostDetail.value.$data_owner,
        assetType: 'linux'
      }
    ]

    const repoFile = extractRepoFileName(row['repo-file'])

    await runJob(YUM_JOB_ID, {
      params: {
        func: 'yum-configs',
        hosts,
        action: 'edit',
        repo_name: row['repo-name'],
        repo_desc: '',
        repo_url: row['repo-baseurl'],
        repo_file: repoFile,
        repo_status: 'false'
      }
    })

    ElMessage.success('禁用任务已提交')
    setTimeout(() => loadHostRepoDetail(), 2000)
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Disable repo failed:', error)
      ElMessage.error('操作失败')
    }
  }
}

async function handleDeleteRepo(row) {
  try {
    await ElMessageBox.confirm(`确定要删除 "${row['repo-name']}" 吗？此操作不可恢复。`, '警告', {
      type: 'warning'
    })

    const hosts = [
      {
        key: currentHostDetail.value.$data_owner_id || currentHostDetail.value.$id,
        value: currentHostDetail.value.$data_owner,
        assetType: 'linux'
      }
    ]

    const repoFile = extractRepoFileName(row['repo-file'])

    await runJob(YUM_JOB_ID, {
      params: {
        func: 'yum-configs',
        hosts,
        action: 'remove',
        repo_name: row['repo-name'],
        repo_desc: '',
        repo_url: '',
        repo_file: repoFile,
        repo_status: ''
      }
    })

    ElMessage.success('删除任务已提交')
    setTimeout(() => loadHostRepoDetail(), 2000)
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Delete repo failed:', error)
      ElMessage.error('操作失败')
    }
  }
}

function extractRepoFileName(filePath) {
  if (!filePath) return ''
  const startIndex = filePath.lastIndexOf('/') + 1
  const endIndex = filePath.lastIndexOf('.repo')
  if (endIndex === -1) return filePath.slice(startIndex)
  return filePath.slice(startIndex, endIndex)
}

function refresh() {
  loadHostData()
}

onMounted(() => {
  loadHostData()
})

defineExpose({ refresh })
</script>

<style scoped lang="scss">
.linux-yum-manage-page {
  gap: 12px;
}

.select-host-dialog-content {
  padding: 8px;
}

.host-detail-dialog-content {
  .url-badges {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .url-tag {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .dialog-pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}
</style>
