<template>
  <div class="tab-content">
    <!-- 筛选栏 -->
    <div class="ops-filter-bar">
      <el-form inline size="small">
        <el-form-item label="关键词" label-width="60">
          <el-input
            v-model="packageKeyword"
            size="small"
            placeholder="搜索完整 RPM 字符串/包名"
            clearable
            style="width: 220px"
            @input="handlePackageKeywordChange"
            @clear="handlePackageKeywordChange"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
      </el-form>
    </div>

    <!-- 操作栏 -->
    <div class="ops-action-bar">
      <el-button
        type="primary"
        size="small"
        :disabled="selectedPackages.length === 0"
        @click="handleUpdatePackages"
      >
        <i class="fa fa-chevron-circle-right" />
        更新选定的软件包 ({{ selectedPackages.length }})
      </el-button>
      <el-button
        size="small"
        :disabled="selectablePackages.length === 0"
        @click="handleToggleAllSelection"
      >
        <i :class="`fa fa-${isAllSelected ? 'times' : 'check-double'}`" />
        {{ isAllSelected ? '取消全选' : '一键全选' }}
      </el-button>
      <span style="flex: 1"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="packageLoading"
        title="刷新"
        @click="loadPackageList({ refreshCompatibility: true })"
      >
        <el-icon v-show="!packageLoading"><Refresh /></el-icon>
      </el-button>
    </div>

    <el-table
      ref="packageTableRef"
      v-loading="packageLoading"
      :data="packageTableData"
      size="small"
      max-height="calc(100vh - 390px)"
      @select="handleTableSelect"
      @select-all="handleTableSelect"
    >
      <el-table-column type="selection" width="55" :selectable="isPackageSelectable" />
      <el-table-column prop="pkgName" label="包名" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">
          <span>{{ row.pkgName || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="installedPkg"
        label="当前安装版本"
        min-width="200"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <el-button type="primary" link @click="handleViewPackageDetail(row)">
            {{ row.installedPkg || '-' }}
          </el-button>
        </template>
      </el-table-column>
      <el-table-column prop="updatePkg" label="需更新版本" min-width="200" show-overflow-tooltip />
      <el-table-column prop="patchId" label="补丁编号" width="180">
        <template #default="{ row }">
          <a
            v-if="row.patchId"
            href="javascript:void(0)"
            class="patch-link"
            @click="$emit('patch-click', { patch_id: row.patchId })"
          >
            {{ row.patchId }}
          </a>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="severity" label="严重程度" width="100">
        <template #default="{ row }">
          <el-tag
            v-if="row.severity"
            :type="getSeverityType(row.severity)"
            :class="['severity-tag', getSeverityClass(row.severity)]"
            size="small"
          >
            {{ getSeverityLabel(row.severity) }}
          </el-tag>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="packagePagination.page"
        v-model:page-size="packagePagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="packagePagination.total"
        layout="total, sizes, prev, pager, next"
        small
        background
        @size-change="handlePackageSizeChange"
        @current-change="handlePackagePageChange"
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
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { rpmInfoApi } from '../../../api'
import { getSeverityType } from '../../../composables/useFormatters'
import { usePackageList } from '../../../composables/usePackageList'
import { useTableSelectAll } from '../../../composables/useTableSelectAll'
import { extractInstalledPackageVersion, inferRpmSource } from '../../../utils/rpmPackageInfo'
import { Refresh, Search } from '@element-plus/icons-vue'
import RpmPackageDetailDialog from '../../rpm/RpmPackageDetailDialog.vue'

const props = defineProps({
  hostId: {
    type: String,
    required: true
  },
  osDistro: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['patch-click', 'update-packages'])

function normalizeSeverity(severity) {
  const raw = String(severity || '').trim()
  if (!raw) return ''
  const lower = raw.toLowerCase()

  if (lower === 'critical' || raw === '严重' || raw === 'Critical') return 'critical'
  if (lower === 'important' || raw === '重要' || raw === '高危' || raw === 'Important')
    return 'important'
  if (lower === 'moderate' || raw === '中等' || raw === '中危' || raw === 'Moderate')
    return 'moderate'
  if (lower === 'low' || raw === '低' || raw === '低危' || raw === 'Low') return 'low'

  return ''
}

function getSeverityClass(severity) {
  const key = normalizeSeverity(severity)
  return key ? `is-${key}` : ''
}

function getSeverityLabel(severity) {
  const map = {
    critical: '严重',
    important: '重要',
    moderate: '中等',
    low: '低危'
  }
  return map[normalizeSeverity(severity)] || severity || '-'
}

// 使用软件包列表逻辑
const {
  packageLoading,
  packageTableData,
  packageKeyword,
  packageFilteredData,
  selectedPackages,
  packagePagination,
  loadPackageList: originalLoadPackageList,
  handlePackageKeywordChange: originalHandlePackageKeywordChange,
  handlePackagePageChange: originalHandlePackagePageChange,
  handlePackageSizeChange: originalHandlePackageSizeChange
} = usePackageList({ value: props.hostId })

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref({})

const packageTableRef = ref(null)

function isPackageSelectable(row) {
  return Boolean(row?.hasUpdateInfo)
}

// 全选逻辑
const {
  allSelected,
  isAllSelected,
  handleToggleAllSelection,
  handleTableSelect,
  resetAllSelected
} = useTableSelectAll(packageTableRef, {
  tableData: packageTableData,
  filteredData: packageFilteredData,
  selectedItems: selectedPackages,
  matchFn: (f, row) => f.pkgName === row.pkgName && f.patchId === row.patchId,
  selectableFn: isPackageSelectable
})

// 可选中的软件包（用于控制"一键全选"按钮禁用状态）
const selectablePackages = computed(() => {
  return (packageFilteredData.value || []).filter(isPackageSelectable)
})

// 更新软件包
function handleUpdatePackages() {
  if (selectedPackages.value.length === 0) {
    ElMessage.warning('请选择要更新的软件包')
    return
  }

  const packages = selectedPackages.value.map(item => item.packages).filter(Boolean)

  if (packages.length === 0) {
    ElMessage.warning('所选软件包缺少更新信息')
    return
  }

  if (!props.hostId) {
    ElMessage.warning('主机信息缺失，无法更新软件包')
    return
  }

  emit('update-packages', selectedPackages.value)
}

// 查看软件包详情
async function handleViewPackageDetail(row) {
  const currentPackage = String(row?.installedPkg || '').trim()
  const pkgName = String(row?.pkgName || '').trim()
  const arch = String(row?.arch || row?.architecture || '').trim()
  const source = inferRpmSource(row?.source, props.osDistro)
  const version = extractInstalledPackageVersion({
    version: row?.version || row?.packageInfo?.version,
    currentPackage,
    pkgName,
    arch
  })

  if (!version || !pkgName || !source || !arch) {
    ElMessage.warning('当前行缺少详情接口必传参数，无法查看详情')
    return
  }

  detailVisible.value = true
  detailLoading.value = true
  detailData.value = {}

  try {
    const response = await rpmInfoApi.getInstalledDetail({
      version,
      pkgName,
      source,
      arch
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

function handlePackagePageChange(page) {
  originalHandlePackagePageChange(page)
}

function handlePackageSizeChange(size) {
  originalHandlePackageSizeChange(size)
}

function handlePackageKeywordChange() {
  resetAllSelected()
  originalHandlePackageKeywordChange()
}

async function loadPackageList(options) {
  resetAllSelected()
  await originalLoadPackageList(options)
}

// 暴露加载方法给父组件
defineExpose({
  loadPackageList
})
</script>

<style scoped lang="scss">
.tab-content {
  min-height: 300px;
}

.patch-link {
  color: #409eff;
  text-decoration: none;
  cursor: pointer;

  &:hover {
    color: #66b1ff;
    text-decoration: underline;
  }
}

.text-muted {
  color: #6c757d;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-light);
}

:deep(.el-pagination) {
  margin-top: 0 !important;
}
</style>
