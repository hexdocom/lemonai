const router = require("koa-router")();
require("module-alias/register");

const Conversation = require("@src/models/Conversation");
const Message = require("@src/models/Message");
const ModelTable = require('@src/models/Model')
const auto_generate_title = require('@src/agent/generate-title')

const { getDirpath } = require('@src/utils/electron');

const uuid = require("uuid");
const { Op,literal } = require("sequelize");
const fs = require('fs').promises;
const path = require('path');

// Create a new conversation
/**
 * @swagger
 * /api/conversation:
 *   post:
 *     summary: Create a new conversation
 *     tags:  
 *       - Conversation
 *     description: This endpoint creates a new conversation with the provided content.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: Conversation content
 *     responses:
 *       200:
 *         description: Successfully created a new conversation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: './schemas/conversation.json'
 *                 code:
 *                   type: integer
 *                   description: Status code
 *                 msg:
 *                   type: string
 *                   description: Message
 *                 
 */
router.post("/", async ({ state, request, response }) => {
  const body = request.body || {};
  const { content, mode_type, agent_id, model_id } = body
  let modeType = mode_type || 'task'
  const conversation_id = uuid.v4();
  const title = content.slice(0, 20);

  // 构建要创建的对象
  const newConversationData = {
    conversation_id,
    content,
    title,
    status: 'running',
    user_id: state.user.id,
    mode_type: modeType,
    agent_id:agent_id,
    model_id,
  };

  const newConversation = await Conversation.create(newConversationData);
  return response.success(newConversation);
});

// Get conversation list
/**
 * @swagger
 * /api/conversation:
 *   get:
 *     summary: Get conversation list
 *     tags:  
 *       - Conversation
 *     description: This endpoint retrieves a list of all conversations ordered by update time in descending order.
 *     responses:
 *       200:
 *         description: Successfully returned the conversation list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: './schemas/conversation.json'
 *                 code:
 *                   type: integer
 *                   description: Status code
 *                 msg:
 *                   type: string
 *                   description: Message
 *               
 */
router.get("/", async ({ state, query, response }) => {
  try {

    console.time("get conversations");
    console.log("get conversations", query);
    // const mode_type = query.mode_type || 'task';
    const agent_id = query.agent_id
    // 1. 一次性查出所有会话

    // 构建查询条件
    const whereClause = {
      user_id: state.user.id,
      // mode_type,
      is_from_sub_server: false,
      agent_id: agent_id,
      deleted_at: null,  // 过滤已删除的记录
      conversation_id: {
        [Op.notIn]: literal(
          `(SELECT twins_id FROM conversation WHERE twins_id IS NOT NULL)`
        )
      }
    };
    const conversations = await Conversation.findAll({
      where: whereClause,
      order: [['update_at', 'DESC']],
    });
    console.timeEnd("get conversations");
    // 2. 拿到所有会话ID
    const conversationIds = conversations.map(c => c.conversation_id);
    if (conversationIds.length === 0) {
      return response.success([]);
    }

    // 新增：收集所有 model_id
    const modelIds = [...new Set(conversations.map(c => c.model_id).filter(Boolean))];
    let modelMap = new Map();
    if (modelIds.length > 0) {
      const models = await ModelTable.findAll({
        where: { id: modelIds },
        attributes: ['id', 'model_name'],
      });
      modelMap = new Map(models.map(m => [m.id, m.model_name]));
    }

    console.time("get latest messages");
    // 3. 一次性查出所有会话的最新消息，只查需要的字段
    const latestMessages = await Message.findAll({
      attributes: ['conversation_id', 'content', 'user_id'], // 只查主键和content
      where: {
        conversation_id: { [Op.in]: conversationIds },
        user_id: state.user.id
      },
      order: [['conversation_id', 'ASC'], ['create_at', 'DESC']],
    });
    console.timeEnd("get latest messages");

    // 4. 用 Map 方便查找
    console.time("build latestMessageMap");
    const latestMessageMap = new Map();
    for (const msg of latestMessages) {
      if (!latestMessageMap.has(msg.conversation_id)) {
        latestMessageMap.set(msg.conversation_id, msg);
      }
    }
    console.timeEnd("build latestMessageMap");

    // 5. 拼装
    console.time("assemble conversations");
    const new_conversations = conversations.map(conversation => ({
      ...conversation.toJSON(),
      latest_message: latestMessageMap.get(conversation.conversation_id) || null,
      model_name: modelMap.get(conversation.model_id) || null, // 新增
    }));
    console.timeEnd("assemble conversations");

    return response.success(new_conversations);
  } catch (error) {
    console.error(error);
    return response.fail({}, "Failed to get conversation list");
  }
});

// Get a single conversation
/**
 * @swagger
 * /api/conversation/{conversation_id}:
 *   get:
 *     summary: Get a single conversation
 *     tags:  
 *       - Conversation
 *     description: This endpoint retrieves a single conversation by its unique identifier.
 *     parameters:
 *       - in: path
 *         name: conversation_id
 *         required: true
 *         description: Unique identifier for the conversation
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully returned the conversation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: './schemas/conversation.json'
 *                 code:
 *                   type: integer
 *                   description: Status code
 *                 msg:
 *                   type: string
 *                   description: Message
 */
router.get("/:conversation_id", async ({ state, params, response }) => {
  const { conversation_id } = params;
  try {
    const conversation = await Conversation.findOne({
      where: { conversation_id: conversation_id, deleted_at: null },
    });
    if (!conversation) {
      return response.fail("Conversation does not exist");
    }


    const modelIds = [...new Set([conversation.model_id])];
    console.log("modelIds", modelIds);
    let modelMap = new Map();
    if (modelIds.length > 0) {
      const models = await ModelTable.findAll({
        where: { id: modelIds },
        attributes: ['id', 'model_name'],
      });
      modelMap = new Map(models.map(m => [m.id, m.model_name]));
    }
    conversation.dataValues.model_name = modelMap.get(conversation.model_id) || null;

    return response.success(conversation);
  } catch (error) {
    console.error(error);
    return response.fail("Failed to get conversation");
  }
});

// Update conversation
/**
 * @swagger
 * /api/conversation/{id}:
 *   put:
 *     summary: Update conversation
 *     tags:  
 *       - Conversation
 *     description: This endpoint updates the title of a conversation by its unique identifier.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Unique identifier for the conversation
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: New conversation title
 *     responses:
 *       200:
 *         description: Successfully updated the conversation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: './schemas/conversation.json'
 *                 code:
 *                   type: integer
 *                   description: Status code
 *                 msg:
 *                   type: string
 *                   description: Message
 */
router.put("/:id", async ({ state, params, request, response }) => {
  const { id: conversation_id } = params;
  const body = request.body || {};
  let { title } = body;

  try {
    const conversation = await Conversation.findOne({
      where: { conversation_id: conversation_id, user_id: state.user.id, deleted_at: null },
    });
    if (!conversation) {
      return response.error("Conversation does not exist");
    }

    if (!title || title === "") {
      title = await auto_generate_title(conversation.dataValues.content, conversation.dataValues.conversation_id)
      if (title == 'ERR_BAD_REQUEST') {
        return response.fail("llm api ERR_BAD_REQUEST");
      }
    }
    conversation.title = title;
    await conversation.save();
    return response.success(conversation);
  } catch (error) {
    console.error(error);
    return response.fail("Failed to update conversation");
  }
});

// Delete conversation
/**
 * @swagger
 * /api/conversation/{conversation_id}:
 *   delete:
 *     summary: Delete conversation
 *     tags:  
 *       - Conversation
 *     description: This endpoint deletes a conversation by its unique identifier.
 *     parameters:
 *       - in: path
 *         name: conversation_id
 *         required: true
 *         description: Unique identifier for the conversation
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully deleted the conversation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   description: Status code
 *                 msg:
 *                   type: string
 *                   description: Success message
 *                 data:
 *                   type: string
 *                   description: Success message
 */
router.delete("/:conversation_id", async ({ state, params, response }) => {
  const { conversation_id } = params;
  try {
    const conversation = await Conversation.findOne({
      where: { conversation_id: conversation_id, user_id: state.user.id, deleted_at: null },
    });
    if (!conversation) {
      return response.error("Conversation does not exist");
    }

    // 设置deleted_at字段进行假删除
    conversation.deleted_at = new Date();
    await conversation.save();

    return response.success("Conversation deleted successfully");
  } catch (error) {
    console.error(error);
    return response.error("Failed to delete conversation");
  }
});

// search conversation
/**
 * @swagger
 * /api/conversation/query:
 *   post:
 *     summary: Search conversation by title
 *     tags:  
 *       - Conversation
 *     description: This endpoint searches for conversations by title.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *                 description: Conversation title
 *     responses:
 *       200:
 *         description: Successfully searched for conversations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: './schemas/conversation.json'
 *                 code:
 *                   type: integer
 *                   description: Status code
 *                 msg:
 *                   type: string
 *                   description: Message
 *                 
 */
router.post("/query", async ({ state, request, response }) => {
  const body = request.body || {};
  const { query } = body

  const conversations = await Conversation.findAll({
    where: {
      title: {
        [Op.like]: `%${query}%`
      },
      user_id: state.user.id,
      deleted_at: null  // 过滤已删除的记录
    }
  });

  return response.success(conversations);
});


router.put("/visibility/:id", async ({ state, params, request, response }) => {
  try {
    const { id } = params;
    const { is_public } = request.body;

    // 验证 is_public 参数
    if (typeof is_public !== 'boolean') {
      return response.fail({}, "is_public must be a boolean value");
    }

    // 查找并验证会话是否存在且属于当前用户
    const conversation = await Conversation.findOne({
      where: {
        conversation_id: id,
        user_id: state.user.id,
        deleted_at: null
      }
    });

    if (!conversation) {
      return response.fail({}, "Conversation not found or access denied");
    }

    // 更新 is_public 字段
    await Conversation.update(
      { is_public: is_public },
      {
        where: {
          conversation_id: id,
          user_id: state.user.id
        }
      }
    );

    // 返回更新后的会话信息
    const updatedConversation = await Conversation.findOne({
      where: {
        conversation_id: id,
        user_id: state.user.id
      }
    });

    return response.success({
      conversation_id: id,
      is_public: updatedConversation.is_public,
      message: `Conversation ${is_public ? 'made public' : 'made private'} successfully`
    });

  } catch (error) {
    console.error('Error updating conversation public status:', error);
    return response.fail({}, "Failed to update conversation public status");
  }
})

/**
 * 获取目录中的最终文件（最新文件或 todo.md）
 * @param {string} dir_path - 目录路径
 * @returns {Promise<string|null>} 文件路径或 null
 */
async function getFinalFile(dir_path) {
  try {
    const files = await fs.readdir(dir_path, { withFileTypes: true });
    let latestFile = null;
    let latestMtime = 0;
    let todoFile = null;

    for (const entry of files) {
      if (entry.isFile()) {
        if (entry.name === 'todo.md') {
          todoFile = path.join(dir_path, entry.name);
          continue;
        }
        const filePath = path.join(dir_path, entry.name);
        const stat = await fs.stat(filePath);
        if (stat.mtimeMs > latestMtime) {
          latestMtime = stat.mtimeMs;
          latestFile = filePath;
        }
      }
    }

    if (latestFile) {
      return latestFile;
    } else if (todoFile) {
      return todoFile;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error reading directory:', error);
    return null;
  }
}

/**
 * @swagger
 * /api/conversation/screenshots/batch:
 *   post:
 *     summary: Take screenshots for all conversations
 *     tags:  
 *       - Conversation
 *     description: This endpoint takes screenshots for all conversations in the database and updates their screenshot URLs.
 *     responses:
 *       200:
 *         description: Screenshots processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   description: Status code
 *                 msg:
 *                   type: string
 *                   description: Success message
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalProcessed:
 *                       type: integer
 *                       description: Total conversations processed
 *                     successCount:
 *                       type: integer
 *                       description: Successfully processed screenshots
 *                     failedCount:
 *                       type: integer
 *                       description: Failed screenshots
 */
router.post("/screenshots/batch", async (ctx) => {
  const { state, response } = ctx;

  try {
    // 获取所有未删除的会话
    const conversations = await Conversation.findAll({
      where: {
        deleted_at: null
      },
    });

    if (!conversations || conversations.length === 0) {
      return response.success({
        message: "No conversations found to process",
        totalProcessed: 0,
        successCount: 0,
        failedCount: 0
      });
    }

    console.log(`🚀 Starting batch screenshot processing for ${conversations.length} conversations`);

    let successCount = 0;
    let failedCount = 0;
    const results = [];

    // 获取授权token
    const token = ctx.headers.authorization;
    const tokenString = token && token.startsWith('Bearer ') ? token.slice(7) : token;

    // 处理每个会话
    for (const conversation of conversations) {
      try {
        const conversation_id = conversation.conversation_id;
        const user_id = conversation.user_id;

        // 构建工作空间路径
        const WORKSPACE_DIR = getDirpath(process.env.WORKSPACE_DIR || 'workspace', user_id);
        const dir_name = 'Conversation_' + conversation_id.slice(0, 6);
        const dir_path = path.join(WORKSPACE_DIR, dir_name);

        // 获取最终文件路径
        const final_file_path = await getFinalFile(dir_path);

        if (!final_file_path) {
          console.log(`⚠️ No files found for conversation ${conversation_id}`);
          failedCount++;
          results.push({
            conversation_id,
            status: 'failed',
            error: 'No files found in workspace'
          });
          continue;
        }

        // 构建预览URL
        const url = `${process.env.SUB_SERVER_DOMAIN}/file/?url=${final_file_path}`;

        // 截图并上传
        // const screen_result = await takeScreenshotAndUpload(url, { 
        //   accessToken: tokenString, 
        //   conversation_id 
        // });
        const screen_result = null;
        if (!screen_result || !screen_result.screenshotUrl) {
          console.log(`❌ Failed to take screenshot for conversation ${conversation_id}`);
          failedCount++;
          results.push({
            conversation_id,
            status: 'failed',
            error: 'Screenshot upload failed'
          });
          continue;
        }

        const screen_url = screen_result.screenshotUrl;

        // 更新 Conversation 的截图URL
        await Conversation.update(
          { screen_shot_url: screen_url },
          { where: { conversation_id } }
        );

        console.log(`✅ Screenshot updated for conversation ${conversation_id}: ${screen_url}`);
        successCount++;
        results.push({
          conversation_id,
          status: 'success',
          screenshotUrl: screen_url
        });

      } catch (error) {
        console.error(`❌ Error processing conversation ${conversation.conversation_id}:`, error);
        failedCount++;
        results.push({
          conversation_id: conversation.conversation_id,
          status: 'failed',
          error: error.message
        });
      }
    }

    console.log(`🏁 Batch screenshot processing completed. Success: ${successCount}, Failed: ${failedCount}`);

    return response.success({
      message: "Batch screenshot processing completed",
      totalProcessed: conversations.length,
      successCount: successCount,
      failedCount: failedCount,
      results: results
    });

  } catch (error) {
    console.error('Error in batch screenshot processing:', error);
    return response.fail(`Failed to process batch screenshots: ${error.message}`);
  }
});


router.post("/screenshots/single", async ({ request, response, state }) => {
  const { conversation_id } = request.body;

  if (!conversation_id) {
    return response.fail("conversation_id is required");
  }

  try {
    const conversation = await Conversation.findOne({
      where: {
        conversation_id,
        deleted_at: null
      }
    });

    if (!conversation) {
      return response.fail("Conversation not found");
    }

    const user_id = conversation.user_id;

    const WORKSPACE_DIR = getDirpath(process.env.WORKSPACE_DIR || 'workspace', user_id);
    const dir_name = 'Conversation_' + conversation_id.slice(0, 6);
    const dir_path = path.join(WORKSPACE_DIR, dir_name);

    const final_file_path = await getFinalFile(dir_path);

    if (!final_file_path) {
      return response.fail("No files found in workspace");
    }

    const url = `${process.env.SUB_SERVER_DOMAIN}/file/?url=${final_file_path}`;

    const token = request.headers.authorization;
    const tokenString = token && token.startsWith('Bearer ') ? token.slice(7) : token;

    const screen_result = await takeScreenshotAndUpload(url, {
      accessToken: tokenString,
      conversation_id
    });

    if (!screen_result || !screen_result.screenshotUrl) {
      return response.fail("Screenshot generation failed");
    }

    const screen_url = screen_result.screenshotUrl;

    await Conversation.update(
      { screen_shot_url: screen_url },
      { where: { conversation_id } }
    );

    console.log(`Screenshot updated for conversation ${conversation_id}: ${screen_url}`);

    return response.success({
      message: "Screenshot generated successfully",
      conversation_id,
      screenshotUrl: screen_url
    });

  } catch (error) {
    console.error(`Error generating screenshot for conversation ${conversation_id}:`, error);
    return response.fail(`Failed to generate screenshot: ${error.message}`);
  }
});

// Twins conversation management
/**
 * @swagger
 * /api/conversation/twins:
 *   post:
 *     summary: Handle twins conversation
 *     tags:  
 *       - Conversation
 *     description: This endpoint handles twins conversation creation and retrieval based on conversation_id.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               conversation_id:
 *                 type: string
 *                 description: Current conversation ID
 *             required:
 *               - conversation_id
 *     responses:
 *       200:
 *         description: Successfully handled twins conversation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     conversation_id:
 *                       type: string
 *                       description: Target conversation ID
 *                     is_new:
 *                       type: boolean
 *                       description: Whether a new conversation was created
 *                 code:
 *                   type: integer
 *                   description: Status code
 *                 msg:
 *                   type: string
 *                   description: Message
 */
router.post("/twins", async ({ state, request, response }) => {
  try {
    const body = request.body || {};
    const { conversation_id } = body;

    if (!conversation_id) {
      return response.fail("conversation_id is required");
    }

    // 查找当前会话
    const currentConversation = await Conversation.findOne({
      where: { 
        conversation_id: conversation_id, 
        user_id: state.user.id, 
        deleted_at: null 
      }
    });

    if (!currentConversation) {
      return response.fail("Current conversation not found");
    }

    let targetConversationId = null;
    let isNew = false;

    // 检查当前会话是否有 twins_id
    if (currentConversation.twins_id) {
      // twins_id 就是 twins 会话的 conversation_id，直接使用
      targetConversationId = currentConversation.twins_id;
    } else {
      // 当前会话没有 twins_id，创建新的 twins 关系
      const newConversationId = uuid.v4();
      const newTwinsId = newConversationId;
      
      // 创建新的 twins 会话
      const newConversation = await Conversation.create({
        conversation_id: newConversationId,
        content: currentConversation.content,
        title: currentConversation.title,
        status: 'ready',
        user_id: state.user.id,
        mode_type: currentConversation.mode_type,
        agent_id: currentConversation.agent_id,
        model_id: currentConversation.model_id
      });

      // 更新当前会话的 twins_id
      await Conversation.update(
        { twins_id: newTwinsId },
        { where: { conversation_id: conversation_id } }
      );

      targetConversationId = newConversationId;
      isNew = true;
    }

    return response.success({
      conversation_id: targetConversationId,
      is_new: isNew
    });

  } catch (error) {
    console.error('Error handling twins conversation:', error);
    return response.fail(`Failed to handle twins conversation: ${error.message}`);
  }
});

// 获取 twins conversation 的 token 信息
/**
 * @swagger
 * /api/conversation/twins/tokens/{conversation_id}:
 *   get:
 *     summary: Get twins conversation token information
 *     tags:  
 *       - Conversation
 *     description: This endpoint retrieves token usage information for twins conversation.
 *     parameters:
 *       - in: path
 *         name: conversation_id
 *         required: true
 *         description: Twins conversation ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved token information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     input_tokens:
 *                       type: integer
 *                       description: Input tokens count
 *                     output_tokens:
 *                       type: integer
 *                       description: Output tokens count
 *                     total:
 *                       type: integer
 *                       description: Total tokens count
 *                 code:
 *                   type: integer
 *                   description: Status code
 *                 msg:
 *                   type: string
 *                   description: Message
 */
router.get("/twins/tokens/:conversation_id", async ({ state, params, response }) => {
  try {
    const { conversation_id } = params;

    // 查找 twins conversation
    const conversation = await Conversation.findOne({
      where: { 
        conversation_id: conversation_id, 
        deleted_at: null 
      }
    });

    if (!conversation) {
      return response.fail("Twins conversation not found");
    }

    // 返回 token 信息
    const tokenInfo = {
      input_tokens: conversation.input_tokens || 0,
      output_tokens: conversation.output_tokens || 0,
      total: (conversation.input_tokens || 0) + (conversation.output_tokens || 0)
    };

    return response.success(tokenInfo);

  } catch (error) {
    console.error('Error getting twins token info:', error);
    return response.fail(`Failed to get twins token info: ${error.message}`);
  }
});


module.exports = exports = router.routes();