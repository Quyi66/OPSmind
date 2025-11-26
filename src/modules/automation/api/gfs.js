import { useApi } from "@/core/api";

/**
 * GFS 文件服务相关 API
 */

const GFS_REPO = '$tnt'; // 默认租户仓库

/**
 * 获取目录文件列表
 * @param {string} dir - 目录路径，空字符串表示根目录
 * @param {string} repoType - 仓库类型: 'git', 'stage', 'staticfs'
 * @param {boolean} includeStage - 是否包含暂存区文件
 */
export const listFiles = (dir = '', repoType = 'git', includeStage = true) => {
  const apiPath = includeStage && repoType === 'git'
    ? `/gfs/api/gfs/v2/${repoType}/r/${GFS_REPO}/dir/${encodeURIComponent(dir)}?useStage=true`
    : `/gfs/api/gfs/v2/${repoType}/r/${GFS_REPO}/dir/${encodeURIComponent(dir)}`;
  return useApi().get(apiPath);
}

/**
 * 获取文件信息
 * @param {string} path - 文件路径
 * @param {string} repoType - 仓库类型
 * @param {boolean} withContent - 是否获取文件内容
 */
export const getFileInfo = (path, repoType = 'git', withContent = false) => {
  return useApi().get(`/gfs/api/gfs/v2/${repoType}/f/${GFS_REPO}/file/${path}`, {
    params: { isContent: withContent }
  });
}

/**
 * 检查文件是否存在
 * @param {string[]} filePaths - 文件路径数组
 */
export const checkFileExist = (filePaths) => {
  return useApi().post(`/gfs/api/gfs/v2/git/checkfiles/${GFS_REPO}`, filePaths);
}

/**
 * 获取 Playbook 信息
 * @param {string} path - 文件路径
 */
export const getPlaybookInfo = (path) => {
  return useApi().get(`/gfs/api/gfs/task/git/f/${GFS_REPO}/file/${path}`);
}

/**
 * 下载文件
 * @param {string} path - 文件路径
 * @param {string} repoType - 仓库类型
 */
export const downloadFile = (path, repoType = 'git') => {
  return useApi().get(`/gfs/api/gfs/v2/${repoType}/r/${GFS_REPO}/download/${encodeURIComponent(path)}`, {
    responseType: 'blob'
  });
}

/**
 * 获取文件修订历史
 * @param {string} path - 文件路径
 */
export const getFileRevisions = (path) => {
  return useApi().get(`/gfs/api/gfs/v2/git/r/${GFS_REPO}/rev/${path}`);
}
