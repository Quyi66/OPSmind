<template>
  <div class="ops-page-layout">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="page-header__actions">
        <el-button type="primary" @click="handleRescan">
          <i class="fa fa-bug" />
          重新扫描补丁
        </el-button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="page-content">
      <!-- 新版统计面板 -->
      <div class="stats-dashboard">
        <!-- 1. 补丁统计卡片 -->
        <div class="stat-card patch-card">
          <div class="card-title">补丁统计</div>
          <div class="patch-chart-container">
            <div class="chart-wrapper">
              <v-chart class="patch-pie-chart" :option="chartOption" autoresize />
              <div class="chart-center-label">
                <div class="label-title">总计</div>
                <div class="label-value">{{ kpiStats.totalPatchCount }}</div>
              </div>
            </div>
          </div>
          <div class="patch-progress-section">
            <div class="progress-bar-container">
              <div
                class="progress-segment critical"
                :style="{ width: kpiStats.criticalPatchPercent + '%' }"
              ></div>
              <div
                class="progress-segment important"
                :style="{ width: kpiStats.importantPatchPercent + '%' }"
              ></div>
            </div>
            <div class="progress-labels">
              <div class="stat-label critical">
                <i class="fa fa-circle"></i>
                致命 {{ kpiStats.criticalPatchPercent }}%
                <span class="count">({{ kpiStats.criticalPatchCount }})</span>
              </div>
              <div class="stat-label important">
                <i class="fa fa-circle"></i>
                严重 {{ kpiStats.importantPatchPercent }}%
                <span class="count">({{ kpiStats.importantPatchCount }})</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. 漏洞概览卡片 -->
        <div class="stat-card vul-card">
          <div class="card-title">漏洞概览</div>
          <div class="vul-content">
            <div class="vul-number">{{ kpiStats.vulCount.toLocaleString() }}</div>
            <div class="vul-label">CVE漏洞总数</div>
            <div class="vul-sub-metric">
              <i class="fa fa-bug"></i>
              平均每主机 {{ kpiStats.avgVulPerHost }} 个漏洞
            </div>
            <div class="vul-icon-bg">
              <i class="fa fa-shield-alt"></i>
            </div>
          </div>
        </div>

        <!-- 3. 主机影响卡片 -->
        <div class="stat-card host-card">
          <div class="card-title">主机影响</div>
          <div class="host-content">
            <div class="host-total-row">
              <span class="label">扫描主机</span>
              <span class="value">{{ kpiStats.hostCount }} 台</span>
            </div>

            <div class="impact-item">
              <div class="impact-header">
                <span class="label-critical">致命影响</span>
                <span class="value">
                  {{ kpiStats.criticalHostCount }} 台 ({{ kpiStats.criticalHostPercent }}%)
                </span>
              </div>
              <div class="progress-track">
                <div
                  class="progress-fill critical"
                  :style="{ width: kpiStats.criticalHostPercent + '%' }"
                ></div>
              </div>
            </div>

            <div class="impact-item">
              <div class="impact-header">
                <span class="label-important">严重影响</span>
                <span class="value">
                  {{ kpiStats.importantHostCount }} 台 ({{ kpiStats.importantHostPercent }}%)
                </span>
              </div>
              <div class="progress-track">
                <div
                  class="progress-fill important"
                  :style="{ width: kpiStats.importantHostPercent + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 导航标签 -->
      <div class="nav-tabs">
        <div
          class="nav-tab"
          :class="{ 'nav-tab--active': activeTab === 'host' }"
          @click="activeTab = 'host'"
        >
          <i class="fa fa-laptop" />
          主机概览
        </div>
        <div
          class="nav-tab"
          :class="{ 'nav-tab--active': activeTab === 'vulnerability' }"
          @click="activeTab = 'vulnerability'"
        >
          <i class="fa fa-bug" />
          漏洞概览
        </div>
      </div>

      <!-- 主机概览视图 -->
      <div v-if="activeTab === 'host'" class="tab-content ops-page-layout">
        <!-- 筛选栏 -->
        <div class="ops-filter-bar">
          <el-form :model="hostFilters" inline size="small">
            <el-form-item label="关键词">
              <el-input
                v-model="filterText"
                placeholder="输入字符搜索"
                style="width: 200px"
                clearable
              >
                <template #prefix>
                  <el-icon>
                    <Search />
                  </el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="loading" @click="handleFilter">
                <el-icon>
                  <Search />
                </el-icon>
                搜索
              </el-button>
              <el-button @click="handleHostReset">
                <el-icon>
                  <RefreshRight />
                </el-icon>
                重置
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 操作栏 -->
        <div class="ops-action-bar">
          <span style="flex: 1"></span>
          <el-button
            class="toolbar-icon-btn"
            circle
            size="small"
            :loading="loading"
            @click="refresh"
            title="刷新"
          >
            <el-icon v-show="!loading">
              <Refresh />
            </el-icon>
          </el-button>
        </div>

        <!-- 表格 -->
        <div class="ops-table-wrapper">
          <el-table
            v-loading="loading"
            :data="hostTableData"
            style="width: 100%"
            height="100%"
            @selection-change="handleHostSelectionChange"
          >
            <el-table-column type="selection" width="45" />
            <el-table-column prop="host_key" label="主机" width="150">
              <template #default="{ row }">
                <el-link type="primary" :underline="false" @click="handleHostClick(row)">
                  {{ row.host_key }}
                </el-link>
              </template>
            </el-table-column>
            <el-table-column prop="need_reboot" label="是否需要重启" width="120">
              <template #default="{ row }">
                <el-tag
                  :type="
                    row.need_reboot === 1 ? 'danger' : row.need_reboot === 0 ? 'success' : 'warning'
                  "
                  size="small"
                  round
                >
                  {{ row.need_reboot === 1 ? '是' : row.need_reboot === 0 ? '否' : '未知' }}
                </el-tag>
              </template>
            </el-table-column>

            <!-- 动态及核心表格展示列 (R3) -->
            <template v-for="col in activeColumns" :key="col">
              <el-table-column
                v-if="col === 'HOSTNAME'"
                prop="hostname"
                label="主机名"
                min-width="120"
                show-overflow-tooltip
              />
              <el-table-column
                v-else-if="col === 'OS'"
                prop="os_distro"
                label="操作系统"
                width="110"
              />
              <el-table-column
                v-else-if="col === 'OS_VERSION'"
                prop="os_version"
                label="OS版本"
                width="110"
              />
              <el-table-column
                v-else-if="col === 'RUN_ENVIRONMENT'"
                prop="run_environment"
                label="运行环境"
                width="120"
              >
                <template #default="{ row }">
                  {{ row.run_environment || '-' }}
                </template>
              </el-table-column>
              <el-table-column
                v-else-if="col === 'DEPT_NAME'"
                prop="dept_name"
                label="处置团队"
                width="130"
                show-overflow-tooltip
              >
                <template #default="{ row }">
                  {{ row.dept_name || '-' }}
                </template>
              </el-table-column>
              <el-table-column
                v-else-if="col === 'APPLICATION_SYSTEM'"
                prop="application_system"
                label="应用系统"
                width="140"
                show-overflow-tooltip
              >
                <template #default="{ row }">
                  {{ row.application_system || '-' }}
                </template>
              </el-table-column>
              <el-table-column
                v-else-if="col === 'HOST_RISK_LEVEL'"
                prop="host_risk_level"
                label="主机风险等级"
                width="120"
              >
                <template #default="{ row }">
                  {{ row.host_risk_level || '-' }}
                </template>
              </el-table-column>
              <el-table-column
                v-else-if="col === 'SSH_PORT'"
                prop="ssh_port"
                label="SSH端口"
                width="100"
              >
                <template #default="{ row }">
                  {{ row.ssh_port || '-' }}
                </template>
              </el-table-column>
              <el-table-column
                v-else-if="col === 'SERVICE_PORT'"
                prop="service_port"
                label="业务端口"
                width="100"
              >
                <template #default="{ row }">
                  {{ row.service_port || '-' }}
                </template>
              </el-table-column>
              <el-table-column
                v-else-if="col === 'LOCATION'"
                prop="location"
                label="网络区域环境"
                width="140"
              >
                <template #default="{ row }">
                  <el-tag v-if="row.location" size="small" type="success" effect="plain">
                    {{ row.location }}
                  </el-tag>
                  <span v-else class="text-muted">-</span>
                </template>
              </el-table-column>
            </template>
            <el-table-column prop="num_critical" width="90">
              <template #header>
                严重
                <i class="fa fa-circle text-danger" />
              </template>
              <template #default="{ row }">
                <button
                  type="button"
                  class="severity-count"
                  :class="{ 'font-bold is-clickable': row.num_critical > 0 }"
                  :disabled="row.num_critical <= 0"
                  :title="row.num_critical > 0 ? '查看严重补丁' : ''"
                  @click="handleSeverityCountClick(row, 'Critical')"
                >
                  {{ row.num_critical }}
                </button>
              </template>
            </el-table-column>
            <el-table-column prop="num_important" width="90">
              <template #header>
                重要
                <i class="fa fa-circle text-warning" />
              </template>
              <template #default="{ row }">
                <button
                  type="button"
                  class="severity-count"
                  :class="{ 'font-bold is-clickable': row.num_important > 0 }"
                  :disabled="row.num_important <= 0"
                  :title="row.num_important > 0 ? '查看重要补丁' : ''"
                  @click="handleSeverityCountClick(row, 'Important')"
                >
                  {{ row.num_important }}
                </button>
              </template>
            </el-table-column>
            <el-table-column prop="num_moderate" width="90">
              <template #header>
                中等
                <i class="fa fa-circle text-dark" />
              </template>
              <template #default="{ row }">
                <button
                  type="button"
                  class="severity-count"
                  :class="{ 'font-bold is-clickable': row.num_moderate > 0 }"
                  :disabled="row.num_moderate <= 0"
                  :title="row.num_moderate > 0 ? '查看中等补丁' : ''"
                  @click="handleSeverityCountClick(row, 'Moderate')"
                >
                  {{ row.num_moderate }}
                </button>
              </template>
            </el-table-column>
            <el-table-column prop="num_low" width="80">
              <template #header>
                低
                <i class="fa fa-circle text-info" />
              </template>
              <template #default="{ row }">
                <button
                  type="button"
                  class="severity-count"
                  :class="{ 'font-bold is-clickable': row.num_low > 0 }"
                  :disabled="row.num_low <= 0"
                  :title="row.num_low > 0 ? '查看低危补丁' : ''"
                  @click="handleSeverityCountClick(row, 'Low')"
                >
                  {{ row.num_low }}
                </button>
              </template>
            </el-table-column>
            <el-table-column prop="scan_timestamp" label="最后扫描时间" width="200" sortable>
              <template #default="{ row }">
                {{ formatDateTime(row.scan_timestamp) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="70" fixed="right">
              <template #default="{ row }">
                <el-button
                  text
                  type="primary"
                  size="small"
                  :loading="rescanLoading && rescanningHostKey === getRescanTrackKey(row)"
                  :disabled="rescanLoading"
                  @click="handleSingleHostRescan(row)"
                >
                  扫描
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 分页 -->
        <div class="ops-pagination-wrapper">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </div>

      <!-- 漏洞概览视图 -->
      <div v-else-if="activeTab === 'vulnerability'" class="tab-content ops-page-layout">
        <!-- 筛选栏 -->
        <div class="ops-filter-bar">
          <el-form :model="vulnFilters" inline size="small">
            <el-form-item label="关键词" label-width="60">
              <el-input
                v-model="vulnFilters.filter"
                placeholder="输入主机IP/补丁编号/CVE/软件包"
                style="width: 230px"
                clearable
              />
            </el-form-item>
            <el-form-item label="严重程度" label-width="70">
              <el-select v-model="vulnFilters.severity" style="width: 80px">
                <el-option label="所有" value="all" />
                <el-option label="严重" value="Critical" />
                <el-option label="重要" value="Important" />
                <el-option label="中等" value="Moderate" />
                <el-option label="低" value="Low" />
              </el-select>
            </el-form-item>
            <el-form-item label="补丁状态" label-width="70">
              <el-select v-model="vulnFilters.patch_status" style="width: 110px">
                <el-option label="所有" value="all" />
                <el-option label="未修复" value="no_repair" />
                <el-option label="已修复" value="is_repair" />
                <el-option label="已修复(手动)" value="is_repair_artificial" />
                <el-option label="修复中" value="repairing" />
                <el-option label="修复失败" value="repair_faild" />
                <el-option label="回滚中" value="rolling_back" />
                <el-option label="回滚失败" value="rolling_back_faild" />
                <el-option label="回滚成功" value="rolling_back_success" />
              </el-select>
            </el-form-item>
            <el-form-item label="内核漏洞" label-width="70">
              <el-select v-model="vulnFilters.is_kernel" style="width: 80px">
                <el-option label="所有" value="all" />
                <el-option label="是" value="is_kernel" />
                <el-option label="否" value="no_kernel" />
              </el-select>
            </el-form-item>
            <el-form-item label="操作系统" label-width="70">
              <el-select v-model="vulnFilters.os_distro" style="width: 80px">
                <el-option label="所有" value="all" />
                <el-option v-for="item in osDistroList" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
            <el-form-item label="系统版本" label-width="70" style="margin-right: 16px">
              <el-select v-model="vulnFilters.os_major_version" style="width: 80px">
                <el-option label="所有" value="all" />
                <el-option v-for="item in osVersionList" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
            <el-form-item style="margin-right: 0">
              <el-button type="primary" :loading="vulnLoading" @click="handleVulnFilterChange">
                <el-icon>
                  <Search />
                </el-icon>
                搜索
              </el-button>
              <el-button @click="handleVulnReset">
                <el-icon>
                  <RefreshRight />
                </el-icon>
                重置
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 操作栏 -->
        <div class="ops-action-bar">
          <el-button
            type="primary"
            size="small"
            :disabled="vulnSelectedCount === 0"
            @click="handleFixSelected"
          >
            <i class="fa fa-tools" />
            修复选定的漏洞
          </el-button>
          <el-button
            :type="vulnAllSelected ? 'default' : 'primary'"
            size="small"
            :loading="vulnSelectAllLoading"
            @click="handleToggleVulnSelectAll"
          >
            <i :class="`fa fa-${vulnAllSelected ? 'times' : 'check-double'} me-1`" />
            {{ vulnAllSelected ? '一键取消' : '一键全选' }}
          </el-button>
          <el-button size="small" @click="handleVulnExport">
            <i class="fa fa-download" />
            导出
          </el-button>
          <span style="flex: 1"></span>
          <el-button
            class="toolbar-icon-btn"
            circle
            size="small"
            :loading="vulnLoading"
            @click="loadVulnData"
            title="刷新"
          >
            <el-icon v-show="!vulnLoading">
              <Refresh />
            </el-icon>
          </el-button>
        </div>

        <!-- 表格 -->
        <div class="ops-table-wrapper">
          <el-table
            ref="vulnTableRef"
            v-loading="vulnLoading"
            :data="vulnTableData"
            class="header-border-only-table"
            style="width: 100%"
            max-height="calc(100vh - 600px)"
            @select="handleVulnSelect"
            @select-all="handleVulnSelectAll"
            border
          >
            <el-table-column type="selection" width="45" />
            <el-table-column prop="host_key" label="主机" width="130">
              <template #default="{ row }">
                <a href="javascript:void(0)" class="host-link" @click="handleHostClick(row)">
                  {{ row.host_key }}
                </a>
              </template>
            </el-table-column>
            <el-table-column prop="os_distro" label="操作系统" width="90" />
            <el-table-column prop="os_major_version" label="系统版本" width="90" />
            <el-table-column prop="patch_id" label="补丁编号" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">
                <div class="patch-list">
                  <a
                    v-for="patchId in getPatchIdPreview(row.patch_id)"
                    :key="patchId"
                    href="javascript:void(0)"
                    class="patch-link"
                    @click="handlePatchClick({ patch_id: patchId, os_distro: row.os_distro })"
                  >
                    {{ patchId }}
                  </a>
                  <el-popover
                    v-if="getPatchIdList(row.patch_id).length > 2"
                    placement="top"
                    trigger="hover"
                    :width="360"
                  >
                    <template #reference>
                      <span class="more-link">
                        +{{ getPatchIdList(row.patch_id).length - 2 }} 更多
                      </span>
                    </template>
                    <div class="patch-list-popover">
                      <a
                        v-for="patchId in getPatchIdList(row.patch_id)"
                        :key="patchId"
                        href="javascript:void(0)"
                        class="patch-link"
                        @click="handlePatchClick({ patch_id: patchId, os_distro: row.os_distro })"
                      >
                        {{ patchId }}
                      </a>
                    </div>
                  </el-popover>
                </div>
              </template>
            </el-table-column>
            <el-table-column
              prop="affected_pkgs"
              label="影响的软件包"
              min-width="260"
              class-name="vulnerability-layout-top-cell"
            >
              <template #default="{ row }">
                <div v-if="getAffectedPackages(row).length" class="affected-packages-cell">
                  <div
                    v-for="(pkg, index) in getAffectedPackagePreview(row)"
                    :key="getAffectedPackageKey(pkg, index)"
                    class="affected-package-row"
                  >
                    <button
                      v-if="hasPackageDetail(pkg, row)"
                      type="button"
                      class="affected-package-link affected-package-trigger"
                      :title="pkg.currentPackage"
                      @click="handleViewPackageDetail(pkg, row)"
                    >
                      {{ pkg.currentPackage }}
                    </button>
                    <span v-else class="affected-package-text" :title="pkg.currentPackage">
                      {{ pkg.currentPackage }}
                    </span>
                    <template
                      v-if="pkg.restartType === 'service' && pkg.services && pkg.services.length"
                    >
                      <el-tag
                        v-for="service in pkg.services"
                        :key="service"
                        size="small"
                        type="warning"
                        effect="plain"
                        class="reboot-service-tag"
                        style="margin-left: 4px"
                      >
                        {{ service }}
                      </el-tag>
                    </template>
                  </div>
                  <el-popover
                    v-if="getAffectedPackages(row).length > 2"
                    placement="top"
                    trigger="hover"
                    :width="400"
                  >
                    <template #reference>
                      <span class="more-link">+{{ getAffectedPackages(row).length - 2 }} 更多</span>
                    </template>
                    <div class="affected-packages-popover">
                      <div
                        v-for="(pkg, index) in getAffectedPackages(row)"
                        :key="getAffectedPackageKey(pkg, index)"
                        class="affected-package-row affected-package-popover-row"
                      >
                        <button
                          v-if="hasPackageDetail(pkg, row)"
                          type="button"
                          class="affected-package-link affected-package-trigger"
                          :title="pkg.currentPackage"
                          @click="handleViewPackageDetail(pkg, row)"
                        >
                          {{ pkg.currentPackage }}
                        </button>
                        <span v-else class="affected-package-text" :title="pkg.currentPackage">
                          {{ pkg.currentPackage }}
                        </span>
                        <template
                          v-if="
                            pkg.restartType === 'service' && pkg.services && pkg.services.length
                          "
                        >
                          <el-tag
                            v-for="service in pkg.services"
                            :key="service"
                            size="small"
                            type="warning"
                            effect="plain"
                            class="reboot-service-tag"
                            style="margin-left: 4px"
                          >
                            {{ service }}
                          </el-tag>
                        </template>
                      </div>
                    </div>
                  </el-popover>
                </div>
                <span v-else class="text-muted">-</span>
              </template>
            </el-table-column>
            <el-table-column prop="vul_id" label="CVE" width="150">
              <template #default="{ row }">
                <a :href="getCveUrl(row.vul_id, row.os_distro)" target="_blank" class="cve-badge">
                  {{ row.vul_id }}
                </a>
              </template>
            </el-table-column>
            <el-table-column
              prop="severity"
              label="严重程度"
              width="100"
              class-name="vulnerability-layout-top-cell"
            >
              <template #default="{ row }">
                <el-tag effect="dark" class="severity-tag" :class="getSeverityClass(row.severity)">
                  {{ getSeverityLabel(row.severity) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              prop="reboot_status"
              label="重启要求"
              min-width="260"
              class-name="vulnerability-layout-top-cell"
            >
              <template #default="{ row }">
                <el-tooltip
                  placement="top"
                  :disabled="!getRebootStatusTooltip(row)"
                  :content="getRebootStatusTooltip(row)"
                >
                  <div class="reboot-status-content">
                    <span class="reboot-status-cell">
                      <el-tag
                        v-if="getDisplayRebootStatus(row) === '系统重启'"
                        type="danger"
                        size="small"
                      >
                        <i class="fa fa-power-off"></i>
                        系统重启
                      </el-tag>
                      <el-tag
                        v-else-if="getDisplayRebootStatus(row) === '服务重启'"
                        type="warning"
                        size="small"
                      >
                        <i class="fa fa-server"></i>
                        服务重启
                      </el-tag>
                      <span v-else-if="row.reboot_status !== '服务重启'" class="text-muted">-</span>
                    </span>
                    <div
                      v-if="getDisplayRebootStatus(row) === '服务重启'"
                      class="reboot-services-list"
                    >
                      <el-tag
                        v-for="(service, serviceIndex) in getRebootServices(row)"
                        :key="getRebootServiceKey(row, service, serviceIndex)"
                        size="small"
                        effect="plain"
                        type="warning"
                        class="reboot-service-tag"
                      >
                        {{ service }}
                      </el-tag>
                    </div>
                  </div>
                </el-tooltip>
              </template>
            </el-table-column>
            <el-table-column prop="is_kernel" label="内核" width="70">
              <template #default="{ row }">
                <el-tag :type="row.is_kernel === '是' ? 'primary' : 'info'" size="small" round>
                  <i :class="row.is_kernel === '是' ? 'fa fa-check' : 'fa fa-times'" />
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="patch_status" label="状态" width="110">
              <template #default="{ row }">
                <el-tag
                  :type="getPatchStatusType(row.patch_status)"
                  size="small"
                  round
                  :class="{ 'clickable-status': row.run_id }"
                  @click="row.run_id && handleViewRunResult(row)"
                >
                  <i :class="getPatchStatusIcon(row.patch_status)" style="margin-right: 4px" />
                  {{ row.patch_status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="scan_date" label="扫描时间" width="110">
              <template #default="{ row }">
                {{ formatDate(row.scan_date) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80" fixed="right">
              <template #default="{ row }">
                <el-button
                  text
                  type="primary"
                  size="small"
                  :disabled="row.patch_status !== '已修复' && row.patch_status !== '回滚失败'"
                  @click="handleRollback(row)"
                >
                  回滚
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 分页 -->
        <div class="ops-pagination-wrapper">
          <el-pagination
            v-model:current-page="vulnPagination.page"
            v-model:page-size="vulnPagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="vulnPagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @size-change="handleVulnSizeChange"
            @current-change="handleVulnPageChange"
          />
        </div>
      </div>
    </div>

    <!-- 重新扫描对话框 -->
    <el-dialog v-model="rescanDialogVisible" title="重新扫描补丁" width="600px">
      <el-form ref="rescanFormRef" :model="rescanForm" label-width="100px">
        <el-form-item label="选择主机">
          <AcmDeviceSelector
            v-model="selectedHosts"
            ci-types="linux"
            :options="{
              selectMode: 'host,group,tag,input,recently',
              selector: 'multiple',
              label: '选择主机'
            }"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rescanDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="rescanLoading"
          :disabled="selectedHosts.length === 0"
          @click="executeRescan"
        >
          开始扫描
        </el-button>
      </template>
    </el-dialog>

    <!-- 作业运行结果对话框 -->
    <ExecuteResultDialog
      v-if="runResultDialogVisible"
      v-model:visible="runResultDialogVisible"
      :run-id="runResultRunId"
    />

    <!-- 补丁详情弹窗 -->
    <PatchDetailDialog
      v-model="patchDetailVisible"
      :patch-data="patchDetailData"
      :loading="patchDetailLoading"
      :os-distro="currentPatchOsDistro"
    />

    <HostSeverityPatchDialog
      v-model:visible="severityPatchesDialogVisible"
      :host="severityPatchesDialogHost"
      :severity="severityPatchesDialogSeverity"
      @patch-click="handleSeverityDialogPatchClick"
      @install-success="handleSeverityPatchInstallSuccess"
    />

    <!-- 操作记录对话框 -->
    <OperationLogsDialog v-model="operationLogsVisible" :highlight-run-id="lastSubmittedRunId" />

    <PatchInstallWizard
      v-model:visible="rollbackWizardVisible"
      :patches-to-install="rollbackTaskPatches"
      :fixed-hosts="rollbackTargetHosts"
      :package-candidates="rollbackPackageCandidates"
      :selection-summary-items="rollbackSelectionSummary"
      operation-type="rollback"
      task-mode="rollback"
      @success="handleRollbackSuccess"
    />

    <RpmPackageDetailDialog
      v-model="rpmDetailVisible"
      :loading="rpmDetailLoading"
      :detail-data="rpmDetailData"
    />

    <!-- 修复漏洞确认对话框 -->
    <el-dialog v-model="fixDialogVisible" title="修复选定的漏洞" width="960px" destroy-on-close>
      <div v-loading="fixDialogLoading" class="fix-dialog-content">
        <div class="fix-summary-card">
          <div class="fix-summary-item">
            <span class="fix-summary-label">选中漏洞</span>
            <strong class="fix-summary-value">
              {{ fixDialogData.selectedVulnerabilityCount }}
            </strong>
          </div>
          <div class="fix-summary-item">
            <span class="fix-summary-label">待更新关系</span>
            <strong class="fix-summary-value">{{ fixDialogData.patchStatusIds.length }}</strong>
          </div>
          <div class="fix-summary-hint">
            明细默认按需加载，仅预览部分结果，避免一键全选后一次性拉取过大返回。
          </div>
        </div>
        <div class="fix-grid-layout">
          <div v-for="section in fixSectionCards" :key="section.key" class="fix-info-card">
            <div class="fix-info-header">
              <span>
                <i :class="section.icon" />
                {{ section.label }}
              </span>
              <el-badge
                :value="getFixSectionBadgeValue(section.key)"
                :type="section.badgeType"
                class="header-badge"
              />
            </div>
            <div class="fix-info-body">
              <div v-if="fixDialogLoading" class="empty-text">正在汇总更新范围...</div>
              <div v-else-if="!fixDialogData.patchStatusIds.length" class="empty-text">
                暂无可更新项
              </div>
              <div
                v-else-if="
                  !fixSectionState[section.key].loaded && fixSectionState[section.key].loading
                "
                v-loading="true"
                class="empty-text fix-info-loading"
              >
                正在加载预览...
              </div>
              <div v-else-if="!fixSectionState[section.key].loaded" class="fix-info-placeholder">
                <div class="empty-text">明细未加载</div>
                <div class="fix-info-actions">
                  <el-button
                    size="small"
                    :loading="fixSectionState[section.key].loading"
                    @click="loadFixDialogSection(section.key, 'preview')"
                  >
                    加载预览
                  </el-button>
                  <el-button
                    link
                    :disabled="fixSectionState[section.key].loading"
                    @click="loadFixDialogSection(section.key, 'full')"
                  >
                    加载全部
                  </el-button>
                </div>
                <div v-if="fixSectionState[section.key].error" class="fix-info-hint is-error">
                  {{ fixSectionState[section.key].error }}
                </div>
              </div>
              <div v-else-if="!fixDialogData[section.key].length" class="empty-text">
                {{ section.emptyText }}
              </div>
              <div v-else class="fix-info-content">
                <div class="chips-container">
                  <el-tag
                    v-for="item in getFixSectionDisplayItems(section.key)"
                    :key="item"
                    size="small"
                    :type="section.badgeType"
                    effect="plain"
                    class="chip-tag"
                  >
                    {{ item }}
                  </el-tag>
                </div>
                <div class="fix-info-footer">
                  <span class="fix-info-hint">
                    {{ getFixSectionHint(section.key) }}
                  </span>
                  <el-button
                    v-if="
                      fixSectionState[section.key].mode !== 'full' &&
                      fixSectionState[section.key].hasMore
                    "
                    link
                    @click="loadFixDialogSection(section.key, 'full')"
                  >
                    加载完整数据
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="fixDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="fixSubmitting"
          :disabled="!fixDialogData.patchStatusIds.length || fixDialogLoading"
          @click="handleConfirmFix"
        >
          <i class="fa fa-chevron-right" />
          开始更新
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Refresh, Search, RefreshRight } from '@element-plus/icons-vue'
import { patchScanApi, patchOverviewApi, rpmInfoApi, vulnerabilityApi } from '../api'
import { getCveUrl, getSeverityClass, getSeverityLabel } from '../composables/useFormatters'
import {
  getAffectedPackageDetailParams,
  getDisplayRebootStatus,
  getAffectedPackageNames,
  getAffectedPackages,
  getRebootServices,
  getRebootStatusTooltip,
  hasAffectedPackageDetail
} from '../utils/vulnerabilityPackages'
import { assetApi } from '@/modules/asset/api'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import OperationLogsDialog from '../components/logs/OperationLogsDialog.vue'
import HostSeverityPatchDialog from '../components/host-detail/dialogs/HostSeverityPatchDialog.vue'
import PatchDetailDialog from '../components/host-detail/dialogs/PatchDetailDialog.vue'
import PatchInstallWizard from '../components/patch-task/wizard/PatchInstallWizard.vue'
import RpmPackageDetailDialog from '../components/rpm/RpmPackageDetailDialog.vue'

// ECharts
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart, GaugeChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, GridComponent } from 'echarts/components'
import VChart from 'vue-echarts'

use([CanvasRenderer, PieChart, GaugeChart, TitleComponent, TooltipComponent, GridComponent])

// Router
const router = useRouter()
const route = useRoute()

// 当前标签页
const activeTab = ref('host')

// KPI 数据统计
const kpiStats = reactive({
  criticalPatchCount: 0,
  importantPatchCount: 0,
  totalPatchCount: 0,
  criticalPatchPercent: 0,
  importantPatchPercent: 0,

  vulCount: 0,
  hostCount: 0,
  avgVulPerHost: 0,

  criticalHostCount: 0,
  importantHostCount: 0,
  criticalHostPercent: 0,
  importantHostPercent: 0
})

// 图表配置 - 补丁统计半环图
const chartOption = computed(() => {
  return {
    tooltip: {
      trigger: 'item'
    },
    series: [
      {
        name: '补丁统计',
        type: 'pie',
        radius: ['60%', '80%'],
        center: ['50%', '70%'],
        // 调整起始角度，使其变成半圆
        startAngle: 180,
        endAngle: 0,
        data: [
          { value: kpiStats.criticalPatchCount, name: '严重', itemStyle: { color: '#F53F3F' } },
          { value: kpiStats.importantPatchCount, name: '重要', itemStyle: { color: '#FF7D00' } }
        ],
        label: {
          show: false
        },
        emphasis: {
          scale: true,
          scaleSize: 5
        }
      }
    ]
  }
})

// 主机表格
const loading = ref(false)
const filterText = ref('')
const hostTableData = ref([])
const hostFilters = reactive({
  keyword: ''
})
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// ====== R3 & R4 状态 ======
const batchSelectedHosts = ref([]) // 批量选中的主机列表
const activeColumns = ref(['HOSTNAME', 'OS', 'LOCATION', 'RUN_ENVIRONMENT'])

// 表格多选发生变化
function handleHostSelectionChange(selection) {
  batchSelectedHosts.value = selection
}
// ====== 结束 ======

// 漏洞表格
const vulnLoading = ref(false)
const vulnFilterText = ref('')
const vulnTableData = ref([])
const vulnPagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 漏洞筛选器
const vulnFilters = reactive({
  filter: '',
  severity: 'all',
  patch_status: 'all',
  is_kernel: 'all',
  os_distro: 'all',
  os_major_version: 'all',
  reboot_status: 'all'
})

const validPatchTabs = new Set(['host', 'vulnerability'])
const validSeverityValues = new Set(['all', 'Critical', 'Important', 'Moderate', 'Low'])

function syncStateFromRoute() {
  const queryTab = Array.isArray(route.query.tab) ? route.query.tab[0] : route.query.tab
  const querySeverity = Array.isArray(route.query.severity)
    ? route.query.severity[0]
    : route.query.severity

  activeTab.value = validPatchTabs.has(queryTab) ? queryTab : 'host'
  vulnFilters.severity = validSeverityValues.has(querySeverity) ? querySeverity : 'all'
}

// 操作系统列表
const osDistroList = ref([])
const osVersionList = ref([])

// 漏洞表格选择
const vulnTableRef = ref(null)
const selectedVulns = ref([])
const vulnAllSelected = ref(false)
const vulnExcludedRowKeys = ref([])
const vulnSelectAllLoading = ref(false)
const vulnSelectedCount = computed(() => {
  if (!vulnAllSelected.value) {
    return selectedVulns.value.length
  }

  return Math.max(vulnPagination.total - vulnExcludedRowKeys.value.length, 0)
})

// 重新扫描对话框
const rescanDialogVisible = ref(false)
const rescanLoading = ref(false)
const rescanningHostKey = ref('')
const rescanFormRef = ref(null)
const rescanForm = reactive({
  hostsInput: ''
})
const selectedHosts = ref([])

// 作业运行结果对话框
const runResultDialogVisible = ref(false)
const runResultRunId = ref('')

// 操作记录对话框
const operationLogsVisible = ref(false)
const lastSubmittedRunId = ref('')

// 补丁详情
const patchDetailVisible = ref(false)
const patchDetailLoading = ref(false)
const patchDetailData = ref({})
const currentPatchOsDistro = ref('')
const severityPatchesDialogVisible = ref(false)
const severityPatchesDialogHost = ref(null)
const severityPatchesDialogSeverity = ref('')
const rpmDetailVisible = ref(false)
const rpmDetailLoading = ref(false)
const rpmDetailData = ref({})

async function loadPatchDetail(patchId, osDistro) {
  currentPatchOsDistro.value = osDistro || ''
  patchDetailVisible.value = true
  patchDetailLoading.value = true
  patchDetailData.value = {}
  try {
    const response = await patchScanApi.getPatchDetail({ patch_id: patchId })
    const records = response?.data?.records || response?.records || []
    if (records.length > 0) {
      patchDetailData.value = records[0]
    } else {
      ElMessage.warning('未找到补丁详情')
      patchDetailVisible.value = false
    }
  } catch (error) {
    console.error('Failed to load patch detail:', error)
    ElMessage.error('获取补丁详情失败')
    patchDetailVisible.value = false
  } finally {
    patchDetailLoading.value = false
  }
}

function getPatchIdList(patchId) {
  if (!patchId) return []
  return String(patchId)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function getPatchIdPreview(patchId) {
  return getPatchIdList(patchId).slice(0, 2)
}

function getRollbackHostId(row) {
  return row.hosts_id || row.hostsId || row.host_id || row.hostId || ''
}

function getAffectedPackageList(row) {
  return getAffectedPackageNames(row)
}

function getAffectedPackagePreview(row) {
  return getAffectedPackages(row).slice(0, 2)
}

function getRowOsDistro(row) {
  return String(row?.osDistro || row?.os_distro || '').trim()
}

function getAffectedPackageKey(pkg, index) {
  return [pkg?.rpmInfoId, pkg?.currentPackage, index].filter(Boolean).join('-')
}

function hasPackageDetail(pkg, row) {
  if (pkg?.rpmInfoId != null) return true
  const pkgName = pkg?.pkgName || pkg?.name
  const source = pkg?.source
  const arch = pkg?.pkgArch || pkg?.arch || pkg?.architecture
  if (pkgName && source && arch) return true
  return hasAffectedPackageDetail(pkg, getRowOsDistro(row))
}

function hasRpmDetailResponse(data) {
  return Boolean(
    data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length > 0
  )
}

function getRebootServiceKey(row, service, index) {
  return [row?.host_key, row?.vul_id, row?.patch_id, service, index].filter(Boolean).join('-')
}

// 按 API 文档 §2.3 的三级回退顺序构建候选请求
// 1) rpmInfoId → /rpm-info/detail/{id}
// 2) pkgName + source + arch → /rpm-info/detail
// 3) currentPackage + osDistro + arch → /rpm-info/installed/detail
function buildRpmDetailCandidates(pkg, row) {
  const candidates = []

  if (pkg?.rpmInfoId != null) {
    candidates.push({
      label: 'by id',
      request: () => rpmInfoApi.getPackageDetailById(pkg.rpmInfoId)
    })
  }

  const pkgName = pkg?.pkgName || pkg?.name
  const source = pkg?.source
  const arch = pkg?.pkgArch || pkg?.arch || pkg?.architecture
  if (pkgName && source && arch) {
    candidates.push({
      label: 'by name/source/arch',
      request: () => rpmInfoApi.getPackageDetail({ name: pkgName, source, arch })
    })
  }

  const detailParams = getAffectedPackageDetailParams(pkg, getRowOsDistro(row))
  if (detailParams.installedDetail) {
    candidates.push({
      label: 'by installed currentPackage',
      request: () => rpmInfoApi.getInstalledDetail(detailParams.installedDetail)
    })
  }

  return candidates
}

async function handleViewPackageDetail(pkg, row) {
  const candidates = buildRpmDetailCandidates(pkg, row)
  if (candidates.length === 0) {
    ElMessage.warning('当前软件包暂无 RPM 详情')
    return
  }

  // 一次性打开 Drawer 并进入 loading，避免多级回退过程中 visible/loading 反复切换导致 UI 闪烁
  rpmDetailVisible.value = true
  rpmDetailLoading.value = true
  rpmDetailData.value = {}

  try {
    for (const candidate of candidates) {
      try {
        const response = await candidate.request()
        const responseData = response?.data || response || {}
        if (hasRpmDetailResponse(responseData)) {
          rpmDetailData.value = responseData
          return
        }
      } catch (error) {
        // 任意一级失败继续尝试下一级，错误仅落日志，最终在所有候选都未命中时才提示用户
        console.error(`Failed to load rpm package detail (${candidate.label}):`, error)
      }
    }

    ElMessage.warning('当前软件包暂无 RPM 详情')
    rpmDetailVisible.value = false
  } finally {
    rpmDetailLoading.value = false
  }
}

function buildRollbackWizardData(row) {
  const hostId = getRollbackHostId(row)
  const patchIds = getPatchIdList(row.patch_id)
  const patchStatusIds = resolvePatchStatusIds([row])
  const packages = getAffectedPackageList(row)

  if (!hostId) {
    throw new Error('当前记录缺少主机ID，无法创建回滚任务')
  }

  if (patchIds.length === 0) {
    throw new Error('当前记录缺少补丁编号，无法创建回滚任务')
  }

  rollbackTargetHosts.value = [
    {
      hostId,
      hostKey: row.host_key || row.hostKey || row.hosts || hostId,
      os_distro: row.os_distro || '',
      os_version: row.os_major_version || row.os_version || ''
    }
  ]
  rollbackTaskPatches.value = patchIds.map(patchId => ({
    patch_id: patchId,
    patch_name: row.vul_id || patchId,
    patchStatusIds
  }))
  rollbackPackageCandidates.value = packages
  rollbackSelectionSummary.value = [
    {
      key: row.id || `${hostId}-${patchIds.join(',')}`,
      primary: row.vul_id || patchIds.join(', ') || '-',
      secondary: [
        patchIds.join(', '),
        row.host_key || row.hostKey || '',
        packages.length ? `${packages.length} 个软件包` : ''
      ]
        .filter(Boolean)
        .join(' / ')
    }
  ]
}

// 修复漏洞对话框
const fixDialogVisible = ref(false)
const fixSubmitting = ref(false)
const FIX_DIALOG_PREVIEW_LIMIT = 20
const FIX_DIALOG_ID_BATCH_SIZE = 200
const FIX_DIALOG_DETAIL_BATCH_SIZE = 1000
const fixSectionCards = [
  {
    key: 'hosts',
    label: '待更新的主机',
    icon: 'fa fa-desktop text-muted',
    badgeType: 'primary',
    emptyText: '暂无主机'
  },
  {
    key: 'patches',
    label: '待更新的补丁',
    icon: 'fa fa-briefcase-medical text-muted',
    badgeType: 'warning',
    emptyText: '暂无补丁'
  },
  {
    key: 'cves',
    label: '待更新的 CVE',
    icon: 'fa fa-suitcase text-muted',
    badgeType: 'danger',
    emptyText: '暂无 CVE'
  },
  {
    key: 'packages',
    label: '待更新的软件包',
    icon: 'fa fa-cube text-muted',
    badgeType: 'success',
    emptyText: '暂无软件包'
  }
]
const fixDialogData = reactive({
  hosts: [],
  patches: [],
  cves: [],
  packages: [],
  patchStatusIds: [],
  selectedVulnerabilityCount: 0
})
const fixSectionState = reactive({
  hosts: { loaded: false, loading: false, mode: 'idle', hasMore: false, error: '' },
  patches: { loaded: false, loading: false, mode: 'idle', hasMore: false, error: '' },
  cves: { loaded: false, loading: false, mode: 'idle', hasMore: false, error: '' },
  packages: { loaded: false, loading: false, mode: 'idle', hasMore: false, error: '' }
})
const fixDialogLoading = ref(false)
const rollbackWizardVisible = ref(false)
const rollbackTaskPatches = ref([])
const rollbackTargetHosts = ref([])
const rollbackPackageCandidates = ref([])
const rollbackSelectionSummary = ref([])

// 格式化日期时间
function formatDateTime(timestamp) {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 加载 KPI 数据
async function loadKpiData() {
  try {
    const response = await patchOverviewApi.getIndexStats()
    if (response?.data?.records) {
      // 临时映射表
      const dataMap = {
        scan_count_critical_patch: 0,
        scan_count_important_patch: 0,
        scan_count_vul: 0,
        scan_count_host_with_critical: 0,
        scan_count_host_with_important: 0,
        scan_count_host: 0
      }

      response.data.records.forEach(rec => {
        if (rec.name in dataMap) {
          dataMap[rec.name] = rec.value || 0
        }
      })

      // 1. 补丁统计
      kpiStats.criticalPatchCount = dataMap.scan_count_critical_patch
      kpiStats.importantPatchCount = dataMap.scan_count_important_patch
      kpiStats.totalPatchCount = kpiStats.criticalPatchCount + kpiStats.importantPatchCount

      if (kpiStats.totalPatchCount > 0) {
        kpiStats.criticalPatchPercent = Number(
          ((kpiStats.criticalPatchCount / kpiStats.totalPatchCount) * 100).toFixed(1)
        )
        kpiStats.importantPatchPercent = Number(
          ((kpiStats.importantPatchCount / kpiStats.totalPatchCount) * 100).toFixed(1)
        )
      } else {
        kpiStats.criticalPatchPercent = 0
        kpiStats.importantPatchPercent = 0
      }

      // 2. 漏洞概览
      kpiStats.vulCount = dataMap.scan_count_vul
      kpiStats.hostCount = dataMap.scan_count_host
      if (kpiStats.hostCount > 0) {
        kpiStats.avgVulPerHost = Math.round(kpiStats.vulCount / kpiStats.hostCount)
      } else {
        kpiStats.avgVulPerHost = 0
      }

      // 3. 主机影响
      kpiStats.criticalHostCount = dataMap.scan_count_host_with_critical
      kpiStats.importantHostCount = dataMap.scan_count_host_with_important

      if (kpiStats.hostCount > 0) {
        kpiStats.criticalHostPercent = Math.round(
          (kpiStats.criticalHostCount / kpiStats.hostCount) * 100
        )
        kpiStats.importantHostPercent = Math.round(
          (kpiStats.importantHostCount / kpiStats.hostCount) * 100
        )
      } else {
        kpiStats.criticalHostPercent = 0
        kpiStats.importantHostPercent = 0
      }
    }
  } catch (error) {
    console.error('Failed to load KPI data:', error)
  }
}

// 加载主机表格数据
async function loadHostData() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      size: pagination.pageSize,
      filter: filterText.value
    }
    const response = await patchScanApi.getScanResults(params)
    if (response?.data) {
      const records = response.data.records || []

      // 一次性获取所有主机的资产信息，回填是否需要重启和 OS 版本
      try {
        const assetParams = {
          hostKeys: '@@',
          assetType: 'linux',
          permission: 'r',
          status: 'all',
          CONN_LATEST_STATUS: '',
          system_name: ' ',
          os_version: ' '
        }
        const assetRes = await assetApi.getAssetList(assetParams, { size: 1000 })
        if (assetRes?.records) {
          const assetInfoMap = {}
          assetRes.records.forEach(item => {
            if (item.IP) {
              // 从标签筛选 LOCATION 区域
              let location = null
              const tags = item.tags || item.Tags || []
              const locationNames = ['互联网', '外联网', '内网环境、孤岛环境']
              const matchedTag = tags.find(t => locationNames.includes(t.name || t))
              if (matchedTag) {
                location = matchedTag.name || matchedTag
              }

              assetInfoMap[item.IP] = {
                needReboot: item.needReboot,
                osVersion: item.os_version || '',
                run_environment: item.RUN_ENVIRONMENT || item.run_environment || '',
                dept_name: item.DEPT_NAME || item.dept_name || '',
                application_system: item.APPLICATION_SYSTEM || item.application_system || '',
                host_risk_level: item.HOST_RISK_LEVEL || item.host_risk_level || '',
                ssh_port: item.SSH_PORT || item.ssh_port || '',
                service_port: item.SERVICE_PORT || item.service_port || '',
                location
              }
            }
          })
          records.forEach(record => {
            if (record.host_key in assetInfoMap) {
              const assetInfo = assetInfoMap[record.host_key]
              record.need_reboot = assetInfo.needReboot
              record.os_version = assetInfo.osVersion || record.os_version
              record.run_environment = assetInfo.run_environment
              record.dept_name = assetInfo.dept_name
              record.application_system = assetInfo.application_system
              record.host_risk_level = assetInfo.host_risk_level
              record.ssh_port = assetInfo.ssh_port
              record.service_port = assetInfo.service_port
              record.location = assetInfo.location
            }
          })
        }
      } catch (err) {
        console.error('Failed to load reboot status:', err)
      }

      hostTableData.value = records
      pagination.total = response.data.total || 0
    }
  } catch (error) {
    console.error('Failed to load host data:', error)
    hostTableData.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

// 加载漏洞表格数据
async function loadVulnData() {
  vulnLoading.value = true
  try {
    const response = await vulnerabilityApi.getVulnerabilityList(buildVulnListParams())
    const data = response?.data || response || {}
    vulnTableData.value = Array.isArray(data.content)
      ? data.content
      : Array.isArray(data.records)
        ? data.records
        : []
    vulnPagination.total = Number(data.totalElements ?? data.total ?? vulnTableData.value.length)
  } catch (error) {
    console.error('Failed to load vulnerability data:', error)
    vulnTableData.value = []
    vulnPagination.total = 0
  } finally {
    vulnLoading.value = false
  }
}

// 加载操作系统列表
async function loadOsLists() {
  try {
    const [osDistroRes, osVersionRes] = await Promise.all([
      vulnerabilityApi.getOsDistroList(),
      vulnerabilityApi.getOsVersionList()
    ])
    if (osDistroRes?.data?.records) {
      osDistroList.value = osDistroRes.data.records.map(item => item.os_distro)
    }
    if (osVersionRes?.data?.records) {
      osVersionList.value = osVersionRes.data.records.map(item => item.os_major_version)
    }
  } catch (error) {
    console.error('Failed to load OS lists:', error)
  }
}

// 事件处理
function handleFilter() {
  pagination.page = 1
  loadHostData()
}

function handleHostReset() {
  filterText.value = ''
  pagination.page = 1
  pagination.pageSize = 20
  loadHostData()
}

function handleVulnReset() {
  resetVulnSelectionState()
  vulnFilters.severity = 'all'
  vulnFilters.patch_status = 'all'
  vulnFilters.is_kernel = 'all'
  vulnFilters.os_distro = 'all'
  vulnFilters.os_major_version = 'all'
  vulnFilters.filter = ''
  vulnPagination.page = 1
  vulnPagination.pageSize = 20
  loadVulnData()
}

async function handleVulnExport() {
  const queryParams = {}

  if (vulnFilters.host_key && vulnFilters.host_key !== 'all') {
    queryParams.host_key = vulnFilters.host_key
  }
  if (vulnFilters.vul_id && vulnFilters.vul_id !== 'all') {
    queryParams.vul_id = vulnFilters.vul_id
  }
  if (vulnFilters.severity && vulnFilters.severity !== 'all') {
    queryParams.severity = vulnFilters.severity
  }
  if (vulnFilters.reboot_status && vulnFilters.reboot_status !== 'all') {
    queryParams.reboot_status = vulnFilters.reboot_status
  }
  if (vulnFilters.is_kernel && vulnFilters.is_kernel !== 'all') {
    queryParams.is_kernel = vulnFilters.is_kernel
  }
  if (vulnFilters.patch_status && vulnFilters.patch_status !== 'all') {
    queryParams.patch_status = vulnFilters.patch_status
  }
  if (vulnFilters.os_distro && vulnFilters.os_distro !== 'all') {
    queryParams.os_distro = vulnFilters.os_distro
  }
  if (vulnFilters.os_major_version && vulnFilters.os_major_version !== 'all') {
    queryParams.os_major_version = vulnFilters.os_major_version
  }
  if (vulnFilters.filter || vulnFilterText.value) {
    queryParams.filter = vulnFilters.filter || vulnFilterText.value
  }

  try {
    ElMessage.info('正在导出，请稍候...')
    const res = await vulnerabilityApi.exportVulnerabilityList(queryParams)
    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `补丁扫描信息_${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    URL.revokeObjectURL(a.href)
    ElMessage.success('导出成功！')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败，请稍后重试')
  }
}

function handlePageChange(page) {
  pagination.page = page
  loadHostData()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  loadHostData()
}

function handleVulnPageChange(page) {
  vulnPagination.page = page
  loadVulnData()
}

function handleVulnSizeChange(size) {
  vulnPagination.pageSize = size
  vulnPagination.page = 1
  loadVulnData()
}

function handleHostClick(row) {
  router.push({
    name: 'patches-hostDetail',
    query: {
      host_key: row.host_key || row.hostKey || '',
      host_id: row.host_id || row.hostId || row.id || '',
      os_distro: row.os_distro,
      os_version: row.os_version,
      hostname: row.hostname,
      fromLabel: '机器扫描',
      fromRouteName: 'patches-machineScan'
    }
  })
}

function handleSeverityCountClick(row, severity) {
  const severityFieldMap = {
    Critical: 'num_critical',
    Important: 'num_important',
    Moderate: 'num_moderate',
    Low: 'num_low'
  }
  const count = Number(row?.[severityFieldMap[severity]] || 0)

  if (count <= 0) {
    return
  }

  severityPatchesDialogHost.value = { ...row }
  severityPatchesDialogSeverity.value = severity
  severityPatchesDialogVisible.value = true
}

function handleSeverityDialogPatchClick(row) {
  handlePatchClick({
    ...row,
    os_distro: row?.os_distro || severityPatchesDialogHost.value?.os_distro || ''
  })
}

function handleSeverityPatchInstallSuccess() {
  refreshPatchScanLists()
}

function refreshPatchScanLists() {
  loadKpiData()
  loadHostData()
  loadVulnData()
}

function handleVulnFilterChange() {
  resetVulnSelectionState()
  vulnPagination.page = 1
  loadVulnData()
}

function handlePatchClick(row) {
  if (row.patch_id) {
    loadPatchDetail(row.patch_id, row.os_distro)
  }
}

function handleRollback(row) {
  try {
    buildRollbackWizardData(row)
    rollbackWizardVisible.value = true
  } catch (error) {
    ElMessage.error(`打开回滚向导失败: ${error.message || '未知错误'}`)
  }
}

function handleRollbackSuccess() {
  refreshPatchScanLists()
}

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 获取补丁状态类型
function getPatchStatusType(status) {
  const typeMap = {
    未修复: 'info',
    已修复: 'success',
    '已修复(手动)': 'success',
    修复中: '',
    修复失败: 'warning',
    回滚中: '',
    回滚失败: 'warning',
    回滚成功: 'info'
  }
  return typeMap[status] || 'info'
}

// 获取补丁状态图标
function getPatchStatusIcon(status) {
  const iconMap = {
    未修复: 'fa fa-times',
    已修复: 'fa fa-check',
    '已修复(手动)': 'fa fa-check',
    修复中: 'fa fa-cog fa-spin',
    修复失败: 'fa fa-exclamation-triangle',
    回滚中: 'fa fa-cog fa-spin',
    回滚失败: 'fa fa-exclamation-triangle',
    回滚成功: 'fa fa-check'
  }
  return iconMap[status] || 'fa fa-circle'
}

function resolvePatchStatusIds(rows) {
  const ids = new Set()

  rows.forEach(row => {
    extractPatchStatusIdsFromRow(row).forEach(id => ids.add(id))
  })

  return Array.from(ids)
}

function extractPatchStatusIdsFromRow(row) {
  const value =
    row.patch_status_id ?? row.patch_status_ids ?? row.id ?? row.patchStatusId ?? row.patchStatusIds

  if (Array.isArray(value)) {
    return value
      .map(String)
      .map(item => item.trim())
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  }

  return value ? [String(value)] : []
}

function parseJobRunResult(response) {
  const payload = response?.data ?? response
  const result = Array.isArray(payload) ? payload[0] : payload

  return {
    isSuccess: result?.status === 'COMPLETED' && result?.data?._status === 'ok',
    runId: result?.runId || result?.data?.runId || '',
    result
  }
}

// 查看作业运行结果
function handleViewRunResult(row) {
  if (!row.run_id) return
  runResultRunId.value = row.run_id
  runResultDialogVisible.value = true
}

function buildVulnListParams(overrides = {}) {
  return {
    page: overrides.page ?? vulnPagination.page - 1,
    size: overrides.size ?? vulnPagination.pageSize,
    host_key: vulnFilters.host_key || '',
    vul_id: vulnFilters.vul_id || null,
    severity: vulnFilters.severity,
    patch_status: vulnFilters.patch_status,
    is_kernel: vulnFilters.is_kernel,
    os_distro: vulnFilters.os_distro,
    os_major_version: vulnFilters.os_major_version,
    reboot_status: vulnFilters.reboot_status,
    filter: vulnFilters.filter || vulnFilterText.value || ''
  }
}

function getVulnRowKey(row) {
  const directId = row?.patch_status_id ?? row?.patchStatusId ?? row?.id
  if (directId) {
    return String(directId)
  }

  return [row?.host_key, row?.vul_id, row?.patch_id, row?.os_distro].filter(Boolean).join('|')
}

function chunkArray(items, chunkSize) {
  const chunks = []
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize))
  }
  return chunks
}

function resetFixDialogData() {
  fixDialogData.hosts = []
  fixDialogData.patches = []
  fixDialogData.cves = []
  fixDialogData.packages = []
  fixDialogData.patchStatusIds = []
  fixDialogData.selectedVulnerabilityCount = 0

  Object.values(fixSectionState).forEach(state => {
    state.loaded = false
    state.loading = false
    state.mode = 'idle'
    state.hasMore = false
    state.error = ''
  })
}

async function collectSelectedPatchStatusIdsForFix() {
  if (!vulnAllSelected.value) {
    return resolvePatchStatusIds(selectedVulns.value)
  }

  const excludedKeySet = new Set(vulnExcludedRowKeys.value)
  const ids = new Set()
  const batchSize = Math.max(vulnPagination.pageSize, FIX_DIALOG_ID_BATCH_SIZE)
  let page = 0
  let totalCount = Number(vulnPagination.total || 0)

  while (true) {
    const response = await vulnerabilityApi.getVulnerabilityList(
      buildVulnListParams({ page, size: batchSize })
    )
    const data = response?.data || response || {}
    const pageRows = Array.isArray(data.content)
      ? data.content
      : Array.isArray(data.records)
        ? data.records
        : []

    pageRows.forEach(row => {
      if (excludedKeySet.has(getVulnRowKey(row))) {
        return
      }

      extractPatchStatusIdsFromRow(row).forEach(id => ids.add(id))
    })

    if (!totalCount) {
      totalCount = Number(data.totalElements ?? data.total ?? 0)
    }

    if (
      pageRows.length === 0 ||
      pageRows.length < batchSize ||
      (page + 1) * batchSize >= totalCount
    ) {
      break
    }

    page += 1
  }

  return Array.from(ids)
}

function getFixSectionItemsFromRecords(sectionKey, records) {
  switch (sectionKey) {
    case 'hosts':
      return records.flatMap(record => {
        if (!record.host_key) return []
        return String(record.host_key)
          .split(',')
          .map(item => item.trim())
          .filter(Boolean)
      })
    case 'patches':
      return records.flatMap(record => getPatchIdList(record.patch_id))
    case 'cves':
      return records.flatMap(record => {
        if (!record.vul_id) return []
        return String(record.vul_id)
          .split(',')
          .map(item => item.trim())
          .filter(Boolean)
      })
    case 'packages':
      return records.flatMap(record => getAffectedPackageNames(record)).filter(Boolean)
    default:
      return []
  }
}

async function fetchFixDialogSectionItems(sectionKey, mode = 'preview') {
  const idChunks = chunkArray(fixDialogData.patchStatusIds, FIX_DIALOG_DETAIL_BATCH_SIZE)
  const uniqueItems = new Set()
  let hasMore = false

  for (let index = 0; index < idChunks.length; index += 1) {
    const chunk = idChunks[index]
    let response = null

    if (sectionKey === 'hosts') {
      response = await vulnerabilityApi.getPatchStatusHosts(chunk)
    } else if (sectionKey === 'patches') {
      response = await vulnerabilityApi.getPatchStatusPatches(chunk)
    } else if (sectionKey === 'cves') {
      response = await vulnerabilityApi.getPatchStatusCves(chunk)
    } else if (sectionKey === 'packages') {
      response = await vulnerabilityApi.getPatchStatusPackages(chunk)
    }

    const records = response?.data?.records || []
    const items = getFixSectionItemsFromRecords(sectionKey, records)

    for (const item of items) {
      const normalized = typeof item === 'string' ? item.trim() : item
      if (!normalized) {
        continue
      }

      if (uniqueItems.has(normalized)) {
        continue
      }

      if (mode === 'preview' && uniqueItems.size >= FIX_DIALOG_PREVIEW_LIMIT) {
        hasMore = true
        break
      }

      uniqueItems.add(normalized)
    }

    if (mode === 'preview' && (hasMore || uniqueItems.size >= FIX_DIALOG_PREVIEW_LIMIT)) {
      hasMore = hasMore || index < idChunks.length - 1
      break
    }
  }

  return {
    items: Array.from(uniqueItems),
    hasMore: mode === 'preview' ? hasMore : false
  }
}

async function loadFixDialogSection(sectionKey, mode = 'preview') {
  const state = fixSectionState[sectionKey]
  if (!state || state.loading || !fixDialogData.patchStatusIds.length) {
    return
  }

  if (state.loaded && (state.mode === 'full' || state.mode === mode)) {
    return
  }

  state.loading = true
  state.error = ''

  try {
    const { items, hasMore } = await fetchFixDialogSectionItems(sectionKey, mode)
    fixDialogData[sectionKey] = items
    state.loaded = true
    state.mode = mode
    state.hasMore = hasMore
  } catch (error) {
    console.error(`加载${sectionKey}明细失败:`, error)
    state.error = error.message || '加载失败，请稍后重试'
  } finally {
    state.loading = false
  }
}

function getFixSectionBadgeValue(sectionKey) {
  const state = fixSectionState[sectionKey]
  if (!fixDialogData.patchStatusIds.length) {
    return 0
  }

  if (state.loading) {
    return '...'
  }

  if (!state.loaded) {
    return '待加载'
  }

  if (state.mode === 'preview' && state.hasMore) {
    return `${Math.min(fixDialogData[sectionKey].length, FIX_DIALOG_PREVIEW_LIMIT)}+`
  }

  return fixDialogData[sectionKey].length
}

function getFixSectionDisplayItems(sectionKey) {
  return fixDialogData[sectionKey].slice(0, FIX_DIALOG_PREVIEW_LIMIT)
}

function getFixSectionHint(sectionKey) {
  const state = fixSectionState[sectionKey]
  const displayCount = getFixSectionDisplayItems(sectionKey).length

  if (state.mode === 'preview') {
    if (state.hasMore) {
      return `当前仅展示前 ${displayCount} 项预览，可按需继续加载完整数据。`
    }
    return `已加载 ${displayCount} 项预览结果。`
  }

  if (fixDialogData[sectionKey].length > FIX_DIALOG_PREVIEW_LIMIT) {
    return `已完整加载 ${fixDialogData[sectionKey].length} 项结果，当前仅展示前 ${displayCount} 项。`
  }

  return `已完整加载 ${fixDialogData[sectionKey].length} 项结果。`
}

function resetVulnSelectionState() {
  vulnAllSelected.value = false
  vulnExcludedRowKeys.value = []
  selectedVulns.value = []
  vulnTableRef.value?.clearSelection()
}

// 漏洞选择变化精确接管
function handleVulnSelect(selection) {
  if (!vulnAllSelected.value) {
    selectedVulns.value = selection
    return
  }

  const currentPageKeys = vulnTableData.value.map(getVulnRowKey).filter(Boolean)
  const currentSelectedKeys = new Set(selection.map(getVulnRowKey).filter(Boolean))
  const nextExcludedKeys = new Set(vulnExcludedRowKeys.value)

  currentPageKeys.forEach(key => {
    nextExcludedKeys.delete(key)
  })

  currentPageKeys.forEach(key => {
    if (!currentSelectedKeys.has(key)) {
      nextExcludedKeys.add(key)
    }
  })

  vulnExcludedRowKeys.value = Array.from(nextExcludedKeys)
  selectedVulns.value = selection

  if (vulnPagination.total > 0 && vulnExcludedRowKeys.value.length >= vulnPagination.total) {
    resetVulnSelectionState()
  }
}

function handleVulnSelectAll(selection) {
  handleVulnSelect(selection)
}

// 恢复全选状态下可见页的勾选
function restoreVulnPageSelection() {
  if (!vulnAllSelected.value || !vulnTableRef.value) return
  vulnTableRef.value.clearSelection()
  vulnTableData.value.forEach(row => {
    if (!vulnExcludedRowKeys.value.includes(getVulnRowKey(row))) {
      vulnTableRef.value.toggleRowSelection(row, true)
    }
  })
}

// 一键全选 / 一键取消 切换
async function handleToggleVulnSelectAll() {
  if (vulnAllSelected.value) {
    resetVulnSelectionState()
  } else {
    if (vulnPagination.total === 0) {
      return
    }

    vulnAllSelected.value = true
    vulnExcludedRowKeys.value = []
    selectedVulns.value = [...vulnTableData.value]
    await nextTick()
    restoreVulnPageSelection()
  }
}

// 修复选定的漏洞
async function handleFixSelected() {
  if (vulnSelectedCount.value === 0) {
    ElMessage.warning('请先选择要修复的漏洞')
    return
  }

  resetFixDialogData()
  fixDialogData.selectedVulnerabilityCount = vulnSelectedCount.value

  fixDialogVisible.value = true
  fixDialogLoading.value = true

  try {
    const ids = await collectSelectedPatchStatusIdsForFix()
    if (ids.length === 0) {
      ElMessage.warning('所选漏洞缺少补丁状态ID，无法修复')
      fixDialogVisible.value = false
      return
    }

    fixDialogData.patchStatusIds = ids
  } catch (error) {
    ElMessage.error(`获取补丁信息失败: ${error.message || '未知错误'}`)
    fixDialogVisible.value = false
    return
  } finally {
    fixDialogLoading.value = false
  }

  // 默认并行加载各分区的预览数据，避免用户手动点击
  fixSectionCards.forEach(section => {
    loadFixDialogSection(section.key, 'preview')
  })
}

// 确认开始修复
async function handleConfirmFix() {
  if (!fixDialogData.patchStatusIds.length) return

  fixSubmitting.value = true
  try {
    // 调用作业执行 API
    const { executeJob } = await import('@/modules/automation/api/jao')
    const response = await executeJob({
      jobId: 's1r8Hp',
      params: {
        patchStatusIds: fixDialogData.patchStatusIds
      }
    })

    const { isSuccess, runId } = parseJobRunResult(response)
    if (!isSuccess) {
      throw new Error('作业返回异常')
    }

    ElMessage.success('修复任务已提交成功')
    lastSubmittedRunId.value = runId
    operationLogsVisible.value = true
    fixDialogVisible.value = false
    loadVulnData()
  } catch (error) {
    ElMessage.error(`提交修复任务失败: ${error.message || '未知错误'}`)
  } finally {
    fixSubmitting.value = false
  }
}

function handleRescan() {
  rescanForm.hostsInput = ''
  selectedHosts.value = []
  rescanDialogVisible.value = true
}

function getRescanTrackKey(host) {
  return String(host?.host_id || host?.hostId || host?.id || host?.host_key || host?.hostKey || '')
}

function normalizeRescanHost(host) {
  if (typeof host === 'object' && host !== null) {
    return {
      key: host.key || host.id || host.host_id || host.hostId || '',
      value: host.value || host.hostname || host.name || host.host_key || host.hostKey || '',
      assetType: host.assetType || host.asset_type || 'linux'
    }
  }

  return {
    key: '',
    value: String(host || '').trim(),
    assetType: 'linux'
  }
}

async function submitRescan(hosts, { closeDialog = false } = {}) {
  const normalizedHosts = (Array.isArray(hosts) ? hosts : [])
    .map(normalizeRescanHost)
    .filter(item => item.value)

  if (normalizedHosts.length === 0) {
    ElMessage.warning('请输入或选择至少一个主机')
    return false
  }

  rescanLoading.value = true
  try {
    const { executeJob } = await import('@/modules/automation/api/jao')
    const response = await executeJob({
      jobId: '0g3GfW',
      params: { hosts: normalizedHosts }
    })

    const runId = response?.data?.[0]?.runId || response?.[0]?.runId
    if (!runId) {
      ElMessage.error('扫描任务提交失败：未返回运行ID')
      return false
    }

    ElMessage.success('扫描任务已提交')
    if (closeDialog) {
      rescanDialogVisible.value = false
    }

    lastSubmittedRunId.value = runId
    operationLogsVisible.value = true

    setTimeout(() => {
      loadKpiData()
      loadHostData()
    }, 2000)

    return true
  } catch (error) {
    console.error('Scan failed:', error)
    ElMessage.error(`扫描任务提交失败: ${error.message || '未知错误'}`)
    return false
  } finally {
    rescanLoading.value = false
  }
}

async function handleSingleHostRescan(row) {
  const trackKey = getRescanTrackKey(row)
  const scanTarget = row?.host_key || row?.hostKey || row?.hostname || ''

  if (!trackKey && !scanTarget) {
    ElMessage.warning('当前主机缺少扫描标识，无法执行扫描')
    return
  }

  rescanningHostKey.value = trackKey || scanTarget
  try {
    await submitRescan([row])
  } finally {
    rescanningHostKey.value = ''
  }
}

// 更新主机输入框内容
function updateHostsInput() {
  // 从选中的主机中提取主机名
  const hostList = selectedHosts.value
    .map(h => {
      if (typeof h === 'object') {
        return h.value || h.hostname || h.name || h.host_key || ''
      }
      return String(h)
    })
    .filter(Boolean)
  rescanForm.hostsInput = hostList.join('\n')
}

async function executeRescan() {
  // 先更新主机输入框（处理通过选择器选择的主机）
  if (selectedHosts.value.length > 0) {
    updateHostsInput()
  }

  // 准备主机参数
  let hosts = []
  if (selectedHosts.value.length > 0) {
    hosts = selectedHosts.value
  } else {
    const hostLines = rescanForm.hostsInput.split('\n').filter(line => line.trim())
    if (hostLines.length === 0) {
      ElMessage.warning('请输入或选择至少一个主机')
      return
    }
    hosts = hostLines.map(line => line.trim())
  }

  await submitRescan(hosts, { closeDialog: true })
}

function refresh() {
  loadKpiData()
  loadHostData()
  if (activeTab.value === 'vulnerability') {
    loadVulnData()
  }
}

// 监听 tab 切换
watch(activeTab, newTab => {
  resetVulnSelectionState()
  if (newTab === 'vulnerability' && vulnTableData.value.length === 0) {
    loadVulnData()
  }
})

// 监听漏洞数据更新，自动恢复勾选
watch(vulnTableData, () => {
  if (vulnAllSelected.value) {
    nextTick(() => restoreVulnPageSelection())
  }
})

watch(fixDialogVisible, visible => {
  if (!visible) {
    resetFixDialogData()
  }
})

// 监听主机选择变化，自动更新输入框
watch(
  selectedHosts,
  () => {
    updateHostsInput()
  },
  { deep: true }
)

onMounted(() => {
  syncStateFromRoute()
  loadKpiData()
  loadHostData()
  loadOsLists()
  if (activeTab.value === 'vulnerability') {
    loadVulnData()
  }
})

watch(
  () => route.query,
  () => {
    const previousTab = activeTab.value
    const previousSeverity = vulnFilters.severity

    syncStateFromRoute()

    if (activeTab.value === 'vulnerability') {
      if (previousTab !== 'vulnerability' || previousSeverity !== vulnFilters.severity) {
        vulnPagination.page = 1
        loadVulnData()
      }
    }
  }
)

// 暴露方法
defineExpose({
  refresh
})
</script>

<style scoped lang="scss">
.patch-scan {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--el-bg-color);
}

.page-header {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 0 16px 8px 0;
  background: var(--el-bg-color);
  //border-bottom: 1px solid var(--el-border-color-lighter);

  &__actions {
    display: flex;
    gap: 8px;
  }
}

.page-content {
  flex: 1;
  // padding: 0 16px;
  overflow-y: auto;
  background: var(--el-bg-color);
}

// 统计面板
.stats-dashboard {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  padding-top: 4px;
}

.stat-card {
  background: var(--el-bg-color);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  padding: 16px;
  display: flex;
  flex-direction: column;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  border: 1px solid var(--el-border-color-lighter);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    border-color: var(--el-border-color);
  }

  .card-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin-bottom: 12px;
  }
}

// 1. 补丁统计卡片
.patch-card {
  flex: 4; // 40% width
  display: flex;
  flex-direction: column;
  min-height: 180px;

  .patch-chart-container {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 8px;

    .chart-wrapper {
      position: relative;
      width: 200px;
      height: 100px; // 半圆高度
    }

    .patch-pie-chart {
      width: 100%;
      height: 200px; // 实际渲染高度给大一点，通过 overflow 和 clip 控制半圆效果，或者 echoarts 本身设置
      margin-top: -50px; // 调整位置
    }

    .chart-center-label {
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      text-align: center;

      .label-title {
        font-size: 12px;
        color: var(--el-text-color-regular);
      }
      .label-value {
        font-size: 24px;
        font-weight: 700;
        color: var(--el-text-color-primary);
        line-height: 1.2;
      }
    }
  }

  .patch-progress-section {
    padding: 0 16px;

    .progress-bar-container {
      height: 12px;
      background-color: var(--el-fill-color-light);
      border-radius: 6px;
      display: flex;
      overflow: hidden;
      margin-bottom: 8px;

      .progress-segment {
        height: 100%;
        transition: width 0.5s ease;

        &.critical {
          background-color: #f53f3f;
        }
        &.important {
          background-color: #ff7d00;
        }
      }
    }

    .progress-labels {
      display: flex;
      justify-content: space-between;
      font-size: 12px;

      .stat-label {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--el-text-color-primary);

        &.critical i {
          color: #f53f3f;
          font-size: 8px;
        }
        &.important i {
          color: #ff7d00;
          font-size: 8px;
        }

        .count {
          color: var(--el-text-color-regular);
          margin-left: 2px;
        }
      }
    }
  }
}

// 2. 漏洞概览卡片
.vul-card {
  flex: 3; // 30% width
  position: relative;
  overflow: hidden;

  .vul-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 1;
  }

  .vul-number {
    font-size: 42px;
    font-weight: 700;
    color: #409eff; // OpsMind Blue
    line-height: 1;
    margin-bottom: 8px;
  }

  .vul-label {
    font-size: 13px;
    color: var(--el-text-color-primary);
    margin-bottom: 12px;
  }

  .vul-sub-metric {
    font-size: 12px;
    color: var(--el-text-color-regular);
    background: var(--el-fill-color-light);
    padding: 4px 12px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 6px;

    i {
      color: var(--el-text-color-secondary);
    }
  }

  .vul-icon-bg {
    position: absolute;
    right: -20px;
    bottom: -20px;
    font-size: 120px;
    color: rgba(64, 158, 255, 0.05);
    z-index: 0;
    transform: rotate(-15deg);
  }
}

// 3. 主机影响卡片
.host-card {
  flex: 3; // 30% width

  .host-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
    flex: 1;
    justify-content: center;
  }

  .host-total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;

    .label {
      font-size: 13px;
      color: var(--el-text-color-primary);
    }
    .value {
      font-size: 16px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }
  }

  .impact-item {
    .impact-header {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 6px;

      .label-critical {
        color: #f53f3f;
        font-weight: 500;
      }
      .label-important {
        color: #ff7d00;
        font-weight: 500;
      }
      .value {
        color: var(--el-text-color-regular);
      }
    }

    .progress-track {
      height: 8px;
      background: var(--el-fill-color-light);
      border-radius: 4px;
      overflow: hidden;

      .progress-fill {
        height: 100%;
        border-radius: 4px;

        &.critical {
          background: #f53f3f;
        }
        &.important {
          background: #ff7d00;
        }
      }
    }
  }
}

// 响应式调整
@media (max-width: 1200px) {
  .stats-dashboard {
    flex-wrap: wrap;
  }
  .patch-card {
    flex: 100%;
    order: 1;
  }
  .vul-card {
    flex: 48%;
    order: 2;
  }
  .host-card {
    flex: 48%;
    order: 3;
  }
}

// 导航标签 - 简洁样式
.nav-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: transparent;
}

.nav-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 14px;
  color: var(--el-text-color-primary);
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  background: transparent;

  &:hover {
    color: #0d6efd;
  }

  &--active {
    color: #0d6efd;
    font-weight: 500;
    border-bottom-color: #0d6efd;
  }

  i {
    font-size: 14px;
  }
}

// 标签内容
.tab-content {
  display: flex;
  flex-direction: column;
  padding: 0 !important;
  height: calc(100% - 310px);
}

:deep(.el-table__body td.el-table__cell) {
  vertical-align: top;
}

:deep(.vulnerability-layout-top-cell .cell) {
  display: flex;
  align-items: flex-start;
  height: 100%;
}

:deep(.vulnerability-layout-top-cell .cell > *) {
  width: 100%;
}

:deep(.header-border-only-table.el-table--border::after),
:deep(.header-border-only-table.el-table--border .el-table__inner-wrapper::after) {
  display: none;
}

:deep(.header-border-only-table.el-table--border .el-table__body-wrapper td.el-table__cell),
:deep(.header-border-only-table.el-table--border .el-table__fixed-body-wrapper td.el-table__cell),
:deep(.header-border-only-table.el-table--border .el-table__fixed-right td.el-table__cell) {
  border-right: none;
}

:deep(.header-border-only-table.el-table--border .el-table__header-wrapper th.el-table__cell),
:deep(.header-border-only-table.el-table--border .el-table__fixed-header-wrapper th.el-table__cell),
:deep(
  .header-border-only-table.el-table--border
    .el-table__fixed-right
    .el-table__header-wrapper
    th.el-table__cell
) {
  border-right-color: var(--el-border-color);
}

// 表格区域
.table-section {
  background: var(--el-bg-color);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

.table-toolbar {
  display: flex;
  gap: 8px;
}

.table-toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

// 主机链接样式
.host-link {
  color: #409eff;
  text-decoration: none;
  cursor: pointer;
  user-select: text;

  &:hover {
    color: #66b1ff;
    text-decoration: underline;
  }
}

// 补丁链接样式
.patch-link {
  color: #409eff;
  text-decoration: none;
  cursor: pointer;
  user-select: text;

  &:hover {
    color: #66b1ff;
    text-decoration: underline;
  }
}

// CVE 徽章样式
.cve-badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 12px;
  background: #6c757d;
  color: #fff;
  border-radius: 4px;
  text-decoration: none;

  &:hover {
    background: #495057;
    color: #fff;
  }
}

// 筛选器栏
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-light);
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 4px;

  label {
    font-size: 12px;
    color: #409eff;
  }
}

.filter-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.affected-packages-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.affected-package-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.affected-packages-popover {
  max-height: 250px;
  overflow-y: auto;
}

.affected-package-popover-row {
  padding: 4px 0;
  border-bottom: 1px dashed var(--el-border-color-light);

  &:last-child {
    border-bottom: none;
  }
}

.more-link {
  color: var(--el-color-primary);
  cursor: pointer;
  font-size: 12px;

  &:hover {
    text-decoration: underline;
  }
}

.affected-package-link,
.affected-package-text {
  max-width: 100%;
  line-height: 1.4;
  word-break: break-all;
}

.affected-package-link {
  color: #409eff;
  text-decoration: none;

  &:hover {
    color: #66b1ff;
    text-decoration: underline;
  }
}

.affected-package-trigger {
  padding: 0;
  border: 0;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.reboot-status-cell {
  display: inline-flex;
  align-items: center;
}

.reboot-status-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.reboot-services-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.reboot-service-tag {
  margin: 0;
}

.reboot-service-hint {
  font-size: 12px;
  line-height: 1.4;
}

// 可点击的状态标签
.clickable-status {
  cursor: pointer;

  &:hover {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

// 修复漏洞对话框
.fix-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 200px;
}

.fix-summary-card {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 16px;
  padding: 12px 14px;
  border-radius: 6px;
  border: 1px solid var(--el-border-color-light);
  background: var(--el-fill-color-light);
}

.fix-summary-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.fix-summary-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.fix-summary-value {
  font-size: 16px;
  color: var(--el-text-color-primary);
}

.fix-summary-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.fix-grid-layout {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  width: 100%;
}

.fix-info-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  overflow: hidden;
  box-shadow: var(--el-box-shadow-extra-light);
  transition: all 0.25s ease;

  &:hover {
    box-shadow: var(--el-box-shadow-light);
    border-color: var(--el-border-color);
  }
}

.fix-info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color-light);
  font-weight: 600;
  font-size: 13px;
  color: var(--el-text-color-primary);

  i {
    margin-right: 6px;
  }

  .header-badge {
    margin-left: auto;
  }
}

.fix-info-body {
  padding: 12px;
  max-height: 250px;
  min-height: 80px;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.8;
  color: var(--el-text-color-regular);
  background-color: var(--el-bg-color-blank);

  .empty-text {
    color: var(--el-text-color-placeholder);
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
  }

  .chips-container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-content: flex-start;
  }

  .chip-tag {
    margin-bottom: 4px;
  }
}

.fix-info-placeholder,
.fix-info-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fix-info-loading {
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fix-info-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.fix-info-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.fix-info-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.fix-info-hint.is-error {
  color: var(--el-color-danger);
  text-align: center;
}

// 文字颜色 - Element UI 色值
// 严重 - 红色 (Critical - Red)
.text-danger {
  color: #f53f3f;
}

// 重要 - 橙色 (Important - Orange)
.text-warning {
  color: #ff7d00;
}

// 中等 - 金色
.text-dark {
  color: #ffc72e;
}

// 低 - 蓝色 (primary)
.text-info {
  color: #165dff;
}

.font-bold {
  font-weight: 600;
}

.severity-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  color: inherit;

  &.is-clickable {
    cursor: pointer;
    color: var(--el-color-primary);
  }

  &.is-clickable:hover {
    opacity: 0.85;
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 1px solid var(--el-color-primary);
    outline-offset: 2px;
    border-radius: 4px;
  }

  &:disabled {
    opacity: 1;
    cursor: default;
  }
}

// 操作区域
.action-section {
  display: flex;
  justify-content: flex-start;
}

.btn-action {
  min-width: 160px;
}

// 主机选择器区域
.host-selector-area {
  width: 100%;
}

.host-selector-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;

  .host-count {
    font-size: 13px;
    color: var(--el-text-color-regular);

    strong {
      color: #409eff;
    }
  }
}

.host-tags-area {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 150px;
  overflow-y: auto;
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

.empty-host-tip {
  padding: 24px;
  text-align: center;
  color: #909399;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

// 响应式
@media (max-width: 1400px) {
  .kpi-cards {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .kpi-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .nav-tabs {
    flex-direction: column;
  }

  .nav-tab {
    border-right: none;
    border-bottom: 1px solid var(--el-border-color-lighter);

    &:last-child {
      border-bottom: none;
    }
  }
}

.ops-filter-bar {
  :deep(.el-form-item) {
    margin-right: 24px !important;
  }
}

.patch-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.patch-list-popover {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 250px;
  overflow-y: auto;
}

.patch-link {
  color: #409eff;
  text-decoration: none;
  cursor: pointer;

  &:hover {
    color: #66b1ff;
    text-decoration: underline;
  }
}
</style>
