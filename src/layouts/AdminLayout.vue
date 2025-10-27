<template>
  <div class="admin-layout">
    <!-- 左侧二级菜单 -->
    <aside class="admin-sider">
      <el-menu
        class="admin-menu"
        :default-openeds="[activeGroup]"
        :default-active="activePage"
        unique-opened
        @select="onMenuSelect"
      >
        <el-sub-menu v-for="group in menu" :key="group.code" :index="group.code">
          <template #title>
            <span class="group-title">{{ group.name }}</span>
          </template>
          <el-menu-item
            v-for="item in group.children"
            :key="item.code"
            :index="item.code"
          >
            {{ item.name }}
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </aside>

    <!-- 内容区域 -->
    <main class="admin-content">
      <component :is="currentComponent" />
    </main>
  </div>
  
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ADMIN_MENU_CONFIG, getDefaultAdminTarget } from '@/config/admin-menu.config'

// 基本菜单
const menu = ADMIN_MENU_CONFIG

const router = useRouter()
const route = useRoute()

// 选中状态
const activeGroup = ref('')
const activePage = ref('')

// 默认页
function ensureDefault() {
  const def = getDefaultAdminTarget()
  if (!activeGroup.value) activeGroup.value = def.groupCode
  if (!activePage.value) activePage.value = def.pageCode
}

onMounted(() => {
  // 路由未提供明确信息时载入默认项
  ensureDefault()
})

// 切换菜单
const onMenuSelect = (index) => {
  // index 为 pageCode，找到其上级 group
  let foundGroup = activeGroup.value
  for (const g of menu) {
    if (g.children?.some(c => c.code === index)) {
      foundGroup = g.code
      break
    }
  }
  activeGroup.value = foundGroup
  activePage.value = index
}

// 简单路由-组件映射（后续可扩展为真正子路由）
const currentComponent = computed(() => {
  if (activeGroup.value === 'assets' && activePage.value === 'auto-config') {
    return AutoConfig
  }
  return AdminPlaceholder
})

// 懒加载/直接导入对应视图
import AutoConfig from '@/views/admin/AutoConfig.vue'

// 兜底占位
const AdminPlaceholder = {
  name: 'AdminPlaceholder',
  template: '<div style="padding:16px;color:#666">请选择左侧菜单</div>'
}
</script>

<style scoped lang="scss">
.admin-layout {
  display: flex;
  height: 100vh;
  background: #f6f8fa;
}

.admin-sider {
  width: 220px;
  background: #fff;
  border-right: 1px solid #eef0f3;
}

.admin-menu {
  height: 100%;
  border-right: 0;
}

.group-title {
  font-weight: 600;
  color: #1f2937;
}

.admin-content {
  flex: 1;
  overflow: auto;
  background: #fff;
}
</style>

