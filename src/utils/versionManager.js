const FileVersion = require("@src/models/FileVersion");
const fs = require('fs');
const { extractRelativePath, resolveAbsolutePath } = require('./filePathHelper');

/**
 * 创建文件版本 - 简化的API
 * @param {string} filepath - 文件路径（自动处理相对/绝对路径）
 * @param {string} conversation_id - 会话ID
 * @param {Object} options - 可选参数
 * @returns {Promise<Object>} 版本信息
 */
const createVersion = async (filepath, conversation_id, options = {}) => {
  if (!filepath || !conversation_id) {
    throw new Error('filepath and conversation_id are required');
  }

  const {
    content = null,
    user_id = null,
    state = null,
    action = 'AI编辑',
    metadata = {}
  } = options;

  try {
    // 自动处理路径
    const relativePath = extractRelativePath(filepath);
    // 如果没有提供 content，尝试读取文件
    let fileContent = content;
    if (!fileContent) {
      const absolutePath = state ? resolveAbsolutePath(relativePath, state) : filepath;
      if (fs.existsSync(absolutePath)) {
        fileContent = fs.readFileSync(absolutePath, 'utf-8');
      } else {
        throw new Error(`File not found: ${absolutePath}`);
      }
    }

    // 查询最新版本号
    const latestVersion = await FileVersion.findOne({
      where: { conversation_id, filepath: relativePath },
      order: [['version', 'DESC']]
    });

    const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

    // 批量更新所有版本的active状态
    await FileVersion.update(
      { active: false },
      { where: { conversation_id, filepath: relativePath } }
    );

    // 创建新版本
    const newVersion = await FileVersion.create({
      user_id,
      conversation_id,
      filepath: relativePath,
      content: fileContent,
      version: nextVersion,
      active: true,
      action,
      metadata: JSON.stringify(metadata)
    });

    console.log(`[Version] Created v${nextVersion} for ${relativePath}`);

    return {
      id: newVersion.id,
      version: newVersion.version,
      filepath: relativePath
    };
  } catch (error) {
    console.error('[Version] Create failed:', error);
    throw error;
  }
};

/**
 * 获取版本列表 - 简化的API
 */
const getVersions = async (conversation_id, filepath) => {
  if (!conversation_id || !filepath) {
    throw new Error('conversation_id and filepath are required');
  }

  const relativePath = extractRelativePath(filepath);

  try {
    return await FileVersion.findAll({
      where: { conversation_id, filepath: relativePath },
      attributes: ['id', 'version', 'create_at', 'active'],
      order: [['version', 'ASC']]
    });
  } catch (error) {
    console.error('[Version] Get versions failed:', error);
    throw error;
  }
};

/**
 * 切换版本 - 简化的API
 */
const switchToVersion = async (version_id, conversation_id, filepath, state = null) => {
  if (!version_id || !conversation_id || !filepath) {
    throw new Error('version_id, conversation_id and filepath are required');
  }

  const relativePath = extractRelativePath(filepath);

  try {
    // 获取目标版本
    const targetVersion = await FileVersion.findOne({
      where: { id: version_id }
    });

    if (!targetVersion) {
      throw new Error('Version not found');
    }

    // 批量更新active状态
    await FileVersion.update(
      { active: false },
      { where: { conversation_id, filepath: relativePath } }
    );

    await FileVersion.update(
      { active: true },
      { where: { id: version_id } }
    );

    // 写入文件（如果提供了state）
    if (state) {
      const absolutePath = resolveAbsolutePath(relativePath, state);
      if (absolutePath && fs.existsSync(require('path').dirname(absolutePath))) {
        fs.writeFileSync(absolutePath, targetVersion.content);
        console.log(`[Version] Switched to v${targetVersion.version}`);
      }
    }

    return {
      version_id,
      version: targetVersion.version,
      content: targetVersion.content
    };
  } catch (error) {
    console.error('[Version] Switch failed:', error);
    throw error;
  }
};

/**
 * 获取当前激活版本
 */
const getActiveVersion = async (conversation_id, filepath) => {
  if (!conversation_id || !filepath) {
    throw new Error('conversation_id and filepath are required');
  }

  const relativePath = extractRelativePath(filepath);

  try {
    return await FileVersion.findOne({
      where: { conversation_id, filepath: relativePath, active: true },
      attributes: ['id', 'version', 'content', 'create_at', 'action']
    });
  } catch (error) {
    console.error('[Version] Get active version failed:', error);
    throw error;
  }
};

/**
 * 快速创建版本（最简化的API）
 * @example
 * await quickCreateVersion(filepath, conversation_id, state);
 */
const quickCreateVersion = async (filepath, conversation_id, state) => {
  return createVersion(filepath, conversation_id, { state, action: '手动保存' });
};

/**
 * AI编辑后创建版本
 * @example
 * await createAIVersion(filepath, conversation_id, { requirement: '修复bug' });
 */
const createAIVersion = async (filepath, conversation_id, metadata = {}) => {
  return createVersion(filepath, conversation_id, {
    action: 'AI编辑',
    metadata
  });
};

const createFilesVersion = async (conversation_id, files, suffix = '.html', state = null) => {
  try {
    const htmlFiles = files.filter(file => file?.filepath?.endsWith(suffix));
    for (const file of htmlFiles) {
      const filepath = extractRelativePath(file.filepath);
      const exists = await FileVersion.findOne({ where: { conversation_id, filepath } });
      if (exists) {
        continue;
      }
      await createVersion(filepath, conversation_id, { state, action: 'Agent Coding' });
    }
  } catch (error) {
    console.error('[Version] Create files version failed:', error);
  }
};

module.exports = {
  createVersion,
  getVersions,
  switchToVersion,
  getActiveVersion,
  quickCreateVersion,
  createAIVersion,
  createFilesVersion
};