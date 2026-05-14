<template>
  <div v-if="isInline" v-show="visible" class="flow-editor-panel">
    <div class="flow-editor-panel__header">
      <div>
        <div class="flow-editor-panel__title">{{ headerTitle }}</div>
        <!-- <div class="flow-editor-panel__subtitle">在右侧面板完成流程配置后保存。</div> -->
      </div>
      <el-button text @click="handleCancel">
        <i class="fa fa-times" />
      </el-button>
    </div>

    <el-form ref="formRef" :model="flow" label-width="120px" class="flow-form flow-form--inline">
      <FlowEditorFields
        :flow="flow"
        :is-instance="isInstance"
        :step-fold-list="stepFoldList"
        :is-fold-all-steps="isFoldAllSteps"
        @toggle-fold-all="toggleFoldAll"
        @add-step="addStep"
        @remove-step="removeStep"
        @toggle-step-fold="toggleStepFold"
        @add-param="addParam"
        @delete-param="deleteParam"
        @parse-params="handleParseParams"
      />
    </el-form>

    <div class="flow-editor-panel__footer">
      <el-button @click="handleCancel">取消</el-button>
      <el-button v-if="!isInstance" type="primary" :loading="loading" @click="handleSave">
        保存
      </el-button>
      <el-button v-else type="primary" :loading="loading" @click="handleRun">执行</el-button>
    </div>
  </div>

  <el-drawer
    v-else
    v-model="visible"
    :title="headerTitle"
    direction="rtl"
    size="min(1180px, 94vw)"
    append-to-body
    :close-on-click-modal="false"
    class="flow-editor-drawer"
  >
    <div class="flow-editor-drawer__body">
      <el-form ref="formRef" :model="flow" label-width="120px" class="flow-form flow-form--drawer">
        <FlowEditorFields
          :flow="flow"
          :is-instance="isInstance"
          :step-fold-list="stepFoldList"
          :is-fold-all-steps="isFoldAllSteps"
          @toggle-fold-all="toggleFoldAll"
          @add-step="addStep"
          @remove-step="removeStep"
          @toggle-step-fold="toggleStepFold"
          @add-param="addParam"
          @delete-param="deleteParam"
          @parse-params="handleParseParams"
        />
      </el-form>

      <div class="flow-editor-drawer__footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button v-if="!isInstance" type="primary" :loading="loading" @click="handleSave">
          保存
        </el-button>
        <el-button v-else type="primary" :loading="loading" @click="handleRun">执行</el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as jaoApi from '@/modules/automation/api/jao'
import FlowEditorFields from './FlowEditorFields.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  flowId: { type: String, default: '' },
  mode: { type: String, default: 'edit' },
  renderMode: { type: String, default: 'dialog' }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const isInstance = computed(() => props.mode === 'run')
const isInline = computed(() => props.renderMode === 'inline')
const loading = ref(false)
const formRef = ref(null)
const flow = reactive(createEmptyFlow())
const stepFoldList = ref([false])
const isFoldAllSteps = ref(false)

const headerTitle = computed(() => {
  if (isInstance.value) return '运行流程'
  return flow.id ? '编辑流程' : '新建流程'
})

watch(
  () => visible.value,
  val => {
    if (val) {
      initialize()
    } else {
      resetEditor()
    }
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
    globalParams: [],
    extraData: {}
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
    },
    extraData: {}
  }
}

function resetFlow() {
  const empty = createEmptyFlow()
  Object.assign(flow, empty)
  stepFoldList.value = [false]
  isFoldAllSteps.value = false
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
  flow.extraData = { ...data }
  delete flow.extraData.hosts
  delete flow.extraData.steps
  delete flow.extraData.globalParams
  delete flow.extraData.globalParamsJson

  if (Array.isArray(data.hosts)) {
    flow.hosts = data.hosts.map(host => {
      if (typeof host === 'object' && host.value) {
        return host
      }
      return {
        key: host,
        value: host,
        assetType: 'linux'
      }
    })
  } else {
    flow.hosts = []
  }

  flow.steps =
    Array.isArray(data.steps) && data.steps.length ? data.steps.map(normalizeStep) : [createStep()]
  stepFoldList.value = flow.steps.map(() => false)
  isFoldAllSteps.value = false

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
  let config = raw.config
  if (raw.configJson && typeof raw.configJson === 'string') {
    try {
      config = JSON.parse(raw.configJson)
    } catch {
      config = null
    }
  }

  const scripts = extractScripts(raw, config)

  const stepExtra = { ...raw }
  delete stepExtra.config
  delete stepExtra.configJson
  delete stepExtra.id
  delete stepExtra.name
  delete stepExtra.autoNext
  delete stepExtra.type

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
    },
    extraData: stepExtra
  }
}

function extractScripts(rawStep, config) {
  const configToUse = config || rawStep?.config
  const candidates = configToUse?.tasks?.[0]?.scripts

  if (Array.isArray(candidates)) {
    return candidates.map(item => ({
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
  stepFoldList.value.push(false)
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

async function handleParseParams() {
  const existingNames = new Set(flow.globalParams.map(param => param.name))
  const newParams = []

  for (const step of flow.steps) {
    const scripts = step.config?.tasks?.[0]?.scripts || []
    for (const script of scripts) {
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

  const stepsPayload = flow.steps.map(step => ({
    ...step.extraData,
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
    ...flow.extraData,
    id: flow.id || undefined,
    name: flow.name,
    description: flow.description || null,
    hosts: hostsPayload,
    steps: stepsPayload,
    globalParamsJson: JSON.stringify(flow.globalParams || [])
  }

  jaoApi
    .saveFlow(payload)
    .then(response => {
      const savedFlowId =
        response?.data?.id ||
        response?.data?.flowId ||
        response?.id ||
        response?.flowId ||
        flow.id ||
        ''
      ElMessage.success('保存成功')
      emit('saved', {
        action: 'save',
        flowId: savedFlowId,
        flowName: flow.name
      })
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

  const stepsPayload = flow.steps.map(step => ({
    ...step.extraData,
    name: step.name,
    type: step.type,
    autoNext: step.autoNext,
    configJson: JSON.stringify({
      tasks: step.config.tasks.map(task => ({
        scripts: task.scripts.map(script => ({
          location: script.path,
          argline: script.config || null
        }))
      })),
      verbosity: String(step.config.verbosity || 0),
      taskTimeout: Number(step.config.taskTimeout || 60)
    }),
    config: {
      tasks: step.config.tasks.map(task => ({
        scripts: task.scripts.map(script => ({
          location: script.path,
          argline: script.config || null
        }))
      })),
      verbosity: String(step.config.verbosity || 0),
      taskTimeout: Number(step.config.taskTimeout || 60)
    }
  }))

  const payload = {
    ...flow.extraData,
    name: flow.name,
    description: flow.description || null,
    hosts: hostsPayload,
    steps: stepsPayload,
    globalParamsJson: JSON.stringify(flow.globalParams || []),
    jobFlowId: flow.id
  }

  jaoApi
    .createFlowInstance(payload)
    .then(() => {
      ElMessage.success('流程已开始执行')
      emit('saved', {
        action: 'run',
        flowId: flow.id || props.flowId || payload.jobFlowId || '',
        flowName: flow.name
      })
      visible.value = false
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

<style scoped lang="scss">
.flow-editor-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  background: var(--el-bg-color);
}

.flow-editor-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.flow-editor-panel__title {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.flow-editor-panel__subtitle {
  margin-top: 6px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.flow-editor-panel__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px 20px;
  border-top: 1px solid var(--el-border-color-light);
}

.flow-form {
  flex: 1;
  min-height: 0;

  :deep(.el-form-item__label) {
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  :deep(.el-form-item__label .label-with-tooltip) {
    pointer-events: auto;
  }

  :deep(.el-form-item__content) {
    flex-wrap: wrap;
  }
}

.flow-form--inline {
  overflow-y: auto;
  padding: 24px;
}

.flow-form--drawer {
  overflow-y: auto;
  padding: 20px 4px 0;
}

.flow-editor-drawer__body {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.flow-editor-drawer__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-light);
}

:global(.flow-editor-drawer .el-drawer__header) {
  margin-bottom: 0;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--el-border-color-light);
}

:global(.flow-editor-drawer .el-drawer__body) {
  padding: 0 24px 20px;
  min-height: 0;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .flow-form--drawer {
    padding-top: 16px;
  }

  .flow-editor-drawer__footer {
    flex-direction: column-reverse;
  }

  .flow-editor-drawer__footer :deep(.el-button) {
    width: 100%;
  }

  :global(.flow-editor-drawer .el-drawer__header),
  :global(.flow-editor-drawer .el-drawer__body) {
    padding-inline: 16px;
  }
}
</style>
