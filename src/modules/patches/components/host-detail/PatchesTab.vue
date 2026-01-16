<template>
  <div class="tab-content">
    <!-- 筛选栏 -->
    <div class="ops-filter-bar">
      <el-checkbox-group v-model="selectedSeverities" size="small" @change="handleFilterChange">
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
      stripe
      size="small"
      max-height="calc(100vh - 560px)"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column prop="patch_id" label="补丁编号" min-width="150">
        <template #default="{ row }">
          <a href="javascript:void(0)" class="patch-link" @click="$emit('patch-click', row)">
            {{ row.patch_id }}
          </a>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="摘要" min-width="300" show-overflow-tooltip />
      <el-table-column prop="severity" label="严重程度" width="100">
        <template #default="{ row }">
          <el-tag :type="getSeverityType(row.severity)" size="small">
            {{ row.severity }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="publish_date" label="发布时间" width="110" sortable>
        <template #default="{ row }">
          {{ formatDate(row.publish_date) }}
        </template>
      </el-table-column>
      <el-table-column prop="affected_pkgs" label="影响的软件包" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">
          {{ formatPackages(row.affected_pkgs) }}
        </template>
      </el-table-column>
      <el-table-column prop="related_vuls" label="关联CVE" width="160">
        <template #default="{ row }">
          <div class="cve-cell">
            <a
              v-for="cve in getCVEList(row.related_vuls)"
              :key="cve"
              :href="`https://access.redhat.com/security/cve/${cve}`"
              target="_blank"
              class="cve-badge"
            >
              {{ cve }}
            </a>
          </div>
        </template>
      </el-table-column>
    </el-table>

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
import { formatDate, formatPackages, getCVEList, getSeverityType } from '../../composables/useFormatters'
import { usePatchList } from '../../composables/usePatchList'

const props = defineProps({
  hostId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['patch-click', 'fix-patches'])

// 使用补丁列表逻辑
const {
  patchLoading,
  patchTableData,
  selectedPatches,
  selectedSeverities,
  patchPagination,
  loadPatchList,
  handleFilterChange,
  handleSelectionChange,
  handlePageChange,
  handleSizeChange
} = usePatchList({ value: props.hostId })

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

.cve-cell {
  max-height: 80px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #dcdfe6;
    border-radius: 2px;

    &:hover {
      background: #c0c4cc;
    }
  }
}

.cve-badge {
  display: inline-block;
  padding: 2px 6px;
  font-size: 11px;
  background: #6c757d;
  color: #fff;
  border-radius: 3px;
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    background: #495057;
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
