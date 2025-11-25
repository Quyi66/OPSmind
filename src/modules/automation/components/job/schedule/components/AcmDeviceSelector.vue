<template>
  <div class="acm-device-selector">
    <div v-if="displayDevices.length" class="device-list">
      <div class="device-chips">
        <span v-for="(device, index) in displayDevices" :key="index" class="device-chip">
          {{ device.display }}
          <i class="fa fa-times" @click="handleRemove(index)" />
        </span>
      </div>
      <el-button type="primary" plain size="small" @click="handleOpenSelector">
        <i class="fa fa-plus me-1" />添加设备
      </el-button>
    </div>
    <div v-else class="empty-state">
      <i class="fa fa-server empty-icon" />
      <p>暂无设备</p>
      <el-button type="primary" plain size="small" @click="handleOpenSelector">
        <i class="fa fa-server me-1" />选择设备
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
import { ref, computed } from 'vue'
import AcmDeviceSelectorDialog from './AcmDeviceSelectorDialog.vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  ciTypes: { type: [String, Array], default: 'linux' },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const dialogVisible = ref(false)

const devices = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 用于显示的设备列表（提取显示文本）
const displayDevices = computed(() => {
  return devices.value.map((device, index) => {
    if (typeof device === 'object' && device !== null) {
      return {
        display: device.value || device.key || `设备${index + 1}`,
        original: device
      }
    }
    return {
      display: String(device),
      original: device
    }
  })
})

const selectorOptions = {
  selectMode: 'host,group,tag,input,recently',
  selector: 'multiple'
}

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

function handleConfirm(selectedHosts) {
  // 保留完整的对象格式（包含 assetType）
  devices.value = selectedHosts
}
</script>

<style scoped>
.acm-device-selector {
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  padding: 12px;
  background: #f8fafc;
}

.device-list {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.device-chips {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.device-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #e0f2fe;
  border-radius: 999px;
  font-size: 13px;
  color: #0369a1;
}

.device-chip i {
  cursor: pointer;
  font-size: 12px;
}

.device-chip i:hover {
  color: #dc2626;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  color: #94a3b8;
}

.empty-icon {
  font-size: 40px;
  margin-bottom: 12px;
  color: #cbd5e1;
}

.empty-state p {
  margin: 0 0 12px;
}

.helper-text {
  margin: 8px 0 0;
  font-size: 12px;
  color: #94a3b8;
}

.me-1 {
  margin-right: 4px;
}
</style>
