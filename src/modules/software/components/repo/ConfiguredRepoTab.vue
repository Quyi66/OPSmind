<template>
  <div class="configured-repo-tab">
    <!-- 状态筛选 -->
    <div class="ops-filter-bar">
      <el-form :inline="true" size="small">
        <el-form-item :label="t('automation.workbench.status')">
          <el-checkbox-group v-model="repoStatus" @change="loadData">
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

    <!-- 操作栏 -->
    <div class="ops-action-bar">
      <div class="action-right">
        <el-button
          class="toolbar-icon-btn"
          circle
          size="small"
          :loading="loading"
          :disabled="!!readError && !canRetry"
          @click="refresh"
          :title="readError ? t('yumRepo.software.retryRead') : t('common.refresh')"
          :aria-label="readError ? t('yumRepo.software.retryConfiguredRepos') : t('yumRepo.software.refreshConfiguredRepos')"
        >
          <el-icon v-show="!loading"><Refresh /></el-icon>
        </el-button>
      </div>
    </div>

    <el-alert v-if="readError" type="warning" :closable="false" show-icon style="flex-shrink: 0">
      <template #title>
        {{ readErrorMessage }}
        <span v-if="hasResult">{{ t('yumRepo.software.staleConfiguredHint') }}</span>
      </template>
    </el-alert>

    <div class="ops-table-wrapper">
      <el-table v-loading="loading" :data="tableData" :empty-text="emptyText" height="100%">
        <el-table-column prop="refid" :label="t('yumRepo.software.repoId')" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link
              class="software-cell-link"
              :title="row.refid"
              type="primary"
              @click="handleViewDetail(row)"
            >
              {{ row.refid }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="repo_id" :label="t('yumRepo.repository')" min-width="120" show-overflow-tooltip />
        <el-table-column prop="repo_name" :label="t('common.name')" min-width="150" show-overflow-tooltip />
        <el-table-column prop="repo_file" :label="t('yumRepo.software.configFile')" min-width="150" show-overflow-tooltip />
        <el-table-column prop="repo_baseurl" :label="t('yumRepo.software.address')" min-width="250" show-overflow-tooltip />
        <el-table-column prop="repo_pkgs" :label="t('yumRepo.software.packageCount')" width="100">
          <template #default="{ row }">
            {{ formatPkgCount(row.repo_pkgs) }}
          </template>
        </el-table-column>
        <el-table-column prop="repo_size" :label="t('yumRepo.size')" width="100" />
        <el-table-column prop="repo_status" :label="t('automation.workbench.status')" width="80">
          <template #default="{ row }">
            <el-tag :type="row.repo_status === '启用' ? 'success' : 'warning'" size="small">
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

    <div v-if="hasResult" class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="loadData"
        @current-change="loadData"
      />
    </div>

    <!-- 仓库详情弹窗 -->
    <RepoDetailDialog
      v-model="detailDialogVisible"
      :repo-id="selectedRepoId"
      :refid="selectedRefid"
      @refresh="loadData"
    />
  </div>
</template>

<script setup>
import { t } from '@/core/i18n'

import { ref, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { repoApi } from '../../api'
import RepoDetailDialog from './RepoDetailDialog.vue'
import { useSoftwareListRead } from '../../composables/useSoftwareListRead'

const currentPage = ref(1)
const pageSize = ref(10)
const repoStatus = ref(['enabled'])
const {
  rows: tableData,
  total,
  loading,
  hasResult,
  error: readError,
  errorMessage: readErrorMessage,
  emptyText,
  canRetry,
  load,
  retry
} = useSoftwareListRead(params => repoApi.getConfiguredRepoList(params))

// 弹窗相关
const detailDialogVisible = ref(false)
const selectedRepoId = ref('')
const selectedRefid = ref('')

function formatDate(timestamp) {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString('zh-CN')
}

function formatPkgCount(count) {
  if (!count) return '-'
  return String(count).replace('.0', '')
}

function loadData() {
  return load({
    page: currentPage.value,
    size: pageSize.value,
    repoStatus: repoStatus.value.join(',')
  })
}

function refresh() {
  return readError.value ? retry() : loadData()
}

function handleViewDetail(row) {
  selectedRepoId.value = row.repo_id
  selectedRefid.value = row.refid
  detailDialogVisible.value = true
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
@use '../../styles/layout' as software-layout;

.configured-repo-tab {
  @include software-layout.table-tab;
}
</style>
