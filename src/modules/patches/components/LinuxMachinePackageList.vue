<template>
  <div class="ops-page-layout">
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small">
        <el-form-item label="目标主机">
          <div class="host-selector-field">
            <AcmDeviceSelector
              v-model="selectedHosts"
              ci-types="[auto]"
              :show-tag-list="false"
              :options="selectorOptions"
            />
          </div>
        </el-form-item>
        <el-form-item label="主机IP">
          <el-input
            v-model="filters.hostKey"
            clearable
            placeholder="输入主机IP"
            style="width: 150px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            clearable
            placeholder="完整包名或包名"
            style="width: 150px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="操作系统">
          <el-input
            v-model="filters.osDistro"
            clearable
            placeholder="发行版"
            style="width: 120px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="系统版本">
          <el-input
            v-model="filters.osVersion"
            clearable
            placeholder="如 V10"
            style="width: 120px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSearch">
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
      <div class="action-group">
        <el-button size="small" :loading="exporting" @click="handleExport">
          <el-icon><Download /></el-icon>
          导出
        </el-button>
        <el-tooltip
          content="导出内容会跟随当前筛选条件和上方选择的目标主机"
          placement="top"
        >
          <el-icon class="action-tip-icon"><InfoFilled /></el-icon>
        </el-tooltip>
      </div>
      <span style="flex: 1"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="loading"
        title="刷新"
        @click="loadData"
      >
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <div class="ops-table-wrapper">
      <el-table v-loading="loading" :data="tableData" max-height="calc(100vh - 250px)">
        <!-- <el-table-column prop="hostId" label="主机ID" min-width="160" show-overflow-tooltip /> -->
        <el-table-column prop="hostKey" label="主机IP" width="130" show-overflow-tooltip />
        <el-table-column prop="osDistro" label="操作系统" width="120" show-overflow-tooltip />
        <el-table-column prop="osVersion" label="系统版本" width="100" show-overflow-tooltip="" />
        <el-table-column prop="osSpVersion" label="SP版本" width="100" show-overflow-tooltip="" />
        <el-table-column prop="osArch" label="系统架构" width="120" />
        <!-- <el-table-column label="扫描时间" min-width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.scanTimestamp) }}
          </template>
        </el-table-column> -->
        <el-table-column
          prop="currentPackage"
          label="完整包名"
          min-width="350"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="handleViewDetail(row)">
              {{ row.currentPackage || '-' }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="pkgName" label="包名" min-width="160" show-overflow-tooltip />
        <el-table-column
          prop="pkgVersion"
          label="包版本/Release"
          min-width="160"
          show-overflow-tooltip
        />
        <el-table-column prop="pkgArch" label="包架构" width="120" />
        <el-table-column label="受影响服务" min-width="320">
          <template #default="{ row }">
            <div class="service-cell">
              <div
                v-for="(service, index) in getServiceDisplay(row.affectedServices).preview"
                :key="`${row.hostId || row.hostKey || 'service'}-${index}`"
                class="service-item"
                :title="service"
              >
                {{ service }}
              </div>
              <el-popover
                v-if="getServiceDisplay(row.affectedServices).restCount > 0"
                placement="top"
                trigger="hover"
                :width="320"
              >
                <template #reference>
                  <span class="more-link">
                    +{{ getServiceDisplay(row.affectedServices).restCount }} 更多
                  </span>
                </template>
                <div class="services-popover">
                  <div
                    v-for="(service, index) in getServiceDisplay(row.affectedServices).services"
                    :key="`${row.hostId || row.hostKey || 'popover-service'}-${index}`"
                    class="service-item"
                  >
                    {{ service }}
                  </div>
                </div>
              </el-popover>
              <span v-if="!getServiceDisplay(row.affectedServices).preview.length" class="text-muted">-</span>
            </div>
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
        @current-change="handlePageChange"
      />
    </div>

    <RpmPackageDetailDialog
      v-model="detailVisible"
      :loading="detailLoading"
      :detail-data="detailData"
    />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, InfoFilled, Refresh, RefreshRight, Search } from '@element-plus/icons-vue'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import { rpmInfoApi } from '../api'
import { useLinuxMachinePackageList } from '../composables/useLinuxMachinePackageList'
import { getServicePreview } from '../utils/rpmPackageInfo'
import RpmPackageDetailDialog from './rpm/RpmPackageDetailDialog.vue'

const selectorOptions = {
  selectMode: 'host,input,recently',
  selector: 'multiple',
  label: '选择主机'
}

const {
  exporting,
  filters,
  handleExport,
  handlePageChange,
  handleReset,
  handleSearch,
  handleSizeChange,
  loadData,
  loading,
  pagination,
  selectedHosts,
  tableData
} = useLinuxMachinePackageList()

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref({})

function getServiceDisplay(services) {
  return getServicePreview(services, 3)
}

async function handleViewDetail(row) {
  const currentPackage = String(row?.currentPackage || '').trim()
  const pkgName = String(row?.pkgName || '').trim()

  if (!currentPackage && !pkgName) {
    ElMessage.warning('当前行缺少软件包标识，无法查看详情')
    return
  }

  detailVisible.value = true
  detailLoading.value = true
  detailData.value = {}

  try {
    const response = await rpmInfoApi.getInstalledDetail({
      pkgName,
      currentPackage,
      osDistro: row?.osDistro,
      arch: row?.pkgArch
    })

    detailData.value = response?.data || response || {}
  } catch (error) {
    console.error('Failed to load installed package detail:', error)
    ElMessage.error('获取软件包详情失败')
    detailVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.host-selector-field {
  width: 110px;
  margin-bottom: 0;
}

.action-group {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.action-tip-icon {
  color: var(--el-text-color-secondary);
  font-size: 16px;
  cursor: help;
}

.text-muted {
  color: var(--el-text-color-secondary);
}

.more-link {
  color: var(--el-color-primary);
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

.service-cell {
  line-height: 1.5;
}

.service-item {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.services-popover {
  max-height: 220px;
  overflow-y: auto;
  line-height: 1.6;
}
</style>
