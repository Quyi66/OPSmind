<template>
  <ModulePageLayout
    :title="moduleTitle"
    :description="moduleDescription"
    :hide-header="true"
  >
    <div class="sudo-module">
      <aside class="ops-sidebar-nav ops-sidebar-nav--narrow">
        <div
          v-for="item in navItems"
          :key="item.key"
          class="ops-sidebar-item"
          :class="{ 'is-active': activeView === item.key }"
          @click="setActiveView(item.key)"
        >
          <i :class="item.icon"></i>
          <span>{{ item.label }}</span>
        </div>
      </aside>

      <section class="sudo-module__content">
        <SudoPermissionList v-if="activeView === 'permission'" />
        <SudoApplyList v-else-if="activeView === 'apply'" />
        <SudoResetPassword v-else-if="activeView === 'reset'" />
        <SudoSettings v-else-if="activeView === 'settings'" />
        <SudoOperationLog v-else-if="activeView === 'log'" />
      </section>
    </div>
  </ModulePageLayout>
</template>

<script setup>
import { ref } from 'vue'
import ModulePageLayout from '@/modules/shared/components/ModulePageLayout.vue'
import SudoPermissionList from '@/modules/sudo/components/SudoPermissionList.vue'
import SudoApplyList from '@/modules/sudo/components/SudoApplyList.vue'
import SudoResetPassword from '@/modules/sudo/components/SudoResetPassword.vue'
import SudoSettings from '@/modules/sudo/components/SudoSettings.vue'
import SudoOperationLog from '@/modules/sudo/components/SudoOperationLog.vue'

const moduleTitle = 'sudo权限管理'
const moduleDescription = ''

const navItems = [
  { key: 'permission', label: 'sudo列表', icon: 'fa fa-list' },
  { key: 'apply', label: 'sudo申请', icon: 'fa fa-file-alt' },
  { key: 'reset', label: '重置密码', icon: 'fa fa-key' },
  { key: 'settings', label: '功能设置', icon: 'fa fa-cog' },
  { key: 'log', label: '操作记录', icon: 'fa fa-history' }
]

const activeView = ref('permission')

function setActiveView(viewKey) {
  activeView.value = viewKey
}
</script>

<style scoped lang="scss">
.sudo-module {
  height: 100%;
  display: flex;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.sudo-module__nav {
  width: 160px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e2e8f0;

  .nav-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    cursor: pointer;
    color: #333;
    font-size: 13px;
    transition: all 0.2s;
    position: relative;

    i {
      width: 16px;
      text-align: center;
      color: #666;
    }

    &:hover {
      background: #f5f7fa;
    }

    &.is-active {
      background: #e6f7ff;
      color: #1890ff;

      i {
        color: #1890ff;
      }

      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: #1890ff;
      }
    }
  }
}

.sudo-module__content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  padding: 16px;

  > * {
    flex: 1;
    min-height: 0;
  }
}
</style>
