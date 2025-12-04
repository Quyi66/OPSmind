<template>
  <div class="host-detail">
    <div class="page-header">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item @click.prevent="handleBack" style="cursor: pointer">
          <span>主机概览</span>
        </el-breadcrumb-item>
        <el-breadcrumb-item>{{ hostKey }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <!-- 主机信息卡片 -->
    <div class="info-card">
      <el-descriptions :column="4" border>
        <el-descriptions-item label="主机名">{{ hostInfo.host_key }}</el-descriptions-item>
        <el-descriptions-item label="OS">{{ hostInfo.os_distro }}</el-descriptions-item>
        <el-descriptions-item label="OS版本">{{ hostInfo.os_version }}</el-descriptions-item>
        <el-descriptions-item label="已配置仓库">{{ hostInfo.repo_count }}</el-descriptions-item>
        <el-descriptions-item label="已安装软件包">{{ hostInfo.installed_pkgs_count }}</el-descriptions-item>
        <el-descriptions-item label="上次扫描时间">{{ formatDate(hostInfo.scan_date) }}</el-descriptions-item>
      </el-descriptions>
    </div>

    <!-- Tab 导航 -->
    <div class="tab-section">
      <el-tabs v-model="activeTab" type="card">
        <el-tab-pane label="已安装软件包" name="installed" />
        <el-tab-pane label="已配置仓库" name="repos" />
      </el-tabs>
    </div>

    <!-- 内容区域 -->
    <div class="content-section">
      <!-- 已安装软件包 -->
      <div v-show="activeTab === 'installed'" class="tab-content">
        <el-table
          v-loading="packageLoading"
          :data="packageData"
          stripe
          style="width: 100%"
          size="small"
        >
          <el-table-column prop="name" label="名称" min-width="200" />
          <el-table-column prop="version" label="版本号" width="150" />
          <el-table-column prop="release" label="发行号" width="120" />
          <el-table-column prop="arch" label="架构" width="100" />
          <el-table-column prop="install_time" label="安装时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.install_time) }}
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-section">
          <el-pagination
            v-model:current-page="packagePagination.page"
            v-model:page-size="packagePagination.pageSize"
            :page-sizes="[10, 25, 50, 100]"
            :total="packagePagination.total"
            layout="total, sizes, prev, pager, next"
            @size-change="loadPackages"
            @current-change="loadPackages"
          />
        </div>
      </div>

      <!-- 已配置仓库 -->
      <div v-show="activeTab === 'repos'" class="tab-content">
        <el-table
          v-loading="repoLoading"
          :data="repoData"
          stripe
          style="width: 100%"
          size="small"
        >
          <el-table-column prop="repo_id" label="仓库ID" width="150" />
          <el-table-column prop="name" label="仓库名" min-width="200" />
          <el-table-column prop="baseurl" label="地址" min-width="300" show-overflow-tooltip />
          <el-table-column prop="enabled" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.enabled ? 'success' : 'info'" size="small">
                {{ row.enabled ? '启用' : '未启用' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import { hostOverviewApi, hostApi } from '../api'

const props = defineProps({
  hostKey: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['back'])

const activeTab = ref('installed')

// 主机信息
const hostInfo = ref({})

// 已安装软件包
const packageLoading = ref(false)
const packageData = ref([])
const packagePagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 仓库
const repoLoading = ref(false)
const repoData = ref([])

// 返回主机列表
function handleBack() {
  emit('back')
}

// 格式化日期
function formatDate(timestamp) {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN')
}

// 加载主机信息
async function loadHostInfo() {
  if (!props.hostKey) return
  try {
    const response = await hostOverviewApi.getHostDetail(props.hostKey)
    hostInfo.value = response?.data || response || {}
  } catch (error) {
    console.error('Failed to load host info:', error)
    // 模拟数据
    hostInfo.value = {
      host_key: props.hostKey,
      os_distro: 'RHEL',
      os_version: '7.6',
      repo_count: 5,
      installed_pkgs_count: 320,
      scan_date: new Date().toISOString()
    }
  }
}

// 加载已安装软件包
async function loadPackages() {
  if (!props.hostKey) return
  packageLoading.value = true
  try {
    const response = await hostOverviewApi.getHostInstalledPackages({
      hostKey: props.hostKey,
      page: packagePagination.page,
      size: packagePagination.pageSize
    })
    const data = response?.data || response
    packageData.value = data?.records || []
    packagePagination.total = data?.total || 0
  } catch (error) {
    console.error('Failed to load packages:', error)
    // 模拟数据
    const names = ['kernel', 'glibc', 'openssl', 'bash', 'systemd', 'python', 'nginx', 'httpd']
    packageData.value = Array.from({ length: 10 }, (_, i) => ({
      name: names[i % names.length],
      version: `${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
      release: `${Math.floor(Math.random() * 100)}.el7`,
      arch: 'x86_64',
      install_time: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString()
    }))
    packagePagination.total = 320
  } finally {
    packageLoading.value = false
  }
}

// 加载仓库
async function loadRepos() {
  if (!props.hostKey) return
  repoLoading.value = true
  try {
    const response = await hostApi.getHostRepos({ hostKey: props.hostKey })
    const data = response?.data || response
    repoData.value = data?.records || []
  } catch (error) {
    console.error('Failed to load repos:', error)
    // 模拟数据
    repoData.value = [
      { repo_id: 'base', name: 'CentOS-7 - Base', baseurl: 'http://mirror.centos.org/centos/7/os/x86_64/', enabled: true },
      { repo_id: 'updates', name: 'CentOS-7 - Updates', baseurl: 'http://mirror.centos.org/centos/7/updates/x86_64/', enabled: true },
      { repo_id: 'extras', name: 'CentOS-7 - Extras', baseurl: 'http://mirror.centos.org/centos/7/extras/x86_64/', enabled: true }
    ]
  } finally {
    repoLoading.value = false
  }
}

// 监听 hostKey 变化
watch(() => props.hostKey, (newVal) => {
  if (newVal) {
    loadHostInfo()
    loadPackages()
    loadRepos()
  }
}, { immediate: true })

onMounted(() => {
  if (props.hostKey) {
    loadHostInfo()
    loadPackages()
    loadRepos()
  }
})
</script>

<style scoped lang="scss">
.host-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  background: #f5f7fa;
}

.page-header {
  margin-bottom: 16px;

  .el-breadcrumb {
    margin-bottom: 8px;
  }

  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1e293b;
  }
}

.info-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.tab-section {
  background: #fff;
  border-radius: 8px 8px 0 0;
  padding: 0 16px;

  :deep(.el-tabs__header) {
    margin-bottom: 0;
  }
}

.content-section {
  flex: 1;
  background: #fff;
  border-radius: 0 0 8px 8px;
  padding: 16px;
  overflow: auto;
}

.pagination-section {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e4e7ed;
}
</style>
