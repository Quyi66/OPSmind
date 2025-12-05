<template>
  <div class="view-column-config">
    <div class="column-list">
      <div
        v-for="(col, index) in modelValue"
        :key="col"
        class="column-item"
      >
        <div class="column-content">
          <i class="fa fa-grip-vertical drag-handle"></i>
          <span class="column-name">{{ getAttrTitle(col) }}</span>
          <span class="column-code">({{ col }})</span>
        </div>
        <div class="column-actions">
          <el-button link :disabled="index === 0" @click="moveUp(index)">
            <i class="fa fa-arrow-up"></i>
          </el-button>
          <el-button link :disabled="index === modelValue.length - 1" @click="moveDown(index)">
            <i class="fa fa-arrow-down"></i>
          </el-button>
          <el-button link type="danger" @click="removeColumn(index)">
            <i class="fa fa-times"></i>
          </el-button>
        </div>
      </div>

      <div v-if="modelValue.length === 0" class="empty-tip">
        暂无列配置，请添加
      </div>
    </div>

    <div class="add-column">
      <el-select
        v-model="selectedAttr"
        placeholder="选择要添加的属性"
        filterable
        style="width: 200px"
      >
        <el-option
          v-for="attr in availableToAdd"
          :key="attr.code"
          :label="attr.title"
          :value="attr.code"
        >
          <span>{{ attr.title }}</span>
          <span style="color: #909399; margin-left: 8px">({{ attr.code }})</span>
        </el-option>
      </el-select>
      <el-button type="primary" :disabled="!selectedAttr" @click="addColumn">
        <i class="fa fa-plus" style="margin-right: 4px"></i>
        添加
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  attrs: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue'])

const selectedAttr = ref('')

// 可添加的属性（排除已添加的）
const availableToAdd = computed(() => {
  return props.attrs.filter(attr => !props.modelValue.includes(attr.code))
})

// 获取属性标题
const getAttrTitle = (code) => {
  const attr = props.attrs.find(a => a.code === code)
  return attr?.title || code
}

// 添加列
const addColumn = () => {
  if (selectedAttr.value) {
    emit('update:modelValue', [...props.modelValue, selectedAttr.value])
    selectedAttr.value = ''
  }
}

// 移除列
const removeColumn = (index) => {
  const newValue = [...props.modelValue]
  newValue.splice(index, 1)
  emit('update:modelValue', newValue)
}

// 上移
const moveUp = (index) => {
  if (index > 0) {
    const newValue = [...props.modelValue]
    const temp = newValue[index]
    newValue[index] = newValue[index - 1]
    newValue[index - 1] = temp
    emit('update:modelValue', newValue)
  }
}

// 下移
const moveDown = (index) => {
  if (index < props.modelValue.length - 1) {
    const newValue = [...props.modelValue]
    const temp = newValue[index]
    newValue[index] = newValue[index + 1]
    newValue[index + 1] = temp
    emit('update:modelValue', newValue)
  }
}
</script>

<style scoped lang="scss">
.view-column-config {
  .column-list {
    border: 1px solid #ebeef5;
    border-radius: 4px;
    margin-bottom: 12px;
    min-height: 100px;

    .column-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      border-bottom: 1px solid #ebeef5;

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background: #f5f7fa;
      }

      .column-content {
        display: flex;
        align-items: center;
        gap: 8px;

        .drag-handle {
          color: #c0c4cc;
          cursor: move;
        }

        .column-name {
          font-weight: 500;
        }

        .column-code {
          color: #909399;
          font-size: 12px;
        }
      }

      .column-actions {
        display: flex;
        gap: 4px;
      }
    }

    .empty-tip {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100px;
      color: #909399;
    }
  }

  .add-column {
    display: flex;
    gap: 8px;
  }
}
</style>
