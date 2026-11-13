<template>
  <div class="ops-page-layout">
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small">
        <el-form-item :label="t('patches.catalog.source')">
          <el-select v-model="filters.source" clearable :placeholder="t('common.all')" style="width: 140px" @change="handleSearch">
            <el-option :label="t('common.all')" value="" />
            <el-option :label="t('common.kylin')" value="kylin" />
            <el-option label="Oracle" value="oracle" />
            <el-option label="Red Hat" value="redhat" />
            <el-option label="SUSE" value="suse" />
            <el-option label="ubuntu" value="ubuntu" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('yumRepo.packageName')">
          <el-input
            v-model="filters.name"
            clearable
            :placeholder="t('patches.catalog.packageNamePlaceholder')"
            style="width: 280px"
            @keyup.enter="handleSearch"
          @clear="handleSearch" />
        </el-form-item>
        <el-form-item :label="t('yumRepo.architecture')">
          <el-select v-model="filters.arch" clearable :placeholder="t('common.all')" style="width: 160px" @change="handleSearch">
            <el-option v-for="arch in archOptions" :key="arch" :label="arch" :value="arch" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('yumRepo.software.osVersion')">
          <el-select
            v-model="filters.osVersion"
            clearable
            :placeholder="t('common.all')"
            style="width: 160px"
            @change="handleSearch"
          >
            <el-option
              v-for="osVersion in osVersionOptions"
              :key="osVersion"
              :label="osVersion"
              :value="osVersion"
            />
          </el-select>
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
      <div class="action-summary">{{ t('patches.catalog.rpmCount', { count: pagination.total }) }}</div>
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
        <el-table-column
          prop="completePackageName"
          :label="t('yumRepo.packageName')"
          min-width="220"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <el-link type="primary" underline="never" @click="handleViewDetail(row)">
              {{ row.completePackageName || '-' }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="version" :label="t('patches.catalog.version')" min-width="120" />
        <el-table-column prop="architecture" :label="t('yumRepo.architecture')" width="120" />
        <el-table-column prop="osVersion" :label="t('yumRepo.software.osVersion')" width="120">
          <template #default="{ row }">
            {{ row.osVersion || t('automation.command.unknown') }}
          </template>
        </el-table-column>
        <el-table-column prop="source" :label="t('patches.catalog.source')" width="120">
          <template #default="{ row }">
            <el-tag
              size="small"
              effect="plain"
              :type="getSourceTagType(row.source)"
              :class="`source-tag--${row.source || 'default'}`"
            >
              {{ getSourceLabel(row.source) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('patches.catalog.associatedServices')" min-width="240">
          <template #default="{ row }">
            <div class="service-cell">
              <div
                v-for="(service, index) in getServiceDisplay(row.services).preview"
                :key="`${row.id || row.completePackageName || 'service'}-${index}`"
                class="service-item"
                :title="service"
              >
                {{ service }}
              </div>
              <el-popover
                v-if="getServiceDisplay(row.services).restCount > 0"
                placement="top"
                trigger="hover"
                :width="320"
              >
                <template #reference>
                  <span class="more-link">
                    +{{ getServiceDisplay(row.services).restCount }} {{ t('yumRepo.more') }}
                  </span>
                </template>
                <div class="services-popover">
                  <div
                    v-for="(service, index) in getServiceDisplay(row.services).services"
                    :key="`${row.id || row.completePackageName || 'popover-service'}-${index}`"
                    class="service-item"
                  >
                    {{ service }}
                  </div>
                </div>
              </el-popover>
              <span v-if="!getServiceDisplay(row.services).preview.length" class="text-muted">
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
import { Refresh, RefreshRight, Search } from '@element-plus/icons-vue'
import { rpmInfoApi } from '../api'
import { useRpmPackageList } from '../composables/useRpmPackageList'
import { getServicePreview } from '../utils/rpmPackageInfo'
import RpmPackageDetailDialog from '../components/rpm/RpmPackageDetailDialog.vue'

const {
  filters,
  loading,
  pagination,
  tableData,
  archOptions,
  osVersionOptions,
  loadArchOptions,
  loadOsVersionOptions,
  loadData,
  handleSearch,
  handleReset,
  handlePageChange,
  handleSizeChange
} = useRpmPackageList()

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

function getSourceLabel(source) {
  if (source === 'kylin') return t('common.kylin')
  if (source === 'oracle') return 'Oracle'
  if (source === 'redhat') return 'Red Hat'
  if (source === 'suse') return 'SUSE'
  return source || '-'
}

function getSourceTagType(source) {
  if (source === 'redhat') return 'danger'
  if (source === 'oracle') return 'warning'
  if (source === 'kylin') return 'success'
  return 'info'
}

function getServiceDisplay(services) {
  return getServicePreview(services, 3)
}

async function handleViewDetail(row) {
  const packageName = String(row?.completePackageName || '').trim()
  if (!row?.id && !packageName) {
    ElMessage.warning(t('patches.catalog.noRpmIdentity'))
    return
  }

  const requestId = ++detailRequestId
  detailVisible.value = true
  detailLoading.value = true
  detailData.value = {}

  try {
    const response = row?.id
      ? await rpmInfoApi.getPackageDetailById(row.id)
      : await rpmInfoApi.getPackageDetail({
          name: packageName,
          source: row?.source || filters.source,
          arch: row?.architecture || row?.arch
        })

    if (requestId !== detailRequestId || !detailVisible.value) return
    const responseData = response?.data || response || {}
    detailData.value = {
      ...responseData,
      source: responseData.source || row?.source || filters.source,
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
      currentPackage:
        row?.currentPackage || row?.completePackageName || responseData.currentPackage || ''
    }
  } catch (error) {
    if (requestId !== detailRequestId || !detailVisible.value) return
    console.error('Failed to load rpm package detail:', error)
    ElMessage.error(t('patches.catalog.rpmDetailFailed'))
    detailVisible.value = false
  } finally {
    if (requestId === detailRequestId) detailLoading.value = false
  }
}

onMounted(() => {
  loadArchOptions()
  loadOsVersionOptions()
  loadData()
})
</script>

<style scoped lang="scss">
.action-summary {
  color: var(--el-text-color-regular);
  font-size: 13px;
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

/* Oracle 使用品牌橙红色覆盖 warning 的黄色调 */
:deep(.source-tag--oracle.el-tag--warning) {
  color: #c74a0a;
  border-color: #f5b187;
  background-color: #fef0e6;
}
</style>
