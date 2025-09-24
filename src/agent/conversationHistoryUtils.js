const path = require('path');
const MessageTable = require('@src/models/Message');
const { Op } = require("sequelize");

/**
 * 从数据库中检索具有特定会话ID的消息。
 * 查询所有 role = user 或 role = assistant，且 status = success 的消息
 * @param {string} conversationId - 会话ID。
 * @returns {Promise<Array<Object>>} 消息数组。
 */
const retrieveMessages = async (conversationId) => {
  try {
    const messages = await MessageTable.findAll({
      where: {
        conversation_id: conversationId,
        role: {
          [Op.in]: ['user', 'assistant']
        },
        status: 'success'
      },
      order: [['create_at', 'ASC']] // 按创建时间升序排列
    });
    console.log('messages.length', messages.length);
    return messages;
  } catch (error) {
    console.error(`检索消息时出错: ${error.message}`);
    return [];
  }
}

/**
 * 安全地解析消息的元数据字符串。
 * @param {string} metaString - 消息的元数据字符串。
 * @returns {Object|null} 解析后的元数据对象，如果解析失败则为null。
 */
const parseMessageMeta = (metaString) => {
  try {
    return JSON.parse(metaString);
  } catch (error) {
    console.error(`解析消息元数据时出错: ${error.message}`);
    return null;
  }
}

/**
 * 格式化历史消息内容。
 * @param {Array<Object>} conversationMessages - 完整的对话消息数组。
 * @param {Array<string>} allGeneratedFiles - 所有生成的文件路径数组。
 * @returns {string} 格式化后的历史内容。
 */
const formatHistoryContent = (conversationMessages, allGeneratedFiles) => {
  // 格式化对话历史
  const conversationContent = conversationMessages.map((message, index) => {
    const role = message.role === 'user' ? '用户' : '助手';
    return `${index + 1}. ${role}: ${message.content}`;
  }).join('\n');
  
  // 格式化文件列表
  const files = allGeneratedFiles.map((filepath, index) => {
    return `${index + 1}. ${filepath}`;
  }).join('\n');

  let historyContent = `## 对话历史\n${conversationContent}`;
  
  if (allGeneratedFiles.length > 0) {
    historyContent += `\n\n## 生成的文件列表\n${files}`;
  }
  
  return historyContent;
}

/**
 * 从数据库中检索并格式化之前的会话总结。
 * 新的逻辑：支持混合的 chat 和 agent 对话
 * - 保留所有用户消息
 * - 对于 assistant 消息：
 *   - 如果 action_type = 'chat'，保留对话内容
 *   - 如果 action_type 为其他类型（如 write_code），提取文件路径
 * @param {string} conversationId - 会话ID。
 * @param {string} workspaceBaseDirPath - 工作区根目录路径，用于计算文件相对路径。
 * @returns {Promise<string>} 格式化后的历史总结字符串。
 */
const retrieveAndFormatPreviousSummary = async (conversationId, workspaceBaseDirPath) => {
  try {
    const messages = await retrieveMessages(conversationId);

    if (!messages || messages.length === 0) {
      return '';
    }

    const conversationMessages = [];
    const allGeneratedFiles = [];

    for (const message of messages) {
      if (message.role === 'user') {
        // 保留所有用户消息
        conversationMessages.push({
          role: 'user',
          content: message.content
        });
      } else if (message.role === 'assistant') {
        const meta = parseMessageMeta(message.meta);
        
        if (meta && meta.action_type === 'chat') {
          // 保留 chat 类型的 assistant 消息
          conversationMessages.push({
            role: 'assistant',
            content: message.content
          });
        } else if (meta && meta.filepath && !meta.filepath.endsWith('todo.md')) {
          // 对于非 chat 类型，提取文件路径
          const relativePath = path.relative(workspaceBaseDirPath, meta.filepath);
          allGeneratedFiles.push(relativePath);
        }
      }
    }

    // 去重文件列表
    const uniqueFiles = [...new Set(allGeneratedFiles)];

    return formatHistoryContent(conversationMessages, uniqueFiles);
  } catch (error) {
    console.error(`格式化历史总结时出错: ${error.message}`);
    return '';
  }
}

module.exports = {
  retrieveAndFormatPreviousSummary,
};
