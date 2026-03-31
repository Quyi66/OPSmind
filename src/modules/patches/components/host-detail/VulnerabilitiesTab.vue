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
      <el-form inline size="small">
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
    </div>

    <!-- 表格 -->
    <el-table
      v-loading="vulLoading"
      :data="vulTableData"
      size="small"
      max-height="calc(100vh - 400px)"
      @selection-change="handleVulSelectionChange"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column prop="vul_id" label="CVE" width="160">
        <template #default="{ row }">
          <div class="cve-cell">
            <a :href="getCveUrl(row.vul_id, osDistro)" target="_blank" class="cve-badge">
              {{ row.vul_id }}
            </a>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="patch_id" label="补丁编号" width="180">
        <template #default="{ row }">
          <div class="patch-list">
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
        </template>
      </el-table-column>
      <el-table-column
        prop="affected_pkgs"
        label="受影响的软件包"
        min-width="200"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ formatPackages(row.affected_pkgs) }}
        </template>
      </el-table-column>
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
      <el-table-column prop="reboot_status" label="重启要求" width="120">
        <template #default="{ row }">
          <el-tag v-if="row.reboot_status === '系统重启'" type="danger" size="small">
            <i class="fa fa-power-off"></i>
            系统重启
          </el-tag>
          <el-tag v-else-if="row.reboot_status === '服务重启'" type="warning" size="small">
            <i class="fa fa-server"></i>
            服务重启
          </el-tag>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="is_kernel" label="内核漏洞" width="100">
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
  </div>
</template>

<script setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  formatDate,
  formatPackages,
  getCveUrl,
  getSeverityType,
  getPatchStatusType,
  getPatchStatusText
} from '../../composables/useFormatters'
import { useVulnerabilityList } from '../../composables/useVulnerabilityList'
import { Search } from '@element-plus/icons-vue'

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

function getPatchIdList(patchId) {
  if (!patchId) return []
  return String(patchId)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

// 使用漏洞列表逻辑
const {
  vulLoading,
  vulTableData,
  selectedVuls,
  vulPagination,
  loadVulnerabilityList,
  vulKeyword,
  handleVulKeywordChange,
  vulPatchStatus,
  handleVulPatchStatusChange,
  handleVulSelectionChange,
  handleVulPageChange,
  handleVulSizeChange
} = useVulnerabilityList({ value: props.hostId })

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
  color: var(--el-text-color-secondary);
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
  max-height: 80px;
  overflow-y: auto;
}
</style>
