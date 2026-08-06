<template>
  <div ref="pageScrollRef" class="ops-page-layout ops-page-layout--page-scroll">
    <!-- 选项卡 -->
    <el-tabs v-model="activeViewTab" class="dashboard-tabs">
      <!-- 标签页一：评估规则与统计 -->
      <el-tab-pane name="dashboard">
        <template #label>
          <i class="fas fa-list-alt me-1"></i>
          评估规则与统计
        </template>

        <!-- 4档统计大卡片 -->
        <div class="stats-cards-grid mb-3" v-loading="statsLoading">
          <div
            v-for="card in statCards"
            :key="card.key"
            class="stat-card"
            :class="['stat-card--' + card.type]"
            style="cursor: pointer;"
            @click="handleCardClick(card.key)"
          >
            <div class="stat-card__icon">
              <i :class="card.icon"></i>
            </div>
            <div class="stat-card__content">
              <div class="stat-card__value">{{ formatNumber(statistics[card.key]) }}</div>
              <div class="stat-card__label">{{ card.label }}</div>
              <div class="stat-card__desc">{{ card.desc }}</div>
            </div>
          </div>
        </div>

        <!-- 规则配置区域 -->
        <div class="ops-section flex-table-container">
          <div class="table-header mb-2">
            <div class="table-title">
              <i class="fas fa-sliders-h text-primary me-2"></i>
              紧急度评估规则（{{ rules.length }} 条）
            </div>
            <div class="rule-header-actions">
              <span class="text-muted fs-7">
                紧急程度 = f(资产网络区域 × 漏洞利用程度 × 漏洞风险等级)
              </span>
              <el-button
                type="primary"
                size="small"
                :loading="recomputing"
                @click="handleRecomputeAll"
              >
                <el-icon><Refresh /></el-icon>
                全量重算紧急度
              </el-button>
              <el-button size="small" @click="downloadRuleTemplate">
                <i class="fas fa-download me-1"></i>
                下载导入模板
              </el-button>
              <el-button type="primary" size="small" @click="openRuleImportDialog">
                <i class="fas fa-file-import me-1"></i>
                导入规则
              </el-button>
            </div>
          </div>

          <!-- 评估规则过滤工具栏 -->
          <div
            class="ops-filter-bar mb-2"
            style="
              padding: 8px 12px;
              display: flex;
              align-items: center;
              background: var(--el-fill-color-blank);
              border: 1px solid var(--el-border-color-lighter);
              border-radius: 4px;
            "
          >
            <el-form
              inline
              size="small"
              style="margin-bottom: 0; display: flex; flex-wrap: wrap; gap: 12px; width: 100%"
            >
              <el-form-item label="网络区域" style="margin-bottom: 0; margin-right: 0">
                <el-select v-model="filterLocation" style="width: 140px" placeholder="全部">
                  <el-option value="all" label="全部" />
                  <el-option value="互联网" label="互联网" />
                  <el-option value="外联网" label="外联网" />
                  <el-option value="内网环境、孤岛环境" label="内网环境、孤岛环境" />
                </el-select>
              </el-form-item>
              <el-form-item label="利用程度" style="margin-bottom: 0; margin-right: 0">
                <el-select v-model="filterExploit" style="width: 120px" placeholder="全部">
                  <el-option value="all" label="全部" />
                  <el-option value="可利用" label="可利用" />
                  <el-option value="可检测" label="可检测" />
                  <el-option value="尚不可利用" label="尚不可利用" />
                </el-select>
              </el-form-item>
              <el-form-item label="风险等级" style="margin-bottom: 0; margin-right: 0">
                <el-select v-model="filterRiskLevel" style="width: 110px" placeholder="全部">
                  <el-option value="all" label="全部" />
                  <el-option value="特高危" label="特高危" />
                  <el-option value="高危" label="高危" />
                  <el-option value="中危" label="中危" />
                  <el-option value="低危" label="低危" />
                </el-select>
              </el-form-item>
              <el-form-item label="评估紧急度" style="margin-bottom: 0; margin-right: 0">
                <el-select v-model="filterUrgency" style="width: 110px" placeholder="全部">
                  <el-option value="all" label="全部" />
                  <el-option value="特急" label="特急" />
                  <el-option value="紧急" label="紧急" />
                  <el-option value="普通" label="普通" />
                  <el-option value="一般" label="一般" />
                </el-select>
              </el-form-item>
              <el-form-item label="规则状态" style="margin-bottom: 0; margin-right: 0">
                <el-select v-model="filterEnabled" style="width: 110px" placeholder="全部">
                  <el-option value="all" label="全部" />
                  <el-option value="1" label="已启用" />
                  <el-option value="0" label="已禁用" />
                </el-select>
              </el-form-item>
            </el-form>
          </div>

          <!-- 规则表格 -->
          <div class="ops-table-wrapper" v-loading="rulesLoading">
            <el-table
              class="rules-table natural-height-table"
              :data="filteredRules"
              style="width: 100%"
            >
              <template #empty>
                <el-empty description="当前租户尚未导入紧急程度规则，请先下载模板并导入" />
              </template>
              <el-table-column prop="id" label="规则ID" width="90" />
              <el-table-column prop="location" label="资产网络区域" min-width="160">
                <template #default="{ row }">
                  <el-tag size="small" effect="plain" type="info">{{ row.location }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="exploit" label="漏洞利用程度" width="130">
                <template #default="{ row }">
                  <el-tag size="small" effect="light" :type="getExploitTagType(row.exploit)">
                    {{ row.exploit }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="riskLevel" label="漏洞风险等级" width="130">
                <template #default="{ row }">
                  <el-tag size="small" effect="light" :type="getRiskTagType(row.riskLevel)">
                    {{ row.riskLevel }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="urgency" label="漏洞紧急程度" width="130">
                <template #default="{ row }">
                  <el-tag size="small" round effect="dark" :type="getUrgencyTagType(row.urgency)">
                    {{ row.urgency }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="enabled" label="启用状态" width="110">
                <template #default="{ row }">
                  <el-tag :type="row.enabled === 1 ? 'success' : 'info'" size="small" round>
                    {{ row.enabled === 1 ? '已启用' : '已禁用' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="updatedBy" label="更新人" width="120" show-overflow-tooltip>
                <template #default="{ row }">
                  <span class="text-muted">{{ row.updatedBy || 'system' }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="updatedAt" label="更新时间" width="180">
                <template #default="{ row }">
                  <span class="text-muted">{{ formatDateTime(row.updatedAt) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="100" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" @click="handleEditRule(row)">编辑</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-tab-pane>

      <!-- 标签页二：多 CVE 紧急度即时排查 -->
      <el-tab-pane name="lookup">
        <template #label>
          <i class="fas fa-search me-1"></i>
          多 CVE 紧急度即时排查
        </template>

        <!-- 输入区域 -->
        <div class="ops-section mb-2" style="padding: 12px 16px">
          <div class="lookup-input-bar">
            <div class="lookup-input-title mb-2">
              <i class="fas fa-search-plus text-primary me-2"></i>
              请输入待排查的漏洞编号或文本
            </div>
            <el-input
              v-model="lookupText"
              type="textarea"
              :rows="3"
              placeholder="粘贴包含一个或多个漏洞编号的排查文本（例如：CVE-2024-1234, CVE-2024-5678&#10;或者直接粘贴整篇通知正文，后台会自动正则提取漏洞编号并执行即时诊断，结果不落库）"
              class="mb-2"
            />
            <div class="lookup-actions">
              <el-button type="primary" size="small" :loading="lookupLoading" @click="handleLookup">
                <i class="fas fa-search me-1"></i>
                即时排查
              </el-button>
              <el-button
                type="success"
                size="small"
                :disabled="!lookupResults.length"
                :loading="exportLoading"
                @click="handleExportLookup"
              >
                <i class="fas fa-file-excel me-1"></i>
                导出 Excel
              </el-button>
              <el-button size="small" @click="handleClearLookup">清空输入</el-button>
            </div>
          </div>
        </div>

        <!-- 结果展示区域 -->
        <div class="ops-section flex-table-container">
          <div class="table-header mb-2">
            <div class="table-title">
              <i class="fas fa-table text-primary me-2"></i>
              即时排查诊断结果
              <span v-if="lookupResults.length" class="text-muted fs-7">
                (已匹配 {{ lookupResults.length }} 项关联，涉及 {{ totalInputCves }} 个漏洞编号)
              </span>
            </div>
          </div>

          <!-- 即时排查过滤工具栏 -->
          <div
            class="ops-filter-bar mb-2"
            style="
              padding: 8px 12px;
              display: flex;
              align-items: center;
              background: var(--el-fill-color-blank);
              border: 1px solid var(--el-border-color-lighter);
              border-radius: 4px;
            "
            v-if="lookupResults.length"
          >
            <el-form
              inline
              size="small"
              style="margin-bottom: 0; display: flex; flex-wrap: wrap; gap: 12px; width: 100%"
            >
              <el-form-item label="模糊匹配" style="margin-bottom: 0; margin-right: 0">
                <el-input
                  v-model="lookupSearchQuery"
                  placeholder="搜索漏洞编号 / 主机 IP"
                  clearable
                  style="width: 220px"
                />
              </el-form-item>
              <el-form-item label="紧急程度" style="margin-bottom: 0; margin-right: 0">
                <el-select v-model="lookupUrgencyFilter" style="width: 110px" placeholder="全部">
                  <el-option value="all" label="全部" />
                  <el-option value="特急" label="特急" />
                  <el-option value="紧急" label="紧急" />
                  <el-option value="普通" label="普通" />
                  <el-option value="一般" label="一般" />
                </el-select>
              </el-form-item>
              <el-form-item label="所处区域" style="margin-bottom: 0; margin-right: 0">
                <el-select v-model="lookupLocationFilter" style="width: 140px" placeholder="全部">
                  <el-option value="all" label="全部" />
                  <el-option value="互联网" label="互联网" />
                  <el-option value="外联网" label="外联网" />
                  <el-option value="内网环境、孤岛环境" label="内网环境、孤岛环境" />
                </el-select>
              </el-form-item>
              <el-form-item label="补丁状态" style="margin-bottom: 0; margin-right: 0">
                <el-select
                  v-model="lookupPatchStatusFilter"
                  style="width: 130px"
                  placeholder="全部"
                >
                  <el-option value="all" label="全部" />
                  <el-option value="no_repair" label="未修复" />
                  <el-option value="is_repair" label="已修复" />
                  <el-option value="repairing" label="正在修复" />
                  <el-option value="repair_faild" label="修复失败" />
                </el-select>
              </el-form-item>
            </el-form>
          </div>

          <!-- 结果表格 -->
          <div class="ops-table-wrapper" v-loading="lookupLoading">
            <el-table
              class="lookup-table natural-height-table"
              :data="filteredLookupResults"
              style="width: 100%"
            >
              <el-table-column prop="cveId" label="漏洞编号" width="160">
                <template #default="{ row }">
                  <el-link
                    type="primary"
                    underline="never"
                    style="font-weight: 500"
                    @click="showCveDetail(row.cveId)"
                  >
                    {{ row.cveId }}
                  </el-link>
                </template>
              </el-table-column>
              <el-table-column prop="hostKey" label="主机 IP" width="150">
                <template #default="{ row }">
                  <el-link type="primary" underline="never" @click="goToHostDetail(row)">
                    {{ row.hostKey }}
                  </el-link>
                </template>
              </el-table-column>
              <el-table-column prop="osDistro" label="操作系统" width="160" show-overflow-tooltip>
                <template #default="{ row }">
                  {{ row.osDistro }} {{ row.osVersion }} ({{ row.osArch }})
                </template>
              </el-table-column>
              <el-table-column prop="location" label="所处区域" width="140" show-overflow-tooltip>
                <template #default="{ row }">
                  <el-tag v-if="row.location" size="small" effect="plain" type="info">
                    {{ row.location }}
                  </el-tag>
                  <span v-else class="text-muted">未标记</span>
                </template>
              </el-table-column>
              <el-table-column prop="riskLevel" label="风险等级" width="110" align="center">
                <template #default="{ row }">
                  <el-tag size="small" effect="light" :type="getRiskTagType(row.riskLevel)">
                    {{ row.riskLevel }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="urgency" label="漏洞紧急程度" width="120" align="center">
                <template #default="{ row }">
                  <el-tag size="small" round effect="dark" :type="getUrgencyTagType(row.urgency)">
                    {{ row.urgency }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="cvss" label="CVSS" width="80" align="center">
                <template #default="{ row }">
                  <span :class="{ 'text-danger fw-bold': row.cvss >= 9.0 }">
                    {{ row.cvss || '-' }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="patchId" label="补丁编号" width="160" show-overflow-tooltip>
                <template #default="{ row }">
                  <div v-if="row.patchId" style="display: flex; flex-wrap: wrap; gap: 4px; align-items: center;">
                    <template v-for="(pId, index) in getPatchIds(row.patchId)" :key="pId">
                      <el-link
                        type="primary"
                        underline="never"
                        style="font-weight: 500"
                        @click="showPatchDetail(pId, row.osDistro)"
                      >
                        {{ pId }}
                      </el-link>
                      <span v-if="index < getPatchIds(row.patchId).length - 1" class="text-muted" style="margin-right: 4px;">,</span>
                    </template>
                  </div>
                  <span v-else>-</span>
                </template>
              </el-table-column>
              <el-table-column prop="patchStatus" label="补丁状态" width="110" align="center">
                <template #default="{ row }">
                  <el-tag size="small" round :type="getPatchStatusTagType(row.patchStatus)">
                    {{ getPatchStatusLabel(row.patchStatus) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column
                prop="affectedPkgs"
                label="受影响包"
                min-width="180"
                show-overflow-tooltip
              >
                <template #default="{ row }">
                  <span>{{ row.affectedPkgs || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="scanDate" label="扫描时间" width="170">
                <template #default="{ row }">
                  <span class="text-muted">{{ formatDateTime(row.scanDate) }}</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-tab-pane>

      <!-- 标签页三：漏洞紧急度明细 -->
      <el-tab-pane name="urgencyList">
        <template #label>
          <i class="fas fa-list me-1"></i>
          漏洞紧急度明细
        </template>

        <!-- 列表页过滤栏 -->
        <div
          class="ops-filter-bar mb-2"
          style="
            padding: 8px 12px;
            display: flex;
            align-items: center;
            background: var(--el-fill-color-blank);
            border: 1px solid var(--el-border-color-lighter);
            border-radius: 4px;
          "
        >
          <el-form
            inline
            size="small"
            style="margin-bottom: 0; display: flex; flex-wrap: wrap; gap: 12px; width: 100%"
          >
            <el-form-item label="漏洞紧急程度" style="margin-bottom: 0; margin-right: 0">
              <el-select v-model="listUrgency" style="width: 110px" @change="handleListUrgencyChange">
                <el-option value="特急" label="特急" />
                <el-option value="紧急" label="紧急" />
                <el-option value="普通" label="普通" />
                <el-option value="一般" label="一般" />
              </el-select>
            </el-form-item>

            <el-form-item label="资产网络区域" style="margin-bottom: 0; margin-right: 0">
              <el-select v-model="listLocationFilter" style="width: 140px" placeholder="全部">
                <el-option value="all" label="全部" />
                <el-option value="互联网" label="互联网" />
                <el-option value="外联网" label="外联网" />
                <el-option value="内网环境、孤岛环境" label="内网环境、孤岛环境" />
              </el-select>
            </el-form-item>

            <el-form-item label="补丁状态" style="margin-bottom: 0; margin-right: 0">
              <el-select v-model="listPatchStatusFilter" style="width: 130px" placeholder="全部">
                <el-option value="all" label="全部" />
                <el-option value="no_repair" label="未修复" />
                <el-option value="is_repair" label="已修复" />
                <el-option value="is_repair_artificial" label="人工已修复" />
                <el-option value="repairing" label="修复中" />
                <el-option value="repair_faild" label="修复失败" />
                <el-option value="rolling_back" label="回滚中" />
                <el-option value="rolling_back_success" label="回滚成功" />
                <el-option value="rolling_back_faild" label="回滚失败" />
              </el-select>
            </el-form-item>

            <el-form-item label="模糊匹配" style="margin-bottom: 0; margin-right: 0">
              <el-input
                v-model="listSearchQuery"
                placeholder="搜索漏洞编号 / 主机 IP"
                clearable
                style="width: 220px"
              />
            </el-form-item>
          </el-form>
        </div>

        <!-- 列表表格 -->
        <div class="ops-section flex-table-container">
          <div class="ops-table-wrapper" v-loading="listLoading">
            <el-table
              class="lookup-table list-table natural-height-table"
              :data="filteredListResults"
              style="width: 100%"
            >
              <el-table-column prop="cveId" label="漏洞编号" min-width="160">
                <template #default="{ row }">
                  <el-link
                    type="primary"
                    underline="never"
                    style="font-weight: 500"
                    @click="showCveDetail(row.cveId)"
                  >
                    {{ row.cveId }}
                  </el-link>
                </template>
              </el-table-column>

              <el-table-column prop="hostKey" label="主机 IP" width="150">
                <template #default="{ row }">
                  <el-link type="primary" underline="never" @click="goToHostDetail(row)">
                    {{ row.hostKey }}
                  </el-link>
                </template>
              </el-table-column>

              <el-table-column prop="osDistro" label="操作系统" min-width="180" show-overflow-tooltip>
                <template #default="{ row }">
                  {{ row.osDistro }} {{ row.osVersion }} ({{ row.osArch }})
                </template>
              </el-table-column>

              <el-table-column prop="location" label="所处区域" width="140" show-overflow-tooltip>
                <template #default="{ row }">
                  <el-tag v-if="row.location" size="small" effect="plain" type="info">
                    {{ row.location }}
                  </el-tag>
                  <span v-else class="text-muted">未标记</span>
                </template>
              </el-table-column>

              <el-table-column prop="riskLevel" label="风险等级" width="110" align="center">
                <template #default="{ row }">
                  <el-tag size="small" effect="light" :type="getRiskTagType(row.riskLevel)">
                    {{ row.riskLevel }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column prop="urgency" label="紧急程度" width="120" align="center">
                <template #default="{ row }">
                  <el-tag size="small" round effect="dark" :type="getUrgencyTagType(row.urgency)">
                    {{ row.urgency }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column prop="patchStatus" label="补丁状态" width="130" align="center">
                <template #default="{ row }">
                  <el-tag size="small" round :type="getPatchStatusTagType(row.patchStatus)">
                    {{ getPatchStatusLabel(row.patchStatus) }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column prop="patchId" label="补丁编号" min-width="180" show-overflow-tooltip>
                <template #default="{ row }">
                  <div v-if="row.patchId" style="display: flex; flex-wrap: wrap; gap: 4px; align-items: center;">
                    <template v-for="(pId, index) in getPatchIds(row.patchId)" :key="pId">
                      <el-link
                        type="primary"
                        underline="never"
                        style="font-weight: 500"
                        @click="showPatchDetail(pId, row.osDistro)"
                      >
                        {{ pId }}
                      </el-link>
                      <span v-if="index < getPatchIds(row.patchId).length - 1" class="text-muted" style="margin-right: 4px;">,</span>
                    </template>
                  </div>
                  <span v-else>-</span>
                </template>
              </el-table-column>

              <el-table-column prop="scanDate" label="扫描时间" width="170">
                <template #default="{ row }">
                  <span class="text-muted">{{ formatDateTime(row.scanDate) }}</span>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- 分页组件 -->
          <div class="pagination-container mt-2" style="display: flex; justify-content: flex-end;">
            <el-pagination
              v-model:current-page="listCurrentPage"
              v-model:page-size="listPageSize"
              :page-sizes="[10, 20, 50, 100, 200]"
              layout="total, sizes, prev, pager, next, jumper"
              :total="listTotal"
              @size-change="handleListSizeChange"
              @current-change="handleListCurrentChange"
            />
          </div>
        </div>
      </el-tab-pane>

      <!-- 标签页四：CVE 文件导入比对 -->
      <el-tab-pane name="cveImport" lazy>
        <template #label>
          <i class="fas fa-file-import me-1"></i>
          漏洞导入比对
        </template>

        <CveImportPage />
      </el-tab-pane>
    </el-tabs>

    <!-- 全量重算对话框 -->
    <el-dialog v-model="recomputeDialogVisible" title="全量重算漏洞紧急程度" width="460px">
      <div class="recompute-warning mb-3">
        <el-alert
          title="重算影响提示"
          type="warning"
          :description="`系统将分批读取全量资产与漏洞关联数据，并按照当前租户导入的 ${rules.length} 条规则对所有漏洞的紧急程度进行重新评估写入。未命中规则时按“一般”兜底。`"
          :closable="false"
          show-icon
        />
      </div>
      <el-form :model="reform" label-width="120px">
        <el-form-item label="单批处理行数">
          <el-select v-model="reform.batchSize" style="width: 100%">
            <el-option :value="500" label="500 行" />
            <el-option :value="1000" label="1000 行 (推荐)" />
            <el-option :value="2000" label="2000 行" />
            <el-option :value="5000" label="5000 行 (最大)" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="recomputeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="recomputing" @click="executeRecompute">
          开始计算
        </el-button>
      </template>
    </el-dialog>

    <!-- 规则导入对话框 -->
    <el-dialog
      v-model="ruleImportDialogVisible"
      title="导入漏洞紧急程度规则"
      width="560px"
      destroy-on-close
      @closed="resetRuleImport"
    >
      <el-alert
        title="导入将全量覆盖当前租户的已有规则"
        description="文件列固定为：所处环境、利用程度、风险等级、紧急程度。任一数据行存在非法取值时，整次导入都会失败且不会写入。"
        type="warning"
        :closable="false"
        show-icon
        class="mb-3"
      />
      <el-upload
        ref="ruleUploadRef"
        drag
        action=""
        :auto-upload="false"
        :limit="1"
        accept=".xlsx,.xls"
        :file-list="ruleFileList"
        :on-change="handleRuleFileChange"
        :on-remove="handleRuleFileRemove"
      >
        <i class="fas fa-file-excel rule-upload-icon"></i>
        <div class="el-upload__text">
          将规则文件拖到此处，或
          <em>点击选择</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            仅支持 .xlsx / .xls 文件。导入模板由本页面提供，不包含任何默认规则数据。
          </div>
        </template>
      </el-upload>
      <template #footer>
        <el-button @click="ruleImportDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="ruleImporting"
          :disabled="!ruleImportFile"
          @click="submitRuleImport"
        >
          确认覆盖并导入
        </el-button>
      </template>
    </el-dialog>

    <!-- 规则编辑对话框 -->
    <el-dialog v-model="editDialogVisible" title="编辑评估规则" width="480px" destroy-on-close>
      <el-form :model="editForm" label-width="120px">
        <el-form-item label="资产网络区域">
          <el-tag type="info" effect="plain" style="filter: grayscale(100%);">{{ editForm.location }}</el-tag>
        </el-form-item>
        <el-form-item label="漏洞利用程度">
          <el-tag type="info" effect="plain" style="filter: grayscale(100%);">{{ editForm.exploit }}</el-tag>
        </el-form-item>
        <el-form-item label="漏洞风险等级">
          <el-tag type="info" effect="plain" style="filter: grayscale(100%);">{{ editForm.riskLevel }}</el-tag>
        </el-form-item>
        <el-form-item label="漏洞紧急程度">
          <el-select v-model="editForm.urgency" style="width: 100%">
            <el-option value="特急" label="特急" />
            <el-option value="紧急" label="紧急" />
            <el-option value="普通" label="普通" />
            <el-option value="一般" label="一般" />
          </el-select>
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch
            v-model="editForm.enabled"
            :active-value="1"
            :inactive-value="0"
            active-text="启用"
            inactive-text="禁用"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveRule">保存配置</el-button>
      </template>
    </el-dialog>

    <!-- CVE 详情弹窗 -->
    <el-dialog v-model="cveDetailVisible" title="漏洞详情" width="90%" destroy-on-close>
      <div
        style="
          max-height: calc(100vh - 200px);
          overflow-y: auto;
          margin: -10px -20px -20px;
          padding: 10px 20px 20px;
        "
      >
        <CveDetail
          :cve-id="selectedCveId"
          :hide-breadcrumb="true"
          host-back-label="漏洞紧急程度查询"
          host-back-route-name="patches-urgencyDashboard"
          :host-back-route-query="cveDetailHostBackRouteQuery"
        />
      </div>
    </el-dialog>

    <!-- 补丁详情弹窗 -->
    <PatchDetailDialog
      v-model="patchDetailVisible"
      :patch-data="patchDetailData"
      :loading="patchDetailLoading"
      :os-distro="currentPatchOsDistro"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { formatDateTime } from '@/utils/date'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { urgencyApi, patchScanApi } from '../api'
import { downloadUrgencyRuleTemplate } from '../utils/urgencyRuleTemplate'
import CveImportPage from './CveImportPage.vue'
import CveDetail from '../components/cve/details/CveDetail.vue'
import PatchDetailDialog from '../components/host-detail/dialogs/PatchDetailDialog.vue'

const router = useRouter()
const route = useRoute()
const pageScrollRef = ref()

// 标签页状态
const activeViewTab = ref('dashboard') // dashboard | lookup | urgencyList | cveImport

// 看板统计状态
const statsLoading = ref(false)
const statistics = ref({
  特急: 0,
  紧急: 0,
  普通: 0,
  一般: 0
})

// 看板统计卡片定义
const statCards = [
  {
    key: '特急',
    label: '特急漏洞',
    type: 'danger',
    icon: 'fas fa-radiation text-danger',
    desc: '互联网高危漏洞，需立即阻断响应'
  },
  {
    key: '紧急',
    label: '紧急漏洞',
    type: 'warning',
    icon: 'fas fa-exclamation-triangle text-warning',
    desc: '外联网/内网漏洞，需在24小时内封堵'
  },
  {
    key: '普通',
    label: '普通漏洞',
    type: 'primary',
    icon: 'fas fa-shield-alt text-primary',
    desc: '可检测尚不可利用漏洞，列入计划整改'
  },
  {
    key: '一般',
    label: '一般漏洞',
    type: 'info',
    icon: 'fas fa-info-circle text-info',
    desc: '低风险或安全隔离环境，定期清理即可'
  }
]

// 规则列表状态
const rulesLoading = ref(false)
const rules = ref([])
const ruleImportDialogVisible = ref(false)
const ruleImporting = ref(false)
const ruleUploadRef = ref()
const ruleFileList = ref([])
const ruleImportFile = ref(null)

// 评估规则过滤条件
const filterLocation = ref('all')
const filterExploit = ref('all')
const filterRiskLevel = ref('all')
const filterUrgency = ref('all')
const filterEnabled = ref('all')

// 即时排查过滤条件
const lookupSearchQuery = ref('')
const lookupUrgencyFilter = ref('all')
const lookupLocationFilter = ref('all')
const lookupPatchStatusFilter = ref('all')

// 重算控制
const recomputing = ref(false)
const recomputeDialogVisible = ref(false)
const reform = reactive({
  batchSize: 1000
})

// 编辑规则
const editDialogVisible = ref(false)
const saving = ref(false)
const editForm = reactive({
  id: null,
  location: '',
  exploit: '',
  riskLevel: '',
  urgency: '一般',
  enabled: 1
})

// 多 CVE 即时排查工作区状态
const lookupText = ref('')
const lookupLoading = ref(false)
const exportLoading = ref(false)
const lookupResults = ref([])
const totalInputCves = ref(0)

// 漏洞紧急度明细列表状态
const listLoading = ref(false)
const listResults = ref([])
const listTotal = ref(0)
const listCurrentPage = ref(1)
const listPageSize = ref(20)
const listUrgency = ref('特急')
const listLocationFilter = ref('all')
const listPatchStatusFilter = ref('all')
const listSearchQuery = ref('')

// CVE 详情弹窗控制
const cveDetailVisible = ref(false)
const selectedCveId = ref('')
// 点击 CVE 链接时实时快照下来的页面状态，用于主机详情页"返回"时还原
// 不用 computed 是因为 computed 仅依赖响应式状态，DOM 滚动位置无法触发重算
const cveDetailHostBackRouteQuery = ref('')

function showCveDetail(cveId) {
  selectedCveId.value = cveId
  cveDetailHostBackRouteQuery.value = snapshotHostBackRouteQuery()
  cveDetailVisible.value = true
}

// 补丁详情弹窗控制
const patchDetailVisible = ref(false)
const patchDetailLoading = ref(false)
const patchDetailData = ref({})
const currentPatchOsDistro = ref('')

function getPatchIds(patchIdStr) {
  if (!patchIdStr) return []
  return String(patchIdStr)
    .split(/[,;]/)
    .map(s => s.trim())
    .filter(Boolean)
}

async function showPatchDetail(rowOrPatchId, optionalOsDistro = null) {
  let patchId = ''
  let osDistro = ''
  if (typeof rowOrPatchId === 'object' && rowOrPatchId !== null) {
    patchId = rowOrPatchId.patchId
    osDistro = rowOrPatchId.osDistro || ''
  } else {
    patchId = rowOrPatchId
    osDistro = optionalOsDistro || ''
  }

  if (!patchId) return

  patchDetailVisible.value = true
  patchDetailLoading.value = true
  patchDetailData.value = {}
  currentPatchOsDistro.value = osDistro

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

// 抓取当前页面状态（含页面滚动位置）并序列化为路由 query 字符串
// 在打开 CVE 详情弹窗或跳转主机详情的瞬间调用一次
function snapshotHostBackRouteQuery() {
  const scrollTop = pageScrollRef.value?.scrollTop || 0

  return JSON.stringify({
    activeViewTab: activeViewTab.value,
    filterLocation: filterLocation.value,
    filterExploit: filterExploit.value,
    filterRiskLevel: filterRiskLevel.value,
    filterUrgency: filterUrgency.value,
    filterEnabled: filterEnabled.value,
    lookupText: lookupText.value,
    lookupSearchQuery: lookupSearchQuery.value,
    lookupUrgencyFilter: lookupUrgencyFilter.value,
    lookupLocationFilter: lookupLocationFilter.value,
    lookupPatchStatusFilter: lookupPatchStatusFilter.value,
    listUrgency: listUrgency.value,
    listLocationFilter: listLocationFilter.value,
    listPatchStatusFilter: listPatchStatusFilter.value,
    listSearchQuery: listSearchQuery.value,
    listCurrentPage: listCurrentPage.value,
    listPageSize: listPageSize.value,
    scrollTop
  })
}

// 监听路由参数变化，就地恢复页面状态与滚动条
watch(
  () => route.query,
  async query => {
    if (query.activeViewTab) {
      activeViewTab.value = query.activeViewTab
    } else if (query.view === 'detail' && query.batchId) {
      activeViewTab.value = 'cveImport'
    }
    if (query.filterLocation) filterLocation.value = query.filterLocation
    if (query.filterExploit) filterExploit.value = query.filterExploit
    if (query.filterRiskLevel) filterRiskLevel.value = query.filterRiskLevel
    if (query.filterUrgency) filterUrgency.value = query.filterUrgency
    if (query.filterEnabled) filterEnabled.value = query.filterEnabled

    if (query.lookupText !== undefined) {
      lookupText.value = query.lookupText || ''
    }
    if (query.lookupSearchQuery) lookupSearchQuery.value = query.lookupSearchQuery
    if (query.lookupUrgencyFilter) lookupUrgencyFilter.value = query.lookupUrgencyFilter
    if (query.lookupLocationFilter) lookupLocationFilter.value = query.lookupLocationFilter
    if (query.lookupPatchStatusFilter) lookupPatchStatusFilter.value = query.lookupPatchStatusFilter

    // 漏洞紧急度下钻明细状态恢复
    if (query.listUrgency) listUrgency.value = query.listUrgency
    if (query.listLocationFilter) listLocationFilter.value = query.listLocationFilter
    if (query.listPatchStatusFilter) listPatchStatusFilter.value = query.listPatchStatusFilter
    if (query.listSearchQuery) listSearchQuery.value = query.listSearchQuery
    if (query.listCurrentPage) listCurrentPage.value = Number(query.listCurrentPage)
    if (query.listPageSize) listPageSize.value = Number(query.listPageSize)

    // 如果是即时排查 tab，且输入框有值但 lookupResults 为空，且我们有之前的 lookupText，自动触发一次排查
    if (activeViewTab.value === 'lookup' && lookupText.value && lookupResults.value.length === 0) {
      await handleLookup(true)
    }

    // 如果是漏洞紧急度明细 tab，自动加载数据
    if (activeViewTab.value === 'urgencyList') {
      await fetchUrgencyPageData()
    }

    // 恢复页面滚动位置
    if (query.scrollTop) {
      nextTick(() => {
        setTimeout(() => {
          if (pageScrollRef.value) {
            pageScrollRef.value.scrollTop = Number(query.scrollTop)
          }
        }, 150)
      })
    }
  },
  { immediate: true }
)

// 排序后的规则
const sortedRules = computed(() => {
  if (!rules.value || rules.value.length === 0) return []

  // 排序权重映射
  const riskWeight = { 特高危: 4, 高危: 3, 中危: 2, 低危: 1 }

  return [...rules.value].sort((a, b) => {
    // 1. location 升序
    const locCompare = (a.location || '').localeCompare(b.location || '', 'zh')
    if (locCompare !== 0) return locCompare

    // 2. riskLevel 降序
    const aRisk = riskWeight[a.riskLevel] || 0
    const bRisk = riskWeight[b.riskLevel] || 0
    if (bRisk !== aRisk) return bRisk - aRisk

    // 3. exploit 升序
    return (a.exploit || '').localeCompare(b.exploit || '', 'zh')
  })
})

// 过滤后的规则
const filteredRules = computed(() => {
  let list = sortedRules.value || []
  if (filterLocation.value !== 'all') {
    list = list.filter(item => item.location === filterLocation.value)
  }
  if (filterExploit.value !== 'all') {
    list = list.filter(item => item.exploit === filterExploit.value)
  }
  if (filterRiskLevel.value !== 'all') {
    list = list.filter(item => item.riskLevel === filterRiskLevel.value)
  }
  if (filterUrgency.value !== 'all') {
    list = list.filter(item => item.urgency === filterUrgency.value)
  }
  if (filterEnabled.value !== 'all') {
    const val = Number(filterEnabled.value)
    list = list.filter(item => item.enabled === val)
  }
  return list
})

// 过滤后的即时排查诊断结果
const filteredLookupResults = computed(() => {
  let list = lookupResults.value || []
  if (lookupSearchQuery.value && lookupSearchQuery.value.trim()) {
    const q = lookupSearchQuery.value.trim().toLowerCase()
    list = list.filter(item => {
      const cveMatch = (item.cveId || '').toLowerCase().includes(q)
      const ipMatch = (item.hostKey || '').toLowerCase().includes(q)
      return cveMatch || ipMatch
    })
  }
  if (lookupUrgencyFilter.value !== 'all') {
    list = list.filter(item => item.urgency === lookupUrgencyFilter.value)
  }
  if (lookupLocationFilter.value !== 'all') {
    list = list.filter(item => item.location === lookupLocationFilter.value)
  }
  if (lookupPatchStatusFilter.value !== 'all') {
    list = list.filter(item => item.patchStatus === lookupPatchStatusFilter.value)
  }
  return list
})

// 过滤后的漏洞紧急度明细结果 (在客户端二次过滤)
const filteredListResults = computed(() => {
  let list = listResults.value || []
  if (listSearchQuery.value && listSearchQuery.value.trim()) {
    const q = listSearchQuery.value.trim().toLowerCase()
    list = list.filter(item => {
      const cveMatch = (item.cveId || '').toLowerCase().includes(q)
      const ipMatch = (item.hostKey || '').toLowerCase().includes(q)
      return cveMatch || ipMatch
    })
  }
  if (listLocationFilter.value !== 'all') {
    list = list.filter(item => item.location === listLocationFilter.value)
  }
  if (listPatchStatusFilter.value !== 'all') {
    list = list.filter(item => item.patchStatus === listPatchStatusFilter.value)
  }
  return list
})

// 加载统计信息
async function loadStatistics() {
  statsLoading.value = true
  try {
    const res = await urgencyApi.getStatistics()
    statistics.value = res?.data || res || { 特急: 0, 紧急: 0, 普通: 0, 一般: 0 }
  } catch (error) {
    console.error('加载紧急度统计失败:', error)
  } finally {
    statsLoading.value = false
  }
}

// 加载评估规则
async function loadRules() {
  rulesLoading.value = true
  try {
    const res = await urgencyApi.getRules()
    rules.value = res?.data || res || []
  } catch (error) {
    console.error('加载规则列表失败:', error)
    ElMessage.error('加载规则列表失败')
  } finally {
    rulesLoading.value = false
  }
}

function downloadRuleTemplate() {
  downloadUrgencyRuleTemplate()
}

function openRuleImportDialog() {
  resetRuleImport()
  ruleImportDialogVisible.value = true
}

function handleRuleFileChange(uploadFile, uploadFiles) {
  if (!/\.(xlsx|xls)$/i.test(uploadFile.name || '')) {
    ElMessage.warning('仅支持 .xlsx / .xls 格式的规则文件')
    ruleUploadRef.value?.clearFiles()
    ruleFileList.value = []
    ruleImportFile.value = null
    return
  }

  ruleFileList.value = uploadFiles.slice(-1)
  ruleImportFile.value = uploadFile.raw || null
}

function handleRuleFileRemove() {
  ruleFileList.value = []
  ruleImportFile.value = null
}

function resetRuleImport() {
  ruleUploadRef.value?.clearFiles()
  ruleFileList.value = []
  ruleImportFile.value = null
  ruleImporting.value = false
}

async function submitRuleImport() {
  if (!ruleImportFile.value) {
    ElMessage.warning('请先选择规则 Excel 文件')
    return
  }

  try {
    await ElMessageBox.confirm(
      `导入后将覆盖当前租户已有的 ${rules.value.length} 条规则，是否继续？`,
      '确认全量覆盖',
      {
        confirmButtonText: '确认导入',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
  } catch {
    return
  }

  ruleImporting.value = true
  try {
    const response = await urgencyApi.importRules(ruleImportFile.value)
    const result = response?.data || response || {}
    ruleImportDialogVisible.value = false
    await loadRules()
    ElMessage.success(
      `规则导入成功：写入 ${result.imported || 0} 条，覆盖 ${result.replaced || 0} 条。规则已即时生效。`
    )
  } catch (error) {
    console.error('导入紧急程度规则失败:', error)
    ElMessage.error(
      error?.response?.data?.error ||
        error?.response?.data?.message ||
        '规则导入失败，请检查文件内容'
    )
  } finally {
    ruleImporting.value = false
  }
}

// 格式化数字
function formatNumber(val) {
  return typeof val === 'number' ? val.toLocaleString() : val || 0
}



// 标签颜色映射
function getExploitTagType(exploit) {
  if (exploit === '可利用') return 'danger'
  if (exploit === '可检测') return 'warning'
  return 'info'
}

// 风险等级颜色映射
function getRiskTagType(riskLevel) {
  if (riskLevel === '特高危' || riskLevel === '严重') return 'danger'
  if (riskLevel === '高危' || riskLevel === '重要') return 'warning'
  if (riskLevel === '中危' || riskLevel === '中等') return 'primary'
  return 'info'
}

// 漏洞紧急度颜色映射
function getUrgencyTagType(urgency) {
  if (urgency === '特急') return 'danger'
  if (urgency === '紧急') return 'warning'
  if (urgency === '普通') return 'primary'
  return 'info'
}

// 补丁状态中文翻译与色彩映射
function getPatchStatusLabel(status) {
  const map = {
    is_repair: '已修复',
    no_repair: '未修复',
    repairing: '修复中',
    repair_faild: '修复失败',
    rolling_back: '回滚中',
    rolling_back_faild: '回滚失败',
    rolling_back_success: '回滚成功',
    is_repair_artificial: '人工已修复'
  }
  return map[status] || status || '-'
}

function getPatchStatusTagType(status) {
  const map = {
    is_repair: 'success',
    no_repair: 'danger',
    repairing: 'warning',
    repair_faild: 'danger',
    rolling_back: 'warning',
    rolling_back_faild: 'danger',
    rolling_back_success: 'success',
    is_repair_artificial: 'info'
  }
  return map[status] || 'info'
}

// 打开全量重算弹窗
function handleRecomputeAll() {
  reform.batchSize = 1000
  recomputeDialogVisible.value = true
}

// 执行全量重算
async function executeRecompute() {
  recomputing.value = true
  recomputeDialogVisible.value = false
  try {
    const res = await urgencyApi.recompute({ batchSize: reform.batchSize })
    const data = res?.data || res
    ElMessageBox.alert(
      `重算已全部完成！<br/>更新数据行数：<strong>${data.updated || 0}</strong> 行<br/>累计耗时：<strong>${((data.elapsedMs || 0) / 1000).toFixed(2)}</strong> 秒`,
      '重算成功',
      {
        dangerouslyUseHTMLString: true,
        type: 'success'
      }
    )
    refresh()
  } catch (error) {
    console.error('全量重算失败:', error)
    ElMessage.error('紧急度评估全量重算失败')
  } finally {
    recomputing.value = false
  }
}

// 编辑规则
function handleEditRule(row) {
  editForm.id = row.id
  editForm.location = row.location
  editForm.exploit = row.exploit
  editForm.riskLevel = row.riskLevel
  editForm.urgency = row.urgency
  editForm.enabled = row.enabled ?? 1
  editDialogVisible.value = true
}

// 保存规则
async function saveRule() {
  saving.value = true
  try {
    await urgencyApi.updateRule(editForm.id, {
      urgency: editForm.urgency,
      enabled: editForm.enabled
    })
    ElMessage.success('规则配置已更新，后台内存缓存已同步生效！')
    editDialogVisible.value = false
    loadRules()
    // 规则变化可能影响统计，同时更新一下统计卡片
    loadStatistics()
  } catch (error) {
    console.error('保存规则失败:', error)
    ElMessage.error('保存规则配置失败')
  } finally {
    saving.value = false
  }
}

// 多 CVE 即时诊断排查
async function handleLookup(preventReset = false) {
  if (!lookupText.value || !lookupText.value.trim()) {
    ElMessage.warning('请输入待排查的漏洞编号或文本')
    return
  }

  lookupLoading.value = true
  try {
    const res = await urgencyApi.lookupUrgency({
      text: lookupText.value.trim()
    })
    const data = res?.data || res || {}
    lookupResults.value = data.rows || []
    totalInputCves.value = data.totalInput || 0

    // 重置过滤条件，避免之前过滤导致看不到新排查结果
    if (!preventReset) {
      lookupSearchQuery.value = ''
      lookupUrgencyFilter.value = 'all'
      lookupLocationFilter.value = 'all'
      lookupPatchStatusFilter.value = 'all'
    }

    ElMessage.success(`排查诊断完成！成功获取 ${lookupResults.value.length} 条关联主机排查记录`)
  } catch (error) {
    console.error('即时排查失败:', error)
    ElMessage.error('即时诊断排查失败，请检查输入后重试')
  } finally {
    lookupLoading.value = false
  }
}

// 导出即时排查结果为 Excel
async function handleExportLookup() {
  if (!lookupText.value || !lookupText.value.trim()) {
    ElMessage.warning('请先输入要排查的漏洞文本并进行诊断')
    return
  }

  exportLoading.value = true
  try {
    ElMessage.info('正在生成排查报告 Excel，请稍候...')
    const res = await urgencyApi.exportLookupUrgency({
      text: lookupText.value.trim()
    })
    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `CVE紧急程度_${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    URL.revokeObjectURL(a.href)
    ElMessage.success('排查报告 Excel 导出成功！')
  } catch (error) {
    console.error('导出排查报告失败:', error)
    ElMessage.error('导出排查报告 Excel 失败')
  } finally {
    exportLoading.value = false
  }
}

// 清空即时排查
function handleClearLookup() {
  lookupText.value = ''
  lookupResults.value = []
  totalInputCves.value = 0
  lookupSearchQuery.value = ''
  lookupUrgencyFilter.value = 'all'
  lookupLocationFilter.value = 'all'
  lookupPatchStatusFilter.value = 'all'
  ElMessage.info('输入及排查结果已清空')
}

// 获取漏洞紧急度明细列表数据
async function fetchUrgencyPageData() {
  listLoading.value = true
  try {
    const res = await urgencyApi.getUrgencyPage({
      urgency: listUrgency.value,
      page: listCurrentPage.value,
      size: listPageSize.value
    })
    const data = res?.data || res || {}
    listResults.value = data.rows || []
    listTotal.value = data.total || 0
  } catch (error) {
    console.error('加载漏洞紧急度明细失败:', error)
    ElMessage.error('加载漏洞紧急度明细失败')
  } finally {
    listLoading.value = false
  }
}

function handleListUrgencyChange() {
  listCurrentPage.value = 1
  fetchUrgencyPageData()
}

function handleListSizeChange(val) {
  listPageSize.value = val
  listCurrentPage.value = 1
  fetchUrgencyPageData()
}

function handleListCurrentChange(val) {
  listCurrentPage.value = val
  fetchUrgencyPageData()
}

function handleCardClick(urgencyKey) {
  activeViewTab.value = 'urgencyList'
  listUrgency.value = urgencyKey
  listCurrentPage.value = 1
  fetchUrgencyPageData()
}

// 监听活动 Tab 切换，自动加载明细数据
watch(activeViewTab, (newTab) => {
  if (newTab === 'urgencyList') {
    fetchUrgencyPageData()
  }
})

// 跳转至主机详情页进行管理
function goToHostDetail(row) {
  router.push({
    name: 'patches-hostDetail',
    query: {
      hostId: row.hostId,
      hostKey: row.hostKey,
      patchId: row.patchId,
      fromLabel: '漏洞紧急程度查询',
      fromRouteName: 'patches-urgencyDashboard',
      fromRouteQuery: snapshotHostBackRouteQuery()
    }
  })
}

// 全局刷新
function refresh() {
  loadStatistics()
  loadRules()
}

onMounted(() => {
  refresh()
})
</script>

<style scoped lang="scss">
.dashboard-tabs {
  display: flex;
  flex-direction: column;
  flex: none;
  min-height: auto;
  margin-bottom: 0 !important;

  :deep(.el-tabs__content) {
    flex: none;
    min-height: auto;
    overflow: visible;

    .el-tab-pane {
      height: auto;
      display: flex;
      flex-direction: column;
    }
  }
}

.stats-cards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  border-radius: 8px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  position: relative;
  overflow: hidden;
  cursor: pointer;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: transparent;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.06);
  }

  &__icon {
    font-size: 20px;
    margin-right: 12px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--el-bg-color);
  }

  &__content {
    flex: 1;
  }

  &__value {
    font-size: 22px;
    font-weight: 700;
    line-height: 1;
    color: var(--el-text-color-primary);
  }

  &__label {
    font-size: 13px;
    font-weight: 500;
    margin-top: 4px;
    color: var(--el-text-color-regular);
  }

  &__desc {
    font-size: 11px;
    color: var(--el-text-color-secondary);
    margin-top: 2px;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  /* 4档类型高亮 */
  &--danger {
    &::before {
      background: #f53f3f;
    }
    .stat-card__icon {
      background: rgba(245, 63, 63, 0.1);
    }
    .stat-card__value {
      color: #f53f3f;
    }
  }

  &--warning {
    &::before {
      background: #ff7d00;
    }
    .stat-card__icon {
      background: rgba(255, 125, 0, 0.1);
    }
    .stat-card__value {
      color: #ff7d00;
    }
  }

  &--primary {
    &::before {
      background: #165dff;
    }
    .stat-card__icon {
      background: rgba(22, 93, 255, 0.1);
    }
    .stat-card__value {
      color: #165dff;
    }
  }

  &--info {
    &::before {
      background: #86909c;
    }
    .stat-card__icon {
      background: rgba(134, 144, 156, 0.1);
    }
    .stat-card__value {
      color: #86909c;
    }
  }
}

.flex-table-container {
  display: flex;
  flex-direction: column;
  flex: none;
  min-height: auto;
  margin-bottom: 0 !important;
  padding: 12px 16px !important;
}

.detail-workbench {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rule-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rule-upload-icon {
  margin: 18px 0 12px;
  color: var(--el-color-success);
  font-size: 42px;
}

.table-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.fs-7 {
  font-size: 12px;
}

.lookup-input-bar {
  display: flex;
  flex-direction: column;
}

.lookup-input-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.lookup-actions {
  display: flex;
  gap: 10px;
}

@media (max-width: 1200px) {
  .stats-cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-cards-grid {
    grid-template-columns: 1fr;
  }
}
</style>
