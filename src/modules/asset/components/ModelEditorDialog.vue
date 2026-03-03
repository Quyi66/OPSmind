<template>
  <el-dialog
    v-model="visible"
    :title="modelId ? '编辑资产模型' : '添加资产模型'"
    width="90%"
    top="5vh"
    :close-on-click-modal="false"
    destroy-on-close
    @closed="handleClosed"
  >
    <div v-loading="loading" class="editor-content">
      <el-tabs v-model="activeTab" type="border-card">
        <!-- 基本信息 -->
        <el-tab-pane label="基本信息" name="basic">
          <el-form
            ref="basicFormRef"
            :model="formData"
            :rules="formRules"
            label-width="120px"
            style="max-width: 600px"
          >
            <el-form-item label="模型名称" prop="title">
              <el-input v-model="formData.title" placeholder="请输入模型名称" />
            </el-form-item>
            <el-form-item label="资产代码" prop="code">
              <el-input v-model="formData.code" placeholder="请输入资产代码" :disabled="!!modelId" />
              <div class="form-tip">资产代码创建后不可修改</div>
            </el-form-item>
            <el-form-item label="图标" prop="icon">
              <IconPicker v-model="formData.icon" />
            </el-form-item>
            <el-form-item label="是否自动化" prop="isAuto">
              <el-switch
                v-model="formData.isAuto"
                :active-value="1"
                :inactive-value="0"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 属性配置 -->
        <el-tab-pane label="模型属性" name="attrs">
          <div class="attrs-layout">
            <!-- 左侧：属性列表 -->
            <div class="attrs-left">
              <div class="attrs-toolbar">
                <el-button type="primary" size="small" @click="handleAddGroup">
                  <i class="fa fa-plus" style="margin-right: 4px"></i>
                  添加属性分组
                </el-button>
              </div>

              <!-- 分组列表 -->
              <div class="attrs-groups">
                <div
                  v-for="(group, groupIndex) in groupedAttrs"
                  :key="group._id"
                  class="attr-group"
                >
                  <!-- 分组标题 -->
                  <div
                    class="group-header"
                    :class="{ expanded: expandedGroups.includes(group._id) }"
                    @click="toggleGroup(group._id)"
                  >
                    <i :class="expandedGroups.includes(group._id) ? 'fa fa-chevron-down' : 'fa fa-chevron-right'" />
                    <span class="group-title">{{ group.title }}</span>
                    <el-button
                      link
                      size="small"
                      type="danger"
                      class="group-delete"
                      @click.stop="handleDeleteGroup(groupIndex)"
                    >
                      <i class="fa fa-times"></i>
                    </el-button>
                  </div>

                  <!-- 分组内属性 -->
                  <div v-show="expandedGroups.includes(group._id)" class="group-attrs">
                    <div
                      v-for="(attr, attrIndex) in group.children"
                      :key="attr._id"
                      class="attr-item"
                      :class="{ selected: selectedAttr?._id === attr._id, required: attr.required }"
                      @click="selectAttr(attr, groupIndex, attrIndex)"
                    >
                      <i class="fa fa-grip-vertical drag-handle"></i>
                      <span v-if="attr.required" class="required-mark">*</span>
                      <span class="attr-title">{{ attr.title || '未命名属性' }}</span>
                      <el-button
                        link
                        size="small"
                        type="danger"
                        class="attr-delete"
                        @click.stop="handleDeleteAttrInGroup(groupIndex, attrIndex)"
                      >
                        <i class="fa fa-times"></i>
                      </el-button>
                    </div>

                    <!-- 添加属性按钮 -->
                    <div class="add-attr-btn" @click="handleAddAttrToGroup(groupIndex)">
                      <i class="fa fa-plus"></i>
                      添加属性
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 右侧：属性设置 -->
            <div class="attrs-right">
              <div class="setting-panel">
                <div class="panel-header">属性设置</div>
                <div v-if="selectedAttr" class="panel-body">
                  <!-- 基本设置 -->
                  <el-collapse v-model="settingPanels">
                    <el-collapse-item title="基本" name="basic">
                      <el-form label-position="top" size="small">
                        <el-form-item label="Code">
                          <el-input v-model="selectedAttr.code" placeholder="属性代码" />
                        </el-form-item>
                        <el-form-item label="标题">
                          <el-input v-model="selectedAttr.title" placeholder="属性标题" />
                        </el-form-item>
                        <el-form-item label="约束">
                          <div class="constraint-options">
                            <el-checkbox v-model="selectedAttr.unique">唯一</el-checkbox>
                            <el-checkbox v-model="selectedAttr.required">必须</el-checkbox>
                          </div>
                        </el-form-item>
                      </el-form>
                    </el-collapse-item>

                    <!-- 数据输入 -->
                    <el-collapse-item title="数据输入" name="input">
                      <el-form label-position="top" size="small">
                        <el-form-item label="控件类型">
                          <el-select v-model="inputControl" placeholder="选择控件类型" style="width: 100%">
                            <el-option label="单行输入" value="input" />
                            <el-option label="多行文本" value="textarea" />
                            <el-option label="数字" value="number" />
                            <el-option label="下拉选择" value="select" />
                            <el-option label="日期" value="date" />
                            <el-option label="日期时间" value="datetime" />
                            <el-option label="开关" value="switch" />
                            <el-option label="隐藏" value="hidden" />
                          </el-select>
                        </el-form-item>
                        <el-form-item label="数据类型">
                          <el-select v-model="inputDatatype" placeholder="选择数据类型" style="width: 100%">
                            <el-option label="字符串" value="string" />
                            <el-option label="数字" value="number" />
                            <el-option label="布尔" value="boolean" />
                          </el-select>
                        </el-form-item>
                        <el-form-item label="默认值">
                          <el-input v-model="inputDefaultValue" placeholder="默认值" />
                        </el-form-item>
                        <el-form-item label="宽度（字符）">
                          <el-input-number v-model="inputWidth" :min="0" :max="100" controls-position="right" />
                        </el-form-item>
                      </el-form>
                    </el-collapse-item>

                    <!-- 显示数据 -->
                    <el-collapse-item title="显示数据" name="display">
                      <el-form label-position="top" size="small">
                        <el-form-item label="数据转换">
                          <el-input
                            v-model="displayConverter"
                            type="textarea"
                            :rows="4"
                            placeholder="JavaScript 转换函数"
                          />
                          <div class="form-tip">
                            示例：js:function f() { return '值'; }
                          </div>
                        </el-form-item>
                      </el-form>
                    </el-collapse-item>
                  </el-collapse>
                </div>
                <div v-else class="panel-empty">
                  <i class="fa fa-mouse-pointer"></i>
                  <p>请在左侧选择一个属性</p>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- 视图配置 -->
        <el-tab-pane label="视图定义" name="views">
          <el-collapse v-model="activeViews">
            <!-- 选择器视图 -->
            <el-collapse-item title="选择器视图 (Selector)" name="selector">
              <div class="view-desc">资产选择器中显示的列</div>
              <ViewColumnConfig
                v-model="selectorColumns"
                :attrs="availableAttrs"
              />
            </el-collapse-item>

            <!-- 列表视图 -->
            <el-collapse-item title="列表视图 (List)" name="list">
              <div class="view-desc">资产列表页面显示的列</div>
              <ViewColumnConfig
                v-model="listColumns"
                :attrs="availableAttrs"
              />
            </el-collapse-item>
          </el-collapse>
        </el-tab-pane>
      </el-tabs>
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">
        <i class="fa fa-save" style="margin-right: 4px"></i>
        保存
      </el-button>
    </template>

    <!-- 属性配置弹窗 -->
    <AttrConfigDialog
      v-model="attrConfigDialogVisible"
      :attr-data="currentAttr"
      @saved="handleAttrConfigSaved"
    />
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiService } from '@/core/api'
import ViewColumnConfig from './ViewColumnConfig.vue'
import AttrConfigDialog from './AttrConfigDialog.vue'
import IconPicker from '@/components/shared/IconPicker.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  modelData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 兼容不同字段名: id, cit_id, citId
const modelId = computed(() => props.modelData?.id || props.modelData?.cit_id || props.modelData?.citId)
const loading = ref(false)
const saving = ref(false)
const activeTab = ref('basic')
const activeViews = ref(['selector', 'list'])

// 原始模型数据
const originalData = ref(null)

// 表单数据
const formData = ref({
  title: '',
  code: '',
  icon: '',
  isAuto: 0,
  attrs: []
})

// 表单验证规则
const formRules = {
  title: [
    { required: true, message: '请输入模型名称', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入资产代码', trigger: 'blur' },
    { pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: '代码必须以字母开头，只能包含字母、数字和下划线', trigger: 'blur' }
  ]
}

// 视图列配置
const selectorColumns = ref([])
const listColumns = ref([])

// 可用属性（排除分组）
const availableAttrs = computed(() => {
  return formData.value.attrs.filter(attr => attr.type !== 'group' && attr.code)
})

// 属性编辑相关
const expandedGroups = ref([])
const selectedAttr = ref(null)
const selectedGroupIndex = ref(-1)
const selectedAttrIndex = ref(-1)
const settingPanels = ref(['basic', 'input', 'display'])

// 属性输入设置
const inputControl = ref('input')
const inputDatatype = ref('string')
const inputDefaultValue = ref('')
const inputWidth = ref(0)
const displayConverter = ref('')

// 按分组组织属性
const groupedAttrs = computed(() => {
  const groups = []
  let currentGroup = null

  formData.value.attrs.forEach((attr, index) => {
    if (attr.type === 'group') {
      currentGroup = {
        ...attr,
        _id: attr._id || `group_${index}`,
        children: []
      }
      groups.push(currentGroup)
    } else {
      if (!currentGroup) {
        // 没有分组，创建一个默认分组
        currentGroup = {
          _id: 'default_group',
          title: '默认分组',
          type: 'group',
          children: []
        }
        groups.push(currentGroup)
      }
      currentGroup.children.push({
        ...attr,
        _id: attr._id || `attr_${index}`
      })
    }
  })

  return groups
})

// 切换分组展开
const toggleGroup = (groupId) => {
  const index = expandedGroups.value.indexOf(groupId)
  if (index === -1) {
    expandedGroups.value.push(groupId)
  } else {
    expandedGroups.value.splice(index, 1)
  }
}

// 选择属性
const selectAttr = (attr, groupIndex, attrIndex) => {
  selectedAttr.value = attr
  selectedGroupIndex.value = groupIndex
  selectedAttrIndex.value = attrIndex

  // 加载属性设置
  inputControl.value = attr.input?.control || 'input'
  inputDatatype.value = attr.input?.datatype || 'string'
  inputDefaultValue.value = attr.input?.defaultValue || ''
  inputWidth.value = attr.input?.width || 0
  displayConverter.value = attr.display?.converter || ''
}

// 同步属性设置到选中的属性
watch([inputControl, inputDatatype, inputDefaultValue, inputWidth, displayConverter], () => {
  if (selectedAttr.value) {
    selectedAttr.value.input = {
      control: inputControl.value,
      datatype: inputDatatype.value,
      defaultValue: inputDefaultValue.value,
      width: inputWidth.value
    }
    selectedAttr.value.display = displayConverter.value ? { converter: displayConverter.value } : {}

    // 同步到 formData
    syncAttrToFormData()
  }
})

// 同步选中的属性变化到 formData
watch(() => selectedAttr.value, (newVal) => {
  if (newVal) {
    syncAttrToFormData()
  }
}, { deep: true })

// 同步属性到 formData
const syncAttrToFormData = () => {
  if (selectedGroupIndex.value === -1 || selectedAttrIndex.value === -1) return

  // 找到原始索引
  let flatIndex = 0
  for (let i = 0; i < selectedGroupIndex.value; i++) {
    flatIndex++ // 分组本身
    flatIndex += groupedAttrs.value[i].children.length
  }
  flatIndex++ // 当前分组
  flatIndex += selectedAttrIndex.value

  if (formData.value.attrs[flatIndex]) {
    formData.value.attrs[flatIndex] = { ...selectedAttr.value }
  }
}

// 弹窗状态
const attrConfigDialogVisible = ref(false)
const currentAttr = ref(null)
const currentAttrIndex = ref(-1)

// 加载模型详情
const loadModelDetail = async () => {

  if (!modelId.value) {
    // 新增模式
    formData.value = {
      title: '',
      code: '',
      icon: '',
      isAuto: 0,
      attrs: []
    }
    selectorColumns.value = []
    listColumns.value = []
    selectedAttr.value = null
    expandedGroups.value = []
    return
  }

  loading.value = true
  try {
    const url = `/acm/api/acm/cit/vo/citid/${modelId.value}?cacheBuster=${Date.now()}`
    const response = await apiService.get(url)
    // API 返回的数据在 response.data 中
    const res = response.data || response
    originalData.value = res

    // 填充表单数据
    formData.value = {
      title: res.title || '',
      code: res.code || '',
      icon: res.icon || '',
      isAuto: res.isAuto || 0,
      attrs: (res.attrs || []).map((attr, index) => ({
        ...attr,
        _id: `attr_${index}` // 用于表格 row-key
      }))
    }

    // 解析视图配置
    parseViews(res.views || [])
  } catch (error) {
    console.error('加载模型详情失败:', error)
    ElMessage.error('加载模型详情失败')
  } finally {
    loading.value = false
  }
}

// 解析视图配置
const parseViews = (views) => {
  views.forEach(view => {
    if (view.type === 'selector') {
      selectorColumns.value = (view.config?.columns || []).map(col => col.attr)
    } else if (view.type === 'list') {
      listColumns.value = (view.config?.columns || []).map(col => col.attr)
    }
  })
}

// 构建视图配置
const buildViews = () => {
  return [
    {
      type: 'selector',
      config: {
        columns: selectorColumns.value.map(attr => ({ attr }))
      }
    },
    {
      type: 'list',
      config: {
        columns: listColumns.value.map(attr => ({ attr }))
      }
    },
    { type: 'detail', config: {} },
    { type: 'editor', config: {} }
  ]
}

// 添加属性
const handleAddAttr = () => {
  formData.value.attrs.push({
    _id: `attr_${Date.now()}`,
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
}

// 添加分组
const handleAddGroup = () => {
  const newGroup = {
    _id: `group_${Date.now()}`,
    code: null,
    title: '新分组',
    type: 'group',
    unique: false,
    required: false,
    editable: true,
    importable: true,
    display: {},
    input: {}
  }
  formData.value.attrs.push(newGroup)
  // 自动展开新分组
  expandedGroups.value.push(newGroup._id)
}

// 添加属性到分组
const handleAddAttrToGroup = (groupIndex) => {
  // 计算在 formData.attrs 中的插入位置
  let insertIndex = 0
  for (let i = 0; i <= groupIndex; i++) {
    insertIndex++ // 分组本身
    if (i < groupIndex) {
      insertIndex += groupedAttrs.value[i].children.length
    } else {
      insertIndex += groupedAttrs.value[i].children.length
    }
  }

  const newAttr = {
    _id: `attr_${Date.now()}`,
    code: '',
    title: '新属性',
    type: null,
    unique: false,
    required: false,
    editable: true,
    importable: true,
    display: {},
    input: {}
  }
  formData.value.attrs.splice(insertIndex, 0, newAttr)
}

// 删除分组
const handleDeleteGroup = (groupIndex) => {
  const group = groupedAttrs.value[groupIndex]
  ElMessageBox.confirm(
    `确定要删除分组"${group.title}"及其所有属性吗？`,
    '删除确认',
    { type: 'warning' }
  ).then(() => {
    // 计算要删除的范围
    let startIndex = 0
    for (let i = 0; i < groupIndex; i++) {
      startIndex++ // 分组本身
      startIndex += groupedAttrs.value[i].children.length
    }
    const deleteCount = 1 + group.children.length

    formData.value.attrs.splice(startIndex, deleteCount)
    selectedAttr.value = null
  }).catch(() => {})
}

// 删除分组内的属性
const handleDeleteAttrInGroup = (groupIndex, attrIndex) => {
  const attr = groupedAttrs.value[groupIndex].children[attrIndex]
  ElMessageBox.confirm(
    `确定要删除属性"${attr.title || '未命名'}"吗？`,
    '删除确认',
    { type: 'warning' }
  ).then(() => {
    // 计算在 formData.attrs 中的索引
    let flatIndex = 0
    for (let i = 0; i < groupIndex; i++) {
      flatIndex++ // 分组本身
      flatIndex += groupedAttrs.value[i].children.length
    }
    flatIndex++ // 当前分组
    flatIndex += attrIndex

    formData.value.attrs.splice(flatIndex, 1)
    if (selectedAttr.value?._id === attr._id) {
      selectedAttr.value = null
    }
  }).catch(() => {})
}

// 上移属性
const handleMoveUp = (index) => {
  if (index > 0) {
    const attrs = formData.value.attrs
    const temp = attrs[index]
    attrs[index] = attrs[index - 1]
    attrs[index - 1] = temp
  }
}

// 下移属性
const handleMoveDown = (index) => {
  const attrs = formData.value.attrs
  if (index < attrs.length - 1) {
    const temp = attrs[index]
    attrs[index] = attrs[index + 1]
    attrs[index + 1] = temp
  }
}

// 配置属性
const handleConfigAttr = (attr, index) => {
  currentAttr.value = { ...attr }
  currentAttrIndex.value = index
  attrConfigDialogVisible.value = true
}

// 属性配置保存
const handleAttrConfigSaved = (updatedAttr) => {
  if (currentAttrIndex.value !== -1) {
    formData.value.attrs[currentAttrIndex.value] = updatedAttr
  }
}

// 删除属性
const handleDeleteAttr = (index) => {
  ElMessageBox.confirm('确定要删除该属性吗？', '删除确认', {
    type: 'warning'
  }).then(() => {
    formData.value.attrs.splice(index, 1)
  }).catch(() => {})
}

// 保存
const handleSave = async () => {
  saving.value = true
  try {
    // 构建保存数据
    const saveData = {
      id: modelId.value || null,
      code: formData.value.code,
      title: formData.value.title,
      icon: formData.value.icon,
      isAuto: formData.value.isAuto,
      attrs: formData.value.attrs.map(attr => {
        const { _id, ...rest } = attr
        return rest
      }),
      views: buildViews(),
      actions: originalData.value?.actions || [],
      template_id: originalData.value?.template_id || null
    }

    await apiService.post(`/acm/api/acm/cit?cacheBuster=${Date.now()}`, saveData)
    ElMessage.success('保存成功')
    visible.value = false
    emit('saved')
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败: ' + (error.response?.data?.message || error.message))
  } finally {
    saving.value = false
  }
}

// 弹窗关闭时重置
const handleClosed = () => {
  formData.value = {
    title: '',
    code: '',
    icon: '',
    isAuto: 0,
    attrs: []
  }
  selectorColumns.value = []
  listColumns.value = []
  originalData.value = null
  activeTab.value = 'basic'
  selectedAttr.value = null
  expandedGroups.value = []
  inputControl.value = 'input'
  inputDatatype.value = 'string'
  inputDefaultValue.value = ''
  inputWidth.value = 0
  displayConverter.value = ''
}

// 监听弹窗打开
watch(() => props.modelValue, (val) => {
  if (val) {
    loadModelDetail()
    // 默认展开所有分组
    setTimeout(() => {
      expandedGroups.value = groupedAttrs.value.map(g => g._id)
    }, 100)
  }
})
</script>

<style scoped lang="scss">
.editor-content {
  max-height: 70vh;
  overflow: auto;

  :deep(.el-tabs--border-card) {
    .el-tabs__content {
      padding: 16px;
    }
  }
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

// 属性配置布局
.attrs-layout {
  display: flex;
  gap: 16px;
  min-height: 500px;
}

.attrs-left {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  overflow: hidden;
}

.attrs-toolbar {
  padding: 12px;
  background: var(--el-bg-color-page);
  border-bottom: 1px solid var(--el-border-color-light);
}

.attrs-groups {
  max-height: 450px;
  overflow-y: auto;
}

.attr-group {
  border-bottom: 1px solid var(--el-border-color-light);

  &:last-child {
    border-bottom: none;
  }
}

.group-header {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  background: var(--el-bg-color-page);
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #f0f0f0;
  }

  &.expanded {
    background: #e6f0fa;
  }

  i:first-child {
    width: 16px;
    font-size: 12px;
    color: #909399;
  }

  .group-title {
    flex: 1;
    margin-left: 8px;
    font-weight: 500;
    color: #303133;
  }

  .group-delete {
    opacity: 0;
    transition: opacity 0.2s;
  }

  &:hover .group-delete {
    opacity: 1;
  }
}

.group-attrs {
  background: var(--el-bg-color);
}

.attr-item {
  display: flex;
  align-items: center;
  padding: 8px 12px 8px 36px;
  border-bottom: 1px solid var(--el-border-color-light);
  cursor: pointer;
  transition: background 0.2s;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: var(--el-bg-color-page);
  }

  &.selected {
    background: #ecf5ff;
    border-left: 3px solid #409eff;
    padding-left: 33px;
  }

  .drag-handle {
    color: #c0c4cc;
    margin-right: 8px;
    cursor: move;
  }

  .required-mark {
    color: #f56c6c;
    margin-right: 4px;
  }

  .attr-title {
    flex: 1;
    color: #606266;
  }

  .attr-delete {
    opacity: 0;
    transition: opacity 0.2s;
  }

  &:hover .attr-delete {
    opacity: 1;
  }
}

.add-attr-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  color: #409eff;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #ecf5ff;
  }

  i {
    margin-right: 4px;
  }
}

// 右侧设置面板
.attrs-right {
  width: 280px;
  flex-shrink: 0;
}

.setting-panel {
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  overflow: hidden;
  height: 100%;
}

.panel-header {
  padding: 12px 16px;
  background: #409eff;
  color: #fff;
  font-weight: 500;
}

.panel-body {
  padding: 0;
  max-height: 450px;
  overflow-y: auto;

  :deep(.el-collapse) {
    border: none;

    .el-collapse-item__header {
      padding: 0 16px;
      background: var(--el-bg-color-page);
      font-weight: 500;
    }

    .el-collapse-item__content {
      padding: 12px 16px;
    }
  }

  .constraint-options {
    display: flex;
    gap: 16px;
  }
}

.panel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #909399;

  i {
    font-size: 48px;
    margin-bottom: 16px;
  }

  p {
    margin: 0;
  }
}

.text-secondary {
  color: #909399;
}

.text-warning {
  color: #e6a23c;
}

.view-desc {
  font-size: 13px;
  color: #909399;
  margin-bottom: 12px;
}
</style>
