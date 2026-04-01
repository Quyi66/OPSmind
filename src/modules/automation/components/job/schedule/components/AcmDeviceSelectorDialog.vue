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
        <el-select v-model="activeCiType" placeholder="请选择CI类型" class="w-100" popper-style="z-index: 10000">
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
            <div class="card-header-content">
              <span>
                <i class="fa fa-briefcase-medical text-muted me-2" />
                已选主机
              </span>
              <el-badge :value="selectedHostsByCiType.length" type="danger" class="ms-3">
                <el-button text @click="toggleShowHosts">
                  {{ showHosts ? '收起' : '展开' }}
                </el-button>
              </el-badge>
            </div>
          </template>
          <div v-if="showHosts && selectedHostsByCiType.length > 0" class="selected-hosts-body">
            <div class="host-chips">
              <el-tag
                v-for="(host, index) in selectedHostsByCiType"
                :key="index"
                closable
                type="primary"
                size="large"
                @close="removeHost(host, index)"
              >
                {{ host.value }}
              </el-tag>
            </div>
          </div>
        </el-card>
      </div>

      <!-- 选择模式标签页 -->
      <el-tabs v-if="activeCiType" v-model="currentMode" class="selector-tabs">
        <el-tab-pane
          v-if="selectModeDefs.host"
          name="host"
          :label="selectModeDefs.host.title"
        >
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

        <el-tab-pane
          v-if="selectModeDefs.tag"
          name="tag"
          :label="selectModeDefs.tag.title"
        >
          <template #label>
            <i :class="`fa fa-fw ${selectModeDefs.tag.icon}`" />
            {{ selectModeDefs.tag.title }}
          </template>
          <TagSelector
            :ci-type="activeCiType"
            v-model="selectedHostsByCiType"
            :options="options"
          />
        </el-tab-pane>

        <el-tab-pane
          v-if="selectModeDefs.input"
          name="input"
          :label="selectModeDefs.input.title"
        >
          <template #label>
            <i :class="`fa fa-fw ${selectModeDefs.input.icon}`" />
            {{ selectModeDefs.input.title }}
          </template>
          <InputFilter
            :ci-type="activeCiType"
            v-model="selectedHostsByCiType"
          />
        </el-tab-pane>

        <el-tab-pane
          v-if="selectModeDefs.recently"
          name="recently"
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
import { ElMessage } from 'element-plus'
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
  set: (val) => emit('update:modelValue', val)
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
const showHosts = ref(false)

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

watch(visible, (val) => {
  if (val) {
    allSelectedHosts.value = [...(props.initialSelection || [])]
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
  (newVal) => {
    mergeCurrentCiTypeSelection(newVal)
  },
  { deep: true }
)

function initCiTypes() {
  let types = props.ciTypes
  if (typeof types === 'string') {
    types = types.split(',')
  }

  const useAllTypes = types.includes('[all]')
  const useAutoTypes = !useAllTypes && types.includes('[auto]')

  // 根据不同模式获取CI类型列表
  const apiCall = useAutoTypes
    ? jaoApi.getAcmCiTypesAuto()
    : jaoApi.getAcmCiTypes()

  apiCall.then((response) => {
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

    // 设置默认激活的CI类型
    if (props.initialSelection.length > 0) {
      // 如果有初始选中，使用第一个主机的assetType
      const firstHost = props.initialSelection[0]
      const assetType = typeof firstHost === 'object' ? firstHost.assetType : null
      if (assetType && ciTypeDefs.value.some(t => t.code === assetType)) {
        activeCiType.value = assetType
      } else {
        activeCiType.value = ciTypeDefs.value[0]?.code || 'linux'
      }
    } else {
      activeCiType.value = ciTypeDefs.value[0]?.code || 'linux'
    }
  }).catch((error) => {
    console.error('获取CI类型失败:', error)
    // 降级处理：使用传入的ciTypes
    ciTypeDefs.value = types.map(code => ({
      code: code.replace(/^\[|\]$/g, ''),
      title: code,
      icon: 'fa-server'
    }))
    activeCiType.value = ciTypeDefs.value[0]?.code || 'linux'
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

  const otherSelections = allSelectedHosts.value.filter(host => getHostCiType(host) !== activeCiType.value)
  const normalizedCurrentSelection = (currentSelection || []).map(host => normalizeHostForCiType(host))

  allSelectedHosts.value = [...otherSelections, ...normalizedCurrentSelection]
}

function toggleShowHosts() {
  showHosts.value = !showHosts.value
}

function removeHost(host, index) {
  mergeCurrentCiTypeSelection(
    selectedHostsByCiType.value.filter((_, currentIndex) => currentIndex !== index)
  )
  selectedHostsByCiType.value.splice(index, 1)
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
.acm-device-selector-dialog .selector-container {
  min-height: 600px;
  max-height: 700px;
}

.acm-device-selector-dialog .ci-type-selector {
  display: flex;
  align-items: center;
}

.acm-device-selector-dialog .selected-hosts-card .card-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.acm-device-selector-dialog .selector-tabs :deep(.el-tabs__content) {
  min-height: 350px;
  max-height: 450px;
}

.acm-device-selector-dialog .selector-tabs :deep(.el-tabs__header) {
  margin: 0 0 15px;
}

.acm-device-selector-dialog .selector-tabs :deep(.el-tabs__nav) {
  display: flex;
}

.acm-device-selector-dialog .selector-tabs :deep(.el-tabs__item) {
  padding: 0 16px;
  height: 40px;
  line-height: 40px;
}
</style>
