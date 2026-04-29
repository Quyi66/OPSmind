<template>
  <div class="tab-content">
    <!-- 筛选栏 -->
    <div class="ops-filter-bar">
      <el-form inline size="small">
        <el-form-item label="漏洞范围" label-width="70">
          <el-select
            v-model="packageFilter.showHistory"
            style="width: 100px"
            @change="handlePackageFilterChange"
          >
            <el-option label="最新漏洞" value="no" />
            <el-option label="历史漏洞" value="yes" />
          </el-select>
        </el-form-item>
        <el-form-item label="软件包范围" label-width="85">
          <el-select
            v-model="packageFilter.showAll"
            style="width: 130px"
            @change="handlePackageFilterChange"
          >
            <el-option label="有漏洞的软件包" value="no" />
            <el-option label="所有软件包" value="yes" />
          </el-select>
        </el-form-item>

        <el-form-item label="关键词" label-width="60">
          <el-input
            v-model="packageKeyword"
            size="small"
            placeholder="搜索包名/版本/补丁"
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
      <span style="flex: 1"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="packageLoading"
        title="刷新"
        @click="loadPackageList()"
      >
        <el-icon v-show="!packageLoading"><Refresh /></el-icon>
      </el-button>
    </div>

    <!-- 表格 -->
    <el-table
      v-loading="packageLoading"
      :data="packageTableData"
      size="small"
      max-height="calc(100vh - 390px)"
      @selection-change="handlePackageSelectionChange"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column
        prop="installedPkg"
        label="当前安装版本"
        min-width="200"
        show-overflow-tooltip
      />
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
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import { getSeverityType } from '../../composables/useFormatters'
import { usePackageList } from '../../composables/usePackageList'
import { Refresh, Search } from '@element-plus/icons-vue'

const props = defineProps({
  hostId: {
    type: String,
    required: true
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
  selectedPackages,
  packageKeyword,
  packageFilter,
  packagePagination,
  loadPackageList,
  handlePackageFilterChange,
  handlePackageKeywordChange,
  handlePackageSelectionChange,
  handlePackagePageChange,
  handlePackageSizeChange
} = usePackageList({ value: props.hostId })

// 更新软件包
async function handleUpdatePackages() {
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
