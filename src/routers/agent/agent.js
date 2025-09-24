const router = require("koa-router")();

const { Op } = require('sequelize')

const Agent = require("@src/models/Agent");

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


// router.post("/generate", async ({ state, request, response }) => {
//   const body = request.body || {};
//   const { question, conversation_id, is_public } = body;
//   try { 
//     let userId = state.user.id;
//     let agentResult = null;
//     const agent_list = await choose_agent_question(question, conversation_id, userId);
//     console.log("寻找现有的Agent",agent_list);
//     //从最终返回的agent 中寻找 userId 一样的数据
//     const agent_list_user = agent_list.filter(item => item.user_id === userId);
//     if(agent_list_user.length > 0) { 
//       agentResult = agent_list_user[0];
//     }else if (agent_list.length > 0) { 
//       //remix agent
//       agentResult = await agent_remix(agent_list[0].id,userId);
//     }else{
//       //都没有的情况下 创建一个 agent
//       const { name, describe } = await generate_agent(question, conversation_id);
//       const agent = await Agent.create({
//           user_id: state.user.id,
//           name,
//           describe,
//         });
//         agentResult = agent.dataValues;

//         // 异步生成角色画像并上传到OSS
//         generateAndUploadAgentPortrait(agent.dataValues.id, name, describe,conversation_id)
//           .then(portraitUrl => {
//             if (portraitUrl) {
//               console.log(`✅ Agent ${name} 角色画像生成并上传成功: ${portraitUrl}`);
//             }
//           })
//           .catch(error => {
//             console.error(`❌ Agent ${name} 角色画像生成失败:`, error.message);
//           });
//     }

//     //更新 会话的ID
//     await Conversation.update({ agent_id: agentResult.id }, { where: { conversation_id } });
//     return response.success(agentResult);
//   } catch (error) {
//   }
// })


// 获取 Agent 列表


router.get("/", async ({ state, response }) => {
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
