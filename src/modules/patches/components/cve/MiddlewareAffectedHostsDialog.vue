<template>
  <el-dialog
    :model-value="modelValue"
    :title="`${cveId || '中间件 CVE'} · 受影响主机`"
    width="1200px"
    destroy-on-close
    :close-on-click-modal="true"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-loading="loading">
      <div class="ops-action-bar">
        <span>中间件：{{ middlewareType || '全部' }}</span>
        <span>共 {{ hosts.length }} 条受影响记录</span>
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
      <el-table v-else :data="hosts" max-height="480" size="small" empty-text="暂无受影响主机">
        <el-table-column prop="hostKey" label="主机" min-width="150">
          <template #default="{ row }">{{ row.hostKey || '-' }}</template>
        </el-table-column>
        <el-table-column prop="middlewareType" label="中间件" min-width="100" />
        <el-table-column prop="pkgName" label="软件包" min-width="120" show-overflow-tooltip />
        <el-table-column
          prop="installedVersion"
          label="已安装版本"
          min-width="140"
          show-overflow-tooltip
        />
        <el-table-column
          prop="installedPkg"
          label="已安装软件包"
          min-width="220"
          show-overflow-tooltip
        />
        <el-table-column
          prop="affectedRange"
          label="受影响范围"
          min-width="220"
          show-overflow-tooltip
        />
        <el-table-column prop="fixedVersion" label="修复版本" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ row.fixedVersion || '-' }}</template>
        </el-table-column>
        <el-table-column prop="osScanStatus" label="OS 补丁扫描状态" min-width="150">
          <template #default="{ row }">{{ row.osScanStatus ?? '-' }}</template>
        </el-table-column>
      </el-table>
    </div>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { middlewareCveApi } from '../../api'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  cveId: { type: String, default: '' },
  middlewareType: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])
const loading = ref(false)
const hosts = ref([])
const errorMessage = ref('')
let requestId = 0

async function load() {
  const id = ++requestId
  hosts.value = []
  errorMessage.value = ''
  if (!props.cveId) {
    errorMessage.value = '缺少 CVE 编号，无法查询受影响主机'
    loading.value = false
    return
  }
  loading.value = true
  try {
    const response = await middlewareCveApi.getAffectedHosts(props.cveId, props.middlewareType)
    if (id !== requestId) return
    const data = response?.data ?? response
    hosts.value = Array.isArray(data) ? data : []
  } catch {
    if (id !== requestId) return
    errorMessage.value = '加载受影响主机失败，请点击刷新重试'
  } finally {
    if (id === requestId) loading.value = false
  }
}

watch(
  () => [props.modelValue, props.cveId, props.middlewareType],
  ([visible]) => {
    requestId += 1
    loading.value = false
    hosts.value = []
    errorMessage.value = ''
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
</style>
