<template>
  <div class="ops-page-layout wsus-page">
    <!-- <el-alert type="info" :closable="false" show-icon class="wsus-alert">
      <template #title>Windows WSUS 离线补丁管理</template>
      <template #default>
        本页面对接 WSUS 离线补丁接口，集中提供 WSUS
        配置管理、主机扫描、补丁安装与回滚，以及任务历史和安装日志查询能力。
      </template>
    </el-alert> -->

    <div class="wsus-summary">
      <div v-for="item in summaryCards" :key="item.label" class="wsus-summary-card">
        <div class="wsus-summary-card__label">{{ item.label }}</div>
        <div class="wsus-summary-card__value">{{ formatNumber(item.value) }}</div>
        <div class="wsus-summary-card__helper">{{ item.helper }}</div>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="wsus-tabs">
      <el-tab-pane label="主机补丁概览" name="hosts">
        <div v-if="!wsusConfigList.length" class="wsus-inline-tip">
          当前尚未配置 WSUS 服务器，请先创建 WSUS 配置后再提交扫描任务。
        </div>

        <div class="ops-action-bar">
          <el-button type="primary" size="small" @click="openScanDialog()">创建扫描任务</el-button>
          <el-button
            size="small"
            :disabled="selectedHostRows.length === 0"
            @click="openScanDialog(selectedHostRows)"
          >
            扫描选中主机
          </el-button>
          <span class="wsus-selection-text">已选 {{ selectedHostRows.length }} 台主机</span>
          <span style="flex: 1"></span>
          <el-button
            class="toolbar-icon-btn"
            circle
            size="small"
            :loading="hostLoading"
            title="刷新"
            @click="loadHostSummaries()"
          >
            <el-icon v-show="!hostLoading"><Refresh /></el-icon>
          </el-button>
        </div>

        <div class="ops-table-wrapper">
          <el-table
            v-loading="hostLoading"
            :data="hostList"
            max-height="calc(100vh - 360px)"
            @selection-change="handleHostSelectionChange"
          >
            <el-table-column type="selection" width="48" />
            <el-table-column label="主机" min-width="150">
              <template #default="{ row }">
                <el-link type="primary" :underline="false" @click="openHostDetail(row)">
                  {{ resolveHostKey(row) }}
                </el-link>
              </template>
            </el-table-column>
            <el-table-column label="主机 ID" min-width="180">
              <template #default="{ row }">{{ resolveHostId(row) || '-' }}</template>
            </el-table-column>
            <el-table-column label="操作系统" min-width="240" show-overflow-tooltip>
              <template #default="{ row }">
                {{ pickValue(row, ['osDistro', 'os_distro'], '-') }}
              </template>
            </el-table-column>
            <el-table-column label="版本" min-width="120">
              <template #default="{ row }">
                {{ pickValue(row, ['osVersion', 'os_version'], '-') }}
              </template>
            </el-table-column>
            <el-table-column label="架构" min-width="90">
              <template #default="{ row }">
                {{ pickValue(row, ['osArch', 'os_arch'], '-') }}
              </template>
            </el-table-column>
            <el-table-column label="缺失数" width="100" align="center">
              <template #default="{ row }">
                <span class="wsus-metric wsus-metric--danger">
                  {{ pickValue(row, ['totalMissing', 'total_missing'], 0) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="严重" width="90" align="center">
              <template #default="{ row }">
                {{ pickValue(row, ['criticalCount', 'critical_count'], 0) }}
              </template>
            </el-table-column>
            <el-table-column label="重要" width="100" align="center">
              <template #default="{ row }">
                {{ pickValue(row, ['importantCount', 'important_count'], 0) }}
              </template>
            </el-table-column>
            <el-table-column label="中等" width="100" align="center">
              <template #default="{ row }">
                {{ pickValue(row, ['moderateCount', 'moderate_count'], 0) }}
              </template>
            </el-table-column>
            <el-table-column label="低危" width="80" align="center">
              <template #default="{ row }">
                {{ pickValue(row, ['lowCount', 'low_count'], 0) }}
              </template>
            </el-table-column>
            <el-table-column label="已安装" width="90" align="center">
              <template #default="{ row }">
                {{ pickValue(row, ['installedCount', 'installed_count'], 0) }}
              </template>
            </el-table-column>
            <el-table-column label="最后扫描时间" min-width="170">
              <template #default="{ row }">
                {{ formatDateTime(pickValue(row, ['lastScanDate', 'last_scan_date'], '')) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="110" fixed="right">
              <template #default="{ row }">
                <el-button text type="primary" size="small" @click="openHostDetail(row)">
                  查看补丁
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="ops-pagination-wrapper">
          <el-pagination
            v-model:current-page="hostPagination.page"
            v-model:page-size="hostPagination.pageSize"
            :page-sizes="PAGE_SIZE_OPTIONS"
            :total="hostPagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @size-change="handleHostSizeChange"
            @current-change="handleHostPageChange"
          />
        </div>
      </el-tab-pane>

      <el-tab-pane label="WSUS 配置" name="config">
        <div class="ops-action-bar">
          <el-button type="primary" size="small" @click="openCreateWsusConfig">新建配置</el-button>
          <span style="flex: 1"></span>
          <el-button
            class="toolbar-icon-btn"
            circle
            size="small"
            :loading="configLoading"
            title="刷新"
            @click="loadWsusConfigs()"
          >
            <el-icon v-show="!configLoading"><Refresh /></el-icon>
          </el-button>
        </div>

        <div class="ops-table-wrapper">
          <el-table
            v-loading="configLoading"
            :data="wsusConfigList"
            max-height="calc(100vh - 360px)"
          >
            <el-table-column label="WSUS 地址" min-width="260">
              <template #default="{ row }">
                {{ pickValue(row, ['wsusUrl', 'wsus_url'], '-') }}
              </template>
            </el-table-column>
            <el-table-column label="端口" width="90" align="center">
              <template #default="{ row }">
                {{ pickValue(row, ['wsusPort', 'wsus_port'], '-') }}
              </template>
            </el-table-column>
            <el-table-column label="HTTPS" width="90" align="center">
              <template #default="{ row }">
                <el-tag
                  :type="
                    normalizeBoolean(pickValue(row, ['useSsl', 'use_ssl'], false))
                      ? 'success'
                      : 'info'
                  "
                  size="small"
                >
                  {{
                    normalizeBoolean(pickValue(row, ['useSsl', 'use_ssl'], false)) ? '启用' : '关闭'
                  }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="描述" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">
                {{ pickValue(row, ['description'], '-') }}
              </template>
            </el-table-column>
            <el-table-column label="更新时间" min-width="170">
              <template #default="{ row }">
                {{
                  formatDateTime(
                    pickValue(
                      row,
                      ['updatedDate', 'updated_date', 'createdDate', 'created_date'],
                      ''
                    )
                  )
                }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150" fixed="right">
              <template #default="{ row }">
                <el-button text type="primary" size="small" @click="openEditWsusConfig(row)">
                  编辑
                </el-button>
                <el-button text type="danger" size="small" @click="handleDeleteWsusConfig(row)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="任务历史" name="tasks">
        <div class="ops-filter-bar">
          <el-form :inline="true" size="small">
            <el-form-item label="任务类型">
              <el-select
                v-model="taskFilters.taskType"
                clearable
                placeholder="全部"
                style="width: 160px"
              >
                <el-option label="扫描" value="SCAN" />
                <el-option label="安装" value="INSTALL" />
                <el-option label="回滚" value="ROLLBACK" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="taskLoading" @click="handleTaskSearch">
                <el-icon><Search /></el-icon>
                搜索
              </el-button>
              <el-button @click="handleTaskReset">
                <el-icon><RefreshRight /></el-icon>
                重置
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <div class="ops-action-bar">
          <span class="wsus-selection-text">任务总数 {{ taskPagination.total }}</span>
          <span style="flex: 1"></span>
          <el-button
            class="toolbar-icon-btn"
            circle
            size="small"
            :loading="taskLoading"
            title="刷新"
            @click="loadTaskHistory()"
          >
            <el-icon v-show="!taskLoading"><Refresh /></el-icon>
          </el-button>
        </div>

        <div class="ops-table-wrapper">
          <el-table v-loading="taskLoading" :data="taskList" max-height="calc(100vh - 400px)">
            <el-table-column label="任务类型" width="110">
              <template #default="{ row }">
                <el-tag size="small" effect="plain">{{ getTaskTypeLabel(row) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="120">
              <template #default="{ row }">
                <el-tag :type="getTaskStatusType(row)" size="small">
                  {{ getTaskStatusLabel(row) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="Run ID" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">
                {{ pickValue(row, ['runId', 'run_id'], '-') }}
              </template>
            </el-table-column>
            <el-table-column label="主机数" width="100" align="center">
              <template #default="{ row }">
                {{ pickValue(row, ['hostCount', 'host_count'], 0) }}
              </template>
            </el-table-column>
            <el-table-column label="自动重启" width="100" align="center">
              <template #default="{ row }">
                <el-tag
                  :type="
                    normalizeBoolean(pickValue(row, ['rebootAfter', 'reboot_after'], false))
                      ? 'warning'
                      : 'info'
                  "
                  size="small"
                >
                  {{
                    normalizeBoolean(pickValue(row, ['rebootAfter', 'reboot_after'], false))
                      ? '是'
                      : '否'
                  }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="创建人" min-width="120">
              <template #default="{ row }">
                {{ pickValue(row, ['createdBy', 'created_by'], '-') }}
              </template>
            </el-table-column>
            <el-table-column label="创建时间" min-width="170">
              <template #default="{ row }">
                {{ formatDateTime(pickValue(row, ['createdDate', 'created_date'], '')) }}
              </template>
            </el-table-column>
            <el-table-column label="完成时间" min-width="170">
              <template #default="{ row }">
                {{ formatDateTime(pickValue(row, ['completedDate', 'completed_date'], '')) }}
              </template>
            </el-table-column>
            <el-table-column label="错误信息" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">
                {{ pickValue(row, ['errorMessage', 'error_message'], '-') }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="110" fixed="right">
              <template #default="{ row }">
                <el-button text type="primary" size="small" @click="openTaskDetail(row)">
                  详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="ops-pagination-wrapper">
          <el-pagination
            v-model:current-page="taskPagination.page"
            v-model:page-size="taskPagination.pageSize"
            :page-sizes="PAGE_SIZE_OPTIONS"
            :total="taskPagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @size-change="handleTaskSizeChange"
            @current-change="handleTaskPageChange"
          />
        </div>
      </el-tab-pane>

      <el-tab-pane label="安装回滚历史" name="logs">
        <div class="ops-filter-bar">
          <el-form :inline="true" size="small">
            <el-form-item label="主机 ID">
              <el-input
                v-model="installLogFilters.hostId"
                placeholder="按主机 ID 过滤"
                clearable
                style="width: 220px"
                @keyup.enter="handleInstallLogSearch"
              />
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                :loading="installLogLoading"
                @click="handleInstallLogSearch"
              >
                <el-icon><Search /></el-icon>
                搜索
              </el-button>
              <el-button @click="handleInstallLogReset">
                <el-icon><RefreshRight /></el-icon>
                重置
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <div class="ops-action-bar">
          <el-button
            type="primary"
            size="small"
            :disabled="rollbackableSelection.length === 0"
            @click="openRollbackDialog()"
          >
            回滚选中记录
          </el-button>
          <span class="wsus-selection-text">
            已选 {{ rollbackableSelection.length }} 条可回滚记录
          </span>
          <span style="flex: 1"></span>
          <el-button
            class="toolbar-icon-btn"
            circle
            size="small"
            :loading="installLogLoading"
            title="刷新"
            @click="loadInstallLogs()"
          >
            <el-icon v-show="!installLogLoading"><Refresh /></el-icon>
          </el-button>
        </div>

        <div class="ops-table-wrapper">
          <el-table
            v-loading="installLogLoading"
            :data="installLogList"
            max-height="calc(100vh - 400px)"
            @selection-change="handleInstallLogSelectionChange"
          >
            <el-table-column type="selection" width="48" :selectable="isRollbackSelectable" />
            <el-table-column label="主机" min-width="140">
              <template #default="{ row }">
                {{ pickValue(row, ['hostKey', 'host_key'], '-') }}
              </template>
            </el-table-column>
            <el-table-column label="主机 ID" min-width="180">
              <template #default="{ row }">
                {{ pickValue(row, ['hostId', 'host_id'], '-') }}
              </template>
            </el-table-column>
            <el-table-column label="KB 编号" width="130">
              <template #default="{ row }">
                {{ pickValue(row, ['kbNumber', 'kb_number'], '-') }}
              </template>
            </el-table-column>
            <el-table-column label="标题" min-width="260" show-overflow-tooltip>
              <template #default="{ row }">
                {{ pickValue(row, ['title'], '-') }}
              </template>
            </el-table-column>
            <el-table-column label="动作" width="100">
              <template #default="{ row }">
                <el-tag :type="getInstallActionType(row)" size="small" effect="plain">
                  {{ getInstallActionLabel(row) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="结果" width="100">
              <template #default="{ row }">
                <el-tag :type="getInstallResultType(row)" size="small">
                  {{ getInstallResultLabel(row) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="执行时间" min-width="170">
              <template #default="{ row }">
                {{ formatDateTime(pickValue(row, ['executedDate', 'executed_date'], '')) }}
              </template>
            </el-table-column>
            <el-table-column label="错误信息" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">
                {{ pickValue(row, ['errorMessage', 'error_message'], '-') }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button
                  text
                  type="primary"
                  size="small"
                  :disabled="!isRollbackSelectable(row)"
                  @click="openRollbackDialog([row])"
                >
                  回滚
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="ops-pagination-wrapper">
          <el-pagination
            v-model:current-page="installLogPagination.page"
            v-model:page-size="installLogPagination.pageSize"
            :page-sizes="PAGE_SIZE_OPTIONS"
            :total="installLogPagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @size-change="handleInstallLogSizeChange"
            @current-change="handleInstallLogPageChange"
          />
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog
      v-model="wsusConfigDialogVisible"
      :title="wsusConfigForm.id ? '编辑 WSUS 配置' : '新建 WSUS 配置'"
      width="560px"
      destroy-on-close
      @closed="resetWsusConfigForm"
    >
      <el-form
        ref="wsusConfigFormRef"
        :model="wsusConfigForm"
        :rules="wsusConfigRules"
        label-width="110px"
      >
        <el-form-item label="WSUS 地址" prop="wsusUrl">
          <el-input
            v-model="wsusConfigForm.wsusUrl"
            placeholder="例如：http://wsus.internal:8530"
            clearable
          />
        </el-form-item>
        <el-form-item label="端口" prop="wsusPort">
          <el-input-number
            v-model="wsusConfigForm.wsusPort"
            :min="1"
            :max="65535"
            controls-position="right"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="启用 HTTPS">
          <el-switch v-model="wsusConfigForm.useSsl" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="wsusConfigForm.description"
            type="textarea"
            :rows="3"
            maxlength="512"
            show-word-limit
            placeholder="可选，建议填写环境说明"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="wsusConfigDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="wsusConfigSubmitting" @click="handleSaveWsusConfig">
          保存
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="scanDialogVisible"
      title="创建扫描任务"
      width="760px"
      destroy-on-close
      @closed="resetScanDialog"
    >
      <div class="wsus-dialog-body">
        <el-form label-width="110px">
          <el-form-item label="选择主机" required>
            <AcmDeviceSelector
              v-model="scanHosts"
              ci-types="windows"
              :options="{
                selectMode: 'host,input,recently',
                selector: 'multiple',
                label: '选择 Windows 主机'
              }"
            />
          </el-form-item>
          <el-form-item label="WSUS 配置">
            <el-select
              v-model="scanForm.wsusConfigId"
              clearable
              placeholder="为空时使用租户默认配置"
              style="width: 100%"
            >
              <el-option
                v-for="item in wsusConfigList"
                :key="pickValue(item, ['id'])"
                :label="getWsusConfigOptionLabel(item)"
                :value="pickValue(item, ['id'])"
              />
            </el-select>
          </el-form-item>
        </el-form>

        <el-alert type="warning" :closable="false" show-icon>
          扫描接口需要提交明确的主机 ID，因此这里仅开放主机、输入和最近使用三种选择模式。
        </el-alert>
      </div>
      <template #footer>
        <el-button @click="scanDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="scanSubmitting"
          :disabled="scanHostIds.length === 0"
          @click="handleCreateScanTask"
        >
          提交扫描任务
        </el-button>
      </template>
    </el-dialog>

    <el-drawer
      v-model="hostDetailVisible"
      title="主机补丁详情"
      size="68%"
      destroy-on-close
      @closed="resetHostDetail"
    >
      <el-descriptions
        v-if="currentHostSummary"
        :column="2"
        border
        size="small"
        class="wsus-descriptions"
      >
        <el-descriptions-item label="主机">
          {{ resolveHostKey(currentHostSummary) }}
        </el-descriptions-item>
        <el-descriptions-item label="主机 ID">
          {{ resolveHostId(currentHostSummary) || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="操作系统">
          {{ pickValue(currentHostSummary, ['osDistro', 'os_distro'], '-') }}
        </el-descriptions-item>
        <el-descriptions-item label="版本">
          {{ pickValue(currentHostSummary, ['osVersion', 'os_version'], '-') }} /
          {{ pickValue(currentHostSummary, ['osArch', 'os_arch'], '-') }}
        </el-descriptions-item>
        <el-descriptions-item label="缺失补丁数">
          {{ pickValue(currentHostSummary, ['totalMissing', 'total_missing'], 0) }}
        </el-descriptions-item>
        <el-descriptions-item label="最后扫描时间">
          {{
            formatDateTime(pickValue(currentHostSummary, ['lastScanDate', 'last_scan_date'], ''))
          }}
        </el-descriptions-item>
      </el-descriptions>

      <div class="ops-action-bar">
        <el-button
          type="primary"
          size="small"
          :disabled="installableSelection.length === 0"
          @click="openInstallDialog"
        >
          安装选中补丁
        </el-button>
        <span class="wsus-selection-text">已选 {{ installableSelection.length }} 条可安装记录</span>
        <span style="flex: 1"></span>
        <el-button
          class="toolbar-icon-btn"
          circle
          size="small"
          :loading="hostPatchLoading"
          title="刷新"
          @click="loadHostPatches()"
        >
          <el-icon v-show="!hostPatchLoading"><Refresh /></el-icon>
        </el-button>
      </div>

      <div class="ops-table-wrapper wsus-drawer-table">
        <el-table
          v-loading="hostPatchLoading"
          :data="hostPatchList"
          max-height="calc(100vh - 300px)"
          @selection-change="handleHostPatchSelectionChange"
        >
          <el-table-column type="selection" width="48" :selectable="isPatchInstallable" />
          <el-table-column label="KB 编号" width="130">
            <template #default="{ row }">
              {{ pickValue(row, ['kbNumber', 'kb_number'], '-') }}
            </template>
          </el-table-column>
          <el-table-column label="标题" min-width="280" show-overflow-tooltip>
            <template #default="{ row }">
              {{ pickValue(row, ['title'], '-') }}
            </template>
          </el-table-column>
          <el-table-column label="严重级别" width="120">
            <template #default="{ row }">
              <el-tag
                :type="getSeverityType(pickValue(row, ['severity']))"
                size="small"
                effect="plain"
              >
                {{ pickValue(row, ['severity'], '-') }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="分类" min-width="150">
            <template #default="{ row }">
              {{ pickValue(row, ['classification'], '-') }}
            </template>
          </el-table-column>
          <el-table-column label="补丁状态" width="120">
            <template #default="{ row }">
              <el-tag :type="getPatchStatusType(row)" size="small">
                {{ getPatchStatusLabel(row) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="已忽略" width="90" align="center">
            <template #default="{ row }">
              <el-tag
                :type="
                  normalizeBoolean(pickValue(row, ['isIgnored', 'is_ignored'], false))
                    ? 'warning'
                    : 'info'
                "
                size="small"
                effect="plain"
              >
                {{
                  normalizeBoolean(pickValue(row, ['isIgnored', 'is_ignored'], false)) ? '是' : '否'
                }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="扫描时间" min-width="170">
            <template #default="{ row }">
              {{ formatDateTime(pickValue(row, ['scanDate', 'scan_date'], '')) }}
            </template>
          </el-table-column>
          <el-table-column label="安装时间" min-width="170">
            <template #default="{ row }">
              {{ formatDateTime(pickValue(row, ['installDate', 'install_date'], '')) }}
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="ops-pagination-wrapper">
        <el-pagination
          v-model:current-page="hostPatchPagination.page"
          v-model:page-size="hostPatchPagination.pageSize"
          :page-sizes="PAGE_SIZE_OPTIONS"
          :total="hostPatchPagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleHostPatchSizeChange"
          @current-change="handleHostPatchPageChange"
        />
      </div>
    </el-drawer>

    <el-dialog
      v-model="installDialogVisible"
      title="创建安装任务"
      width="680px"
      destroy-on-close
      @closed="resetInstallDialog"
    >
      <div class="wsus-dialog-body">
        <el-alert type="info" :closable="false" show-icon>
          仅会提交当前选中的补丁状态记录，后台会自动按主机归并成安装任务。
        </el-alert>

        <el-form label-width="110px" size="small">
          <el-form-item label="目标主机">
            <span>{{ resolveHostKey(currentHostSummary) }}</span>
          </el-form-item>
          <el-form-item label="补丁数量">
            <span>{{ installableSelection.length }} 条</span>
          </el-form-item>
          <el-form-item label="安装后重启">
            <el-switch v-model="installForm.reboot" />
          </el-form-item>
        </el-form>

        <div class="wsus-dialog-preview">
          <el-tag
            v-for="row in installableSelection.slice(0, 12)"
            :key="pickValue(row, ['id'])"
            type="primary"
            effect="plain"
          >
            {{ pickValue(row, ['kbNumber', 'kb_number'], '-') }}
          </el-tag>
          <span v-if="installableSelection.length > 12" class="wsus-dialog-preview__more">
            +{{ installableSelection.length - 12 }}
          </span>
        </div>
      </div>
      <template #footer>
        <el-button @click="installDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="installSubmitting" @click="handleCreateInstallTask">
          提交安装任务
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="rollbackDialogVisible"
      title="创建回滚任务"
      width="720px"
      destroy-on-close
      @closed="resetRollbackDialog"
    >
      <div class="wsus-dialog-body">
        <el-alert type="warning" :closable="false" show-icon>
          仅允许对安装成功的历史记录发起回滚。回滚成功后，补丁状态会重新回到缺失状态。
        </el-alert>

        <el-form label-width="110px" size="small">
          <el-form-item label="记录数量">
            <span>{{ rollbackSourceRows.length }} 条</span>
          </el-form-item>
          <el-form-item label="回滚后重启">
            <el-switch v-model="rollbackForm.reboot" />
          </el-form-item>
        </el-form>

        <div class="wsus-dialog-preview">
          <el-tag
            v-for="row in rollbackSourceRows.slice(0, 10)"
            :key="pickValue(row, ['id'])"
            type="warning"
            effect="plain"
          >
            {{ pickValue(row, ['kbNumber', 'kb_number'], '-') }} /
            {{ pickValue(row, ['hostKey', 'host_key'], '-') }}
          </el-tag>
          <span v-if="rollbackSourceRows.length > 10" class="wsus-dialog-preview__more">
            +{{ rollbackSourceRows.length - 10 }}
          </span>
        </div>
      </div>
      <template #footer>
        <el-button @click="rollbackDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="rollbackSubmitting" @click="handleCreateRollbackTask">
          提交回滚任务
        </el-button>
      </template>
    </el-dialog>

    <el-drawer
      v-model="taskDetailVisible"
      title="任务详情"
      size="60%"
      destroy-on-close
      @closed="resetTaskDetail"
    >
      <div v-loading="taskDetailLoading">
        <el-descriptions
          v-if="taskDetail"
          :column="2"
          border
          size="small"
          class="wsus-descriptions"
        >
          <el-descriptions-item label="任务 ID">
            {{ pickValue(taskDetail, ['id'], '-') }}
          </el-descriptions-item>
          <el-descriptions-item label="任务类型">
            {{ getTaskTypeLabel(taskDetail) }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            {{ getTaskStatusLabel(taskDetail) }}
          </el-descriptions-item>
          <el-descriptions-item label="Run ID">
            {{ pickValue(taskDetail, ['runId', 'run_id'], '-') }}
          </el-descriptions-item>
          <el-descriptions-item label="主机数">
            {{ pickValue(taskDetail, ['hostCount', 'host_count'], 0) }}
          </el-descriptions-item>
          <el-descriptions-item label="自动重启">
            {{
              normalizeBoolean(pickValue(taskDetail, ['rebootAfter', 'reboot_after'], false))
                ? '是'
                : '否'
            }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDateTime(pickValue(taskDetail, ['createdDate', 'created_date'], '')) }}
          </el-descriptions-item>
          <el-descriptions-item label="完成时间">
            {{ formatDateTime(pickValue(taskDetail, ['completedDate', 'completed_date'], '')) }}
          </el-descriptions-item>
          <el-descriptions-item label="错误信息" :span="2">
            {{ pickValue(taskDetail, ['errorMessage', 'error_message'], '-') }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="wsus-section-title">主机执行状态</div>
        <div class="ops-table-wrapper wsus-drawer-table">
          <el-table :data="taskDetailHosts" max-height="calc(100vh - 320px)">
            <el-table-column label="主机" min-width="140">
              <template #default="{ row }">
                {{ pickValue(row, ['hostKey', 'host_key'], '-') }}
              </template>
            </el-table-column>
            <el-table-column label="主机 ID" min-width="180">
              <template #default="{ row }">
                {{ pickValue(row, ['hostId', 'host_id'], '-') }}
              </template>
            </el-table-column>
            <el-table-column label="状态" width="110">
              <template #default="{ row }">
                <el-tag :type="getHostTaskStatusType(row)" size="small">
                  {{ getHostTaskStatusLabel(row) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="开始时间" min-width="160">
              <template #default="{ row }">
                {{ formatDateTime(pickValue(row, ['startedDate', 'started_date'], '')) }}
              </template>
            </el-table-column>
            <el-table-column label="完成时间" min-width="160">
              <template #default="{ row }">
                {{ formatDateTime(pickValue(row, ['completedDate', 'completed_date'], '')) }}
              </template>
            </el-table-column>
            <el-table-column label="错误信息" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">
                {{ pickValue(row, ['errorMessage', 'error_message'], '-') }}
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, RefreshRight, Search } from '@element-plus/icons-vue'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import { windowsWsusApi } from '../api'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

const activeTab = ref('hosts')

const configLoading = ref(false)
const hostLoading = ref(false)
const hostPatchLoading = ref(false)
const taskLoading = ref(false)
const taskDetailLoading = ref(false)
const installLogLoading = ref(false)

const wsusConfigList = ref([])
const hostList = ref([])
const taskList = ref([])
const installLogList = ref([])
const hostPatchList = ref([])
const taskDetail = ref(null)
const taskDetailHosts = ref([])

const selectedHostRows = ref([])
const selectedHostPatchRows = ref([])
const selectedInstallLogRows = ref([])

const currentHostSummary = ref(null)
const hostDetailVisible = ref(false)
const taskDetailVisible = ref(false)

const hostPagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const hostPatchPagination = reactive({
  page: 1,
  pageSize: 50,
  total: 0
})

const taskPagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const installLogPagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const taskFilters = reactive({
  taskType: ''
})

const installLogFilters = reactive({
  hostId: ''
})

const wsusConfigDialogVisible = ref(false)
const wsusConfigSubmitting = ref(false)
const wsusConfigFormRef = ref(null)
const wsusConfigForm = reactive({
  id: '',
  wsusUrl: '',
  wsusPort: 8530,
  useSsl: false,
  description: ''
})

const wsusConfigRules = {
  wsusUrl: [{ required: true, message: '请输入 WSUS 地址', trigger: 'blur' }],
  wsusPort: [{ required: true, message: '请输入端口', trigger: 'change' }]
}

const scanDialogVisible = ref(false)
const scanSubmitting = ref(false)
const scanHosts = ref([])
const scanForm = reactive({
  wsusConfigId: ''
})

const installDialogVisible = ref(false)
const installSubmitting = ref(false)
const installForm = reactive({
  reboot: false
})

const rollbackDialogVisible = ref(false)
const rollbackSubmitting = ref(false)
const rollbackSourceRows = ref([])
const rollbackForm = reactive({
  reboot: false
})

const summaryCards = computed(() => [
  {
    label: 'WSUS 配置',
    value: wsusConfigList.value.length,
    helper: '当前租户可用配置数'
  },
  {
    label: '纳管主机',
    value: hostPagination.total,
    helper: '主机补丁概览总数'
  },
  {
    label: '任务历史',
    value: taskPagination.total,
    helper: '扫描、安装、回滚任务数'
  },
  {
    label: '安装日志',
    value: installLogPagination.total,
    helper: '安装与回滚历史记录数'
  }
])

const scanHostIds = computed(() =>
  Array.from(new Set(scanHosts.value.map(resolveHostId).filter(Boolean)))
)

const installableSelection = computed(() =>
  selectedHostPatchRows.value.filter(row => isPatchInstallable(row))
)

const rollbackableSelection = computed(() =>
  selectedInstallLogRows.value.filter(row => isRollbackSelectable(row))
)

function unwrapResponse(response) {
  return response?.data ?? response ?? {}
}

function parsePageResponse(response) {
  const data = unwrapResponse(response)
  const content = Array.isArray(data?.content)
    ? data.content
    : Array.isArray(data?.records)
      ? data.records
      : Array.isArray(data)
        ? data
        : []

  return {
    content,
    total: Number(data?.totalElements ?? data?.total ?? content.length ?? 0),
    page: Number(data?.number ?? 0) + 1,
    size: Number(data?.size ?? content.length ?? 0)
  }
}

function pickValue(source, keys, fallback = '') {
  if (!source) return fallback

  const keyList = Array.isArray(keys) ? keys : [keys]
  for (const key of keyList) {
    const value = source[key]
    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }

  return fallback
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1

  const normalized = String(value || '')
    .trim()
    .toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes'
}

function formatNumber(value) {
  return new Intl.NumberFormat('zh-CN').format(Number(value || 0))
}

function formatDateTime(value) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

function resolveHostId(host) {
  return String(pickValue(host, ['hostId', 'host_id', 'id', 'key'], '')).trim()
}

function resolveHostKey(host) {
  return String(pickValue(host, ['hostKey', 'host_key', 'value', 'IP', 'ip'], '-')).trim() || '-'
}

function normalizeTaskType(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
}

function normalizeTaskStatus(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
}

function normalizeInstallAction(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
}

function normalizeInstallResult(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
}

function getTaskTypeLabel(row) {
  const type = normalizeTaskType(pickValue(row, ['taskType', 'task_type'], ''))
  return (
    {
      SCAN: '扫描',
      INSTALL: '安装',
      ROLLBACK: '回滚'
    }[type] ||
    type ||
    '-'
  )
}

function getTaskStatusLabel(row) {
  const status = normalizeTaskStatus(pickValue(row, ['taskStatus', 'task_status'], ''))
  return (
    {
      PENDING: '待执行',
      RUNNING: '执行中',
      COMPLETED: '已完成',
      FAILED: '失败'
    }[status] ||
    status ||
    '-'
  )
}

function getTaskStatusType(row) {
  const status = normalizeTaskStatus(pickValue(row, ['taskStatus', 'task_status'], ''))
  return (
    {
      PENDING: 'info',
      RUNNING: 'warning',
      COMPLETED: 'success',
      FAILED: 'danger'
    }[status] || 'info'
  )
}

function getHostTaskStatusLabel(row) {
  const status = normalizeTaskStatus(pickValue(row, ['status'], ''))
  return (
    {
      PENDING: '待执行',
      RUNNING: '执行中',
      SUCCESS: '成功',
      FAILED: '失败'
    }[status] ||
    status ||
    '-'
  )
}

function getHostTaskStatusType(row) {
  const status = normalizeTaskStatus(pickValue(row, ['status'], ''))
  return (
    {
      PENDING: 'info',
      RUNNING: 'warning',
      SUCCESS: 'success',
      FAILED: 'danger'
    }[status] || 'info'
  )
}

function getPatchStatusLabel(row) {
  const status = normalizeTaskStatus(pickValue(row, ['patchStatus', 'patch_status'], ''))
  return (
    {
      MISSING: '待安装',
      INSTALLED: '已安装',
      INSTALLING: '安装中',
      INSTALL_FAILED: '安装失败',
      ROLLING_BACK: '回滚中',
      ROLLBACK_FAILED: '回滚失败'
    }[status] ||
    status ||
    '-'
  )
}

function getPatchStatusType(row) {
  const status = normalizeTaskStatus(pickValue(row, ['patchStatus', 'patch_status'], ''))
  return (
    {
      MISSING: 'danger',
      INSTALLED: 'success',
      INSTALLING: 'warning',
      INSTALL_FAILED: 'danger',
      ROLLING_BACK: 'warning',
      ROLLBACK_FAILED: 'danger'
    }[status] || 'info'
  )
}

function getSeverityType(severity) {
  return (
    {
      Critical: 'danger',
      Important: 'warning',
      Moderate: 'info',
      Low: 'success'
    }[severity] || 'info'
  )
}

function getInstallActionLabel(row) {
  const action = normalizeInstallAction(pickValue(row, ['action'], ''))
  return (
    {
      INSTALL: '安装',
      ROLLBACK: '回滚'
    }[action] ||
    action ||
    '-'
  )
}

function getInstallActionType(row) {
  const action = normalizeInstallAction(pickValue(row, ['action'], ''))
  return (
    {
      INSTALL: 'primary',
      ROLLBACK: 'warning'
    }[action] || 'info'
  )
}

function getInstallResultLabel(row) {
  const result = normalizeInstallResult(pickValue(row, ['result'], ''))
  return (
    {
      SUCCESS: '成功',
      FAILED: '失败'
    }[result] ||
    result ||
    '-'
  )
}

function getInstallResultType(row) {
  const result = normalizeInstallResult(pickValue(row, ['result'], ''))
  return (
    {
      SUCCESS: 'success',
      FAILED: 'danger'
    }[result] || 'info'
  )
}

function isPatchInstallable(row) {
  const status = normalizeTaskStatus(pickValue(row, ['patchStatus', 'patch_status'], ''))
  const ignored = normalizeBoolean(pickValue(row, ['isIgnored', 'is_ignored'], false))
  return !ignored && ['MISSING', 'INSTALL_FAILED', 'ROLLBACK_FAILED'].includes(status)
}

function isRollbackSelectable(row) {
  const action = normalizeInstallAction(pickValue(row, ['action'], ''))
  const result = normalizeInstallResult(pickValue(row, ['result'], ''))
  return action === 'INSTALL' && result === 'SUCCESS'
}

function getWsusConfigOptionLabel(config) {
  const description = pickValue(config, ['description'], '')
  const url = pickValue(config, ['wsusUrl', 'wsus_url'], '-')
  return description ? `${description} / ${url}` : url
}

function buildSelectorHostItem(host) {
  const hostId = resolveHostId(host)
  if (!hostId) return null

  return {
    key: hostId,
    value: resolveHostKey(host),
    assetType: 'windows'
  }
}

function resetWsusConfigForm() {
  wsusConfigForm.id = ''
  wsusConfigForm.wsusUrl = ''
  wsusConfigForm.wsusPort = 8530
  wsusConfigForm.useSsl = false
  wsusConfigForm.description = ''
}

function resetScanDialog() {
  scanHosts.value = []
  scanForm.wsusConfigId = ''
}

function resetHostDetail() {
  currentHostSummary.value = null
  hostPatchList.value = []
  selectedHostPatchRows.value = []
  hostPatchPagination.page = 1
  hostPatchPagination.pageSize = 50
  hostPatchPagination.total = 0
}

function resetInstallDialog() {
  installForm.reboot = false
}

function resetRollbackDialog() {
  rollbackForm.reboot = false
  rollbackSourceRows.value = []
}

function resetTaskDetail() {
  taskDetail.value = null
  taskDetailHosts.value = []
}

async function loadWsusConfigs(options = {}) {
  configLoading.value = true
  try {
    const response = await windowsWsusApi.getWsusConfigs()
    const data = unwrapResponse(response)
    wsusConfigList.value = Array.isArray(data) ? data : []

    if (
      scanForm.wsusConfigId &&
      !wsusConfigList.value.some(item => pickValue(item, ['id']) === scanForm.wsusConfigId)
    ) {
      scanForm.wsusConfigId = ''
    }

    if (!wsusConfigList.value.length && activeTab.value === 'hosts') {
      activeTab.value = 'config'
    }
  } catch (error) {
    console.error('Failed to load WSUS configs:', error)
    if (!options.silent) {
      ElMessage.error('加载 WSUS 配置失败')
    }
  } finally {
    configLoading.value = false
  }
}

async function loadHostSummaries(options = {}) {
  hostLoading.value = true
  try {
    const response = await windowsWsusApi.getHosts({
      page: hostPagination.page - 1,
      size: hostPagination.pageSize
    })
    const page = parsePageResponse(response)
    hostList.value = page.content
    hostPagination.total = page.total
    selectedHostRows.value = []
  } catch (error) {
    console.error('Failed to load host summaries:', error)
    if (!options.silent) {
      ElMessage.error('加载主机补丁概览失败')
    }
  } finally {
    hostLoading.value = false
  }
}

async function loadHostPatches(options = {}) {
  const hostId = resolveHostId(currentHostSummary.value)
  if (!hostId) return

  hostPatchLoading.value = true
  try {
    const response = await windowsWsusApi.getHostPatches(hostId, {
      page: hostPatchPagination.page - 1,
      size: hostPatchPagination.pageSize
    })
    const page = parsePageResponse(response)
    hostPatchList.value = page.content
    hostPatchPagination.total = page.total
    selectedHostPatchRows.value = []
  } catch (error) {
    console.error('Failed to load host patches:', error)
    if (!options.silent) {
      ElMessage.error('加载主机补丁详情失败')
    }
  } finally {
    hostPatchLoading.value = false
  }
}

async function loadTaskHistory(options = {}) {
  taskLoading.value = true
  try {
    const response = await windowsWsusApi.getTasks({
      taskType: taskFilters.taskType || undefined,
      page: taskPagination.page - 1,
      size: taskPagination.pageSize
    })
    const page = parsePageResponse(response)
    taskList.value = page.content
    taskPagination.total = page.total
  } catch (error) {
    console.error('Failed to load task history:', error)
    if (!options.silent) {
      ElMessage.error('加载任务历史失败')
    }
  } finally {
    taskLoading.value = false
  }
}

async function loadInstallLogs(options = {}) {
  installLogLoading.value = true
  try {
    const response = await windowsWsusApi.getInstallLogs({
      hostId: installLogFilters.hostId || undefined,
      page: installLogPagination.page - 1,
      size: installLogPagination.pageSize
    })
    const page = parsePageResponse(response)
    installLogList.value = page.content
    installLogPagination.total = page.total
    selectedInstallLogRows.value = []
  } catch (error) {
    console.error('Failed to load install logs:', error)
    if (!options.silent) {
      ElMessage.error('加载安装日志失败')
    }
  } finally {
    installLogLoading.value = false
  }
}

async function openTaskDetail(row) {
  const taskId = pickValue(row, ['id'], '')
  if (!taskId) {
    ElMessage.warning('当前任务缺少任务 ID')
    return
  }

  taskDetailVisible.value = true
  taskDetailLoading.value = true
  try {
    const response = await windowsWsusApi.getTaskDetail(taskId)
    const data = unwrapResponse(response)
    taskDetail.value = data?.task || data || null
    taskDetailHosts.value = Array.isArray(data?.hosts) ? data.hosts : []
  } catch (error) {
    console.error('Failed to load task detail:', error)
    ElMessage.error('加载任务详情失败')
    taskDetailVisible.value = false
  } finally {
    taskDetailLoading.value = false
  }
}

function openCreateWsusConfig() {
  resetWsusConfigForm()
  wsusConfigDialogVisible.value = true
}

function openEditWsusConfig(row) {
  resetWsusConfigForm()
  wsusConfigForm.id = pickValue(row, ['id'], '')
  wsusConfigForm.wsusUrl = pickValue(row, ['wsusUrl', 'wsus_url'], '')
  wsusConfigForm.wsusPort = Number(pickValue(row, ['wsusPort', 'wsus_port'], 8530)) || 8530
  wsusConfigForm.useSsl = normalizeBoolean(pickValue(row, ['useSsl', 'use_ssl'], false))
  wsusConfigForm.description = pickValue(row, ['description'], '')
  wsusConfigDialogVisible.value = true
}

async function handleSaveWsusConfig() {
  if (!wsusConfigFormRef.value) return

  try {
    await wsusConfigFormRef.value.validate()
  } catch {
    return
  }

  wsusConfigSubmitting.value = true
  try {
    const payload = {
      wsusUrl: wsusConfigForm.wsusUrl,
      wsusPort: wsusConfigForm.wsusPort,
      useSsl: wsusConfigForm.useSsl,
      description: wsusConfigForm.description
    }

    if (wsusConfigForm.id) {
      payload.id = wsusConfigForm.id
    }

    await windowsWsusApi.saveWsusConfig(payload)
    ElMessage.success(wsusConfigForm.id ? 'WSUS 配置已更新' : 'WSUS 配置已创建')
    wsusConfigDialogVisible.value = false
    await loadWsusConfigs()
  } catch (error) {
    console.error('Failed to save WSUS config:', error)
    ElMessage.error('保存 WSUS 配置失败')
  } finally {
    wsusConfigSubmitting.value = false
  }
}

async function handleDeleteWsusConfig(row) {
  const id = pickValue(row, ['id'], '')
  if (!id) {
    ElMessage.warning('当前配置缺少 ID')
    return
  }

  try {
    await ElMessageBox.confirm('确定删除该 WSUS 配置吗？', '删除确认', {
      type: 'warning'
    })
    await windowsWsusApi.deleteWsusConfig(id)
    ElMessage.success('WSUS 配置已删除')
    await loadWsusConfigs()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      console.error('Failed to delete WSUS config:', error)
      ElMessage.error('删除 WSUS 配置失败')
    }
  }
}

function openScanDialog(preselectedHosts = []) {
  const normalizedSelection = preselectedHosts
    .map(item => buildSelectorHostItem(item))
    .filter(Boolean)

  scanHosts.value = normalizedSelection
  scanForm.wsusConfigId = pickValue(wsusConfigList.value[0], ['id'], '')
  scanDialogVisible.value = true
}

async function handleCreateScanTask() {
  if (scanHostIds.value.length === 0) {
    ElMessage.warning('请先选择至少一台主机')
    return
  }

  if (!scanForm.wsusConfigId && wsusConfigList.value.length === 0) {
    ElMessage.warning('请先创建 WSUS 配置')
    activeTab.value = 'config'
    return
  }

  scanSubmitting.value = true
  try {
    const payload = {
      hostIds: scanHostIds.value
    }

    if (scanForm.wsusConfigId) {
      payload.wsusConfigId = scanForm.wsusConfigId
    }

    const response = await windowsWsusApi.createScanTask(payload)
    const data = unwrapResponse(response)
    ElMessage.success(
      `扫描任务已提交${pickValue(data, ['id']) ? `：${pickValue(data, ['id'])}` : ''}`
    )
    scanDialogVisible.value = false
    activeTab.value = 'tasks'
    await Promise.all([loadTaskHistory({ silent: true }), loadHostSummaries({ silent: true })])
  } catch (error) {
    console.error('Failed to create scan task:', error)
    ElMessage.error('提交扫描任务失败')
  } finally {
    scanSubmitting.value = false
  }
}

function openHostDetail(row) {
  currentHostSummary.value = row
  hostPatchPagination.page = 1
  hostPatchPagination.pageSize = 50
  hostDetailVisible.value = true
  loadHostPatches()
}

function openInstallDialog() {
  if (installableSelection.value.length === 0) {
    ElMessage.warning('请先选择可安装的补丁记录')
    return
  }

  installForm.reboot = false
  installDialogVisible.value = true
}

async function handleCreateInstallTask() {
  const patchStatusIds = Array.from(
    new Set(installableSelection.value.map(row => pickValue(row, ['id'], '')).filter(Boolean))
  )

  if (patchStatusIds.length === 0) {
    ElMessage.warning('当前选择中没有可安装的补丁记录')
    return
  }

  installSubmitting.value = true
  try {
    const response = await windowsWsusApi.createInstallTask({
      patchStatusIds,
      reboot: installForm.reboot
    })
    const data = unwrapResponse(response)
    ElMessage.success(
      `安装任务已提交${pickValue(data, ['id']) ? `：${pickValue(data, ['id'])}` : ''}`
    )
    installDialogVisible.value = false
    activeTab.value = 'tasks'
    await Promise.all([
      loadHostPatches({ silent: true }),
      loadHostSummaries({ silent: true }),
      loadTaskHistory({ silent: true })
    ])
  } catch (error) {
    console.error('Failed to create install task:', error)
    ElMessage.error('提交安装任务失败')
  } finally {
    installSubmitting.value = false
  }
}

function openRollbackDialog(rows = rollbackableSelection.value) {
  const validRows = rows.filter(row => isRollbackSelectable(row))
  if (validRows.length === 0) {
    ElMessage.warning('请先选择安装成功的历史记录')
    return
  }

  rollbackSourceRows.value = validRows
  rollbackForm.reboot = false
  rollbackDialogVisible.value = true
}

async function handleCreateRollbackTask() {
  const installLogIds = Array.from(
    new Set(rollbackSourceRows.value.map(row => pickValue(row, ['id'], '')).filter(Boolean))
  )

  if (installLogIds.length === 0) {
    ElMessage.warning('当前选择中没有可回滚的日志记录')
    return
  }

  rollbackSubmitting.value = true
  try {
    const response = await windowsWsusApi.createRollbackTask({
      installLogIds,
      reboot: rollbackForm.reboot
    })
    const data = unwrapResponse(response)
    ElMessage.success(
      `回滚任务已提交${pickValue(data, ['id']) ? `：${pickValue(data, ['id'])}` : ''}`
    )
    rollbackDialogVisible.value = false
    activeTab.value = 'tasks'
    await Promise.all([loadTaskHistory({ silent: true }), loadInstallLogs({ silent: true })])
  } catch (error) {
    console.error('Failed to create rollback task:', error)
    ElMessage.error('提交回滚任务失败')
  } finally {
    rollbackSubmitting.value = false
  }
}

function handleHostSelectionChange(selection) {
  selectedHostRows.value = selection
}

function handleHostPatchSelectionChange(selection) {
  selectedHostPatchRows.value = selection
}

function handleInstallLogSelectionChange(selection) {
  selectedInstallLogRows.value = selection
}

function handleHostPageChange(page) {
  hostPagination.page = page
  loadHostSummaries()
}

function handleHostSizeChange(size) {
  hostPagination.pageSize = size
  hostPagination.page = 1
  loadHostSummaries()
}

function handleHostPatchPageChange(page) {
  hostPatchPagination.page = page
  loadHostPatches()
}

function handleHostPatchSizeChange(size) {
  hostPatchPagination.pageSize = size
  hostPatchPagination.page = 1
  loadHostPatches()
}

function handleTaskPageChange(page) {
  taskPagination.page = page
  loadTaskHistory()
}

function handleTaskSizeChange(size) {
  taskPagination.pageSize = size
  taskPagination.page = 1
  loadTaskHistory()
}

function handleInstallLogPageChange(page) {
  installLogPagination.page = page
  loadInstallLogs()
}

function handleInstallLogSizeChange(size) {
  installLogPagination.pageSize = size
  installLogPagination.page = 1
  loadInstallLogs()
}

function handleTaskSearch() {
  taskPagination.page = 1
  loadTaskHistory()
}

function handleTaskReset() {
  taskFilters.taskType = ''
  taskPagination.page = 1
  taskPagination.pageSize = 20
  loadTaskHistory()
}

function handleInstallLogSearch() {
  installLogPagination.page = 1
  loadInstallLogs()
}

function handleInstallLogReset() {
  installLogFilters.hostId = ''
  installLogPagination.page = 1
  installLogPagination.pageSize = 20
  loadInstallLogs()
}

onMounted(async () => {
  await Promise.all([
    loadWsusConfigs({ silent: true }),
    loadHostSummaries({ silent: true }),
    loadTaskHistory({ silent: true }),
    loadInstallLogs({ silent: true })
  ])
})
</script>

<style scoped lang="scss">
.wsus-page {
  gap: 12px;
}

.wsus-alert {
  margin-bottom: 4px;
}

.wsus-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.wsus-summary-card {
  padding: 14px 16px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
}

.wsus-summary-card__label {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.wsus-summary-card__value {
  margin-top: 6px;
  font-size: 28px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.1;
}

.wsus-summary-card__helper {
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.wsus-inline-tip {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.wsus-selection-text {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.wsus-metric {
  font-weight: 600;
}

.wsus-metric--danger {
  color: var(--el-color-danger);
}

.wsus-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.wsus-dialog-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 132px;
  overflow-y: auto;
  padding: 12px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  background: var(--el-fill-color-lighter);
}

.wsus-dialog-preview__more {
  align-self: center;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.wsus-descriptions {
  margin-bottom: 12px;
}

.wsus-section-title {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.wsus-drawer-table {
  margin-top: 8px;
}
</style>
