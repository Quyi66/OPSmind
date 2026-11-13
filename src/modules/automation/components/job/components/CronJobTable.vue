<template>
  <div class="table-container">
    <el-table
      ref="tableRef"
      v-loading="loading"
      :data="unavailable ? [] : pagedData"
      max-height="calc(100vh - 274px)"
      :default-sort="{ prop: 'id', order: 'descending' }"
      @selection-change="$emit('selection-change', $event)"
    >
      <el-table-column type="selection" width="50" align="left" :selectable="() => !unavailable" />

      <el-table-column prop="jobDesc" :label="t('automation.schedule.taskName')" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">
          <span :title="getCronTaskConfirmation(row)">
            {{ getCronTaskDisplayName(row, identityData || data) }}
          </span>
        </template>
      </el-table-column>

      <el-table-column prop="scheduleConf" :label="t('automation.schedule.expressionLabel')" width="140" align="left">
        <template #default="{ row }">
          <el-tag size="small" type="info">{{ row.scheduleConf }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column :label="t('automation.job.toolType')" width="110" align="left">
        <template #default="{ row }">
          <el-tag :type="getJobTypeTag(row.jobType)" size="small">
            {{ getJobTypeName(row.jobType) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column :label="t('automation.list.currentStatus')" width="100" align="left">
        <template #default="{ row }">
          <el-tag
            :type="row.triggerStatus === '1' ? 'success' : 'danger'"
            size="small"
            style="cursor: pointer"
            role="button"
            :tabindex="unavailable || row._switching ? -1 : 0"
            :aria-disabled="unavailable || row._switching"
            :aria-label="t('automation.cron.toggleAria', { name: getCronTaskConfirmation(row), status: row.triggerStatus === '1' ? t('automation.list.enabled') : t('automation.list.disabled') })"
            @click="!unavailable && !row._switching && $emit('toggle-status', row)"
            @keydown.enter.prevent="!unavailable && !row._switching && $emit('toggle-status', row)"
            @keydown.space.prevent="!unavailable && !row._switching && $emit('toggle-status', row)"
          >
            {{ row.triggerStatus === '1' ? t('automation.list.enabled') : t('automation.list.disabled') }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="author" :label="t('automation.list.createdBy')" width="100" align="left" />

      <!-- <el-table-column label="查看" width="80" align="left">
        <template #default="{ row }">
          <el-button
            type="default"
            size="small"
            plain
            :icon="Clock"
            title="查询下次执行时间"
            @click="$emit('query-next-time', row)"
          />
        </template>
      </el-table-column> -->

      <el-table-column :label="t('common.actions')" width="260" align="left" fixed="right">
        <template #default="{ row }">
          <el-button
            text
            type="primary"
            size="small"
            :disabled="unavailable"
            @click="$emit('execute', row)"
          >
            {{ t('automation.workbench.execute') }}
          </el-button>
          <el-button
            text
            type="primary"
            size="small"
            :disabled="unavailable"
            @click="$emit('edit', row)"
          >
            {{ t('automation.workbench.edit') }}
          </el-button>
          <el-button
            text
            type="primary"
            size="small"
            :disabled="unavailable"
            @click="$emit('copy', row)"
          >
            {{ t('automation.workbench.copy') }}
          </el-button>
          <el-button
            type="primary"
            size="small"
            text
            :title="t('automation.schedule.queryNextTime')"
            :disabled="unavailable"
            @click="$emit('query-next-time', row)"
          >
            {{ t('automation.schedule.nextTimes') }}
          </el-button>
          <el-button
            text
            type="danger"
            size="small"
            :disabled="unavailable"
            @click="$emit('delete', row)"
          >
            {{ t('common.delete') }}
          </el-button>
        </template>
      </el-table-column>
      <template #empty>
        <span v-if="loading">{{ t('automation.list.readingCron') }}</span>
        <span v-else-if="unavailable">{{ t('automation.list.readFailedRetry') }}</span>
        <span v-else>{{ identityData?.length ? t('automation.list.noMatchingCron') : t('automation.workbench.noCron') }}</span>
      </template>
    </el-table>
    <div v-if="!unavailable || loading" class="table-pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="data.length"
        layout="total, sizes, prev, pager, next, jumper"
        background
        :disabled="unavailable"
        @size-change="handleSizeChange"
      />
    </div>
  </div>
</template>

<script setup>
import { t } from '@/core/i18n'

import { Edit, Delete, CopyDocument, VideoPlay, Clock } from '@element-plus/icons-vue'
import { computed, ref, watch } from 'vue'
import {
  getCronTaskConfirmation,
  getCronTaskDisplayName,
  getCronTaskType
} from '@/modules/automation/utils/cronTaskPresentation'

const props = defineProps({
  identityData: { type: Array, default: null },
  data: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  unavailable: { type: Boolean, default: false },
  filterKey: { type: Number, default: 0 },
  appletMap: {
    type: Object,
    default: () => ({})
  }
})

defineEmits([
  'selection-change',
  'edit',
  'delete',
  'copy',
  'execute',
  'toggle-status',
  'query-next-time'
])

const currentPage = ref(1)
const pageSize = ref(10)
const tableRef = ref(null)

function handleSizeChange() {
  currentPage.value = 1
}
watch(
  () => props.filterKey,
  () => {
    currentPage.value = 1
    tableRef.value?.clearSelection()
  }
)
watch(
  () => props.unavailable,
  value => {
    if (value) tableRef.value?.clearSelection()
  }
)
watch(
  () => [props.data.length, props.loading],
  ([, loading]) => {
    if (!loading)
      currentPage.value = Math.min(
        currentPage.value,
        Math.max(1, Math.ceil(props.data.length / pageSize.value))
      )
  }
)

const pagedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return props.data.slice(start, start + pageSize.value)
})

/**
 * 获取作业类型名称
 */
function getJobTypeName(type) {
  return getCronTaskType(type)
}

/**
 * 获取作业类型标签样式
 */
function getJobTypeTag(type) {
  const tagMap = {
    audit: 'success',
    cac: 'success',
    script: 'primary',
    rest: 'warning',
    cmd: 'info',
    flows: ''
  }
  return tagMap[type] || 'info'
}
</script>

<style scoped>
.table-container {
  flex: 1;
  overflow: auto;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 12px 0 0;
}
</style>
