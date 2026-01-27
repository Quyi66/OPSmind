<template>
  <div class="model-editor-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button link @click="handleBack">
          <i class="fa fa-arrow-left"></i>
        </el-button>
        <span class="page-title">{{ isNewMode ? '添加资产模型' : '编辑资产模型' }}</span>
        <span v-if="formData.title" class="model-name">- {{ formData.title }}</span>
      </div>
      <div class="header-right">
        <el-button @click="handleBack" size="small">取消</el-button>
        <el-button type="primary" :loading="saving" size="small" @click="handleSave">
          保存
        </el-button>
      </div>
    </div>

    <!-- 内容区 -->
    <div v-loading="loading" class="page-content">
      <el-tabs v-model="activeTab" class="editor-tabs">
        <!-- 基本信息 -->
        <el-tab-pane label="基本信息" name="basic">
          <div class="tab-content">
            <el-form
              ref="basicFormRef"
              :model="formData"
              :rules="formRules"
              label-width="120px"
              style="max-width: 600px"
            >
              <el-form-item label="资产代码" prop="code">
                <el-input
                  v-model="formData.code"
                  placeholder="请输入资产代码"
                  :disabled="!isNewMode"
                />
                <div class="form-tip">资产代码不能为空且仅支持英文大小写字母、数字和下划线</div>
              </el-form-item>
              <el-form-item label="模型名称" prop="title">
                <el-input v-model="formData.title" placeholder="请输入模型名称" />
              </el-form-item>
              <el-form-item label="图标" prop="icon">
                <IconPicker v-model="formData.icon" />
              </el-form-item>
              <el-form-item label="是否自动化" prop="isAuto">
                <el-select v-model="formData.isAuto" placeholder="请选择" style="width: 200px">
                  <el-option label="不支持" :value="0" />
                  <el-option label="支持" :value="1" />
                </el-select>
              </el-form-item>
              <el-form-item v-if="isNewMode" label="资产模板">
                <el-select
                  v-model="formData.templateId"
                  placeholder="不使用模板"
                  clearable
                  style="width: 200px"
                >
                  <el-option
                    v-for="tpl in templateList"
                    :key="tpl.id"
                    :label="tpl.title"
                    :value="tpl.id"
                  />
                </el-select>
                <div class="form-tip">选择一个已有模型作为模板</div>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>

        <!-- 属性配置 -->
        <el-tab-pane label="模型属性" name="attrs">
          <div class="tab-content attrs-tab">
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
                      <i
                        :class="
                          expandedGroups.includes(group._id)
                            ? 'fa fa-chevron-down'
                            : 'fa fa-chevron-right'
                        "
                      />
                      <span v-if="editingGroupIndex !== groupIndex" class="group-title">
                        {{ group.title }}
                      </span>
                      <el-input
                        v-if="editingGroupIndex === groupIndex"
                        v-model="editingGroupTitle"
                        size="small"
                        class="group-title-input editing"
                        @click.stop
                        @blur="finishEditGroupTitle"
                        @keyup.enter="finishEditGroupTitle"
                      />
                      <el-button
                        v-if="editingGroupIndex !== groupIndex"
                        link
                        size="small"
                        class="group-edit"
                        @click.stop="startEditGroupTitle(groupIndex, group.title)"
                      >
                        <i class="fa fa-edit"></i>
                      </el-button>
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
                        :class="{
                          selected: selectedAttr?._id === attr._id,
                          required: attr.required
                        }"
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

                  <!-- 空状态 -->
                  <div v-if="groupedAttrs.length === 0" class="empty-groups">
                    <i class="fa fa-layer-group"></i>
                    <p>暂无属性分组</p>
                    <el-button type="primary" size="small" @click="handleAddGroup">
                      添加属性分组
                    </el-button>
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
                          <el-form-item label="其他">
                            <div class="constraint-options">
                              <el-checkbox v-model="selectedAttr.editable">可编辑</el-checkbox>
                              <el-checkbox v-model="selectedAttr.importable">可导入</el-checkbox>
                            </div>
                          </el-form-item>
                        </el-form>
                      </el-collapse-item>

                      <!-- 数据输入 -->
                      <el-collapse-item title="数据输入" name="input">
                        <el-form label-position="top" size="small">
                          <!-- 控件类型 -->
                          <el-form-item>
                            <template #label>
                              <span>控件类型</span>
                              <i
                                class="fa fa-keyboard"
                                style="margin-left: 4px; color: #909399"
                              ></i>
                            </template>
                            <el-select
                              v-model="inputControl"
                              placeholder="选择控件类型"
                              style="width: 120px"
                            >
                              <el-option label="单行输入" value="input" />
                              <el-option label="密码" value="password" />
                              <el-option label="下拉选择" value="select" />
                              <el-option label="自动完成" value="typeahead" />
                              <el-option label="日期选择" value="datepicker" />
                              <el-option label="图标选择" value="iconpicker" />
                              <el-option label="单选" value="radio" />
                              <el-option label="复选" value="checkbox" />
                              <el-option label="多行文本" value="textarea" />
                              <el-option label="纯文本" value="text" />
                              <el-option label="设备选择" value="device" />
                              <el-option label="文件" value="file" />
                              <el-option label="隐藏" value="hidden" />
                            </el-select>
                          </el-form-item>

                          <!-- textarea 特有选项 -->
                          <template v-if="inputControl === 'textarea'">
                            <el-form-item label="显示方式">
                              <el-select v-model="inputViewas" style="width: 120px">
                                <el-option label="默认" value="" />
                                <el-option label="输入按钮" value="inputbtn" />
                              </el-select>
                            </el-form-item>
                          </template>

                          <!-- device 特有选项 -->
                          <template v-if="inputControl === 'device'">
                            <el-form-item label="显示方式">
                              <el-select v-model="inputViewas" style="width: 120px">
                                <el-option label="弹窗选择" value="btndlg" />
                                <el-option label="下拉选择" value="dropdown" />
                              </el-select>
                            </el-form-item>
                            <el-form-item v-if="inputViewas" label="设备类型">
                              <DataConverterInput v-model="inputDevicetype" :kinds="'js,str'" />
                            </el-form-item>
                          </template>

                          <!-- radio/checkbox 特有选项 -->
                          <template v-if="inputControl === 'radio' || inputControl === 'checkbox'">
                            <el-form-item>
                              <template #label>
                                <span>选项数据</span>
                                <el-tooltip
                                  content="定义选项列表，支持 YAML 或 JS 格式"
                                  placement="top"
                                >
                                  <i
                                    class="fa fa-info-circle"
                                    style="margin-left: 4px; color: #909399"
                                  ></i>
                                </el-tooltip>
                              </template>
                              <DataConverterInput v-model="inputSourcedef" :kinds="'js,yaml'" />
                            </el-form-item>
                            <el-form-item label="布局">
                              <el-select v-model="inputLayout" style="width: 120px">
                                <el-option label="行内" value="inline" />
                                <el-option label="每行1个" value="even-1" />
                                <el-option label="每行2个" value="even-2" />
                                <el-option label="每行3个" value="even-3" />
                                <el-option label="每行4个" value="even-4" />
                              </el-select>
                            </el-form-item>
                          </template>

                          <!-- select/typeahead 特有选项 -->
                          <template
                            v-if="inputControl === 'select' || inputControl === 'typeahead'"
                          >
                            <el-form-item>
                              <template #label>
                                <span>选项数据</span>
                                <el-tooltip
                                  content="定义下拉选项，支持 YAML 或 JS 格式"
                                  placement="top"
                                >
                                  <i
                                    class="fa fa-info-circle"
                                    style="margin-left: 4px; color: #909399"
                                  ></i>
                                </el-tooltip>
                              </template>
                              <DataConverterInput v-model="inputSourcedef" :kinds="'js,yaml'" />
                            </el-form-item>
                          </template>

                          <!-- typeahead 特有选项 -->
                          <template v-if="inputControl === 'typeahead'">
                            <el-form-item>
                              <el-checkbox v-model="inputKeepHistory">保留历史记录</el-checkbox>
                            </el-form-item>
                          </template>

                          <!-- select 特有选项 -->
                          <template v-if="inputControl === 'select'">
                            <el-form-item>
                              <div class="constraint-options">
                                <el-checkbox v-model="inputIsmultiple">允许多选</el-checkbox>
                                <el-checkbox v-model="inputIstags">允许标签</el-checkbox>
                              </div>
                            </el-form-item>
                          </template>

                          <!-- datepicker 特有选项 -->
                          <template v-if="inputControl === 'datepicker'">
                            <el-form-item label="日期格式">
                              <el-select v-model="inputFormatter" style="width: 180px">
                                <el-option label="YYYY-MM-DD" value="YYYY-MM-DD" />
                                <el-option
                                  label="YYYY-MM-DD HH:mm:ss"
                                  value="YYYY-MM-DD HH:mm:ss"
                                />
                              </el-select>
                            </el-form-item>
                          </template>

                          <!-- 非 file 控件通用选项 -->
                          <template v-if="inputControl !== 'file'">
                            <!-- 数据类型 -->
                            <el-form-item>
                              <template #label>
                                <span>数据类型</span>
                                <el-tooltip content="指定属性值的数据类型" placement="top">
                                  <i
                                    class="fa fa-info-circle"
                                    style="margin-left: 4px; color: #909399"
                                  ></i>
                                </el-tooltip>
                              </template>
                              <div class="datatype-row">
                                <el-select
                                  v-model="inputDatatype"
                                  placeholder="选择数据类型"
                                  style="width: 120px"
                                >
                                  <el-option label="默认" value="" />
                                  <el-option label="字符串" value="string" />
                                  <el-option label="JSON" value="json" />
                                  <el-option
                                    v-if="inputControl === 'input'"
                                    label="数字"
                                    value="number"
                                  />
                                  <el-option
                                    v-if="inputControl === 'input' || inputControl === 'datepicker'"
                                    label="日期"
                                    value="date"
                                  />
                                  <el-option
                                    v-if="
                                      inputControl === 'input' ||
                                      inputControl === 'device' ||
                                      inputControl === 'checkbox' ||
                                      inputIsmultiple
                                    "
                                    label="数组"
                                    value="array"
                                  />
                                </el-select>
                                <!-- 分隔符选项 -->
                                <template
                                  v-if="
                                    inputDatatype === 'string' &&
                                    (inputIsmultiple || inputControl === 'checkbox')
                                  "
                                >
                                  <span class="delim-label">分隔符</span>
                                  <el-select v-model="inputFormatdsv" style="width: 80px">
                                    <el-option label="逗号" value="comma" />
                                    <el-option label="空格" value="space" />
                                  </el-select>
                                </template>
                              </div>
                            </el-form-item>

                            <!-- 默认值 -->
                            <el-form-item label="默认值">
                              <DataConverterInput v-model="inputDefaultValue" :kinds="'js,str'" />
                            </el-form-item>

                            <!-- 宽度 -->
                            <el-form-item label="宽度（字符）">
                              <el-input-number
                                v-model="inputWidth"
                                :min="2"
                                :max="20"
                                controls-position="right"
                                style="width: 100%"
                              />
                            </el-form-item>
                          </template>
                        </el-form>
                      </el-collapse-item>

                      <!-- 显示数据 -->
                      <el-collapse-item title="显示数据" name="display">
                        <el-form label-position="top" size="small">
                          <el-form-item label="数据转换">
                            <DataConverterInput v-model="displayConverter" :kinds="'js,str'" />
                          </el-form-item>

                          <el-form-item label="Click">
                            <el-select
                              v-model="displayClick"
                              placeholder="None"
                              style="width: 100%"
                            >
                              <el-option label="None" value="" />
                              <el-option label="复制到剪贴板" value="copy" />
                              <el-option label="打开链接" value="link" />
                            </el-select>
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
          </div>
        </el-tab-pane>

        <!-- 视图配置 -->
        <el-tab-pane label="视图定义" name="views">
          <div class="tab-content views-tab">
            <!-- 视图类型按钮组 -->
            <div class="views-toolbar">
              <div class="view-btn-group">
                <el-button
                  :type="activeViewType === 'list' ? 'primary' : 'default'"
                  @click="activeViewType = 'list'"
                >
                  <i class="fa fa-list" style="margin-right: 4px"></i>
                  概要列表
                </el-button>
                <el-button class="view-config-btn" @click="openViewConfig('list')">
                  <i class="fa fa-cog"></i>
                </el-button>
              </div>
              <div class="view-btn-group">
                <el-button
                  :type="activeViewType === 'selector' ? 'primary' : 'default'"
                  @click="activeViewType = 'selector'"
                >
                  <i class="fa fa-th-list" style="margin-right: 4px"></i>
                  选择器列表
                </el-button>
                <el-button class="view-config-btn" @click="openViewConfig('selector')">
                  <i class="fa fa-cog"></i>
                </el-button>
              </div>
              <div class="view-btn-group">
                <el-button
                  :type="activeViewType === 'detail' ? 'primary' : 'default'"
                  @click="activeViewType = 'detail'"
                >
                  <i class="fa fa-file-alt" style="margin-right: 4px"></i>
                  详情
                </el-button>
                <el-button class="view-config-btn" @click="openViewConfig('detail')">
                  <i class="fa fa-cog"></i>
                </el-button>
              </div>
              <div class="view-btn-group">
                <el-button
                  :type="activeViewType === 'editor' ? 'primary' : 'default'"
                  @click="activeViewType = 'editor'"
                >
                  <i class="fa fa-edit" style="margin-right: 4px"></i>
                  编辑表单
                </el-button>
                <el-button class="view-config-btn" @click="openViewConfig('editor')">
                  <i class="fa fa-cog"></i>
                </el-button>
              </div>
            </div>

            <!-- 视图列配置区域 -->
            <div
              v-if="activeViewType === 'list' || activeViewType === 'selector'"
              class="view-columns-config"
            >
              <div class="view-config-header">
                <span class="view-config-title">
                  {{ activeViewType === 'list' ? '概要列表 - 列配置' : '选择器列表 - 列配置' }}
                </span>
              </div>
              <ViewColumnConfig
                v-if="activeViewType === 'list'"
                v-model="listColumns"
                :attrs="availableAttrs"
              />
              <ViewColumnConfig
                v-if="activeViewType === 'selector'"
                v-model="selectorColumns"
                :attrs="availableAttrs"
              />
            </div>
            <!-- 详情视图配置 -->
            <div v-else-if="activeViewType === 'detail'" class="view-data-config">
              <div class="view-config-header">
                <span class="view-config-title">详情视图 - 数据转换</span>
                <span class="view-config-tip">可选，配置数据转换脚本</span>
              </div>
              <div class="data-converter-wrapper">
                <DataConverterInput
                  v-model="detailViewData"
                  :kinds="'js,yaml,json'"
                  placeholder="例如: js:console.log(123)"
                />
              </div>
            </div>
            <!-- 编辑表单视图配置 -->
            <div v-else class="view-no-config">
              <i class="fa fa-info-circle"></i>
              <span>编辑表单暂无可配置项</span>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiService } from '@/core/api'
import ViewColumnConfig from '../components/ViewColumnConfig.vue'
import IconPicker from '@/components/shared/IconPicker.vue'
import DataConverterInput from '../components/DataConverterInput.vue'

const props = defineProps({
  modelId: {
    type: [String, Number],
    default: null
  }
})

const emit = defineEmits(['back', 'saved'])

const loading = ref(false)
const saving = ref(false)
const activeTab = ref('basic')
const activeViews = ref(['selector', 'list'])
const activeViewType = ref('list') // 当前选中的视图类型

// 打开视图配置（目前只是切换到对应视图）
const openViewConfig = viewType => {
  activeViewType.value = viewType
}

// 原始模型数据
const originalData = ref(null)

// 表单数据
const formData = ref({
  title: '',
  code: '',
  icon: '',
  isAuto: 0,
  templateId: '', // 资产模板 ID
  attrs: []
})

// 模板列表（新建模式使用）
const templateList = ref([])

// 表单验证规则
const formRules = {
  title: [{ required: true, message: '请输入模型名称', trigger: 'blur' }],
  code: [
    { required: true, message: '请输入资产代码', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/,
      message: '代码必须以字母开头，只能包含字母、数字和下划线',
      trigger: 'blur'
    }
  ]
}

// 视图列配置
const selectorColumns = ref([])
const listColumns = ref([])
const detailViewData = ref('') // 详情视图数据转换脚本

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

// 分组标题编辑状态
const editingGroupIndex = ref(-1)
const editingGroupTitle = ref('')

// 属性输入设置
const inputControl = ref('input')
const inputDatatype = ref('')
const inputDefaultValue = ref('')
const inputWidth = ref(0)
const displayConverter = ref('')
const displayClick = ref('')

// 控件特有配置
const inputViewas = ref('')
const inputDevicetype = ref('')
const inputSourcedef = ref('')
const inputLayout = ref('inline')
const inputKeepHistory = ref(false)
const inputIsmultiple = ref(false)
const inputIstags = ref(false)
const inputFormatter = ref('YYYY-MM-DD')
const inputFormatdsv = ref('comma')

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
const toggleGroup = groupId => {
  const index = expandedGroups.value.indexOf(groupId)
  if (index === -1) {
    expandedGroups.value.push(groupId)
  } else {
    expandedGroups.value.splice(index, 1)
  }
}

// 更新分组标题
const updateGroupTitle = (groupIndex, newTitle) => {
  // 计算在 formData.attrs 中的索引
  let flatIndex = 0
  for (let i = 0; i < groupIndex; i++) {
    flatIndex++ // 分组本身
    flatIndex += groupedAttrs.value[i].children.length
  }
  if (formData.value.attrs[flatIndex]) {
    formData.value.attrs[flatIndex].title = newTitle
  }
}

// 开始编辑分组标题
const startEditGroupTitle = (groupIndex, currentTitle) => {
  editingGroupIndex.value = groupIndex
  editingGroupTitle.value = currentTitle
}

// 完成编辑分组标题
const finishEditGroupTitle = () => {
  if (editingGroupIndex.value !== -1) {
    updateGroupTitle(editingGroupIndex.value, editingGroupTitle.value)
    editingGroupIndex.value = -1
    editingGroupTitle.value = ''
  }
}

// 选择属性
const selectAttr = (attr, groupIndex, attrIndex) => {
  selectedAttr.value = attr
  selectedGroupIndex.value = groupIndex
  selectedAttrIndex.value = attrIndex

  // 加载属性设置 - 基本
  inputControl.value = attr.input?.control || 'input'
  inputDatatype.value = attr.input?.datatype || ''
  inputDefaultValue.value = attr.input?.initval || ''
  inputWidth.value = attr.input?.width || 0

  // 加载控件特有配置
  inputViewas.value = attr.input?.viewas || ''
  inputDevicetype.value = attr.input?.devicetype || ''
  inputSourcedef.value = attr.input?.sourcedef || ''
  inputLayout.value = attr.input?.layout || 'inline'
  inputKeepHistory.value = attr.input?.options?.history || false
  inputIsmultiple.value = attr.input?.ismultiple || false
  inputIstags.value = attr.input?.istags || false
  inputFormatter.value = attr.input?.formatter || 'YYYY-MM-DD'
  inputFormatdsv.value = attr.input?.formatdsv || 'comma'

  // 加载显示设置
  displayConverter.value = attr.display?.converter || ''
  displayClick.value = attr.display?.click || ''
}

// 同步属性设置到选中的属性
watch(
  [
    inputControl,
    inputDatatype,
    inputDefaultValue,
    inputWidth,
    inputViewas,
    inputDevicetype,
    inputSourcedef,
    inputLayout,
    inputKeepHistory,
    inputIsmultiple,
    inputIstags,
    inputFormatter,
    inputFormatdsv,
    displayConverter,
    displayClick
  ],
  () => {
    if (selectedAttr.value) {
      // 构建 input 对象
      const inputObj = {
        control: inputControl.value
      }

      // 通用字段
      if (inputDatatype.value) inputObj.datatype = inputDatatype.value
      if (inputDefaultValue.value) inputObj.initval = inputDefaultValue.value
      if (inputWidth.value) inputObj.width = inputWidth.value

      // 控件特有字段
      if (inputControl.value === 'textarea' || inputControl.value === 'device') {
        if (inputViewas.value) inputObj.viewas = inputViewas.value
      }
      if (inputControl.value === 'device' && inputDevicetype.value) {
        inputObj.devicetype = inputDevicetype.value
      }
      if (['radio', 'checkbox', 'select', 'typeahead'].includes(inputControl.value)) {
        if (inputSourcedef.value) inputObj.sourcedef = inputSourcedef.value
      }
      if (['radio', 'checkbox'].includes(inputControl.value)) {
        if (inputLayout.value && inputLayout.value !== 'inline') inputObj.layout = inputLayout.value
      }
      if (inputControl.value === 'typeahead' && inputKeepHistory.value) {
        inputObj.options = { history: true }
      }
      if (inputControl.value === 'select') {
        if (inputIsmultiple.value) inputObj.ismultiple = true
        if (inputIstags.value) inputObj.istags = true
      }
      if (inputControl.value === 'datepicker' && inputFormatter.value !== 'YYYY-MM-DD') {
        inputObj.formatter = inputFormatter.value
      }
      if (
        inputDatatype.value === 'string' &&
        (inputIsmultiple.value || inputControl.value === 'checkbox') &&
        inputFormatdsv.value !== 'comma'
      ) {
        inputObj.formatdsv = inputFormatdsv.value
      }

      selectedAttr.value.input = inputObj

      // 构建 display 对象
      selectedAttr.value.display = {}
      if (displayConverter.value) {
        selectedAttr.value.display.converter = displayConverter.value
      }
      if (displayClick.value) {
        selectedAttr.value.display.click = displayClick.value
      }

      // 同步到 formData
      syncAttrToFormData()
    }
  }
)

// 同步选中的属性变化到 formData
watch(
  () => selectedAttr.value,
  newVal => {
    if (newVal) {
      syncAttrToFormData()
    }
  },
  { deep: true }
)

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

// 是否为新建模式
const isNewMode = computed(() => !props.modelId || props.modelId === 'new')

// 加载模板列表（获取所有模型作为模板选项）
const loadTemplateList = async () => {
  try {
    const url = `/acm/api/acm/cit?cacheBuster=${Date.now()}`
    const response = await apiService.get(url)
    const list = response.data || response || []
    templateList.value = list
  } catch (error) {
    console.error('加载模板列表失败:', error)
    templateList.value = []
  }
}

// 加载模型详情
const loadModelDetail = async () => {
  if (isNewMode.value) {
    // 新增模式 - 初始化一个默认分组
    formData.value = {
      title: '',
      code: '',
      icon: '',
      isAuto: 0,
      templateId: '',
      attrs: [
        {
          code: null,
          title: 'Default',
          type: 'group',
          unique: false,
          required: false,
          editable: true,
          importable: true,
          display: {},
          input: {}
        }
      ]
    }
    selectorColumns.value = []
    listColumns.value = []
    detailViewData.value = ''
    selectedAttr.value = null
    // 默认展开第一个分组
    setTimeout(() => {
      expandedGroups.value = groupedAttrs.value.map(g => g._id)
    }, 100)
    // 加载模板列表
    loadTemplateList()
    return
  }

  loading.value = true
  try {
    const url = `/acm/api/acm/cit/vo/citid/${props.modelId}?cacheBuster=${Date.now()}`
    const response = await apiService.get(url)
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
        _id: `attr_${index}`
      }))
    }

    // 解析视图配置
    parseViews(res.views || [])

    // 默认展开所有分组
    setTimeout(() => {
      expandedGroups.value = groupedAttrs.value.map(g => g._id)
    }, 100)
  } catch (error) {
    console.error('加载模型详情失败:', error)
    ElMessage.error('加载模型详情失败')
  } finally {
    loading.value = false
  }
}

// 解析视图配置
const parseViews = views => {
  views.forEach(view => {
    if (view.type === 'selector') {
      selectorColumns.value = (view.config?.columns || []).map(col => col.attr)
    } else if (view.type === 'list') {
      listColumns.value = (view.config?.columns || []).map(col => col.attr)
    } else if (view.type === 'detail') {
      detailViewData.value = view.data || ''
    }
  })
}

// 构建视图配置
const buildViews = () => {
  const views = [
    {
      type: 'list',
      config: {
        columns: listColumns.value.map(attr => ({ attr }))
      }
    },
    {
      type: 'selector',
      config: {
        columns: selectorColumns.value.map(attr => ({ attr }))
      }
    },
    { type: 'detail', config: {} },
    { type: 'editor', config: {} }
  ]

  // 如果有详情视图的数据转换脚本，添加 data 字段
  if (detailViewData.value) {
    views[2].data = detailViewData.value
  }

  return views
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
  expandedGroups.value.push(newGroup._id)
}

// 添加属性到分组
const handleAddAttrToGroup = groupIndex => {
  let insertIndex = 0
  for (let i = 0; i <= groupIndex; i++) {
    insertIndex++
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
    input: {
      control: 'input',
      datatype: ''
    }
  }
  formData.value.attrs.splice(insertIndex, 0, newAttr)
}

// 删除分组
const handleDeleteGroup = groupIndex => {
  const group = groupedAttrs.value[groupIndex]
  ElMessageBox.confirm(`确定要删除分组"${group.title}"及其所有属性吗？`, '删除确认', {
    type: 'warning'
  })
    .then(() => {
      let startIndex = 0
      for (let i = 0; i < groupIndex; i++) {
        startIndex++
        startIndex += groupedAttrs.value[i].children.length
      }
      const deleteCount = 1 + group.children.length

      formData.value.attrs.splice(startIndex, deleteCount)
      selectedAttr.value = null
    })
    .catch(() => {})
}

// 删除分组内的属性
const handleDeleteAttrInGroup = (groupIndex, attrIndex) => {
  const attr = groupedAttrs.value[groupIndex].children[attrIndex]
  ElMessageBox.confirm(`确定要删除属性"${attr.title || '未命名'}"吗？`, '删除确认', {
    type: 'warning'
  })
    .then(() => {
      let flatIndex = 0
      for (let i = 0; i < groupIndex; i++) {
        flatIndex++
        flatIndex += groupedAttrs.value[i].children.length
      }
      flatIndex++
      flatIndex += attrIndex

      formData.value.attrs.splice(flatIndex, 1)
      if (selectedAttr.value?._id === attr._id) {
        selectedAttr.value = null
      }
    })
    .catch(() => {})
}

// 保存
const handleSave = async () => {
  saving.value = true
  try {
    // 构建保存数据 - 确保 attrs 结构完整
    const processedAttrs = formData.value.attrs.map(attr => {
      const { _id, ...rest } = attr
      // 确保所有必需字段存在
      return {
        code: rest.code || null,
        title: rest.title || '',
        type: rest.type || null,
        unique: rest.unique ?? false,
        required: rest.required ?? false,
        editable: rest.editable ?? true,
        importable: rest.importable ?? true,
        display: rest.display || {},
        input: rest.input || {}
      }
    })

    // 构建保存数据
    const saveData = {
      code: formData.value.code,
      title: formData.value.title,
      icon: formData.value.icon || '',
      isAuto: formData.value.isAuto,
      attrs: processedAttrs,
      views: buildViews(),
      template_id: isNewMode.value
        ? formData.value.templateId || '0'
        : originalData.value?.template_id || '0'
    }

    // 编辑模式下添加 id 和其他字段
    if (!isNewMode.value) {
      saveData.id = props.modelId
      saveData.tenantId = originalData.value?.tenantId || null
      saveData.actions = originalData.value?.actions || []
    }

    // 新增和编辑都使用同一个接口
    const url = `/acm/api/acm/cit/modify/batch?cacheBuster=${Date.now()}`

    await apiService.post(url, saveData)
    ElMessage.success('保存成功')
    emit('saved')
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败: ' + (error.response?.data?.message || error.message))
  } finally {
    saving.value = false
  }
}

// 返回
const handleBack = () => {
  emit('back')
}

// 监听 modelId 变化重新加载
watch(
  () => props.modelId,
  () => {
    loadModelDetail()
  }
)

// 初始化
onMounted(() => {
  loadModelDetail()
})
</script>

<style scoped lang="scss">
.model-editor-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f7fa;
  overflow: hidden;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  padding-top: 0;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
  z-index: 10;

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;

    .page-title {
      font-size: 16px;
      font-weight: 600;
      color: #303133;
    }

    .model-name {
      color: #909399;
    }
  }

  .header-right {
    display: flex;
    gap: 8px;
  }
}

.page-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.editor-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  overflow: hidden;

  :deep(.el-tabs__header) {
    flex-shrink: 0;
    margin: 0;
  }

  :deep(.el-tabs__content) {
    flex: 1;
    padding: 0;
  }

  :deep(.el-tab-pane) {
    height: auto;
  }
}

.tab-content {
  padding: 16px;

  &.attrs-tab {
    padding: 0;
    height: calc(100vh - 200px);
    display: flex;
    flex-direction: column;
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
  height: 100%;
}

.attrs-left {
  flex: 1;
  min-width: 0;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.attrs-toolbar {
  padding: 12px;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
}

.attrs-groups {
  flex: 1;
  overflow-y: auto;
}

.empty-groups {
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
    margin: 0 0 16px 0;
  }
}

.attr-group {
  border-bottom: 1px solid #ebeef5;

  &:last-child {
    border-bottom: none;
  }
}

.group-header {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  background: #fafafa;
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
    flex-shrink: 0;
  }

  .group-title {
    flex: 1;
    margin-left: 8px;
    font-weight: 500;
    color: #303133;
  }

  .group-title-input {
    width: 200px;
    margin-left: 8px;

    &.editing {
      display: block;
    }
  }

  .group-edit {
    opacity: 0;
    transition: opacity 0.2s;
    flex-shrink: 0;
    margin-left: 8px;
  }

  &:hover .group-edit {
    opacity: 1;
  }

  .group-delete {
    opacity: 0;
    transition: opacity 0.2s;
    flex-shrink: 0;
    margin-left: 8px;
  }

  &:hover .group-delete {
    opacity: 1;
  }
}

.group-attrs {
  background: #fff;
}

.attr-item {
  display: flex;
  align-items: center;
  padding: 8px 12px 8px 36px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #f5f7fa;
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
  width: 320px;
  flex-shrink: 0;
}

.setting-panel {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 12px 16px;
  background: #409eff;
  color: #fff;
  font-weight: 500;
  flex-shrink: 0;
}

.panel-body {
  flex: 1;
  overflow-y: auto;

  :deep(.el-collapse) {
    border: none;

    .el-collapse-item__header {
      padding: 0 16px;
      background: #f5f7fa;
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

  .datatype-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;

    .delim-label {
      margin-left: 8px;
      color: #606266;
      font-size: 13px;
    }
  }
}

.panel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;

  i {
    font-size: 48px;
    margin-bottom: 16px;
  }

  p {
    margin: 0;
  }
}

.view-desc {
  font-size: 13px;
  color: #909399;
  margin-bottom: 12px;
}

// 视图定义样式
.views-tab {
  .views-toolbar {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 20px;
  }

  .view-btn-group {
    display: flex;

    .el-button:first-child {
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
    }

    .view-config-btn {
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
      margin-left: -1px;
      padding: 8px 10px;
    }
  }

  .view-columns-config,
  .view-data-config {
    border: 1px solid #ebeef5;
    border-radius: 4px;
    padding: 16px;
    background: #fafafa;
  }

  .view-config-header {
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 12px;

    .view-config-title {
      font-size: 14px;
      font-weight: 500;
      color: #303133;
    }

    .view-config-tip {
      font-size: 12px;
      color: #909399;
    }
  }

  .data-converter-wrapper {
    background: #fff;
    border: 1px solid #ebeef5;
    border-radius: 4px;
    padding: 12px;
  }

  .view-no-config {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 60px 20px;
    background: #fafafa;
    border: 1px dashed #dcdfe6;
    border-radius: 4px;
    color: #909399;

    i {
      font-size: 16px;
    }
  }
}
</style>
