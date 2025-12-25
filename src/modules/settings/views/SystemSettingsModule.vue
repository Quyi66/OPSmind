<template>
  <div class="settings-module">
    <!-- 左侧导航 -->
    <aside class="ops-sidebar-nav settings-sidebar">
      <nav class="ops-sidebar-content">
        <router-link
          v-for="item in navItems"
          :key="item.key"
          :to="item.path"
          class="ops-sidebar-item"
          :class="{ 'is-active': isActiveRoute(item.key) }"
        >
          <i :class="['fa', 'fa-fw', item.icon]"></i>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
    </aside>

    <!-- 右侧内容区 -->
    <section class="settings-content">
      <router-view />
    </section>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

const navItems = [
  { key: 'user', label: '用户管理', icon: 'fa-users-cog', path: '/ssc/user' },
  { key: 'team', label: '团队管理', icon: 'fa-sitemap', path: '/ssc/team' },
  { key: 'template', label: '模版分配', icon: 'fa-clipboard-list', path: '/ssc/template' },
  { key: 'applet', label: '应用管理', icon: 'fa-archive', path: '/ssc/applet' },
  { key: 'tag', label: '应用标签', icon: 'fa-tags', path: '/ssc/tag' },
  { key: 'param', label: '参数配置', icon: 'fa-brackets-curly', path: '/ssc/param' },
  { key: 'appres', label: '应用资源', icon: 'fa-boxes', path: '/ssc/appres' },
  { key: 'email', label: '电子邮件', icon: 'fa-mail-bulk', path: '/ssc/email' },
  { key: 'datasource', label: '数据源', icon: 'fa-code-merge', path: '/ssc/datasource' },
  { key: 'engine', label: '引擎管理', icon: 'fa-car-battery', path: '/ssc/engine' }
]

function isActiveRoute(key) {
  return route.path.includes(`/ssc/${key}`)
}
</script>

<style scoped lang="scss">
.settings-module {
  display: flex;
  height: 100%;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

// 左侧导航栏 - 覆盖背景色
.settings-sidebar {
  width: 160px;
  background: #fff !important;
}

// 右侧内容区
.settings-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  background: #f8fafc;
  // padding: 16px;

  :deep(> *) {
    height: 100%;
  }
}

// router-link 样式重置
a.ops-sidebar-item {
  text-decoration: none;
  color: inherit;
}
</style>
