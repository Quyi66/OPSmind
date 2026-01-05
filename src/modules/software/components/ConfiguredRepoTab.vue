<template>
  <div class="configured-repo-tab">
    <!-- 状态筛选 -->
    <div class="filter-bar">
      <el-checkbox-group v-model="repoStatus" @change="loadData">
        <el-checkbox value="enabled">
          <el-tag type="success" size="small">启用</el-tag>
        </el-checkbox>
        <el-checkbox value="disabled">
          <el-tag type="warning" size="small">未启用</el-tag>
        </el-checkbox>
      </el-checkbox-group>
    </div>

    <el-table
      v-loading="loading"
      :data="tableData"
      stripe
      max-height="calc(100vh - 300px)"
    >
      <el-table-column prop="refid" label="仓库ID" min-width="150" show-overflow-tooltip>
        <template #default="{ row }">
          <el-link type="primary" @click="handleViewDetail(row)">
            {{ row.refid }}
          </el-link>
        </template>
      </el-table-column>
      <el-table-column prop="repo_id" label="仓库" min-width="120" show-overflow-tooltip   />
      <el-table-column prop="repo_name" label="名称" min-width="150" show-overflow-tooltip />
      <el-table-column prop="repo_file" label="配置文件" min-width="150" show-overflow-tooltip />
      <el-table-column prop="repo_baseurl" label="地址" min-width="250" show-overflow-tooltip>
        <!-- <template #default="{ row }">
          <div class="baseurl-tags">
            <div
              v-for="(url, index) in parseBaseUrl(row.repo_baseurl)"
              :key="index"
              type="info"
              size="small"
              class="url-tag"
            >
              {{ url }}
            </div>
          </div>
        </template> -->
      </el-table-column>
      <el-table-column prop="repo_pkgs" label="软件包数量" width="100">
        <template #default="{ row }">
          {{ formatPkgCount(row.repo_pkgs) }}
        </template>
      </el-table-column>
      <el-table-column prop="repo_size" label="大小" width="100" />
      <el-table-column prop="repo_status" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.repo_status === '启用' ? 'success' : 'warning'" size="small">
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

    <div class="ops-pagination-wrapper">
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
import { ref, onMounted } from 'vue'
import { repoApi } from '../api'
import RepoDetailDialog from './RepoDetailDialog.vue'

const loading = ref(false)
const tableData = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const repoStatus = ref(['enabled'])

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

function parseBaseUrl(baseurl) {
  if (!baseurl) return []
  return baseurl.split(',').filter(url => url.trim())
}

async function loadData() {
  loading.value = true
  try {
    const response = await repoApi.getConfiguredRepoList({
      page: currentPage.value,
      size: pageSize.value,
      repoStatus: repoStatus.value.join(',')
    })
    const data = response?.data || response
    tableData.value = data?.records || []
    total.value = data?.total || 0
  } catch (error) {
    console.error('Failed to load configured repos:', error)
    tableData.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
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
