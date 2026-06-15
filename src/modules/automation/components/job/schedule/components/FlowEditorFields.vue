<template>
  <div>
    <div class="form-section">
      <div class="section-title">基础信息</div>

      <el-form-item label="名称" required>
        <el-input v-model="flow.name" placeholder="请输入流程名称" style="width: 100%" />
      </el-form-item>

      <el-form-item label="描述">
        <el-input v-model="flow.description" type="textarea" :rows="3" />
      </el-form-item>

      <el-form-item label="目标主机">
        <template #label>
          <span class="label-with-tooltip">
            <span>目标主机</span>
            <el-tooltip
              content="设置流程执行的目标主机，支持选择单台主机、主机组或标签"
              placement="top"
            >
              <span class="tooltip-icon" tabindex="0">
                <i class="fa fa-question-circle text-muted" />
              </span>
            </el-tooltip>
          </span>
        </template>
        <AcmDeviceSelector v-model="flow.hosts" ci-types="[auto]" mcheck-type="map" />
      </el-form-item>
    </div>

    <div class="form-section" :class="{ 'section-disabled': isInstance }">
      <div class="section-header">
        <div class="section-title">步骤设置</div>
        <div class="section-actions">
          <el-button class="fold-btn" text size="small" @click="$emit('toggle-fold-all')">
            <i
              class="fa"
              :class="isFoldAllSteps ? 'fa-angle-double-right' : 'fa-angle-double-down'"
            />
            {{ isFoldAllSteps ? '展开全部' : '折叠全部' }}
          </el-button>
          <el-button size="small" @click="$emit('add-step')">
            <i class="fa fa-plus me-1" />
            新增步骤
          </el-button>
        </div>
      </div>

      <div class="step-list">
        <div v-for="(step, index) in flow.steps" :key="step.id" class="step-card">
          <div class="step-header" @click="$emit('toggle-step-fold', index)">
            <div class="step-title">
              <span class="step-number">{{ index + 1 }}</span>
              <span class="step-name">{{ step.name || '未命名' }}</span>
            </div>
            <div class="step-actions">
              <el-button
                text
                size="small"
                type="danger"
                :disabled="flow.steps.length === 1"
                @click.stop="$emit('remove-step', index)"
              >
                <i class="fa fa-trash-alt me-1" />
                删除
              </el-button>
              <i
                class="fa toggle-icon"
                :class="stepFoldList[index] ? 'fa-chevron-down' : 'fa-chevron-up'"
              />
            </div>
          </div>

          <div v-show="!stepFoldList[index]" class="step-body">
            <el-row class="form-row">
              <el-col :span="12">
                <el-form-item label="步骤名称">
                  <el-input v-model="step.name" placeholder="请输入" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="自动执行">
                  <el-checkbox v-model="step.autoNext" :disabled="isInstance">
                    自动执行下一步骤
                  </el-checkbox>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row class="form-row">
              <el-col :span="24">
                <el-form-item label="脚本">
                  <GfsFileSelector
                    v-model="step.config.tasks[0].scripts"
                    :disabled="isInstance"
                    :multiple-select="false"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row class="form-row">
              <el-col :span="12">
                <el-form-item>
                  <template #label>
                    <span class="label-with-tooltip">
                      <span>输出等级</span>
                      <el-tooltip
                        content="控制脚本执行时的输出详细程度，调试问题时可选择更高等级"
                        placement="top"
                      >
                        <span class="tooltip-icon" tabindex="0">
                          <i class="fa fa-question-circle text-muted" />
                        </span>
                      </el-tooltip>
                    </span>
                  </template>
                  <el-select v-model="step.config.verbosity" style="width: 100%">
                    <el-option :value="0" label="普通" />
                    <el-option :value="1" label="详细" />
                    <el-option :value="2" label="更多" />
                    <el-option :value="3" label="调试" />
                    <el-option :value="4" label="连接调试" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item>
                  <template #label>
                    <span class="label-with-tooltip">
                      <span>任务超时(秒)</span>
                      <el-tooltip content="任务执行超时时间，-1 表示无限制" placement="top">
                        <span class="tooltip-icon" tabindex="0">
                          <i class="fa fa-question-circle text-muted" />
                        </span>
                      </el-tooltip>
                    </span>
                  </template>
                  <el-input-number
                    v-model="step.config.taskTimeout"
                    :min="-1"
                    :max="86400"
                    controls-position="right"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </div>
        </div>
      </div>
    </div>

    <div class="form-section">
      <div class="section-title">
        运行参数
        <el-tooltip
          content="运行参数会替换脚本命令行中 ${变量名} 形式的变量，以及主机的参数名"
          placement="top"
        >
          <i class="fa fa-question-circle text-muted ms-1" />
        </el-tooltip>
      </div>

      <el-form-item>
        <div class="param-toolbar">
          <el-button size="small" class="ms-auto" @click="$emit('add-param')">
            <i class="fa fa-plus" />
            添加参数
          </el-button>
          <el-button size="small" @click="$emit('parse-params')">
            <span class="text-primary me-1">{}</span>
            解析参数
          </el-button>
        </div>

        <table v-if="flow.globalParams.length" class="op-param-table table">
          <thead>
            <tr>
              <th>运行参数</th>
              <th>显示名称</th>
              <th>描述</th>
              <th>
                默认值
                <el-tooltip content="执行时如未填写则使用默认值" placement="top">
                  <i class="fa fa-question-circle text-muted ms-1" />
                </el-tooltip>
              </th>
              <th>保密</th>
              <th class="text-right" width="60">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(param, index) in flow.globalParams" :key="param.id">
              <td><el-input v-model="param.name" size="small" /></td>
              <td><el-input v-model="param.label" size="small" /></td>
              <td><el-input v-model="param.description" size="small" /></td>
              <td><el-input v-model="param.defaultValue" size="small" /></td>
              <td>
                <el-checkbox v-model="param.secret" />
              </td>
              <td class="text-right">
                <el-button
                  text
                  title="删除参数"
                  type="danger"
                  @click="$emit('delete-param', index)"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </td>
            </tr>
          </tbody>
        </table>
        <el-empty v-else description="暂无参数" :image-size="60" style="width: 100%" />
      </el-form-item>
    </div>
  </div>
</template>

<script setup>
import { Delete } from '@element-plus/icons-vue'
import AcmDeviceSelector from './AcmDeviceSelector.vue'
import GfsFileSelector from './GfsFileSelector.vue'

defineProps({
  flow: { type: Object, required: true },
  isInstance: { type: Boolean, default: false },
  stepFoldList: { type: Array, default: () => [] },
  isFoldAllSteps: { type: Boolean, default: false }
})

defineEmits([
  'toggle-fold-all',
  'add-step',
  'remove-step',
  'toggle-step-fold',
  'add-param',
  'delete-param',
  'parse-params'
])
</script>

<style scoped lang="scss">
.label-with-tooltip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.form-section {
  margin-bottom: 32px;

  .section-title {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    font-size: 15px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .el-form-item {
    margin-bottom: 18px;
  }
}

.section-disabled {
  opacity: 0.7;
  pointer-events: none;

  :deep(.acm-device-selector) {
    pointer-events: auto;
    opacity: 1;
  }
}

.text-muted {
  color: var(--el-text-color-secondary);
}

.text-primary {
  color: var(--el-color-primary);
}

.text-right {
  text-align: right;
}

.ms-1 {
  margin-left: 4px;
}

.me-1 {
  margin-right: 4px;
}

.ms-auto {
  margin-left: auto;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  .section-title {
    margin: 0;
    padding: 0;
    border: none;
    font-size: 15px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .section-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .fold-btn {
    color: var(--el-color-primary);

    &:hover {
      background: var(--el-color-primary-light-9);
    }
  }
}

.step-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.step-card {
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  background: var(--el-bg-color);
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
}

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--el-fill-color-light);
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;

  &:hover {
    background: var(--el-fill-color);
  }

  .step-title {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .step-number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--el-color-primary);
    color: #fff;
    font-size: 12px;
    font-weight: bold;
  }

  .step-name {
    color: var(--el-text-color-regular);
    font-weight: 500;
  }

  .step-actions {
    display: flex;
    align-items: center;
    gap: 12px;

    .toggle-icon {
      color: var(--el-text-color-secondary);
      font-size: 14px;
      transition: transform 0.2s;
    }
  }
}

.step-body {
  padding: 20px;
  background: transparent;

  .el-form-item {
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }
  }
}

.param-toolbar {
  margin-bottom: 12px;
}

.op-param-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.op-param-table th,
.op-param-table td {
  padding: 8px 10px;
  border: 1px solid var(--el-border-color-lighter);
  vertical-align: middle;
}

.op-param-table th {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
}

.op-param-table :deep(.el-input) {
  width: 100%;
}

.op-param-table :deep(.el-checkbox) {
  height: auto;
}

.form-row {
  margin-bottom: 16px;
}

.tooltip-icon {
  display: inline-block !important;
  align-items: center;
  line-height: 1;
  cursor: help !important;
  pointer-events: auto !important;
}

.tooltip-icon:hover {
  cursor: help !important;
}
</style>
