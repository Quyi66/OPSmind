<template>
  <div class="ops-page-layout">
    <!-- 头部搜索栏 -->
    <div class="header-bar">
      <el-input v-model="searchKeyword" placeholder="搜索模板名称" clearable style="width: 300px">
        <template #prefix>
          <i class="fa fa-search"></i>
        </template>
      </el-input>

      <!-- <el-button type="primary" @click="goToAddTemplate">
        <i class="fa fa-plus"></i>
        新增模板
      </el-button> -->
    </div>

    <div class="content-scroll-area">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <el-skeleton animated :count="4" style="width: 100%">
          <template #template>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px">
              <el-skeleton-item variant="rect" style="height: 180px; border-radius: 12px" />
              <el-skeleton-item variant="rect" style="height: 180px; border-radius: 12px" />
              <el-skeleton-item variant="rect" style="height: 180px; border-radius: 12px" />
              <el-skeleton-item variant="rect" style="height: 180px; border-radius: 12px" />
            </div>
          </template>
        </el-skeleton>
      </div>

      <!-- 模板方格列表 -->
      <div v-else class="template-grid">
        <div
          v-for="template in filteredTemplateList"
          :key="template.id"
          class="template-card"
          :class="{ 'has-job': template.jobId }"
          @click="handleCardClick(template)"
        >
          <div class="card-body">
            <div class="template-main">
              <h3 class="template-name" :title="template.templateName">
                {{ template.templateName }}
              </h3>
              <div class="template-meta">
                <span class="host-badge">
                  <i class="fa fa-desktop"></i>
                  {{ template.hostLength }} 设备
                </span>
              </div>
            </div>
            <div class="template-icon-wrapper">
              <i :class="getIconClass(template.icon)"></i>
            </div>
          </div>

          <div class="card-footer">
            <div class="status-section">
              <template v-if="!template.executedBy">
                <span class="status-tag pending">
                  <span class="dot"></span>
                  未执行
                </span>
              </template>
              <template v-else>
                <span class="status-tag executed">
                  <span class="dot"></span>
                  {{ template.executedTime }}执行
                </span>
              </template>
            </div>

            <div class="action-section" @click.stop>
              <el-dropdown trigger="click" @command="handleCommand($event, template)">
                <div class="more-btn">
                  <i class="fa fa-ellipsis-h"></i>
                </div>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="run">
                      <i class="fa fa-play-circle text-primary"></i>
                      执行巡检
                    </el-dropdown-item>
                    <el-dropdown-item command="edit">
                      <i class="fa fa-pencil-alt text-warning"></i>
                      编辑模板
                    </el-dropdown-item>
                    <el-dropdown-item command="delete" divided class="text-danger">
                      <i class="fa fa-trash-alt"></i>
                      删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <el-empty v-if="!loading && templateList.length === 0" description="暂无巡检模板">
        <el-button type="primary" @click="goToAddTemplate">
          <i class="fa fa-plus"></i>
          新增模板
        </el-button>
      </el-empty>
    </div>

    <!-- 编辑模板弹窗 -->
    <TemplateEditDialog
      v-model:visible="editDialogVisible"
      :template-id="editTemplateId"
      @success="handleEditSuccess"
    />

    <!-- 执行巡检弹窗 -->
    <RunTemplateDialog
      v-model:visible="runDialogVisible"
      :template-id="runTemplateId"
      @success="handleRunSuccess"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, defineEmits, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { templateApi, paramApi } from '../api'
import TemplateEditDialog from '../components/TemplateEditDialog.vue'
import RunTemplateDialog from '../components/RunTemplateDialog.vue'

const router = useRouter()
const emit = defineEmits(['navigate'])

const loading = ref(true)
const templateList = ref([])
const searchKeyword = ref('')
const dashboardEnabled = ref(false)
const teamsEnabled = ref(false)

// 过滤后的列表
const filteredTemplateList = computed(() => {
  if (!searchKeyword.value) return templateList.value
  const keyword = searchKeyword.value.toLowerCase()
  return templateList.value.filter(item => item.templateName?.toLowerCase().includes(keyword))
})

// ... (retain rest of script)

// 编辑弹窗状态
const editDialogVisible = ref(false)
const editTemplateId = ref('')

// 执行弹窗状态
const runDialogVisible = ref(false)
const runTemplateId = ref('')

/**
 * 格式化相对时间
 */
function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  if (diffYears > 0) return `${diffYears}年前`
  if (diffMonths > 0) return `${diffMonths}个月前`
  if (diffDays > 0) return `${diffDays}天前`
  if (diffHours > 0) return `${diffHours}小时前`
  if (diffMinutes > 0) return `${diffMinutes}分钟前`
  return '刚刚'
}

/**
 * 获取图标类名
 * API 返回的 icon 格式是 "fa-address-book" 这样只有图标名的格式
 * 需要添加前缀 fas（solid）来组成完整的 Font Awesome 5 类名
 */
function getIconClass(icon) {
  if (!icon) {
    return 'fas fa-server' // 默认图标
  }
  // 如果已经包含前缀（如 fas、far、fad 等），直接返回
  if (
    icon.startsWith('fas ') ||
    icon.startsWith('far ') ||
    icon.startsWith('fad ') ||
    icon.startsWith('fab ') ||
    icon.startsWith('fal ')
  ) {
    return icon
  }
  // 否则添加 fas 前缀
  return `fas ${icon}`
}

/**
 * 加载模板列表
 */
async function loadTemplates() {
  loading.value = true
  try {
    const response = await templateApi.getSquareTemplates()
    const data = response?.data || response || []

    templateList.value = data.map(template => {
      // 解析 auditParams
      let auditParams = []
      try {
        auditParams =
          typeof template.auditParams === 'string'
            ? JSON.parse(template.auditParams)
            : template.auditParams || []
      } catch {
        auditParams = []
      }

      // 计算主机数量
      let hostLength = 0
      auditParams.forEach(param => {
        hostLength += (param.hosts || []).length
      })

      // 计算执行时间
      const executedTime = template.executedAt ? formatRelativeTime(template.executedAt) : ''

      return {
        ...template,
        hostLength,
        executedTime
      }
    })
  } catch (error) {
    console.error('Failed to load templates:', error)
    ElMessage.error('加载模板列表失败')
    templateList.value = []
  } finally {
    loading.value = false
  }
}

/**
 * 加载配置参数
 */
async function loadParams() {
  try {
    const response = await paramApi.getParams()
    const params = response?.data || response || []
    const paramMap = new Map(params.map(item => [item.name, item.value]))

    dashboardEnabled.value = paramMap.get('dashboard_switch') === 'yes'
    teamsEnabled.value = paramMap.get('teams_switch') === 'yes'
  } catch (error) {
    console.error('Failed to load params:', error)
  }
}

/**
 * 点击卡片 - 跳转到检查结果详情页面
 */
function handleCardClick(template) {
  if (template.jobId) {
    // 有执行记录，跳转到检查结果详情页面
    router.push(`/cac/results/${template.jobId}`)
  } else {
    // 没有执行记录，提示用户
    ElMessage.warning('该模板尚未执行巡检，请先点击右侧菜单执行巡检')
  }
}

/**
 * 处理下拉菜单命令
 */
function handleCommand(command, template) {
  switch (command) {
    case 'run':
      runTemplate(template)
      break
    case 'edit':
      editTemplate(template)
      break
    case 'dashboard':
      ElMessage.info('仪表盘功能待实现')
      break
    case 'teams':
      ElMessage.info('团队选择功能待实现')
      break
    case 'delete':
      deleteTemplate(template)
      break
  }
}

/**
 * 执行模板 - 打开执行弹窗
 */
function runTemplate(template) {
  runTemplateId.value = template.id
  runDialogVisible.value = true
}

/**
 * 执行成功回调
 */
function handleRunSuccess() {
  loadTemplates()
}

/**
 * 编辑模板 - 打开弹窗
 */
function editTemplate(template) {
  editTemplateId.value = template.id
  editDialogVisible.value = true
}

/**
 * 编辑成功回调
 */
function handleEditSuccess() {
  loadTemplates()
}

/**
 * 删除模板
 */
async function deleteTemplate(template) {
  try {
    await ElMessageBox.confirm(`确定要删除模板「${template.templateName}」吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await templateApi.deleteTemplate(template.id)
    ElMessage.success('删除成功')
    loadTemplates()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to delete template:', error)
      ElMessage.error('删除失败')
    }
  }
}

/**
 * 跳转到新增模板
 */
function goToAddTemplate() {
  router.push('/cac/templates?action=add')
}

onMounted(() => {
  loadTemplates()
  loadParams()
})
</script>

<style scoped lang="scss">
.ops-page-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 24px;
  // background: var(--el-bg-color-page); /* 浅色背景 */
  overflow: hidden; /* 关键：防止最外层滚动 */
}

.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.content-scroll-area {
  flex: 1;
  overflow-y: auto; /* 仅此处滚动 */
  min-height: 0; /* Flex item 滚动必需 */
  padding: 4px; /* 防止 box-shadow 被裁剪 */
  margin: -4px; /* 抵消 padding 带来的额外空间 */
}

.loading-state {
  padding: 20px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.template-card {
  background: var(--el-bg-color);
  border-radius: 12px;
  border: 1px solid var(--el-border-color-light);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); /* 柔和阴影 */
  overflow: visible;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  display: flex;
  flex-direction: column;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    border-color: var(--el-border-color);

    .template-icon-wrapper {
      // transform: scale(1.1) rotate(5deg);
      background: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
    }
  }
}

.card-body {
  padding: 24px;
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.template-main {
  flex: 1;
  min-width: 0;
}

.template-name {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.template-meta {
  display: flex;
  align-items: center;
}

.host-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--el-bg-color-page);
  border: 1px solid var(--el-border-color-light);
  border-radius: 20px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-weight: 500;

  i {
    font-size: 11px;
    color: var(--el-text-color-placeholder);
  }
}

.template-icon-wrapper {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-bg-color-page);
  border-radius: 12px;
  color: var(--el-text-color-placeholder);
  font-size: 20px;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.card-footer {
  padding: 16px 24px;
  background: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color-lighter);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
}

.status-section {
  font-size: 13px;

  .status-tag {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    &.pending {
      color: var(--el-text-color-placeholder);
      .dot {
        background: var(--el-border-color);
      }
    }

    &.executed {
      color: #059669; /* 绿色 */
      .dot {
        background: #10b981;
      }
    }
  }
}

.action-section {
  .more-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    color: var(--el-text-color-placeholder);
    transition: all 0.2s;
    cursor: pointer;

    &:hover {
      background: var(--el-fill-color-light);
      color: var(--el-text-color-secondary);
    }
  }
}

/* 辅助样式 */
.text-primary {
  color: #409eff;
}
.text-warning {
  color: #e6a23c;
}
.text-danger {
  color: #f56c6c;
}

:deep(.el-empty) {
  background: var(--el-bg-color);
  border-radius: 8px;
  padding: 40px;
  margin-top: 40px;
}
</style>
