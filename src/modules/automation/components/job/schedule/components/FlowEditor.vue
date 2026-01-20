<template>
  <transition name="flow-editor-fade">
    <div v-if="visible" class="flow-editor">
      <div class="flow-editor__backdrop" @click="handleCancel" />
      <div class="flow-editor__panel" @click.stop>
        <header class="flow-editor__header">
          <span class="header-title">{{ headerTitle }}</span>
          <el-button class="header-close" text circle @click="handleCancel">
            <i class="fa fa-times" />
          </el-button>
        </header>

        <el-scrollbar class="flow-editor__body">
          <el-form ref="formRef" :model="flow" label-width="120px" class="flow-form">
            <!-- 基础信息 -->
            <div class="form-section">
              <div class="section-title">基础信息</div>

              <el-form-item label="名称" required>
                <el-input v-model="flow.name" placeholder="请输入流程名称" style="width: 100%;" />
              </el-form-item>

              <el-form-item label="描述">
                <el-input v-model="flow.description" type="textarea" :rows="3" />
              </el-form-item>

              <el-form-item label="目标主机">
                <template #label>
                  <span>目标主机</span>
                  <el-tooltip content="设置流程执行的目标主机，支持选择单台主机、主机组或标签" placement="top">
                    <i class="fa fa-question-circle text-muted ms-1" />
                  </el-tooltip>
                </template>
                <AcmDeviceSelector v-model="flow.hosts" ci-types="[auto]" mcheck-type="map" />
              </el-form-item>
            </div>

            <!-- 步骤设置 -->
            <div class="form-section" :class="{ 'section-disabled': isInstance }">
              <div class="section-header">
                <div class="section-title">步骤设置</div>
                <div class="section-actions">
                  <el-button class="fold-btn" text size="small" @click="toggleFoldAll">
                    <i class="fa" :class="isFoldAllSteps ? 'fa-angle-double-right' : 'fa-angle-double-down'" />
                    {{ isFoldAllSteps ? '展开全部' : '折叠全部' }}
                  </el-button>
                  <el-button size="small" @click="addStep">
                    <i class="fa fa-plus me-1" />新增步骤
                  </el-button>
                </div>
              </div>

              <div class="step-list">
                <div
                  v-for="(step, index) in flow.steps"
                  :key="step.id"
                  class="step-card"
                >
                  <div class="step-header" @click="toggleStepFold(index)">
                    <div class="step-title">
                      <span class="step-number">{{ index + 1 }}</span>
                      <span class="step-name">{{ step.name || '未命名' }}</span>
                    </div>
                    <div class="step-actions">
                      <el-button
                        text
                        size="small"
                        type="danger"
                        :disabled="flow.steps.length === 1"
                        @click.stop="removeStep(index)"
                      >
                        <i class="fa fa-trash-alt me-1" />删除
                      </el-button>
                      <i class="fa toggle-icon" :class="stepFoldList[index] ? 'fa-chevron-down' : 'fa-chevron-up'" />
                    </div>
                  </div>

                  <div v-show="!stepFoldList[index]" class="step-body">
                    <el-row class="form-row">
                      <el-col :span="12">
                        <el-form-item label="步骤名称">
                          <el-input v-model="step.name" placeholder="请输入" style="width: 100%;" />
                        </el-form-item>
                      </el-col>
                      <el-col :span="12">
                        <el-form-item label="自动执行">
                          <el-checkbox v-model="step.autoNext" :disabled="isInstance">自动执行下一步骤</el-checkbox>
                        </el-form-item>
                      </el-col>
                    </el-row>
                    <el-row class="form-row">
                      <el-col :span="24">
                        <el-form-item label="脚本">
                          <GfsFileSelector
                            v-model="step.config.tasks[0].scripts"
                            :disabled="isInstance"
                            :multiple-select="false"

                          />
                        </el-form-item>
                      </el-col>
                    </el-row>
                    <el-row class="form-row">
                      <el-col :span="12">
                        <el-form-item>
                          <template #label>
                            <span>输出等级</span>
                            <el-tooltip content="控制脚本执行时的输出详细程度，调试问题时可选择更高等级" placement="top">
                              <i class="fa fa-question-circle text-muted ms-1" style="cursor: help;" />
                            </el-tooltip>
                          </template>
                          <el-select v-model="step.config.verbosity" style="width: 100%;">
                            <el-option :value="0" label="普通" />
                            <el-option :value="1" label="详细" />
                            <el-option :value="2" label="更多" />
                            <el-option :value="3" label="调试" />
                            <el-option :value="4" label="连接调试" />
                          </el-select>
                        </el-form-item>
                      </el-col>
                      <el-col :span="12">
                        <el-form-item>
                          <template #label>
                            <span>任务超时(秒)</span>
                            <el-tooltip content="任务执行超时时间，-1 表示无限制" placement="top">
                              <i class="fa fa-question-circle text-muted ms-1" style="cursor: help;" />
                            </el-tooltip>
                          </template>
                          <el-input-number v-model="step.config.taskTimeout" :min="-1" :max="86400" controls-position="right" style="width: 100%;" />
                        </el-form-item>
                      </el-col>
                    </el-row>
                  </div>
                </div>
              </div>
            </div>

            <!-- 运行参数 -->
            <div class="form-section">
              <div class="section-title">
                运行参数
                <el-tooltip content="运行参数会替换脚本命令行中 ${变量名} 形式的变量，以及主机的参数名" placement="top">
                  <i class="fa fa-question-circle text-muted ms-1" />
                </el-tooltip>
              </div>

              <el-form-item>
                <div class="param-toolbar">
                  <el-button size="small" class="ms-auto" @click="addParam">
                    <i class="fa fa-plus" />添加参数
                  </el-button>
                  <el-button size="small" @click="handleParseParams">
                    <span class="text-primary me-1">{}</span>解析参数
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
                        <el-button text title="删除参数" @click="deleteParam(index)" type="danger">
                          <el-icon><Delete /></el-icon>
                        </el-button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <el-empty v-else description="暂无参数" :image-size="60" style="width: 100%" />
              </el-form-item>
            </div>
          </el-form>
        </el-scrollbar>

        <footer class="flow-editor__footer">
          <el-button @click="handleCancel">取消</el-button>
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
        </footer>
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
import { Delete } from '@element-plus/icons-vue'

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
  (val) => {
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
  // 移除已处理字段以免覆盖
  delete flow.extraData.hosts
  delete flow.extraData.steps
  delete flow.extraData.globalParams
  delete flow.extraData.globalParamsJson

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

  const stepExtra = { ...raw }
  delete stepExtra.config
  delete stepExtra.configJson
  // 移除已显式映射的字段
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
  // 新增的步骤展开，其他步骤保持当前状态
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
    ...step.extraData, // 合并额外步骤数据
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
    ...flow.extraData, // 合并额外流程数据
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

  // 将 steps 的 config 转换为 configJson 字符串，同时保留 config 对象
  const stepsPayload = flow.steps.map(step => ({
    ...step.extraData, // 合并额外步骤数据（包含flowId、runLogIds、status、appletCode等）
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
    ...flow.extraData, // 合并额外流程数据（包含appletCode、engine、createdAt、createdBy、tenantId、updatedBy、updatedAt等）
    name: flow.name,
    description: flow.description || null,
    hosts: hostsPayload,
    steps: stepsPayload,
    globalParamsJson: JSON.stringify(flow.globalParams || []),
    jobFlowId: flow.id
  }

  jaoApi.createFlowInstance(payload)
    .then((response) => {
      const instanceId = response?.data?.id || response?.id
      ElMessage.success('流程已开始执行')
      emit('saved')
      visible.value = false
      // 可选:打开实例查看页面
      if (instanceId) {

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

<style scoped lang="scss">
.flow-editor {
  position: fixed;
  inset: 0;
  z-index: 1000;
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

.header-close {
  font-size: 18px;
  color: #909399;
}

.header-close:hover {
  color: #606266;
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
  padding: 24px;
}

.flow-editor__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  flex-shrink: 0;
}

/* 表单样式 */
.flow-form {
  :deep(.el-form-item__label) {
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  :deep(.el-form-item__content) {
    flex-wrap: wrap;
  }
}

.form-section {
  margin-bottom: 32px;
  border-radius: 4px;
  background-color: var(--el-fill-color-blank);

  .section-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    display: flex;
    align-items: center;
  }

  .el-form-item {
    margin-bottom: 18px;
  }
}

.section-disabled {
  opacity: 0.7;
  pointer-events: none;

  :deep(.acm-device-selector) {
    pointer-events: auto;
    opacity: 1;
  }
}

.text-muted {
  color: var(--el-text-color-secondary);
}

.text-primary {
  color: var(--el-color-primary);
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



/* 步骤区域 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  .section-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin: 0;
    padding: 0;
    border: none;
  }

  .section-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .fold-btn {
    color: var(--el-color-primary);

    &:hover {
      background: var(--el-color-primary-light-9);
    }
  }
}

.step-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.step-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  background: #fff;
  overflow: hidden;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
}

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--el-fill-color-light);
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;

  &:hover {
    background: var(--el-fill-color);
  }

  .step-title {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .step-number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: var(--el-color-primary);
    color: #fff;
    border-radius: 50%;
    font-size: 12px;
    font-weight: bold;
  }

  .step-name {
    color: var(--el-text-color-regular);
    font-weight: 500;
  }

  .step-actions {
    display: flex;
    align-items: center;
    gap: 12px;

    .toggle-icon {
      color: var(--el-text-color-secondary);
      font-size: 14px;
      transition: transform 0.2s;
    }
  }
}

.step-body {
  padding: 20px;
  background: #fafafa;

  .el-form-item {
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }
  }
}

/* 参数区域 */
.param-toolbar {
  margin-bottom: 12px;
}

/* 参数表格 */
.op-param-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.op-param-table th,
.op-param-table td {
  border: 1px solid var(--el-border-color-lighter);
  padding: 8px 10px;
  vertical-align: middle;
}

.op-param-table th {
  background: var(--el-fill-color-light);
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
  color: var(--el-text-color-primary);
}

.op-param-table :deep(.el-input) {
  width: 100%;
}

.op-param-table :deep(.el-checkbox) {
  height: auto;
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

.form-row {
  margin-bottom: 16px;
}

.tooltip-icon {
  display: inline-block !important;
  cursor: help !important;
  line-height: 1;
}

.tooltip-icon:hover {
  cursor: help !important;
}
</style>
