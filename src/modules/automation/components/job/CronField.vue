<template>
  <div class="cron-field">
    <el-radio-group v-model="selectedType" @change="handleTypeChange">
      <!-- 每秒/每分/每时... -->
      <div class="field-option">
        <el-radio label="every">
          {{ getEveryLabel() }}
        </el-radio>
      </div>

      <!-- 周期 -->
      <div class="field-option">
        <el-radio label="range">
          周期 从
          <el-input-number
            v-model="rangeStart"
            :min="minValue"
            :max="maxValue"
            size="small"
            :disabled="selectedType !== 'range'"
            @change="handleRangeChange"
            :controls="false"
          />
          到
          <el-input-number
            v-model="rangeEnd"
            :min="minValue"
            :max="maxValue"
            size="small"
            :disabled="selectedType !== 'range'"
            @change="handleRangeChange"
            :controls="false"
          />
        </el-radio>
      </div>

      <!-- 循环 -->
      <div class="field-option">
        <el-radio label="interval">
          从
          <el-input-number
            v-model="intervalStart"
            :min="minValue"
            :max="maxValue"
            size="small"
            :disabled="selectedType !== 'interval'"
            @change="handleIntervalChange"
            :controls="false"
          />
          开始，每
          <el-input-number
            v-model="intervalStep"
            :min="1"
            :max="maxValue"
            size="small"
            :disabled="selectedType !== 'interval'"
            @change="handleIntervalChange"
            :controls="false"
          />
          {{ getFieldUnit() }}执行一次
        </el-radio>
      </div>

      <!-- 指定（不适用于日和周的冲突） -->
      <div v-if="!isSpecialField" class="field-option">
        <el-radio label="specific">指定</el-radio>
      </div>
      <div v-if="!isSpecialField && selectedType === 'specific'" class="checkbox-group">
        <el-checkbox-group v-model="specificValues" @change="handleSpecificChange">
          <el-checkbox v-for="val in getValueRange()" :key="val" :label="val" :value="val">
            {{ formatValue(val) }}
          </el-checkbox>
        </el-checkbox-group>
      </div>

      <!-- 不指定（仅用于日和周） -->
      <div v-if="isSpecialField" class="field-option">
        <el-radio label="unspecified">不指定</el-radio>
      </div>

      <!-- 年份可选项 -->
      <div v-if="fieldType === 'year' && optional" class="field-option">
        <el-radio label="empty">不限制年份</el-radio>
      </div>
    </el-radio-group>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: String,
  fieldType: {
    type: String,
    required: true
  },
  maxValue: {
    type: Number,
    default: 59
  },
  minValue: {
    type: Number,
    default: 0
  },
  optional: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const selectedType = ref('every')
const rangeStart = ref(props.minValue)
const rangeEnd = ref(props.maxValue)
const intervalStart = ref(props.minValue)
const intervalStep = ref(1)
const specificValues = ref([])

// 日和周字段需要特殊处理（不能同时指定）
const isSpecialField = computed(() => {
  return props.fieldType === 'day' || props.fieldType === 'week'
})

// 监听初始值变化
watch(
  () => props.modelValue,
  newVal => {
    parseValue(newVal)
  },
  { immediate: true }
)

// 解析 CRON 值
function parseValue(value) {
  if (!value || value === '*') {
    selectedType.value = 'every'
  } else if (value === '?') {
    selectedType.value = 'unspecified'
  } else if (value === '') {
    selectedType.value = 'empty'
  } else if (value.includes('-')) {
    selectedType.value = 'range'
    const parts = value.split('-')
    rangeStart.value = parseInt(parts[0])
    rangeEnd.value = parseInt(parts[1])
  } else if (value.includes('/')) {
    selectedType.value = 'interval'
    const parts = value.split('/')
    intervalStart.value = parseInt(parts[0])
    intervalStep.value = parseInt(parts[1])
  } else if (value.includes(',')) {
    selectedType.value = 'specific'
    specificValues.value = value.split(',').map(v => parseInt(v))
  } else if (!isNaN(parseInt(value))) {
    selectedType.value = 'specific'
    specificValues.value = [parseInt(value)]
  }
}

// 获取字段标签
function getEveryLabel() {
  const labels = {
    second: '每秒',
    minute: '每分钟',
    hour: '每小时',
    day: '每日',
    month: '每月',
    week: '每周',
    year: '每年'
  }
  return labels[props.fieldType] || '每'
}

// 获取字段单位
function getFieldUnit() {
  const units = {
    second: '秒',
    minute: '分钟',
    hour: '小时',
    day: '天',
    month: '月',
    week: '周',
    year: '年'
  }
  return units[props.fieldType] || ''
}

// 获取值范围
function getValueRange() {
  const range = []
  for (let i = props.minValue; i <= props.maxValue; i++) {
    range.push(i)
  }
  return range
}

// 格式化值显示
function formatValue(val) {
  if (props.fieldType === 'week') {
    const weekDays = ['', '周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return weekDays[val] || val
  }
  if (props.fieldType === 'month') {
    return `${val}月`
  }
  return val
}

// 生成 CRON 值
function generateValue() {
  switch (selectedType.value) {
    case 'every':
      return '*'
    case 'unspecified':
      return '?'
    case 'empty':
      return ''
    case 'range':
      return `${rangeStart.value}-${rangeEnd.value}`
    case 'interval':
      return `${intervalStart.value}/${intervalStep.value}`
    case 'specific':
      return specificValues.value.length > 0 
        ? specificValues.value.sort((a, b) => a - b).join(',') 
        : '*'
    default:
      return '*'
  }
}

// 更新值
function updateValue() {
  const value = generateValue()
  emit('update:modelValue', value)
}

// 处理类型变化
function handleTypeChange() {
  // 日和周字段的特殊处理
  if (isSpecialField.value) {
    if (props.fieldType === 'day' && selectedType.value !== 'unspecified') {
      // 选择了日，周应该设为 ?
      // 这个逻辑需要在父组件中处理
    } else if (props.fieldType === 'week' && selectedType.value !== 'unspecified') {
      // 选择了周，日应该设为 ?
    }
  }

  updateValue()
}

function handleRangeChange() {
  if (selectedType.value === 'range') {
    updateValue()
  }
}

function handleIntervalChange() {
  if (selectedType.value === 'interval') {
    updateValue()
  }
}

function handleSpecificChange() {
  if (selectedType.value === 'specific') {
    updateValue()
  }
}
</script>

<style scoped lang="scss">
.cron-field {
  .field-option {
    margin-bottom: 15px;
    padding: 10px;
    border-radius: 4px;
    transition: background-color 0.3s;

    &:hover {
      background-color: var(--el-bg-color-page);
    }

    :deep(.el-radio) {
      display: flex;
      align-items: center;
      width: 100%;
    }

    :deep(.el-input-number) {
      margin: 0 8px;
      width: 100px;
    }
  }

  .checkbox-group {
    margin-top: 0;
    margin-bottom: 15px;
    margin-left: 24px;
    padding: 15px;
    background-color: var(--el-bg-color-page);
    border-radius: 4px;
    max-height: 400px;
    overflow-y: auto;

    :deep(.el-checkbox-group) {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 8px;
    }

    :deep(.el-checkbox) {
      margin: 0;
      margin-right: 0 !important;
      flex: 0 0 auto;
      min-width: 60px;
      white-space: nowrap;

      .el-checkbox__label {
        padding-left: 5px;
        font-size: 13px;
      }

      .el-checkbox__input {
        vertical-align: middle;
      }
    }
  }
}
</style>
