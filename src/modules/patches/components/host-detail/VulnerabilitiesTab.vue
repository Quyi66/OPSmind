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
    <div class="ops-filter-bar" style="margin-bottom: 8px;">
      <div style="line-height: 32px;">关键词</div>
      <el-input
        v-model="vulKeyword"
        size="small"
        placeholder="搜索CVE/补丁/包名/状态等"
        clearable
        style="width: 260px; margin-left: 12px;"
        @input="handleVulKeywordChange"
        @clear="handleVulKeywordChange"
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
        :disabled="selectedVuls.length === 0"
        @click="handleFixVulnerabilities"
      >
        <i class="fa fa-tools" />
        修复选中的漏洞 ({{ selectedVuls.length }})
      </el-button>
    </div>

    <!-- 表格 -->
    <el-table
      v-loading="vulLoading"
      :data="vulTableData"
      stripe
      size="small"
      max-height="calc(100vh - 560px)"
      @selection-change="handleVulSelectionChange"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column prop="vul_id" label="CVE" width="160">
        <template #default="{ row }">
          <div class="cve-cell">
            <a
              :href="`https://access.redhat.com/security/cve/${row.vul_id}`"
              target="_blank"
              class="cve-badge"
            >
              {{ row.vul_id }}
            </a>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="patch_id" label="补丁编号" width="150">
        <template #default="{ row }">
          <a href="javascript:void(0)" class="patch-link" @click="$emit('patch-click', {patch_id: row.patch_id})">
            {{ row.patch_id }}
          </a>
        </template>
      </el-table-column>
      <el-table-column prop="affected_pkgs" label="受影响的软件包" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">
          {{ formatPackages(row.affected_pkgs) }}
        </template>
      </el-table-column>
      <el-table-column prop="severity" label="严重程度" width="100">
        <template #default="{ row }">
          <el-tag :type="getSeverityType(row.severity)" size="small">
            {{ row.severity }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="reboot_status" label="重启要求" width="120">
        <template #default="{ row }">
          <el-tag v-if="row.reboot_status === '系统重启'" type="danger" size="small">
            <i class="fa fa-power-off"></i> 系统重启
          </el-tag>
          <el-tag v-else-if="row.reboot_status === '服务重启'" type="warning" size="small">
            <i class="fa fa-server"></i> 服务重启
          </el-tag>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="is_kernel" label="内核漏洞" width="100">
        <template #default="{ row }">
          <el-tag v-if="row.is_kernel === '是'" type="primary" size="small">
            <i class="fa fa-check"></i> 是
          </el-tag>
          <el-tag v-else type="info" size="small">
            <i class="fa fa-times"></i> 否
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="patch_status" label="修复状态" width="120">
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
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="row.patch_status === '已修复' || row.patch_status === '回滚失败'"
            type="info"
            size="small"
            circle
            @click="handleRollback(row)"
          >
            <i class="fa fa-history"></i>
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrapper">
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
  </div>
</template>

<script setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatDate, formatPackages, getSeverityType, getPatchStatusType, getPatchStatusText } from '../../composables/useFormatters'
import { useVulnerabilityList } from '../../composables/useVulnerabilityList'
import { Search } from '@element-plus/icons-vue'

const props = defineProps({
  hostId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['patch-click'])

// 使用漏洞列表逻辑
const {
  vulLoading,
  vulTableData,
  selectedVuls,
  selectedVulSeverities,
  vulPagination,
  loadVulnerabilityList,
  handleVulFilterChange,
  vulKeyword,
  handleVulKeywordChange,
  handleVulSelectionChange,
  handleVulPageChange,
  handleVulSizeChange
} = useVulnerabilityList({ value: props.hostId })

// 修复漏洞
function handleFixVulnerabilities() {
  if (selectedVuls.value.length === 0) {
    ElMessage.warning('请选择要修复的漏洞')
    return
  }

  // TODO: 调用修复漏洞的API
  ElMessage.info('漏洞修复功能开发中...')
}

// 回滚补丁
function handleRollback(row) {
  ElMessageBox.confirm(
    `确认要回滚补丁 ${row.patch_id} 吗？`,
    '确认回滚',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    // TODO: 调用回滚API
    ElMessage.success('回滚任务已提交')
  }).catch(() => {
    // 用户取消
  })
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

.text-muted {
  color: #6c757d;
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
