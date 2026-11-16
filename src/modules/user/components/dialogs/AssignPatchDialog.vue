<template>
  <el-drawer
    :model-value="visible"
    :title="t('settings.patchAssignment.title')"
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
        {{ t('settings.patchAssignment.retryAssignments') }}
      </el-button>
    </el-alert>
    <el-form
      class="assignment-metadata"
      :model="assignForm"
      inline
      label-width="80px"
      :disabled="locked"
    >
      <el-form-item :label="t('settings.patchAssignment.targetUser')"><el-input :model-value="username" disabled /></el-form-item>
      <el-form-item :label="t('settings.user.expiresAt')">
        <el-date-picker
          v-model="assignForm.expireTime"
          type="datetime"
          :placeholder="t('settings.patchAssignment.permanentHint')"
          value-format="YYYY-MM-DD HH:mm:ss"
        />
      </el-form-item>
      <el-form-item :label="t('settings.patchAssignment.notes')">
        <el-input v-model="assignForm.remark" :placeholder="t('settings.patchAssignment.notesPlaceholder')" />
      </el-form-item>
    </el-form>
    <div class="selected-patches" :aria-label="t('settings.patchAssignment.selectedPatches')">
      <span>{{ t('settings.patchAssignment.draftCounts', { selected: selectedPatches.length, pending: pendingPatchCount }) }}</span>
      <el-button text :disabled="locked || !selectedPatches.length" @click="clearSelectedPatches">
        {{ t('settings.patchAssignment.clear') }}
      </el-button>
      <span class="hint">{{ t('settings.patchAssignment.draftRemovalHint') }}</span>
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
            {{ t('settings.patchAssignment.patchMachines', { patch: patch.patch_id, count: patch.selectedHosts.length }) }}
          </el-button>
          <el-button
            text
            circle
            class="remove-patch-button"
            :icon="Close"
            :disabled="locked"
            :aria-label="t('settings.patchAssignment.removePatch', { patch: patch.patch_id })"
            :title="t('settings.patchAssignment.removePatch', { patch: patch.patch_id })"
            @click="removePatch(patch.patch_id)"
          />
        </div>
      </div>
    </div>
    <div class="assignment-workspace" v-loading="loadingAssigned">
      <section class="patch-pane" :aria-label="t('settings.patchAssignment.choosePatch')">
        <div class="pane-toolbar patch-filter-toolbar">
          <el-input
            v-model="patchFilters.keyword"
            :placeholder="t('settings.patchAssignment.searchPatch')"
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
            {{ t('common.search') }}
          </el-button>
          <el-button :disabled="locked" @click="handlePatchReset">{{ t('common.reset') }}</el-button>
        </div>
        <el-alert
          v-if="patchListError"
          :title="t('settings.patchAssignment.patchesFailed')"
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
          <el-table-column prop="patch_id" :label="t('settings.patchAssignment.patchId')" min-width="170" show-overflow-tooltip />
          <el-table-column
            prop="patch_name"
            :label="t('settings.patchAssignment.patchName')"
            min-width="180"
            show-overflow-tooltip
          />
          <el-table-column :label="t('settings.patchAssignment.severity')" width="90">
            <template #default="{ row }">
              {{ severityLabels[row.severity] || row.severity || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="effect_host_count" :label="t('settings.patchAssignment.affectedMachines')" width="90" />
          <el-table-column :label="t('settings.patchAssignment.machineConfig')" width="120" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" :disabled="locked" @click="activatePatch(row)">
                {{
                  getHostCount(row.patch_id)
                    ? t('settings.patchAssignment.editHosts', { count: getHostCount(row.patch_id) })
                    : t('settings.patchAssignment.selectMachines')
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
      <section class="host-pane" :aria-label="t('settings.patchAssignment.configureMachines')">
        <template v-if="activePatch">
          <div class="pane-toolbar">
            <strong>{{ activePatch.patch_id }}</strong>
            <span>{{ t('settings.patchAssignment.selectedMachines', { count: activePatch.selectedHosts.length }) }}</span>
          </div>
          <p class="hint">{{ t('settings.patchAssignment.machineHint') }}</p>
          <div class="selected-hosts">
            <el-tag
              v-for="(host, index) in activePatch.selectedHosts"
              :key="host.host_id || `unresolved-${index}`"
              :closable="!locked"
              :type="host.host_id ? 'info' : 'warning'"
              :title="hostLabel(host)"
              @close="removeHost(index)"
            >
              {{ hostLabel(host) }}{{ host.host_id ? '' : t('settings.patchAssignment.confirmMachines') }}
            </el-tag>
          </div>
          <div class="pane-toolbar">
            <el-input
              v-model="hostFilters.keyword"
              :placeholder="t('settings.patchAssignment.searchHost')"
              clearable
              :disabled="locked"
              @input="handleHostSearch"
              @clear="handleHostSearch"
            />
          </div>
          <el-alert
            v-if="activePatch.hostsStatus === 'error'"
            :title="t('settings.patchAssignment.hostsFailed')"
            type="error"
            :closable="false"
          >
            <el-button :disabled="locked" @click="retryHosts">{{ t('settings.patchAssignment.retryHosts') }}</el-button>
          </el-alert>
          <el-table
            ref="hostTableRef"
            v-loading="activePatch.hostsStatus === 'loading'"
            :data="paginatedHosts"
            row-key="host_id"
            height="100%"
            :empty-text="t('settings.patchAssignment.noHosts')"
            @select="onHostSelectionChange"
            @select-all="onHostSelectionChange"
          >
            <el-table-column type="selection" :selectable="canSelectHost" width="45" />
            <el-table-column :label="t('settings.patchAssignment.hostIp')" min-width="180" show-overflow-tooltip>
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
        <el-empty v-else :description="t('settings.patchAssignment.chooseToConfigure')" />
      </section>
    </div>
    <section v-if="activePatch" class="reuse-panel" :aria-label="t('settings.patchAssignment.reuse')">
      <strong>{{ t('settings.patchAssignment.reuseSource', { patch: activePatch.patch_id }) }}</strong>
      <p class="hint">{{ t('settings.patchAssignment.reuseHint') }}</p>
      <p v-if="!reuseTargets.length" class="hint">{{ t('settings.patchAssignment.reuseTargetsHint') }}</p>
      <el-checkbox-group v-model="reuseTargetIds" :disabled="locked || previewLoading">
        <el-checkbox v-for="patch in reuseTargets" :key="patch.patch_id" :value="patch.patch_id">
          {{ patch.patch_id }}
        </el-checkbox>
      </el-checkbox-group>
      <el-button :disabled="!canPreviewReuse" :loading="previewLoading" @click="previewReuse">
        {{ t('settings.patchAssignment.preview') }}
      </el-button>
      <template v-if="reusePreview.length">
        <el-table :data="reusePreview" max-height="240">
          <el-table-column prop="patchId" :label="t('settings.patchAssignment.targetPatch')" min-width="170" />
          <el-table-column :label="t('settings.patchAssignment.previewCounts')" min-width="170">
            <template #default="{ row }">
              {{
                row.error
                  ? '-'
                  : `${row.matched.length} / ${row.added.length} / ${row.finalHosts.length}`
              }}
            </template>
          </el-table-column>
          <el-table-column :label="t('settings.patchAssignment.newMachines')" min-width="200">
            <template #default="{ row }">
              {{ row.added.map(hostLabel).join(t('common.listSeparator')) || t('settings.patchAssignment.none') }}
            </template>
          </el-table-column>
          <el-table-column :label="t('settings.patchAssignment.unavailable')" min-width="240">
            <template #default="{ row }">
              {{ row.error || row.unavailable.map(hostLabel).join(t('common.listSeparator')) || t('settings.patchAssignment.none') }}
            </template>
          </el-table-column>
        </el-table>
        <el-button type="primary" :disabled="!canApplyReuse" @click="applyReuse">
          {{ t('settings.patchAssignment.applyReuse') }}
        </el-button>
        <el-button :disabled="locked" @click="clearPreview">{{ t('settings.patchAssignment.cancelPreview') }}</el-button>
      </template>
    </section>
    <template #footer>
      <span class="hint">{{ t('settings.patchAssignment.submitHint') }}</span>
      <el-button :disabled="assignLoading" @click="closeDialog">{{ t('common.cancel') }}</el-button>
      <el-button
        type="primary"
        :loading="assignLoading"
        :disabled="saveDisabled"
        @click="submitAssign"
      >
        {{ t('settings.patchAssignment.confirm') }}
      </el-button>
    </template>
  </el-drawer>
</template>

<script setup>
import { t, i18n, currentLocale } from '@/core/i18n'
import { message, messageRef } from '@/core/i18n/feedback'
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Close } from '@element-plus/icons-vue'
import { apiService } from '@/core/api'
import { authService } from '@/core/auth'

const props = defineProps({ visible: Boolean, username: { type: String, default: '' } })
const emit = defineEmits(['update:visible', 'success'])
const baseUrl = '/secops/api/secops/v2/patch/assignment'
const severityLabels = { get Critical() { return t('settings.patchAssignment.critical') }, get Important() { return t('settings.patchAssignment.important') }, get Moderate() { return t('settings.patchAssignment.moderate') }, get Low() { return t('settings.patchAssignment.low') } }
const assignLoading = ref(false)
const loadingAssigned = ref(false)
const assignedError = messageRef('')
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
// Search generated fallback labels in the language in which the query was entered.
const hostSearchLocale = ref(currentLocale.value)
watch(() => hostFilters.keyword, () => { hostSearchLocale.value = currentLocale.value }, { flush: 'sync' })
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
    host => !keyword || (rawHostLabel(host) || i18n.global.t('settings.patchAssignment.noHost', {}, { locale: hostSearchLocale.value })).toLowerCase().includes(keyword)
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
function rawHostLabel(host) {
  return host.host_key && host.host_key !== host.host_id ? host.host_key : ''
}
function hostLabel(host) {
  return rawHostLabel(host) || t('settings.patchAssignment.noHost')
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
  if (!Array.isArray(data)) throw new Error(t('settings.patchAssignment.invalidList'))
  const patches = data.map(normalizePatch).filter(patch => patch.patch_id)
  if (new Set(patches.map(patch => patch.patch_id)).size !== patches.length)
    throw new Error(t('settings.patchAssignment.duplicatePatch'))
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
      throw new Error(t('settings.patchAssignment.incompleteAssignments'))
    const groups = new Map()
    rows.forEach(row => {
      const patchId = id(row.patchId)
      if (!patchId) throw new Error(t('settings.patchAssignment.missingPatch'))
      const patch = groups.get(patchId) || normalizePatch({ patchId })
      const host = normalizeHost(row, true)
      if (!host.host_id && !host.host_key) throw new Error(t('settings.patchAssignment.missingHost'))
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
      assignedError.value = message('settings.patchAssignment.assignedFailed')
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
      throw new Error(t('settings.patchAssignment.noUniqueCandidate'))
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
    const errorKey = !loaded
      ? 'settings.patchAssignment.reuseReadFailed'
      : patch.selectedHosts.some(host => !host.host_id)
        ? 'settings.patchAssignment.reselectHosts'
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
      get error() { return errorKey ? t(errorKey) : '' }
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
  ElMessage.success(t('settings.patchAssignment.addedDraft'))
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
    ElMessage.warning(t('settings.patchAssignment.selectPatchFirst'))
    return
  }
  const invalid = selectedPatches.value.find(
    patch => !patch.selectedHosts.length || patch.selectedHosts.some(host => !host.host_id)
  )
  if (invalid) {
    ElMessage.warning(t('settings.patchAssignment.reconfirm', { patch: invalid.patch_id }))
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
    ElMessage.success(t('settings.patchAssignment.assigned', { count: response?.data?.count || payload.items.length }))
    emit('success')
    assignLoading.value = false
    closeDialog()
  } catch (error) {
    if (isCurrent(token)) ElMessage.error(error?.response?.data?.error || t('settings.patchAssignment.failed'))
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
