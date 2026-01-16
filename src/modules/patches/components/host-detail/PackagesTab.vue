<template>
  <div class="tab-content">
    <!-- 筛选栏 -->
    <div class="ops-filter-bar">
      <el-form inline size="small">
        <el-form-item label="漏洞范围" label-width="70">
          <el-select v-model="packageFilter.showHistory" style="width: 100px" @change="handlePackageFilterChange">
            <el-option label="最新漏洞" value="no" />
            <el-option label="历史漏洞" value="yes" />
          </el-select>
        </el-form-item>
        <el-form-item label="软件包范围" label-width="85">
          <el-select v-model="packageFilter.showAll" style="width: 130px" @change="handlePackageFilterChange">
            <el-option label="有漏洞的软件包" value="no" />
            <el-option label="所有软件包" value="yes" />
          </el-select>
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
    </div>

    <!-- 表格 -->
    <el-table
      v-loading="packageLoading"
      :data="packageTableData"
      stripe
      size="small"
      max-height="calc(100vh - 580px)"
      @selection-change="handlePackageSelectionChange"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column prop="installedPkg" label="当前安装版本" min-width="250" show-overflow-tooltip />
      <el-table-column prop="updatePkg" label="需更新版本" min-width="250" show-overflow-tooltip />
      <el-table-column prop="patchId" label="补丁编号" width="150">
        <template #default="{ row }">
          <a v-if="row.patchId" href="javascript:void(0)" class="patch-link" @click="$emit('patch-click', {patch_id: row.patchId})">
            {{ row.patchId }}
          </a>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="severity" label="严重程度" width="100">
        <template #default="{ row }">
          <el-tag v-if="row.severity" :type="getSeverityType(row.severity)" size="small">
            {{ row.severity }}
          </el-tag>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrapper">
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
import { ElMessageBox, ElMessage } from 'element-plus'
import { getSeverityType } from '../../composables/useFormatters'
import { usePackageList } from '../../composables/usePackageList'

const props = defineProps({
  hostId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['patch-click'])

// 使用软件包列表逻辑
const {
  packageLoading,
  packageTableData,
  selectedPackages,
  packageFilter,
  packagePagination,
  loadPackageList,
  handlePackageFilterChange,
  handlePackageSelectionChange,
  handlePackagePageChange,
  handlePackageSizeChange
} = usePackageList({ value: props.hostId })

// 更新软件包
function handleUpdatePackages() {
  if (selectedPackages.value.length === 0) {
    ElMessage.warning('请选择要更新的软件包')
    return
  }

  ElMessageBox.confirm(
    `确认要更新选中的 ${selectedPackages.value.length} 个软件包吗？`,
    '确认更新',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    // TODO: 调用更新软件包的API
    ElMessage.success('软件包更新任务已提交')
  }).catch(() => {
    // 用户取消
  })
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
  border-top: 1px solid #e4e7ed;
}

:deep(.el-pagination) {
  margin-top: 0 !important;
}
</style>
