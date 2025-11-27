import { useApi } from "@/core/api";

/**
 * 命令服务相关 API
 */

/**
 * 获取当前租户的所有命令
 */
export const findCommandByTenantId = () => {
  return useApi().get('/jao/api/jao/command/tenantId');
}

/**
 * 获取当前用户创建的命令
 */
export const findByTenantIdAndCreatedBy = () => {
  return useApi().get('/jao/api/jao/command/tenantId/user');
}

/**
 * 保存命令（新建或更新）
 * @param {object} command - 命令对象
 */
export const saveCommand = (command) => {
  if (command.id) {
    return useApi().put('/jao/api/jao/command', command);
  } else {
    return useApi().post('/jao/api/jao/command', command);
  }
}

/**
 * 根据ID获取命令详情
 * @param {string} id - 命令ID
 */
export const findCommandById = (id) => {
  return useApi().get(`/jao/api/jao/command/${id}`);
}

/**
 * 删除命令
 * @param {string} id - 命令ID
 */
export const deleteCommand = (id) => {
  return useApi().delete(`/jao/api/jao/command/${id}`);
}

/**
 * 获取所有待审核的命令
 */
export const findAllUnapprovedCommand = () => {
  return useApi().get('/jao/api/jao/command/unapproved');
}

/**
 * 获取所有已审核通过的命令
 */
export const findAllApproveCommand = () => {
  return useApi().get('/jao/api/jao/command/approve');
}

/**
 * 审核命令
 * @param {array} commands - 命令数组
 */
export const approveCommand = (commands) => {
  return useApi().put('/jao/api/jao/command/approve', commands);
}

/**
 * 执行命令
 * @param {object} request - 执行请求
 * @param {string[]} request.commands - 命令ID数组
 * @param {object[]} request.hosts - 主机列表
 */
export const runCommands = (request) => {
  return useApi().post('/jao/api/jao/run/command', request);
}

// ============ 作业相关 API ============

/**
 * 获取所有作业
 * @param {string} type - 作业类型: 'command', 'script', 'rest', 'process'
 */
export const findAllJobs = (type) => {
  let path = '/jao/api/jao/jobs';
  if (type) {
    path += `?type=${type}`;
  }
  return useApi().get(path);
}

/**
 * 根据ID获取作业
 * @param {string} id - 作业ID
 */
export const findJobById = (id) => {
  return useApi().get(`/jao/api/jao/jobs/${id}`);
}

/**
 * 保存作业
 * @param {object} job - 作业对象
 */
export const saveJob = (job) => {
  if (job.id) {
    return useApi().put(`/jao/api/jao/jobs/${job.id}`, job);
  } else {
    return useApi().post('/jao/api/jao/jobs', job);
  }
}

/**
 * 删除作业
 * @param {string} id - 作业ID
 */
export const deleteJob = (id) => {
  return useApi().delete(`/jao/api/jao/jobs/${id}`);
}

/**
 * 运行作业
 * @param {string} id - 作业ID
 * @param {object} options - 运行选项
 */
export const runJob = (id, options = {}) => {
  return useApi().post(`/jao/api/jao/jobs/${id}/run`, options);
}

/**
 * 执行作业请求
 * @param {object} request - 作业请求对象
 */
export const runJobByRequest = (request) => {
  return useApi().post('/jao/api/jao/run', request);
}

/**
 * 获取作业运行日志列表
 * @param {string} jobId - 作业ID
 */
export const findBriefLogsByJobId = (jobId) => {
  return useApi().get(`/jao/api/jao/jobs/${jobId}/runlogs`);
}

/**
 * 获取运行结果
 * @param {string} runId - 运行ID
 */
export const getRunResult = (runId) => {
  return useApi().get(`/jao/api/jao/runlogs/${runId}/result`);
}

/**
 * 获取最后一次运行结果
 * @param {string} jobId - 作业ID
 */
export const getLastRunResult = (jobId) => {
  return useApi().get(`/jao/api/jao/jobs/${jobId}/lastrunresult`);
}

// ============ 命令状态定义 ============

/**
 * 命令状态定义
 * 0 = 已发布/启用
 * 1 = 待审核
 * 2 = 审核未通过
 * 3 = 已停用
 */
export const COMMAND_STATUS = {
  PUBLISHED: 0,
  PENDING: 1,
  REJECTED: 2,
  DISABLED: 3
};

export const COMMAND_STATUS_MAP = {
  0: { text: '已发布', color: 'success', type: 'success' },
  1: { text: '待审核', color: 'warning', type: 'warning' },
  2: { text: '审核未通过', color: 'danger', type: 'danger' },
  3: { text: '已停用', color: 'info', type: 'info' }
};

/**
 * 获取命令状态显示信息
 * @param {number} status - 状态码
 */
export const getCommandStatusInfo = (status) => {
  return COMMAND_STATUS_MAP[status] || { text: '未知', color: 'default', type: 'info' };
}

/**
 * 命令类型列表
 */
export const COMMAND_TYPES = ['cmd', 'shell', 'python', 'playbook', 'powershell'];
