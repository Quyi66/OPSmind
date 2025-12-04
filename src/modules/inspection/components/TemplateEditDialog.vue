<template>
  <el-dialog
    :model-value="visible"
    :title="isEdit ? '编辑模板' : '新建模板'"
    width="800px"
    :close-on-click-modal="false"
    @update:model-value="handleVisibleChange"
    @close="handleClose"
  >
    <el-form ref="formRef" :model="formData" :rules="rules" label-position="top">
      <!-- 名称 -->
      <el-form-item label="名称" prop="templateName">
        <el-input v-model="formData.templateName" placeholder="请输入模板名称" />
      </el-form-item>

      <!-- 描述 -->
      <el-form-item label="描述" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          placeholder="请输入描述"
        />
      </el-form-item>

      <!-- 图标 -->
      <el-form-item label="图标" prop="icon">
        <div class="icon-selector">
          <div class="icon-preview" @click="showIconPicker = !showIconPicker">
            <i :class="getIconClass(formData.icon)" />
          </div>
          <el-popover
            v-model:visible="showIconPicker"
            placement="bottom-start"
            :width="400"
            trigger="click"
          >
            <template #reference>
              <el-button size="small" class="ml-2">选择图标</el-button>
            </template>
            <div class="icon-picker-content">
              <el-input
                v-model="iconSearch"
                placeholder="搜索图标"
                prefix-icon="Search"
                size="small"
                class="mb-2"
              />
              <div class="icon-grid">
                <div
                  v-for="icon in filteredIcons"
                  :key="icon"
                  class="icon-item"
                  :class="{ active: formData.icon === icon }"
                  @click="selectIcon(icon)"
                >
                  <i :class="'fas ' + icon" />
                </div>
              </div>
            </div>
          </el-popover>
        </div>
      </el-form-item>

      <!-- 巡检参数区域 -->
      <div class="audit-params-section">
        <div class="params-header">
          <span><i class="fa fa-laptop"></i> 主机 <strong>{{ totalHosts }}</strong></span>
          <span class="ml-4"><i class="fa fa-file-code"></i> 脚本 <strong>{{ totalScripts }}</strong></span>
        </div>

        <div class="params-body">
          <!-- 脚本选择 -->
          <el-form-item label="脚本" prop="scripts">
            <div class="script-selector">
              <div v-if="formData.scripts.length === 0" class="empty-placeholder" @click="openScriptSelector">
                <i class="fal fa-file-alt empty-icon" />
                <el-button size="small">选择文件</el-button>
              </div>
              <div v-else class="selected-scripts">
                <div class="script-header">
                  <el-button size="small" @click="openScriptSelector">
                    共 <strong>{{ formData.scripts.length }}</strong> 个文件
                  </el-button>
                </div>
                <el-table :data="formData.scripts" size="small" class="script-table">
                  <el-table-column prop="scriptPath" label="脚本路径" min-width="200">
                    <template #default="{ row }">
                      <span>{{ row.scriptPath }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="脚本参数" min-width="150">
                    <template #default="{ row }">
                      <el-input
                        v-model="row.scriptParams"
                        size="small"
                        placeholder="脚本参数"
                      />
                    </template>
                  </el-table-column>
                  <el-table-column width="60" align="center">
                    <template #default="{ $index }">
                      <el-button
                        type="danger"
                        link
                        size="small"
                        @click="removeScript($index)"
                      >
                        <i class="fa fa-minus"></i>
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </el-form-item>

          <!-- 主机选择 -->
          <el-form-item label="主机" prop="hosts">
            <div class="host-selector">
              <div v-if="formData.hosts.length === 0" class="empty-host">
                <el-button @click="openHostSelector">
                  <i class="fal fa-server"></i> 选择
                </el-button>
              </div>
              <div v-else class="selected-hosts">
                <div class="host-header">
                  <el-button size="small" class="host-count-btn" @click="openHostSelector">
                    共 <strong>{{ formData.hosts.length }}</strong> 项
                  </el-button>
                  <el-input
                    v-model="hostFilter"
                    placeholder="搜索"
                    size="small"
                    class="host-search"
                    clearable
                  />
                </div>
                <div class="host-list">
                  <el-tag
                    v-for="(host, index) in filteredHosts"
                    :key="host.key"
                    closable
                    size="small"
                    class="host-tag"
                    @close="removeHost(index)"
                  >
                    {{ host.value }}
                  </el-tag>
                </div>
              </div>
            </div>
          </el-form-item>
        </div>
      </div>
    </el-form>

    <template #footer>
      <el-button type="primary" :loading="saving" @click="handleSave">
        <i class="fa fa-check"></i> 保存
      </el-button>
      <el-button @click="handleClose">
        <i class="fa fa-undo"></i> 返回
      </el-button>
    </template>

    <!-- 脚本选择弹窗 -->
    <ScriptSelectorDialog
      :visible="scriptSelectorVisible"
      :selected="formData.scripts"
      @update:visible="scriptSelectorVisible = $event"
      @confirm="handleScriptConfirm"
    />

    <!-- 主机选择弹窗 -->
    <HostSelectorDialog
      :visible="hostSelectorVisible"
      :selected="formData.hosts"
      @update:visible="hostSelectorVisible = $event"
      @confirm="handleHostConfirm"
    />
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { templateApi } from '../api'
import ScriptSelectorDialog from './ScriptSelectorDialog.vue'
import HostSelectorDialog from './HostSelectorDialog.vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  templateId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:visible', 'success'])

// 表单引用
const formRef = ref(null)

// 状态
const saving = ref(false)
const showIconPicker = ref(false)
const iconSearch = ref('')
const hostFilter = ref('')
const scriptSelectorVisible = ref(false)
const hostSelectorVisible = ref(false)

// 原始模板数据（用于编辑时保留所有属性）
const originalTemplate = ref(null)

// 是否编辑模式
const isEdit = computed(() => !!props.templateId)

// 表单数据
const formData = ref({
  templateName: '',
  description: '',
  icon: 'fa-server',
  scripts: [],
  hosts: []
})

// 表单验证规则
const rules = {
  templateName: [
    { required: true, message: '请输入模板名称', trigger: 'blur' }
  ]
}

// 常用图标列表
const commonIcons = [
  'fa-server', 'fa-laptop', 'fa-desktop', 'fa-database', 'fa-cloud',
  'fa-network-wired', 'fa-hdd', 'fa-microchip', 'fa-memory', 'fa-ethernet',
  'fa-cog', 'fa-cogs', 'fa-tools', 'fa-wrench', 'fa-shield-alt',
  'fa-check-circle', 'fa-chart-line', 'fa-tasks', 'fa-clipboard-list', 'fa-file-alt',
  'fa-folder', 'fa-archive', 'fa-box', 'fa-cube', 'fa-cubes',
  'fa-address-book', 'fa-address-card', 'fa-apple-alt', 'fa-file-video', 'fa-list-alt'
]

// 过滤后的图标
const filteredIcons = computed(() => {
  if (!iconSearch.value) return commonIcons
  return commonIcons.filter(icon =>
    icon.toLowerCase().includes(iconSearch.value.toLowerCase())
  )
})

// 过滤后的主机
const filteredHosts = computed(() => {
  if (!hostFilter.value) return formData.value.hosts
  const keyword = hostFilter.value.toLowerCase()
  return formData.value.hosts.filter(host =>
    host.value?.toLowerCase().includes(keyword)
  )
})

// 计算主机总数
const totalHosts = computed(() => formData.value.hosts.length)

// 计算脚本总数
const totalScripts = computed(() => formData.value.scripts.length)

/**
 * 获取图标类名
 */
function getIconClass(icon) {
  if (!icon) return 'fas fa-server'
  if (icon.startsWith('fas ') || icon.startsWith('far ') || icon.startsWith('fad ')) {
    return icon
  }
  return `fas ${icon}`
}

/**
 * 选择图标
 */
function selectIcon(icon) {
  formData.value.icon = icon
  showIconPicker.value = false
}

/**
 * 打开脚本选择器
 */
function openScriptSelector() {
  scriptSelectorVisible.value = true
}

/**
 * 打开主机选择器
 */
function openHostSelector() {
  hostSelectorVisible.value = true
}

/**
 * 脚本选择确认
 */
function handleScriptConfirm(scripts) {
  formData.value.scripts = scripts.map(s => ({
    scriptPath: s.scriptPath || s.path,
    scriptName: s.scriptName || s.name || s.path,
    scriptParams: s.scriptParams || ''
  }))
}

/**
 * 主机选择确认
 */
function handleHostConfirm(hosts) {
  formData.value.hosts = hosts.map(h => ({
    key: h.key || h.id,
    value: h.value || h.name || h.hostName,
    assetType: h.assetType || 'linux'
  }))
}

/**
 * 移除脚本
 */
function removeScript(index) {
  formData.value.scripts.splice(index, 1)
}

/**
 * 移除主机
 */
function removeHost(index) {
  const realIndex = formData.value.hosts.findIndex(
    h => h.key === filteredHosts.value[index].key
  )
  if (realIndex > -1) {
    formData.value.hosts.splice(realIndex, 1)
  }
}

/**
 * 加载模板数据
 */
async function loadTemplate() {
  if (!props.templateId) return

  try {
    const response = await templateApi.getTemplateById(props.templateId)
    const template = response?.data || response

    // 保存原始模板数据
    originalTemplate.value = { ...template }

    formData.value.templateName = template.templateName || ''
    formData.value.description = template.description || ''
    formData.value.icon = template.icon || 'fa-server'

    // 解析 auditParams
    let auditParams = []
    try {
      auditParams = typeof template.auditParams === 'string'
        ? JSON.parse(template.auditParams)
        : (template.auditParams || [])
    } catch {
      auditParams = []
    }

    // 提取脚本和主机
    if (auditParams.length > 0) {
      formData.value.scripts = auditParams[0].scripts || []
      formData.value.hosts = auditParams[0].hosts || []
    }
  } catch (error) {
    console.error('Failed to load template:', error)
    ElMessage.error('加载模板失败')
  }
}

/**
 * 保存模板
 */
async function handleSave() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    // 构建 auditParams
    const auditParams = JSON.stringify([{
      scripts: formData.value.scripts.map(s => ({
        scriptPath: s.scriptPath,
        scriptParams: s.scriptParams || '',
        scriptName: s.scriptName || s.scriptPath
      })),
      hosts: formData.value.hosts,
      ruleExpressions: []
    }])

    let payload
    if (isEdit.value && originalTemplate.value) {
      // 编辑模式：合并原始模板的所有属性
      payload = {
        ...originalTemplate.value,
        templateName: formData.value.templateName,
        description: formData.value.description,
        icon: formData.value.icon,
        auditParams
      }
    } else {
      // 新建模式
      payload = {
        templateName: formData.value.templateName,
        description: formData.value.description,
        icon: formData.value.icon,
        auditParams
      }
    }

    await templateApi.createTemplate(payload)
    ElMessage.success(isEdit.value ? '模板更新成功' : '模板创建成功')

    emit('success')
    handleClose()
  } catch (error) {
    console.error('Failed to save template:', error)
    ElMessage.error(isEdit.value ? '更新失败' : '创建失败')
  } finally {
    saving.value = false
  }
}

/**
 * 弹窗显示状态变化
 */
function handleVisibleChange(val) {
  emit('update:visible', val)
}

/**
 * 关闭弹窗
 */
function handleClose() {
  emit('update:visible', false)
  resetForm()
}

/**
 * 重置表单
 */
function resetForm() {
  formData.value = {
    templateName: '',
    description: '',
    icon: 'fa-server',
    scripts: [],
    hosts: []
  }
  originalTemplate.value = null
  formRef.value?.resetFields()
  iconSearch.value = ''
  hostFilter.value = ''
}

// 监听 visible 变化
watch(() => props.visible, (val) => {
  if (val) {
    if (props.templateId) {
      loadTemplate()
    } else {
      resetForm()
    }
  }
})
</script>

<style scoped lang="scss">
.icon-selector {
  display: flex;
  align-items: center;
  gap: 12px;
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

  i {
    font-size: 20px;
    color: #606266;
  }

  &:hover {
    border-color: #409eff;
  }
}

.icon-picker-content {
  .icon-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 8px;
    max-height: 200px;
    overflow-y: auto;
  }

  .icon-item {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #ebeef5;
    border-radius: 4px;
    cursor: pointer;

    i {
      font-size: 16px;
      color: #606266;
    }

    &:hover {
      border-color: #409eff;
      background: #ecf5ff;
    }

    &.active {
      border-color: #409eff;
      background: #409eff;

      i {
        color: #fff;
      }
    }
  }
}

.audit-params-section {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;
}

.params-header {
  background: #f5f7fa;
  padding: 12px 16px;
  border-bottom: 1px solid #ebeef5;
  font-size: 14px;

  i {
    margin-right: 4px;
    color: #909399;
  }

  strong {
    font-size: 16px;
    color: #303133;
    margin-left: 4px;
  }

  .ml-4 {
    margin-left: 24px;
  }
}

.params-body {
  padding: 16px;
}

.script-selector {
  width: 100%;
}

.empty-placeholder {
  background: #f5f7fa;
  padding: 40px;
  text-align: center;
  border-radius: 4px;
  cursor: pointer;

  .empty-icon {
    font-size: 48px;
    color: #c0c4cc;
    display: block;
    margin-bottom: 12px;
  }
}

.selected-scripts {
  .script-header {
    margin-bottom: 8px;
  }

  .script-table {
    border: 1px solid #ebeef5;
  }
}

.host-selector {
  width: 100%;
}

.empty-host {
  .el-button {
    i {
      margin-right: 4px;
    }
  }
}

.selected-hosts {
  .host-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;

    .host-search {
      width: 150px;
      margin-left: auto;
    }
  }

  .host-list {
    max-height: 120px;
    overflow-y: auto;

    .host-tag {
      margin: 2px 4px 2px 0;
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
