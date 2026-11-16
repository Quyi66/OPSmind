<template>
  <div v-if="result" class="pre-check-result-panel">
    <div class="panel-title">
      <i class="fa fa-heartbeat text-primary" />
      {{ t('patches.linux.precheckResults') }}
    </div>

    <div v-if="result.unreachable?.length" class="unreachable-hosts-block">
      <div class="unreachable-hosts-title">{{ t('patches.linux.unreachableCount', { count: result.unreachable.length }) }}</div>
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
            <span v-if="isHostUnreachable(hostResult)" class="unreachable-label">({{ t('patches.linux.unreachable') }})</span>
          </span>
          <div class="host-tags">
            <el-tag v-if="hostResult.blockers > 0" type="danger" size="small" effect="dark">
              {{ t('patches.linux.blockingChecks') }} {{ hostResult.blockers }}
            </el-tag>
            <el-tag v-if="hostResult.warnings > 0" type="warning" size="small" effect="dark">
              {{ t('patches.linux.warningChecks') }} {{ hostResult.warnings }}
            </el-tag>
            <el-tag
              v-if="isHostPassed(hostResult)"
              type="success"
              size="small"
              effect="dark"
            >
              {{ t('patches.linux.checksPassed') }}
            </el-tag>
          </div>
        </div>

        <div v-if="shouldShowChecks(hostResult)" class="host-result-body">
          <el-collapse v-model="activeCollapseNames" class="no-border-collapse">
            <el-collapse-item :title="t('patches.linux.viewChecks')" :name="hostResult.host_id">
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
import { t } from '@/core/i18n'
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
  get conn() { return t('patches.linux.connectivity') },
  get sudo() { return t('patches.linux.sudo') },
  get os() { return t('patches.linux.osDetection') },
  get pkg_manager() { return t('patches.linux.packageManager') },
  get pkg_lock() { return t('patches.linux.packageManagerLock') },
  get pkg_db() { return t('patches.linux.packageDatabase') },
  get disk() { return t('patches.linux.diskSpace') },
  get disk_boot() { return t('patches.linux.bootSpace') },
  get kernel_pending() { return t('patches.linux.pendingKernel') },
  get repo() { return t('patches.linux.softwareRepo') },
  get pkg_exists() { return t('patches.linux.packageExists') },
  get version_ok() { return t('patches.linux.targetVersion') },
  get depsolve() { return t('patches.linux.dependencyResolution') },
  get already_satisfied() { return t('patches.linux.alreadyTargetVersion') },
  get exec() { return t('patches.linux.checkExecutionError') }
}

watch(
  () => props.result,
  result => {
    activeCollapseNames.value = Array.isArray(result?.results)
      ? result.results
          .filter(item => shouldShowChecks(item))
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

function isHostPassed(hostResult) {
  return (
    Number(hostResult?.blockers || 0) === 0 &&
    Number(hostResult?.warnings || 0) === 0 &&
    !isHostUnreachable(hostResult)
  )
}

function shouldShowChecks(hostResult) {
  return !isHostPassed(hostResult) && Array.isArray(hostResult?.checks) && hostResult.checks.length > 0
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
  if (status === 'fail') return t('patches.linux.blocked')
  if (status === 'warn') return t('patches.linux.warning')
  return t('patches.linux.pass')
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

  &:last-child {
    border-bottom: none;
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
