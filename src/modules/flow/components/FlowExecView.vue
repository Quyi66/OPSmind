<template>
  <div class="flow-exec-view">
    <!-- 顶部导航栏 -->
    <div class="design-header">
      <div class="header-left">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item>
            <a @click.prevent="handleBack">流程列表</a>
          </el-breadcrumb-item>
          <el-breadcrumb-item>{{ processInfo.processName || '流程执行' }}</el-breadcrumb-item>
        </el-breadcrumb>
      </div>

      <div class="header-center">
        <div class="scene-selector-wrapper">
          <el-select
            v-model="currentSceneId"
            size="small"
            placeholder="选择场景"
            clearable
            style="width: 180px"
            @change="handleSceneChange"
          >
            <el-option
              v-for="scene in sceneList"
              :key="scene.id"
              :label="scene.name"
              :value="scene.id"
            />
          </el-select>

          <el-button size="small" circle @click="handleAddScene">
            <i class="fa fa-plus"></i>
          </el-button>
          <el-button
            size="small"
            circle
            type="success"
            v-if="currentSceneId"
            @click="handleEditScene"
          >
            <i class="fa fa-edit"></i>
          </el-button>
          <el-button
            size="small"
            circle
            type="danger"
            v-if="currentSceneId"
            @click="handleDeleteScene"
          >
            <i class="fa fa-trash"></i>
          </el-button>
        </div>
      </div>

      <div class="header-right">
        <el-button type="primary" size="small" :loading="executing" @click="handleExecute">
          <i class="fa fa-play"></i>
          执行
        </el-button>
      </div>
    </div>

    <!-- 主体区域 -->
    <div class="exec-body">
      <!-- BPMN 查看器 -->
      <div class="bpmn-viewer-container" ref="bpmnContainer">
        <div class="viewer-placeholder" v-if="!viewerLoaded">
          <i class="fa fa-spinner fa-spin"></i>
          <p>加载中...</p>
        </div>
        <div ref="viewerCanvas" class="bpmn-canvas"></div>
      </div>

      <!-- 右侧属性面板 -->
      <aside class="params-panel">
        <!-- 节点属性信息（只读） -->
        <template v-if="currentNode">
          <div class="panel-header">{{ elementProperties.id || 'Process' }}</div>
          <div class="panel-tabs">
            <div class="panel-tab is-active">基本属性</div>
          </div>
          <div class="panel-content">
            <div class="section-title">基本属性</div>

            <div class="property-group">
              <label>ID</label>
              <el-input v-model="elementProperties.id" size="small" disabled />
            </div>

            <div class="property-group">
              <label>名称</label>
              <el-input
                v-model="elementProperties.name"
                size="small"
                placeholder="未设置名称"
                disabled
              />
            </div>

            <div class="property-group">
              <label>类型</label>
              <el-input v-model="elementProperties.type" size="small" disabled />
            </div>

            <div class="section-title">备注</div>

            <div class="property-group">
              <label>元素备注</label>
              <el-input
                v-model="elementProperties.documentation"
                type="textarea"
                :rows="3"
                size="small"
                placeholder="无备注"
                disabled
              />
            </div>
          </div>

          <!-- 参数区域 -->
          <div class="params-content" v-if="currentNode.needParams">
            <div class="params-card">
              <div class="card-header">参数配置</div>
              <div class="card-body">
                <template v-for="(param, index) in currentNodeParams" :key="index">
                  <!-- 文本参数 -->
                  <div class="param-item" v-if="param.type === 'TEXT'">
                    <label>{{ param.label || param.name }}</label>
                    <el-input
                      v-model="paramsValues[currentNode.id][param.name]"
                      size="small"
                      :placeholder="param.desc || ''"
                    />
                  </div>

                  <!-- 数字参数 -->
                  <div class="param-item" v-else-if="param.type === 'INTEGER'">
                    <label>{{ param.label || param.name }}</label>
                    <el-input-number
                      v-model="paramsValues[currentNode.id][param.name]"
                      size="small"
                      :placeholder="param.desc || ''"
                    />
                  </div>

                  <!-- 开关参数 -->
                  <div class="param-item" v-else-if="param.type === 'SWITCH'">
                    <label>{{ param.label || param.name }}</label>
                    <el-switch v-model="paramsValues[currentNode.id][param.name]" />
                  </div>

                  <!-- 日期参数 -->
                  <div class="param-item" v-else-if="param.type === 'DATE'">
                    <label>{{ param.label || param.name }}</label>
                    <el-date-picker
                      v-model="paramsValues[currentNode.id][param.name]"
                      type="datetime"
                      size="small"
                      placeholder="选择日期时间"
                      format="YYYY-MM-DD HH:mm:ss"
                      value-format="YYYY-MM-DD HH:mm:ss"
                    />
                  </div>

                  <!-- 主机选择参数 -->
                  <div class="param-item" v-else-if="param.type === 'HOST'">
                    <label>{{ param.label || '主机' }}</label>
                    <el-input
                      v-model="paramsValues[currentNode.id][param.name]"
                      size="small"
                      placeholder="选择主机"
                    />
                  </div>
                </template>

                <el-empty description="无参数配置" v-if="!currentNodeParams.length" />
              </div>
            </div>
          </div>
        </template>

        <el-empty description="请选择节点查看参数" v-else />

        <!-- 内置参数说明 -->
        <div class="help-card">
          <div class="card-body">
            <p>内置参数说明：流程执行时会自动注入上下文参数</p>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import BpmnViewer from 'bpmn-js/lib/Viewer'
import * as flowApi from '@/modules/flow/api'

const props = defineProps({
  processId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['back', 'executed'])

const bpmnContainer = ref(null)
const viewerCanvas = ref(null)
const viewerLoaded = ref(false)
const executing = ref(false)

let bpmnViewer = null

const processInfo = ref({
  id: '',
  processName: '',
  processKey: '',
  processDetailId: ''
})

const processDetail = ref({
  processXml: ''
})

const sceneList = ref([])
const currentSceneId = ref('')
const currentNode = ref(null)
const currentNodeParams = ref([])
const paramsValues = reactive({})

// 选中元素的属性（只读展示）
const elementProperties = reactive({
  id: '',
  name: '',
  type: '',
  documentation: ''
})

// 初始化 BPMN 查看器
async function initViewer() {
  await nextTick()

  if (!viewerCanvas.value) return

  bpmnViewer = new BpmnViewer({
    container: viewerCanvas.value
  })

  // 监听节点点击
  const eventBus = bpmnViewer.get('eventBus')
  eventBus.on('element.click', e => {
    const element = e.element
    if (element.type !== 'bpmn:Process') {
      selectNode(element)
    }
  })

  viewerLoaded.value = true
}

// 加载 BPMN 图
async function loadBpmnDiagram(xml) {
  if (!bpmnViewer || !xml) return

  try {
    await bpmnViewer.importXML(xml)
    const canvas = bpmnViewer.get('canvas')
    canvas.zoom('fit-viewport')
  } catch (error) {
    console.error('Failed to load BPMN diagram:', error)
  }
}

// 选择节点
function selectNode(element) {
  const businessObject = element.businessObject
  currentNode.value = {
    id: element.id,
    name: businessObject.name || element.id,
    type: element.type,
    needParams: element.type.includes('Task')
  }

  // 更新元素属性（用于只读展示）
  elementProperties.id = element.id
  elementProperties.name = businessObject.name || ''
  elementProperties.type = element.type
  // 获取 documentation
  const docs = businessObject.documentation || []
  elementProperties.documentation = docs.length > 0 ? docs[0].text || '' : ''

  // 初始化该节点的参数值
  if (!paramsValues[element.id]) {
    paramsValues[element.id] = {}
  }
}

// 加载流程数据
async function loadProcessData() {
  try {
    // 加载流程信息和详情
    const [infoRes, detailRes, paramsRes] = await Promise.all([
      flowApi.getFlowInfo(props.processId),
      flowApi.getFlowDetail(props.processId),
      flowApi.getFlowParams(props.processId)
    ])

    processInfo.value = infoRes?.data || infoRes || {}
    processDetail.value = detailRes?.data || detailRes || {}

    // 处理参数
    const params = paramsRes?.data || paramsRes || []
    currentNodeParams.value = Array.isArray(params) ? params : []

    // 加载 BPMN 图
    if (processDetail.value.processXml) {
      await loadBpmnDiagram(processDetail.value.processXml)
    }
  } catch (error) {
    console.error('Failed to load process data:', error)
    ElMessage.error('加载流程数据失败')
  }
}

function handleBack() {
  emit('back')
}

function handleSceneChange() {
  // 场景切换时加载场景参数
}

function handleAddScene() {
  // ElMessage.info('添加场景功能待实现')
}

function handleEditScene() {
  ElMessage.info('编辑场景功能待实现')
}

function handleDeleteScene() {
  ElMessageBox.confirm('确定要删除该场景吗？', '提示', { type: 'warning' })
    .then(() => {
      ElMessage.info('删除场景功能待实现')
    })
    .catch(() => {})
}

async function handleExecute() {
  executing.value = true
  try {
    await flowApi.runFlow({
      processId: props.processId,
      params: paramsValues
    })
    ElMessage.success('流程执行已启动')
    emit('executed')
  } catch (error) {
    console.error('Failed to execute flow:', error)
    ElMessage.error('执行失败')
  } finally {
    executing.value = false
  }
}

onMounted(async () => {
  await initViewer()
  await loadProcessData()
})

onBeforeUnmount(() => {
  if (bpmnViewer) {
    bpmnViewer.destroy()
    bpmnViewer = null
  }
})
</script>

<style scoped lang="scss">
.flow-exec-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
}

// 顶部导航栏
.design-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 20px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  flex-shrink: 0;

  .header-left {
    flex: 1;
    display: flex;
    align-items: center;

    :deep(.el-breadcrumb) {
      font-size: 14px;

      .el-breadcrumb__item {
        .el-breadcrumb__inner {
          a {
            color: var(--el-color-primary);
            font-weight: normal;
            cursor: pointer;
            text-decoration: none;
            transition: color 0.2s;

            &:hover {
              color: var(--el-color-primary-light-3);
            }
          }
        }

        &:last-child .el-breadcrumb__inner {
          color: var(--el-text-color-regular);
          font-weight: 500;
        }
      }
    }
  }

  .header-center {
    display: flex;
    justify-content: center;
  }

  .header-right {
    flex: 1;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
}

.scene-selector-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.exec-body {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

.bpmn-viewer-container {
  flex: 1;
  position: relative;
  background: var(--el-bg-color-page);
  border-right: 1px solid var(--el-border-color-light);
}

.viewer-placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: var(--el-text-color-secondary);

  i {
    font-size: 32px;
    margin-bottom: 12px;
  }
}

.bpmn-canvas {
  width: 100%;
  height: 100%;
}

.params-panel {
  width: 300px;
  flex-shrink: 0;
  overflow-y: auto;
  background: var(--el-bg-color);
  border-left: 1px solid var(--el-border-color-light);
}

.panel-header {
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  background: var(--el-bg-color-page);
  border-bottom: 1px solid var(--el-border-color-light);
}

.panel-tabs {
  display: flex;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color);
}

.panel-tab {
  padding: 10px 16px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;

  &:hover {
    color: var(--el-color-primary);
  }

  &.is-active {
    color: var(--el-color-primary);
    border-bottom-color: var(--el-color-primary);
  }
}

.panel-content {
  padding: 16px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  margin-bottom: 12px;
  margin-top: 16px;

  &:first-child {
    margin-top: 0;
  }
}

.property-group {
  margin-bottom: 12px;

  label {
    display: block;
    font-size: 12px;
    color: var(--el-text-color-regular);
    margin-bottom: 4px;
  }
}

.params-content {
  padding: 0 16px 16px;
}

.params-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  margin-bottom: 16px;

  .card-header {
    padding: 10px 16px;
    font-weight: 600;
    font-size: 13px;
    background: var(--el-bg-color-page);
    border-bottom: 1px solid var(--el-border-color-light);
    border-radius: 8px 8px 0 0;
  }

  .card-body {
    padding: 16px;
  }
}

.param-item {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }

  label {
    display: block;
    font-size: 13px;
    color: var(--el-text-color-regular);
    margin-bottom: 6px;
  }
}

.help-card {
  margin-top: 16px;
  padding: 12px;
  background: var(--el-bg-color-page);
  border-radius: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);

  p {
    margin: 0;
  }
}
</style>
