<template>
  <div class="tab-content">
    <!-- 筛选栏 -->
    <div class="ops-filter-bar" style="margin-bottom: 8px">
      <!-- <el-checkbox-group v-model="selectedSeverities" size="small" @change="handleFilterChange">
        <el-checkbox label="Critical">
          <el-tag type="danger" size="small">严重</el-tag>
        </el-checkbox>
        <el-checkbox label="Important">
          <el-tag type="warning" size="small">重要</el-tag>
        </el-checkbox>
        <el-checkbox label="Moderate">
          <el-tag type="primary" size="small">中等</el-tag>
        </el-checkbox>
        <el-checkbox label="Low">
          <el-tag type="info" size="small">低</el-tag>
        </el-checkbox>
      </el-checkbox-group> -->
      <el-select
        v-model="selectedSeverities"
        multiple
        size="small"
        placeholder="选择严重程度"
        @change="handleFilterChange"
        style="min-width: 150px; max-width: 300px; width: auto"
      >
        <el-option label="严重" value="Critical">
          <!-- <el-tag type="danger" size="small">严重</el-tag> -->
          严重
        </el-option>
        <el-option label="重要" value="Important">
          <!-- <el-tag type="warning" size="small">重要</el-tag> -->
          重要
        </el-option>
        <el-option label="中等" value="Moderate">
          <!-- <el-tag type="primary" size="small">中等</el-tag> -->
          中等
        </el-option>
        <el-option label="低危" value="Low">
          <!-- <el-tag type="info" size="small">低危</el-tag> -->
          低危
        </el-option>
      </el-select>

      <el-input
        v-model="patchKeyword"
        size="small"
        placeholder="搜索补丁编号/摘要/CVE等"
        clearable
        style="width: 260px; margin-left: 12px"
        @input="handlePatchKeywordChange"
        @clear="handlePatchKeywordChange" @keyup.enter="handleFilterChange">
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <!-- 操作栏 -->
    <div class="ops-action-bar">
      <el-button
        type="primary"
        size="small"
        :disabled="selectedPatches.length === 0"
        @click="handleFixPatches"
      >
        <i class="fa fa-chevron-circle-right" />
        安装选定的补丁 ({{ selectedPatches.length }})
      </el-button>
      <el-button
        size="small"
        :disabled="patchTableData.length === 0"
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
        :loading="patchLoading"
        title="刷新"
        @click="loadPatchList()"
      >
        <el-icon v-show="!patchLoading"><Refresh /></el-icon>
      </el-button>
    </div>

    <el-table
      ref="patchTableRef"
      v-loading="patchLoading"
      :data="patchTableData"
      size="small"
      @select="handleTableSelect"
      @select-all="handleTableSelect"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column prop="patch_id" label="补丁编号" width="180">
        <template #default="{ row }">
          <a href="javascript:void(0)" class="patch-link" @click="$emit('patch-click', row)">
            {{ row.patch_id }}
          </a>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="摘要" min-width="250" show-overflow-tooltip />
      <el-table-column prop="severity" label="严重程度" width="100">
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
      <el-table-column prop="publish_date" label="发布时间" width="110" sortable>
        <template #default="{ row }">
          {{ formatDate(row.publish_date) }}
        </template>
      </el-table-column>
      <el-table-column
        prop="affected_pkgs"
        label="影响的软件包"
        min-width="180"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ formatPackages(row.affected_pkgs) }}
        </template>
      </el-table-column>
      <el-table-column prop="related_vuls" label="关联CVE" min-width="180">
        <template #default="{ row }">
          <CveLinkList
            :cves="row.related_vuls"
            :url-resolver="cve => getCveUrl(cve, osDistro)"
          />
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="patchPagination.page"
        v-model:page-size="patchPagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="patchPagination.total"
        layout="total, sizes, prev, pager, next"
        size="small"
        background
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, toRef, onMounted, watch } from 'vue'
import {
  formatDate,
  formatPackages,
  getCveUrl,
  getSeverityType
} from '../../../composables/useFormatters'
import { usePatchList } from '../../../composables/usePatchList'
import { useTableSelectAll } from '../../../composables/useTableSelectAll'
import { Refresh, Search } from '@element-plus/icons-vue'
import CveLinkList from '../../common/CveLinkList.vue'

const props = defineProps({
  hostId: {
    type: String,
    required: true
  },
  hostKey: {
    type: String,
    default: ''
  },
  osDistro: {
    type: String,
    default: ''
  },
  defaultSeverities: {
    type: Array,
    default: () => ['Critical', 'Important', 'Moderate', 'Low']
  },
  defaultKeyword: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['patch-click', 'fix-patches'])

// 使用补丁列表逻辑
const {
  patchLoading,
  patchTableData,
  patchFilteredData,
  selectedPatches,
  selectedSeverities,
  patchKeyword,
  patchPagination,
  applyClientPaging,
  loadPatchList: originalLoadPatchList,
  handleFilterChange: originalHandleFilterChange,
  handlePatchKeywordChange: originalHandlePatchKeywordChange,
  handlePageChange: originalHandlePageChange,
  handleSizeChange: originalHandleSizeChange
} = usePatchList({
  hostId: toRef(props, 'hostId'),
  hostKey: toRef(props, 'hostKey')
})

const patchTableRef = ref(null)

// 全选逻辑
const {
  allSelected,
  isAllSelected,
  handleToggleAllSelection,
  handleTableSelect,
  resetAllSelected
} = useTableSelectAll(patchTableRef, {
  tableData: patchTableData,
  filteredData: patchFilteredData,
  selectedItems: selectedPatches,
  matchFn: (f, row) => f.patch_id === row.patch_id
})

function handlePageChange(page) {
  originalHandlePageChange(page)
}

function handleSizeChange(size) {
  originalHandleSizeChange(size)
}

function handleFilterChange() {
  resetAllSelected()
  originalHandleFilterChange()
}

function handlePatchKeywordChange() {
  resetAllSelected()
  originalHandlePatchKeywordChange()
}

async function loadPatchList() {
  resetAllSelected()
  await originalLoadPatchList()
}

const fallbackSeverities = ['Critical', 'Important', 'Moderate', 'Low']

function applyDefaultSeverities() {
  const nextSeverities =
    Array.isArray(props.defaultSeverities) && props.defaultSeverities.length > 0
      ? [...props.defaultSeverities]
      : [...fallbackSeverities]

  selectedSeverities.value = nextSeverities
}

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

onMounted(() => {
  applyDefaultSeverities()
  if (props.defaultKeyword) {
    patchKeyword.value = props.defaultKeyword
  }
  loadPatchList()
})

watch(
  () => [props.hostId, props.hostKey],
  () => {
    loadPatchList()
  }
)

watch(
  () => props.defaultKeyword,
  newVal => {
    patchKeyword.value = newVal || ''
    patchPagination.page = 1
    applyClientPaging()
  }
)

// 修复补丁
function handleFixPatches() {
  emit('fix-patches', selectedPatches.value)
}

// 暴露加载方法和变量给父组件
defineExpose({
  loadPatchList,
  patchKeyword
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
