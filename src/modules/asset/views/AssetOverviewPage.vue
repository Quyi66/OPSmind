<template>
  <div class="ops-page-layout asset-workbench">
    <!-- ══════════ 头部：标题 + 快捷操作 ══════════ -->
    <section class="aw-header">
      <div class="aw-header__top">
        <div class="aw-header__summary">
          <h2 class="aw-header__title">资产工作台</h2>
        </div>
      </div>

      <!-- ── 统计卡片 ── -->
      <div class="aw-stats">
        <button
          class="aw-stat"
          :class="totalAssets ? 'aw-stat--accent' : 'aw-stat--muted'"
          @click="openAssetListDrawer(selectedAssetTypeCode)"
        >
          <div class="aw-stat__top">
            <div class="aw-stat__content">
              <span class="aw-stat__label">资产总量</span>
              <WbFlipNumber class="aw-stat__value" :value="totalAssets" />
            </div>
            <span class="aw-stat__icon"><i class="fa fa-server" /></span>
          </div>
          <div class="aw-stat__meta">
            <span class="aw-stat__sub">{{ assetTypeCount }} 类资产</span>
            <span class="aw-stat__hint">查看列表</span>
          </div>
        </button>

        <button
          class="aw-stat"
          :class="[
            exceptionDeviceTotal ? 'aw-stat--danger' : 'aw-stat--ok',
            exceptionDeviceTotal ? 'aw-stat--pulsing' : ''
          ]"
          @click="openExceptionDrawer"
        >
          <div class="aw-stat__top">
            <div class="aw-stat__content">
              <span class="aw-stat__label">异常设备</span>
              <WbFlipNumber class="aw-stat__value" :value="exceptionDeviceTotal" />
            </div>
            <span class="aw-stat__icon"><i class="fa fa-exclamation-triangle" /></span>
          </div>
          <div class="aw-stat__meta">
            <span class="aw-stat__sub">连通失败</span>
            <span class="aw-stat__hint">快速排查</span>
          </div>
        </button>

        <button
          class="aw-stat"
          :class="failedLogTotal ? 'aw-stat--warning' : 'aw-stat--muted'"
          @click="openFailedLogDrawer"
        >
          <div class="aw-stat__top">
            <div class="aw-stat__content">
              <span class="aw-stat__label">失败日志</span>
              <WbFlipNumber class="aw-stat__value" :value="failedLogTotal" />
            </div>
            <span class="aw-stat__icon"><i class="fa fa-file-alt" /></span>
          </div>
          <div class="aw-stat__meta">
            <span class="aw-stat__sub">近7天</span>
            <span class="aw-stat__hint">查看详情</span>
          </div>
        </button>

        <button class="aw-stat aw-stat--muted" @click="openGovernanceDrawer">
          <div class="aw-stat__top">
            <div class="aw-stat__content">
              <span class="aw-stat__label">分组 / 标签</span>
              <span class="aw-stat__value">{{ groupCount }} / {{ tagTotal }}</span>
            </div>
            <span class="aw-stat__icon"><i class="fa fa-code-branch" /></span>
          </div>
          <div class="aw-stat__meta">
            <span class="aw-stat__sub">{{ governanceStats.permissionTeamCount }} 个团队</span>
            <span class="aw-stat__hint">管理</span>
          </div>
        </button>

        <button
          class="aw-stat"
          :class="connectionStats.totalConnection ? 'aw-stat--accent' : 'aw-stat--muted'"
          @click="openAssetListDrawer(selectedAssetTypeCode)"
        >
          <div class="aw-stat__top">
            <div class="aw-stat__content">
              <span class="aw-stat__label">连通率</span>
              <span class="aw-stat__value">
                {{ connectionStats.totalConnection ? `${connectionStats.successRate}%` : '--' }}
              </span>
            </div>
            <span class="aw-stat__icon"><i class="fa fa-plug" /></span>
          </div>
          <div class="aw-stat__meta">
            <span class="aw-stat__sub">
              {{ formatCount(connectionStats.successCount) }} 正常 /
              {{ formatCount(connectionStats.failureCount) }} 异常
            </span>
            <span class="aw-stat__hint">查看资产</span>
          </div>
        </button>

        <button class="aw-stat aw-stat--muted" @click="openRecentLogsDrawer">
          <div class="aw-stat__top">
            <div class="aw-stat__content">
              <span class="aw-stat__label">操作记录</span>
              <WbFlipNumber class="aw-stat__value" :value="recentOperationTotal" />
            </div>
            <span class="aw-stat__icon"><i class="fa fa-history" /></span>
          </div>
          <div class="aw-stat__meta">
            <span class="aw-stat__sub">近7天</span>
            <span class="aw-stat__hint">浏览</span>
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
              <i class="fa fa-plus" /> 录入
            </el-button>
            <el-button
              class="aw-inline-action"
              link
              type="primary"
              size="small"
              @click="importDialogVisible = true"
            >
              <i class="fa fa-file-import" /> 导入
            </el-button>
            <el-button
              class="aw-inline-action"
              link
              type="primary"
              size="small"
              @click="exportDialogVisible = true"
            >
              <i class="fa fa-file-export" /> 导出
            </el-button>
          </div>
        </div>

        <!-- 资产列表预览（按选中类型） -->
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
            <article v-for="item in cardAssets" :key="item.id" class="aw-asset-card" @click="handleViewAssetDetail(item)">
              <div class="aw-asset-card__body">
                <div class="aw-asset-card__head">
                  <el-tag size="small" effect="dark" :type="getAssetStatusTagType(item.status)">
                    {{ getAssetStatusText(item.status) }}
                  </el-tag>
                  <button type="button" class="aw-asset-card__edit-btn" title="编辑" @click.stop="handleViewAssetDetail(item)">
                    <el-icon><Edit /></el-icon>
                  </button>
                </div>
                <strong class="aw-asset-card__name">{{ getAssetPrimaryText(item) }}</strong>
                <span class="aw-asset-card__meta">{{ getAssetBusinessText(item) }}</span>
                <span class="aw-asset-card__os" :class="getOsDistroClass(item.os_distro)">{{ getAssetOsText(item) }}</span>
              </div>
              <div class="aw-asset-card__footer">
                <button
                  type="button"
                  class="aw-asset-card__chip"
                  :class="[getConnToneClass(item.CONN_LATEST_STATUS), { 'is-loading': checkingConnIds.includes(item.id) }]"
                  :disabled="checkingConnIds.includes(item.id)"
                  @click.stop="handleAssetCheckConn(item)"
                >
                  <i v-if="checkingConnIds.includes(item.id)" class="fa fa-spinner fa-spin" />
                  {{ getConnStatusText(item.CONN_LATEST_STATUS) }}
                </button>
                <span class="aw-asset-card__chip" :class="item.needReboot == 1 ? 'is-danger' : 'is-success'">
                  {{ item.needReboot == 1 ? '需重启' : '无需重启' }}
                </span>
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
            <h3 class="aw-panel__title">异常设备</h3>
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
            <div
              v-if="exceptionPreviewItems.length"
              class="aw-exception-list__body"
            >
              <button
                v-for="item in exceptionPreviewItems"
                :key="item.key"
                type="button"
                class="aw-exception-row"
                @click="openExceptionDrawer"
              >
                <span class="aw-exception-row__ip">{{ item.title }}</span>
                <span class="aw-exception-row__badge">{{ item.badge }}</span>
                <span class="aw-exception-row__desc">{{ item.desc }}</span>
                <span class="aw-exception-row__actions">
                  <i class="fa fa-plug aw-exception-row__action" title="检查连通性" @click.stop="handleExceptionCheckConn(item.raw)" />
                  <i class="fa fa-download aw-exception-row__action" title="采集信息" @click.stop="handleExceptionCollectInfo(item.raw)" />
                </span>
              </button>
            </div>
            <div v-else class="aw-exception-list__empty">暂无异常设备</div>
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
            v-for="item in recentLogs.slice(0, 5)"
            :key="item.run_id"
            type="button"
            class="aw-log-item"
            @click="handleLogItemClick(item)"
          >
            <div class="aw-log-item__main">
              <strong class="aw-log-item__title">{{ getOperationActionLabel(item.action) }}</strong>
              <span class="aw-log-item__meta">
                {{ item.ata_node || '--' }} · {{ item.username || '--' }}
              </span>
            </div>
            <div class="aw-log-item__side">
              <el-tag
                size="small"
                :type="
                  item.status === 'ERROR'
                    ? 'danger'
                    : item.status === 'RUNNING'
                      ? 'warning'
                      : 'success'
                "
                effect="plain"
              >
                {{ getRunLogStatusLabel(item.status) }}
              </el-tag>
              <span class="aw-log-item__time">{{ formatDateTimeShort(item.start_time) }}</span>
            </div>
          </button>
        </transition-group>
        <el-empty v-else description="暂无操作记录" :image-size="48" />
      </section>
    </div>

    <!-- ══════════ 弹窗 ══════════ -->
    <AutoEntryDialog v-model="autoEntryDialogVisible" @saved="handleDialogSaved" />
    <ImportAssetDialog v-model="importDialogVisible" :tenant-id="currentTenantId" @saved="handleDialogSaved" />
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

    <!-- 资产列表抽屉 -->
    <el-drawer
      v-model="assetListDrawer.visible"
      :title="assetListDrawerTitle"
      size="75%"
      class="aw-drawer aw-drawer--asset-list"
    >
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
                  <el-tag size="small" effect="dark" :type="getAssetStatusTagType(item.status)">
                    {{ getAssetStatusText(item.status) }}
                  </el-tag>
                  <button type="button" class="aw-asset-card__edit-btn" title="编辑" @click.stop="handleViewAssetDetail(item)">
                    <el-icon><Edit /></el-icon>
                  </button>
                </div>
                <strong class="aw-asset-card__name">{{ getAssetPrimaryText(item) }}</strong>
                <span class="aw-asset-card__meta">{{ getAssetBusinessText(item) }}</span>
                <span class="aw-asset-card__os" :class="getOsDistroClass(item.os_distro)">{{ getAssetOsText(item) }}</span>
              </div>
              <div class="aw-asset-card__footer">
                <button
                  type="button"
                  class="aw-asset-card__chip"
                  :class="[getConnToneClass(item.CONN_LATEST_STATUS), { 'is-loading': checkingConnIds.includes(item.id) }]"
                  :disabled="checkingConnIds.includes(item.id)"
                  @click.stop="handleAssetCheckConn(item)"
                >
                  <i v-if="checkingConnIds.includes(item.id)" class="fa fa-spinner fa-spin" />
                  {{ getConnStatusText(item.CONN_LATEST_STATUS) }}
                </button>
                <span class="aw-asset-card__chip" :class="item.needReboot == 1 ? 'is-danger' : 'is-success'">
                  {{ item.needReboot == 1 ? '需重启' : '无需重启' }}
                </span>
              </div>
            </article>
          </div>
          <el-empty v-else description="暂无资产" :image-size="60" />
        </template>
        <div v-if="assetListDrawer.total > assetListDrawer.pageSize" class="aw-drawer__pagination">
          <el-pagination
            v-model:current-page="assetListDrawer.page"
            :page-size="assetListDrawer.pageSize"
            :total="assetListDrawer.total"
            layout="prev, pager, next"
            background
            small
            @current-change="handleAssetListPageChange"
          />
        </div>
      </div>
    </el-drawer>

    <el-drawer v-model="exceptionDrawer.visible" size="520px" class="aw-drawer">
      <template #header>
        <div class="aw-drawer-header">
          <span class="aw-drawer-header__title">异常设备</span>
          <div class="aw-drawer-header__actions">
            <el-button
              class="aw-inline-action"
              link
              type="primary"
              size="small"
              :loading="exceptionDrawer.actionLoading"
              @click="handleExceptionBulkCheckConn"
            >
              <i class="fa fa-plug" /> 全设备连通性检查
            </el-button>
            <el-button
              class="aw-inline-action"
              link
              type="primary"
              size="small"
              :loading="exceptionDrawer.actionLoading"
              @click="handleExceptionBulkCollect"
            >
              <i class="fa fa-download" /> 全设备采集信息
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
              class="aw-drawer-row"
              @click="handleExceptionDeviceRowClick(item.raw || item)"
            >
              <strong class="aw-drawer-row__title">{{ item.title }}</strong>
              <span class="aw-drawer-row__badge">{{ item.badge }}</span>
              <span class="aw-drawer-row__desc">{{ item.desc }}</span>
              <span class="aw-drawer-row__meta">{{ item.meta }}</span>
              <span class="aw-drawer-row__actions">
                <i class="fa fa-plug aw-exception-row__action" title="检查连通性" @click.stop="handleExceptionCheckConn(item.raw || item)" />
                <i class="fa fa-download aw-exception-row__action" title="采集信息" @click.stop="handleExceptionCollectInfo(item.raw || item)" />
              </span>
            </button>
          </div>
          <el-empty v-else description="暂无异常设备" :image-size="60" />
        </template>
        <div v-if="exceptionDrawer.total > exceptionDrawer.pageSize" class="aw-drawer__pagination">
          <el-pagination
            v-model:current-page="exceptionDrawer.page"
            :page-size="exceptionDrawer.pageSize"
            :total="exceptionDrawer.total"
            layout="prev, pager, next"
            background
            small
            @current-change="handleExceptionPageChange"
          />
        </div>
      </div>
    </el-drawer>

    <el-drawer v-model="failedLogDrawer.visible" title="失败日志" size="520px" class="aw-drawer">
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

    <el-drawer
      v-model="recentLogsDrawer.visible"
      title="近7天操作记录"
      size="560px"
      class="aw-drawer"
    >
      <div v-loading="recentLogsDrawer.loading" class="aw-drawer__body">
        <template v-if="!recentLogsDrawer.loading">
          <div v-if="recentLogsDrawer.records.length" class="aw-drawer-list">
            <button
              v-for="item in recentLogsDrawer.records"
              :key="item.run_id"
              type="button"
              class="aw-drawer-row"
              @click="handleLogItemClick(item)"
            >
              <strong class="aw-drawer-row__title">
                {{ getOperationActionLabel(item.action) }}
              </strong>
              <el-tag
                size="small"
                :type="
                  item.status === 'ERROR'
                    ? 'danger'
                    : item.status === 'RUNNING'
                      ? 'warning'
                      : 'success'
                "
                effect="plain"
              >
                {{ getRunLogStatusLabel(item.status) }}
              </el-tag>
              <span class="aw-drawer-row__meta">
                {{ item.ata_node || '--' }} · {{ item.username || '--' }}
              </span>
              <span class="aw-drawer-row__time">{{ formatDateTime(item.start_time) }}</span>
            </button>
          </div>
          <div v-else class="aw-drawer-empty">
            <el-empty description="暂无操作记录" :image-size="60" />
          </div>
        </template>
        <div v-if="recentLogsDrawer.total > recentLogsDrawer.pageSize" class="aw-drawer__pagination">
          <el-pagination
            v-model:current-page="recentLogsDrawer.page"
            :page-size="recentLogsDrawer.pageSize"
            :total="recentLogsDrawer.total"
            layout="prev, pager, next"
            background
            small
            @current-change="handleRecentLogsPageChange"
          />
        </div>
      </div>
    </el-drawer>

    <el-drawer
      v-model="governanceDrawer.visible"
      title="分组与标签概览"
      size="520px"
      class="aw-drawer"
    >
      <div v-loading="governanceDrawer.loading" class="aw-drawer__body">
        <template v-if="!governanceDrawer.loading">
          <div class="aw-drawer-section">
            <div class="aw-drawer-section__header">
              <h4 class="aw-drawer-section__title">分组 ({{ groupRows.length }})</h4>
              <el-button class="aw-inline-action" link type="primary" size="small" @click="addGroupDialogVisible = true">
                <i class="fa fa-plus" /> 新增
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
                <el-button text type="primary" size="small" class="aw-drawer-row__edit-btn" @click.stop="handleEditGroup(item)">
                  <i class="fa fa-pen" />
                </el-button>
              </button>
            </div>
          </div>
          <div class="aw-drawer-section">
            <div class="aw-drawer-section__header">
              <h4 class="aw-drawer-section__title">标签 ({{ tagRows.length }})</h4>
              <el-button class="aw-inline-action" link type="primary" size="small" @click="addTagDialogVisible = true">
                <i class="fa fa-plus" /> 新增
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
                <el-button text type="primary" size="small" class="aw-drawer-tag__edit-btn" @click.stop="handleEditTag(item)">
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
    <DataEditGroupDialog v-model="editGroupDialogVisible" :group-data="currentGroupItem" @saved="handleGovernanceSaved" />
    <DataEditTagDialog v-model="editTagDialogVisible" :tag-data="currentTagItem" @saved="handleGovernanceSaved" />
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
  handleViewAssetDetail,
  openExceptionDrawer,
  handleExceptionPageChange,
  openFailedLogDrawer,
  handleFailedLogClick,
  openRecentLogsDrawer,
  handleRecentLogsPageChange,
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

function handleEditGroup(item) {
  currentGroupItem.value = item
  editGroupDialogVisible.value = true
}
function handleEditTag(item) {
  currentTagItem.value = item
  editTagDialogVisible.value = true
}
function handleGovernanceSaved() {
  refreshAll()
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
function getAssetBusinessText(item) {
  return item?.业务系统 || item?.system_name || item?.ci_name || item?.name || '未命名资产'
}
function getAssetOsText(item) {
  const parts = [item?.os_distro, item?.os_version].filter(Boolean)
  return parts.length ? parts.join(' · ') : '未识别系统'
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
  if (value.includes('centos') || value.includes('redhat') || value.includes('red hat') || value.includes('rhel')) return 'is-redhat'
  if (value.includes('oracle')) return 'is-oracle'
  if (value.includes('suse')) return 'is-suse'
  if (value.includes('windows')) return 'is-windows'
  return 'is-unknown'
}
function getOperationActionLabel(a) {
  if (!a) return '未知操作'
  return translateI18nKey(a)
}
function formatOperationMessage(m) {
  if (!m) return '无失败详情'
  try {
    const p = typeof m === 'string' ? JSON.parse(m) : m
    return p?.exception?.message || p?.message || p?.msg_id || JSON.stringify(p)
  } catch {
    return String(m)
  }
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
  exceptionPreviewRows.value.map(r => ({
    key: r.IP || r.ci_name || `${r.updated_at || ''}-${r.CONN_RATE || ''}`,
    title: r.IP || '未识别 IP',
    badge: formatConnRate(r.CONN_RATE),
    desc: r.ci_name || '未命名资产',
    meta: `${getConnStatusText(r.CONN_LATEST_STATUS)} · ${formatDateTimeShort(r.updated_at)}`,
    raw: r
  }))
)

const failedLogPreviewItems = computed(() =>
  failedLogRows.value.map(r => ({
    key: r.run_id || `${r.start_time || ''}-${r.action || ''}`,
    title: getOperationActionLabel(r.action),
    badge: formatDateTimeShort(r.start_time),
    desc: formatOperationMessage(r.message),
    meta: `${r.ata_node || '--'} · ${r.username || '--'}`,
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
      `/jao/api/jao/jobs/M1x855/run?cacheBuster=${Date.now()}`,
      { params: { hosts: [host] } }
    )
    const result = Array.isArray(data) ? data[0] : data
    if (result?.status === 'WAITING' || result?.status === 'RUNNING') {
      ElMessage.success('检查连通性任务已发起')
      pollJobStatus(result.runId, {
        interval: 5000,
        successMessage: '连通性检查完成',
        errorMessage: '连通性检查失败',
        onSuccess: () => { removeCheckingId(item.id); switchCardType(selectedAssetTypeCode.value) },
        onError: () => { removeCheckingId(item.id) },
        onComplete: () => { removeCheckingId(item.id) }
      })
    } else if (result?.status === 'COMPLETED' || result?.status === 'SUCCESS') {
      ElMessage.success('连通性检查完成')
      removeCheckingId(item.id)
      switchCardType(selectedAssetTypeCode.value)
    } else if (result?.status === 'FAILED' || result?.status === 'ERROR') {
      removeCheckingId(item.id)
      ElMessage.error(result?.error || '连通性检查失败')
    } else {
      ElMessage.success('检查连通性任务已启动')
      removeCheckingId(item.id)
    }
  } catch (error) {
    removeCheckingId(item.id)
    ElMessage.error('连通性检查失败: ' + (error.response?.data?.message || error.message))
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
    cardAssets.value = (res?.records || []).slice(0, cardPreviewLimit.value)
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
      { cit: 'oplus_all', conditions: 'recently', param: 'rwx' },
      { page: 1, size: 6 }
    )
    exceptionPreviewRows.value = r?.records || []
    exceptionDeviceTotal.value = r?.total || exceptionPreviewRows.value.length
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
    await ElMessageBox.confirm(`信息采集将花费几分钟到半小时不等的时间，是否对主机 ${ip} 进行采集？`, '采集信息', {
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
      `/jao/api/jao/jobs/mjedwe/run?cacheBuster=${Date.now()}`,
      { params: { hosts: [host] } }
    )
    const result = Array.isArray(data) ? data[0] : data
    if (result?.runId) {
      ElMessage.success('采集信息任务已发起')
      loadAllData()
    } else {
      ElMessage.success('采集信息任务已发起')
      loadAllData()
    }
  } catch (error) {
    ElMessage.error('采集信息启动失败: ' + (error.response?.data?.message || error.message))
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
      `/jao/api/jao/jobs/M1x855/run?cacheBuster=${Date.now()}`,
      { params: { hosts: [host] } }
    )
    const result = Array.isArray(data) ? data[0] : data
    if (result?.runId) {
      ElMessage.success('检查连通性任务已发起')
      loadAllData()
    } else {
      ElMessage.success('检查连通性任务已发起')
      loadAllData()
    }
  } catch (error) {
    ElMessage.error('检查连通性失败: ' + (error.response?.data?.message || error.message))
  }
}

// ── 异常设备批量操作 ──
async function runExceptionBulkAction(jobId, actionName) {
  const total = exceptionDrawer.total
  if (!total) {
    ElMessage.warning('没有异常设备可操作')
    return
  }
  try {
    await ElMessageBox.confirm(`将对全部 ${total} 台异常设备${actionName}，此操作可能需要一段时间。`, '确认操作', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  exceptionDrawer.actionLoading = true
  try {
    const res = await exceptionApi.getExceptionDevices(
      { cit: 'oplus_all', conditions: 'recently', param: 'rwx' },
      { page: 1, size: total }
    )
    const allRows = res?.records || []
    const hosts = allRows.map(row => ({
      key: row.id || row.key || row.IP || '',
      value: row.IP || row.ip || '',
      assetType: 'linux'
    }))
    if (!hosts.length) {
      ElMessage.warning('没有异常设备可操作')
      return
    }
    const { data } = await apiService.post(
      `/jao/api/jao/jobs/${jobId}/run?cacheBuster=${Date.now()}`,
      { params: { hosts } }
    )
    ElMessage.success(`全设备${actionName}任务已发起`)
    loadAllData()
  } catch (error) {
    ElMessage.error(`${actionName}失败: ` + (error.response?.data?.message || error.message))
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
      { module: 'acm', action: 'all', status: 'ERROR', day: 7 },
      { page: 1, size: 5 }
    )
    failedLogRows.value = r?.records || []
    failedLogTotal.value = r?.total || failedLogRows.value.length
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

async function loadAllData() {
  await Promise.allSettled([refreshAll(), loadExceptionPreview(), loadFailedLogPreview()])
  tagTotal.value = tagRows.value.length
  refreshedAt.value = new Date()
}

// ── 交互 ──

function handleDialogSaved() {
  loadAllData()
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
  loadAllData()
  loadCurrentTenantId()
})

onUnmounted(() => {
  window.removeEventListener('resize', syncViewportWidth)
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
  --aw-panel-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px -4px rgba(0, 0, 0, 0.06);
  --aw-radius: 8px;
  --aw-text-primary: #1e293b;
  --aw-text-secondary: #64748b;
  --aw-text-muted: #94a3b8;
  --aw-accent: #0d9488;
  --aw-danger: #ef4444;
  --aw-warning: #f59e0b;
  --aw-success: #22c55e;
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
  min-height: 100vh;
  box-sizing: border-box;
}

@supports (min-height: 100dvh) {
  .asset-workbench {
    min-height: 100dvh;
  }
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
  font-size: 11px;
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

// ── 统计卡片 ──
.aw-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(164px, 1fr));
  gap: 10px;
}

.aw-stat {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  padding: 12px 14px;
  background: var(--aw-panel-bg);
  border: 1px solid var(--aw-panel-border);
  border-radius: var(--aw-radius);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 0;
  box-shadow: var(--aw-panel-shadow);
  text-align: left;
  position: relative;
  overflow: hidden;

  &:hover {
    border-color: rgba(13, 148, 136, 0.4);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.07);
    transform: translateY(-1px);
  }

  &__top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__label {
    font-size: 11px;
    font-weight: 600;
    color: var(--aw-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  &__value {
    font-size: 24px;
    font-weight: 700;
    color: var(--aw-text-primary);
    line-height: 1.1;

    .wb-flip-number {
      color: inherit;
    }
  }

  &__icon {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 999px;
    font-size: 15px;
  }

  &__meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  &__sub {
    font-size: 11px;
    color: var(--aw-text-muted);
  }

  &__hint {
    font-size: 11px;
    font-weight: 700;
    color: var(--aw-accent);
    opacity: 0;
    padding: 2px 10px;
    border-radius: 999px;
    background: rgba(13, 148, 136, 0.1);
    transition: opacity 0.2s;
  }

  &:hover &__hint {
    opacity: 1;
  }

  // ── 变体：全面着色 ──
  &--accent {
    .aw-stat__icon {
      background: rgba(13, 148, 136, 0.12);
      color: var(--aw-accent);
    }
    &.aw-stat__value {
      color: var(--aw-accent);
    }
    .aw-stat__value {
      color: var(--aw-accent);
    }
  }

  &--danger {
    .aw-stat__icon {
      background: rgba(239, 68, 68, 0.12);
      color: var(--aw-danger);
    }
    .aw-stat__value {
      color: var(--aw-danger);
    }
    .aw-stat__hint {
      color: var(--aw-danger);
      background: rgba(239, 68, 68, 0.1);
    }
  }

  &--warning {
    .aw-stat__icon {
      background: rgba(245, 158, 11, 0.12);
      color: var(--aw-warning);
    }
    .aw-stat__value {
      color: var(--aw-warning);
    }
    .aw-stat__hint {
      color: var(--aw-warning);
      background: rgba(245, 158, 11, 0.1);
    }
  }

  &--ok {
    .aw-stat__icon {
      background: rgba(34, 197, 94, 0.12);
      color: var(--aw-success);
    }
    .aw-stat__value {
      color: var(--aw-success);
    }
    .aw-stat__hint {
      color: var(--aw-success);
      background: rgba(34, 197, 94, 0.1);
    }
  }

  &--muted {
    .aw-stat__icon {
      background: rgba(148, 163, 184, 0.12);
      color: var(--aw-text-muted);
    }
    .aw-stat__hint {
      color: var(--aw-text-muted);
      background: rgba(148, 163, 184, 0.1);
    }
  }

  // ── 脉冲动画（异常卡片有值时触发）──
  &--pulsing {
    background: linear-gradient(180deg, var(--aw-panel-bg), rgba(239, 68, 68, 0.04));
    animation: aw-stat-pulse-glow 2.4s ease-in-out infinite;

    .aw-stat__icon {
      animation: aw-stat-pulse-icon 2.4s ease-in-out infinite;
    }

    .aw-stat__hint {
      background: rgba(239, 68, 68, 0.14);
    }

    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: -60%;
      width: 60%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
      transform: skewX(-20deg);
      animation: aw-stat-pulse-sheen 2.4s ease-in-out infinite;
    }
  }
}

@keyframes aw-stat-pulse-glow {
  0%,
  100% {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }
  50% {
    box-shadow:
      0 4px 20px rgba(239, 68, 68, 0.2),
      0 1px 3px rgba(0, 0, 0, 0.04);
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
    transform: scale(1.12);
  }
}

// ── 列表入场过渡（无布局抖动） ──
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
  grid-template-rows: auto minmax(0, 1fr);
  gap: 14px;
  min-height: 0;
  align-content: stretch;
  align-items: stretch;
}

// ── 通用面板 ──
.aw-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
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
    font-size: 11px;
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
    gap: 8px;
    flex-shrink: 0;

    :deep(.el-button + .el-button) {
      margin-left: 0 !important;
    }
  }

  &__pill {
    padding: 2px 10px;
    border-radius: 999px;
    background: var(--aw-bg);
    border: 1px solid var(--aw-panel-border);
    font-size: 11px;
    font-weight: 600;
    color: var(--aw-accent);
    white-space: nowrap;
  }
}

.aw-inline-action.el-button {
  min-width: auto !important;
  min-height: auto !important;
  height: 22px !important;
  padding: 0 3px !important;
  font-size: 12px !important;
  line-height: 1 !important;
}

.aw-inline-action.el-button + .aw-inline-action.el-button {
  margin-left: 0 !important;
}

// ── 资产操作面板 (span 12) ──
.aw-panel--actions {
  order: 1;
  grid-column: span 12;

  .aw-panel__header-actions {
    gap: 2px;
  }
}

.aw-asset-type-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 6px;
  border-radius: 999px;
  border: 1px solid var(--aw-panel-border);
  background: var(--aw-bg);
  font-size: 11px;
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

  &--more {
    border-style: dashed;
    color: var(--aw-text-muted);
    font-weight: 600;

    &:hover {
      border-color: var(--aw-accent);
      color: var(--aw-accent);
    }
  }
}

// ── 趋势与分布面板 (span 7) ──
.aw-panel--analytics {
  order: 2;
  grid-column: span 7;
  min-height: 400px;
}

.aw-analytics-tabs {
  display: flex;
  gap: 4px;
}

.aw-analytics-tab {
  appearance: none;
  padding: 4px 10px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--aw-text-secondary);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    color: var(--aw-accent);
  }

  &.is-active {
    border-color: var(--aw-panel-border);
    background: var(--aw-bg);
    color: var(--aw-accent);
  }
}

.aw-analytics-stage {
  flex: 1;
  min-height: 0;
  padding: 0;
}

.aw-chart-frame {
  height: 100%;
  min-height: 340px;

  :deep(.chart-card) {
    height: 100%;
    padding: 10px 14px 14px;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }

  :deep(.chart-container) {
    min-height: 280px;
  }

  :deep(.chart-header) {
    margin-bottom: 6px;
  }
}

// ── 异常与处置面板 (span 5) ──
.aw-panel--exceptions {
  order: 3;
  grid-column: span 5;
}

.aw-exception-list {
  display: flex;
  flex-direction: column;
  padding: 6px 8px;
  gap: 8px;

  &__section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 2px 6px;
    font-size: 11px;
    font-weight: 600;
    color: var(--aw-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  &__count {
    font-size: 11px;
    font-weight: 700;
    color: var(--aw-danger);
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
    font-weight: 700;
    color: var(--aw-danger);
    background: rgba(239, 68, 68, 0.08);
    padding: 3px 8px;
    border-radius: 6px;
    border: 1px solid rgba(239, 68, 68, 0.16);
    text-align: center;
    min-width: 42px;
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
    font-size: 11px;
    color: var(--aw-text-muted);
    cursor: pointer;
    transition: all 0.15s;

    &:hover {
      background: rgba(13, 148, 136, 0.1);
      color: var(--aw-accent);
    }
  }
}

// ── 最近资产列表 ──
.aw-recent-assets {
  padding: 8px 12px;

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
    font-size: 11px;
    font-weight: 600;
    color: var(--aw-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 10px;
    min-height: 300px;
  }
}

.aw-asset-card {
  --aw-asset-card-accent: var(--aw-accent);
  display: flex;
  position: relative;
  border: 1px solid var(--aw-panel-border);
  border-radius: 16px;
  background: var(--aw-panel-bg);
  flex-direction: column;
  min-height: 138px;
  overflow: hidden;
  box-shadow: 0 16px 32px -24px rgba(15, 23, 42, 0.42);
  transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
  cursor: pointer;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, var(--aw-asset-card-accent), rgba(255, 255, 255, 0));
  }

  &:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--aw-asset-card-accent) 38%, var(--aw-panel-border));
    box-shadow: 0 20px 38px -28px rgba(15, 23, 42, 0.58);
  }

  &__body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    padding: 12px 16px 14px;
    background: linear-gradient(180deg, var(--el-fill-color-light) 0%, var(--el-fill-color-extra-light) 100%);
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  &__edit-btn {
    appearance: none;
    -webkit-appearance: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: 1px solid var(--aw-panel-border);
    border-radius: 999px;
    background: color-mix(in srgb, var(--aw-panel-bg) 82%, #fff);
    color: var(--aw-text-secondary);
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;

    &:hover {
      border-color: var(--aw-asset-card-accent);
      background: color-mix(in srgb, var(--aw-asset-card-accent) 10%, var(--aw-panel-bg));
      color: var(--aw-asset-card-accent);
    }
  }

  &__name {
    display: -webkit-box;
    min-height: 1.45em;
    font-size: 15px;
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

  &__meta,
  &__os {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--aw-text-muted);
  }

  &__meta {
    font-size: 12px;
  }

  &__os {
    margin-top: auto;
    font-size: 12px;
    font-weight: 600;
    color: var(--aw-text-secondary);

    &.is-debian {
      color: #2563eb;
    }

    &.is-redhat {
      color: #dc2626;
    }

    &.is-oracle {
      color: #c2410c;
    }

    &.is-suse {
      color: #16a34a;
    }

    &.is-windows {
      color: #0284c7;
    }

    &.is-unknown {
      color: var(--aw-text-muted);
    }
  }

  &__footer {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    border-top: 1px solid var(--aw-panel-border);
    background: color-mix(in srgb, var(--aw-panel-bg) 88%, #fff);
  }

  &__chip {
    appearance: none;
    -webkit-appearance: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-width: 0;
    height: 38px;
    padding: 0 8px;
    border: none;
    border-right: 1px solid var(--aw-panel-border);
    background: transparent;
    font-size: 12px;
    font-weight: 600;
    color: var(--aw-text-secondary);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;

    &:last-child {
      border-right: none;
    }

    &:hover {
      background: color-mix(in srgb, var(--aw-accent) 6%, transparent);
    }

    &.is-success {
      color: var(--aw-success);
    }

    &.is-danger {
      color: var(--aw-danger);
    }

    &.is-muted {
      color: var(--aw-text-muted);
    }

    &.is-loading {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}

// ── 分组与标签面板 (span 5) ──
.aw-panel--governance {
  order: 4;
  grid-column: span 5;
}

.aw-governance-section {
  padding: 10px 14px;

  + .aw-governance-section {
    border-top: 1px solid var(--aw-panel-border);
    padding-top: 10px;
  }

  &__title {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: var(--aw-text-muted);
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
}

.aw-governance-list {
  display: grid;
  gap: 4px;
}

.aw-governance-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background 0.12s;
  text-align: left;

  &:hover {
    background: var(--aw-bg);
  }

  &__icon {
    font-size: 13px;
    color: #e6a23c;
    flex-shrink: 0;
  }

  &__name {
    flex: 1;
    min-width: 0;
    font-size: 12px;
    font-weight: 600;
    color: var(--aw-text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__count {
    font-size: 11px;
    font-weight: 600;
    color: var(--aw-text-muted);
    flex-shrink: 0;
  }
}

.aw-governance-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.aw-governance-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid var(--aw-panel-border);
  background: var(--aw-bg);
  font-size: 11px;
  color: var(--aw-text-secondary);
  cursor: pointer;
  transition: all 0.12s;

  &:hover {
    border-color: var(--aw-accent);
    color: var(--aw-accent);
  }

  &__icon {
    font-size: 10px;
  }

  &__count {
    color: var(--aw-text-muted);
    margin-left: 2px;
  }
}

// ── 操作记录面板 (span 7，与异常处置面板共占一行) ──
.aw-panel--logs {
  order: 5;
  grid-column: span 7;
}

.aw-log-list {
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow-y: auto;
}

.aw-log-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
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

  &__main {
    min-width: 0;
    flex: 1;
  }

  &__title {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--aw-text-primary);
    line-height: 1.4;
  }

  &__meta {
    display: block;
    font-size: 11px;
    color: var(--aw-text-muted);
    margin-top: 2px;
  }

  &__side {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  &__time {
    font-size: 11px;
    color: var(--aw-text-muted);
    white-space: nowrap;
  }
}

// ── 抽屉样式 ──
.aw-drawer {
  :deep(.el-drawer__header) {
    margin-bottom: 8px;
  }

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
  gap: 10px;
  padding: 0 8px;
}

.aw-drawer-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  position: relative;
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--aw-panel-border);
  border-radius: 8px;
  background: var(--aw-panel-bg);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;

  &:hover {
    border-color: var(--aw-accent);
    background: var(--aw-bg);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(13, 148, 136, 0.06);
  }

  &__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  &__title {
    font-size: 13px;
    font-weight: 700;
    color: var(--aw-text-primary);
    min-width: 0;
    flex-shrink: 0;
  }

  &__badge {
    font-size: 12px;
    font-weight: 700;
    color: var(--aw-danger);
    flex-shrink: 0;
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
    font-size: 11px;
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
    font-size: 11px;
    color: var(--aw-text-muted);
    flex-shrink: 0;
  }

  &__count {
    font-size: 11px;
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
html.dark .asset-workbench .aw-action-card:hover,
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

// ── 响应式 ──
@media (max-width: 1280px) {
  .aw-panel--analytics {
    grid-column: span 12;
  }
  .aw-panel--exceptions {
    grid-column: span 6;
  }
  .aw-panel--governance {
    grid-column: span 6;
  }
  .aw-panel--logs {
    grid-column: span 12;
  }
}

@media (max-width: 960px) {
  .aw-panel--exceptions,
  .aw-panel--governance {
    grid-column: span 12;
  }

  .aw-stats {
    grid-template-columns: repeat(3, 1fr);
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

  .aw-metric-grid {
    grid-template-columns: 1fr;
  }
  .aw-signal-strip {
    grid-template-columns: 1fr;
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
