<template>
  <el-dialog
    :model-value="modelValue"
    :title="t('patches.linux.failedHostsTitle')"
    width="1000px"
    destroy-on-close
    :close-on-click-modal="true"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-loading="loading">
      <div class="ops-action-bar">
        <span v-if="result">{{ t('patches.linux.failedHostCount', { count: failedHostCount }) }}</span>
        <span class="action-spacer" />
        <el-button size="small" :loading="loading" @click="load">{{ t('common.refresh') }}</el-button>
      </div>
      <el-alert
        v-if="errorMessage"
        :title="errorMessage"
        type="error"
        :closable="false"
        show-icon
      />
      <template v-else-if="result">
        <div class="failed-host-filters" role="search" :aria-label="t('patches.linux.filterTaskHosts')">
          <el-input
            v-model="keyword"
            class="failed-host-search"
            size="small"
            :placeholder="t('patches.linux.searchHostReason')"
            :aria-label="t('patches.linux.searchHostReason')"
            clearable
          />
          <el-select
            v-model="selectedGroup"
            class="failed-host-category"
            size="small"
            :aria-label="t('patches.linux.hostCategory')"
          >
            <el-option :label="t('patches.linux.allCategories')" value="all" />
            <el-option :label="t('patches.linux.precheckFailed')" value="preCheckFailed" />
            <el-option :label="t('patches.linux.installFailed')" value="installFailed" />
            <el-option :label="t('patches.linux.notDispatched')" value="skipped" />
          </el-select>
          <el-button size="small" :disabled="!hasFilters" @click="clearFilters">{{ t('patches.linux.clearFilters') }}</el-button>
        </div>
        <section v-for="group in filteredGroups" :key="group.key" class="failed-host-group">
          <h3>{{ t('patches.linux.groupShown', { label: group.label, shown: group.rows.length, total: group.total }) }}</h3>
          <p v-if="group.key === 'skipped'" class="skipped-host-hint">
            {{ t('patches.linux.notDispatchedHint') }}
          </p>
          <el-table
            :data="group.rows"
            max-height="260"
            size="small"
            :empty-text="
              group.total > 0
                ? t('patches.linux.noHostReasonMatches')
                : group.key === 'skipped'
                  ? t('patches.linux.noUndispatchedHosts')
                  : t('patches.linux.noFailedHosts')
            "
          >
            <el-table-column prop="hostKey" :label="t('execution.ui.host')" min-width="160">
              <template #default="{ row }">{{ row.hostKey || '-' }}</template>
            </el-table-column>
            <el-table-column
              prop="reason"
              :label="group.key === 'skipped' ? t('patches.linux.notDispatchedReason') : t('patches.linux.failureReason')"
              min-width="360"
            >
              <template #default="{ row }">
                <span class="failure-reason">{{ row.reason || '-' }}</span>
              </template>
            </el-table-column>
          </el-table>
        </section>
      </template>
    </div>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">{{ t('common.close') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { t } from '@/core/i18n'
import { message, messageRef } from '@/core/i18n/feedback'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { patchInstallApi } from '../../../api'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  taskId: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])
const loading = ref(false)
const result = ref(null)
const errorMessage = messageRef('')
const keyword = ref('')
const selectedGroup = ref('all')
let requestId = 0

const failureGroups = computed(() => [
  { key: 'preCheckFailed', get label() { return t('patches.linux.precheckFailed') }, rows: result.value?.preCheckFailed || [] },
  { key: 'installFailed', get label() { return t('patches.linux.installFailed') }, rows: result.value?.installFailed || [] }
])
const groups = computed(() => [
  ...failureGroups.value,
  { key: 'skipped', get label() { return t('patches.linux.notDispatched') }, rows: result.value?.skipped || [] }
])
const searchTerm = computed(() => keyword.value.trim().toLowerCase())
const hasFilters = computed(() => Boolean(searchTerm.value) || selectedGroup.value !== 'all')
const filteredGroups = computed(() =>
  groups.value
    .filter(group => selectedGroup.value === 'all' || group.key === selectedGroup.value)
    .map(group => ({
      ...group,
      total: group.rows.length,
      rows: group.rows.filter(row =>
        [row.hostKey, row.reason].some(value =>
          String(value ?? '')
            .toLowerCase()
            .includes(searchTerm.value)
        )
      )
    }))
)
const failedHostCount = computed(() => {
  const ids = result.value?.failedHostIds
  if (Array.isArray(ids)) return new Set(ids).size
  return new Set(
    failureGroups.value.flatMap(group => group.rows.map(row => row.hostId)).filter(Boolean)
  ).size
})

function clearFilters() {
  keyword.value = ''
  selectedGroup.value = 'all'
}

async function load() {
  const id = ++requestId
  result.value = null
  errorMessage.value = ''
  if (!props.taskId) {
    errorMessage.value = message('patches.linux.failedHostsTaskMissing')
    loading.value = false
    return
  }
  loading.value = true
  try {
    const response = await patchInstallApi.getFailedHosts(props.taskId)
    if (id !== requestId) return
    result.value = response?.data ?? response
  } catch (error) {
    if (id !== requestId) return
    errorMessage.value =
      error?.response?.status === 404 ? message('patches.linux.taskDeleted') : t('patches.linux.failedHostsLoadFailed')
  } finally {
    if (id === requestId) loading.value = false
  }
}

watch(
  () => [props.modelValue, props.taskId],
  ([visible]) => {
    requestId += 1
    loading.value = false
    result.value = null
    errorMessage.value = ''
    clearFilters()
    if (visible) load()
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  requestId += 1
})
</script>

<style scoped>
.action-spacer {
  flex: 1;
}
.failed-host-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.failed-host-search {
  flex: 1 1 260px;
  min-width: 0;
}
.failed-host-category {
  width: 200px;
  max-width: 100%;
}
.failed-host-group {
  margin-top: 16px;
}
.failed-host-group h3 {
  margin: 0 0 8px;
  font-size: 14px;
}
.skipped-host-hint {
  margin: 0 0 8px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.failure-reason {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
