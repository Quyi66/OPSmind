<template>
  <div>
    <!-- 补丁安装向导对话框 -->
    <el-dialog
      v-model="isVisible"
      :title="wizardDialogTitle"
      width="1000px"
      :close-on-click-modal="false"
      class="install-dialog"
      top="5vh"
      @closed="resetInstallState"
    >
      <!-- 自定义步骤条 -->
      <div class="ops-stepper">
        <template v-for="(step, idx) in wizardSteps" :key="step.key">
          <div
            class="stepper-item"
            :class="{
              'is-active': installStep === idx,
              'is-success': installStep > idx,
              'is-failed': stepStates[idx] === 'failed'
            }"
          >
            <div class="stepper-icon">
              <i v-if="stepStates[idx] === 'failed'" class="fa fa-times"></i>
              <i v-else-if="installStep > idx" class="fa fa-check"></i>
              <span v-else>{{ idx + 1 }}</span>
            </div>
            <div class="stepper-title">{{ step.title }}</div>
          </div>
          <div
            v-if="idx < wizardSteps.length - 1"
            class="stepper-line"
            :class="{ 'is-active': installStep > idx }"
          ></div>
        </template>
      </div>

      <!-- Step 0: 选择目标主机 -->
      <div
        v-show="currentStepKey === 'select'"
        class="install-content"
        v-loading="installDataLoading"
      >
        <!-- 更新补丁 -->
        <div class="install-card">
          <div class="card-header">
            <i class="fa fa-lock" />
            {{ selectionCardTitle }}
          </div>
          <div class="card-body card-body--scroll">
            <div v-if="selectionDisplayItems.length === 0" class="no-data">暂无数据</div>
            <div v-for="item in selectionDisplayItems" :key="item.key" class="selection-item">
              <div class="selection-item__primary">{{ item.primary }}</div>
              <div v-if="item.secondary" class="selection-item__secondary">
                {{ item.secondary }}
              </div>
            </div>
          </div>
        </div>

        <!-- 待更新软件包 -->
        <div class="install-card">
          <div class="card-header">
            <i class="fa fa-cube" />
            {{ packageCardTitle }}
          </div>
          <div class="card-body card-body--scroll">
            <div v-for="pkg in affectedPackages" :key="pkg" class="package-item">
              {{ pkg }}
            </div>
            <div v-if="affectedPackages.length === 0" class="no-data">暂无数据</div>
          </div>
        </div>

        <!-- 更新主机 -->
        <div class="install-card mt-3">
          <div class="card-header">
            <i class="fa fa-list" />
            {{ hostCardTitle }}
          </div>
          <div class="card-body card-body--scroll" v-if="hasFixedHosts">
            <div class="selection-item__primary">共 {{ resolvedFixedHosts.length }} 台</div>
            <div
              v-for="host in resolvedFixedHosts"
              :key="host.hostId || host.id || host.hostKey"
              class="selection-item"
            >
              <div class="selection-item__primary">{{ formatHostDisplay(host) }}</div>
            </div>
          </div>
          <div class="card-body" v-else>
            <div class="host-toolbar">
              <el-select v-model="hostFilter" size="small" style="width: 140px">
                <el-option label="@@(linux)" value="@@(linux)">
                  <i class="fa fa-server" />
                  @@(linux)
                </el-option>
              </el-select>
              <el-input
                v-model="hostSearchText"
                placeholder="搜索"
                :prefix-icon="Search"
                size="small"
                style="width: 200px"
                clearable
              />
            </div>
            <el-table
              ref="hostTableRef"
              :data="filteredHosts"
              size="small"
              height="220"
              @selection-change="handleHostSelectionChange"
            >
              <el-table-column type="selection" width="40" />
              <el-table-column prop="hostKey" label="主机" min-width="200" sortable>
                <template #default="{ row }">
                  <span class="host-link">{{ row.hostKey }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="os_distro" label="OS" width="100" sortable />
              <el-table-column prop="os_version" label="OS版本" width="100" sortable />
              <el-table-column prop="scan_timestamp" label="上次扫描时间" width="180" sortable>
                <template #default="{ row }">
                  {{ formatDateTime(row.scan_timestamp) }}
                </template>
              </el-table-column>
            </el-table>
            <div class="host-pagination">
              <el-pagination
                v-model:current-page="hostPagination.page"
                v-model:page-size="hostPagination.pageSize"
                :page-sizes="[10, 20, 50]"
                :total="hostPagination.total"
                layout="total, sizes, prev, pager, next, jumper"
                size="small"
                background
                @size-change="handleHostSizeChange"
                @current-change="handleHostPageChange"
              />
            </div>
          </div>
        </div>

      </div>

      <!-- Step 1: 补丁安装预检查 -->
      <div v-show="currentStepKey === 'rpm'" class="task-step-content">
        <div class="task-step-editor">
          <div class="task-step-editor__title">
            <i class="fa fa-cubes" style="margin-right: 6px"></i>
            补丁安装预检查
          </div>
          <el-alert
            title="执行任务前将先检查目标主机仓库中是否存在补丁或软件包所需的可安装版本。"
            type="info"
            show-icon
            :closable="false"
          >
            <template #default>
              <div>预检查失败时流程会中断，若需要忽略仓库可用性校验可在当前步骤选择跳过。</div>
            </template>
          </el-alert>
          <div class="install-summary-card">
            <div class="install-summary-row">
              <span class="install-summary-label">目标主机</span>
              <span class="install-summary-value">
                {{ confirmedHosts.length || selectedHosts.length || resolvedFixedHosts.length }} 台
              </span>
            </div>
            <div class="install-summary-row">
              <span class="install-summary-label">校验对象</span>
              <span class="install-summary-value">{{ selectionSummaryLabel }}</span>
            </div>
            <div class="install-summary-row">
              <span class="install-summary-label">涉及软件包</span>
              <div class="install-summary-list">
                <div v-if="affectedPackages.length === 0" class="install-summary-empty">
                  当前暂无软件包信息，执行时由后端根据任务数据判断。
                </div>
                <div v-for="pkg in affectedPackages" :key="pkg" class="install-summary-item">
                  {{ pkg }}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="task-step-action">
          <el-alert
            v-if="
              stepStates[stepIndexes.rpm] === 'success' || stepStates[stepIndexes.rpm] === 'failed'
            "
            :type="stepStates[stepIndexes.rpm] === 'success' ? 'success' : 'error'"
            :closable="false"
            show-icon
            :title="
              stepStates[stepIndexes.rpm] === 'success'
                ? isSkipped.rpm
                  ? '已跳过补丁安装预检查'
                  : '补丁安装预检查通过'
                : '预检失败：' + taskErrorMessage
            "
            class="task-step-alert"
          >
            <template #default>
              <div v-if="rpmCheckResultText" class="task-step-result">{{ rpmCheckResultText }}</div>
              <div v-if="taskDetailData && taskDetailData.rpmCheckRunId" class="task-detail-info">
                <el-button
                  type="primary"
                  link
                  @click="openExecuteResult(taskDetailData.rpmCheckRunId, '补丁安装预检查')"
                  style="font-size: 14px"
                >
                  查看执行详情
                </el-button>
              </div>
            </template>
          </el-alert>
        </div>
      </div>

      <!-- Step 2: 预执行脚本 -->
      <div v-show="currentStepKey === 'pre'" class="task-step-content">
        <div class="task-step-editor">
          <div class="task-step-header">
            <div class="task-step-editor__title">
              <i class="fa fa-code" style="margin-right: 6px"></i>
              预执行脚本
            </div>
            <el-radio-group
              v-model="scriptModes.pre"
              size="small"
              :disabled="
                stepStates[stepIndexes.pre] === 'running' || stepStates[stepIndexes.pre] === 'success'
              "
            >
              <el-radio-button label="edit">手动编辑</el-radio-button>
              <el-radio-button label="upload">上传脚本</el-radio-button>
            </el-radio-group>
          </div>
          <div v-if="scriptModes.pre === 'edit'">
            <el-input
              type="textarea"
              v-model="installConfig.preScript"
              :autosize="{ minRows: 8, maxRows: 24 }"
              :placeholder="preScriptPlaceholder"
              class="script-input"
              :disabled="
                stepStates[stepIndexes.pre] === 'running' || stepStates[stepIndexes.pre] === 'success'
              "
            />
          </div>
          <div v-else class="script-upload-panel">
            <input
              ref="preScriptUploadRef"
              type="file"
              accept=".sh,.bash,.txt,.conf,.cfg,.yaml,.yml,.json,.log,.ini,.cnf,text/plain"
              class="script-upload-input"
              @change="handleScriptUpload('pre', $event)"
            />
            <div class="script-upload-actions">
              <el-button
                type="primary"
                plain
                :disabled="
                  stepStates[stepIndexes.pre] === 'running' ||
                  stepStates[stepIndexes.pre] === 'success'
                "
                @click="triggerScriptUpload('pre')"
              >
                <i class="fa fa-upload" style="margin-right: 4px" />
                上传脚本
              </el-button>
              <span class="script-upload-file">{{ scriptFiles.pre || '未选择文件' }}</span>
            </div>
            <div class="task-step-editor__hint">上传后会暂存到当前向导，执行时再同步到补丁安装任务。</div>
            <el-input
              type="textarea"
              :model-value="installConfig.preScript"
              :autosize="{ minRows: 8, maxRows: 24 }"
              placeholder="上传后将在这里预览脚本内容"
              class="script-input"
              readonly
            />
          </div>
        </div>
        <!-- 执行状态展示 -->
        <div class="task-step-action">
          <el-alert
            v-if="
              stepStates[stepIndexes.pre] === 'success' || stepStates[stepIndexes.pre] === 'failed'
            "
            :type="stepStates[stepIndexes.pre] === 'success' ? 'success' : 'error'"
            :closable="false"
            show-icon
            :title="
              stepStates[stepIndexes.pre] === 'success'
                ? isSkipped.pre
                  ? '已跳过预执行脚本'
                  : '预执行脚本执行完毕'
                : '执行失败：' + taskErrorMessage
            "
            class="task-step-alert"
          >
            <template
              #default
              v-if="taskDetailData && taskDetailData.preCheckRunId && installConfig.preScript"
            >
              <div class="task-detail-info">
                <el-button
                  type="primary"
                  link
                  @click="openExecuteResult(taskDetailData.preCheckRunId, '预执行脚本')"
                  style="font-size: 14px"
                >
                  查看执行详情
                </el-button>
              </div>
            </template>
          </el-alert>
        </div>
      </div>

      <!-- Step 3: 校验脚本 -->
      <div v-show="currentStepKey === 'validate'" class="task-step-content">
        <div class="task-step-editor">
          <div class="task-step-header">
            <div class="task-step-editor__title">
              <i class="fa fa-check-square-o" style="margin-right: 6px"></i>
              校验脚本
            </div>
            <el-radio-group
              v-model="scriptModes.post"
              size="small"
              :disabled="
                stepStates[stepIndexes.validate] === 'running' ||
                stepStates[stepIndexes.validate] === 'success'
              "
            >
              <el-radio-button label="edit">手动编辑</el-radio-button>
              <el-radio-button label="upload">上传脚本</el-radio-button>
            </el-radio-group>
          </div>
          <div v-if="scriptModes.post === 'edit'">
            <el-input
              type="textarea"
              v-model="installConfig.postScript"
              :autosize="{ minRows: 8, maxRows: 24 }"
              :placeholder="postScriptPlaceholder"
              class="script-input"
              :disabled="
                stepStates[stepIndexes.validate] === 'running' ||
                stepStates[stepIndexes.validate] === 'success'
              "
            />
          </div>
          <div v-else class="script-upload-panel">
            <input
              ref="postScriptUploadRef"
              type="file"
              accept=".sh,.bash,.txt,.conf,.cfg,.yaml,.yml,.json,.log,.ini,.cnf,text/plain"
              class="script-upload-input"
              @change="handleScriptUpload('post', $event)"
            />
            <div class="script-upload-actions">
              <el-button
                type="primary"
                plain
                :disabled="
                  stepStates[stepIndexes.validate] === 'running' ||
                  stepStates[stepIndexes.validate] === 'success'
                "
                @click="triggerScriptUpload('post')"
              >
                <i class="fa fa-upload" style="margin-right: 4px" />
                上传脚本
              </el-button>
              <span class="script-upload-file">{{ scriptFiles.post || '未选择文件' }}</span>
            </div>
            <div class="task-step-editor__hint">上传后会暂存到当前向导，执行时再同步到补丁安装任务。</div>
            <el-input
              type="textarea"
              :model-value="installConfig.postScript"
              :autosize="{ minRows: 8, maxRows: 24 }"
              placeholder="上传后将在这里预览脚本内容"
              class="script-input"
              readonly
            />
          </div>
        </div>
        <!-- 执行状态展示 -->
        <div class="task-step-action">
          <el-alert
            v-if="
              stepStates[stepIndexes.validate] === 'success' ||
              stepStates[stepIndexes.validate] === 'failed'
            "
            :type="stepStates[stepIndexes.validate] === 'success' ? 'success' : 'error'"
            :closable="false"
            show-icon
            :title="
              stepStates[stepIndexes.validate] === 'success'
                ? isSkipped.validate
                  ? '已跳过校验脚本'
                  : '全部校验通过'
                : '校验失败：' + taskErrorMessage
            "
            class="task-step-alert"
          >
            <template
              #default
              v-if="taskDetailData && taskDetailData.validateRunId && installConfig.postScript"
            >
              <div class="task-detail-info">
                <el-button
                  type="primary"
                  link
                  @click="openExecuteResult(taskDetailData.validateRunId, '校验脚本')"
                  style="font-size: 14px"
                >
                  查看执行详情
                </el-button>
              </div>
            </template>
          </el-alert>
        </div>
      </div>

      <!-- Step 4: 重启策略 -->
      <div v-show="currentStepKey === 'restart'" class="task-step-content">
        <div class="task-step-editor">
          <div class="task-step-editor__title">
            <i class="fa fa-refresh" style="margin-right: 6px"></i>
            重启策略
          </div>
          <el-alert
            :title="restartAdviceTitle"
            type="info"
            show-icon
            :closable="false"
            style="margin-bottom: 16px; line-height: 1.4; width: 100%"
          >
            <template #default>
              <div>{{ restartAdviceDescription }}</div>
            </template>
          </el-alert>
          <div v-if="requiresRestartConfirm" class="restart-confirm-field mt-4">
            <div class="confirm-label" style="font-size: 14px; margin-bottom: 8px">
              请输入“
              <span style="color: var(--el-color-primary); font-weight: bold">
                {{ restartConfirmKeyword }}
              </span>
              ”进行确认操作
            </div>
            <el-input
              v-model="restartConfirmText"
              :placeholder="restartConfirmKeyword"
              style="width: 320px"
              :disabled="
                stepStates[stepIndexes.restart] === 'running' ||
                stepStates[stepIndexes.restart] === 'success'
              "
            />
          </div>
          <el-alert
            v-else
            title="当前策略为无需重启，可直接进入下一步。"
            type="success"
            :closable="false"
            show-icon
          />
        </div>
        <!-- 执行状态展示 -->
        <div class="task-step-action">
          <el-alert
            v-if="
              stepStates[stepIndexes.restart] === 'success' ||
              stepStates[stepIndexes.restart] === 'failed'
            "
            :type="stepStates[stepIndexes.restart] === 'success' ? 'success' : 'error'"
            :closable="false"
            show-icon
            :title="
              stepStates[stepIndexes.restart] === 'success'
                ? isSkipped.restart || installConfig.restartPolicy === 'none'
                  ? '已跳过重启'
                  : '重启完成'
                : '重启失败：' + taskErrorMessage
            "
            class="task-step-alert"
          >
            <template #default v-if="taskDetailData && taskDetailData.restartRunId">
              <div class="task-detail-info">
                <el-button
                  type="primary"
                  link
                  @click="openExecuteResult(taskDetailData.restartRunId, '执行重启')"
                  style="font-size: 14px"
                >
                  查看执行详情
                </el-button>
              </div>
            </template>
          </el-alert>
        </div>
      </div>

      <!-- Step 5/6: 执行汇总 -->
      <div v-show="currentStepKey === 'execute'" class="task-step-content">
        <div class="task-step-editor">
          <div class="task-step-editor__title">
            <i class="fa fa-download" style="margin-right: 6px"></i>
            {{ executeStepTitle }}
          </div>
          <div class="install-summary-card">
            <div class="install-summary-row">
              <span class="install-summary-label">{{ selectionSummaryLabel }}</span>
              <div class="install-summary-list">
                <div v-if="selectionDisplayItems.length === 0" class="install-summary-empty">
                  暂无数据
                </div>
                <div
                  v-for="item in selectionDisplayItems"
                  :key="item.key"
                  class="install-summary-item"
                >
                  <div>{{ item.primary }}</div>
                  <div v-if="item.secondary" class="install-summary-subtext">
                    {{ item.secondary }}
                  </div>
                </div>
              </div>
            </div>
            <div class="install-summary-row">
              <span class="install-summary-label">目标主机</span>
              <div class="install-summary-list">
                <div v-if="confirmedHosts.length === 0" class="install-summary-empty">暂无主机</div>
                <div
                  v-for="host in confirmedHosts"
                  :key="host.hostId || host.id || host.hostKey"
                  class="install-summary-item"
                >
                  {{ formatHostDisplay(host) }}
                </div>
              </div>
            </div>
            <div class="install-summary-row">
              <span class="install-summary-label">{{ packageSummaryLabel }}</span>
              <div class="install-summary-list">
                <div v-if="affectedPackages.length === 0" class="install-summary-empty">
                  暂无软件包
                </div>
                <div v-for="pkg in affectedPackages" :key="pkg" class="install-summary-item">
                  {{ pkg }}
                </div>
              </div>
            </div>
            <div class="install-summary-row">
              <span class="install-summary-label">重启策略</span>
              <span class="install-summary-value">{{ restartStrategySummary }}</span>
            </div>
          </div>
        </div>
        <!-- 任务链执行进度展示 -->
        <div ref="pipelineSectionRef" class="task-step-action" v-if="pipelineStatus !== 'idle'">
          <div class="pipeline-timeline">
            <div
              v-for="(item, i) in pipelineItems"
              :key="i"
              class="timeline-item"
              :class="{
                'is-active': stepStates[item.idx] === 'running',
                'is-success': stepStates[item.idx] === 'success',
                'is-failed': stepStates[item.idx] === 'failed',
                'is-skipped': isSkipped[item.key] && stepStates[item.idx] === 'success',
                'is-pending': stepStates[item.idx] === 'idle'
              }"
            >
              <div class="timeline-node">
                <i v-if="stepStates[item.idx] === 'success'" class="fa fa-check" />
                <i v-else-if="stepStates[item.idx] === 'failed'" class="fa fa-times" />
                <i v-else-if="stepStates[item.idx] === 'running'" class="fa fa-spinner fa-spin" />
                <span v-else>{{ i + 1 }}</span>
              </div>
              <div class="timeline-content">
                <div class="timeline-info">
                  <div class="timeline-title">{{ item.label }}</div>
                  <div class="timeline-status-text">
                    {{
                      stepStates[item.idx] === 'running'
                        ? '正在执行中...'
                        : stepStates[item.idx] === 'success'
                          ? isSkipped[item.key]
                            ? '系统已跳过执行'
                            : '任务执行成功'
                          : stepStates[item.idx] === 'failed'
                            ? '任务执行失败，请检查'
                            : '等待调度中'
                    }}
                  </div>
                </div>
                <div class="timeline-actions" v-if="getTaskRunId(taskDetailData, item.runKey)">
                  <el-button
                    type="primary"
                    link
                    @click="
                      openExecuteResult(getTaskRunId(taskDetailData, item.runKey), item.label)
                    "
                    size="small"
                  >
                    查看详情
                  </el-button>
                </div>
              </div>
            </div>
          </div>

          <!-- 全流程终点提示 -->
          <el-alert
            v-if="pipelineFinished"
            :type="pipelineStatus === 'success' ? 'success' : 'error'"
            :closable="false"
            show-icon
            :title="pipelineStatus === 'success' ? '所有任务已全部完成' : '执行任务中断'"
            class="task-step-alert mt-3"
          >
            <template #default>
              <div v-if="pipelineStatus === 'success'" style="font-size: 13px">
                {{ pipelineSuccessDescription }}
              </div>
              <div v-else style="font-size: 13px">
                由于部分环节出现异常（{{ taskErrorMessage }}），任务已停止。请检查原因并重试。
              </div>
            </template>
          </el-alert>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <!-- Step 0 取消 -->
          <el-button v-if="currentStepKey === 'select'" @click="isVisible = false">取消</el-button>

          <!-- 上一步：仅在非执行中时允许回退 -->
          <el-button
            v-if="installStep > 0 && stepStates[installStep] !== 'running'"
            @click="goBack"
          >
            <i class="fa fa-chevron-left" style="margin-right: 4px" />
            上一步
          </el-button>

          <!-- 正在执行按钮 -->
          <el-button
            v-if="currentStepKey === 'execute' && (pipelineStatus === 'running' || executionSubmitting)"
            type="primary"
            loading
            disabled
          >
            <span>{{ pipelineStatus === 'running' ? '执行中...' : '准备执行...' }}</span>
          </el-button>

          <!-- 跳过按钮：针对 RPM 预检、预执行、校验脚本和重启配置 -->
          <el-button
            v-if="currentStepSkippable && !isSkipped[currentStepKey]"
            :disabled="stepTransitionLoading"
            @click="handleSkipStep"
          >
            跳过此步
          </el-button>

          <!-- 下一步按钮：配置步骤直接进入下一步 -->
          <el-button
            v-if="currentStepKey !== 'execute'"
            type="primary"
            :loading="stepTransitionLoading"
            :disabled="
              stepTransitionLoading ||
              (currentStepKey === 'select' && selectedHosts.length === 0) ||
              (currentStepKey === 'restart' &&
                requiresRestartConfirm &&
                restartConfirmText !== restartConfirmKeyword)
            "
            @click="handleAdvanceStep"
          >
            下一步
            <i class="fa fa-chevron-right" style="margin-left: 4px" />
          </el-button>

          <!-- 最后一步确认与离开按钮 -->
          <el-button
            v-if="
              installStep === finalStepIndex &&
              pipelineStatus !== 'running' &&
              !executionSubmitting
            "
            type="primary"
            @click="handlePrimaryAction"
          >
            <i
              :class="pipelineStatus === 'success' ? 'fa fa-check' : 'fa fa-play'"
              style="margin-right: 4px"
            />
            {{ pipelineStatus === 'success' ? '完成' : '开始执行任务' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <ExecuteResultDialog
      v-model:visible="executeResultVisible"
      :run-id="currentExecuteRunId"
      :job-title="currentExecuteJobTitle"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { patchInstallApi } from '../../api'
import {
  getPatchTaskDisplayConfig,
  getPatchTaskWizardSteps,
  resolvePatchTaskDisplayType
} from '../../constants/task-display'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  patchesToInstall: { type: Array, default: () => [] },
  fixedHost: { type: Object, default: null }, // 如果有，跳过步骤0的主机选择
  fixedHosts: { type: Array, default: () => [] },
  packageCandidates: { type: Array, default: () => [] },
  taskPackages: { type: Array, default: () => [] },
  histUpdateIds: { type: Array, default: () => [] },
  taskMode: { type: String, default: 'install' },
  operationType: { type: String, default: 'patch' },
  selectionSummaryItems: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:visible', 'success'])

const isVisible = computed({
  get: () => props.visible,
  set: val => emit('update:visible', val)
})

const isRollbackTask = computed(() => props.taskMode === 'rollback')
const isPackageTask = computed(() => props.operationType === 'package')
const isVulnerabilityTask = computed(() => props.operationType === 'vulnerability')
const resolvedFixedHosts = computed(() => {
  if (props.fixedHosts.length > 0) {
    return props.fixedHosts
  }

  return props.fixedHost ? [props.fixedHost] : []
})
const hasFixedHosts = computed(() => resolvedFixedHosts.value.length > 0)
const displayOperationType = computed(() =>
  resolvePatchTaskDisplayType({ taskMode: props.taskMode, operationType: props.operationType })
)

const operationConfig = computed(() => getPatchTaskDisplayConfig(displayOperationType.value))

const wizardDialogTitle = computed(() => operationConfig.value.dialogTitle)
const selectionCardTitle = computed(() => operationConfig.value.selectionTitle)
const executeStepTitle = computed(() => operationConfig.value.executeTitle)
const selectionSummaryLabel = computed(() => operationConfig.value.selectionSummaryLabel)
const packageSummaryLabel = computed(() => operationConfig.value.packageSummaryLabel)
const packageCardTitle = computed(() => operationConfig.value.packageCardTitle)
const hostCardTitle = computed(() => operationConfig.value.hostCardTitle)
const pipelineSuccessDescription = computed(() => operationConfig.value.successDescription)
const preScriptPlaceholder = computed(() => operationConfig.value.preScriptPlaceholder)
const postScriptPlaceholder = computed(() => operationConfig.value.postScriptPlaceholder)
const selectionDisplayItems = computed(() => {
  if (props.selectionSummaryItems.length > 0) {
    return props.selectionSummaryItems.map((item, index) => ({
      key: item.key || `${props.operationType}-${index}`,
      primary: item.primary || item.patch_id || item.patchId || '-',
      secondary: item.secondary || ''
    }))
  }

  return props.patchesToInstall.map((item, index) => ({
    key: item.patch_id || `${props.operationType}-${index}`,
    primary: item.patch_id || '-',
    secondary: item.patch_name || item.description || ''
  }))
})

const installDataLoading = ref(false)
const affectedPackages = ref([])
const affectedHosts = ref([])
const selectedHosts = ref([])
const confirmedHosts = ref([])

// watch visibility to load data
watch(
  () => props.visible,
  val => {
    if (val) {
      if (hasFixedHosts.value) {
        selectedHosts.value = [...resolvedFixedHosts.value]
        confirmedHosts.value = [...resolvedFixedHosts.value]
        affectedHosts.value = [...resolvedFixedHosts.value]
      }
      loadInstallData(props.patchesToInstall.map(p => p.patch_id))
    } else {
      resetInstallState()
    }
  }
)

// 加载安装相关数据（软件包列表、主机列表）
async function loadInstallData(patchIds) {
  installDataLoading.value = true
  affectedPackages.value = []
  if (hasFixedHosts.value) {
    affectedHosts.value = [...resolvedFixedHosts.value]
    selectedHosts.value = [...resolvedFixedHosts.value]
    confirmedHosts.value = [...resolvedFixedHosts.value]
  } else {
    affectedHosts.value = []
    selectedHosts.value = []
    confirmedHosts.value = []
  }

  if (isRollbackTask.value) {
    affectedPackages.value = [...props.packageCandidates]
    installDataLoading.value = false
    return
  }

  if ((isPackageTask.value || isVulnerabilityTask.value) && props.packageCandidates.length > 0) {
    affectedPackages.value = [...props.packageCandidates]
    installDataLoading.value = false
    return
  }

  if (!patchIds || patchIds.length === 0) {
    installDataLoading.value = false
    return
  }

  try {
    const promises = [patchInstallApi.getAffectedPackages({ patch_ids: patchIds })]
    if (!hasFixedHosts.value) {
      promises.push(
        patchInstallApi.getMachinesByPatch({ patch_ids: patchIds, hostId: '@@(linux)' })
      )
    }
    const responses = await Promise.all(promises)
    const pkgResponse = responses[0]

    if (pkgResponse?.data?.records) {
      affectedPackages.value = pkgResponse.data.records.map(r => r.file_name || r.pkg_name)
    }

    if (!hasFixedHosts.value) {
      const hostResponse = responses[1]
      if (hostResponse?.data?.records) {
        affectedHosts.value = hostResponse.data.records
      }
    }
  } catch (error) {
    console.error('Failed to load install data:', error)
  } finally {
    installDataLoading.value = false
  }
}

const hostTableRef = ref(null)
const hostFilter = ref('@@(linux)')
const hostSearchText = ref('')
const hostPagination = reactive({ page: 1, pageSize: 10, total: 0 })
const preScriptUploadRef = ref(null)
const postScriptUploadRef = ref(null)
const pipelineSectionRef = ref(null)
const executionSubmitting = ref(false)
const stepTransitionLoading = ref(false)
const restartAdviceSource = ref('local')
const restartAdviceCacheKey = ref('')
const scriptUploadFiles = reactive({ pre: null, post: null })
const restartOptions = reactive({
  restartType: 'none',
  restartRequired: false,
  restartLabel: '',
  restartDescription: '',
  restartReason: ''
})

// 过滤后的主机列表
const filteredHostList = computed(() => {
  let hosts = affectedHosts.value
  if (hostSearchText.value) {
    const keyword = hostSearchText.value.toLowerCase()
    hosts = hosts.filter(
      h =>
        h.hostKey?.toLowerCase().includes(keyword) || h.os_distro?.toLowerCase().includes(keyword)
    )
  }
  return hosts
})

watch(
  filteredHostList,
  hosts => {
    hostPagination.total = hosts.length
    const maxPage = Math.max(1, Math.ceil(hosts.length / hostPagination.pageSize))
    if (hostPagination.page > maxPage) {
      hostPagination.page = maxPage
    }
  },
  { immediate: true }
)

const filteredHosts = computed(() => {
  const hosts = filteredHostList.value
  const start = (hostPagination.page - 1) * hostPagination.pageSize
  const end = start + hostPagination.pageSize
  return hosts.slice(start, end)
})

// 主机分页处理
function handleHostPageChange(page) {
  hostPagination.page = page
}

function handleHostSizeChange(size) {
  hostPagination.pageSize = size
  hostPagination.page = 1
}

function handleHostSelectionChange(selection) {
  selectedHosts.value = selection
}

watch(
  () =>
    selectedHosts.value
      .map(host => host?.hostId || host?.id || host?.hostKey || host?.hostname || '')
      .join('|'),
  () => {
    invalidatePreparedTask()
  }
)

function formatHostDisplay(host) {
  const hostName = host?.hostKey || host?.hostname || host?.hostId || host?.id || '当前主机'
  const osName = [host?.os_distro, host?.os_version].filter(Boolean).join(' ')
  return osName ? `${hostName} (${osName})` : hostName
}

function normalizeRestartType(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
  return ['system', 'service', 'none'].includes(normalized) ? normalized : 'none'
}

function getRestartPriority(value) {
  const normalized = normalizeRestartType(value)
  if (normalized === 'system') return 2
  if (normalized === 'service') return 1
  return 0
}

function getRestartLabel(value) {
  const normalized = normalizeRestartType(value)
  if (normalized === 'system') return '系统重启'
  if (normalized === 'service') return '服务重启'
  return '无需重启'
}

function resolveHostIp(host) {
  return String(
    host?.hostIp ||
      host?.host_ip ||
      host?.hostKey ||
      host?.host_key ||
      host?.ip ||
      host?.hostname ||
      ''
  ).trim()
}


const scriptModes = reactive({
  pre: 'edit',
  post: 'edit'
})

const scriptFiles = reactive({
  pre: '',
  post: ''
})

function getScriptType(type) {
  return type === 'pre' ? 'pre-check' : 'validate'
}

function getScriptLabel(type) {
  return type === 'pre' ? '预执行脚本' : '校验脚本'
}

function triggerScriptUpload(type) {
  const inputRef = type === 'pre' ? preScriptUploadRef.value : postScriptUploadRef.value
  inputRef?.click()
}

async function uploadScriptToTask(type, file, silent = false) {
  if (!createdTaskId.value || !file) return true
  try {
    await patchInstallApi.uploadScript(createdTaskId.value, getScriptType(type), file)
    if (!silent) {
      ElMessage.success(`${getScriptLabel(type)}已上传`)
    }
    return true
  } catch {
    ElMessage.error(`${getScriptLabel(type)}上传失败`)
    return false
  }
}

async function syncScriptConfig(type) {
  if (!createdTaskId.value) return true

  if (scriptModes[type] === 'upload') {
    if (scriptUploadFiles[type]) {
      return uploadScriptToTask(type, scriptUploadFiles[type], true)
    }
    return true
  }

  try {
    const content = type === 'pre' ? installConfig.preScript : installConfig.postScript
    await patchInstallApi.updateScript(createdTaskId.value, getScriptType(type), content || '')
    return true
  } catch {
    ElMessage.error(`${getScriptLabel(type)}保存失败`)
    return false
  }
}

async function loadRestartOptions() {
  if (!createdTaskId.value) return
  try {
    const res = await patchInstallApi.getRestartOptions(createdTaskId.value)
    const data = res?.data || {}
    restartAdviceSource.value = 'task'
    restartOptions.restartType = data.restartType || installConfig.restartPolicy || 'none'
    restartOptions.restartRequired = Boolean(data.restartRequired)
    restartOptions.restartLabel = data.restartLabel || ''
    restartOptions.restartDescription = data.restartReason || ''
    restartOptions.restartReason = data.restartReason || ''
    if (['system', 'service', 'none'].includes(restartOptions.restartType)) {
      installConfig.restartPolicy = restartOptions.restartType
    }
    backendRestartReason.value = restartOptions.restartReason || backendRestartReason.value
  } catch {
    restartOptions.restartType = installConfig.restartPolicy || 'none'
    restartOptions.restartRequired = restartOptions.restartType !== 'none'
    restartOptions.restartReason = backendRestartReason.value
  }
}

async function loadRollbackInfo() {
  if (!createdTaskId.value || !isRollbackTask.value) return

  try {
    const res = await patchInstallApi.getRollbackInfo(createdTaskId.value)
    const data = res?.data || {}

    if (
      Array.isArray(data.patchPkgs) &&
      data.patchPkgs.length &&
      props.packageCandidates.length === 0
    ) {
      affectedPackages.value = data.patchPkgs
    }

    if (['system', 'service', 'none'].includes(data.restartType)) {
      installConfig.restartPolicy = data.restartType
      restartOptions.restartType = data.restartType
      restartOptions.restartRequired = data.restartType !== 'none'
    }

    if (data.restartReason) {
      restartOptions.restartReason = data.restartReason
    }

    if (data.kernelWarning) {
      restartOptions.restartDescription = data.kernelWarning
      backendRestartReason.value = data.kernelWarning
    }
  } catch {
    // 忽略回滚信息接口失败，保持现有任务默认值
  }
}

function getPatchStatusIds(patches) {
  return patches.flatMap(patch => {
    const rawValue =
      patch?.patch_status_id ||
      patch?.patchStatusId ||
      patch?.patch_status_ids ||
      patch?.patchStatusIds ||
      patch?.id

    if (Array.isArray(rawValue)) {
      return rawValue.filter(Boolean)
    }

    return rawValue ? [rawValue] : []
  })
}

function getTaskPackages() {
  if (props.taskPackages.length > 0) {
    return props.taskPackages.filter(Boolean)
  }

  return props.patchesToInstall.flatMap(patch => {
    const rawValue = patch?.packages || patch?.packageEntry || patch?.packageEntries || []

    if (Array.isArray(rawValue)) {
      return rawValue.filter(Boolean)
    }

    return rawValue ? [rawValue] : []
  })
}

async function handleScriptUpload(type, event) {
  const file = event.target?.files?.[0]
  if (!file) return

  try {
    const content = await file.text()
    if (type === 'pre') {
      installConfig.preScript = content
      scriptFiles.pre = file.name
      scriptUploadFiles.pre = file
    } else {
      installConfig.postScript = content
      scriptFiles.post = file.name
      scriptUploadFiles.post = file
    }
  } catch {
    ElMessage.error('脚本读取失败，请检查文件内容后重试')
  } finally {
    event.target.value = ''
  }
}

watch(
  [
    () => installConfig.preScript,
    () => installConfig.postScript,
    () => scriptModes.pre,
    () => scriptModes.post
  ],
  () => {
    invalidatePreparedTask()
  }
)

// 格式化日期时间
function formatDateTime(timestamp) {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date
    .toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    .replace(/\//g, '-')
}

// ============================================================
// 新向导步骤定义（按任务类型动态显示 RPM 预检）
// ============================================================
const wizardSteps = computed(() => getPatchTaskWizardSteps(displayOperationType.value))

// Wizard state
const installStep = ref(0)
const currentStepKey = computed(() => wizardSteps.value[installStep.value]?.key || 'select')
const stepIndexes = computed(() =>
  wizardSteps.value.reduce((result, step, index) => {
    result[step.key] = index
    return result
  }, {})
)
const finalStepIndex = computed(() => Math.max(0, wizardSteps.value.length - 1))
const currentStepSkippable = computed(() =>
  ['rpm', 'pre', 'validate', 'restart'].includes(currentStepKey.value)
)
const createdTaskId = ref('')
const backendRestartReason = ref('')
const restartConfirmText = ref('')
const pipelineStatus = ref('idle')
const installConfig = reactive({
  preScript: '',
  restartPolicy: 'none',
  postScript: ''
})

// 每步的执行状态: 'idle' | 'running' | 'success' | 'failed'
const stepStates = reactive(['idle', 'idle', 'idle', 'idle', 'idle', 'idle'])
const isSkipped = reactive({ rpm: false, pre: false, validate: false, restart: false })
const taskStatus = ref('') // 后端任务状态
const taskErrorMessage = ref('') // 错误信息
const taskDetailData = ref(null) // 从接口返回的任务详情
const pipelineFinished = ref(false) // 只有通过 startPipeline 的才是真完成
let pollTimer = null

const rpmCheckResultText = computed(() => formatTaskFieldValue(taskDetailData.value?.rpmCheckResult))
const pipelineItems = computed(() => {
  const items = []

  if (!isRollbackTask.value && Number.isInteger(stepIndexes.value.rpm)) {
    items.push({
      key: 'rpm',
      label: '补丁安装预检查',
      idx: stepIndexes.value.rpm,
      runKey: 'rpmCheckRunId'
    })
  }

  items.push(
    { key: 'pre', label: '预检查', idx: stepIndexes.value.pre, runKey: 'preCheckRunId' },
    {
      key: 'execute',
      label: executeStepTitle.value,
      idx: stepIndexes.value.execute,
      runKey: 'executeRunId'
    },
    { key: 'restart', label: '重启策略', idx: stepIndexes.value.restart, runKey: 'restartRunId' },
    { key: 'validate', label: '脚本校验', idx: stepIndexes.value.validate, runKey: 'validateRunId' }
  )

  return items
})

const smartRestartType = computed(() => {
  const patches = props.patchesToInstall
  let needsSystem = false
  let needsService = false

  for (const patch of patches) {
    const id = patch.patch_id?.toLowerCase() || ''
    if (
      patch.rebootStatus === 'system' ||
      patch.isKernel === 'is_kernel' ||
      id.includes('kernel')
    ) {
      needsSystem = true
    } else if (patch.rebootStatus === 'service') {
      needsService = true
    }
  }

  const pkgs = affectedPackages.value.join(' ').toLowerCase()
  if (pkgs.includes('kernel')) {
    needsSystem = true
  }

  if (needsSystem) return 'system'
  if (needsService || pkgs.includes('glibc') || pkgs.includes('openssl')) return 'service'
  return 'none'
})

watch(
  smartRestartType,
  type => {
    if (!createdTaskId.value && restartAdviceSource.value === 'local') {
      installConfig.restartPolicy = type
    }
  },
  { immediate: true }
)

const requiresRestartConfirm = computed(
  () => restartOptions.restartRequired || installConfig.restartPolicy !== 'none'
)
const restartConfirmSubmitText = '确认重启'
const restartConfirmKeyword = computed(() => {
  if (installConfig.restartPolicy === 'system') return '确认系统重启'
  if (installConfig.restartPolicy === 'service') return '确认服务重启'
  return '确认重启'
})
const restartAdviceTitle = computed(() => {
  if (restartOptions.restartLabel) return restartOptions.restartLabel
  if (installConfig.restartPolicy === 'system') return '系统重启建议'
  if (installConfig.restartPolicy === 'service') return '服务重启建议'
  return '重启建议'
})
const packageBasedRestartAdvice = computed(() => {
  const restartType = normalizeRestartType(restartOptions.restartType || installConfig.restartPolicy)
  if (restartType === 'none') return ''

  const packageNames = Array.from(new Set(affectedPackages.value.filter(Boolean)))
  const packageDescription =
    packageNames.length > 0 ? `软件包更新（${packageNames.join('、')}）` : '软件包更新'

  return `${packageDescription}，建议${getRestartLabel(restartType)}。`
})
const restartAdviceDescription = computed(() => {
  if (packageBasedRestartAdvice.value) {
    return packageBasedRestartAdvice.value
  }

  return (
    restartOptions.restartDescription ||
    restartOptions.restartReason ||
    backendRestartReason.value ||
    smartRestartGuess.value
  )
})
const restartStrategySummary = computed(() => {
  if (isSkipped.restart) return '已跳过重启'
  if (installConfig.restartPolicy === 'system') return '系统重启'
  if (installConfig.restartPolicy === 'service') return '服务重启'
  return '不重启'
})

// 执行详情弹窗
const executeResultVisible = ref(false)
const currentExecuteRunId = ref('')
const currentExecuteJobTitle = ref('')

function openExecuteResult(runId, jobTitle) {
  currentExecuteRunId.value = runId
  currentExecuteJobTitle.value = jobTitle
  executeResultVisible.value = true
}

function getTaskRunId(taskData, runKey) {
  if (!taskData || !runKey) return ''
  return taskData[runKey] || ''
}

function formatTaskFieldValue(value) {
  if (value === null || value === undefined || value === '') return ''

  if (typeof value === 'string') {
    return value
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function resolveApiErrorMessage(error, fallback = '操作失败，请稍后重试') {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.response?.data?.msg ||
    error?.message ||
    fallback
  )
}

function getStepIndex(stepKey) {
  const index = stepIndexes.value[stepKey]
  return Number.isInteger(index) ? index : -1
}

function resetSkippedSteps() {
  isSkipped.rpm = false
  isSkipped.pre = false
  isSkipped.validate = false
  isSkipped.restart = false
}

async function refreshTaskDetail() {
  if (!createdTaskId.value) return null
  try {
    const res = await patchInstallApi.getTask(createdTaskId.value)
    const data = res?.data
    if (data) {
      taskStatus.value = data.status || ''
      taskErrorMessage.value = data.errorMessage || ''
      taskDetailData.value = data
    }
    return data || null
  } catch {
    return null
  }
}

async function scrollToPipelineSection() {
  await nextTick()
  const target = pipelineSectionRef.value
  if (!target) return
  target.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onUnmounted(() => stopPolling())

function resetRestartOptions() {
  restartAdviceSource.value = 'local'
  restartAdviceCacheKey.value = ''
  restartOptions.restartType = 'none'
  restartOptions.restartRequired = false
  restartOptions.restartLabel = ''
  restartOptions.restartDescription = ''
  restartOptions.restartReason = ''
  backendRestartReason.value = ''
}

function applyLocalRestartAdvice(message = '') {
  restartAdviceSource.value = 'local'
  installConfig.restartPolicy = smartRestartType.value

  if (!message) {
    return
  }

  const description = `${message} ${smartRestartGuess.value}`.trim()
  restartOptions.restartType = smartRestartType.value
  restartOptions.restartRequired = smartRestartType.value !== 'none'
  restartOptions.restartLabel = ''
  restartOptions.restartDescription = description
  restartOptions.restartReason = description
}

function buildRestartAdviceDescription(hostAdviceList, ignoredCount, failedCount) {
  const systemHosts = hostAdviceList.filter(item => item.rebootStatus === 'system')
  const serviceHosts = hostAdviceList.filter(item => item.rebootStatus === 'service')
  const noneHosts = hostAdviceList.filter(item => item.rebootStatus === 'none')
  const highlightedHosts = hostAdviceList
    .filter(item => item.rebootStatus !== 'none')
    .slice(0, 3)
    .map(item => `${item.hostLabel}：${getRestartLabel(item.rebootStatus)}`)

  const parts = [
    `后端已基于 ${hostAdviceList.length} 台目标主机的补丁状态生成重启建议。`,
    `系统重启 ${systemHosts.length} 台，服务重启 ${serviceHosts.length} 台，无需重启 ${noneHosts.length} 台。`
  ]

  if (highlightedHosts.length > 0) {
    parts.push(`示例：${highlightedHosts.join('；')}。`)
  }

  if (ignoredCount > 0) {
    parts.push(`${ignoredCount} 个主机与补丁组合未命中状态记录，已自动忽略。`)
  }

  if (failedCount > 0) {
    parts.push(`${failedCount} 个主机与补丁组合查询失败，当前结果已按成功返回部分汇总。`)
  }

  return parts.join(' ')
}

function getSelectedPatchIds() {
  return Array.from(
    new Set(
      props.patchesToInstall.flatMap(patch =>
        String(patch?.patch_id || patch?.patchId || '')
          .split(',')
          .map(value => value.trim())
          .filter(Boolean)
      )
    )
  )
}

async function loadRestartAdviceByHostPatch(force = false) {
  const hostEntries = Array.from(
    new Map(
      confirmedHosts.value
        .map(host => {
          const hostIp = resolveHostIp(host)
          if (!hostIp) return null

          return [
            hostIp,
            {
              hostIp,
              hostLabel: formatHostDisplay(host)
            }
          ]
        })
        .filter(Boolean)
    ).values()
  )
  const patchIds = getSelectedPatchIds()

  if (hostEntries.length === 0 || patchIds.length === 0) {
    applyLocalRestartAdvice('未获取到完整的主机或补丁信息，已退回本地启发式建议。')
    return false
  }

  const queryKey = JSON.stringify({
    hostIps: hostEntries.map(item => item.hostIp).sort(),
    patchIds: [...patchIds].sort()
  })

  if (!force && restartAdviceCacheKey.value === queryKey && restartAdviceSource.value === 'backend') {
    return true
  }

  const cacheBuster = Date.now()
  const queryTasks = hostEntries.flatMap(host =>
    patchIds.map(patchId => ({
      hostIp: host.hostIp,
      hostLabel: host.hostLabel,
      patchId,
      request: patchInstallApi.getPatchRebootOnHost({
        patchId,
        hostIp: host.hostIp,
        cacheBuster
      })
    }))
  )

  const settledResults = await Promise.allSettled(queryTasks.map(item => item.request))
  const successfulResults = []
  let ignoredCount = 0
  let failedCount = 0

  settledResults.forEach((result, index) => {
    const task = queryTasks[index]

    if (result.status === 'fulfilled') {
      const data = result.value?.data || result.value
      successfulResults.push({
        hostIp: task.hostIp,
        hostLabel: task.hostLabel,
        patchId: task.patchId,
        rebootStatus: normalizeRestartType(data?.rebootStatus)
      })
      return
    }

    const statusCode =
      result.reason?.response?.status || result.reason?.status || result.reason?.code || 0

    if (Number(statusCode) === 404) {
      ignoredCount++
    } else {
      failedCount++
    }
  })

  if (successfulResults.length === 0) {
    applyLocalRestartAdvice('后端未返回可用的重启建议，已退回本地启发式建议。')
    restartAdviceCacheKey.value = ''
    return false
  }

  const hostAdviceMap = new Map()
  successfulResults.forEach(item => {
    const current = hostAdviceMap.get(item.hostIp) || {
      hostIp: item.hostIp,
      hostLabel: item.hostLabel,
      rebootStatus: 'none'
    }

    if (getRestartPriority(item.rebootStatus) > getRestartPriority(current.rebootStatus)) {
      current.rebootStatus = item.rebootStatus
    }

    hostAdviceMap.set(item.hostIp, current)
  })

  const hostAdviceList = Array.from(hostAdviceMap.values())
  const overallRestartType = hostAdviceList.reduce((current, item) => {
    return getRestartPriority(item.rebootStatus) > getRestartPriority(current)
      ? item.rebootStatus
      : current
  }, 'none')

  restartAdviceSource.value = 'backend'
  restartAdviceCacheKey.value = queryKey
  restartOptions.restartType = overallRestartType
  restartOptions.restartRequired = overallRestartType !== 'none'
  restartOptions.restartLabel = getRestartLabel(overallRestartType)
  restartOptions.restartDescription = buildRestartAdviceDescription(
    hostAdviceList,
    ignoredCount,
    failedCount
  )
  restartOptions.restartReason = restartOptions.restartDescription
  installConfig.restartPolicy = overallRestartType

  return true
}

function resetPipelineState() {
  stopPolling()
  pipelineStatus.value = 'idle'
  taskStatus.value = ''
  taskErrorMessage.value = ''
  taskDetailData.value = null
  pipelineFinished.value = false
  for (let i = 1; i < stepStates.length; i++) stepStates[i] = 'idle'
}

function canReusePreparedTask() {
  return (
    Boolean(createdTaskId.value) &&
    pipelineStatus.value === 'idle' &&
    !pipelineFinished.value &&
    stepStates.slice(1).every(state => state === 'idle')
  )
}

function invalidatePreparedTask() {
  if (!canReusePreparedTask()) return

  createdTaskId.value = ''
  taskStatus.value = ''
  taskErrorMessage.value = ''
  taskDetailData.value = null
  resetRestartOptions()
}

function resetInstallState() {
  stopPolling()
  installStep.value = 0
  createdTaskId.value = ''
  executionSubmitting.value = false
  backendRestartReason.value = ''
  pipelineStatus.value = 'idle'
  installConfig.preScript = ''
  installConfig.restartPolicy = 'none'
  installConfig.postScript = ''
  scriptModes.pre = 'edit'
  scriptModes.post = 'edit'
  scriptFiles.pre = ''
  scriptFiles.post = ''
  scriptUploadFiles.pre = null
  scriptUploadFiles.post = null
  resetRestartOptions()
  if (!hasFixedHosts.value) {
    selectedHosts.value = []
    confirmedHosts.value = []
  }
  taskStatus.value = ''
  taskErrorMessage.value = ''
  taskDetailData.value = null
  pipelineFinished.value = false
  for (let i = 0; i < stepStates.length; i++) stepStates[i] = 'idle'
  resetSkippedSteps()
  restartConfirmText.value = ''
}

// Smart reboot guess
const smartRestartGuess = computed(() => {
  if (smartRestartType.value === 'system') {
    return '检测到内核相关补丁或关键系统组件更新，建议执行系统重启。'
  }
  if (smartRestartType.value === 'service') {
    return '检测到服务级补丁或基础库更新，建议执行服务重启。'
  }
  return '当前补丁预计无需重启，可直接继续后续流程。'
})

function buildTaskRequestPayload() {
  return {
    hostIds: confirmedHosts.value.map(host => host.hostId || host.id).filter(Boolean),
    patchIds: props.patchesToInstall.map(patch => patch.patch_id).filter(Boolean),
    patchStatusIds: getPatchStatusIds(props.patchesToInstall)
  }
}

async function createExecutionTask() {
  try {
    const requestPayload = buildTaskRequestPayload()
    const res = isRollbackTask.value
      ? await patchInstallApi.createRollbackTask({
          ...requestPayload,
          histUpdateIds: props.histUpdateIds
        })
      : isPackageTask.value
        ? await patchInstallApi.createPkgUpdateTask({
            hostIds: requestPayload.hostIds,
            packages: getTaskPackages()
          })
        : isVulnerabilityTask.value
          ? await patchInstallApi.createVulnFixTask({
              hostIds: requestPayload.hostIds,
              patchIds: requestPayload.patchIds,
              patchStatusIds: requestPayload.patchStatusIds
            })
          : await patchInstallApi.createTask({
              ...requestPayload,
              osType: 'linux'
            })

    const data = res?.data || null
    const taskId = data?.id || ''
    if (!taskId) {
      throw new Error('任务创建失败，请稍后重试')
    }

    createdTaskId.value = taskId
    taskDetailData.value = data

    if (data.restartType && ['system', 'service', 'none'].includes(data.restartType)) {
      installConfig.restartPolicy = data.restartType
    }
    backendRestartReason.value = data.restartReason || ''
  } catch (error) {
    throw new Error(resolveApiErrorMessage(error, '任务创建失败，请稍后重试'))
  }
}

async function prepareTaskForExecution() {
  if (confirmedHosts.value.length === 0) {
    ElMessage.warning('请先选择目标主机')
    installStep.value = getStepIndex('select')
    return false
  }

  if (!canReusePreparedTask()) {
    resetPipelineState()
    createdTaskId.value = ''
    resetRestartOptions()
    await createExecutionTask()
  }

  const preSynced = await syncScriptConfig('pre')
  if (!preSynced) return false

  const postSynced = await syncScriptConfig('post')
  if (!postSynced) return false

  await loadRestartOptions()
  await loadRollbackInfo()

  if (
    requiresRestartConfirm.value &&
    !isSkipped.restart &&
    restartConfirmText.value !== restartConfirmKeyword.value
  ) {
    installStep.value = getStepIndex('restart')
    ElMessage.warning('后端评估结果要求确认重启，请完成确认后再开始执行')
    return false
  }

  return true
}

// 步骤0 → 进入步骤1，仅保存本地配置
async function handleNextStep() {
  if (stepTransitionLoading.value) return

  stepTransitionLoading.value = true
  const stepKey = currentStepKey.value

  try {
    if (stepKey === 'select') {
      if (selectedHosts.value.length === 0) return

      confirmedHosts.value = [...selectedHosts.value]
      for (let i = 1; i < stepStates.length; i++) stepStates[i] = 'idle'
      resetSkippedSteps()
      taskDetailData.value = null
      taskErrorMessage.value = ''
      pipelineFinished.value = false
      pipelineStatus.value = 'idle'
      createdTaskId.value = ''
      resetRestartOptions()
      installStep.value = getStepIndex(isRollbackTask.value ? 'pre' : 'rpm')
      return
    }

    if (stepKey === 'validate') {
      await loadRestartAdviceByHostPatch()
    }

    if (currentStepKey.value !== 'execute' && installStep.value < finalStepIndex.value) {
      installStep.value += 1
    }
  } finally {
    stepTransitionLoading.value = false
  }
}

function goBack() {
  if (installStep.value > 0) {
    installStep.value--
  }
}

function handleSkipStep() {
  if (!currentStepSkippable.value) return
  isSkipped[currentStepKey.value] = true
  handleNextStep()
}

function handleAdvanceStep() {
  if (currentStepSkippable.value) {
    isSkipped[currentStepKey.value] = false
  }
  handleNextStep()
}

function handlePrimaryAction() {
  if (pipelineStatus.value === 'success') {
    isVisible.value = false
    return
  }

  executeStep()
}

async function executeStep() {
  if (executionSubmitting.value || pipelineStatus.value === 'running') return

  executionSubmitting.value = true
  try {
    const taskPrepared = await prepareTaskForExecution()
    if (!taskPrepared) return
    await startPipeline()
  } catch (error) {
    ElMessage.error(resolveApiErrorMessage(error, '任务准备失败，请稍后重试'))
  } finally {
    executionSubmitting.value = false
  }
}

// 自动化执行逻辑
async function startPipeline() {
  const rpmStepIndex = getStepIndex('rpm')
  const preStepIndex = getStepIndex('pre')
  const validateStepIndex = getStepIndex('validate')
  const restartStepIndex = getStepIndex('restart')
  const executeStepIndex = getStepIndex('execute')

  pipelineStatus.value = 'running'
  taskErrorMessage.value = ''
  stopPolling()
  scrollToPipelineSection()

  try {
    // 1. 补丁安装预检查
    if (!isRollbackTask.value && rpmStepIndex >= 0) {
      stepStates[rpmStepIndex] = 'running'
      if (isSkipped.rpm) {
        await patchInstallApi.skipRpmCheck(createdTaskId.value)
        await refreshTaskDetail()
        const rpmSkipped = await pollStatusPromise(
          rpmStepIndex,
          ['RPM_CHECK_DONE'],
          ['RPM_CHECK_FAILED', 'FAILED']
        )
        if (!rpmSkipped) throw new Error('补丁安装预检查跳过失败')
      } else {
        await patchInstallApi.executeRpmCheck(createdTaskId.value)
        await refreshTaskDetail()
        const rpmSuccess = await pollStatusPromise(
          rpmStepIndex,
          ['RPM_CHECK_DONE'],
          ['RPM_CHECK_FAILED', 'FAILED']
        )
        if (!rpmSuccess) {
          throw new Error(taskErrorMessage.value || '补丁安装预检查失败')
        }
      }
    }

    // 2. 预执行脚本
    if (installConfig.preScript && !isSkipped.pre) {
      stepStates[preStepIndex] = 'running'
      await patchInstallApi.executePreCheck(createdTaskId.value)
      await refreshTaskDetail()
      const preSuccess = await pollStatusPromise(
        preStepIndex,
        ['PRE_CHECK_DONE'],
        ['PRE_CHECK_FAILED', 'FAILED']
      )
      if (!preSuccess) throw new Error('预执行脚本执行失败')
    } else {
      stepStates[preStepIndex] = 'running'
      await patchInstallApi.skipPreCheck(createdTaskId.value)
      await refreshTaskDetail()
      const preSkipped = await pollStatusPromise(
        preStepIndex,
        ['PRE_CHECK_DONE'],
        ['PRE_CHECK_FAILED', 'FAILED']
      )
      if (!preSkipped) throw new Error('预执行脚本跳过失败')
      isSkipped.pre = true
    }

    // 3. 安装或回滚执行
    stepStates[executeStepIndex] = 'running'
    if (isRollbackTask.value) {
      await patchInstallApi.executeRollbackTask(createdTaskId.value)
    } else {
      await patchInstallApi.executeInstallTask(createdTaskId.value)
    }
    await refreshTaskDetail()
    const installSuccess = await pollStatusPromise(
      executeStepIndex,
      [isRollbackTask.value ? 'ROLLBACK_DONE' : 'INSTALL_DONE'],
      [isRollbackTask.value ? 'ROLLBACK_FAILED' : 'INSTALL_FAILED', 'FAILED']
    )
    if (!installSuccess) throw new Error(`${executeStepTitle.value}失败`)

    await loadRestartOptions()
    await loadRollbackInfo()

    // 4. 重启策略
    if (installConfig.restartPolicy !== 'none' && !isSkipped.restart) {
      stepStates[restartStepIndex] = 'running'
      await patchInstallApi.confirmRestart(createdTaskId.value, true, restartConfirmSubmitText)
      await patchInstallApi.executeRestart(createdTaskId.value)
      await refreshTaskDetail()
      const restartSuccess = await pollStatusPromise(
        restartStepIndex,
        ['RESTART_DONE'],
        ['RESTART_FAILED', 'FAILED']
      )
      if (!restartSuccess) throw new Error('重启执行失败')
    } else {
      await patchInstallApi.confirmRestart(createdTaskId.value, false)
      await refreshTaskDetail()
      stepStates[restartStepIndex] = 'success'
      isSkipped.restart = true
    }

    // 5. 脚本校验
    if (installConfig.postScript && !isSkipped.validate) {
      stepStates[validateStepIndex] = 'running'
      await patchInstallApi.executeValidate(createdTaskId.value)
      await refreshTaskDetail()
      const validateSuccess = await pollStatusPromise(
        validateStepIndex,
        ['COMPLETED'],
        ['VALIDATE_FAILED', 'FAILED']
      )
      if (!validateSuccess) throw new Error('脚本校验执行失败')
    } else {
      stepStates[validateStepIndex] = 'running'
      await patchInstallApi.skipValidate(createdTaskId.value)
      await refreshTaskDetail()
      const validateSkipped = await pollStatusPromise(
        validateStepIndex,
        ['COMPLETED'],
        ['VALIDATE_FAILED', 'FAILED']
      )
      if (!validateSkipped) throw new Error('脚本校验跳过失败')
      isSkipped.validate = true
    }

    pipelineFinished.value = true
    pipelineStatus.value = 'success'
    emit('success')
    ElMessage.success('全流程执行完毕')
  } catch (error) {
    pipelineFinished.value = true
    pipelineStatus.value = 'failed'
    taskErrorMessage.value = resolveApiErrorMessage(error, '执行异常')
    ElMessage.error(`任务执行中断：${taskErrorMessage.value}`)
  }
}

// 供 startPipeline 使用的 Promise 化轮询
function pollStatusPromise(step, successStatuses, failedStatuses) {
  return new Promise(resolve => {
    let settled = false

    const finalize = success => {
      if (settled) return
      settled = true
      if (step >= 0) {
        stepStates[step] = success ? 'success' : 'failed'
      }
      stopPolling()
      resolve(success)
    }

    const evaluateTask = data => {
      if (!data?.status) return false

      taskStatus.value = data.status
      taskErrorMessage.value = data.errorMessage || taskErrorMessage.value
      taskDetailData.value = data

      if (successStatuses.includes(data.status)) {
        finalize(true)
        return true
      }

      if (failedStatuses.includes(data.status)) {
        finalize(false)
        return true
      }

      return false
    }

    if (evaluateTask(taskDetailData.value)) {
      return
    }

    pollTimer = setInterval(async () => {
      try {
        const res = await patchInstallApi.getTask(createdTaskId.value)
        const data = res?.data
        evaluateTask(data)
      } catch (error) {
        taskErrorMessage.value = resolveApiErrorMessage(error, '任务状态查询失败')
        finalize(false)
      }
    }, 3000)
  })
}
</script>

<style scoped lang="scss">
.ops-stepper {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  margin-bottom: 30px;
  padding: 0 40px;
}
.stepper-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 90px;
  position: relative;
  z-index: 1;
}
.stepper-item .stepper-icon {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background-color: var(--el-bg-color, #fff);
  border: 2px solid var(--el-text-color-placeholder, #a8abb2);
  color: var(--el-text-color-placeholder, #a8abb2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  margin-bottom: 6px;
  transition: all 0.3s;
}
.stepper-item .stepper-title {
  font-size: 12px;
  color: var(--el-text-color-regular, #606266);
  font-weight: 500;
  transition: all 0.3s;
  text-align: center;
  white-space: nowrap;
}
.stepper-item.is-active .stepper-icon {
  border-color: var(--el-color-primary, #409eff);
  background-color: var(--el-color-primary, #409eff);
  color: #fff;
}
.stepper-item.is-active .stepper-title {
  color: var(--el-color-primary, #409eff);
  font-weight: bold;
}
.stepper-item.is-success .stepper-icon {
  border-color: var(--el-color-success, #67c23a);
  color: var(--el-color-success, #67c23a);
  background-color: var(--el-bg-color, #fff);
}
.stepper-item.is-success .stepper-title {
  color: var(--el-color-success, #67c23a);
}
.stepper-item.is-failed .stepper-icon {
  border-color: var(--el-color-danger, #f56c6c);
  background-color: var(--el-color-danger, #f56c6c);
  color: #fff;
}
.stepper-item.is-failed .stepper-title {
  color: var(--el-color-danger, #f56c6c);
}
.stepper-line {
  flex: 1;
  height: 2px;
  background-color: var(--el-border-color-lighter, #ebeef5);
  margin: 12px -30px 0;
  z-index: 0;
  transition: all 0.3s;
}
.stepper-line.is-active {
  background-color: var(--el-color-success, #67c23a);
}
.task-step-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 280px;
}
.task-step-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.task-step-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.task-step-editor__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  padding: 4px 0;
  display: flex;
  align-items: center;
  gap: 4px;
}
.task-step-editor__hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-weight: 400;
}
.task-step-action {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  margin-top: 4px;
}
.task-step-alert {
  width: 100%;
}
.task-detail-info {
  font-size: 13px;
  margin-top: 4px;
  color: var(--el-text-color-regular);
}
.task-step-result {
  margin-top: 8px;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  line-height: 1.5;
}
.install-summary-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  overflow: hidden;
  margin-top: 4px;
}
.install-summary-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 14px;
  font-size: 13px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.install-summary-row:last-child {
  border-bottom: none;
}
.install-summary-label {
  min-width: 90px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
  font-size: 12px;
}
.install-summary-value {
  color: var(--el-text-color-primary);
  word-break: break-all;
}
.install-summary-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}
.install-summary-item {
  color: var(--el-text-color-primary);
  word-break: break-all;
  line-height: 1.5;
}
.install-summary-subtext {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.install-summary-empty {
  color: var(--el-text-color-placeholder);
}
.task-done-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  gap: 16px;
  text-align: center;
}
.task-done-icon {
  animation: pulse-success 0.6s ease-out;
}
@keyframes pulse-success {
  0% {
    transform: scale(0.6);
    opacity: 0;
  }
  70% {
    transform: scale(1.15);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
.install-card {
  margin-bottom: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  overflow: hidden;
}
.install-card .card-header {
  background: var(--el-fill-color-light);
  padding: 8px 12px;
  font-weight: 500;
  font-size: 13px;
  color: var(--el-text-color-primary);
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.install-card .card-body {
  padding: 10px 12px;
  background: var(--el-bg-color);
  font-size: 13px;
  color: var(--el-text-color-primary);
}
.selection-item {
  padding: 6px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.selection-item:last-child {
  border-bottom: none;
}
.selection-item__primary {
  color: var(--el-text-color-primary);
  word-break: break-all;
}
.selection-item__secondary {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin-top: 2px;
  word-break: break-all;
}
.package-item {
  font-family: monospace;
  font-size: 12px;
  margin-bottom: 4px;
  color: #666;
}
.card-body--scroll {
  max-height: 200px;
  overflow-y: auto;
}
.host-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.host-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 8px;
}
.mt-3 {
  margin-top: 12px;
}
.script-input :deep(.el-textarea__inner) {
  font-family: monospace;
  background-color: #fafafa;
}
.script-upload-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.script-upload-input {
  display: none;
}
.script-upload-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.script-upload-file {
  color: var(--el-text-color-regular);
  font-size: 13px;
}
.restart-radio-group {
  display: flex;
  gap: 16px;
  padding: 10px 0;
}
.pipeline-timeline {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  padding: 10px 0;
}
.timeline-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background-color: var(--el-fill-color-blank);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}
.timeline-item.is-active {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}
.timeline-item.is-success {
  border-color: var(--el-color-success-light-5);
  background-color: var(--el-color-success-light-9);
}
.timeline-item.is-failed {
  border-color: var(--el-color-danger-light-5);
  background-color: var(--el-color-danger-light-9);
}
.timeline-item.is-skipped {
  border-style: dashed;
  opacity: 0.7;
  filter: grayscale(0.5);
}
.timeline-node {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  background-color: var(--el-fill-color-light);
  color: var(--el-text-color-placeholder);
  flex-shrink: 0;
}
.is-active .timeline-node {
  background-color: var(--el-color-primary);
  color: #fff;
}
.is-success .timeline-node {
  background-color: var(--el-color-success);
  color: #fff;
}
.is-failed .timeline-node {
  background-color: var(--el-color-danger);
  color: #fff;
}
.timeline-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.timeline-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.timeline-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.timeline-status-text {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.is-active .timeline-title {
  color: var(--el-color-primary);
}
.is-success .timeline-title {
  color: var(--el-color-success);
}
.is-failed .timeline-title {
  color: var(--el-color-danger);
}
.timeline-actions .el-button {
  font-size: 14px;
  font-weight: 500;
  padding: 4px 0;
}
</style>
