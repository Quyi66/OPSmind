<template>
  <el-dialog
    v-model="visible"
    title="选择设备"
    width="1200px"
    :close-on-click-modal="false"
    :z-index="3000"
    append-to-body
    class="acm-device-selector-dialog"
  >
    <div class="selector-container">
      <!-- CI类型选择 -->
      <div v-if="ciTypeDefs.length > 1" class="ci-type-selector mb-3">
        <el-select
          v-model="activeCiType"
          placeholder="请选择CI类型"
          class="w-100"
          popper-style="z-index: 10000"
        >
          <el-option
            v-for="citype in ciTypeDefs"
            :key="citype.code"
            :label="citype.title"
            :value="citype.code"
          />
        </el-select>
      </div>

      <!-- 已选主机展示 -->
      <div class="selected-hosts-card mb-3">
        <el-card>
          <template #header>
            <div
              class="card-header-content"
              style="display: flex; justify-content: space-between; align-items: center"
            >
              <span>
                <i class="fa fa-briefcase-medical text-muted me-2" />
                已选主机
                <el-badge :value="selectedHostsByCiType.length" type="danger" class="ms-2" />
              </span>
              <div style="display: flex; gap: 8px; align-items: center">
                <el-input
                  v-if="selectedHostsByCiType.length > 10"
                  v-model="searchSelectedQuery"
                  placeholder="搜索已选主机..."
                  size="small"
                  clearable
                  style="width: 180px"
                />
                <el-button text size="small" @click="toggleShowHosts">
                  {{ showHosts ? '收起' : '展开' }}
                </el-button>
                <el-button
                  v-if="selectedHostsByCiType.length > 0"
                  text
                  type="danger"
                  size="small"
                  @click="clearAllSelected"
                >
                  清空
                </el-button>
              </div>
            </div>
          </template>
          <div
            v-if="showHosts && selectedHostsByCiType.length > 0"
            class="selected-hosts-body"
            style="max-height: 120px; overflow-y: auto; padding: 4px"
          >
            <div class="host-chips" style="display: flex; flex-wrap: wrap; gap: 8px">
              <el-tag
                v-for="host in displayedSelectedTags"
                :key="host.key || host.value"
                closable
                type="primary"
                size="default"
                @close="removeHost(host)"
              >
                {{ host.value }}
              </el-tag>
            </div>
            <div
              v-if="displayedSelectedTags.length === 0"
              class="text-muted text-center py-2"
              style="font-size: 13px"
            >
              未匹配到相关主机
            </div>
            <div v-if="hasMoreSelectedTags" style="text-align: center; margin-top: 8px">
              <el-button link type="primary" size="small" @click="loadMoreSelectedTags">
                加载更多 (已显示 {{ displayedSelectedTags.length }}/{{
                  filteredSelectedTags.length
                }})
              </el-button>
            </div>
          </div>
        </el-card>
      </div>

      <!-- 选择模式标签页 -->
      <el-tabs v-if="activeCiType" v-model="currentMode" class="selector-tabs">
        <el-tab-pane v-if="selectModeDefs.host" name="host" lazy :label="selectModeDefs.host.title">
          <template #label>
            <i :class="`fa fa-fw ${selectModeDefs.host.icon}`" />
            {{ selectModeDefs.host.title }}
          </template>
          <InstanceSelector
            :ci-type="activeCiType"
            v-model="selectedHostsByCiType"
            :options="options"
          />
        </el-tab-pane>

        <el-tab-pane
          v-if="selectModeDefs.group"
          name="group"
          lazy
          :label="selectModeDefs.group.title"
        >
          <template #label>
            <i :class="`fa fa-fw ${selectModeDefs.group.icon}`" />
            {{ selectModeDefs.group.title }}
          </template>
          <GroupSelector
            :ci-type="activeCiType"
            v-model="selectedHostsByCiType"
            :options="options"
          />
        </el-tab-pane>

        <el-tab-pane v-if="selectModeDefs.tag" name="tag" lazy :label="selectModeDefs.tag.title">
          <template #label>
            <i :class="`fa fa-fw ${selectModeDefs.tag.icon}`" />
            {{ selectModeDefs.tag.title }}
          </template>
          <TagSelector :ci-type="activeCiType" v-model="selectedHostsByCiType" :options="options" />
        </el-tab-pane>

        <el-tab-pane
          v-if="selectModeDefs.input"
          name="input"
          lazy
          :label="selectModeDefs.input.title"
        >
          <template #label>
            <i :class="`fa fa-fw ${selectModeDefs.input.icon}`" />
            {{ selectModeDefs.input.title }}
          </template>
          <InputFilter :ci-type="activeCiType" v-model="selectedHostsByCiType" />
        </el-tab-pane>

        <el-tab-pane
          v-if="selectModeDefs.recently"
          name="recently"
          lazy
          :label="selectModeDefs.recently.title"
        >
          <template #label>
            <i :class="`fa fa-fw ${selectModeDefs.recently.icon}`" />
            {{ selectModeDefs.recently.title }}
          </template>
          <RecentlySelector
            :ci-type="activeCiType"
            v-model="selectedHostsByCiType"
            :options="options"
          />
        </el-tab-pane>
      </el-tabs>
    </div>

    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" @click="handleConfirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import InstanceSelector from './acm/InstanceSelector.vue'
import GroupSelector from './acm/GroupSelector.vue'
import TagSelector from './acm/TagSelector.vue'
import InputFilter from './acm/InputFilter.vue'
import RecentlySelector from './acm/RecentlySelector.vue'
import * as jaoApi from '@/modules/automation/api/jao'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  ciTypes: { type: [String, Array], default: 'linux' },
  initialSelection: { type: Array, default: () => [] },
  options: {
    type: Object,
    default: () => ({
      selectMode: 'host,group,tag,input,recently',
      selector: 'multiple'
    })
  }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const selectModeDefaults = {
  host: { title: '设备', icon: 'fa-server' },
  group: { title: '分组', icon: 'fa-sitemap' },
  tag: { title: '标签', icon: 'fa-tag' },
  input: { title: '输入', icon: 'fa-keyboard' },
  recently: { title: '最近使用', icon: 'fa-history' }
}

const ciTypeDefs = ref([])
const activeCiType = ref('')
const currentMode = ref('host')
const selectedHostsByCiType = ref([])
const allSelectedHosts = ref([])
const showHosts = ref(true)

// 已选主机性能优化与检索
const searchSelectedQuery = ref('')
const displayedSelectedCount = ref(30)

watch([selectedHostsByCiType, searchSelectedQuery], () => {
  displayedSelectedCount.value = 30
})

const filteredSelectedTags = computed(() => {
  if (!searchSelectedQuery.value) return selectedHostsByCiType.value
  const keyword = searchSelectedQuery.value.toLowerCase().trim()
  return selectedHostsByCiType.value.filter(host =>
    String(host.value || '')
      .toLowerCase()
      .includes(keyword)
  )
})

const displayedSelectedTags = computed(() => {
  return filteredSelectedTags.value.slice(0, displayedSelectedCount.value)
})

const hasMoreSelectedTags = computed(() => {
  return filteredSelectedTags.value.length > displayedSelectedCount.value
})

function loadMoreSelectedTags() {
  displayedSelectedCount.value += 50
}

function clearAllSelected() {
  selectedHostsByCiType.value = []
  mergeCurrentCiTypeSelection([])
}

const isSingleSelector = computed(() => props.options.selector === 'single')

const selectModeDefs = computed(() => {
  const modes = {}
  const selectMode = props.options.selectMode || 'host,group,tag,input,recently'
  const modeList = selectMode.split(',')

  modeList.forEach((mode, index) => {
    if (index === 0) {
      currentMode.value = mode
    }
    if (selectModeDefaults[mode]) {
      modes[mode] = selectModeDefaults[mode]
    }
  })

  return modes
})

watch(visible, val => {
  if (val) {
    allSelectedHosts.value = normalizeSingleSelection([...(props.initialSelection || [])])
    initCiTypes()
  } else {
    selectedHostsByCiType.value = []
  }
})

watch(activeCiType, (newVal, oldVal) => {
  if (newVal && newVal !== oldVal) {
    syncSelectedHostsByCiType()
  }
})

watch(
  () => selectedHostsByCiType.value,
  newVal => {
    mergeCurrentCiTypeSelection(newVal)
  },
  { deep: true }
)

function resolveInitialActiveCiType() {
  const firstHost = allSelectedHosts.value[0]
  const assetType =
    typeof firstHost === 'object' && firstHost !== null
      ? firstHost.assetType || firstHost.ciType || ''
      : ''

  if (assetType && ciTypeDefs.value.some(t => t.code === assetType)) {
    return assetType
  }

  return ciTypeDefs.value[0]?.code || 'linux'
}

function applyInitialSelectionState() {
  activeCiType.value = resolveInitialActiveCiType()
  syncSelectedHostsByCiType()
}

function initCiTypes() {
  let types = props.ciTypes
  if (typeof types === 'string') {
    types = types.split(',')
  }

  const useAllTypes = types.includes('[all]')
  const useAutoTypes = !useAllTypes && types.includes('[auto]')

  // 根据不同模式获取CI类型列表
  const apiCall = useAutoTypes ? jaoApi.getAcmCiTypesAuto() : jaoApi.getAcmCiTypes()

  apiCall
    .then(response => {
      const citMap = response?.data || response || {}
      if (useAllTypes || useAutoTypes) {
        // 使用所有返回的类型
        ciTypeDefs.value = Object.keys(citMap).map(code => ({
          code,
          title: citMap[code]?.title || code,
          icon: citMap[code]?.icon || 'fa-server'
        }))
      } else {
        // 只使用指定的类型
        ciTypeDefs.value = types
          .filter(type => citMap[type])
          .map(code => ({
            code,
            title: citMap[code]?.title || code,
            icon: citMap[code]?.icon || 'fa-server'
          }))
      }

      // 如果没有获取到类型，使用传入的第一个作为默认值
      if (ciTypeDefs.value.length === 0) {
        ciTypeDefs.value = types.map(code => ({
          code: code.replace(/^\[|\]$/g, ''),
          title: code,
          icon: 'fa-server'
        }))
      }

      applyInitialSelectionState()
    })
    .catch(error => {
      console.error('获取CI类型失败:', error)
      // 降级处理：使用传入的ciTypes
      ciTypeDefs.value = types.map(code => ({
        code: code.replace(/^\[|\]$/g, ''),
        title: code,
        icon: 'fa-server'
      }))
      applyInitialSelectionState()
    })
}

function getHostCiType(host) {
  if (typeof host === 'object' && host !== null) {
    return host.assetType || host.ciType || ''
  }
  return activeCiType.value
}

function normalizeHostForCiType(host) {
  if (typeof host === 'object' && host !== null) {
    return {
      ...host,
      assetType: host.assetType || host.ciType || activeCiType.value
    }
  }
  return host
}

function normalizeSingleSelection(hosts = []) {
  const normalizedHosts = Array.isArray(hosts) ? hosts : []

  if (!isSingleSelector.value) {
    return normalizedHosts
  }

  return normalizedHosts.slice(0, 1)
}

function syncSelectedHostsByCiType() {
  if (!activeCiType.value) {
    selectedHostsByCiType.value = []
    return
  }

  selectedHostsByCiType.value = allSelectedHosts.value
    .filter(host => getHostCiType(host) === activeCiType.value)
    .map(host => normalizeHostForCiType(host))
}

function mergeCurrentCiTypeSelection(currentSelection = []) {
  if (!activeCiType.value) {
    return
  }

  const otherSelections = allSelectedHosts.value.filter(
    host => getHostCiType(host) !== activeCiType.value
  )
  const normalizedCurrentSelection = normalizeSingleSelection(
    (currentSelection || []).map(host => normalizeHostForCiType(host))
  )

  if (isSingleSelector.value) {
    const nextSelection = normalizedCurrentSelection[0] || otherSelections[0] || null
    allSelectedHosts.value = nextSelection ? [nextSelection] : []
    return
  }

  allSelectedHosts.value = [...otherSelections, ...normalizedCurrentSelection]
}

function toggleShowHosts() {
  showHosts.value = !showHosts.value
}

function removeHost(host) {
  const nextSelection = selectedHostsByCiType.value.filter(
    item => item.key !== host.key && item.value !== host.value
  )
  mergeCurrentCiTypeSelection(nextSelection)
  selectedHostsByCiType.value = nextSelection
}

function handleConfirm() {
  emit('confirm', allSelectedHosts.value)
  visible.value = false
}

function handleCancel() {
  visible.value = false
}
</script>

<style scoped>
.acm-device-selector-dialog {
  margin-top: 4vh !important;
  height: 86vh;
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.acm-device-selector-dialog :deep(.el-dialog__header),
.acm-device-selector-dialog :deep(.el-dialog__footer) {
  flex-shrink: 0;
}

.acm-device-selector-dialog :deep(.el-dialog__body) {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
  padding-top: 12px;
}

.acm-device-selector-dialog .selector-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.acm-device-selector-dialog .ci-type-selector {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.acm-device-selector-dialog .selected-hosts-card .card-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.acm-device-selector-dialog .selected-hosts-card {
  flex-shrink: 0;
}

.acm-device-selector-dialog .selected-hosts-card .selected-hosts-body {
  max-height: 160px;
  overflow-y: auto;
}

.acm-device-selector-dialog .selected-hosts-card .host-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.acm-device-selector-dialog .selector-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.acm-device-selector-dialog .selector-tabs :deep(.el-tabs__content) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.acm-device-selector-dialog .selector-tabs :deep(.el-tabs__header) {
  margin: 0 0 15px;
  flex-shrink: 0;
}

.acm-device-selector-dialog .selector-tabs :deep(.el-tabs__nav) {
  display: flex;
}

.acm-device-selector-dialog .selector-tabs :deep(.el-tab-pane) {
  height: 100%;
  min-height: 0;
}

.acm-device-selector-dialog .selector-tabs :deep(.el-tabs__item) {
  padding: 0 16px;
  height: 40px;
  line-height: 40px;
}
</style>
