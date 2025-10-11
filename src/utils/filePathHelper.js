const path = require('path');
const { getDirpath } = require('@src/utils/electron');

/**
 * 解析文件路径为绝对路径
 * @param {string} filepath - 文件路径
 * @param {Object} state - 包含用户信息的状态对象
 * @returns {string} 绝对路径
 */
const resolveAbsolutePath = (filepath, state = {}) => {
  const userId = state.user?.id;
  let workspace_dir = process.env.WORKSPACE_DIR || 'workspace';
  if(process.env.DOCKER_HOST_ADDR){
    workspace_dir = "../"+workspace_dir;
  }
  const WORKSPACE_DIR = getDirpath(workspace_dir, userId);
  return path.join(WORKSPACE_DIR, filepath);
};

/**
 * 提取相对路径（从Conversation开始）
 * @param {string} filepath - 完整文件路径
 * @returns {string} 相对路径
 */
const extractRelativePath = (filepath) => {
  if (!filepath) return filepath;

  // 如果路径包含 Conversation，从那里开始提取
  if (filepath.includes('Conversation')) {
    return filepath.substring(filepath.indexOf('Conversation'));
  }

  // 如果已经是相对路径，直接返回
  if (!path.isAbsolute(filepath)) {
    return filepath;
  }

  // 尝试提取 workspace 之后的路径
  const workspaceIndex = filepath.lastIndexOf('workspace');
  if (workspaceIndex !== -1) {
    const afterWorkspace = filepath.substring(workspaceIndex + 'workspace'.length);
    return afterWorkspace.startsWith('/') ? afterWorkspace.substring(1) : afterWorkspace;
  }

  return filepath;
};

/**
 * 标准化文件路径
 * @param {string} filepath - 文件路径
 * @returns {string} 标准化后的路径
 */
const normalizePath = (filepath) => {
  if (!filepath) return filepath;

  // 统一使用正斜杠
  return filepath.replace(/\\/g, '/');
};

module.exports = {
  resolveAbsolutePath,
  extractRelativePath,
  normalizePath
};