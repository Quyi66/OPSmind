<template>
  <div class="flow-design-view">
    <!-- 顶部标签栏 -->
    <div class="design-tabs">
      <div class="tabs-left">
        <div
          class="tab-item"
          :class="{ 'is-active': activeTab === 'modeler' }"
          @click="activeTab = 'modeler'"
        >
          Modeler
        </div>
        <div
          class="tab-item"
          :class="{ 'is-active': activeTab === 'xml' }"
          @click="activeTab = 'xml'"
        >
          Bpmn Xml
        </div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="design-toolbar">
      <div class="toolbar-left">
        <el-button type="primary" size="small" link @click="handleBack">
          <i class="fa fa-arrow-left"></i> 返回
        </el-button>
      </div>
      <div class="toolbar-right">
        <el-button type="primary" size="small" @click="handleSave">
          <i class="fa fa-save"></i> 保存
        </el-button>
      </div>
    </div>

    <!-- Modeler 视图 -->
    <div v-show="activeTab === 'modeler'" class="design-body">
      <!-- 左侧工具面板 (由 bpmn-js 提供) -->

      <!-- 中间画布区域 -->
      <div class="canvas-wrapper">
        <!-- 状态栏 -->
        <div class="canvas-header">
          <div class="header-left">
            <span class="header-title">流程模拟</span>
            <el-switch
              v-model="isSimulationMode"
              size="small"
              @change="toggleSimulation"
            />
          </div>
          <div class="header-center">
            <el-tag type="success" size="small">
              <i class="fa fa-check"></i> {{ errorCount }} Errors, {{ warningCount }} Warnings
            </el-tag>
          </div>
          <div class="header-right">
            <el-button size="small" link @click="toggleMinimap">
              <i class="fa fa-map"></i>
            </el-button>
          </div>
        </div>

        <!-- BPMN 画布 -->
        <div class="canvas-container">
          <div class="canvas-placeholder" v-if="!isModelerLoaded">
            <i class="fa fa-spinner fa-spin"></i>
            <p>流程设计器加载中...</p>
          </div>
          <div ref="bpmnContainer" class="bpmn-canvas"></div>
        </div>
      </div>

      <!-- 右侧属性面板 -->
      <aside class="property-panel">
        <div class="panel-header">{{ selectedElement ? selectedElement.id : 'Process' }}</div>
        <div class="panel-tabs">
          <div class="panel-tab is-active">基本属性</div>
        </div>
        <div class="panel-content">
          <div class="section-title">基本属性</div>

          <div class="property-group">
            <label>名称</label>
            <el-input
              v-model="elementProperties.name"
              size="small"
              placeholder=""
              @change="updateElementName"
            />
          </div>

          <div class="section-title">备注</div>

          <div class="property-group">
            <label>元素备注</label>
            <el-input
              v-model="elementProperties.documentation"
              type="textarea"
              :rows="3"
              size="small"
              placeholder=""
              @change="updateElementDocumentation"
            />
          </div>
        </div>
      </aside>
    </div>

    <!-- XML 视图 -->
    <div v-show="activeTab === 'xml'" class="xml-view">
      <pre class="xml-content">{{ currentXml }}</pre>
    </div>

    <!-- 保存对话框 -->
    <FlowEditDialog
      v-model="showSaveDialog"
      :mode="saveDialogMode"
      :title="saveDialogMode === 'process' ? '新建流程' : '保存版本'"
      :flow-data="saveDialogData"
      @confirm="handleSaveConfirm"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import BpmnModeler from 'bpmn-js/lib/Modeler'
import TokenSimulationModule from 'bpmn-js-token-simulation'
import minimapModule from 'diagram-js-minimap'
import * as flowApi from '@/modules/flow/api'
import FlowEditDialog from './FlowEditDialog.vue'

// 导入 bpmn-js 样式
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css'
// 导入 token simulation 样式
import 'bpmn-js-token-simulation/assets/css/bpmn-js-token-simulation.css'
// 导入 minimap 样式
import 'diagram-js-minimap/assets/diagram-js-minimap.css'

const props = defineProps({
  flowId: {
    type: String,
    default: ''
  },
  detailId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['back', 'saved'])

const bpmnContainer = ref(null)
const isModelerLoaded = ref(false)
const activeTab = ref('modeler')
const currentXml = ref('')
const errorCount = ref(0)
const warningCount = ref(0)
const isSimulationMode = ref(false)

let bpmnModeler = null

const flowInfo = reactive({
  id: '',
  processDetailId: '',
  processName: '',
  processAbbr: '',
  processKey: ''
})

const processProperties = reactive({
  name: '',
  isSingleton: false,
  remarks: ''
})

// 选中的元素
const selectedElement = ref(null)
const elementProperties = reactive({
  name: '',
  documentation: ''
})

// 默认空白 BPMN 图
const defaultBpmnXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  id="Definitions_1"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:endEvent id="EndEvent_1">
      <bpmn:incoming>Flow_1</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="180" y="200" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="400" y="200" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="216" y="218" />
        <di:waypoint x="400" y="218" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`

// 监听 tab 切换，更新 XML
watch(activeTab, async (newTab) => {
  if (newTab === 'xml') {
    currentXml.value = await getCurrentXml()
  }
})

// 初始化 BPMN 建模器
async function initBpmnModeler() {
  await nextTick()

  if (!bpmnContainer.value) {
    console.error('BPMN container not found')
    return
  }

  bpmnModeler = new BpmnModeler({
    container: bpmnContainer.value,
    additionalModules: [
      TokenSimulationModule,
      minimapModule
    ]
  })

  // 监听选择事件
  const eventBus = bpmnModeler.get('eventBus')
  eventBus.on('selection.changed', (e) => {
    const element = e.newSelection[0]
    if (element) {
      selectedElement.value = element
      const bo = element.businessObject
      elementProperties.name = bo.name || ''
      // 获取 documentation
      const docs = bo.documentation || []
      elementProperties.documentation = docs.length > 0 ? docs[0].text || '' : ''
    } else {
      selectedElement.value = null
      elementProperties.name = ''
      elementProperties.documentation = ''
    }
  })

  isModelerLoaded.value = true
}

// 加载 BPMN 图
async function loadBpmnDiagram(xml) {
  if (!bpmnModeler) return

  try {
    await bpmnModeler.importXML(xml)
    // 自适应画布
    const canvas = bpmnModeler.get('canvas')
    canvas.zoom('fit-viewport')
  } catch (error) {
    console.error('Failed to load BPMN diagram:', error)
    ElMessage.error('加载流程图失败')
  }
}

// 加载流程信息和BPMN XML
async function loadFlowDetail() {
  if (!props.flowId) {
    // 新建流程，加载默认图
    await loadBpmnDiagram(defaultBpmnXml)
    return
  }

  try {
    // 加载流程基本信息
    const infoResponse = await flowApi.getFlowInfo(props.flowId)
    const processData = infoResponse?.data || infoResponse
    if (processData) {
      Object.assign(flowInfo, processData)
      processProperties.name = processData.processName || ''
      processProperties.remarks = processData.remarks || ''
    }

    // 加载流程详情（BPMN XML）
    // 传递 processId 和可选的 detailId（查看历史版本时使用）
    const detailResponse = await flowApi.getFlowDetail(props.flowId, props.detailId)
    const detailData = detailResponse?.data || detailResponse

    if (detailData && detailData.processXml) {
      // 如果是查看历史版本，更新 processDetailId
      if (props.detailId) {
        flowInfo.processDetailId = props.detailId
      }
      await loadBpmnDiagram(detailData.processXml)
    } else {
      await loadBpmnDiagram(defaultBpmnXml)
    }
  } catch (error) {
    console.error('Failed to load flow detail:', error)
    ElMessage.error('加载流程详情失败')
    await loadBpmnDiagram(defaultBpmnXml)
  }
}

// 获取当前 XML
async function getCurrentXml() {
  if (!bpmnModeler) return ''
  try {
    const result = await bpmnModeler.saveXML({ format: true })
    return result.xml
  } catch (error) {
    console.error('Failed to get XML:', error)
    return ''
  }
}

// 更新元素名称
function updateElementName() {
  if (!selectedElement.value || !bpmnModeler) return
  const modeling = bpmnModeler.get('modeling')
  modeling.updateProperties(selectedElement.value, {
    name: elementProperties.name
  })
}

// 更新元素备注 (documentation)
function updateElementDocumentation() {
  if (!selectedElement.value || !bpmnModeler) return
  const modeling = bpmnModeler.get('modeling')
  const bpmnFactory = bpmnModeler.get('bpmnFactory')
  const bo = selectedElement.value.businessObject

  // 创建或更新 documentation
  const documentation = bpmnFactory.create('bpmn:Documentation', {
    text: elementProperties.documentation
  })

  modeling.updateProperties(selectedElement.value, {
    documentation: [documentation]
  })
}

function handleBack() {
  emit('back')
}

// 保存对话框状态
const showSaveDialog = ref(false)
const saveDialogData = ref(null)
const saveDialogMode = ref('processDetail')

async function handleSave() {
  // 判断是新建还是编辑模式
  if (!props.flowId) {
    // 新建流程 - 使用 process 模式弹窗
    saveDialogMode.value = 'process'
    saveDialogData.value = {
      processName: '',
      processAbbr: '',
      remarks: ''
    }
  } else {
    // 编辑已有流程 - 使用 processDetail 模式弹窗
    saveDialogMode.value = 'processDetail'
    saveDialogData.value = {
      remark: '',
      copyScenes: false
    }
  }
  showSaveDialog.value = true
}

async function handleSaveConfirm(data) {
  try {
    const xml = await getCurrentXml()

    if (!props.flowId) {
      // 新建流程
      // 生成 processKey
      const processId = `Process_${Math.random().toString(36).substring(2, 9)}`
      await flowApi.createFlow({
        processKey: `opflow-${processId.toLowerCase().replace('_', '-')}`,
        processName: data.processName,
        processAbbr: data.processAbbr,
        remarks: data.remarks || '',
        bpmnXml: xml
      })
      ElMessage.success('创建成功')
    } else {
      // 编辑已有流程
      await flowApi.saveFlowDesign({
        id: flowInfo.processDetailId || flowInfo.id,
        processXml: xml,
        remarks: data.remark || '',
        copyScenes: data.copyScenes || false
      })
      ElMessage.success('保存成功')
    }
    emit('saved')
  } catch (error) {
    console.error('Failed to save:', error)
    ElMessage.error(props.flowId ? '保存失败' : '创建失败')
  }
}

function toggleMinimap() {
  if (!bpmnModeler) return

  try {
    const minimap = bpmnModeler.get('minimap')
    if (minimap) {
      minimap.toggle()
    }
  } catch (error) {
    console.warn('Minimap toggle failed:', error)
  }
}

// 切换流程模拟模式
function toggleSimulation(enabled) {
  if (!bpmnModeler) return

  try {
    const toggleMode = bpmnModeler.get('toggleMode')
    if (toggleMode) {
      toggleMode.toggleMode(enabled)
    }
  } catch (error) {
    console.warn('Token simulation toggle failed:', error)
    isSimulationMode.value = !enabled
  }
}

function updateProcessName() {
  // 更新流程名称
  if (!bpmnModeler) return
  const modeling = bpmnModeler.get('modeling')
  const canvas = bpmnModeler.get('canvas')
  const rootElement = canvas.getRootElement()
  if (rootElement && rootElement.businessObject) {
    modeling.updateProperties(rootElement, {
      name: processProperties.name
    })
  }
}

onMounted(async () => {
  await initBpmnModeler()
  await loadFlowDetail()
})

onBeforeUnmount(() => {
  if (bpmnModeler) {
    bpmnModeler.destroy()
    bpmnModeler = null
  }
})
</script>

<style scoped lang="scss">
.flow-design-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
}

// 顶部标签栏
.design-tabs {
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;

  .tabs-left {
    display: flex;
  }

  .tab-item {
    padding: 12px 20px;
    cursor: pointer;
    color: #64748b;
    font-size: 14px;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;

    &:hover {
      color: #1890ff;
    }

    &.is-active {
      color: #1890ff;
      border-bottom-color: #1890ff;
    }
  }
}

// 工具栏
.design-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid #e2e8f0;
  background: #fff;
  flex-shrink: 0;
}

.toolbar-left, .toolbar-right {
  display: flex;
  gap: 8px;
}

// 设计器主体
.design-body {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

// 画布包装器
.canvas-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-right: 1px solid #e2e8f0;
}

// 画布头部状态栏
.canvas-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid #e2e8f0;
  background: #fff;

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #333;
    font-size: 14px;
  }

  .header-center {
    flex: 1;
    display: flex;
    justify-content: center;
  }

  .header-right {
    display: flex;
    gap: 8px;
  }
}

// 画布容器
.canvas-container {
  flex: 1;
  position: relative;
  background: #fafafa;
  overflow: hidden;
}

.canvas-placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #94a3b8;
  z-index: 10;

  i {
    font-size: 32px;
    margin-bottom: 12px;
  }

  p {
    margin: 0;
  }
}

.bpmn-canvas {
  width: 100%;
  height: 100%;
}

// 右侧属性面板
.property-panel {
  width: 280px;
  flex-shrink: 0;
  background: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 12px 16px;
  font-size: 14px;
  color: #333;
  border-bottom: 1px solid #e2e8f0;
  background: #fafafa;
}

.panel-tabs {
  display: flex;
  border-bottom: 1px solid #e2e8f0;

  .panel-tab {
    padding: 8px 16px;
    font-size: 13px;
    color: #64748b;
    cursor: pointer;
    border: 1px solid transparent;
    border-bottom: none;
    background: #f8fafc;
    margin-bottom: -1px;

    &.is-active {
      color: #333;
      background: #fff;
      border-color: #e2e8f0;
      border-bottom-color: #fff;
    }
  }
}

.panel-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
}

.property-group {
  margin-bottom: 16px;

  label {
    display: block;
    font-size: 13px;
    color: #64748b;
    margin-bottom: 6px;
  }

  &.checkbox-group {
    .hint-text {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 4px;
    }
  }
}

// XML 视图
.xml-view {
  flex: 1;
  overflow: auto;
  background: #1e293b;
  padding: 16px;
}

.xml-content {
  color: #e2e8f0;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  margin: 0;
}

// bpmn-js 样式覆盖
:deep(.djs-palette) {
  width: 48px;
  background: #fff;
  border-right: 1px solid #e2e8f0;
}

// 隐藏库自带的 Token Simulation 按钮（使用自定义开关替代）
:deep(.bts-toggle-mode) {
  display: none !important;
}

// 隐藏 bpmn.io logo
:deep(.bjs-powered-by) {
  display: none !important;
}

// 隐藏库自带的小地图开关按钮（使用自定义按钮替代）
:deep(.djs-minimap-toggle) {
  display: none !important;
}
</style>
