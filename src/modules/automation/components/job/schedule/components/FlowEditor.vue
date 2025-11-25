<template>
  <transition name="flow-editor-fade">
    <div v-if="visible" class="flow-editor">
      <div class="flow-editor__backdrop" @click="handleCancel" />
      <div class="flow-editor__panel" @click.stop>
        <header class="flow-editor__header">
          <div>
            <p class="header-title">{{ headerTitle }}</p>
          </div>
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
          <section class="fieldset">
            <h3>基础信息</h3>
            <div class="form-group">
              <label>名称 <span class="required">*</span></label>
              <el-input v-model="flow.name" placeholder="请输入流程名称" />
            </div>
            <div class="form-group">
              <label>描述</label>
              <el-input v-model="flow.description" type="textarea" :rows="3" />
            </div>
            <div class="form-group">
              <label>目标主机</label>
              <AcmDeviceSelector v-model="flow.hosts" ci-types="[auto]" />
            </div>
          </section>

          <section class="fieldset" :class="{ disabled: isInstance }">
            <div class="fieldset-header">
              <h3>步骤设置</h3>
              <div class="fieldset-actions">
                <el-button text type="primary" @click="toggleFoldAll">
                  {{ isFoldAllSteps ? '展开全部' : '折叠全部' }}
                </el-button>
                <el-button type="primary" plain size="small" @click="addStep">
                  <i class="fa fa-plus-circle me-1" />新增步骤
                </el-button>
              </div>
            </div>

            <div class="step-list">
              <div
                v-for="(step, index) in flow.steps"
                :key="step.id"
                class="step-card"
              >
                <div class="step-card__header" @click="toggleStepFold(index)">
                  <div>
                    <span class="step-title">步骤 {{ index + 1 }}</span>
                    <span v-if="stepFoldList[index]" class="step-name">：{{ step.name || '未命名' }}</span>
                  </div>
                  <div class="step-header-actions">
                    <el-button
                      text
                      type="danger"
                      size="small"
                      :disabled="flow.steps.length === 1"
                      @click.stop="removeStep(index)"
                    >删除</el-button>
                    <i class="fa" :class="stepFoldList[index] ? 'fa-angle-right' : 'fa-angle-down'" />
                  </div>
                </div>

                <div v-if="!stepFoldList[index]" class="step-card__body">
                  <div class="form-row">
                    <label>步骤名称</label>
                    <el-input v-model="step.name" placeholder="请输入" />
                  </div>
                  <div class="form-row">
                    <label>自动执行下一个步骤</label>
                    <el-switch v-model="step.autoNext" :disabled="isInstance" />
                  </div>
                  <div class="form-row">
                    <label>脚本列表</label>
                    <GfsFileSelector v-model="step.config.tasks[0].scripts" :disabled="isInstance" />
                  </div>

                  <div class="form-row">
                    <label>输出等级</label>
                    <el-select v-model="step.config.verbosity" class="w-60">
                      <el-option :value="0" label="普通" />
                      <el-option :value="1" label="详细" />
                      <el-option :value="2" label="更多" />
                      <el-option :value="3" label="调试" />
                      <el-option :value="4" label="连接调试" />
                    </el-select>
                  </div>

                  <div class="form-row">
                    <label>任务超时</label>
                    <div class="timeout-input">
                      <el-input-number v-model="step.config.taskTimeout" :min="-1" :max="86400" />
                      <span>秒</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="fieldset">
            <div class="fieldset-header">
              <h3>全局参数</h3>
              <div class="fieldset-actions">
                <el-button type="primary" plain size="small" @click="addParam">
                  <i class="fa fa-plus me-1" />新增参数
                </el-button>
              </div>
            </div>
            <div class="param-table" v-if="flow.globalParams.length">
              <table>
                <thead>
                  <tr>
                    <th>参数名</th>
                    <th>展示名称</th>
                    <th>描述</th>
                    <th>默认值</th>
                    <th>保密</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(param, index) in flow.globalParams" :key="param.id">
                    <td><el-input v-model="param.name" /></td>
                    <td><el-input v-model="param.label" /></td>
                    <td><el-input v-model="param.description" /></td>
                    <td><el-input v-model="param.defaultValue" /></td>
                    <td>
                      <el-switch v-model="param.secret" />
                    </td>
                    <td>
                      <el-button text type="danger" size="small" @click="deleteParam(index)">删除</el-button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <el-empty v-else description="暂无参数" :image-size="80" />
          </section>
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

.header-sub {
  margin: 4px 0 0;
  color: #94a3b8;
  font-size: 13px;
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

.fieldset {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  background: #fff;
}

.fieldset.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.fieldset.disabled .acm-device-selector {
  pointer-events: auto;
  opacity: 1;
}

.fieldset h3 {
  margin: 0 0 16px;
  font-size: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.form-group label {
  font-weight: 600;
  color: #475569;
}

.required {
  color: #f97316;
}

.fieldset-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.step-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.step-card {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}

.step-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8fafc;
  cursor: pointer;
}

.step-title {
  font-weight: 600;
}

.step-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.step-card__body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-row label {
  font-weight: 600;
  color: #475569;
}

.param-table table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 12px;
}

.param-table th,
.param-table td {
  border: 1px solid #e2e8f0;
  padding: 8px;
  font-size: 13px;
}

.param-table th {
  background: #f1f5f9;
  font-weight: 600;
}

.timeout-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.param-table {
  margin-top: 12px;
}

.flow-editor-fade-enter-active,
.flow-editor-fade-leave-active {
  transition: opacity 0.2s ease;
}

.flow-editor-fade-enter-from,
.flow-editor-fade-leave-to {
  opacity: 0;
}
</style>
