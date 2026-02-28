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
        @clear="handlePatchKeywordChange"
      >
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
    </div>

    <!-- 表格 -->
    <el-table
      v-loading="patchLoading"
      :data="patchTableData"
      size="small"
      max-height="calc(100vh - 400px)"
      @selection-change="handleSelectionChange"
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
          <div class="cve-tags" v-if="row.related_vuls">
            <a
              v-for="(cve, idx) in getCVEList(row.related_vuls).slice(0, 3)"
              :key="idx"
              :href="getCveUrl(cve, osDistro)"
              target="_blank"
              class="cve-link"
              @click.stop
            >
              {{ cve }}
            </a>
            <button
              v-if="getCVEList(row.related_vuls).length > 3"
              type="button"
              class="cve-more"
              @click="handleShowAllCves(row)"
            >
              +{{ getCVEList(row.related_vuls).length - 3 }}
            </button>
          </div>
          <span v-else>-</span>
        </template>
      </el-table-column>
    </el-table>

    <!-- 关联CVE 列表对话框 -->
    <el-dialog v-model="cveDialogVisible" title="关联CVE" width="520px" destroy-on-close>
      <div class="cve-dialog">
        <template v-if="cveDialogList.length">
          <a
            v-for="(cve, idx) in cveDialogList"
            :key="idx"
            :href="getCveUrl(cve, cveDialogOsDistro)"
            target="_blank"
            class="cve-dialog-item"
          >
            {{ cve }}
          </a>
        </template>
        <span v-else>-</span>
      </div>
      <template #footer>
        <el-button @click="cveDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="patchPagination.page"
        v-model:page-size="patchPagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="patchPagination.total"
        layout="total, sizes, prev, pager, next"
        small
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
  getCVEList,
  getCveUrl,
  getSeverityType
} from '../../composables/useFormatters'
import { usePatchList } from '../../composables/usePatchList'
import { Search } from '@element-plus/icons-vue'

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
  }
})

const cveDialogVisible = ref(false)
const cveDialogList = ref([])
const cveDialogOsDistro = ref('')

function handleShowAllCves(row) {
  cveDialogList.value = getCVEList(row.related_vuls)
  cveDialogOsDistro.value = props.osDistro
  cveDialogVisible.value = true
}

const emit = defineEmits(['patch-click', 'fix-patches'])

// 使用补丁列表逻辑
const {
  patchLoading,
  patchTableData,
  selectedPatches,
  selectedSeverities,
  patchKeyword,
  patchPagination,
  loadPatchList,
  handleFilterChange,
  handlePatchKeywordChange,
  handleSelectionChange,
  handlePageChange,
  handleSizeChange
} = usePatchList({
  hostId: toRef(props, 'hostId'),
  hostKey: toRef(props, 'hostKey')
})

const defaultSeverities = ['Critical', 'Important', 'Moderate', 'Low']

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
  if (!selectedSeverities.value.length) {
    selectedSeverities.value = [...defaultSeverities]
  }
  loadPatchList()
})

watch(
  () => [props.hostId, props.hostKey],
  () => {
    loadPatchList()
  }
)

// 修复补丁
function handleFixPatches() {
  emit('fix-patches', selectedPatches.value)
}

// 暴露加载方法给父组件
defineExpose({
  loadPatchList
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

.cve-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;

  .cve-link {
    display: inline-block;
    padding: 2px 6px;
    background: #6c757d;
    color: #fff;
    border-radius: 4px;
    font-size: 11px;
    text-decoration: none;
    transition: background 0.2s;

    &:hover {
      background: #545b62;
    }
  }

  .cve-more {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2px 6px;
    background: #e9ecef;
    color: #6c757d;
    border-radius: 4px;
    font-size: 11px;
    border: none;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: #dfe3e6;
    }
  }
}

.cve-dialog {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cve-dialog-item {
  display: inline-block;
  padding: 4px 10px;
  background: #6c757d;
  color: #fff;
  border-radius: 4px;
  font-size: 13px;
  text-decoration: none;

  &:hover {
    background: #5a6268;
  }
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #e4e7ed;
}

:deep(.el-pagination) {
  margin-top: 0 !important;
}
</style>
