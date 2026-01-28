<template>
  <div class="acm-device-selector">
    <!-- 有设备时的显示 -->
    <div v-if="displayDevices.length" class="device-list-container">
      <div class="device-header">
        <div
          class="device-summary btn btn-sm btn-default op-hover-trigger"
          :class="{ 'pe-none': disabled }"
          @click="handleOpenSelector"
        >
          <span
            v-if="!disabled"
            class="op-hover-to-show clear-btn"
            title="清空全部"
            @click.stop="handleClearAll"
          >
            <i class="fa fa-times" />
          </span>
          <span>共 <strong>{{ devices.length }}</strong> 项</span>
        </div>
        <!-- <el-input
          v-model="filterText"
          class="device-filter autohide"
          placeholder="搜索..."
          clearable
          size="small"
        >
          <template #prefix>
            <i class="fa fa-search" />
          </template>
        </el-input> -->
      </div>

      <ul class="device-chip-list" v-if="showTagList">
        <li
          v-for="(device, index) in filteredDevices"
          :key="index"
          class="device-chip-item"
        >
          <el-tag
            type="primary"
            :closable="!disabled"
            @close="handleRemove(device.originalIndex)"
            size="default"
          >
            {{ device.display }}
            <span v-if="device.runType" class="run-type"> [{{ device.runType }}]</span>
            <span v-if="device.totalHosts" class="total-hosts">({{ device.totalHosts }})</span>
          </el-tag>
        </li>
      </ul>
    </div>

    <!-- 无设备时的空状态 -->
    <div v-else class="empty-state">
      <el-button size="small" :disabled="disabled" @click="handleOpenSelector">
        <i class="fal fa-server me-1" />{{ options.label || '选择设备' }}
      </el-button>
    </div>

    <!-- 设备选择器对话框 -->
    <AcmDeviceSelectorDialog
      v-model="dialogVisible"
      :ci-types="ciTypes"
      :options="selectorOptions"
      :initial-selection="devices"
      @confirm="handleConfirm"
    />
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import AcmDeviceSelectorDialog from './AcmDeviceSelectorDialog.vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  ciTypes: { type: [String, Array], default: '[auto]' },
  mcheckType: { type: String, default: 'map' },
  disabled: { type: Boolean, default: false },
  options: { type: Object, default: () => ({}) },
  showTagList: { type: Boolean, default: true }
})

const emit = defineEmits(['update:modelValue', 'change', 'blur'])

const dialogVisible = ref(false)
const filterText = ref('')

// 触发表单验证
function triggerValidation(val) {
  emit('update:modelValue', val)
  // 使用 nextTick 确保值已更新后再触发事件
  nextTick(() => {
    emit('change', val)
    emit('blur', val)
  })
}

const devices = computed({
  get: () => props.modelValue,
  set: (val) => triggerValidation(val)
})

// 用于显示的设备列表（提取显示文本）
const displayDevices = computed(() => {
  return devices.value.map((device, index) => {
    if (typeof device === 'object' && device !== null) {
      return {
        display: device.value || device.key || `设备${index + 1}`,
        runType: device.runType || '',
        totalHosts: device.total_hosts || device.totalHosts || 0,
        original: device,
        originalIndex: index
      }
    }
    return {
      display: String(device),
      runType: '',
      totalHosts: 0,
      original: device,
      originalIndex: index
    }
  })
})

// 过滤后的设备列表
const filteredDevices = computed(() => {
  if (!filterText.value) return displayDevices.value
  const keyword = filterText.value.toLowerCase()
  return displayDevices.value.filter(d => d.display.toLowerCase().includes(keyword))
})

const selectorOptions = computed(() => ({
  selectMode: 'host,group,tag,input,recently',
  selector: 'multiple',
  ...props.options
}))

function handleOpenSelector() {
  if (props.disabled) return
  dialogVisible.value = true
}

function handleRemove(index) {
  if (props.disabled) return
  const newList = [...devices.value]
  newList.splice(index, 1)
  devices.value = newList
}

function handleClearAll() {
  if (props.disabled) return
  devices.value = []
}

function handleConfirm(selectedHosts) {
  // 保留完整的对象格式（包含 assetType）
  devices.value = selectedHosts
}
</script>

<style scoped>
.acm-device-selector {
  width: 100%;
}

.device-list-container {
  display: block;
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
  font-size: 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.15s;
}

.device-summary:hover {
  border-color: #409eff;
}

.device-summary.pe-none {
  cursor: default;
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

.device-filter {
  width: 160px;
  margin-left: auto;
}

.device-filter.autohide {
  transition: width 0.2s, opacity 0.2s;
}

.device-chip-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 10rem;
  overflow-y: auto;
}

.device-chip-item {
  display: inline-block;
}

.run-type {
  color: #64748b;
  font-size: 12px;
}

.total-hosts {
  color: #10d070;
  font-size: 12px;
}

.empty-state {
  display: block;
}

.me-1 {
  margin-right: 4px;
}
</style>
