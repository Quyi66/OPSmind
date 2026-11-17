<template>
  <el-dialog
    :model-value="visible"
    :title="isEdit ? t('inspection.templates.editTitle') : t('inspection.templates.createTitle')"
    width="820px"
    :close-on-click-modal="false"
    @update:model-value="handleVisibleChange"
    @close="handleClose"
    :close-on-press-escape="false"
  >
    <el-form ref="formRef" :model="formData" :rules="rules" :validate-on-rule-change="false" label-position="top" class="template-edit-form">
      <!-- 基础信息区块 -->
      <section class="config-section-card">
        <div class="section-card-header">
          <div class="section-card-title">
            <span class="section-step-badge">1</span>
            <div>
              <h3>{{ t('inspection.templates.identityHeading') }}</h3>
              <p>{{ t('inspection.templates.identityHint') }}</p>
            </div>
          </div>
        </div>
        <div class="section-card-body">
          <div class="basic-meta-grid">
            <el-form-item :label="t('inspection.email.templateName')" prop="templateName" class="name-form-item">
              <el-input
                v-model="formData.templateName"
                :placeholder="t('inspection.templates.namePlaceholder')"
                maxlength="100"
                show-word-limit
              />
            </el-form-item>

            <el-form-item :label="t('inspection.templates.icon')" prop="icon" class="icon-form-item">
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
                    <el-button size="small">{{ t('inspection.templates.changeIcon') }}</el-button>
                  </template>
                  <div class="icon-picker-content">
                    <el-input
                      v-model="iconSearch"
                      :placeholder="t('inspection.templates.searchIcons')"
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

          <el-form-item :label="t('inspection.templates.scenarioDescription')" prop="description" class="mb-0">
            <el-input
              v-model="formData.description"
              type="textarea"
              :rows="2"
              :placeholder="t('inspection.templates.descriptionPlaceholder')"
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
              <h3>{{ t('inspection.templates.scriptsHeading') }}</h3>
              <p>{{ t('inspection.templates.scriptsHint') }}</p>
            </div>
          </div>
          <div class="section-card-actions">
            <span class="config-count-pill">
              <I18nT keypath="inspection.templates.selectedScripts" :plural="formData.scripts.length" :i18n="i18n.global">
                <template #count><strong>{{ formData.scripts.length }}</strong></template>
              </I18nT>
            </span>
            <el-button type="primary" plain size="small" @click="openScriptSelector">
              <i class="fas fa-folder-open" aria-hidden="true"></i>
              {{ formData.scripts.length ? t('inspection.templates.chooseScriptAgain') : t('inspection.templates.selectInspectionScripts') }}
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
                  <span>{{ t('inspection.templates.noScripts') }}</span>
                  <small>{{ t('inspection.templates.selectScriptsHint') }}</small>
                </div>
                <el-button size="small" type="primary" plain>{{ t('inspection.templates.selectScript') }}</el-button>
              </div>
              <div v-else class="selected-scripts">
                <el-table :data="formData.scripts" size="small" class="script-table" max-height="260px">
                  <el-table-column prop="scriptPath" :label="t('inspection.templates.scriptPath')" min-width="220">
                    <template #default="{ row }">
                      <el-tooltip :content="row.scriptPath || t('inspection.templates.pathMissing')" placement="top">
                        <span class="script-path-badge">
                          <i class="fas fa-file-code" aria-hidden="true"></i>
                          {{ getInspectionScriptLabel(row) }}
                        </span>
                      </el-tooltip>
                    </template>
                  </el-table-column>
                  <el-table-column :label="t('inspection.templates.optionalParameters')" min-width="180">
                    <template #default="{ row }">
                      <el-input
                        v-model="row.scriptParams"
                        size="small"
                        :placeholder="t('inspection.templates.parametersExample')"
                      />
                    </template>
                  </el-table-column>
                  <el-table-column :label="t('common.actions')" :width="currentLocale === 'en-US' ? 96 : 68" align="center">
                    <template #default="{ $index }">
                      <el-button
                        type="danger"
                        link
                        size="small"
                        :title="t('inspection.templates.removeScript')"
                        @click="removeScript($index)"
                      >
                        {{ t('common.remove') }}
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
              <h3>{{ t('inspection.templates.defaultAssets') }}</h3>
              <p>{{ t('inspection.templates.defaultAssetsHint') }}</p>
            </div>
          </div>
          <div class="section-card-actions">
            <span class="config-count-pill">
              <I18nT keypath="inspection.templates.configuredAssets" :plural="formData.hosts.length" :i18n="i18n.global">
                <template #count><strong>{{ formData.hosts.length }}</strong></template>
              </I18nT>
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
                label: t('inspection.templates.selectHosts')
              }"
            />
          </el-form-item>
        </div>
      </section>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">{{ t('inspection.templates.saveTemplate') }}</el-button>
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
import { t, i18n, currentLocale } from '@/core/i18n'
import { useLocalizedValidation } from '@/core/i18n/validation'
import { I18nT } from 'vue-i18n'
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
useLocalizedValidation(formRef)

const rules = computed(() => ({
  templateName: [{ required: true, message: t('inspection.templates.enterName'), trigger: 'blur' }]
}))

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
    ElMessage.error(t('inspection.templates.loadFailed'))
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
    ElMessage.success(isEdit.value ? t('inspection.templates.updated') : t('inspection.templates.created'))

    emit('success')
    handleClose()
  } catch (error) {
    console.error('Failed to save template:', error)
    ElMessage.error(isEdit.value ? t('inspection.templates.updateFailed') : t('inspection.templates.createFailed'))
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
