<template>
  <div class="view-column-config">
    <div class="column-label">表格显示的列</div>
    <div class="column-tags-wrapper">
      <div class="column-tags">
        <el-tag
          v-for="(col, index) in modelValue"
          :key="col"
          closable
          type=""
          effect="plain"
          draggable="true"
          class="draggable-tag"
          :class="{ 'is-dragging': dragIndex === index, 'is-over': dragOverIndex === index }"
          @close="removeColumn(index)"
          @dragstart="handleDragStart($event, index)"
          @dragend="handleDragEnd"
          @dragover.prevent="handleDragOver($event, index)"
          @dragleave="handleDragLeave"
          @drop="handleDrop($event, index)"
        >
          {{ getAttrTitle(col) }} [{{ col }}]
        </el-tag>
        <span v-if="modelValue.length === 0" class="empty-tip">暂无列配置</span>
      </div>
      <div class="add-column-wrapper">
        <el-popover
          placement="bottom-start"
          :width="300"
          trigger="click"
          v-model:visible="popoverVisible"
        >
          <template #reference>
            <el-button type="primary" link>
              <i class="fa fa-plus" style="margin-right: 4px"></i>
              添加列
            </el-button>
          </template>
          <div class="attr-select-list">
            <div class="attr-search">
              <el-input
                v-model="searchKeyword"
                placeholder="搜索属性"
                size="small"
                clearable
              >
                <template #prefix>
                  <i class="fa fa-search"></i>
                </template>
              </el-input>
            </div>
            <div class="attr-options">
              <div
                v-for="attr in filteredAttrs"
                :key="attr.code"
                class="attr-option"
                :class="{ disabled: modelValue.includes(attr.code) }"
                @click="addColumn(attr.code)"
              >
                <span class="attr-title">{{ attr.title }}</span>
                <span class="attr-code">[{{ attr.code }}]</span>
                <i v-if="modelValue.includes(attr.code)" class="fa fa-check text-success"></i>
              </div>
              <div v-if="filteredAttrs.length === 0" class="no-attr">
                暂无可添加的属性
              </div>
            </div>
          </div>
        </el-popover>
      </div>
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

const popoverVisible = ref(false)
const searchKeyword = ref('')

// 拖拽状态
const dragIndex = ref(-1)
const dragOverIndex = ref(-1)

// 过滤后的属性列表
const filteredAttrs = computed(() => {
  let list = props.attrs
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    list = list.filter(attr =>
      attr.title?.toLowerCase().includes(kw) ||
      attr.code?.toLowerCase().includes(kw)
    )
  }
  return list
})

// 获取属性标题
const getAttrTitle = (code) => {
  const attr = props.attrs.find(a => a.code === code)
  return attr?.title || code
}

// 添加列
const addColumn = (code) => {
  if (!props.modelValue.includes(code)) {
    emit('update:modelValue', [...props.modelValue, code])
  }
}

// 移除列
const removeColumn = (index) => {
  const newValue = [...props.modelValue]
  newValue.splice(index, 1)
  emit('update:modelValue', newValue)
}

// 拖拽开始
const handleDragStart = (event, index) => {
  dragIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', index.toString())
}

// 拖拽结束
const handleDragEnd = () => {
  dragIndex.value = -1
  dragOverIndex.value = -1
}

// 拖拽经过
const handleDragOver = (event, index) => {
  if (dragIndex.value !== -1 && dragIndex.value !== index) {
    dragOverIndex.value = index
  }
}

// 拖拽离开
const handleDragLeave = () => {
  dragOverIndex.value = -1
}

// 放置
const handleDrop = (event, targetIndex) => {
  event.preventDefault()
  const sourceIndex = dragIndex.value

  if (sourceIndex !== -1 && sourceIndex !== targetIndex) {
    const newValue = [...props.modelValue]
    const [removed] = newValue.splice(sourceIndex, 1)
    newValue.splice(targetIndex, 0, removed)
    emit('update:modelValue', newValue)
  }

  dragIndex.value = -1
  dragOverIndex.value = -1
}
</script>

<style scoped lang="scss">
.view-column-config {
  .column-label {
    font-size: 13px;
    color: #606266;
    margin-bottom: 8px;
  }

  .column-tags-wrapper {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .column-tags {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    min-height: 32px;
    align-items: center;

    .el-tag {
      font-size: 13px;
    }

    .draggable-tag {
      cursor: move;
      transition: all 0.2s;

      &:hover {
        border-color: #409eff;
      }

      &.is-dragging {
        opacity: 0.5;
        border-style: dashed;
      }

      &.is-over {
        border-color: #409eff;
        box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
      }
    }

    .empty-tip {
      color: #909399;
      font-size: 13px;
    }
  }

  .add-column-wrapper {
    flex-shrink: 0;
  }
}

.attr-select-list {
  .attr-search {
    margin-bottom: 8px;
  }

  .attr-options {
    max-height: 250px;
    overflow-y: auto;
  }

  .attr-option {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    cursor: pointer;
    border-radius: 4px;
    transition: background 0.2s;

    &:hover {
      background: var(--el-bg-color-page);
    }

    &.disabled {
      color: #c0c4cc;
      cursor: not-allowed;

      &:hover {
        background: transparent;
      }
    }

    .attr-title {
      flex: 1;
    }

    .attr-code {
      color: #909399;
      font-size: 12px;
      margin-left: 8px;
    }

    .fa-check {
      margin-left: 8px;
    }
  }

  .no-attr {
    padding: 20px;
    text-align: center;
    color: #909399;
  }
}
</style>
