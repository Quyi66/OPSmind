<template>
  <div class="ops-page-layout asset-workbench">
    <!-- ══════════ 头部：标题 + 快捷操作 ══════════ -->
    <section class="aw-header">
      <!-- ── 数据指标条 ── -->
      <div class="aw-metrics-bar">
        <button
          class="aw-metric-item"
          @click="openAssetListDrawer(selectedAssetTypeCode)"
        >
          <span class="aw-metric-item__label">资产总量</span>
          <div class="aw-metric-item__value-group">
            <WbFlipNumber class="aw-metric-item__value" :value="totalAssets" />
            <span class="aw-metric-item__sub">{{ assetTypeCount }}类资产</span>
          </div>
        </button>

        <button
          class="aw-metric-item"
          @click="openExceptionDrawer"
        >
          <span class="aw-metric-item__label">连通巡检</span>
          <div class="aw-metric-item__value-group" :class="{ 'is-danger': exceptionDeviceTotal > 0 }">
            <WbFlipNumber class="aw-metric-item__value" :value="exceptionDeviceTotal" />
            <span class="aw-metric-item__sub">台巡检失败</span>
          </div>
        </button>

        <button
          class="aw-metric-item"
          @click="openFailedLogDrawer"
        >
          <span class="aw-metric-item__label">失败日志</span>
          <div class="aw-metric-item__value-group" :class="{ 'is-warning': failedLogTotal > 0 }">
            <WbFlipNumber class="aw-metric-item__value" :value="failedLogTotal" />
            <span class="aw-metric-item__sub">近7天</span>
          </div>
        </button>

        <button class="aw-metric-item" @click="openGovernanceDrawer">
          <span class="aw-metric-item__label">分组 / 标签</span>
          <div class="aw-metric-item__value-group">
            <span class="aw-metric-item__value-text">{{ groupCount }} / {{ tagTotal }}</span>
            <span class="aw-metric-item__sub">{{ governanceStats.permissionTeamCount }}个团队</span>
          </div>
        </button>

        <button
          class="aw-metric-item"
          @click="openAssetListDrawer(selectedAssetTypeCode)"
        >
          <span class="aw-metric-item__label">连通率</span>
          <div class="aw-metric-item__value-group">
            <span class="aw-metric-item__value-text">
              {{ connectionStats.totalConnection ? `${connectionStats.successRate}%` : '--' }}
            </span>
            <span class="aw-metric-item__sub">
              {{ formatCount(connectionStats.successCount) }}正常 /
              {{ formatCount(connectionStats.failureCount) }}异常
            </span>
          </div>
        </button>

        <button class="aw-metric-item" @click="openRecentLogsDrawer">
          <span class="aw-metric-item__label">操作记录</span>
          <div class="aw-metric-item__value-group">
            <WbFlipNumber class="aw-metric-item__value" :value="recentOperationTotal" />
            <span class="aw-metric-item__sub">近7天</span>
          </div>
        </button>
      </div>
    </section>

    <!-- ══════════ 面板仪表盘 ══════════ -->
    <div class="aw-dashboard">
      <!-- ── 资产操作面板 ── -->
      <section class="aw-panel aw-panel--actions">
        <div class="aw-panel__header">
          <div class="aw-panel__title-group">
            <h3 class="aw-panel__title">资产操作</h3>
            <span class="aw-panel__stat-badge">
              今日新增
              <strong>{{ latestTrendPoint ? getTrendValue(latestTrendPoint) : 0 }}</strong>
            </span>
          </div>
          <div class="aw-panel__header-actions">
            <el-button
              class="aw-inline-action"
              link
              type="primary"
              size="small"
              @click="autoEntryDialogVisible = true"
            >
              <i class="fa fa-plus" />
              录入
            </el-button>
            <el-button
              class="aw-inline-action"
              link
              type="primary"
              size="small"
              @click="importDialogVisible = true"
            >
              <i class="fa fa-file-import" />
              导入
            </el-button>
            <el-button
              class="aw-inline-action"
              link
              type="primary"
              size="small"
              @click="exportDialogVisible = true"
            >
              <i class="fa fa-file-export" />
              导出
            </el-button>
          </div>
        </div>

        <!-- 设备清单预览（按选中类型） -->
        <div class="aw-recent-assets">
          <div class="aw-recent-assets__header">
            <div class="aw-recent-assets__type-strip">
              <span class="aw-recent-assets__title">类型：</span>
              <button
                v-for="item in topAssetTypes"
                :key="item.code || item.title"
                class="aw-asset-type-chip"
                :class="{ 'is-active': selectedAssetTypeCode === (item.code || item.title) }"
                @click="switchCardType(item.code || item.title)"
              >
                <span class="aw-asset-type-chip__name">{{ item.title }}</span>
                <span class="aw-asset-type-chip__count">{{ formatCount(item.count) }}</span>
              </button>
            </div>
            <el-button
              class="aw-inline-action"
              link
              type="primary"
              size="small"
              @click="openAssetListDrawer(selectedAssetTypeCode)"
            >
              查看全部
            </el-button>
          </div>

          <transition-group
            v-if="cardAssets.length"
            name="aw-stack-slide"
            tag="div"
            class="aw-recent-assets__grid"
          >
            <article
              v-for="item in cardAssets"
              :key="item.id"
              class="aw-asset-card"
              @click="handleViewAssetDetail(item)"
            >
              <div class="aw-asset-card__body">
                <div class="aw-asset-card__head">
                  <el-tag size="small" round :type="item.status === 1 || item.status === '1' ? 'success' : 'info'">
                    {{ getAssetStatusText(item.status) }}
                  </el-tag>
                  <div class="aw-asset-card__head-actions">
                    <el-tag
                      v-if="item.needReboot == 1"
                      size="small"
                      round
                      type="warning"
                      class="aw-asset-card__reboot-tag"
                      title="系统需重启"
                    >
                      <i class="fa fa-sync-alt" /> 需重启
                    </el-tag>
                    <button
                      type="button"
                      class="aw-asset-card__edit-btn"
                      title="编辑"
                      @click.stop="handleViewAssetDetail(item)"
                    >
                      <el-icon>
                        <Edit />
                      </el-icon>
                    </button>
                  </div>
                </div>
                <strong class="aw-asset-card__name">{{ getAssetPrimaryText(item) }}</strong>
                <span class="aw-asset-card__os">
                  <i :class="getOsIconClass(item.os_distro)" class="aw-asset-card__os-icon" />
                  <span class="aw-asset-card__os-distro">
                    {{ item.os_distro || '--' }}
                  </span>
                  <span class="aw-asset-card__os-version">{{ item.os_version || '' }}</span>
                </span>
              </div>
              <div class="aw-asset-card__footer">
                <button
                  type="button"
                  class="aw-asset-card__action-btn"
                  :class="[
                    getConnToneClass(item.CONN_LATEST_STATUS),
                    { 'is-loading': checkingConnIds.includes(item.id) }
                  ]"
                  :disabled="checkingConnIds.includes(item.id)"
                  @click.stop="handleAssetCheckConn(item)"
                >
                  <i v-if="checkingConnIds.includes(item.id)" class="fa fa-spinner fa-spin" />
                  <span v-else class="aw-asset-card__status-indicator">
                    <span class="aw-status-dot" />
                    {{ getConnStatusText(item.CONN_LATEST_STATUS) }}
                  </span>
                </button>
              </div>
            </article>
          </transition-group>
          <el-empty v-else description="暂无资产数据" :image-size="40" />
        </div>
      </section>

      <!-- ── 异常设备面板 ── -->
      <section class="aw-panel aw-panel--exceptions">
        <div class="aw-panel__header">
          <div class="aw-panel__title-group">
            <h3 class="aw-panel__title">连通巡检</h3>
            <span class="aw-panel__stat-badge">
              <strong>{{ exceptionDeviceTotal }}</strong>
              台
            </span>
          </div>
          <div class="aw-panel__header-actions">
            <el-button
              class="aw-inline-action"
              link
              type="primary"
              size="small"
              @click="openExceptionDrawer"
            >
              查看全部
            </el-button>
          </div>
        </div>

        <div class="aw-exception-list">
          <div class="aw-exception-list__section">
            <div v-if="exceptionPreviewItems.length" class="aw-exception-list__body">
              <button
                v-for="item in exceptionPreviewItems"
                :key="item.key"
                type="button"
                class="aw-exception-row"
                @click="openExceptionDrawer"
              >
                <span class="aw-exception-row__ip">{{ item.title }}</span>
                <span
                  class="aw-exception-row__badge"
                  :class="'is-' + getConnRateBadgeType(item.raw.CONN_RATE)"
                >
                  连通率: {{ item.badge }}
                </span>
                <span class="aw-exception-row__desc">{{ item.desc }}</span>
                <span class="aw-exception-row__actions">
                  <i
                    class="fa fa-plug aw-exception-row__action"
                    title="检查连通性"
                    @click.stop="handleExceptionCheckConn(item.raw)"
                  />
                  <i
                    class="fa fa-download aw-exception-row__action"
                    title="采集信息"
                    @click.stop="handleExceptionCollectInfo(item.raw)"
                  />
                </span>
              </button>
            </div>
            <div v-else class="aw-exception-list__empty">暂无连通异常设备</div>
          </div>
        </div>
      </section>

      <!-- 趋势与分布 / 分组与标签面板已隐藏，可通过恢复 aw-panel--analytics / aw-panel--governance 区块重新启用 -->

      <!-- ── 操作记录面板 ── -->
      <section class="aw-panel aw-panel--logs">
        <div class="aw-panel__header">
          <h3 class="aw-panel__title">操作记录</h3>
          <div class="aw-panel__header-actions">
            <el-button
              class="aw-inline-action"
              link
              type="primary"
              size="small"
              @click="openRecentLogsDrawer"
            >
              查看全部
            </el-button>
          </div>
        </div>
        <transition-group
          v-if="recentLogs.length"
          name="aw-stack-slide"
          tag="div"
          class="aw-log-list"
        >
          <button
            v-for="item in recentLogs.slice(0, 7)"
            :key="item.run_id"
            type="button"
            class="aw-log-item"
            @click="handleLogItemClick(item)"
          >
            <span class="aw-log-item__title">{{ getOperationActionLabel(item.action) }}</span>
            <span class="aw-log-item__engine">{{ item.ata_node || '--' }}</span>
            <span class="aw-log-item__user">{{ item.username || '--' }}</span>
            <span class="aw-log-item__time">{{ formatDateTime(item.start_time) }}</span>
            <el-tag
              class="aw-log-item__status"
              size="small"
              round
              :type="getOperationLogStatusType(item.status)"
            >
              {{ getRunLogStatusLabel(item.status) }}
            </el-tag>
          </button>
        </transition-group>
        <el-empty v-else description="暂无操作记录" :image-size="48" />
      </section>
    </div>

    <!-- ══════════ 弹窗 ══════════ -->
    <AutoEntryDialog v-model="autoEntryDialogVisible" @saved="handleDialogSaved" />
    <ImportAssetDialog
      v-model="importDialogVisible"
      :tenant-id="currentTenantId"
      @saved="handleDialogSaved"
    />
    <ExportAssetDialog v-model="exportDialogVisible" />
    <AssetEditDialog
      v-model="assetDetailDialogVisible"
      :asset-id="currentAssetId"
      @saved="loadAllData"
    />

    <OsVersionDialog
      v-model="osVersionVisible"
      :title="osVersionTitle"
      :data="osVersionData"
      :loading="osVersionLoading"
    />

    <ExecuteResultDialog
      v-if="runResultDialogVisible"
      v-model:visible="runResultDialogVisible"
      :run-id="runResultMeta.runId"
      :job-title="runResultMeta.jobTitle"
    />

    <!-- ══════════ 抽屉面板 ══════════ -->

    <!-- 设备清单抽屉 -->
    <el-drawer v-model="assetListDrawer.visible" size="75%" class="aw-drawer aw-drawer--asset-list">
      <template #header>
        <div class="aw-drawer-header">
          <span class="aw-drawer-header__title">{{ assetListDrawerTitle }}</span>
        </div>
      </template>
      <div class="aw-drawer__toolbar">
        <el-input
          v-model="assetListDrawer.keyword"
          placeholder="搜索 IP / 主机名"
          size="small"
          clearable
          @keyup.enter="openAssetListDrawer(assetListDrawer.filterType, true)"
          @clear="openAssetListDrawer(assetListDrawer.filterType, true)"
        >
          <template #prefix><i class="fa fa-search" /></template>
        </el-input>
      </div>
      <div v-loading="assetListDrawer.loading" class="aw-drawer__body">
        <template v-if="!assetListDrawer.loading">
          <div v-if="assetListDrawer.records.length" class="aw-drawer-card-grid">
            <article
              v-for="item in assetListDrawer.records"
              :key="item.id"
              class="aw-asset-card"
              @click="handleViewAssetDetail(item)"
            >
              <div class="aw-asset-card__body">
                <div class="aw-asset-card__head">
                  <el-tag size="small" round :type="item.status === 1 || item.status === '1' ? 'success' : 'info'">
                    {{ getAssetStatusText(item.status) }}
                  </el-tag>
                  <div class="aw-asset-card__head-actions">
                    <el-tag
                      v-if="item.needReboot == 1"
                      size="small"
                      round
                      type="warning"
                      class="aw-asset-card__reboot-tag"
                      title="系统需重启"
                    >
                      <i class="fa fa-sync-alt" /> 需重启
                    </el-tag>
                    <button
                      type="button"
                      class="aw-asset-card__edit-btn"
                      title="编辑"
                      @click.stop="handleViewAssetDetail(item)"
                    >
                      <el-icon>
                        <Edit />
                      </el-icon>
                    </button>
                  </div>
                </div>
                <strong class="aw-asset-card__name">{{ getAssetPrimaryText(item) }}</strong>
                <span class="aw-asset-card__os">
                  <i :class="getOsIconClass(item.os_distro)" class="aw-asset-card__os-icon" />
                  <span class="aw-asset-card__os-distro">
                    {{ item.os_distro || '--' }}
                  </span>
                  <span class="aw-asset-card__os-version">{{ item.os_version || '' }}</span>
                </span>
              </div>
              <div class="aw-asset-card__footer">
                <button
                  type="button"
                  class="aw-asset-card__action-btn"
                  :class="[
                    getConnToneClass(item.CONN_LATEST_STATUS),
                    { 'is-loading': checkingConnIds.includes(item.id) }
                  ]"
                  :disabled="checkingConnIds.includes(item.id)"
                  @click.stop="handleAssetCheckConn(item)"
                >
                  <i v-if="checkingConnIds.includes(item.id)" class="fa fa-spinner fa-spin" />
                  <span v-else class="aw-asset-card__status-indicator">
                    <span class="aw-status-dot" />
                    {{ getConnStatusText(item.CONN_LATEST_STATUS) }}
                  </span>
                </button>
              </div>
            </article>
          </div>
          <el-empty v-else description="暂无资产" :image-size="60" />
        </template>
        <div v-if="assetListDrawer.total > assetListDrawer.pageSize" class="aw-drawer__pagination">
          <el-pagination
            v-model:current-page="assetListDrawer.page"
            v-model:page-size="assetListDrawer.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :page-size="assetListDrawer.pageSize"
            :total="assetListDrawer.total"
            layout="sizes, prev, pager, next"
            background
            small
            @current-change="handleAssetListPageChange"
            @size-change="handleAssetListPageSizeChange"
          />
        </div>
      </div>
    </el-drawer>

    <el-drawer v-model="exceptionDrawer.visible" size="50%" class="aw-drawer">
      <template #header>
        <div class="aw-drawer-header">
          <span class="aw-drawer-header__title">连通巡检</span>
          <div class="aw-drawer-header__actions">
            <el-button
              class="aw-inline-action"
              link
              type="primary"
              size="small"
              :loading="exceptionDrawer.actionLoading"
              @click="handleExceptionBulkCheckConn"
            >
              <i class="fa fa-plug" />
              全设备连通性检查
            </el-button>
            <el-button
              class="aw-inline-action"
              link
              type="primary"
              size="small"
              :loading="exceptionDrawer.actionLoading"
              @click="handleExceptionBulkCollect"
            >
              <i class="fa fa-download" />
              全设备采集信息
            </el-button>
          </div>
        </div>
      </template>
      <div v-loading="exceptionDrawer.loading" class="aw-drawer__body">
        <template v-if="!exceptionDrawer.loading">
          <div v-if="exceptionDrawer.records.length" class="aw-drawer-list">
            <button
              v-for="item in exceptionDrawer.records"
              :key="item.key"
              type="button"
              class="aw-drawer-row aw-drawer-row--exception"
              @click="handleExceptionDeviceRowClick(item.raw || item)"
            >
              <strong class="aw-drawer-row__title">{{ item.title }}</strong>
              <span
                class="aw-drawer-row__badge"
                :class="'is-' + getConnRateBadgeType(item.raw.CONN_RATE)"
              >
                连通率: {{ item.badge }}
              </span>
              <span class="aw-drawer-row__desc">{{ item.desc }}</span>
              <span class="aw-drawer-row__meta">{{ item.meta }}</span>
              <span class="aw-drawer-row__actions">
                <i
                  class="fa fa-plug aw-exception-row__action"
                  title="检查连通性"
                  @click.stop="handleExceptionCheckConn(item.raw || item)"
                />
                <i
                  class="fa fa-download aw-exception-row__action"
                  title="采集信息"
                  @click.stop="handleExceptionCollectInfo(item.raw || item)"
                />
              </span>
            </button>
          </div>
          <el-empty v-else description="暂无连通异常设备" :image-size="60" />
        </template>
        <div v-if="exceptionDrawer.total > exceptionDrawer.pageSize" class="aw-drawer__pagination">
          <el-pagination
            v-model:current-page="exceptionDrawer.page"
            v-model:page-size="exceptionDrawer.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :page-size="exceptionDrawer.pageSize"
            :total="exceptionDrawer.total"
            layout="sizes, prev, pager, next"
            background
            small
            @current-change="handleExceptionPageChange"
            @size-change="handleExceptionPageSizeChange"
          />
        </div>
      </div>
    </el-drawer>

    <el-drawer v-model="failedLogDrawer.visible" size="520px" class="aw-drawer">
      <template #header>
        <div class="aw-drawer-header">
          <span class="aw-drawer-header__title">失败日志</span>
        </div>
      </template>
      <div v-loading="failedLogDrawer.loading" class="aw-drawer__body">
        <template v-if="!failedLogDrawer.loading">
          <div v-if="failedLogDrawer.records.length" class="aw-drawer-list">
            <button
              v-for="item in failedLogDrawer.records"
              :key="item.key"
              type="button"
              class="aw-drawer-row"
              @click="handleLogItemClick(item.raw || item)"
            >
              <strong class="aw-drawer-row__title">{{ item.title }}</strong>
              <span class="aw-drawer-row__badge">{{ item.badge }}</span>
              <span class="aw-drawer-row__desc">{{ item.desc }}</span>
              <span class="aw-drawer-row__meta">{{ item.meta }}</span>
            </button>
          </div>
          <el-empty v-else description="暂无失败日志" :image-size="60" />
        </template>
      </div>
    </el-drawer>

    <el-drawer v-model="recentLogsDrawer.visible" size="50%" class="aw-drawer">
      <template #header>
        <div class="aw-drawer-header">
          <span class="aw-drawer-header__title">近7天操作记录</span>
        </div>
      </template>
      <div v-loading="recentLogsDrawer.loading" class="aw-drawer__body">
        <template v-if="!recentLogsDrawer.loading">
          <div v-if="recentLogsDrawer.records.length" class="aw-drawer-list">
            <button
              v-for="item in recentLogsDrawer.records"
              :key="item.run_id"
              type="button"
              class="aw-drawer-row aw-drawer-row--log"
              @click="handleLogItemClick(item)"
            >
              <span class="aw-drawer-row__title">{{ getOperationActionLabel(item.action) }}</span>
              <span class="aw-drawer-row__engine">{{ item.ata_node || '--' }}</span>
              <span class="aw-drawer-row__user">{{ item.username || '--' }}</span>
              <span class="aw-drawer-row__time">{{ formatDateTime(item.start_time) }}</span>
              <el-tag
                class="aw-drawer-row__status"
                size="small"
                round
                :type="getOperationLogStatusType(item.status)"
              >
                {{ getRunLogStatusLabel(item.status) }}
              </el-tag>
            </button>
          </div>
          <div v-else class="aw-drawer-empty">
            <el-empty description="暂无操作记录" :image-size="60" />
          </div>
        </template>
        <div
          v-if="recentLogsDrawer.total > recentLogsDrawer.pageSize"
          class="aw-drawer__pagination"
        >
          <el-pagination
            v-model:current-page="recentLogsDrawer.page"
            v-model:page-size="recentLogsDrawer.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :page-size="recentLogsDrawer.pageSize"
            :total="recentLogsDrawer.total"
            layout="sizes, prev, pager, next"
            background
            small
            @current-change="handleRecentLogsPageChange"
            @size-change="handleRecentLogsPageSizeChange"
          />
        </div>
      </div>
    </el-drawer>

    <el-drawer v-model="governanceDrawer.visible" size="520px" class="aw-drawer">
      <template #header>
        <div class="aw-drawer-header">
          <span class="aw-drawer-header__title">分组与标签概览</span>
        </div>
      </template>
      <div v-loading="governanceDrawer.loading" class="aw-drawer__body">
        <template v-if="!governanceDrawer.loading">
          <div class="aw-drawer-section">
            <div class="aw-drawer-section__header">
              <h4 class="aw-drawer-section__title">分组 ({{ groupRows.length }})</h4>
              <el-button
                class="aw-inline-action"
                link
                type="primary"
                size="small"
                @click="addGroupDialogVisible = true"
              >
                <i class="fa fa-plus" />
                新增
              </el-button>
            </div>
            <div class="aw-drawer-list">
              <button
                v-for="item in groupRows.slice(0, 20)"
                :key="item.id"
                class="aw-drawer-row aw-drawer-row--slim"
                @click="handleEditGroup(item)"
              >
                <i class="fa fa-folder" style="color: #e6a23c; margin-right: 8px" />
                <span class="aw-drawer-row__name">{{ item.path }}</span>
                <span class="aw-drawer-row__count">
                  {{ formatCount(item.total || item.count) }}
                </span>
                <el-button
                  text
                  type="primary"
                  size="small"
                  class="aw-drawer-row__edit-btn"
                  @click.stop="handleEditGroup(item)"
                >
                  <i class="fa fa-pen" />
                </el-button>
              </button>
            </div>
          </div>
          <div class="aw-drawer-section">
            <div class="aw-drawer-section__header">
              <h4 class="aw-drawer-section__title">标签 ({{ tagRows.length }})</h4>
              <el-button
                class="aw-inline-action"
                link
                type="primary"
                size="small"
                @click="addTagDialogVisible = true"
              >
                <i class="fa fa-plus" />
                新增
              </el-button>
            </div>
            <div class="aw-drawer-tags">
              <button
                v-for="item in tagRows.slice(0, 30)"
                :key="item.id"
                class="aw-drawer-tag"
                @click="handleEditTag(item)"
              >
                <i class="fa fa-tag" style="margin-right: 4px" />
                {{ item.name }}
                <span class="aw-drawer-tag__count">
                  {{ formatCount(item.total || item.count) }}
                </span>
                <el-button
                  text
                  type="primary"
                  size="small"
                  class="aw-drawer-tag__edit-btn"
                  @click.stop="handleEditTag(item)"
                >
                  <i class="fa fa-pen" />
                </el-button>
              </button>
            </div>
          </div>
          <div v-if="governanceStats.permissionTeamCount" class="aw-drawer-section">
            <h4 class="aw-drawer-section__title">权限概览</h4>
            <p class="aw-drawer-section__desc">
              {{ governanceStats.permissionResourceCount }} 项资源，{{
                governanceStats.permissionTeamCount
              }}
              个团队
            </p>
          </div>
        </template>
      </div>
    </el-drawer>

    <DataAddGroupDialog v-model="addGroupDialogVisible" @saved="handleGovernanceSaved" />
    <DataAddTagDialog v-model="addTagDialogVisible" @saved="handleGovernanceSaved" />
    <DataEditGroupDialog
      v-model="editGroupDialogVisible"
      :group-data="currentGroupItem"
      @saved="handleGovernanceSaved"
    />
    <DataEditTagDialog
      v-model="editTagDialogVisible"
      :tag-data="currentTagItem"
      @saved="handleGovernanceSaved"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiService } from '@/core/api'
import { pollJobStatus } from '@/composables/useJobPolling'
import { translateI18nKey } from '@/utils/i18n'
import { assetApi, dataManageApi, exceptionApi, operationLogApi } from '../api'
import { useAssetOverviewWorkbench } from '../utils/useAssetOverviewWorkbench'
import { useAssetWorkbenchDrawers } from '../composables/useAssetWorkbenchDrawers'
import { ensureArray, ensurePositiveInteger, normalizePagedResponse } from '../utils/response'
import OsVersionDialog from '../components/overview/OsVersionDialog.vue'
import DataAddGroupDialog from '../components/data/DataAddGroupDialog.vue'
import DataAddTagDialog from '../components/data/DataAddTagDialog.vue'
import DataEditGroupDialog from '../components/data/DataEditGroupDialog.vue'
import DataEditTagDialog from '../components/data/DataEditTagDialog.vue'
import AssetEditDialog from '../components/asset-info/AssetEditDialog.vue'
import AutoEntryDialog from '../components/asset-info/AutoEntryDialog.vue'
import ImportAssetDialog from '../components/asset-info/ImportAssetDialog.vue'
import ExportAssetDialog from '../components/asset-info/ExportAssetDialog.vue'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import { Edit } from '@element-plus/icons-vue'
import WbFlipNumber from '@/modules/automation/components/workbench/WbFlipNumber.vue'
import { getRunLogStatusLabel } from '@/modules/automation/constants/runLogStatus'

// ── 运行结果弹窗 ──
const runResultDialogVisible = ref(false)
const runResultMeta = ref({ runId: '', jobTitle: '' })

// ── 资产详情弹窗 ──
const assetDetailDialogVisible = ref(false)
const currentAssetId = ref('')

// ── 概览数据 composable ──
const {
  assetTypeData,
  groupAssetData,
  groupRows,
  tagRows,
  recentLogs,
  recentOperationTotal,
  latestTrendPoint,
  totalAssets,
  assetTypeCount,
  connectionStats,
  governanceStats,
  loadGovernanceData,
  loadRecentOperations,
  refreshAll
} = useAssetOverviewWorkbench()

// ── 抽屉 composable ──
const {
  assetListDrawer,
  exceptionDrawer,
  failedLogDrawer,
  recentLogsDrawer,
  governanceDrawer,
  assetListDrawerTitle,
  openAssetListDrawer,
  handleAssetListPageChange,
  handleAssetListPageSizeChange,
  handleViewAssetDetail,
  openExceptionDrawer,
  handleExceptionPageChange,
  handleExceptionPageSizeChange,
  openFailedLogDrawer,
  openRecentLogsDrawer,
  handleRecentLogsPageChange,
  handleRecentLogsPageSizeChange,
  handleLogItemClick,
  openGovernanceDrawer
} = useAssetWorkbenchDrawers({
  assetDetailDialogVisible,
  currentAssetId,
  runResultDialogVisible,
  runResultMeta,
  getOperationActionLabel
})

// ── 本地状态 ──
const osVersionVisible = ref(false)
const osVersionLoading = ref(false)
const osVersionData = ref([])
const osVersionTitle = ref('')
const refreshedAt = ref(null)
const tagTotal = ref(0)

// 异常与失败日志预览
const exceptionPreviewRows = ref([])
const exceptionPreviewLoading = ref(false)
const exceptionDeviceTotal = ref(0)
const failedLogRows = ref([])
const failedLogLoading = ref(false)
const failedLogTotal = ref(0)

// 弹窗
const autoEntryDialogVisible = ref(false)
const importDialogVisible = ref(false)
const exportDialogVisible = ref(false)
const currentTenantId = ref('')
const addGroupDialogVisible = ref(false)
const addTagDialogVisible = ref(false)
const editGroupDialogVisible = ref(false)
const editTagDialogVisible = ref(false)
const currentGroupItem = ref(null)
const currentTagItem = ref(null)

const OPERATION_LOG_REFRESH_RETRY_DELAYS = [1200, 3200, 6500]
const OPERATION_LOG_POLLING_INTERVAL = 5000
const operationLogRefreshing = ref(false)
const operationLogRefreshTimers = []
let operationLogPollingTimer = 0

function handleEditGroup(item) {
  currentGroupItem.value = item
  editGroupDialogVisible.value = true
}
function handleEditTag(item) {
  currentTagItem.value = item
  editTagDialogVisible.value = true
}

async function refreshGovernanceSummary() {
  await loadGovernanceData()
  tagTotal.value = tagRows.value.length
  refreshedAt.value = new Date()
}

function handleGovernanceSaved() {
  void refreshGovernanceSummary()
}

// 资产操作卡片 —— 按类型预览
const selectedAssetTypeCode = ref('')
const cardAssets = ref([])
const cardAssetsLoading = ref(false)
const checkingConnIds = ref([])
const viewportWidth = ref(window.innerWidth || document.documentElement?.clientWidth || 1920)
const cardColumnCount = computed(() => {
  const w = viewportWidth.value
  if (w <= 720) return 2
  if (w <= 960) return 3
  if (w <= 1280) return 4
  if (w <= 1680) return 5
  return 6
})
const cardPreviewLimit = computed(() => cardColumnCount.value * 2)

function syncViewportWidth() {
  viewportWidth.value = window.innerWidth || document.documentElement?.clientWidth || 1920
}

// ── 工具函数 ──
function toNumber(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
function formatCount(v) {
  return toNumber(v).toLocaleString('zh-CN')
}
function formatDateTime(v) {
  if (!v) return '--'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '--'
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const formatDateTimeShort = formatDateTime

function formatConnRate(v) {
  if (v === null || v === undefined || v === '') return '--'
  return `${toNumber(v)}%`
}
function getConnStatusText(s) {
  if (s === '1' || s === 1) return '已联通'
  if (s === '0' || s === 0) return '未联通'
  return '未知'
}
function getConnToneClass(s) {
  if (s == 1) return 'is-success'
  if (s == 0) return 'is-danger'
  return 'is-muted'
}
function getAssetPrimaryText(item) {
  return item?.IP || item?.hostname || '-'
}
function getAssetStatusText(status) {
  return status === 1 || status === '1' ? '在线' : '离线'
}
function getAssetStatusTagType(status) {
  return status === 1 || status === '1' ? 'success' : 'danger'
}
function getOsDistroClass(distro) {
  const value = String(distro || '').toLowerCase()
  if (value.includes('ubuntu') || value.includes('debian')) return 'is-debian'
  if (
    value.includes('centos') ||
    value.includes('redhat') ||
    value.includes('red hat') ||
    value.includes('rhel')
  )
    return 'is-redhat'
  if (value.includes('oracle')) return 'is-oracle'
  if (value.includes('suse')) return 'is-suse'
  if (value.includes('windows')) return 'is-windows'
  return 'is-unknown'
}
function getOsIconClass(distro) {
  const value = String(distro || '').toLowerCase()
  if (value.includes('ubuntu')) return 'fab fa-ubuntu'
  if (value.includes('debian')) return 'fab fa-debian'
  if (
    value.includes('centos') ||
    value.includes('redhat') ||
    value.includes('red hat') ||
    value.includes('rhel') ||
    value.includes('oracle') ||
    value.includes('suse') ||
    value.includes('linux')
  )
    return 'fab fa-linux'
  if (value.includes('windows')) return 'fab fa-windows'
  return 'fa fa-server'
}
function getConnRateBadgeType(rate) {
  const r = toNumber(rate)
  if (r >= 95) return 'success'
  if (r >= 60) return 'warning'
  return 'danger'
}
function getOperationActionLabel(a) {
  if (!a) return '未知操作'
  const actionLabelMap = {
    asset_import: '资产导入'
  }
  if (actionLabelMap[a]) return actionLabelMap[a]
  return translateI18nKey(a)
}
function getOperationLogStatusType(status) {
  const normalized = String(status || '').toUpperCase()
  const typeMap = {
    COMPLETED: 'success',
    ERROR: 'danger',
    RUNNING: 'primary',
    WAITING: 'info',
    FAILED: 'warning'
  }
  return typeMap[normalized] || 'info'
}
function getTrendValue(r) {
  return toNumber(r?.total ?? r?.count)
}

// ── 计算属性 ──
const groupCount = computed(() => sortedGroups.value.length)

const sortedAssetTypes = computed(() =>
  [...assetTypeData.value]
    .map(i => ({ ...i, count: toNumber(i?.count) }))
    .sort((a, b) => b.count - a.count)
)
const sortedGroups = computed(() =>
  [...groupAssetData.value]
    .map(i => ({
      name: i?.groupName || i?.name || i?.path || '未命名分组',
      count: toNumber(i?.count ?? i?.total)
    }))
    .sort((a, b) => b.count - a.count)
)
const topAssetTypes = computed(() => sortedAssetTypes.value.slice(0, 6))

const exceptionPreviewItems = computed(() =>
  ensureArray(exceptionPreviewRows.value).map(r => ({
    key: r.IP || r.ci_name || `${r.updated_at || ''}-${r.CONN_RATE || ''}`,
    title: r.IP || '未识别 IP',
    badge: formatConnRate(r.CONN_RATE),
    desc: r.ci_name || '未命名资产',
    meta: `${getConnStatusText(r.CONN_LATEST_STATUS)} · ${formatDateTimeShort(r.updated_at)}`,
    raw: r
  }))
)

// ── 连通性检查 ──
function removeCheckingId(id) {
  const idx = checkingConnIds.value.indexOf(id)
  if (idx > -1) checkingConnIds.value.splice(idx, 1)
}

async function handleAssetCheckConn(item) {
  const ip = item.IP || item.ip
  try {
    await ElMessageBox.confirm(`是否重新检查主机${ip}的连通性？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  checkingConnIds.value.push(item.id)
  try {
    const host = {
      key: item.id || item.key,
      value: item.IP || item.ip,
      assetType: selectedAssetTypeCode.value || item.ciType || 'linux'
    }
    const { data } = await apiService.post(
      `/workflow/api/workflow/jobs/M1x855/run?cacheBuster=${Date.now()}`,
      { params: { hosts: [host] } }
    )
    const result = Array.isArray(data) ? data[0] : data
    if (result?.status === 'WAITING' || result?.status === 'RUNNING') {
      ElMessage.success('检查连通性任务已发起')
      handleOperationRunTriggered(result)
      pollJobStatus(result.runId, {
        interval: 5000,
        successMessage: '连通性检查完成',
        errorMessage: '连通性检查失败',
        onSuccess: () => {
          removeCheckingId(item.id)
          switchCardType(selectedAssetTypeCode.value)
          void refreshOperationLogsInPlace()
        },
        onError: () => {
          removeCheckingId(item.id)
          void refreshOperationLogsInPlace()
        },
        onComplete: () => {
          removeCheckingId(item.id)
          void refreshOperationLogsInPlace()
        }
      })
    } else if (result?.status === 'COMPLETED' || result?.status === 'SUCCESS') {
      ElMessage.success('连通性检查完成')
      removeCheckingId(item.id)
      switchCardType(selectedAssetTypeCode.value)
      handleOperationRunTriggered(result)
    } else if (result?.status === 'FAILED' || result?.status === 'ERROR') {
      removeCheckingId(item.id)
      ElMessage.error(result?.error || '连通性检查失败')
      handleOperationRunTriggered(result)
    } else {
      ElMessage.success('检查连通性任务已启动')
      removeCheckingId(item.id)
      handleOperationRunTriggered(result)
    }
  } catch (error) {
    removeCheckingId(item.id)
    ElMessage.error(`连通性检查失败: ${error.response?.data?.message || error.message}`)
  }
}

// ── 卡片类型切换 ──
async function switchCardType(ciType) {
  selectedAssetTypeCode.value = ciType || ''
  cardAssetsLoading.value = true
  try {
    const res = await assetApi.getAssetList(
      {
        assetType: ciType || '',
        permission: 'r',
        status: 'all',
        CONN_LATEST_STATUS: '',
        hostKeys: '/'
      },
      { page: 1, size: cardPreviewLimit.value, filter: '' }
    )
    cardAssets.value = normalizePagedResponse(res).records.slice(0, cardPreviewLimit.value)
  } catch {
    cardAssets.value = []
  } finally {
    cardAssetsLoading.value = false
  }
}

function handleExceptionDeviceRowClick(row) {
  if (row?.IP || row?.id) {
    currentAssetId.value = row.id || ''
    assetDetailDialogVisible.value = true
  }
}

// ── 数据加载 ──
async function loadExceptionPreview() {
  exceptionPreviewLoading.value = true
  try {
    const r = await exceptionApi.getExceptionDevices(
      { cit: 'sjxy_all', conditions: 'recently', param: 'rwx' },
      { page: 1, size: 6 }
    )
    const normalized = normalizePagedResponse(r)
    exceptionPreviewRows.value = normalized.records
    exceptionDeviceTotal.value = normalized.total
  } catch {
    exceptionPreviewRows.value = []
    exceptionDeviceTotal.value = 0
  } finally {
    exceptionPreviewLoading.value = false
  }
}

// ── 异常设备操作 ──
async function handleExceptionCollectInfo(item) {
  const ip = item.IP || item.ip
  try {
    await ElMessageBox.confirm(
      `信息采集将花费几分钟到半小时不等的时间，是否对主机 ${ip} 进行采集？`,
      '采集信息',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
  } catch {
    return
  }
  const host = {
    key: item.id || item.key,
    value: item.IP || item.ip,
    assetType: selectedAssetTypeCode.value || 'linux'
  }
  try {
    const { data } = await apiService.post(
      `/workflow/api/workflow/jobs/mjedwe/run?cacheBuster=${Date.now()}`,
      { params: { hosts: [host] } }
    )
    const result = Array.isArray(data) ? data[0] : data
    ElMessage.success('采集信息任务已发起')
    handleOperationRunTriggered(result)
    void loadExceptionPreview()
    if (exceptionDrawer.visible) {
      void openExceptionDrawer(exceptionDrawer.page)
    }
  } catch (error) {
    ElMessage.error(`采集信息启动失败: ${error.response?.data?.message || error.message}`)
  }
}

async function handleExceptionCheckConn(item) {
  const ip = item.IP || item.ip
  try {
    await ElMessageBox.confirm(`是否重新检查主机 ${ip} 的连通性？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  const host = {
    key: item.id || item.key,
    value: item.IP || item.ip,
    assetType: selectedAssetTypeCode.value || 'linux'
  }
  try {
    const { data } = await apiService.post(
      `/workflow/api/workflow/jobs/M1x855/run?cacheBuster=${Date.now()}`,
      { params: { hosts: [host] } }
    )
    const result = Array.isArray(data) ? data[0] : data
    ElMessage.success('检查连通性任务已发起')
    handleOperationRunTriggered(result)
    void Promise.allSettled([
      loadExceptionPreview(),
      selectedAssetTypeCode.value ? switchCardType(selectedAssetTypeCode.value) : Promise.resolve(),
      exceptionDrawer.visible ? openExceptionDrawer(exceptionDrawer.page) : Promise.resolve()
    ])
  } catch (error) {
    ElMessage.error(`检查连通性失败: ${error.response?.data?.message || error.message}`)
  }
}

// ── 连通巡检设备批量操作 ──
async function runExceptionBulkAction(jobId, actionName) {
  const total = ensurePositiveInteger(exceptionDrawer.total, 0)
  if (!total) {
    ElMessage.warning('没有异常巡检设备可操作')
    return
  }
  try {
    await ElMessageBox.confirm(
      `将对全部 ${total} 台连通异常设备${actionName}，此操作可能需要一段时间。`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
  } catch {
    return
  }
  exceptionDrawer.actionLoading = true
  try {
    const pageSize = 200
    const pageCount = Math.max(1, Math.ceil(total / pageSize))
    let batchCount = 0
    let handledHostCount = 0
    let triggerResult = null

    for (let page = 1; page <= pageCount; page += 1) {
      const res = await exceptionApi.getExceptionDevices(
        { cit: 'oplus_all', conditions: 'recently', param: 'rwx' },
        { page, size: pageSize }
      )
      const { records } = normalizePagedResponse(res)
      const hosts = records
        .map(row => ({
          key: row.id || row.key || row.IP || '',
          value: row.IP || row.ip || '',
          assetType: 'linux'
        }))
        .filter(host => host.value)

      if (!hosts.length) {
        continue
      }

      const { data } = await apiService.post(
        `/workflow/api/workflow/jobs/${jobId}/run?cacheBuster=${Date.now()}`,
        { params: { hosts } }
      )
      const result = Array.isArray(data) ? data[0] : data
      triggerResult = triggerResult || result
      batchCount += 1
      handledHostCount += hosts.length
    }

    if (!batchCount) {
      ElMessage.warning('没有异常巡检设备可操作')
      return
    }

    ElMessage.success(`已分 ${batchCount} 批发起 ${handledHostCount} 台设备的${actionName}任务`)
    handleOperationRunTriggered(triggerResult)
  } catch (error) {
    ElMessage.error(`${actionName}失败: ${error.response?.data?.message || error.message}`)
  } finally {
    exceptionDrawer.actionLoading = false
  }
}

async function handleExceptionBulkCheckConn() {
  await runExceptionBulkAction('M1x855', '连通性检查')
}

async function handleExceptionBulkCollect() {
  await runExceptionBulkAction('mjedwe', '采集信息')
}

async function loadFailedLogPreview() {
  failedLogLoading.value = true
  try {
    const r = await operationLogApi.getOperationLogs(
      { module: 'cmdb', action: 'all', status: 'ERROR', day: 7 },
      { page: 1, size: 5 }
    )
    const normalized = normalizePagedResponse(r)
    failedLogRows.value = normalized.records
    failedLogTotal.value = normalized.total
  } catch {
    failedLogRows.value = []
    failedLogTotal.value = 0
  } finally {
    failedLogLoading.value = false
  }
}

async function loadCurrentTenantId() {
  try {
    currentTenantId.value = await dataManageApi.getCurrentTenantId()
  } catch (error) {
    console.error('加载租户ID失败:', error)
  }
}

async function loadAllData(options = {}) {
  await Promise.allSettled([refreshAll(options), loadExceptionPreview(), loadFailedLogPreview()])
  tagTotal.value = tagRows.value.length
  refreshedAt.value = new Date()
}

function isOperationRunningStatus(status) {
  const normalized = String(status || '').toUpperCase()
  return normalized === 'WAITING' || normalized === 'RUNNING'
}

function hasRunningOperationLogs() {
  const cardRunning = ensureArray(recentLogs.value).some(item =>
    isOperationRunningStatus(item?.status)
  )
  const drawerRunning = ensureArray(recentLogsDrawer.records).some(item =>
    isOperationRunningStatus(item?.status)
  )
  return cardRunning || drawerRunning
}

function clearOperationLogRefreshTimers() {
  while (operationLogRefreshTimers.length) {
    clearTimeout(operationLogRefreshTimers.pop())
  }
}

function stopOperationLogPolling() {
  if (operationLogPollingTimer) {
    clearInterval(operationLogPollingTimer)
    operationLogPollingTimer = 0
  }
}

function ensureOperationLogPolling() {
  if (operationLogPollingTimer) return
  operationLogPollingTimer = window.setInterval(() => {
    void refreshOperationLogsInPlace()
  }, OPERATION_LOG_POLLING_INTERVAL)
}

async function refreshOperationLogsInPlace() {
  if (operationLogRefreshing.value) return
  operationLogRefreshing.value = true
  try {
    await Promise.allSettled([
      loadRecentOperations(),
      loadFailedLogPreview(),
      recentLogsDrawer.visible ? openRecentLogsDrawer(recentLogsDrawer.page) : Promise.resolve()
    ])
  } finally {
    operationLogRefreshing.value = false
    if (hasRunningOperationLogs()) {
      ensureOperationLogPolling()
    } else {
      stopOperationLogPolling()
    }
  }
}

function scheduleOperationLogRefresh(delays = OPERATION_LOG_REFRESH_RETRY_DELAYS) {
  clearOperationLogRefreshTimers()
  delays.forEach(delay => {
    const timerId = window.setTimeout(() => {
      const idx = operationLogRefreshTimers.indexOf(timerId)
      if (idx >= 0) {
        operationLogRefreshTimers.splice(idx, 1)
      }
      void refreshOperationLogsInPlace()
    }, delay)
    operationLogRefreshTimers.push(timerId)
  })
}

function handleOperationRunTriggered(result) {
  void refreshOperationLogsInPlace()
  scheduleOperationLogRefresh()
  if (isOperationRunningStatus(result?.status)) {
    ensureOperationLogPolling()
  }
}

// ── 交互 ──

function handleDialogSaved() {
  void loadAllData({ forceAssetTypeTotals: true })
}

// 首个资产类型自动选中
watch(
  sortedAssetTypes,
  types => {
    if (types.length && !selectedAssetTypeCode.value) {
      switchCardType(types[0].code || types[0].title)
    }
  },
  { immediate: true }
)

onMounted(() => {
  syncViewportWidth()
  window.addEventListener('resize', syncViewportWidth)
  void loadAllData({ forceAssetTypeTotals: true })
  void loadCurrentTenantId()
})

onUnmounted(() => {
  window.removeEventListener('resize', syncViewportWidth)
  clearOperationLogRefreshTimers()
  stopOperationLogPolling()
})
</script>

<style scoped lang="scss">
// ══════════════════════════════════════════════
//  资产工作台 — 基于自动化工作台设计模式重构
// ══════════════════════════════════════════════

.asset-workbench {
  --aw-bg: #f8fafc;
  --aw-panel-bg: #ffffff;
  --aw-panel-border: #e2e8f0;
  --aw-panel-shadow: 0 1px 3px rgba(0, 0, 0, 0.02), 0 4px 12px -4px rgba(0, 0, 0, 0.05);
  --aw-radius: 12px;
  --aw-text-primary: #1e293b;
  --aw-text-secondary: #64748b;
  --aw-text-muted: #94a3b8;
  --aw-accent: #0d9488;
  --aw-danger: #ef4444;
  --aw-warning: #f59e0b;
  --aw-success: #10b981;
  --aw-info: #3b82f6;
  --aw-violet: #8b5cf6;
  --aw-cyan: #06b6d4;
  --aw-gold: #d97706;

  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  background: var(--aw-bg);
  min-height: 100%;
  box-sizing: border-box;
}

// ── 头部 ──
.aw-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.aw-header__top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.aw-header__summary {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.aw-header__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--aw-text-primary);
  line-height: 1.4;
}

.aw-header__chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}

.aw-header__chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--aw-panel-bg);
  border: 1px solid var(--aw-panel-border);
  font-size: 12px;
  color: var(--aw-text-secondary);
  white-space: nowrap;

  strong {
    color: var(--aw-accent);
    font-weight: 700;
  }
}

.aw-header__chip--danger strong {
  color: var(--aw-danger);
}

.aw-header__chip--muted {
  background: transparent;
  border-color: transparent;
}

.aw-header__tools {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.aw-header-action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--aw-panel-border);
  background: var(--aw-panel-bg);
  color: var(--aw-text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;

  i {
    font-size: 12px;
  }

  &:hover {
    border-color: var(--aw-accent);
    color: var(--aw-accent);
    background: rgba(13, 148, 136, 0.06);
  }
}

// ── 数据指标条（Metrics Bar） ──
.aw-metrics-bar {
  display: flex;
  align-items: stretch;
  background: var(--aw-panel-bg);
  border: 1px solid var(--aw-panel-border);
  border-radius: var(--aw-radius);
  padding: 10px 0;
  width: 100%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  flex-wrap: wrap;
  gap: 0;
}

.aw-metric-item {
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  border: none;
  border-right: 1px solid var(--aw-panel-border);
  flex: 1 1 140px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 4px 20px;
  cursor: pointer;
  transition: background 0.15s ease;
  min-width: 120px;
  text-align: left;

  &:last-child {
    border-right: none;
  }

  &:hover {
    background: #f8fafc;
  }

  &__label {
    font-size: 11px;
    font-weight: 600;
    color: var(--aw-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 2px;
  }

  &__value-group {
    display: flex;
    align-items: baseline;
    gap: 6px;
    flex-wrap: wrap;

    &.is-danger {
      .aw-metric-item__value {
        color: var(--aw-danger);
      }
      .aw-metric-item__sub {
        color: color-mix(in srgb, var(--aw-danger) 80%, transparent);
        font-weight: 600;
      }
    }

    &.is-warning {
      .aw-metric-item__value {
        color: var(--aw-warning);
      }
    }
  }

  &__value,
  &__value-text {
    font-size: 18px;
    font-weight: 700;
    color: var(--aw-text-primary);
    line-height: 1.2;
  }

  &__sub {
    font-size: 11px;
    color: var(--aw-text-muted);
    white-space: nowrap;
  }
}

@keyframes aw-stat-pulse-glow {
  0%,
  100% {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  }

  50% {
    box-shadow:
      0 4px 20px rgba(239, 68, 68, 0.12),
      0 1px 3px rgba(0, 0, 0, 0.02);
  }
}

@keyframes aw-stat-pulse-sheen {
  0% {
    left: -60%;
  }

  50% {
    left: 160%;
  }

  100% {
    left: 160%;
  }
}

@keyframes aw-stat-pulse-icon {
  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.08);
  }
}

// ── 列表入场过渡 ──
.aw-stack-slide-enter-active,
.aw-stack-slide-leave-active {
  transition: opacity 0.2s ease;
}

.aw-stack-slide-move {
  transition: transform 0.2s ease;
}

.aw-stack-slide-leave-active {
  position: absolute !important;
}

.aw-stack-slide-enter-from,
.aw-stack-slide-leave-to {
  opacity: 0;
}

// ── 仪表盘面板网格 ──
.aw-dashboard {
  display: grid;
  flex: 1 1 auto;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 14px;
  min-height: 0;
}

// ── 通用面板 ──
.aw-panel {
  display: flex;
  flex-direction: column;
  background: var(--aw-panel-bg);
  border: 1px solid var(--aw-panel-border);
  border-radius: var(--aw-radius);
  box-shadow: var(--aw-panel-shadow);
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 12px 14px;
    border-bottom: 1px solid var(--aw-panel-border);
    flex-shrink: 0;
  }

  &__title-group {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  &__title {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: var(--aw-text-primary);
    white-space: nowrap;
  }

  &__stat-badge {
    font-size: 12px;
    color: var(--aw-text-secondary);
    background: var(--aw-bg);
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid var(--aw-panel-border);

    strong {
      color: var(--aw-accent);
      font-weight: 700;
    }
  }

  &__header-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }
}

.aw-inline-action {
  min-width: auto !important;
  height: 22px !important;
  padding: 0 3px !important;
  font-size: 12px !important;
}

.aw-inline-action + .aw-inline-action {
  margin-left: 0 !important;
}

// ── 各面板网格定位 ──
.aw-panel--actions {
  order: 1;
  grid-column: span 12;
  min-height: 410px;
}

.aw-panel--exceptions {
  order: 3;
  grid-column: span 5;
}

.aw-panel--logs {
  order: 5;
  grid-column: span 7;
}

// ── 资产操作芯片 ──
.aw-asset-type-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 6px;
  border-radius: 999px;
  border: 1px solid var(--aw-panel-border);
  background: var(--aw-bg);
  font-size: 12px;
  color: var(--aw-text-secondary);
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: var(--aw-accent);
    color: var(--aw-accent);
  }

  &.is-active {
    border-color: var(--aw-accent);
    background: rgba(13, 148, 136, 0.08);
    color: var(--aw-accent);
  }

  &__name {
    font-weight: 600;
  }

  &__count {
    color: var(--aw-text-muted);
  }
}

// ── 最近设备清单 ──
.aw-recent-assets {
  padding: 8px 12px;
  flex: 1 1 auto;
  overflow-y: auto;
  min-height: 0;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__type-strip {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
  }

  &__title {
    font-size: 12px;
    font-weight: 600;
    color: var(--aw-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 20px;
    min-height: 300px;
  }
}

.aw-asset-card {
  --aw-asset-card-accent: var(--aw-accent);
  display: flex;
  position: relative;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  background: var(--aw-panel-bg);
  flex-direction: column;
  min-height: 138px;
  max-height: 150px;
  overflow: hidden;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.05),
    0 2px 4px -1px rgba(0, 0, 0, 0.03);
  transition:
    transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.25s,
    box-shadow 0.25s;
  cursor: pointer;

  &:hover {
    transform: translateY(-3px);
    border-color: var(--aw-asset-card-accent);
    box-shadow:
      0 10px 25px -5px rgba(0, 0, 0, 0.08),
      0 8px 10px -6px rgba(0, 0, 0, 0.04);
  }

  &__body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    padding: 12px 16px 14px;
    background: linear-gradient(180deg, rgba(248, 250, 252, 0.8) 0%, rgba(255, 255, 255, 1) 100%);
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;

    &-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
  }

  &__reboot-tag {
    font-size: 10px !important;
    padding: 0 6px !important;
    height: 18px !important;
    line-height: 16px !important;

    i {
      font-size: 9px;
    }
  }

  &__edit-btn {
    appearance: none;
    -webkit-appearance: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: 1px solid var(--aw-panel-border);
    border-radius: 999px;
    background: color-mix(in srgb, var(--aw-panel-bg) 82%, #fff);
    color: var(--aw-text-secondary);
    cursor: pointer;
    opacity: 0;
    transition:
      opacity 0.2s ease,
      background 0.15s,
      border-color 0.15s,
      color 0.15s;

    &:hover {
      border-color: var(--aw-asset-card-accent);
      background: color-mix(in srgb, var(--aw-asset-card-accent) 10%, var(--aw-panel-bg));
      color: var(--aw-asset-card-accent);
    }
  }

  &:hover &__edit-btn {
    opacity: 1;
  }

  &__name {
    display: -webkit-box;
    min-height: 1.45em;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.45;
    color: var(--aw-text-primary);
    word-break: break-word;
    overflow: hidden;
    text-overflow: ellipsis;
    -webkit-line-clamp: 1;
    line-clamp: 1;
    -webkit-box-orient: vertical;
  }

  &__os {
    margin-top: auto;
    font-size: 11px;
    font-weight: 500;
    color: var(--aw-text-secondary);
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;

    &-icon {
      font-size: 12px;
      color: var(--aw-text-muted);
      flex-shrink: 0;
    }

    &-distro {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex-shrink: 1;
      color: var(--aw-text-secondary);
    }

    &-version {
      color: var(--aw-text-muted);
      font-weight: 400;
      font-size: 11px;
      flex-shrink: 0;
    }
  }

  &__footer {
    display: flex;
    border-top: 1px solid #cbd5e1;
    background: #f8fafc;
  }

  &__action-btn {
    appearance: none;
    -webkit-appearance: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 34px;
    border: none;
    background: transparent;
    cursor: pointer;
    transition: background 0.15s ease;

    &:hover {
      background: rgba(148, 163, 184, 0.05);
    }

    &.is-loading {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  &__status-indicator {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 600;
    color: var(--aw-text-secondary);
  }

  &__action-btn.is-success &__status-indicator {
    color: var(--aw-success);
  }
  &__action-btn.is-danger &__status-indicator {
    color: var(--aw-danger);
  }
  &__action-btn.is-muted &__status-indicator {
    color: var(--aw-text-muted);
  }

  .aw-status-dot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--aw-text-muted);
    display: inline-block;
  }

  &__action-btn.is-success .aw-status-dot {
    background: var(--aw-success);
    box-shadow: 0 0 6px var(--aw-success);
  }

  &__action-btn.is-danger .aw-status-dot {
    background: var(--aw-danger);
    box-shadow: 0 0 6px var(--aw-danger);
  }
}

// ── 异常与处置 ──
.aw-exception-list {
  display: flex;
  flex-direction: column;
  padding: 6px 8px;
  gap: 8px;
  flex: 1 1 auto;
  overflow-y: auto;
  min-height: 0;

  &__section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__empty {
    padding: 12px 6px;
    font-size: 12px;
    color: var(--aw-text-muted);
    text-align: center;
  }
}

.aw-exception-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--aw-panel-border);
  border-radius: 10px;
  background: var(--aw-panel-bg);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);

  &:hover {
    border-color: rgba(239, 68, 68, 0.35);
    box-shadow: 0 4px 14px -4px rgba(239, 68, 68, 0.12);
    transform: translateY(-1px);
  }

  &__ip {
    min-width: 110px;
    font-size: 12px;
    font-weight: 700;
    color: var(--aw-text-primary);
  }

  &__badge {
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;
    text-align: center;
    white-space: nowrap;

    &.is-danger {
      color: var(--aw-danger);
      background: rgba(239, 68, 68, 0.06);
      border: 1px solid rgba(239, 68, 68, 0.12);
    }
    &.is-warning {
      color: var(--aw-warning);
      background: rgba(245, 158, 11, 0.06);
      border: 1px solid rgba(245, 158, 11, 0.12);
    }
    &.is-success {
      color: var(--aw-success);
      background: rgba(16, 185, 129, 0.06);
      border: 1px solid rgba(16, 185, 129, 0.12);
    }
  }

  &__desc {
    flex: 1;
    min-width: 0;
    font-size: 12px;
    color: var(--aw-text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__actions {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
  }

  &__action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 999px;
    font-size: 12px;
    color: var(--aw-text-muted);
    cursor: pointer;
    transition: all 0.15s;

    &:hover {
      background: rgba(13, 148, 136, 0.1);
      color: var(--aw-accent);
    }
  }
}

// ── 操作记录 ──
.aw-log-list {
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow-y: auto;
  flex: 1 1 auto;
  min-height: 0;
}

.aw-log-item {
  display: grid;
  grid-template-columns: minmax(92px, 1fr) 110px 84px 120px 72px;
  align-items: center;
  column-gap: 10px;
  width: 100%;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--aw-panel-border);
  background: var(--aw-panel-bg);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);

  &:hover {
    border-color: color-mix(in srgb, var(--aw-accent) 35%, var(--aw-panel-border));
    box-shadow: 0 4px 14px -4px color-mix(in srgb, var(--aw-accent) 10%, transparent);
    transform: translateY(-1px);
  }

  &__title {
    font-size: 12px;
    color: var(--aw-text-primary);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__engine,
  &__user {
    font-size: 12px;
    color: var(--aw-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
  }

  &__time {
    font-size: 12px;
    color: var(--aw-text-muted);
    white-space: nowrap;
    text-align: left;
  }

  &__status {
    justify-self: end;
  }
}

// ── 抽屉与通用 ──
.aw-drawer {
  &__toolbar {
    padding: 0 12px 8px;
  }

  &__body {
    padding: 0 4px;
  }
}

.aw-drawer-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.aw-drawer-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 20px;
  padding: 0 8px;
}

.aw-drawer-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--aw-panel-border);
  border-radius: 8px;
  background: var(--aw-panel-bg);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;

  &:hover {
    border-color: var(--aw-accent);
    background: var(--aw-bg);
    transform: translateY(-1px);
  }

  &__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  &__title {
    font-size: 13px;
    color: var(--aw-text-primary);
    min-width: 0;
    flex-shrink: 0;
  }

  &__badge {
    font-size: 11px;
    font-weight: 600;
    flex-shrink: 0;
    padding: 2px 6px;
    border-radius: 4px;

    &.is-danger {
      color: var(--aw-danger);
      background: rgba(239, 68, 68, 0.06);
      border: 1px solid rgba(239, 68, 68, 0.12);
    }
    &.is-warning {
      color: var(--aw-warning);
      background: rgba(245, 158, 11, 0.06);
      border: 1px solid rgba(245, 158, 11, 0.12);
    }
    &.is-success {
      color: var(--aw-success);
      background: rgba(16, 185, 129, 0.06);
      border: 1px solid rgba(16, 185, 129, 0.12);
    }
  }

  &__name {
    font-size: 12px;
    font-weight: 600;
    color: var(--aw-text-primary);
    min-width: 0;
  }

  &__desc {
    font-size: 12px;
    color: var(--aw-text-secondary);
    min-width: 0;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__meta {
    font-size: 12px;
    color: var(--aw-text-muted);
    flex-shrink: 0;
  }

  &__actions {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
    margin-left: auto;
  }

  &__time {
    font-size: 12px;
    color: var(--aw-text-muted);
    flex-shrink: 0;
  }

  &__count {
    font-size: 12px;
    font-weight: 600;
    color: var(--aw-text-muted);
    margin-left: auto;
    flex-shrink: 0;
  }

  &--slim {
    gap: 6px;
    padding: 6px 10px;
  }

  &__edit-btn {
    opacity: 0;
    transition: opacity 0.15s;
    flex-shrink: 0;
  }

  &:hover &__edit-btn {
    opacity: 1;
  }
}

.aw-drawer-row--log {
  display: grid;
  grid-template-columns: minmax(92px, 1fr) 110px 84px 120px 72px;
  align-items: center;
  column-gap: 10px;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);

  &:hover {
    border-color: color-mix(in srgb, var(--aw-accent) 35%, var(--aw-panel-border));
    box-shadow: 0 4px 14px -4px color-mix(in srgb, var(--aw-accent) 10%, transparent);
  }

  .aw-drawer-row__title,
  .aw-drawer-row__engine,
  .aw-drawer-row__user,
  .aw-drawer-row__time {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .aw-drawer-row__engine,
  .aw-drawer-row__user,
  .aw-drawer-row__time {
    font-size: 12px;
    color: var(--aw-text-muted);
  }

  .aw-drawer-row__status {
    justify-self: end;
  }
}

.aw-drawer-row--exception {
  display: grid;
  grid-template-columns: 160px 90px minmax(120px, 1fr) 190px 52px;
  align-items: center;
  column-gap: 10px;

  .aw-drawer-row__title,
  .aw-drawer-row__desc,
  .aw-drawer-row__meta {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .aw-drawer-row__actions {
    margin-left: 0;
    justify-self: end;
  }
}

.aw-drawer-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.aw-drawer-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--aw-panel-border);
  background: var(--aw-bg);
  font-size: 12px;
  color: var(--aw-text-secondary);
  cursor: pointer;
  transition: all 0.12s;

  &:hover {
    border-color: var(--aw-accent);
    color: var(--aw-accent);
  }

  &__count {
    color: var(--aw-text-muted);
    margin-left: 2px;
  }

  &__edit-btn {
    opacity: 0;
    transition: opacity 0.15s;
    margin-left: 4px;
    flex-shrink: 0;
  }

  &:hover &__edit-btn {
    opacity: 1;
  }
}

.aw-drawer-section {
  padding: 10px 12px;

  + .aw-drawer-section {
    border-top: 1px solid var(--aw-panel-border);
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  &__title {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: var(--aw-text-primary);
  }

  &__desc {
    margin: 0 0 10px;
    font-size: 12px;
    color: var(--aw-text-secondary);
  }
}

.aw-drawer-empty {
  padding: 24px 0;
}

.aw-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;

  &__title {
    font-size: 16px;
    font-weight: 600;
    color: var(--aw-text-primary);
    white-space: nowrap;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
  }
}

.aw-drawer__pagination {
  display: flex;
  justify-content: center;
  padding: 12px 0 4px;
}

// ── 暗色主题 ──
html.dark .asset-workbench {
  --aw-bg: #0f172a;
  --aw-panel-bg: rgba(20, 28, 40, 0.94);
  --aw-panel-border: rgba(71, 85, 105, 0.48);
  --aw-panel-shadow: 0 22px 40px rgba(0, 0, 0, 0.3);
  --aw-text-primary: #f1f5f9;
  --aw-text-secondary: #94a3b8;
  --aw-text-muted: #64748b;
  --aw-accent: #5eead4;
  --aw-danger: #f87171;
  --aw-warning: #fbbf24;
  --aw-success: #34d399;
  --aw-info: #60a5fa;
  --aw-violet: #a78bfa;
  --aw-cyan: #22d3ee;
  --aw-gold: #fbbf24;
}

html.dark .asset-workbench .aw-stat:hover,
html.dark .asset-workbench .aw-drawer-row:hover,
html.dark .asset-workbench .aw-log-item:hover {
  background: rgba(30, 41, 59, 0.6);
}

html.dark .asset-workbench .aw-stat--pulsing {
  background: linear-gradient(180deg, rgba(30, 20, 25, 0.94), rgba(127, 29, 29, 0.32));

  &::after {
    background: linear-gradient(90deg, transparent, rgba(248, 113, 113, 0.08), transparent);
  }
}

html.dark .asset-workbench .aw-drawer-row,
html.dark .asset-workbench .aw-log-item {
  background: rgba(15, 23, 42, 0.6);
}

html.dark .asset-workbench .aw-asset-card {
  &__body {
    background: linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 1) 100%);
  }

  &__footer {
    background: rgba(20, 28, 40, 0.88);
  }
}

// ── 响应式 ──
@media (max-width: 1280px) {
  .aw-panel--exceptions {
    grid-column: span 6;
  }

  .aw-panel--logs {
    grid-column: span 12;
  }
}

@media (max-width: 960px) {
  .aw-panel--exceptions {
    grid-column: span 12;
  }

  .aw-stats {
    grid-template-columns: repeat(3, 1fr);
  }

  .aw-log-item,
  .aw-drawer-row--log {
    grid-template-columns: minmax(90px, 1fr) 96px 76px 110px 68px;
  }

  .aw-drawer-row--exception {
    grid-template-columns: 130px 76px minmax(100px, 1fr) 160px 52px;
  }
}

@media (max-width: 720px) {
  .asset-workbench {
    padding: 12px;
  }

  .aw-header__top {
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .aw-header__tools {
    width: 100%;
    order: 3;
    margin-top: 4px;
  }

  .aw-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .aw-log-item,
  .aw-drawer-row--log {
    grid-template-columns: minmax(0, 1fr);
    row-gap: 4px;
  }

  .aw-drawer-row--exception {
    grid-template-columns: minmax(0, 1fr);
    row-gap: 4px;
  }

  .aw-log-item .aw-log-item__status,
  .aw-drawer-row--log .aw-drawer-row__status {
    justify-self: start;
  }

  .aw-drawer-row--exception .aw-drawer-row__actions {
    justify-self: start;
  }
}

@media (max-width: 1366px) {
  .aw-asset-card {
    max-height: none;
  }
  .aw-asset-card__body {
    padding: 10px 12px;
    gap: 6px;
  }

  .aw-exception-row {
    display: grid;
    grid-template-areas:
      "ip badge"
      "desc actions";
    grid-template-columns: 1fr auto;
    row-gap: 6px;
    column-gap: 12px;
    align-items: center;
    padding: 10px 12px;
  }

  .aw-exception-row__ip {
    grid-area: ip;
    min-width: 0;
  }

  .aw-exception-row__badge {
    grid-area: badge;
    justify-self: end;
  }

  .aw-exception-row__desc {
    grid-area: desc;
    min-width: 0;
    margin-right: 0;
  }

  .aw-exception-row__actions {
    grid-area: actions;
    justify-self: end;
  }
}
</style>

<style lang="scss">
.aw-drawer .el-drawer__header {
  margin-bottom: 8px;
}

html.dark .aw-drawer .el-drawer__header {
  color: var(--aw-text-primary);
}
</style>
