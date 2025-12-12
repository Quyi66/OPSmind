<template>
  <div class="system-settings-container">
    <!-- 左侧导航 -->
    <aside class="settings-sidebar">
      <h3 class="sidebar-title">
        <i class="fa fa-cog"></i>
        System Settings Center
      </h3>
      <nav class="settings-nav">
        <div
          v-for="item in navItems"
          :key="item.key"
          class="nav-item"
          :class="{ 'is-active': activeView === item.key }"
          @click="setActiveView(item.key)"
        >
          <i :class="['fa', 'fa-fw', item.icon]"></i>
          <span>{{ item.label }}</span>
        </div>
      </nav>
    </aside>

    <!-- 右侧内容区 -->
    <section class="settings-content">
      <!-- 默认首页展示一个大图标 -->
      <div v-if="activeView === 'default'" class="settings-welcome">
        <div class="welcome-icon">
          <i class="fa fa-cog"></i>
        </div>
      </div>

      <!-- 各个设置页面 -->
      <UserManagement v-else-if="activeView === 'user'" />
      <TeamManagement v-else-if="activeView === 'team'" />
      <AppletManagement v-else-if="activeView === 'applet'" />
      <TagManagement v-else-if="activeView === 'tag'" />
      <ParamSettings v-else-if="activeView === 'param'" />
      <AppResManagement v-else-if="activeView === 'appres'" />
      <EmailSettings v-else-if="activeView === 'email'" />
      <DataSourceManagement v-else-if="activeView === 'datasource'" />
      <EngineManagement v-else-if="activeView === 'engine'" />
      <TemplateAssignment v-else-if="activeView === 'template'" />
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// 占位组件（后续逐步实现）
import UserManagement from '../components/UserManagement.vue'
import TeamManagement from '../components/TeamManagement.vue'
import AppletManagement from '../components/AppletManagement.vue'
import TagManagement from '../components/TagManagement.vue'
import ParamSettings from '../components/ParamSettings.vue'
import AppResManagement from '../components/AppResManagement.vue'
import EmailSettings from '../components/EmailSettings.vue'
import DataSourceManagement from '../components/DataSourceManagement.vue'
import EngineManagement from '../components/EngineManagement.vue'
import TemplateAssignment from '../components/TemplateAssignment.vue'

const activeView = ref('user')

const navItems = [
  { key: 'user', label: '用户管理', icon: 'fa-users-cog' },
  { key: 'team', label: '团队管理', icon: 'fa-sitemap' },
  { key: 'template', label: '模版分配', icon: 'fa-clipboard-list' },
  { key: 'applet', label: '应用管理', icon: 'fa-archive' },
  { key: 'tag', label: '应用标签', icon: 'fa-tags' },
  { key: 'param', label: '参数配置', icon: 'fa-brackets-curly' },
  { key: 'appres', label: '应用资源', icon: 'fa-boxes' },
  { key: 'email', label: '电子邮件', icon: 'fa-mail-bulk' },
  { key: 'datasource', label: '数据源', icon: 'fa-code-merge' },
  { key: 'engine', label: '引擎管理', icon: 'fa-car-battery' }
]

function setActiveView(viewKey) {
  activeView.value = viewKey
}
</script>

<style scoped lang="scss">
.system-settings-container {
  display: flex;
  height: 100%;
  background: #fff;
}

.settings-sidebar {
  width: 190px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.sidebar-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  padding: 12px;
  margin: 0;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;

  i {
    color: #f97316;
    flex-shrink: 0;
  }
}

.settings-nav {
  flex: 1;
  padding: 8px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  color: #475569;
  font-size: 13px;
  transition: all 0.2s;
  position: relative;

  i {
    width: 18px;
    text-align: center;
    color: #64748b;
  }

  &:hover {
    background: #f8fafc;
    color: #1e293b;
  }

  &.is-active {
    background: #e0f2fe;
    color: #0284c7;

    i {
      color: #0284c7;
    }

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: #0284c7;
    }
  }
}

.settings-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  background: #f8fafc;
}

.settings-welcome {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.welcome-icon {
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.5;

  i {
    font-size: 80px;
    color: #fff;
  }
}
</style>
