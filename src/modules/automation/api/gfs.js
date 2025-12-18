import { useApi } from "@/core/api";

/**
 * GFS 文件服务相关 API
 */

const GFS_REPO = '$tnt'; // 默认租户仓库

/**
 * 获取仓库名称
 */
function getRepo(repo) {
  return repo || GFS_REPO;
}

/**
 * 获取目录文件列表
 * @param {string} repo - 仓库名称（可选，默认使用租户仓库）
 * @param {string} dir - 目录路径，空字符串表示根目录
 * @param {string} repoType - 仓库类型: 'git', 'stage', 'staticfs'
 * @param {object} options - 选项
 * @param {boolean} options.includeStage - 是否包含暂存区文件
 */
export const listFiles = async (repo, dir = '', repoType = 'git', options = {}) => {
  const includeStage = options.includeStage !== false && repoType === 'git';
  const dirPath = dir ? encodeURIComponent(dir) : '';
  const cacheBuster = Date.now();

  let apiPath = `/gfs/api/gfs/v2/${repoType}/r/${getRepo(repo)}/dir/${dirPath}`;
  const params = [];
  if (includeStage) params.push('useStage=true');
  params.push(`cacheBuster=${cacheBuster}`);
  apiPath += '?' + params.join('&');

  const response = await useApi().get(apiPath);
  const files = response?.data || response || [];

  // 处理审核区文件
  if (includeStage || repoType === 'stage') {
    parseStageFiles(files);
  }

  // 检测文件状态
  files.forEach((file) => {
    detectStatus(file);
    parseFileCss(file);
  });

  return files;
}

/**
 * 解析审核区文件
 */
function parseStageFiles(files) {
  const stageFiles = files.filter((f) => f.repoType === 'STAGE');
  stageFiles.forEach((sfile) => {
    const main = files.find((f) => f.path === sfile.path && f.repoType !== 'STAGE');
    if (main) {
      main._stageExists = true;
      main._stageStatus = sfile.onlineStatus;
      if (sfile.onlineStatus !== 'REJECTED') {
        main._stageNeedApprove = true;
      }
    } else {
      sfile._stageIsThis = true;
      sfile._stageExists = true;
    }
  });
  // 移除 STAGE 类型的重复项
  const toRemove = files.filter((f) => f.repoType === 'STAGE' && !f._stageIsThis);
  toRemove.forEach((f) => {
    const index = files.indexOf(f);
    if (index > -1) files.splice(index, 1);
  });
}

/**
 * 检测文件状态
 */
function detectStatus(file) {
  const MASTER_STATUS_DEFS = {
    PUBLISHED: { text: '已启用', color: 'success' },
    DISABLED: { text: '已停用', color: 'secondary' }
  };

  const STAGE_STATUS_DEFS = {
    '': { text: '待审核', color: 'primary' },
    NULL: { text: '待审核', color: 'primary' },
    REJECTED: { text: '已拒绝', color: 'warning' }
  };

  if (!file.directory && file.conflict !== 'RecordNotFound') {
    const fileStatus = file.onlineStatus || '';
    let def;

    if (file.repoType === 'STAGE') {
      def = STAGE_STATUS_DEFS[fileStatus] || STAGE_STATUS_DEFS[''];
    } else if (file.repoType === 'GIT') {
      def = MASTER_STATUS_DEFS[fileStatus];
    }

    if (def && file.repoType !== 'STAGE') {
      file._statusCss = def.color;
      file._statusText = def.text;
    }

    if (file._stageExists || file.repoType === 'STAGE') {
      const stageDef = STAGE_STATUS_DEFS[file._stageStatus || ''] || STAGE_STATUS_DEFS[''];
      file._stageStatusColor = stageDef.color;
      file._stageStatusText = stageDef.text;
    }
  }
}

/**
 * 解析文件样式
 */
function parseFileCss(file) {
  // 异常提示
  if (file.conflict === 'RecordNotFound') {
    file._warnText = '找不到对应的记录，可能该文件是手工传到文件系统中';
  } else if (file.conflict === 'FileNotFound') {
    file._warnText = '找不到对应的文件，可能手工从文件系统中删除了该文件';
  }

  // 新版本指示器
  if (file._stageStatus && file.repoType !== 'stage') {
    if (file._stageStatus !== 'REJECTED') {
      file._stageIndicator = {
        text: `新版本：${file._stageStatusText || '待审核'}`
      };
    }
  }
}

/**
 * 获取文件信息
 * @param {string} repoType - 仓库类型
 * @param {string} repo - 仓库名称
 * @param {string} path - 文件路径
 * @param {boolean} withContent - 是否获取文件内容
 */
export const getFileInfo = (repoType, repo, path, withContent = false) => {
  const cacheBuster = Date.now();
  return useApi().get(`/gfs/api/gfs/v2/${repoType.toUpperCase()}/f/${getRepo(repo)}/file/${path}`, {
    params: { isContent: withContent, cacheBuster }
  });
}

/**
 * 更新文件信息
 */
export const updateFileInfo = (repoType, repo, path, fileInfo) => {
  const cacheBuster = Date.now();
  return useApi().put(`/gfs/api/gfs/v2/${repoType.toUpperCase()}/f/${getRepo(repo)}/file/${path}?cacheBuster=${cacheBuster}`, fileInfo);
}

/**
 * 上传文件
 */
export const uploadFile = (repoType, repo, fileInfo, onProgress) => {
  const formData = new FormData();
  formData.append('file', fileInfo.file);
  formData.append('dir', fileInfo.dir || '');
  if (fileInfo.description) formData.append('description', fileInfo.description);
  if (fileInfo.config) formData.append('config', fileInfo.config);
  if (fileInfo.unzipMode) formData.append('unzipMode', fileInfo.unzipMode);

  return useApi().post(`/gfs/api/gfs/v2/${repoType}/r/${getRepo(repo)}/file`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    }
  });
}

/**
 * 删除文件
 */
export const deleteFiles = (repoType, repo, filePaths) => {
  return useApi().put(`/gfs/api/gfs/v2/${repoType}/r/${getRepo(repo)}/file`, filePaths);
}

/**
 * 移动文件
 */
export const moveFiles = (repoType, repo, targetPath, filePaths) => {
  let url = `/gfs/api/gfs/v2/${repoType}/f/${getRepo(repo)}/moveto`;
  if (targetPath) {
    url += `?targetPath=${encodeURIComponent(targetPath)}`;
  }
  return useApi().put(url, filePaths);
}

/**
 * 新建文件夹
 */
export const addFolder = (config, folderName, folderDesc) => {
  const path = config.dir ? `${config.dir}/${folderName}` : folderName;
  return useApi().post(
    `/gfs/api/gfs/v2/${config.repoType}/r/${getRepo(config.repo)}/dir/${encodeURIComponent(path)}`,
    { description: folderDesc }
  );
}

/**
 * 编辑文件夹
 */
export const editFolder = (config, folderName, folderDesc) => {
  const path = config.dir ? `${config.dir}/${folderName}` : folderName;
  return useApi().put(`/gfs/api/gfs/v2/git/r/${getRepo(config.repo)}/dir`, {
    description: folderDesc,
    dir: path
  });
}

/**
 * 下载单个文件
 */
export const downloadFile = (repoType, repo, path, saveFilename) => {
  const url = `/gfs/api/gfs/v2/${repoType}/r/${getRepo(repo)}/download/${encodeURIComponent(path)}`;
  const filename = saveFilename || path.substring(path.lastIndexOf('/') + 1);

  // 创建隐藏的 a 标签下载
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * 批量下载文件
 */
export const downloadFiles = async (repoType, repo, filePaths, zipName) => {
  const url = `/gfs/api/gfs/v2/${repoType}/r/${getRepo(repo)}/batch/download`;
  const filename = zipName ? `${zipName}.zip` : `download_${Date.now()}.zip`;

  const response = await useApi().post(url, filePaths, {
    responseType: 'blob'
  });

  const blob = new Blob([response.data || response], { type: 'application/zip' });
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(downloadUrl);
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
 * 获取文件修订历史
 * @param {string} repo - 仓库名称
 * @param {string} path - 文件路径
 */
export const getFileRevisions = (repo, path) => {
  return useApi().get(`/gfs/api/gfs/v2/git/r/${getRepo(repo)}/rev/${encodeURIComponent(path)}`);
}

/**
 * 回退到指定版本
 * @param {string} repo - 仓库名称
 * @param {string} commitName - 提交名称
 * @param {string} path - 文件路径
 */
export const rollbackFileRevision = (repo, commitName, path) => {
  return useApi().post(`/gfs/api/gfs/v2/git/r/${getRepo(repo)}/rev/${encodeURIComponent(path)}/${commitName}`);
}

/**
 * 获取文件审批历史（单个文件）
 */
export const getFileApprovalHistory = (repoType, repo, filePath) => {
  return useApi().get(`/gfs/api/gfs/v2/${repoType}/f/${getRepo(repo)}/history/${encodeURIComponent(filePath)}`);
}

/**
 * 获取文件审批历史
 */
export const getFileApproveHistory = (repo, filePath) => {
  return useApi().get(`/gfs/api/gfs/v2/git/f/${getRepo(repo)}/history/${encodeURIComponent(filePath)}`);
}

/**
 * 获取所有审批历史
 */
export const getApprovalHistory = (repo) => {
  return useApi().get(`/gfs/api/gfs/v2/git/f/${getRepo(repo)}/history`);
}

/**
 * 获取所有审批历史
 */
export const getAllApproveHistory = (repo) => {
  return useApi().get(`/gfs/api/gfs/v2/git/f/${getRepo(repo)}/history`);
}

/**
 * 获取审批详情
 */
export const getApprovalDetail = (repo, approvalId) => {
  return useApi().get(`/gfs/api/gfs/v2/git/f/${getRepo(repo)}/history/${approvalId}`);
}

/**
 * 变更文件状态
 */
export const changeFileStatus = (repoType, repo, files, status, comment) => {
  const filePaths = files.map((f) => f.path);
  const cacheBuster = Date.now();
  return useApi().put(`/gfs/api/gfs/v2/${repoType}/f/${getRepo(repo)}/attr?cacheBuster=${cacheBuster}`, {
    onlineStatus: status,
    comment,
    srcPaths: filePaths
  });
}

/**
 * 审批通过
 */
export const approveFiles = (files, comment) => {
  return changeFileStatus(files[0].repoType || 'git', files[0].repo, files, 'PUBLISHED', comment);
}

/**
 * 审批拒绝
 */
export const rejectFiles = (files, comment) => {
  return changeFileStatus(files[0].repoType || 'git', files[0].repo, files, 'REJECTED', comment);
}

/**
 * Git 拉取
 */
export const gitPull = (repo) => {
  return useApi().get(`/gfs/api/gfs/v2/git/f/${getRepo(repo)}/remote/repos/pull`);
}

/**
 * Git 推送
 */
export const gitPush = (repo) => {
  return useApi().get(`/gfs/api/gfs/v2/git/f/${getRepo(repo)}/remote/repos/push`);
}

/**
 * 同步远程文件
 */
export const syncFile = (repoType, repo, fileInfo) => {
  return useApi().post(`/gfs/api/gfs/v2/${repoType}/r/${getRepo(repo)}/sync`, {
    path: fileInfo.path,
    dir: fileInfo.dir || '',
    syncMode: fileInfo.syncMode
  });
}

/**
 * 获取文件下载链接
 */
export const getFileDownloadUrl = (repoType, repo, path) => {
  return `/gfs/api/gfs/v2/${repoType}/r/${getRepo(repo)}/download/${encodeURIComponent(path)}`;
}

/**
 * 获取 Git 仓库列表
 */
export const getGitRepoList = () => {
  return useApi().get(`/gfs/api/gfs/v2/git/repos`);
}

/**
 * 修复 JGit 存储区
 */
export const repairJgit = (repo) => {
  return useApi().get(`/gfs/api/gfs/v2/jgit/${getRepo(repo)}/status/repair`);
}

/**
 * 获取 JGit 信息
 */
export const getJgitInfo = async (repoType, repo) => {
  const res = await useApi().get(`/gfs/api/gfs/v2/jgit/${getRepo(repo)}/status`);
  return res?.data || res;
}

/**
 * 重置 JGit
 */
export const resetJgit = (repoType, repo) => {
  return useApi().get(`/gfs/api/gfs/v2/jgit/${getRepo(repo)}/reset`);
}

/**
 * 加载当前仓库列表
 */
export const loadCurrentRepo = (repoType, repo) => {
  return useApi().get(`/gfs/api/gfs/v2/${repoType}/f/${getRepo(repo)}/current/repo`);
}

/**
 * 删除外部仓库
 */
export const delExternalRepo = (repoType, repo, repoName) => {
  return useApi().delete(`/gfs/api/gfs/v2/${repoType}/f/${getRepo(repo)}/current/repo/${repoName}`);
}

/**
 * 批量删除外部仓库
 */
export const delBatchExternalRepo = (repoType, repo, repoIds) => {
  return useApi().put(`/gfs/api/gfs/v2/${repoType}/f/${getRepo(repo)}/current/repos`, repoIds);
}

/**
 * 初始化外部 Git 仓库
 */
export const initGitRepo = (repo, formData, onProgress) => {
  return useApi().post(`/gfs/api/gfs/v2/git/f/${getRepo(repo)}/remote/repos/init`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    }
  });
}

/**
 * 重置 Git 仓库
 */
export const resetGitRepo = (repo) => {
  return useApi().post(`/gfs/api/gfs/v2/git/f/${getRepo(repo)}/reset`);
}
