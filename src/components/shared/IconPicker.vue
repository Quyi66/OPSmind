<template>
  <div class="icon-picker">
    <div class="icon-preview" @click="togglePicker">
      <i :class="getIconClass(modelValue)" />
    </div>
    <el-popover
      v-model:visible="showPicker"
      placement="bottom-start"
      :width="420"
      trigger="click"
    >
      <template #reference>
        <el-button size="small" class="ml-2">选择图标</el-button>
      </template>
      <div class="icon-picker-content">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索图标"
          prefix-icon="Search"
          size="small"
          class="mb-2"
          clearable
        />
        <div class="icon-grid">
          <div
            v-for="icon in filteredIcons"
            :key="icon"
            class="icon-item"
            :class="{ active: modelValue === icon }"
            :title="icon"
            @click="selectIcon(icon)"
          >
            <i :class="'fa ' + icon" />
          </div>
        </div>
      </div>
    </el-popover>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const showPicker = ref(false)
const searchKeyword = ref('')

// 常用图标列表 - FontAwesome 5 图标
const commonIcons = [
  // 设备类
  'fa-tv', 'fa-server', 'fa-laptop', 'fa-desktop', 'fa-mobile-alt', 'fa-tablet-alt',
  'fa-hdd', 'fa-database', 'fa-microchip', 'fa-memory', 'fa-sd-card',
  // 网络类
  'fa-network-wired', 'fa-ethernet', 'fa-wifi', 'fa-globe', 'fa-cloud', 'fa-cloud-upload-alt',
  'fa-satellite', 'fa-router', 'fa-signal',
  // 存储类
  'fa-archive', 'fa-box', 'fa-boxes', 'fa-cube', 'fa-cubes', 'fa-folder',
  'fa-folder-open', 'fa-file', 'fa-file-alt', 'fa-file-code',
  // 操作类
  'fa-cog', 'fa-cogs', 'fa-tools', 'fa-wrench', 'fa-hammer', 'fa-screwdriver',
  'fa-sliders-h', 'fa-toggle-on', 'fa-toggle-off',
  // 状态类
  'fa-check', 'fa-check-circle', 'fa-times', 'fa-times-circle', 'fa-exclamation',
  'fa-exclamation-circle', 'fa-exclamation-triangle', 'fa-question-circle', 'fa-info-circle',
  // 图表类
  'fa-chart-line', 'fa-chart-bar', 'fa-chart-pie', 'fa-chart-area', 'fa-tachometer-alt',
  // 安全类
  'fa-shield-alt', 'fa-lock', 'fa-unlock', 'fa-key', 'fa-user-shield',
  // 用户类
  'fa-user', 'fa-users', 'fa-user-circle', 'fa-user-cog', 'fa-user-tie',
  'fa-address-book', 'fa-address-card', 'fa-id-card',
  // 通用类
  'fa-home', 'fa-building', 'fa-sitemap', 'fa-project-diagram', 'fa-th',
  'fa-th-large', 'fa-th-list', 'fa-list', 'fa-list-alt', 'fa-tasks',
  'fa-clipboard', 'fa-clipboard-list', 'fa-clipboard-check',
  // 品牌类
  'fa-linux', 'fa-windows', 'fa-apple', 'fa-android', 'fa-docker',
  'fa-aws', 'fa-google', 'fa-microsoft',
  // 箭头类
  'fa-arrow-up', 'fa-arrow-down', 'fa-arrow-left', 'fa-arrow-right',
  'fa-arrows-alt', 'fa-sync', 'fa-redo', 'fa-undo',
  // 其他
  'fa-bell', 'fa-bookmark', 'fa-calendar', 'fa-clock', 'fa-download',
  'fa-upload', 'fa-link', 'fa-paperclip', 'fa-print', 'fa-search',
  'fa-star', 'fa-heart', 'fa-flag', 'fa-tag', 'fa-tags'
]

// 过滤后的图标
const filteredIcons = computed(() => {
  if (!searchKeyword.value) return commonIcons
  const kw = searchKeyword.value.toLowerCase()
  return commonIcons.filter(icon =>
    icon.toLowerCase().includes(kw)
  )
})

// 获取图标类名
const getIconClass = (icon) => {
  if (!icon) return 'fa fa-cube'
  if (icon.startsWith('fa ') || icon.startsWith('fas ') || icon.startsWith('far ') || icon.startsWith('fab ') || icon.startsWith('fad ')) {
    return icon
  }
  return `fa ${icon}`
}

// 切换选择器
const togglePicker = () => {
  showPicker.value = !showPicker.value
}

// 选择图标
const selectIcon = (icon) => {
  emit('update:modelValue', icon)
  showPicker.value = false
}
</script>

<style scoped lang="scss">
.icon-picker {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-preview {
  width: 40px;
  height: 40px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #409eff;
    background: #f5f7fa;
  }

  i {
    font-size: 20px;
    color: #409eff;
  }
}

.icon-picker-content {
  .icon-grid {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 4px;
    max-height: 300px;
    overflow-y: auto;
    padding: 4px;
  }

  .icon-item {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: #f5f7fa;
      border-color: #dcdfe6;
    }

    &.active {
      background: #ecf5ff;
      border-color: #409eff;
      color: #409eff;
    }

    i {
      font-size: 18px;
    }
  }
}

.ml-2 {
  margin-left: 8px;
}

.mb-2 {
  margin-bottom: 8px;
}
</style>
