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
