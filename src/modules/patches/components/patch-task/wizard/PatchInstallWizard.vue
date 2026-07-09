<template>
  <div>
    <!-- 补丁安装向导对话框 -->
    <el-dialog
      v-model="isVisible"
      :title="wizardDialogTitle"
      width="1000px"
      :close-on-click-modal="false"
      class="install-dialog"
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
          <div
            class="card-header"
            style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 4px 12px;
              height: 36px;
            "
          >
            <div>
              <i class="fa fa-cube" style="margin-right: 6px" />
              {{ packageCardTitle }}
            </div>
            <div v-if="affectedPackages.length > 10">
              <el-input
                v-model="packageSearchText"
                placeholder="搜索..."
                size="small"
                clearable
                style="width: 240px"
              />
            </div>
          </div>
          <div class="card-body card-body--scroll">
            <div v-for="pkg in displayedPackages" :key="pkg" class="package-item">
              {{ pkg }}
            </div>
            <div v-if="displayedPackages.length === 0" class="no-data">
              {{ affectedPackages.length === 0 ? '暂无数据' : '未匹配到相关软件包' }}
            </div>
            <div v-if="hasMorePackages" style="text-align: center; padding-top: 4px">
              <el-button link type="primary" size="small" @click="loadMorePackages">
                加载更多 (已显示 {{ displayedPackages.length }}/{{ filteredPackages.length }})
              </el-button>
            </div>
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
              <el-button
                size="small"
                :type="hostAllSelected ? 'default' : 'primary'"
                @click="handleToggleHostSelectAll"
              >
                <i :class="`fa fa-${hostAllSelected ? 'times' : 'check-double'} me-1`" />
                {{ hostAllSelected ? '一键取消' : '一键全选' }}
              </el-button>
            </div>
            <el-table
              ref="hostTableRef"
              :data="filteredHosts"
              size="small"
              max-height="320"
              @select="handleHostTableSelect"
              @select-all="handleHostTableSelect"
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

      <!-- Step 1: 预执行脚本 -->
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
                stepStates[stepIndexes.pre] === 'running' ||
                stepStates[stepIndexes.pre] === 'success'
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
                stepStates[stepIndexes.pre] === 'running' ||
                stepStates[stepIndexes.pre] === 'success'
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
            <div class="task-step-editor__hint">
              上传后会暂存到当前向导，执行时再同步到补丁安装任务。
            </div>
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
            <div class="task-step-editor__hint">
              上传后会暂存到当前向导，执行时再同步到补丁安装任务。
            </div>
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
                <template v-else>
                  <div
                    v-if="selectionDisplayItems.length > 5"
                    style="
                      margin-bottom: 8px;
                      display: flex;
                      gap: 8px;
                      align-items: center;
                      flex-wrap: wrap;
                      width: 100%;
                    "
                  >
                    <el-input
                      v-model="selectionSummarySearchText"
                      placeholder="搜索内容..."
                      size="small"
                      clearable
                      style="width: 200px"
                    />
                    <span style="font-size: 12px; color: var(--el-text-color-secondary)">
                      共 {{ selectionDisplayItems.length }} 个，已显示
                      {{ displayedSummarySelectionItems.length }} 个
                    </span>
                  </div>
                  <div
                    class="summary-selection-list-container"
                    style="
                      max-height: 150px;
                      overflow-y: auto;
                      border: 1px solid var(--el-border-color-lighter);
                      padding: 8px;
                      border-radius: 4px;
                      width: 100%;
                    "
                  >
                    <div
                      v-for="item in displayedSummarySelectionItems"
                      :key="item.key"
                      class="install-summary-item"
                      style="
                        padding: 4px 0;
                        border-bottom: 1px dashed var(--el-border-color-extra-light);
                      "
                    >
                      <div style="font-weight: 500">{{ item.primary }}</div>
                      <div
                        v-if="item.secondary"
                        class="install-summary-subtext"
                        style="
                          font-size: 12px;
                          color: var(--el-text-color-secondary);
                          margin-top: 2px;
                        "
                      >
                        {{ item.secondary }}
                      </div>
                    </div>
                    <div
                      v-if="displayedSummarySelectionItems.length === 0"
                      class="install-summary-empty"
                      style="font-size: 12px"
                    >
                      未匹配到相关内容
                    </div>
                    <div
                      v-if="hasMoreSummarySelectionItems"
                      style="text-align: center; padding-top: 8px"
                    >
                      <el-button
                        link
                        type="primary"
                        size="small"
                        @click="loadMoreSummarySelectionItems"
                      >
                        加载更多 (已显示 {{ displayedSummarySelectionItems.length }}/{{
                          filteredSummarySelectionItems.length
                        }})
                      </el-button>
                    </div>
                  </div>
                </template>
              </div>
            </div>
            <div class="install-summary-row">
              <span class="install-summary-label">目标主机</span>
              <div class="install-summary-list">
                <div v-if="confirmedHosts.length === 0" class="install-summary-empty">暂无主机</div>
                <template v-else>
                  <div
                    v-if="confirmedHosts.length > 5"
                    style="
                      margin-bottom: 8px;
                      display: flex;
                      gap: 8px;
                      align-items: center;
                      flex-wrap: wrap;
                      width: 100%;
                    "
                  >
                    <el-input
                      v-model="hostSummarySearchText"
                      placeholder="搜索目标主机..."
                      size="small"
                      clearable
                      style="width: 200px"
                    />
                    <span style="font-size: 12px; color: var(--el-text-color-secondary)">
                      共 {{ confirmedHosts.length }} 台，已显示
                      {{ displayedSummaryHosts.length }} 台
                    </span>
                  </div>
                  <div
                    class="summary-host-list-container"
                    style="
                      max-height: 150px;
                      overflow-y: auto;
                      border: 1px solid var(--el-border-color-lighter);
                      padding: 8px;
                      border-radius: 4px;
                      width: 100%;
                    "
                  >
                    <div
                      v-for="host in displayedSummaryHosts"
                      :key="host.hostId || host.id || host.hostKey"
                      class="install-summary-item"
                      style="padding: 2px 0"
                    >
                      {{ formatHostDisplay(host) }}
                    </div>
                    <div
                      v-if="displayedSummaryHosts.length === 0"
                      class="install-summary-empty"
                      style="font-size: 12px"
                    >
                      未匹配到相关主机
                    </div>
                    <div v-if="hasMoreSummaryHosts" style="text-align: center; padding-top: 8px">
                      <el-button link type="primary" size="small" @click="loadMoreSummaryHosts">
                        加载更多 (已显示 {{ displayedSummaryHosts.length }}/{{
                          filteredSummaryHosts.length
                        }})
                      </el-button>
                    </div>
                  </div>
                </template>
              </div>
            </div>
            <div class="install-summary-row">
              <span class="install-summary-label">{{ packageSummaryLabel }}</span>
              <div class="install-summary-list">
                <div v-if="affectedPackages.length === 0" class="install-summary-empty">
                  暂无软件包
                </div>
                <template v-else>
                  <div
                    v-if="affectedPackages.length > 10"
                    style="
                      margin-bottom: 8px;
                      display: flex;
                      gap: 8px;
                      align-items: center;
                      flex-wrap: wrap;
                    "
                  >
                    <el-input
                      v-model="packageSearchText"
                      placeholder="搜索软件包..."
                      size="small"
                      clearable
                      style="width: 200px"
                    />
                    <span style="font-size: 12px; color: var(--el-text-color-secondary)">
                      共 {{ affectedPackages.length }} 个，已显示 {{ displayedPackages.length }} 个
                    </span>
                  </div>
                  <div
                    class="package-list-container"
                    style="
                      max-height: 200px;
                      overflow-y: auto;
                      border: 1px solid var(--el-border-color-lighter);
                      padding: 8px;
                      border-radius: 4px;
                      width: 100%;
                    "
                  >
                    <div
                      v-for="pkg in displayedPackages"
                      :key="pkg"
                      class="install-summary-item"
                      style="font-family: monospace; font-size: 12px; padding: 2px 0"
                    >
                      {{ pkg }}
                    </div>
                    <div
                      v-if="displayedPackages.length === 0"
                      class="install-summary-empty"
                      style="font-size: 12px"
                    >
                      未匹配到相关软件包
                    </div>
                    <div v-if="hasMorePackages" style="text-align: center; padding-top: 8px">
                      <el-button link type="primary" size="small" @click="loadMorePackages">
                        加载更多 (已显示 {{ displayedPackages.length }}/{{
                          filteredPackages.length
                        }})
                      </el-button>
                    </div>
                  </div>
                </template>
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

          <!-- 前置环境检查详细结果 -->
          <div v-if="parsedPreCheckResult" class="pre-check-result-panel" style="margin-top: 20px; border: 1px solid #dcdfe6; border-radius: 4px; padding: 16px; background-color: #fafafa; width: 100%; box-sizing: border-box;">
            <div class="panel-title" style="font-size: 15px; font-weight: bold; margin-bottom: 12px; color: #303133; display: flex; align-items: center;">
              <i class="fa fa-heartbeat" style="margin-right: 6px; color: #409eff;"></i>
              前置环境检查结果
            </div>

            <!-- 主机结果详情 -->
            <div v-if="parsedPreCheckResult.results && parsedPreCheckResult.results.length > 0" style="width: 100%;">
              <div
                v-for="hostResult in parsedPreCheckResult.results"
                :key="hostResult.host_id"
                style="background: #ffffff; border: 1px solid #e4e7ed; border-radius: 6px; margin-bottom: 12px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04); transition: all 0.3s;"
              >
                <div
                  style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #f2f6fc; border-top-left-radius: 6px; border-top-right-radius: 6px; flex-wrap: wrap; gap: 8px; transition: all 0.3s;"
                  :style="{
                    backgroundColor: isHostUnreachable(hostResult) ? '#fef0f0' : '#fafafa',
                    borderBottomColor: isHostUnreachable(hostResult) ? '#fde2e2' : '#f2f6fc'
                  }"
                >
                  <span
                    style="font-weight: 600; font-size: 14px; display: flex; align-items: center; transition: all 0.3s;"
                    :style="{ color: isHostUnreachable(hostResult) ? '#f56c6c' : '#303133' }"
                  >
                    <i
                      class="fa fa-server"
                      style="margin-right: 8px; transition: all 0.3s;"
                      :style="{ color: isHostUnreachable(hostResult) ? '#f56c6c' : '#909399' }"
                    ></i>
                    {{ getHostDisplayName(hostResult.host_id) }}
                    <span v-if="isHostUnreachable(hostResult)" style="font-size: 12px; margin-left: 8px; font-weight: normal; color: #f56c6c;">
                      (无法连通)
                    </span>
                  </span>
                  <div style="display: flex; gap: 6px; align-items: center;">
                    <el-tag v-if="hostResult.blockers > 0" type="danger" size="small" effect="dark">
                      阻断项: {{ hostResult.blockers }}
                    </el-tag>
                    <el-tag v-if="hostResult.warnings > 0" type="warning" size="small" effect="dark">
                      警告项: {{ hostResult.warnings }}
                    </el-tag>
                    <el-tag v-if="hostResult.blockers === 0 && hostResult.warnings === 0" type="success" size="small" effect="dark">
                      检查通过
                    </el-tag>
                  </div>
                </div>

                <div style="padding: 16px;">
                  <!-- 检查项明细折叠面板 -->
                  <el-collapse v-model="activeCollapseNames" style="border: none;">
                    <el-collapse-item title="查看检查项明细" :name="hostResult.host_id" style="border: none;">
                      <div style="padding: 8px 0 0 0;">
                        <div
                          v-for="check in sortChecks(hostResult.checks)"
                          :key="check.id"
                          style="display: flex; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid #f2f6fc;"
                        >
                          <i
                            class="fa"
                            :class="{
                              'fa-times-circle': check.status === 'fail',
                              'fa-exclamation-circle': check.status === 'warn',
                              'fa-check-circle': check.status === 'ok'
                            }"
                            :style="{
                              color: check.status === 'fail' ? '#f56c6c' : check.status === 'warn' ? '#e6a23c' : '#67c23a',
                              fontSize: '16px',
                              marginTop: '2px',
                              marginRight: '10px'
                            }"
                          />
                          <div style="flex: 1;">
                            <div style="display: flex; justify-content: flex-start; align-items: center; gap: 8px; flex-wrap: wrap;">
                              <span style="font-weight: 600; font-size: 13px; color: #303133;">
                                {{ getCheckTitle(check.id) }}
                              </span>
                              <el-tag
                                :type="check.status === 'fail' ? 'danger' : check.status === 'warn' ? 'warning' : 'success'"
                                size="small"
                                style="font-size: 10px; height: 16px; line-height: 14px; padding: 0 4px;"
                              >
                                {{ check.status === 'fail' ? '阻断' : check.status === 'warn' ? '警告' : '通过' }}
                              </el-tag>
                            </div>
                            <div style="font-size: 12px; color: #606266; margin-top: 4px; line-height: 1.4;">
                              {{ check.detail }}
                            </div>
                          </div>
                        </div>
                      </div>
                    </el-collapse-item>
                  </el-collapse>
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
            v-if="
              currentStepKey === 'execute' && (pipelineStatus === 'running' || executionSubmitting)
            "
            type="primary"
            loading
            disabled
          >
            <span>{{ pipelineStatus === 'running' ? '执行中...' : '准备执行...' }}</span>
          </el-button>

          <!-- 跳过按钮：针对 RPM 预检、预执行、校验脚本和重启配置 -->
          <el-button
            v-if="currentStepSkippable"
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

          <!-- 预检查失败时的特定操作 -->
          <template v-if="installStep === finalStepIndex && stepStates[stepIndexes.pre] === 'failed' && pipelineStatus === 'failed'">
            <el-button
              type="primary"
              :loading="executionSubmitting"
              @click="handleRetryPreCheck"
            >
              <i class="fa fa-refresh" style="margin-right: 4px" />
              重新检查
            </el-button>
            <el-button
              type="danger"
              plain
              :loading="executionSubmitting"
              @click="handleSkipPreCheck"
            >
              <i class="fa fa-forward" style="margin-right: 4px" />
              跳过检查并继续
            </el-button>
          </template>

          <!-- 最后一步确认与离开按钮 -->
          <el-button
            v-else-if="
              installStep === finalStepIndex && pipelineStatus !== 'running' && !executionSubmitting
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
import { ref, reactive, computed, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { formatDateTime } from '@/utils/date'
import { ElMessageBox } from 'element-plus'
import { patchInstallApi } from '../../../api'
import { getPatchTaskWizardSteps } from '../../../constants/task-display'
import { formatHostDisplay } from './patchTaskWizardUtils'
import { usePatchTaskBackendRestartAdvice } from './usePatchTaskBackendRestartAdvice'
import { usePatchTaskDisplay } from './usePatchTaskDisplay'
import { usePatchTaskFlow } from './usePatchTaskFlow'
import { usePatchTaskPipeline } from './usePatchTaskPipeline'
import { usePatchTaskPreparedState } from './usePatchTaskPreparedState'
import { usePatchTaskRestartAdvice } from './usePatchTaskRestartAdvice'
import { usePatchTaskScripts } from './usePatchTaskScripts'
import { usePatchTaskTaskCreation } from './usePatchTaskTaskCreation'
import { usePatchTaskTaskPreparation } from './usePatchTaskTaskPreparation'
import { useLazyDisplayList } from '../../../composables/useLazyDisplayList'
import { useTableSelectAll } from '../../../composables/useTableSelectAll'
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
const {
  displayOperationType,
  executeStepTitle,
  hostCardTitle,
  packageCardTitle,
  packageSummaryLabel,
  pipelineSuccessDescription,
  postScriptPlaceholder,
  preScriptPlaceholder,
  selectionCardTitle,
  selectionDisplayItems,
  selectionSummaryLabel,
  wizardDialogTitle
} = usePatchTaskDisplay(props)

const installDataLoading = ref(false)
const affectedPackages = ref([])
const affectedHosts = ref([])
const selectedHosts = ref([])
const confirmedHosts = ref([])

// 软件包渲染性能优化：分页与过滤
const {
  searchText: packageSearchText,
  displayedList: displayedPackages,
  hasMore: hasMorePackages,
  loadMore: loadMorePackages,
  filteredList: filteredPackages
} = useLazyDisplayList(affectedPackages, {
  initialCount: 50,
  stepCount: 100
})

// 目标主机汇总渲染性能优化：分页与过滤
const {
  searchText: hostSummarySearchText,
  displayedList: displayedSummaryHosts,
  hasMore: hasMoreSummaryHosts,
  loadMore: loadMoreSummaryHosts,
  filteredList: filteredSummaryHosts
} = useLazyDisplayList(confirmedHosts, {
  initialCount: 20,
  stepCount: 50,
  searchFn: (host, keyword) => formatHostDisplay(host).toLowerCase().includes(keyword)
})

// 待更新软件包/补丁/漏洞汇总列表渲染性能优化：分页与过滤
const {
  searchText: selectionSummarySearchText,
  displayedList: displayedSummarySelectionItems,
  hasMore: hasMoreSummarySelectionItems,
  loadMore: loadMoreSummarySelectionItems,
  filteredList: filteredSummarySelectionItems
} = useLazyDisplayList(selectionDisplayItems, {
  initialCount: 20,
  stepCount: 50,
  searchFn: (item, keyword) => {
    const primary = String(item.primary || '').toLowerCase()
    const secondary = String(item.secondary || '').toLowerCase()
    return primary.includes(keyword) || secondary.includes(keyword)
  }
})

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
    resetHostAllSelected()
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
    if (pkgResponse?.data) {
      affectedPackages.value = pkgResponse.data.map(r => r.file_name || r.pkg_name)
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
const pipelineSectionRef = ref(null)
const executionSubmitting = ref(false)
const stepTransitionLoading = ref(false)

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

// 一键全选 / 跨页勾选
const {
  allSelected: hostAllSelected,
  handleToggleAllSelection: handleToggleHostSelectAll,
  handleTableSelect: handleHostTableSelect,
  resetAllSelected: resetHostAllSelected
} = useTableSelectAll(hostTableRef, {
  tableData: filteredHosts,
  filteredData: filteredHostList,
  selectedItems: selectedHosts,
  matchFn: (a, b) =>
    (a.hostId || a.id || a.hostKey) === (b.hostId || b.id || b.hostKey)
})

watch(
  () =>
    selectedHosts.value
      .map(host => host?.hostId || host?.id || host?.hostKey || host?.hostname || '')
      .join('|'),
  () => {
    invalidatePreparedTask()
  }
)

const installConfig = reactive({
  preScript: '',
  restartPolicy: 'none',
  postScript: ''
})



// ============================================================
// 向导步骤定义
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
  ['pre', 'validate', 'restart'].includes(currentStepKey.value)
)
const createdTaskId = ref('')
const restartConfirmText = ref('')
const pipelineStatus = ref('idle')

// 每步的执行状态: 'idle' | 'running' | 'success' | 'failed'
const stepStates = reactive(['idle', 'idle', 'idle', 'idle', 'idle'])
const isSkipped = reactive({ pre: false, validate: false, restart: false })
const {
  applyLocalRestartAdvice,
  backendRestartReason,
  requiresRestartConfirm,
  resetRestartOptions,
  restartAdviceCacheKey,
  restartAdviceDescription,
  restartAdviceSource,
  restartAdviceTitle,
  restartConfirmKeyword,
  restartConfirmSubmitText,
  restartOptions,
  restartStrategySummary
} = usePatchTaskRestartAdvice({
  props,
  affectedPackages,
  createdTaskId,
  installConfig,
  isSkipped
})
const taskStatus = ref('') // 后端任务状态
const taskErrorMessage = ref('') // 错误信息
const taskDetailData = ref(null) // 从接口返回的任务详情
const pipelineFinished = ref(false) // 只有通过 startPipeline 的才是真完成
const { loadRestartOptions, loadRollbackInfo } = usePatchTaskTaskPreparation({
  props,
  createdTaskId,
  isRollbackTask,
  installConfig,
  restartOptions,
  restartAdviceSource,
  backendRestartReason,
  affectedPackages
})
const { createExecutionTask } = usePatchTaskTaskCreation({
  props,
  confirmedHosts,
  isRollbackTask,
  isPackageTask,
  isVulnerabilityTask,
  createdTaskId,
  taskDetailData,
  installConfig,
  backendRestartReason,
  resolveApiErrorMessage
})
const { startPipeline, stopPolling } = usePatchTaskPipeline({
  createdTaskId,
  stepStates,
  taskStatus,
  taskErrorMessage,
  taskDetailData,
  pipelineStatus,
  pipelineFinished,
  installConfig,
  isSkipped,
  isRollbackTask,
  executeStepTitle,
  restartConfirmSubmitText,
  resolveApiErrorMessage,
  loadRestartOptions,
  loadRollbackInfo,
  emitSuccess: () => emit('success'),
  pipelineSectionRef,
  getStepIndex
})
const { resetPipelineState, canReusePreparedTask, invalidatePreparedTask } =
  usePatchTaskPreparedState({
    stopPolling,
    createdTaskId,
    pipelineStatus,
    pipelineFinished,
    stepStates,
    taskStatus,
    taskErrorMessage,
    taskDetailData,
    resetRestartOptions
  })
const {
  handleScriptUpload,
  postScriptUploadRef,
  preScriptUploadRef,
  resetScriptState,
  scriptFiles,
  scriptModes,
  syncScriptConfig,
  triggerScriptUpload
} = usePatchTaskScripts({
  installConfig,
  createdTaskId,
  invalidatePreparedTask
})
const { loadRestartAdviceByHostPatch } = usePatchTaskBackendRestartAdvice({
  props,
  confirmedHosts,
  installConfig,
  restartOptions,
  restartAdviceSource,
  restartAdviceCacheKey,
  applyLocalRestartAdvice
})
const { goBack, handleAdvanceStep, handlePrimaryAction, handleSkipStep, resetInstallState, executeStep } =
  usePatchTaskFlow({
    createdTaskId,
    executionSubmitting,
    pipelineStatus,
    installStep,
    getStepIndex,
    confirmedHosts,
    canReusePreparedTask,
    resetPipelineState,
    resetRestartOptions,
    createExecutionTask,
    syncScriptConfig,
    loadRestartOptions,
    loadRollbackInfo,
    requiresRestartConfirm,
    isSkipped,
    restartConfirmText,
    restartConfirmKeyword,
    currentStepKey,
    stepTransitionLoading,
    selectedHosts,
    stepStates,
    resetSkippedSteps,
    taskDetailData,
    taskErrorMessage,
    taskStatus,
    pipelineFinished,
    finalStepIndex,
    loadRestartAdviceByHostPatch,
    currentStepSkippable,
    isVisible,
    startPipeline,
    resolveApiErrorMessage,
    stopPolling,
    backendRestartReason,
    installConfig,
    resetScriptState,
    hasFixedHosts,
    resetHostAllSelected
  })

const pipelineItems = computed(() => {
  return [
    { key: 'pre', label: '预检查', idx: stepIndexes.value.pre, runKey: 'preCheckRunId' },
    {
      key: 'execute',
      label: executeStepTitle.value,
      idx: stepIndexes.value.execute,
      runKey: 'executeRunId'
    },
    { key: 'restart', label: '重启策略', idx: stepIndexes.value.restart, runKey: 'restartRunId' },
    { key: 'validate', label: '脚本校验', idx: stepIndexes.value.validate, runKey: 'validateRunId' }
  ]
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
  isSkipped.pre = false
  isSkipped.validate = false
  isSkipped.restart = false
}

const parsedPreCheckResult = computed(() => {
  if (!taskDetailData.value?.preCheckResult) return null
  try {
    return typeof taskDetailData.value.preCheckResult === 'string'
      ? JSON.parse(taskDetailData.value.preCheckResult)
      : taskDetailData.value.preCheckResult
  } catch (e) {
    console.error('Failed to parse preCheckResult:', e)
    return null
  }
})

const activeCollapseNames = ref([])

watch(parsedPreCheckResult, (newVal) => {
  if (newVal?.results) {
    activeCollapseNames.value = newVal.results
      .filter(r => r.blockers > 0 || r.warnings > 0)
      .map(r => r.host_id)
  } else {
    activeCollapseNames.value = []
  }
}, { immediate: true })

function isHostUnreachable(hostResult) {
  return Array.isArray(hostResult.checks) && hostResult.checks.some(c => c.id === 'conn' && c.status === 'fail')
}

const checkTitles = {
  conn: '连通性',
  sudo: '提权权限',
  os: '操作系统识别',
  pkg_manager: '包管理器',
  pkg_lock: '包管理器占用',
  pkg_db: '包数据库健康',
  disk: '磁盘空间',
  disk_boot: '/boot 空间',
  kernel_pending: '待重启内核',
  repo: '软件仓库',
  pkg_exists: '目标包存在性',
  version_ok: '目标版本可用性',
  depsolve: '依赖解析',
  already_satisfied: '已是目标版本',
  exec: '检查执行异常'
}

function getCheckTitle(id) {
  return checkTitles[id] || id
}

function getHostDisplayName(hostId) {
  const host = confirmedHosts.value.find(
    h => (h.hostId || h.id || h.hostKey) === hostId
  )
  return host ? formatHostDisplay(host) : hostId
}

function sortChecks(checks) {
  if (!Array.isArray(checks)) return []
  const severityMap = { fail: 0, warn: 1, ok: 2 }
  return [...checks].sort((a, b) => {
    const aVal = severityMap[a.status] ?? 3
    const bVal = severityMap[b.status] ?? 3
    return aVal - bVal
  })
}

function handleRetryPreCheck() {
  isSkipped.pre = false
  executeStep()
}

function handleSkipPreCheck() {
  ElMessageBox.confirm(
    '前置环境检查未通过，跳过检查强行安装可能导致安装失败。是否确认跳过检查并继续？',
    '提示',
    {
      confirmButtonText: '确认跳过',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    isSkipped.pre = true
    executeStep()
  }).catch(() => {})
}
</script>

<style scoped lang="scss">
@use './PatchTaskWizard.scss' as *;
</style>
