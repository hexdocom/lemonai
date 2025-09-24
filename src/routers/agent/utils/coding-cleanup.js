const Conversation = require("@src/models/Conversation");
const {
  handlePostExecution,
  getContainerCloseHandler
} = require('./coding-helpers');
const { saveCodingResult } = require('./coding-messages');

const fs = require('fs').promises;
const path = require('path');

const resolveFiles = async (files) => {
  const filesMetadata = await Promise.all(
    files.map(async (file) => {
      const stats = await fs.stat(file);
      return {
        filepath: file,
        filename: path.basename(file), // 使用 path.basename 更安全地提取文件名
        filesize: stats.size,
        mtime: stats.mtime, // 添加修改时间用于排序
      };
    })
  );

  // 按修改时间倒序排序（最新的文件在前面）
  return filesMetadata.sort((a, b) => b.mtime - a.mtime).map(({ mtime, ...rest }) => rest);
}

async function handleCodingResult(setup = {}, result) {
  const { conversation_id, onTokenStream, stream, filepath } = setup;
  console.log("filepath", filepath);
  const files = await resolveFiles([filepath]);
  const message = 'Coding task completed successfully';
  await saveCodingResult(onTokenStream, conversation_id, message, files);
  await Conversation.update({ status: 'done' }, { where: { conversation_id } });
  stream.end();
}

/**
 * Setup stream close handler
 */
function setupStreamCloseHandler(params) {
  const {
    stream,
    conversation_id,
    agent_id,
    userId,
    dir_path,
    filepath,
    token,
    onCleanup
  } = params;

  stream.on('close', async () => {
    console.log('Coding stream closed');

    try {
      // Close container
      const closeContainer = getContainerCloseHandler();
      await closeContainer(userId);

      // Handle post-execution tasks
      await handlePostExecution(
        conversation_id,
        agent_id,
        dir_path,
        filepath,
        token
      );

      // Custom cleanup callback
      if (onCleanup) {
        await onCleanup();
      }
    } catch (error) {
      console.error('Stream cleanup error:', error);
    }
  });
}

module.exports = {
  handleCodingResult,
  setupStreamCloseHandler
};