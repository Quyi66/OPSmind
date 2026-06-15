<template>
  <el-dialog
    v-model="dialogVisible"
    title="命令审核"
    width="700px"
    :close-on-click-modal="false"
    destroy-on-close
    @close="handleClose"
  >
    <!-- 单个命令审核 -->
    <div v-if="isSingleMode" class="approve-content">
      <div class="approve-action">
        <el-tag :type="isNewCommand ? 'success' : 'warning'" size="default">
          {{ isNewCommand ? '新增命令' : '修改命令' }}
        </el-tag>
      </div>

      <div class="info-item">
        <label>命令名称</label>
        <div class="value">{{ currentCommand?.name }}</div>
      </div>

      <div class="info-item">
        <label>语法类型</label>
        <div class="value">
          <el-tag size="small" type="info">{{ currentCommand?.type || '-' }}</el-tag>
        </div>
      </div>

      <!-- 新增命令：只显示待审核内容 -->
      <div v-if="isNewCommand" class="info-item">
        <label>命令内容</label>
        <div class="code-block">
          <pre>{{ currentCommand?.unapprovedCommand }}</pre>
        </div>
      </div>

      <!-- 修改命令：显示对比 -->
      <template v-else>
        <div class="info-item">
          <label>原命令 (Old)</label>
          <div class="code-block">
            <pre>{{ currentCommand?.command }}</pre>
          </div>
        </div>

        <div class="info-item">
          <label>新命令 (New)</label>
          <div class="code-block new">
            <pre>{{ currentCommand?.unapprovedCommand }}</pre>
          </div>
        </div>
      </template>

      <div v-if="currentCommand?.description" class="info-item">
        <label>描述</label>
        <div class="value">{{ currentCommand?.description }}</div>
      </div>
    </div>

    <!-- 批量审核 -->
    <div v-else class="approve-content batch-mode">
      <div class="batch-summary">
        <strong>共 {{ commandList.length }} 条</strong>
        命令待审核
      </div>

      <el-collapse accordion>
        <el-collapse-item v-for="cmd in commandList" :key="cmd.id" :name="cmd.id">
          <template #title>
            <div class="collapse-title">
              <strong>{{ cmd.name }}</strong>
            </div>
          </template>
          <div class="collapse-content">
            <div class="info-row">
              <label>操作：</label>
              <el-tag :type="!cmd.command ? 'success' : 'warning'" size="small">
                {{ !cmd.command ? '新增命令' : '修改命令' }}
              </el-tag>
            </div>
            <div class="info-row">
              <label>类型：</label>
              <span>{{ cmd.type }}</span>
            </div>
            <div v-if="!cmd.command" class="info-row">
              <label>命令内容：</label>
              <div class="code-block small">
                <pre>{{ cmd.unapprovedCommand }}</pre>
              </div>
            </div>
            <template v-else>
              <div class="info-row">
                <label>Old：</label>
                <div class="code-block small">
                  <pre>{{ cmd.command }}</pre>
                </div>
              </div>
              <div class="info-row">
                <label>New：</label>
                <div class="code-block small new">
                  <pre>{{ cmd.unapprovedCommand }}</pre>
                </div>
              </div>
            </template>
            <div v-if="cmd.description" class="info-row">
              <label>描述：</label>
              <span>{{ cmd.description }}</span>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>

    <!-- 审核原因 -->
    <div class="approve-reason">
      <label>审核原因（可选）</label>
      <el-input v-model="approveReason" type="textarea" :rows="3" placeholder="请输入审核原因..." />
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button type="success" :loading="submitting" @click="handleApprove(true)">
          <i class="fas fa-check"></i>
          审核通过
        </el-button>
        <el-button type="danger" :loading="submitting" @click="handleApprove(false)">
          <i class="fas fa-times"></i>
          审核拒绝
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { approveCommand, COMMAND_STATUS } from '@/modules/automation/api/command'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  mode: {
    type: String,
    default: 'single', // 'single' 或 'batch'
    validator: value => ['single', 'batch'].includes(value)
  },
  command: {
    type: Object,
    default: null
  },
  commands: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:visible', 'success'])

// 对话框可见性
const dialogVisible = computed({
  get: () => props.visible,
  set: val => emit('update:visible', val)
})

// 是否单个模式
const isSingleMode = computed(() => props.mode === 'single')

// 当前命令
const currentCommand = computed(() => props.command)

// 命令列表（批量模式）
const commandList = computed(() => props.commands || [])

// 是否新增命令
const isNewCommand = computed(() => {
  return !currentCommand.value?.command
})

// 审核原因
const approveReason = ref('')

// 提交状态
const submitting = ref(false)

// 监听对话框打开
watch(
  () => props.visible,
  val => {
    if (val) {
      approveReason.value = ''
    }
  }
)

// 审核操作
async function handleApprove(isApproved) {
  submitting.value = true

  try {
    let commandsToApprove = []

    if (isSingleMode.value) {
      // 单个审核
      commandsToApprove = [
        {
          ...currentCommand.value,
          status: isApproved ? COMMAND_STATUS.PUBLISHED : COMMAND_STATUS.REJECTED,
          unapprovedReason: approveReason.value
        }
      ]
    } else {
      // 批量审核
      commandsToApprove = commandList.value.map(cmd => ({
        ...cmd,
        status: isApproved ? COMMAND_STATUS.PUBLISHED : COMMAND_STATUS.REJECTED,
        unapprovedReason: approveReason.value
      }))
    }

    await approveCommand(commandsToApprove)

    ElMessage.success(isApproved ? '审核通过' : '审核已拒绝')
    emit('success')
    handleClose()
  } catch (error) {
    console.error('审核操作失败:', error)
    ElMessage.error('审核操作失败')
  } finally {
    submitting.value = false
  }
}

// 关闭对话框
function handleClose() {
  dialogVisible.value = false
  approveReason.value = ''
}
</script>

<style scoped lang="scss">
.approve-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.approve-action {
  margin-bottom: 8px;
}

.info-item {
  label {
    display: block;
    font-size: 12px;
    color: var(--el-text-color-regular);
    margin-bottom: 6px;
    font-weight: 500;
  }

  .value {
    font-size: 14px;
    color: var(--el-text-color-primary);
  }
}

.code-block {
  background: var(--el-fill-color-light);
  border-radius: 6px;
  padding: 12px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 13px;
  overflow-x: auto;
  max-height: 200px;
  overflow-y: auto;

  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-all;
  }

  &.new {
    background: var(--el-color-success-light-9);
    border: 1px solid var(--el-color-success-light-5);
  }

  &.small {
    padding: 8px;
    font-size: 12px;
    max-height: 120px;
  }
}

.batch-mode {
  .batch-summary {
    padding: 12px;
    background: var(--el-fill-color-light);
    border-radius: 6px;
    margin-bottom: 16px;

    strong {
      color: var(--el-color-primary);
    }
  }
}

.collapse-title {
  strong {
    color: var(--el-text-color-primary);
  }
}

.collapse-content {
  padding: 12px 0;
}

.info-row {
  margin-bottom: 12px;

  label {
    display: inline-block;
    width: 80px;
    font-size: 12px;
    color: var(--el-text-color-regular);
    font-weight: 500;
  }

  span {
    color: var(--el-text-color-primary);
  }
}

.approve-reason {
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-light);

  label {
    display: block;
    font-size: 12px;
    color: var(--el-text-color-regular);
    margin-bottom: 8px;
    font-weight: 500;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
