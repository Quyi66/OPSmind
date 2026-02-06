<template>
  <div class="ops-module__content">
    <!-- 设计器视图（全屏） -->
    <div v-if="isDesignMode" class="design-container">
      <FlowDesignView
        :flow-id="designFlowId"
        :detail-id="designDetailId"
        :from="previousMode"
        @back="handleDesignBack"
        @saved="handleDesignSaved"
      />
    </div>

    <!-- 执行视图（全屏） -->
    <div v-else-if="isExecMode" class="exec-container">
      <FlowExecView :process-id="execFlowId" @back="handleExecBack" @executed="handleExecDone" />
    </div>

    <!-- 历史版本视图（全屏） -->
    <div v-else-if="isHistoryMode" class="history-container">
      <FlowHistoryView
        :process-id="historyProcessId"
        @back="handleHistoryBack"
        @view-version="handleViewHistoryVersion"
      />
    </div>

    <!-- 常规视图 -->
    <router-view v-else />
  </div>
</template>

<script setup>
import { ref, provide } from 'vue'
import FlowDesignView from '@/modules/flow/components/FlowDesignView.vue'
import FlowExecView from '@/modules/flow/components/FlowExecView.vue'
import FlowHistoryView from '@/modules/flow/components/FlowHistoryView.vue'

// 设计器模式
const isDesignMode = ref(false)
const designFlowId = ref('')
const designDetailId = ref('')

// 执行模式
const isExecMode = ref(false)
const execFlowId = ref('')

// 历史版本模式
const isHistoryMode = ref(false)
const historyProcessId = ref('')

// 导航历史
const previousMode = ref('')

// 创建新流程
function handleCreate() {
  designFlowId.value = ''
  isDesignMode.value = true
}

// 设计现有流程
function handleDesign(flowId) {
  designFlowId.value = flowId
  previousMode.value = 'list'
  isDesignMode.value = true
}

// 返回（从设计视图）
function handleDesignBack() {
  isDesignMode.value = false
  designFlowId.value = ''
  designDetailId.value = ''

  if (previousMode.value === 'history') {
    isHistoryMode.value = true
  }
  previousMode.value = ''
}

// 设计保存成功
function handleDesignSaved() {
  isDesignMode.value = false
  designFlowId.value = ''
  designDetailId.value = ''
  previousMode.value = ''
}

// 执行流程
function handleExecute(flowId) {
  execFlowId.value = flowId
  isExecMode.value = true
}

// 返回列表（从执行视图）
function handleExecBack() {
  isExecMode.value = false
  execFlowId.value = ''
}

// 执行完成
function handleExecDone() {
  isExecMode.value = false
  execFlowId.value = ''
}

// 查看历史版本
function handleHistory(processId) {
  historyProcessId.value = processId
  isHistoryMode.value = true
}

// 返回列表（从历史视图）
function handleHistoryBack() {
  isHistoryMode.value = false
  historyProcessId.value = ''
}

// 从历史版本跳转到设计页查看
function handleViewHistoryVersion(data) {
  previousMode.value = 'history'
  designFlowId.value = data.processId
  designDetailId.value = data.detailId
  isDesignMode.value = true
}

// 提供给子组件使用
provide('handleCreate', handleCreate)
provide('handleDesign', handleDesign)
provide('handleExecute', handleExecute)
provide('handleHistory', handleHistory)
</script>

<style scoped lang="scss">
.ops-module__content {
  // flex: 1;
  overflow: auto;
  min-height: 0;
  height: 100%;
}

// 特定于流程模块的全屏视图容器
.design-container,
.exec-container,
.history-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
