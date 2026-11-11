<template>
  <el-dialog
    :model-value="visible"
    :title="isEdit ? '编辑巡检模板' : '新建巡检模板'"
    width="820px"
    :close-on-click-modal="false"
    @update:model-value="handleVisibleChange"
    @close="handleClose"
    :close-on-press-escape="false"
  >
    <el-form ref="formRef" :model="formData" :rules="rules" label-position="top" class="template-edit-form">
      <!-- 基础信息区块 -->
      <section class="config-section-card">
        <div class="section-card-header">
          <div class="section-card-title">
            <span class="section-step-badge">1</span>
            <div>
              <h3>基础标识信息</h3>
              <p>定义巡检模板的名称、识别图标与适用场景说明。</p>
            </div>
          </div>
        </div>
        <div class="section-card-body">
          <div class="basic-meta-grid">
            <el-form-item label="模板名称" prop="templateName" class="name-form-item">
              <el-input
                v-model="formData.templateName"
                placeholder="请输入巡检模板名称（如：Linux 基线合规检查）"
                maxlength="100"
                show-word-limit
              />
            </el-form-item>

            <el-form-item label="模板图标" prop="icon" class="icon-form-item">
              <div class="icon-selector">
                <div class="icon-preview">
                  <i :class="getIconClass(formData.icon)" />
                </div>
                <el-popover
                  v-model:visible="showIconPicker"
                  placement="bottom-end"
                  :width="380"
                  trigger="click"
                >
                  <template #reference>
                    <el-button size="small">更换图标</el-button>
                  </template>
                  <div class="icon-picker-content">
                    <el-input
                      v-model="iconSearch"
                      placeholder="搜索图标名称..."
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
          </div>

          <el-form-item label="场景描述" prop="description" class="mb-0">
            <el-input
              v-model="formData.description"
              type="textarea"
              :rows="2"
              placeholder="简要说明该巡检模板覆盖的系统类型、检查基线或业务范围"
            />
          </el-form-item>
        </div>
      </section>

      <!-- 脚本与参数区块 -->
      <section class="config-section-card">
        <div class="section-card-header">
          <div class="section-card-title">
            <span class="section-step-badge">2</span>
            <div>
              <h3>巡检剧本与运行参数</h3>
              <p>从脚本库关联巡检 Playbook 或脚本文件，并按需配置运行时参数。</p>
            </div>
          </div>
          <div class="section-card-actions">
            <span class="config-count-pill">
              已选 <strong>{{ formData.scripts.length }}</strong> 个脚本
            </span>
            <el-button type="primary" plain size="small" @click="openScriptSelector">
              <i class="fas fa-folder-open" aria-hidden="true"></i>
              {{ formData.scripts.length ? '重新选择脚本' : '选择巡检脚本' }}
            </el-button>
          </div>
        </div>
        <div class="section-card-body">
          <el-form-item prop="scripts" class="mb-0">
            <div class="script-selector">
              <div
                v-if="formData.scripts.length === 0"
                class="script-empty-box"
                @click="openScriptSelector"
              >
                <div class="script-empty-icon">
                  <i class="fas fa-file-code" aria-hidden="true" />
                </div>
                <div class="script-empty-text">
                  <span>暂未关联巡检脚本</span>
                  <small>点击此处从 GFS 脚本库中选择 Playbook 或巡检脚本</small>
                </div>
                <el-button size="small" type="primary" plain>选择脚本</el-button>
              </div>
              <div v-else class="selected-scripts">
                <el-table :data="formData.scripts" size="small" class="script-table" max-height="260px">
                  <el-table-column prop="scriptPath" label="巡检脚本路径" min-width="220">
                    <template #default="{ row }">
                      <el-tooltip :content="row.scriptPath || '未提供路径'" placement="top">
                        <span class="script-path-badge">
                          <i class="fas fa-file-code" aria-hidden="true"></i>
                          {{ getInspectionScriptLabel(row) }}
                        </span>
                      </el-tooltip>
                    </template>
                  </el-table-column>
                  <el-table-column label="运行参数（可选）" min-width="180">
                    <template #default="{ row }">
                      <el-input
                        v-model="row.scriptParams"
                        size="small"
                        placeholder="例如：--extra-vars 'env=prod'"
                      />
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="68" align="center">
                    <template #default="{ $index }">
                      <el-button
                        type="danger"
                        link
                        size="small"
                        title="移除该脚本"
                        @click="removeScript($index)"
                      >
                        移除
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </el-form-item>
        </div>
      </section>

      <!-- 主机选择区块 -->
      <section class="config-section-card">
        <div class="section-card-header">
          <div class="section-card-title">
            <span class="section-step-badge">3</span>
            <div>
              <h3>默认巡检资产范围</h3>
              <p>配置该模板默认覆盖的目标主机、分组或资产标签。</p>
            </div>
          </div>
          <div class="section-card-actions">
            <span class="config-count-pill">
              已配置 <strong>{{ formData.hosts.length }}</strong> 项资产
            </span>
          </div>
        </div>
        <div class="section-card-body">
          <el-form-item prop="hosts" class="mb-0">
            <AcmDeviceSelector
              v-model="formData.hosts"
              ci-types="[auto]"
              :options="{
                selectMode: 'host,group,tag,input,recently',
                selector: 'multiple',
                label: '选择巡检主机'
              }"
            />
          </el-form-item>
        </div>
      </section>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">保存模板</el-button>
    </template>

    <!-- 脚本选择弹窗 -->
    <ScriptSelectorDialog
      :visible="scriptSelectorVisible"
      :selected="formData.scripts"
      @update:visible="scriptSelectorVisible = $event"
      @confirm="handleScriptConfirm"
    />
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { templateApi } from '../../api'
import { getInspectionScriptLabel } from '../../utils/scriptPresentation'
import ScriptSelectorDialog from './ScriptSelectorDialog.vue'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import { normalizeAcmDeviceSelection } from '@/modules/automation/components/job/schedule/components/acmDeviceSelector.utils'

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
  templateName: [{ required: true, message: '请输入模板名称', trigger: 'blur' }]
}

// 常用图标列表
const commonIcons = [
  'fa-server',
  'fa-laptop',
  'fa-desktop',
  'fa-database',
  'fa-cloud',
  'fa-network-wired',
  'fa-hdd',
  'fa-microchip',
  'fa-memory',
  'fa-ethernet',
  'fa-cog',
  'fa-cogs',
  'fa-tools',
  'fa-wrench',
  'fa-shield-alt',
  'fa-check-circle',
  'fa-chart-line',
  'fa-tasks',
  'fa-clipboard-list',
  'fa-file-alt',
  'fa-folder',
  'fa-archive',
  'fa-box',
  'fa-cube',
  'fa-cubes',
  'fa-address-book',
  'fa-address-card',
  'fa-apple-alt',
  'fa-file-video',
  'fa-list-alt'
]

// 过滤后的图标
const filteredIcons = computed(() => {
  if (!iconSearch.value) return commonIcons
  return commonIcons.filter(icon => icon.toLowerCase().includes(iconSearch.value.toLowerCase()))
})

// 过滤后的主机
const filteredHosts = computed(() => {
  if (!hostFilter.value) return formData.value.hosts
  const keyword = hostFilter.value.toLowerCase()
  return formData.value.hosts.filter(host => host.value?.toLowerCase().includes(keyword))
})

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
  if (!props.visible || !scriptSelectorVisible.value) return
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
  const realIndex = formData.value.hosts.findIndex(h => h.key === filteredHosts.value[index].key)
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
      auditParams =
        typeof template.auditParams === 'string'
          ? JSON.parse(template.auditParams)
          : template.auditParams || []
    } catch {
      auditParams = []
    }

    // 提取脚本和主机
    if (auditParams.length > 0) {
      formData.value.scripts = auditParams[0].scripts || []
      formData.value.hosts = normalizeAcmDeviceSelection(auditParams[0].hosts, 'linux')
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
    const auditParams = JSON.stringify([
      {
        scripts: formData.value.scripts.map(s => ({
          scriptPath: s.scriptPath,
          scriptParams: s.scriptParams || '',
          scriptName: s.scriptName || s.scriptPath
        })),
        hosts: formData.value.hosts,
        ruleExpressions: []
      }
    ])

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
  if (!val) scriptSelectorVisible.value = false
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
  scriptSelectorVisible.value = false
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

// 主表单关闭或切换模板后，不再接收旧选择器的确认。
watch(
  () => [props.visible, props.templateId],
  () => {
    scriptSelectorVisible.value = false
  },
  { flush: 'sync' }
)

// 监听 visible 变化
watch(
  () => props.visible,
  val => {
    if (val) {
      if (props.templateId) {
        loadTemplate()
      } else {
        resetForm()
      }
    }
  }
)
</script>

<style scoped lang="scss">
.template-edit-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.config-section-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  overflow: hidden;
}

.section-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 12px 16px;
  background: var(--el-fill-color-blank);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.section-card-title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;

  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  p {
    margin: 2px 0 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.section-step-badge {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.section-card-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  i {
    margin-right: 5px;
  }
}

.config-count-pill {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  padding: 3px 10px;
  border-radius: 999px;
  strong {
    color: var(--el-color-primary);
    font-variant-numeric: tabular-nums;
  }
}

.section-card-body {
  padding: 14px 16px;
}

.basic-meta-grid {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  align-items: start;
}

.name-form-item {
  margin-bottom: 12px;
}

.icon-form-item {
  margin-bottom: 12px;
}

.mb-0 {
  margin-bottom: 0 !important;
}

.icon-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}

.icon-preview {
  width: 36px;
  height: 36px;
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-lighter);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;

  i {
    font-size: 18px;
    color: var(--el-color-primary);
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
    border: 1px solid var(--el-border-color-light);
    border-radius: 6px;
    cursor: pointer;

    i {
      font-size: 16px;
      color: var(--el-text-color-regular);
    }

    &:hover {
      border-color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
    }

    &.active {
      border-color: var(--el-color-primary);
      background: var(--el-color-primary);

      i {
        color: #fff;
      }
    }
  }
}

.script-selector {
  width: 100%;
}

.script-empty-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  background: var(--el-fill-color-lighter);
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s;

  &:hover {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
}

.script-empty-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-color-primary);
  font-size: 16px;
  flex-shrink: 0;
}

.script-empty-text {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  span {
    font-size: 13px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }
  small {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.selected-scripts {
  .script-table {
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
    overflow: hidden;
  }
}

.script-path-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--el-font-family-mono, monospace);
  font-size: 12px;
  color: var(--el-text-color-primary);
  i {
    color: var(--el-color-primary);
  }
}

.mb-2 {
  margin-bottom: 8px;
}
</style>
