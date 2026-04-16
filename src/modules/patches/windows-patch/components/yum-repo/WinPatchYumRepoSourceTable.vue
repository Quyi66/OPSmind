<template>
  <div class="win-patch-yum-page">
    <div class="ops-action-bar">
      <el-button type="primary" size="small" @click="$emit('create')">登记仓库</el-button>
      <span class="win-patch-selection-text">当前仓库：{{ currentRepoLabel }}</span>
      <span style="flex: 1"></span>
      <el-button class="toolbar-icon-btn" circle size="small" :loading="loading" @click="$emit('refresh')">
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <div class="ops-table-wrapper">
      <el-table
        v-loading="loading"
        :data="repos"
        max-height="calc(100vh - 250px)"
        :row-class-name="getRowClassName"
        @row-click="handleRowClick"
      >
        <el-table-column label="当前" width="72" align="center">
          <template #default="{ row }">
            <el-tag v-if="resolveYumRepoId(row) === normalizedSelectedRepoId" size="small" type="success">
              当前
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="显示名称" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ getYumRepoLabel(row) }}
          </template>
        </el-table-column>
        <el-table-column label="仓库地址" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            {{ pickValue(row, ['repoUrl', 'repo_url'], '-') }}
          </template>
        </el-table-column>
        <el-table-column label="仓库 ID" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{ pickValue(row, ['repoId', 'repo_id'], '-') }}
          </template>
        </el-table-column>
        <el-table-column label="OS" min-width="120">
          <template #default="{ row }">
            {{ getYumRepoOsLabel(row) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="pickValue(row, ['enabled'], true) === false ? 'info' : 'success'" size="small" effect="plain">
              {{ pickValue(row, ['enabled'], true) === false ? '停用' : '启用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="来源" width="120" align="center">
          <template #default="{ row }">
            {{ pickValue(row, ['sourceType', 'source_type'], '-') }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click.stop="emit('open-packages', row)">
              包清单
            </el-button>
            <el-button text type="primary" size="small" @click.stop="emit('open-compare', row)">
              比对
            </el-button>
            <el-button text type="primary" size="small" @click.stop="emit('edit', row)">
              编辑
            </el-button>
            <el-button text type="danger" size="small" @click.stop="emit('delete', row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { pickValue } from '../../utils'
import { getYumRepoLabel, getYumRepoOsLabel, resolveYumRepoId } from '../../yumRepoUtils'

const props = defineProps({
  repos: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  selectedRepoId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits([
  'create',
  'edit',
  'delete',
  'refresh',
  'open-packages',
  'open-compare',
  'update:selectedRepoId'
])

const normalizedSelectedRepoId = computed(() => String(props.selectedRepoId || '').trim())
const currentRepoLabel = computed(() => {
  const currentRepo = props.repos.find(item => resolveYumRepoId(item) === normalizedSelectedRepoId.value)
  return currentRepo ? getYumRepoLabel(currentRepo) : '未选择'
})

function handleRowClick(row) {
  emit('update:selectedRepoId', resolveYumRepoId(row))
}

function getRowClassName({ row }) {
  return resolveYumRepoId(row) === normalizedSelectedRepoId.value ? 'win-patch-yum-table__active-row' : ''
}
</script>

<style scoped lang="scss">
.win-patch-yum-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.win-patch-selection-text {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

:deep(.win-patch-yum-table__active-row td) {
  background: color-mix(in srgb, var(--el-color-primary-light-9) 70%, white 30%);
}
</style>
