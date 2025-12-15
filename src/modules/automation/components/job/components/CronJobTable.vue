<template>
  <div class="table-container">
    <el-table
      v-loading="loading"
      :data="data"
      stripe
      border
      :default-sort="{ prop: 'id', order: 'descending' }"
      @selection-change="$emit('selection-change', $event)"
    >
      <el-table-column type="selection" width="50" align="center" />
      <el-table-column prop="id" label="任务ID" width="80" align="center" sortable />

      <el-table-column prop="jobDesc" label="任务描述" min-width="180" show-overflow-tooltip />

      <el-table-column prop="scheduleConf" label="CRON表达式" width="140" align="center">
        <template #default="{ row }">
          <el-tag size="small" type="info">{{ row.scheduleConf }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="appCode" label="应用资源" width="120" align="center">
        <template #default="{ row }">
          {{ getAppName(row.appCode) }}
        </template>
      </el-table-column>

      <el-table-column label="作业类型" width="120" align="center">
        <template #default="{ row }">
          <el-tag :type="getJobTypeTag(row.jobType)" size="small">
            {{ getJobTypeName(row.jobType) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="当前状态" width="100" align="center">
        <template #default="{ row }">
          <el-button
            :type="row.triggerStatus === '1' ? 'success' : 'danger'"
            size="small"
            :loading="row._switching"
            @click="$emit('toggle-status', row)"
          >
            {{ row.triggerStatus === '1' ? '已启用' : '已停用' }}
          </el-button>
        </template>
      </el-table-column>

      <el-table-column prop="author" label="创建者" width="100" align="center" />

      <el-table-column label="查看" width="80" align="center">
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
      </el-table-column>

      <el-table-column label="操作" width="176" align="center" fixed="right">
        <template #default="{ row }">
          <el-button
            text
            type="primary"
            size="small"
            @click="$emit('execute', row)"
          >
            执行
          </el-button>
          <el-button
            text
            type="primary"
            size="small"
            @click="$emit('edit', row)"
          >
            编辑
          </el-button>
          <el-button
            text
            type="primary"
            size="small"
            @click="$emit('copy', row)"
          >
            复制
          </el-button>
          <el-button
            text
            type="danger"
            size="small"
            @click="$emit('delete', row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { Edit, Delete, CopyDocument, VideoPlay, Clock } from '@element-plus/icons-vue'

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
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

/**
 * 获取应用名称
 */
function getAppName(appCode) {
  if (!appCode) return '-'
  return props.appletMap[appCode] || appCode
}

/**
 * 获取作业类型名称
 */
function getJobTypeName(type) {
  const typeMap = {
    rest: 'REST接口',
    script: '脚本任务',
    cac: '巡检任务',
    cmd: '命令任务',
    flows: '流程任务'
  }
  return typeMap[type] || type
}

/**
 * 获取作业类型标签样式
 */
function getJobTypeTag(type) {
  const tagMap = {
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
</style>
