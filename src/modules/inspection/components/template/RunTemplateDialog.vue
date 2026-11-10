<template>
  <el-dialog
    :model-value="visible"
    title="启动巡检任务"
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
          <span>执行前配置确认</span>
        </div>
        <p>可针对本次巡检任务微调运行参数或目标主机范围，变更仅对本次任务生效。</p>
      </div>
      <div class="banner-metrics">
        <div class="banner-metric-item">
          <span class="metric-dot metric-dot--primary"></span>
          <span>目标主机项</span>
          <strong>{{ totalHosts }}</strong>
        </div>
        <div class="banner-metric-item">
          <span class="metric-dot metric-dot--success"></span>
          <span>关联脚本数</span>
          <strong>{{ totalScripts }}</strong>
        </div>
      </div>
    </div>

    <el-form ref="formRef" :model="formData" :rules="rules" label-position="top" class="run-template-form">
      <!-- 任务基础信息 -->
      <section class="config-section-card">
        <div class="section-card-header">
          <div class="section-card-title">
            <span class="section-step-badge">1</span>
            <div>
              <h3>任务标识与说明</h3>
              <p>确认本次巡检记录显示的模板名称与描述信息。</p>
            </div>
          </div>
        </div>
        <div class="section-card-body">
          <div class="form-row-grid">
            <el-form-item label="模板名称" prop="templateName" class="mb-0">
              <el-input v-model="formData.templateName" placeholder="请输入模板名称" />
            </el-form-item>
            <el-form-item label="场景说明" prop="description" class="mb-0">
              <el-input
                v-model="formData.description"
                placeholder="可选：补充本次执行的备注或描述"
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
              <h3>巡检剧本与运行参数</h3>
              <p>核实本次执行的巡检脚本路径与附加命令行参数。</p>
            </div>
          </div>
          <div class="section-card-actions">
            <span class="config-count-pill">
              共 <strong>{{ formData.scripts.length }}</strong> 个文件
            </span>
            <el-button type="primary" plain size="small" @click="openScriptSelector">
              <i class="fas fa-folder-open" aria-hidden="true"></i>
              更换脚本
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
                  <small>点击选择本次巡检要执行的脚本文件</small>
                </div>
                <el-button size="small" type="primary" plain>选择文件</el-button>
              </div>
              <div v-else class="selected-scripts">
                <el-table
                  :data="formData.scripts"
                  size="small"
                  class="script-table"
                  max-height="260px"
                >
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
                  <el-table-column label="运行参数" min-width="180">
                    <template #default="{ row }">
                      <el-input v-model="row.scriptParams" size="small" placeholder="脚本运行参数" />
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="68" align="center">
                    <template #default="{ $index }">
                      <el-button type="danger" link size="small" @click="removeScript($index)">
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

      <!-- 目标主机 -->
      <section class="config-section-card">
        <div class="section-card-header">
          <div class="section-card-title">
            <span class="section-step-badge">3</span>
            <div>
              <h3>本次巡检目标主机</h3>
              <p>选择或调整本次巡检覆盖的目标主机、分组或标签。</p>
            </div>
          </div>
          <div class="section-card-actions">
            <span class="config-count-pill">
              已选 <strong>{{ totalHosts }}</strong> 项主机配置
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
      <el-button type="primary" :loading="running" @click="handleRun">立即执行</el-button>
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
const rules = {
  templateName: [{ required: true, message: '请输入模板名称', trigger: 'blur' }]
}

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
    ElMessage.error('加载模板失败')
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
    ElMessage.error('请先选择主机')
    return
  }
  if (formData.value.scripts.length === 0) {
    ElMessage.error('请先选择脚本')
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
      ElMessage.success('巡检任务已启动')
      emit('success', result)
      handleClose()
    } else if (result && result.error) {
      ElMessage.error(result.error)
    } else {
      ElMessage.error('执行失败')
    }
  } catch (error) {
    console.error('执行巡检失败:', error)
    ElMessage.error(error?.message || '执行巡检失败')
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
