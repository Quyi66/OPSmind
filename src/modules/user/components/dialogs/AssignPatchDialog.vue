<template>
  <el-drawer
    :model-value="visible"
    title="分配补丁给用户"
    size="min(1400px, 92vw)"
    direction="rtl"
    append-to-body
    class="patch-assignment-drawer"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="!assignLoading"
    @update:model-value="closeDialog"
  >
    <el-alert v-if="assignedError" :title="assignedError" type="error" :closable="false">
      <el-button :disabled="loadingAssigned" @click="loadAssignedPatches">
        重试读取已有分配
      </el-button>
    </el-alert>
    <el-form
      class="assignment-metadata"
      :model="assignForm"
      inline
      label-width="80px"
      :disabled="locked"
    >
      <el-form-item label="目标用户"><el-input :model-value="username" disabled /></el-form-item>
      <el-form-item label="过期时间">
        <el-date-picker
          v-model="assignForm.expireTime"
          type="datetime"
          placeholder="不填表示永久有效"
          value-format="YYYY-MM-DD HH:mm:ss"
        />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="assignForm.remark" placeholder="填写分配说明（选填）" />
      </el-form-item>
    </el-form>
    <div class="selected-patches" aria-label="已选补丁">
      <span>已选 {{ selectedPatches.length }} 项，待配置机器 {{ pendingPatchCount }} 项</span>
      <el-button text :disabled="locked || !selectedPatches.length" @click="clearSelectedPatches">
        清空所选补丁
      </el-button>
      <span class="hint">移除或清空仅影响当前草稿，不撤销已有分配。</span>
      <div class="selected-patch-list">
        <div
          v-for="patch in selectedPatches"
          :key="patch.patch_id"
          class="selected-patch"
          :class="{ 'is-active': activePatchId === patch.patch_id, 'is-disabled': locked }"
        >
          <el-button
            text
            class="patch-switch-button"
            :disabled="locked"
            :aria-pressed="activePatchId === patch.patch_id"
            @click="activatePatch(patch)"
          >
            {{ patch.patch_id }} · {{ patch.selectedHosts.length }} 台
          </el-button>
          <el-button
            text
            circle
            class="remove-patch-button"
            :icon="Close"
            :disabled="locked"
            :aria-label="`移除补丁 ${patch.patch_id}`"
            :title="`移除补丁 ${patch.patch_id}`"
            @click="removePatch(patch.patch_id)"
          />
        </div>
      </div>
    </div>
    <div class="assignment-workspace" v-loading="loadingAssigned">
      <section class="patch-pane" aria-label="选择补丁">
        <div class="pane-toolbar patch-filter-toolbar">
          <el-input
            v-model="patchFilters.keyword"
            placeholder="搜索补丁编号"
            clearable
            :disabled="locked"
            @keyup.enter="handlePatchSearch"
            @clear="handlePatchSearch"
          />
          <el-button
            :loading="availablePatchesLoading"
            :disabled="locked"
            @click="handlePatchSearch"
          >
            搜索
          </el-button>
          <el-button :disabled="locked" @click="handlePatchReset">重置</el-button>
        </div>
        <el-alert
          v-if="patchListError"
          title="可分配补丁读取失败，请重新搜索"
          type="error"
          :closable="false"
        />
        <el-table
          ref="patchTableRef"
          v-loading="availablePatchesLoading"
          :data="availablePatches"
          row-key="patch_id"
          height="100%"
          @selection-change="onPatchSelectionChange"
        >
          <el-table-column type="selection" :selectable="canSelectPatch" width="45" />
          <el-table-column prop="patch_id" label="补丁编号" min-width="170" show-overflow-tooltip />
          <el-table-column
            prop="patch_name"
            label="补丁名称"
            min-width="180"
            show-overflow-tooltip
          />
          <el-table-column label="严重级别" width="90">
            <template #default="{ row }">
              {{ severityLabels[row.severity] || row.severity || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="effect_host_count" label="影响机器" width="90" />
          <el-table-column label="机器配置" width="120" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" :disabled="locked" @click="activatePatch(row)">
                {{
                  getHostCount(row.patch_id)
                    ? `${getHostCount(row.patch_id)} 台 · 修改`
                    : '选择机器'
                }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-model:current-page="patchPagination.page"
          v-model:page-size="patchPagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="patchPagination.total"
          :disabled="locked"
          layout="total, sizes, prev, pager, next"
          small
          @current-change="loadAvailablePatches"
          @size-change="handlePatchSizeChange"
        />
      </section>
      <section class="host-pane" aria-label="配置当前补丁机器">
        <template v-if="activePatch">
          <div class="pane-toolbar">
            <strong>{{ activePatch.patch_id }}</strong>
            <span>已选 {{ activePatch.selectedHosts.length }} 台</span>
          </div>
          <p class="hint">仅可新增该补丁扫描结果中的机器，勾选即时保留在当前草稿。</p>
          <div class="selected-hosts">
            <el-tag
              v-for="(host, index) in activePatch.selectedHosts"
              :key="host.host_id || `unresolved-${index}`"
              :closable="!locked"
              :type="host.host_id ? 'info' : 'warning'"
              :title="hostLabel(host)"
              @close="removeHost(index)"
            >
              {{ hostLabel(host) }}{{ host.host_id ? '' : '（需重新确认机器）' }}
            </el-tag>
          </div>
          <div class="pane-toolbar">
            <el-input
              v-model="hostFilters.keyword"
              placeholder="搜索主机 / IP"
              clearable
              :disabled="locked"
              @input="handleHostSearch"
              @clear="handleHostSearch"
            />
          </div>
          <el-alert
            v-if="activePatch.hostsStatus === 'error'"
            title="机器候选读取失败，未改变已有选择"
            type="error"
            :closable="false"
          >
            <el-button :disabled="locked" @click="retryHosts">重试机器读取</el-button>
          </el-alert>
          <el-table
            ref="hostTableRef"
            v-loading="activePatch.hostsStatus === 'loading'"
            :data="paginatedHosts"
            row-key="host_id"
            height="100%"
            empty-text="当前没有匹配的可分配机器"
            @select="onHostSelectionChange"
            @select-all="onHostSelectionChange"
          >
            <el-table-column type="selection" :selectable="canSelectHost" width="45" />
            <el-table-column label="主机/IP" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">{{ hostLabel(row) }}</template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-model:current-page="hostPagination.page"
            v-model:page-size="hostPagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="filteredHosts.length"
            :disabled="locked"
            layout="total, sizes, prev, pager, next"
            small
            @current-change="syncHostSelection"
            @size-change="handleHostSizeChange"
          />
        </template>
        <el-empty v-else description="选择补丁后，在这里配置对应机器" />
      </section>
    </div>
    <section v-if="activePatch" class="reuse-panel" aria-label="复用机器选择">
      <strong>复用 {{ activePatch.patch_id }} 的机器选择</strong>
      <p class="hint">选择目标补丁后先预览。仅追加各补丁可用的机器，保留已有选择。</p>
      <p v-if="!reuseTargets.length" class="hint">请先在补丁列表勾选其他目标补丁。</p>
      <el-checkbox-group v-model="reuseTargetIds" :disabled="locked || previewLoading">
        <el-checkbox v-for="patch in reuseTargets" :key="patch.patch_id" :value="patch.patch_id">
          {{ patch.patch_id }}
        </el-checkbox>
      </el-checkbox-group>
      <el-button :disabled="!canPreviewReuse" :loading="previewLoading" @click="previewReuse">
        预览复用结果
      </el-button>
      <template v-if="reusePreview.length">
        <el-table :data="reusePreview" max-height="240">
          <el-table-column prop="patchId" label="目标补丁" min-width="170" />
          <el-table-column label="匹配 / 新增 / 最终机器数" min-width="170">
            <template #default="{ row }">
              {{
                row.error
                  ? '-'
                  : `${row.matched.length} / ${row.added.length} / ${row.finalHosts.length}`
              }}
            </template>
          </el-table-column>
          <el-table-column label="将新增的机器" min-width="200">
            <template #default="{ row }">
              {{ row.added.map(hostLabel).join('、') || '无' }}
            </template>
          </el-table-column>
          <el-table-column label="不适用机器 / 读取问题" min-width="240">
            <template #default="{ row }">
              {{ row.error || row.unavailable.map(hostLabel).join('、') || '无' }}
            </template>
          </el-table-column>
        </el-table>
        <el-button type="primary" :disabled="!canApplyReuse" @click="applyReuse">
          确认追加到所选补丁
        </el-button>
        <el-button :disabled="locked" @click="clearPreview">取消预览</el-button>
      </template>
    </section>
    <template #footer>
      <span class="hint">配置仅保留在草稿中，点击“确定分配”后提交。</span>
      <el-button :disabled="assignLoading" @click="closeDialog">取消</el-button>
      <el-button
        type="primary"
        :loading="assignLoading"
        :disabled="saveDisabled"
        @click="submitAssign"
      >
        确定分配
      </el-button>
    </template>
  </el-drawer>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Close } from '@element-plus/icons-vue'
import { apiService } from '@/core/api'
import { authService } from '@/core/auth'

const props = defineProps({ visible: Boolean, username: { type: String, default: '' } })
const emit = defineEmits(['update:visible', 'success'])
const baseUrl = '/secops/api/secops/v2/patch/assignment'
const severityLabels = { Critical: '严重', Important: '重要', Moderate: '中等', Low: '低危' }
const assignLoading = ref(false)
const loadingAssigned = ref(false)
const assignedError = ref('')
const availablePatchesLoading = ref(false)
const patchListError = ref(false)
const selectedPatches = ref([])
const availablePatches = ref([])
const activePatchId = ref('')
const patchTableRef = ref(null)
const hostTableRef = ref(null)
const patchFilters = reactive({ keyword: '' })
const patchPagination = reactive({ page: 1, pageSize: 20, total: 0 })
const hostFilters = reactive({ keyword: '' })
const hostPagination = reactive({ page: 1, pageSize: 20 })
const assignForm = ref(defaultForm())
const reuseTargetIds = ref([])
const reusePreview = ref([])
const previewLoading = ref(false)
let previewSignature = ''
let session = 0
let listRequest = 0
let reuseRequest = 0
let syncingPatches = false
let syncingHosts = false
const pendingHosts = new WeakMap()
let context = { username: '', tenantId: '' }
const tenantId = () => authService.getCurrentUser()?.tenantId || ''
const isCurrent = token =>
  token === session &&
  props.visible &&
  props.username === context.username &&
  tenantId() === context.tenantId
const locked = computed(() => assignLoading.value || loadingAssigned.value || !!assignedError.value)
const saveDisabled = computed(
  () => locked.value || previewLoading.value || !!reusePreview.value.length
)
const activePatch = computed(() =>
  selectedPatches.value.find(patch => patch.patch_id === activePatchId.value)
)
const pendingPatchCount = computed(
  () =>
    selectedPatches.value.filter(
      patch => !patch.selectedHosts.length || patch.selectedHosts.some(host => !host.host_id)
    ).length
)
const reuseTargets = computed(() =>
  selectedPatches.value.filter(patch => patch.patch_id !== activePatchId.value)
)
const filteredHosts = computed(() => {
  const keyword = hostFilters.keyword.trim().toLowerCase()
  return (activePatch.value?.availableHosts || []).filter(
    host => !keyword || hostLabel(host).toLowerCase().includes(keyword)
  )
})
const paginatedHosts = computed(() =>
  filteredHosts.value.slice(
    (hostPagination.page - 1) * hostPagination.pageSize,
    hostPagination.page * hostPagination.pageSize
  )
)
const reuseSignature = computed(() =>
  JSON.stringify({
    source: activePatchId.value,
    targets: reuseTargetIds.value,
    selections: selectedPatches.value.map(patch => [patch.patch_id, patch.selectedHosts])
  })
)
const canPreviewReuse = computed(
  () =>
    !locked.value &&
    !previewLoading.value &&
    activePatch.value?.hostsStatus === 'ready' &&
    activePatch.value.selectedHosts.length > 0 &&
    activePatch.value.selectedHosts.every(
      host =>
        host.host_id &&
        activePatch.value.availableHosts.some(candidate => candidate.host_id === host.host_id)
    ) &&
    reuseTargetIds.value.length > 0
)
const canApplyReuse = computed(
  () =>
    !locked.value &&
    !previewLoading.value &&
    reusePreview.value.length > 0 &&
    previewSignature === reuseSignature.value &&
    reusePreview.value.every(row => !row.error) &&
    reusePreview.value.some(row => row.added.length > 0)
)

function defaultForm() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  const pad = value => String(value).padStart(2, '0')
  return {
    expireTime: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
    remark: ''
  }
}
const id = value =>
  (typeof value === 'string' && value.trim()) ||
  (typeof value === 'number' && Number.isFinite(value))
    ? String(value)
    : ''
function hostLabel(host) {
  return host.host_key && host.host_key !== host.host_id ? host.host_key : '未提供主机/IP'
}
function normalizeHost(host, assigned = false) {
  // 已有分配记录的id是记录ID，不能当作机器ID；显示地址不能替代真实身份。
  const hostId = assigned
    ? host?.host_id ||
      host?.hostId ||
      host?.machine_id ||
      host?.machineId ||
      host?.hosts_id ||
      host?.hostsId
    : host?.host_id || host?.hostId || host?.id || host?.value
  return {
    host_id: id(hostId),
    host_key: String(
      host?.host_key || host?.hostKey || host?.hostname || host?.ip || host?.name || hostId || ''
    )
  }
}
function uniqueHosts(hosts) {
  const known = new Map()
  const unresolved = []
  hosts.forEach(host =>
    host.host_id ? known.set(host.host_id, { ...host }) : unresolved.push({ ...host })
  )
  return [...known.values(), ...unresolved]
}
function normalizePatch(item) {
  const hosts =
    item?.availableHosts ??
    item?.hosts ??
    item?.hostList ??
    item?.machines ??
    item?.machineList ??
    item?.affectedHosts
  const normalizedHosts = Array.isArray(hosts) ? hosts.map(host => normalizeHost(host)) : []
  return {
    patch_id: id(item?.patch_id || item?.patchId || item?.id),
    patch_name: item?.patchName || item?.patch_name || item?.title || item?.summary || '',
    severity: item?.severity || item?.level || item?.riskLevel || '',
    effect_host_count: Number(
      item?.hostCount ??
        item?.effect_host_count ??
        item?.effectHostCount ??
        item?.affectedHostCount ??
        item?.host_count ??
        hosts?.length ??
        0
    ),
    availableHosts: uniqueHosts(normalizedHosts.filter(host => host.host_id)),
    hostsStatus:
      Array.isArray(hosts) && normalizedHosts.every(host => host.host_id) ? 'ready' : 'idle',
    selectedHosts: []
  }
}
function responsePatches(response) {
  const data = response?.data?.content ?? response?.data?.records ?? response?.data
  if (!Array.isArray(data)) throw new Error('补丁列表格式不正确')
  const patches = data.map(normalizePatch).filter(patch => patch.patch_id)
  if (new Set(patches.map(patch => patch.patch_id)).size !== patches.length)
    throw new Error('补丁编号不唯一')
  return patches
}

watch(
  [() => props.visible, () => props.username, tenantId],
  () => {
    session++
    listRequest++
    clearPreview()
    assignLoading.value = false
    loadingAssigned.value = false
    assignedError.value = ''
    selectedPatches.value = []
    availablePatches.value = []
    activePatchId.value = ''
    reuseTargetIds.value = []
    patchFilters.keyword = ''
    Object.assign(patchPagination, { page: 1, pageSize: 20, total: 0 })
    assignForm.value = defaultForm()
    context = { username: props.username, tenantId: tenantId() }
    if (props.visible && props.username) {
      loadAssignedPatches()
      loadAvailablePatches()
    }
  },
  { immediate: true }
)
watch(reuseSignature, clearPreview, { flush: 'sync' })
onBeforeUnmount(() => {
  session++
  listRequest++
  reuseRequest++
})

async function loadAssignedPatches() {
  if (!isCurrent(session) || loadingAssigned.value || assignLoading.value) return
  const token = session
  loadingAssigned.value = true
  assignedError.value = ''
  try {
    const response = await apiService.get(`${baseUrl}/list`, {
      params: { userLogin: context.username, page: 0, size: 1000 }
    })
    if (!isCurrent(token)) return
    const rows = response?.data?.content
    if (!Array.isArray(rows) || (response.data.totalElements || 0) > rows.length)
      throw new Error('已有分配未完整读取')
    const groups = new Map()
    rows.forEach(row => {
      const patchId = id(row.patchId)
      if (!patchId) throw new Error('已有分配缺少补丁编号')
      const patch = groups.get(patchId) || normalizePatch({ patchId })
      const host = normalizeHost(row, true)
      if (!host.host_id && !host.host_key) throw new Error('已有分配缺少机器身份')
      patch.selectedHosts.push(host)
      groups.set(patchId, patch)
    })
    selectedPatches.value = Array.from(groups.values()).map(patch => ({
      ...patch,
      selectedHosts: uniqueHosts(patch.selectedHosts)
    }))
    await syncPatchSelection()
  } catch {
    if (isCurrent(token))
      assignedError.value = '已有分配读取失败或不完整，请重试后配置，避免遗漏原机器。'
  } finally {
    if (isCurrent(token)) loadingAssigned.value = false
  }
}
async function loadAvailablePatches() {
  const token = session
  const request = ++listRequest
  if (!isCurrent(token)) return
  availablePatchesLoading.value = true
  patchListError.value = false
  try {
    const response = await apiService.get(`${baseUrl}/available-patches`, {
      params: {
        page: patchPagination.page - 1,
        size: patchPagination.pageSize,
        ...(patchFilters.keyword.trim() ? { patchId: patchFilters.keyword.trim() } : {})
      }
    })
    if (!isCurrent(token) || request !== listRequest) return
    availablePatches.value = responsePatches(response)
    patchPagination.total =
      response?.data?.totalElements ?? response?.data?.total ?? availablePatches.value.length
    await syncPatchSelection()
  } catch {
    if (!isCurrent(token) || request !== listRequest) return
    availablePatches.value = []
    patchPagination.total = 0
    patchListError.value = true
  } finally {
    if (isCurrent(token) && request === listRequest) availablePatchesLoading.value = false
  }
}
function handlePatchSearch() {
  patchPagination.page = 1
  loadAvailablePatches()
}
function handlePatchReset() {
  patchFilters.keyword = ''
  patchPagination.pageSize = 20
  handlePatchSearch()
}
function handlePatchSizeChange() {
  handlePatchSearch()
}
const canSelectPatch = () => isCurrent(session) && !locked.value && !availablePatchesLoading.value
const canSelectHost = () =>
  isCurrent(session) && !locked.value && activePatch.value?.hostsStatus === 'ready'
const getHostCount = patchId =>
  selectedPatches.value.find(patch => patch.patch_id === patchId)?.selectedHosts.length || 0
async function syncPatchSelection() {
  syncingPatches = true
  await nextTick()
  patchTableRef.value?.clearSelection()
  availablePatches.value.forEach(row => {
    if (selectedPatches.value.some(patch => patch.patch_id === row.patch_id))
      patchTableRef.value?.toggleRowSelection(row, true)
  })
  await nextTick()
  syncingPatches = false
}
function onPatchSelectionChange(selection) {
  if (syncingPatches || !canSelectPatch()) return
  const pageIds = new Set(availablePatches.value.map(patch => patch.patch_id))
  const previous = new Map(selectedPatches.value.map(patch => [patch.patch_id, patch]))
  selectedPatches.value = [
    ...selectedPatches.value.filter(patch => !pageIds.has(patch.patch_id)),
    ...selection
      .filter(patch => pageIds.has(patch.patch_id))
      .map(patch => previous.get(patch.patch_id) || { ...patch, selectedHosts: [] })
  ]
  if (!activePatch.value) {
    activePatchId.value = ''
    const first = selectedPatches.value[0]
    if (first) activatePatch(first)
  }
}
async function activatePatch(row) {
  if (!isCurrent(session) || locked.value) return
  let patch = selectedPatches.value.find(item => item.patch_id === row.patch_id)
  if (!patch) {
    selectedPatches.value.push({ ...row, selectedHosts: [] })
    patch = selectedPatches.value.find(item => item.patch_id === row.patch_id)
  }
  activePatchId.value = patch.patch_id
  reuseTargetIds.value = []
  hostFilters.keyword = ''
  Object.assign(hostPagination, { page: 1, pageSize: 20 })
  syncPatchSelection()
  await ensureHosts(patch)
  if (activePatch.value === patch) await syncHostSelection()
}
function removePatch(patchId) {
  if (locked.value) return
  selectedPatches.value = selectedPatches.value.filter(patch => patch.patch_id !== patchId)
  reuseTargetIds.value = reuseTargetIds.value.filter(target => target !== patchId)
  if (activePatchId.value === patchId) activePatchId.value = ''
  syncPatchSelection()
}
function clearSelectedPatches() {
  if (locked.value) return
  selectedPatches.value = []
  activePatchId.value = ''
  reuseTargetIds.value = []
  syncPatchSelection()
}
async function ensureHosts(patch) {
  if (!isCurrent(session) || !selectedPatches.value.includes(patch)) return false
  if (patch.hostsStatus === 'ready') return true
  if (pendingHosts.has(patch)) return pendingHosts.get(patch)
  const request = readHosts(patch)
  pendingHosts.set(patch, request)
  try {
    return await request
  } finally {
    pendingHosts.delete(patch)
  }
}
async function readHosts(patch) {
  const token = session
  patch.hostsStatus = 'loading'
  try {
    const pagePatch = availablePatches.value.find(
      item => item.patch_id === patch.patch_id && item.hostsStatus === 'ready'
    )
    const matches = pagePatch
      ? [pagePatch]
      : responsePatches(
          await apiService.get(`${baseUrl}/available-patches`, {
            params: { page: 0, size: 100, patchId: patch.patch_id }
          })
        ).filter(item => item.patch_id === patch.patch_id)
    if (!isCurrent(token) || !selectedPatches.value.includes(patch)) return false
    if (matches.length !== 1 || matches[0].hostsStatus !== 'ready')
      throw new Error('缺少唯一补丁的机器候选')
    patch.availableHosts = matches[0].availableHosts
    patch.hostsStatus = 'ready'
    return true
  } catch {
    if (isCurrent(token) && selectedPatches.value.includes(patch)) patch.hostsStatus = 'error'
    return false
  }
}
async function retryHosts() {
  const patch = activePatch.value
  if (!patch || locked.value) return
  await ensureHosts(patch)
  if (activePatch.value === patch) await syncHostSelection()
}
async function syncHostSelection() {
  syncingHosts = true
  await nextTick()
  hostTableRef.value?.clearSelection()
  paginatedHosts.value.forEach(row => {
    if (activePatch.value?.selectedHosts.some(host => host.host_id === row.host_id))
      hostTableRef.value?.toggleRowSelection(row, true)
  })
  await nextTick()
  syncingHosts = false
}
function onHostSelectionChange(selection) {
  // 只接收用户勾选；换补丁/换页和回显会触发 selection-change，不能用它清空草稿。
  if (syncingHosts || !canSelectHost()) return
  const patch = activePatch.value
  const pageIds = new Set(paginatedHosts.value.map(host => host.host_id))
  patch.selectedHosts = uniqueHosts([
    ...patch.selectedHosts.filter(host => !pageIds.has(host.host_id)),
    ...selection.filter(host => pageIds.has(host.host_id)).map(host => normalizeHost(host))
  ])
}
function removeHost(index) {
  if (!activePatch.value || locked.value) return
  activePatch.value.selectedHosts.splice(index, 1)
  syncHostSelection()
}
function handleHostSearch() {
  hostPagination.page = 1
  syncHostSelection()
}
function handleHostSizeChange() {
  handleHostSearch()
}
function clearPreview() {
  reuseRequest++
  reusePreview.value = []
  previewLoading.value = false
  previewSignature = ''
}
async function previewReuse() {
  if (!canPreviewReuse.value) return
  clearPreview()
  const token = session
  const request = reuseRequest
  const signature = reuseSignature.value
  const source = activePatch.value.selectedHosts.map(host => ({ ...host }))
  const targets = reuseTargetIds.value.map(patchId =>
    selectedPatches.value.find(patch => patch.patch_id === patchId)
  )
  previewLoading.value = true
  const rows = []
  for (const patch of targets) {
    const loaded = patch && (await ensureHosts(patch))
    if (!isCurrent(token) || request !== reuseRequest || signature !== reuseSignature.value) return
    if (!patch) {
      clearPreview()
      return
    }
    const error = !loaded
      ? '机器候选读取失败或缺少唯一补丁，未追加'
      : patch.selectedHosts.some(host => !host.host_id)
        ? '已有机器信息不完整，请先重新选择'
        : ''
    const candidates = new Map(patch.availableHosts.map(host => [host.host_id, host]))
    const matched = source
      .filter(host => candidates.has(host.host_id))
      .map(host => candidates.get(host.host_id))
    const added = matched.filter(
      host => !patch.selectedHosts.some(selected => selected.host_id === host.host_id)
    )
    rows.push({
      patchId: patch.patch_id,
      matched,
      added,
      unavailable: source.filter(host => !candidates.has(host.host_id)),
      finalHosts: uniqueHosts([...patch.selectedHosts, ...matched]),
      error
    })
  }
  previewSignature = signature
  reusePreview.value = rows
  previewLoading.value = false
}
function applyReuse() {
  if (!isCurrent(session) || !canApplyReuse.value) return
  // 捕获整个预览再更新；同步watch会在首次变更时使预览失效。
  const rows = reusePreview.value
  rows.forEach(row => {
    selectedPatches.value.find(patch => patch.patch_id === row.patchId).selectedHosts =
      row.finalHosts.map(host => ({ ...host }))
  })
  clearPreview()
  ElMessage.success('已追加到补丁草稿，尚未提交分配')
}
function closeDialog() {
  if (assignLoading.value) return
  session++
  clearPreview()
  emit('update:visible', false)
}
async function submitAssign() {
  if (!isCurrent(session) || saveDisabled.value) return
  if (!selectedPatches.value.length) {
    ElMessage.warning('请至少选择一个补丁')
    return
  }
  const invalid = selectedPatches.value.find(
    patch => !patch.selectedHosts.length || patch.selectedHosts.some(host => !host.host_id)
  )
  if (invalid) {
    ElMessage.warning(`请为补丁 ${invalid.patch_id} 重新确认机器选择，至少选择一台机器`)
    await activatePatch(invalid)
    return
  }
  const token = session
  const payload = {
    userLogin: context.username,
    items: selectedPatches.value.map(patch => ({
      patchId: patch.patch_id,
      hostIds: Array.from(new Set(patch.selectedHosts.map(host => host.host_id)))
    })),
    expireTime: assignForm.value.expireTime || undefined,
    remark: assignForm.value.remark || undefined
  }
  assignLoading.value = true
  try {
    const response = await apiService.post(baseUrl, payload)
    if (!isCurrent(token)) return
    ElMessage.success(`分配成功，共处理 ${response?.data?.count || payload.items.length} 条记录`)
    emit('success')
    assignLoading.value = false
    closeDialog()
  } catch (error) {
    if (isCurrent(token)) ElMessage.error(error?.response?.data?.error || '分配失败')
  } finally {
    if (isCurrent(token)) assignLoading.value = false
  }
}
</script>

<style scoped>
:global(.patch-assignment-drawer .el-drawer__header) {
  flex-shrink: 0;
  margin-bottom: 0;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
:global(.patch-assignment-drawer .el-drawer__body) {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 16px 24px;
  overflow-y: auto;
}
:global(.patch-assignment-drawer .el-drawer__footer) {
  flex-shrink: 0;
  padding: 12px 24px;
  border-top: 1px solid var(--el-border-color-lighter);
}
.assignment-metadata,
.selected-patches,
.reuse-panel {
  flex-shrink: 0;
}
.assignment-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(320px, 28vw, 400px);
  gap: 16px;
  /* 复用区按内容占高，其余可用空间全部交给两张列表。 */
  flex: 1;
  min-height: 280px;
}
.patch-pane,
.host-pane {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  overflow: hidden;
}
.patch-pane > .el-table,
.host-pane > .el-table {
  flex: 1;
  min-height: 0;
}
.pane-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
}
.pane-toolbar .el-input {
  flex: 1;
  min-width: 140px;
}
.patch-filter-toolbar {
  gap: 12px;
}
.patch-filter-toolbar > .el-button + .el-button {
  margin-left: 0;
}
.pane-toolbar strong {
  overflow-wrap: anywhere;
}
.selected-patches {
  margin-bottom: 12px;
}
.selected-patch-list,
.selected-hosts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 110px;
  overflow-y: auto;
  padding: 8px 0;
}
.selected-patch {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding-right: 4px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  background: var(--el-bg-color);
  color: var(--el-text-color-regular);
  transition:
    border-color 0.15s,
    background-color 0.15s;
}
.selected-patch:not(.is-disabled):hover {
  border-color: var(--el-color-primary-light-5);
}
.selected-patch.is-active {
  border-color: var(--el-color-primary-light-5);
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}
.selected-patch.is-disabled {
  opacity: 0.6;
}
.selected-patch-list {
  column-gap: 12px;
}
.selected-patch > .patch-switch-button {
  height: 30px;
  margin: 0;
  padding: 0 10px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: inherit;
  font-size: 13px;
  font-weight: 500;
}
.selected-patch > .patch-switch-button:not(:disabled):hover {
  background: transparent;
  color: var(--el-color-primary);
}
.selected-patch > .remove-patch-button {
  margin-left: 0;
  width: 24px;
  height: 24px;
  padding: 5px;
  flex-shrink: 0;
  border: 0;
  background: transparent;
  color: var(--el-text-color-secondary);
}
.selected-patch > .remove-patch-button:hover:not(:disabled) {
  background: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
}
.selected-patch > .el-button:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: -2px;
}
.selected-hosts {
  padding: 0 12px;
  flex-shrink: 0;
}
.selected-hosts > .el-tag {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
}
.selected-hosts :deep(.el-tag__content) {
  overflow: hidden;
  text-overflow: ellipsis;
}
.hint {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin: 8px 12px;
}
.reuse-panel {
  margin-top: 12px;
  padding: 10px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}
.reuse-panel .hint {
  margin: 4px 0 8px;
}
.reuse-panel .el-checkbox-group {
  max-height: 100px;
  overflow-y: auto;
  margin-bottom: 4px;
}
.reuse-panel .el-table {
  margin: 8px 0;
}
.el-pagination {
  padding: 12px;
  overflow-x: auto;
  flex-shrink: 0;
}
@media (max-width: 1000px) {
  .assignment-workspace {
    grid-template-columns: minmax(0, 1fr);
    flex: none;
    height: auto;
  }
  .patch-pane,
  .host-pane {
    height: 400px;
  }
}
</style>
