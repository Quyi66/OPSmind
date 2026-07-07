<template>
  <div class="ops-page-layout" style="padding: 0; gap: 0">
    <!-- 页面描述 -->
    <el-alert type="info" :closable="false" class="page-description">
      <template #title>
        <div class="desc-content">
          <p class="description">
            软件仓库（Yum源）用于管理软件包，仓库中存放各种rpm的软件包以及软件包之间的依赖关系。
            每台主机上都可以配置自己的仓库，为避免仓库混乱，建议使用统一的基准仓库。
          </p>
        </div>
      </template>
    </el-alert>

    <!-- 标签页导航 -->
    <div class="type-tabs-wrapper">
      <div class="type-tabs">
        <div
          v-for="tab in tabs"
          :key="tab.key"
          :class="['type-tab', { active: activeTab === tab.key }]"
          @click="handleTabChange(tab.key)"
        >
          <i :class="tab.icon"></i>
          <span>{{ tab.label }}</span>
        </div>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="ops-page-layout">
      <!-- 基准仓库 Tab 内容 -->
      <template v-if="activeTab === 'baseRepo'">
        <!-- 筛选区域 -->
        <div class="ops-filter-bar">
          <el-form :inline="true" size="small">
            <el-form-item label="状态">
              <el-checkbox-group v-model="baseRepoStatus" @change="loadBaseRepos">
                <el-checkbox value="enabled">
                  <el-tag type="success" size="small">启用</el-tag>
                </el-checkbox>
                <el-checkbox value="disabled">
                  <el-tag type="warning" size="small">未启用</el-tag>
                </el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </el-form>
        </div>

        <!-- 操作按钮区域 -->
        <div class="ops-action-bar">
          <el-button
            type="primary"
            size="small"
            :disabled="selectedBaseRepos.length === 0"
            @click="handleConfigRepoToHost"
          >
            <i class="fa fa-cogs" style="margin-right: 4px"></i>
            配置到主机
          </el-button>
          <el-button size="small" :disabled="!repoDefaultHosts" @click="handleRescanRepoInfo">
            <i class="fa fa-undo-alt" style="margin-right: 4px"></i>
            重新扫描仓库信息
          </el-button>
          <span style="flex: 1"></span>
          <el-button
            class="toolbar-icon-btn"
            circle
            size="small"
            :loading="baseRepoLoading"
            @click="loadBaseRepos"
            title="刷新"
          >
            <el-icon v-show="!baseRepoLoading"><Refresh /></el-icon>
          </el-button>
        </div>

        <!-- 数据表格 -->
        <div class="ops-table-wrapper">
          <el-table
            v-loading="baseRepoLoading"
            :data="baseRepoData"
            style="width: 100%"
            max-height="calc(100vh - 334px)"
            @selection-change="handleBaseRepoSelectionChange"
          >
            <el-table-column type="selection" width="50" />
            <el-table-column prop="repo_id" label="仓库ID" min-width="120">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="handleViewRepoDetail(row)">
                  {{ row.repo_id }}
                </el-button>
              </template>
            </el-table-column>
            <el-table-column prop="scan_server" label="基准主机" min-width="150" />
            <el-table-column prop="repo_name" label="名称" min-width="150" />
            <el-table-column prop="repo_file" label="配置文件" min-width="150" />
            <el-table-column prop="repo_pkgs" label="软件包数量" width="100">
              <template #default="{ row }">
                {{ formatPkgCount(row.repo_pkgs) }}
              </template>
            </el-table-column>
            <el-table-column prop="repo_size" label="大小" width="100" />
            <el-table-column prop="baseurl" label="地址" min-width="250">
              <template #default="{ row }">
                <div class="baseurl-tags">
                  <el-tag
                    v-for="(url, index) in parseBaseUrl(row.baseurl)"
                    :key="index"
                    type="info"
                    size="small"
                    class="url-tag"
                  >
                    {{ url }}
                  </el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="repo_status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.repo_status === '启用' ? 'success' : 'info'" size="small">
                  {{ row.repo_status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="repo_updated" label="仓库更新时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.repo_updated) }}
              </template>
            </el-table-column>
            <el-table-column prop="scan_date" label="信息更新时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.scan_date) }}
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 分页 -->
        <div class="ops-pagination-wrapper">
          <el-pagination
            v-model:current-page="baseRepoPage"
            v-model:page-size="baseRepoPageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="baseRepoTotal"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @size-change="loadBaseRepos"
            @current-change="loadBaseRepos"
          />
        </div>
      </template>

      <!-- 基准主机 -->
      <template v-if="activeTab === 'baseHost'">
        <base-host-tab />
      </template>

      <!-- 自定义仓库 -->
      <template v-if="activeTab === 'customRepo'">
        <custom-repo-tab />
      </template>

      <!-- 已配置仓库 -->
      <template v-if="activeTab === 'configuredRepo'">
        <configured-repo-tab />
      </template>
    </div>

    <!-- 仓库详情弹窗 -->
    <RepoDetailDialog
      v-model="repoDetailVisible"
      :repo-id="selectedRepoId"
      :refid="selectedRefid"
      @refresh="loadBaseRepos"
    />

    <!-- 配置到主机弹窗 -->
    <ConfigRepoToHostDialog
      v-model="configDialogVisible"
      :selected-repos="selectedBaseRepos"
      repo-type="base"
      @success="handleConfigSuccess"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { repoApi } from '../api'
import BaseHostTab from '../components/repo/BaseHostTab.vue'
import CustomRepoTab from '../components/repo/CustomRepoTab.vue'
import ConfiguredRepoTab from '../components/repo/ConfiguredRepoTab.vue'
import RepoDetailDialog from '../components/repo/RepoDetailDialog.vue'
import ConfigRepoToHostDialog from '../components/repo/ConfigRepoToHostDialog.vue'

const tabs = [
  { key: 'baseRepo', label: '基准仓库', icon: 'fa fa-home' },
  { key: 'baseHost', label: '基准主机', icon: 'fa fa-laptop-house' },
  { key: 'customRepo', label: '自定义仓库', icon: 'fa fa-user-cog' },
  { key: 'configuredRepo', label: '已配置仓库', icon: 'fa fa-tools' }
]

const activeTab = ref('baseRepo')

// 基准仓库
const baseRepoLoading = ref(false)
const baseRepoData = ref([])
const baseRepoPage = ref(1)
const baseRepoPageSize = ref(10)
const baseRepoTotal = ref(0)
const baseRepoStatus = ref(['enabled'])
const selectedBaseRepos = ref([])
const repoDefaultHosts = ref('')

// 仓库详情弹窗
const repoDetailVisible = ref(false)
const selectedRepoId = ref('')
const selectedRefid = ref('')

// 配置到主机弹窗
const configDialogVisible = ref(false)

// 格式化日期
function formatDate(timestamp) {
  if (!timestamp) return '-'
  try {
    if (typeof timestamp === 'string' && timestamp.includes('T')) {
      return timestamp.replace('T', ' ').split('.')[0]
    }
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return timestamp
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  } catch {
    return timestamp
  }
}

// 格式化软件包数量
function formatPkgCount(count) {
  if (!count) return '-'
  return String(count).replace('.0', '')
}

// 解析 baseurl
function parseBaseUrl(baseurl) {
  if (!baseurl) return []
  return baseurl.split(',').filter(url => url.trim())
}

// Tab 切换
function handleTabChange(tabKey) {
  activeTab.value = tabKey
}

// ========== 基准仓库 ==========
async function loadBaseRepos() {
  baseRepoLoading.value = true
  try {
    const response = await repoApi.getRepoList({
      page: baseRepoPage.value,
      size: baseRepoPageSize.value,
      repoStatus: baseRepoStatus.value.join(',')
    })
    const data = response?.data || response
    baseRepoData.value = data?.records || []
    baseRepoTotal.value = data?.total || 0
  } catch (error) {
    console.error('Failed to load base repos:', error)
    baseRepoData.value = []
    baseRepoTotal.value = 0
  } finally {
    baseRepoLoading.value = false
  }
}

// 加载基准主机ID列表
async function loadRepoDefaultHosts() {
  try {
    const response = await repoApi.getRepoDefaultHosts()
    const data = response?.data || response
    repoDefaultHosts.value = data?.records?.[0]?.hostIds || ''
  } catch (error) {
    console.error('Failed to load repo default hosts:', error)
    repoDefaultHosts.value = ''
  }
}

function handleBaseRepoSelectionChange(selection) {
  selectedBaseRepos.value = selection
}

function handleViewRepoDetail(row) {
  selectedRepoId.value = row.repo_id
  selectedRefid.value = row.refid || row.repo_id
  repoDetailVisible.value = true
}

function handleConfigRepoToHost() {
  if (selectedBaseRepos.value.length === 0) {
    ElMessage.warning('请先选择要配置的仓库')
    return
  }
  configDialogVisible.value = true
}

function handleConfigSuccess() {
  // 配置成功后刷新列表
  loadBaseRepos()
  // 清空选择
  selectedBaseRepos.value = []
}

function handleRescanRepoInfo() {
  ElMessageBox.confirm('确定要重新扫描仓库信息吗？', '确认', {
    type: 'warning'
  })
    .then(() => {
      // TODO: 调用重新扫描 API
      ElMessage.success('已提交扫描任务')
    })
    .catch(() => {})
}

onMounted(() => {
  loadBaseRepos()
  loadRepoDefaultHosts()
})
</script>

<style scoped lang="scss">
// 页面描述样式
.page-description {
  margin: 0;
  border-radius: 0;
  border-left: none;
  border-right: none;
  border-top: none;

  .description {
    margin: 0;
    font-size: 13px;
    color: #64748b;
    line-height: 1.6;
  }
}

// 标签页样式 - 与资产列表页保持一致
.type-tabs-wrapper {
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  padding: 0 16px;
}

.type-tabs {
  display: flex;
  gap: 4px;
}

.type-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  color: #606266;
  font-size: 14px;
  transition: all 0.2s;

  &:hover {
    color: #409eff;
  }

  &.active {
    color: #409eff;
    border-bottom-color: #409eff;
    font-weight: 500;
  }

  i {
    font-size: 14px;
  }
}

// url标签样式
.baseurl-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.url-tag {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
