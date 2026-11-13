<template>
  <div class="ops-page-layout">
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small">
        <el-form-item :label="t('automation.command.targetHosts')">
          <div class="host-selector-field">
            <AcmDeviceSelector
              v-model="selectedHosts"
              ci-types="[auto]"
              :show-tag-list="false"
              :options="selectorOptions"
              @change="handleSearch"
            />
          </div>
        </el-form-item>
        <el-form-item :label="t('patches.catalog.hostIp')">
          <el-input
            v-model="filters.hostKey"
            clearable
            :placeholder="t('patches.catalog.hostIpPlaceholder')"
            style="width: 150px"
            @keyup.enter="handleSearch"
          @clear="handleSearch" />
        </el-form-item>
        <el-form-item :label="t('yumRepo.keyword')">
          <el-input
            v-model="filters.keyword"
            clearable
            :placeholder="t('patches.catalog.packageSearch')"
            style="width: 150px"
            @keyup.enter="handleSearch"
          @clear="handleSearch" />
        </el-form-item>
        <el-form-item :label="t('yumRepo.os')">
          <el-select
            v-model="filters.osDistro"
            clearable
            :placeholder="t('common.all')"
            style="width: 120px"
            @change="handleSearch"
          >
            <el-option :label="t('common.all')" value="" />
            <el-option :label="t('common.kylin')" value="kylin" />
            <el-option label="Oracle" value="oracle" />
            <el-option label="Red Hat" value="redhat" />
            <el-option label="ubuntu" value="ubuntu" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('yumRepo.software.systemVersion')">
          <el-input
            v-model="filters.osVersion"
            clearable
            :placeholder="t('patches.catalog.osVersionExample')"
            style="width: 120px"
            @keyup.enter="handleSearch"
          @clear="handleSearch" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSearch">
            <el-icon><Search /></el-icon>
            {{ t('common.search') }}
          </el-button>
          <el-button @click="handleReset">
            <el-icon><RefreshRight /></el-icon>
            {{ t('common.reset') }}
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="ops-action-bar">
      <div class="action-group">
        <el-button size="small" :loading="exporting" @click="handleExport">
          <el-icon><Download /></el-icon>
          {{ t('patches.catalog.export') }}
        </el-button>
        <el-tooltip :content="t('patches.catalog.exportHint')" placement="top">
          <el-icon class="action-tip-icon"><InfoFilled /></el-icon>
        </el-tooltip>
      </div>
      <span style="flex: 1"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="loading"
        :title="t('common.refresh')"
        @click="loadData"
      >
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <div class="ops-table-wrapper">
      <el-table v-loading="loading" :data="tableData" max-height="calc(100vh - 294px)">
        <el-table-column prop="hostKey" :label="t('patches.catalog.hostIp')" width="130" show-overflow-tooltip />
        <el-table-column prop="osDistro" :label="t('yumRepo.os')" width="140" show-overflow-tooltip />
        <el-table-column prop="osVersion" :label="t('yumRepo.software.systemVersion')" width="100" show-overflow-tooltip />
        <el-table-column prop="osSpVersion" :label="t('patches.catalog.spVersion')" width="100" show-overflow-tooltip />
        <el-table-column prop="osArch" :label="t('patches.catalog.osArchitecture')" width="120" />
        <el-table-column
          prop="currentPackage"
          :label="t('yumRepo.fullPackageName')"
          min-width="350"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <el-link type="primary" underline="never" @click="handleViewDetail(row)">
              {{ row.currentPackage || '-' }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="pkgName" :label="t('yumRepo.packageName')" min-width="160" show-overflow-tooltip />
        <el-table-column
          prop="pkgVersion"
          :label="t('patches.catalog.packageVersionRelease')"
          min-width="160"
          show-overflow-tooltip
        />
        <el-table-column prop="pkgArch" :label="t('patches.catalog.packageArchitecture')" width="120" />
        <el-table-column :label="t('patches.catalog.affectedServices')" min-width="320">
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
                    +{{ getServiceDisplay(row.affectedServices).restCount }} {{ t('yumRepo.more') }}
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
              <span
                v-if="!getServiceDisplay(row.affectedServices).preview.length"
                class="text-muted"
              >
                -
              </span>
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
import { t } from '@/core/i18n'

import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, InfoFilled, Refresh, RefreshRight, Search } from '@element-plus/icons-vue'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import { rpmInfoApi } from '../api'
import { useLinuxMachinePackageList } from '../composables/useLinuxMachinePackageList'
import { getServicePreview, inferRpmSource } from '../utils/rpmPackageInfo'
import RpmPackageDetailDialog from '../components/rpm/RpmPackageDetailDialog.vue'

const selectorOptions = {
  selectMode: 'host,input,recently',
  selector: 'multiple',
  get label() { return t('patches.catalog.selectHosts') }
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
let detailRequestId = 0

watch(detailVisible, visible => {
  if (!visible) {
    detailRequestId += 1
    detailLoading.value = false
  }
})

onBeforeUnmount(() => {
  detailRequestId += 1
})

function getServiceDisplay(services) {
  return getServicePreview(services, 3)
}

async function handleViewDetail(row) {
  const version = String(row?.pkgVersion || '').trim()
  const pkgName = String(row?.pkgName || '').trim()
  const source = inferRpmSource(row?.source, row?.osDistro)
  const arch = String(row?.pkgArch || row?.osArch || '').trim()
  const currentPackage = String(
    row?.currentPackage || row?.pkgId || row?.installedPkg || row?.completePackageName || ''
  ).trim()
  if (!version || !pkgName || !source || !arch) {
    ElMessage.warning(t('patches.catalog.detailParamsMissing'))
    return
  }

  const requestId = ++detailRequestId
  detailVisible.value = true
  detailLoading.value = true
  detailData.value = {}

  try {
    const response = await rpmInfoApi.getInstalledDetail({
      version,
      pkgName,
      source,
      arch,
      osDistro: row?.osDistro || row?.os_distro || '',
      osVersion: row?.osVersion || row?.os_version || '',
      osArch: row?.osArch || row?.os_arch || ''
    })

    if (requestId !== detailRequestId || !detailVisible.value) return
    const responseData = response?.data || response || {}
    detailData.value = {
      ...responseData,
      source: responseData.source || source,
      osDistro:
        responseData.osDistro || responseData.os_distro || row?.osDistro || row?.os_distro || '',
      osVersion:
        responseData.osVersion ||
        responseData.os_version ||
        row?.osVersion ||
        row?.os_version ||
        '',
      osSpVersion:
        responseData.osSpVersion ||
        responseData.os_sp_version ||
        row?.osSpVersion ||
        row?.os_sp_version ||
        '',
      osArch: responseData.osArch || responseData.os_arch || row?.osArch || row?.os_arch || '',
      currentPackage: currentPackage || responseData.currentPackage || ''
    }
  } catch (error) {
    if (requestId !== detailRequestId || !detailVisible.value) return
    console.error('Failed to load installed package detail:', error)
    ElMessage.error(t('patches.catalog.packageDetailFailed'))
    detailVisible.value = false
  } finally {
    if (requestId === detailRequestId) detailLoading.value = false
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
