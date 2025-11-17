const router = require("koa-router")();

const { Op } = require('sequelize')

const Agent = require("@src/models/Agent");
const Conversation = require("@src/models/Conversation");
const generate_agent = require('@src/agent/generate-agent/index');

// 新增 Agent
router.post("/", async ({ state, request, response }) => {
  const body = request.body || {};
  const { name, describe = '', mcp_server_ids = [], is_public = true } = body;
  try {
    const agent = await Agent.create({
      user_id: state.user.id,
      name,
      describe,
      mcp_server_ids,
      is_public
    });

    return response.success(agent);
  } catch (error) {
    console.error(error);
    return response.fail("Failed to create agent");
  }
});


router.post("/generate", async ({ state, request, response }) => {
  const body = request.body || {};
  const { question, conversation_id } = body;

  try {
    const { name, describe } = await generate_agent(question, conversation_id);
    const agent = await Agent.create({
      user_id: state.user.id,
      name,
      describe,
    });

    await Conversation.update({ agent_id: agent.dataValues.id }, { where: { conversation_id } });
    return response.success(agent);

  } catch (error) {
    console.error(error);
    return response.fail("Failed to create agent");
  }
});


// 获取 Agent 列表


router.get("/", async ({ state, response }) => {
  console.log(' ==== get agent list ==== ');
  try {
    const agents = await Agent.findAll({
      where: {
        user_id: state.user.id,
        deleted_at: null  // 手动过滤已删除的记录
      },
      order: [['create_at', 'DESC']]
    });
    return response.success(agents);
  } catch (error) {
    console.error(error);
    return response.fail("Failed to get agent list");
  }
});

// 获取单个 Agent
router.get("/:id", async ({ state, params, response }) => {
  const { id } = params;
  try {
    const agent = await Agent.findOne({
      where: { id, user_id: state.user.id },
    });
    if (!agent) {
      return response.fail("Agent does not exist");
    }
    return response.success(agent);
  } catch (error) {
    console.error(error);
    return response.fail("Failed to get agent");
  }
});

// 更新 Agent
router.put("/:id", async ({ state, params, request, response }) => {
  const { id } = params;
  const body = request.body || {};
  const { name, describe, mcp_server_ids } = body;

  try {
    const agent = await Agent.findOne({
      where: { id, user_id: state.user.id },
    });
    if (!agent) {
      return response.fail("Agent does not exist");
    }
    const originalName = agent.name;
    const originalDescribe = agent.describe;
    const originalIsPublic = agent.is_public;

    const needsVectorUpdate = (name !== undefined && name !== originalName) ||
      (describe !== undefined && describe !== originalDescribe);

    if (name !== undefined) agent.name = name;
    if (describe !== undefined) agent.describe = describe;
    if (mcp_server_ids !== undefined) agent.mcp_server_ids = mcp_server_ids;
    if (is_public !== undefined) agent.is_public = is_public;
    await agent.save();

    return response.success(agent);
  } catch (error) {
    console.error(error);
    return response.fail("Failed to update agent");
  }
});

// 删除 Agent (手动假删除)
router.delete("/:id", async ({ state, params, response }) => {
  const { id } = params;
  try {
    const agent = await Agent.findOne({
      where: { id, user_id: state.user.id },
    });
    if (!agent) {
      return response.fail("Agent does not exist");
    }

    // 手动设置deleted_at字段进行假删除
    agent.deleted_at = new Date();
    await agent.save();

    return response.success("Agent deleted successfully");
  } catch (error) {
    console.error(error);
    return response.fail("Failed to delete agent");
  }
});

module.exports = exports = router.routes();
