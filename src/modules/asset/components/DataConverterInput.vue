<template>
  <div class="data-converter-input">
    <div class="input-group">
      <span class="input-prefix" :title="kindLabel">
        <i :class="kindIcon"></i>
      </span>
      <el-input :model-value="displayValue" readonly class="converter-input" placeholder="" />
      <el-button :icon="Edit" :disabled="disabled" @click="showEditor" />
      <el-button :icon="Delete" :disabled="disabled" @click="handleRemove" />
    </div>

    <!-- 数据编辑器弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      title="数据编辑器"
      width="700px"
      :close-on-click-modal="false"
      class="data-editor-dialog"
      append-to-body
    >
      <div class="editor-content">
        <!-- 类型切换标签页 -->
        <div class="type-tabs">
          <div
            v-if="enabledKinds.includes('js')"
            class="type-tab"
            :class="{ active: editKind === 'js' }"
            @click="editKind = 'js'"
          >
            函数
          </div>
          <div
            v-if="enabledKinds.includes('yaml')"
            class="type-tab"
            :class="{ active: editKind === 'yaml' }"
            @click="editKind = 'yaml'"
          >
            <i class="fa fa-list-alt"></i>
            YAML
          </div>
          <div
            v-if="enabledKinds.includes('json')"
            class="type-tab"
            :class="{ active: editKind === 'json' }"
            @click="editKind = 'json'"
          >
            {} JSON
          </div>
          <div
            v-if="enabledKinds.includes('str')"
            class="type-tab"
            :class="{ active: editKind === 'str' }"
            @click="editKind = 'str'"
          >
            <i class="fa fa-font"></i>
            字符串
          </div>
        </div>

        <!-- 类型说明 -->
        <p class="type-desc">
          <template v-if="editKind === 'js'">
            支持一条JavaScript语句对数据进行转换，内置函数以
            <code>$$.</code>
            开头。
          </template>
          <template v-else-if="editKind === 'str'">返回一条字符串。</template>
          <template v-else-if="editKind === 'yaml'">返回YAML格式数据。</template>
          <template v-else-if="editKind === 'json'">返回JSON格式数据。</template>
        </p>

        <!-- 代码编辑区 -->
        <div class="code-editor">
          <div class="line-numbers">
            <span v-for="n in lineCount" :key="n">{{ n }}</span>
          </div>
          <textarea
            v-model="editBody"
            class="code-textarea"
            :placeholder="getPlaceholder()"
            spellcheck="false"
            @input="updateLineCount"
          ></textarea>
        </div>

        <!-- 函数列表（仅 JS 模式） -->
        <div v-if="editKind === 'js'" class="func-list">
          <span class="func-label">支持的函数</span>
          <el-select
            v-model="selectedFunc"
            placeholder=""
            style="width: 200px"
            filterable
            size="small"
          >
            <el-option
              v-for="func in builtinFunctions"
              :key="func.name"
              :label="func.name"
              :value="func.name"
            />
          </el-select>
          <el-button size="small" @click="insertFunction">
            <i class="fa fa-plus"></i>
          </el-button>
        </div>
      </div>

      <template #footer>
        <el-button type="primary" @click="handleSave">
          <i class="fa fa-check" style="margin-right: 4px"></i>
          确认
        </el-button>
        <el-button @click="dialogVisible = false">
          <i class="fa fa-undo" style="margin-right: 4px"></i>
          取消
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Edit, Delete } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  kinds: {
    type: String,
    default: 'js,str'
  },
  placeholder: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const dialogVisible = ref(false)
const editKind = ref('js') // 默认为函数模式
const editBody = ref('')
const lineCount = ref(1)
const selectedFunc = ref('')

// 内置函数列表
const builtinFunctions = [
  { name: 'runJobWait', desc: '运行作业并等待结果' },
  { name: 'execProcess', desc: '执行进程' },
  { name: 'currentUser', desc: '获取当前用户' },
  { name: 'toDate', desc: '转换为日期' },
  { name: 'translate', desc: '翻译' },
  { name: 'formatDate', desc: '格式化日期' }
]

// 启用的类型
const enabledKinds = computed(() => {
  return props.kinds.split(',').map(k => k.trim())
})

// 类型定义
const kindDefs = {
  str: { label: '字符串', icon: 'fa fa-font' },
  js: { label: 'JavaScript', icon: 'fa fa-code' },
  yaml: { label: 'YAML', icon: 'fa fa-list-alt' },
  json: { label: 'JSON', icon: 'fa fa-brackets-curly' }
}

// 解析当前值
const parsedValue = computed(() => {
  const val = props.modelValue || ''
  if (val.startsWith('js:')) {
    return { kind: 'js', body: val.substring(3) }
  } else if (val.startsWith('yaml:')) {
    return { kind: 'yaml', body: val.substring(5) }
  } else if (val.startsWith('json:')) {
    return { kind: 'json', body: val.substring(5) }
  } else {
    return { kind: 'str', body: val }
  }
})

// 显示值
const displayValue = computed(() => {
  const body = parsedValue.value.body
  if (!body) return ''
  // 截取前50个字符显示
  return body.length > 50 ? body.substring(0, 50) + '...' : body
})

// 当前类型的图标
const kindIcon = computed(() => {
  return kindDefs[parsedValue.value.kind]?.icon || 'fa fa-font'
})

// 当前类型的标签
const kindLabel = computed(() => {
  return kindDefs[parsedValue.value.kind]?.label || '字符串'
})

// 更新行号
const updateLineCount = () => {
  const lines = (editBody.value || '').split('\n').length
  lineCount.value = Math.max(lines, 1)
}

// 显示编辑器
const showEditor = () => {
  // 设置默认类型为启用列表中的第一个
  const currentKind = parsedValue.value.kind
  if (enabledKinds.value.includes(currentKind)) {
    editKind.value = currentKind
  } else {
    editKind.value = enabledKinds.value[0] || 'str'
  }
  editBody.value = parsedValue.value.body
  updateLineCount()
  dialogVisible.value = true
}

// 移除值
const handleRemove = () => {
  emit('update:modelValue', '')
}

// 插入函数
const insertFunction = () => {
  if (selectedFunc.value) {
    const funcCall = `$$.${selectedFunc.value}()`
    editBody.value = (editBody.value || '') + funcCall
    updateLineCount()
  }
}

// 保存编辑
const handleSave = () => {
  let newValue = editBody.value
  if (editKind.value === 'js' && newValue) {
    newValue = 'js:' + newValue
  } else if (editKind.value === 'yaml' && newValue) {
    newValue = 'yaml:' + newValue
  } else if (editKind.value === 'json' && newValue) {
    newValue = 'json:' + newValue
  }
  emit('update:modelValue', newValue)
  dialogVisible.value = false
}

// 获取占位符
const getPlaceholder = () => {
  if (editKind.value === 'js') {
    return 'function f() {\n  var val = ${属性名};\n  return val;\n}'
  } else if (editKind.value === 'yaml') {
    return '- label: 选项1\n  value: 1\n- label: 选项2\n  value: 2'
  } else if (editKind.value === 'json') {
    return '{\n  "key": "value"\n}'
  }
  return '输入字符串值'
}

// 监听编辑内容变化
watch(editBody, updateLineCount)
</script>

<style scoped lang="scss">
.data-converter-input {
  width: 100%;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 0;

  .input-prefix {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: var(--el-bg-color-page);
    border: 1px solid var(--el-border-color-light);
    border-right: none;
    border-radius: 4px 0 0 4px;
    color: var(--el-text-color-secondary);
    flex-shrink: 0;

    i {
      font-size: 12px;
    }
  }

  .converter-input {
    flex: 1;

    :deep(.el-input__wrapper) {
      border-radius: 0;
      box-shadow: 0 0 0 1px var(--el-border-color) inset;
    }
  }

  .el-button {
    border-radius: 0;
    margin-left: -1px;

    &:last-child {
      border-radius: 0 4px 4px 0;
    }
  }
}

/* Dialog内容样式 */
.editor-content {
  .type-tabs {
    display: flex;
    gap: 0;
    margin-bottom: 12px;
    border-bottom: 1px solid var(--el-border-color-light);

    .type-tab {
      padding: 10px 16px;
      font-size: 14px;
      color: var(--el-text-color-regular);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;

      &:hover {
        color: var(--el-color-primary);
      }

      &.active {
        color: var(--el-color-primary);
        border-bottom-color: var(--el-color-primary);
        font-weight: 500;
      }

      i {
        margin-right: 4px;
      }
    }
  }

  .type-desc {
    font-size: 13px;
    color: var(--el-text-color-secondary);
    margin: 0 0 12px;

    code {
      background: var(--el-bg-color-page);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: Monaco, Menlo, monospace;
      font-size: 12px;
      color: #e6a23c;
    }
  }

  .code-editor {
    display: flex;
    border: 1px solid #3d3d3d;
    border-radius: 4px;
    overflow: hidden;
    min-height: 200px;
    margin-bottom: 12px;
    background: #1e1e1e;

    .line-numbers {
      width: 40px;
      background: #252526;
      border-right: 1px solid #3d3d3d;
      padding: 10px 0;
      text-align: right;
      user-select: none;
      flex-shrink: 0;

      span {
        display: block;
        height: 21px;
        line-height: 21px;
        padding-right: 8px;
        font-size: 12px;
        color: #858585;
        font-family: Monaco, Menlo, 'Courier New', monospace;
      }
    }

    .code-textarea {
      flex: 1;
      resize: none;
      border: none;
      outline: none;
      padding: 10px;
      font-size: 13px;
      font-family: Monaco, Menlo, 'Courier New', monospace;
      line-height: 21px;
      background: #1e1e1e;
      color: #d4d4d4;
      min-height: 200px;

      &::placeholder {
        color: #6a6a6a;
      }
    }
  }

  .func-list {
    display: flex;
    align-items: center;
    gap: 8px;

    .func-label {
      font-size: 13px;
      color: var(--el-text-color-regular);
      white-space: nowrap;
    }
  }
}
</style>
