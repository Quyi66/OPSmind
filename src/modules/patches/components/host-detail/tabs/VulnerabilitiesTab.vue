<template>
  <div class="tab-content">
    <!-- 筛选栏 -->
    <!-- <div class="ops-filter-bar" style="margin-bottom: 8px;">
      <el-checkbox-group v-model="selectedVulSeverities" size="small" @change="handleVulFilterChange">
        <el-checkbox label="Critical">
          <el-tag type="danger" size="small">严重</el-tag>
        </el-checkbox>
        <el-checkbox label="Important">
          <el-tag type="warning" size="small">重要</el-tag>
        </el-checkbox>
        <el-checkbox label="Moderate">
          <el-tag type="" size="small">中等</el-tag>
        </el-checkbox>
        <el-checkbox label="Low">
          <el-tag type="info" size="small">低</el-tag>
        </el-checkbox>
      </el-checkbox-group>
    </div> -->
    <div class="ops-filter-bar" style="margin-bottom: 8px">
      <el-form inline size="small" @submit.prevent>
        <el-form-item label="关键词" label-width="60">
          <el-input
            v-model="vulKeyword"
            size="small"
            placeholder="搜索CVE/补丁/包名/状态等"
            clearable
            style="width: 260px"
            @input="handleVulKeywordChange"
            @clear="handleVulKeywordChange"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="修复状态" label-width="72">
          <el-select
            v-model="vulPatchStatus"
            size="small"
            placeholder="全部"
            clearable
            style="width: 140px"
            @change="handleVulPatchStatusChange"
            @clear="handleVulPatchStatusChange"
          >
            <el-option
              v-for="option in patchStatusOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <!-- 操作栏 -->
    <div class="ops-action-bar">
      <el-button
        type="primary"
        size="small"
        :disabled="selectedVuls.length === 0"
        @click="handleFixVulnerabilities"
      >
        <i class="fa fa-tools" />
        修复选中的漏洞 ({{ selectedVuls.length }})
      </el-button>
      <el-button
        size="small"
        :disabled="vulTableData.length === 0"
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
        :loading="vulLoading"
        title="刷新"
        @click="loadVulnerabilityList()"
      >
        <el-icon v-show="!vulLoading"><Refresh /></el-icon>
      </el-button>
    </div>

    <!-- 表格 -->
    <el-table
      ref="vulTableRef"
      v-loading="vulLoading"
      :data="vulTableData"
      class="header-border-only-table"
      size="small"
      max-height="calc(100vh - 400px)"
      @select="handleTableSelect"
      @select-all="handleTableSelect"
      border
    >
      <el-table-column type="selection" width="55" />
      <el-table-column prop="vul_id" label="CVE" width="150">
        <template #default="{ row }">
          <CveLinkList :cves="[row.vul_id]" :url-resolver="cve => getCveUrl(cve, osDistro)" />
        </template>
      </el-table-column>
      <el-table-column prop="patch_id" label="补丁编号" width="180">
        <template #default="{ row }">
          <div class="patch-list">
            <a
              v-for="patchId in getPatchIdPreview(row.patch_id)"
              :key="patchId"
              href="javascript:void(0)"
              class="patch-link"
              @click="$emit('patch-click', { patch_id: patchId })"
            >
              {{ patchId }}
            </a>
            <el-popover
              v-if="getPatchIdList(row.patch_id).length > 2"
              placement="top"
              trigger="hover"
              :width="360"
            >
              <template #reference>
                <span class="more-link">+{{ getPatchIdList(row.patch_id).length - 2 }} 更多</span>
              </template>
              <div class="patch-list-popover">
                <a
                  v-for="patchId in getPatchIdList(row.patch_id)"
                  :key="patchId"
                  href="javascript:void(0)"
                  class="patch-link"
                  @click="$emit('patch-click', { patch_id: patchId })"
                >
                  {{ patchId }}
                </a>
              </div>
            </el-popover>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        prop="affected_pkgs"
        label="受影响的软件包"
        min-width="300"
        align="left"
        class-name="vulnerability-layout-top-cell"
      >
        <template #default="{ row }">
          <div v-if="getAffectedPackages(row).length" class="affected-packages-cell">
            <div
              v-for="(pkg, index) in getAffectedPackagePreview(row)"
              :key="getAffectedPackageKey(pkg, index)"
              class="affected-package-row"
            >
              <button
                v-if="hasPackageDetail(pkg)"
                type="button"
                class="affected-package-link affected-package-trigger"
                :title="pkg.currentPackage"
                @click="handleViewPackageDetail(pkg)"
              >
                {{ pkg.currentPackage }}
              </button>
              <span v-else class="affected-package-text" :title="pkg.currentPackage">
                {{ pkg.currentPackage }}
              </span>
              <template v-if="pkg.restartType === 'service' && pkg.services && pkg.services.length">
                <el-tag
                  v-for="service in pkg.services"
                  :key="service"
                  size="small"
                  type="warning"
                  effect="plain"
                  class="reboot-service-tag"
                  style="margin-left: 4px"
                >
                  {{ service }}
                </el-tag>
              </template>
            </div>
            <el-popover
              v-if="getAffectedPackages(row).length > 2"
              placement="top"
              trigger="hover"
              :width="400"
            >
              <template #reference>
                <span class="more-link">+{{ getAffectedPackages(row).length - 2 }} 更多</span>
              </template>
              <div class="affected-packages-popover">
                <div
                  v-for="(pkg, index) in getAffectedPackages(row)"
                  :key="getAffectedPackageKey(pkg, index)"
                  class="affected-package-row affected-package-popover-row"
                >
                  <button
                    v-if="hasPackageDetail(pkg)"
                    type="button"
                    class="affected-package-link affected-package-trigger"
                    :title="pkg.currentPackage"
                    @click="handleViewPackageDetail(pkg)"
                  >
                    {{ pkg.currentPackage }}
                  </button>
                  <span v-else class="affected-package-text" :title="pkg.currentPackage">
                    {{ pkg.currentPackage }}
                  </span>
                  <template v-if="pkg.restartType === 'service' && pkg.services && pkg.services.length">
                    <el-tag
                      v-for="service in pkg.services"
                      :key="service"
                      size="small"
                      type="warning"
                      effect="plain"
                      class="reboot-service-tag"
                      style="margin-left: 4px"
                    >
                      {{ service }}
                    </el-tag>
                  </template>
                </div>
              </div>
            </el-popover>
          </div>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="severity"
        label="严重程度"
        width="80"
        align="left"
        class-name="vulnerability-layout-top-cell"
      >
        <template #default="{ row }">
          <el-tag
            :type="getSeverityType(row.severity)"
            :class="['severity-tag', getSeverityClass(row.severity)]"
            size="small"
          >
            {{ getSeverityLabel(row.severity) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="reboot_status"
        label="重启要求"
        min-width="250"
        align="left"
        class-name="vulnerability-layout-top-cell"
      >
        <template #default="{ row }">
          <el-tooltip
            placement="top"
            :disabled="!getRebootStatusTooltip(row)"
            :content="getRebootStatusTooltip(row)"
          >
            <div class="reboot-status-content">
              <span class="reboot-status-cell">
                <el-tag
                  v-if="getDisplayRebootStatus(row) === '系统重启'"
                  type="danger"
                  size="small"
                >
                  <i class="fa fa-power-off"></i>
                  系统重启
                </el-tag>
                <el-tag
                  v-else-if="getDisplayRebootStatus(row) === '服务重启'"
                  type="warning"
                  size="small"
                >
                  <i class="fa fa-server"></i>
                  服务重启
                </el-tag>
                <span v-else-if="row.reboot_status !== '服务重启'" class="text-muted">-</span>
              </span>
              <div v-if="getDisplayRebootStatus(row) === '服务重启'" class="reboot-services-list">
                <el-tag
                  v-for="(service, serviceIndex) in getRebootServices(row)"
                  :key="getRebootServiceKey(row, service, serviceIndex)"
                  size="small"
                  effect="plain"
                  type="warning"
                  class="reboot-service-tag"
                >
                  {{ service }}
                </el-tag>
              </div>
            </div>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column prop="is_kernel" label="内核漏洞" width="80">
        <template #default="{ row }">
          <el-tag v-if="row.is_kernel === '是'" type="primary" size="small">
            <i class="fa fa-check"></i>
            是
          </el-tag>
          <el-tag v-else type="info" size="small">
            <i class="fa fa-times"></i>
            否
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="patch_status" label="修复状态" width="90">
        <template #default="{ row }">
          <el-tag :type="getPatchStatusType(row.patch_status)" size="small">
            {{ getPatchStatusText(row.patch_status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="scan_date" label="扫描时间" width="110">
        <template #default="{ row }">
          {{ formatDate(row.scan_date) }}
        </template>
      </el-table-column>
      <el-table-column prop="update_time" label="更新时间" width="110">
        <template #default="{ row }">
          {{ formatDate(row.update_time) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="90" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="row.patch_status === '已修复' || row.patch_status === '回滚失败'"
            size="small"
            text
            @click="handleRollback(row)"
            type="primary"
          >
            回滚
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="vulPagination.page"
        v-model:page-size="vulPagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="vulPagination.total"
        layout="total, sizes, prev, pager, next"
        small
        background
        @size-change="handleVulSizeChange"
        @current-change="handleVulPageChange"
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
import { ref, toRef } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { rpmInfoApi } from '../../../api'
import {
  formatDate,
  getCveUrl,
  getSeverityClass,
  getSeverityLabel,
  getSeverityType,
  getPatchStatusType,
  getPatchStatusText
} from '../../../composables/useFormatters'
import { useVulnerabilityList } from '../../../composables/useVulnerabilityList'
import { useTableSelectAll } from '../../../composables/useTableSelectAll'
import {
  getAffectedPackages,
  getAffectedPackageDetailParams,
  getDisplayRebootStatus,
  getRebootServices,
  getRebootStatusTooltip,
  hasAffectedPackageDetail
} from '../../../utils/vulnerabilityPackages'
import { Refresh, Search } from '@element-plus/icons-vue'
import RpmPackageDetailDialog from '../../rpm/RpmPackageDetailDialog.vue'
import CveLinkList from '../../common/CveLinkList.vue'

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

const emit = defineEmits(['patch-click', 'fix-vulnerabilities'])

const patchStatusOptions = [
  { label: '未修复', value: '未修复' },
  { label: '已修复', value: '已修复' },
  { label: '已修复(手动)', value: '已修复(手动)' },
  { label: '修复中', value: '修复中' },
  { label: '修复失败', value: '修复失败' },
  { label: '回滚中', value: '回滚中' },
  { label: '回滚失败', value: '回滚失败' },
  { label: '回滚成功', value: '回滚成功' }
]

function getPatchIdList(patchId) {
  if (!patchId) return []
  return String(patchId)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function getPatchIdPreview(patchId) {
  return getPatchIdList(patchId).slice(0, 2)
}

function getAffectedPackageKey(pkg, index) {
  return [pkg?.rpmInfoId, pkg?.currentPackage, index].filter(Boolean).join('-')
}

function getAffectedPackagePreview(row) {
  return getAffectedPackages(row).slice(0, 2)
}

function hasPackageDetail(pkg) {
  if (pkg?.rpmInfoId != null) return true
  const pkgName = pkg?.pkgName || pkg?.name
  const source = pkg?.source
  const arch = pkg?.pkgArch || pkg?.arch || pkg?.architecture
  if (pkgName && source && arch) return true
  return hasAffectedPackageDetail(pkg, props.osDistro)
}

function hasRpmDetailResponse(data) {
  return Boolean(
    data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length > 0
  )
}

function getRebootServiceKey(row, service, index) {
  return [row?.vul_id, row?.patch_id, service, index].filter(Boolean).join('-')
}

// 使用漏洞列表逻辑
const {
  vulLoading,
  vulTableData,
  vulFilteredData,
  selectedVuls,
  vulPagination,
  loadVulnerabilityList: originalLoadVulnerabilityList,
  vulKeyword,
  handleVulKeywordChange: originalHandleVulKeywordChange,
  vulPatchStatus,
  handleVulPatchStatusChange: originalHandleVulPatchStatusChange,
  handleVulPageChange: originalHandleVulPageChange,
  handleVulSizeChange: originalHandleVulSizeChange
} = useVulnerabilityList(toRef(props, 'hostId'))

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref({})

// 按 API 文档 §2.3 的三级回退顺序构建候选请求
// 1) rpmInfoId → /rpm-info/detail/{id}
// 2) pkgName + source + arch → /rpm-info/detail
// 3) currentPackage + osDistro + arch → /rpm-info/installed/detail
function buildDetailCandidates(pkg) {
  const candidates = []

  if (pkg?.rpmInfoId != null) {
    candidates.push({
      label: 'by id',
      request: () => rpmInfoApi.getPackageDetailById(pkg.rpmInfoId)
    })
  }

  const pkgName = pkg?.pkgName || pkg?.name
  const source = pkg?.source
  const arch = pkg?.pkgArch || pkg?.arch || pkg?.architecture
  if (pkgName && source && arch) {
    candidates.push({
      label: 'by name/source/arch',
      request: () => rpmInfoApi.getPackageDetail({ name: pkgName, source, arch })
    })
  }

  const detailParams = getAffectedPackageDetailParams(pkg, props.osDistro)
  if (detailParams.installedDetail) {
    candidates.push({
      label: 'by installed currentPackage',
      request: () => rpmInfoApi.getInstalledDetail(detailParams.installedDetail)
    })
  }

  return candidates
}

async function handleViewPackageDetail(pkg) {
  const candidates = buildDetailCandidates(pkg)
  if (candidates.length === 0) {
    ElMessage.warning('当前软件包暂无 RPM 详情')
    return
  }

  // 一次性打开 Drawer 并进入 loading，避免多级回退过程中 visible/loading 反复切换导致 UI 闪烁
  detailVisible.value = true
  detailLoading.value = true
  detailData.value = {}

  try {
    for (const candidate of candidates) {
      try {
        const response = await candidate.request()
        const responseData = response?.data || response || {}
        if (hasRpmDetailResponse(responseData)) {
          detailData.value = responseData
          return
        }
      } catch (error) {
        // 任意一级失败继续尝试下一级，错误仅落日志，最终在所有候选都未命中时才提示用户
        console.error(`Failed to load rpm package detail (${candidate.label}):`, error)
      }
    }

    ElMessage.warning('当前软件包暂无 RPM 详情')
    detailVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

// 修复漏洞
async function handleFixVulnerabilities() {
  if (selectedVuls.value.length === 0) {
    ElMessage.warning('请选择要修复的漏洞')
    return
  }

  emit('fix-vulnerabilities', selectedVuls.value)
}

// 回滚补丁
function handleRollback(row) {
  ElMessageBox.confirm(`确认要回滚补丁 ${row.patch_id} 吗？`, '确认回滚', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(() => {
      // TODO: 调用回滚API
      ElMessage.success('回滚任务已提交')
    })
    .catch(() => {
      // 用户取消
    })
}

const vulTableRef = ref(null)

// 全选逻辑
const {
  allSelected,
  isAllSelected,
  handleToggleAllSelection,
  handleTableSelect,
  resetAllSelected
} = useTableSelectAll(vulTableRef, {
  tableData: vulTableData,
  filteredData: vulFilteredData,
  selectedItems: selectedVuls,
  matchFn: (f, row) => f.vul_id === row.vul_id && f.patch_id === row.patch_id
})

function handleVulPageChange(page) {
  originalHandleVulPageChange(page)
}

function handleVulSizeChange(size) {
  originalHandleVulSizeChange(size)
}

function handleVulKeywordChange() {
  resetAllSelected()
  originalHandleVulKeywordChange()
}

function handleVulPatchStatusChange() {
  resetAllSelected()
  originalHandleVulPatchStatusChange()
}

async function loadVulnerabilityList() {
  resetAllSelected()
  await originalLoadVulnerabilityList()
}

// 暴露加载方法给父组件
defineExpose({
  loadVulnerabilityList
})
</script>

<style scoped lang="scss">
.tab-content {
  min-height: 300px;
}

:deep(.el-table__body td.el-table__cell) {
  vertical-align: top;
}

:deep(.vulnerability-layout-top-cell .cell) {
  display: flex;
  align-items: flex-start;
  height: 100%;
}

:deep(.vulnerability-layout-top-cell .cell > *) {
  width: 100%;
}

:deep(.header-border-only-table.el-table--border::after),
:deep(.header-border-only-table.el-table--border .el-table__inner-wrapper::after) {
  display: none;
}

:deep(.header-border-only-table.el-table--border .el-table__body-wrapper td.el-table__cell),
:deep(.header-border-only-table.el-table--border .el-table__fixed-body-wrapper td.el-table__cell),
:deep(.header-border-only-table.el-table--border .el-table__fixed-right td.el-table__cell) {
  border-right: none;
}

:deep(.header-border-only-table.el-table--border .el-table__header-wrapper th.el-table__cell),
:deep(.header-border-only-table.el-table--border .el-table__fixed-header-wrapper th.el-table__cell),
:deep(
  .header-border-only-table.el-table--border
    .el-table__fixed-right
    .el-table__header-wrapper
    th.el-table__cell
) {
  border-right-color: var(--el-border-color);
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
  color: var(--el-text-color-secondary);
}

.more-link {
  color: var(--el-color-primary);
  cursor: pointer;
  font-size: 12px;

  &:hover {
    text-decoration: underline;
  }
}

.affected-packages-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.affected-package-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.affected-packages-popover {
  max-height: 250px;
  overflow-y: auto;
}

.affected-package-popover-row {
  padding: 4px 0;
  border-bottom: 1px dashed var(--el-border-color-light);

  &:last-child {
    border-bottom: none;
  }
}

.affected-package-link,
.affected-package-text {
  max-width: 100%;
  line-height: 1.4;
  word-break: break-all;
}

.affected-package-link {
  color: #409eff;
  text-decoration: none;

  &:hover {
    color: #66b1ff;
    text-decoration: underline;
  }
}

.affected-package-trigger {
  padding: 0;
  border: 0;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.reboot-status-cell {
  display: inline-flex;
  align-items: center;
}

.reboot-status-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.reboot-services-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.reboot-service-hint {
  font-size: 12px;
  line-height: 1.4;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-light);
}

.fix-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 200px;
}

.fix-info-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  overflow: hidden;
}

.fix-info-header {
  padding: 8px 12px;
  background: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color-light);
  font-weight: 500;
  font-size: 14px;
  color: var(--el-text-color-primary);

  i {
    margin-right: 8px;
  }
}

.fix-info-body {
  padding: 12px;
  max-height: 150px;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.8;
  color: var(--el-text-color-regular);
}

:deep(.el-pagination) {
  margin-top: 0 !important;
}

.patch-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.patch-list-popover {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 250px;
  overflow-y: auto;
}
</style>
