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

/** 获取作业详情 */
export const getJobDetail = (id) => {
  return useApi().get(`/jao/api/jao/jobs/${id}`);
}

/** 执行作业 */
export const executeJob = (data) => {
  return useApi().post(`/jao/api/jao/run`, data);
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

/** 流程列表 */
export const fetchFlows = () => {
  return useApi().get('/jao/api/jao/flows');
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
    return useApi().put(`/jao/api/jao/flows/${data.id}`, data);
  }
  return useApi().post('/jao/api/jao/flows', data);
}

/** 删除流程 */
export const deleteFlow = (flowId) => {
  return useApi().delete(`/jao/api/jao/flows/${flowId}`);
}

/** 创建流程实例(执行流程) */
export const createFlowInstance = (data) => {
  return useApi().post('/jao/api/jao/flows/instances', data);
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
  const { ciType, page = 1, pageSize = 20, groups = '@@', tags = '@@', dynamicTags = '@@' } = params;
  // UDP Dataset ID: ACM_GET_CI_BY_SELECTOR
  return useApi().post('/dts/api/dts/q/data/ACM_GET_CI_BY_SELECTOR/', {
    assetType: ciType,
    groups,
    tags,
    dynamicTags,
    page,
    pageSize
  });
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
export const queryAcmRecentlyUsed = (params) => {
  const { ciType, lim = 1, jobType = ['command', 'script', 'process'], page = 1, pageSize = 20 } = params;
  return useApi().post('/jao/api/jao/jobs/recently', {
    ciType,
    lim,
    jobType,
    page,
    pageSize
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

