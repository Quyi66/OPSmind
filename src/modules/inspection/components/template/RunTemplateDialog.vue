<template>
  <el-dialog
    :model-value="visible"
    :title="t('inspection.templates.startTitle')"
    width="820px"
    :close-on-click-modal="false"
    @update:model-value="handleVisibleChange"
    @close="handleClose"
    :close-on-press-escape="false"
  >
    <div class="run-summary-banner">
      <div class="banner-main">
        <div class="banner-title">
          <i class="fas fa-bolt" aria-hidden="true"></i>
          <span>{{ t('inspection.templates.reviewConfiguration') }}</span>
        </div>
        <p>{{ t('inspection.templates.runConfigurationHint') }}</p>
      </div>
      <div class="banner-metrics">
        <div class="banner-metric-item">
          <span class="metric-dot metric-dot--primary"></span>
          <span>{{ t('inspection.templates.targetHostEntries') }}</span>
          <strong>{{ totalHosts }}</strong>
        </div>
        <div class="banner-metric-item">
          <span class="metric-dot metric-dot--success"></span>
          <span>{{ t('inspection.templates.linkedScriptCount') }}</span>
          <strong>{{ totalScripts }}</strong>
        </div>
      </div>
    </div>

    <el-form ref="formRef" :model="formData" :rules="rules" :validate-on-rule-change="false" label-position="top" class="run-template-form">
      <!-- 任务基础信息 -->
      <section class="config-section-card">
        <div class="section-card-header">
          <div class="section-card-title">
            <span class="section-step-badge">1</span>
            <div>
              <h3>{{ t('inspection.templates.taskIdentity') }}</h3>
              <p>{{ t('inspection.templates.taskIdentityHint') }}</p>
            </div>
          </div>
        </div>
        <div class="section-card-body">
          <div class="form-row-grid">
            <el-form-item :label="t('inspection.email.templateName')" prop="templateName" class="mb-0">
              <el-input v-model="formData.templateName" :placeholder="t('inspection.templates.enterName')" />
            </el-form-item>
            <el-form-item :label="t('inspection.templates.scenarioNotes')" prop="description" class="mb-0">
              <el-input
                v-model="formData.description"
                :placeholder="t('inspection.templates.runNotesPlaceholder')"
              />
            </el-form-item>
          </div>
        </div>
      </section>

      <!-- 脚本与主机配置 -->
      <section class="config-section-card">
        <div class="section-card-header">
          <div class="section-card-title">
            <span class="section-step-badge">2</span>
            <div>
              <h3>{{ t('inspection.templates.scriptsHeading') }}</h3>
              <p>{{ t('inspection.templates.checkScriptsHint') }}</p>
            </div>
          </div>
          <div class="section-card-actions">
            <span class="config-count-pill">
              <I18nT keypath="inspection.templates.selectedFiles" :plural="formData.scripts.length" :i18n="i18n.global">
                <template #count><strong>{{ formData.scripts.length }}</strong></template>
              </I18nT>
            </span>
            <el-button type="primary" plain size="small" @click="openScriptSelector">
              <i class="fas fa-folder-open" aria-hidden="true"></i>
              {{ t('inspection.templates.changeScripts') }}
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
                  <small>{{ t('inspection.templates.selectRunScripts') }}</small>
                </div>
                <el-button size="small" type="primary" plain>{{ t('inspection.templates.selectFiles') }}</el-button>
              </div>
              <div v-else class="selected-scripts">
                <el-table
                  :data="formData.scripts"
                  size="small"
                  class="script-table"
                  max-height="260px"
                >
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
                  <el-table-column :label="t('inspection.templates.runParameters')" min-width="180">
                    <template #default="{ row }">
                      <el-input v-model="row.scriptParams" size="small" :placeholder="t('inspection.templates.scriptParameters')" />
                    </template>
                  </el-table-column>
                  <el-table-column :label="t('common.actions')" width="68" align="center">
                    <template #default="{ $index }">
                      <el-button type="danger" link size="small" @click="removeScript($index)">
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

      <!-- 目标主机 -->
      <section class="config-section-card">
        <div class="section-card-header">
          <div class="section-card-title">
            <span class="section-step-badge">3</span>
            <div>
              <h3>{{ t('inspection.templates.runTargets') }}</h3>
              <p>{{ t('inspection.templates.runTargetsHint') }}</p>
            </div>
          </div>
          <div class="section-card-actions">
            <span class="config-count-pill">
              <I18nT keypath="inspection.templates.selectedHostConfigurations" :plural="totalHosts" :i18n="i18n.global">
                <template #count><strong>{{ totalHosts }}</strong></template>
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
      <el-button type="primary" :loading="running" @click="handleRun">{{ t('inspection.templates.runNow') }}</el-button>
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
import { t, i18n } from '@/core/i18n'
import { useLocalizedValidation } from '@/core/i18n/validation'
import { I18nT } from 'vue-i18n'
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { templateApi, jobApi } from '../../api'
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
const running = ref(false)
const hostFilter = ref('')
const scriptSelectorVisible = ref(false)
const hostSelectorVisible = ref(false)

// 原始模板数据
const originalTemplate = ref(null)

// 表单数据
const formData = ref({
  templateName: '',
  description: '',
  scripts: [],
  hosts: []
})

// 表单验证规则
useLocalizedValidation(formRef)

const rules = computed(() => ({
  templateName: [{ required: true, message: t('inspection.templates.enterName'), trigger: 'blur' }]
}))

// 过滤后的主机
const filteredHosts = computed(() => {
  if (!hostFilter.value) return formData.value.hosts
  const keyword = hostFilter.value.toLowerCase()
  return formData.value.hosts.filter(host => host.value?.toLowerCase().includes(keyword))
})

// 计算主机总数
const totalHosts = computed(() => formData.value.hosts.length)

// 计算脚本总数
const totalScripts = computed(() => formData.value.scripts.length)

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
 * 执行巡检
 */
async function handleRun() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  // 验证
  if (formData.value.hosts.length === 0) {
    ElMessage.error(t('inspection.templates.selectHostFirst'))
    return
  }
  if (formData.value.scripts.length === 0) {
    ElMessage.error(t('inspection.templates.selectScriptFirst'))
    return
  }

  running.value = true
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

    // 构建执行参数
    const runData = {
      templateId: originalTemplate.value?.id || props.templateId,
      templateName: formData.value.templateName,
      auditParams
    }

    const response = await jobApi.runJob(runData)
    const result = response?.data || response

    // 检查 runId 或 status 来判断是否成功
    if (result && (result.runId || result.status === 'WAITING' || result.status === 'RUNNING')) {
      ElMessage.success(t('inspection.templates.taskStarted'))
      emit('success', result)
      handleClose()
    } else if (result && result.error) {
      ElMessage.error(result.error)
    } else {
      ElMessage.error(t('inspection.templates.executionFailed'))
    }
  } catch (error) {
    console.error('执行巡检失败:', error)
    ElMessage.error(error?.message || t('inspection.templates.runFailed'))
  } finally {
    running.value = false
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
    scripts: [],
    hosts: []
  }
  originalTemplate.value = null
  formRef.value?.resetFields()
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
    if (val && props.templateId) {
      loadTemplate()
    }
  }
)
</script>

<style scoped lang="scss">
.run-summary-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px 20px;
  padding: 12px 16px;
  margin-bottom: 14px;
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 8px;
}

.banner-main {
  min-width: 0;
  .banner-title {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--el-color-primary);
  }
  p {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--el-text-color-regular);
  }
}

.banner-metrics {
  display: flex;
  align-items: center;
  gap: 20px;
}

.banner-metric-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  strong {
    font-size: 18px;
    font-variant-numeric: tabular-nums;
    color: var(--el-text-color-primary);
  }
}

.metric-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  &--primary {
    background: var(--el-color-primary);
  }
  &--success {
    background: var(--el-color-success);
  }
}

.run-template-form {
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

.form-row-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.mb-0 {
  margin-bottom: 0 !important;
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
</style>
