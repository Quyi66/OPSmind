import { useApi } from "@/core/api";

/** 应用列表 */
export const appList = () => {
  return useApi().get('/udp/api/udp/applets/');
}

/** 作业列表 */
export const appTableList = (params) => {
  return useApi().get('/jao/api/jao/jobs/app', { params });
}

/** 删除作业 */
export const deleteJobs = (ids) => {
  return useApi().delete(`jao/api/jao/jobs/delete-batch?ids=${ids}`);
}

/** 创建作业 */
export const createJob = (data) => {
  return useApi().post('/jao/api/jao/jobs', data);
}

/** 获取作业详情 */
export const getJobDetail = (id) => {
  return useApi().get(`/jao/api/jao/jobs/${id}`);
}

/** 更新作业 */
export const updateJob = (id, data) => {
  return useApi().put(`/jao/api/jao/jobs/${id}`, data);
}

// ==================== 作业申请相关 API ====================

/** 获取我的申请列表 */
export function fetchMyApproveList() {
  return useApi().get('/jao/api/jao/jobs/approve/my')
}

/** 取消申请 */
export function cancelApprove(approveId, remark = null) {
  return useApi().put('/jao/api/jao/jobs/approve/cancel', {
    approveId,
    remark
  }, {
    params: { cacheBuster: Date.now() }
  })
}

/** 删除申请 */
export function deleteApprove(ids) {
  return useApi().delete('/jao/api/jao/approve/delete-batch', { params: { ids } })
}

/** 提交审批申请 */
export function submitApprove(data) {
  return useApi().post('/jao/api/jao/jobs/approve/submit', data, {
    params: { cacheBuster: Date.now() }
  })
}

/** 获取作业脚本路径 */
export function getScriptPath(jobId) {
  return useApi().get(`/jao/api/jao/jobs/approve/get-script-path/${jobId}`)
}

/** 检查作业是否需要审批 */
export function checkNeedApprove(jobId) {
  return useApi().get(`/jao/api/jao/jobs/approve/check/${jobId}`)
}

/** 获取审批列表 */
export function fetchApproveList() {
  return useApi().get('/jao/api/jao/jobs/approve/list')
}

/** 通过审批 */
export function passApprove(approveId, remark) {
  return useApi().put('/jao/api/jao/jobs/approve', { approveId, remark }, {
    params: { cacheBuster: Date.now() }
  })
}

/** 拒绝审批 */
export function refuseApprove(approveId, remark) {
  return useApi().put('/jao/api/jao/jobs/approve/refuse', { approveId, remark }, {
    params: { cacheBuster: Date.now() }
  })
}

/** 作废审批 */
export function discardApprove(approveId, remark = null) {
  return useApi().put('/jao/api/jao/jobs/approve/discard', { approveId, remark }, {
    params: { cacheBuster: Date.now() }
  })
}

// ==================== 作业执行相关 API ====================

/** 执行作业 */
export const executeJob = (data) => {
  const { jobId, ...payload } = data || {}
  if (!jobId) {
    throw new Error('缺少作业 ID')
  }
  const cacheBuster = Date.now()
  return useApi().post(`/jao/api/jao/jobs/${jobId}/run?cacheBuster=${cacheBuster}`, payload);
}

/** 获取执行作业接口结果 */
export const getExecuteResult = (runId) => {
  return useApi().get(`/jao/api/jao/runlogs/${runId}/result`);
}

/** 查询作业运行记录 */
export const fetchJobRunLogs = (payload) => {
  return useApi().post('/dts/api/dts/q/data/JAO_LIST_RUN_LOGS/', payload, {
    params: { cacheBuster: Date.now() }
  });
}

/** 重新启动作业 */
export const rerunJob = (jobId, runId) => {
  return useApi().post(`/jao/api/jao/jobs/OKPacN/run`, {
    params: { runId }
  }, {
    params: { cacheBuster: Date.now() }
  });
}

/** 查询作业统计数据（最近30天） */
export function fetchJobStats() {
  return useApi().post('/dts/api/dts/q/data/JAO_COUNT_RUNS_BY_TIME/', {
    params: {}
  }, {
    params: { cacheBuster: Date.now() }
  })
}

/** 查询各作业运行次数汇总 */
export function fetchJobRunCounts() {
  return useApi().post('/dts/api/dts/q/data/JAO_COUNT_RUNS_BY_JOB/', {
    params: {}
  }, {
    params: { cacheBuster: Date.now() }
  })
}

// ==================== 定时任务相关 API ====================

/** 获取定时任务列表 */
export function fetchCronJobs() {
  return useApi().get('/jao/api/jao/cron', {
    params: { cacheBuster: Date.now() }
  })
}

/** 创建定时任务 */
export function createCronJob(data) {
  return useApi().post('/jao/api/jao/cron', data)
}

/** 更新定时任务 */
export function updateCronJob(data) {
  return useApi().put('/jao/api/jao/cron', data)
}

/** 删除定时任务 */
export function deleteCronJob(id) {
  return useApi().delete(`/jao/api/jao/cron/${id}`)
}

/** 启动定时任务 */
export function startCronJob(id) {
  return useApi().get(`/jao/api/jao/cron/start/${id}`)
}

/** 停止定时任务 */
export function stopCronJob(id) {
  return useApi().get(`/jao/api/jao/cron/stop/${id}`)
}

/** 获取应用列表（用于任务类型映射） */
export function fetchApplets() {
  return useApi().get('/udp/api/udp/applets', {
    params: { isPaging: true, cacheBuster: Date.now() }
  })
}

/** 批量启停定时任务 */
export function batchToggleCronJobs(statusData) {
  return useApi().post('/jao/api/jao/cron/start-stop', statusData)
}

/** 立即执行定时任务一次 */
export function executeCronJob(id) {
  return useApi().get(`/jao/api/jao/cron/execute/${id}`)
}

/** 复制定时任务 */
export function copyCronJob(id) {
  return useApi().get(`/jao/api/jao/cron/copy/${id}`)
}

/** 查询Cron表达式的下次执行时间 */
export function queryNextExecutionTime(scheduleConf) {
  return useApi().get('/jao/api/jao/cron/nextTriggerTime', {
    params: {
      scheduleConf
    }
  })
}

/** 根据ID获取定时任务详情 */
export function fetchCronJobById(id) {
  return useApi().get(`/jao/api/jao/cron/${id}`)
}

/** 根据类型获取作业列表(script/rest) */
export function fetchJobsByType(type) {
  return useApi().get(`/jao/api/jao/jobs?type=${type}`)
}

/** 获取CAC巡检任务列表 */
export function fetchCacJobs() {
  return useApi().get('/cac/api/cac/v2/templates')
}

/** 获取CMD命令任务列表 */
export function fetchCmdJobs() {
  return useApi().get('/jao/api/jao/command/tenantId/user')
}

/** 获取已审批的命令列表 */
export function fetchApprovedCommands() {
  return useApi().get('/jao/api/jao/command/approve')
}

/** 获取Flow流程任务列表 */
export function fetchFlowJobs() {
  return useApi().get('/jao/api/jao/flows')
}

/** 根据ID获取作业详情 */
export function fetchJobById(id) {
  return useApi().get(`/jao/api/jao/jobs/${id}`)
}

/** 流程列表 */
export const fetchFlows = () => {
  return useApi().get('/jao/api/jao/flows', {
    params: { cacheBuster: Date.now() }
  });
}

/** 流程实例列表 */
export const fetchFlowInstances = (flowId) => {
  return useApi().get(`/jao/api/jao/flows/${flowId}/instances`);
}

/** 流程详情 */
export const fetchFlowDetail = (flowId) => {
  return useApi().get(`/jao/api/jao/flows/${flowId}`);
}

/** 保存流程(新建或更新) */
export const saveFlow = (data) => {
  if (data.id) {
    return useApi().put('/jao/api/jao/flows', data, {
      params: { cacheBuster: Date.now() }
    });
  }
  return useApi().post('/jao/api/jao/flows', data);
}

/** 删除流程 */
export const deleteFlow = (flowId) => {
  return useApi().delete(`/jao/api/jao/flows/${flowId}`);
}

/** 创建流程实例(执行流程) */
export const createFlowInstance = (data) => {
  return useApi().put('/jao/api/jao/flow-instances', data);
}

/** 获取流程实例详情（用于查看） */
export const fetchFlowInstanceView = (instanceId) => {
  return useApi().get(`/jao/api/jao/flow-instances/${instanceId}/view`);
}

/** 获取流程步骤在某台主机上的执行结果 */
export const fetchFlowHostResult = (stepId, hostId) => {
  return useApi().get(`/jao/api/jao/flows/${stepId}/hosts/${hostId}/result`);
}

/** 获取流程实例详情 */
export const fetchFlowInstanceDetail = (instanceId) => {
  return useApi().get(`/jao/api/jao/flows/instances/${instanceId}`);
}

/** 检查 GFS 文件是否存在 */
export const checkGfsFiles = (filePaths) => {
  const tenant = '$tnt'; // 租户参数占位
  return useApi().post(`/gfs/api/gfs/v2/git/checkfiles/${tenant}`, filePaths);
}

// ==================== ACM 设备管理相关 API ====================

/** 查询主机实例列表 (使用 UDP Dataset) */
export const queryAcmInstances = (params) => {
  const {
    ciType,
    page = 1,
    pageSize = 20,
    groups = '@@',
    tags = '@@',
    dynamicTags = '@@',
    dataType = 'auto'
  } = params;
  // UDP Dataset ID: ACM_GET_CI_BY_SELECTOR
  return useApi()
    .post('/dts/api/dts/q/data/ACM_GET_CI_BY_SELECTOR/', {
      params: {
        assetType: ciType,
        groups,
        tags,
        dynamicTags,
        dataType
      },
      page,
      size: pageSize
    })
    .then(response => {
      const payload = response?.data || response || {}

      if (Array.isArray(payload)) {
        return {
          records: payload,
          total: payload.length
        }
      }

      return {
        ...payload,
        records: Array.isArray(payload.records)
          ? payload.records
          : Array.isArray(payload.content)
            ? payload.content
            : [],
        total: Number(payload.total ?? payload.totalElements ?? payload.records?.length ?? payload.content?.length ?? 0)
      }
    })
}

/** 查询分组树视图 */
export const queryAcmGroups = (ciType) => {
  return useApi().get(`/acm/api/acm/query/group/view/${ciType}`);
}

/** 查询标签列表视图 */
export const queryAcmTags = (ciType) => {
  return useApi().get(`/acm/api/acm/query/tag/view/${ciType}`);
}

/** 按属性搜索主机 */
export const searchAcmByAttr = (assetType, attrCode, attrValues) => {
  return useApi().post('/acm/api/acm/ci/search/attr', {
    assetType,
    attrCode,
    attrValues
  });
}

/** 查询最近使用的主机 (使用 JAO 接口) */
export const queryAcmRecentlyUsed = (params = {}) => {
  const { jobTypes = 'script,command', limit = 100 } = params;
  return useApi().post('/jao/api/jao/jobs/recently', {
    jobTypes,
    limit
  });
}

/** 获取CI类型列表 (自动化类型) */
export const getAcmCiTypesAuto = () => {
  return useApi().get('/acm/api/acm/cit/get/auto/list');
}

/** 获取CI类型列表 (所有类型) */
export const getAcmCiTypes = () => {
  return useApi().get('/acm/api/acm/cit/get/all/list');
}

/** 根据代码获取CI类型定义 */
export const getAcmCitByCode = (code) => {
  return useApi().get(`/acm/api/acm/cit/code/${code}`);
}

