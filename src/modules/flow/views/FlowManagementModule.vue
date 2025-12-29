<template>
  <ModulePageLayout
    :title="moduleTitle"
    :description="moduleDescription"
    :hide-header="true"
  >
    <!-- 设计器视图（全屏） -->
    <div v-if="isDesignMode" class="design-container">
      <FlowDesignView
        :flow-id="designFlowId"
        :detail-id="designDetailId"
        @back="handleDesignBack"
        @saved="handleDesignSaved"
      />
    </div>

    <!-- 执行视图（全屏） -->
    <div v-else-if="isExecMode" class="exec-container">
      <FlowExecView
        :process-id="execFlowId"
        @back="handleExecBack"
        @executed="handleExecDone"
      />
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
    <div v-else class="ops-module ops-module--with-sidebar">
      <ModuleSideMenu
        :menu-groups="menuGroups"
        :default-openeds="defaultOpeneds"
      />

      <section class="ops-module__content">
        <router-view />
      </section>
    </div>
  </ModulePageLayout>
</template>

<script setup>
import { ref, provide, computed } from 'vue'
import ModulePageLayout from '@/modules/shared/components/ModulePageLayout.vue'
import ModuleSideMenu from '@/modules/shared/components/ModuleSideMenu.vue'
import FlowDesignView from '@/modules/flow/components/FlowDesignView.vue'
import FlowExecView from '@/modules/flow/components/FlowExecView.vue'
import FlowHistoryView from '@/modules/flow/components/FlowHistoryView.vue'
import { MENU_CONFIG } from '@/config/menu.config.js'
import { getGroupMenuConfig } from '@/config/module-nav.config.js'

const moduleTitle = '流程管理'
const moduleDescription = ''

// 获取"用户管理"分组下的所有模块菜单（用户、流程、sudo权限、密码）
const menuGroups = computed(() => getGroupMenuConfig('user-management', MENU_CONFIG))

// 默认展开流程菜单
const defaultOpeneds = ['flow']

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
// 特定于流程模块的全屏视图容器
.design-container,
.exec-container,
.history-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
