<template>
  <div class="fixture">
    <header>
      <strong>隔离 mock 样例 · 无真实主机或业务请求</strong>
      <label>
        页面
        <select v-model="page">
          <option value="home">软件概览</option>
          <option value="repos">配置下发</option>
        </select>
      </label>
      <label>
        状态
        <select v-model="fixtureState.scenario">
          <option value="long">长字段 / 25行</option>
          <option value="loading">加载中</option>
          <option value="error">读取失败</option>
          <option value="empty">空数据</option>
        </select>
      </label>
      <span>被阻止写操作：{{ fixtureState.blockedWrites }}</span>
    </header>
    <main :key="`${page}-${fixtureState.scenario}`">
      <SoftwareHomePage v-if="page === 'home'" />
      <RepoManagementPage v-else />
    </main>
  </div>
</template>
<script setup>
import { ref } from 'vue'
import SoftwareHomePage from '@/modules/software/views/SoftwareHomePage.vue'
import RepoManagementPage from '@/modules/software/views/RepoManagementPage.vue'
import { fixtureState } from './mockApi'
const page = ref('home')
</script>
<style>
html,
body,
#app {
  margin: 0;
  height: 100%;
  font-family: Arial, sans-serif;
}
* {
  box-sizing: border-box;
}
.fixture {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.fixture > header {
  flex-shrink: 0;
  padding: 12px;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: center;
  background: #eaf2ff;
}
.fixture > main {
  flex: 1;
  min-height: 0;
  padding: 16px;
}
</style>
