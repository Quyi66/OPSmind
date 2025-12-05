<template>
  <el-dialog
    v-model="visible"
    title="属性配置"
    width="600px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <el-form
      ref="formRef"
      :model="formData"
      label-width="100px"
    >
      <el-form-item label="属性名称">
        <el-input v-model="formData.title" placeholder="请输入属性名称" />
      </el-form-item>
      <el-form-item label="属性代码">
        <el-input v-model="formData.code" placeholder="请输入属性代码" />
      </el-form-item>

      <el-divider content-position="left">输入配置</el-divider>

      <el-form-item label="控件类型">
        <el-select v-model="inputControl" placeholder="请选择控件类型" style="width: 100%">
          <el-option label="单行输入框" value="input" />
          <el-option label="多行文本框" value="textarea" />
          <el-option label="数字输入框" value="number" />
          <el-option label="下拉选择" value="select" />
          <el-option label="日期选择" value="date" />
          <el-option label="日期时间" value="datetime" />
          <el-option label="开关" value="switch" />
          <el-option label="隐藏" value="hidden" />
        </el-select>
      </el-form-item>

      <el-form-item label="数据类型">
        <el-select v-model="inputDatatype" placeholder="请选择数据类型" style="width: 100%">
          <el-option label="字符串" value="string" />
          <el-option label="数字" value="number" />
          <el-option label="布尔" value="boolean" />
        </el-select>
      </el-form-item>

      <el-divider content-position="left">显示配置</el-divider>

      <el-form-item label="值转换器">
        <el-input
          v-model="displayConverter"
          type="textarea"
          :rows="4"
          placeholder="可选，输入 JavaScript 函数进行值转换显示"
        />
        <div class="form-tip">
          示例：js:function f() { return '转换后的值'; }
        </div>
      </el-form-item>

      <el-divider content-position="left">其他配置</el-divider>

      <el-form-item label="唯一值">
        <el-switch v-model="formData.unique" />
      </el-form-item>
      <el-form-item label="必填">
        <el-switch v-model="formData.required" />
      </el-form-item>
      <el-form-item label="可编辑">
        <el-switch v-model="formData.editable" />
      </el-form-item>
      <el-form-item label="可导入">
        <el-switch v-model="formData.importable" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleSave">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  attrData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const formRef = ref()
const formData = ref({
  id: '',
  code: '',
  title: '',
  type: null,
  unique: false,
  required: false,
  editable: true,
  importable: true,
  display: {},
  input: {}
})

// 输入配置
const inputControl = ref('input')
const inputDatatype = ref('string')
const displayConverter = ref('')

// 监听弹窗打开
watch(() => props.modelValue, (val) => {
  if (val && props.attrData) {
    formData.value = { ...props.attrData }
    // 解析 input 配置
    inputControl.value = props.attrData.input?.control || 'input'
    inputDatatype.value = props.attrData.input?.datatype || 'string'
    // 解析 display 配置
    displayConverter.value = props.attrData.display?.converter || ''
  }
})

// 保存
const handleSave = () => {
  // 构建保存数据
  const saveData = {
    ...formData.value,
    input: {
      control: inputControl.value,
      datatype: inputDatatype.value
    },
    display: displayConverter.value ? { converter: displayConverter.value } : {}
  }

  emit('saved', saveData)
  visible.value = false
}

// 弹窗关闭时重置
const handleClosed = () => {
  formData.value = {
    id: '',
    code: '',
    title: '',
    type: null,
    unique: false,
    required: false,
    editable: true,
    importable: true,
    display: {},
    input: {}
  }
  inputControl.value = 'input'
  inputDatatype.value = 'string'
  displayConverter.value = ''
}
</script>

<style scoped lang="scss">
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>
