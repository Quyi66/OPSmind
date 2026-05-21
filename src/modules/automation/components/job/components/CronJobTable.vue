<template>
  <div class="table-container">
    <el-table
      v-loading="loading"
      :data="pagedData"
      max-height="calc(100vh - 240px)"
      :default-sort="{ prop: 'id', order: 'descending' }"
      @selection-change="$emit('selection-change', $event)"
    >
      <el-table-column type="selection" width="50" align="left" />
      <el-table-column prop="id" label="任务ID" width="90" align="left" sortable />

      <el-table-column prop="jobDesc" label="任务描述" show-overflow-tooltip />

      <el-table-column prop="scheduleConf" label="CRON表达式" width="140" align="left">
        <template #default="{ row }">
          <el-tag size="small" type="info">{{ row.scheduleConf }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="appCode" label="应用资源" width="120" align="left">
        <template #default="{ row }">
          {{ getAppName(row.appCode) }}
        </template>
      </el-table-column>

      <el-table-column label="运维工具类型" width="110" align="left">
        <template #default="{ row }">
          <el-tag :type="getJobTypeTag(row.jobType)" size="small">
            {{ getJobTypeName(row.jobType) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="当前状态" width="100" align="left">
        <template #default="{ row }">
          <el-tag
            :type="row.triggerStatus === '1' ? 'success' : 'danger'"
            size="small"
            style="cursor: pointer;"
            @click="$emit('toggle-status', row)"
          >
            {{ row.triggerStatus === '1' ? '已启用' : '已停用' }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="author" label="创建者" width="100" align="left" />

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

      <el-table-column label="操作" width="260" align="left" fixed="right">
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
            type="primary"
            size="small"
            text
            title="查询下次执行时间"
            @click="$emit('query-next-time', row)"
          >下次执行时间</el-button>
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
    <div class="table-pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="data.length"
        layout="total, sizes, prev, pager, next, jumper"
        background
      />
    </div>
  </div>
</template>

<script setup>
import { Edit, Delete, CopyDocument, VideoPlay, Clock } from '@element-plus/icons-vue'
import { computed, ref } from 'vue'

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

const currentPage = ref(1)
const pageSize = ref(10)

const pagedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return props.data.slice(start, start + pageSize.value)
})

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

.table-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 12px 0 0;
}
</style>
