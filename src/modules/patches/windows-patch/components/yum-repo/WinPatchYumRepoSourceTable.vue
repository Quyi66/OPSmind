<template>
  <div class="win-patch-yum-page">
    <!-- <el-alert
      title="此处展示的是 YUM源配置页中已录入的 yum_configs，新增和编辑请在原有 YUM源配置页面完成。"
      type="info"
      :closable="false"
      show-icon
    /> -->

    <div class="ops-action-bar">
      <span class="win-patch-selection-text">当前配置：{{ currentConfigLabel }}</span>
      <span class="win-patch-selection-text">已采集仓库：{{ sources.length }}</span>
      <span style="flex: 1"></span>
      <el-button class="toolbar-icon-btn" circle size="small" :loading="loading" @click="$emit('refresh')">
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <div class="ops-table-wrapper">
      <el-table
        v-loading="loading"
        :data="configs"
        max-height="calc(100vh - 250px)"
        :row-class-name="getRowClassName"
        @row-click="handleRowClick"
      >
        <!-- <el-table-column label="当前" width="72" align="center">
          <template #default="{ row }">
            <el-tag v-if="resolveYumConfigId(row) === normalizedSelectedConfigId" size="small" type="success">
              当前
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column> -->
        <el-table-column label="源名称" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ getYumConfigLabel(row) }}
          </template>
        </el-table-column>
        <el-table-column label="描述" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.description || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="仓库地址" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            {{ getYumConfigBaseurl(row) }}
          </template>
        </el-table-column>
        <el-table-column label="来源文件" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ getYumConfigFile(row) }}
          </template>
        </el-table-column>
        <el-table-column label="录入标识" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{ getYumConfigMarkerValue(row) }}
          </template>
        </el-table-column>
        <!-- <el-table-column label="采集仓库" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <el-tag v-if="getSourceId(row)" type="success" size="small" effect="plain">
              {{ getSourceId(row) }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column> -->
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button
              text
              type="primary"
              size="small"
              :loading="collectingConfigId === resolveYumConfigId(row)"
              @click.stop="emit('collect', row)"
            >
              触发采集
            </el-button>
            <el-button text type="primary" size="small" :disabled="!getSourceId(row)" @click.stop="emit('open-packages', row)">
              清单
            </el-button>
            <el-button text type="primary" size="small" :disabled="!getSourceId(row)" @click.stop="emit('open-compare', row)">
              比对
            </el-button>
            <el-button
              text
              type="danger"
              size="small"
              :disabled="!getSourceId(row)"
              @click.stop="emit('delete-source', row)"
            >
              删除采集
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
import {
  findYumRepoSourceByConfig,
  getYumConfigBaseurl,
  getYumConfigFile,
  getYumConfigMarkerValue,
  getYumConfigLabel,
  resolveYumConfigId,
  resolveYumRepoId
} from '../../yumRepoUtils'

const props = defineProps({
  configs: {
    type: Array,
    default: () => []
  },
  sources: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  selectedConfigId: {
    type: String,
    default: ''
  },
  collectingConfigId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits([
  'refresh',
  'collect',
  'delete-source',
  'open-packages',
  'open-compare',
  'update:selectedConfigId'
])

const normalizedSelectedConfigId = computed(() => String(props.selectedConfigId || '').trim())
const currentConfigLabel = computed(() => {
  const currentConfig = props.configs.find(item => resolveYumConfigId(item) === normalizedSelectedConfigId.value)
  return currentConfig ? getYumConfigLabel(currentConfig) : '未选择'
})

function getSourceId(row) {
  return resolveYumRepoId(findYumRepoSourceByConfig(row, props.sources))
}

function handleRowClick(row) {
  emit('update:selectedConfigId', resolveYumConfigId(row))
}

function getRowClassName({ row }) {
  return resolveYumConfigId(row) === normalizedSelectedConfigId.value ? 'win-patch-yum-table__active-row' : ''
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
