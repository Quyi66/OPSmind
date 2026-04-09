<template>
  <el-dialog :model-value="visible" @update:model-value="emit('update:visible', $event)" title="分配补丁给用户" width="800px" @open="loadAssignedPatches" @closed="resetAssignForm" :close-on-click-modal="false">
    <el-form label-width="100px" :model="assignForm" v-loading="loadingAssigned">
      <el-form-item label="目标用户">
        <el-input :value="username" disabled />
      </el-form-item>



      <el-form-item label="选择补丁">
        <div style="width: 100%;">
          <div v-if="selectedPatchesList.length" class="device-list-container">
            <div class="device-header">
              <div
                class="device-summary btn btn-sm btn-default op-hover-trigger"
                @click="openPatchLibrary"
              >
                <span
                  class="op-hover-to-show clear-btn"
                  title="清空全部"
                  @click.stop="clearAllPatches"
                >
                  <i class="fa fa-times" />
                </span>
                <span>共 <strong>{{ selectedPatchesList.length }}</strong> 项</span>
              </div>
            </div>

            <ul class="device-chip-list">
              <li v-for="patch in selectedPatchesList" :key="patch.patch_id" class="device-chip-item">
                <div class="patch-assignment-card">
                  <div class="patch-assignment-head">
                    <el-tag type="primary" closable @close="removeSelectedPatchFromMain(patch.patch_id)">
                      {{ patch.patch_id }}
                    </el-tag>
                    <el-tag :type="getSelectedHostCount(patch) ? 'success' : 'warning'" size="small">
                      {{ getSelectedHostCount(patch) ? `已选 ${getSelectedHostCount(patch)} 台机器` : '未选择机器' }}
                    </el-tag>
                    <el-button link type="primary" @click="openPatchLibrary">
                      在补丁列表中修改
                    </el-button>
                  </div>
                  <div v-if="getSelectedHostCount(patch)" class="patch-host-preview">
                    <el-tag
                      v-for="host in getSelectedHostPreview(patch)"
                      :key="`${patch.patch_id}-${host.host_id || host.host_key}`"
                      size="small"
                      type="info"
                    >
                      {{ host.host_key || host.host_id }}
                    </el-tag>
                    <span v-if="getSelectedHostCount(patch) > 3" class="host-preview-more">
                      +{{ getSelectedHostCount(patch) - 3 }}
                    </span>
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <div v-else class="empty-state">
            <el-button @click="openPatchLibrary">
              <i class="fa fa-list" style="margin-right: 4px" /> 打开扫描结果补丁列表进行选择
            </el-button>
          </div>
        </div>
      </el-form-item>

      <el-form-item label="过期时间">
        <el-date-picker
          v-model="assignForm.expireTime"
          type="datetime"
          placeholder="不填表示永久有效"
          value-format="YYYY-MM-DD HH:mm:ss"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="assignForm.remark" placeholder="填写分配说明（选填）" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" :loading="assignLoading" @click="submitAssign">确定分配</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="innerDialogVisible" title="从扫描结果选择补丁" width="1200px" append-to-body destroy-on-close @opened="handleInnerDialogOpened" :close-on-click-modal="false">
    <div style="height: calc(100vh - 280px); display: flex; flex-direction: column; overflow: hidden; padding: 0; gap: 16px;">

      <el-card v-if="liveSelectedPatches.length > 0" class="selected-patches-card" shadow="never" :body-style="{ padding: '12px' }">
        <template #header>
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 14px; font-weight: bold; color: var(--el-text-color-primary)">
            <span><i class="fa fa-shopping-cart text-muted me-2" /> 已筛选准备分配的补丁</span>
            <el-tag size="small" type="success" effect="dark" round>共 {{ liveSelectedPatches.length }} 项</el-tag>
          </div>
        </template>
        <div style="max-height: 100px; overflow-y: auto; display: flex; flex-wrap: wrap; gap: 8px;">
          <el-tag
            v-for="patch in liveSelectedPatches"
            :key="patch.patch_id"
            closable
            type="primary"
            @close="handleRemovePatch(patch)"
          >
            {{ patch.patch_id }}
          </el-tag>
        </div>
      </el-card>

      <div class="assign-patch-picker">
        <div class="ops-filter-bar">
          <el-form :model="patchFilters" inline size="small">
            <el-form-item label="关键词">
              <el-input
                v-model="patchFilters.keyword"
                placeholder="搜索补丁编号、概要、CVE"
                clearable
                style="width: 240px"
              />
            </el-form-item>
            <!-- <el-form-item label="严重级别">
              <el-select
                v-model="patchFilters.severity"
                multiple
                collapse-tags
                collapse-tags-tooltip
                clearable
                placeholder="严重级别"
                style="width: 260px"
              >
                <el-option label="严重" value="Critical" />
                <el-option label="重要" value="Important" />
                <el-option label="中等" value="Moderate" />
                <el-option label="低危" value="Low" />
              </el-select>
            </el-form-item> -->
            <el-form-item>
              <el-button type="primary" :loading="availablePatchesLoading" @click="handlePatchSearch">搜索</el-button>
              <el-button @click="handlePatchReset">重置</el-button>
            </el-form-item>
          </el-form>
        </div>

        <div class="ops-table-wrapper picker-table-wrapper">
          <el-table
            ref="patchTableRef"
            v-loading="availablePatchesLoading"
            :data="availablePatches"
            row-key="patch_id"
            height="100%"
            @selection-change="onPatchSelectionChange"
          >
            <el-table-column type="selection" :reserve-selection="true" width="50" />
            <el-table-column prop="patch_id" label="补丁编号" min-width="180" show-overflow-tooltip />
            <el-table-column prop="patch_name" label="补丁名称" min-width="300" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.patch_name || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="severity" label="严重级别" width="120">
              <template #default="{ row }">
                <el-tag size="small" :type="getSeverityTagType(row.severity)">
                  {{ getSeverityLabel(row.severity) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="effect_host_count" label="影响机器数" width="120" />
            <el-table-column label="已选机器" width="120">
              <template #default="{ row }">
                <el-tag :type="getSelectedHostCount(row) > 0 ? 'success' : 'info'" size="small">
                  {{ getSelectedHostCount(row) }} 台
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="140" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="openHostSelectorFromLibrary(row)">
                  {{ getSelectedHostCount(row) > 0 ? '修改机器' : '选择机器' }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="ops-pagination-wrapper picker-pagination-wrapper">
          <el-pagination
            v-model:current-page="patchPagination.page"
            v-model:page-size="patchPagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="patchPagination.total"
            layout="total, sizes, prev, pager, next"
            background
            @size-change="handlePatchPageSizeChange"
            @current-change="handlePatchPageChange"
          />
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="innerDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmPatchSelection">确认</el-button>
    </template>
  </el-dialog>

  <el-dialog
    v-model="hostDialogVisible"
    :title="currentHostPatch ? `选择机器 - ${currentHostPatch.patch_id}` : '选择机器'"
    width="760px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @opened="syncHostTableSelection"
  >
    <div v-loading="hostLoading" class="host-dialog-body">
      <div class="host-dialog-toolbar">
        <span>仅可分配扫描结果中存在的机器</span>
        <el-tag size="small" type="success">已选 {{ tempSelectedHostIds.length }} 台</el-tag>
      </div>

      <el-empty v-if="!hostLoading && availableHosts.length === 0" description="该补丁当前没有可分配的机器" />

      <el-table
        v-else
        ref="hostTableRef"
        :data="availableHosts"
        row-key="host_id"
        max-height="420px"
        @selection-change="handleHostSelectionChange"
      >
        <el-table-column type="selection" :reserve-selection="true" width="50" />
        <el-table-column prop="host_key" label="主机/IP" min-width="180">
          <template #default="{ row }">
            {{ row.host_key || row.host_id || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="host_id" label="机器ID" min-width="220" show-overflow-tooltip />
      </el-table>
    </div>

    <template #footer>
      <el-button @click="hostDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmHostSelection">确认</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { nextTick, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { apiService } from '@/core/api'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  username: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:visible', 'success'])

const assignLoading = ref(false)
const loadingAssigned = ref(false)
const innerDialogVisible = ref(false)
const hostDialogVisible = ref(false)
const patchTableRef = ref(null)
const hostTableRef = ref(null)
const selectedPatchesList = ref([])
const liveSelectedPatches = ref([])
const currentHostPatch = ref(null)
const availableHosts = ref([])
const tempSelectedHostIds = ref([])
const tempSelectedHosts = ref([])
const hostLoading = ref(false)
const availablePatchesLoading = ref(false)
const availablePatches = ref([])
const syncingPatchSelection = ref(false)
const syncingHostSelection = ref(false)
const patchFilters = reactive({
  keyword: '',
  severity: []
})
const patchPagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

function padDateTimeUnit(value) {
  return String(value).padStart(2, '0')
}

function formatDateTimeValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return ''
  }

  return `${date.getFullYear()}-${padDateTimeUnit(date.getMonth() + 1)}-${padDateTimeUnit(date.getDate())} ${padDateTimeUnit(date.getHours())}:${padDateTimeUnit(date.getMinutes())}:${padDateTimeUnit(date.getSeconds())}`
}

function getDefaultExpireTime() {
  const date = new Date()
  date.setMilliseconds(0)
  date.setDate(date.getDate() + 1)
  return formatDateTimeValue(date)
}

function createDefaultAssignForm() {
  return {
    expireTime: getDefaultExpireTime(),
    remark: ''
  }
}

const assignForm = ref(createDefaultAssignForm())

function normalizeId(value) {
  return value === undefined || value === null ? '' : String(value)
}

function normalizeHostItem(item) {
  const hostId = normalizeId(item?.host_id || item?.hostId || item?.id || item?.value)
  const hostKey = item?.host_key || item?.hostKey || item?.hostname || item?.ip || item?.name

  return {
    host_id: hostId,
    host_key: hostKey ? String(hostKey) : hostId
  }
}

function extractAssignedHostItem(item) {
  const hostId = normalizeId(
    item?.host_id
    || item?.hostId
    || item?.machine_id
    || item?.machineId
    || item?.hosts_id
    || item?.hostsId
  )
  const hostKey = item?.host_key || item?.hostKey || item?.hostname || item?.ip || item?.name

  if (!hostId && !hostKey) {
    return null
  }

  return {
    host_id: hostId,
    host_key: hostKey ? String(hostKey) : hostId
  }
}

function buildSelectedHosts(hostIds = [], availableHostList = []) {
  const hostMap = new Map((availableHostList || []).map(item => {
    const normalized = normalizeHostItem(item)
    return [normalized.host_id, normalized]
  }))

  return hostIds.map(hostId => hostMap.get(hostId) || {
    host_id: hostId,
    host_key: hostId
  })
}

function matchHostBySelection(host, selectedHost) {
  const normalizedHostId = normalizeId(host?.host_id)
  const normalizedHostKey = normalizeId(host?.host_key)
  const normalizedSelectedId = normalizeId(selectedHost?.host_id)
  const normalizedSelectedKey = normalizeId(selectedHost?.host_key)

  return Boolean(
    (normalizedSelectedId && normalizedHostId && normalizedSelectedId === normalizedHostId)
    || (normalizedSelectedKey && normalizedHostKey && normalizedSelectedKey === normalizedHostKey)
    || (normalizedSelectedKey && normalizedHostId && normalizedSelectedKey === normalizedHostId)
    || (normalizedSelectedId && normalizedHostKey && normalizedSelectedId === normalizedHostKey)
  )
}

function dedupeSelectedHosts(hostList = []) {
  const hostMap = new Map()
  ;(hostList || []).forEach(item => {
    const normalized = normalizeHostItem(item)
    const key = normalizeId(normalized.host_id) || normalizeId(normalized.host_key)
    if (key) {
      hostMap.set(key, normalized)
    }
  })
  return Array.from(hostMap.values())
}

function hydratePatchHostSelection(patch) {
  const availableHostList = Array.isArray(patch.availableHosts)
    ? patch.availableHosts.map(normalizeHostItem).filter(item => item.host_id)
    : []
  const selectedHostList = Array.isArray(patch.selectedHosts)
    ? patch.selectedHosts.map(normalizeHostItem).filter(item => item.host_id || item.host_key)
    : []
  const resolvedSelectedHosts = dedupeSelectedHosts(selectedHostList.map(selectedHost => {
    const matchedHost = availableHostList.find(host => matchHostBySelection(host, selectedHost))
    return matchedHost || selectedHost
  }))
  const resolvedHostIds = resolvedSelectedHosts
    .map(item => normalizeId(item.host_id))
    .filter(Boolean)
  const fallbackHostIds = Array.isArray(patch.hostIds)
    ? patch.hostIds.map(normalizeId).filter(Boolean)
    : []

  return {
    ...patch,
    availableHosts: availableHostList,
    selectedHosts: resolvedSelectedHosts,
    hostIds: Array.from(new Set(resolvedHostIds.length > 0 ? resolvedHostIds : fallbackHostIds))
  }
}

function extractHostsFromPatch(item) {
  const sourceHosts = item?.availableHosts || item?.hosts || item?.hostList || item?.machines || item?.machineList || item?.affectedHosts || []
  if (!Array.isArray(sourceHosts)) return []

  return sourceHosts
    .map(normalizeHostItem)
    .filter(host => host.host_id)
}

function normalizeAvailablePatchItem(item) {
  const patchId = item?.patch_id || item?.patchId || item?.id || ''
  const normalizedHosts = extractHostsFromPatch(item)
  const effectHostCount = Number(
    item?.hostCount ??
    item?.effect_host_count ??
    item?.effectHostCount ??
    item?.affectedHostCount ??
    item?.host_count ??
    normalizedHosts.length
  )
  const patchName = item?.patchName || item?.patch_name || item?.title || item?.summary || ''

  return {
    patch_id: patchId,
    patch_name: patchName,
    title: patchName,
    severity: item?.severity || item?.level || item?.riskLevel || '',
    related_vuls: item?.related_vuls || item?.relatedVuls || item?.cves || item?.cveList || '',
    effect_host_count: Number.isFinite(effectHostCount) ? effectHostCount : normalizedHosts.length,
    availableHosts: normalizedHosts,
    hostsLoaded: normalizedHosts.length > 0
  }
}

function normalizePatchItem(patch, existingPatch = null) {
  const hasHostIds = patch && Object.prototype.hasOwnProperty.call(patch, 'hostIds')
  const hasAvailableHosts = patch && Object.prototype.hasOwnProperty.call(patch, 'availableHosts')
  const hasHostsLoaded = patch && Object.prototype.hasOwnProperty.call(patch, 'hostsLoaded')
  const hasSelectedHosts = patch && Object.prototype.hasOwnProperty.call(patch, 'selectedHosts')

  const normalizedHostIds = hasHostIds
    ? (Array.isArray(patch.hostIds) ? patch.hostIds : [])
    : (Array.isArray(existingPatch?.hostIds) ? existingPatch.hostIds : [])
  const normalizedAvailableHosts = hasAvailableHosts
    ? (Array.isArray(patch.availableHosts) ? patch.availableHosts : [])
    : (Array.isArray(existingPatch?.availableHosts) ? existingPatch.availableHosts : [])
  const normalizedHostsLoaded = hasHostsLoaded
    ? Boolean(patch.hostsLoaded)
    : Boolean(existingPatch?.hostsLoaded)
  const normalizedSelectedHosts = hasSelectedHosts
    ? (Array.isArray(patch.selectedHosts) ? patch.selectedHosts.map(normalizeHostItem) : [])
    : (Array.isArray(existingPatch?.selectedHosts) ? existingPatch.selectedHosts.map(normalizeHostItem) : [])

  return hydratePatchHostSelection({
    ...existingPatch,
    ...patch,
    patch_id: patch.patch_id || patch.patchId,
    hostIds: Array.from(new Set(normalizedHostIds.map(normalizeId).filter(Boolean))),
    availableHosts: normalizedAvailableHosts,
    hostsLoaded: normalizedHostsLoaded,
    selectedHosts: normalizedSelectedHosts
  })
}

function mergeSelectedPatches(patches) {
  const existingMap = new Map(selectedPatchesList.value.map(item => [item.patch_id, item]))
  return patches
    .map(item => normalizePatchItem(item, existingMap.get(item.patch_id || item.patchId)))
    .filter(item => item.patch_id)
}

async function loadAvailablePatches() {
  availablePatchesLoading.value = true
  try {
    const params = {
      page: patchPagination.page - 1,
      size: patchPagination.pageSize
    }

    if (patchFilters.keyword.trim()) {
      params.patchId = patchFilters.keyword.trim()
    }
    if (patchFilters.severity.length > 0) {
      params.severity = patchFilters.severity.join(',')
    }

    const res = await apiService.get('/vap/api/vap/v2/patch/assignment/available-patches', {
      params
    })
    const rawList = res?.data?.content || res?.data?.records || res?.data || []
    const normalized = (Array.isArray(rawList) ? rawList : [])
      .map(normalizeAvailablePatchItem)
      .filter(item => item.patch_id)

    availablePatches.value = normalized
    patchPagination.total = res?.data?.totalElements || res?.data?.total || normalized.length
    await nextTick()
    syncPatchTableSelection()
  } catch (e) {
    console.error('Failed to load available patches', e)
    ElMessage.error('加载可分配补丁列表失败')
    availablePatches.value = []
    patchPagination.total = 0
  } finally {
    availablePatchesLoading.value = false
  }
}

async function fetchAvailablePatchById(patchId) {
  if (!patchId) {
    return null
  }

  const res = await apiService.get('/vap/api/vap/v2/patch/assignment/available-patches', {
    params: {
      page: 0,
      size: 100,
      patchId
    }
  })
  const rawList = res?.data?.content || res?.data?.records || res?.data || []
  const normalized = (Array.isArray(rawList) ? rawList : [])
    .map(normalizeAvailablePatchItem)
    .filter(item => item.patch_id)

  return normalized.find(item => item.patch_id === patchId) || normalized[0] || null
}

async function hydratePatchHostIdsIfNeeded(patch) {
  if (!patch?.patch_id || patch?.hostIds?.length > 0 || !Array.isArray(patch.selectedHosts) || patch.selectedHosts.length === 0) {
    return patch
  }

  const pagePatch = availablePatches.value.find(item => item.patch_id === patch.patch_id)
  if (pagePatch) {
    Object.assign(patch, normalizePatchItem(pagePatch, patch))
  }

  if (patch?.hostIds?.length > 0) {
    return patch
  }

  try {
    const remotePatch = await fetchAvailablePatchById(patch.patch_id)
    if (remotePatch) {
      Object.assign(patch, normalizePatchItem(remotePatch, patch))
    }
  } catch (e) {
    console.error(`Failed to hydrate host ids for patch ${patch.patch_id}`, e)
  }

  return patch
}

async function loadAssignedPatches() {
  if (!props.username) return
  loadingAssigned.value = true
  try {
    const res = await apiService.get('/vap/api/vap/v2/patch/assignment/list', {
      params: { userLogin: props.username, page: 0, size: 1000 }
    })
    if (res?.data?.content) {
      const grouped = res.data.content.reduce((map, item) => {
        const patchId = item.patchId
        if (!patchId) return map
        const current = map.get(patchId) || {
          patch_id: patchId,
          hostIds: [],
          availableHosts: [],
          hostsLoaded: false,
          selectedHosts: []
        }
        const assignedHost = extractAssignedHostItem(item)
        if (assignedHost) {
          current.selectedHosts.push(assignedHost)
          if (assignedHost.host_id) {
            current.hostIds.push(assignedHost.host_id)
          }
        }
        map.set(patchId, current)
        return map
      }, new Map())

      selectedPatchesList.value = Array.from(grouped.values()).map(item => normalizePatchItem(item))
    } else {
      selectedPatchesList.value = []
    }
  } catch (e) {
    console.error('Failed to load initially assigned patches', e)
  } finally {
    loadingAssigned.value = false
  }
}

async function openPatchLibrary() {
  liveSelectedPatches.value = mergeSelectedPatches(selectedPatchesList.value)
  innerDialogVisible.value = true
  await loadAvailablePatches()
}

function handleInnerDialogOpened() {
  syncPatchTableSelection()
}

function clearAllPatches() {
  selectedPatchesList.value = []
}

function removeSelectedPatchFromMain(patchId) {
  selectedPatchesList.value = selectedPatchesList.value.filter(item => item.patch_id !== patchId)
}

function handleRemovePatch(patch) {
  liveSelectedPatches.value = liveSelectedPatches.value.filter(item => item.patch_id !== patch.patch_id)
  syncPatchTableSelection()
}

function getSelectedHostCount(patch) {
  const patchId = patch?.patch_id || patch?.patchId
  if (!patchId) return 0

  const targetPatch = liveSelectedPatches.value.find(item => item.patch_id === patchId)
    || selectedPatchesList.value.find(item => item.patch_id === patchId)

  return targetPatch?.hostIds?.length || targetPatch?.selectedHosts?.length || 0
}

function ensureLibraryPatchSelected(patch) {
  const patchId = patch?.patch_id || patch?.patchId
  if (!patchId) return null

  let targetPatch = liveSelectedPatches.value.find(item => item.patch_id === patchId)
  const existingPatch = selectedPatchesList.value.find(item => item.patch_id === patchId)
  const mergedPatch = normalizePatchItem(patch, targetPatch || existingPatch)

  if (targetPatch) {
    Object.assign(targetPatch, mergedPatch)
  }

  if (!targetPatch) {
    liveSelectedPatches.value = mergeSelectedPatches([...liveSelectedPatches.value, mergedPatch])
    targetPatch = liveSelectedPatches.value.find(item => item.patch_id === patchId) || mergedPatch
  }

  return targetPatch
}

async function openHostSelectorFromLibrary(patch) {
  const targetPatch = ensureLibraryPatchSelected(patch)
  if (!targetPatch) {
    ElMessage.warning('当前补丁信息不完整，无法选择机器')
    return
  }

  await nextTick()
  syncPatchTableSelection()
  await openHostSelector(targetPatch)
}

function syncPatchTableSelection() {
  if (!patchTableRef.value) return

  const selectedPatchIds = new Set(liveSelectedPatches.value.map(item => item.patch_id))
  syncingPatchSelection.value = true
  patchTableRef.value.clearSelection()
  availablePatches.value.forEach(row => {
    if (selectedPatchIds.has(row.patch_id)) {
      patchTableRef.value.toggleRowSelection(row, true)
    }
  })
  nextTick(() => {
    syncingPatchSelection.value = false
  })
}

function onPatchSelectionChange(selection) {
  if (syncingPatchSelection.value) {
    return
  }

  const previousSelectionMap = new Map(liveSelectedPatches.value.map(item => [item.patch_id, item]))
  const pagePatchIds = new Set(availablePatches.value.map(item => item.patch_id))
  const nextSelectionMap = new Map(
    liveSelectedPatches.value
      .filter(item => !pagePatchIds.has(item.patch_id))
      .map(item => [item.patch_id, item])
  )

  selection.forEach(item => {
    nextSelectionMap.set(
      item.patch_id,
      normalizePatchItem(item, previousSelectionMap.get(item.patch_id) || selectedPatchesList.value.find(row => row.patch_id === item.patch_id))
    )
  })

  liveSelectedPatches.value = Array.from(nextSelectionMap.values())
}

function handlePatchSearch() {
  patchPagination.page = 1
  loadAvailablePatches()
}

function handlePatchReset() {
  patchFilters.keyword = ''
  patchFilters.severity = []
  patchPagination.page = 1
  patchPagination.pageSize = 20
  loadAvailablePatches()
}

function handlePatchPageChange(page) {
  patchPagination.page = page
  loadAvailablePatches()
}

function handlePatchPageSizeChange(size) {
  patchPagination.pageSize = size
  patchPagination.page = 1
  loadAvailablePatches()
}

function ensureAvailableHosts(patch) {
  if (!patch?.patch_id) return []

  if ((!Array.isArray(patch.availableHosts) || patch.availableHosts.length === 0) && availablePatches.value.length > 0) {
    const pagePatch = availablePatches.value.find(item => item.patch_id === patch.patch_id)
    if (pagePatch) {
      Object.assign(patch, normalizePatchItem(pagePatch, patch))
    }
  }

  const normalizedHosts = Array.isArray(patch.availableHosts)
    ? patch.availableHosts.map(normalizeHostItem).filter(item => item.host_id)
    : []

  patch.availableHosts = normalizedHosts
  patch.hostsLoaded = normalizedHosts.length > 0

  if (normalizedHosts.length === 0) {
    ElMessage.warning(`补丁 ${patch.patch_id} 未返回可分配机器信息`)
  }

  return normalizedHosts
}

function getSelectedHostPreview(patch) {
  const previewHosts = Array.isArray(patch.selectedHosts) && patch.selectedHosts.length > 0
    ? patch.selectedHosts
    : buildSelectedHosts(patch.hostIds || [], patch.availableHosts || [])

  return previewHosts.slice(0, 3)
}

async function openHostSelector(patch) {
  currentHostPatch.value = patch
  tempSelectedHostIds.value = (patch.hostIds || []).map(normalizeId).filter(Boolean)
  tempSelectedHosts.value = Array.isArray(patch.selectedHosts)
    ? patch.selectedHosts.map(normalizeHostItem)
    : []
  hostDialogVisible.value = true
  availableHosts.value = ensureAvailableHosts(patch)

  if (tempSelectedHosts.value.length === 0 && tempSelectedHostIds.value.length > 0) {
    tempSelectedHosts.value = buildSelectedHosts(tempSelectedHostIds.value, availableHosts.value)
  }

  await nextTick()
  syncHostTableSelection()
}

function syncHostTableSelection() {
  if (!hostTableRef.value) return

  syncingHostSelection.value = true
  hostTableRef.value.clearSelection()
  availableHosts.value.forEach(row => {
    if (tempSelectedHostIds.value.includes(normalizeId(row.host_id))) {
      hostTableRef.value.toggleRowSelection(row, true)
    }
  })
  nextTick(() => {
    syncingHostSelection.value = false
  })
}

function handleHostSelectionChange(selection) {
  if (syncingHostSelection.value) {
    return
  }

  tempSelectedHostIds.value = selection.map(item => normalizeId(item.host_id)).filter(Boolean)
  tempSelectedHosts.value = selection.map(normalizeHostItem)
}

function confirmHostSelection() {
  if (!currentHostPatch.value) {
    hostDialogVisible.value = false
    return
  }

  currentHostPatch.value.hostIds = Array.from(new Set(tempSelectedHostIds.value.map(normalizeId).filter(Boolean)))
  currentHostPatch.value.selectedHosts = tempSelectedHosts.value.map(normalizeHostItem)
  hostDialogVisible.value = false

  if (innerDialogVisible.value) {
    nextTick(() => {
      syncPatchTableSelection()
    })
  }
}

function resetAssignForm() {
  assignForm.value = createDefaultAssignForm()
  selectedPatchesList.value = []
  liveSelectedPatches.value = []
  currentHostPatch.value = null
  availableHosts.value = []
  tempSelectedHostIds.value = []
  tempSelectedHosts.value = []
  patchFilters.keyword = ''
  patchFilters.severity = []
  patchPagination.page = 1
  patchPagination.pageSize = 20
  patchPagination.total = 0
}

function confirmPatchSelection() {
  if (liveSelectedPatches.value.length === 0 && selectedPatchesList.value.length === 0) {
    ElMessage.warning('请在表格中至少勾选一个需要分配的补丁！')
    return
  }

  selectedPatchesList.value = mergeSelectedPatches(liveSelectedPatches.value)
  innerDialogVisible.value = false
}

function closeDialog() {
  emit('update:visible', false)
}

async function submitAssign() {
  if (selectedPatchesList.value.length === 0) {
    ElMessage.warning('请先点击按钮挑选需要分配的补丁！')
    return
  }

  await Promise.all(selectedPatchesList.value.map(hydratePatchHostIdsIfNeeded))

  const invalidPatch = selectedPatchesList.value.find(item => !item.hostIds || item.hostIds.length === 0)
  if (invalidPatch) {
    const hasExistingSelection = Array.isArray(invalidPatch.selectedHosts) && invalidPatch.selectedHosts.length > 0
    ElMessage.warning(
      hasExistingSelection
        ? `补丁 ${invalidPatch.patch_id} 的已分配机器未能自动解析，请在补丁列表中重新确认机器`
        : `请先为补丁 ${invalidPatch.patch_id} 选择至少一台机器`
    )
    return
  }

  const items = selectedPatchesList.value.map(item => ({
    patchId: item.patch_id,
    hostIds: Array.from(new Set(item.hostIds || []))
  }))

  assignLoading.value = true
  try {
    const res = await apiService.post('/vap/api/vap/v2/patch/assignment', {
      userLogin: props.username,
      items,
      expireTime: assignForm.value.expireTime || undefined,
      remark: assignForm.value.remark || undefined
    })
    ElMessage.success(`分配成功，共处理 ${res?.data?.count || items.length} 条记录`)
    emit('success')
    closeDialog()
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || '分配失败')
  } finally {
    assignLoading.value = false
  }
}

function getSeverityLabel(severity) {
  const labelMap = {
    Critical: '严重',
    Important: '重要',
    Moderate: '中等',
    Low: '低危'
  }
  return labelMap[severity] || severity || '-'
}

function getSeverityTagType(severity) {
  const typeMap = {
    Critical: 'danger',
    Important: 'warning',
    Moderate: 'primary',
    Low: 'info'
  }
  return typeMap[severity] || 'info'
}
</script>

<style scoped>
.device-list-container {
  display: block;
  width: 100%;
}

.device-header {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.device-summary {
  display: inline-flex;
  align-items: center;
  position: relative;
  min-width: 80px;
  height: 32px;
  padding: 0 24px 0 12px;
  font-size: 13px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  background: var(--el-bg-color);
  cursor: pointer;
  transition: border-color 0.15s;
}

.device-summary:hover {
  border-color: #409eff;
}

.op-hover-trigger .op-hover-to-show {
  opacity: 0;
  transition: opacity 0.15s;
}

.op-hover-trigger:hover .op-hover-to-show {
  opacity: 1;
}

.clear-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: #909399;
  cursor: pointer;
}

.clear-btn:hover {
  color: #f56c6c;
}

.device-chip-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: calc(100vh - 500px);
  overflow-y: auto;
}

.device-chip-item {
  display: inline-block;
  width: 100%;
}

.empty-state {
  display: block;
}

.assign-patch-picker {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  overflow: hidden;
}

.picker-table-wrapper {
  flex: 1;
  min-height: 0;
}

.picker-pagination-wrapper {
  margin-top: 0;
  padding: 12px 16px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

.ops-filter-bar {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.patch-assignment-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: var(--el-fill-color-blank);
}

.patch-assignment-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.patch-host-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.host-preview-more {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 24px;
}

.host-dialog-body {
  min-height: 160px;
}

.host-dialog-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

</style>
