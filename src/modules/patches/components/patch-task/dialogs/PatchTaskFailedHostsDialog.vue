<template>
  <el-dialog
    :model-value="modelValue"
    title="安装任务失败主机"
    width="1000px"
    destroy-on-close
    :close-on-click-modal="true"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-loading="loading">
      <div class="ops-action-bar">
        <span v-if="result">失败主机共 {{ failedHostCount }} 台（去重）</span>
        <span class="action-spacer" />
        <el-button size="small" :loading="loading" @click="load">刷新</el-button>
      </div>
      <el-alert
        v-if="errorMessage"
        :title="errorMessage"
        type="error"
        :closable="false"
        show-icon
      />
      <template v-else-if="result">
        <div class="failed-host-filters" role="search" aria-label="筛选当前任务主机清单">
          <el-input
            v-model="keyword"
            class="failed-host-search"
            size="small"
            placeholder="搜索主机/IP或原因"
            aria-label="搜索主机/IP或原因"
            clearable
          />
          <el-select
            v-model="selectedGroup"
            class="failed-host-category"
            size="small"
            aria-label="主机分类"
          >
            <el-option label="全部分类" value="all" />
            <el-option label="预检失败" value="preCheckFailed" />
            <el-option label="安装失败" value="installFailed" />
            <el-option label="未下发（无可更新包）" value="skipped" />
          </el-select>
          <el-button size="small" :disabled="!hasFilters" @click="clearFilters">清除筛选</el-button>
        </div>
        <section v-for="group in filteredGroups" :key="group.key" class="failed-host-group">
          <h3>{{ group.label }}（显示 {{ group.rows.length }} / 共 {{ group.total }}）</h3>
          <p v-if="group.key === 'skipped'" class="skipped-host-hint">
            未下发主机不计入失败，不参与重新建任务。
          </p>
          <el-table
            :data="group.rows"
            max-height="260"
            size="small"
            :empty-text="
              group.total > 0
                ? '未匹配到主机或原因，请调整或清除筛选'
                : group.key === 'skipped'
                  ? '暂无未下发主机'
                  : '暂无失败主机'
            "
          >
            <el-table-column prop="hostKey" label="主机" min-width="160">
              <template #default="{ row }">{{ row.hostKey || '-' }}</template>
            </el-table-column>
            <el-table-column
              prop="reason"
              :label="group.key === 'skipped' ? '未下发原因' : '失败原因'"
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
      <el-button @click="emit('update:modelValue', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { patchInstallApi } from '../../../api'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  taskId: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])
const loading = ref(false)
const result = ref(null)
const errorMessage = ref('')
const keyword = ref('')
const selectedGroup = ref('all')
let requestId = 0

const failureGroups = computed(() => [
  { key: 'preCheckFailed', label: '预检失败', rows: result.value?.preCheckFailed || [] },
  { key: 'installFailed', label: '安装失败', rows: result.value?.installFailed || [] }
])
const groups = computed(() => [
  ...failureGroups.value,
  { key: 'skipped', label: '未下发（无可更新包）', rows: result.value?.skipped || [] }
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
    errorMessage.value = '当前任务信息不完整，无法查询失败主机'
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
      error?.response?.status === 404 ? '任务不存在或已删除' : '加载失败主机失败，请点击刷新重试'
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
