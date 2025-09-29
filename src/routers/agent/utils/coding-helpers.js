const uuid = require("uuid");
const fs = require('fs').promises;
const path = require('path');
const { Op } = require('sequelize');
const { getDirpath } = require('@src/utils/electron');
const Conversation = require("@src/models/Conversation");
const File = require('@src/models/File');
const Model = require('@src/models/Model');
const Agent = require('@src/models/Agent');
const MessageModel = require("@src/models/Message");
const handle_feedback = require("@src/knowledge/feedback");
const Knowledge = require("@src/models/Knowledge");

const ensureConversation = async (conversation_id, requirement, user_id, agent_id) => {
  if (!conversation_id) {
    conversation_id = uuid.v4();
    const title = `Conversation_${conversation_id.slice(0, 6)}`;
    await Conversation.create({
      conversation_id,
      content: requirement,
      title,
      status: 'running',
      modeType: 'coding',
      agent_id,
      user_id
    });
  } else {
    await Conversation.update(
      { status: 'running', agent_id },
      { where: { conversation_id } }
    );
  }
  return conversation_id;
}

const prepareWorkspace = async (conversation_id, user_id) => {
  const WORKSPACE_DIR = getDirpath(process.env.WORKSPACE_DIR || 'workspace', user_id);
  const dir_name = 'Conversation_' + conversation_id.slice(0, 6);
  const dir_path = path.join(WORKSPACE_DIR, dir_name);
  await fs.mkdir(dir_path, { recursive: true });
  return { WORKSPACE_DIR, dir_path };
}

const processFileUploads = async (fileIds, conversation_id, dir_path, WORKSPACE_DIR, user_id) => {
  if (!Array.isArray(fileIds) || fileIds.length === 0) {
    return { files: [], docsetId: null };
  }

  // Update file associations
  for (const fileId of fileIds) {
    await File.update({ conversation_id }, { where: { id: fileId } });
  }

  const files = await File.findAll({ where: { id: fileIds } });

  // Move files
  const uploadDir = path.join(WORKSPACE_DIR, 'upload');
  const targetUploadDir = path.join(dir_path, 'upload');
  await fs.mkdir(targetUploadDir, { recursive: true });

  let conversation = await Conversation.findOne({ where: { conversation_id } });
  let docsetId = conversation?.docset_id || null;
  const apiKey = process.env.ARYN_API_KEY;

  for (const file of files) {
    const srcPath = path.join(uploadDir, file.name);
    const destPath = path.join(targetUploadDir, file.name);

    try {
      await fs.rename(srcPath, destPath);
    } catch (err) {
      if (err.code === 'EXDEV' || err.code === 'EEXIST') {
        await fs.copyFile(srcPath, destPath);
        await fs.unlink(srcPath);
      } else {
        throw err;
      }
    }

    // Upload to docset if supported
    if (apiKey) {
      docsetId = await uploadToDocset(file, destPath, conversation, conversation_id, user_id, docsetId, apiKey);
    }
  }

  return {
    files: files.map(file => ({
      ...file.dataValues,
      filename: file.name,
      filepath: path.join(dir_path, 'upload', file.name)
    })),
    docsetId
  };
}

// Process knowledge feedback
async function processKnowledgeFeedback(requirement, conversation_id, agent_id) {
  const ENABLE_KNOWLEDGE = process.env.ENABLE_KNOWLEDGE || "ON";

  if (ENABLE_KNOWLEDGE !== "ON" || !agent_id) {
    return;
  }

  try {
    await handle_feedback({
      user_feedback: requirement,
      conversation_id,
      agent_id,
    });

    const knowledge_count = await Knowledge.count({ where: { agent_id } });
    await Agent.update({ knowledge_count }, { where: { id: agent_id } });

    // 更新 system knowledge_count
    const currentAgent = await Agent.findOne({ where: { id: agent_id } });
    if (currentAgent && currentAgent.role_id) {
      const systemKnowledgeCount = await Knowledge.count({ where: { agent_id: currentAgent.role_id } });
      await Agent.update({ knowledge_count: systemKnowledgeCount }, { where: { id: currentAgent.role_id } });
    }

    console.log('Knowledge feedback processed');
  } catch (error) {
    console.error('Knowledge feedback failed:', error);
  }
}

// Handle post-execution tasks
async function handlePostExecution(conversation_id, agent_id, dir_path, filepath, token) {
  const tasks = [];

  // Take screenshot if needed
  if (agent_id) {
    tasks.push(captureScreenshot(dir_path, filepath, conversation_id, agent_id, token));
  }

  // Update agent recommendation
  if (agent_id) {
    tasks.push(updateAgentRecommend(conversation_id, agent_id));
  }

  // Update conversation status
  tasks.push(Conversation.update({ status: 'done' }, { where: { conversation_id } }));

  await Promise.allSettled(tasks);
}

const captureScreenshot = async (dir_path, filepath, conversation_id, agent_id, token) => {
  try {
    const final_file = await findFinalFile(dir_path, filepath);
    if (!final_file) return;

    const url = `${process.env.SUB_SERVER_DOMAIN}/file/?url=${final_file}`;
    const tokenString = token?.startsWith('Bearer ') ? token.slice(7) : token;

    if (!tokenString) return;

    // const result = await takeScreenshotAndUpload(url, {
    //   accessToken: tokenString,
    //   conversation_id
    // });

    // if (result?.screenshotUrl) {
    //   const agent = await Agent.findOne({ where: { id: agent_id } });
    //   if (agent && !agent.replay_conversation_id) {
    //     await Agent.update(
    //       { screen_shot_url: result.screenshotUrl },
    //       { where: { id: agent_id } }
    //     );
    //     console.log('Screenshot updated:', result.screenshotUrl);
    //   }
    // }
  } catch (error) {
    console.error('Screenshot capture failed:', error);
  }
}

const findFinalFile = async (dir_path, filepath) => {
  try {
    if (filepath) {
      const fullPath = path.isAbsolute(filepath) ? filepath : path.join(dir_path, filepath);
      const exists = await fs.access(fullPath).then(() => true).catch(() => false);
      if (exists) return fullPath;
    }

    const files = await fs.readdir(dir_path, { withFileTypes: true });
    let latestFile = null;
    let latestMtime = 0;

    for (const entry of files) {
      if (entry.isFile() && !entry.name.startsWith('.')) {
        const filePath = path.join(dir_path, entry.name);
        const stat = await fs.stat(filePath);
        if (stat.mtimeMs > latestMtime) {
          latestMtime = stat.mtimeMs;
          latestFile = filePath;
        }
      }
    }

    return latestFile;
  } catch (error) {
    console.error('Error finding final file:', error);
    return null;
  }
}

const updateAgentRecommend = async (conversation_id, agent_id) => {
  try {
    const agent = await Agent.findOne({ where: { id: agent_id } });
    if (!agent) return;

    const messages = await MessageModel.findAll({ where: { conversation_id } });

    let hasCompletion = false;
    for (const message of messages) {
      try {
        let meta = message.meta;
        if (typeof meta === 'string') {
          meta = JSON.parse(meta);
        }
        if (meta?.action_type === 'coding_complete') {
          hasCompletion = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    const newRecommend = hasCompletion ? 0 : -1;
    if (agent.recommend !== newRecommend) {
      await Agent.update({ recommend: newRecommend }, { where: { id: agent_id } });
      console.log(`Agent ${agent_id} recommendation updated to ${newRecommend}`);
    }
  } catch (error) {
    console.error(`Error updating agent recommendation:`, error);
  }
}

const updateAgentSettings = async (agent_id, mcp_server_ids) => {
  if (!agent_id) return;

  try {
    await Agent.update(
      { mcp_server_ids },
      { where: { id: agent_id } }
    );
    console.log(`Agent ${agent_id} settings updated`);
  } catch (error) {
    console.error('Failed to update agent settings:', error);
  }
}

const getContainerCloseHandler = () => {
  const RUNTIME_TYPE = process.env.RUNTIME_TYPE;

  if (RUNTIME_TYPE === 'e2b') {
    return require('@src/utils/e2b').closeContainer;
  } else if (RUNTIME_TYPE === 'local-docker') {
    return async () => console.log('Local environment - skip container close');
  } else {
    return require('@src/utils/eci_server').closeContainer;
  }
}

module.exports = {
  ensureConversation,
  prepareWorkspace,
  processFileUploads,
  processKnowledgeFeedback,
  handlePostExecution,
  updateAgentRecommend,
  updateAgentSettings,
  getContainerCloseHandler
};