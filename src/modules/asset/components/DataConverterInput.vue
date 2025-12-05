<template>
  <div class="data-converter-input">
    <div class="input-group">
      <span class="input-prefix" :title="kindLabel">
        <i :class="kindIcon"></i>
      </span>
      <el-input
        :model-value="displayValue"
        readonly
        class="converter-input"
        placeholder=""
      />
      <el-button
        :icon="Edit"
        :disabled="disabled"
        @click="showEditor"
      />
      <el-button
        :icon="Delete"
        :disabled="disabled"
        @click="handleRemove"
      />
    </div>

    <!-- 数据编辑器弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      title="数据编辑器"
      width="700px"
      :close-on-click-modal="false"
      class="data-editor-dialog"
    >
      <div class="editor-content">
        <!-- 类型切换按钮 -->
        <div class="type-tabs">
          <el-button
            v-if="enabledKinds.includes('js')"
            :type="editKind === 'js' ? 'default' : 'default'"
            :class="{ active: editKind === 'js' }"
            @click="editKind = 'js'"
          >
            函数
          </el-button>
          <el-button
            v-if="enabledKinds.includes('str')"
            :type="editKind === 'str' ? 'default' : 'default'"
            :class="{ active: editKind === 'str' }"
            @click="editKind = 'str'"
          >
            <i class="fa fa-font"></i> 字符串
          </el-button>
          <el-button
            v-if="enabledKinds.includes('yaml')"
            :type="editKind === 'yaml' ? 'default' : 'default'"
            :class="{ active: editKind === 'yaml' }"
            @click="editKind = 'yaml'"
          >
            YAML
          </el-button>
          <el-button
            v-if="enabledKinds.includes('json')"
            :type="editKind === 'json' ? 'default' : 'default'"
            :class="{ active: editKind === 'json' }"
            @click="editKind = 'json'"
          >
            JSON
          </el-button>
        </div>

        <!-- 类型说明 -->
        <p class="type-desc">
          <template v-if="editKind === 'js'">
            支持一条JavaScript语句对数据进行转换，内置函数以<code>$$.</code>开头。
          </template>
          <template v-else-if="editKind === 'str'">
            返回一条字符串。
          </template>
          <template v-else-if="editKind === 'yaml'">
            返回YAML格式数据。
          </template>
          <template v-else-if="editKind === 'json'">
            返回JSON格式数据。
          </template>
        </p>

        <!-- 变量支持说明 -->
        <details class="var-support">
          <summary>
            <i class="fa fa-code"></i> 变量支持
          </summary>
          <div class="var-content">
            <p>支持<code>${}</code>形式的变量：</p>
            <ul>
              <li>
                <code class="var-tag page-var">${@.页面控件或参数名称}</code>：引用页面控件的值。
              </li>
              <li>
                <code class="var-tag global-var">${#.全局参数名}</code>：引用全局参数值，支持的全局参数有
                <ul class="global-vars">
                  <li><code>${#.user.loginId}</code>: 当前用户ID</li>
                  <li><code>${#.user.displayName}</code>: 当前用户名</li>
                  <li><code>${#.user.department}</code>: 用户所在单位</li>
                  <li><code>${#.user.authToken}</code>: 用户Token</li>
                  <li><code>${#.tenantId}</code>: 租户ID</li>
                </ul>
              </li>
            </ul>
          </div>
        </details>

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
          >
            <el-option
              v-for="func in builtinFunctions"
              :key="func.name"
              :label="func.name"
              :value="func.name"
            />
          </el-select>
          <el-button @click="insertFunction">
            <i class="fa fa-plus"></i>
          </el-button>
        </div>
      </div>

      <template #footer>
        <el-button type="primary" @click="handleSave">
          <i class="fa fa-check"></i> 确认
        </el-button>
        <el-button @click="dialogVisible = false">
          <i class="fa fa-undo"></i> 取消
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
  }
})

const emit = defineEmits(['update:modelValue'])

const dialogVisible = ref(false)
const editKind = ref('str')
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
  yaml: { label: 'YAML', icon: 'fa fa-list' },
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
    background: #f5f7fa;
    border: 1px solid #dcdfe6;
    border-right: none;
    border-radius: 4px 0 0 4px;
    color: #909399;
    flex-shrink: 0;

    i {
      font-size: 12px;
    }
  }

  .converter-input {
    flex: 1;

    :deep(.el-input__wrapper) {
      border-radius: 0;
      box-shadow: 0 0 0 1px #dcdfe6 inset;
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
    margin-bottom: 12px;

    .el-button {
      &.active {
        background-color: #409eff;
        border-color: #409eff;
        color: #fff;
      }
    }
  }

  .type-desc {
    font-size: 13px;
    color: #909399;
    margin: 0 0 12px;

    code {
      background: #f5f7fa;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: Monaco, Menlo, monospace;
      font-size: 12px;
      color: #e6a23c;
    }
  }

  .var-support {
    margin-bottom: 12px;
    border: 1px solid #ebeef5;
    border-radius: 4px;

    summary {
      padding: 8px 12px;
      background: #f5f7fa;
      cursor: pointer;
      font-size: 13px;
      color: #606266;
      user-select: none;

      &::-webkit-details-marker {
        display: none;
      }

      i {
        margin-right: 6px;
      }
    }

    .var-content {
      padding: 12px;
      font-size: 13px;
      color: #606266;

      p {
        margin: 0 0 8px;
      }

      ul {
        margin: 0;
        padding-left: 20px;

        li {
          margin-bottom: 6px;
        }

        &.global-vars {
          margin-top: 4px;
        }
      }

      code {
        background: #f5f7fa;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: Monaco, Menlo, monospace;
        font-size: 12px;
      }

      .var-tag {
        font-weight: 500;

        &.page-var {
          color: #67c23a;
        }

        &.global-var {
          color: #409eff;
        }
      }
    }
  }

  .code-editor {
    display: flex;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    overflow: hidden;
    min-height: 200px;
    margin-bottom: 12px;

    .line-numbers {
      width: 40px;
      background: #f5f7fa;
      border-right: 1px solid #dcdfe6;
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
        color: #909399;
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
      background: #fff;
      min-height: 200px;

      &::placeholder {
        color: #c0c4cc;
      }
    }
  }

  .func-list {
    display: flex;
    align-items: center;
    gap: 8px;

    .func-label {
      font-size: 13px;
      color: #606266;
      white-space: nowrap;
    }
  }
}
</style>
