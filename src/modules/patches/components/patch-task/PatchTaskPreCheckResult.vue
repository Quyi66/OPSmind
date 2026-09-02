<template>
  <div v-if="result" class="pre-check-result-panel">
    <div class="panel-title">
      <i class="fa fa-heartbeat text-primary" />
      前置环境检查结果
    </div>

    <div v-if="result.unreachable?.length" class="unreachable-hosts-block">
      <div class="unreachable-hosts-title">不可达主机 ({{ result.unreachable.length }} 台)：</div>
      <div class="unreachable-hosts-tags">
        <el-tag v-for="hostId in result.unreachable" :key="hostId" type="danger" size="small">
          {{ resolveHostName(hostId) }}
        </el-tag>
      </div>
    </div>

    <div v-if="result.results?.length" class="host-results-list">
      <div v-for="hostResult in result.results" :key="hostResult.host_id" class="host-result-card">
        <div
          class="host-result-header"
          :class="{ 'is-unreachable': isHostUnreachable(hostResult) }"
        >
          <span class="host-name">
            <i class="fa fa-server me-1" />
            {{ resolveHostName(hostResult.host_id) }}
            <span v-if="isHostUnreachable(hostResult)" class="unreachable-label">(无法连通)</span>
          </span>
          <div class="host-tags">
            <el-tag v-if="hostResult.blockers > 0" type="danger" size="small" effect="dark">
              阻断项: {{ hostResult.blockers }}
            </el-tag>
            <el-tag v-if="hostResult.warnings > 0" type="warning" size="small" effect="dark">
              警告项: {{ hostResult.warnings }}
            </el-tag>
            <el-tag
              v-if="hostResult.blockers === 0 && hostResult.warnings === 0"
              type="success"
              size="small"
              effect="dark"
            >
              检查通过
            </el-tag>
          </div>
        </div>

        <div class="host-result-body">
          <el-collapse v-model="activeCollapseNames" class="no-border-collapse">
            <el-collapse-item title="查看检查项明细" :name="hostResult.host_id">
              <div class="checks-list">
                <div
                  v-for="check in sortChecks(hostResult.checks)"
                  :key="check.id"
                  class="check-item"
                >
                  <i
                    class="fa"
                    :class="checkIconClass(check.status)"
                    :style="checkIconStyle(check.status)"
                  />
                  <div class="check-item-content">
                    <div class="check-item-header">
                      <span class="check-title">{{ getCheckTitle(check.id) }}</span>
                      <el-tag
                        :type="checkTagType(check.status)"
                        size="small"
                        class="check-status-tag"
                      >
                        {{ checkStatusText(check.status) }}
                      </el-tag>
                    </div>
                    <div class="check-detail-text">{{ check.detail }}</div>
                  </div>
                </div>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  result: {
    type: Object,
    default: null
  },
  hostNameResolver: {
    type: Function,
    default: hostId => hostId || ''
  }
})

const activeCollapseNames = ref([])

const checkTitles = {
  conn: '连通性',
  sudo: '提权权限',
  os: '操作系统识别',
  pkg_manager: '包管理器',
  pkg_lock: '包管理器占用',
  pkg_db: '包数据库健康',
  disk: '磁盘空间',
  disk_boot: '/boot 空间',
  kernel_pending: '待重启内核',
  repo: '软件仓库',
  pkg_exists: '目标包存在性',
  version_ok: '目标版本可用性',
  depsolve: '依赖解析',
  already_satisfied: '已是目标版本',
  exec: '检查执行异常'
}

watch(
  () => props.result,
  result => {
    activeCollapseNames.value = Array.isArray(result?.results)
      ? result.results
          .filter(item => item.blockers > 0 || item.warnings > 0)
          .map(item => item.host_id)
      : []
  },
  { immediate: true }
)

function resolveHostName(hostId) {
  return props.hostNameResolver(hostId)
}

function getCheckTitle(id) {
  return checkTitles[id] || id
}

function isHostUnreachable(hostResult) {
  return (
    Array.isArray(hostResult?.checks) &&
    hostResult.checks.some(check => check.id === 'conn' && check.status === 'fail')
  )
}

function sortChecks(checks) {
  if (!Array.isArray(checks)) return []
  const severityMap = { fail: 0, warn: 1, ok: 2 }
  return [...checks].sort(
    (left, right) => (severityMap[left.status] ?? 3) - (severityMap[right.status] ?? 3)
  )
}

function checkIconClass(status) {
  return {
    'fa-times-circle': status === 'fail',
    'fa-exclamation-circle': status === 'warn',
    'fa-check-circle': status === 'ok'
  }
}

function checkIconStyle(status) {
  return {
    color:
      status === 'fail'
        ? 'var(--el-color-danger)'
        : status === 'warn'
          ? 'var(--el-color-warning)'
          : 'var(--el-color-success)'
  }
}

function checkTagType(status) {
  if (status === 'fail') return 'danger'
  if (status === 'warn') return 'warning'
  return 'success'
}

function checkStatusText(status) {
  if (status === 'fail') return '阻断'
  if (status === 'warn') return '警告'
  return '通过'
}
</script>

<style scoped lang="scss">
.pre-check-result-panel {
  box-sizing: border-box;
  width: 100%;
  margin-top: 16px;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background-color: var(--el-fill-color-blank);
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  color: var(--el-text-color-primary);
  font-size: 15px;
  font-weight: bold;
}

.text-primary {
  color: var(--el-color-primary);
}

.unreachable-hosts-block {
  margin-bottom: 12px;
}

.unreachable-hosts-title {
  margin-bottom: 6px;
  color: var(--el-color-danger);
  font-size: 13px;
  font-weight: 600;
}

.unreachable-hosts-tags,
.host-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.host-results-list {
  width: 100%;
}

.host-result-card {
  margin-bottom: 12px;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: var(--el-bg-color);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.host-result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--el-border-color-extra-light);
  background-color: var(--el-fill-color-light);

  &.is-unreachable {
    border-bottom-color: var(--el-color-danger-light-7);
    background-color: var(--el-color-danger-light-9);

    .host-name {
      color: var(--el-color-danger);
    }
  }
}

.host-name {
  display: flex;
  align-items: center;
  color: var(--el-text-color-primary);
  font-size: 14px;
  font-weight: 600;
}

.unreachable-label {
  margin-left: 8px;
  color: var(--el-color-danger);
  font-size: 12px;
  font-weight: normal;
}

.host-result-body {
  padding: 12px 16px;
}

.no-border-collapse {
  border: none;

  :deep(.el-collapse-item__header) {
    border-bottom: none;
    color: var(--el-text-color-regular);
    font-size: 13px;
  }

  :deep(.el-collapse-item__wrap) {
    border-bottom: none;
  }

  :deep(.el-collapse-item__content) {
    padding-bottom: 0;
  }
}

.checks-list {
  padding-top: 4px;
}

.check-item {
  display: flex;
  align-items: flex-start;
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-extra-light);

  &:last-child {
    border-bottom: none;
  }

  > i {
    margin-top: 2px;
    margin-right: 10px;
    font-size: 16px;
  }
}

.check-item-content {
  flex: 1;
}

.check-item-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.check-title {
  color: var(--el-text-color-primary);
  font-size: 13px;
  font-weight: 600;
}

.check-status-tag {
  height: 16px;
  padding: 0 4px;
  font-size: 10px;
  line-height: 14px;
}

.check-detail-text {
  margin-top: 4px;
  color: var(--el-text-color-regular);
  font-size: 12px;
  line-height: 1.4;
}
</style>
