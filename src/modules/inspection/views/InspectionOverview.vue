<template>
  <div class="inspection-overview">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <i class="fa fa-cog fa-spin fa-4x"></i>
      <p>加载中...</p>
    </div>

    <!-- 模板方格列表 -->
    <div v-else class="template-grid">
      <div
        v-for="template in templateList"
        :key="template.id"
        class="template-card"
        :class="{ 'has-job': template.jobId }"
        @click="handleCardClick(template)"
      >
        <div class="card-body">
          <h3 class="template-name" :title="template.templateName">
            {{ template.templateName }}
          </h3>
          <div class="template-icon">
            <i :class="getIconClass(template.icon)"></i>
          </div>
        </div>
        <div class="card-footer">
          <div class="footer-left">
            <div class="status-info">
              <span
                class="status-dot"
                :class="template.executedBy ? 'executed' : 'not-executed'"
              ></span>
              <span v-if="!template.executedBy" class="status-text">未执行</span>
              <span v-else class="status-text">{{ template.executedTime }}执行</span>
            </div>
            <span class="host-count">{{ template.hostLength }} 设备</span>
          </div>
          <div class="footer-right" @click.stop>
            <el-dropdown trigger="click" @command="handleCommand($event, template)">
              <el-button class="more-btn" text circle size="small">
                <i class="fa fa-ellipsis-v"></i>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="run">
                    <i class="fa fa-play-circle"></i> 执行
                  </el-dropdown-item>
                  <el-dropdown-item command="edit">
                    <i class="fa fa-pencil"></i> 编辑
                  </el-dropdown-item>
                  <el-dropdown-item v-if="dashboardEnabled" command="dashboard">
                    <i class="fa fa-tachometer-alt"></i> 仪表盘
                  </el-dropdown-item>
                  <el-dropdown-item v-if="teamsEnabled" command="teams">
                    <i class="fa fa-users-cog"></i> 选择团队
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" divided>
                    <i class="fa fa-trash-alt"></i> 删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <el-empty
      v-if="!loading && templateList.length === 0"
      description="暂无巡检模板"
    >
      <el-button type="primary" @click="goToAddTemplate">
        <i class="fa fa-plus"></i> 新增模板
      </el-button>
    </el-empty>

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
import { ref, onMounted, defineEmits } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { templateApi, paramApi } from '../api'
import TemplateEditDialog from '../components/TemplateEditDialog.vue'
import RunTemplateDialog from '../components/RunTemplateDialog.vue'

const emit = defineEmits(['navigate'])

const loading = ref(true)
const templateList = ref([])
const dashboardEnabled = ref(false)
const teamsEnabled = ref(false)

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
  if (icon.startsWith('fas ') || icon.startsWith('far ') || icon.startsWith('fad ') || icon.startsWith('fab ') || icon.startsWith('fal ')) {
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
        auditParams = typeof template.auditParams === 'string'
          ? JSON.parse(template.auditParams)
          : (template.auditParams || [])
      } catch {
        auditParams = []
      }

      // 计算主机数量
      let hostLength = 0
      auditParams.forEach(param => {
        hostLength += (param.hosts || []).length
      })

      // 计算执行时间
      const executedTime = template.executedAt
        ? formatRelativeTime(template.executedAt)
        : ''

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
    emit('navigate', { view: 'result-detail', params: { jobId: template.jobId } })
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
    await ElMessageBox.confirm(
      `确定要删除模板「${template.templateName}」吗？`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

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
  emit('navigate', { view: 'templates', params: { action: 'add' } })
}

onMounted(() => {
  loadTemplates()
  loadParams()
})
</script>

<style scoped lang="scss">
.inspection-overview {
  height: 100%;
  padding: 20px;
  background: #6c757d;
  overflow: auto;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #fff;

  i {
    margin-bottom: 16px;
    opacity: 0.8;
  }

  p {
    margin: 0;
    font-size: 14px;
    opacity: 0.8;
  }
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;

  @media (max-width: 1400px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.template-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.3s;
  cursor: pointer;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  }

  &.has-job:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  }

  .card-body {
    padding: 20px;
    position: relative;
    min-height: 80px;

    .template-name {
      margin: 0 0 8px;
      font-size: 18px;
      font-weight: 600;
      color: #303133;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding-right: 40px;
    }

    .template-icon {
      position: absolute;
      top: 0;
      right: 8px;
      font-size: 32px;
      opacity: 0.25;
      color: #606266;
      transition: all 0.3s;
    }
  }

  &:hover .template-icon {
    opacity: 0.4;
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #f8f9fa;
    border-top: 1px solid #ebeef5;

    .footer-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .status-info {
      display: flex;
      align-items: center;
      gap: 6px;

      .status-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;

        &.not-executed {
          background: #909399;
        }

        &.executed {
          background: #e6a23c;
        }
      }

      .status-text {
        font-size: 12px;
        color: #909399;
      }
    }

    .host-count {
      font-size: 12px;
      color: #606266;
    }

    .footer-right {
      .more-btn {
        opacity: 0;
        transition: opacity 0.2s;
      }
    }
  }

  &:hover .card-footer .more-btn {
    opacity: 1;
  }
}

:deep(.el-empty) {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  padding: 40px;
  margin-top: 40px;
}
</style>
