<template>
  <ModulePageLayout
    :title="moduleTitle"
    :description="moduleDescription"
    :hide-header="true"
  >
    <div class="patches-module">
      <aside class="ops-sidebar-nav ops-sidebar-nav--narrow">
        <div
          v-for="item in navItems"
          :key="item.key"
          class="ops-sidebar-item"
          :class="{ 'is-active': activeView === item.key }"
          @click="handleNavClick(item)"
        >
          <i :class="item.icon" />
          <span>{{ item.label }}</span>
        </div>
      </aside>

      <section class="patches-module__content">
        <!-- Linux补丁扫描（默认页面） -->
        <div v-if="activeView === 'linuxPatchScan'" class="view-container">
          <div class="view-card">
            <LinuxPatchScan ref="linuxPatchScanRef" @install="handleInstallPatch" @navigate="handleNavigate" />
          </div>
        </div>

        <!-- Linux补丁安装 -->
        <div v-else-if="activeView === 'linuxPatchInstall'" class="view-container">
          <div class="view-card">
            <LinuxPatchInstall ref="linuxPatchInstallRef" />
          </div>
        </div>

        <!-- Linux补丁回退 -->
        <div v-else-if="activeView === 'linuxPatchRollback'" class="view-container">
          <div class="view-card">
            <LinuxPatchRollback ref="linuxPatchRollbackRef" />
          </div>
        </div>

        <!-- LinuxYUM管理 -->
        <div v-else-if="activeView === 'linuxYumManage'" class="view-container">
          <div class="view-card">
            <LinuxYumManage ref="linuxYumManageRef" />
          </div>
        </div>

        <!-- Linux补丁仓库 -->
        <div v-else-if="activeView === 'linuxPatchLibrary'" class="view-container">
          <div class="view-card">
            <LinuxPatchLibrary ref="linuxPatchLibraryRef" />
          </div>
        </div>

        <!-- Linux漏洞概览 -->
        <div v-else-if="activeView === 'linuxVulnerability'" class="view-container">
          <div class="view-card">
            <LinuxVulnerability ref="linuxVulnerabilityRef" />
          </div>
        </div>

        <!-- Windows漏洞 -->
        <div v-else-if="activeView === 'windowsVulnerability'" class="view-container">
          <div class="view-card">
            <WindowsVulnerability ref="windowsVulnerabilityRef" />
          </div>
        </div>

        <!-- Windows更新 -->
        <div v-else-if="activeView === 'windowsUpdate'" class="view-container">
          <div class="view-card">
            <WindowsUpdate ref="windowsUpdateRef" />
          </div>
        </div>

        <!-- Windows回滚 -->
        <div v-else-if="activeView === 'windowsRollback'" class="view-container">
          <div class="view-card">
            <WindowsRollback ref="windowsRollbackRef" />
          </div>
        </div>

        <!-- Windows View -->
        <div v-else-if="activeView === 'windowsView'" class="view-container">
          <div class="view-card">
            <WindowsView ref="windowsViewRef" />
          </div>
        </div>

        <!-- 操作日志报告 -->
        <div v-else-if="activeView === 'logs'" class="view-container">
          <div class="view-card">
            <OperationLogs ref="operationLogsRef" />
          </div>
        </div>
      </section>
    </div>

    <!-- 安装补丁对话框 -->
    <InstallPatchDialog
      v-model:visible="installDialogVisible"
      :patches="selectedPatches"
      @success="handleInstallSuccess"
    />
  </ModulePageLayout>
</template>

<script setup>
import { ref } from 'vue'
import ModulePageLayout from '@/modules/shared/components/ModulePageLayout.vue'
import { NAV_ITEMS } from '../constants'

// 懒加载组件
import LinuxPatchScan from '../components/LinuxPatchScan.vue'
import LinuxPatchInstall from '../components/LinuxPatchInstall.vue'
import LinuxPatchRollback from '../components/LinuxPatchRollback.vue'
import LinuxYumManage from '../components/LinuxYumManage.vue'
import LinuxPatchLibrary from '../components/LinuxPatchLibrary.vue'
import LinuxVulnerability from '../components/LinuxVulnerability.vue'
import WindowsVulnerability from '../components/WindowsVulnerability.vue'
import WindowsUpdate from '../components/WindowsUpdate.vue'
import WindowsRollback from '../components/WindowsRollback.vue'
import WindowsView from '../components/WindowsView.vue'
import OperationLogs from '../components/OperationLogs.vue'
import InstallPatchDialog from '../components/dialogs/InstallPatchDialog.vue'

// 导航配置
const navItems = NAV_ITEMS

// 当前激活的视图 - 默认为Linux补丁扫描
const activeView = ref('linuxPatchScan')

// 组件引用
const linuxPatchScanRef = ref(null)
const linuxPatchInstallRef = ref(null)
const linuxPatchRollbackRef = ref(null)
const linuxYumManageRef = ref(null)
const linuxPatchLibraryRef = ref(null)
const linuxVulnerabilityRef = ref(null)
const windowsVulnerabilityRef = ref(null)
const windowsUpdateRef = ref(null)
const windowsRollbackRef = ref(null)
const windowsViewRef = ref(null)
const operationLogsRef = ref(null)

// 安装对话框状态
const installDialogVisible = ref(false)
const selectedPatches = ref([])

// 处理导航点击
function handleNavClick(item) {
  activeView.value = item.key
}

// 处理子组件内的导航事件
function handleNavigate(nav) {
  console.log('Navigate to:', nav)
  // 可以根据 pageId 导航到具体页面
  // TODO: 实现页面内导航
}

// 处理安装补丁
function handleInstallPatch(patches) {
  selectedPatches.value = patches
  installDialogVisible.value = true
}

// 安装成功回调
function handleInstallSuccess() {
  // 刷新相关数据
  if (linuxPatchScanRef.value?.refresh) {
    linuxPatchScanRef.value.refresh()
  }
  // 跳转到日志页面
  activeView.value = 'logs'
}

// 模块信息
const moduleTitle = '补丁管理'
const moduleDescription = '管理系统补丁和漏洞修复'

// 暴露方法供外部调用
defineExpose({
  activeView,
  linuxPatchScanRef,
  linuxPatchInstallRef
})
</script>

<style scoped lang="scss">
.patches-module {
  display: grid;
  grid-template-columns: 160px 1fr;
  min-height: 600px;
  height: 100%;
}

.patches-module__nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 8px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.3);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  border-radius: 10px;
  color: #334155;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
  font-size: 13px;
}

.nav-item i {
  width: 18px;
  text-align: center;
}

.nav-item:hover {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
}

.nav-item.is-active {
  background-color: rgba(173, 181, 189, 0.25);
  color: #1e40af;
}

.patches-module__content {
  min-height: 100%;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.view-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.view-card {
  flex: 1;
  min-height: 0;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.welcome-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #f8fafc;
  padding: 40px;
}

.feature-cards {
  display: flex;
  gap: 24px;
  margin-bottom: 40px;
}

.feature-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  width: 240px;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.feature-card__icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  color: #fff;
  margin-bottom: 20px;
}

.feature-card__icon--scan {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
}

.feature-card__icon--install {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.feature-card__icon--library {
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
}

.feature-card__body {
  text-align: center;
}

.feature-card__body h3 {
  margin: 0 0 12px;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.feature-card__body p {
  margin: 0;
  font-size: 13px;
  color: #64748b;
  line-height: 1.6;
}

.stats-section {
  width: 100%;
  max-width: 800px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.stats-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border-left: 4px solid;
}

.stats-card--critical {
  border-color: #ef4444;
}

.stats-card--important {
  border-color: #f59e0b;
}

.stats-card--vuln {
  border-color: #8b5cf6;
}

.stats-card--hosts {
  border-color: #3b82f6;
}

.stats-card__value {
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
  margin-bottom: 8px;
}

.stats-card__label {
  font-size: 13px;
  color: #64748b;
}

@media (max-width: 1024px) {
  .patches-module {
    grid-template-columns: 1fr;
  }

  .patches-module__nav {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
  }

  .nav-item {
    flex: 0 0 auto;
  }

  .feature-cards {
    flex-direction: column;
    align-items: center;
  }

  .feature-card {
    width: 100%;
    max-width: 320px;
  }

  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
