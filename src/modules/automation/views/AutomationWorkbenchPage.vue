<template>
  <div class="automation-workbench ops-page-layout">

    <!-- ── 头部：标题 + 统计卡片 ── -->
    <section class="wb-header">
      <div class="wb-header__top">
        <div class="wb-header__summary">
          <h2 class="wb-header__title">自动化工作台</h2>
        </div>
        <div v-if="canViewScripts" class="wb-header__tools">
          <span class="wb-header__tools-label">脚本管理</span>
          <button type="button" class="wb-header-path" @click="scriptPathDialogVisible = true">
            <i class="fas fa-folder-open" />
            <span class="wb-header-path__label">目标路径</span>
            <span class="wb-header-path__value">{{ scriptDirLabel }}</span>
          </button>
          <button type="button" class="wb-header-action" @click="handleLauncherAction('create-script-file')">
            <i class="fas fa-scroll" />
            <span>新建脚本</span>
          </button>
          <button type="button" class="wb-header-action" @click="handleLauncherAction('upload-file')">
            <i class="fas fa-upload" />
            <span>上传文件</span>
          </button>
        </div>
        <el-button circle size="small" :loading="loading" title="刷新数据" @click="refreshAll">
          <el-icon v-show="!loading"><Refresh /></el-icon>
        </el-button>
      </div>

      <div class="wb-stats">
        <button
          class="wb-stat"
          :class="[
            todayRunTotal ? 'wb-stat--accent' : 'wb-stat--muted',
            hasActiveRuns ? 'wb-stat--running' : ''
          ]"
          @click="openTodayRunsDrawer"
        >
          <div class="wb-stat__top">
            <div class="wb-stat__content">
              <span class="wb-stat__label">今日运行</span>
              <WbFlipNumber class="wb-stat__value" :value="todayRunTotal" />
            </div>
            <span class="wb-stat__icon">
              <i class="fas fa-play-circle" />
            </span>
          </div>
          <div class="wb-stat__meta">
            <span class="wb-stat__sub">成功 {{ successfulRunTotal }}</span>
            <span class="wb-stat__hint">{{ hasActiveRuns ? `执行中 ${activeRunCount}` : '查看记录' }}</span>
          </div>
        </button>

        <button
          class="wb-stat"
          :class="failedRunTotal ? 'wb-stat--danger' : 'wb-stat--ok'"
          @click="openFailedRunsDrawer"
        >
          <div class="wb-stat__top">
            <div class="wb-stat__content">
              <span class="wb-stat__label">今日失败</span>
              <WbFlipNumber class="wb-stat__value" :value="failedRunTotal" />
            </div>
            <span class="wb-stat__icon">
              <i class="fas fa-exclamation-triangle" />
            </span>
          </div>
          <div class="wb-stat__meta">
            <span class="wb-stat__sub" :class="failedRunTotal ? 'is-danger' : ''">{{ failedRateLabel }}</span>
            <span class="wb-stat__hint">快速排查</span>
          </div>
        </button>

        <button
          v-if="canViewJobs"
          class="wb-stat"
          :class="reviewStore.approvalCount ? 'wb-stat--warning' : 'wb-stat--muted'"
          @click="openApprovalsDrawer"
        >
          <div class="wb-stat__top">
            <div class="wb-stat__content">
              <span class="wb-stat__label">运维工具审批</span>
              <WbFlipNumber class="wb-stat__value" :value="reviewStore.approvalCount" />
            </div>
            <span class="wb-stat__icon">
              <i class="fas fa-stamp" />
            </span>
          </div>
          <div class="wb-stat__meta">
            <span class="wb-stat__sub">待处理审批项</span>
            <span class="wb-stat__hint">打开抽屉</span>
          </div>
        </button>

        <button
          v-if="canViewCommands"
          class="wb-stat"
          :class="reviewStore.commandCount ? 'wb-stat--warning' : 'wb-stat--muted'"
          @click="openCmdReviewDrawer"
        >
          <div class="wb-stat__top">
            <div class="wb-stat__content">
              <span class="wb-stat__label">命令待审</span>
              <WbFlipNumber class="wb-stat__value" :value="reviewStore.commandCount" />
            </div>
            <span class="wb-stat__icon">
              <i class="fas fa-terminal" />
            </span>
          </div>
          <div class="wb-stat__meta">
            <span class="wb-stat__sub">待审核命令队列</span>
            <span class="wb-stat__hint">直接审核</span>
          </div>
        </button>

        <button
          v-if="canViewScripts"
          class="wb-stat"
          :class="reviewStore.scriptCount ? 'wb-stat--warning' : 'wb-stat--muted'"
          @click="openScriptReviewDrawer"
        >
          <div class="wb-stat__top">
            <div class="wb-stat__content">
              <span class="wb-stat__label">脚本待审</span>
              <WbFlipNumber class="wb-stat__value" :value="reviewStore.scriptCount" />
            </div>
            <span class="wb-stat__icon">
              <i class="fas fa-file-code" />
            </span>
          </div>
          <div class="wb-stat__meta">
            <span class="wb-stat__sub">待审核脚本变更</span>
            <span class="wb-stat__hint">查看清单</span>
          </div>
        </button>

        <button
          v-if="canViewJobs"
          class="wb-stat wb-stat--muted"
          @click="openCronDrawer"
        >
          <div class="wb-stat__top">
            <div class="wb-stat__content">
              <span class="wb-stat__label">定时任务</span>
              <WbFlipNumber class="wb-stat__value" :value="cronSummary.total" />
            </div>
            <span class="wb-stat__icon">
              <i class="fas fa-clock" />
            </span>
          </div>
          <div class="wb-stat__meta">
            <span class="wb-stat__sub">{{ cronStatusLabel }}</span>
            <span class="wb-stat__hint">调度总览</span>
          </div>
        </button>
      </div>
    </section>

    <!-- ── 主体工作台 ── -->
    <div class="wb-dashboard">

        <!-- 运维工具分布 -->
        <section v-if="canViewJobs" class="wb-panel wb-panel--jobs">
          <div class="wb-panel__header wb-panel__header--jobs">
            <div class="wb-panel__title-group wb-panel__title-group--jobs">
              <h3 class="wb-panel__title">运维工具分布</h3>
              <div class="wb-job-panel-stats">
                <span class="wb-job-panel-stat wb-job-panel-stat--total">
                  <span class="wb-job-panel-stat__label">全部</span>
                  <strong class="wb-job-panel-stat__value">{{ totalJobCount }}</strong>
                </span>
                <span
                  v-for="item in jobTypeCounts"
                  :key="item.key"
                  class="wb-job-panel-stat"
                  :class="`wb-job-panel-stat--${item.type}`"
                >
                  <span class="wb-job-panel-stat__label">{{ item.label }}</span>
                  <strong class="wb-job-panel-stat__value">{{ item.value }}</strong>
                </span>
              </div>
            </div>
            <div class="wb-panel__header-actions">
              <el-button class="wb-inline-action" link type="primary" size="small" @click="handleJobTypeCreate('rest')">+ REST</el-button>
              <el-button class="wb-inline-action" link type="primary" size="small" @click="handleJobTypeCreate('script')">+ 脚本</el-button>
              <el-button class="wb-inline-action" link type="primary" size="small" @click="handleJobTypeCreate('command')">+ 命令</el-button>
              <el-button class="wb-inline-action" link type="primary" size="small" @click="openJobListDrawer('', '全部运维工具')">查看全部</el-button>
            </div>
          </div>
          <transition-group v-if="workbenchJobs.length" name="wb-stack-slide" tag="div" class="wb-workbench-job-grid">
            <article
              v-for="job in workbenchJobs"
              :key="job.id"
              class="wb-workbench-job-card"
              :class="`wb-workbench-job-card--${job.type || 'rest'}`"
              @click="handleEditJobFromDrawer(job)"
            >
              <div class="wb-workbench-job-card__body">
                <div class="wb-workbench-job-card__head">
                  <el-tag size="small" effect="dark" :type="job.displayTypeTag">
                    {{ job.displayTypeLabel }}
                  </el-tag>
                  <span class="wb-workbench-job-card__time">{{ job.displayTime }}</span>
                </div>
                <strong class="wb-workbench-job-card__name">{{ job.displayTitle }}</strong>
              </div>
              <div class="wb-workbench-job-card__actions">
                <button type="button" class="wb-workbench-job-card__action" @click.stop="handleExecuteJobFromDrawer(job)">
                  <i class="fa fa-play" />
                  <span>执行</span>
                </button>
                <button type="button" class="wb-workbench-job-card__action" @click.stop="handleEditJobFromDrawer(job)">
                  <i class="fa fa-cog" />
                  <span>编辑</span>
                </button>
                <button type="button" class="wb-workbench-job-card__action wb-workbench-job-card__action--danger" @click.stop="handleDeleteJob(job)">
                  <i class="fa fa-trash" />
                  <span>删除</span>
                </button>
                <el-dropdown trigger="hover" placement="bottom-end" @command="handleWorkbenchJobCommand(job, $event)">
                  <button type="button" class="wb-workbench-job-card__action wb-workbench-job-card__action--more" @click.stop>
                    <i class="fa fa-ellipsis-h" />
                  </button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="copy">
                        <i class="fa fa-copy wb-workbench-job-card__menu-icon" />
                        <span>复制</span>
                      </el-dropdown-item>
                      <el-dropdown-item command="history">
                        <i class="fa fa-history wb-workbench-job-card__menu-icon" />
                        <span>历史</span>
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </article>
          </transition-group>
          <el-empty v-else description="暂无运维工具" :image-size="60" />
        </section>

        <!-- 定时调度 -->
        <section v-if="canViewJobs" class="wb-panel wb-panel--cron">
          <div class="wb-panel__header">
            <h3 class="wb-panel__title">定时调度</h3>
            <div class="wb-panel__header-actions">
              <el-button class="wb-inline-action" link type="primary" size="small" @click="handleLauncherAction('create-cron-job')">+ 新增</el-button>
              <el-button class="wb-inline-action" link type="primary" size="small" @click="openCronDrawer">全部任务</el-button>
            </div>
          </div>

          <transition-group v-if="highlightedCronJobs.length" name="wb-stack-slide" tag="div" class="wb-cron-list">
            <div
              v-for="item in highlightedCronJobs"
              :key="item.id"
              class="wb-cron-item"
              :class="{ 'wb-cron-item--enabled': item.triggerStatus === '1' }"
              @click="handleEditCronFromDrawer(item)"
            >
              <div class="wb-cron-item__info">
                <strong class="wb-cron-item__name" :title="item.jobDesc">
                  {{ item.jobDesc || `任务 ${item.id}` }}
                </strong>
                <span class="wb-cron-item__cron">{{ item.scheduleConf || '-' }}</span>
              </div>
              <div class="wb-cron-item__actions">
                <el-button
                  class="wb-inline-action"
                  text
                  type="primary"
                  size="small"
                  :loading="cronActionLoading[item.id + '_exec']"
                  @click.stop="handleExecuteCron(item)"
                >
                  执行
                </el-button>
                <el-button
                  class="wb-inline-action"
                  text
                  size="small"
                  :type="item.triggerStatus === '1' ? 'danger' : 'success'"
                  :loading="cronActionLoading[item.id + '_toggle']"
                  @click.stop="handleToggleCron(item)"
                >
                  {{ item.triggerStatus === '1' ? '停用' : '启用' }}
                </el-button>
                <el-button
                  class="wb-inline-action"
                  text
                  size="small"
                  @click.stop="handleCopyCronFromDrawer(item)"
                >
                  复制
                </el-button>
                <el-button
                  class="wb-inline-action"
                  text
                  type="danger"
                  size="small"
                  @click.stop="handleDeleteCronFromDrawer(item)"
                >
                  删除
                </el-button>
              </div>
            </div>
          </transition-group>
          <el-empty v-else description="暂无定时任务" :image-size="60" />

          <div v-if="cronSummary.total" class="wb-cron-footer">
            <span class="wb-cron-footer__total">共 {{ cronSummary.total }} 个</span>
            <el-tag size="small" type="success" effect="plain">启用 {{ cronSummary.enabled }}</el-tag>
            <el-tag size="small" type="info" effect="plain" style="margin-left:4px">停用 {{ cronSummary.disabled }}</el-tag>
          </div>
        </section>

        <!-- 流程编排 -->
        <section v-if="canViewJobs && showFlowWorkbenchPanel" class="wb-panel wb-panel--flows">
          <div class="wb-panel__header">
            <h3 class="wb-panel__title">流程编排</h3>
            <div class="wb-panel__header-actions">
              <el-button class="wb-inline-action" link type="primary" size="small" @click="handleLauncherAction('create-flow')">+ 新建</el-button>
              <el-button class="wb-inline-action" link type="primary" size="small" @click="openFlowListDrawer">查看全部</el-button>
            </div>
          </div>
          <div v-if="flows.length" class="wb-flow-list">
            <div
              v-for="item in flows.slice(0, 5)"
              :key="item.id"
              class="wb-flow-item"
              @click="openFlowForEdit(item)"
            >
              <div class="wb-flow-item__info">
                <strong class="wb-flow-item__name" :title="item.name">{{ item.name }}</strong>
              </div>
              <div class="wb-flow-item__actions">
                <el-button class="wb-inline-action" text type="primary" size="small" @click.stop="openFlowForRun(item)">执行</el-button>
                <el-button class="wb-inline-action" text type="primary" size="small" @click.stop="openFlowInstancesDrawer(item)">实例</el-button>
                <el-button class="wb-inline-action" text type="primary" size="small" @click.stop="openFlowForEdit(item)">编辑</el-button>
                <el-button class="wb-inline-action" text type="danger" size="small" @click.stop="handleDeleteFlow(item)">删除</el-button>
              </div>
            </div>
          </div>
          <el-empty v-else description="暂无流程" :image-size="60" />
          <div v-if="flows.length" class="wb-cron-footer">
            <span class="wb-cron-footer__total">共 {{ flows.length }} 个流程</span>
          </div>
        </section>

        <!-- 命令执行 -->
        <section v-if="canViewCommands && showCommandWorkbenchPanel" class="wb-panel wb-panel--commands">
          <div class="wb-panel__header">
            <h3 class="wb-panel__title">命令执行</h3>
            <div class="wb-panel__header-actions">
              <el-button class="wb-inline-action" link type="primary" size="small" @click="openCommandEditor('create')">+ 命令</el-button>
              <el-button class="wb-inline-action" link type="primary" size="small" @click="handleLauncherAction('create-command-job')">+ 运维工具</el-button>
              <el-button class="wb-inline-action" link type="primary" size="small" @click="openCommandListDrawer('', '全部命令')">查看全部</el-button>
            </div>
          </div>
          <div v-if="commandTypeCounts.length || commandJobCount" class="wb-command-panel">
            <div v-if="commandTypeCounts.length" class="wb-panel-subtitle">命令统计</div>
            <div v-if="commandTypeCounts.length" class="wb-job-types wb-command-type-list">
              <div
                v-for="item in commandTypeCounts"
                :key="item.key"
                class="wb-job-type-item"
                :class="`wb-job-type-item--${item.type}`"
                @click="openCommandListDrawer(item.type, `${item.label}命令`)"
              >
                <div class="wb-job-type-item__left">
                  <span class="wb-job-type-item__dot" />
                  <span class="wb-job-type-item__label">{{ item.label }}</span>
                </div>
                <span class="wb-job-type-item__value">{{ item.value }}</span>
              </div>
            </div>

            <div class="wb-command-job-head">
              <span class="wb-panel-subtitle">命令运维工具</span>
              <span class="wb-command-job-head__meta">共 {{ commandJobCount }} 个</span>
            </div>

            <div v-if="commandJobList.length" class="wb-command-job-list">
              <div
                v-for="item in commandJobList.slice(0, 5)"
                :key="item.id"
                class="wb-command-job-item"
                @click="handleEditJobFromDrawer(item)"
              >
                <div class="wb-command-job-item__info">
                  <strong class="wb-command-job-item__name">{{ translateText(item.title) || item.title || item.id }}</strong>
                </div>
                <div class="wb-command-job-item__actions">
                  <el-button class="wb-inline-action" text type="primary" size="small" @click.stop="handleExecuteJobFromDrawer(item)">执行</el-button>
                  <el-button class="wb-inline-action" text type="primary" size="small" @click.stop="handleEditJobFromDrawer(item)">编辑</el-button>
                  <el-button class="wb-inline-action" text size="small" @click.stop="handleOpenJobHistory(item)">历史</el-button>
                  <el-button class="wb-inline-action" text type="danger" size="small" @click.stop="handleDeleteJob(item)">删除</el-button>
                </div>
              </div>
            </div>
            <el-empty v-else description="暂无命令运维工具" :image-size="56" />

            <div v-if="commandJobList.length" class="wb-command-job-footer">
              <span class="wb-command-job-footer__meta">最近更新的命令运维工具会优先显示在这里</span>
              <el-button class="wb-inline-action" link type="primary" size="small" @click="openCommandJobDrawer">查看全部</el-button>
            </div>
          </div>
          <el-empty v-else description="暂无命令与命令运维工具" :image-size="60" />
        </section>

        <!-- 运行分布 -->
        <section v-if="canViewJobs" class="wb-panel wb-panel--runs">
          <div class="wb-panel__header">
            <div class="wb-panel__title-group">
              <h3 class="wb-panel__title">运行分布</h3>
              <el-tag size="small" type="info" effect="plain" style="margin-left:6px">今日</el-tag>
            </div>
            <el-button class="wb-inline-action" link type="primary" size="small" @click="openTodayRunsDrawer">查看全部</el-button>
          </div>
          <transition-group v-if="todayRunRecords.length" name="wb-stack-slide" tag="div" class="wb-run-list">
            <button
              v-for="item in workbenchRunRecords"
              :key="item.id"
              type="button"
              class="wb-run-log-item"
              @click="handleOpenRunResult(item)"
            >
              <div class="wb-run-log-item__main">
                <strong class="wb-run-log-item__name">{{ item.displayTitle }}</strong>
                <span class="wb-run-log-item__type" :class="`wb-run-log-item__type--${item.displayTypeClass}`">{{ item.displayTypeLabel }}</span>
                <span class="wb-run-log-item__time">{{ item.displayTime }}</span>
              </div>
              <div class="wb-run-log-item__side">
                <el-tag size="small" effect="plain" :type="item.displayStatusType">
                  {{ item.displayStatusLabel }}
                </el-tag>
                <i class="fas fa-chevron-right wb-run-log-item__arrow" />
              </div>
            </button>
          </transition-group>
          <el-empty v-else description="今日暂无运行记录" :image-size="60" />
          <div class="wb-run-entries__footer">
            今日共运行 <strong>{{ todayRunTotal }}</strong> 次，失败 <strong :class="failedRunTotal ? 'text-danger' : ''">{{ failedRunTotal }}</strong> 次
          </div>
        </section>
    </div>

    <!-- ── 弹窗 ── -->
    <CreateJobDialog
      v-if="jobDialogVisible"
      v-model="jobDialogVisible"
      :job-type="jobDialogType"
      :job-id="jobEditId"
      :applets-list="appletsList"
      :applet-code="''"
      @success="handleJobDialogSuccess"
    />

    <ExecuteJobDialog
      v-if="executeDialogVisible"
      v-model:visible="executeDialogVisible"
      :job-id="executeJobMeta.id"
      :job-type="executeJobMeta.type"
      :fallback-config-json="executeJobMeta.configJson"
      @success="handleExecuteJobSuccess"
    />

    <ExecuteHistoryDialog
      v-if="historyDialogVisible"
      v-model:visible="historyDialogVisible"
      :job-id="historyJobMeta.id"
      :job-title="historyJobMeta.title"
    />

    <CommandEditDialog
      v-if="commandDialogVisible"
      v-model:visible="commandDialogVisible"
      :mode="commandDialogMode"
      :command="activeCommand"
      @success="handleCommandEditSuccess"
    />

    <RunCommandDialog
      v-if="runCommandDialogVisible"
      v-model:visible="runCommandDialogVisible"
      :command="activeCommand"
      :mode="runCommandMode"
      @success="handleCommandRunSuccess"
    />

    <CronJobFormDialog
      v-if="cronDialogVisible"
      v-model="cronDialogVisible"
      :editing-id="cronEditId"
      :applets-list="appletsList"
      @success="handleCronDialogSuccess"
    />

    <FlowEditor
      v-if="flowEditorVisible"
      v-model="flowEditorVisible"
      :mode="flowEditorMode"
      :flow-id="flowEditorId"
      @saved="handleFlowSaved"
    />

    <AddScriptDialog
      v-if="scriptDialogVisible"
      v-model="scriptDialogVisible"
      repo-type="git"
      :repo="scriptRepo"
      :dir="scriptDir"
      @success="handleScriptDialogSuccess"
    />

    <UploadFileDialog
      v-if="uploadDialogVisible"
      v-model="uploadDialogVisible"
      repo-type="git"
      :repo="scriptRepo"
      :dir="scriptDir"
      @success="handleUploadDialogSuccess"
    />

    <GfsDirectoryPickerDialog
      v-if="scriptPathDialogVisible"
      v-model="scriptPathDialogVisible"
      repo-type="git"
      :repo="scriptRepo"
      :init-dir="scriptDir"
      @confirm="handleScriptPathSelected"
    />

    <ExecuteResultDialog
      v-if="resultDialogVisible"
      v-model:visible="resultDialogVisible"
      :run-id="resultMeta.runId"
      :job-title="resultMeta.jobTitle"
      @settled="handleExecuteResultSettled"
    />

    <!-- ── 抽屉面板 ── -->
    <WbRunLogsDrawer
      v-model:visible="todayRunsDrawer.visible"
      :title="todayRunsDrawer.title"
      :records="todayRunsDrawer.records"
      :loading="todayRunsDrawer.loading"
      :total="todayRunsDrawer.total"
      link="/run-records/logs?day=0"
      link-label="查看完整记录"
      empty-text="今日暂无运行记录"
      @open-result="handleOpenRunResult"
      @navigate="handleNavigate"
    />

    <WbRunLogsDrawer
      v-model:visible="failedRunsDrawer.visible"
      title="今日失败运行"
      :records="failedRunsDrawer.records"
      :loading="failedRunsDrawer.loading"
      :total="failedRunsDrawer.total"
      link="/run-records/logs?day=0&status=FAILED"
      link-label="查看完整记录"
      empty-text="今日暂无失败运行"
      failed-only
      @open-result="handleOpenRunResult"
      @navigate="handleNavigate"
    />

    <WbReviewDrawer
      v-model:visible="approvalsDrawer.visible"
      title="待审批列表"
      :records="approvalsDrawer.records"
      :loading="approvalsDrawer.loading"
      drawer-type="approval"
      link="/jao/approvals"
      link-label="前往审批页面"
      empty-text="暂无待审批记录"
      @navigate="handleNavigate"
      @approve="handleApproveItem"
      @reject="handleRejectItem"
    />

    <WbReviewDrawer
      v-model:visible="cmdReviewDrawer.visible"
      title="待审核命令"
      :records="cmdReviewDrawer.records"
      :loading="cmdReviewDrawer.loading"
      link="/cmd/review"
      link-label="前往审核页面"
      empty-text="暂无待审核命令"
      drawer-type="command"
      @navigate="handleNavigate"
      @approve="handleCmdApproveItem"
      @reject="handleCmdRejectItem"
    />

    <WbReviewDrawer
      v-model:visible="scriptReviewDrawer.visible"
      title="待审核脚本"
      :records="scriptReviewDrawer.records"
      :loading="scriptReviewDrawer.loading"
      link="/gfs/scriptReview"
      link-label="前往审核页面"
      empty-text="暂无待审核脚本"
      @navigate="handleNavigate"
    />

    <WbCronDrawer
      v-model:visible="cronDrawer.visible"
      :jobs="cronJobs"
      :summary="cronSummary"
      :action-loading="cronActionLoading"
      @execute="handleExecuteCron"
      @toggle="handleToggleCron"
      @edit="handleEditCronFromDrawer"
      @copy="handleCopyCronFromDrawer"
      @delete="handleDeleteCronFromDrawer"
      @navigate="handleNavigate('/jao/taskScheduler')"
    />

    <WbJobListDrawer
      v-model:visible="jobListDrawer.visible"
      :title="jobListDrawer.title"
      :filter-type="jobListDrawer.filterType"
      :reload-version="jobListReloadVersion"
      @navigate="handleNavigate"
      @execute="handleExecuteJobFromDrawer"
      @edit="handleEditJobFromDrawer"
      @copy="handleCopyJob"
      @history="handleOpenJobHistory"
      @delete="handleDeleteJob"
    />

    <WbCommandListDrawer
      v-model:visible="commandListDrawer.visible"
      :title="commandListDrawer.title"
      :commands="commandList"
      :filter-type="commandListDrawer.filterType"
      @view="openCommandEditor('view', $event)"
      @edit="openCommandEditor('edit', $event)"
      @run="openRunCommandDialog($event, 'run')"
      @create-job="openRunCommandDialog($event, 'createJob')"
      @toggle-status="handleToggleCommand"
      @delete="handleDeleteCommand"
      @navigate="handleNavigate"
    />

    <WbFlowListDrawer
      v-model:visible="flowListDrawer.visible"
      :flows="flows"
      @run="openFlowForRun"
      @edit="openFlowForEdit"
      @delete="handleDeleteFlow"
      @instances="openFlowInstancesDrawer"
      @navigate="handleNavigate"
    />

    <WbFlowInstancesDrawer
      v-model:visible="flowInstancesDrawer.visible"
      :title="flowInstancesDrawer.title"
      :instances="flowInstancesDrawer.records"
      :loading="flowInstancesDrawer.loading"
      @view="openFlowInstanceDetail"
      @navigate="handleNavigate"
    />

    <FlowInstanceViewer v-model="flowInstanceViewerVisible" :instance-id="viewingFlowInstanceId" />

  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { authService } from '@/core/auth'
import { canAccessMenuCode } from '@/core/auth/permission-policy'
import { translateText } from '@/utils/i18n'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import { useAppletTranslation } from '@/modules/automation/components/job/composables/useAppletTranslation.js'
import { useAutomationWorkbench } from '@/modules/automation/composables/useAutomationWorkbench.js'
import { fetchFlowInstances as fetchFlowInstancesApi, passApprove, refuseApprove, copyCronJob, deleteCronJob, deleteFlow as deleteFlowApi } from '@/modules/automation/api/jao'
import { approveCommand, COMMAND_STATUS, saveCommand, deleteCommand as deleteCommandApi } from '@/modules/automation/api/command'
import { copyJob as copyJobApi, deleteJob as deleteJobApi } from '@/modules/automation/api/jobApi'
import { getRunLogStatusLabel as runStatusLabel, getRunLogStatusType as runStatusType } from '@/modules/automation/constants/runLogStatus'
import WbRunLogsDrawer from '@/modules/automation/components/workbench/WbRunLogsDrawer.vue'
import WbReviewDrawer from '@/modules/automation/components/workbench/WbReviewDrawer.vue'
import WbCronDrawer from '@/modules/automation/components/workbench/WbCronDrawer.vue'
import WbFlipNumber from '@/modules/automation/components/workbench/WbFlipNumber.vue'
import WbJobListDrawer from '@/modules/automation/components/workbench/WbJobListDrawer.vue'
import WbCommandListDrawer from '@/modules/automation/components/workbench/WbCommandListDrawer.vue'
import WbFlowListDrawer from '@/modules/automation/components/workbench/WbFlowListDrawer.vue'
import WbFlowInstancesDrawer from '@/modules/automation/components/workbench/WbFlowInstancesDrawer.vue'

const CreateJobDialog = defineAsyncComponent(() =>
  import('@/modules/automation/components/job/JobListView/CreateJobDialog.vue')
)
const ExecuteJobDialog = defineAsyncComponent(() =>
  import('@/modules/automation/components/job/JobListView/ExecuteJobDialog.vue')
)
const ExecuteHistoryDialog = defineAsyncComponent(() =>
  import('@/modules/automation/components/job/JobListView/ExecuteHistoryDialog.vue')
)
const CommandEditDialog = defineAsyncComponent(() =>
  import('@/modules/automation/components/command/dialogs/CommandEditDialog.vue')
)
const RunCommandDialog = defineAsyncComponent(() =>
  import('@/modules/automation/components/command/dialogs/RunCommandDialog.vue')
)
const CronJobFormDialog = defineAsyncComponent(() =>
  import('@/modules/automation/components/job/components/CronJobFormDialog.vue')
)
const FlowEditor = defineAsyncComponent(() =>
  import('@/modules/automation/components/job/schedule/components/FlowEditor.vue')
)
const FlowInstanceViewer = defineAsyncComponent(() =>
  import('@/modules/automation/components/job/schedule/components/FlowInstanceViewer.vue')
)
const AddScriptDialog = defineAsyncComponent(() =>
  import('@/modules/automation/components/script/dialogs/AddScriptDialog.vue')
)
const UploadFileDialog = defineAsyncComponent(() =>
  import('@/modules/automation/components/script/dialogs/UploadFileDialog.vue')
)
const GfsDirectoryPickerDialog = defineAsyncComponent(() =>
  import('@/modules/automation/components/script/dialogs/GfsDirectoryPickerDialog.vue')
)

const router = useRouter()

const checkPermission = permission => authService.hasPermission(permission)
const canViewJobs = canAccessMenuCode(checkPermission, 'jao')
const canViewCommands = canAccessMenuCode(checkPermission, 'cmd')
const canViewScripts = canAccessMenuCode(checkPermission, 'gfs')
const showFlowWorkbenchPanel = false
const showCommandWorkbenchPanel = false

const {
  loading,
  reviewStore,
  todayRunTotal,
  failedRunTotal,
  activeRunCount,
  todayRunRecords,
  hasActiveRuns,
  jobList,
  jobTypeCounts,
  commandJobList,
  commandTypeCounts,
  commandList,
  flows,
  cronSummary,
  cronJobs,
  highlightedCronJobs,
  refreshRunLogData,
  toggleCronJob,
  executeCronJobNow,
  fetchFailedRuns,
  fetchTodayRuns,
  fetchRunsByType,
  fetchApproveItems,
  fetchCommandReviewItems,
  fetchScriptReviewItems,
  refreshAll
} = useAutomationWorkbench({ canViewJobs, canViewCommands })

const successfulRunTotal = computed(() => Math.max(Number(todayRunTotal.value || 0) - Number(failedRunTotal.value || 0), 0))

const failedRateLabel = computed(() => {
  const total = Number(todayRunTotal.value || 0)
  const failed = Number(failedRunTotal.value || 0)
  if (!total) return '失败率 0%'
  return `失败率 ${Math.round((failed / total) * 100)}%`
})

const WORKBENCH_JOB_TYPE_LABELS = {
  rest: 'REST',
  script: '脚本',
  command: '命令'
}

const WORKBENCH_JOB_TYPE_TAGS = {
  rest: 'primary',
  script: 'success',
  command: 'warning'
}

const WORKBENCH_RUN_LIMIT = 8
const RUN_FEEDBACK_RETRY_DELAYS = [1200, 3200, 6500]
const viewportWidth = ref(1920)

const totalJobCount = computed(() => jobList.value.length)

const workbenchJobColumnCount = computed(() => {
  const width = viewportWidth.value
  if (width <= 720) return 1
  if (width <= 960) return 2
  if (width <= 1480) return 3
  if (width <= 1680) return 4
  return 5
})

const workbenchJobLimit = computed(() => workbenchJobColumnCount.value * 2)

const workbenchJobs = computed(() => pickRecentWorkbenchJobs(jobList.value, workbenchJobLimit.value).map(job => ({
  ...job,
  displayTitle: translateText(job?.title) || job?.title || job?.id || '-',
  displayTime: formatDateTime(job?.updatedAt || job?.createdAt),
  displayTypeLabel: workbenchJobTypeLabel(job?.type),
  displayTypeTag: workbenchJobTypeTag(job?.type)
})))

const workbenchRunRecords = computed(() => todayRunRecords.value.slice(0, WORKBENCH_RUN_LIMIT).map(item => ({
  ...item,
  displayTitle: translateText(item?.job_title) || '-',
  displayTypeClass: String(item?.job_type || item?.type || 'rest').toLowerCase(),
  displayTypeLabel: runTypeLabel(item?.job_type || item?.type),
  displayTime: formatDateTime(item?.start_time),
  displayStatusLabel: runStatusLabel(item?.status),
  displayStatusType: runStatusType(item?.status)
})))

const cronStatusLabel = computed(() => `启用 ${cronSummary.value.enabled} / 停用 ${cronSummary.value.disabled}`)
const commandJobCount = computed(() => commandJobList.value.length)
const scriptDirLabel = computed(() => (scriptDir.value ? `~/${scriptDir.value}` : '~'))

const { appletsList } = useAppletTranslation()

// 弹窗状态
const resultDialogVisible = ref(false)
const resultMeta = ref({ runId: '', jobTitle: '' })
const jobDialogVisible = ref(false)
const jobDialogType = ref('')
const jobEditId = ref('')
const cronDialogVisible = ref(false)
const cronEditId = ref('')
const executeDialogVisible = ref(false)
const executeJobMeta = reactive({ id: '', type: '', configJson: '', title: '' })
const historyDialogVisible = ref(false)
const historyJobMeta = ref({ id: '', title: '' })
const commandDialogVisible = ref(false)
const commandDialogMode = ref('create')
const runCommandDialogVisible = ref(false)
const runCommandMode = ref('run')
const activeCommand = ref(null)
const flowEditorVisible = ref(false)
const flowEditorMode = ref('create')
const flowEditorId = ref('')
const flowInstanceViewerVisible = ref(false)
const viewingFlowInstanceId = ref('')
const scriptDialogVisible = ref(false)
const scriptPathDialogVisible = ref(false)
const uploadDialogVisible = ref(false)

const scriptRepo = '$tnt'
const scriptDir = ref('')

// cron 行内操作 loading 状态：key 为 `${id}_exec` / `${id}_toggle`
const cronActionLoading = reactive({})

// 抽屉状态
const todayRunsDrawer = reactive({ visible: false, loading: false, records: [], total: 0, title: '今日运行记录', filterType: '' })
const failedRunsDrawer = reactive({ visible: false, loading: false, records: [], total: 0 })
const cronDrawer = reactive({ visible: false })
const jobListDrawer = reactive({ visible: false, filterType: '', title: '全部运维工具' })
const jobListReloadVersion = ref(0)
const commandListDrawer = reactive({ visible: false, filterType: '', title: '全部命令' })
const flowListDrawer = reactive({ visible: false })
const flowInstancesDrawer = reactive({ visible: false, loading: false, title: '流程实例', records: [] })
const approvalsDrawer = reactive({ visible: false, loading: false, records: [] })
const cmdReviewDrawer = reactive({ visible: false, loading: false, records: [] })
const scriptReviewDrawer = reactive({ visible: false, loading: false, records: [] })
let runFeedbackRefreshTimer = 0
const runFeedbackRefreshTimers = []

// ── 操作处理 ──
function handleLauncherAction(action) {
  if (!action) return

  const actionMap = {
    'create-rest-job': () => openJobDialog('rest'),
    'create-script-job': () => openJobDialog('script'),
    'create-command-job': () => openJobDialog('command'),
    'create-cron-job': () => { cronEditId.value = ''; cronDialogVisible.value = true },
    'create-flow': () => {
      flowEditorMode.value = 'create'
      flowEditorId.value = ''
      flowEditorVisible.value = true
    },
    'create-script-file': () => { scriptDialogVisible.value = true },
    'upload-file': () => { uploadDialogVisible.value = true }
  }

  actionMap[action]?.()
}

function openJobDialog(type) {
  jobDialogType.value = type
  jobEditId.value = ''
  jobDialogVisible.value = true
}

function bumpJobListReload() {
  jobListReloadVersion.value += 1
}

function handleJobDialogSuccess() {
  refreshAll()
  bumpJobListReload()
  if (jobEditId.value) {
    ElMessage.success('运维工具已保存。')
  } else {
    ElMessage.success('运维工具已创建，可前往运维工具箱查看或纳入调度。')
  }
}

function handleCronDialogSuccess() {
  refreshAll()
  if (cronEditId.value) {
    ElMessage.success('定时任务已保存。')
  } else {
    ElMessage.success('定时任务已创建，可在调度列表中管理启停。')
  }
}

function handleFlowSaved() {
  refreshAll()
  ElMessage.success('流程已保存。')
}

function handleScriptDialogSuccess() {
  ElMessage.success('脚本已创建，可转为脚本运维工具或进入脚本库查看。')
}

function handleUploadDialogSuccess() {
  ElMessage.success('文件已上传。')
}

function handleScriptPathSelected(dir = '') {
  scriptDir.value = dir || ''
}

function openCommandEditor(mode = 'create', command = null) {
  activeCommand.value = command ? { ...command } : null
  commandDialogMode.value = mode
  commandDialogVisible.value = true
}

function openRunCommandDialog(command, mode = 'run') {
  activeCommand.value = command
  runCommandMode.value = mode
  runCommandDialogVisible.value = true
}

async function handleCommandEditSuccess() {
  await refreshAll()
}

async function handleCommandRunSuccess(result) {
  if (runCommandMode.value === 'run') {
    const runId = extractRunId(result)
    if (runId) {
      resultMeta.value = {
        runId,
        jobTitle: Array.isArray(activeCommand.value)
          ? `批量命令 (${activeCommand.value.length})`
          : activeCommand.value?.name || '命令执行'
      }
      resultDialogVisible.value = true
    }

    await refreshWorkbenchRunFeedback()
    scheduleWorkbenchRunFeedback()
    return
  }

  await refreshAll()
  bumpJobListReload()
  openCommandJobDrawer()
}

async function handleToggleCommand(item) {
  if (!item?.id || !(item.status === 0 || item.status === 3)) return

  const nextStatus = item.status === 3 ? 0 : 3
  const actionLabel = nextStatus === 0 ? '启用' : '停用'

  try {
    await ElMessageBox.confirm(`确定要${actionLabel}命令「${item.name || item.id}」吗？`, `${actionLabel}命令`, {
      type: 'warning',
      confirmButtonText: actionLabel,
      cancelButtonText: '取消'
    })
    await saveCommand({ ...item, status: nextStatus })
    ElMessage.success(`${actionLabel}成功`)
    await refreshAll()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(`${actionLabel}失败`)
    }
  }
}

async function handleDeleteCommand(item) {
  if (!item?.id) return

  try {
    await ElMessageBox.confirm(`确定要删除命令「${item.name || item.id}」吗？`, '删除命令', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger'
    })
    await deleteCommandApi(item.id)
    ElMessage.success('删除成功')
    await refreshAll()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error('删除失败')
    }
  }
}

async function handleToggleCron(item) {
  const key = `${item.id}_toggle`
  if (cronActionLoading[key]) return
  cronActionLoading[key] = true
  try {
    await toggleCronJob(item)
  } finally {
    cronActionLoading[key] = false
  }
}

async function handleExecuteCron(item) {
  const key = `${item.id}_exec`
  if (cronActionLoading[key]) return
  cronActionLoading[key] = true
  try {
    const result = await executeCronJobNow(item)
    if (result === null) return

    await refreshWorkbenchRunFeedback()
    scheduleWorkbenchRunFeedback()

    const runId = extractRunId(result)
    if (runId) {
      resultMeta.value = {
        runId,
        jobTitle: item?.jobDesc || item?.id || '-'
      }
      resultDialogVisible.value = true
    }
  } finally {
    cronActionLoading[key] = false
  }
}

function handleNavigate(target) {
  if (!target) return
  router.push(target)
}

function openFlowForEdit(flow) {
  flowListDrawer.visible = false
  flowEditorMode.value = 'edit'
  flowEditorId.value = flow.id
  flowEditorVisible.value = true
}

async function openFlowInstancesDrawer(flow) {
  if (!flow?.id) return
  flowListDrawer.visible = false
  flowInstanceViewerVisible.value = false
  viewingFlowInstanceId.value = ''
  flowInstancesDrawer.title = `${flow.name || '未命名流程'} 实例`
  flowInstancesDrawer.visible = true
  flowInstancesDrawer.loading = true
  flowInstancesDrawer.records = []
  try {
    const response = await fetchFlowInstancesApi(flow.id)
    flowInstancesDrawer.records = normalizeFlowInstances(resolveResponseArray(response))
  } catch (error) {
    flowInstancesDrawer.records = []
    ElMessage.error(error?.message || '获取流程实例失败')
  } finally {
    flowInstancesDrawer.loading = false
  }
}

function openFlowInstanceDetail(instance) {
  if (!instance?.id) return
  viewingFlowInstanceId.value = instance.id
  flowInstanceViewerVisible.value = true
}

function handleJobTypeCreate(type) {
  const actionMap = {
    rest: 'create-rest-job',
    script: 'create-script-job',
    command: 'create-command-job'
  }
  const action = actionMap[type]
  if (action) handleLauncherAction(action)
}

function resolveJobTimestamp(job) {
  return new Date(job?.updatedAt || job?.createdAt || 0).getTime() || 0
}

function pickRecentWorkbenchJobs(rows, limit = WORKBENCH_JOB_LIMIT) {
  if (!Array.isArray(rows) || !rows.length || limit <= 0) return []

  const selected = []

  rows.forEach((job) => {
    const currentTime = resolveJobTimestamp(job)
    const insertAt = selected.findIndex(item => currentTime > resolveJobTimestamp(item))

    if (insertAt === -1) {
      if (selected.length < limit) {
        selected.push(job)
      }
      return
    }

    selected.splice(insertAt, 0, job)
    if (selected.length > limit) {
      selected.length = limit
    }
  })

  return selected
}

function workbenchJobTypeLabel(type) {
  return WORKBENCH_JOB_TYPE_LABELS[String(type || '').toLowerCase()] || String(type || '运维工具').toUpperCase()
}

function workbenchJobTypeTag(type) {
  return WORKBENCH_JOB_TYPE_TAGS[String(type || '').toLowerCase()] || 'info'
}

function handleWorkbenchJobCommand(job, command) {
  if (command === 'copy') {
    handleCopyJob(job)
    return
  }

  if (command === 'history') {
    handleOpenJobHistory(job)
  }
}

function syncWorkbenchViewportWidth() {
  if (typeof window === 'undefined') return
  viewportWidth.value = window.innerWidth || document.documentElement?.clientWidth || 1920
}

function handleOpenRunResult(item) {
  resultMeta.value = {
    runId: item?.id || '',
    jobTitle: translateText(item?.job_title) || '-'
  }
  resultDialogVisible.value = true
}

async function handleExecuteJobSuccess(payload = {}) {
  const jobTitle = payload.jobTitle || executeJobMeta.title || payload.jobId || '-'
  if (payload.runId) {
    resultMeta.value = {
      runId: payload.runId,
      jobTitle
    }
    resultDialogVisible.value = true
  }

  await refreshWorkbenchRunFeedback()
  scheduleWorkbenchRunFeedback()
}

function handleExecuteResultSettled() {
  void refreshWorkbenchRunFeedback()
}

function handleExecuteJobFromDrawer(job) {
  executeJobMeta.id = job.id
  executeJobMeta.type = job.type || ''
  executeJobMeta.configJson = job.configJson || ''
  executeJobMeta.title = translateText(job.title) || job.title || job.id || ''
  executeDialogVisible.value = true
}

function handleEditJobFromDrawer(job) {
  jobDialogType.value = job.type || 'rest'
  jobEditId.value = job.id
  jobDialogVisible.value = true
}

function handleOpenJobHistory(job) {
  historyJobMeta.value = {
    id: job?.id || '',
    title: translateText(job?.title) || job?.title || job?.id || '-'
  }
  historyDialogVisible.value = true
}

async function handleCopyJob(job) {
  if (!job?.id) return

  try {
    await copyJobApi(job.id)
    ElMessage.success('复制成功')
    await refreshAll()
    bumpJobListReload()
  } catch (error) {
    ElMessage.error(error?.message || '复制失败')
  }
}

async function handleDeleteJob(job) {
  if (!job?.id) return

  try {
    await ElMessageBox.confirm(`确定要删除运维工具「${translateText(job?.title) || job?.title || job?.id}」吗？`, '删除运维工具', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger'
    })
    await deleteJobApi(job.id)
    ElMessage.success('删除成功')
    await refreshAll()
    bumpJobListReload()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error?.message || '删除失败')
    }
  }
}

function handleEditCronFromDrawer(item) {
  cronEditId.value = item.id
  cronDialogVisible.value = true
}

async function handleCopyCronFromDrawer(item) {
  if (!item?.id) return

  try {
    await copyCronJob(item.id)
    ElMessage.success('复制成功')
    await refreshAll()
  } catch (error) {
    ElMessage.error(error?.message || '复制失败')
  }
}

async function handleDeleteCronFromDrawer(item) {
  if (!item?.id) return

  try {
    await ElMessageBox.confirm(`确定要删除定时任务「${item.jobDesc || item.id}」吗？`, '删除定时任务', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger'
    })
    await deleteCronJob(item.id)
    ElMessage.success('删除成功')
    await refreshAll()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error?.message || '删除失败')
    }
  }
}

function openFlowForRun(flow) {
  flowListDrawer.visible = false
  flowEditorMode.value = 'run'
  flowEditorId.value = flow.id
  flowEditorVisible.value = true
}

async function handleDeleteFlow(flow) {
  if (!flow?.id) return

  try {
    await ElMessageBox.confirm(`确定要删除流程「${flow.name || flow.id}」吗？此操作不可恢复。`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger'
    })
    await deleteFlowApi(flow.id)
    ElMessage.success('删除成功')
    await refreshAll()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error?.message || '删除失败')
    }
  }
}

function extractRunId(source) {
  const data = source?.data ?? source ?? {}
  return data?.runId || data?.run_id || data?.id || data?.logId || ''
}

function _normalizeApprovalRecord(item) {
  return {
    id: item.id,
    name: item.jobName || '-',
    meta: item.description || item.approveMode || '-',
    tagType: item.status === 0 ? 'primary' : item.status === 1 ? 'success' : item.status === 2 ? 'danger' : 'info',
    tagLabel: item.status === 0 ? '审批中' : item.status === 1 ? '已通过' : item.status === 2 ? '未通过' : '已作废'
  }
}

async function _refreshApprovalsInPlace() {
  approvalsDrawer.loading = true
  try {
    const raw = await fetchApproveItems()
    approvalsDrawer.records = raw.map(_normalizeApprovalRecord)
  } finally {
    approvalsDrawer.loading = false
  }
}

async function handleApproveItem(item) {
  try {
    await ElMessageBox.confirm(`确定通过「${item.name}」的审批？`, '审批确认', {
      type: 'success',
      confirmButtonText: '确定通过',
      cancelButtonText: '取消'
    })
    await passApprove(item.id, '')
    ElMessage.success('审批已通过')
    await _refreshApprovalsInPlace()
    reviewStore.fetchAll()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('操作失败，请重试')
  }
}

async function handleRejectItem(item) {
  try {
    const { value: remark } = await ElMessageBox.prompt(`请输入拒绝「${item.name}」的原因`, '拒绝审批', {
      type: 'warning',
      confirmButtonText: '确定拒绝',
      cancelButtonText: '取消',
      inputPlaceholder: '输入拒绝原因（可不填）',
      inputType: 'textarea'
    })
    await refuseApprove(item.id, remark || '')
    ElMessage.success('审批已拒绝')
    await _refreshApprovalsInPlace()
    reviewStore.fetchAll()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('操作失败，请重试')
  }
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const pad = n => (n < 10 ? `0${n}` : String(n))
  return `${date.getMonth() + 1}-${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function runTypeLabel(type) {
  const labels = {
    rest: 'REST运维工具',
    command: '命令运维工具',
    script: '脚本运维工具'
  }
  return labels[String(type || '').toLowerCase()] || '运行记录'
}

function safeJsonArray(source) {
  if (!source) return []
  if (Array.isArray(source)) return source
  try {
    const parsed = JSON.parse(String(source))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function resolveResponseArray(response) {
  if (!response) return []
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.data?.records)) return response.data.records
  if (Array.isArray(response?.records)) return response.records
  return []
}

function normalizeFlowInstanceStatus(status) {
  return String(status || '').trim().toUpperCase()
}

function getFlowInstanceStatusType(status) {
  if (['SUCCESS', 'COMPLETED', 'FINISHED', 'DONE'].includes(status)) return 'success'
  if (['FAILED', 'ERROR', 'INTERRUPTED', 'ABORTED', 'CANCELLED'].includes(status)) return 'danger'
  if (['RUNNING', 'STARTED', 'PROCESSING'].includes(status)) return 'primary'
  if (['WAITING', 'PENDING', 'QUEUED'].includes(status)) return 'warning'
  return 'info'
}

function getFlowInstanceStatusLabel(status) {
  const statusLabelMap = {
    SUCCESS: '成功',
    COMPLETED: '已完成',
    FINISHED: '已完成',
    DONE: '已完成',
    FAILED: '失败',
    ERROR: '错误',
    INTERRUPTED: '已中断',
    ABORTED: '已终止',
    CANCELLED: '已取消',
    RUNNING: '运行中',
    STARTED: '运行中',
    PROCESSING: '处理中',
    WAITING: '等待中',
    PENDING: '待执行',
    QUEUED: '排队中'
  }

  return statusLabelMap[status] || status || '未知'
}

function normalizeFlowInstances(rows) {
  if (!Array.isArray(rows)) return []
  return rows
    .map(row => {
      const hosts = safeJsonArray(row.hosts)
      const steps = safeJsonArray(row.stepIds ?? row.steps ?? row.step_ids)
      const status = normalizeFlowInstanceStatus(
        row.status ?? row.instanceStatus ?? row.runStatus ?? row.state ?? ''
      )
      return {
        id: row.id ?? row.instanceId ?? '',
        name: row.name ?? row.instanceName ?? '未命名实例',
        status,
        statusType: getFlowInstanceStatusType(status),
        statusLabel: getFlowInstanceStatusLabel(status),
        hostCount: hosts.length || Number(row.hostCount) || 0,
        stepCount: steps.length || Number(row.stepCount) || 0,
        createdAt: row.createdAt ?? row.startTime ?? row.created_at,
        updatedAt: row.updatedAt ?? row.endTime ?? row.finishedAt ?? row.updated_at ?? '',
        createdBy: row.createdBy ?? row.creator ?? row.runBy ?? ''
      }
    })
    .filter(item => !!item.id)
}

function openJobListDrawer(type = '', title = '全部运维工具') {
  jobListDrawer.filterType = type
  jobListDrawer.title = title || '全部运维工具'
  jobListDrawer.visible = true
}

function openCommandListDrawer(type = '', title = '全部命令') {
  commandListDrawer.filterType = type
  commandListDrawer.title = title || '全部命令'
  commandListDrawer.visible = true
}

function openCommandJobDrawer() {
  openJobListDrawer('command', '命令运维工具')
}

function openFlowListDrawer() {
  flowListDrawer.visible = true
}

async function openFailedRunsDrawer() {
  failedRunsDrawer.visible = true
  await refreshFailedRunsDrawerInPlace()
}

async function refreshFailedRunsDrawerInPlace() {
  failedRunsDrawer.loading = true
  try {
    const r = await fetchFailedRuns(20)
    failedRunsDrawer.records = r.records
    failedRunsDrawer.total = r.total
  } finally {
    failedRunsDrawer.loading = false
  }
}

async function openTodayRunsDrawer() {
  todayRunsDrawer.title = '今日运行记录'
  todayRunsDrawer.filterType = ''
  todayRunsDrawer.visible = true
  await refreshTodayRunsDrawerInPlace()
}

async function refreshTodayRunsDrawerInPlace() {
  todayRunsDrawer.loading = true
  try {
    const r = todayRunsDrawer.filterType
      ? await fetchRunsByType(todayRunsDrawer.filterType, 20)
      : await fetchTodayRuns(20)
    todayRunsDrawer.records = r.records
    todayRunsDrawer.total = r.total
  } finally {
    todayRunsDrawer.loading = false
  }
}

async function openRunsByTypeDrawer(type = '', label = '') {
  const typeLabel = { rest: 'REST', script: '脚本', command: '命令' }[type] || label
  todayRunsDrawer.title = type ? `${typeLabel}运维工具今日运行` : '今日运行记录'
  todayRunsDrawer.filterType = type || ''
  todayRunsDrawer.visible = true
  await refreshTodayRunsDrawerInPlace()
}

async function refreshWorkbenchRunFeedback() {
  await Promise.allSettled([
    refreshRunLogData(),
    todayRunsDrawer.visible ? refreshTodayRunsDrawerInPlace() : Promise.resolve(),
    failedRunsDrawer.visible ? refreshFailedRunsDrawerInPlace() : Promise.resolve()
  ])
}

function clearScheduledWorkbenchRunFeedback() {
  if (runFeedbackRefreshTimer) {
    clearTimeout(runFeedbackRefreshTimer)
    runFeedbackRefreshTimer = 0
  }

  while (runFeedbackRefreshTimers.length) {
    clearTimeout(runFeedbackRefreshTimers.pop())
  }
}

function scheduleWorkbenchRunFeedback(delays = RUN_FEEDBACK_RETRY_DELAYS) {
  clearScheduledWorkbenchRunFeedback()

  delays.forEach((delay, index) => {
    const timerId = window.setTimeout(() => {
      if (index === delays.length - 1) {
        runFeedbackRefreshTimer = 0
      }
      const timerIndex = runFeedbackRefreshTimers.indexOf(timerId)
      if (timerIndex >= 0) {
        runFeedbackRefreshTimers.splice(timerIndex, 1)
      }
      void refreshWorkbenchRunFeedback()
    }, delay)

    runFeedbackRefreshTimers.push(timerId)
    if (index === delays.length - 1) {
      runFeedbackRefreshTimer = timerId
    }
  })
}

function openCronDrawer() {
  cronDrawer.visible = true
}

async function openApprovalsDrawer() {
  approvalsDrawer.visible = true
  await _refreshApprovalsInPlace()
}

async function openCmdReviewDrawer() {
  cmdReviewDrawer.visible = true
  cmdReviewDrawer.loading = true
  try {
    const raw = await fetchCommandReviewItems()
    cmdReviewDrawer.records = raw.map(item => ({
      id: item.id,
      name: item.name || '-',
      meta: item.command || item.unapprovedCommand || '-',
      metaCode: true,
      tagType: 'warning',
      tagLabel: '待审核',
      _raw: item
    }))
  } finally {
    cmdReviewDrawer.loading = false
  }
}

async function _refreshCmdReviewInPlace() {
  cmdReviewDrawer.loading = true
  try {
    const raw = await fetchCommandReviewItems()
    cmdReviewDrawer.records = raw.map(item => ({
      id: item.id,
      name: item.name || '-',
      meta: item.command || item.unapprovedCommand || '-',
      metaCode: true,
      tagType: 'warning',
      tagLabel: '待审核',
      _raw: item
    }))
  } finally {
    cmdReviewDrawer.loading = false
  }
}

async function handleCmdApproveItem(item) {
  try {
    await ElMessageBox.confirm(`确定通过【${item.name}】的审核？`, '审核确认', {
      type: 'success',
      confirmButtonText: '确定通过',
      cancelButtonText: '取消'
    })
    await approveCommand([{ ...item._raw, status: COMMAND_STATUS.PUBLISHED }])
    ElMessage.success('审核已通过')
    await _refreshCmdReviewInPlace()
    reviewStore.fetchAll()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('操作失败，请重试')
  }
}

async function handleCmdRejectItem(item) {
  try {
    const { value: reason } = await ElMessageBox.prompt(`请输入拒绝【${item.name}】的原因`, '拒绝审核', {
      type: 'warning',
      confirmButtonText: '确定拒绝',
      cancelButtonText: '取消',
      inputPlaceholder: '输入拒绝原因（可不填）',
      inputType: 'textarea'
    })
    await approveCommand([{ ...item._raw, status: COMMAND_STATUS.REJECTED, unapprovedReason: reason || '' }])
    ElMessage.success('审核已拒绝')
    await _refreshCmdReviewInPlace()
    reviewStore.fetchAll()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('操作失败，请重试')
  }
}

async function openScriptReviewDrawer() {
  scriptReviewDrawer.visible = true
  scriptReviewDrawer.loading = true
  try {
    const raw = await fetchScriptReviewItems()
    scriptReviewDrawer.records = raw.map(item => ({
      id: item.path || item.name,
      name: item.name || item.path || '-',
      meta: item.submitMsg || item.path || '-',
      tagType: 'warning',
      tagLabel: '待审核'
    }))
  } finally {
    scriptReviewDrawer.loading = false
  }
}

onMounted(() => {
  syncWorkbenchViewportWidth()
  window.addEventListener('resize', syncWorkbenchViewportWidth)
  refreshAll()
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', syncWorkbenchViewportWidth)
  }
  clearScheduledWorkbenchRunFeedback()
})
</script>

<style scoped lang="scss">
// ── 变量 ──
.automation-workbench {
  --wb-bg: #f8fafc;
  --wb-panel-bg: #ffffff;
  --wb-panel-border: #e2e8f0;
  --wb-panel-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px -4px rgba(0, 0, 0, 0.06);
  --wb-radius: 8px;
  --wb-text-primary: #1e293b;
  --wb-text-secondary: #64748b;
  --wb-text-muted: #94a3b8;

  --wb-accent: #0d9488;
  --wb-danger: #ef4444;
  --wb-warning: #f59e0b;
  --wb-success: #22c55e;
  --wb-info: #3b82f6;

  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  background: var(--wb-bg);
  min-height: 100vh;
  box-sizing: border-box;

  :deep(.wb-inline-action.el-button) {
    min-width: auto !important;
    min-height: auto !important;
    height: 22px !important;
    padding: 0 3px !important;
    font-size: 12px !important;
    line-height: 1 !important;
  }

  :deep(.wb-inline-action.el-button + .wb-inline-action.el-button) {
    margin-left: 0 !important;
  }
}

@supports (min-height: 100dvh) {
  .automation-workbench {
    min-height: 100dvh;
  }
}

// ── 头部 ──
.wb-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.wb-header__top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.wb-header__summary {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.wb-header__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--wb-text-primary);
  line-height: 1.4;
}

.wb-header__tools {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--wb-panel-border);
  border-radius: 999px;
  background: var(--wb-panel-bg);
  box-shadow: var(--wb-panel-shadow);
}

.wb-header__tools-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--wb-text-secondary);
  white-space: nowrap;
}

.wb-header-path {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 280px;
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px dashed #cbd5e1;
  background: #f8fafc;
  color: var(--wb-text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: #94a3b8;
    background: #f1f5f9;
    color: var(--wb-text-primary);
  }

  i {
    font-size: 12px;
    flex-shrink: 0;
  }

  &__label {
    flex-shrink: 0;
  }

  &__value {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--wb-text-primary);
    font-weight: 500;
  }
}

.wb-header-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--wb-panel-border);
  background: var(--wb-bg);
  color: var(--wb-text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;

  i {
    font-size: 12px;
  }

  &:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
    color: var(--wb-text-primary);
  }
}

// ── 统计卡片 ──
.wb-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(176px, 1fr));
  gap: 12px;
}

.wb-stat {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  padding: 13px 16px;
  background: var(--wb-panel-bg);
  border: 1px solid var(--wb-panel-border);
  border-radius: var(--wb-radius);
  cursor: pointer;
  transition: all 0.15s;
  min-width: 0;
  box-shadow: var(--wb-panel-shadow);
  text-align: left;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 16px -4px rgba(0, 0, 0, 0.12);
  }

  &__top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  &__value {
    font-size: 24px;
    font-weight: 700;
    line-height: 1.2;
    color: var(--wb-text-primary);
  }

  &__label {
    font-size: 12px;
    color: var(--wb-text-muted);
    white-space: nowrap;
    letter-spacing: 0.02em;
  }

  &__icon {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: rgba(148, 163, 184, 0.12);
    color: var(--wb-text-secondary);

    i {
      font-size: 14px;
    }
  }

  &__meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: auto;
  }

  &__sub {
    min-width: 0;
    font-size: 11px;
    color: var(--wb-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &.is-danger {
      color: var(--wb-danger);
    }
  }

  &__hint {
    flex-shrink: 0;
    padding: 2px 6px;
    border-radius: 999px;
    background: rgba(148, 163, 184, 0.12);
    color: var(--wb-text-secondary);
    font-size: 10px;
    line-height: 1.4;
  }

  &--accent {
    border-color: rgba(13, 148, 136, 0.3);
    background: rgba(13, 148, 136, 0.04);
    .wb-stat__value { color: var(--wb-accent); }
    .wb-stat__icon { background: rgba(13, 148, 136, 0.12); color: var(--wb-accent); }
  }

  &--danger {
    border-color: rgba(239, 68, 68, 0.4);
    background: rgba(239, 68, 68, 0.05);
    .wb-stat__value { color: var(--wb-danger); }
    .wb-stat__icon { background: rgba(239, 68, 68, 0.12); color: var(--wb-danger); }
  }

  &--warning {
    border-color: rgba(245, 158, 11, 0.4);
    background: rgba(245, 158, 11, 0.05);
    .wb-stat__value { color: var(--wb-warning); }
    .wb-stat__icon { background: rgba(245, 158, 11, 0.12); color: var(--wb-warning); }
  }

  &--ok {
    border-color: rgba(34, 197, 94, 0.3);
    background: rgba(34, 197, 94, 0.04);
    .wb-stat__value { color: var(--wb-success); }
    .wb-stat__icon { background: rgba(34, 197, 94, 0.12); color: var(--wb-success); }
  }

  &--muted {
    .wb-stat__value { color: var(--wb-text-secondary); }
  }

  &--running {
    border-color: rgba(13, 148, 136, 0.38);
    animation: wb-stat-running-glow 2.8s ease-in-out infinite;

    &::after {
      content: '';
      position: absolute;
      top: -30%;
      bottom: -30%;
      left: -42%;
      width: 34%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.36), transparent);
      transform: skewX(-18deg);
      animation: wb-stat-running-sheen 2.8s linear infinite;
      pointer-events: none;
    }

    .wb-stat__icon {
      background: rgba(13, 148, 136, 0.18);
      color: var(--wb-accent);
      animation: wb-stat-running-icon 1.6s ease-in-out infinite;
    }

    .wb-stat__hint {
      background: rgba(13, 148, 136, 0.16);
      color: var(--wb-accent);
    }
  }
}

@keyframes wb-stat-running-glow {
  0%,
  100% {
    box-shadow: var(--wb-panel-shadow), 0 0 0 0 rgba(13, 148, 136, 0.08);
  }

  50% {
    box-shadow: var(--wb-panel-shadow), 0 0 0 6px rgba(13, 148, 136, 0.08), 0 12px 28px -18px rgba(13, 148, 136, 0.5);
  }
}

@keyframes wb-stat-running-sheen {
  0% {
    transform: translateX(-220%) skewX(-18deg);
  }

  100% {
    transform: translateX(420%) skewX(-18deg);
  }
}

@keyframes wb-stat-running-icon {
  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.08);
  }
}

// ── 工作台网格 ──
.wb-dashboard {
  display: grid;
  flex: 1 1 auto;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  grid-template-rows: auto minmax(0, 1fr);
  gap: 16px;
  min-height: 0;
  align-content: stretch;
  align-items: stretch;
}

// ── 面板 ──
.wb-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--wb-panel-bg);
  border: 1px solid var(--wb-panel-border);
  border-radius: var(--wb-radius);
  box-shadow: var(--wb-panel-shadow);
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding: 12px 16px;
    border-bottom: 1px solid var(--wb-panel-border);

    &--jobs {
      align-items: flex-start;
    }

    &-actions {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
  }

  &__title {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--wb-text-primary);
  }

  &__title-group {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;

    &--jobs {
      flex: 1 1 420px;
      flex-wrap: wrap;
      align-items: center;
    }
  }

}

.wb-job-panel-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.wb-job-panel-stat {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #f8fafc;
  line-height: 1;

  &__label {
    font-size: 12px;
    color: var(--wb-text-secondary);
    white-space: nowrap;
  }

  &__value {
    font-size: 12px;
    font-weight: 700;
    color: var(--wb-text-primary);
  }

  &--total {
    border-color: rgba(100, 116, 139, 0.18);
    background: rgba(148, 163, 184, 0.08);
  }

  &--rest {
    border-color: rgba(59, 130, 246, 0.2);
    background: rgba(59, 130, 246, 0.08);

    .wb-job-panel-stat__value {
      color: var(--wb-info);
    }
  }

  &--script {
    border-color: rgba(34, 197, 94, 0.2);
    background: rgba(34, 197, 94, 0.08);

    .wb-job-panel-stat__value {
      color: var(--wb-success);
    }
  }

  &--command {
    border-color: rgba(245, 158, 11, 0.22);
    background: rgba(245, 158, 11, 0.08);

    .wb-job-panel-stat__value {
      color: var(--wb-warning);
    }
  }
}

.wb-panel--jobs {
  order: 1;
  grid-column: span 12;
}

.wb-panel--runs {
  order: 2;
  grid-column: span 7;
}

.wb-panel--cron {
  order: 3;
  grid-column: span 5;
}

.wb-panel--flows {
  order: 4;
  grid-column: span 5;
}

.wb-panel--commands {
  order: 5;
  grid-column: span 7;
}

.wb-command-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}

.wb-panel-subtitle {
  font-size: 12px;
  font-weight: 600;
  color: var(--wb-text-secondary);
}

.wb-command-type-list {
  padding: 0;
  gap: 6px;
}

.wb-command-job-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  &__meta {
    font-size: 12px;
    color: var(--wb-text-muted);
  }
}

.wb-command-job-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.wb-command-job-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #e5edf5;
  background: #fafcff;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;

  &:hover {
    background: #f5f9ff;
    border-color: #d4deeb;
  }

  &:hover .wb-command-job-item__actions {
    opacity: 1;
  }

  &__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  &__name {
    font-size: 13px;
    font-weight: 500;
    color: var(--wb-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 0;
    flex-wrap: wrap;
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.15s;

    :deep(.el-button) {
      min-height: auto;
      height: 22px;
      padding: 0 3px;
      font-size: 12px;
      line-height: 1;
    }

    :deep(.el-button + .el-button) {
      margin-left: 0;
    }
  }
}

.wb-command-job-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 4px;

  &__meta {
    font-size: 11px;
    color: var(--wb-text-muted);
  }
}

// ── 待关注列表 ──
// (已移除)

// ── 失败运行列表 ──
// (已移除)

// ── 运行分布明细 ──
.wb-run-list {
  padding: 8px;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 4px;
  min-height: 0;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.wb-run-log-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #edf2f7;
  background: #fafafa;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  text-align: left;

  &:hover {
    background: #f1f5f9;
    border-color: #e2e8f0;

    .wb-run-log-item__arrow { transform: translateX(2px); }
  }

  &__main {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__side {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  &__name {
    font-size: 13px;
    font-weight: 500;
    color: var(--wb-text-primary);
    min-width: 0;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__time {
    font-size: 11px;
    color: var(--wb-text-muted);
    flex-shrink: 0;
  }

  &__type {
    display: inline-flex;
    align-items: center;
    padding: 1px 6px;
    border-radius: 999px;
    font-size: 11px;
    background: rgba(148, 163, 184, 0.12);
    flex-shrink: 0;

    &--rest {
      color: var(--wb-info);
      background: rgba(59, 130, 246, 0.1);
    }

    &--command {
      color: var(--wb-warning);
      background: rgba(245, 158, 11, 0.1);
    }

    &--script {
      color: var(--wb-success);
      background: rgba(34, 197, 94, 0.1);
    }
  }

  &__arrow {
    font-size: 10px;
    color: var(--wb-text-muted);
    transition: transform 0.15s;
    flex-shrink: 0;
  }
}

.wb-run-entries__footer {
  padding: 8px 16px;
  border-top: 1px solid var(--wb-panel-border);
  font-size: 11px;
  color: var(--wb-text-muted);
  background: #fafafa;
  margin-top: auto;

  strong { color: var(--wb-text-secondary); }
  .text-danger { color: var(--wb-danger); }
}

// ── 流程列表 ──
.wb-flow-list {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.wb-flow-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #f1f5f9;
  background: #fafafa;
  transition: all 0.15s;
  cursor: pointer;

  &:hover {
    background: #f1f5f9;
    border-color: #e2e8f0;
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__name {
    font-size: 12px;
    font-weight: 500;
    color: var(--wb-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 0;
    flex-wrap: wrap;
    flex-shrink: 0;

    :deep(.el-button) {
      min-height: auto;
      height: 22px;
      padding: 0 3px;
      font-size: 12px;
      line-height: 1;
    }

    :deep(.el-button + .el-button) {
      margin-left: 0;
    }
  }
}

// ── 定时调度 ──
.wb-cron-list {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.wb-cron-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #f1f5f9;
  background: #fafafa;
  transition: all 0.15s;
  cursor: pointer;

  &:hover {
    background: #f1f5f9;
    border-color: #e2e8f0;
  }

  &--enabled {
    border-left: 3px solid var(--wb-success);
    background: rgba(34, 197, 94, 0.03);
  }

  &__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__name {
    font-size: 12px;
    font-weight: 500;
    color: var(--wb-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
  }

  &__cron {
    font-size: 11px;
    color: var(--wb-text-muted);
    font-family: monospace;
  }

  &__actions {
    display: flex;
    gap: 0;
    flex-wrap: wrap;
    flex-shrink: 0;

    :deep(.el-button) {
      min-height: auto;
      height: 22px;
      padding: 0 3px;
      font-size: 12px;
      line-height: 1;
    }

    :deep(.el-button + .el-button) {
      margin-left: 0;
    }
  }
}

.wb-cron-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-top: 1px solid var(--wb-panel-border);
  background: #fafafa;
  margin-top: auto;

  &__total {
    font-size: 12px;
    color: var(--wb-text-muted);
    flex: 1;
  }
}

// ── 快速导航 ──
.wb-nav-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 12px;
}

.wb-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  border-radius: 6px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.15s;
  color: var(--wb-text-secondary);

  &:hover {
    background: rgba(13, 148, 136, 0.06);
    border-color: rgba(13, 148, 136, 0.3);
    color: var(--wb-accent);
  }

  i {
    font-size: 16px;
  }

  span {
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
  }
}

// ── 作业分布卡片 ──
.wb-workbench-job-grid {
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  grid-auto-rows: 1fr;
  gap: 14px;
  align-content: start;
  position: relative;
}

.wb-workbench-job-card {
  --wb-workbench-job-accent: var(--wb-info);
  display: flex;
  position: relative;
  flex-direction: column;
  min-height: 108px;
  border: 1px solid var(--wb-panel-border);
  border-radius: 16px;
  background: var(--wb-panel-bg);
  overflow: hidden;
  box-shadow: 0 16px 32px -24px rgba(15, 23, 42, 0.45);
  transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
  cursor: pointer;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, var(--wb-workbench-job-accent), rgba(255, 255, 255, 0));
  }

  &:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--wb-workbench-job-accent) 38%, var(--wb-panel-border));
    box-shadow: 0 20px 38px -28px rgba(15, 23, 42, 0.58);
  }

  &--rest {
    --wb-workbench-job-accent: var(--wb-info);
  }

  &--script {
    --wb-workbench-job-accent: var(--wb-success);
  }

  &--command {
    --wb-workbench-job-accent: var(--wb-warning);
  }

  &__body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    padding: 10px 14px 4px 12px;
    background: linear-gradient(180deg, var(--el-fill-color-light) 0%, var(--el-fill-color-extra-light) 100%);
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  &__time {
    flex-shrink: 0;
    font-size: 11px;
    color: var(--wb-text-muted);
  }

  &__name {
    display: -webkit-box;
    min-height: 1.45em;
    font-size: 15px;
    font-weight: 600;
    line-height: 1.45;
    color: var(--wb-text-primary);
    word-break: break-word;
    overflow: hidden;
    text-overflow: ellipsis;
    -webkit-line-clamp: 1;
    line-clamp: 1;
    -webkit-box-orient: vertical;
    flex: 1;
    padding-top: 4px;
  }

  &__actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr)) 52px;
    border-top: 1px solid var(--wb-panel-border);
    background: color-mix(in srgb, var(--wb-panel-bg) 88%, #fff);
  }

  &__action {
    appearance: none;
    -webkit-appearance: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 40px;
    padding: 0 8px;
    border: none;
    border-right: 1px solid var(--wb-panel-border);
    background: transparent;
    color: var(--wb-text-secondary);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;

    &:focus,
    &:focus-visible {
      outline: none;
      box-shadow: none;
    }

    &:hover {
      background: var(--el-fill-color-extra-light);
      color: var(--wb-workbench-job-accent);
    }

    i {
      font-size: 12px;
    }
  }

  &__action:first-child {
    border-bottom-left-radius: 15px;
  }

  &__action--danger:hover {
    color: var(--wb-danger);
  }

  &__action--more {
    width: 52px;
    border-right: none;
    border-bottom-right-radius: 15px;
  }

  &__menu-icon {
    margin-right: 6px;
  }
}

.wb-cron-list,
.wb-run-list {
  position: relative;
}

.wb-stack-slide-enter-active,
.wb-stack-slide-leave-active {
  transition: transform 0.24s ease, opacity 0.24s ease;
}

.wb-stack-slide-move {
  transition: transform 0.24s ease;
}

.wb-stack-slide-enter-from,
.wb-stack-slide-leave-to {
  opacity: 0;
  transform: translate3d(0, 14px, 0);
}

// ── 近7天趋势 ──
// ── 作业分布 ──
.wb-job-types {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.wb-job-type-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 6px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px -2px rgba(0, 0, 0, 0.1);
  }

  &__left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--wb-text-muted);
    flex-shrink: 0;
  }

  &__label {
    font-size: 13px;
    color: var(--wb-text-secondary);
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  &__value {
    font-size: 18px;
    font-weight: 700;
    color: var(--wb-text-primary);
  }

  &__action {
    min-width: auto !important;
    height: 24px !important;
    padding: 0 4px !important;
    font-size: 12px !important;
  }

  &--rest {
    border-color: rgba(59, 130, 246, 0.22);
    background: rgba(59, 130, 246, 0.05);
    .wb-job-type-item__dot { background: var(--wb-info); }
    .wb-job-type-item__value { color: var(--wb-info); }
  }

  &--command {
    border-color: rgba(245, 158, 11, 0.24);
    background: rgba(245, 158, 11, 0.06);
    .wb-job-type-item__dot { background: var(--wb-warning); }
    .wb-job-type-item__value { color: var(--wb-warning); }
  }

  &--script {
    border-color: rgba(22, 163, 74, 0.22);
    background: rgba(22, 163, 74, 0.05);
    .wb-job-type-item__dot { background: var(--wb-success); }
    .wb-job-type-item__value { color: var(--wb-success); }
  }

  &--cmd {
    border-color: rgba(100, 116, 139, 0.2);
    background: rgba(100, 116, 139, 0.04);
    .wb-job-type-item__dot { background: #64748b; }
    .wb-job-type-item__value { color: #64748b; }
  }

  &--shell {
    border-color: rgba(34, 197, 94, 0.2);
    background: rgba(34, 197, 94, 0.03);
    .wb-job-type-item__dot { background: var(--wb-success); }
    .wb-job-type-item__value { color: var(--wb-success); }
  }

  &--python {
    border-color: rgba(59, 130, 246, 0.2);
    background: rgba(59, 130, 246, 0.03);
    .wb-job-type-item__dot { background: var(--wb-info); }
    .wb-job-type-item__value { color: var(--wb-info); }
  }

  &--playbook {
    border-color: rgba(139, 92, 246, 0.2);
    background: rgba(139, 92, 246, 0.03);
    .wb-job-type-item__dot { background: #8b5cf6; }
    .wb-job-type-item__value { color: #8b5cf6; }
  }

  &--powershell {
    border-color: rgba(14, 165, 233, 0.2);
    background: rgba(14, 165, 233, 0.03);
    .wb-job-type-item__dot { background: #0ea5e9; }
    .wb-job-type-item__value { color: #0ea5e9; }
  }
}

// ── 响应式 ──
@media (max-width: 1680px) {
  .wb-workbench-job-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 1480px) {
  .wb-workbench-job-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1280px) {
  .wb-panel__header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .wb-workbench-job-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .wb-workbench-job-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .wb-dashboard {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: none;
  }

  .wb-panel--jobs,
  .wb-panel--commands,
  .wb-panel--runs,
  .wb-panel--cron,
  .wb-panel--flows {
    grid-column: 1 / -1;
  }
}

@media (max-width: 720px) {
  .automation-workbench {
    padding: 12px;
    gap: 12px;
  }

  .wb-header__top {
    flex-wrap: wrap;
    align-items: stretch;
  }

  .wb-header__tools {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .wb-stats {
    gap: 8px;
  }

  .wb-dashboard {
    grid-template-columns: 1fr;
    grid-template-rows: none;
  }

  .wb-panel__title-group--jobs {
    align-items: flex-start;
  }

  .wb-job-panel-stats {
    width: 100%;
  }

  .wb-panel--jobs,
  .wb-panel--cron,
  .wb-panel--commands,
  .wb-panel--runs,
  .wb-panel--flows {
    grid-column: span 1;
  }

  .wb-stat {
    padding: 8px 12px;
  }

  .wb-panel__title-group {
    flex-wrap: wrap;
    align-items: center;
  }

  .wb-workbench-job-grid {
    grid-template-columns: 1fr;
    padding: 10px;
  }

  .wb-job-type-item {
    align-items: flex-start;
  }

  .wb-job-type-item__right {
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
  }
}
</style>

<style lang="scss">
:root {
  --wb-text-primary: #1e293b;
  --wb-text-secondary: #64748b;
  --wb-text-muted: #94a3b8;
  --wb-accent: #0d9488;
  --wb-danger: #ef4444;
  --wb-warning: #f59e0b;
  --wb-success: #22c55e;
  --wb-info: #3b82f6;
}

.wb-workbench-drawer .el-drawer__header {
  margin-bottom: 4px !important;
  padding: 16px 16px 0 !important;
}

html.dark {
  --wb-text-primary: #f1f5f9;
  --wb-text-secondary: #94a3b8;
  --wb-text-muted: #64748b;
}

html.dark .automation-workbench {
  --wb-bg: #0f172a;
  --wb-panel-bg: #1e293b;
  --wb-panel-border: #334155;
  --wb-panel-shadow: 0 1px 3px rgba(0, 0, 0, 0.2), 0 4px 12px -4px rgba(0, 0, 0, 0.3);
  --wb-text-primary: #f1f5f9;
  --wb-text-secondary: #94a3b8;
  --wb-text-muted: #64748b;
}

html.dark .automation-workbench .wb-stat:hover {
  box-shadow: 0 4px 16px -4px rgba(0, 0, 0, 0.4);
}

html.dark .automation-workbench .wb-stat--running {
  border-color: rgba(45, 212, 191, 0.42);
}

html.dark .automation-workbench .wb-stat--running::after {
  background: linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.18), transparent);
}

html.dark .automation-workbench .wb-stat--running .wb-stat__icon {
  background: rgba(45, 212, 191, 0.14);
  color: #2dd4bf;
}

html.dark .automation-workbench .wb-stat--running .wb-stat__hint {
  background: rgba(45, 212, 191, 0.14);
  color: #5eead4;
}

html.dark .automation-workbench .wb-run-log-item {
  background: #253044;
  border-color: #334155;
}

html.dark .automation-workbench .wb-run-log-item:hover {
  background: #2d3d56;
  border-color: #475569;
}

html.dark .automation-workbench .wb-command-job-item {
  background: #253044;
  border-color: #334155;
}

html.dark .automation-workbench .wb-command-job-item:hover {
  background: #2d3d56;
  border-color: #475569;
}

html.dark .automation-workbench .wb-run-entries__footer {
  background: #1a2a3d;
  border-color: #334155;
}

html.dark .automation-workbench .wb-flow-item {
  background: #253044;
  border-color: #334155;
}

html.dark .automation-workbench .wb-flow-item:hover {
  background: #2d3d56;
  border-color: #475569;
}

html.dark .automation-workbench .wb-cron-item {
  background: #253044;
  border-color: #334155;
}

html.dark .automation-workbench .wb-cron-item:hover {
  background: #2d3d56;
  border-color: #475569;
}

html.dark .automation-workbench .wb-cron-item--enabled {
  background: rgba(34, 197, 94, 0.06);
}

html.dark .automation-workbench .wb-cron-footer {
  background: #1a2a3d;
}

html.dark .automation-workbench .wb-nav-item {
  background: #253044;
  border-color: #334155;
  color: #94a3b8;
}

html.dark .automation-workbench .wb-nav-item:hover {
  background: rgba(13, 148, 136, 0.12);
  border-color: rgba(13, 148, 136, 0.4);
  color: #2dd4bf;
}

html.dark .automation-workbench .wb-header__tools {
  background: #1e293b;
  border-color: #334155;
}

html.dark .automation-workbench .wb-header-path {
  background: #253044;
  border-color: #475569;
  color: #94a3b8;
}

html.dark .automation-workbench .wb-header-path:hover {
  background: #2d3d56;
  border-color: #64748b;
  color: #e2e8f0;
}

html.dark .automation-workbench .wb-header-action {
  background: #253044;
  border-color: #334155;
  color: #94a3b8;
}

html.dark .automation-workbench .wb-header-action:hover {
  background: #2d3d56;
  border-color: #475569;
  color: #e2e8f0;
}

html.dark .automation-workbench .wb-workbench-job-card {
  background: #1e293b;
  border-color: #334155;
  box-shadow: 0 18px 32px -28px rgba(2, 6, 23, 0.78);
}

html.dark .automation-workbench .wb-workbench-job-card:hover {
  background: #233248;
  border-color: #475569;
}

html.dark .automation-workbench .wb-workbench-job-card__body {
  background: linear-gradient(180deg, #223146 0%, #1c293b 100%);
}

html.dark .automation-workbench .wb-workbench-job-card__actions {
  background: #182435;
}

html.dark .automation-workbench .wb-workbench-job-card__action {
  border-color: #334155;
}

html.dark .automation-workbench .wb-workbench-job-card__action:hover {
  background: #233248;
}

html.dark .automation-workbench .wb-job-panel-stat {
  background: #223146;
  border-color: #334155;
}

html.dark .automation-workbench .wb-job-panel-stat--total {
  background: #253347;
  border-color: #3c4c62;
}

html.dark .automation-workbench .wb-job-type-item {
  background: #253044;
  border-color: #334155;
}

html.dark .automation-workbench .wb-job-type-item--rest {
  background: rgba(13, 148, 136, 0.1);
  border-color: rgba(13, 148, 136, 0.25);
}

html.dark .automation-workbench .wb-job-type-item--command {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.25);
}

html.dark .automation-workbench .wb-job-type-item--script {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.25);
}
</style>
