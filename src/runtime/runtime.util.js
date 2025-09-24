const path = require('path');

const { getDirpath } = require('./utils/electron');
const resolveWorkspaceDir = async (user_id) => {
  const WORKSPACE_DIR = getDirpath(process.env.WORKSPACE_DIR || 'workspace', user_id);
  return WORKSPACE_DIR;
}

/**
 * restrict filepath to workspace dir
 * @param {string} filepath 
 * @returns {Promise<string>}
 */
const restrictFilepath = async (filepath, user_id) => {
  const workspace_dir = await resolveWorkspaceDir(user_id);

  const resolvedPath = path.resolve(filepath);
  const resolvedWorkspace = path.resolve(workspace_dir);
  if (resolvedPath.startsWith(resolvedWorkspace)) {
    filepath = resolvedPath;
  } else {
    filepath = path.resolve(workspace_dir, filepath);
  }
  return filepath;
}

module.exports = {
  resolveWorkspaceDir,
  restrictFilepath
}