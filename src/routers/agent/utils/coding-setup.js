const uuid = require("uuid");
const handleStream = require("@src/utils/stream.util");
const {
  ensureConversation,
  prepareWorkspace,
  processFileUploads,
  updateAgentSettings
} = require('./coding-helpers');

const { saveUserMessage } = require('./coding-messages');
const { uploadBase64Image } = require('@src/utils/img_upload');
/**
 * 处理screenshot数据，上传到OSS并返回URL
 * @param {string} screenshot - base64图片数据
 * @param {string} conversation_id - 对话ID
 * @returns {Promise<string>} 处理后的URL或原始数据
 */
async function processScreenshot(screenshot, conversation_id) {
  if (!screenshot || typeof screenshot !== 'string' || !screenshot.startsWith('data:image/')) {
    return screenshot;
  }

  try {
    console.log('处理截图数据...');

    // todo 实现新的uploadBase64Image
    const uploadResult = await uploadBase64Image(screenshot, {
      prefix: `coding-screenshots/${conversation_id}`,
      fileName: `selection-${Date.now()}.png`
    });

    if (uploadResult.success) {
      console.log('截图上传成功:', uploadResult.url);
      return uploadResult.url;
    } else {
      console.error('截图上传失败:', uploadResult.error);
      return screenshot;
    }
  } catch (error) {
    console.error('处理截图数据时出错:', error.message);
    return screenshot;
  }
}

/**
 * Setup everything needed for coding task
 * Returns all necessary context and utilities
 */
async function setupCodingTask(ctx) {
  const { request, response } = ctx;
  const body = request.body || {};
  const userId = ctx.state.user.id;

  let {
    conversation_id,
    selection,
    screenshot,
    requirement,
    filepath,
    fileIds,
    agent_id,
    model_id,
    mcp_server_ids = []
  } = body;

  // Validate permissions
  // await validateModelPermissions(model_id, userId);

  // Ensure conversation exists
  conversation_id = await ensureConversation(conversation_id, requirement, userId, agent_id);

  // Process screenshot and upload to OSS
  const processedScreenshot = await processScreenshot(screenshot, conversation_id);

  // Update agent settings if needed
  if (agent_id) {
    await updateAgentSettings(agent_id, mcp_server_ids);
  }

  // Prepare workspace
  const { dir_path, WORKSPACE_DIR } = await prepareWorkspace(conversation_id, userId);

  // Process file uploads
  const { files, docsetId } = await processFileUploads(
    fileIds, conversation_id, dir_path, WORKSPACE_DIR, userId
  );

  // Setup SSE stream
  const { stream, onTokenStream } = handleStream('sse', response);

  // Send initial messages  
  await saveUserMessage(conversation_id, requirement, filepath, selection, files, processedScreenshot);

  return {
    // Request data
    conversation_id,
    selection,
    screenshot: processedScreenshot,
    requirement,
    filepath,
    agent_id,
    userId,
    mcp_server_ids,

    // Processed data
    dir_path,
    files,
    docsetId,

    // Stream utilities
    stream,
    onTokenStream,

    // Context
    ctx
  };
}

module.exports = {
  setupCodingTask,
  processScreenshot
};