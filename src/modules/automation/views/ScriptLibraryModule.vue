<template>
  <ModulePageLayout
    :title="moduleTitle"
    :description="moduleDescription"
    :hide-header="true"
  >
    <div class="gfs-module">
      <aside class="ops-sidebar-nav ops-sidebar-nav--narrow">
        <router-link
          v-for="item in navItems"
          :key="item.key"
          :to="item.path"
          class="ops-sidebar-item"
          :class="{ 'is-active': isActiveRoute(item.key) }"
        >
          <i :class="item.icon" />
          <span>{{ item.label }}</span>
        </router-link>
      </aside>

      <section class="gfs-module__content">
        <router-view />
      </section>
    </div>
  </ModulePageLayout>
</template>

<script setup>
import { useRoute } from 'vue-router'
import ModulePageLayout from '@/modules/shared/components/ModulePageLayout.vue'

const route = useRoute()

const moduleTitle = '文件服务'
const moduleDescription = ''

const navItems = [
  { key: 'scriptLibrary', label: '脚本库', icon: 'fas fa-code-branch', path: '/gfs/scriptLibrary' },
  { key: 'fileLibrary', label: '文件库', icon: 'fas fa-archive', path: '/gfs/fileLibrary' },
  { key: 'scriptReview', label: '脚本审核', icon: 'fas fa-clipboard-check', path: '/gfs/scriptReview' }
]

function isActiveRoute(key) {
  return route.path.includes(`/gfs/${key}`)
}
</script>

<style scoped lang="scss">
.gfs-module {
  display: flex;
  height: 100%;
  min-height: 0;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.gfs-module__content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  padding: 16px;

  :deep(> *) {
    flex: 1;
    min-height: 0;
    height: 100%;
  }
}

a.ops-sidebar-item {
  text-decoration: none;
  color: inherit;
}

@media (max-width: 1024px) {
  .gfs-module {
    flex-direction: column;
  }
}
</style>
