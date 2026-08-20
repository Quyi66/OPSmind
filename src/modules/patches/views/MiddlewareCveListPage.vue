<template>
  <div class="ops-page-layout ops-page-layout--page-scroll middleware-page">
    <div class="stats-bar" v-loading="overviewLoading">
      <!-- 漏洞处置状态 -->
      <div class="stats-group">
        <div class="stats-group__header">
          <div class="stats-group__title-box">
            <span class="stats-group__indicator stats-group__indicator--status"></span>
            <span class="stats-group__title">漏洞处置状态</span>
          </div>
          <span class="stats-group__subtitle">生命周期流转</span>
        </div>
        <div class="stats-group__cards stats-group__cards--status">
          <button
            type="button"
            class="stat-card stat-card--open"
            @click="openVulnerabilityView({ fixStatus: 'open' })"
          >
            <div class="stat-card__top">
              <div class="stat-card__icon-box">
                <el-icon><WarningFilled /></el-icon>
              </div>
              <span class="stat-card__label">未修复</span>
              <el-icon class="stat-card__arrow"><ArrowRight /></el-icon>
            </div>
            <div class="stat-card__metric">
              <span class="stat-card__value">{{ vulnerabilityStats.total }}</span>
            </div>
            <div class="stat-card__hint" title="已确认受影响且尚未修复">已确认受影响且尚未修复</div>
          </button>

          <button
            type="button"
            class="stat-card stat-card--unconfirmed"
            @click="openVulnerabilityView({ fixStatus: 'unconfirmed' })"
          >
            <div class="stat-card__top">
              <div class="stat-card__icon-box">
                <el-icon><QuestionFilled /></el-icon>
              </div>
              <span class="stat-card__label">待确认</span>
              <el-icon class="stat-card__arrow"><ArrowRight /></el-icon>
            </div>
            <div class="stat-card__metric">
              <span class="stat-card__value">{{ vulnerabilityStats.unconfirmed }}</span>
            </div>
            <div class="stat-card__hint" title="缺少补丁信息，暂无法判断">
              缺少补丁信息，暂无法判断
            </div>
          </button>

          <button
            type="button"
            class="stat-card stat-card--fixed"
            @click="openVulnerabilityView({ fixStatus: 'fixed' })"
          >
            <div class="stat-card__top">
              <div class="stat-card__icon-box">
                <el-icon><CircleCheckFilled /></el-icon>
              </div>
              <span class="stat-card__label">已修复</span>
              <el-icon class="stat-card__arrow"><ArrowRight /></el-icon>
            </div>
            <div class="stat-card__metric">
              <span class="stat-card__value">{{ vulnerabilityStats.fixed }}</span>
            </div>
            <div class="stat-card__hint" title="已确认完成修复的漏洞">已确认完成修复的漏洞</div>
          </button>
        </div>
      </div>

      <!-- 漏洞风险等级 -->
      <div class="stats-group">
        <div class="stats-group__header">
          <div class="stats-group__title-box">
            <span class="stats-group__indicator stats-group__indicator--risk"></span>
            <span class="stats-group__title">漏洞风险等级</span>
          </div>
          <span class="stats-group__subtitle">未修复漏洞分布</span>
        </div>
        <div class="stats-group__cards stats-group__cards--risk">
          <button
            type="button"
            class="stat-card stat-card--critical"
            @click="openVulnerabilityView({ fixStatus: 'open', severity: 'critical' })"
          >
            <div class="stat-card__top">
              <div class="stat-card__icon-box">
                <el-icon><CircleCloseFilled /></el-icon>
              </div>
              <span class="stat-card__label">严重</span>
              <el-icon class="stat-card__arrow"><ArrowRight /></el-icon>
            </div>
            <div class="stat-card__metric">
              <span class="stat-card__value">
                {{ vulnerabilityStats.bySeverity.critical }}
              </span>
            </div>
            <div class="stat-card__hint" title="需最高优先级处置">需最高优先级处置</div>
          </button>

          <button
            type="button"
            class="stat-card stat-card--important"
            @click="openVulnerabilityView({ fixStatus: 'open', severity: 'important' })"
          >
            <div class="stat-card__top">
              <div class="stat-card__icon-box">
                <el-icon><WarningFilled /></el-icon>
              </div>
              <span class="stat-card__label">重要</span>
              <el-icon class="stat-card__arrow"><ArrowRight /></el-icon>
            </div>
            <div class="stat-card__metric">
              <span class="stat-card__value">
                {{ vulnerabilityStats.bySeverity.important }}
              </span>
            </div>
            <div class="stat-card__hint" title="需优先安排处置">需优先安排处置</div>
          </button>
        </div>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="middleware-tabs">
      <el-tab-pane label="实例清单" name="instances">
        <div class="tab-pane-layout">
          <div class="ops-filter-bar">
            <el-form :model="instanceFilters" inline size="small">
              <el-form-item label="主机">
                <div class="host-selector-field">
                  <AcmDeviceSelector
                    v-model="instanceSelectedHosts"
                    ci-types="[auto]"
                    :show-tag-list="false"
                    :options="singleHostSelectorOptions"
                    @change="handleInstanceHostChange"
                  />
                </div>
              </el-form-item>
              <el-form-item label="中间件">
                <el-select
                  v-model="instanceFilters.middlewareType"
                  placeholder="全部"
                  clearable
                  style="width: 130px"
                  @change="searchInstances"
                >
                  <el-option
                    v-for="type in middlewareTypes"
                    :key="type"
                    :label="middlewareTypeLabel(type)"
                    :value="type"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="分发方式">
                <el-select
                  v-model="instanceFilters.provenance"
                  placeholder="全部"
                  clearable
                  style="width: 130px"
                  @change="searchInstances"
                >
                  <el-option label="压缩包" value="tarball" />
                  <el-option label="RPM 包" value="rpm" />
                  <el-option label="DEB 包" value="deb" />
                  <el-option label="容器" value="container" />
                  <el-option label="未知" value="unknown" />
                </el-select>
              </el-form-item>
              <el-form-item label="关键字">
                <el-input
                  v-model="instanceFilters.keyword"
                  placeholder="版本号或安装路径"
                  clearable
                  style="width: 220px"
                  @keyup.enter="searchInstances"
                  @clear="searchInstances"
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="searchInstances">
                  <el-icon><Search /></el-icon>
                  搜索
                </el-button>
                <el-button @click="resetInstanceFilters">
                  <el-icon><RefreshRight /></el-icon>
                  重置
                </el-button>
              </el-form-item>
            </el-form>
          </div>

          <div class="ops-action-bar">
            <el-button type="primary" size="small" @click="openScanDialog()">
              <el-icon><Aim /></el-icon>
              派发扫描
            </el-button>
            <el-button
              size="small"
              :disabled="selectedHostIds.length === 0"
              @click="scanSelectedInstances"
            >
              扫描选中主机
            </el-button>
            <span class="selection-hint">已选 {{ selectedHostIds.length }} 台主机</span>
            <span class="action-spacer"></span>
            <el-button
              class="toolbar-icon-btn"
              circle
              size="small"
              :loading="instanceLoading"
              title="刷新"
              @click="loadInstances"
            >
              <el-icon v-show="!instanceLoading"><Refresh /></el-icon>
            </el-button>
          </div>

          <div class="ops-table-wrapper">
            <el-table
              v-loading="instanceLoading"
              :data="instances"
              class="natural-height-table"
              :empty-text="instanceEmptyText"
              @selection-change="rows => (selectedInstances = rows)"
            >
              <el-table-column type="selection" width="46" />
              <el-table-column label="主机" min-width="200" show-overflow-tooltip>
                <template #default="{ row }">
                  <el-space :size="8">
                    <el-link type="primary" underline="never" @click="showInstanceDetail(row)">
                      {{ row.hostName || row.hostKey || row.hostId || '-' }}
                    </el-link>
                    <el-tag
                      v-if="row.hostName && row.hostKey && row.hostName !== row.hostKey"
                      type="info"
                      size="small"
                      effect="plain"
                    >
                      {{ row.hostKey }}
                    </el-tag>
                  </el-space>
                </template>
              </el-table-column>
              <el-table-column label="中间件" width="90">
                <template #default="{ row }">
                  <el-tag
                    :type="middlewareTagType(row.middlewareType)"
                    size="small"
                    effect="light"
                    round
                  >
                    {{ middlewareTypeLabel(row.middlewareType) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="版本" min-width="100" show-overflow-tooltip>
                <template #default="{ row }">
                  <span v-if="row.version">{{ row.version }}</span>
                  <el-tag v-else type="info" size="small">版本未采到</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="安装位置" min-width="200" show-overflow-tooltip>
                <template #default="{ row }">
                  <div class="primary-cell">
                    <span>{{ row.installPath || '-' }}</span>
                    <span v-if="row.containerImage" class="secondary-text">
                      镜像：{{ row.containerImage }}
                    </span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="运行状态" width="90" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.running ? 'success' : 'info'" size="small">
                    {{ row.running ? '运行中' : '未运行' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="分发方式" width="110">
                <template #default="{ row }">
                  <RunLogStatusTag
                    :type="isPackageManaged(row) ? 'success' : 'info'"
                    size="small"
                    effect="plain"
                    :clickable="isPackageManaged(row)"
                    tooltip="点击查看主机的软件包与补丁"
                    @click="openLinuxPackages(row)"
                  >
                    {{ provenanceLabel(row.provenance) }}
                  </RunLogStatusTag>
                </template>
              </el-table-column>
              <el-table-column label="漏洞" min-width="90" align="center">
                <template #default="{ row }">
                  <RunLogStatusTag
                    v-if="Number(row.numVuls) > 0"
                    type="danger"
                    effect="light"
                    round
                    :tooltip="`点击查看 ${row.numVuls} 条未修复漏洞`"
                    @click="openInstanceVulnerabilities(row, 'open')"
                  >
                    {{ row.numVuls }} 条
                  </RunLogStatusTag>
                  <span v-else>0</span>
                </template>
              </el-table-column>
              <el-table-column label="待确认" width="100" align="center">
                <template #default="{ row }">
                  <RunLogStatusTag
                    v-if="Number(row.numUnconfirmed) > 0"
                    type="warning"
                    effect="light"
                    round
                    :tooltip="`点击查看 ${row.numUnconfirmed} 条待确认漏洞`"
                    @click="openInstanceVulnerabilities(row, 'unconfirmed')"
                  >
                    {{ row.numUnconfirmed }} 条
                  </RunLogStatusTag>
                  <span v-else>0</span>
                </template>
              </el-table-column>
              <el-table-column label="严重 / 重要" width="120" align="center">
                <template #default="{ row }">
                  <span>{{ row.numCritical || 0 }} / {{ row.numImportant || 0 }}</span>
                </template>
              </el-table-column>
              <el-table-column label="修复建议" min-width="300">
                <template #default="{ row }">
                  <span class="fix-hint-text" :title="fixHintText(row)">
                    {{ fixHintText(row) }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column label="扫描时间" width="180">
                <template #default="{ row }">{{ formatDateTime(row.scanTimestamp) }}</template>
              </el-table-column>
              <el-table-column label="操作" width="80" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" @click="showInstanceDetail(row)">详情</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div class="ops-pagination-wrapper">
            <el-pagination
              v-model:current-page="instancePagination.page"
              v-model:page-size="instancePagination.size"
              :page-sizes="[10, 20, 50, 100]"
              :total="instancePagination.total"
              layout="total, sizes, prev, pager, next, jumper"
              background
              @size-change="handleInstanceSizeChange"
              @current-change="loadInstances"
            />
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="漏洞清单" name="vulnerabilities">
        <div class="tab-pane-layout">
          <div class="ops-filter-bar">
            <el-form :model="vulnerabilityFilters" inline size="small">
              <el-form-item label="主机">
                <div class="host-selector-field">
                  <AcmDeviceSelector
                    v-model="vulnerabilitySelectedHosts"
                    ci-types="[auto]"
                    :show-tag-list="false"
                    :options="singleHostSelectorOptions"
                    @change="handleVulnerabilityHostChange"
                  />
                </div>
              </el-form-item>
              <el-form-item label="中间件">
                <el-select
                  v-model="vulnerabilityFilters.middlewareType"
                  placeholder="全部"
                  clearable
                  style="width: 125px"
                  @change="searchVulnerabilities"
                >
                  <el-option
                    v-for="type in middlewareTypes"
                    :key="type"
                    :label="middlewareTypeLabel(type)"
                    :value="type"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="严重等级">
                <el-select
                  v-model="vulnerabilityFilters.severity"
                  placeholder="全部"
                  clearable
                  style="width: 115px"
                  @change="searchVulnerabilities"
                >
                  <el-option label="严重" value="critical" />
                  <el-option label="重要" value="important" />
                  <el-option label="中等" value="moderate" />
                  <el-option label="低危" value="low" />
                </el-select>
              </el-form-item>
              <el-form-item label="结论">
                <el-select
                  v-model="vulnerabilityFilters.fixStatus"
                  style="width: 125px"
                  @change="searchVulnerabilities"
                >
                  <el-option label="未修复" value="open" />
                  <el-option label="待确认" value="unconfirmed" />
                  <el-option label="已修复" value="fixed" />
                  <el-option label="已缓解" value="mitigated" />
                  <el-option label="人工修复" value="fixed_artificial" />
                </el-select>
              </el-form-item>
              <el-form-item label="CVE">
                <el-input
                  v-model="vulnerabilityFilters.cveId"
                  placeholder="精确匹配 CVE 编号"
                  clearable
                  style="width: 190px"
                  @keyup.enter="searchVulnerabilities"
                  @clear="searchVulnerabilities"
                />
              </el-form-item>
              <el-form-item>
                <el-checkbox
                  v-model="vulnerabilityFilters.includeIgnored"
                  @change="searchVulnerabilities"
                >
                  包含已忽略
                </el-checkbox>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="searchVulnerabilities">
                  <el-icon><Search /></el-icon>
                  搜索
                </el-button>
                <el-button @click="resetVulnerabilityFilters">
                  <el-icon><RefreshRight /></el-icon>
                  重置
                </el-button>
              </el-form-item>
            </el-form>
          </div>

          <div class="ops-action-bar">
            <el-button
              type="success"
              size="small"
              :disabled="selectedFixInstanceKeys.length === 0"
              @click="openSelectedFixGuides"
            >
              修复指引
            </el-button>
            <span class="selection-hint">
              已选 {{ selectedVulnerabilities.length }} 条漏洞，涉及
              {{ selectedFixInstanceKeys.length }} 个实例
            </span>
            <span v-if="vulnerabilityFilters.instanceKey" class="instance-filter-tag">
              已限定具体实例
              <el-button link type="primary" @click="clearInstanceFilter">清除</el-button>
            </span>
            <span class="action-spacer"></span>
            <el-button
              class="toolbar-icon-btn"
              circle
              size="small"
              :loading="vulnerabilityLoading"
              title="刷新"
              @click="loadVulnerabilities"
            >
              <el-icon v-show="!vulnerabilityLoading"><Refresh /></el-icon>
            </el-button>
          </div>

          <div class="ops-table-wrapper">
            <el-table
              v-loading="vulnerabilityLoading"
              :data="vulnerabilities"
              class="natural-height-table"
              empty-text="暂无符合条件的漏洞"
              :row-key="vulnerabilityRowKey"
              @selection-change="rows => (selectedVulnerabilities = rows)"
            >
              <el-table-column type="selection" width="46" :selectable="canSelectForFixGuide" />
              <el-table-column label="CVE" width="155">
                <template #default="{ row }">
                  <el-link
                    v-if="row.webUrl"
                    :href="row.webUrl"
                    target="_blank"
                    type="primary"
                    underline="never"
                  >
                    {{ row.cveId }}
                  </el-link>
                  <span v-else>{{ row.cveId || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="主机 / 实例" min-width="190" show-overflow-tooltip>
                <template #default="{ row }">
                  <div class="primary-cell">
                    <span>{{ row.hostKey || row.hostId || '-' }}</span>
                    <span class="secondary-text">
                      {{ middlewareTypeLabel(row.middlewareType) }} · {{ row.installPath || '-' }}
                    </span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="等级" width="90">
                <template #default="{ row }">
                  <el-tag :type="severityTagType(row.severity)" size="small">
                    {{ severityLabel(row.severity) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="CVSS" width="75" align="center">
                <template #default="{ row }">{{ formatScore(row.cvss3Score) }}</template>
              </el-table-column>
              <el-table-column label="当前版本" min-width="130" show-overflow-tooltip>
                <template #default="{ row }">{{ row.currVersion || '-' }}</template>
              </el-table-column>
              <el-table-column label="判定依据" width="130">
                <template #default="{ row }">
                  <el-tooltip :content="matchSourceDescription(row.matchSource)" placement="top">
                    <el-tag
                      :type="row.matchSource === 'no_patch_level' ? 'warning' : 'info'"
                      size="small"
                      effect="plain"
                    >
                      {{ matchSourceLabel(row.matchSource) }}
                    </el-tag>
                  </el-tooltip>
                </template>
              </el-table-column>
              <el-table-column label="结论" width="100">
                <template #default="{ row }">
                  <div class="status-cell">
                    <el-tag :type="fixStatusTagType(row.fixStatus)" size="small">
                      {{ fixStatusLabel(row.fixStatus) }}
                    </el-tag>
                    <el-tag v-if="row.ignore" type="info" size="small">已忽略</el-tag>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="首次发现" width="180">
                <template #default="{ row }">{{ formatDateTime(row.firstFoundAt) }}</template>
              </el-table-column>
              <el-table-column label="操作" width="130" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" @click="showVulnerabilityDetail(row)">
                    详情
                  </el-button>
                  <el-button
                    link
                    :type="row.ignore ? 'warning' : 'primary'"
                    @click="toggleIgnore(row)"
                  >
                    {{ row.ignore ? '取消忽略' : '忽略' }}
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div class="ops-pagination-wrapper">
            <el-pagination
              v-model:current-page="vulnerabilityPagination.page"
              v-model:page-size="vulnerabilityPagination.size"
              :page-sizes="[10, 20, 50, 100]"
              :total="vulnerabilityPagination.total"
              layout="total, sizes, prev, pager, next, jumper"
              background
              @size-change="handleVulnerabilitySizeChange"
              @current-change="loadVulnerabilities"
            />
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog
      v-model="instanceDialogVisible"
      title="中间件实例详情"
      width="720px"
      append-to-body
      destroy-on-close
    >
      <template v-if="currentInstance">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="实例标识">
            {{ currentInstance.instanceKey || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="主机">
            {{ currentInstance.hostName || '-' }}（{{
              currentInstance.hostKey || currentInstance.hostId || '-'
            }}）
          </el-descriptions-item>
          <el-descriptions-item label="中间件">
            {{ middlewareTypeLabel(currentInstance.middlewareType) }}
          </el-descriptions-item>
          <el-descriptions-item label="版本">
            {{ currentInstance.version || '未采到' }}
          </el-descriptions-item>
          <el-descriptions-item label="安装目录">
            {{ currentInstance.installPath || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="主程序">
            {{ currentInstance.binaryPath || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="运行信息">
            {{ currentInstance.running ? '运行中' : '未运行' }}；用户
            {{ currentInstance.runUser || '-' }}；PID {{ currentInstance.pid ?? '-' }}；端口
            {{ formatList(currentInstance.listenPorts) }}
          </el-descriptions-item>
          <el-descriptions-item label="分发方式">
            {{ provenanceLabel(currentInstance.provenance) }}
            <span v-if="currentInstance.pkgName">（{{ currentInstance.pkgName }}）</span>
          </el-descriptions-item>
          <el-descriptions-item v-if="currentInstance.containerImage" label="容器镜像">
            {{ currentInstance.containerImage }}
          </el-descriptions-item>
          <el-descriptions-item v-if="currentInstance.fixTarget" label="修复目标">
            {{ currentInstance.fixTarget }}
          </el-descriptions-item>
          <el-descriptions-item v-if="currentInstance.fixHint" label="修复建议">
            <el-link
              v-if="hasFixGuide(currentInstance)"
              class="fix-hint-link"
              type="primary"
              underline="never"
              @click="openFixGuide(currentInstance)"
            >
              {{ currentInstance.fixHint }}
            </el-link>
            <el-link
              v-else-if="isPackageManaged(currentInstance)"
              class="fix-hint-link"
              type="primary"
              underline="never"
              @click="openLinuxPackages(currentInstance)"
            >
              {{ currentInstance.fixHint }}
            </el-link>
            <span v-else>{{ currentInstance.fixHint }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="WebLogic PSU">
            {{ currentInstance.patchLevel || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="已安装补丁">
            <span v-if="parsedAppliedPatches === null">未采到，无法据此判定</span>
            <span v-else-if="parsedAppliedPatches.length === 0">已确认未安装补丁</span>
            <template v-else>
              <el-tag
                v-for="patch in parsedAppliedPatches"
                :key="String(patch)"
                size="small"
                class="detail-tag"
              >
                {{ patch }}
              </el-tag>
            </template>
          </el-descriptions-item>
          <el-descriptions-item label="探测方式">
            {{ currentInstance.detectMethod || '-' }} / {{ currentInstance.versionMethod || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="扫描时间">
            {{ formatDateTime(currentInstance.scanTimestamp) }}
          </el-descriptions-item>
        </el-descriptions>
      </template>
      <template #footer>
        <el-button
          v-if="currentInstance && isPackageManaged(currentInstance)"
          @click="openLinuxPackages(currentInstance)"
        >
          查看 Linux 补丁
        </el-button>
        <el-button
          v-if="currentInstance && hasFixGuide(currentInstance)"
          type="primary"
          @click="openFixGuide(currentInstance)"
        >
          修复指引
        </el-button>
        <el-button @click="instanceDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="vulnerabilityDialogVisible"
      title="漏洞判定详情"
      width="900px"
      append-to-body
      destroy-on-close
    >
      <template v-if="currentVulnerability">
        <el-alert
          :type="currentVulnerability.fixStatus === 'unconfirmed' ? 'warning' : 'info'"
          show-icon
          :closable="false"
          class="detail-alert detail-alert--before"
          :title="`判定依据：${matchSourceLabel(currentVulnerability.matchSource)}`"
          :description="matchSourceDescription(currentVulnerability.matchSource)"
        />
        <el-descriptions :column="2" border>
          <el-descriptions-item label="CVE">
            {{ currentVulnerability.cveId || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="风险等级">
            {{ severityLabel(currentVulnerability.severity) }} / CVSS
            {{ formatScore(currentVulnerability.cvss3Score) }}
          </el-descriptions-item>
          <el-descriptions-item label="主机">
            {{ currentVulnerability.hostKey || currentVulnerability.hostId || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="实例">
            {{ currentVulnerability.instanceKey || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="安装路径" :span="2">
            {{ currentVulnerability.installPath || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="当前版本">
            {{ currentVulnerability.currVersion || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="修复版本">
            {{ currentVulnerability.fixedVersion || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="补丁号">
            {{ currentVulnerability.patchNo || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="关联公告">
            {{ currentVulnerability.advisoryId || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="首次发现">
            {{ formatDateTime(currentVulnerability.firstFoundAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="最近确认">
            {{ formatDateTime(currentVulnerability.scanTimestamp) }}
          </el-descriptions-item>
          <el-descriptions-item label="公开日期">
            {{ formatDateTime(currentVulnerability.publicDate, true) }}
          </el-descriptions-item>
          <el-descriptions-item label="忽略状态" :span="2">
            {{
              currentVulnerability.ignore
                ? `已忽略：${currentVulnerability.ignoreReason || '未填写原因'}`
                : '未忽略'
            }}
          </el-descriptions-item>
          <el-descriptions-item label="漏洞说明" :span="2">
            {{ currentVulnerability.description || '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </template>
      <template #footer>
        <template v-if="currentVulnerability">
          <el-button
            v-if="currentVulnerability.webUrl"
            tag="a"
            :href="currentVulnerability.webUrl"
            target="_blank"
          >
            打开漏洞公告
          </el-button>
          <el-button @click="vulnerabilityDialogVisible = false">关闭</el-button>
          <el-button
            v-if="currentVulnerability.fixStatus === 'open'"
            type="primary"
            @click="openFixGuide(currentVulnerability)"
          >
            修复指引
          </el-button>
          <el-button type="primary" @click="toggleIgnore(currentVulnerability)">
            {{ currentVulnerability.ignore ? '取消忽略' : '忽略此漏洞' }}
          </el-button>
        </template>
      </template>
    </el-dialog>

    <MiddlewareFixGuideDialog
      v-model:visible="fixGuideVisible"
      :guides="currentFixGuides"
      :loading="fixGuideLoading"
    />

    <el-dialog v-model="scanDialogVisible" title="派发中间件扫描" width="560px" destroy-on-close>
      <el-alert
        type="info"
        show-icon
        :closable="false"
        title="扫描任务将在后台执行"
        description="提交后可以继续使用其他功能。请在运行结果中查看扫描进度，任务结束后当前页面会自动更新。"
      />
      <el-form label-position="top" class="scan-form">
        <el-form-item label="目标主机">
          <div class="scan-host-selector">
            <AcmDeviceSelector
              v-model="scanSelectedHosts"
              ci-types="[auto]"
              :options="multipleHostSelectorOptions"
            />
          </div>
        </el-form-item>
        <span class="secondary-text">将派发到 {{ scanHostIds.length }} 台去重后的主机</span>
      </el-form>
      <template #footer>
        <el-button @click="scanDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="scanSubmitting" @click="submitScan">确认派发</el-button>
      </template>
    </el-dialog>

    <ExecuteResultDialog
      v-model:visible="runResultVisible"
      :run-id="currentRunId"
      job-title="中间件扫描"
      @settled="refreshAfterRunResult"
      @close="refreshAfterRunResult"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Aim,
  ArrowRight,
  CircleCheckFilled,
  CircleCloseFilled,
  QuestionFilled,
  Refresh,
  RefreshRight,
  Search,
  WarningFilled
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import RunLogStatusTag from '@/components/shared/RunLogStatusTag.vue'
import MiddlewareFixGuideDialog from '../components/middleware/MiddlewareFixGuideDialog.vue'
import { middlewareCveApi } from '../api'
import {
  buildSelectorHostItems,
  extractHostIds,
  resolveHostId,
  resolveHostKey
} from '../utils/linuxMachinePackageList'

const router = useRouter()
const activeTab = ref('instances')

const instances = ref([])
const vulnerabilities = ref([])
const selectedInstances = ref([])
const selectedVulnerabilities = ref([])

const instanceLoading = ref(false)
const vulnerabilityLoading = ref(false)
const overviewLoading = ref(false)
const scanSubmitting = ref(false)
const fixGuideLoading = ref(false)

const instanceDialogVisible = ref(false)
const vulnerabilityDialogVisible = ref(false)
const fixGuideVisible = ref(false)
const scanDialogVisible = ref(false)
const runResultVisible = ref(false)
const runResultRefreshed = ref(false)

const currentInstance = ref(null)
const currentVulnerability = ref(null)
const currentFixGuides = ref([])
const currentRunId = ref('')
const instanceSelectedHosts = ref([])
const vulnerabilitySelectedHosts = ref([])
const scanSelectedHosts = ref([])

const singleHostSelectorOptions = {
  selectMode: 'host,recently',
  selector: 'single',
  label: '选择主机'
}

const multipleHostSelectorOptions = {
  selectMode: 'host,recently',
  selector: 'multiple',
  label: '选择主机'
}

const instanceFilters = reactive({
  hostId: '',
  middlewareType: '',
  provenance: '',
  keyword: ''
})

const vulnerabilityFilters = reactive({
  hostId: '',
  instanceKey: '',
  middlewareType: '',
  severity: '',
  cveId: '',
  fixStatus: 'open',
  includeIgnored: false
})

const instancePagination = reactive({ page: 1, size: 20, total: 0 })
const vulnerabilityPagination = reactive({ page: 1, size: 20, total: 0 })

const vulnerabilityStats = reactive({
  total: 0,
  bySeverity: { critical: 0, important: 0, moderate: 0, low: 0 },
  unconfirmed: 0,
  fixed: 0,
  ignored: 0
})

const middlewareTypes = ['tomcat', 'weblogic', 'nginx']

const selectedHostIds = computed(() => [
  ...new Set(selectedInstances.value.map(row => String(row.hostId || '').trim()).filter(Boolean))
])

const scanHostIds = computed(() => extractHostIds(scanSelectedHosts.value))

const selectedFixInstanceKeys = computed(() => [
  ...new Set(
    selectedVulnerabilities.value.map(row => String(row.instanceKey || '').trim()).filter(Boolean)
  )
])

const parsedAppliedPatches = computed(() =>
  parseAppliedPatches(currentInstance.value?.appliedPatches)
)

const instanceEmptyText = computed(() => {
  if (instanceFilters.hostId && !instances.value.length) return '未发现中间件'
  return '暂无中间件实例'
})

function unwrapResponse(response) {
  const body = response?.data ?? response
  return body?.data ?? body
}

function applyPage(payload, target, pagination) {
  const page = payload && typeof payload === 'object' ? payload : {}
  target.value = Array.isArray(page.content) ? page.content : []
  pagination.total = Number(page.totalElements) || 0
  if (Number.isInteger(page.number)) pagination.page = page.number + 1
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback
  )
}

async function loadOverview() {
  overviewLoading.value = true
  try {
    const [statsResult] = await Promise.allSettled([middlewareCveApi.getVulnerabilityStats()])

    if (statsResult.status === 'fulfilled') {
      const data = unwrapResponse(statsResult.value) || {}
      vulnerabilityStats.total = Number(data.total) || 0
      vulnerabilityStats.unconfirmed = Number(data.unconfirmed) || 0
      vulnerabilityStats.fixed = Number(data.fixed) || 0
      vulnerabilityStats.ignored = Number(data.ignored) || 0
      Object.assign(vulnerabilityStats.bySeverity, {
        critical: Number(data.bySeverity?.critical) || 0,
        important: Number(data.bySeverity?.important) || 0,
        moderate: Number(data.bySeverity?.moderate) || 0,
        low: Number(data.bySeverity?.low) || 0
      })
    }
  } finally {
    overviewLoading.value = false
  }
}

async function loadInstances() {
  instanceLoading.value = true
  try {
    const response = await middlewareCveApi.getInstances({
      ...instanceFilters,
      page: instancePagination.page - 1,
      size: instancePagination.size
    })
    applyPage(unwrapResponse(response), instances, instancePagination)
    selectedInstances.value = []
  } catch (error) {
    instances.value = []
    instancePagination.total = 0
    ElMessage.error(getErrorMessage(error, '加载中间件实例失败'))
  } finally {
    instanceLoading.value = false
  }
}

async function loadVulnerabilities() {
  vulnerabilityLoading.value = true
  try {
    const response = await middlewareCveApi.getVulnerabilities({
      ...vulnerabilityFilters,
      page: vulnerabilityPagination.page - 1,
      size: vulnerabilityPagination.size
    })
    applyPage(unwrapResponse(response), vulnerabilities, vulnerabilityPagination)
    selectedVulnerabilities.value = []
  } catch (error) {
    vulnerabilities.value = []
    vulnerabilityPagination.total = 0
    ElMessage.error(getErrorMessage(error, '加载漏洞清单失败'))
  } finally {
    vulnerabilityLoading.value = false
  }
}

function handleTabChange(tabName) {
  if (tabName === 'instances' && !instances.value.length) loadInstances()
  if (tabName === 'vulnerabilities') loadVulnerabilities()
}

watch(activeTab, handleTabChange, { flush: 'post' })

function searchInstances() {
  instancePagination.page = 1
  loadInstances()
}

function handleInstanceHostChange(selection) {
  instanceFilters.hostId = extractHostIds(selection)[0] || ''
  searchInstances()
}

function resetInstanceFilters() {
  instanceSelectedHosts.value = []
  Object.assign(instanceFilters, { hostId: '', middlewareType: '', provenance: '', keyword: '' })
  searchInstances()
}

function handleInstanceSizeChange(size) {
  instancePagination.size = size
  instancePagination.page = 1
  loadInstances()
}

function searchVulnerabilities() {
  vulnerabilityPagination.page = 1
  loadVulnerabilities()
}

function handleVulnerabilityHostChange(selection) {
  vulnerabilityFilters.hostId = extractHostIds(selection)[0] || ''
  vulnerabilityFilters.instanceKey = ''
  searchVulnerabilities()
}

function resetVulnerabilityFilters() {
  vulnerabilitySelectedHosts.value = []
  Object.assign(vulnerabilityFilters, {
    hostId: '',
    instanceKey: '',
    middlewareType: '',
    severity: '',
    cveId: '',
    fixStatus: 'open',
    includeIgnored: false
  })
  searchVulnerabilities()
}

function handleVulnerabilitySizeChange(size) {
  vulnerabilityPagination.size = size
  vulnerabilityPagination.page = 1
  loadVulnerabilities()
}

function openVulnerabilityView(filters = {}) {
  const alreadyActive = activeTab.value === 'vulnerabilities'
  vulnerabilitySelectedHosts.value = []
  Object.assign(vulnerabilityFilters, {
    hostId: '',
    instanceKey: '',
    middlewareType: '',
    severity: '',
    cveId: '',
    fixStatus: 'open',
    includeIgnored: false,
    ...filters
  })
  vulnerabilityPagination.page = 1
  activeTab.value = 'vulnerabilities'
  if (alreadyActive) loadVulnerabilities()
}

function openInstanceVulnerabilities(row, fixStatus) {
  const alreadyActive = activeTab.value === 'vulnerabilities'
  vulnerabilitySelectedHosts.value = buildSelectorHostItems([row])
  Object.assign(vulnerabilityFilters, {
    hostId: row.hostId || '',
    instanceKey: row.instanceKey || '',
    middlewareType: row.middlewareType || '',
    severity: '',
    cveId: '',
    fixStatus,
    includeIgnored: false
  })
  vulnerabilityPagination.page = 1
  activeTab.value = 'vulnerabilities'
  if (alreadyActive) loadVulnerabilities()
}

function clearInstanceFilter() {
  vulnerabilitySelectedHosts.value = []
  Object.assign(vulnerabilityFilters, {
    hostId: '',
    instanceKey: '',
    middlewareType: ''
  })
  searchVulnerabilities()
}

function showInstanceDetail(row) {
  currentInstance.value = row
  instanceDialogVisible.value = true
}

function showVulnerabilityDetail(row) {
  currentVulnerability.value = row
  vulnerabilityDialogVisible.value = true
}

function vulnerabilityRowKey(row) {
  return `${row?.instanceKey || row?.hostId || 'host'}:${row?.cveId || row?.id || 'vulnerability'}`
}

function canSelectForFixGuide(row) {
  return (
    Boolean(row?.instanceKey) &&
    String(row?.fixStatus || '').toLowerCase() === 'open' &&
    !row?.ignore
  )
}

async function openFixGuide(row) {
  if (!row?.instanceKey) {
    ElMessage.warning('缺少实例信息，无法获取修复指引')
    return
  }

  currentFixGuides.value = []
  fixGuideVisible.value = true
  fixGuideLoading.value = true
  try {
    const response = await middlewareCveApi.getFixGuide(row.instanceKey)
    const guide = unwrapResponse(response)
    currentFixGuides.value = guide ? [guide] : []
  } catch (error) {
    fixGuideVisible.value = false
    ElMessage.error(getErrorMessage(error, '加载修复指引失败'))
  } finally {
    fixGuideLoading.value = false
  }
}

async function openSelectedFixGuides() {
  const instanceKeys = selectedFixInstanceKeys.value
  if (!instanceKeys.length) {
    ElMessage.warning('请至少选择一条未修复漏洞')
    return
  }
  if (instanceKeys.length > 50) {
    ElMessage.warning('一次最多查看 50 个实例的修复指引')
    return
  }

  currentFixGuides.value = []
  fixGuideVisible.value = true
  fixGuideLoading.value = true
  try {
    const response = await middlewareCveApi.getFixGuides(instanceKeys)
    const data = unwrapResponse(response) || {}
    currentFixGuides.value = Array.isArray(data.guides) ? data.guides : []
  } catch (error) {
    fixGuideVisible.value = false
    ElMessage.error(getErrorMessage(error, '加载修复指引失败'))
  } finally {
    fixGuideLoading.value = false
  }
}

async function toggleIgnore(row) {
  if (!row.instanceKey || !row.cveId) {
    ElMessage.warning('缺少实例标识或 CVE 编号，无法更新忽略状态')
    return
  }

  const nextIgnore = !row.ignore
  let reason = ''
  if (nextIgnore) {
    try {
      const result = await ElMessageBox.prompt('请填写忽略原因，便于后续审计和复核', '忽略漏洞', {
        confirmButtonText: '确认忽略',
        cancelButtonText: '取消',
        inputType: 'textarea',
        inputPlaceholder: '例如：内网隔离，不对外提供服务',
        inputValidator: value => Boolean(String(value || '').trim()) || '请填写忽略原因'
      })
      reason = String(result.value || '').trim()
    } catch {
      return
    }
  } else {
    try {
      await ElMessageBox.confirm('取消忽略后，该漏洞会重新出现在默认的未修复列表中。', '取消忽略', {
        type: 'warning',
        confirmButtonText: '确认取消',
        cancelButtonText: '返回'
      })
    } catch {
      return
    }
  }

  try {
    await middlewareCveApi.setVulnerabilityIgnore({
      instanceKey: row.instanceKey,
      cveId: row.cveId,
      ignore: nextIgnore,
      reason
    })
    ElMessage.success(nextIgnore ? '已忽略该漏洞' : '已取消忽略')
    vulnerabilityDialogVisible.value = false
    await Promise.all([loadVulnerabilities(), loadOverview()])
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '更新忽略状态失败'))
  }
}

function buildUniqueSelectorHostItems(hosts = []) {
  const seen = new Set()
  return buildSelectorHostItems(hosts).filter(item => {
    if (seen.has(item.key)) return false
    seen.add(item.key)
    return true
  })
}

function openScanDialog(hosts = []) {
  scanSelectedHosts.value = buildUniqueSelectorHostItems(hosts)
  scanDialogVisible.value = true
}

function scanSelectedInstances() {
  openScanDialog(selectedInstances.value)
}

async function submitScan() {
  if (!scanHostIds.value.length) {
    ElMessage.warning('请至少选择一台主机')
    return
  }

  scanSubmitting.value = true
  try {
    const response = await middlewareCveApi.scan(scanHostIds.value)
    const data = unwrapResponse(response) || {}
    const skippedHosts = Array.isArray(data.skippedHosts) ? data.skippedHosts : []
    const returnedHostCount = Number(data.hosts)
    const scannedHostCount = Number.isFinite(returnedHostCount)
      ? returnedHostCount
      : Math.max(scanHostIds.value.length - skippedHosts.length, 0)
    currentRunId.value = data.runId || ''
    scanDialogVisible.value = false
    ElMessage.success(`已派发 ${scannedHostCount} 台主机`)
    showSkippedHostsWarning(skippedHosts)
    if (currentRunId.value) {
      runResultRefreshed.value = false
      runResultVisible.value = true
    }
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '扫描派发失败；请联系后端启用中间件产品字典'))
  } finally {
    scanSubmitting.value = false
  }
}

function skippedHostText(host) {
  if (typeof host === 'string' || typeof host === 'number') return String(host)

  const identity =
    host?.hostName || host?.hostname || host?.hostKey || host?.hostId || host?.id || '未知主机'
  const reason = host?.reason || host?.message || ''
  return reason ? `${identity}（${reason}）` : identity
}

function showSkippedHostsWarning(skippedHosts) {
  if (!skippedHosts.length) return

  const visibleHosts = skippedHosts.slice(0, 5).map(skippedHostText)
  const remaining = skippedHosts.length - visibleHosts.length
  const moreText = remaining > 0 ? `，另有 ${remaining} 台` : ''
  ElMessage.warning({
    message: `${skippedHosts.length} 台主机未能发起扫描：${visibleHosts.join('、')}${moreText}`,
    duration: 8000,
    showClose: true
  })
}

async function refreshAfterRunResult() {
  if (runResultRefreshed.value) return
  runResultRefreshed.value = true

  const requests = [loadOverview()]
  if (activeTab.value === 'vulnerabilities') {
    requests.push(loadVulnerabilities())
  } else {
    requests.push(loadInstances())
  }
  await Promise.all(requests)
}

function openLinuxPackages(row) {
  const hostId = resolveHostId(row)
  const hostKey = resolveHostKey(row)

  if (!hostId) {
    ElMessage.warning('缺少主机 ID，无法查看软件包')
    return
  }

  instanceDialogVisible.value = false
  router.push({
    name: 'patches-hostDetail',
    query: {
      host_id: hostId,
      host_key: hostKey === '-' ? '' : hostKey,
      hostname: row.hostName || row.hostname || '',
      os_distro: row.osDistro || row.os_distro || '',
      os_version: row.osVersion || row.os_version || '',
      tab: 'packages',
      fromLabel: '中间件漏洞管理',
      fromRouteName: 'patches-middlewareCveList'
    }
  })
}

function middlewareTypeLabel(type) {
  const key = String(type || '').toLowerCase()
  return { tomcat: 'Tomcat', weblogic: 'WebLogic', nginx: 'Nginx' }[key] || type || '-'
}

function middlewareTagType(type) {
  const key = String(type || '').toLowerCase()
  return { tomcat: 'primary', weblogic: 'warning', nginx: 'success' }[key] || 'info'
}

function provenanceLabel(value) {
  return (
    {
      tarball: '压缩包',
      rpm: 'RPM 包',
      deb: 'DEB 包',
      container: '容器',
      unknown: '未知'
    }[String(value || '').toLowerCase()] ||
    value ||
    '-'
  )
}

function isPackageManaged(row) {
  return ['rpm', 'deb'].includes(String(row?.provenance || '').toLowerCase())
}

function hasFixGuide(row) {
  const action = String(row?.fixAction || '').toLowerCase()
  return Boolean(row?.instanceKey) && Boolean(action) && action !== 'none'
}

function fixHintText(row) {
  if (row?.fixHint) return row.fixHint
  if (isPackageManaged(row)) return '请前往 Linux 补丁模块查看和处理'
  if (hasFixGuide(row)) return '请查看修复指引'
  return '暂无待修漏洞'
}

function severityLabel(value) {
  return (
    {
      critical: '严重',
      important: '重要',
      moderate: '中等',
      low: '低危'
    }[String(value || '').toLowerCase()] ||
    value ||
    '-'
  )
}

function severityTagType(value) {
  return (
    {
      critical: 'danger',
      important: 'warning',
      moderate: 'primary',
      low: 'info'
    }[String(value || '').toLowerCase()] || 'info'
  )
}

function fixStatusLabel(value) {
  return (
    {
      open: '未修复',
      fixed: '已修复',
      unconfirmed: '待确认',
      ignored: '已忽略',
      mitigated: '已缓解',
      fixed_artificial: '人工修复'
    }[String(value || '').toLowerCase()] ||
    value ||
    '-'
  )
}

function fixStatusTagType(value) {
  return (
    {
      open: 'danger',
      fixed: 'success',
      unconfirmed: 'warning',
      ignored: 'info',
      mitigated: 'primary',
      fixed_artificial: 'success'
    }[String(value || '').toLowerCase()] || 'info'
  )
}

function matchSourceLabel(value) {
  return (
    {
      version: '版本区间',
      patch_no: '补丁号',
      psu_date: 'PSU 日期',
      no_patch_level: '未采到 PSU'
    }[String(value || '').toLowerCase()] ||
    value ||
    '-'
  )
}

function matchSourceDescription(value) {
  return (
    {
      version: '当前版本落在公告给出的受影响版本区间内。',
      patch_no: '主机补丁号与公告直接给出的补丁号匹配。',
      psu_date: '根据 WebLogic PSU 日期与 Oracle CPU 公告发布日期比较得出。',
      no_patch_level: '未采到 WebLogic PSU 日期，当前无法判断是否已修复；该记录不计入漏洞总数。'
    }[String(value || '').toLowerCase()] || '后端未返回具体判定依据。'
  )
}

function formatScore(value) {
  if (value === null || value === undefined || value === '') return '—'
  const score = Number(value)
  return Number.isFinite(score) ? score.toFixed(1) : '—'
}

function formatDateTime(value, dateOnly = false) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(dateOnly ? {} : { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }
  return date.toLocaleString('zh-CN', options).replaceAll('/', '-')
}

function formatList(value) {
  if (Array.isArray(value)) return value.join(', ') || '-'
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

function parseAppliedPatches(value) {
  if (value === null || value === undefined || value === '') return null
  if (Array.isArray(value)) return value
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return [value]
  }
}

onMounted(() => {
  loadOverview()
  loadInstances()
})
</script>

<style scoped lang="scss">
.middleware-page {
  gap: 12px;
}

.stats-bar {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: 14px;
  flex-shrink: 0;
}

.stats-group {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 14px 16px 16px;
  border-radius: 12px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.04),
    0 1px 2px rgba(0, 0, 0, 0.02);
}

.stats-group__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.stats-group__title-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stats-group__indicator {
  width: 3px;
  height: 13px;
  border-radius: 2px;

  &--status {
    background: #165dff;
  }
  &--risk {
    background: #dc2626;
  }
}

.stats-group__title {
  color: var(--el-text-color-primary);
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.01em;
}

.stats-group__subtitle {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1;
}

.stats-group__cards {
  display: grid;
  gap: 10px;

  &--status {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  &--risk {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.stat-card {
  --card-theme: var(--el-color-primary);
  --card-theme-rgb: 64, 158, 255;
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 12px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: linear-gradient(
    180deg,
    rgba(var(--card-theme-rgb), 0.05) 0%,
    var(--el-bg-color) 100%
  );
  color: var(--el-text-color-primary);
  text-align: left;
  cursor: pointer;
  outline: none;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    border-color: rgba(var(--card-theme-rgb), 0.4);
    background: linear-gradient(
      180deg,
      rgba(var(--card-theme-rgb), 0.09) 0%,
      var(--el-bg-color) 100%
    );
    box-shadow: 0 6px 16px -2px rgba(var(--card-theme-rgb), 0.16);
    transform: translateY(-2px);

    .stat-card__arrow {
      opacity: 0.9;
      transform: translateX(2px);
    }
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 6px rgba(var(--card-theme-rgb), 0.12);
  }

  &--open {
    --card-theme: #165dff;
    --card-theme-rgb: 22, 93, 255;
  }
  &--unconfirmed {
    --card-theme: #7c3aed;
    --card-theme-rgb: 124, 58, 237;
  }
  &--fixed {
    --card-theme: #00b42a;
    --card-theme-rgb: 0, 180, 42;
  }
  &--critical {
    --card-theme: #dc2626;
    --card-theme-rgb: 220, 38, 38;
  }
  &--important {
    --card-theme: #ff7d00;
    --card-theme-rgb: 255, 125, 0;
  }
}

.stat-card__top {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.stat-card__icon-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: rgba(var(--card-theme-rgb), 0.12);
  color: var(--card-theme);
  font-size: 14px;
  flex-shrink: 0;
}

.stat-card__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
}

.stat-card__arrow {
  font-size: 12px;
  color: var(--card-theme);
  opacity: 0;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.stat-card__metric {
  margin: 8px 0 4px;
  display: flex;
  align-items: baseline;
}

.stat-card__value {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--card-theme);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.stat-card__hint {
  color: var(--el-text-color-secondary);
  font-size: 11px;
  line-height: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.middleware-tabs {
  display: flex;
  flex: none;
  min-height: auto;
  flex-direction: column;

  :deep(.el-tabs__header) {
    margin-bottom: 10px;
    flex-shrink: 0;
  }

  :deep(.el-tabs__content),
  :deep(.el-tab-pane) {
    flex: none;
    min-height: auto;
    height: auto;
    overflow: visible;
  }
}

.tab-pane-layout {
  display: flex;
  height: auto;
  min-height: auto;
  flex-direction: column;
}

.action-spacer {
  flex: 1;
}
.selection-hint,
.secondary-text {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.primary-cell {
  display: flex;
  min-width: 0;
  flex-direction: column;
  line-height: 20px;
}

.fix-hint-link {
  line-height: 1.5;
  text-align: left;
  white-space: normal;
  overflow-wrap: anywhere;
}

.fix-hint-text {
  display: -webkit-box;
  max-height: 40px;
  overflow: hidden;
  color: var(--el-text-color-regular);
  line-height: 20px;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.status-cell {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.instance-filter-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.detail-alert {
  margin-top: 16px;
}
.detail-alert--before {
  margin-top: 0;
  margin-bottom: 16px;
}
.detail-tag {
  margin: 2px 4px 2px 0;
}
.scan-form {
  margin-top: 16px;
}

.host-selector-field {
  width: 110px;
  margin-bottom: 0;
}

.scan-host-selector {
  width: 100%;
  min-height: 32px;
}

@media (max-width: 1200px) {
  .stats-bar {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 680px) {
  .stats-group__cards--status {
    grid-template-columns: 1fr;
  }
  .stats-group__cards--risk {
    grid-template-columns: 1fr;
  }
}
</style>
