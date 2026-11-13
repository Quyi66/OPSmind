<template>
  <div class="ops-page-layout repo-management-page" style="padding: 0; gap: 0">
    <!-- 页面描述 -->
    <el-alert type="info" :closable="false" class="page-description">
      <template #title>
        <div class="desc-content">
          <p class="description">
            {{ t('yumRepo.software.description') }}
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
    <div class="ops-page-layout repo-content">
      <!-- 基准仓库 Tab 内容 -->
      <template v-if="activeTab === 'baseRepo'">
        <!-- 筛选区域 -->
        <div class="ops-filter-bar">
          <el-form :inline="true" size="small">
            <el-form-item :label="t('automation.workbench.status')">
              <el-checkbox-group v-model="baseRepoStatus" @change="loadBaseRepos">
                <el-checkbox value="enabled">
                  <el-tag type="success" size="small">{{ t('yumRepo.enable') }}</el-tag>
                </el-checkbox>
                <el-checkbox value="disabled">
                  <el-tag type="warning" size="small">{{ t('yumRepo.software.notEnabled') }}</el-tag>
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
            :disabled="selectedBaseRepos.length === 0 || !canUseBaseRepos"
            @click="handleConfigRepoToHost"
          >
            <i class="fa fa-cogs" style="margin-right: 4px"></i>
            {{ t('yumRepo.software.configureHosts') }}
          </el-button>
          <el-tooltip
            :content="t('yumRepo.software.rescanUnavailable')"
            placement="top"
            :trigger="['hover', 'focus']"
          >
            <span class="unavailable-action" tabindex="0" :aria-label="t('yumRepo.software.rescanDisabledAria')">
              <el-button size="small" disabled @click="handleRescanRepoInfo">
                <i class="fa fa-undo-alt" style="margin-right: 4px"></i>
                {{ t('yumRepo.software.rescanRepos') }}
              </el-button>
            </span>
          </el-tooltip>
          <span style="flex: 1"></span>
          <el-button
            class="toolbar-icon-btn"
            circle
            size="small"
            :loading="baseRepoLoading"
            :disabled="!!baseRepoError && !canRetryBaseRepos"
            @click="refreshBaseRepos"
            :title="baseRepoError ? t('yumRepo.software.retryRead') : t('common.refresh')"
            :aria-label="baseRepoError ? t('yumRepo.software.retryBaseRepos') : t('yumRepo.software.refreshBaseRepos')"
          >
            <el-icon v-show="!baseRepoLoading"><Refresh /></el-icon>
          </el-button>
        </div>

        <el-alert
          v-if="baseRepoError"
          type="warning"
          :closable="false"
          show-icon
          style="flex-shrink: 0"
        >
          <template #title>
            {{ baseRepoErrorMessage }}
            <span v-if="hasBaseRepoResult">{{ t('yumRepo.software.staleBaseHint') }}</span>
          </template>
        </el-alert>

        <!-- 数据表格 -->
        <div class="ops-table-wrapper">
          <el-table
            v-loading="baseRepoLoading"
            :data="baseRepoData"
            :empty-text="baseRepoEmptyText"
            style="width: 100%"
            height="100%"
            @selection-change="handleBaseRepoSelectionChange"
          >
            <template #empty>
              <el-empty
                v-if="hasBaseRepoResult && !baseRepoLoading && !baseRepoError"
                :description="t('yumRepo.software.noBaseRepos')"
              >
                <p>{{ t('yumRepo.software.baseRepoPrerequisite') }}</p>
                <el-button @click="activeTab = 'baseHost'">{{ t('yumRepo.software.viewBaseHost') }}</el-button>
              </el-empty>
              <span v-else>{{ baseRepoEmptyText }}</span>
            </template>
            <el-table-column type="selection" width="50" :selectable="() => canUseBaseRepos" />
            <el-table-column prop="repo_id" :label="t('yumRepo.software.repoId')" min-width="120" show-overflow-tooltip>
              <template #default="{ row }">
                <el-button
                  class="software-cell-link"
                  :title="row.repo_id"
                  type="primary"
                  link
                  size="small"
                  @click="handleViewRepoDetail(row)"
                >
                  {{ row.repo_id }}
                </el-button>
              </template>
            </el-table-column>
            <el-table-column
              prop="scan_server"
              :label="t('yumRepo.software.baseHost')"
              min-width="150"
              show-overflow-tooltip
            />
            <el-table-column prop="repo_name" :label="t('common.name')" min-width="150" show-overflow-tooltip />
            <el-table-column
              prop="repo_file"
              :label="t('yumRepo.software.configFile')"
              min-width="150"
              show-overflow-tooltip
            />
            <el-table-column prop="repo_pkgs" :label="t('yumRepo.software.packageCount')" width="100">
              <template #default="{ row }">
                {{ formatPkgCount(row.repo_pkgs) }}
              </template>
            </el-table-column>
            <el-table-column prop="repo_size" :label="t('yumRepo.size')" width="100" />
            <el-table-column prop="baseurl" :label="t('yumRepo.software.address')" min-width="250">
              <template #default="{ row }">
                <div class="baseurl-tags">
                  <el-tag
                    v-for="(url, index) in parseBaseUrl(row.baseurl)"
                    :key="index"
                    type="info"
                    size="small"
                    class="url-tag"
                  >
                    <span :title="url">{{ url }}</span>
                  </el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="repo_status" :label="t('automation.workbench.status')" width="80">
              <template #default="{ row }">
                <el-tag :type="row.repo_status === '启用' ? 'success' : 'info'" size="small">
                  {{ row.repo_status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="repo_updated" :label="t('yumRepo.software.repoUpdatedAt')" width="180">
              <template #default="{ row }">
                {{ formatDate(row.repo_updated) }}
              </template>
            </el-table-column>
            <el-table-column prop="scan_date" :label="t('yumRepo.software.infoUpdatedAt')" width="180">
              <template #default="{ row }">
                {{ formatDate(row.scan_date) }}
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 分页 -->
        <div v-if="hasBaseRepoResult" class="ops-pagination-wrapper">
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
import { t } from '@/core/i18n'

import { computed, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { repoApi } from '../api'
import BaseHostTab from '../components/repo/BaseHostTab.vue'
import CustomRepoTab from '../components/repo/CustomRepoTab.vue'
import ConfiguredRepoTab from '../components/repo/ConfiguredRepoTab.vue'
import RepoDetailDialog from '../components/repo/RepoDetailDialog.vue'
import ConfigRepoToHostDialog from '../components/repo/ConfigRepoToHostDialog.vue'
import { useSoftwareListRead } from '../composables/useSoftwareListRead'

const tabs = [
  { key: 'baseRepo', get label() { return t('yumRepo.software.baseRepo') }, icon: 'fa fa-home' },
  { key: 'baseHost', get label() { return t('yumRepo.software.baseHost') }, icon: 'fa fa-laptop-house' },
  { key: 'customRepo', get label() { return t('yumRepo.software.customRepo') }, icon: 'fa fa-user-cog' },
  { key: 'configuredRepo', get label() { return t('yumRepo.software.configuredRepo') }, icon: 'fa fa-tools' }
]

const activeTab = ref('baseRepo')

// 基准仓库
const baseRepoPage = ref(1)
const baseRepoPageSize = ref(10)
const baseRepoStatus = ref(['enabled'])
const selectedBaseRepos = ref([])
const repoDefaultHosts = ref('')
const {
  rows: baseRepoData,
  total: baseRepoTotal,
  loading: baseRepoLoading,
  hasResult: hasBaseRepoResult,
  error: baseRepoError,
  errorMessage: baseRepoErrorMessage,
  emptyText: baseRepoEmptyText,
  canUseRows: canUseBaseRepos,
  canRetry: canRetryBaseRepos,
  load: readBaseRepos,
  retry: retryBaseRepos
} = useSoftwareListRead(params => repoApi.getRepoList(params), {
  active: computed(() => activeTab.value === 'baseRepo'),
  onDiscard: () => {
    selectedBaseRepos.value = []
  }
})

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
function loadBaseRepos() {
  return readBaseRepos({
    page: baseRepoPage.value,
    size: baseRepoPageSize.value,
    repoStatus: baseRepoStatus.value.join(',')
  })
}

function refreshBaseRepos() {
  return baseRepoError.value ? retryBaseRepos() : loadBaseRepos()
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
  if (!canUseBaseRepos.value) {
    ElMessage.warning(t('yumRepo.software.refreshBeforeConfig'))
    return
  }
  if (selectedBaseRepos.value.length === 0) {
    ElMessage.warning(t('yumRepo.software.selectReposFirst'))
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
  // 独立仓库扫描的作业与参数尚未核实，不能仅凭旧封装下发任务。
  ElMessage.warning(t('yumRepo.software.rescanUnavailableNotice'))
}

onMounted(() => {
  loadBaseRepos()
  loadRepoDefaultHosts()
})
</script>

<style scoped lang="scss">
@use '../styles/layout' as software-layout;

.repo-management-page {
  min-width: 0;
}

.unavailable-action {
  display: inline-flex;
}

.repo-content {
  @include software-layout.table-tab;

  height: auto;
}

// 页面描述样式
.page-description {
  flex-shrink: 0;
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
  flex-shrink: 0;
  overflow-x: auto;
  overflow-y: hidden;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  padding: 0 16px;
}

.type-tabs {
  display: flex;
  gap: 4px;
  width: max-content;
  min-width: 100%;
}

.type-tab {
  display: flex;
  flex-shrink: 0;
  white-space: nowrap;
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

  :deep(.el-tag__content) {
    min-width: 0;
    overflow: hidden;
  }

  span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
