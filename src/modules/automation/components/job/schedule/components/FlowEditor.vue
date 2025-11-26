<template>
  <transition name="flow-editor-fade">
    <div v-if="visible" class="flow-editor">
      <div class="flow-editor__backdrop" @click="handleCancel" />
      <div class="flow-editor__panel" @click.stop>
        <header class="flow-editor__header">
          <span class="header-title">{{ headerTitle }}</span>
          <div class="header-actions">
            <el-button
              v-if="!isInstance"
              type="primary"
              :loading="loading"
              @click="handleSave"
            >保存</el-button>
            <el-button
              v-else
              type="primary"
              :loading="loading"
              @click="handleRun"
            >执行</el-button>
            <el-button @click="handleCancel">取消</el-button>
          </div>
        </header>

        <el-scrollbar class="flow-editor__body">
          <form class="op-smartform">
            <!-- 基础信息 -->
            <fieldset class="form-fieldset">
              <legend>基础信息</legend>
              <div class="form-group">
                <label class="control-label">名称 <span class="required">*</span></label>
                <div class="form-control-wrapper">
                  <el-input v-model="flow.name" placeholder="请输入流程名称" />
                </div>
              </div>
              <div class="form-group">
                <label class="control-label">描述</label>
                <div class="form-control-wrapper">
                  <el-input v-model="flow.description" type="textarea" :rows="3" />
                </div>
              </div>
              <div class="form-group">
                <label class="control-label">
                  目标主机
                  <el-tooltip content="设置流程执行的目标主机，支持选择单台主机、主机组或标签" placement="top">
                    <i class="fa fa-question-circle text-muted ms-1" />
                  </el-tooltip>
                </label>
                <div class="form-control-wrapper">
                  <AcmDeviceSelector v-model="flow.hosts" ci-types="[auto]" mcheck-type="map" />
                </div>
              </div>
            </fieldset>

            <!-- 步骤设置 -->
            <fieldset class="form-fieldset" :class="{ 'fieldset-disabled': isInstance }">
              <legend>步骤设置</legend>
              <div class="form-group">
                <div class="step-toolbar">
                  <label class="control-label step-label" @click="toggleFoldAll">
                    步骤
                    <i class="fa" :class="isFoldAllSteps ? 'fa-angle-double-left' : 'fa-angle-double-down'" />
                  </label>
                  <el-button class="ms-3" size="small" @click="addStep">
                    <i class="fa fa-plus-circle text-primary me-1" />新增步骤
                  </el-button>
                </div>

                <div class="step-list">
                  <div
                    v-for="(step, index) in flow.steps"
                    :key="step.id"
                    class="step-card card"
                  >
                    <div class="card-header" @click="toggleStepFold(index)">
                      <h4 class="card-title">
                        步骤 {{ index + 1 }}
                        <span v-if="stepFoldList[index]"> : {{ step.name || '未命名' }}</span>
                      </h4>
                      <el-button
                        class="pull-right"
                        size="small"
                        :disabled="flow.steps.length === 1"
                        @click.stop="removeStep(index)"
                      >删除步骤</el-button>
                    </div>

                    <div v-if="!stepFoldList[index]" class="card-body">
                      <div class="form-group form-horizontal">
                        <label class="control-label">步骤名称</label>
                        <div class="form-control-wrapper">
                          <el-input v-model="step.name" placeholder="请输入" class="w-sm" />
                        </div>
                      </div>
                      <div class="form-group form-horizontal">
                        <label class="control-label">自动执行下一步骤</label>
                        <div class="form-control-wrapper">
                          <el-checkbox v-model="step.autoNext" :disabled="isInstance" />
                        </div>
                      </div>
                      <div class="form-group form-horizontal">
                        <label class="control-label">脚本</label>
                        <div class="form-control-wrapper w-full">
                          <GfsFileSelector v-model="step.config.tasks[0].scripts" :disabled="isInstance" />
                        </div>
                      </div>
                      <div class="form-group form-horizontal">
                        <label class="control-label">
                          输出等级
                          <el-tooltip content="控制脚本执行时的输出详细程度，调试问题时可选择更高等级" placement="top">
                            <i class="fa fa-question-circle text-muted ms-1" />
                          </el-tooltip>
                        </label>
                        <div class="form-control-wrapper">
                          <el-select v-model="step.config.verbosity" class="w-auto">
                            <el-option :value="0" label="普通" />
                            <el-option :value="1" label="详细" />
                            <el-option :value="2" label="更多" />
                            <el-option :value="3" label="调试" />
                            <el-option :value="4" label="连接调试" />
                          </el-select>
                        </div>
                      </div>
                      <div class="form-group form-horizontal">
                        <label class="control-label">
                          任务超时
                          <el-tooltip content="任务执行超时时间，-1 表示无限制" placement="top">
                            <i class="fa fa-question-circle text-muted ms-1" />
                          </el-tooltip>
                        </label>
                        <div class="form-control-wrapper">
                          <div class="input-group w-sm">
                            <el-input-number v-model="step.config.taskTimeout" :min="-1" :max="86400" controls-position="right" />
                            <span class="input-group-text">秒</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </fieldset>

            <!-- 运行参数 -->
            <fieldset class="form-fieldset">
              <legend>
                运行参数
                <el-tooltip content="运行参数会替换脚本命令行中 ${变量名} 形式的变量，以及主机的参数名" placement="top">
                  <i class="fa fa-question-circle text-muted ms-1" />
                </el-tooltip>
              </legend>
              <div class="form-group">
                <div class="param-toolbar">
                  <el-button size="small" title="解析作业定义中的变量，自动添加为参数" @click="handleParseParams">
                    <span class="text-primary me-1">{}</span>解析参数
                  </el-button>
                  <el-button size="small" class="ms-auto" title="添加参数" @click="addParam">
                    <i class="fa fa-plus" />
                  </el-button>
                </div>

                <table v-if="flow.globalParams.length" class="op-param-table table">
                  <thead>
                    <tr>
                      <th>运行参数</th>
                      <th>显示名称</th>
                      <th>描述</th>
                      <th>
                        默认值
                        <el-tooltip content="执行时如未填写则使用默认值" placement="top">
                          <i class="fa fa-question-circle text-muted ms-1" />
                        </el-tooltip>
                      </th>
                      <th>保密</th>
                      <th class="text-right" width="60">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(param, index) in flow.globalParams" :key="param.id">
                      <td><el-input v-model="param.name" size="small" /></td>
                      <td><el-input v-model="param.label" size="small" /></td>
                      <td><el-input v-model="param.description" size="small" /></td>
                      <td><el-input v-model="param.defaultValue" size="small" /></td>
                      <td>
                        <el-checkbox v-model="param.secret" />
                      </td>
                      <td class="text-right">
                        <el-button size="small" title="删除参数" @click="deleteParam(index)">
                          <i class="fa fa-minus" />
                        </el-button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <el-empty v-else description="暂无参数" :image-size="60" />
              </div>
            </fieldset>
          </form>
        </el-scrollbar>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as jaoApi from '@/modules/automation/api/jao'
import GfsFileSelector from './GfsFileSelector.vue'
import AcmDeviceSelector from './AcmDeviceSelector.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  flowId: { type: String, default: '' },
  mode: { type: String, default: 'edit' }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const isInstance = computed(() => props.mode === 'run')
const loading = ref(false)
const flow = reactive(createEmptyFlow())
const stepFoldList = ref([false])
const isFoldAllSteps = ref(false)

const headerTitle = computed(() => {
  if (isInstance.value) return '运行流程'
  return flow.id ? '编辑流程' : '新建流程'
})

watch(
  () => visible.value,
  (val) => {
    if (val) {
      initialize()
    } else {
      resetEditor()
    }
  }
)

watch(
  () => flow.steps.length,
  () => {
    stepFoldList.value = flow.steps.map(() => false)
  }
)

function initialize() {
  if (props.flowId) {
    fetchFlowDetail(props.flowId)
  } else {
    resetFlow()
  }
}

function resetEditor() {
  resetFlow()
}

function createEmptyFlow() {
  return {
    id: '',
    name: '',
    description: '',
    hosts: [],
    steps: [createStep()],
    globalParams: []
  }
}

function createStep() {
  return {
    id: generateId(),
    name: '',
    autoNext: true,
    type: 'script',
    config: {
      verbosity: 0,
      taskTimeout: 60,
      tasks: [{ scripts: [] }]
    }
  }
}

function resetFlow() {
  const empty = createEmptyFlow()
  Object.assign(flow, empty)
}

async function fetchFlowDetail(flowId) {
  loading.value = true
  try {
    const response = await jaoApi.fetchFlowDetail(flowId)
    applyFlowDetail(response?.data ?? response ?? {})
  } catch (error) {
    ElMessage.error(error?.message || '获取流程详情失败')
  } finally {
    loading.value = false
  }
}

function applyFlowDetail(data) {
  flow.id = data.id || data.flowId || ''
  flow.name = data.name || ''
  flow.description = data.description || ''

  // hosts 保留完整对象（包含 assetType）
  if (Array.isArray(data.hosts)) {
    flow.hosts = data.hosts.map(h => {
      // 如果已经是对象格式，直接使用
      if (typeof h === 'object' && h.value) {
        return h
      }
      // 如果是字符串，转换为对象格式
      return {
        key: h,
        value: h,
        assetType: 'linux' // 默认类型
      }
    })
  } else {
    flow.hosts = []
  }

  // steps 处理
  flow.steps = Array.isArray(data.steps) && data.steps.length ? data.steps.map(normalizeStep) : [createStep()]

  // globalParams 从 JSON 字符串解析
  if (data.globalParamsJson) {
    try {
      const parsed = JSON.parse(data.globalParamsJson)
      flow.globalParams = Array.isArray(parsed) ? parsed.map(normalizeParam) : []
    } catch {
      flow.globalParams = []
    }
  } else if (Array.isArray(data.globalParams)) {
    flow.globalParams = data.globalParams.map(normalizeParam)
  } else {
    flow.globalParams = []
  }
}

function normalizeStep(raw) {
  // 从 configJson 字符串解析配置
  let config = raw.config
  if (raw.configJson && typeof raw.configJson === 'string') {
    try {
      config = JSON.parse(raw.configJson)
    } catch {
      config = null
    }
  }

  const scripts = extractScripts(raw, config)
  return {
    id: raw.id || generateId(),
    name: raw.name || '',
    autoNext: raw.autoNext !== undefined ? !!raw.autoNext : true,
    type: raw.type || 'script',
    config: {
      verbosity: Number(config?.verbosity ?? 0),
      taskTimeout: Number(config?.taskTimeout ?? 60),
      tasks: [
        {
          scripts
        }
      ]
    }
  }
}

function extractScripts(rawStep, config) {
  // 优先使用传入的 config，否则从 rawStep 获取
  const configToUse = config || rawStep?.config
  const candidates = configToUse?.tasks?.[0]?.scripts

  if (Array.isArray(candidates)) {
    return candidates.map((item) => ({
      path: item.path || item.location || '',
      config: item.config || item.argline || '',
      tag: item.tag || ''
    }))
  }
  return []
}

function normalizeParam(raw) {
  return {
    id: raw.id || generateId(),
    name: raw.name || '',
    label: raw.label || '',
    description: raw.description || '',
    defaultValue: raw.defaultValue || '',
    secret: !!raw.secret
  }
}

function addStep() {
  flow.steps.push(createStep())
}

function removeStep(index) {
  if (flow.steps.length === 1) return
  flow.steps.splice(index, 1)
  stepFoldList.value.splice(index, 1)
}

function toggleStepFold(index) {
  stepFoldList.value[index] = !stepFoldList.value[index]
}

function toggleFoldAll() {
  const next = !isFoldAllSteps.value
  isFoldAllSteps.value = next
  stepFoldList.value = stepFoldList.value.map(() => next)
}

function addParam() {
  flow.globalParams.push({
    id: generateId(),
    name: '',
    label: '',
    description: '',
    defaultValue: '',
    secret: false
  })
}

function deleteParam(index) {
  flow.globalParams.splice(index, 1)
}

// 自动解析脚本中的参数（从 {{ }} 格式提取变量名）
async function handleParseParams() {
  const existingNames = new Set(flow.globalParams.map(p => p.name))
  const newParams = []

  // 遍历所有步骤的脚本，查找 {{ }} 格式的参数
  for (const step of flow.steps) {
    const scripts = step.config?.tasks?.[0]?.scripts || []
    for (const script of scripts) {
      // 检查脚本路径和配置中的参数
      const textToSearch = `${script.path || ''} ${script.config || ''}`
      const matches = textToSearch.match(/\{\{\s*(\w+)\s*\}\}/g) || []
      for (const match of matches) {
        const paramName = match.replace(/\{\{\s*|\s*\}\}/g, '')
        if (paramName && !existingNames.has(paramName)) {
          existingNames.add(paramName)
          newParams.push({
            id: generateId(),
            name: paramName,
            label: '',
            description: '',
            defaultValue: '',
            secret: false
          })
        }
      }
    }
  }

  if (newParams.length > 0) {
    flow.globalParams.push(...newParams)
    ElMessage.success(`解析到 ${newParams.length} 个新参数`)
  } else {
    ElMessage.info('未发现新参数')
  }
}

function handleSave() {
  if (!flow.name?.trim()) {
    ElMessage.warning('请输入流程名称')
    return
  }

  loading.value = true

  // 将 hosts 转换为后端期望的对象格式
  const hostsPayload = flow.hosts.map(host => {
    if (typeof host === 'object' && host.value) {
      return host
    }
    return {
      key: host,
      value: host,
      assetType: 'linux'
    }
  })

  // 将 steps 的 config 转换为 configJson 字符串
  const stepsPayload = flow.steps.map(step => ({
    id: step.id,
    name: step.name,
    autoNext: step.autoNext,
    type: step.type,
    configJson: JSON.stringify({
      tasks: step.config.tasks.map(task => ({
        scripts: task.scripts.map(script => ({
          location: script.path,
          argline: script.config || null
        }))
      })),
      verbosity: String(step.config.verbosity || 0),
      taskTimeout: Number(step.config.taskTimeout || 60)
    })
  }))

  const payload = {
    id: flow.id || undefined,
    name: flow.name,
    description: flow.description || null,
    hosts: hostsPayload,
    steps: stepsPayload,
    globalParamsJson: JSON.stringify(flow.globalParams || [])
  }

  jaoApi.saveFlow(payload)
    .then(() => {
      ElMessage.success('保存成功')
      emit('saved')
      visible.value = false
    })
    .catch(error => {
      ElMessage.error(error?.message || '保存失败')
    })
    .finally(() => {
      loading.value = false
    })
}

function handleRun() {
  if (!flow.name?.trim()) {
    ElMessage.warning('请输入流程名称')
    return
  }

  if (!flow.hosts.length) {
    ElMessage.warning('请至少添加一个目标主机')
    return
  }

  loading.value = true
  const payload = {
    flowId: flow.id,
    name: flow.name,
    description: flow.description || '',
    hosts: flow.hosts,
    steps: flow.steps,
    globalParams: flow.globalParams
  }

  jaoApi.createFlowInstance(payload)
    .then((response) => {
      const instanceId = response?.data?.id || response?.id
      ElMessage.success('流程已开始执行')
      emit('saved')
      visible.value = false
      // 可选:打开实例查看页面
      if (instanceId) {
        const legacyBase = window.location.origin + window.location.pathname.replace(/\/#.*$/, '')
        window.open(`${legacyBase}#/jao/flows/instance/${instanceId}/view`, '_blank', 'noopener')
      }
    })
    .catch(error => {
      ElMessage.error(error?.message || '执行失败')
    })
    .finally(() => {
      loading.value = false
    })
}

function handleCancel() {
  visible.value = false
}

function generateId() {
  return `flow-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
</script>

<style scoped>
.flow-editor {
  position: fixed;
  inset: 0;
  z-index: 2048;
  display: flex;
  align-items: center;
  justify-content: center;
}

.flow-editor__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
}

.flow-editor__panel {
  position: relative;
  width: min(1100px, 92vw);
  max-height: 92vh;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 25px 55px rgba(15, 23, 42, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.flow-editor__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  flex-shrink: 0;
}

.header-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.flow-editor__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.flow-editor__body :deep(.el-scrollbar__view) {
  padding: 20px 28px 40px;
}

/* 表单样式 - 模拟 op-smartform */
.op-smartform {
  background: #fff;
}

.form-fieldset {
  border: none;
  padding: 0;
  margin-bottom: 24px;
}

.form-fieldset legend {
  font-size: 16px;
  font-weight: 600;
  color: #334155;
  padding-bottom: 12px;
  margin-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
  width: 100%;
}

.form-fieldset.fieldset-disabled {
  opacity: 0.7;
  pointer-events: none;
}

.form-fieldset.fieldset-disabled .acm-device-selector {
  pointer-events: auto;
  opacity: 1;
}

.form-group {
  margin-bottom: 16px;
}

.form-group .control-label {
  display: block;
  font-weight: 600;
  color: #475569;
  margin-bottom: 8px;
}

.form-control-wrapper {
  width: 100%;
}

/* 水平表单布局 - 模拟 op-align-horizontal */
.form-horizontal {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.form-horizontal .control-label {
  flex-shrink: 0;
  width: 120px;
  padding-top: 8px;
  margin-bottom: 0;
  text-align: right;
}

.form-horizontal .form-control-wrapper {
  flex: 1;
}

.required {
  color: #f97316;
}

.text-muted {
  color: #94a3b8;
}

.text-primary {
  color: #3b82f6;
}

.text-right {
  text-align: right;
}

.ms-1 {
  margin-left: 4px;
}

.ms-3 {
  margin-left: 12px;
}

.me-1 {
  margin-right: 4px;
}

.ms-auto {
  margin-left: auto;
}

.pull-right {
  float: right;
}

/* 宽度工具类 */
.w-full {
  width: 100%;
}

.w-sm {
  width: 200px;
}

.w-auto {
  width: auto;
  min-width: 120px;
}

/* 步骤区域 */
.step-toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.step-label {
  cursor: pointer;
  user-select: none;
}

.step-label i {
  margin-left: 8px;
  transition: transform 0.2s;
}

.step-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 卡片样式 - 模拟 Bootstrap card */
.card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  cursor: pointer;
}

.card-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.card-body {
  padding: 16px;
}

/* 参数区域 */
.param-toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

/* 参数表格 - 模拟 op-param-table */
.op-param-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.op-param-table th,
.op-param-table td {
  border: 1px solid #e2e8f0;
  padding: 8px 10px;
  vertical-align: middle;
}

.op-param-table th {
  background: #f1f5f9;
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
}

.op-param-table :deep(.el-input) {
  width: 100%;
}

.op-param-table :deep(.el-checkbox) {
  height: auto;
}

/* 输入组 - 模拟 Bootstrap input-group */
.input-group {
  display: flex;
  align-items: center;
}

.input-group .input-group-text {
  padding: 0 12px;
  background: #f1f5f9;
  border: 1px solid #dcdfe6;
  border-left: none;
  border-radius: 0 4px 4px 0;
  height: 32px;
  line-height: 32px;
  font-size: 13px;
  color: #606266;
}

.input-group :deep(.el-input-number) {
  width: 140px;
}

.input-group :deep(.el-input-number .el-input__wrapper) {
  border-radius: 4px 0 0 4px;
}

/* 过渡动画 */
.flow-editor-fade-enter-active,
.flow-editor-fade-leave-active {
  transition: opacity 0.2s ease;
}

.flow-editor-fade-enter-from,
.flow-editor-fade-leave-to {
  opacity: 0;
}
</style>
